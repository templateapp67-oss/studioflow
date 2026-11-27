// MFA recovery-code client ↔ database round trip.
//
// Proves the real browser-side generator and SQL contract agree end to end:
//
//   1. generateRecoveryCodes(8) output, fed through issuePayload(), satisfies
//      the SQL issue RPC contract (32-hex salt, 64-hex SHA-256, ≤8 entries).
//   2. Issue at AAL1 is rejected (42501) — only an authenticator-verified
//      session may enroll backup codes.
//   3. Issue at AAL2 stores the batch; studioflow_mfa_recovery_codes_count()
//      returns 8.
//   4. Consuming a single code (service_role path) yields consumed:true and
//      drops the count to 7 — the atomic single-use spend.
//   5. Re-issuing (AAL2) atomically replaces every unconsumed code: the old
//      code now fails with reason 'invalid', the count is 8 again, and a code
//      from the new batch consumes successfully.
//   6. Per-entry hash parity: every browser-computed hash equals the SQL
//      digest of salt || ':' || normalized code (real SHA-256 via pgcrypto).
//
// Standalone PGlite harness mirroring verify-mfa-recovery-hardening.mjs.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { build } from 'esbuild';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const MFA_MIGRATION = 'supabase/migrations/20261126143000_studioflow_mfa_recovery_codes.sql';
const AUDIT_MIGRATION = 'supabase/migrations/20261127130000_mfa_recovery_audit_log.sql';
const SHARED_LIMITER = 'supabase/migrations/20261117061129_studioflow_shared_edge_rate_limits.sql';

/* --------------------------- 1. client module --------------------------- */
const bundleDir = join('node_modules', '.cache', 'verify-recovery-roundtrip');
mkdirSync(bundleDir, { recursive: true });
const result = await build({
  entryPoints: ['src/lib/recoveryCodes.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  write: false,
  logLevel: 'silent',
});
const bundleTarget = join(bundleDir, `recoveryCodes-${Date.now()}.mjs`);
const { writeFileSync } = await import('node:fs');
writeFileSync(bundleTarget, result.outputFiles[0].text);
const client = await import(pathToFileURL(join(process.cwd(), bundleTarget)).href);
assert.equal(typeof client.generateRecoveryCodes, 'function');
assert.equal(typeof client.issuePayload, 'function');
assert.equal(typeof client.normalizeRecoveryCode, 'function');

/* ----------------------- 2. offline Postgres (PGlite) -------------------- */
const SCHEMA = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;
  create table auth.users(id uuid primary key default gen_random_uuid(), email text);
  create table auth.mfa_factors(user_id uuid, status text);
  create schema extensions;
  create schema studioflow_private;
  create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)$$;
  create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid$$;
  create or replace function studioflow_private.mfa_session_allowed() returns boolean language sql stable as $$select true$$;
`;
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(SCHEMA);
// Real SHA-256 (the client hashes with WebCrypto) — required for hash parity.
await db.exec('create extension pgcrypto with schema extensions;');
await db.exec(readFileSync(SHARED_LIMITER, 'utf8'));
await db.exec(readFileSync(MFA_MIGRATION, 'utf8'));
await db.exec(readFileSync(AUDIT_MIGRATION, 'utf8'));

const U = (await db.query("insert into auth.users(email) values ('roundtrip@example.test') returning id")).rows[0].id;
const setSession = async (role, aal) => {
  await db.exec('reset role;');
  await db.exec(`set role ${role};`);
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub: U, aal, role, email: 'roundtrip@example.test' }),
  ]);
};
const issue = async (payload) =>
  (await db.query('select public.studioflow_mfa_recovery_codes_issue($1::jsonb) as n', [JSON.stringify(payload)])).rows[0].n;
const count = async () =>
  (await db.query('select public.studioflow_mfa_recovery_codes_count() as n')).rows[0].n;
const consume = async (code) =>
  (await db.query('select public.studioflow_mfa_recovery_codes_consume($1, $2) as result', [U, client.normalizeRecoveryCode(code)])).rows[0].result;

/* ------------------- 3. AAL1 issue is rejected outright ------------------ */
await setSession('authenticated', 'aal1');
const firstBatch = await client.generateRecoveryCodes(8);
const firstPayload = client.issuePayload(firstBatch);
assert.equal(firstPayload.length, 8);
for (const entry of firstPayload) {
  assert.match(entry.salt, /^[0-9a-f]{32}$/);
  assert.match(entry.code_hash, /^[0-9a-f]{64}$/);
}
await assert.rejects(() => issue(firstPayload), /authenticator/i, 'issue at AAL1 must be rejected');

/* --------------------- 4. AAL2 issue → count → consume ------------------- */
await setSession('authenticated', 'aal2');
assert.equal(await issue(firstPayload), 8, 'issue at AAL2 stores the batch');
assert.equal(await count(), 8, 'count reflects the issued batch');

await setSession('service_role', 'aal1'); // service role consume path (AAL1-safe by design)
const consumed = await consume(firstBatch[2].code);
assert.equal(consumed.consumed, true, 'a valid code consumes to true');

await setSession('authenticated', 'aal2');
assert.equal(await count(), 7, 'the consumed code is gone from the remaining count');

/* ------------- 5. re-issue atomically replaces unconsumed codes ---------- */
const secondBatch = await client.generateRecoveryCodes(8);
const secondPayload = client.issuePayload(secondBatch);
assert.equal(await issue(secondPayload), 8, 're-issue at AAL2 stores a fresh batch');
assert.equal(await count(), 8, 'count is 8 after re-issue');

await setSession('service_role', 'aal1');
const oldCode = await consume(firstBatch[5].code);
assert.equal(oldCode.consumed, false, 'codes from the previous batch must be invalid after re-issue');
assert.equal(oldCode.reason, 'invalid');
const oldConsumed = await consume(firstBatch[2].code);
assert.equal(oldConsumed.consumed, false, 'an already-spent code of the old batch stays spent');
const newCode = await consume(secondBatch[0].code);
assert.equal(newCode.consumed, true, 'a code from the new batch consumes successfully');

/* ----------------------- 6. per-entry hash parity ------------------------ */
await db.exec('reset role;'); // parity probe runs as the schema owner
for (const entry of [...firstBatch, ...secondBatch]) {
  const normalized = client.normalizeRecoveryCode(entry.code);
  const { rows } = await db.query(
    "select encode(extensions.digest($1 || ':' || $2, 'sha256'), 'hex') as hash",
    [entry.salt, normalized],
  );
  assert.equal(rows[0].hash, entry.hash, 'browser hash must equal the SQL digest of salt:normalized');
}

/* ----------- 7. static wiring: the re-issue confirmation gate exists ------ */
{
  const account = readFileSync('src/components/AccountSecurityPage.tsx', 'utf8');
  assert.ok(account.includes('role="alertdialog"'), 'the re-issue confirmation dialog is present');
  assert.ok(account.includes('setConfirming(true)'), 'regeneration is gated by a confirmation step');
  assert.ok(account.includes('remaining ? setConfirming(true) : void issue()'), 'a first-ever batch issues without the extra step; a re-issue requires confirmation');
  assert.ok(account.includes('Replace all unused codes?'), 'the dialog warns that unused codes will be invalidated');
  const mfa = readFileSync('src/components/AuthMfa.tsx', 'utf8');
  assert.match(mfa, /maxLength=\{48\}/, 'the recovery-code input caps transport at 48 chars');
  assert.match(mfa, /autoComplete="one-time-code"/, 'consume input keeps one-time-code semantics');
}

await db.exec('reset role;');
console.log('PASS: recovery round trip — browser generate → AAL1 issue rejected → AAL2 issue → count 8 → single-use consume → count 7 → atomic re-issue (old batch dead, new batch works) → SQL/browser SHA-256 parity → re-issue confirmation gate pinned in the UI.');
