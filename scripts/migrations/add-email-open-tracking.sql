-- Add email open tracking fields to email_logs table
-- Run this migration in your Neon database console

ALTER TABLE email_logs 
  ADD COLUMN IF NOT EXISTS sendgrid_message_id TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;

-- Create index for faster lookups by message ID (for webhook processing)
CREATE INDEX IF NOT EXISTS idx_email_logs_sendgrid_message_id 
  ON email_logs(sendgrid_message_id) 
  WHERE sendgrid_message_id IS NOT NULL;

-- Create index for opened_at queries
CREATE INDEX IF NOT EXISTS idx_email_logs_opened_at 
  ON email_logs(opened_at) 
  WHERE opened_at IS NOT NULL;

COMMENT ON COLUMN email_logs.sendgrid_message_id IS 'SendGrid message ID for tracking email events';
COMMENT ON COLUMN email_logs.opened_at IS 'Timestamp when the email was first opened (null if not opened yet)';

