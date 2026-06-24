-- Allow vendor deletion when referenced by project tasks.
-- project_tasks.vendor_id defaulted to RESTRICT, which blocked vendor deletes.
-- Match the ON DELETE SET NULL behavior already on work_orders and maintenance_schedules.
alter table project_tasks
  drop constraint if exists project_tasks_vendor_id_fkey;

alter table project_tasks
  add constraint project_tasks_vendor_id_fkey
    foreign key (vendor_id) references vendors(id) on delete set null;
