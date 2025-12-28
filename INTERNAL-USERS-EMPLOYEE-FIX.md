# Fix: Internal Users Not Showing Employee Role

## Issue
Employee users were not displaying correctly in the Internal Users modal. When creating an employee with role "Employee", they would either not appear or appear as "Administrator".

## Root Cause

### Database Schema Limitation
The `users` table in the database only has these roles in the enum:
- `ADMIN`
- `HOMEOWNER`
- `BUILDER`

### The Problem
1. Both **Administrators** and **Employees** are stored with `role = 'ADMIN'` in the database
2. The app has display roles like "Administrator", "Employee", etc.
3. When syncing from database, ALL users with `role = 'ADMIN'` were mapped to `'Administrator'`
4. This lost the distinction between Administrator and Employee roles

### Code Flow (Before Fix)
```
Create Employee →
  Save to DB with role='ADMIN' →
    Reload from DB →
      Filter for role='ADMIN' →
        Map ALL to 'Administrator' ❌
```

## Solution

### Added `internal_role` Column
Added a new column to the `users` table to store the specific internal role:

```sql
ALTER TABLE users ADD COLUMN internal_role TEXT;
```

### Updated Code

#### 1. Schema (`db/schema.ts`)
```typescript
export const users = pgTable('users', {
  // ... existing fields
  role: userRoleEnum('role').default('ADMIN'),  // DB enum
  internalRole: text('internal_role'),           // NEW: Stores actual role
  // ... rest of fields
});
```

#### 2. handleAddEmployee (`App.tsx`)
```typescript
await db.insert(usersTable).values({
  role: 'ADMIN',            // Always ADMIN for internal users
  internalRole: emp.role,   // Store actual role (Administrator/Employee)
  // ... other fields
});
```

#### 3. handleUpdateEmployee (`App.tsx`)
```typescript
await db.update(usersTable).set({
  internalRole: emp.role,  // Update the internal role
  // ... other fields
});
```

#### 4. Sync Function (`App.tsx`)
```typescript
const fetchedEmployees = dbUsers
  .filter(u => u.role === 'ADMIN')
  .map(u => ({
    role: u.internalRole || 'Administrator',  // Use internalRole!
    // ... other fields
  }));
```

## Migration Required

### Run This SQL in Neon Console

```sql
-- Add the column
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS internal_role TEXT;

-- Update existing users
UPDATE users 
  SET internal_role = 'Administrator' 
  WHERE role = 'ADMIN' AND internal_role IS NULL;
```

**SQL File**: `scripts/migrations/add-internal-role-column.sql`

**Neon Console**: https://console.neon.tech/

## Testing

### Step 1: Run Migration
1. Go to Neon Console
2. Select your project
3. Open SQL Editor
4. Run the migration SQL
5. Verify: `SELECT id, name, email, role, internal_role FROM users WHERE role = 'ADMIN';`

### Step 2: Existing Employee Users
If you already created employee users before this fix:

```sql
-- Find them
SELECT id, name, email, role, internal_role 
FROM users 
WHERE role = 'ADMIN';

-- Update specific user to Employee
UPDATE users 
SET internal_role = 'Employee' 
WHERE email = 'employee@example.com';
```

### Step 3: Test in App
1. Log in as admin
2. Go to Internal Users modal
3. Your employee users should now appear!
4. Create a new Employee user
5. Refresh the page
6. Employee should still show with "Employee" role

## How It Works Now

### Create Employee Flow
```
1. Create user with role "Employee" in UI
   ↓
2. Save to database:
   - role = 'ADMIN' (for database enum)
   - internal_role = 'Employee' (for display)
   ↓
3. Reload from database
   ↓
4. Filter for role = 'ADMIN'
   ↓
5. Map to internal_role = 'Employee' ✅
   ↓
6. Display as "Employee" in UI
```

### Role Mapping

| UI Role        | DB Role | DB Internal Role |
|----------------|---------|------------------|
| Administrator  | ADMIN   | Administrator    |
| Employee       | ADMIN   | Employee         |
| Builder User   | BUILDER | (not used)       |
| Homeowner      | HOMEOWNER | (not used)     |

## Backward Compatibility

### Default Behavior
- If `internal_role` is `NULL`, defaults to `'Administrator'`
- Existing users without `internal_role` will show as Administrator
- Safe to deploy without breaking existing users

### Migration Updates
The migration SQL automatically sets `internal_role = 'Administrator'` for all existing ADMIN users.

## Future Improvements

### 1. More Internal Roles
You can now add more granular roles:
- "Project Manager"
- "Customer Service"
- "Accounting"
- etc.

Just use these strings in the UI, they'll be stored in `internal_role`.

### 2. Role-Based Permissions
Could add permissions based on `internal_role`:
```typescript
const canDeleteClaims = employee.role === 'Administrator';
const canViewFinancials = ['Administrator', 'Accounting'].includes(employee.role);
```

### 3. Custom Role Creation
Could allow admins to create custom roles in the UI.

## Related Files
- `db/schema.ts` - Added `internalRole` field
- `App.tsx` - Updated create/update/sync functions
- `scripts/migrations/add-internal-role-column.sql` - Database migration

## Status
✅ **FIXED** - Employee users now display correctly with proper role distinction!

## Next Steps
1. ⚠️ **Run the migration** in Neon Console (required!)
2. ⚠️ **Update existing employee users** if any (see Testing section)
3. ✅ **Test** by creating a new Employee user
4. ✅ **Verify** they appear in Internal Users modal

