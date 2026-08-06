-- =============================================================================
-- Carefree Casa -- consolidated migrations 020 through 031
-- Safe to run in full at any time. Every object is guarded, so re-running
-- (or running it after some of these were already applied) is a no-op, not
-- an error. Paste the whole thing into the Supabase SQL editor and run once.
-- =============================================================================

-- ---------- 020: per-inspection layout config -------------------------------
ALTER TABLE property_inspections
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---------- 021: client read of completed inspections -----------------------
DROP POLICY IF EXISTS "inspections_select_client" ON property_inspections;
CREATE POLICY "inspections_select_client" ON property_inspections
  FOR SELECT
  USING (status = 'complete' AND can_access_property(property_id));

DROP POLICY IF EXISTS "findings_select_client" ON inspection_findings;
CREATE POLICY "findings_select_client" ON inspection_findings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_inspections pi
      WHERE pi.id = inspection_id
        AND pi.status = 'complete'
        AND can_access_property(pi.property_id)
    )
  );

-- ---------- 022: recurring services -----------------------------------------
CREATE TABLE IF NOT EXISTS recurring_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  company_name TEXT,
  frequency TEXT,
  access_needed TEXT,
  schedule TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_services_property ON recurring_services(property_id);
ALTER TABLE recurring_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_services_select" ON recurring_services;
CREATE POLICY "recurring_services_select" ON recurring_services
  FOR SELECT USING (can_access_property(property_id));
DROP POLICY IF EXISTS "recurring_services_insert" ON recurring_services;
CREATE POLICY "recurring_services_insert" ON recurring_services
  FOR INSERT WITH CHECK (is_staff() AND can_access_property(property_id));
DROP POLICY IF EXISTS "recurring_services_update" ON recurring_services;
CREATE POLICY "recurring_services_update" ON recurring_services
  FOR UPDATE USING (is_staff() AND can_access_property(property_id));
DROP POLICY IF EXISTS "recurring_services_delete" ON recurring_services;
CREATE POLICY "recurring_services_delete" ON recurring_services
  FOR DELETE USING (is_staff() AND can_access_property(property_id));

-- ---------- 023: bedroom / bathroom counts ----------------------------------
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bedroom_count  INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathroom_count INTEGER;

-- ---------- 024: per-property file store ------------------------------------
CREATE TABLE IF NOT EXISTS property_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'document' CHECK (kind IN ('document', 'photo')),
  category TEXT,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_property_files_property ON property_files(property_id);
ALTER TABLE property_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_files_select" ON property_files;
CREATE POLICY "property_files_select" ON property_files
  FOR SELECT USING (can_access_property(property_id));
DROP POLICY IF EXISTS "property_files_insert" ON property_files;
CREATE POLICY "property_files_insert" ON property_files
  FOR INSERT WITH CHECK (is_staff() AND can_access_property(property_id));
DROP POLICY IF EXISTS "property_files_update" ON property_files;
CREATE POLICY "property_files_update" ON property_files
  FOR UPDATE USING (is_staff() AND can_access_property(property_id));
DROP POLICY IF EXISTS "property_files_delete" ON property_files;
CREATE POLICY "property_files_delete" ON property_files
  FOR DELETE USING (is_staff() AND can_access_property(property_id));

-- ---------- 025: private bucket + signed-URL columns ------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-files', 'property-files', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE property_files ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE property_files ADD COLUMN IF NOT EXISTS storage_bucket TEXT;
ALTER TABLE property_files ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- ---------- 026: recommendations --------------------------------------------
DO $$ BEGIN
  CREATE TYPE recommendation_status AS ENUM ('pending', 'approved', 'deferred', 'declined', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE recommendation_type AS ENUM ('repair', 'preventative', 'monitor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES property_inspections(id) ON DELETE SET NULL,
  finding_id UUID REFERENCES inspection_findings(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  rec_type recommendation_type NOT NULL DEFAULT 'repair',
  priority work_order_priority NOT NULL DEFAULT 'normal',
  status recommendation_status NOT NULL DEFAULT 'pending',
  estimated_cost NUMERIC(10,2),
  created_by UUID REFERENCES users(id),
  client_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recommendations_property ON recommendations(property_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_finding ON recommendations(finding_id);
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rec_select" ON recommendations;
CREATE POLICY "rec_select" ON recommendations
  FOR SELECT USING (can_access_property(property_id));
DROP POLICY IF EXISTS "rec_insert_staff" ON recommendations;
CREATE POLICY "rec_insert_staff" ON recommendations
  FOR INSERT WITH CHECK (is_staff() AND can_access_property(property_id));
DROP POLICY IF EXISTS "rec_update_staff" ON recommendations;
CREATE POLICY "rec_update_staff" ON recommendations
  FOR UPDATE USING (is_staff() AND can_access_property(property_id));
DROP POLICY IF EXISTS "rec_delete_staff" ON recommendations;
CREATE POLICY "rec_delete_staff" ON recommendations
  FOR DELETE USING (is_staff() AND can_access_property(property_id));

-- ---------- 027: on-demand handyman classification --------------------------
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_handyman BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------- 028: service (membership) agreements ----------------------------
DO $$ BEGIN
  CREATE TYPE agreement_status AS ENUM ('draft', 'sent', 'accepted', 'void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS service_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  status agreement_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL DEFAULT 'Membership Agreement',
  body TEXT NOT NULL,
  accepted_by UUID REFERENCES users(id),
  signer_name TEXT,
  accepted_at TIMESTAMPTZ,
  accepted_ip TEXT,
  accepted_snapshot TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_agreements_property ON service_agreements(property_id);
ALTER TABLE service_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agreement_select" ON service_agreements;
CREATE POLICY "agreement_select" ON service_agreements
  FOR SELECT USING (can_access_property(property_id));
DROP POLICY IF EXISTS "agreement_insert_staff" ON service_agreements;
CREATE POLICY "agreement_insert_staff" ON service_agreements
  FOR INSERT WITH CHECK (is_staff() AND can_access_property(property_id));
DROP POLICY IF EXISTS "agreement_update_staff" ON service_agreements;
CREATE POLICY "agreement_update_staff" ON service_agreements
  FOR UPDATE USING (is_staff() AND can_access_property(property_id));
DROP POLICY IF EXISTS "agreement_delete_staff" ON service_agreements;
CREATE POLICY "agreement_delete_staff" ON service_agreements
  FOR DELETE USING (is_admin());

-- ---------- 029: reminder dedupe log ----------------------------------------
CREATE TABLE IF NOT EXISTS reminder_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL,
  ref_id UUID NOT NULL,
  remind_for DATE NOT NULL,
  recipients TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kind, ref_id, remind_for)
);
CREATE INDEX IF NOT EXISTS idx_reminder_log_ref ON reminder_log(kind, ref_id);
ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_log_select_staff" ON reminder_log;
CREATE POLICY "reminder_log_select_staff" ON reminder_log
  FOR SELECT USING (is_staff());

-- ---------- 030: audit logging (already idempotent) -------------------------
CREATE TABLE IF NOT EXISTS auth_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event TEXT NOT NULL DEFAULT 'login',
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_events_created ON auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);

ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_events_admin_read" ON auth_events;
CREATE POLICY "auth_events_admin_read" ON auth_events FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs FOR SELECT USING (is_admin());

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  rec_id UUID;
  changed JSONB;
  sensitive TEXT[] := ARRAY[
    'alarm_code','gate_code','wifi_password','wifi_network','spare_key_location',
    'accepted_snapshot','accepted_ip','body','password'
  ];
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec_id := OLD.id;
    changed := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    rec_id := NEW.id;
    SELECT jsonb_object_agg(
             n.key,
             CASE WHEN n.key = ANY(sensitive) THEN to_jsonb('***'::text) ELSE n.value END
           )
      INTO changed
    FROM jsonb_each(to_jsonb(NEW)) n
    WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key)
      AND n.key NOT IN ('updated_at');
  ELSE
    rec_id := NEW.id;
    changed := NULL;
  END IF;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, changes)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, rec_id, changed);

  RETURN COALESCE(NEW, OLD);
END;
$fn$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'properties','property_onboarding','assets','work_orders','maintenance_schedules',
    'projects','invoices','recurring_services','property_files','recommendations',
    'service_agreements','vendors','users','property_inspections'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trg ON %I', t);
    EXECUTE format('CREATE TRIGGER audit_trg AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
END $$;

-- ---------- 031: vendor partnership agreements ------------------------------
DO $$ BEGIN
  CREATE TYPE vendor_agreement_status AS ENUM ('draft', 'sent', 'accepted', 'void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS vendor_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
  status vendor_agreement_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL DEFAULT 'Vendor Partnership Agreement',
  body TEXT NOT NULL,
  access_token UUID NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE INDEX IF NOT EXISTS idx_vendor_agreements_vendor ON vendor_agreements(vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_agreements_token ON vendor_agreements(access_token);
ALTER TABLE vendor_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_agreement_select" ON vendor_agreements;
CREATE POLICY "vendor_agreement_select" ON vendor_agreements
  FOR SELECT USING (is_staff());
DROP POLICY IF EXISTS "vendor_agreement_insert" ON vendor_agreements;
CREATE POLICY "vendor_agreement_insert" ON vendor_agreements
  FOR INSERT WITH CHECK (is_staff());
DROP POLICY IF EXISTS "vendor_agreement_update" ON vendor_agreements;
CREATE POLICY "vendor_agreement_update" ON vendor_agreements
  FOR UPDATE USING (is_staff());
DROP POLICY IF EXISTS "vendor_agreement_delete" ON vendor_agreements;
CREATE POLICY "vendor_agreement_delete" ON vendor_agreements
  FOR DELETE USING (is_admin());

-- =============================================================================
-- Done. All 020-031 objects are now present.
-- =============================================================================
