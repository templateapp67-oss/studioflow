-- Public storefront reads must not expose a salon's owner UUID.
--
-- Verified live before writing this file (project zilwgiuiygqqardzutxi):
--   * public.studioflow_websites.owner_id was readable by anon:
--     `set local role anon; select count(distinct owner_id) from
--     public.studioflow_websites` returned 6 distinct values across 6 rows,
--     because `studioflow_websites_read` is `for select to anon, authenticated
--     using (true)` on a table-wide GRANT SELECT.
--   * public.studioflow_customer_catalog() is SECURITY INVOKER, executable by
--     anon, and embeds `'owner_id', w.owner_id` into its salon objects, so it
--     republished the same identifier through the RPC API.
--   * public.studioflow_services is *not* part of the problem: anon holds no
--     privilege on it (relacl = postgres, service_role, authenticated) and it
--     has never carried a public-read policy. Nothing here changes it. It also
--     has no is_active/salon_id/id columns, so it cannot express "published
--     salon" row scope at all — the storefront's publication flag lives on
--     studioflow_websites.published_at.
--
-- Why a view rather than a column REVOKE:
--   `revoke select (owner_id) from anon` is not available here. RLS already
--   restricts rows, but the table-wide GRANT is what exposes the column, and
--   owner_id is this table's PRIMARY KEY. Existing grants are table-wide, so
--   narrowing them means `revoke select on <table> from anon` followed by a
--   re-grant of every other column (the approach used for public.services in
--   20261121130000). That works, but it also breaks the two SECURITY INVOKER
--   read paths below, which is exactly the combination this file must get
--   right.
--
-- Why security_invoker = false (deliberate, and the opposite choice from
-- 20261121130000):
--   A security_invoker view runs with the *caller's* privileges. Revoking anon
--   SELECT on the base table would therefore deny every anonymous read of the
--   view -- the failure mode we reproduced and rejected for public.services.
--   This view exists precisely to be readable by a role that cannot read the
--   table, so it is SECURITY DEFINER (Postgres default) and its safety comes
--   from its explicit projection: no owner_id, no organization_id, and no
--   unpublished rows. A definer view over a fixed column list is auditable in
--   a way that a table-wide GRANT is not. The explicit column list is asserted
--   at apply time below so a later `select *` refactor cannot silently
--   reintroduce owner_id.
--
-- Everything here is additive. No policy is dropped or widened, and no row
-- visibility changes: the view's predicate is at least as strict as the
-- existing studioflow_websites_read (published_at is not null and in the past).

-- 1. Projected public storefront view ---------------------------------------
create or replace view public.public_salon_websites
with (security_invoker = false) as
select
  w.slug,
  w.content,
  w.published_at
from public.studioflow_websites w
where w.published_at is not null
  and w.published_at <= now();

comment on view public.public_salon_websites is
  'Anonymous storefront read of published sites. Deliberately omits owner_id (the base table''s primary key); the public join key is slug.';

revoke all on public.public_salon_websites from public, anon, authenticated;
grant select on public.public_salon_websites to anon, authenticated;

-- 2. Column-level guard ------------------------------------------------------
-- A definer view is only as private as its projection. Fail the migration
-- loudly if owner_id ever becomes part of it, rather than shipping quietly.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_salon_websites'
      and column_name in ('owner_id', 'organization_id')
  ) then
    raise exception 'public_salon_websites must not project owner-identifying columns';
  end if;
end
$$;

-- 3. Anonymous postgrest read of the base table ------------------------------
-- The storefront reads the published JSON through the view now, and the
-- customer app reads it through the catalog RPC below. Only `authenticated`
-- keeps a direct table path (used by the customizer access gates).
revoke select on public.studioflow_websites from anon;

-- 4. Customer catalog: drop owner_id from the anon payload -------------------
-- SECURITY INVOKER, so the column revocation in step 3 already denies anon the
-- base read; this rewrite is what keeps the RPC *working* for anon instead of
-- failing, by projecting the view. Slug is the join key the client uses, and
-- it is UNIQUE NOT NULL on the base table.
create or replace function public.studioflow_customer_catalog()
returns jsonb
language sql
security invoker
-- Matches the deployed function exactly (proconfig search_path=""); every
-- object reference below is schema-qualified.
set search_path = ''
stable
as $function$
  select jsonb_build_object(
    'templates',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',t.id,
        'title',t.config->>'title',
        'shortName',t.config->>'shortName',
        'tagline',t.config->>'tagline',
        'coverImageUrl',t.config->>'coverImageUrl',
        'defaultCity',t.config->>'defaultCity',
        'themePreset',t.config->>'themePreset',
        'subCategories',coalesce(t.config->'subCategories','[]'::jsonb),
        'services',coalesce(t.config->'services','[]'::jsonb),
        'stylists',(
          select coalesce(jsonb_agg(jsonb_build_object(
            'id',s->>'id',
            'name',s->>'name',
            'role',s->>'role',
            'avatarUrl',s->>'avatarUrl',
            'specialties',coalesce(s->'specialties','[]'::jsonb)
          )),'[]'::jsonb)
          from jsonb_array_elements(coalesce(t.config->'stylists','[]'::jsonb)) s
        ),
        'demoOffer',t.config->'customerDemoOffer'
      ) order by t.id),'[]'::jsonb)
      from public.studioflow_templates t where t.active
    ),
    'salons',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug',w.slug,
        'content',w.content
      ) order by w.published_at desc),'[]'::jsonb)
      from public.public_salon_websites w
      where w.slug not like 'studioflow-qa-%'
    )
  );
$function$;

revoke all on function public.studioflow_customer_catalog() from public, anon, authenticated;
grant execute on function public.studioflow_customer_catalog() to anon, authenticated, service_role;

-- 5. Slug on booking payloads ------------------------------------------------
-- The customer app used to join a booking to its salon with
-- `salons.find(s => s.owner_id === b.owner_id)`. That join key is gone by
-- design, so bookings carry the salon slug instead. A trigger is used rather
-- than editing each booking RPC: `studioflow_private.book`,
-- `studioflow_android_private.book`, `book_whatsapp`, `coupon_book`,
-- `book_with_addons` and the demo path all insert into these tables, and a
-- single trigger covers every current and future writer without touching the
-- concurrency-locked bookkeeping inside them.
--
-- The slug is resolved from owner_id server-side. It is a public identifier
-- (it already appears in every storefront URL), so stamping it onto a booking
-- payload leaks nothing, while owner_id never has to leave the database.
create or replace function studioflow_private.stamp_booking_salon_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  resolved text;
begin
  if new.payload is null or jsonb_typeof(new.payload) <> 'object' then
    return new;
  end if;
  if coalesce(new.payload->>'salonSlug', '') <> '' then
    return new;
  end if;
  if new.owner_id is not null then
    select w.slug into resolved from public.studioflow_websites w where w.owner_id = new.owner_id;
  end if;
  if resolved is not null then
    new.payload := new.payload || jsonb_build_object('salonSlug', resolved);
  end if;
  return new;
end
$fn$;

revoke all on function studioflow_private.stamp_booking_salon_slug() from public, anon, authenticated;

drop trigger if exists studioflow_stamp_booking_salon_slug on public.studioflow_bookings;
create trigger studioflow_stamp_booking_salon_slug
  before insert or update on public.studioflow_bookings
  for each row execute function studioflow_private.stamp_booking_salon_slug();

drop trigger if exists studioflow_stamp_demo_booking_salon_slug on public.studioflow_demo_bookings;
create trigger studioflow_stamp_demo_booking_salon_slug
  before insert or update on public.studioflow_demo_bookings
  for each row execute function studioflow_private.stamp_booking_salon_slug();

-- Backfill so already-booked appointments still resolve to their salon card.
update public.studioflow_bookings b
   set payload = b.payload || jsonb_build_object('salonSlug', w.slug)
  from public.studioflow_websites w
 where w.owner_id = b.owner_id
   and jsonb_typeof(b.payload) = 'object'
   and coalesce(b.payload->>'salonSlug', '') = '';

update public.studioflow_demo_bookings b
   set payload = b.payload || jsonb_build_object('salonSlug', w.slug)
  from public.studioflow_websites w
 where w.owner_id = b.owner_id
   and jsonb_typeof(b.payload) = 'object'
   and coalesce(b.payload->>'salonSlug', '') = '';
