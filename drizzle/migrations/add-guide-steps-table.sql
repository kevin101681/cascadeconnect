-- Add guide_steps table for Homeowner Warranty Guide
CREATE TABLE IF NOT EXISTS guide_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on sort_order for efficient ordering
CREATE INDEX IF NOT EXISTS idx_guide_steps_sort_order ON guide_steps(sort_order);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_guide_steps_is_active ON guide_steps(is_active);
