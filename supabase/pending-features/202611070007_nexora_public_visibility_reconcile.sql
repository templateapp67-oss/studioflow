-- Reconcile the public visibility policies on existing StudioFlow tables.
-- This is NOT the complete admin database migration. Review and test on a
-- representative staging database before deployment. No data is rewritten.
--
-- Policies are permissive by default and combine with OR: both historical
-- public policy names must be removed before installing the restricted policy.
-- Owner/editor/member policies and existing grants are deliberately unchanged.
-- Row filtering does not protect private columns: public column projection and
-- guest booking require separate, reviewed compatibility work.
begin;

alter table public.salons enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;

drop policy if exists public_live_site_salons_read on public.salons;
drop policy if exists salons_public_read on public.salons;
create policy salons_public_read on public.salons for select to anon, authenticated
  using (is_active is true and deleted_at is null);

drop policy if exists public_live_site_services_read on public.services;
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services for select to anon, authenticated
  using (
    is_active is true
    and coalesce(is_bookable_online, true) is true
    and exists (select 1 from public.salons s
                where s.id = services.salon_id and s.is_active is true and s.deleted_at is null)
  );

drop policy if exists public_live_site_staff_read on public.staff;
drop policy if exists staff_public_read on public.staff;
create policy staff_public_read on public.staff for select to anon, authenticated
  using (
    is_active is true and is_public is true and deleted_at is null
    and exists (select 1 from public.salons s
                where s.id = staff.salon_id and s.is_active is true and s.deleted_at is null)
  );

commit;
