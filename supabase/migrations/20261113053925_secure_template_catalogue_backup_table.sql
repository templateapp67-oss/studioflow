
begin;
alter table public.studioflow_templates_backup_20261106 enable row level security;
revoke all on table public.studioflow_templates_backup_20261106 from public, anon, authenticated;
grant all on table public.studioflow_templates_backup_20261106 to service_role;
drop policy if exists studioflow_templates_backup_service_role_only
  on public.studioflow_templates_backup_20261106;
create policy studioflow_templates_backup_service_role_only
  on public.studioflow_templates_backup_20261106
  for all to service_role
  using (true)
  with check (true);
commit;
