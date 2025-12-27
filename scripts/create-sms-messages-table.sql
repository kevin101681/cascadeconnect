CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homeowner_id UUID NOT NULL REFERENCES homeowners(id),
    call_id UUID,
    direction TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT NOW()
);

