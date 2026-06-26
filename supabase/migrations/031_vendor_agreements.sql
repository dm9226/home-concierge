-- Vendor partnership agreements with tokenized public signing.
-- Vendors have no login, so execution happens via a unique access_token link
-- emailed to the vendor; the public signing page and accept endpoint look the
-- agreement up by token through the service role (no anon RLS needed).

CREATE TYPE vendor_agreement_status AS ENUM ('draft', 'sent', 'accepted', 'void');

CREATE TABLE vendor_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
  status vendor_agreement_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL DEFAULT 'Vendor Partnership Agreement',
  body TEXT NOT NULL,
  access_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  -- Execution audit trail
  signer_name TEXT,
  signer_title TEXT,
  signer_email TEXT,
  accepted_at TIMESTAMPTZ,
  accepted_ip TEXT,
  accepted_snapshot TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_agreements_vendor ON vendor_agreements(vendor_id);
CREATE UNIQUE INDEX idx_vendor_agreements_token ON vendor_agreements(access_token);

ALTER TABLE vendor_agreements ENABLE ROW LEVEL SECURITY;

-- Staff manage; the public signing flow uses the service role, so no anon policy.
CREATE POLICY "vendor_agreement_select" ON vendor_agreements
  FOR SELECT USING (is_staff());
CREATE POLICY "vendor_agreement_insert" ON vendor_agreements
  FOR INSERT WITH CHECK (is_staff());
CREATE POLICY "vendor_agreement_update" ON vendor_agreements
  FOR UPDATE USING (is_staff());
CREATE POLICY "vendor_agreement_delete" ON vendor_agreements
  FOR DELETE USING (is_admin());
