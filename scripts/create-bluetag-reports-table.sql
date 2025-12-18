-- Create bluetag_reports table for storing BlueTag punch list reports
-- This table stores the project and locations data for each homeowner's punch list

CREATE TABLE IF NOT EXISTS bluetag_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES homeowners(id) ON DELETE CASCADE,
  project JSONB NOT NULL, -- Stores ProjectDetails
  locations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Stores LocationGroup[]
  last_modified TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(homeowner_id) -- One report per homeowner
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bluetag_reports_homeowner_id ON bluetag_reports(homeowner_id);

-- Add comment
COMMENT ON TABLE bluetag_reports IS 'Stores BlueTag punch list reports (project and locations data) for each homeowner';
