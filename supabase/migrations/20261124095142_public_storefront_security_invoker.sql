begin;

-- Resolve the security-definer-view finding without hiding published salons.
-- The invoker view only uses columns granted to anon, while RLS keeps direct
-- anonymous base-table reads restricted to published sites.
create or replace view public.public_salon_websites
with (security_invoker = true) as
select
  w.slug,
  w.content,
  w.published_at
from public.studioflow_websites w
where w.published_at is not null
  and w.published_at <= now();

revoke all on public.public_salon_websites from public, anon, authenticated;
grant select on public.public_salon_websites to anon, authenticated;

-- Keep anon off the owner identifier and any other unprojected columns.
revoke all on public.studioflow_websites from anon;
revoke select (owner_id) on public.studioflow_websites from anon;
grant select (slug, content, published_at)
  on public.studioflow_websites to anon;

-- Replace the broad legacy policy with role-scoped visibility. Authenticated
-- owners keep access to their own unpublished draft; public roles see only
-- published sites. Other booking and public API policies are untouched.
drop policy if exists studioflow_websites_read on public.studioflow_websites;
drop policy if exists studioflow_websites_public_read on public.studioflow_websites;
drop policy if exists studioflow_websites_authenticated_read on public.studioflow_websites;

create policy studioflow_websites_public_read
  on public.studioflow_websites
  for select to anon
  using (published_at is not null and published_at <= now());

create policy studioflow_websites_authenticated_read
  on public.studioflow_websites
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (published_at is not null and published_at <= now())
  );

do $guard$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_salon_websites'
      and column_name in ('owner_id', 'organization_id')
  ) then
    raise exception 'public_salon_websites must not project owner-identifying columns';
  end if;

  if has_table_privilege('anon', 'public.studioflow_websites', 'select')
     or has_column_privilege('anon', 'public.studioflow_websites', 'owner_id', 'select') then
    raise exception 'anon must not have table-wide or owner_id access to studioflow_websites';
  end if;

  if not has_column_privilege('anon', 'public.studioflow_websites', 'slug', 'select')
     or not has_column_privilege('anon', 'public.studioflow_websites', 'content', 'select')
     or not has_column_privilege('anon', 'public.studioflow_websites', 'published_at', 'select') then
    raise exception 'anon storefront column grants are incomplete';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'studioflow_websites'
      and policyname = 'studioflow_websites_public_read'
      and 'anon' = any(roles)
      and qual ilike '%published_at%'
  ) then
    raise exception 'anonymous storefront rows must be restricted to published sites';
  end if;
end
$guard$;

commit;
