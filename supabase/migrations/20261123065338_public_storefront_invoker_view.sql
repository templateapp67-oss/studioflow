-- Replace the SECURITY DEFINER storefront projection with an invoker view.
--
-- Anonymous storefront reads remain limited to published websites and to the
-- three projected columns. The base-table row policy and column grants together
-- preserve the previous public_salon_websites contract without exposing owner_id.
-- Authenticated direct reads retain their existing visibility contract.

begin;

drop policy if exists studioflow_websites_read on public.studioflow_websites;

create policy studioflow_websites_published_public_read
  on public.studioflow_websites
  for select
  to anon
  using (published_at is not null and published_at <= now());

create policy studioflow_websites_authenticated_read
  on public.studioflow_websites
  for select
  to authenticated
  using (true);

-- The invoker view needs only these three underlying column privileges.
-- owner_id remains unavailable to anon.
revoke select on public.studioflow_websites from anon;
grant select (slug, content, published_at)
  on public.studioflow_websites to anon;

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
  'Anonymous storefront read of published sites. SECURITY INVOKER; anon has only slug/content/published_at column access and a published-row RLS policy.';

revoke all on public.public_salon_websites from public, anon, authenticated;
grant select on public.public_salon_websites to anon, authenticated;

-- Fail closed if the view ever regains owner-identifying columns or definer mode.
do $$
declare
  view_invoker boolean;
begin
  select coalesce('security_invoker=true' = any(c.reloptions), false)
    into view_invoker
  from pg_class c
  where c.oid = 'public.public_salon_websites'::regclass;

  if not view_invoker then
    raise exception 'public_salon_websites must use SECURITY INVOKER';
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

  if has_column_privilege('anon', 'public.studioflow_websites', 'owner_id', 'SELECT') then
    raise exception 'anon must not read studioflow_websites.owner_id';
  end if;
end
$$;

commit;
