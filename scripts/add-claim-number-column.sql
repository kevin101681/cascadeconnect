-- Add claim_number column to claims table
-- This column stores sequential claim numbers per homeowner (1, 2, 3, etc.)

ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS claim_number TEXT;

-- Note: Existing claims will have NULL claim_number values.
-- New claims will automatically get sequential numbers assigned per homeowner.

