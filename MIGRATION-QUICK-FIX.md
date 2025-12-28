# Quick Fix: Run Migration in Neon SQL Editor

## The Problem
You're seeing this error:
```
ERROR: syntax error at or near "ALTER" (SQLSTATE 42601)
EXPLAIN (FORMAT JSON, COSTS, BUFFERS, VERBOSE) ALTER TABLE...
```

**Why?** Neon's SQL Editor is trying to EXPLAIN your ALTER TABLE command, which doesn't work.

---

## ✅ Solution: Run Each Statement Separately

### Step 1: Open Neon SQL Editor
1. Go to https://console.neon.tech/
2. Select your project
3. Click "SQL Editor" in the left sidebar

### Step 2: Run Statement 1
**Copy and paste this, then click "Run":**
```sql
ALTER TABLE users ADD COLUMN internal_role TEXT;
```

✅ You should see: `ALTER TABLE` (success message)

---

### Step 3: Run Statement 2
**Copy and paste this, then click "Run":**
```sql
UPDATE users SET internal_role = 'Administrator' WHERE role = 'ADMIN' AND internal_role IS NULL;
```

✅ You should see: `UPDATE X` (where X is the number of users updated)

---

### Step 4: Verify It Worked
**Copy and paste this, then click "Run":**
```sql
SELECT id, name, email, role, internal_role FROM users WHERE role = 'ADMIN';
```

✅ You should see your users with `internal_role` column populated!

---

## 🧪 Test in the App

1. **Refresh your browser** (to reload code with better error messages)
2. **Open Console** (F12 → Console tab)
3. **Go to Internal Users modal**
4. **Create a new Employee user**
5. **Watch the console for:**
   - `💾 Saving employee to database: [Name] Employee`
   - `✅ Employee saved to database successfully`

6. **Refresh the page**
7. **Open Internal Users modal again**
8. **Your Employee should still be there!** ✅

---

## 🚨 If You Still Get Errors

### Error: "column internal_role does not exist"
❌ Migration didn't run successfully
✅ **Go back to Step 2 and run the ALTER TABLE again**

### Error: "internal_role is null"
❌ Statement 2 didn't run
✅ **Run the UPDATE statement from Step 3**

### Users still disappear after refresh
❌ Check the console for error messages
✅ **Look for the 💾 and ❌ messages when saving**

---

## 📋 Alternative: Use Transaction (All at Once)

If you want to run all statements together:

```sql
BEGIN;
ALTER TABLE users ADD COLUMN internal_role TEXT;
UPDATE users SET internal_role = 'Administrator' WHERE role = 'ADMIN' AND internal_role IS NULL;
COMMIT;
```

Then verify:
```sql
SELECT id, name, email, role, internal_role FROM users WHERE role = 'ADMIN';
```

---

## 🔍 Troubleshooting Console Messages

### ✅ Success Messages
```
💾 Saving employee to database: John Doe Employee
✅ Employee saved to database successfully
```
**Meaning**: Everything working! User is saved.

### ❌ Error Messages
```
❌ Failed to save employee to database: column "internal_role" does not exist
```
**Meaning**: Migration not run yet. Go run the ALTER TABLE.

### ⚠️ Warning Messages
```
⚠️ Database not configured, employee only saved to localStorage
```
**Meaning**: DATABASE_URL environment variable missing. Check your `.env.local` file.

---

## 💡 Quick Summary

**The issue:** Neon SQL Editor adds `EXPLAIN` to queries, breaking ALTER TABLE  
**The fix:** Run each SQL statement separately, one at a time  
**The test:** Create employee → refresh → employee still there ✅

**Migration file:** `scripts/migrations/add-internal-role-simple.sql`

