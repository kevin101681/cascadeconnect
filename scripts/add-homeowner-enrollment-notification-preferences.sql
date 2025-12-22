-- Add email and push notification preferences for homeowner enrollment
-- Run this migration to add the new columns to the users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_notify_homeowner_enrollment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notify_homeowner_enrollment BOOLEAN DEFAULT false;

