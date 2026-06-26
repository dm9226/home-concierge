-- Centralized per-property file store: documents (inspection reports, warranties,
-- manuals, invoices, surveys, insurance, contracts) and photos. This is the
-- "homeowner database" the onboarding docs describe.
CREATE TABLE property_files (
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

CREATE INDEX idx_property_files_property ON property_files(property_id);

ALTER TABLE property_files ENABLE ROW LEVEL SECURITY;

-- Clients can read their own property's files; staff manage them.
CREATE POLICY "property_files_select" ON property_files
  FOR SELECT USING (can_access_property(property_id));
CREATE POLICY "property_files_insert" ON property_files
  FOR INSERT WITH CHECK (is_staff() AND can_access_property(property_id));
CREATE POLICY "property_files_update" ON property_files
  FOR UPDATE USING (is_staff() AND can_access_property(property_id));
CREATE POLICY "property_files_delete" ON property_files
  FOR DELETE USING (is_staff() AND can_access_property(property_id));
