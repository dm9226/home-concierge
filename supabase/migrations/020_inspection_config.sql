-- Per-inspection layout config: room counts and feature flags that drive
-- which sections the walkthrough generates (bedrooms, bathrooms, pool, etc.)
ALTER TABLE property_inspections
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;
