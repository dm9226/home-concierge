-- Dedupe log for the daily reminder job, so a given reminder for a given date
-- is only emailed once even if the cron runs multiple times.
CREATE TABLE reminder_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL,          -- 'work_order' | 'maintenance'
  ref_id UUID NOT NULL,
  remind_for DATE NOT NULL,
  recipients TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kind, ref_id, remind_for)
);

CREATE INDEX idx_reminder_log_ref ON reminder_log(kind, ref_id);

ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;

-- Written only by the cron (service role, bypasses RLS). Staff may read.
CREATE POLICY "reminder_log_select_staff" ON reminder_log
  FOR SELECT USING (is_staff());
