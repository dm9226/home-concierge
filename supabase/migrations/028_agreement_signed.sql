-- Track service-agreement signing as part of onboarding. The signed PDF itself
-- lives in the property Files vault (category "Contract"); this records whether
-- and when the agreement was signed so it shows in the onboarding/snapshot.
ALTER TABLE property_onboarding ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
