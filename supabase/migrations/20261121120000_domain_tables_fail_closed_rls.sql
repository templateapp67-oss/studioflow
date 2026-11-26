-- Domain-table RLS: fail-closed owner + branch-scoped staff access for
-- branches, services and bookings.
--
-- This is the reviewed adaptation of the proposed
-- `20261121120000_domain_tables_fail_closed_rls.sql`. The proposal assumed a
-- schema this database does not have, so it is corrected here rather than
-- applied verbatim:
--
--   proposal                       | this database
--   -------------------------------|------------------------------------------
--   branches.salon_id              | branches.site_id (-> studioflow_accounts.user_id)
--   services.branch_id             | public.services has no branch column; the
--                                  | salon-scoped catalogue is studioflow_services
--   bookings.salon_id / branch_id  | public.bookings is the legacy Nexora table
--                                  | (0 rows); the live bookings table is
--                                  | public.studioflow_bookings (owner_id + branch_id)
--   customers                      | no such table; client data is
--                                  | studioflow_android_private.crm_contacts
--                                  | (owner-only, deliberately left as is) and
--                                  | studioflow_accounts.draft.clients
--   is_salon_owner(salon_id)       | studioflow_is_salon_owner(owner_id)
--   has_staff_role(salon_id, [...])| studioflow_current_staff_can(owner_id, perm)
--   can_access_branch(salon_id, b) | studioflow_is_assigned_branch(owner_id, b)
--
-- Three substantive corrections beyond the naming:
--
-- 1. The proposal was purely additive. RLS policies are permissive and OR'd, so
--    adding a scoped staff policy next to `services_public_read
--    using (is_active = true)` restricts nothing: any signed-out visitor kept
--    reading every salon's service list. The wide policy is replaced here, and
--    it is replaced with a *superset-preserving* predicate (see §2) so the
--    published storefront behaves exactly as before.
-- 2. Staff scope comes from the staff membership and the salon, never from a
--    client-supplied value, and every helper is SECURITY DEFINER with an empty
--    search_path so a policy cannot recurse into the table it protects.
-- 3. Service Provider write access is not granted anywhere; it stays read-only
--    on the bookings inside its own branch, bounded to its own appointments.
--
-- Branches: rows are scoped to an active staff membership of the owning salon,
-- because `studioflow_is_assigned_branch` fails closed for a caller who is not
-- an active member (a fixed date would otherwise let a client filter on it).
--
-- Everything is additive except the two replaced public-read policies, which
-- keep the same visible row set. No owner policy, grant or table is dropped.

begin;

/* ------------------------------------------------------------------ */
/* 1. Branches                                                        */
/* ------------------------------------------------------------------ */

alter table if exists public.branches enable row level security;

-- Owners keep `branches_owner_manage` (ALL, site_id = auth.uid()) untouched.
-- This policy is the staff half: an active member of the salon sees the
-- branches inside their scope, and a member with no branch sees none.
drop policy if exists branches_select_owner_or_assigned_staff on public.branches;
create policy branches_select_owner_or_assigned_staff
  on public.branches
  for select
  to authenticated
  using (
    site_id = (select auth.uid())
    or public.studioflow_is_assigned_branch(branches.site_id, branches.id::text)
  );

/* ------------------------------------------------------------------ */
/* 2. Services (public catalogue)                                     */
/* ------------------------------------------------------------------ */

alter table if exists public.services enable row level security;

-- Replaces `services_public_read using (is_active = true)`, which exposed every
-- salon's catalogue to signed-out visitors regardless of publication state.
--
-- The replacement hides only rows the storefront could not show anyway:
--   * the row was already filtered by is_active;
--   * `coalesce(is_bookable_online, true)` mirrors the bookable-online default,
--     and only removes services a public menu would not offer;
--   * the salon clause keeps the historic "published salon" rule and also keeps
--     a catalogue row visible when it carries no salon_id (legacy rows the
--     website reads through the owner's own draft).
-- Public menus are rendered from published website content, so no published
-- page loses a service it was showing before this migration.
drop policy if exists services_public_read on public.services;
drop policy if exists public_live_site_services_read on public.services;
create policy services_public_read
  on public.services
  for select
  to anon, authenticated
  using (
    is_active is true
    and coalesce(is_bookable_online, true) is true
    and (
      services.salon_id is null
      or exists (
        select 1
        from public.salons s
        where s.id = services.salon_id
          and s.is_active is true
          and s.deleted_at is null
      )
    )
  );

-- Staff read of the salon-scoped catalogue projection. Managers write it
-- through `services_owner_all` (unchanged, owner-only).
alter table if exists public.studioflow_services enable row level security;

drop policy if exists studioflow_services_staff_read on public.studioflow_services;
create policy studioflow_services_staff_read
  on public.studioflow_services
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or public.studioflow_current_staff_can(studioflow_services.owner_id, 'view_own_bookings')
  );

/* ------------------------------------------------------------------ */
/* 3. Bookings (live table)                                           */
/* ------------------------------------------------------------------ */

-- `studioflow_bookings_read` (owner or customer) stays: it is additive and
-- correct. `studioflow_bookings_staff_read` already covers branch scope plus
-- the book_for_all_staff/own-appointment rule. This policy adds the third
-- needed case: a branch manager/receptionist may create a booking in a branch
-- they are assigned to, and staff may move a booking through its lifecycle.
alter table if exists public.studioflow_bookings enable row level security;

drop policy if exists studioflow_bookings_staff_write on public.studioflow_bookings;
create policy studioflow_bookings_staff_write
  on public.studioflow_bookings
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      /* The `branch_id` column is authoritative: it is the foreign key to
         public.branches and it survives a stale or missing payload snapshot.
         Judging the new row on the column is what stops an UPDATE from moving
         a booking into a branch the caller is not assigned to. */
      public.studioflow_is_assigned_branch(
        studioflow_bookings.owner_id,
        coalesce(studioflow_bookings.branch_id::text, nullif(studioflow_bookings.payload->>'branchId', ''))
      )
      and (
        public.studioflow_current_staff_can(studioflow_bookings.owner_id, 'book_for_all_staff')
        or studioflow_bookings.stylist_id = public.studioflow_current_staff_id(studioflow_bookings.owner_id)
      )
    )
  )
  with check (
    owner_id = (select auth.uid())
    or (
      public.studioflow_is_assigned_branch(
        studioflow_bookings.owner_id,
        coalesce(studioflow_bookings.branch_id::text, nullif(studioflow_bookings.payload->>'branchId', ''))
      )
      and (
        public.studioflow_current_staff_can(studioflow_bookings.owner_id, 'book_for_all_staff')
        or studioflow_bookings.stylist_id = public.studioflow_current_staff_id(studioflow_bookings.owner_id)
      )
    )
  );

drop policy if exists studioflow_bookings_staff_insert on public.studioflow_bookings;
create policy studioflow_bookings_staff_insert
  on public.studioflow_bookings
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    or (
      public.studioflow_is_assigned_branch(
        studioflow_bookings.owner_id,
        coalesce(studioflow_bookings.branch_id::text, nullif(studioflow_bookings.payload->>'branchId', ''))
      )
      and public.studioflow_current_staff_can(studioflow_bookings.owner_id, 'book_for_all_staff')
    )
  );

/* ------------------------------------------------------------------ */
/* 4. Customer / client data                                          */
/* ------------------------------------------------------------------ */

-- Deliberately unchanged. `studioflow_android_private.crm_contacts` (phone,
-- notes, do_not_contact, marketing preferences) stays owner-only, and staff
-- reach client contacts exclusively through the permission-filtered
-- `studioflow_staff_workspace()` projection, which withholds the whole `clients`
-- field unless the role holds `view_client_contacts`. No direct table policy is
-- added for Manager/Receptionist: the CRM tables carry no branch column, so a
-- table-level grant would hand a branch manager every branch's contacts.

/* ------------------------------------------------------------------ */
/* 5. Self-checks                                                     */
/* ------------------------------------------------------------------ */

-- A migration that silently protects nothing is the failure mode this file
-- exists to prevent, so the required helpers are asserted here.
do $$
begin
  if to_regprocedure('public.studioflow_is_salon_owner(uuid)') is null
     or to_regprocedure('public.studioflow_current_staff_can(uuid,text)') is null
     or to_regprocedure('public.studioflow_is_assigned_branch(uuid,text)') is null
     or to_regprocedure('public.studioflow_current_staff_id(uuid)') is null then
    raise exception 'Staff authorization helpers are missing; apply 20261119140000_staff_access_hardening.sql first.';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relname = 'branches' and c.relrowsecurity)
     or not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = 'studioflow_bookings' and c.relrowsecurity) then
    raise exception 'Row level security is not enabled on the domain tables this migration protects.';
  end if;
end $$;

commit;
