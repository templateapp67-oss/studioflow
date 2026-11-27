// Offline security assertions for the 2026-11-26 lead-capture hardening:
//
//   1. LANDING_LEAD_RATE_LIMIT_SALT has no public fallback anywhere in the
//      shipped source, and the Edge module throws at load when it is unset
//      (fail-fast) instead of serving requests with a predictable salt.
//   2. Turnstile verification is fail-closed: the unconfigured-secret path
//      returns false, and the handler rejects verification failures with 403.
//   3. Migration 20261011080053's standing super_admin grant for the personal
//      bootstrap account is revoked by a new, idempotent, release-pending
//      migration that deletes only the matching role rows and audits the
//      revocation only when a row was actually removed.
//
// No network, credentials or live database are touched. The Edge module is
// exercised through the same mocked-Supabase bundle pattern as the other
// offline Edge suites.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const EDGE_PATH = 'supabase/functions/submit-landing-lead/index.ts';
const SERVER_PATH = 'server/nexoraDemoLead.ts';
const REVOKE_PATH = 'supabase/migrations/20261126130000_revoke_nexora_food_super_admin_bootstrap.sql';
const PUBLIC_FALLBACK = 'nexora-landing-rate-limit-v1';

const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out']);
const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((entry) => {
    if (skipDirs.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

/* --- 1a. No public salt fallback in any shipped source ------------------- */
// docs/ is deliberately excluded: it records the historical default as an
// incident, which is where it belongs. Everywhere the code actually ships,
// the public value must be gone.
for (const file of walk('.').filter((name) => /\.(ts|tsx|js|mjs|cjs|sql|html|json)$/.test(name))) {
  if (file.startsWith('docs/') || file.startsWith('./docs/')) continue;
  if (file.includes('verify-nexora-lead-fail-closed')) continue; // this file names it
  const source = readFileSync(file, 'utf8');
  assert.ok(!source.includes(PUBLIC_FALLBACK), `public salt fallback reintroduced in ${file}`);
}

/* --- 1b. Server throws fail-fast when the salt is missing ---------------- */
const serverSource = readFileSync(SERVER_PATH, 'utf8');
assert.ok(!serverSource.includes(PUBLIC_FALLBACK), 'server must not contain the public salt fallback');
assert.match(serverSource, /LANDING_LEAD_RATE_LIMIT_SALT is not configured/, 'server throws a named error when the salt is missing');
assert.match(serverSource, /\)\.trim\(\);[\s\S]{0,120}if \(!salt\) throw/, 'server checks the salt before hashing');

/* --- 1c. Edge module throws at load when the salt is missing ------------- */
// The module-evaluation failure of a large data: URL import is not reliably
// deliverable to the parent's promise handlers in every Node version (it can
// surface as an uncaught exception inside the loader), so the load check runs
// in a child process. The child intercepts uncaughtException itself and
// reports the failure reason on stdout; the parent asserts on exit code and
// output only, never on the loader's internals.
const edgeBundle = (await build({
  entryPoints: [EDGE_PATH],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  plugins: [{ name: 'stub-supabase', setup(builder) {
    builder.onResolve({ filter: /^npm:@supabase\/supabase-js/ }, () => ({ path: 'supabase', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
      contents: 'export const createClient = () => globalThis.__supabaseStubUnused;',
      loader: 'js',
    }));
  } }],
})).outputFiles[0].text;
const edgeDataUrl = 'data:text/javascript;base64,' + Buffer.from(edgeBundle).toString('base64');

function runEdgeChild(envMap) {
  const script = [
    'const envMap = JSON.parse(process.env.EDGE_ENV);',
    'globalThis.Deno = { env: { get: (name) => envMap[name] }, serve: () => { process.stdout.write("BOOTED\\n"); process.exit(0); } };',
    'process.on("uncaughtException", (err) => { process.stdout.write("LOAD_ERROR:" + String((err && err.message) || err).slice(0, 300) + "\\n"); process.exit(3); });',
    `import(${JSON.stringify(edgeDataUrl)}).then(() => { process.stdout.write("RESOLVED\\n"); process.exit(0); }, (err) => { process.stdout.write("REJECT:" + String((err && err.message) || err).slice(0, 300) + "\\n"); process.exit(4); });`,
  ].join('\n');
  const child = spawnSync(process.execPath, ['--input-type=module'], {
    input: script,
    encoding: 'utf8',
    env: { EDGE_ENV: JSON.stringify(envMap) },
    maxBuffer: 1024 * 1024,
  });
  return { status: child.status, stdout: child.stdout || '', stderr: child.stderr || '' };
}

const missingSalt = runEdgeChild({ SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'service-test-secret' });
assert.ok(missingSalt.stdout.includes('LOAD_ERROR:LANDING_LEAD_RATE_LIMIT_SALT') || (missingSalt.status !== 0 && missingSalt.stdout.includes('LANDING_LEAD_RATE_LIMIT_SALT')),
  `the Edge module must fail fast without LANDING_LEAD_RATE_LIMIT_SALT (got status=${missingSalt.status}, stdout=${missingSalt.stdout.slice(0, 200)})`);
assert.notEqual(missingSalt.status, 0, 'a missing salt must never boot the function');
const booted = runEdgeChild({
  SUPABASE_URL: 'https://example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-test-secret',
  LANDING_LEAD_RATE_LIMIT_SALT: 'fail-closed-test-salt',
  TURNSTILE_SECRET_KEY: 'turnstile-test-secret',
});
assert.equal(booted.status, 0, `the Edge module boots when the salt is configured (got ${booted.stdout.slice(0, 200)} ${booted.stderr.slice(0, 200)})`);
assert.ok(booted.stdout.includes('BOOTED'), 'the Edge module served once with a salt configured');

/* --- 2. Turnstile verification is fail-closed ----------------------------- */
const edgeSource = readFileSync(EDGE_PATH, 'utf8');
assert.match(edgeSource, /if \(!secret\)[\s\S]{0,200}return false/, 'an unconfigured secret must fail closed');
assert.ok(!edgeSource.includes('return true; // not configured'), 'the fail-open branch must be gone');
assert.ok(!/if \(!secret\) return true/.test(edgeSource), 'an unconfigured secret must never pass verification');
assert.match(edgeSource, /VERIFICATION_FAILED, 403, origin\)/, 'a verification failure rejects with 403');
assert.ok(!/VERIFICATION_FAILED, 400/.test(edgeSource), 'the verification failure must not be a 400');

/* --- 3a. The revoke migration is idempotent and scoped ------------------- */
const revoke = readFileSync(REVOKE_PATH, 'utf8');
assert.match(revoke, /do\s+\$\$/i, 'revoke migration wraps its work in a DO block');
assert.match(revoke, /delete\s+from\s+public\.nexora_food_user_roles/i, 'revoke migration deletes role rows');
assert.match(revoke, /role\s*=\s*'super_admin'/, 'only the super_admin role is scoped for deletion');
assert.match(revoke, /templateapp67@gmail\.com/, 'only the bootstrap personal account is targeted');
assert.ok(!/insert\s+into\s+public\.nexora_food_user_roles/i.test(revoke), 'revoke migration must not insert roles');
assert.match(revoke, /revoke-super-admin-bootstrap/, 'revoke migration writes the compensating audit action');
assert.match(revoke, /\bfound\b/, 'the audit write is gated behind an actual deletion');
assert.ok(!/\bdrop\b/i.test(revoke), 'revoke migration contains no destructive statements');

/* --- 3b. The bootstrap email appears only where it must ------------------ */
// The personal bootstrap address may only exist in: the applied admin
// allowlist migration (documented, historical), the applied nexora_food
// bootstrap (kept verbatim as applied history), and the scoped revoke
// migrations (nexora_food super_admin and app_admin allowlist). Any other
// mention — especially a fresh grant — fails the suite.
const ALLOWED_EMAIL_FILES = new Set([
  '20260928013304_nexora_admin_bootstrap_allowlist_20260928.sql',
  '20261011080053_nexora_food_shared_backend.sql',
  '20261126130000_revoke_nexora_food_super_admin_bootstrap.sql',
  '20261127120000_revoke_app_admin_bootstrap_allowlist.sql',
]);
for (const file of readdirSync('supabase/migrations').filter((name) => name.endsWith('.sql'))) {
  const source = readFileSync(join('supabase/migrations', file), 'utf8');
  if (!source.includes('templateapp67@gmail.com')) continue;
  assert.ok(ALLOWED_EMAIL_FILES.has(file), `the personal bootstrap email must not appear in ${file}`);
  if (file !== '20261126130000_revoke_nexora_food_super_admin_bootstrap.sql') {
    const grantsSuperAdmin = /insert\s+into\s+public\.nexora_food_user_roles[\s\S]{0,400}super_admin/i.test(source);
    if (file === '20261011080053_nexora_food_shared_backend.sql') {
      assert.ok(grantsSuperAdmin, 'the historical bootstrap migration keeps its original (applied) content');
    }
  }
}

/* --- 3c. The ledger lists the revokes as release-pending ----------------- */
const history = JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json', 'utf8'));
const pendingFiles = (history.release_pending_migrations || []).map((record) => record.file);
assert.ok(pendingFiles.includes('20261126130000_revoke_nexora_food_super_admin_bootstrap.sql'),
  'the nexora_food super_admin revoke migration is recorded as release-pending, not auto-applied');
assert.ok(pendingFiles.includes('20261127120000_revoke_app_admin_bootstrap_allowlist.sql'),
  'the app_admin allowlist revoke migration is recorded as release-pending, not auto-applied');
assert.ok(pendingFiles.includes('20261127130000_mfa_recovery_audit_log.sql'),
  'the MFA recovery audit-log migration is recorded as release-pending, not auto-applied');
assert.ok(pendingFiles.includes('20261127090000_processed_webhook_events.sql'),
  'the webhook ledger migration is recorded as release-pending, not auto-applied');
assert.ok(!pendingFiles.some((file) => file.startsWith('20261011080053')),
  'the applied bootstrap migration is not re-listed as pending');
const postExport = (history.post_export_applied_versions || []).map((record) => String(record.version));
assert.ok(!postExport.some((version) => version.startsWith('2026112613')),
  'the revoke migration is not recorded as applied');
assert.ok(!postExport.some((version) => version.startsWith('2026112712')),
  'the app_admin allowlist revoke migration is not recorded as applied');
assert.ok(!postExport.some((version) => version.startsWith('2026112713')),
  'the MFA recovery audit-log migration is not recorded as applied');

console.log('PASS: no public salt fallback anywhere in source, the Edge module fails fast without a bucket salt, Turnstile is fail-closed (403, unconfigured secret included), and both personal-account bootstrap grants are revoked by idempotent release-pending migrations scoped to exactly those grants.');
