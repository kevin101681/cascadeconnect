-- Create all missing tables for Cascade Connect
-- Run this in your Neon SQL Editor for production database

-- 1. Create contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  specialty TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create message_threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  homeowner_id UUID REFERENCES homeowners(id),
  participants JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP DEFAULT NOW(),
  messages JSONB DEFAULT '[]'::jsonb
);
