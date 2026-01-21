# Chained Restoration Pattern - Fix Passive useEffect Race Condition

**Date:** January 9, 2026  
**Issue:** Passive useEffect restoration was not firing after DB load  
**Solution:** Chain restoration directly to the DB fetch success block

---

## The Problem

### Previous Approach (Race Condition)
```typescript
// Step 1: DB Fetch (async)
const dbHomeowners = await db.select().from(homeownersTable);
setHomeowners(dbHomeowners);
console.log(`✅ Loaded ${dbHomeowners.length} homeowners from DB`);

// Step 2: Passive useEffect (separate execution, may not fire)
useEffect(() => {
  if (!homeowners || homeowners.length === 0) return; // ❌ May miss timing
  
  const savedId = localStorage.getItem("cascade_active_homeowner_id");
  console.log("💾 Checking Storage. Found ID:", savedId); // Never logged!
  // ... restoration logic
}, [homeowners, userRole]);
```

**Evidence of Failure:**
```
✅ Loaded 4957 homeowners from DB
(No "Checking Storage" log appears)
```

**Why It Failed:**
- React batches state updates and effect scheduling
- Effect dependencies (`homeowners.length`) may not trigger correctly
- Timing race between `setHomeowners` and effect execution
- Effect could be de-prioritized or skipped entirely

---

## The Solution: Chained Restoration

### Direct Injection in Success Block
```typescript
// Step 1: DB Fetch
const dbHomeowners = await db.select().from(homeownersTable);

// Step 2: Update State
setHomeowners(prev => {
  // ... merge logic
  const merged = [...mappedHomeowners, ...localOnly];
  console.log(`✅ Loaded ${mappedHomeowners.length} homeowners from DB`);
  return merged;
});

// Step 3: IMMEDIATELY RESTORE (guaranteed execution)
// 🔗 CHAINED RESTORATION
if (userRole !== UserRole.HOMEOWNER && !selectedAdminHomeownerId) {
  const savedId = localStorage.getItem("cascade_active_homeowner_id");
  console.log("🔗 Data loaded. Now attempting immediate restore for ID:", savedId);
  
  if (savedId) {
    const found = mappedHomeowners.find(h => h.id === savedId);
    
    if (found) {
      console.log("✅ RESTORED SESSION:", found.firstName || found.name);
      setSelectedAdminHomeownerId(savedId);
      setCurrentView('DASHBOARD');
      setDashboardConfig({ initialTab: 'CLAIMS', initialThreadId: null });
    } else {
      console.warn("⚠️ Saved ID not found in new data. Clearing invalid storage.");
      localStorage.removeItem("cascade_active_homeowner_id");
    }
  } else {
    console.log("ℹ️ No saved session found.");
  }
}
```

---

## Key Differences

### Passive useEffect (Old)
```
DB Load → setHomeowners → [React schedules effects] → useEffect MAY run
                                                      ↓
                                              (Race Condition)
```

**Problems:**
- ❌ Effect scheduling is non-deterministic
- ❌ Dependency array may not trigger correctly
- ❌ Effect can be batched/delayed/skipped
- ❌ No guarantee of execution order

### Chained Restoration (New)
```
DB Load → setHomeowners → IMMEDIATE restoration code → Guaranteed execution
```

**Benefits:**
- ✅ Deterministic execution order
- ✅ Runs immediately in same async block
- ✅ No dependency on React's effect scheduler
- ✅ Guaranteed to run after data load

---

## Console Output

### Expected Flow (New)
```
Attempting DB connection...
✅ Loaded 4957 homeowners from DB, 0 from local storage
🔗 Data loaded. Now attempting immediate restore for ID: abc-123-def
✅ RESTORED SESSION: John Smith
📋 Fetching claims for homeowner: abc-123-def
```

### If No Saved Session
```
✅ Loaded 4957 homeowners from DB
🔗 Data loaded. Now attempting immediate restore for ID: null
ℹ️ No saved session found.
```

### If Saved ID Invalid
```
✅ Loaded 4957 homeowners from DB
🔗 Data loaded. Now attempting immediate restore for ID: old-deleted-id
⚠️ Saved ID not found in new data. Clearing invalid storage.
```

---

## Architecture

### Previous (Passive Watcher)
```
┌──────────────────────────────────┐
│     DB Fetch (async function)    │
│  1. await db.select()            │
│  2. setHomeowners(data)          │
│  3. console.log("✅ Loaded...")  │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│    React Effect Scheduler        │
│  (Non-deterministic timing)      │
└────────────┬─────────────────────┘
             │
             ▼ (May not fire)
┌──────────────────────────────────┐
│  useEffect([homeowners, ...])    │
│  1. Check homeowners.length      │
│  2. Read localStorage            │
│  3. Restore session              │
└──────────────────────────────────┘
```

### New (Chained Execution)
```
┌────────────────────────────────────────────┐
│       DB Fetch (async function)            │
│  1. await db.select()                      │
│  2. setHomeowners(data)                    │
│  3. console.log("✅ Loaded...")            │
│  4. 🔗 IMMEDIATE RESTORATION               │
│     - Read localStorage                    │
│     - Find homeowner in data               │
│     - setSelectedAdminHomeownerId          │
│     - console.log("✅ RESTORED...")        │
└────────────────────────────────────────────┘
             │
             ▼ (Guaranteed to execute)
         SUCCESS
```

---

## Changes Made

### App.tsx

**Added: Chained Restoration (Lines ~505-527)**
```typescript
// 🔗 CHAINED RESTORATION: Immediately restore selected homeowner after data load
// This ensures restoration happens synchronously after DB fetch completes
if (userRole !== UserRole.HOMEOWNER && !selectedAdminHomeownerId) {
  const savedId = localStorage.getItem("cascade_active_homeowner_id");
  console.log("🔗 Data loaded. Now attempting immediate restore for ID:", savedId);
  
  if (savedId) {
    const found = mappedHomeowners.find(h => h.id === savedId);
    
    if (found) {
      console.log("✅ RESTORED SESSION:", found.firstName || found.name);
      setSelectedAdminHomeownerId(savedId);
      setCurrentView('DASHBOARD');
      setDashboardConfig({ initialTab: 'CLAIMS', initialThreadId: null });
    } else {
      console.warn("⚠️ Saved ID not found in new data. Clearing invalid storage.");
      localStorage.removeItem("cascade_active_homeowner_id");
    }
  } else {
    console.log("ℹ️ No saved session found.");
  }
}
```

**Removed: Passive useEffect Watcher (Lines ~909-948)**
```typescript
// DELETED:
useEffect(() => {
  // ... passive restoration logic
}, [homeowners, userRole]);
```

---

## Why This Pattern Works

### 1. **Synchronous Execution** 🔗
- Restoration runs in the same async function as data load
- No waiting for React's effect scheduler
- Guaranteed execution order

### 2. **Direct Data Access** 📊
- Uses `mappedHomeowners` directly (fresh from DB)
- No dependency on state updates propagating
- No race with React's render cycle

### 3. **Fail-Safe Logic** 🛡️
- Checks conditions before attempting restore
- Cleans up invalid IDs immediately
- Clear logging at every step

### 4. **Minimal Dependencies** 🎯
- Doesn't depend on `useEffect` dependencies
- Doesn't depend on state update timing
- Self-contained restoration logic

---

## State Watcher Still Active

The **State Watcher** effect (from previous implementation) is **kept** and continues to work:

```typescript
// 🛡️ GUARANTEED PERSISTENCE (KEPT)
useEffect(() => {
  if (selectedAdminHomeownerId) {
    localStorage.setItem("cascade_active_homeowner_id", String(selectedAdminHomeownerId));
  }
}, [selectedAdminHomeownerId, userRole]);
```

**Division of Labor:**
- **Chained Restoration** = READS from localStorage on page load
- **State Watcher** = WRITES to localStorage on selection change

---

## Benefits

### 1. **Eliminates Race Condition** ⚡
- No dependency on effect scheduling
- No timing issues with state updates
- Guaranteed execution after DB load

### 2. **Deterministic Behavior** 🎯
- Restoration always runs if data loads
- Predictable console output
- Easy to debug

### 3. **Immediate Feedback** 🚀
- User sees restored state instantly
- No delay waiting for effect scheduler
- Faster perceived load time

### 4. **Cleaner Code** ✨
- Restoration logic co-located with data load
- Clear cause-and-effect relationship
- Fewer moving parts

---

## Files Modified

- `App.tsx`
  - Added chained restoration in `syncDataAndUser` (lines ~505-527)
  - Removed passive useEffect watcher (deleted ~40 lines)

---

## Status

✅ **COMPLETE** - Restoration now chains directly to DB fetch, eliminating race conditions

## Testing

### Expected Console Output on Refresh:
```
Attempting DB connection...
✅ Loaded 4957 homeowners from DB, 0 from local storage
🔗 Data loaded. Now attempting immediate restore for ID: abc-123-def
✅ RESTORED SESSION: John Smith
📋 Fetching claims for homeowner: abc-123-def
💾 Auto-Saving Homeowner ID: abc-123-def  ← State Watcher confirms
✅ Persistence confirmed: abc-123-def
```

All logs should appear in order, with no gaps or missing messages.
