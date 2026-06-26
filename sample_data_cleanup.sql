-- ============================================================
-- Carefree Casa -- Seed Data Cleanup
-- Run this FIRST to remove the bad first-run seed data.
-- Then run sample_data.sql to re-insert with correct dates.
-- Only targets known seeded rows by name -- safe for real data.
-- ============================================================

-- Messages (match on known seed message body text)
DELETE FROM messages WHERE body ILIKE '%tear-off is complete%'
   OR body ILIKE '%pool heater%'
   OR body ILIKE '%kitchen refresh%'
   OR body ILIKE '%shingles this Thursday%'
   OR body ILIKE '%Pristine Plumbing to take a look%'
   OR body ILIKE '%kitchen project next month%'
   OR body ILIKE '%landscaping looks incredible%'
   OR body ILIKE '%EV charger%'
   OR body ILIKE '%home office conversion%';

-- Work orders (match on known seed titles)
DELETE FROM work_orders WHERE title IN (
  'Roof Replacement -- Phase 2 Progress Check',
  'AC Tune-Up & Filter Replacement',
  'Low water pressure in master bath',
  'Roof Phase 2 -- Shingle Installation Kickoff',
  'Pool Heater Making Unusual Noise',
  'HVAC Semi-Annual Tune-Up',
  'Water softener -- salt almost empty',
  'Landscaping Phase 3 -- Lighting Walk',
  'EV Charger Tripping Breaker Intermittently'
);

-- Project tasks (via project titles)
DELETE FROM project_tasks WHERE project_id IN (
  SELECT id FROM projects WHERE title IN (
    'Full Roof Replacement',
    'Kitchen Cabinet Refresh & Backsplash',
    'Backyard Patio Expansion',
    'Backyard Landscaping Master Plan',
    'Home Office Addition'
  )
);

-- Projects
DELETE FROM projects WHERE title IN (
  'Full Roof Replacement',
  'Kitchen Cabinet Refresh & Backsplash',
  'Backyard Patio Expansion',
  'Backyard Landscaping Master Plan',
  'Home Office Addition'
);

-- Maintenance schedules (match on known seed titles)
DELETE FROM maintenance_schedules WHERE title IN (
  'HVAC Filter Replacement',
  'Gutter Cleaning',
  'Pest Control Treatment',
  'Sprinkler System Check',
  'Annual Roof Inspection',
  'Pool Weekly Service',
  'Pest Control',
  'HVAC Tune-Up',
  'Irrigation Backflow Test',
  'Water Softener Salt Refill',
  'HVAC Filter + Coil Check',
  'Smart System Software Update',
  'Landscaping Monthly Service',
  'HVAC Semi-Annual Tune-Up'
);

-- Assets (match on known seed names)
DELETE FROM assets WHERE name IN (
  'Central AC & Heat System',
  'Tankless Water Heater',
  'Asphalt Shingle Roof',
  'French Door Refrigerator',
  'Washer & Dryer Set',
  'Irrigation System',
  'Smart Security System',
  'Inground Pool & Equipment',
  'Dual-Zone HVAC System',
  'Smart Irrigation System',
  'Main Electrical Panel',
  'Water Softener System',
  'Smart Heat Pump System',
  'EV Charging Station',
  'Whole-Home Smart System',
  'Standing Seam Metal Roof',
  'Outdoor Kitchen & Fire Pit'
);

-- Vendors inserted by seed (safe -- only removes if no real work orders reference them)
-- Comment this block out if you want to keep the vendor records.
DELETE FROM vendors WHERE company_name IN (
  'Summit Roofing Co.',
  'CoolAir HVAC Services',
  'Pristine Plumbing',
  'Evergreen Landscaping',
  'BrightSpark Electric',
  'Austin Pool Pros'
) AND id NOT IN (
  SELECT DISTINCT vendor_id FROM work_orders WHERE vendor_id IS NOT NULL
) AND id NOT IN (
  SELECT DISTINCT vendor_id FROM maintenance_schedules WHERE vendor_id IS NOT NULL
) AND id NOT IN (
  SELECT DISTINCT vendor_id FROM project_tasks WHERE vendor_id IS NOT NULL
);

-- Reset health scores back toward neutral (undo the -12 adjustment)
UPDATE properties
SET health_score = LEAST(health_score + 12, 85)
WHERE client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM assets WHERE property_id = properties.id AND status = 'needs_attention');
