-- Safe approach: Check first, then add
-- This works in most SQL editors that support subqueries

-- Add report_app_user_id if missing
-- Run this query - if it returns 0 rows, the column doesn't exist
SELECT CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_user_id'
  ) THEN 'Column report_app_user_id already exists - no action needed'
  ELSE 'Run: ALTER TABLE homeowners ADD COLUMN report_app_user_id TEXT;'
END AS action;

-- Add report_app_linked if missing
SELECT CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_linked'
  ) THEN 'Column report_app_linked already exists - no action needed'
  ELSE 'Run: ALTER TABLE homeowners ADD COLUMN report_app_linked BOOLEAN DEFAULT FALSE;'
END AS action;

-- Add report_app_linked_at if missing
SELECT CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'homeowners' AND column_name = 'report_app_linked_at'
  ) THEN 'Column report_app_linked_at already exists - no action needed'
  ELSE 'Run: ALTER TABLE homeowners ADD COLUMN report_app_linked_at TIMESTAMP;'
END AS action;
