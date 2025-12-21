-- Add phone column to contractors table
-- This column stores contractor phone numbers

ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Note: Existing contractors will have NULL phone values.
-- You can update them manually if needed.

