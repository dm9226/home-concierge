-- Enable RLS on all tables
alter table users enable row level security;
alter table properties enable row level security;
alter table property_onboarding enable row level security;
alter table assets enable row level security;
alter table vendors enable row level security;
alter table vendor_scorecards enable row level security;
alter table work_orders enable row level security;
alter table work_order_photos enable row level security;
alter table emergency_status_updates enable row level security;
alter table maintenance_schedules enable row level security;
alter table seasonal_checklist_templates enable row level security;
alter table projects enable row level security;
alter table project_tasks enable row level security;
alter table project_photos enable row level security;
alter table invoices enable row level security;
alter table activity_logs enable row level security;
alter table messages enable row level security;
alter table referrals enable row level security;
alter table notifications enable row level security;

-- Helper functions
create or replace function get_user_role()
returns user_role as $$
  select role from users where id = auth.uid()
$$ language sql security definer stable;

create or replace function is_staff()
returns boolean as $$
  select coalesce((select role in ('admin', 'concierge') from users where id = auth.uid()), false)
$$ language sql security definer stable;

create or replace function is_admin()
returns boolean as $$
  select coalesce((select role = 'admin' from users where id = auth.uid()), false)
$$ language sql security definer stable;

create or replace function can_access_property(p_id uuid)
returns boolean as $$
  select exists (
    select 1 from properties p
    join users u on u.id = auth.uid()
    where p.id = p_id
    and (
      u.role = 'admin'
      or (u.role = 'concierge' and p.primary_concierge_id = auth.uid())
      or (u.role = 'client' and p.client_id = auth.uid())
    )
  )
$$ language sql security definer stable;

-- USERS policies
create policy "users_read_self_or_staff"
  on users for select
  using (id = auth.uid() or is_staff());

create policy "users_insert_admin"
  on users for insert
  with check (is_admin());

create policy "users_update_self"
  on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admin_manage_users"
  on users for all
  using (is_admin());

-- PROPERTIES policies
create policy "properties_read_accessible"
  on properties for select
  using (can_access_property(id));

create policy "properties_insert_staff"
  on properties for insert
  with check (is_staff());

create policy "properties_update_staff"
  on properties for update
  using (is_admin() or (is_staff() and primary_concierge_id = auth.uid()));

create policy "properties_delete_admin"
  on properties for delete
  using (is_admin());

-- PROPERTY_ONBOARDING policies
create policy "onboarding_read_accessible"
  on property_onboarding for select
  using (can_access_property(property_id));

create policy "onboarding_write_staff"
  on property_onboarding for insert
  with check (is_staff());

create policy "onboarding_update_staff"
  on property_onboarding for update
  using (is_staff());

-- ASSETS policies
create policy "assets_read_accessible"
  on assets for select
  using (can_access_property(property_id));

create policy "assets_write_staff"
  on assets for insert
  with check (is_staff());

create policy "assets_update_staff"
  on assets for update
  using (is_staff());

create policy "assets_delete_admin"
  on assets for delete
  using (is_admin());

-- VENDORS policies (staff read-only for concierge, full for admin)
create policy "vendors_read_staff"
  on vendors for select
  using (is_staff());

create policy "vendors_write_admin"
  on vendors for all
  using (is_admin());

-- VENDOR_SCORECARDS policies
create policy "scorecards_read_staff"
  on vendor_scorecards for select
  using (is_staff());

create policy "scorecards_write_admin"
  on vendor_scorecards for all
  using (is_admin());

-- WORK_ORDERS policies
create policy "work_orders_read_accessible"
  on work_orders for select
  using (can_access_property(property_id));

create policy "work_orders_insert_any_accessible"
  on work_orders for insert
  with check (can_access_property(property_id));

create policy "work_orders_update_staff"
  on work_orders for update
  using (is_staff() and can_access_property(property_id));

create policy "work_orders_delete_admin"
  on work_orders for delete
  using (is_admin());

-- WORK_ORDER_PHOTOS policies
create policy "wo_photos_read_accessible"
  on work_order_photos for select
  using (
    exists (
      select 1 from work_orders wo
      where wo.id = work_order_id
      and can_access_property(wo.property_id)
    )
  );

create policy "wo_photos_write_staff"
  on work_order_photos for insert
  with check (
    exists (
      select 1 from work_orders wo
      where wo.id = work_order_id
      and is_staff()
    )
  );

-- EMERGENCY_STATUS_UPDATES policies
create policy "emergency_updates_read_accessible"
  on emergency_status_updates for select
  using (
    exists (
      select 1 from work_orders wo
      where wo.id = work_order_id
      and can_access_property(wo.property_id)
    )
  );

create policy "emergency_updates_write_staff"
  on emergency_status_updates for insert
  with check (is_staff());

-- MAINTENANCE_SCHEDULES policies
create policy "maintenance_read_accessible"
  on maintenance_schedules for select
  using (can_access_property(property_id));

create policy "maintenance_write_staff"
  on maintenance_schedules for insert
  with check (is_staff());

create policy "maintenance_update_staff"
  on maintenance_schedules for update
  using (is_staff() and can_access_property(property_id));

create policy "maintenance_delete_admin"
  on maintenance_schedules for delete
  using (is_admin());

-- SEASONAL_CHECKLIST_TEMPLATES policies (everyone can read)
create policy "checklist_templates_read_all"
  on seasonal_checklist_templates for select
  using (auth.uid() is not null);

create policy "checklist_templates_write_admin"
  on seasonal_checklist_templates for all
  using (is_admin());

-- PROJECTS policies
create policy "projects_read_accessible"
  on projects for select
  using (can_access_property(property_id));

create policy "projects_write_staff"
  on projects for insert
  with check (is_staff());

create policy "projects_update_staff"
  on projects for update
  using (is_staff() and can_access_property(property_id));

create policy "projects_delete_admin"
  on projects for delete
  using (is_admin());

-- PROJECT_TASKS policies
create policy "project_tasks_read_accessible"
  on project_tasks for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_id
      and can_access_property(p.property_id)
    )
  );

create policy "project_tasks_write_staff"
  on project_tasks for all
  using (is_staff());

-- PROJECT_PHOTOS policies
create policy "project_photos_read_accessible"
  on project_photos for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_id
      and can_access_property(p.property_id)
    )
  );

create policy "project_photos_write_staff"
  on project_photos for insert
  with check (is_staff());

-- INVOICES policies (clients see their own, no cost breakdown beyond total)
create policy "invoices_read_client"
  on invoices for select
  using (
    client_id = auth.uid()
    or is_staff()
  );

create policy "invoices_write_staff"
  on invoices for insert
  with check (is_staff());

create policy "invoices_update_staff"
  on invoices for update
  using (is_staff());

create policy "invoices_delete_admin"
  on invoices for delete
  using (is_admin());

-- ACTIVITY_LOGS policies
create policy "activity_read_accessible"
  on activity_logs for select
  using (can_access_property(property_id));

create policy "activity_write_any_accessible"
  on activity_logs for insert
  with check (can_access_property(property_id) and user_id = auth.uid());

-- MESSAGES policies
create policy "messages_read_participant"
  on messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "messages_insert_participant"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and can_access_property(property_id)
  );

create policy "messages_update_recipient"
  on messages for update
  using (recipient_id = auth.uid());

-- REFERRALS policies
create policy "referrals_read_own_or_admin"
  on referrals for select
  using (referring_client_id = auth.uid() or is_admin());

create policy "referrals_insert_client"
  on referrals for insert
  with check (referring_client_id = auth.uid());

create policy "referrals_update_admin"
  on referrals for update
  using (is_admin());

-- NOTIFICATIONS policies
create policy "notifications_read_own"
  on notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on notifications for update
  using (user_id = auth.uid());

create policy "notifications_insert_service"
  on notifications for insert
  with check (true); -- controlled via service role key in API routes
