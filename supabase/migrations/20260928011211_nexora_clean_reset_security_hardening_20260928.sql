-- Least-privilege grants and tenant policies for the clean baseline.
begin;

alter function public.set_updated_at() set search_path = pg_catalog, public, pg_temp;
alter function public.handle_new_user() set search_path = pg_catalog, public, pg_temp;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.seed_demo_data(uuid, text, text) from public, anon, authenticated;
revoke all on function public.nexora_owner_salon_ids() from public, anon, authenticated;

drop policy if exists organization_members_self_select on public.organization_members;
create policy organization_members_self_select on public.organization_members
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select on public.organizations
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = organizations.id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  ));

drop policy if exists salons_member_select on public.salons;
create policy salons_member_select on public.salons
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = salons.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  ));

grant select on public.organizations, public.organization_members, public.salons to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.organizations, public.organization_members, public.salons from authenticated;
commit;
