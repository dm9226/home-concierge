CREATE TABLE api_usage (
  service TEXT NOT NULL,
  period  TEXT NOT NULL, -- YYYY-MM
  count   INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (service, period)
);

CREATE OR REPLACE FUNCTION increment_api_usage(p_service TEXT, p_period TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO api_usage (service, period, count)
  VALUES (p_service, p_period, 1)
  ON CONFLICT (service, period)
  DO UPDATE SET count = api_usage.count + 1;
END;
$$;
