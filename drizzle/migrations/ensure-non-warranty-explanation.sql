-- Ensure non_warranty_explanation column exists in claims table
-- This column may already exist from previous schema, but this migration ensures it

-- Add column if it doesn't exist (PostgreSQL syntax)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' 
        AND column_name = 'non_warranty_explanation'
    ) THEN
        ALTER TABLE claims ADD COLUMN non_warranty_explanation TEXT;
    END IF;
END $$;

-- Create index for faster queries on non-warranty claims
CREATE INDEX IF NOT EXISTS claims_non_warranty_explanation_idx 
ON claims (non_warranty_explanation) 
WHERE non_warranty_explanation IS NOT NULL;

