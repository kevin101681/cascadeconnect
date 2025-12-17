-- Add email notification preference columns to users table
-- Run each ALTER TABLE statement separately in Neon SQL Editor
-- If a column already exists, you'll get an error - that's okay, just skip it

-- Column 1
ALTER TABLE users ADD COLUMN email_notify_claim_submitted BOOLEAN DEFAULT true;

-- Column 2
ALTER TABLE users ADD COLUMN email_notify_homeowner_accepts_appointment BOOLEAN DEFAULT true;

-- Column 3
ALTER TABLE users ADD COLUMN email_notify_sub_accepts_appointment BOOLEAN DEFAULT true;

-- Column 4
ALTER TABLE users ADD COLUMN email_notify_homeowner_reschedule_request BOOLEAN DEFAULT true;

-- Column 5
ALTER TABLE users ADD COLUMN email_notify_task_assigned BOOLEAN DEFAULT true;

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
