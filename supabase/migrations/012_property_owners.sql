-- Multi-owner support: property_owners junction table

-- 1. Junction table
CREATE TABLE IF NOT EXISTS property_owners (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (property_id, user_id)
);

-- 2. Backfill from existing client_id
INSERT INTO property_owners (property_id, user_id)
SELECT id, client_id FROM properties WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. RLS on property_owners
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_owners_select"
  ON property_owners FOR SELECT
  USING (user_id = auth.uid() OR is_staff());

CREATE POLICY "property_owners_staff_write"
  ON property_owners FOR ALL
  USING (is_staff());

-- 4. Update can_access_property to include property_owners check
CREATE OR REPLACE FUNCTION can_access_property(p_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM properties p
    JOIN users u ON u.id = auth.uid()
    WHERE p.id = p_id
    AND (
      u.role = 'admin'
      OR (u.role = 'concierge' AND p.primary_concierge_id = auth.uid())
      OR (u.role = 'client' AND (
        p.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM property_owners po
          WHERE po.property_id = p_id AND po.user_id = auth.uid()
        )
      ))
    )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Fix invoices policy -- currently only checks client_id, needs property_owners too
DROP POLICY IF EXISTS "invoices_read_client" ON invoices;
CREATE POLICY "invoices_read_client"
  ON invoices FOR SELECT
  USING (
    is_staff()
    OR client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM property_owners po
      WHERE po.property_id = invoices.property_id
      AND po.user_id = auth.uid()
    )
  );
