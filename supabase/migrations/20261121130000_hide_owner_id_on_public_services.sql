-- Hide `owner_id` (and every other private column) from anonymous readers of the
-- public service catalogue.
--
-- This is the reviewed adaptation of the proposed
-- `20261121130000_hide_owner_id_on_public_services.sql`. The goal is right — a
-- signed-out visitor must not be handed a salon's owner UUID — but the proposal
-- could not have worked:
--
--   proposal                               | this database
--   ---------------------------------------|-----------------------------------
--   view over public.studioflow_services   | that table has no `id`, `salon_id`,
--                                          | `branch_id`, `is_active` or
--                                          | `created_at` (its key is
--                                          | `(owner_id, service_id)`), and it is
--                                          | NOT the table anon can read
--   `revoke select on studioflow_services` | anon has no grant there at all; the
--                                          | anonymous-readable table is
--                                          | public.services (acl: anon=r)
--   `sal.is_published`                     | no such column (salons has
--                                          | is_active / is_listed / deleted_at /
--                                          | status)
--   drop policy "services_public_read"     | that policy is on public.services,
--     on studioflow_services                | not on studioflow_services
--
-- The fatal flaw is the combination itself: a view declared
-- `with (security_invoker = true)` runs with the CALLER's privileges, so once
-- `select` is revoked from `anon` on the base table the view returns
-- `permission denied for table services` for every anonymous read. Measured, not
-- assumed: see the reproduction in scripts/verify-service-column-privacy.mjs.
--
-- The correction below keeps row level security as the row filter (unchanged
-- from 20261121120000) and fixes the actual defect, which is a COLUMN privilege:
-- `anon` holds table-wide SELECT on public.services, so `select owner_id from
-- services` returns every salon's owner UUID.
--
-- Postgres has no column masking short of a view or an RPC, and a table-wide
-- grant overrides column grants — so the table-wide grant is revoked and
-- re-granted column by column, minus `owner_id`. Row visibility still goes
-- through `services_public_read`, so this is defence in depth rather than a
-- replacement for the row policy.
--
-- Consequence to be aware of: an anonymous client doing `select *` on
-- public.services now gets `permission denied for column owner_id` instead of a
-- row set. Nothing in this repository reads that table anonymously (the public
-- booking RPC `nexora_customer_booking_options` is SECURITY DEFINER and reads it
-- internally), so no in-repo flow changes. An out-of-repo client that selected
-- `*` anonymously must name its columns — which is the point of the change.

begin;

/* ------------------------------------------------------------------ */
/* 1. Anonymous reads: explicit columns only, never owner_id          */
/* ------------------------------------------------------------------ */

-- Known at review time from the live catalog. `owner_id` is the column being
-- withdrawn; every other public-facing column stays available so a storefront
-- can keep rendering its menu.
revoke select on table public.services from anon;

grant select (
  id,
  name,
  category,
  description,
  icon,
  price,
  duration_minutes,
  popular,
  show_duration,
  sort_order,
  created_at,
  updated_at,
  salon_id,
  price_paise,
  is_active,
  is_bookable_online,
  is_featured,
  display_order,
  image_url
) on table public.services to anon;

-- Row filter is unchanged and still applies on top of the column grants.
-- `services_public_read` (is_active + bookable + published salon) is kept.

/* ------------------------------------------------------------------ */
/* 2. Signed-in sessions keep full column access                      */
/* ------------------------------------------------------------------ */

-- `authenticated` deliberately keeps table-wide SELECT: the owner workspace
-- resolves ownership from these rows and `services_owner_all` /
-- `nexora_edit:*` policies depend on `owner_id` being readable for the owner's
-- own rows. Only the anonymous role is narrowed.

/* ------------------------------------------------------------------ */
/* 3. Self-checks                                                     */
/* ------------------------------------------------------------------ */

do $$
begin
  -- The anonymous role must not be able to read the owner column, but must
  -- still be able to read the catalogue columns it renders.
  if has_column_privilege('anon', 'public.services', 'owner_id', 'SELECT') then
    raise exception 'anon can still read public.services.owner_id';
  end if;
  if not has_column_privilege('anon', 'public.services', 'name', 'SELECT') then
    raise exception 'anon lost read access to the public catalogue columns';
  end if;
  if not has_column_privilege('anon', 'public.services', 'price', 'SELECT') then
    raise exception 'anon lost read access to public.services.price';
  end if;
  if not has_column_privilege('authenticated', 'public.services', 'owner_id', 'SELECT') then
    raise exception 'authenticated lost owner_id on public.services (owner workspace would break)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'services' and policyname = 'services_public_read'
  ) then
    raise exception 'the row-level public read policy was removed; column grants are not a row filter';
  end if;
end $$;

commit;
