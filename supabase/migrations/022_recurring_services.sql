-- Standing recurring services for a property (pool, pest control, landscaping, etc.)
-- Distinct from maintenance_schedules: this tracks the ongoing service PROVIDER
-- relationship (who, how often, access needed, scheduled day, phone), captured
-- during onboarding and shown to the client in the portal.
CREATE TABLE recurring_services (
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

CREATE INDEX idx_recurring_services_property ON recurring_services(property_id);

ALTER TABLE recurring_services ENABLE ROW LEVEL SECURITY;

-- Clients can read their own property's services; staff via can_access_property.
CREATE POLICY "recurring_services_select" ON recurring_services
  FOR SELECT USING (can_access_property(property_id));
CREATE POLICY "recurring_services_insert" ON recurring_services
  FOR INSERT WITH CHECK (is_staff() AND can_access_property(property_id));
CREATE POLICY "recurring_services_update" ON recurring_services
  FOR UPDATE USING (is_staff() AND can_access_property(property_id));
CREATE POLICY "recurring_services_delete" ON recurring_services
  FOR DELETE USING (is_staff() AND can_access_property(property_id));
