-- Resolve Supabase Security Advisor `security_definer_view` ERROR on
-- public.public_salon_websites while preserving anonymous storefront visibility
-- and keeping studioflow_websites.owner_id completely inaccessible to anon.
--
-- Why this works without leaking owner_id:
--   1. Revoke table-wide SELECT on public.studioflow_websites from anon and grant
--      column-level SELECT ONLY on (slug, content, published_at) -- identical to
--      the column-privacy pattern in 20261121130000 for public.services.
--      Direct `SELECT *` or `SELECT owner_id` by anon still fails with
--      `permission denied`.
--   2. Narrow anon's RLS policy on public.studioflow_websites to published rows
--      (`published_at is not null and published_at <= now()`), while
--      authenticated retains full read access for customizer/workspace checks.
--   3. Switch public.public_salon_websites to `with (security_invoker = true)`.
--      Because its projection uses only (slug, content, published_at), anon
--      reads published storefronts cleanly through the view and through
--      studioflow_customer_catalog() without bypassing caller RLS/privileges.

begin;

revoke select on table public.studioflow_websites from anon;
grant select (slug, content, published_at) on table public.studioflow_websites to anon;

drop policy if exists studioflow_websites_read on public.studioflow_websites;
create policy studioflow_websites_read
  on public.studioflow_websites
  for select
  to anon
  using (published_at is not null and published_at <= now());

drop policy if exists studioflow_websites_authenticated_read on public.studioflow_websites;
create policy studioflow_websites_authenticated_read
  on public.studioflow_websites
  for select
  to authenticated
  using (true);

create or replace view public.public_salon_websites
with (security_invoker = true) as
select
  w.slug,
  w.content,
  w.published_at
from public.studioflow_websites w
where w.published_at is not null
  and w.published_at <= now();

comment on view public.public_salon_websites is
  'Anonymous storefront read of published sites with security_invoker = true. Relies on column-level SELECT (slug, content, published_at) and published-only anon RLS on studioflow_websites; omits owner_id.';

revoke all on public.public_salon_websites from public, anon, authenticated;
grant select on public.public_salon_websites to anon, authenticated;

do $$
begin
  if has_column_privilege('anon', 'public.studioflow_websites', 'owner_id', 'SELECT') then
    raise exception 'anon must not have SELECT on public.studioflow_websites.owner_id';
  end if;
  if not has_column_privilege('anon', 'public.studioflow_websites', 'slug', 'SELECT')
     or not has_column_privilege('anon', 'public.studioflow_websites', 'content', 'SELECT')
     or not has_column_privilege('anon', 'public.studioflow_websites', 'published_at', 'SELECT') then
    raise exception 'anon lost column SELECT required by public_salon_websites';
  end if;
  if not has_column_privilege('authenticated', 'public.studioflow_websites', 'owner_id', 'SELECT') then
    raise exception 'authenticated lost SELECT on public.studioflow_websites.owner_id';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_salon_websites'
      and column_name in ('owner_id', 'organization_id')
  ) then
    raise exception 'public_salon_websites must not project owner-identifying columns';
  end if;
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'public_salon_websites'
      and c.relkind = 'v'
      and coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']
  ) then
    raise exception 'public_salon_websites must keep security_invoker=true';
  end if;
end
$$;

commit;
