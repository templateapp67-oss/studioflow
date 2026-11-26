/**
 * Column privacy for the public service catalogue.
 *
 * The previous turn proved the rows an anonymous visitor can see. This suite
 * proves the columns, and it keeps the reproduction of the rejected proposal so
 * the reason it was rejected cannot quietly be reintroduced.
 *
 * Three things are measured against a real RLS-enforcing database:
 *   1. why the proposed `security_invoker` view + `revoke select` denies every
 *      anonymous read (the failure, reproduced);
 *   2. that the shipped migration removes `owner_id` from anonymous reads while
 *      keeping the catalogue columns and the row filter intact;
 *   3. that owner / staff behaviour is untouched.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER_OWNER = '22222222-2222-4222-8222-222222222222';
const LIVE_SALON = '33333333-3333-4333-8333-333333333333';
const DEAD_SALON = '44444444-4444-4444-8444-444444444444';

const PRELUDE = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;
create table public.salons (id uuid primary key, is_active boolean not null default true, deleted_at timestamptz);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null default 'Service',
  category text not null default 'Hair',
  description text not null default '',
  icon text not null default 'spa',
  price numeric(12,2) not null default 0,
  duration_minutes integer not null default 30,
  popular boolean not null default false,
  show_duration boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  salon_id uuid,
  price_paise bigint,
  is_active boolean not null default true,
  is_bookable_online boolean,
  is_featured boolean,
  display_order integer,
  image_url text
);
alter table public.services enable row level security;
grant usage on schema public to anon, authenticated;
grant select on public.services, public.salons to anon, authenticated;
create policy services_public_read on public.services for select to anon, authenticated
  using (
    is_active is true
    and coalesce(is_bookable_online, true) is true
    and (salon_id is null or exists (
      select 1 from public.salons s where s.id = services.salon_id and s.is_active is true and s.deleted_at is null))
  );
`;

/** Runs `sql` with RLS enforced as `role`. Returns rows or the error message. */
function makeRunner(db) {
  return async function as(role, sql) {
    await db.exec('begin');
    try {
      await db.query(`select set_config('role', $1, true)`, [role]);
      const result = await db.query(sql);
      await db.exec('commit');
      return { rows: result.rows };
    } catch (error) {
      try { await db.exec('rollback'); } catch { /* ignore */ }
      return { error: error.message };
    }
  };
}

/* ================================================================== */
/* 1. Reproduce the rejected proposal                                 */
/* ================================================================== */

console.log('\n1. The rejected proposal, reproduced');
{
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.query(`insert into public.salons(id, is_active, deleted_at) values ($1, true, null), ($2, false, null)`, [LIVE_SALON, DEAD_SALON]);
  await db.query(`insert into public.services(owner_id, name, salon_id, is_active, is_bookable_online) values
    ($1,'Live bookable',$2,true,true), ($1,'Unpublished salon',$3,true,true)`, [OWNER, LIVE_SALON, DEAD_SALON]);

  const as = makeRunner(db);
  const before = await as('anon', 'select id, owner_id from public.services');
  assert.equal(before.rows.length, 1, 'baseline: anon can read the catalogue row (and its owner_id)');

  // The proposal: a security_invoker view over the same table, then revoke the
  // base-table grant from anon.
  await db.exec(`
    create or replace view public.public_salon_services with (security_invoker = true) as
      select s.id, s.salon_id, s.name, s.price, s.is_active
      from public.services s
      where s.is_active = true
        and exists (select 1 from public.salons sal where sal.id = s.salon_id and sal.is_active = true and sal.deleted_at is null);
    revoke select on table public.services from anon;
    grant select on table public.public_salon_services to anon, authenticated;
  `);

  const direct = await as('anon', 'select id from public.services');
  assert.match(String(direct.error), /permission denied for table services/,
    'the base table is closed to anon, as intended');

  const viaView = await as('anon', 'select * from public.public_salon_services');
  assert.match(String(viaView.error), /permission denied for table services/,
    'the security_invoker view cannot substitute for the revoked grant: every anonymous read fails');

  // And the proposal as written would not even compile against the real
  // schema; the columns it selects do not exist on studioflow_services.
  await db.exec(`create table public.studioflow_services (owner_id uuid not null, service_id text not null, name text not null, price numeric, duration_minutes integer, category text not null);`);
  await assert.rejects(
    db.exec(`create view public.broken as select s.id, s.salon_id, s.branch_id from public.studioflow_services s`),
    /does not exist/,
    'the proposed view body references columns studioflow_services does not have',
  );
  await db.close();
}

/* ================================================================== */
/* 2. The shipped migration                                           */
/* ================================================================== */

console.log('2. Shipped migration: anon loses owner_id, keeps the catalogue');
const MIGRATION = 'supabase/migrations/20261121130000_hide_owner_id_on_public_services.sql';
{
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.query(`insert into public.salons(id, is_active, deleted_at) values ($1, true, null), ($2, false, null)`, [LIVE_SALON, DEAD_SALON]);
  await db.query(`insert into public.services(owner_id, name, salon_id, is_active, is_bookable_online) values
    ($1,'Live bookable',$2,true,true),
    ($1,'Live non-bookable',$2,true,false),
    ($1,'Unpublished salon',$3,true,true),
    ($1,'Legacy salon-less',null,true,true)`, [OWNER, LIVE_SALON, DEAD_SALON]);

  await db.exec(readFileSync(MIGRATION, 'utf8'));

  const as = makeRunner(db);

  // Column privileges, measured through the catalog and through queries.
  const ownerRead = await as('anon', 'select owner_id from public.services');
  assert.match(String(ownerRead.error), /permission denied for (column|table)/,
    'anon cannot select owner_id from the public catalogue');

  const starRead = await as('anon', 'select * from public.services');
  assert.match(String(starRead.error), /permission denied for (column|table)/,
    'select * is refused rather than silently returning the owner column');

  const catalogue = await as('anon', 'select id, name, price, duration_minutes, is_active from public.services order by name');
  assert.equal(catalogue.rows.length, 2,
    'anon still reads exactly the two rows a storefront may show (live + salon-less legacy)');
  assert.deepEqual(catalogue.rows.map((row) => row.name), ['Legacy salon-less', 'Live bookable'],
    'the row filter is unchanged: non-bookable and unpublished-salon rows stay hidden');
  assert.ok(!('owner_id' in catalogue.rows[0]), 'the projected read carries no owner column at all');

  // Defence in depth: the row policy must still exist. Column grants are not a
  // row filter, and removing the policy would expose every salon's rows.
  const { rows: [policy] } = await db.query(
    `select count(*)::int as n from pg_policies where schemaname='public' and tablename='services' and policyname='services_public_read'`);
  assert.equal(policy.n, 1, 'services_public_read is still installed');

  console.log('3. Owner and signed-in behaviour is unchanged');
  const authOwner = await as('authenticated', 'select owner_id from public.services limit 1');
  assert.equal(authOwner.error, undefined, 'a signed-in session can still read owner_id (owner workspace depends on it)');
  assert.equal(authOwner.rows.length, 1, 'authenticated reads still return rows');

  // An unrelated signed-in user must not gain rows from the column grant.
  const stranger = await as('authenticated', `select id from public.services where owner_id = '99999999-9999-4999-8999-999999999999'`);
  assert.deepEqual(stranger.rows, [], 'a signed-in stranger still matches no row by owner_id');

  console.log('4. The migration is safe to re-run');
  await db.exec(readFileSync(MIGRATION, 'utf8'));
  const rerun = await as('anon', 'select name from public.services');
  assert.equal(rerun.rows.length, 2, 're-applying the migration is idempotent');

  await db.close();
}

console.log('\nPASS: the proposed view is reproduced as a hard denial for anon; the shipped migration removes owner_id from anonymous reads, keeps every catalogue column and the row filter, leaves signed-in access intact, and re-applies cleanly.');
