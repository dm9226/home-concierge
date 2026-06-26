-- Session + change audit logging.
--   auth_events : login/logout events (written app-side to capture IP/UA)
--   audit_logs  : row changes, written by a trigger on key tables using auth.uid()
-- Both are admin-read only. Sensitive columns are redacted in the change log.

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
  action TEXT NOT NULL,            -- insert | update | delete
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB,                   -- changed fields (updates only), sensitive keys redacted
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

-- Generic change-logging trigger. Records the acting user (auth.uid()), the
-- operation, and -- for updates -- the changed fields with sensitive values masked.
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Attach the trigger to the meaningful entity tables (all have a uuid id).
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
