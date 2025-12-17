-- Add email notification preference columns to users table
-- These columns default to true (users will receive notifications by default)
-- Using DO blocks to safely add columns only if they don't exist

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_notify_claim_submitted') THEN
        ALTER TABLE users ADD COLUMN email_notify_claim_submitted BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_notify_homeowner_accepts_appointment') THEN
        ALTER TABLE users ADD COLUMN email_notify_homeowner_accepts_appointment BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_notify_sub_accepts_appointment') THEN
        ALTER TABLE users ADD COLUMN email_notify_sub_accepts_appointment BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_notify_homeowner_reschedule_request') THEN
        ALTER TABLE users ADD COLUMN email_notify_homeowner_reschedule_request BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_notify_task_assigned') THEN
        ALTER TABLE users ADD COLUMN email_notify_task_assigned BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Set default values for existing users (all true)
UPDATE users 
SET 
  email_notify_claim_submitted = COALESCE(email_notify_claim_submitted, true),
  email_notify_homeowner_accepts_appointment = COALESCE(email_notify_homeowner_accepts_appointment, true),
  email_notify_sub_accepts_appointment = COALESCE(email_notify_sub_accepts_appointment, true),
  email_notify_homeowner_reschedule_request = COALESCE(email_notify_homeowner_reschedule_request, true),
  email_notify_task_assigned = COALESCE(email_notify_task_assigned, true)
WHERE 
  email_notify_claim_submitted IS NULL 
  OR email_notify_homeowner_accepts_appointment IS NULL
  OR email_notify_sub_accepts_appointment IS NULL
  OR email_notify_homeowner_reschedule_request IS NULL
  OR email_notify_task_assigned IS NULL;
