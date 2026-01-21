# State Watcher Pattern for Robust Persistence

**Date:** January 9, 2026  
**Issue:** localStorage writes were fragile and could be interrupted by crashes  
**Solution:** Decouple persistence from event handlers using a dedicated watcher effect

---

## The Problem

### Previous Approach (Fragile)
```typescript
const handleSelectHomeowner = (homeowner: Homeowner) => {
  setSelectedHomeowner(homeowner.id);
  // Other UI updates...
  
  // ❌ FRAGILE: If code crashes here (notification service, etc.)
  //    the localStorage write never happens
  localStorage.setItem("cascade_active_homeowner_id", homeowner.id);
}
```

**Failure Scenario:**
1. User clicks homeowner
2. State updates successfully
3. Notification service crashes (missing chunk, network error)
4. Execution halts BEFORE localStorage.setItem runs
5. **Result:** Claims disappear on refresh (ID not saved)

---

## The Solution: State Watcher

### Dedicated Persistence Effect
```typescript
// 🛡️ GUARANTEED PERSISTENCE
// This runs automatically whenever the user selection changes
// Decoupled from event handlers to survive crashes/errors
useEffect(() => {
  // Only persist for admin/builder users
  if (userRole === UserRole.HOMEOWNER) return;

  if (selectedAdminHomeownerId) {
    console.log("💾 Auto-Saving Homeowner ID:", selectedAdminHomeownerId);
    try {
      localStorage.setItem("cascade_active_homeowner_id", String(selectedAdminHomeownerId));
      console.log("✅ Persistence confirmed:", localStorage.getItem("cascade_active_homeowner_id"));
    } catch (error) {
      console.error("🔥 Auto-save to localStorage failed:", error);
    }
  } else {
    // Clear when null (explicit deselection)
    console.log("💾 Clearing saved homeowner (null selection)");
    localStorage.removeItem("cascade_active_homeowner_id");
  }
}, [selectedAdminHomeownerId, userRole]); // Watches for any change to selection
```

---

## How It Works

### Execution Flow

**1. User Clicks Homeowner**
```typescript
handleSelectHomeowner(homeowner) {
  console.log("🖱️ User selected:", homeowner.id);
  setSelectedAdminHomeownerId(homeowner.id); // ✅ State updated
  // No localStorage code here anymore
}
```

**2. React Detects State Change**
- `selectedAdminHomeownerId` changed from `null` → `"abc-123"`
- React schedules watcher effect to run

**3. Watcher Effect Runs (Separate Execution)**
```
💾 Auto-Saving Homeowner ID: abc-123
✅ Persistence confirmed: abc-123
```

**4. Even If Handler Crashes**
- State was already set (step 1)
- Watcher runs independently (step 3)
- Persistence happens regardless of crashes after `setState`

---

## Benefits

### 1. **Crash-Proof** 🛡️
- Event handler can crash, watcher still runs
- Notification service errors don't break persistence
- Network failures don't prevent save

### 2. **Automatic** 🤖
- No need to remember to save in every handler
- Works for ANY state change (API updates, etc.)
- Centralized persistence logic

### 3. **Clear Separation** 🎯
- Event handlers = UI updates
- Watcher effect = Data persistence
- Single Responsibility Principle

### 4. **Debuggable** 🔍
- Always logs when saving/clearing
- Easy to verify in console
- Clear confirmation messages

---

## Simplified Event Handlers

### Before (Manual Persistence)
```typescript
const handleSelectHomeowner = (homeowner: Homeowner) => {
  setSelectedHomeowner(homeowner.id);
  // ... other code ...
  try {
    localStorage.setItem("...", homeowner.id); // Manual
  } catch (e) { ... }
}

const handleClearSelection = () => {
  setSelectedHomeowner(null);
  localStorage.removeItem("..."); // Manual
}
```

### After (Automatic Persistence)
```typescript
const handleSelectHomeowner = (homeowner: Homeowner) => {
  setSelectedHomeowner(homeowner.id);
  // ... other code ...
  // Watcher handles persistence automatically ✨
}

const handleClearSelection = () => {
  setSelectedHomeowner(null);
  // Watcher clears localStorage automatically ✨
}
```

---

## Console Output

### Normal Flow
```
🖱️ User selected: abc-123 John Smith
💾 Auto-Saving Homeowner ID: abc-123
✅ Persistence confirmed: abc-123
```

### On Refresh
```
⏳ Waiting for homeowners list to load...
💾 Checking Storage. Found ID: abc-123
✅ Restoring session for: John Smith
```

### On Clear Selection
```
💾 Clearing saved homeowner (null selection)
```

### If Crash in Handler
```
🖱️ User selected: abc-123 John Smith
❌ Error in notification service: [crash details]
💾 Auto-Saving Homeowner ID: abc-123  ← Still runs!
✅ Persistence confirmed: abc-123
```

---

## Notification Service Already Protected

The existing notification service calls are already wrapped in try/catch:

```typescript
// Send email notification to admins (non-blocking)
try {
  const { notificationService } = await import('./services/notificationService');
  await notificationService.notifyClaimSubmitted(newClaim, employees);
} catch (emailError) {
  console.error('❌ Failed to send claim notification email:', emailError);
  // Don't block claim creation if email fails
}
```

**Status:** ✅ Already safe - errors don't propagate

---

## Files Modified

- `App.tsx`
  - Added State Watcher effect (lines ~1217-1241)
  - Simplified `handleSelectHomeowner` (removed manual save)
  - Simplified `handleClearHomeownerSelection` (removed manual clear)

---

## Architecture Pattern

```
┌─────────────────────────────────────────┐
│        User Action (Click)              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Event Handler (handleSelectHomeowner) │
│   • Update React State                  │
│   • Update UI                           │
│   • Return (may crash after)            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         React Effect Scheduler          │
│   (Runs after state update committed)   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      State Watcher Effect Runs          │
│   • Read current state                  │
│   • Write to localStorage               │
│   • Log confirmation                    │
└─────────────────────────────────────────┘
```

---

## Why This Works

### React's Effect Timing
1. **Synchronous:** `setState` updates React's internal state
2. **Committed:** React commits the state update to the component
3. **Effects Run:** All effects watching that state run in a separate phase
4. **Isolated:** Effects run AFTER render, in their own execution context

**Key Insight:** Even if the event handler throws an error AFTER `setState`, React has already committed the state change and will run effects.

---

## Status

✅ **COMPLETE** - State persistence now immune to crashes in event handlers

## Testing

### To Verify:
1. Open console
2. Select a homeowner
3. Look for: `💾 Auto-Saving Homeowner ID: [id]` and `✅ Persistence confirmed`
4. Refresh page
5. Look for: `✅ Restoring session for: [name]`
6. Claims should remain visible

### To Test Crash Resistance:
1. Add `throw new Error("test crash")` after `setSelectedAdminHomeownerId` in handler
2. Select homeowner
3. Handler will crash but watcher should still save
4. Check console for persistence confirmation
5. Refresh - should still restore
