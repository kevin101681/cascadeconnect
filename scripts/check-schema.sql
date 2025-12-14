-- Check what columns exist in homeowners table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'homeowners'
ORDER BY ordinal_position;

-- Check if tasks table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'tasks'
) AS tasks_exists;

-- Check if documents table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  WHERE table_name = 'documents'
) AS documents_exists;

-- Check tasks table columns if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- Check documents table columns if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;
