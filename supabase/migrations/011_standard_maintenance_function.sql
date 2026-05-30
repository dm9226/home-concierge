CREATE OR REPLACE FUNCTION create_standard_maintenance_schedule(p_property_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  today        DATE := CURRENT_DATE;
  next_spring  DATE;
  next_fall    DATE;
BEGIN
  -- Next March 1 (spring tune-up window)
  next_spring := MAKE_DATE(EXTRACT(YEAR FROM today)::INT, 3, 1);
  IF today >= next_spring THEN
    next_spring := next_spring + INTERVAL '1 year';
  END IF;

  -- Next September 1 (fall tune-up window)
  next_fall := MAKE_DATE(EXTRACT(YEAR FROM today)::INT, 9, 1);
  IF today >= next_fall THEN
    next_fall := next_fall + INTERVAL '1 year';
  END IF;

  -- Bail if this property already has an active schedule (idempotent)
  IF EXISTS (
    SELECT 1 FROM maintenance_schedules
    WHERE property_id = p_property_id AND is_active = true
  ) THEN
    RETURN;
  END IF;

  INSERT INTO maintenance_schedules
    (property_id, title, description, category, frequency, season, next_due, estimated_cost, is_active)
  VALUES

  -- ── MONTHLY ────────────────────────────────────────────────────────────────
  (p_property_id,
   'Check HVAC Filter',
   'Inspect the air filter and replace if visibly dirty. 1-inch filters often need monthly replacement; thicker media filters every 3 months. A clogged filter strains the blower and reduces air quality.',
   'hvac', 'monthly', NULL, today + INTERVAL '30 days', 25, true),

  (p_property_id,
   'Test Smoke & CO Detectors',
   'Press the test button on every smoke and carbon monoxide detector. If any alarm fails to sound, replace the batteries immediately and retest. Detectors older than 10 years should be replaced.',
   'security', 'monthly', NULL, today + INTERVAL '30 days', NULL, true),

  (p_property_id,
   'Check Under-Sink Plumbing',
   'Open the cabinet under each kitchen and bathroom sink and look for drips, moisture rings, or staining on the cabinet floor. Catching a slow leak early prevents mold and cabinet rot.',
   'plumbing', 'monthly', NULL, today + INTERVAL '30 days', NULL, true),

  -- ── QUARTERLY ──────────────────────────────────────────────────────────────
  (p_property_id,
   'Test GFCI Outlets',
   'Press TEST on all GFCI outlets (bathrooms, kitchen, garage, and exterior) to confirm power cuts, then press RESET to restore. A GFCI that won''t reset needs to be replaced.',
   'electrical', 'quarterly', NULL, today + INTERVAL '90 days', NULL, true),

  (p_property_id,
   'Clean Range Hood Filter',
   'Remove the grease filter from the range hood and soak in very hot soapy water, or run it through the dishwasher. A grease-loaded filter is a fire hazard and reduces ventilation effectiveness.',
   'appliance', 'quarterly', NULL, today + INTERVAL '90 days', NULL, true),

  (p_property_id,
   'Inspect Tub & Shower Caulking',
   'Check caulk lines around tub surrounds, shower pans, and where tile meets the floor for cracking, peeling, or black mold. Re-caulk any gaps before water gets behind the wall.',
   'plumbing', 'quarterly', NULL, today + INTERVAL '90 days', 20, true),

  (p_property_id,
   'Clean Garbage Disposal',
   'With the disposal off, scrub the rubber splash guard with dish soap. Then run with cold water and a tray of ice cubes to clean the grinding chamber. Deodorize with a half-cup of baking soda followed by white vinegar.',
   'plumbing', 'quarterly', NULL, today + INTERVAL '90 days', NULL, true),

  (p_property_id,
   'Clean Refrigerator Condenser Coils',
   'Pull the refrigerator out and vacuum dust from the condenser coils on the back or underneath. Dirty coils make the compressor work harder, raising energy use and shortening appliance life.',
   'appliance', 'quarterly', NULL, today + INTERVAL '90 days', NULL, true),

  (p_property_id,
   'Inspect Exterior Drainage',
   'Walk the foundation perimeter and confirm soil slopes away from the house. Verify downspout extensions discharge water at least 6 feet from the foundation. Clear any debris blocking drainage paths.',
   'exterior', 'quarterly', NULL, today + INTERVAL '90 days', NULL, true),

  -- ── SEMI-ANNUAL -- SPRING ──────────────────────────────────────────────────
  (p_property_id,
   'AC Tune-Up (Professional)',
   'Schedule professional air conditioning service before cooling season. Technician cleans evaporator and condenser coils, checks refrigerant charge, inspects capacitors, and verifies airflow. Neglecting annual service voids most manufacturer warranties.',
   'hvac', 'semi_annual', 'spring', next_spring, 125, true),

  (p_property_id,
   'Clean Gutters & Downspouts',
   'Remove all debris from gutters and flush each downspout with a garden hose to confirm it flows freely. Check that all sections are firmly attached to the fascia and pitched toward the downspouts. Re-spike any sagging hangers.',
   'exterior', 'semi_annual', 'spring', next_spring, 150, true),

  (p_property_id,
   'Inspect Roof & Attic',
   'Inspect the roof from the ground or a ladder for missing, curling, or cracked shingles; damaged flashing around the chimney, skylights, and vent pipes; and granule loss in gutters. In the attic, look for daylight penetration, moisture stains, or signs of animal entry.',
   'roofing', 'semi_annual', 'spring', next_spring, NULL, true),

  (p_property_id,
   'Check Door & Window Weatherstripping',
   'Inspect weatherstripping on all exterior doors for compression loss, tearing, or gaps by closing a dollar bill in the door -- it should grip. Replace worn strips to prevent energy loss, drafts, and pest entry.',
   'exterior', 'semi_annual', 'spring', next_spring, 30, true),

  (p_property_id,
   'Test Garage Door Safety Reverse',
   'Place a 2x4 flat on the ground in the center of the door path. The door must auto-reverse upon contact. Also verify photo-eye sensors are properly aligned (steady LED lights). A door that doesn''t reverse is a serious safety hazard.',
   'exterior', 'semi_annual', 'spring', next_spring, NULL, true),

  (p_property_id,
   'Start-Up Irrigation System',
   'Turn on the irrigation system for the season. Run each zone and inspect for broken heads, poor coverage patterns, and leaks at head bases. Adjust spray patterns and controller schedule for spring watering requirements.',
   'landscaping', 'semi_annual', 'spring', next_spring, 75, true),

  -- ── SEMI-ANNUAL -- FALL ────────────────────────────────────────────────────
  (p_property_id,
   'Heating System Tune-Up (Professional)',
   'Schedule professional furnace or heat pump service before heating season. Technician cleans burners and heat exchanger, inspects the flue for blockage, tests ignition, and verifies safe operation of the gas valve and limit switches.',
   'hvac', 'semi_annual', 'fall', next_fall, 125, true),

  (p_property_id,
   'Clean Gutters After Leaf Fall',
   'Clear gutters again after the last leaves have fallen -- this is the critical cleaning. Ice dams form in winter when water backs up behind debris-clogged gutters, forcing water under shingles and into the home.',
   'exterior', 'semi_annual', 'fall', next_fall, 150, true),

  (p_property_id,
   'Winterize Outdoor Faucets & Irrigation',
   'Shut off and drain all exterior hose bibs using the interior shutoff valve. Blow out irrigation lines with compressed air (or drain via manual drain valves) before the first hard freeze. Disconnect and store garden hoses.',
   'plumbing', 'semi_annual', 'fall', next_fall, 50, true),

  (p_property_id,
   'Inspect Chimney & Fireplace',
   'Have a certified chimney sweep inspect and clean before fireplace season. Creosote buildup of 1/8 inch or more requires cleaning -- it''s the primary cause of chimney fires. Also inspect the damper, firebox, and smoke shelf.',
   'other', 'semi_annual', 'fall', next_fall, 200, true),

  (p_property_id,
   'Test Sump Pump',
   'Slowly pour water into the sump pit until the float triggers the pump. Confirm it moves water out and the discharge line is clear and terminates well away from the foundation. Install a battery backup pump if the home is in a flood-prone area.',
   'plumbing', 'semi_annual', 'fall', next_fall, NULL, true),

  -- ── ANNUAL ─────────────────────────────────────────────────────────────────
  (p_property_id,
   'Professional Dryer Vent Cleaning',
   'Hire a professional to clean the full dryer duct run from the appliance to the exterior cap. Lint buildup is the #1 cause of dryer fires. Signs of a blocked vent: clothes take more than one cycle to dry, the dryer is hot to the touch, and a burning smell during operation.',
   'other', 'annual', NULL, today + INTERVAL '365 days', 100, true),

  (p_property_id,
   'Flush Water Heater',
   'Attach a garden hose to the drain valve and drain 2-3 gallons to flush sediment from the tank bottom. Sediment buildup insulates the burner, raises energy consumption, and accelerates tank corrosion. Units older than 10 years may benefit from professional inspection.',
   'plumbing', 'annual', NULL, today + INTERVAL '365 days', NULL, true),

  (p_property_id,
   'Garage Door Tune-Up',
   'Lubricate hinges, rollers, springs, and the full length of both tracks with lithium-based garage door lubricant (not WD-40). Tighten any loose nuts and bolts. Inspect cables and springs for fraying or rust -- never adjust springs yourself.',
   'exterior', 'annual', NULL, today + INTERVAL '365 days', NULL, true),

  (p_property_id,
   'Inspect Deck & Patio',
   'Check all decking boards and railings for soft spots, splitting, rot, loose fasteners, and wobbly posts. Push hard on the railing -- it should not flex. Identify any areas where soil contacts wood framing, as this accelerates rot.',
   'exterior', 'annual', NULL, today + INTERVAL '365 days', NULL, true),

  (p_property_id,
   'Annual Pest Inspection',
   'Schedule a professional inspection for termites, carpenter ants, and other wood-destroying insects. In warm climates, termite damage often goes undetected for years. Early detection saves tens of thousands in structural repairs.',
   'other', 'annual', NULL, today + INTERVAL '365 days', 125, true),

  (p_property_id,
   'Inspect Foundation & Basement/Crawl Space',
   'Walk the exterior foundation perimeter and inspect for new cracks, horizontal cracking (serious), stair-step cracks in brick, or efflorescence (white mineral staining from water movement). In the basement or crawl space, check for standing water, moisture on walls, and wood rot.',
   'exterior', 'annual', NULL, today + INTERVAL '365 days', NULL, true),

  (p_property_id,
   'Electrical Panel Inspection',
   'Have a licensed electrician inspect the main panel every 3-5 years, or annually for panels older than 25 years. They check for overloaded circuits, double-tapped breakers, aluminum wiring issues, and corrosion. Electrical faults are a leading cause of house fires.',
   'electrical', 'annual', NULL, today + INTERVAL '365 days', 200, true);

END;
$$;
