-- Recommendations: the repair / preventative / monitor items the team proposes
-- to the homeowner, with an approve / defer / decline lifecycle. This is the
-- engine behind "what's been done vs what hasn't" and carries deferred items
-- forward across quarterly visits.

CREATE TYPE recommendation_status AS ENUM ('pending', 'approved', 'deferred', 'declined', 'completed');
CREATE TYPE recommendation_type AS ENUM ('repair', 'preventative', 'monitor');

CREATE TABLE recommendations (
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

CREATE INDEX idx_recommendations_property ON recommendations(property_id);
CREATE INDEX idx_recommendations_finding ON recommendations(finding_id);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Clients can read their own property's recommendations. Status changes by
-- clients go through /api/recommendations/[id]/respond (admin client), so no
-- client UPDATE policy is granted here.
CREATE POLICY "rec_select" ON recommendations
  FOR SELECT USING (can_access_property(property_id));
CREATE POLICY "rec_insert_staff" ON recommendations
  FOR INSERT WITH CHECK (is_staff() AND can_access_property(property_id));
CREATE POLICY "rec_update_staff" ON recommendations
  FOR UPDATE USING (is_staff() AND can_access_property(property_id));
CREATE POLICY "rec_delete_staff" ON recommendations
  FOR DELETE USING (is_staff() AND can_access_property(property_id));
