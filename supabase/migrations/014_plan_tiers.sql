-- Add plan_tier to properties
ALTER TABLE properties
  ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'proactive'
  CHECK (plan_tier IN ('proactive', 'proactive_plus'));
