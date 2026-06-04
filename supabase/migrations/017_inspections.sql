-- Property inspection events
CREATE TABLE property_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES users(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'initial' CHECK (type IN ('initial', 'quarterly')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete')),
  overall_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual findings per item within an inspection
CREATE TABLE inspection_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES property_inspections(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  condition TEXT CHECK (condition IN ('good', 'fair', 'poor', 'na')),
  value TEXT,           -- for data-type items (location text, spec value, etc.)
  notes TEXT,           -- AI observations or manual notes
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  ai_assessed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inspection_id, section, item_key)
);

CREATE INDEX idx_property_inspections_property ON property_inspections(property_id);
CREATE INDEX idx_inspection_findings_inspection ON inspection_findings(inspection_id);

-- RLS
ALTER TABLE property_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspections_select" ON property_inspections FOR SELECT USING (is_staff());
CREATE POLICY "inspections_insert" ON property_inspections FOR INSERT WITH CHECK (is_staff());
CREATE POLICY "inspections_update" ON property_inspections FOR UPDATE USING (is_staff());
CREATE POLICY "inspections_delete" ON property_inspections FOR DELETE USING (is_admin());

CREATE POLICY "findings_select" ON inspection_findings FOR SELECT USING (is_staff());
CREATE POLICY "findings_insert" ON inspection_findings FOR INSERT WITH CHECK (is_staff());
CREATE POLICY "findings_update" ON inspection_findings FOR UPDATE USING (is_staff());
CREATE POLICY "findings_delete" ON inspection_findings FOR DELETE USING (is_staff());
