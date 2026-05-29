-- Calculate health score for a property
create or replace function calculate_health_score(p_property_id uuid)
returns integer as $$
declare
  v_maintenance_score numeric := 100;
  v_system_age_score numeric := 80;
  v_warranty_score numeric := 100;
  v_inspection_score numeric := 25;
  v_open_issues_score numeric := 100;
  v_total_scheduled integer;
  v_completed_on_time integer;
  v_asset_count integer;
  v_warranty_count integer;
  v_open_count integer;
  v_last_inspection timestamptz;
  v_days_since_inspection integer;
begin
  -- Maintenance compliance (40%)
  select count(*) into v_total_scheduled
  from maintenance_schedules
  where property_id = p_property_id
    and is_active = true;

  select count(*) into v_completed_on_time
  from maintenance_schedules
  where property_id = p_property_id
    and is_active = true
    and last_completed >= now() - interval '12 months';

  if v_total_scheduled > 0 then
    v_maintenance_score := (v_completed_on_time::numeric / v_total_scheduled) * 100;
  end if;

  -- System age health (25%)
  select count(*) into v_asset_count
  from assets
  where property_id = p_property_id
    and status = 'active'
    and expected_lifespan_years is not null
    and install_date is not null;

  if v_asset_count > 0 then
    select coalesce(avg(
      greatest(0,
        (expected_lifespan_years - extract(year from age(now(), install_date::timestamptz))::numeric)
        / expected_lifespan_years
      ) * 100
    ), 80) into v_system_age_score
    from assets
    where property_id = p_property_id
      and status = 'active'
      and expected_lifespan_years is not null
      and install_date is not null;
  end if;

  -- Warranty coverage (15%)
  select count(*) into v_asset_count
  from assets
  where property_id = p_property_id
    and status = 'active'
    and category in ('hvac', 'roofing', 'plumbing', 'electrical', 'appliance');

  if v_asset_count > 0 then
    select count(*) into v_warranty_count
    from assets
    where property_id = p_property_id
      and status = 'active'
      and category in ('hvac', 'roofing', 'plumbing', 'electrical', 'appliance')
      and warranty_expiration > current_date;

    v_warranty_score := (v_warranty_count::numeric / v_asset_count) * 100;
  end if;

  -- Recent inspection (10%)
  select max(created_at) into v_last_inspection
  from activity_logs
  where property_id = p_property_id
    and action_type = 'inspection_logged';

  if v_last_inspection is not null then
    v_days_since_inspection := extract(day from now() - v_last_inspection)::integer;
    if v_days_since_inspection <= 30 then v_inspection_score := 100;
    elsif v_days_since_inspection <= 60 then v_inspection_score := 75;
    elsif v_days_since_inspection <= 90 then v_inspection_score := 50;
    else v_inspection_score := 25;
    end if;
  end if;

  -- Open issues (10%)
  select count(*) into v_open_count
  from work_orders
  where property_id = p_property_id
    and status in ('submitted', 'approved', 'scheduled', 'in_progress');

  if v_open_count = 0 then v_open_issues_score := 100;
  elsif v_open_count <= 2 then v_open_issues_score := 75;
  elsif v_open_count <= 4 then v_open_issues_score := 50;
  else v_open_issues_score := 25;
  end if;

  return greatest(0, least(100, round(
    v_maintenance_score * 0.40 +
    v_system_age_score * 0.25 +
    v_warranty_score * 0.15 +
    v_inspection_score * 0.10 +
    v_open_issues_score * 0.10
  )::integer));
end;
$$ language plpgsql security definer;

-- Trigger function to update health score
create or replace function update_property_health_score()
returns trigger as $$
declare
  v_property_id uuid;
  v_new_score integer;
  v_old_score integer;
begin
  v_property_id := NEW.property_id;

  if v_property_id is not null then
    v_new_score := calculate_health_score(v_property_id);

    select health_score into v_old_score from properties where id = v_property_id;

    update properties set health_score = v_new_score where id = v_property_id;

    -- Log significant health score changes (5+ points)
    if abs(coalesce(v_new_score, 0) - coalesce(v_old_score, 0)) >= 5 and auth.uid() is not null then
      insert into activity_logs (property_id, user_id, action_type, description, metadata)
      values (
        v_property_id,
        auth.uid(),
        'health_score_changed',
        'Home Health Score changed from ' || coalesce(v_old_score::text, '?') || ' to ' || v_new_score::text,
        jsonb_build_object('old_score', v_old_score, 'new_score', v_new_score)
      );
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Attach triggers
create trigger trigger_health_score_work_order
  after insert or update of status on work_orders
  for each row execute function update_property_health_score();

create trigger trigger_health_score_maintenance
  after update of last_completed on maintenance_schedules
  for each row when (NEW.last_completed is distinct from OLD.last_completed)
  execute function update_property_health_score();

create trigger trigger_health_score_asset
  after insert or update on assets
  for each row execute function update_property_health_score();

-- Update vendor scorecard
create or replace function update_vendor_scorecard(p_vendor_id uuid)
returns void as $$
begin
  insert into vendor_scorecards (
    vendor_id, total_jobs, on_time_count,
    average_completion_hours, callback_count, average_satisfaction_rating
  )
  select
    p_vendor_id,
    count(*),
    count(*) filter (where vendor_arrived_on_time = true),
    avg(
      extract(epoch from (completed_date - created_at)) / 3600
    ) filter (where completed_date is not null),
    count(*) filter (where callback_required = true),
    avg(client_satisfaction) filter (where client_satisfaction is not null)
  from work_orders
  where vendor_id = p_vendor_id
  on conflict (vendor_id) do update set
    total_jobs = excluded.total_jobs,
    on_time_count = excluded.on_time_count,
    average_completion_hours = excluded.average_completion_hours,
    callback_count = excluded.callback_count,
    average_satisfaction_rating = excluded.average_satisfaction_rating,
    last_updated = now();
end;
$$ language plpgsql security definer;

-- Trigger scorecard update on work order completion
create or replace function trigger_update_scorecard()
returns trigger as $$
begin
  if NEW.status = 'completed' and NEW.vendor_id is not null then
    perform update_vendor_scorecard(NEW.vendor_id);
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_scorecard_on_completion
  after update of status on work_orders
  for each row when (NEW.status = 'completed' and OLD.status != 'completed')
  execute function trigger_update_scorecard();

-- Seed seasonal templates
insert into seasonal_checklist_templates (season, title, description, category, applicable_asset_categories, estimated_cost) values
  ('spring', 'Exterior pressure washing', 'Full exterior pressure wash to remove winter grime and pollen', 'exterior', null, 350),
  ('spring', 'HVAC cooling season startup', 'Switch to cooling mode, replace filter, test operation', 'hvac', ARRAY['hvac'], 150),
  ('spring', 'Irrigation system startup and inspection', 'Turn on irrigation, inspect heads, check for leaks', 'landscaping', ARRAY['landscaping'], 200),
  ('spring', 'Window cleaning (interior and exterior)', 'Professional window cleaning all windows', 'exterior', null, 300),
  ('spring', 'Pest inspection and treatment', 'Spring pest inspection and barrier treatment', 'exterior', null, 180),
  ('spring', 'Deck and patio inspection and cleaning', 'Inspect for damage, clean, apply sealant if needed', 'exterior', null, 250),
  ('summer', 'Pool chemical balance and equipment check', 'Balance chemicals, inspect pump, filter, and heater', 'pool', ARRAY['pool'], 200),
  ('summer', 'Attic ventilation check', 'Inspect attic ventilation, ensure proper airflow for cooling efficiency', 'hvac', ARRAY['hvac'], 150),
  ('summer', 'Exterior pest barrier treatment', 'Summer pest control application', 'exterior', null, 150),
  ('summer', 'Storm drain and gutter check', 'Ensure gutters and downspouts are clear before storm season', 'roofing', null, 200),
  ('fall', 'Gutter cleaning and downspout flush', 'Remove leaves and debris, flush downspouts', 'roofing', null, 225),
  ('fall', 'HVAC heating season startup', 'Switch to heating mode, replace filter, test heat strips', 'hvac', ARRAY['hvac'], 150),
  ('fall', 'Irrigation system winterization', 'Blow out irrigation lines to prevent freeze damage', 'landscaping', ARRAY['landscaping'], 175),
  ('fall', 'Chimney and fireplace inspection', 'Annual chimney sweep and safety inspection', 'other', null, 300),
  ('fall', 'Weatherstripping and door seal inspection', 'Check all exterior door seals, replace worn weatherstripping', 'exterior', null, 150),
  ('fall', 'Smoke and CO detector battery replacement', 'Replace all detector batteries, test functionality', 'security', ARRAY['security'], 75),
  ('winter', 'Pipe insulation check', 'Inspect crawl space and attic pipes, add insulation where needed', 'plumbing', ARRAY['plumbing'], 200),
  ('winter', 'Water heater flush and inspection', 'Flush sediment, check anode rod, inspect connections', 'plumbing', null, 175),
  ('winter', 'Roof inspection for storm damage', 'Post-storm roof inspection, check flashing and shingles', 'roofing', ARRAY['roofing'], 250),
  ('winter', 'HVAC efficiency check and filter change', 'Mid-season filter change, check heating efficiency', 'hvac', ARRAY['hvac'], 150),
  ('winter', 'Security system test', 'Full system test, check all sensors and cameras', 'security', ARRAY['security'], 100);
