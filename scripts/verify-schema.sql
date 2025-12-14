-- Verification Query - Run this to see what actually exists
-- Copy and paste this into your Neon SQL Editor

-- Check homeowners table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'homeowners'
  AND column_name IN ('report_app_user_id', 'report_app_linked', 'report_app_linked_at')
ORDER BY column_name;

-- Check if tasks table exists and show its structure
SELECT 
  'tasks' AS table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- Check if documents table exists and show its structure  
SELECT 
  'documents' AS table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;

-- Summary check
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homeowners' AND column_name = 'report_app_user_id') 
    THEN '✅ report_app_user_id exists'
    ELSE '❌ report_app_user_id MISSING'
  END AS report_app_user_id_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homeowners' AND column_name = 'report_app_linked') 
    THEN '✅ report_app_linked exists'
    ELSE '❌ report_app_linked MISSING'
  END AS report_app_linked_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homeowners' AND column_name = 'report_app_linked_at') 
    THEN '✅ report_app_linked_at exists'
    ELSE '❌ report_app_linked_at MISSING'
  END AS report_app_linked_at_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') 
    THEN '✅ tasks table exists'
    ELSE '❌ tasks table MISSING'
  END AS tasks_table_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') 
    THEN '✅ documents table exists'
    ELSE '❌ documents table MISSING'
  END AS documents_table_status;
