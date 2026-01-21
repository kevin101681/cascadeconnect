# 🚨 URGENT FIX: Missing Database Columns

## The Error You're Seeing
```
Failed to save employee to database: 
column "push_notify_claim_submitted" of relation "users" does not exist
```

## 🎯 Root Cause
Your database table is missing **multiple notification columns** that the code expects. This happens when:
1. The schema file (`db/schema.ts`) was updated
2. But the actual database table was never migrated
3. So the code tries to insert data into columns that don't exist yet

---

## ✅ QUICKEST FIX (Run This Now)

### Step 1: Open Neon SQL Editor
1. Go to https://console.neon.tech/
2. Select your project: **Cascade Connect**
3. Click **"SQL Editor"** in left sidebar

### Step 2: Copy & Paste This Entire Block
**Copy the ENTIRE block below and paste into the SQL Editor:**

```sql
BEGIN;

-- Internal role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS internal_role TEXT;
UPDATE users SET internal_role = 'Administrator' WHERE role = 'ADMIN' AND internal_role IS NULL;

-- Builder reference
ALTER TABLE users ADD COLUMN IF NOT EXISTS builder_group_id UUID;

-- Email notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_claim_submitted BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_accepts_appointment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_sub_accepts_appointment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_reschedule_request BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_task_assigned BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_enrollment BOOLEAN DEFAULT true;

-- Simplified notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_claims BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_tasks BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_appointments BOOLEAN DEFAULT true;

-- Push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_claim_submitted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_accepts_appointment BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_sub_accepts_appointment BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_reschedule_request BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_task_assigned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_message BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_enrollment BOOLEAN DEFAULT false;

COMMIT;
```

### Step 3: Click "Run"
✅ You should see: `COMMIT` (success!)

### Step 4: Verify It Worked
Copy and paste this to see all columns:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;
```

✅ You should see **ALL** these columns listed:
- `builder_group_id`
- `email_notify_claim_submitted`
- `email_notify_homeowner_accepts_appointment`
- `email_notify_homeowner_enrollment`
- `email_notify_homeowner_reschedule_request`
- `email_notify_sub_accepts_appointment`
- `email_notify_task_assigned`
- `internal_role`
- `notify_appointments`
- `notify_claims`
- `notify_tasks`
- `push_notify_claim_submitted`
- `push_notify_homeowner_accepts_appointment`
- `push_notify_homeowner_enrollment`
- `push_notify_homeowner_message`
- `push_notify_homeowner_reschedule_request`
- `push_notify_sub_accepts_appointment`
- `push_notify_task_assigned`

---

## 🧪 Test It Now

1. **Refresh your browser** (Ctrl+Shift+R)
2. **Open Developer Console** (F12 → Console tab)
3. **Go to Internal Users Modal**
4. **Create a new Employee**
5. **Watch for console messages:**
   - `💾 Saving employee to database: [Name] Employee`
   - `✅ Employee saved to database successfully`

6. **Refresh the page**
7. **Open Internal Users Modal again**
8. **Your Employee should still be there!** ✅

---

## 📋 What This Migration Does

### Adds 20+ Missing Columns:

#### 1. **Internal Role** (1 column)
- `internal_role` - Stores "Administrator" or "Employee"

#### 2. **Builder Reference** (1 column)
- `builder_group_id` - Links users to builder organizations

#### 3. **Email Notifications** (6 columns)
- `email_notify_claim_submitted`
- `email_notify_homeowner_accepts_appointment`
- `email_notify_sub_accepts_appointment`
- `email_notify_homeowner_reschedule_request`
- `email_notify_task_assigned`
- `email_notify_homeowner_enrollment`

#### 4. **Simplified Notifications** (3 columns)
- `notify_claims`
- `notify_tasks`
- `notify_appointments`

#### 5. **Push Notifications** (7 columns)
- `push_notify_claim_submitted`
- `push_notify_homeowner_accepts_appointment`
- `push_notify_sub_accepts_appointment`
- `push_notify_homeowner_reschedule_request`
- `push_notify_task_assigned`
- `push_notify_homeowner_message`
- `push_notify_homeowner_enrollment`

---

## 🔍 Troubleshooting

### ❌ Error: "column already exists"
✅ **This is GOOD!** It means some columns were already there. The `IF NOT EXISTS` clause prevents errors.

### ❌ Error: "relation users does not exist"
✅ **This is BAD.** Your database connection might be wrong. Check:
1. Is `DATABASE_URL` in Netlify environment variables?
2. Is `VITE_DATABASE_URL` in your `.env.local`?
3. Are you connected to the right Neon project?

### ⚠️ Migration runs but employees still don't save
✅ Check the browser console for detailed error messages:
- Look for `❌ Failed to save employee to database:`
- The error message will tell you which column is still missing

---

## 📁 Migration Files Created

1. **`QUICK-FIX-all-user-columns.sql`** ← USE THIS ONE (easiest)
2. `add-all-missing-user-columns.sql` (step-by-step version)
3. `add-push-notification-columns.sql` (just push columns)

All files are in: `scripts/migrations/`

---

## 💡 Why This Happened

**Timeline:**
1. ✅ Code was updated to include notification preferences
2. ✅ `db/schema.ts` was updated with new columns
3. ❌ **Database was never migrated** to match the schema
4. 💥 App tries to insert data → column doesn't exist → error

**Prevention:**
- After updating `db/schema.ts`, always run migrations
- Use Drizzle's migration tools: `npm run db:generate` and `npm run db:migrate`
- Or run SQL manually in Neon (like we just did)

---

## 🎉 Success Checklist

After running the migration:

- [ ] ✅ SQL shows `COMMIT` success
- [ ] ✅ Verification query shows all 20+ columns
- [ ] ✅ Refreshed browser
- [ ] ✅ Console shows `💾 Saving employee to database`
- [ ] ✅ Console shows `✅ Employee saved to database successfully`
- [ ] ✅ Employee appears in list
- [ ] ✅ **After refresh, employee still there!**

---

**Run the migration and you're done!** 🚀

