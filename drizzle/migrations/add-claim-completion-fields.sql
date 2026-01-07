-- Migration: Add Claim Completion Architecture
-- Date: 2026-01-06
-- Description: Adds scheduledAt, completedAt columns and OPEN/CLOSED status values

-- Step 1: Add new enum values to claim_status
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE IF NOT EXISTS directly
-- We need to check if values already exist before adding them

DO $$
BEGIN
    -- Add OPEN status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OPEN' AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'claim_status'
    )) THEN
        ALTER TYPE claim_status ADD VALUE 'OPEN' BEFORE 'SUBMITTED';
    END IF;

    -- Add CLOSED status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CLOSED' AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'claim_status'
    )) THEN
        ALTER TYPE claim_status ADD VALUE 'CLOSED' AFTER 'SCHEDULED';
    END IF;
END$$;

-- Step 2: Add new timestamp columns to claims table
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_claims_scheduled_at ON claims(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_claims_completed_at ON claims(completed_at);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

-- Step 4: Add helpful comments
COMMENT ON COLUMN claims.scheduled_at IS 'Timestamp when the appointment was confirmed/scheduled';
COMMENT ON COLUMN claims.completed_at IS 'Timestamp when the work was actually finished';

-- Step 5: Optional - Migrate existing data
-- If you have existing claims with SCHEDULED status, you might want to set scheduledAt
-- Uncomment the following line to set scheduledAt for all SCHEDULED claims
-- UPDATE claims SET scheduled_at = COALESCE(date_evaluated, date_submitted) WHERE status = 'SCHEDULED' AND scheduled_at IS NULL;

