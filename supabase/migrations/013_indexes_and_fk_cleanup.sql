-- Performance indexes for frequently filtered columns
create index if not exists idx_property_owners_user_id      on property_owners(user_id);
create index if not exists idx_property_owners_property_id  on property_owners(property_id);
create index if not exists idx_work_orders_assigned_to      on work_orders(assigned_to);
create index if not exists idx_work_orders_requested_by     on work_orders(requested_by);
create index if not exists idx_work_orders_property_id      on work_orders(property_id);
create index if not exists idx_work_orders_status           on work_orders(status);
create index if not exists idx_maintenance_schedules_prop   on maintenance_schedules(property_id);
create index if not exists idx_maintenance_schedules_vendor on maintenance_schedules(vendor_id);
create index if not exists idx_messages_sender_id           on messages(sender_id);
create index if not exists idx_messages_property_id         on messages(property_id);
create index if not exists idx_invoices_property_id         on invoices(property_id);
create index if not exists idx_assets_property_id           on assets(property_id);

-- Add ON DELETE SET NULL to work_orders FKs that currently have no action
-- (defaults to RESTRICT, which blocks asset/vendor deletion)
alter table work_orders
  drop constraint if exists work_orders_asset_id_fkey,
  drop constraint if exists work_orders_vendor_id_fkey;

alter table work_orders
  add constraint work_orders_asset_id_fkey
    foreign key (asset_id) references assets(id) on delete set null,
  add constraint work_orders_vendor_id_fkey
    foreign key (vendor_id) references vendors(id) on delete set null;

-- Same for maintenance_schedules
alter table maintenance_schedules
  drop constraint if exists maintenance_schedules_asset_id_fkey,
  drop constraint if exists maintenance_schedules_vendor_id_fkey;

alter table maintenance_schedules
  add constraint maintenance_schedules_asset_id_fkey
    foreign key (asset_id) references assets(id) on delete set null,
  add constraint maintenance_schedules_vendor_id_fkey
    foreign key (vendor_id) references vendors(id) on delete set null;
