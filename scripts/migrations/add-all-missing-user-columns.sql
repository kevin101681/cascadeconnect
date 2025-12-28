-- Comprehensive migration: Add ALL missing columns to users table
-- Run each statement separately in Neon SQL Editor (copy/paste one at a time)

-- ============================================
-- STEP 1: Add internal_role column
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS internal_role TEXT;

-- Set default for existing ADMIN users
UPDATE users SET internal_role = 'Administrator' WHERE role = 'ADMIN' AND internal_role IS NULL;


-- ============================================
-- STEP 2: Add builder reference column
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS builder_group_id UUID;


-- ============================================
-- STEP 3: Add email notification columns
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_claim_submitted BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_accepts_appointment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_sub_accepts_appointment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_reschedule_request BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_task_assigned BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notify_homeowner_enrollment BOOLEAN DEFAULT true;


-- ============================================
-- STEP 4: Add simplified notification columns
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_claims BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_tasks BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_appointments BOOLEAN DEFAULT true;


-- ============================================
-- STEP 5: Add push notification columns
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_claim_submitted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_accepts_appointment BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_sub_accepts_appointment BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_reschedule_request BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_task_assigned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_message BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notify_homeowner_enrollment BOOLEAN DEFAULT false;


-- ============================================
-- STEP 6: Verify ALL columns exist
-- ============================================
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

