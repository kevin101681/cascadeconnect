-- Add push notification preference column to users table
-- Run this in Neon SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT false;

-- Set default value for existing users (all false)
UPDATE users 
SET push_notifications_enabled = COALESCE(push_notifications_enabled, false)
WHERE push_notifications_enabled IS NULL;

