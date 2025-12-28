-- Add missing notification columns to users table
-- Run each statement separately in Neon SQL Editor

-- Add push notification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_claim_submitted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_accepts_appointment BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_sub_accepts_appointment BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_reschedule_request BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_task_assigned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_message BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_enrollment BOOLEAN DEFAULT false;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'push_notify%'
ORDER BY column_name;

