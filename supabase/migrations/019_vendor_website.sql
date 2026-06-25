-- Website URL for vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website TEXT;
