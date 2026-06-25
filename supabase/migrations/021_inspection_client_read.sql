-- Let property owners (clients) read their own COMPLETED inspections and
-- findings, so the client portal can render the Home Health report.
-- RLS policies are permissive (OR'd), so these sit alongside the existing
-- staff policies without removing staff access to in-progress inspections.

CREATE POLICY "inspections_select_client" ON property_inspections
  FOR SELECT
  USING (status = 'complete' AND can_access_property(property_id));

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
