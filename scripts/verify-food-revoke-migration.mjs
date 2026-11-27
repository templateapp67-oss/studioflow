// Offline execution test for the release-pending migration
//   supabase/migrations/20261126130000_revoke_nexora_food_super_admin_bootstrap.sql
//
// PGlite stands in for Postgres (single connection, not concurrent sessions).
// The schema below mirrors only what the migration touches:
//   auth.users, public.nexora_food_app_role, public.nexora_food_user_roles,
//   public.nexora_food_admin_audit_logs.
// The exact migration file is executed, unmodified. No live database is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const MIGRATION = 'supabase/migrations/20261126130000_revoke_nexora_food_super_admin_bootstrap.sql';
const sql = readFileSync(MIGRATION, 'utf8');

const SCHEMA = `
  create schema auth;
  create table auth.users(
    id uuid primary key default gen_random_uuid(),
    email text,
    email_confirmed_at timestamptz
  );
  create type public.nexora_food_app_role as enum
    ('customer','restaurant_owner','restaurant_staff','rider','support','admin','super_admin');
  create table public.nexora_food_user_roles(
    user_id uuid not null references auth.users(id) on delete cascade,
    role public.nexora_food_app_role not null,
    created_at timestamptz not null default now(),
    primary key (user_id, role)
  );
  create table public.nexora_food_admin_audit_logs(
    id uuid primary key default gen_random_uuid(),
    actor_id uuid not null,
    action text not null,
    entity text not null,
    entity_id text,
    before jsonb,
    after jsonb,
    reason text not null,
    created_at timestamptz default now()
  );
`;

// The account is seeded with mixed case on purpose: the grant in the applied
// bootstrap migration matched on lower(email), so the revoke must too.
const BOOTSTRAP_EMAIL = 'TemplateApp67@Gmail.com';
const OTHER_EMAIL = 'some-other-admin@example.com';

async function makeDb({ seedBootstrapAccount = true, seedGrant = true } = {}) {
  const db = new PGlite();
  await db.exec(SCHEMA);
  if (seedBootstrapAccount) {
    await db.exec(`insert into auth.users(email, email_confirmed_at) values ('${BOOTSTRAP_EMAIL}', now())`);
    await db.exec(`insert into public.nexora_food_user_roles(user_id, role)
      select id, 'customer' from auth.users where lower(email) = 'templateapp67@gmail.com'`);
  }
  // An unrelated super_admin must survive the revoke untouched.
  await db.exec(`insert into auth.users(email, email_confirmed_at) values ('${OTHER_EMAIL}', now())`);
  await db.exec(`insert into public.nexora_food_user_roles(user_id, role)
    select id, 'customer' from auth.users where lower(email) = 'some-other-admin@example.com'`);
  await db.exec(`insert into public.nexora_food_user_roles(user_id, role)
    select id, 'super_admin' from auth.users where lower(email) = 'some-other-admin@example.com'`);
  if (seedGrant) {
    await db.exec(`insert into public.nexora_food_user_roles(user_id, role)
      select id, 'super_admin' from auth.users where lower(email) = 'templateapp67@gmail.com'`);
  }
  return db;
}

const rolesOf = async (db, email) =>
  (await db.query(
    `select role::text as role from public.nexora_food_user_roles r
       join auth.users u on u.id = r.user_id
      where lower(u.email) = $1 order by 1`, [email.toLowerCase()])).rows.map((row) => row.role);

/* --- 1. The grant is revoked; customer and unrelated super_admin survive --- */
let db = await makeDb({ seedGrant: true });
assert.deepEqual(await rolesOf(db, BOOTSTRAP_EMAIL), ['customer', 'super_admin'], 'precondition: bootstrap account holds the granted roles');

await db.exec(sql);
assert.deepEqual(await rolesOf(db, BOOTSTRAP_EMAIL), ['customer'], 'the revoke removes exactly the super_admin role');
assert.deepEqual(await rolesOf(db, OTHER_EMAIL), ['customer', 'super_admin'], 'an unrelated super_admin keeps their role');

const audit = (await db.query('select actor_id, action, entity, entity_id, before, after, reason from public.nexora_food_admin_audit_logs')).rows;
assert.equal(audit.length, 1, 'exactly one compensating audit entry is written');
assert.equal(audit[0].action, 'revoke-super-admin-bootstrap');
assert.equal(audit[0].entity, 'nexora_food_user_roles');
assert.equal(audit[0].before?.role, 'super_admin', 'the audit entry records the revoked role');
assert.ok(String(audit[0].reason).includes('super_admin'), 'the audit reason names the revoked role');
assert.ok(!String(audit[0].reason).includes('@'), 'the audit reason does not copy the personal address');
const bootstrapId = (await db.query('select id from auth.users where lower(email) = $1', ['templateapp67@gmail.com'])).rows[0].id;
assert.equal(audit[0].actor_id, bootstrapId, 'the audit entry references the account whose role was revoked');

/* --- 2. Idempotency: a second run deletes nothing and logs nothing --------- */
await db.exec(sql);
assert.deepEqual(await rolesOf(db, BOOTSTRAP_EMAIL), ['customer'], 'a re-run keeps the account at customer');
const auditCount = (await db.query('select count(*)::int as n from public.nexora_food_admin_audit_logs')).rows[0].n;
assert.equal(auditCount, 1, 'a re-run writes no additional audit entry');

/* --- 3. No grant present: no error, no audit entry ------------------------- */
db = await makeDb({ seedGrant: false });
await db.exec(sql); // must not throw
assert.deepEqual(await rolesOf(db, BOOTSTRAP_EMAIL), ['customer']);
assert.equal((await db.query('select count(*)::int as n from public.nexora_food_admin_audit_logs')).rows[0].n, 0);

/* --- 4. Account absent entirely: no error, no audit entry ------------------ */
db = await makeDb({ seedBootstrapAccount: false, seedGrant: false });
await db.exec(sql); // must not throw
assert.deepEqual(await rolesOf(db, OTHER_EMAIL), ['customer', 'super_admin']);
assert.equal((await db.query('select count(*)::int as n from public.nexora_food_admin_audit_logs')).rows[0].n, 0);

console.log('PASS: revoke migration deletes exactly the bootstrap super_admin grant, keeps the customer role and unrelated super_admins, writes one compensating audit entry only when a row is removed, and is idempotent across re-runs and no-op states.');
