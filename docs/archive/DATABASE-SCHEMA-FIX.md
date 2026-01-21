# Database Schema Sync Fix

## Problem
The database schema in your Neon database is out of sync with the code. Missing:
- Column `report_app_user_id` in `homeowners` table
- Column `report_app_linked` in `homeowners` table  
- Column `report_app_linked_at` in `homeowners` table
- Table `tasks`
- Table `documents`

## Solution: Push Schema to Database

### Step 1: Set Database URL Locally
You need to set the database URL in your local environment to run the migration.

**Option A: Create .env.local file (recommended)**
```bash
# Create .env.local in the project root
VITE_DATABASE_URL=your_neon_connection_string_here
```

**Option B: Set environment variable for this session**
```powershell
# Windows PowerShell
$env:VITE_DATABASE_URL="your_neon_connection_string_here"
npm run db:push
```

**Option C: Use the same URL from Netlify**
1. Go to Netlify dashboard > Site settings > Environment variables
2. Copy the value of `VITE_DATABASE_URL`
3. Use it in one of the options above

**For production (Netlify):**
Set `VITE_DATABASE_URL` in Netlify dashboard:
1. Go to Site settings > Environment variables
2. Add `VITE_DATABASE_URL` with your Neon connection string

### Step 2: Push Schema to Database

Run this command to sync your schema:

```bash
npm run db:push
```

This will:
- Compare your schema.ts file with the actual database
- Add missing columns and tables
- Update the database to match your code

### Step 3: Verify

After running `db:push`, check the console output. You should see:
- ✅ Tables created/updated
- ✅ Columns added

### Step 4: Redeploy

After pushing the schema, redeploy to Netlify:

```bash
npm run build
npm run netlify:deploy:prod
```

## Alternative: Manual SQL (if drizzle-kit push fails)

**IMPORTANT:** PostgreSQL doesn't support `IF NOT EXISTS` with `ALTER TABLE ADD COLUMN`. Use the DO blocks below:

Run this SQL in your Neon SQL Editor (see `scripts/fix-schema-correct.sql`):

```sql
-- Add report_app_user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_user_id'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN report_app_user_id TEXT;
  END IF;
END $$;

-- Add report_app_linked column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_linked'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN report_app_linked BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add report_app_linked_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_linked_at'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN report_app_linked_at TIMESTAMP;
  END IF;
END $$;

-- Create tasks table (IF NOT EXISTS works with CREATE TABLE)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_id TEXT,
  assigned_by_id TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  date_assigned TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  related_claim_ids JSONB DEFAULT '[]'::jsonb
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES homeowners(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'FILE',
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### "Connection refused" or "Cannot connect"
- Verify your `VITE_DATABASE_URL` is correct
- Check that your Neon database is running
- Ensure the connection string includes `?sslmode=require`

### "Permission denied"
- Make sure your database user has CREATE/ALTER permissions
- Check your Neon project settings

### "Table already exists" errors
- This is normal if tables already exist
- The `IF NOT EXISTS` clauses will skip existing objects
