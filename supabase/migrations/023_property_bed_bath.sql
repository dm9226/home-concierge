-- Bedroom / bathroom counts on the property (sheet tab 3 "Beds/Baths").
-- Concierge-entered during onboarding; used to pre-fill the inspection setup.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bedroom_count  INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathroom_count INTEGER;
