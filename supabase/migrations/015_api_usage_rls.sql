-- Enable RLS on api_usage table (was missing from original migration)
-- All writes to this table use the service role (createAdminClient) which
-- bypasses RLS, so no write policy is needed for the regular client key.
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Admins can read usage counts via the regular client key (e.g. a future dashboard)
-- Service role (all actual reads/writes in property-lookup route) bypasses this anyway.
CREATE POLICY "api_usage_admin_read"
  ON api_usage FOR SELECT
  USING (is_admin());
