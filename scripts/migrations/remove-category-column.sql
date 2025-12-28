-- Remove category column from claims table
-- Run this in Neon SQL Editor

BEGIN;

-- Drop the category column (no longer used)
ALTER TABLE claims DROP COLUMN IF EXISTS category;

COMMIT;

-- Verify it was removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'claims' 
ORDER BY column_name;

