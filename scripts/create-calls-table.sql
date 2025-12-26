-- Create calls table for AI Intake Service (Vapi)
-- This script creates ONLY the calls table without affecting other tables

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_call_id TEXT NOT NULL UNIQUE,
  homeowner_id UUID REFERENCES homeowners(id),
  
  -- Call data from Vapi
  homeowner_name TEXT,
  phone_number TEXT,
  property_address TEXT,
  issue_description TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  transcript TEXT,
  recording_url TEXT,
  
  -- Verification status
  is_verified BOOLEAN DEFAULT FALSE,
  address_match_similarity TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on vapi_call_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_calls_vapi_call_id ON calls(vapi_call_id);

-- Create index on homeowner_id for joins
CREATE INDEX IF NOT EXISTS idx_calls_homeowner_id ON calls(homeowner_id);

-- Create index on is_verified for filtering
CREATE INDEX IF NOT EXISTS idx_calls_is_verified ON calls(is_verified);

