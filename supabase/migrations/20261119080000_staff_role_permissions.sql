-- Role-level permissions: one server-side source of truth for staff roles.
--
-- Why this migration exists
-- -------------------------
-- `Stylist.accessRole` lived only inside `studioflow_accounts.draft` (jsonb),
-- so it was a label with no enforcement: any client could ignore it, old
-- records had no role at all (20 of 26 live staff rows), and a role could not
-- be corrected after creation. Branch staff did have real enforcement, but
-- only through the coarse `studioflow_branch_staff_members.role`
-- ('staff' | 'manager') column, with no validation and no mapping back to the
-- three app access roles the product shows to owners.
--
-- This migration makes the database agree with `src/lib/staffPermissions.ts`:
--   * `studioflow_normalize_staff_access_role(text)` — canonical role or a
--     safe least-privilege fallback (never escalates).
--   * `studioflow_staff_role_permissions(role)` — the permission matrix.
--   * `studioflow_staff_has_permission(role, permission)` — boolean check.
--   * `studioflow_my_branch_role(site_id)` — the caller's own branch role.
--   * A CHECK constraint pinning branch roles to the known values.
--
-- Nothing here widens existing access: the functions are read-only helpers,
-- RLS policies are unchanged, and unknown roles always resolve to the
-- least-privileged role.

-- Canonical app access roles, kept in privilege order.
create or replace function public.studioflow_normalize_staff_access_role(p_role text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(trim(coalesce(p_role, '')))
    when 'manager (full access)' then 'Manager (Full Access)'
    when 'manager' then 'Manager (Full Access)'
    when 'branch manager' then 'Manager (Full Access)'
    when 'owner' then 'Manager (Full Access)'
    when 'receptionist (frontdesk)' then 'Receptionist (Frontdesk)'
    when 'receptionist' then 'Receptionist (Frontdesk)'
    when 'frontdesk' then 'Receptionist (Frontdesk)'
    when 'service provider (assigned)' then 'Service Provider (Assigned)'
    when 'service provider' then 'Service Provider (Assigned)'
    when 'stylist' then 'Service Provider (Assigned)'
    when 'staff' then 'Service Provider (Assigned)'
    when 'branch staff' then 'Service Provider (Assigned)'
    else 'Service Provider (Assigned)'
  end;
$$;

-- Permission matrix. Mirrors ROLE_PERMISSIONS in src/lib/staffPermissions.ts.
create or replace function public.studioflow_staff_role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select public.studioflow_normalize_staff_access_role(p_role) as role
  )
  select case normalized.role
    when 'Manager (Full Access)' then array[
      'view_own_bookings','complete_own_bookings','view_own_earnings',
      'book_for_all_staff','process_pos_payments','manage_checkins',
      'view_client_contacts','manage_crm','view_reports','view_revenue',
      'manage_team','manage_services_pricing','manage_settings',
      'publish_website','manage_marketing','manage_loyalty',
      'manage_branches','manage_inventory'
    ]
    when 'Receptionist (Frontdesk)' then array[
      'view_own_bookings','complete_own_bookings','view_own_earnings',
      'book_for_all_staff','process_pos_payments','manage_checkins',
      'view_client_contacts'
    ]
    else array['view_own_bookings','complete_own_bookings','view_own_earnings']
  end
  from normalized;
$$;

-- Boolean permission check; unknown roles and unknown permissions are false
-- for anything above the least-privileged set.
create or replace function public.studioflow_staff_has_permission(p_role text, p_permission text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(trim(p_permission), '') <> ''
    and trim(p_permission) = any (public.studioflow_staff_role_permissions(p_role));
$$;

-- The caller's own active branch role for one salon site. Returns null when
-- the caller is not an active member of that site (never the owner's role).
create or replace function public.studioflow_my_branch_role(p_site_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.studioflow_branch_staff_members m
  where m.site_id = p_site_id
    and m.user_id = (select auth.uid())
    and m.is_active
  limit 1;
$$;

revoke all on function public.studioflow_my_branch_role(uuid) from public, anon;
grant execute on function public.studioflow_my_branch_role(uuid) to authenticated, service_role;
grant execute on function public.studioflow_normalize_staff_access_role(text) to anon, authenticated, service_role;
grant execute on function public.studioflow_staff_role_permissions(text) to anon, authenticated, service_role;
grant execute on function public.studioflow_staff_has_permission(text, text) to anon, authenticated, service_role;

-- Pin branch roles to the values the app and its policies understand, and
-- normalize any legacy branch role so enforcement never meets an unknown
-- value. Unknown values degrade to the safest role ('manager' only for the
-- values that explicitly meant a manager). Everything is guarded so this
-- migration also applies cleanly where the branch table is not created yet.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'studioflow_branch_staff_members'
  ) then
    update public.studioflow_branch_staff_members
    set role = 'manager'
    where lower(trim(role)) in ('owner', 'branch manager');

    update public.studioflow_branch_staff_members
    set role = 'staff'
    where lower(trim(role)) not in ('manager', 'staff');

    if not exists (
      select 1 from pg_constraint
      where conname = 'studioflow_branch_staff_members_role_check'
    ) then
      alter table public.studioflow_branch_staff_members
        add constraint studioflow_branch_staff_members_role_check
        check (role in ('staff', 'manager'));
    end if;
  end if;
end $$;

comment on function public.studioflow_normalize_staff_access_role(text) is
  'Canonical staff App Access Role; unknown or missing values fall back to the least-privileged role.';
comment on function public.studioflow_staff_role_permissions(text) is
  'Permission matrix for a staff App Access Role. Mirrors src/lib/staffPermissions.ts.';
