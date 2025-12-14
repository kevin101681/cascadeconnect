-- Correct SQL to add missing columns and tables
-- Run this in your Neon SQL Editor (run the entire block at once)

-- Add report_app_user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_user_id'
  ) THEN
    ALTER TABLE homeowners ADD COLUMN report_app_user_id TEXT;
    RAISE NOTICE 'Added report_app_user_id column';
  ELSE
    RAISE NOTICE 'report_app_user_id column already exists';
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
    RAISE NOTICE 'Added report_app_linked column';
  ELSE
    RAISE NOTICE 'report_app_linked column already exists';
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
    RAISE NOTICE 'Added report_app_linked_at column';
  ELSE
    RAISE NOTICE 'report_app_linked_at column already exists';
  END IF;
END $$;

-- Create tasks table if it doesn't exist
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

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES homeowners(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'FILE',
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Verification query - run this separately to check results
SELECT 
  'homeowners.report_app_user_id' AS item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homeowners' AND column_name = 'report_app_user_id') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
UNION ALL
SELECT 
  'homeowners.report_app_linked',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homeowners' AND column_name = 'report_app_linked') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  'homeowners.report_app_linked_at',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homeowners' AND column_name = 'report_app_linked_at') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  'tasks table',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  'documents table',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END;
