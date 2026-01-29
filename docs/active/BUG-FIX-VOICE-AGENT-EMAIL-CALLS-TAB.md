# Bug Fix: Voice Agent Email & Calls Tab Filtering

**Date:** 2026-01-28  
**Status:** ✅ Fixed

---

## Summary

Fixed two critical bugs in the AI voice agent system:

1. **Email Bug:** Voice agent notification emails rendering as `[object Promise]`
2. **Calls Tab Bug:** Calls disappearing when filtering by specific homeowner in Dashboard

---

## Bug 1: Email Rendering as `[object Promise]`

### Root Cause
In `lib/services/emailService.ts`, the `buildUniversalNotificationContent()` function called `render()` from `@react-email/render` without awaiting it. The `render()` function is asynchronous and returns a Promise, which was being passed directly as the email HTML body.

### Location
- **File:** `lib/services/emailService.ts`
- **Function:** `buildUniversalNotificationContent()`
- **Line:** ~335

### Fix Applied
```typescript
// BEFORE:
function buildUniversalNotificationContent(
  scenario: NotificationScenario,
  data: UniversalNotificationData
): { subject: string; html: string; text: string } {
  // ...
  const html = render(emailElement); // ❌ Missing await
  // ...
}

// AFTER:
async function buildUniversalNotificationContent(
  scenario: NotificationScenario,
  data: UniversalNotificationData
): Promise<{ subject: string; html: string; text: string }> {
  // ...
  const html = await render(emailElement); // ✅ Properly awaited
  // ...
}
```

Also updated the caller in `sendUniversalNotification()`:
```typescript
// BEFORE:
const { subject, html, text } = buildUniversalNotificationContent(scenario, data);

// AFTER:
const { subject, html, text } = await buildUniversalNotificationContent(scenario, data);
```

---

## Bug 2: Calls Tab Filtering

### Root Cause
The `isGlobalView` state in `AIIntakeDashboard.tsx` defaulted to `false`, meaning the component started in "Homeowner Calls" (scoped) mode. When an admin first opened the Calls tab without selecting a specific homeowner:

1. `isGlobalView = false` (scoped mode)
2. `activeHomeownerId` was undefined or invalid
3. Early return logic at line 174-177 prevented the query from running
4. Result: Empty call list displayed

The database query and filtering logic were **correct** - the issue was the default state initialization.

### Location
- **File:** `components/AIIntakeDashboard.tsx`
- **State:** `isGlobalView`
- **Line:** ~42

### Fix Applied
```typescript
// BEFORE:
const [isGlobalView, setIsGlobalView] = useState(false); // ❌ Always scoped by default

// AFTER:
const [isGlobalView, setIsGlobalView] = useState(isAdmin); // ✅ Global for admins, scoped for homeowners
```

This ensures:
- **Admins:** See all calls by default (global view)
- **Homeowners:** See only their calls by default (scoped view)
- **Toggle Works:** Admins can switch between global and scoped views

### Additional Improvements
Added debug logging to help diagnose filtering issues in the future:
```typescript
console.log('📞 [CALLS] Loading calls...', { 
  isGlobalView, 
  activeHomeownerId: activeHomeownerId ? activeHomeownerId.substring(0, 10) + '...' : 'none' 
});
```

---

## Testing Recommendations

### Email Bug Testing
1. **Trigger a voice call** through the Vapi system
2. **Check the email** sent to admins
3. **Verify** the email body contains proper HTML (not `[object Promise]`)
4. **Look for** formatted call details, homeowner info, and action buttons

### Calls Tab Testing
1. **Log in as Admin**
2. **Navigate to Calls tab** (without selecting a homeowner)
3. **Verify** all calls are displayed by default (Global view active)
4. **Select a specific homeowner** from dashboard
5. **Switch to "Homeowner Calls"** using the toggle button
6. **Verify** only that homeowner's calls are displayed
7. **Switch back to "All Calls"** 
8. **Verify** all calls reappear

---

## Database Schema Confirmation

The `calls` table correctly includes `homeowner_id`:

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_call_id TEXT NOT NULL UNIQUE,
  homeowner_id UUID REFERENCES homeowners(id), -- ✅ Present
  homeowner_name TEXT,
  phone_number TEXT,
  property_address TEXT,
  issue_description TEXT,
  is_urgent BOOLEAN DEFAULT false,
  transcript TEXT,
  recording_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  address_match_similarity TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

The API query correctly:
1. **Selects** `homeownerId` from the `calls` table
2. **Filters** by `calls.homeownerId = activeHomeownerId` when in scoped mode
3. **Returns** the field to the frontend

---

## Files Modified

1. `lib/services/emailService.ts`
   - Made `buildUniversalNotificationContent()` async
   - Added `await` to `render()` call
   - Updated caller to await the function

2. `components/AIIntakeDashboard.tsx`
   - Changed `isGlobalView` default from `false` to `isAdmin`
   - Added debug logging for filtering logic

---

## Related Systems

### Email System
- **SendGrid Integration:** Working correctly
- **Email Logger:** Logs emails to `email_logs` table
- **Template:** Uses React Email (`UniversalNotificationEmail.tsx`)

### Calls System
- **Database:** Neon PostgreSQL
- **ORM:** Drizzle
- **Real-time Updates:** Pusher integration for live call updates
- **Filtering:** Client-side + server-side filtering

---

## Future Improvements

1. **Email Template Testing:** Add automated tests for email rendering
2. **Type Safety:** Consider stronger typing for async rendering functions
3. **State Management:** Consider using URL params for `isGlobalView` to preserve state on refresh
4. **Performance:** Add pagination for large call lists (currently limited to 100)

---

## Notes

- Both fixes are **non-breaking** and backward compatible
- No database migrations required
- No environment variable changes needed
- Fixes apply to both Netlify Functions and client-side code
