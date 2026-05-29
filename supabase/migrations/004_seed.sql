-- ============================================================
-- 004_seed.sql  --  Demo data for HomeGuard Concierge
-- Run this LAST in Supabase SQL Editor.
-- All demo accounts use password: HomeGuard2025!
-- ============================================================

do $$
declare
  -- Staff IDs
  admin1    uuid := '00000000-0000-0000-0000-000000000001';
  admin2    uuid := '00000000-0000-0000-0000-000000000002';
  conc1     uuid := '00000000-0000-0000-0000-000000000003';
  conc2     uuid := '00000000-0000-0000-0000-000000000004';
  conc3     uuid := '00000000-0000-0000-0000-000000000005';
  -- Client IDs
  cli1      uuid := '00000000-0000-0000-0000-000000000011';
  cli2      uuid := '00000000-0000-0000-0000-000000000012';
  cli3      uuid := '00000000-0000-0000-0000-000000000013';
  cli4      uuid := '00000000-0000-0000-0000-000000000014';
  cli5      uuid := '00000000-0000-0000-0000-000000000015';
  cli6      uuid := '00000000-0000-0000-0000-000000000016';
  cli7      uuid := '00000000-0000-0000-0000-000000000017';
  cli8      uuid := '00000000-0000-0000-0000-000000000018';
  -- Property IDs
  p1        uuid := '00000000-0000-0000-0000-000000000101';
  p2        uuid := '00000000-0000-0000-0000-000000000102';
  p3        uuid := '00000000-0000-0000-0000-000000000103';
  p4        uuid := '00000000-0000-0000-0000-000000000104';
  p5        uuid := '00000000-0000-0000-0000-000000000105';
  p6        uuid := '00000000-0000-0000-0000-000000000106';
  p7        uuid := '00000000-0000-0000-0000-000000000107';
  p8        uuid := '00000000-0000-0000-0000-000000000108';
  -- Vendor IDs
  v1        uuid := '00000000-0000-0000-0000-000000000201';
  v2        uuid := '00000000-0000-0000-0000-000000000202';
  v3        uuid := '00000000-0000-0000-0000-000000000203';
  v4        uuid := '00000000-0000-0000-0000-000000000204';
  v5        uuid := '00000000-0000-0000-0000-000000000205';
  v6        uuid := '00000000-0000-0000-0000-000000000206';
  v7        uuid := '00000000-0000-0000-0000-000000000207';
  v8        uuid := '00000000-0000-0000-0000-000000000208';
  v9        uuid := '00000000-0000-0000-0000-000000000209';
  v10       uuid := '00000000-0000-0000-0000-000000000210';
begin

-- ----------------------------------------------------------------
-- Auth users (triggers auto-create public.users rows)
-- All demo accounts: password = HomeGuard2025!
-- ----------------------------------------------------------------
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  aud, role, raw_user_meta_data, created_at, updated_at
) values
  (admin1, '00000000-0000-0000-0000-000000000000', 'sarah.mitchell@homeguard.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Sarah Mitchell","role":"admin"}'::jsonb, now(), now()),
  (admin2, '00000000-0000-0000-0000-000000000000', 'james.whitfield@homeguard.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"James Whitfield","role":"admin"}'::jsonb, now(), now()),
  (conc1, '00000000-0000-0000-0000-000000000000', 'emily.chen@homeguard.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Emily Chen","role":"concierge"}'::jsonb, now(), now()),
  (conc2, '00000000-0000-0000-0000-000000000000', 'michael.brooks@homeguard.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Michael Brooks","role":"concierge"}'::jsonb, now(), now()),
  (conc3, '00000000-0000-0000-0000-000000000000', 'laura.hayes@homeguard.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Laura Hayes","role":"concierge"}'::jsonb, now(), now()),
  (cli1, '00000000-0000-0000-0000-000000000000', 'robert.ashworth@example.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Robert Ashworth","role":"client"}'::jsonb, now(), now()),
  (cli2, '00000000-0000-0000-0000-000000000000', 'patricia.vandenberg@example.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Patricia Vandenberg","role":"client"}'::jsonb, now(), now()),
  (cli3, '00000000-0000-0000-0000-000000000000', 'william.hartley@example.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"William Hartley","role":"client"}'::jsonb, now(), now()),
  (cli4, '00000000-0000-0000-0000-000000000000', 'elizabeth.moore@example.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Elizabeth Moore","role":"client"}'::jsonb, now(), now()),
  (cli5, '00000000-0000-0000-0000-000000000000', 'charles.kingsley@example.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Charles Kingsley","role":"client"}'::jsonb, now(), now()),
  (cli6, '00000000-0000-0000-0000-000000000000', 'margaret.sterling@example.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Margaret Sterling","role":"client"}'::jsonb, now(), now()),
  (cli7, '00000000-0000-0000-0000-000000000000', 'thomas.blackwood@example.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Thomas Blackwood","role":"client"}'::jsonb, now(), now()),
  (cli8, '00000000-0000-0000-0000-000000000000', 'caroline.whitmore@example.com',
   crypt('HomeGuard2025!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
   '{"full_name":"Caroline Whitmore","role":"client"}'::jsonb, now(), now())
on conflict (id) do nothing;

-- Update phones (trigger only sets id, email, full_name, role)
update public.users set phone = '404-555-0100' where id = admin1;
update public.users set phone = '404-555-0101' where id = admin2;
update public.users set phone = '404-555-0110' where id = conc1;
update public.users set phone = '404-555-0111' where id = conc2;
update public.users set phone = '404-555-0112' where id = conc3;
update public.users set phone = '404-555-0201' where id = cli1;
update public.users set phone = '404-555-0202' where id = cli2;
update public.users set phone = '404-555-0203' where id = cli3;
update public.users set phone = '404-555-0204' where id = cli4;
update public.users set phone = '404-555-0205' where id = cli5;
update public.users set phone = '404-555-0206' where id = cli6;
update public.users set phone = '404-555-0207' where id = cli7;
update public.users set phone = '404-555-0208' where id = cli8;

-- ----------------------------------------------------------------
-- Properties
-- ----------------------------------------------------------------
insert into properties (id, client_id, address, city, state, zip, year_built, square_footage, lot_size, property_type, primary_concierge_id, monthly_retainer_amount, contract_start_date, status, health_score, onboarding_status) values
  (p1, cli1, '3842 Tuxedo Road NW',         'Atlanta',      'GA', '30342', 1988, 4800, '0.75 acres', 'single_family', conc1, 2500.00, '2023-01-15', 'active', 87, 'complete'),
  (p2, cli2, '512 Peachtree Battle Ave NW',  'Atlanta',      'GA', '30327', 2002, 3600, '0.50 acres', 'single_family', conc1, 2000.00, '2023-03-01', 'active', 72, 'complete'),
  (p3, cli3, '1205 Brookhaven Chase NE',     'Brookhaven',   'GA', '30319', 2015, 4200, '0.60 acres', 'single_family', conc2, 2200.00, '2022-11-01', 'active', 91, 'complete'),
  (p4, cli4, '744 Mount Vernon Hwy NE',      'Sandy Springs','GA', '30328', 1994, 5100, '1.10 acres', 'single_family', conc2, 3000.00, '2023-06-15', 'active', 65, 'complete'),
  (p5, cli5, '2901 Peeler Road',             'Dunwoody',     'GA', '30338', 2008, 3900, '0.45 acres', 'single_family', conc3, 1800.00, '2024-01-01', 'active', 83, 'complete'),
  (p6, cli6, '418 Morningside Drive NE',     'Atlanta',      'GA', '30306', 1940, 2800, '0.30 acres', 'single_family', conc3, 1500.00, '2023-09-01', 'active', 58, 'complete'),
  (p7, cli7, '1840 Ponce de Leon Ave NE',    'Atlanta',      'GA', '30307', 1955, 3100, '0.40 acres', 'single_family', conc1, 1600.00, '2024-02-15', 'active', 76, 'complete'),
  (p8, cli8, '325 Oxford Road NE',           'Atlanta',      'GA', '30307', 1971, 2600, '0.35 acres', 'single_family', conc2, 1400.00, '2024-04-01', 'active', 94, 'complete');

-- ----------------------------------------------------------------
-- Vendors
-- ----------------------------------------------------------------
insert into vendors (id, company_name, contact_name, phone, email, specialty_categories, license_number, insurance_expiration, rating, status) values
  (v1,  'Peachtree HVAC Services',        'David Hartman', '404-555-1001', 'david@peachtreehvac.com',    ARRAY['hvac'],                    'GA-HVAC-4421', '2026-06-30', 5, 'preferred'),
  (v2,  'Northside Plumbing Solutions',   'Ray Perkins',   '404-555-1002', 'ray@northsideplumbing.com',  ARRAY['plumbing'],                'GA-PLB-8834',  '2026-08-31', 5, 'preferred'),
  (v3,  'Atlanta Electric Co.',           'Tom Waller',    '404-555-1003', 'tom@atlantaelectric.com',    ARRAY['electrical'],              'GA-EL-2291',   '2026-05-31', 4, 'preferred'),
  (v4,  'Buckhead Roofing & Exteriors',   'Mark Johnson',  '404-555-1004', 'mark@buckheadroofing.com',   ARRAY['roofing','exterior'],      'GA-ROO-6674',  '2026-07-31', 5, 'preferred'),
  (v5,  'Crystal Clear Pool Service',     'Lisa Nguyen',   '404-555-1005', 'lisa@crystalclearpools.com', ARRAY['pool'],                    null,           '2026-09-30', 4, 'approved'),
  (v6,  'Verdant Landscapes Atlanta',     'Carlos Rivera', '404-555-1006', 'carlos@verdantlandscapes.com',ARRAY['landscaping'],            'GA-LAND-3318', '2026-04-30', 5, 'preferred'),
  (v7,  'SmartHome Solutions ATL',        'James Park',    '404-555-1007', 'james@smarthomeatl.com',     ARRAY['smart_home','security'],   null,           '2026-10-31', 4, 'approved'),
  (v8,  'Premier Appliance Repair',       'Susan Wright',  '404-555-1008', 'susan@premierappliance.com', ARRAY['appliance'],               null,           '2026-03-31', 4, 'approved'),
  (v9,  'Atlanta Pest Defense',           'Greg Morrison', '404-555-1009', 'greg@atlantapestdefense.com',ARRAY['exterior'],                'GA-PEST-9923', '2026-11-30', 5, 'preferred'),
  (v10, 'Southern Pressure Washing',      'Dan Owens',     '404-555-1010', 'dan@southernpw.com',         ARRAY['exterior'],                null,           '2026-06-30', 4, 'approved');

-- ----------------------------------------------------------------
-- Assets
-- ----------------------------------------------------------------
insert into assets (property_id, category, name, brand, model, install_date, warranty_expiration, expected_lifespan_years, location_in_home, status, last_serviced_date) values
  (p1, 'hvac',       'Central Air System',       'Trane',     'XV20i',           '2019-05-15', '2029-05-15', 15, 'Utility Room',       'active', '2025-04-10'),
  (p1, 'plumbing',   'Tankless Water Heater',    'Rinnai',    'RU199iN',         '2021-03-20', '2031-03-20', 20, 'Garage',             'active', '2025-01-15'),
  (p1, 'pool',       'Pool Pump and Filter',     'Pentair',   'IntelliFlo 3',    '2020-06-01', '2025-06-01', 12, 'Pool Equipment Area','active', '2025-05-01'),
  (p1, 'electrical', 'Whole-Home Generator',     'Generac',   '22kW Guardian',   '2022-08-10', '2027-08-10', 15, 'Side Yard',          'active', '2025-03-20'),
  (p1, 'appliance',  'Refrigerator',             'Sub-Zero',  '648PRO',          '2019-01-10', '2024-01-10', 20, 'Kitchen',            'active', null),
  (p1, 'appliance',  'Washer',                   'LG',        'WM4000HWA',       '2020-09-05', '2025-09-05', 12, 'Laundry Room',       'active', null),
  (p1, 'smart_home', 'Smart Lighting System',    'Lutron',    'Caseta Pro',      '2021-11-20', null,         15, 'Throughout',         'active', null),
  (p1, 'security',   'Home Security System',     'Ring',      'Alarm Pro',       '2022-01-15', '2024-01-15', 10, 'Throughout',         'active', '2025-02-10'),
  (p2, 'hvac',       'Central Air System',       'Carrier',   'Infinity 20',     '2015-07-20', '2025-07-20', 15, 'Attic',              'active', '2025-04-05'),
  (p2, 'plumbing',   'Water Heater',             'Bradford White','50GAL',        '2018-03-10', '2023-03-10', 12, 'Garage',            'active', '2024-11-20'),
  (p2, 'appliance',  'Dishwasher',               'Bosch',     '800 Series',      '2020-05-15', '2025-05-15', 12, 'Kitchen',            'active', null),
  (p2, 'roofing',    'Architectural Shingle Roof','GAF',       'Timberline HDZ',  '2016-04-10', null,         25, 'Exterior',           'active', '2024-10-15'),
  (p3, 'hvac',       'Central Air System',       'Lennox',    'XC21',            '2020-04-15', '2030-04-15', 15, 'Utility Closet',     'active', '2025-04-20'),
  (p3, 'plumbing',   'Tankless Water Heater',    'Rheem',     'RTEX-24',         '2020-04-15', '2025-04-15', 15, 'Garage',             'active', '2025-01-10'),
  (p3, 'appliance',  'Dishwasher',               'Miele',     'G 7566 SCVi',     '2021-06-01', '2026-06-01', 15, 'Kitchen',            'active', null),
  (p3, 'appliance',  'Range',                    'Wolf',      'IR30450/S',       '2020-04-15', '2025-04-15', 20, 'Kitchen',            'active', null),
  (p3, 'smart_home', 'Smart Thermostat',         'Nest',      'Learning 4th Gen','2021-01-10', null,         10, 'Hallway',            'active', null),
  (p4, 'hvac',       'Central Air System',       'Carrier',   'Performance 17',  '2014-06-10', '2024-06-10', 15, 'Attic',              'needs_attention', '2025-03-15'),
  (p4, 'plumbing',   'Water Heater',             'Rheem',     '50GAL Electric',  '2016-09-20', '2021-09-20', 12, 'Garage',             'needs_attention', null),
  (p4, 'roofing',    'Composition Shingle Roof', 'CertainTeed','Landmark Pro',   '2010-05-15', null,         25, 'Exterior',           'active', '2024-09-20');

-- ----------------------------------------------------------------
-- Vendor scorecards
-- ----------------------------------------------------------------
insert into vendor_scorecards (vendor_id, total_jobs, on_time_count, average_completion_hours, callback_count, average_satisfaction_rating) values
  (v1,  47, 44, 3.2, 1, 4.8),
  (v2,  38, 36, 4.1, 0, 4.9),
  (v3,  52, 48, 2.8, 2, 4.6),
  (v4,  29, 27, 6.5, 0, 5.0),
  (v5,  33, 30, 2.0, 1, 4.5),
  (v6,  61, 58, 4.0, 1, 4.7),
  (v7,  22, 21, 2.5, 0, 4.8),
  (v8,  41, 37, 1.8, 3, 4.3),
  (v9,  55, 53, 1.5, 0, 4.9),
  (v10, 28, 26, 3.0, 1, 4.6);

-- ----------------------------------------------------------------
-- Work orders
-- ----------------------------------------------------------------
insert into work_orders (property_id, vendor_id, requested_by, assigned_to, title, description, category, priority, status, scheduled_date, completed_date, cost_estimate, actual_cost, markup_percentage, client_cost, vendor_arrived_on_time, client_satisfaction, notes, created_at) values
  (p1, v1,  admin1, conc1, 'HVAC Annual Service',          'Spring HVAC tune-up and filter replacement',             'hvac',        'normal',    'completed',  '2025-04-10 09:00', '2025-04-10 11:30', 175, 160, 20, 192, true,  5, 'All systems operating well', '2025-04-05 10:00:00'),
  (p1, v4,  admin1, conc1, 'Roof Inspection After Storm',  'Inspect for wind damage after spring storms',            'roofing',     'high',      'completed',  '2025-03-20 08:00', '2025-03-20 10:00', 250, 220, 20, 264, true,  5, 'Minor debris, no damage found', '2025-03-18 14:00:00'),
  (p1, v5,  admin1, conc1, 'Pool Opening Service',         'Spring pool opening, chemical balance, equipment check', 'pool',        'normal',    'completed',  '2025-05-01 08:00', '2025-05-01 10:30', 350, 320, 20, 384, true,  5, 'Pool in great shape', '2025-04-28 11:00:00'),
  (p1, v2,  admin1, conc1, 'Water Heater Annual Flush',    'Annual tankless water heater maintenance',               'plumbing',    'normal',    'scheduled',  '2025-06-15 09:00', null,               175, null, 20, null, null, null, null, '2025-06-01 10:00:00'),
  (p2, v1,  admin1, conc1, 'HVAC Filter Replacement',      'Quarterly filter change and system check',               'hvac',        'normal',    'completed',  '2025-04-05 10:00', '2025-04-05 11:00', 95,  85,  20, 102, true,  5, null, '2025-04-01 09:00:00'),
  (p2, v3,  admin1, conc1, 'Panel Inspection',             'Annual electrical panel safety inspection',              'electrical',  'normal',    'in_progress','2025-05-20 08:00', null,               300, null, 20, null, null, null, null, '2025-05-15 09:00:00'),
  (p3, v1,  admin1, conc2, 'HVAC Spring Tune-Up',          'Cooling season preparation and filter change',           'hvac',        'normal',    'completed',  '2025-04-20 09:00', '2025-04-20 11:00', 160, 145, 20, 174, true,  5, null, '2025-04-15 10:00:00'),
  (p3, v6,  admin1, conc2, 'Irrigation System Startup',    'Turn on irrigation, inspect all zones',                  'landscaping', 'normal',    'completed',  '2025-04-25 08:00', '2025-04-25 10:30', 200, 185, 20, 222, true,  5, null, '2025-04-20 09:00:00'),
  (p4, v2,  admin1, conc2, 'Plumbing Leak Investigation',  'Investigate slow drain in master bath',                  'plumbing',    'high',      'completed',  '2025-03-15 10:00', '2025-03-15 12:30', 250, 310, 20, 372, true,  4, 'Found and cleared blockage in P-trap', '2025-03-12 14:00:00'),
  (p4, v4,  admin1, conc2, 'Deck Board Replacement',       'Replace rotted deck boards on rear deck',               'exterior',    'normal',    'scheduled',  '2025-06-10 08:00', null,               800, null, 20, null, null, null, null, '2025-05-20 11:00:00'),
  (p5, v1,  admin1, conc3, 'HVAC Maintenance',             'Annual HVAC maintenance visit',                          'hvac',        'normal',    'completed',  '2025-04-10 11:00', '2025-04-10 12:30', 150, 140, 20, 168, true,  5, null, '2025-04-05 10:00:00'),
  (p5, v9,  admin1, conc3, 'Pest Control Treatment',       'Quarterly pest barrier renewal',                         'exterior',    'normal',    'submitted',  null,               null,               150, null, 20, null, null, null, null, '2025-05-25 09:00:00'),
  (p6, v3,  admin1, conc3, 'Electrical Safety Inspection', 'Older home electrical safety review',                   'electrical',  'high',      'in_progress','2025-05-18 09:00', null,               450, null, 20, null, null, null, 'This is a 1940 home, full panel audit recommended', '2025-05-10 10:00:00'),
  (p7, v1,  admin1, conc1, 'HVAC Service Call',            'Unit not cooling efficiently',                           'hvac',        'high',      'completed',  '2025-04-28 08:00', '2025-04-28 11:00', 300, 280, 20, 336, false, 3, 'Arrived 30 min late. Replaced capacitor.', '2025-04-27 15:00:00'),
  (p8, v6,  admin1, conc2, 'Spring Landscaping',           'Spring cleanup, mulching, and planting',                 'landscaping', 'normal',    'completed',  '2025-04-05 07:30', '2025-04-05 13:00', 750, 700, 20, 840, true,  5, 'Excellent work on the front garden', '2025-04-01 10:00:00');

-- ----------------------------------------------------------------
-- Maintenance schedules
-- ----------------------------------------------------------------
insert into maintenance_schedules (property_id, title, category, frequency, season, last_completed, next_due, vendor_id, estimated_cost, is_active) values
  (p1, 'HVAC Filter Change',        'hvac',        'quarterly',   null,     '2025-04-10', '2025-07-10', v1,   95, true),
  (p1, 'HVAC Annual Tune-Up',       'hvac',        'annual',      'spring', '2025-04-10', '2026-04-10', v1,  175, true),
  (p1, 'Pool Weekly Service',       'pool',        'monthly',     'summer', '2025-05-15', '2025-06-15', v5,  200, true),
  (p1, 'Gutter Cleaning',           'roofing',     'semi_annual', 'fall',   '2024-11-15', '2025-11-15', null, 225, true),
  (p1, 'Pest Control Treatment',    'exterior',    'quarterly',   null,     '2025-05-01', '2025-08-01', v9,  150, true),
  (p1, 'Generator Annual Service',  'electrical',  'annual',      'spring', '2025-03-20', '2026-03-20', null, 200, true),
  (p2, 'HVAC Filter Change',        'hvac',        'quarterly',   null,     '2025-04-05', '2025-07-05', v1,   95, true),
  (p2, 'Gutter Cleaning',           'roofing',     'semi_annual', 'fall',   '2025-04-15', '2025-10-15', null, 225, true),
  (p3, 'HVAC Filter Change',        'hvac',        'quarterly',   null,     '2025-04-20', '2025-07-20', v1,   95, true),
  (p3, 'Irrigation Seasonal Check', 'landscaping', 'semi_annual', 'spring', '2025-04-25', '2025-10-25', v6,  175, true),
  (p4, 'HVAC Filter Change',        'hvac',        'quarterly',   null,     '2025-03-01', '2025-06-01', v1,   95, true),
  (p4, 'Pest Control Treatment',    'exterior',    'quarterly',   null,     '2025-02-15', '2025-05-15', v9,  150, true),
  (p5, 'HVAC Filter Change',        'hvac',        'quarterly',   null,     '2025-04-10', '2025-07-10', v1,   95, true),
  (p6, 'HVAC Filter Change',        'hvac',        'quarterly',   null,     '2025-03-15', '2025-06-15', v1,   95, true),
  (p7, 'HVAC Filter Change',        'hvac',        'quarterly',   null,     '2025-04-01', '2025-07-01', v1,   95, true),
  (p8, 'Landscaping Monthly',       'landscaping', 'monthly',     null,     '2025-05-05', '2025-06-05', v6,  350, true);

-- ----------------------------------------------------------------
-- Projects
-- ----------------------------------------------------------------
insert into projects (id, property_id, title, description, status, start_date, target_completion_date, budget, actual_spend) values
  ('00000000-0000-0000-0000-000000000301', p1, 'Kitchen Renovation',       'Full kitchen renovation including new cabinetry, countertops, backsplash, and appliance upgrades', 'in_progress', '2025-04-01', '2025-07-31', 85000, 32000),
  ('00000000-0000-0000-0000-000000000302', p4, 'Master Bath Remodel',      'Complete master bathroom renovation with steam shower, freestanding tub, and custom tile',         'planning',    '2025-07-01', '2025-10-31', 55000, 0),
  ('00000000-0000-0000-0000-000000000303', p3, 'Backyard Landscape Design','Full backyard redesign with outdoor kitchen, pergola, and enhanced plantings',                     'in_progress', '2025-03-15', '2025-06-30', 40000, 28000);

insert into project_tasks (project_id, title, status, vendor_id, cost, sort_order) values
  ('00000000-0000-0000-0000-000000000301', 'Demolition and prep',       'completed',   null,  3500, 1),
  ('00000000-0000-0000-0000-000000000301', 'Electrical rough-in',       'completed',   v3,    8500, 2),
  ('00000000-0000-0000-0000-000000000301', 'Plumbing rough-in',         'completed',   v2,    6200, 3),
  ('00000000-0000-0000-0000-000000000301', 'Cabinet installation',      'in_progress', null, 18000, 4),
  ('00000000-0000-0000-0000-000000000301', 'Countertop and backsplash', 'pending',     null, 12000, 5),
  ('00000000-0000-0000-0000-000000000301', 'Appliance installation',    'pending',     v8,    5000, 6),
  ('00000000-0000-0000-0000-000000000301', 'Painting and trim',         'pending',     null,  4500, 7),
  ('00000000-0000-0000-0000-000000000302', 'Design and material selection','in_progress',null, 5000, 1),
  ('00000000-0000-0000-0000-000000000302', 'Demolition',               'pending',     null,  4000, 2),
  ('00000000-0000-0000-0000-000000000302', 'Tile and waterproofing',    'pending',     null, 12000, 3),
  ('00000000-0000-0000-0000-000000000302', 'Plumbing fixtures',         'pending',     v2,    8000, 4),
  ('00000000-0000-0000-0000-000000000303', 'Site grading and drainage', 'completed',   v6,    8000, 1),
  ('00000000-0000-0000-0000-000000000303', 'Pergola construction',      'completed',   null, 12000, 2),
  ('00000000-0000-0000-0000-000000000303', 'Outdoor kitchen rough-in',  'in_progress', v2,    6000, 3),
  ('00000000-0000-0000-0000-000000000303', 'Planting and hardscape',    'pending',     v6,   10000, 4);

-- ----------------------------------------------------------------
-- Invoices
-- ----------------------------------------------------------------
insert into invoices (property_id, client_id, invoice_number, period_start, period_end, retainer_amount, additional_charges, total, status, due_date, paid_date, created_at) values
  (p1, cli1, 'HG-2025-001', '2025-01-01', '2025-01-31', 2500, '[{"description":"HVAC filter replacement","amount":102}]', 2602, 'paid', '2025-02-15', '2025-02-10', '2025-02-01 10:00:00'),
  (p1, cli1, 'HG-2025-013', '2025-02-01', '2025-02-28', 2500, null,                                                       2500, 'paid', '2025-03-15', '2025-03-12', '2025-03-01 10:00:00'),
  (p1, cli1, 'HG-2025-025', '2025-03-01', '2025-03-31', 2500, '[{"description":"Roof inspection","amount":264}]',          2764, 'paid', '2025-04-15', '2025-04-08', '2025-04-01 10:00:00'),
  (p1, cli1, 'HG-2025-037', '2025-04-01', '2025-04-30', 2500, '[{"description":"HVAC annual tune-up","amount":192},{"description":"Pest treatment","amount":198},{"description":"Pool opening","amount":384}]', 3274, 'paid', '2025-05-15', '2025-05-10', '2025-05-01 10:00:00'),
  (p1, cli1, 'HG-2025-049', '2025-05-01', '2025-05-31', 2500, null,                                                       2500, 'sent', '2025-06-15', null, '2025-06-01 10:00:00'),
  (p2, cli2, 'HG-2025-002', '2025-01-01', '2025-01-31', 2000, null,                                                       2000, 'paid', '2025-02-15', '2025-02-14', '2025-02-01 10:00:00'),
  (p2, cli2, 'HG-2025-014', '2025-02-01', '2025-02-28', 2000, null,                                                       2000, 'paid', '2025-03-15', '2025-03-11', '2025-03-01 10:00:00'),
  (p2, cli2, 'HG-2025-038', '2025-04-01', '2025-04-30', 2000, '[{"description":"HVAC filter","amount":102},{"description":"Gutter cleaning","amount":240}]', 2342, 'paid', '2025-05-15', '2025-05-08', '2025-05-01 10:00:00'),
  (p2, cli2, 'HG-2025-050', '2025-05-01', '2025-05-31', 2000, null,                                                       2000, 'sent', '2025-06-15', null, '2025-06-01 10:00:00'),
  (p4, cli4, 'HG-2025-004', '2025-05-01', '2025-05-31', 3000, '[{"description":"Plumbing repair","amount":372}]',          3372, 'overdue', '2025-06-01', null, '2025-06-01 10:00:00');

-- ----------------------------------------------------------------
-- Activity logs
-- ----------------------------------------------------------------
insert into activity_logs (property_id, user_id, action_type, description, created_at) values
  (p1, conc1, 'inspection_logged',    'Annual property walkthrough completed. All systems in good order.', '2025-05-10 10:00:00'),
  (p1, conc1, 'work_order_completed', 'HVAC annual service completed by Peachtree HVAC Services.', '2025-04-10 11:30:00'),
  (p1, conc1, 'work_order_completed', 'Roof inspection completed. No damage found.', '2025-03-20 10:00:00'),
  (p1, conc1, 'work_order_completed', 'Pool opened for season. Water balanced.', '2025-05-01 10:30:00'),
  (p1, admin1, 'invoice_sent',        'Invoice HG-2025-049 sent for May 2025.', '2025-06-01 10:00:00'),
  (p2, conc1, 'inspection_logged',    'Quarterly walkthrough. Water heater warranty note flagged.', '2025-04-20 11:00:00'),
  (p2, conc1, 'work_order_completed', 'Gutters cleaned and flushed.', '2025-04-15 11:00:00'),
  (p3, conc2, 'inspection_logged',    'New build in excellent condition. All systems nominal.', '2025-05-15 09:30:00'),
  (p3, conc2, 'work_order_completed', 'HVAC spring tune-up completed.', '2025-04-20 11:00:00'),
  (p3, conc2, 'work_order_completed', 'Irrigation startup completed. All 8 zones operating.', '2025-04-25 10:30:00'),
  (p4, conc2, 'inspection_logged',    'Property walkthrough. Noted deck boards need attention.', '2025-05-05 10:00:00'),
  (p4, conc2, 'work_order_completed', 'Plumbing issue in master bath resolved.', '2025-03-15 12:30:00'),
  (p6, conc3, 'inspection_logged',    'Older home walkthrough. Multiple items flagged for attention.', '2025-05-12 11:00:00'),
  (p8, conc2, 'inspection_logged',    'New client onboarding walkthrough. Property in excellent condition.', '2025-05-01 13:00:00');

-- ----------------------------------------------------------------
-- Referrals
-- ----------------------------------------------------------------
insert into referrals (referring_client_id, referral_code, referred_name, referred_email, status, credit_amount, created_at, converted_at) values
  (cli1, 'HC-00000011', 'Harrison Wentworth', 'harrison.wentworth@example.com', 'signed',                 500, '2024-09-15 10:00:00', '2024-10-01 10:00:00'),
  (cli1, 'HC-10000011', 'Diane Forsythe',     'diane.forsythe@example.com',     'consultation_scheduled', null,'2025-04-20 10:00:00', null),
  (cli3, 'HC-00000013', 'Nathan Pemberton',   'nathan.pemberton@example.com',   'sent',                   null,'2025-05-10 10:00:00', null);

end $$;
