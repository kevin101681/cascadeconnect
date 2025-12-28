-- Add new notification preference columns to users table
-- These are simplified boolean flags for centralized notification service
-- All default to true (users receive notifications by default)

-- Add notify_claims column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notify_claims BOOLEAN DEFAULT true;

-- Add notify_tasks column  
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notify_tasks BOOLEAN DEFAULT true;

-- Add notify_appointments column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notify_appointments BOOLEAN DEFAULT true;

-- Update existing users to have these preferences enabled by default
UPDATE users 
SET 
  notify_claims = COALESCE(notify_claims, true),
  notify_tasks = COALESCE(notify_tasks, true),
  notify_appointments = COALESCE(notify_appointments, true)
WHERE 
  notify_claims IS NULL 
  OR notify_tasks IS NULL
  OR notify_appointments IS NULL;

-- Verify the changes
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN notify_claims = true THEN 1 END) as users_with_claim_notifications,
  COUNT(CASE WHEN notify_tasks = true THEN 1 END) as users_with_task_notifications,
  COUNT(CASE WHEN notify_appointments = true THEN 1 END) as users_with_appointment_notifications
FROM users;

