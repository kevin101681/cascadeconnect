-- Safe schema fix - only adds what's missing
-- Run this in your Neon SQL Editor

-- Check and add report_app_user_id column
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

-- Check and add report_app_linked column
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

-- Check and add report_app_linked_at column
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

-- Verify everything exists
SELECT 
  'homeowners.report_app_user_id' AS check_item,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_user_id'
  ) AS exists
UNION ALL
SELECT 
  'homeowners.report_app_linked',
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_linked'
  )
UNION ALL
SELECT 
  'homeowners.report_app_linked_at',
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_linked_at'
  )
UNION ALL
SELECT 
  'tasks table',
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tasks'
  )
UNION ALL
SELECT 
  'documents table',
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'documents'
  );
