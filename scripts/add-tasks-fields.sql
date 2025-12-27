ALTER TABLE tasks ADD COLUMN content TEXT;
ALTER TABLE tasks ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
UPDATE tasks SET created_at = date_assigned WHERE created_at IS NULL AND date_assigned IS NOT NULL;
ALTER TABLE tasks ADD COLUMN claim_id UUID;
CREATE INDEX IF NOT EXISTS idx_tasks_claim_id ON tasks(claim_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
ALTER TABLE tasks ADD CONSTRAINT tasks_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES claims(id);

