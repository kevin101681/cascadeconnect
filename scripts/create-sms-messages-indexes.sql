-- Create indexes for sms_messages table
-- Run this after the table has been created

CREATE INDEX IF NOT EXISTS idx_sms_messages_homeowner_id ON sms_messages(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_call_id ON sms_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);

