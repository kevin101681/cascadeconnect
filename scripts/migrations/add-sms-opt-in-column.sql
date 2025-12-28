-- Add SMS opt-in column to homeowners table
-- Run this in Neon SQL Editor

BEGIN;

-- Add the sms_opt_in column
ALTER TABLE homeowners ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;

COMMIT;

-- Verify it worked
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'homeowners' AND column_name = 'sms_opt_in';

