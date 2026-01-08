-- Add replyToId column to internal_messages table
-- January 6, 2026 - Quote Reply Feature

ALTER TABLE internal_messages 
ADD COLUMN reply_to_id UUID REFERENCES internal_messages(id);

-- Create index for faster lookups of replies
CREATE INDEX idx_internal_messages_reply_to_id ON internal_messages(reply_to_id);


