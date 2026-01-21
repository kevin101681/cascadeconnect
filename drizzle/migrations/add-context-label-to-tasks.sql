-- Add context_label column to tasks table for Notes context display
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS context_label TEXT;

-- Create index on context_label for faster filtering (optional)
CREATE INDEX IF NOT EXISTS idx_tasks_context_label ON tasks(context_label);
