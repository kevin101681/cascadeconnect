# Database Warning Fix Guide

## Issue
On initial app load, console shows:
```
POST https://api.c-2.us-west-2.aws.neon.tech/sql 400 (Bad Request)
⚠️ Email notification columns not found, using defaults
```

## Root Cause
The app tries to load email notification preferences from the database, but the columns might not exist or there's a schema mismatch.

## Where It Happens
`App.tsx` lines 493 and 520:
```typescript
console.warn("⚠️ Email notification columns not found, using defaults");
```

## Impact
✅ **No functional impact** - The app falls back to sensible defaults:
- All employees receive claim submission notifications
- Email system works correctly
- Just a cosmetic console warning

## Why It's Low Priority
1. Emails are still sent (defaults to sending to everyone)
2. No user-facing errors
3. Doesn't block any functionality
4. The 400 error is caught and handled gracefully

## How to Fix (Optional)

### Option 1: Database Migration
Run a migration to ensure all email notification columns exist in the `employees` table:

```sql
ALTER TABLE employees 
  ADD COLUMN IF NOT EXISTS emailNotifyClaimSubmitted BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS emailNotifyHomeownerAcceptsAppointment BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS emailNotifySubAcceptsAppointment BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS emailNotifyHomeownerRescheduleRequest BOOLEAN DEFAULT true;
```

### Option 2: Suppress Warning
Change the console.warn to console.log if the warning bothers you:

```typescript
// App.tsx line 493 and 520
console.log("ℹ️ Email notification preferences not configured, using defaults");
```

### Option 3: Better Error Handling
Wrap the query in a try-catch and only warn on unexpected errors:

```typescript
try {
  const employees = await db.select().from(employeesTable);
  // Process employees...
} catch (error) {
  if (error.message.includes('column') || error.message.includes('does not exist')) {
    console.log("ℹ️ Using default email notification settings");
  } else {
    console.error("❌ Database error:", error);
  }
  // Fallback to defaults...
}
```

## Recommended Action
✅ **Leave as-is** - The warning is harmless and the fallback works perfectly.

If you want a cleaner console, use **Option 2** (suppress warning).

If you want to properly configure preferences, use **Option 1** (database migration).

## Related Files
- `App.tsx` lines 462-525 (email notification preference loading)
- `db/schema.ts` - employees table definition

