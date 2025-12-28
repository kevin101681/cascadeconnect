-- Fix missing sendgrid_message_id and opened_at columns in email_logs
-- Run this in Neon SQL Editor

BEGIN;

-- Add sendgrid_message_id column (if not exists)
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS sendgrid_message_id TEXT;

-- Add opened_at column (if not exists)  
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;

COMMIT;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'email_logs' 
AND column_name IN ('sendgrid_message_id', 'opened_at')
ORDER BY column_name;

