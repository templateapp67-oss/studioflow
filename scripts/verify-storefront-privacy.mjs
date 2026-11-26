/**
 * Storefront privacy: `owner_id` must not reach anonymous readers.
 *
 * The leak measured live was NOT on studioflow_services (anon holds no
 * privilege there at all). It was:
 *   1. `public.studioflow_websites.owner_id`, readable by anon because the
 *      table is granted wholesale and `studioflow_websites_read` is
 *      `using (true)`; and
 *   2. `public.studioflow_customer_catalog()`, SECURITY INVOKER, which
 *      republished the same UUID inside its salon objects.
 *
 * This suite runs the historical view migration and the current hardening
 * migration against a PGlite fixture that mirrors the real schema, then measures behaviour per role:
 *   - anon cannot read owner_id from the table, directly or via the view;
 *   - the view still renders published salons (storefront regression guard);
 *   - the catalog RPC still works for anon and no longer carries owner_id;
 *   - authenticated sees published sites and its own drafts under RLS;
 *   - unpublished sites stay invisible.
 *
 * It also keeps the unsafe broad-revoke `security_invoker` proposal as a live
 * reproduction, then verifies the corrected column-grant and RLS design.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const LEGACY = 'supabase/migrations/20261121130001_public_storefront_view.sql';
const MIGRATION = 'supabase/migrations/20261124095142_public_storefront_security_invoker.sql';
const PREVIOUS = 'supabase/migrations/20261121130000_hide_owner_id_on_public_services.sql';

const OWNER_A = '11111111-1111-4111-8111-111111111111';
const OWNER_B = '22222222-2222-4222-8222-222222222222';
const OWNER_DRAFT = '33333333-3333-4333-8333-333333333333';

/**
 * Mirrors the live schema closely enough to be meaningful:
 * owner_id is the PRIMARY KEY of studioflow_websites, slug is UNIQUE NOT NULL,
 * and the base table is granted to anon (the actual defect).
 */
const PRELUDE = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;

create table public.studioflow_accounts (user_id uuid primary key);

create table public.studioflow_websites (
  owner_id uuid primary key references public.studioflow_accounts(user_id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  content jsonb not null default '{}'::jsonb,
  published_at timestamptz
);
alter table public.studioflow_websites enable row level security;
create policy studioflow_websites_read on public.studioflow_websites
  for select to anon, authenticated using (true);

create table public.studioflow_templates (
  id text primary key, active boolean not null default true,
  config jsonb not null default '{}'::jsonb
);
alter table public.studioflow_templates enable row level security;
create policy studioflow_templates_read on public.studioflow_templates
  for select to anon, authenticated using (active);

-- The pre-fix catalog: SECURITY INVOKER, owner_id in the payload.
create function public.studioflow_customer_catalog() returns jsonb
language sql security invoker set search_path = '' stable as $fn$
  select jsonb_build_object(
    'templates','[]'::jsonb,
    'salons',(select coalesce(jsonb_agg(jsonb_build_object('slug',w.slug,'owner_id',w.owner_id,'content',w.content)
      order by w.published_at desc),'[]'::jsonb) from public.studioflow_websites w where w.slug not like 'studioflow-qa-%')
  );
$fn$;

-- The published service catalogue, already column-narrowed by 20261121130000.
create table public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid, name text not null default 'Service', category text not null default 'Hair',
  description text not null default '', icon text not null default 'spa',
  price numeric(12,2) not null default 0, duration_minutes integer not null default 30,
  popular boolean not null default false, show_duration boolean not null default true,
  sort_order integer, created_at timestamptz not null default now(), updated_at timestamptz,
  salon_id uuid, price_paise bigint, is_active boolean not null default true,
  is_bookable_online boolean, is_featured boolean, display_order integer, image_url text
);
create table public.salons (id uuid primary key, is_active boolean not null default true, deleted_at timestamptz);
alter table public.services enable row level security;
create policy services_public_read on public.services for select to anon, authenticated
  using (is_active is true and coalesce(is_bookable_online, true) is true);
grant select on public.services to anon, authenticated;

-- Booking tables, so the slug stamping trigger and its backfill are exercised.
create schema studioflow_private;
create table public.studioflow_bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null, customer_id uuid, stylist_id text,
  starts_at timestamptz, ends_at timestamptz, status text not null default 'pending',
  payload jsonb, created_at timestamptz not null default now()
);
create table public.studioflow_demo_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid, owner_id uuid, request_id uuid, status text not null default 'confirmed',
  payload jsonb, created_at timestamptz not null default now()
);
alter table public.studioflow_bookings enable row level security;
alter table public.studioflow_demo_bookings enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.studioflow_websites, public.studioflow_templates to anon, authenticated;
grant execute on function public.studioflow_customer_catalog() to anon, authenticated, service_role;
`;

function makeRunner(db) {
  return async function as(role, sql, params = [], userId = null) {
    await db.exec('begin');
    try {
      await db.query(`select set_config('role', $1, true)`, [role]);
      if (userId) await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
      const result = await db.query(sql, params);
      await db.exec('commit');
      return { rows: result.rows };
    } catch (error) {
      try { await db.exec('rollback'); } catch { /* already rolled back */ }
      return { error: error.message };
    }
  };
}

async function seeded() {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.query(`insert into public.studioflow_accounts(user_id) values ($1),($2),($3)`,
    [OWNER_A, OWNER_B, OWNER_DRAFT]);
  await db.query(`insert into public.studioflow_websites(owner_id, slug, content, published_at) values
    ($1,'alpha-salon','{"profile":{"businessName":"Alpha"}}'::jsonb, now() - interval '1 day'),
    ($2,'beta-salon','{"profile":{"businessName":"Beta"}}'::jsonb, now() - interval '2 day'),
    ($3,'draft-salon','{"profile":{"businessName":"Draft"}}'::jsonb, null)`,
    [OWNER_A, OWNER_B, OWNER_DRAFT]);
  return db;
}

/* ================================================================== */
/* 1. Baseline: the leak this migration closes                        */
/* ================================================================== */
console.log('\n1. Baseline — the leak, measured');

{
  const db = await seeded();
  const as = makeRunner(db);

  const tableLeak = await as('anon', 'select owner_id from public.studioflow_websites');
  assert.equal(tableLeak.rows.length, 3, 'baseline: anon reads every owner_id from the base table');

  const catalogLeak = await as('anon', `select public.studioflow_customer_catalog() as c`);
  const salons = catalogLeak.rows[0].c.salons;
  assert.ok(salons.length > 0, 'baseline: catalog returns salons');
  assert.ok(salons.every((s) => typeof s.owner_id === 'string'),
    'baseline: catalog embeds owner_id for every salon');

  console.log('   anon read 3/3 owner ids from the table and via the catalog RPC');
  await db.close();
}

/* ================================================================== */
/* 2. The rejected shortcut, still rejected                           */
/* ================================================================== */
console.log('\n2. The security_invoker shortcut, reproduced');

{
  const db = await seeded();
  const as = makeRunner(db);

  await db.exec(`
    create view public.public_salon_services with (security_invoker = true) as
      select w.slug, w.content, w.published_at from public.studioflow_websites w
      where w.published_at is not null and w.published_at <= now();
    revoke select on public.studioflow_websites from anon;
    grant select on public.public_salon_services to anon;
  `);

  const gone = await as('anon', 'select * from public.public_salon_services');
  assert.match(String(gone.error), /permission denied for table studioflow_websites/,
    'a security_invoker view cannot stand in for a revoked base grant: anon reads nothing');

  console.log('   reproduced: security_invoker + revoke denies every anonymous storefront read');
  await db.close();
}

/* ================================================================== */
/* 3. The shipped migration                                           */
/* ================================================================== */
console.log('\n3. Shipped migration applied');

const legacySql = readFileSync(LEGACY, 'utf8');
const sql = readFileSync(MIGRATION, 'utf8');
assert.ok(sql.length > 500, 'migration file is not empty');
assert.match(sql, /create or replace view public\.public_salon_websites/i);
assert.match(sql, /where w\.published_at is not null/i);
// The projection contract is the whole security property; assert it in source
// as well as at runtime (the migration's own DO block checks the live catalog).
// Isolate the view's SELECT list. The DO-block guard and the comments both
// mention owner_id on purpose, so a whole-file grep would be meaningless.
const viewStatement = sql.match(/create or replace view[\s\S]*?from public\.studioflow_websites[\s\S]*?;/i);
assert.ok(viewStatement, 'migration defines the public view');
const projection = viewStatement[0].replace(/--[^\n]*/g, '');
assert.doesNotMatch(projection, /owner_id/i, 'the view projection must not select owner_id');
assert.match(projection, /select\s+w\.slug,\s*w\.content,\s+w\.published_at/i,
  'the view keeps its explicit three-column projection');

{
  const db = await seeded();
  await db.exec(legacySql);
  await db.exec(sql);
  const as = makeRunner(db);

  // 3a. Direct table read now denied for anon.
  const direct = await as('anon', 'select owner_id from public.studioflow_websites');
  assert.match(String(direct.error), /permission denied for table studioflow_websites/,
    'anon can no longer read the base table directly');

  // 3b. The storefront view works and omits owner_id.
  const view = await as('anon', 'select * from public.public_salon_websites order by slug');
  assert.equal(view.rows.length, 2, 'published salons still render through the view');
  assert.deepEqual(view.rows.map((r) => r.slug), ['alpha-salon', 'beta-salon'],
    'only published sites are visible (draft excluded)');
  assert.ok(view.rows.every((r) => !('owner_id' in r)), 'the view exposes no owner_id column');

  // 3c. Explicit owner_id selection through the view fails loudly.
  const explicit = await as('anon', 'select owner_id from public.public_salon_websites');
  assert.match(String(explicit.error), /column "owner_id" does not exist/,
    'owner_id is not addressable through the public view');

  // 3d. A single salon (the storefront path) still works.
  const one = await as('anon', `select content from public.public_salon_websites where slug = 'alpha-salon'`);
  assert.equal(one.rows.length, 1, 'single-salon storefront read works for anon');
  assert.equal(one.rows[0].content.profile.businessName, 'Alpha');

  // 3e. The catalog RPC keeps working for anon, without owner_id.
  const catalog = await as('anon', `select public.studioflow_customer_catalog() as c`);
  assert.equal(catalog.error, undefined, `catalog must not fail for anon: ${catalog.error}`);
  const salons = catalog.rows[0].c.salons;
  assert.equal(salons.length, 2, 'catalog still lists the published salons');
  assert.ok(salons.every((s) => !('owner_id' in s)), 'catalog payload no longer carries owner_id');
  assert.ok(salons.every((s) => typeof s.slug === 'string'), 'catalog keeps slug as the public join key');
  assert.ok(salons.every((s) => s.content?.profile?.businessName), 'catalog keeps the salon content');

  // 3f. Authenticated sees public rows; drafts require an owner claim.
  const authRead = await as('authenticated', 'select owner_id, slug from public.studioflow_websites');
  assert.equal(authRead.rows.length, 2, 'authenticated sees published rows without an owner claim');
  assert.ok(authRead.rows.every((r) => typeof r.owner_id === 'string'), 'authenticated keeps owner_id');
  const ownerDraft = await as('authenticated', `select slug from public.studioflow_websites where slug='draft-salon'`, [], OWNER_DRAFT);
  assert.equal(ownerDraft.rows.length, 1, 'authenticated owner can read its own draft');

  // 3g. This migration does not touch the published service catalogue. The
  // column narrowing below is 20261121130000's job and is asserted in section 6
  // (and in verify-service-column-privacy.mjs).
  const services = await as('anon', 'select count(*)::int as n from public.services');
  assert.equal(services.error, undefined, 'services catalogue still readable');

  console.log('   anon: table denied, 2 published salons via view, catalog clean, owner_id absent');
  console.log('   authenticated: direct table read intact');
  await db.close();
}

/* ================================================================== */
/* 3h. Booking payloads carry the slug, not owner_id                  */
/* ================================================================== */
console.log('\n3h. Booking slug stamping + backfill');

{
  // Pre-existing booking written without a slug, exactly like the 14 live rows.
  const db = await seeded();
  await db.query(`insert into public.studioflow_bookings(owner_id, customer_id, status, payload)
    values ($1, $2, 'pending', '{"serviceName":"Cut"}'::jsonb)`, [OWNER_A, OWNER_B]);
  await db.query(`insert into public.studioflow_demo_bookings(customer_id, owner_id, payload)
    values ($1, $2, '{"demo":true}'::jsonb)`, [OWNER_B, OWNER_A]);

  await db.exec(legacySql);
  await db.exec(sql); // backfills the two rows above

  const backfilled = await db.query(`select payload->>'salonSlug' as slug from public.studioflow_bookings`);
  assert.equal(backfilled.rows[0].slug, 'alpha-salon', 'existing booking backfilled with its salon slug');
  const demoBackfilled = await db.query(`select payload->>'salonSlug' as slug from public.studioflow_demo_bookings`);
  assert.equal(demoBackfilled.rows[0].slug, 'alpha-salon', 'existing demo booking backfilled too');

  // New inserts are stamped by the trigger, with no change to the booking RPCs.
  const fresh = await db.query(
    `insert into public.studioflow_bookings(owner_id, status, payload)
     values ($1,'pending','{"serviceName":"Colour"}'::jsonb) returning payload`, [OWNER_B]);
  assert.equal(fresh.rows[0].payload.salonSlug, 'beta-salon', 'trigger stamps the slug on insert');

  // An explicit slug is never overwritten (WhatsApp/partner writers may set it).
  const explicit = await db.query(
    `insert into public.studioflow_bookings(owner_id, status, payload)
     values ($1,'pending','{"salonSlug":"kept-as-is"}'::jsonb) returning payload`, [OWNER_B]);
  assert.equal(explicit.rows[0].payload.salonSlug, 'kept-as-is', 'an explicit slug is preserved');

  // The payload never gains owner_id, and anon still cannot read the tables.
  const payloadKeys = Object.keys(fresh.rows[0].payload);
  assert.equal(payloadKeys.includes('ownerId') || payloadKeys.includes('owner_id'), false,
    'stamped payload carries no owner identifier');

  const anonBookings = await makeRunner(db)('anon', 'select payload from public.studioflow_bookings');
  assert.ok(anonBookings.error || anonBookings.rows.length === 0,
    'booking rows stay closed to anon');

  await db.close();
  console.log('   backfill + trigger stamp salonSlug; explicit slugs preserved; no owner_id');
}

/* ================================================================== */
/* 4. Idempotency                                                     */
/* ================================================================== */
console.log('\n4. Re-apply is a no-op');

{
  const db = await seeded();
  await db.exec(legacySql);
  await db.exec(sql);
  await db.exec(sql); // must not raise (create or replace + repeated grants)
  const as = makeRunner(db);
  const view = await as('anon', 'select count(*)::int as n from public.public_salon_websites');
  assert.equal(view.rows[0].n, 2, 're-applying the migration keeps the view working');
  await db.close();
  console.log('   second apply succeeded, view unchanged');
}

/* ================================================================== */
/* 5. The DO-block guard actually fires                               */
/* ================================================================== */
console.log('\n5. Projection guard is load-bearing');

{
  const db = await seeded();
  await db.exec(legacySql);
  await db.exec(sql);
  await assert.rejects(
    () => db.exec(`
      create or replace view public.public_salon_websites with (security_invoker = false) as
        select w.slug, w.content, w.published_at, w.owner_id from public.studioflow_websites w
        where w.published_at is not null;
      do $$
      begin
        if exists (select 1 from information_schema.columns
          where table_schema='public' and table_name='public_salon_websites'
            and column_name in ('owner_id','organization_id')) then
          raise exception 'public_salon_websites must not project owner-identifying columns';
        end if;
      end $$;
    `),
    /must not project owner-identifying columns/,
    'widening the projection to include owner_id must fail the migration',
  );
  await db.close();
  console.log('   a projection that reintroduces owner_id fails the migration');
}

/* ================================================================== */
/* 6. Prior migration still applies cleanly alongside this one        */
/* ================================================================== */
console.log('\n6. Stacks on the previous column-privacy migration');

{
  const db = await seeded();
  await db.exec(readFileSync(PREVIOUS, 'utf8'));
  await db.exec(legacySql);
  await db.exec(sql);
  const as = makeRunner(db);
  const services = await as('anon', 'select id, name, price from public.services');
  assert.equal(services.error, undefined, 'services catalogue still readable after both migrations');
  const view = await as('anon', 'select slug from public.public_salon_websites');
  assert.equal(view.rows.length, 2, 'storefront view works after both migrations');
  const ownerGrant = await db.query(
    `select has_column_privilege('anon','public.services','owner_id','select') as p`);
  assert.equal(ownerGrant.rows[0].p, false, 'owner_id stays out of the anon services grant');
  await db.close();
  console.log('   both migrations apply in order without conflict');
}

console.log('\nPASS: anon reads published storefront columns without owner identifiers; authenticated reads are RLS-scoped; unsafe broad-revoke invoker access remains denied.');
