-- Paint colors stored directly on properties (accessible wherever property is fetched)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS paint_colors TEXT;

-- Filter size on assets (relevant for HVAC, shown in asset form when category = hvac)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS filter_size TEXT;

-- On-demand flag on work orders (tracks which WOs count against included on-demand calls)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_on_demand BOOLEAN NOT NULL DEFAULT FALSE;
