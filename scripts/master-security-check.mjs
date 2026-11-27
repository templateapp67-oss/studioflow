// STUDIOFLOW — master security verification runner.
//
// One command that proves the hardening contract end to end, offline, without
// touching production:
//
//   node scripts/master-security-check.mjs   (or: npm run verify:security)
//
// It runs the security-relevant offline suites in dependency order and applies
// three fail-closed static source checks of its own. Exit code 0 means every
// step passed; anything else prints exactly what failed and how.
//
// Intentionally NOT named verify-*.mjs: scripts/run-all-verifications.mjs
// auto-discovers that pattern and this runner would spawn it recursively.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { join } from 'node:path';

const steps = [
  ['safeLogger redaction engine · twin parity · no raw console.*', 'scripts/verify-safe-logger.mjs'],
  ['CSP + edge security headers (vercel.json)', 'scripts/verify-security-policy.mjs'],
  ['Security header parity (Express) · webhook replay/idempotency ledger · static bundle guard', 'scripts/verify-webhook-security.mjs'],
  ['SSRF guard · schema validation · safe outbound fetch', 'scripts/verify-http-validation.mjs'],
  ['CORS allowlist (browser-callable edge functions)', 'scripts/verify-edge-cors.mjs'],
  ['Storage upload signature hygiene (magic bytes)', 'scripts/verify-upload-signatures.mjs'],
  ['Browser token/session storage hygiene', 'scripts/verify-auth-storage.mjs'],
  ['BOLA / RLS tenant isolation (offline migrated DB, 178 probes)', 'scripts/verify-bola-and-rls.mjs'],
  ['Meta WhatsApp webhook replay/idempotency (VM-executed handler)', 'scripts/verify-nexora-whatsapp-runtime.mjs'],
  ['Rate limiting + MFA fail-closed (429/Retry-After · AAL1 403 · ledger)', 'scripts/verify-rate-limit-mfa.mjs'],
  ['AI endpoint hardening (schema + auth + fail-closed)', 'scripts/verify-ai-endpoint-hardening.mjs'],
];

const results = [];
let failed = 0;

function runStep(name, script) {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { out += chunk; });
    child.once('error', (error) => resolve({ name, ok: false, seconds: '—', output: String(error) }));
    child.once('close', (code) => resolve({ name, ok: code === 0, seconds: ((Date.now() - started) / 1000).toFixed(1), output: out }));
  });
}

function section(title) {
  console.log('\n=== ' + title);
}

// --- Static, in-process checks ----------------------------------------------

const staticResults = [];
async function staticCheck(name, fn) {
  try {
    fn();
    staticResults.push([name, true, '']);
    console.log(`PASS (static) ${name}`);
  } catch (error) {
    staticResults.push([name, false, String(error.message ?? error)]);
    console.log(`FAIL (static) ${name}\n     ${error.message ?? error}`);
    failed += 1;
  }
}

await staticCheck('no secret-shaped files are tracked by git (.env*, *.pem, *.p12, id_rsa; *.example allowed)', () => {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const forbidden = tracked.filter((file) => {
    if (/\.example$/.test(file)) return false;
    return /(^|\/)\.env($|\.)/.test(file) || /\.(pem|p12|pfx|key)$/i.test(file) || /(^|\/)id_rsa/.test(file);
  });
  if (forbidden.length) throw new Error('tracked secret-shaped files: ' + forbidden.join(', '));
});

const SECRET_LINE = /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----|\bsbp_[a-f0-9]{30,}\b|\brzp_live_[A-Za-z0-9]{8,}\b|\bsk_live_[A-Za-z0-9]{8,}\b|\bwhsec_[A-Za-z0-9]{8,}\b|\bghp_[A-Za-z0-9]{20,}\b|\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/;
const SCAN_ROOTS = ['server.ts', 'server', 'api', 'src', 'supabase/functions', 'veda-sanjeevani/supabase/functions'];
function walk(path) {
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) return [];
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]));
}
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs)$/;
function scanSecrets(files) {
  const hits = [];
  for (const file of files) {
    if (!SOURCE_EXTENSIONS.test(file)) continue;
    if (/(node_modules|\.test\.|tests?\/|__tests__)/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (SECRET_LINE.test(lines[i])) hits.push(`${file}:${i + 1}`);
    }
  }
  return hits;
}
await staticCheck('no secret-shaped literals in tracked server/client/edge source (tests excluded)', () => {
  const hits = SCAN_ROOTS.flatMap(walk).flatMap((file) => scanSecrets([file]));
  if (hits.length) throw new Error('secret-shaped literals found at: ' + hits.join(', '));
});

await staticCheck('.env.example and tracked *.example env files hold placeholders only', () => {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter((file) => /\.example$/.test(file));
  const hits = [];
  for (const file of tracked) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (SECRET_LINE.test(lines[i])) hits.push(`${file}:${i + 1}`);
    }
  }
  if (hits.length) throw new Error('secret-shaped values in example env files at: ' + hits.join(', '));
});

// --- Executable suites --------------------------------------------------------

section('suites');
for (const [name, script] of steps) {
  const result = await runStep(name, script);
  results.push(result);
  const tag = result.ok ? 'PASS' : 'FAIL';
  console.log(`${tag} ${name} (${result.seconds}s)`);
  if (!result.ok) {
    failed += 1;
    console.log('----- last 40 lines of failing output -----');
    console.log(result.output.split('\n').slice(-40).join('\n'));
    console.log('--------------------------------------------');
  }
}

const suiteFailures = results.filter((r) => !r.ok).length;
section('report');
console.log(`Static checks: ${staticResults.filter(([, ok_]) => ok_).length}/${staticResults.length} passed`);
console.log(`Suites:        ${results.length - suiteFailures}/${results.length} passed`);
if (failed) {
  console.log('\nMASTER SECURITY: FAIL');
  process.exit(1);
}
console.log('\nMASTER SECURITY: PASS — redaction, headers, CORS, SSRF/schema, storage, BOLA/RLS, webhook replay, auth storage, rate limit/MFA, AI endpoints and token hygiene all verified offline.');
