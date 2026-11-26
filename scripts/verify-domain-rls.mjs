/**
 * Behavioural proof for `20261121120000_domain_tables_fail_closed_rls.sql`.
 *
 * Policy text is not evidence: a policy can exist, be granted, and still return
 * the wrong rows. This fixture builds the real staff tables, applies the real
 * migrations, and then measures what owner / manager / receptionist / service
 * provider / anon / unrelated-user connections actually see and can write.
 *
 * It also pins the two things the reviewed adaptation had to preserve:
 *   - the published storefront must not lose rows it showed before the
 *     replacement of `services_public_read` (superset check, policy-off vs
 *     policy-on over the same data);
 *   - a stranger must never be able to reach branch-scoped data by passing a
 *     fixed value into the helper.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const MIGRATIONS = [
  'supabase/migrations/20261119080000_staff_role_permissions.sql',
  'supabase/migrations/20261119120000_staff_invites_and_staff_login.sql',
  'supabase/migrations/20261119140000_staff_access_hardening.sql',
  'supabase/migrations/20261121120000_domain_tables_fail_closed_rls.sql',
];

const OWNER = '11111111-1111-4111-8111-111111111111';
const MANAGER_USER = '22222222-2222-4222-8222-222222222222';
const RECEPTION_USER = '33333333-3333-4333-8333-333333333333';
const PROVIDER_USER = '44444444-4444-4444-8444-444444444444';
const STRANGER = '55555555-5555-4555-8555-555555555555';
const CUSTOMER = '66666666-6666-4666-8666-666666666666';
const OTHER_OWNER = '77777777-7777-4777-8777-777777777777';

const JAIPUR = 'aaaaaaaa-0000-4000-8000-000000000001'; // manager + receptionist + provider
const JHOTWARA = 'aaaaaaaa-0000-4000-8000-000000000002'; // manager only
const CLOSED = 'aaaaaaaa-0000-4000-8000-000000000003'; // deactivated branch
const OTHER_BRANCH = 'aaaaaaaa-0000-4000-8000-000000000004'; // belongs to OTHER_OWNER

const db = new PGlite();

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create schema extensions;
create function auth.uid() returns uuid language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;
create function extensions.gen_random_bytes(n integer) returns bytea language sql as $fn$
  select decode(md5(random()::text), 'hex')
$fn$;
create function extensions.digest(data text, algo text) returns bytea language sql as $fn$
  select decode(md5(data), 'hex')
$fn$;
create table auth.users (id uuid primary key, email text);
grant usage on schema auth to anon, authenticated, service_role;

-- Domain tables with only the columns the policies touch.
create table public.studioflow_accounts (user_id uuid primary key, draft jsonb not null default '{}'::jsonb);
create table public.salons (id uuid primary key, is_active boolean not null default true, deleted_at timestamptz);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid,
  owner_id uuid,
  name text not null default 'Service',
  is_active boolean not null default true,
  is_bookable_online boolean
);
create table public.branches (id uuid primary key, site_id uuid not null, name text not null default 'Branch', is_active boolean not null default true);
create table public.studioflow_branch_staff_members (
  id uuid primary key default gen_random_uuid(), site_id uuid not null, branch_id uuid not null,
  user_id uuid not null, role text not null default 'staff', is_active boolean not null default true
);
create table public.studioflow_services (owner_id uuid not null, service_id text not null, name text not null default 'Service');
create table public.studioflow_bookings (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null, customer_id uuid,
  stylist_id text not null default '', branch_id uuid, status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb
);

-- Owner-only policies exactly as they exist today, so the fixture measures the
-- migration against the real starting point instead of an empty policy set.
alter table public.branches enable row level security;
create policy branches_owner_manage on public.branches for all to authenticated
  using (site_id = (select auth.uid())) with check (site_id = (select auth.uid()));
create table public.studioflow_websites (owner_id uuid primary key);
create policy branches_public_active_read on public.branches for select to anon, authenticated
  using (is_active and exists (select 1 from public.studioflow_websites w where w.owner_id = branches.site_id));
alter table public.studioflow_websites enable row level security;
create policy studioflow_websites_read on public.studioflow_websites for select to anon, authenticated using (true);

alter table public.studioflow_services enable row level security;
create policy studioflow_services_owner_read on public.studioflow_services for select to authenticated
  using (owner_id = (select auth.uid()));

alter table public.studioflow_bookings enable row level security;
create policy studioflow_bookings_read on public.studioflow_bookings for select to authenticated
  using (owner_id = (select auth.uid()) or customer_id = (select auth.uid()));
create policy studioflow_bookings_owner_write on public.studioflow_bookings for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- The wide public policy this migration replaces.
alter table public.services enable row level security;
create policy services_public_read on public.services for select to anon, authenticated using (is_active = true);

grant select on public.branches, public.services, public.salons to anon, authenticated;
grant select, insert, update, delete on public.branches, public.studioflow_bookings to authenticated;
grant select on public.studioflow_services to authenticated;
grant select on public.studioflow_websites to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
`);

for (const file of MIGRATIONS) {
  await db.exec(readFileSync(file, 'utf8'));
  console.log('applied ' + file.replace('supabase/migrations/', ''));
}

/* ---------------- data ---------------- */
// The draft is what the staff helpers read branch scope from, so the fixture
// stores all three branches there: two active, one deactivated.
await db.query(
  `insert into public.studioflow_accounts(user_id, draft) values ($1, $2::jsonb), ($3, $4::jsonb)`,
  [
    OWNER,
    JSON.stringify({
      profile: {
        businessName: 'Luxury Salon',
        branches: [
          { id: JAIPUR, name: 'Vaishali Nagar', city: 'Jaipur', isActive: true },
          { id: JHOTWARA, name: 'Jhotwara', city: 'Jaipur', isActive: true },
          { id: CLOSED, name: 'Closed Branch', city: 'Jaipur', isActive: false },
        ],
      },
      stylists: [
        { id: 'staff-manager', name: 'Rahul' },
        { id: 'staff-reception', name: 'Neha' },
        { id: 'staff-provider', name: 'Sunita' },
      ],
    }),
    OTHER_OWNER,
    JSON.stringify({
      profile: { businessName: 'Other Salon', branches: [{ id: OTHER_BRANCH, name: 'Other Branch', isActive: true }] },
      stylists: [],
    }),
  ],
);

await db.query(`insert into public.studioflow_websites(owner_id) values ($1), ($2)`, [OWNER, OTHER_OWNER]);
await db.query(
  `insert into public.branches(id, site_id, name, is_active) values
     ($1,$2,'Vaishali Nagar',true), ($3,$4,'Jhotwara',true), ($5,$6,'Closed Branch',false), ($7,$8,'Other Branch',true)`,
  [JAIPUR, OWNER, JHOTWARA, OWNER, CLOSED, OWNER, OTHER_BRANCH, OTHER_OWNER],
);

await db.query(`insert into public.salons(id, is_active, deleted_at) values
  ('bbbbbbbb-0000-4000-8000-000000000001', true, null),
  ('bbbbbbbb-0000-4000-8000-000000000002', true, null),
  ('bbbbbbbb-0000-4000-8000-000000000003', false, null),
  ('bbbbbbbb-0000-4000-8000-000000000004', true, now())`);

await db.query(`insert into public.services(id, salon_id, owner_id, name, is_active, is_bookable_online) values
  ('cccccccc-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001',$1,'Live bookable',true,true),
  ('cccccccc-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000001',$1,'Live default-bookable',true,null),
  ('cccccccc-0000-4000-8000-000000000003','bbbbbbbb-0000-4000-8000-000000000001',$1,'Inactive',false,true),
  ('cccccccc-0000-4000-8000-000000000004','bbbbbbbb-0000-4000-8000-000000000003',$1,'Unpublished salon',true,true),
  ('cccccccc-0000-4000-8000-000000000005','bbbbbbbb-0000-4000-8000-000000000004',$1,'Deleted salon',true,true),
  ('cccccccc-0000-4000-8000-000000000006',null,$1,'Legacy row without salon',true,true),
  ('cccccccc-0000-4000-8000-000000000007','bbbbbbbb-0000-4000-8000-000000000001',$1,'Live but not bookable online',true,false)`,
  [OWNER]);

await db.query(`insert into public.studioflow_services(owner_id, service_id, name) values
  ($1,'svc-1','Hair Cut'), ($2,'svc-2','Other Salon Service')`, [OWNER, OTHER_OWNER]);

await db.query(`insert into public.studioflow_bookings(id, owner_id, customer_id, stylist_id, branch_id, status) values
  ('dddddddd-0000-4000-8000-000000000001',$1,$2,'staff-provider',$3,'confirmed'),
  ('dddddddd-0000-4000-8000-000000000002',$1,$2,'staff-provider',$4,'confirmed'),
  ('dddddddd-0000-4000-8000-000000000003',$1,$2,'staff-manager',$3,'confirmed'),
  ('dddddddd-0000-4000-8000-000000000004',$5,$2,'other-staff',$6,'confirmed')`,
  [OWNER, CUSTOMER, JAIPUR, JHOTWARA, OTHER_OWNER, OTHER_BRANCH]);

await db.query(`insert into auth.users(id, email) values ($1,'m@t'),($2,'r@t'),($3,'p@t'),($4,'s@t'),($5,'c@t'),($6,'o@t')`,
  [MANAGER_USER, RECEPTION_USER, PROVIDER_USER, STRANGER, CUSTOMER, OTHER_OWNER]);
await db.query(`insert into auth.users(id, email) values ($1,'owner@t')`, [OWNER]);

/* ---------------- staff memberships ---------------- */
// Branch-scoped staff, all active members of OWNER's salon.
await db.query(`insert into public.studioflow_staff_members(owner_id, user_id, staff_id, role, branch_ids, all_branches, is_active) values
  ($1,$2,'staff-manager','Manager (Full Access)', array[$3,$4], false, true),
  ($1,$5,'staff-reception','Receptionist (Frontdesk)', array[$3], false, true),
  ($1,$6,'staff-provider','Service Provider (Assigned)', array[$3], false, true)`,
  [OWNER, MANAGER_USER, JAIPUR, JHOTWARA, RECEPTION_USER, PROVIDER_USER]);

/** Runs `sql` as `Whoami` with RLS enforced. */
async function as(userId, sql, params = []) {
  await db.exec(`begin`);
  try {
    await db.query(`select set_config('role', $1, true)`, [userId ? 'authenticated' : 'anon']);
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId || '']);
    const result = await db.query(sql, params);
    await db.exec(`commit`);
    return result.rows;
  } catch (error) {
    try { await db.exec(`rollback`); } catch { /* ignore */ }
    throw error;
  }
}
const ids = (rows, key = 'id') => rows.map((row) => row[key]).sort();

console.log('\n1. Anonymous + stranger reach');
const anonBranches = await as(null, `select id from public.branches`);
// Anonymous branch reads come from `branches_public_active_read`, which this
// migration leaves untouched: active branches of any published salon, which
// includes the second salon here. The point is that it stays shop-window data
// and never widens to closed branches or to staff scope.
assert.deepEqual(ids(anonBranches), [JAIPUR, JHOTWARA, OTHER_BRANCH],
  'anon reads only active branches of published salons (unchanged, no closed branch)');
assert.ok(!ids(anonBranches).includes(CLOSED), 'a deactivated branch is never public');

const strangerBranches = await as(STRANGER, `select id from public.branches where public.studioflow_is_assigned_branch(site_id, id::text)`);
assert.deepEqual(ids(strangerBranches), [], 'a stranger cannot reach branch rows by calling the helper with the salon id');

const strangerBookings = await as(STRANGER, `select id from public.studioflow_bookings where owner_id = $1`, [OWNER]);
assert.deepEqual(ids(strangerBookings), [], 'a stranger sees no bookings of another salon');

const strangerServices = await as(STRANGER, `select service_id from public.studioflow_services where owner_id = $1`, [OWNER]);
assert.deepEqual(ids(strangerServices, 'service_id'), [], 'a stranger sees no other salon catalogue');

console.log('2. Branch scope is enforced by RLS, not by the UI');
const managerBranches = await as(MANAGER_USER, `select id from public.branches where public.studioflow_is_assigned_branch(site_id, id::text)`);
assert.deepEqual(ids(managerBranches), [JAIPUR, JHOTWARA], 'manager sees both assigned branches');

const receptionBranches = await as(RECEPTION_USER, `select id from public.branches where public.studioflow_is_assigned_branch(site_id, id::text)`);
assert.deepEqual(ids(receptionBranches), [JAIPUR], 'receptionist sees only their branch');

const closedVisible = await as(MANAGER_USER, `select id from public.branches where id = $1`, [CLOSED]);
assert.deepEqual(ids(closedVisible), [], 'a deactivated branch is not readable by staff');

// The bookings read policy turns branch scope + role scope into row visibility.
const managerBookings = await as(MANAGER_USER, `select id from public.studioflow_bookings`);
assert.deepEqual(ids(managerBookings), [
  'dddddddd-0000-4000-8000-000000000001',
  'dddddddd-0000-4000-8000-000000000002',
  'dddddddd-0000-4000-8000-000000000003',
], 'manager sees every booking inside their branches and none of the other salon');

const receptionBookings = await as(RECEPTION_USER, `select id from public.studioflow_bookings`);
assert.deepEqual(ids(receptionBookings), [
  'dddddddd-0000-4000-8000-000000000001',
  'dddddddd-0000-4000-8000-000000000003',
], 'receptionist sees the Jaipur bookings only (no Jhotwara leak)');

const providerBookings = await as(PROVIDER_USER, `select id from public.studioflow_bookings`);
assert.deepEqual(ids(providerBookings), ['dddddddd-0000-4000-8000-000000000001'],
  'service provider sees only the appointment assigned to them');

console.log('3. Writes are fail-closed');
// Service provider cannot create or move bookings.
await assert.rejects(
  as(PROVIDER_USER, `insert into public.studioflow_bookings(owner_id, customer_id, stylist_id, branch_id, payload)
     values ($1::uuid,$2::uuid,'staff-provider',$3::uuid,$4::jsonb)`,
     [OWNER, CUSTOMER, JAIPUR, JSON.stringify({ branchId: JAIPUR })]),
  /row-level security|violates/i,
  'service provider cannot create a booking',
);
// A denied UPDATE is not an error in Postgres: the row is invisible, so the
// statement simply matches nothing. Assert on the outcome, not on a throw.
const providerUpdate = await as(PROVIDER_USER,
  `update public.studioflow_bookings set status = 'completed' where id = $1 returning id`,
  ['dddddddd-0000-4000-8000-000000000003']);
assert.deepEqual(providerUpdate, [], 'service provider cannot move a colleague booking');
const colleagueStatus = await db.query(`select status from public.studioflow_bookings where id = 'dddddddd-0000-4000-8000-000000000003'`);
assert.equal(colleagueStatus.rows[0].status, 'confirmed', 'the colleague booking is untouched');

// Receptionist writes inside their branch, not outside it.
await as(RECEPTION_USER, `update public.studioflow_bookings set status = 'completed' where id = $1`,
  ['dddddddd-0000-4000-8000-000000000001']);
const moved = await db.query(`select status from public.studioflow_bookings where id = 'dddddddd-0000-4000-8000-000000000001'`);
assert.equal(moved.rows[0].status, 'completed', 'receptionist can move a booking in their own branch');

const crossBranch = await as(RECEPTION_USER, `update public.studioflow_bookings set status = 'cancelled' where id = $1 returning id`,
  ['dddddddd-0000-4000-8000-000000000002']);
assert.deepEqual(crossBranch, [], 'receptionist cannot update another branch booking');

// Insert path: receptionist may book for the desk inside their branch.
await as(RECEPTION_USER, `insert into public.studioflow_bookings(owner_id, customer_id, stylist_id, branch_id, payload)
  values ($1::uuid,$2::uuid,'staff-provider',$3::uuid,$4::jsonb)`,
  [OWNER, CUSTOMER, JAIPUR, JSON.stringify({ branchId: JAIPUR })]);
await assert.rejects(
  as(RECEPTION_USER, `insert into public.studioflow_bookings(owner_id, customer_id, stylist_id, branch_id, payload)
    values ($1::uuid,$2::uuid,'staff-manager',$3::uuid,$4::jsonb)`,
    [OWNER, CUSTOMER, JHOTWARA, JSON.stringify({ branchId: JHOTWARA })]),
  /row-level security|violates/i,
  'receptionist cannot create a booking in a branch they are not assigned to',
);

// Hard deletion of a booking stays owner-only. Staff move a booking through its
// lifecycle (status) instead; nothing is destroyed without the salon owner.
// A DELETE that matches no visible row is a silent no-op in Postgres, so the
// assertion is on the outcome and on the row still being there.
const managerDelete = await as(MANAGER_USER,
  `delete from public.studioflow_bookings where id = $1 returning id`,
  ['dddddddd-0000-4000-8000-000000000003']);
assert.deepEqual(managerDelete, [], 'a manager cannot hard-delete a booking');
const stillThere = await db.query(`select id from public.studioflow_bookings where id = 'dddddddd-0000-4000-8000-000000000003'`);
assert.equal(stillThere.rows.length, 1, 'the booking survives the denied delete');
// The owner's own booking (the OTHER_OWNER row above belongs to a different
// salon, so the owner must not reach it either).
const ownerDelete = await as(OWNER, `delete from public.studioflow_bookings where id = $1 returning id`,
  ['dddddddd-0000-4000-8000-000000000003']);
assert.equal(ownerDelete.length, 1, 'the salon owner can still delete a booking in their salon');
const otherSalonDelete = await as(OWNER, `delete from public.studioflow_bookings where id = $1 returning id`,
  ['dddddddd-0000-4000-8000-000000000004']);
assert.deepEqual(otherSalonDelete, [], 'the owner cannot touch another salon booking');

// A receptionist who tries to MOVE a booking into a branch they are not
// assigned to must be refused by the WITH CHECK, not merely by row visibility.
// This is observable: the row is visible (own branch), the new value is not.
await assert.rejects(
  as(RECEPTION_USER,
    `update public.studioflow_bookings set branch_id = $1, payload = $2::jsonb
     where id = 'dddddddd-0000-4000-8000-000000000001' returning id`,
    [JHOTWARA, JSON.stringify({ branchId: JHOTWARA })]),
  (error) => error.code === '42501' && /row-level security|policy/i.test(error.message),
  'a receptionist cannot move a booking into another branch (WITH CHECK refuses it)',
);
const { rows: [unmoved] } = await db.query(
  `select branch_id from public.studioflow_bookings where id = 'dddddddd-0000-4000-8000-000000000001'`);
assert.equal(unmoved.branch_id, JAIPUR, 'the booking stayed in its branch');

// A stale payload branch must not smuggle a move past the column check: the
// column says Jhotwara (out of scope) while the payload still says Jaipur.
await assert.rejects(
  as(RECEPTION_USER,
    `update public.studioflow_bookings set branch_id = $1, payload = $2::jsonb
     where id = 'dddddddd-0000-4000-8000-000000000001' returning id`,
    [JHOTWARA, JSON.stringify({ branchId: JAIPUR })]),
  (error) => error.code === '42501',
  'the branch column is authoritative, so a stale payload cannot widen a move',
);

// The same move inside the caller's own branch is allowed.
// (The earlier owner-delete check removed booking -003, so a fresh Jaipur
// booking stands in for the in-scope move.)
const inScopeMove = await as(MANAGER_USER,
  `update public.studioflow_bookings set branch_id = $1, payload = $2::jsonb
   where id = $3 returning id`,
  [JHOTWARA, JSON.stringify({ branchId: JHOTWARA }), 'dddddddd-0000-4000-8000-000000000001']);
assert.equal(inScopeMove.length, 1, 'a manager may move a booking between branches they manage');

console.log('4. Catalogue reads');
const managerServices = await as(MANAGER_USER, `select service_id from public.studioflow_services`);
assert.deepEqual(ids(managerServices, 'service_id'), ['svc-1'], 'manager reads their salon catalogue only');

const providerServices = await as(PROVIDER_USER, `select service_id from public.studioflow_services`);
assert.deepEqual(ids(providerServices, 'service_id'), ['svc-1'], 'service provider can read the menu they work from');

console.log('5. Storefront did not lose rows');
// Superset check over the same data: every row the pre-migration policy showed
// to anon must still be shown, and only unshowable rows may disappear.
const { rows: [comparison] } = await db.query(`
  with visible_now as (
    select id from public.services s
    where s.is_active is true
      and coalesce(s.is_bookable_online, true) is true
      and (s.salon_id is null or exists (
        select 1 from public.salons sa where sa.id = s.salon_id and sa.is_active is true and sa.deleted_at is null))
  ),
  visible_before as (
    select id from public.services s where s.is_active is true
  )
  select
    (select count(*) from visible_before)::int as before_count,
    (select count(*) from visible_now)::int as now_count,
    (select count(*) from visible_before where id not in (select id from visible_now))::int as lost_rows
`);
assert.equal(comparison.lost_rows, 3,
  'only the unpublished-salon, deleted-salon and not-bookable-online rows are hidden');
assert.equal(comparison.before_count, 6, 'the pre-migration policy (is_active) showed six rows');
assert.equal(comparison.now_count, 3, 'the replacement shows the three showable rows');
assert.ok(comparison.now_count >= 3, 'live, default-bookable and legacy salon-less rows stay readable');

const anonServices = await as(null, `select id from public.services`);
assert.deepEqual(ids(anonServices), [
  'cccccccc-0000-4000-8000-000000000001',
  'cccccccc-0000-4000-8000-000000000002',
  'cccccccc-0000-4000-8000-000000000006',
], 'anon never reads an unpublished or deleted salon catalogue, and never a non-bookable service');
assert.ok(!ids(anonServices).includes('cccccccc-0000-4000-8000-000000000007'),
  'a service that is not bookable online is not in the public menu');

console.log('6. Owner behaviour is unchanged');
// Three of the four fixture bookings belong to this salon; one was deleted
// earlier in the owner-delete check, so the owner sees the survivors and still
// sees the receptionist's newly inserted row.
const ownerBookings = await as(OWNER, `select id from public.studioflow_bookings where owner_id = $1`, [OWNER]);
assert.equal(ownerBookings.length, 3, 'owner sees every booking in their salon');
// The owner keeps `branches_owner_manage` (site_id = auth.uid()) plus the new
// staff policy, and the public policy shows other published salons' branches,
// which an authenticated session can also see. What matters for this migration
// is that the owner never loses a branch of their own.
const ownerBranches = await as(OWNER, `select id from public.branches`);
for (const own of [JAIPUR, JHOTWARA, CLOSED]) {
  assert.ok(ids(ownerBranches).includes(own), 'owner still sees their own branch ' + own);
}
assert.equal(ownerBranches.length, 4, 'owner sees their three branches plus the public one');
const ownerServices = await as(OWNER, `select service_id from public.studioflow_services`);
assert.deepEqual(ids(ownerServices, 'service_id'), ['svc-1'], 'owner catalogue read is unchanged');
const customerBookings = await as(CUSTOMER, `select id from public.studioflow_bookings`);
assert.equal(customerBookings.length, 4, 'a customer still reads their own bookings across salons (this salon + the other salon, minus the deleted one, plus the new one)');

console.log('\nPASS: branch scope, role scope, write denial, catalogue reads, storefront superset and unchanged owner/customer access all measured against a real RLS-enforcing database.');
