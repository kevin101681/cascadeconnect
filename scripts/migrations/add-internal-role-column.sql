-- Add internal_role column to users table
-- This stores the specific internal role (Administrator, Employee, etc.) for ADMIN users

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS internal_role TEXT;

-- Update existing ADMIN users to have Administrator as their internal role
UPDATE users 
  SET internal_role = 'Administrator' 
  WHERE role = 'ADMIN' AND internal_role IS NULL;

COMMENT ON COLUMN users.internal_role IS 'Internal role for ADMIN users (Administrator, Employee, etc.)';

