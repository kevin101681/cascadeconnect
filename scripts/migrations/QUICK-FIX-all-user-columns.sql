-- ⚡ QUICK FIX: Run ALL missing column migrations at once
-- Copy and paste this ENTIRE block into Neon SQL Editor and click "Run"

BEGIN;

-- Internal role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS internal_role TEXT;
UPDATE users SET internal_role = 'Administrator' WHERE role = 'ADMIN' AND internal_role IS NULL;

-- Builder reference
ALTER TABLE users ADD COLUMN IF NOT EXISTS builder_group_id UUID;

-- Email notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_claim_submitted BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_accepts_appointment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_sub_accepts_appointment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_reschedule_request BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_task_assigned BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_enrollment BOOLEAN DEFAULT true;

-- Simplified notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_claims BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_tasks BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_appointments BOOLEAN DEFAULT true;

-- Push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_claim_submitted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_accepts_appointment BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_sub_accepts_appointment BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_reschedule_request BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_task_assigned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_message BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_enrollment BOOLEAN DEFAULT false;

COMMIT;

-- Verify it worked (run this separately to see results)
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

