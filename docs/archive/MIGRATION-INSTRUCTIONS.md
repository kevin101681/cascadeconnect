# 🔄 SMS MIGRATION - MANUAL EXECUTION GUIDE

Since we can't automatically access your database URL, please follow these steps:

## Option 1: Run via Neon SQL Editor (RECOMMENDED)

1. **Open Neon Console**:
   - Go to https://console.neon.tech
   - Select your project
   - Click "SQL Editor"

2. **Copy the migration SQL**:
   - File: `scripts/migrations/sms-system-rebuild.sql`
   - Copy all contents

3. **Execute in SQL Editor**:
   - Paste the SQL into the editor
   - Click "Run" or press `Ctrl+Enter`
   - Verify all statements execute successfully

4. **Verify Success**:
   ```sql
   -- Check tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name IN ('sms_threads', 'sms_messages');
   
   -- Should return 2 rows
   ```

---

## Option 2: Run via PowerShell Script

1. **Add your database URL to .env**:
   ```env
   VITE_DATABASE_URL=postgresql://your-connection-string
   ```

2. **Run the migration script**:
   ```bash
   npx tsx scripts/run-sms-migration.ts
   ```

---

## Option 3: Run via psql Command Line

If you have PostgreSQL client installed:

```bash
psql "your-neon-connection-string" -f scripts/migrations/sms-system-rebuild.sql
```

---

## ✅ Verification

After running the migration, verify with:

```sql
-- Check table structure
\d sms_threads
\d sms_messages

-- Check indexes
\di idx_sms_*
```

Expected result:
- ✅ `sms_threads` table with 4 columns
- ✅ `sms_messages` table with 6 columns  
- ✅ 6 indexes created
- ✅ Foreign key constraints in place

---

## 🚨 If Migration Fails

**Error: "relation sms_messages already exists"**
- Old table still exists
- Run: `DROP TABLE IF EXISTS sms_messages CASCADE;` first

**Error: "column does not exist"**
- Schema mismatch
- Check your current schema vs. migration file

**Error: "permission denied"**
- Database user lacks permissions
- Use database owner credentials

---

## 📞 Need Help?

The migration SQL is simple and safe:
1. Drops old `sms_messages` table
2. Creates new `sms_threads` table
3. Creates new `sms_messages` table with thread references
4. Adds 6 performance indexes
5. Adds table comments

All statements use `IF NOT EXISTS` or `CASCADE` for safety.

