-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums
create type user_role as enum ('admin', 'concierge', 'client');
create type property_status as enum ('active', 'paused', 'cancelled');
create type property_type_enum as enum ('single_family', 'townhome', 'condo');
create type onboarding_status as enum ('not_started', 'in_progress', 'complete');
create type asset_category as enum ('hvac', 'plumbing', 'electrical', 'appliance', 'roofing', 'exterior', 'pool', 'landscaping', 'smart_home', 'security', 'other');
create type asset_status_enum as enum ('active', 'replaced', 'needs_attention');
create type vendor_status_enum as enum ('preferred', 'approved', 'probationary', 'blacklisted');
create type work_order_priority as enum ('emergency', 'high', 'normal', 'low');
create type work_order_status as enum ('submitted', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled');
create type photo_phase as enum ('before', 'during', 'after');
create type emergency_status as enum ('notified', 'responding', 'vendor_dispatched', 'on_site', 'resolved');
create type maintenance_frequency as enum ('monthly', 'quarterly', 'semi_annual', 'annual', 'custom');
create type season_type as enum ('spring', 'summer', 'fall', 'winter');
create type project_status_enum as enum ('planning', 'in_progress', 'on_hold', 'completed');
create type task_status_enum as enum ('pending', 'in_progress', 'completed');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');
create type referral_status as enum ('sent', 'consultation_scheduled', 'signed', 'expired');

-- Users table (mirrors auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  phone text,
  role user_role not null default 'client',
  avatar_url text,
  notification_preferences jsonb default '{"sms": true, "push": true, "email": true}'::jsonb,
  created_at timestamptz default now()
);

-- Properties
create table properties (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references users(id) on delete restrict,
  address text not null,
  city text not null,
  state text not null default 'GA',
  zip text not null,
  year_built integer,
  square_footage integer,
  lot_size text,
  property_type property_type_enum not null default 'single_family',
  notes text,
  primary_concierge_id uuid references users(id),
  monthly_retainer_amount numeric(10,2) not null default 1500.00,
  contract_start_date date,
  status property_status not null default 'active',
  cover_photo_url text,
  health_score integer not null default 100 check (health_score between 0 and 100),
  onboarding_status onboarding_status not null default 'not_started',
  created_at timestamptz default now()
);

-- Property onboarding
create table property_onboarding (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid unique not null references properties(id) on delete cascade,
  utility_providers jsonb,
  hoa_name text,
  hoa_contact_phone text,
  hoa_contact_email text,
  hoa_docs_url text,
  alarm_company text,
  alarm_code text,
  gate_code text,
  spare_key_location text,
  wifi_network text,
  wifi_password text,
  pet_info jsonb,
  emergency_contacts jsonb,
  scheduling_preferences text,
  special_instructions text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Home inventory / assets
create table assets (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  category asset_category not null,
  name text not null,
  brand text,
  model text,
  serial_number text,
  install_date date,
  warranty_expiration date,
  expected_lifespan_years integer,
  location_in_home text,
  notes text,
  manual_url text,
  photo_urls text[],
  status asset_status_enum not null default 'active',
  last_serviced_date date,
  created_at timestamptz default now()
);

-- Vendors
create table vendors (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text,
  phone text,
  email text,
  specialty_categories text[],
  license_number text,
  insurance_expiration date,
  rating integer check (rating between 1 and 5),
  notes text,
  status vendor_status_enum not null default 'approved',
  created_at timestamptz default now()
);

-- Vendor scorecards
create table vendor_scorecards (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid unique not null references vendors(id) on delete cascade,
  total_jobs integer not null default 0,
  on_time_count integer not null default 0,
  average_completion_hours numeric(5,1),
  callback_count integer not null default 0,
  average_satisfaction_rating numeric(3,2),
  last_updated timestamptz default now()
);

-- Work orders
create table work_orders (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  asset_id uuid references assets(id),
  vendor_id uuid references vendors(id),
  requested_by uuid not null references users(id),
  assigned_to uuid references users(id),
  title text not null,
  description text,
  category text not null,
  priority work_order_priority not null default 'normal',
  status work_order_status not null default 'submitted',
  is_emergency boolean not null default false,
  scheduled_date timestamptz,
  completed_date timestamptz,
  cost_estimate numeric(10,2),
  actual_cost numeric(10,2),
  markup_percentage numeric(5,2) not null default 20.00,
  client_cost numeric(10,2),
  vendor_arrived_on_time boolean,
  client_satisfaction integer check (client_satisfaction between 1 and 5),
  callback_required boolean not null default false,
  notes text,
  created_at timestamptz default now()
);

-- Work order photos
create table work_order_photos (
  id uuid primary key default uuid_generate_v4(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  url text not null,
  phase photo_phase not null,
  caption text,
  uploaded_at timestamptz default now()
);

-- Emergency status updates
create table emergency_status_updates (
  id uuid primary key default uuid_generate_v4(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  status emergency_status not null,
  message text,
  created_at timestamptz default now()
);

-- Maintenance schedules
create table maintenance_schedules (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  asset_id uuid references assets(id),
  title text not null,
  description text,
  category text not null,
  frequency maintenance_frequency not null,
  custom_interval_days integer,
  season season_type,
  last_completed date,
  next_due date,
  vendor_id uuid references vendors(id),
  estimated_cost numeric(10,2),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz default now()
);

-- Seasonal checklist templates
create table seasonal_checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  season season_type not null,
  title text not null,
  description text,
  category text not null,
  applicable_asset_categories text[],
  default_vendor_category text,
  estimated_cost numeric(10,2),
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  title text not null,
  description text,
  status project_status_enum not null default 'planning',
  start_date date,
  target_completion_date date,
  actual_completion_date date,
  budget numeric(10,2),
  actual_spend numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now()
);

-- Project tasks
create table project_tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status_enum not null default 'pending',
  vendor_id uuid references vendors(id),
  cost numeric(10,2),
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Project photos
create table project_photos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  url text not null,
  caption text,
  phase text,
  uploaded_at timestamptz default now()
);

-- Invoices
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  client_id uuid not null references users(id),
  invoice_number text unique not null,
  period_start date not null,
  period_end date not null,
  retainer_amount numeric(10,2) not null,
  additional_charges jsonb,
  total numeric(10,2) not null,
  status invoice_status not null default 'draft',
  due_date date not null,
  paid_date date,
  notes text,
  created_at timestamptz default now()
);

-- Activity logs
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references users(id),
  action_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  sender_id uuid not null references users(id),
  recipient_id uuid not null references users(id),
  subject text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

-- Referrals
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referring_client_id uuid not null references users(id),
  referral_code text unique not null,
  referred_name text not null,
  referred_email text not null,
  referred_phone text,
  status referral_status not null default 'sent',
  credit_amount numeric(10,2),
  created_at timestamptz default now(),
  converted_at timestamptz
);

-- Notifications
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  is_read boolean not null default false,
  link text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_properties_client_id on properties(client_id);
create index idx_properties_status on properties(status);
create index idx_properties_concierge on properties(primary_concierge_id);
create index idx_assets_property_id on assets(property_id);
create index idx_assets_category on assets(property_id, category);
create index idx_work_orders_property_id on work_orders(property_id);
create index idx_work_orders_status on work_orders(status);
create index idx_work_orders_vendor_id on work_orders(vendor_id);
create index idx_work_orders_created_at on work_orders(created_at desc);
create index idx_maintenance_schedules_property_id on maintenance_schedules(property_id);
create index idx_maintenance_schedules_next_due on maintenance_schedules(next_due);
create index idx_maintenance_schedules_season on maintenance_schedules(season);
create index idx_activity_logs_property_id on activity_logs(property_id);
create index idx_activity_logs_created_at on activity_logs(created_at desc);
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_is_read on notifications(user_id, is_read);
create index idx_messages_property_id on messages(property_id);
create index idx_messages_recipient on messages(recipient_id, is_read);
create index idx_invoices_client on invoices(client_id, status);
create index idx_invoices_property on invoices(property_id);

-- Auto-create public.users row when someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
