-- SMS SYSTEM REBUILD MIGRATION
-- December 29, 2025
-- Drops old sms_messages table and creates new thread-based structure

-- Drop old table (if exists)
DROP TABLE IF EXISTS sms_messages CASCADE;

-- Create SMS Threads table
CREATE TABLE IF NOT EXISTS sms_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES homeowners(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create SMS Messages table
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES sms_threads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'received')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_threads_homeowner ON sms_threads(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_sms_threads_phone ON sms_threads(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_threads_last_message ON sms_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_thread ON sms_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON sms_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);

-- Add comment
COMMENT ON TABLE sms_threads IS 'SMS conversation threads - one per homeowner';
COMMENT ON TABLE sms_messages IS 'Individual SMS messages within threads';

