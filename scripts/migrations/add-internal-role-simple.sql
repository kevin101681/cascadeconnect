-- Simple migration to add internal_role column
-- Copy and paste each statement separately in Neon SQL Editor

-- Statement 1: Add the column
ALTER TABLE users ADD COLUMN internal_role TEXT;

-- Statement 2: Set default for existing users
UPDATE users SET internal_role = 'Administrator' WHERE role = 'ADMIN' AND internal_role IS NULL;

-- Statement 3: Verify the migration
SELECT id, name, email, role, internal_role FROM users WHERE role = 'ADMIN';

