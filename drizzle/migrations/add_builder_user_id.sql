-- Migration: Add builder_user_id to homeowners table
-- This replaces the old builderGroupId with a direct reference to a builder user

-- Step 1: Add the new column
ALTER TABLE homeowners ADD COLUMN IF NOT EXISTS builder_user_id UUID;

-- Step 2: Add foreign key constraint to users table
ALTER TABLE homeowners ADD CONSTRAINT homeowners_builder_user_id_fkey 
  FOREIGN KEY (builder_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: (Optional) Drop old builderGroupId column after data migration
-- ALTER TABLE homeowners DROP COLUMN IF EXISTS builder_group_id;

-- Note: We keep builder_group_id for now to allow gradual migration
-- Once all homeowners are assigned to builder users, we can drop it

