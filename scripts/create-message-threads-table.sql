-- Create message_threads table if it doesn't exist
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  homeowner_id UUID REFERENCES homeowners(id),
  participants JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP DEFAULT NOW(),
  messages JSONB DEFAULT '[]'::jsonb
);
