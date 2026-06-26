-- ============================================================
-- Carefree Casa -- Sample Data Seed (v2)
-- Run in Supabase SQL Editor. Safe to re-run on empty tables.
-- All dates are relative to NOW() so they stay current.
-- Properties cycle through 3 profiles so each looks different.
-- ============================================================

-- ---- 1. Vendors ----
INSERT INTO vendors (company_name, contact_name, phone, email, specialty_categories, license_number, insurance_expiration, rating, status)
VALUES
  ('Summit Roofing Co.',    'Marcus Webb',   '(512) 555-0182', 'marcus@summitroofing.com',   ARRAY['roofing'],      'ROF-TX-2019-0472', (NOW() + interval '16 months')::date, 4.8, 'preferred'),
  ('CoolAir HVAC Services', 'Diana Torres',  '(512) 555-0194', 'diana@coolair.com',           ARRAY['hvac'],         'HVAC-TX-8831',     (NOW() + interval '13 months')::date, 4.9, 'preferred'),
  ('Pristine Plumbing',     'Carlos Mendez', '(512) 555-0203', 'carlos@pristineplumbing.com', ARRAY['plumbing'],     'PLB-TX-2247',      (NOW() + interval '19 months')::date, 4.7, 'preferred'),
  ('Evergreen Landscaping', 'Priya Sharma',  '(512) 555-0219', 'priya@evergreen.com',         ARRAY['landscaping'],  NULL,               (NOW() + interval '15 months')::date, 4.6, 'approved'),
  ('BrightSpark Electric',  'James Okafor',  '(512) 555-0231', 'james@brightspark.com',       ARRAY['electrical'],   'EL-TX-9902',       (NOW() + interval '18 months')::date, 4.8, 'preferred'),
  ('Austin Pool Pros',      'Sandra Kim',    '(512) 555-0245', 'sandra@austinpoolpros.com',   ARRAY['pool'],         NULL,               (NOW() + interval '14 months')::date, 4.7, 'approved')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_roofing   uuid;
  v_hvac      uuid;
  v_plumbing  uuid;
  v_landscape uuid;
  v_electric  uuid;
  v_pool      uuid;
  v_admin     uuid;

  rec          record;
  prop_id      uuid;
  client_id    uuid;
  asset_id     uuid;
  proj_id      uuid;
  prop_counter int := 0;

BEGIN
  SELECT id INTO v_roofing   FROM vendors WHERE company_name = 'Summit Roofing Co.'    LIMIT 1;
  SELECT id INTO v_hvac      FROM vendors WHERE company_name = 'CoolAir HVAC Services' LIMIT 1;
  SELECT id INTO v_plumbing  FROM vendors WHERE company_name = 'Pristine Plumbing'     LIMIT 1;
  SELECT id INTO v_landscape FROM vendors WHERE company_name = 'Evergreen Landscaping' LIMIT 1;
  SELECT id INTO v_electric  FROM vendors WHERE company_name = 'BrightSpark Electric'  LIMIT 1;
  SELECT id INTO v_pool      FROM vendors WHERE company_name = 'Austin Pool Pros'      LIMIT 1;
  SELECT id INTO v_admin     FROM users WHERE role IN ('admin', 'concierge') ORDER BY created_at LIMIT 1;

  FOR rec IN
    SELECT p.id AS property_id, p.client_id
    FROM properties p
    WHERE p.client_id IS NOT NULL
    ORDER BY p.created_at
  LOOP
    prop_id      := rec.property_id;
    client_id    := rec.client_id;
    prop_counter := prop_counter + 1;

    -- ================================================================
    -- PROFILE A (1, 4, 7 ...): Older home, roof replacement in progress
    -- ================================================================
    IF (prop_counter % 3) = 1 THEN

      INSERT INTO assets (property_id, category, name, brand, model, install_date, warranty_expiration, expected_lifespan_years, location_in_home, status, last_serviced_date) VALUES
        (prop_id, 'roofing',  'Asphalt Shingle Roof',      'GAF',     'Timberline HDZ',    (NOW() - interval '14 years')::date, (NOW() + interval '16 years')::date, 30, 'Exterior',       'needs_attention', (NOW() - interval '18 months')::date),
        (prop_id, 'hvac',     'Central AC & Heat',         'Carrier', 'Infinity 24 ACC6',  (NOW() - interval '7 years')::date,  (NOW() + interval '8 years')::date,  15, 'Utility closet', 'active',          (NOW() - interval '5 months')::date),
        (prop_id, 'pool',     'Inground Pool & Equipment', 'Pentair', 'IntelliFlo VSF',    (NOW() - interval '9 years')::date,  (NOW() + interval '1 year')::date,   20, 'Backyard',       'active',          (NOW() - interval '3 weeks')::date),
        (prop_id, 'plumbing', 'Tankless Water Heater',     'Rinnai',  'RU199iN',           (NOW() - interval '4 years')::date,  (NOW() + interval '16 years')::date, 20, 'Garage',         'active',          (NOW() - interval '10 months')::date),
        (prop_id, 'security', 'Smart Security System',     'Ring',    'Alarm Pro + 4 cams',(NOW() - interval '2 years')::date,  (NOW() + interval '1 year')::date,   8,  'Whole home',     'active',          NULL)
      ON CONFLICT DO NOTHING;

      INSERT INTO maintenance_schedules (property_id, title, category, frequency, next_due, last_completed, vendor_id, estimated_cost, is_active) VALUES
        (prop_id, 'Annual Roof Inspection',  'roofing',     'annual',     (NOW() - interval '3 weeks')::date,  (NOW() - interval '13 months')::date, v_roofing,   250,  true),
        (prop_id, 'Pool Weekly Service',     'pool',        'monthly',    (NOW() + interval '5 days')::date,   (NOW() - interval '23 days')::date,   v_pool,      180,  true),
        (prop_id, 'HVAC Filter Replacement', 'hvac',        'quarterly',  (NOW() + interval '38 days')::date,  (NOW() - interval '52 days')::date,   v_hvac,      75,   true),
        (prop_id, 'Pest Control',            'other',       'quarterly',  (NOW() + interval '22 days')::date,  (NOW() - interval '68 days')::date,   NULL,        95,   true)
      ON CONFLICT DO NOTHING;

      INSERT INTO projects (property_id, title, description, status, start_date, target_completion_date, budget, actual_spend)
      VALUES (
        prop_id, 'Full Roof Replacement',
        'Complete tear-off and replacement of aging 14-year-old asphalt shingle roof. Three bids received; Summit Roofing selected. Includes new decking where needed and 30-year architectural shingles.',
        'in_progress',
        (NOW() - interval '12 days')::date,
        (NOW() + interval '18 days')::date,
        18500, 4200
      ) RETURNING id INTO proj_id;

      INSERT INTO project_tasks (project_id, title, status, vendor_id, cost, sort_order) VALUES
        (proj_id, 'Inspection and contract signing',       'completed',   v_roofing, 500,  1),
        (proj_id, 'City building permit',                  'completed',   NULL,      150,  2),
        (proj_id, 'Tear-off and decking repair',           'in_progress', v_roofing, 5800, 3),
        (proj_id, 'Install new shingles and flashing',     'pending',     v_roofing, 9800, 4),
        (proj_id, 'Final inspection and debris cleanup',   'pending',     v_roofing, 350,  5);

      SELECT id INTO asset_id FROM assets WHERE property_id = prop_id AND category = 'roofing' LIMIT 1;
      INSERT INTO work_orders (property_id, asset_id, vendor_id, requested_by, title, description, category, priority, status, scheduled_date, cost_estimate, markup_percentage) VALUES
        (prop_id, asset_id, v_roofing, client_id, 'Roof Phase 2 -- Shingle Installation Kickoff', 'Confirm decking complete and schedule shingle start.', 'roofing', 'high', 'in_progress', (NOW() + interval '2 days')::date, 9800, 15),
        (prop_id, NULL,     v_pool,    client_id, 'Pool Heater Making Unusual Noise',              'Client reports grinding sound from heater at startup. Inspect and advise.', 'pool', 'normal', 'submitted', NULL, NULL, 15);

      IF NOT EXISTS (SELECT 1 FROM messages WHERE property_id = prop_id LIMIT 1) THEN
        INSERT INTO messages (property_id, sender_id, recipient_id, subject, body, is_read, created_at) VALUES
          (prop_id, client_id, v_admin, 'Roof project',    'Hi! The crew was here all day -- it looks like great progress. When do you think the new shingles go on?', true,  NOW() - interval '4 days'),
          (prop_id, v_admin,   client_id, 'Re: Roof project', 'They finish decking tomorrow and shingles start Thursday weather permitting. Should be fully closed up by next Friday.', true,  NOW() - interval '4 days' + interval '90 minutes'),
          (prop_id, client_id, v_admin, 'Pool heater',     'Also -- the pool heater is making a weird grinding noise at startup. Not sure if it is serious.', true,  NOW() - interval '2 days'),
          (prop_id, v_admin,   client_id, 'Re: Pool heater',  'I have submitted a work order for Austin Pool Pros to come take a look. Likely a worn impeller -- straightforward fix. They will call you to schedule.', true,  NOW() - interval '2 days' + interval '45 minutes'),
          (prop_id, client_id, v_admin, 'Thanks!',         'Great, thank you for being so on top of everything. Really appreciate it.', false, NOW() - interval '6 hours');
      END IF;

    -- ================================================================
    -- PROFILE B (2, 5, 8 ...): Mid-age home, kitchen project planned
    -- ================================================================
    ELSIF (prop_counter % 3) = 2 THEN

      INSERT INTO assets (property_id, category, name, brand, model, install_date, warranty_expiration, expected_lifespan_years, location_in_home, status, last_serviced_date) VALUES
        (prop_id, 'hvac',        'Dual-Zone HVAC System',     'Trane',    'XR15',               (NOW() - interval '5 years')::date,  (NOW() + interval '10 years')::date, 15, 'Attic + utility', 'active',          (NOW() - interval '2 months')::date),
        (prop_id, 'appliance',   'French Door Refrigerator',  'Samsung',  'RF28R7351SR',        (NOW() - interval '3 years')::date,  (NOW() + interval '1 year')::date,   15, 'Kitchen',         'active',          NULL),
        (prop_id, 'appliance',   'Washer & Dryer Set',        'LG',       'WM4000HWA/DLEX4000V',(NOW() - interval '2 years')::date,  (NOW() + interval '2 years')::date,  12, 'Laundry room',   'active',          NULL),
        (prop_id, 'landscaping', 'Smart Irrigation System',   'Rachio',   'Controller 3rd Gen', (NOW() - interval '4 years')::date,  (NOW() + interval '6 years')::date,  10, 'Garage/exterior', 'active',          (NOW() - interval '6 weeks')::date),
        (prop_id, 'electrical',  'Main Electrical Panel',     'Square D', 'Homeline 200A',      (NOW() - interval '5 years')::date,  NULL,                                40, 'Garage',          'active',          (NOW() - interval '3 years')::date),
        (prop_id, 'plumbing',    'Water Softener System',     'Kinetico', 'Model 2060',         (NOW() - interval '6 years')::date,  (NOW() + interval '4 years')::date,  15, 'Garage',          'active',          (NOW() - interval '4 months')::date)
      ON CONFLICT DO NOTHING;

      INSERT INTO maintenance_schedules (property_id, title, category, frequency, next_due, last_completed, vendor_id, estimated_cost, is_active) VALUES
        (prop_id, 'HVAC Tune-Up',              'hvac',        'semi_annual', (NOW() + interval '55 days')::date,  (NOW() - interval '130 days')::date, v_hvac,      150, true),
        (prop_id, 'Gutter Cleaning',           'exterior',    'semi_annual', (NOW() + interval '30 days')::date,  (NOW() - interval '160 days')::date, v_landscape, 150, true),
        (prop_id, 'Irrigation Backflow Test',  'landscaping', 'annual',      (NOW() + interval '10 days')::date,  (NOW() - interval '350 days')::date, v_landscape, 95,  true),
        (prop_id, 'Water Softener Salt Refill','plumbing',    'quarterly',   (NOW() - interval '8 days')::date,   (NOW() - interval '98 days')::date,  NULL,        40,  true)
      ON CONFLICT DO NOTHING;

      INSERT INTO projects (property_id, title, description, status, start_date, target_completion_date, budget, actual_spend)
      VALUES (
        prop_id, 'Kitchen Cabinet Refresh & Backsplash',
        'Paint and reface existing cabinetry, new hardware, and subway tile backsplash. Client selected matte black pulls and semi-gloss white finish.',
        'planning',
        (NOW() + interval '25 days')::date,
        (NOW() + interval '70 days')::date,
        6800, 0
      ) RETURNING id INTO proj_id;

      INSERT INTO project_tasks (project_id, title, status, vendor_id, cost, sort_order) VALUES
        (proj_id, 'Tile and hardware selections confirmed', 'completed', NULL,       0,    1),
        (proj_id, 'Cabinet painting and refacing',         'pending',   NULL,       3200, 2),
        (proj_id, 'Backsplash tile installation',          'pending',   v_electric, 2100, 3),
        (proj_id, 'Hardware installation and touchup',     'pending',   NULL,       900,  4);

      INSERT INTO projects (property_id, title, description, status, start_date, target_completion_date, budget, actual_spend)
      VALUES (
        prop_id, 'Backyard Patio Expansion',
        'Extend existing concrete patio by 200 sq ft, add pergola, and install string lighting. Permit required.',
        'planning',
        (NOW() + interval '45 days')::date,
        (NOW() + interval '120 days')::date,
        22000, 0
      ) RETURNING id INTO proj_id;

      INSERT INTO project_tasks (project_id, title, status, vendor_id, cost, sort_order) VALUES
        (proj_id, 'Finalize design and pull permit', 'pending', NULL,       1200, 1),
        (proj_id, 'Concrete pour and curing',        'pending', NULL,       8500, 2),
        (proj_id, 'Pergola kit delivery and install', 'pending', v_electric, 9800, 3),
        (proj_id, 'Lighting and landscaping finish',  'pending', v_landscape,2500, 4);

      INSERT INTO work_orders (property_id, asset_id, vendor_id, requested_by, title, description, category, priority, status, scheduled_date, cost_estimate, markup_percentage)
      SELECT prop_id, a.id, v_hvac, client_id, 'HVAC Semi-Annual Tune-Up', 'Check refrigerant, clean evaporator coils, test all zones.', 'hvac', 'normal', 'scheduled', (NOW() + interval '18 days')::date, 150, 15
      FROM assets a WHERE a.property_id = prop_id AND a.category = 'hvac' LIMIT 1;

      INSERT INTO work_orders (property_id, asset_id, vendor_id, requested_by, title, description, category, priority, status, cost_estimate, markup_percentage) VALUES
        (prop_id, NULL, NULL, client_id, 'Water softener -- salt almost empty', 'Client advises indicator light is on. Needs salt refill and quick system check.', 'plumbing', 'low', 'submitted', 45, 15);

      IF NOT EXISTS (SELECT 1 FROM messages WHERE property_id = prop_id LIMIT 1) THEN
        INSERT INTO messages (property_id, sender_id, recipient_id, subject, body, is_read, created_at) VALUES
          (prop_id, client_id, v_admin, 'Kitchen project timeline', 'Hey! Just wanted to confirm we are still on track to start the kitchen project next month. I have family visiting in early summer and want to make sure it is done before then.', true,  NOW() - interval '5 days'),
          (prop_id, v_admin, client_id, 'Re: Kitchen timeline',     'You are all set -- contractor is confirmed for the 3rd. Expect about 10 days total for painting, tile, and hardware. Well clear of your family visit.', true,  NOW() - interval '5 days' + interval '2 hours'),
          (prop_id, client_id, v_admin, 'Patio quote',              'Also wanted to ask -- have you gotten any bids back on the patio expansion yet?', true,  NOW() - interval '3 days'),
          (prop_id, v_admin, client_id, 'Re: Patio quote',          'Yes -- two bids in, waiting on one more. The range so far is $19k-$24k. I will send a full comparison once the third comes back, probably end of this week.', true,  NOW() - interval '3 days' + interval '3 hours'),
          (prop_id, client_id, v_admin, 'Re: Patio quote',          'Perfect, no rush. Thank you!', false, NOW() - interval '1 day');
      END IF;

    -- ================================================================
    -- PROFILE C (3, 6, 9 ...): Newer home, smart upgrades + landscaping
    -- ================================================================
    ELSE

      INSERT INTO assets (property_id, category, name, brand, model, install_date, warranty_expiration, expected_lifespan_years, location_in_home, status, last_serviced_date) VALUES
        (prop_id, 'hvac',       'Smart Heat Pump System',   'Lennox',  'XP21-036',         (NOW() - interval '2 years')::date,  (NOW() + interval '8 years')::date,  15, 'Utility closet', 'active', (NOW() - interval '6 weeks')::date),
        (prop_id, 'electrical', 'EV Charging Station',      'Tesla',   'Wall Connector G3', (NOW() - interval '1 year')::date,  (NOW() + interval '3 years')::date,  10, 'Garage',         'active', NULL),
        (prop_id, 'smart_home', 'Whole-Home Smart System',  'Control4','EA-3 Controller',  (NOW() - interval '2 years')::date,  (NOW() + interval '3 years')::date,  10, 'Whole home',     'active', (NOW() - interval '4 months')::date),
        (prop_id, 'roofing',    'Standing Seam Metal Roof', 'Metal Sales','Classic Rib',   (NOW() - interval '3 years')::date,  (NOW() + interval '47 years')::date, 50, 'Exterior',       'active', (NOW() - interval '3 years')::date),
        (prop_id, 'landscaping','Outdoor Kitchen & Fire Pit','Weber',  'Summit Grill + pit',(NOW() - interval '1 year')::date,  (NOW() + interval '4 years')::date,  15, 'Backyard',       'active', (NOW() - interval '2 months')::date),
        (prop_id, 'plumbing',   'Tankless Water Heater',    'Navien',  'NPE-240A2',        (NOW() - interval '2 years')::date,  (NOW() + interval '8 years')::date,  20, 'Garage',         'active', (NOW() - interval '1 year')::date)
      ON CONFLICT DO NOTHING;

      INSERT INTO maintenance_schedules (property_id, title, category, frequency, next_due, last_completed, vendor_id, estimated_cost, is_active) VALUES
        (prop_id, 'HVAC Filter + Coil Check',     'hvac',        'quarterly',  (NOW() + interval '42 days')::date,  (NOW() - interval '48 days')::date,  v_hvac,      95,  true),
        (prop_id, 'Smart System Software Update', 'smart_home',  'semi_annual',(NOW() + interval '80 days')::date,  (NOW() - interval '100 days')::date, NULL,        150, true),
        (prop_id, 'Landscaping Monthly Service',  'landscaping', 'monthly',    (NOW() + interval '8 days')::date,   (NOW() - interval '22 days')::date,  v_landscape, 225, true),
        (prop_id, 'Annual Roof Inspection',       'roofing',     'annual',     (NOW() + interval '9 months')::date, (NOW() - interval '3 months')::date, v_roofing,   200, true)
      ON CONFLICT DO NOTHING;

      INSERT INTO projects (property_id, title, description, status, start_date, target_completion_date, budget, actual_spend)
      VALUES (
        prop_id, 'Backyard Landscaping Master Plan',
        'Full backyard redesign: new sod, ornamental beds, drip irrigation, uplighting, and privacy hedge along rear fence. Three phases over 8 weeks.',
        'in_progress',
        (NOW() - interval '3 weeks')::date,
        (NOW() + interval '5 weeks')::date,
        34000, 12800
      ) RETURNING id INTO proj_id;

      INSERT INTO project_tasks (project_id, title, status, vendor_id, cost, sort_order) VALUES
        (proj_id, 'Design finalization and plant selection', 'completed',   v_landscape, 1500,  1),
        (proj_id, 'Grading and irrigation rough-in',        'completed',   v_landscape, 7800,  2),
        (proj_id, 'Sod installation and ornamental beds',   'in_progress', v_landscape, 12000, 3),
        (proj_id, 'Uplighting and electrical work',         'pending',     v_electric,  5200,  4),
        (proj_id, 'Privacy hedge planting and mulch',       'pending',     v_landscape, 3800,  5),
        (proj_id, 'Final walkthrough and punch list',       'pending',     v_landscape, 500,   6);

      INSERT INTO projects (property_id, title, description, status, start_date, target_completion_date, budget, actual_spend)
      VALUES (
        prop_id, 'Home Office Addition',
        'Convert detached garage bonus room into dedicated home office with custom built-ins, upgraded electrical, and independent HVAC mini-split.',
        'planning',
        (NOW() + interval '60 days')::date,
        (NOW() + interval '150 days')::date,
        41000, 0
      ) RETURNING id INTO proj_id;

      INSERT INTO project_tasks (project_id, title, status, vendor_id, cost, sort_order) VALUES
        (proj_id, 'Architect drawings and permit',  'pending', NULL,       3500,  1),
        (proj_id, 'Electrical panel sub-feed',      'pending', v_electric, 4200,  2),
        (proj_id, 'Mini-split HVAC installation',   'pending', v_hvac,     6800,  3),
        (proj_id, 'Built-in cabinetry and framing', 'pending', NULL,       18500, 4),
        (proj_id, 'Flooring and finishes',          'pending', NULL,       5200,  5),
        (proj_id, 'AV and data wiring',             'pending', v_electric, 2800,  6);

      INSERT INTO work_orders (property_id, asset_id, vendor_id, requested_by, title, description, category, priority, status, scheduled_date, cost_estimate, markup_percentage)
      SELECT prop_id, a.id, v_landscape, client_id, 'Landscaping Phase 3 -- Lighting Walk', 'Site walk with electrician to finalize uplighting placement before trenching.', 'landscaping', 'normal', 'scheduled', (NOW() + interval '4 days')::date, 5200, 15
      FROM assets a WHERE a.property_id = prop_id AND a.category = 'landscaping' LIMIT 1;

      INSERT INTO work_orders (property_id, asset_id, vendor_id, requested_by, title, description, category, priority, status, cost_estimate, markup_percentage)
      SELECT prop_id, a.id, NULL, client_id, 'EV Charger Tripping Breaker Intermittently', 'Charger trips the 50A breaker about once a week, usually mid-charge. Tesla app shows no fault code.', 'electrical', 'normal', 'submitted', NULL, 15
      FROM assets a WHERE a.property_id = prop_id AND a.category = 'electrical' LIMIT 1;

      IF NOT EXISTS (SELECT 1 FROM messages WHERE property_id = prop_id LIMIT 1) THEN
        INSERT INTO messages (property_id, sender_id, recipient_id, subject, body, is_read, created_at) VALUES
          (prop_id, client_id, v_admin, 'Landscaping looks amazing', 'Just wanted to say the sod installation looks incredible already. Can not wait to see it with the lighting in.', true,  NOW() - interval '6 days'),
          (prop_id, v_admin, client_id, 'Re: Landscaping',           'Thank you! Evergreen is doing a fantastic job. The electrician site walk is set for this Thursday to finalize the uplighting layout -- that phase should take about 4 days once they start.', true,  NOW() - interval '6 days' + interval '1 hour'),
          (prop_id, client_id, v_admin, 'EV charger issue',          'Hey -- the EV charger has been tripping the breaker once or twice a week. Not sure if it is something to worry about or not.', true,  NOW() - interval '2 days'),
          (prop_id, v_admin, client_id, 'Re: EV charger',            'Good catch -- I have submitted a work order for BrightSpark to inspect it. Could be a loose connection at the panel or a breaker starting to fail. Either way quick fix. I will keep you posted.', true,  NOW() - interval '2 days' + interval '2 hours'),
          (prop_id, client_id, v_admin, 'Home office timeline',      'Also -- when do you think we can realistically break ground on the home office conversion? I am thinking fall would be ideal.', false, NOW() - interval '5 hours');
      END IF;

    END IF; -- end profile switch

  END LOOP;
END $$;

-- Adjust health scores: properties with needs_attention assets score lower
UPDATE properties
SET health_score = GREATEST(health_score - 12, 48)
WHERE id IN (
  SELECT DISTINCT property_id FROM assets WHERE status = 'needs_attention'
)
AND client_id IS NOT NULL;
