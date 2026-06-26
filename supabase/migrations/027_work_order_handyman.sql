-- Classify on-demand calls for overage billing. Per the plan rules, once a
-- Proactive+ client's 4 included on-demand calls are used, handyman requests
-- bill at $100 and all others at $200.
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_handyman BOOLEAN NOT NULL DEFAULT FALSE;
