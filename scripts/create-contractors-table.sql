-- Create contractors table if it doesn't exist
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  specialty TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
