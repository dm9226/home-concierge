-- In-tool service agreement with electronic acceptance (click-wrap).
-- Staff prepare the terms (merged with property/owner/plan data at render time);
-- the client reads and electronically accepts. Acceptance records the signer's
-- typed name, timestamp, IP, and a frozen snapshot of the accepted terms as the
-- audit trail (valid e-signature under ESIGN/UETA for this kind of agreement).

CREATE TYPE agreement_status AS ENUM ('draft', 'sent', 'accepted', 'void');

CREATE TABLE service_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  status agreement_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL DEFAULT 'Membership Agreement',
  body TEXT NOT NULL,
  -- Acceptance audit trail
  accepted_by UUID REFERENCES users(id),
  signer_name TEXT,
  accepted_at TIMESTAMPTZ,
  accepted_ip TEXT,
  accepted_snapshot TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_agreements_property ON service_agreements(property_id);

ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;

-- Clients can read their own property's agreement. Acceptance is performed by
-- /api/agreements/[id]/accept (admin client) after verifying access, so no
-- client UPDATE policy is granted.
CREATE POLICY "agreement_select" ON service_agreements
  FOR SELECT USING (can_access_property(property_id));
CREATE POLICY "agreement_insert_staff" ON service_agreements
  FOR INSERT WITH CHECK (is_staff() AND can_access_property(property_id));
CREATE POLICY "agreement_update_staff" ON service_agreements
  FOR UPDATE USING (is_staff() AND can_access_property(property_id));
CREATE POLICY "agreement_delete_staff" ON service_agreements
  FOR DELETE USING (is_admin());
