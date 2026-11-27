// Offline execution test for the release-pending migration
//   supabase/migrations/20261127120000_revoke_app_admin_bootstrap_allowlist.sql
//
// The exact historical bootstrap migration 20260928013304 is executed
// UNMODIFIED first, so the test proves the guard actually disarms what the
// bootstrap installed — seeded allowlist entry, security-definer trigger,
// security-definer function, standing app_admins grant, and a live
// is_my_app_admin() probe through the stubbed auth.uid().
//
// PGlite stands in for Postgres (single connection, not concurrent sessions).
// Schema mirrors only what the migrations touch:
//   auth.users, auth.uid(), public.profiles, public.app_admins,
//   public.admin_email_allowlist. PGlite is not a concurrency oracle.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const BOOTSTRAP = 'supabase/migrations/20260928013304_nexora_admin_bootstrap_allowlist_20260928.sql';
const REVOKE = 'supabase/migrations/20261127120000_revoke_app_admin_bootstrap_allowlist.sql';

const SCHEMA = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;
  create table auth.users(
    id uuid primary key default gen_random_uuid(),
    email text,
    email_confirmed_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create table public.profiles(id uuid primary key, email text);
`;

const BOOTSTRAP_EMAIL = 'TemplateApp67@Gmail.com';
const OTHER_EMAIL = 'operator-explicitly-granted@example.com';

async function makeDb({ applyBootstrap = true } = {}) {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await db.query(`insert into auth.users(email, email_confirmed_at) values ($1, now())`, [BOOTSTRAP_EMAIL]);
  await db.query(`insert into auth.users(email, email_confirmed_at) values ($1, now())`, [OTHER_EMAIL]);
  const bootstrapId = (await db.query('select id from auth.users where lower(email) = $1', ['templateapp67@gmail.com'])).rows[0].id;
  const otherId = (await db.query('select id from auth.users where lower(email) = $1', ['operator-explicitly-granted@example.com'])).rows[0].id;
  if (applyBootstrap) await db.exec(readFileSync(BOOTSTRAP, 'utf8'));
  // Profile inserts happen AFTER the bootstrap applied its trigger, which is
  // how the live environment acquired the standing grant: the trigger
  // auto-granted app_admins to the allowlisted address at insert time.
  await db.query('insert into public.profiles(id, email) values ($1, $2)', [bootstrapId, BOOTSTRAP_EMAIL]);
  await db.query('insert into public.profiles(id, email) values ($1, $2)', [otherId, OTHER_EMAIL]);
  // An unrelated, explicitly-granted admin must survive the revoke untouched.
  if (applyBootstrap) {
    await db.query('insert into public.app_admins(user_id) values ($1) on conflict do nothing', [otherId]);
  }
  return { db, bootstrapId, otherId };
}

const count = (db, table, where) =>
  db.query(`select count(*)::int as n from ${table}${where ? ' where ' + where : ''}`).then((r) => r.rows[0].n);
const triggerExists = (db) =>
  db.query(`select exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = 'profiles' and t.tgname = 'trg_profiles_assign_allowlisted_admin') as ok`).then((r) => r.rows[0].ok);
const functionExists = (db) =>
  db.query(`select exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'assign_allowlisted_admin') as ok`).then((r) => r.rows[0].ok);
const isAdminAs = async (db, sub) => {
  await db.query(`set request.jwt.claim.sub = '${sub}'`);
  const { rows } = await db.query('select public.is_my_app_admin() as ok');
  return rows[0].ok;
};

/* --- 1. Bootstrap really grants app_admin via the allowlist trigger -------- */
{
  const { db, bootstrapId, otherId } = await makeDb();
  assert.equal(await count(db, 'public.admin_email_allowlist'), 1, 'precondition: allowlist seeded');
  assert.equal(await triggerExists(db), true, 'precondition: auto-grant trigger installed');
  assert.equal(await functionExists(db), true, 'precondition: auto-grant function installed');
  assert.equal(await count(db, 'public.app_admins', `user_id = '${bootstrapId}'`), 1, 'precondition: bootstrap account was auto-granted app_admin by the trigger');
  assert.equal(await isAdminAs(db, bootstrapId), true, 'precondition: is_my_app_admin() true for the bootstrap account');
  await db.close();
}

/* --- 2. The revoke migration disarms everything it should ------------------- */
{
  const { db, bootstrapId, otherId } = await makeDb();
  await db.exec(readFileSync(REVOKE, 'utf8'));
  assert.equal(await count(db, 'public.admin_email_allowlist'), 0, 'allowlist entry removed');
  assert.equal(await count(db, 'public.app_admins', `user_id = '${bootstrapId}'`), 0, 'bootstrap app_admin grant removed');
  assert.equal(await count(db, 'public.app_admins', `user_id = '${otherId}'`), 1, 'unrelated explicitly-granted admin survives');
  assert.equal(await triggerExists(db), false, 'auto-grant trigger dropped');
  assert.equal(await functionExists(db), false, 'auto-grant function dropped');
  assert.equal(await isAdminAs(db, bootstrapId), false, 'is_my_app_admin() false for the bootstrap account');
  assert.equal(await isAdminAs(db, otherId), true, 'is_my_app_admin() true for the unrelated granted admin');
  const audit = (await db.query('select action, entity, entity_id, before from public.app_admin_audit_logs order by created_at, action')).rows;
  const actions = audit.map((row) => row.action).sort();
  assert.deepEqual(actions, ['disarm-admin-auto-grant-function', 'disarm-admin-auto-grant-trigger', 'revoke-admin-allowlist-bootstrap', 'revoke-app-admin-bootstrap'].sort(),
    'one audit row per removed object');
  const grantAudit = audit.find((row) => row.action === 'revoke-app-admin-bootstrap');
  assert.equal(grantAudit.entity_id, String(bootstrapId));
  assert.ok(!JSON.stringify(audit).includes('@'), 'audit rows must not embed personal email addresses');
  // A profile insert after the guard must NOT auto-grant anything.
  const insertId = (await db.query(`insert into public.profiles(id, email) values (gen_random_uuid(), $1) returning id`, [BOOTSTRAP_EMAIL])).rows[0].id;
  assert.equal(await count(db, 'public.app_admins', `user_id = '${insertId}'`), 0, 'profile insert can no longer auto-grant app_admins');
  await db.close();
}

/* --- 3. Idempotency: re-run writes nothing new ------------------------------ */
{
  const { db } = await makeDb();
  await db.exec(readFileSync(REVOKE, 'utf8'));
  const before = await count(db, 'public.app_admin_audit_logs');
  await db.exec(readFileSync(REVOKE, 'utf8'));
  assert.equal(await count(db, 'public.app_admin_audit_logs'), before, 'a re-run writes no additional audit rows');
  assert.equal(await count(db, 'public.admin_email_allowlist'), 0);
  assert.equal(await triggerExists(db), false);
  assert.equal(await functionExists(db), false);
  await db.close();
}

/* --- 4. No-op environment: bootstrap never applied --------------------------- */
{
  const { db } = await makeDb({ applyBootstrap: false });
  await db.exec(readFileSync(REVOKE, 'utf8')); // must not throw
  assert.equal(await count(db, 'public.app_admin_audit_logs'), 0, 'a clean environment produces no audit noise');
  await db.close();
}

console.log('PASS: admin bootstrap revoke migration disarms the allowlist auto-grant (entry removed, app_admins grant removed, trigger + function dropped), keeps explicitly-granted admins, writes one audit row per removed object with no personal addresses, profile inserts cannot re-grant, and is idempotent across re-runs and clean environments.');
