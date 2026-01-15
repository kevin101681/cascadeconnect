-- Migration: Add enrollment_slug column to builder_groups table
-- Date: 2026-01-15
-- Purpose: Enable per-builder public enrollment URLs

-- Step 1: Add the column (nullable initially for backfill)
ALTER TABLE builder_groups 
ADD COLUMN IF NOT EXISTS enrollment_slug TEXT;

-- Step 2: Backfill existing builders with kebab-case slugs from their names
-- This creates URL-safe slugs like "cascade-builders" from "Cascade Builders"
UPDATE builder_groups
SET enrollment_slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),  -- Remove special chars
      '\s+', '-', 'g'                                      -- Replace spaces with hyphens
    ),
    '-+', '-', 'g'                                         -- Remove duplicate hyphens
  )
)
WHERE enrollment_slug IS NULL;

-- Step 3: Handle potential duplicates by appending a number
-- If "cascade-builders" exists twice, make second one "cascade-builders-2"
WITH numbered_duplicates AS (
  SELECT 
    id,
    enrollment_slug,
    ROW_NUMBER() OVER (
      PARTITION BY enrollment_slug 
      ORDER BY created_at
    ) as rn
  FROM builder_groups
  WHERE enrollment_slug IS NOT NULL
)
UPDATE builder_groups b
SET enrollment_slug = b.enrollment_slug || '-' || nd.rn
FROM numbered_duplicates nd
WHERE b.id = nd.id 
AND nd.rn > 1;

-- Step 4: Add unique constraint (after ensuring all slugs are unique)
ALTER TABLE builder_groups 
ADD CONSTRAINT IF NOT EXISTS builder_groups_enrollment_slug_unique 
UNIQUE (enrollment_slug);

-- Step 5: Verify the migration
SELECT id, name, enrollment_slug 
FROM builder_groups 
ORDER BY created_at
LIMIT 10;
