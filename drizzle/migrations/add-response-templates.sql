-- Add response_templates table for non-warranty explanation templates
CREATE TABLE IF NOT EXISTS response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS response_templates_title_idx ON response_templates (title);
CREATE INDEX IF NOT EXISTS response_templates_category_idx ON response_templates (category);

