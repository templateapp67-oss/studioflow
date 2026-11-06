-- StudioFlow production security hardening.
-- Scope: tighten public salon/staff/service visibility and remove anonymous
-- execution from owner-only Arch & Flutter provisioning/demo routines.
-- No rows are deleted or rewritten by this migration.

begin;

-- These routines are intended for signed-in owners only. af_create_site checks
-- auth.uid(); af_seed_demo and af_reset_demo_offers enforce ownership internally.
revoke execute on function public.af_create_site(text, text) from public, anon;
grant execute on function public.af_create_site(text, text) to authenticated;

revoke execute on function public.af_seed_demo(uuid) from public, anon;
grant execute on function public.af_seed_demo(uuid) to authenticated;

revoke execute on function public.af_reset_demo_offers(uuid) from public, anon;
grant execute on function public.af_reset_demo_offers(uuid) to authenticated;

-- This RPC only answers an admin-status question, but it is not needed by
-- anonymous visitors. Signed-in admin UI retains access.
revoke execute on function public.get_my_admin_access() from public, anon;
grant execute on function public.get_my_admin_access() to authenticated;

-- This is a trigger function, not an RPC. Trigger execution does not require
-- callers to hold direct EXECUTE permission after the trigger is installed.
revoke execute on function public.sync_owner_template_catalogue() from public, anon, authenticated;

-- Replace broad legacy public-read policies with the current explicit
-- publication/visibility contract. Owner policies remain in place and continue
-- to grant owners access to their own records.
drop policy if exists staff_public_read on public.staff;
drop policy if exists public_live_site_staff_read on public.staff;
create policy staff_public_read on public.staff
  for select to anon, authenticated
  using (
    is_active is true
    and is_public is true
    and exists (
      select 1
      from public.salons salon
      where salon.id = staff.salon_id
        and salon.is_active is true
        and salon.deleted_at is null
    )
  );

drop policy if exists salons_public_read on public.salons;
drop policy if exists public_live_site_salons_read on public.salons;
create policy salons_public_read on public.salons
  for select to anon, authenticated
  using (is_active is true and deleted_at is null);

drop policy if exists services_public_read on public.services;
drop policy if exists public_live_site_services_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated
  using (
    is_active is true
    and coalesce(is_bookable_online, true) is true
    and exists (
      select 1
      from public.salons salon
      where salon.id = services.salon_id
        and salon.is_active is true
        and salon.deleted_at is null
    )
  );

commit;
