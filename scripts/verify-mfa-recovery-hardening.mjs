// MFA recovery hardening — audit log + per-IP throttle.
//
// Complements verify-rate-limit-mfa.mjs (issue/count/consume privilege levels,
// AAL2 gates, hashing parity) and verify-landing-lead-edge-runtime.mjs. This
// suite proves the 2026-11-27 gap fixes end to end:
//
//   1. public.studioflow_mfa_recovery_audit: exists, RLS on, no client-role
//      grants (service_role included), rows are written with outcome only —
//      never code material — and only for attempts that passed the
//      per-account throttle.
//   2. studioflow_mfa_recovery_codes_consume(): wrong code → invalid + one
//      'invalid' audit row; 10 wrong attempts exhaust the budget → the 11th
//      call (even with the right code) returns throttled + one 'throttled'
//      audit row; the atomic single-use spend is preserved; audit writes do
//      not leak which codes exist beyond the outcome.
//   3. prune_studioflow_mfa_recovery_audit() removes rows older than 90 days.
//   4. The Node/Vercel recovery handler claims a per-IP budget BEFORE any
//      database work: an exhausted budget → 429 + Retry-After and no consume
//      RPC; a configured-but-unreachable store → 503 (fail closed); both
//      mounts share the one handler that enforces it.
//   5. recoveryClientIp(): Vercel honours only x-vercel-forwarded-for; Express
//      honours req.ip; spoofed X-Forwarded-For is ignored; garbage → 'unknown'.
//
// PGlite stands in for Postgres (single connection, not concurrent sessions).
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';
import { PGlite } from '@electric-sql/pglite';

const AUDIT_MIGRATION = 'supabase/migrations/20261127130000_mfa_recovery_audit_log.sql';
const MFA_MIGRATION = 'supabase/migrations/20261126143000_studioflow_mfa_recovery_codes.sql';
const SHARED_LIMITER = 'supabase/migrations/20261117061129_studioflow_shared_edge_rate_limits.sql';

/* --------------------------------------- 1+2+3. database, via PGlite ----- */
const SCHEMA = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;
  create table auth.users(id uuid primary key default gen_random_uuid(), email text);
  create table auth.mfa_factors(user_id uuid, status text);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
  create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)$$;
  create schema extensions;
  create function extensions.digest(data text, algo text) returns bytea language sql as $$select decode(md5(data) || md5(data || '#'), 'hex')$$;
  create schema studioflow_private;
  create or replace function studioflow_private.mfa_session_allowed() returns boolean language sql stable as $$select true$$;
`;

const db = new PGlite();
await db.exec(SCHEMA);
await db.exec(readFileSync(SHARED_LIMITER, 'utf8'));
await db.exec(readFileSync(MFA_MIGRATION, 'utf8'));
await db.exec(readFileSync(AUDIT_MIGRATION, 'utf8'));

const U1 = (await db.query("insert into auth.users(email) values ('u1-audit@example.test') returning id")).rows[0].id;
const U3 = (await db.query("insert into auth.users(email) values ('u3-throttle@example.test') returning id")).rows[0].id;
const VALID_CODE = 'ABCD1234EFGH5678';
const SALT = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

const insertCode = async (userId, code, salt = SALT) =>
  db.query(
    `insert into public.studioflow_mfa_recovery_codes(user_id, salt, code_hash)
     values ($1, $2, encode(extensions.digest($2 || ':' || $3, 'sha256'), 'hex'))`,
    [userId, salt, code]);
const consume = async (userId, code) =>
  (await db.query('select public.studioflow_mfa_recovery_codes_consume($1, $2) as result', [userId, code])).rows[0].result;
const auditOutcomes = async (userId) =>
  (await db.query('select outcome from public.studioflow_mfa_recovery_audit where user_id = $1 order by created_at, id', [userId])).rows.map((row) => row.outcome);
const auditRowCount = async () => (await db.query('select count(*)::int as n from public.studioflow_mfa_recovery_audit')).rows[0].n;

await insertCode(U1, VALID_CODE);

/* --- wrong code: invalid + exactly one audit row ------------------------ */
const wrong1 = await consume(U1, 'ZZZZ9999YYYY8888');
assert.equal(wrong1.consumed, false);
assert.equal(wrong1.reason, 'invalid');
assert.deepEqual(await auditOutcomes(U1), ['invalid'], 'a wrong code is audited as invalid');

/* --- correct code: single-use spend preserved + audited ------------------ */
const ok = await consume(U1, VALID_CODE);
assert.equal(ok.consumed, true);
assert.equal(ok.recoveryWindowSeconds, 600);
const spentRow = (await db.query('select consumed_at from public.studioflow_mfa_recovery_codes where user_id = $1', [U1])).rows[0];
assert.ok(spentRow.consumed_at, 'the spend flips consumed_at atomically');
assert.deepEqual(await auditOutcomes(U1), ['invalid', 'consumed']);

/* --- the same code again: invalid, never a second spend ------------------ */
const replay = await consume(U1, VALID_CODE);
assert.equal(replay.consumed, false);
assert.equal(replay.reason, 'invalid');
assert.deepEqual(await auditOutcomes(U1), ['invalid', 'consumed', 'invalid']);

/* --- per-account budget: 10 attempts, the 11th is throttled -------------- */
await insertCode(U3, VALID_CODE);
for (let i = 0; i < 10; i += 1) {
  const attempt = await consume(U3, 'ZZZZ9999YYYY8888');
  assert.equal(attempt.reason, 'invalid', `attempt ${i + 1} is a plain invalid`);
}
const throttled = await consume(U3, VALID_CODE); // even the correct code now
assert.equal(throttled.reason, 'throttled');
assert.equal(throttled.consumed, false);
assert.ok(throttled.retryAfterSeconds >= 1, 'throttled callers get a positive retryAfterSeconds');
const u3Audit = await auditOutcomes(U3);
assert.equal(u3Audit.filter((o) => o === 'invalid').length, 10, 'each pre-throttle failure is audited');
assert.equal(u3Audit.filter((o) => o === 'throttled').length >= 1, true, 'the throttled outcome is audited');
const u3Spend = (await db.query('select count(*)::int as n from public.studioflow_mfa_recovery_codes where user_id = $1 and consumed_at is null', [U3])).rows[0].n;
assert.equal(u3Spend, 1, 'a throttled correct code is NOT spent');

/* --- audit table privileges: no client role, not even service_role ------- */
const privs = (await db.query(`
  select has_table_privilege('anon', 'public.studioflow_mfa_recovery_audit', 'select') as anon_sel,
         has_table_privilege('authenticated', 'public.studioflow_mfa_recovery_audit', 'select') as auth_sel,
         has_table_privilege('service_role', 'public.studioflow_mfa_recovery_audit', 'select') as svc_sel,
         (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'studioflow_mfa_recovery_audit') as rls
`)).rows[0];
assert.equal(privs.anon_sel, false);
assert.equal(privs.auth_sel, false);
assert.equal(privs.svc_sel, false, 'the audit table is write-only through the RPC');
assert.equal(privs.rls, true);

/* --- audit rows carry no code material ------------------------------------ */
const auditText = JSON.stringify((await db.query('select user_id, outcome from public.studioflow_mfa_recovery_audit')).rows);
assert.ok(!auditText.includes(VALID_CODE), 'the submitted code never reaches the audit table');
assert.ok(!auditText.includes(SALT), 'the salt never reaches the audit table');

/* --- consume RPC grants: service_role only -------------------------------- */
const fnPrivs = (await db.query(`
  select has_function_privilege('service_role', 'public.studioflow_mfa_recovery_codes_consume(uuid, text)', 'execute') as svc,
         has_function_privilege('authenticated', 'public.studioflow_mfa_recovery_codes_consume(uuid, text)', 'execute') as auth,
         has_function_privilege('anon', 'public.studioflow_mfa_recovery_codes_consume(uuid, text)', 'execute') as anon
`)).rows[0];
assert.deepEqual([fnPrivs.svc, fnPrivs.auth, fnPrivs.anon], [true, false, false]);

/* --- pre-throttle garbage writes no audit rows ------------------------------ */
const U2 = (await db.query("insert into auth.users(email) values ('u2-garbage@example.test') returning id")).rows[0].id;
const garbage = await consume(U2, 'short');
assert.equal(garbage.reason, 'invalid');
assert.equal((await auditOutcomes(U2)).length, 0, 'garbage input never grows the audit table');

/* --- prune removes only rows older than 90 days ---------------------------- */
await db.query("insert into public.studioflow_mfa_recovery_audit(user_id, outcome, created_at) values ($1, 'invalid', now() - interval '100 days')", [U1]);
await db.query("insert into public.studioflow_mfa_recovery_audit(user_id, outcome, created_at) values ($1, 'invalid', now() - interval '1 day')", [U1]);
const pruned = (await db.query('select public.prune_studioflow_mfa_recovery_audit() as n')).rows[0].n;
assert.ok(pruned >= 1, 'the 90-day prune removes aged rows');
const recentKept = (await db.query("select count(*)::int as n from public.studioflow_mfa_recovery_audit where created_at > now() - interval '90 days'")).rows[0].n;
assert.ok(recentKept >= 1, 'recent rows survive the prune');

/* --- idempotent re-apply of the release-pending migration ------------------ */
const auditBefore = await auditRowCount();
await db.exec(readFileSync(AUDIT_MIGRATION, 'utf8'));
assert.equal(await auditRowCount(), auditBefore, 're-applying the audit migration changes no data');
await db.close();
console.log('PASS (database): consume writes outcome-only audit rows after the per-account throttle, the atomic single-use spend is preserved, throttled callers do not spend codes, the audit table is RLS-closed to every client role, the prune helper ages out rows, and the release-pending migration re-applies cleanly.');

/* ---------------------- 4+5. Node/Vercel handler: per-IP budget ---------- */
const bundleDir = join('node_modules', '.cache', 'verify-mfa-recovery-hardening');
mkdirSync(bundleDir, { recursive: true });
const loadModule = async (entry) => {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    write: false,
    logLevel: 'silent',
  });
  const target = join(bundleDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(target, result.outputFiles[0].text);
  return import(pathToFileURL(join(process.cwd(), target)).href);
};

const savedEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const aal1Token = `header.${b64url({ aal: 'aal1' })}.sig`;

const recovery = await loadModule('server/recoveryCodes.ts');
assert.equal(typeof recovery.recoveryClientIp, 'function', 'the IP identity helper is exported for review');
assert.equal(typeof recovery.claimLocalRecoveryIpBudget, 'function', 'the bounded dev fallback is exported for review');

/* --- recoveryClientIp: runtime-appropriate trust ------------------------- */
assert.equal(recovery.recoveryClientIp({ headers: { 'x-vercel-forwarded-for': '198.51.100.9, 10.0.0.1' } }, true), '198.51.100.9');
assert.equal(recovery.recoveryClientIp({ headers: { 'x-vercel-forwarded-for': '198.51.100.10' } }, false), 'unknown',
  'outside Vercel the forwarded header is ignored without req.ip');
assert.equal(recovery.recoveryClientIp({ ip: '203.0.113.9', headers: { 'x-forwarded-for': '192.0.2.1' } }, false), '203.0.113.9',
  'Express req.ip wins; the spoofable header is ignored');
assert.equal(recovery.recoveryClientIp({ socket: { remoteAddress: '::ffff:203.0.113.10' } }, false), '203.0.113.10');
assert.equal(recovery.recoveryClientIp({ ip: 'not-an-ip' }, false), 'unknown');
assert.equal(recovery.claimLocalRecoveryIpBudget('test-budget-identity').allowed, true);

/* --- handler behavior with a configured shared store ---------------------- */
function makeRes() {
  const state = { status: 200, body: null, headers: {} };
  const res = {
    status(code) { state.status = code; return this; },
    json(payload) { state.body = payload; return this; },
    setHeader(name, value) { state.headers[name.toLowerCase()] = String(value); },
  };
  return { res, state };
}
const makeReq = (ip, token = aal1Token) => ({
  method: 'POST',
  ip,
  socket: { remoteAddress: ip },
  headers: { authorization: `Bearer ${token}` },
  body: { code: 'ABCD-1234-EFGH-5678' },
});

const configure = () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  delete process.env.VERCEL;
  delete process.env.STUDIOFLOW_DISABLE_DISTRIBUTED_RATE_LIMIT;
};
configure();

let fetchPlan, fetchLog;
const installFetch = () => {
  fetchLog = [];
  globalThis.fetch = async (url, init) => {
    const target = String(url);
    fetchLog.push(target);
    if (target.includes('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: `user-${ipBucketCounter++}`, role: 'authenticated', factors: [] }),
        { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (target.endsWith('/rest/v1/rpc/studioflow_edge_rate_limit_claim')) {
      const body = JSON.parse(init.body);
      assert.match(body.p_bucket_key, /^[0-9a-f]{64}$/, 'the per-IP bucket is an opaque digest');
      assert.ok(!body.p_bucket_key.includes('203.'), 'no raw IP reaches the store');
      assert.equal(body.p_window_seconds, 600);
      assert.equal(body.p_max_attempts, 30);
      return fetchPlan.claim(body);
    }
    if (target.endsWith('/rest/v1/rpc/studioflow_mfa_recovery_codes_consume')) {
      return fetchPlan.consume();
    }
    throw new Error(`unexpected fetch: ${target}`);
  };
};
let ipBucketCounter = 1;

// a) budget allowed → consume RPC is reached and succeeds
configure();
fetchPlan = {
  claim: () => new Response(JSON.stringify({ allowed: true, remaining: 29, retryAfterSeconds: 600 }), { status: 200 }),
  consume: () => new Response(JSON.stringify({ consumed: true, recoveryWindowSeconds: 600 }), { status: 200 }),
};
installFetch();
{
  const { res, state } = makeRes();
  await recovery.recoveryConsumeHandler(makeReq('203.0.113.31'), res);
  assert.equal(state.status, 200);
  assert.equal(state.body.consumed, true);
  const claimAt = fetchLog.findIndex((url) => url.endsWith('studioflow_edge_rate_limit_claim'));
  const consumeAt = fetchLog.findIndex((url) => url.endsWith('studioflow_mfa_recovery_codes_consume'));
  assert.ok(claimAt !== -1 && consumeAt !== -1 && claimAt < consumeAt, 'the per-IP claim happens before any database work');
}

// b) budget exhausted → 429 + Retry-After, consume RPC never called
configure();
fetchPlan = {
  claim: () => new Response(JSON.stringify({ allowed: false, remaining: 0, retryAfterSeconds: 137 }), { status: 200 }),
  consume: () => { throw new Error('consume must not run when the IP budget is exhausted'); },
};
installFetch();
{
  const { res, state } = makeRes();
  await recovery.recoveryConsumeHandler(makeReq('203.0.113.32'), res);
  assert.equal(state.status, 429);
  assert.equal(state.body.code, 'rate_limited');
  assert.equal(state.headers['retry-after'], '137');
  assert.ok(!fetchLog.some((url) => url.endsWith('studioflow_mfa_recovery_codes_consume')));
}

// c) configured store unreachable → 503 fail closed, consume RPC never called
configure();
fetchPlan = {
  claim: () => { throw new Error('ECONNREFUSED'); },
  consume: () => { throw new Error('consume must not run when the limiter is down'); },
};
installFetch();
{
  const { res, state } = makeRes();
  await recovery.recoveryConsumeHandler(makeReq('203.0.113.33'), res);
  assert.equal(state.status, 503);
  assert.equal(state.headers['retry-after'], '30');
}

// d) unconfigured store → bounded per-process fallback still caps at 30
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SECRET_KEY;
process.env.SUPABASE_URL = 'https://example.supabase.co';
globalThis.fetch = async (url) => {
  const target = String(url);
  if (target.includes('/auth/v1/user')) {
    return new Response(JSON.stringify({ id: 'user-fallback', role: 'authenticated', factors: [] }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  // Any store/RPC call proves the fallback reached past the IP budget.
  throw new Error('the unconfigured fallback must not touch the network store');
};
{
  const fallbackIp = '203.0.113.99'; // unique so the local budget is fresh
  let lastState = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { res, state } = makeRes();
    await recovery.recoveryConsumeHandler(makeReq(fallbackIp), res);
    lastState = state;
    assert.notEqual(state.status, 429, `attempt ${attempt + 1} is still inside the budget`);
  }
  const { res, state } = makeRes();
  await recovery.recoveryConsumeHandler(makeReq(fallbackIp), res);
  assert.equal(state.status, 429, 'the 31st attempt from one address is refused');
}

globalThis.fetch = originalFetch;
for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
Object.assign(process.env, savedEnv);
console.log('PASS (handler): the per-IP budget is claimed before any database work, exhaustion answers 429 + Retry-After without calling consume, a configured-but-unreachable store fails closed with 503, the bounded fallback still caps the budget, bucket keys are opaque digests, and runtime-appropriate IP trust ignores spoofed X-Forwarded-For.');

/* --- both mounts share the one hardened handler --------------------------- */
{
  const expressMount = readFileSync('server.ts', 'utf8');
  assert.ok(expressMount.includes('app.post("/api/account/recovery-codes/consume"'), 'server mounts the consume route');
  const mountStart = expressMount.indexOf('app.post("/api/account/recovery-codes/consume"');
  assert.ok(expressMount.slice(mountStart, mountStart + 400).includes('recoveryConsumeHandler'), 'the mount routes to the shared handler');
  const vercelEntry = readFileSync('api/account/[...action].ts', 'utf8');
  assert.match(vercelEntry, /recoveryConsumeHandler/);
  const handlerSource = readFileSync('server/recoveryCodes.ts', 'utf8');
  assert.match(handlerSource, /claimDistributedRateLimit\(/, 'the handler itself claims the per-IP budget');
  assert.match(handlerSource, /hashBucketKey\('mfa-recovery-ip'/);
}
console.log('PASS (wiring): the Express mount and the Vercel function both route to the one handler that enforces the per-IP budget.');
