-- Add push notification preference columns to users table
-- Run each ALTER TABLE statement separately in Neon SQL Editor
-- If a column already exists, you'll get an error - that's okay, just skip it

-- Column 1
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_claim_submitted BOOLEAN DEFAULT false;

-- Column 2
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_accepts_appointment BOOLEAN DEFAULT false;

-- Column 3
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_sub_accepts_appointment BOOLEAN DEFAULT false;

-- Column 4
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_reschedule_request BOOLEAN DEFAULT false;

-- Column 5
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_task_assigned BOOLEAN DEFAULT false;

-- Column 6
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_message BOOLEAN DEFAULT false;

-- Set default values for existing users (all false)
UPDATE users 
SET 
  push_notify_claim_submitted = COALESCE(push_notify_claim_submitted, false),
  push_notify_homeowner_accepts_appointment = COALESCE(push_notify_homeowner_accepts_appointment, false),
  push_notify_sub_accepts_appointment = COALESCE(push_notify_sub_accepts_appointment, false),
  push_notify_homeowner_reschedule_request = COALESCE(push_notify_homeowner_reschedule_request, false),
  push_notify_task_assigned = COALESCE(push_notify_task_assigned, false),
  push_notify_homeowner_message = COALESCE(push_notify_homeowner_message, false)
WHERE 
  push_notify_claim_submitted IS NULL 
  OR push_notify_homeowner_accepts_appointment IS NULL
  OR push_notify_sub_accepts_appointment IS NULL
  OR push_notify_homeowner_reschedule_request IS NULL
  OR push_notify_task_assigned IS NULL
  OR push_notify_homeowner_message IS NULL;

-- Drop old push_notifications_enabled column if it exists (replaced by individual preferences)
ALTER TABLE users DROP COLUMN IF EXISTS push_notifications_enabled;

