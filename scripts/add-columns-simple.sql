-- Simple approach: Just try to add the columns
-- If they already exist, you'll get an error but that's okay - just ignore it
-- Run each statement one at a time

-- Try to add report_app_user_id (ignore error if it already exists)
ALTER TABLE homeowners ADD COLUMN report_app_user_id TEXT;

-- Try to add report_app_linked (ignore error if it already exists)
ALTER TABLE homeowners ADD COLUMN report_app_linked BOOLEAN DEFAULT FALSE;

-- Try to add report_app_linked_at (ignore error if it already exists)
ALTER TABLE homeowners ADD COLUMN report_app_linked_at TIMESTAMP;

-- Create tasks table (safe - won't error if exists)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_id TEXT,
  assigned_by_id TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  date_assigned TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  related_claim_ids JSONB DEFAULT '[]'::jsonb
);

-- Create documents table (safe - won't error if exists)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES homeowners(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'FILE',
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
