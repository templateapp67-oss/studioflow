// Route & sub-app parity: the same security contract — schema validation,
// SSRF guard, authorization — enforced identically across the Express mount,
// the Vercel Node function, and the nested Veda Sanjeevani Edge application.
//
//   A. SSRF guard twin parity (behavioral): server/httpValidation.ts
//      assertSafeOutboundUrl and veda-sanjeevani/.../safeOutbound.ts
//      must classify the same URL battery the same way.
//   B. Veda authorization matrix (static): every Edge function maps to its
//      required guard; public endpoints are limited to the documented set.
//   C. Veda raw-fetch scan: no Edge function calls fetch() directly; every
//      outbound call goes through the SSRF guard or a pinned internal helper.
//   D. Node mounts (recovery-codes action, storefront SSR): method gates, no
//      privileged keys, shared handlers — the Vercel entry cannot drift from
//      the Express mount because both assemble the same one.
//   E. Lead-capture end-to-end wiring: browser → Node handler → Edge function
//      → private table, with Turnstile fail-closed at the Edge layer and
//      matching honeypot contracts on both layers.
//   F. Docs: the end-to-end contract is written down.
//
// Behavioral checks transpile the real modules; no network, no credentials.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

async function importTs(path) {
  const source = readFileSync(path, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
    fileName: path,
  });
  return import('data:text/javascript;base64,' + Buffer.from(output.outputText).toString('base64'));
}

const checks = [];
const ok = (name) => { checks.push(name); console.log('PASS: ' + name); };

/* ---------------- A. SSRF guard twin parity (behavioral) ----------------- */
const nodeGuard = await importTs('server/httpValidation.ts');
const denoGuard = await importTs('veda-sanjeevani/supabase/functions/_shared/safeOutbound.ts');
assert.equal(typeof nodeGuard.assertSafeOutboundUrl, 'function');
assert.equal(typeof denoGuard.assertSafeOutboundUrl, 'function');

const URL_CASES = [
  ['http://example.com', 'block'],
  ['https://example.com', 'allow'],
  ['https://', 'block'],
  ['https://user:pass@example.com', 'block'],
  ['https://localhost', 'block'],
  ['https://foo.localhost', 'block'],
  ['https://LOCALHOST', 'block'],
  ['https://localhost.', 'block'],
  ['https://foo.localhost.', 'block'],
  ['https://127.0.0.1', 'block'],
  ['https://127.0.0.1.', 'block'],
  ['https://127.1', 'block'],
  ['https://2130706433', 'block'],
  ['https://0x7f.0.0.1', 'block'],
  ['https://0', 'block'],
  ['https://10.0.0.8', 'block'],
  ['https://172.16.0.9', 'block'],
  ['https://172.31.255.254', 'block'],
  ['https://172.32.0.1', 'allow'],
  ['https://192.168.1.9', 'block'],
  ['https://192.0.0.9', 'block'],
  ['https://192.0.2.9', 'block'],
  ['https://198.18.0.9', 'block'],
  ['https://198.51.100.9', 'block'],
  ['https://203.0.113.9', 'block'],
  ['https://100.64.0.9', 'block'],
  ['https://100.127.255.254', 'block'],
  ['https://100.128.0.1', 'allow'],
  ['https://169.254.169.254', 'block'],
  ['https://224.0.0.9', 'block'],
  ['https://240.0.0.9', 'block'],
  ['https://8.8.8.8', 'allow'],
  ['https://1.1.1.1/some/path?q=1', 'allow'],
  ['https://[::1]', 'block'],
  ['https://[::]', 'block'],
  ['https://[::ffff:127.0.0.1]', 'block'],
  ['https://[::ffff:8.8.8.8]', 'allow'],
  ['https://[::ffff:8.8.8.8]/path', 'allow'],
  ['https://[64:ff9b::127.0.0.1]', 'block'],
  ['https://[64:ff9b::8.8.8.8]', 'allow'],
  ['https://[64:ff9b:1::1]', 'block'],
  ['https://[2002:7f00:1::]', 'block'],
  ['https://[2002:0808:0808::]', 'allow'],
  ['https://[2001:4860:4860::8888]', 'allow'],
  ['https://[2001:db8::1]', 'block'],
  ['https://[fe80::1]', 'block'],
  ['https://[fe90::1]', 'block'],
  ['https://[fd12:3456::1]', 'block'],
  ['https://[fc00::1]', 'block'],
  ['https://[ff02::1]', 'block'],
  ['https://[100::]', 'block'],
  ['https://api.resend.com/emails', 'allow'],
  ['https://generativelanguage.googleapis.com/', 'allow'],
];

const classify = (guard, url) => {
  try {
    const validated = guard.assertSafeOutboundUrl(url);
    return { outcome: 'allow', href: validated.href };
  } catch {
    return { outcome: 'block', href: null };
  }
};
for (const [url, expected] of URL_CASES) {
  const nodeResult = classify(nodeGuard, url);
  const denoResult = classify(denoGuard, url);
  assert.equal(nodeResult.outcome, expected, `node guard: ${url} expected ${expected}, got ${nodeResult.outcome}`);
  assert.equal(denoResult.outcome, expected, `deno guard: ${url} expected ${expected}, got ${denoResult.outcome}`);
  if (expected === 'allow') {
    assert.equal(nodeResult.href, denoResult.href, `twin guards normalize ${url} differently`);
  }
}
ok(`SSRF guard twin parity across ${URL_CASES.length} URLs (Node server/httpValidation.ts vs Deno veda-sanjeevani safeOutbound.ts)`);

/* ------------- B. Veda authorization matrix (static, per function) ------- */
const VEDA_FUNCTIONS = 'veda-sanjeevani/supabase/functions';
const readFn = (name) => readFileSync(join(VEDA_FUNCTIONS, name, 'index.ts'), 'utf8');
const vedaMatrix = [
  ['ai-generate-all', ['requireOwner']],
  ['ai-generate-content', ['requireOwner']],
  ['summarize-reviews', ['requireOwner']],
  ['register-media', ['requireStaffOrOwner', 'projectImagePath', 'sniffImageSignature']],
  ['request-review', ['requireCron']],
  ['send-booking-notification', ['requireInternal']],
  ['create-booking-public', ['consumeRateLimit', 'bookingInput', 'readJson']],
  ['health', []],
];
for (const [name, required] of vedaMatrix) {
  const source = readFn(name);
  for (const needle of required) {
    assert.ok(source.includes(needle), `veda ${name} must reference ${needle}`);
  }
  // Every function goes through the central error boundary.
  assert.match(source, /\bendpoint\(\s*"/, `veda ${name} must use the endpoint() wrapper`);
}
// Public endpoints are exactly this documented set.
const publicFns = ['health', 'create-booking-public'];
for (const name of readdirSync(VEDA_FUNCTIONS, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== '_shared' && e.name !== 'tests').map((e) => e.name)) {
  const source = readFn(name);
  if (publicFns.includes(name)) {
    assert.ok(!/requireOwner|requireStaffOrOwner|requireCron|requireInternal|verifyJwt/.test(source),
      `veda ${name} is documented public and must not gate on a session`);
    continue;
  }
  assert.match(source, /requireOwner|requireStaffOrOwner|requireCron|requireInternal/,
    `veda ${name} must enforce an authorization guard`);
}
// health stays a dumb liveness probe: no table reads besides a single
// site_settings id, no user/auth/session data anywhere.
{
  const source = readFn('health');
  assert.ok(!/profiles|bookings|users|sessions|tokens|service_role|SUPABASE_SERVICE_ROLE_KEY/.test(source),
    'veda health must not touch user data or privileged keys');
  assert.match(source, /from\("site_settings"\)/);
  assert.match(source, /select\("id"\)/);
}
// create-booking-public: honeypot short-circuit before any rate-limit budget
// is consumed, and per-IP + per-phone budgets are both claimed.
{
  const source = readFn('create-booking-public');
  const honeypot = source.indexOf('input.website.trim()');
  const firstBudget = source.indexOf('consumeRateLimit(');
  assert.ok(honeypot !== -1 && firstBudget !== -1 && honeypot < firstBudget,
    'the honeypot short-circuit must run before any rate-limit budget is claimed');
  assert.match(source, /"booking-ip"/);
  assert.match(source, /"booking-phone"/);
}
ok('veda authorization matrix holds for all 8 functions (owner/staff-or-owner/cron/internal guards; public set is exactly health + create-booking-public)');

/* ------------------------- C. Veda raw fetch scan ------------------------ */
const vedaFiles = [];
const walkVeda = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? walkVeda(path) : [path];
});
vedaFiles.push(...walkVeda(VEDA_FUNCTIONS).filter((file) => /\.(ts|tsx|js|mjs)$/.test(file)));
const rawFetchHits = [];
for (const file of vedaFiles) {
  if (file.includes('/tests/')) continue;
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bfetch\s*\(/g)) {
    // fetcher( is a parameter call, not a global fetch — the regex above does
    // not match it because of the word boundary on "fetch" followed by "(".
    rawFetchHits.push(`${file}:${source.slice(0, match.index).split('\n').length}`);
  }
}
assert.deepEqual(rawFetchHits, [], 'no veda Edge function may call the global fetch directly — outbound calls go through the SSRF guard');
ok('veda Edge tree contains zero direct global fetch() calls (all outbound traffic passes through the SSRF guard or pinned internal helpers)');

/* -------- D. Node mounts: recovery-codes action & storefront SSR --------- */
{
  const vercelEntry = readFileSync('api/account/recovery-codes/[action].ts', 'utf8');
  const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(vercelConfig.rewrites.find(({ source }) => source === '/api/security-center'), {
    source: '/api/security-center',
    destination: '/api/account/recovery-codes/security-center',
  });
  assert.match(vercelEntry, /case '\/api\/account\/recovery-codes\/security-center':\s+return securityCenterHandler/);
  assert.match(vercelEntry, /case '\/api\/account\/recovery-codes\/active'/);
  assert.match(vercelEntry, /case '\/api\/account\/recovery-codes\/consume'/);
  assert.doesNotMatch(vercelEntry, /verifyAccessToken|validateBody|SUPABASE_SERVICE_ROLE_KEY/,
    'the Vercel entry must not re-implement verification — it delegates to the shared handlers');
  assert.ok(vercelEntry.split('\n').length <= 40, 'the Vercel entry stays a thin action map');

  const expressMount = readFileSync('server.ts', 'utf8');
  assert.ok(expressMount.includes('app.post("/api/account/recovery-codes/consume"'));
  assert.ok(expressMount.includes('app.get("/api/account/recovery-codes/active"'));
  assert.match(expressMount, /app\.post\("\/api\/account\/recovery-codes\/consume", strictBody\(RECOVERY_CONSUME_SCHEMA/);

  const storefront = readFileSync('api/storefront.ts', 'utf8');
  assert.ok(storefront.includes('assertSafeOutboundUrl'), 'storefront SSR uses the SSRF guard for its Supabase client');
  assert.ok(storefront.includes('zilwgiuiygqqardzutxi.supabase.co'), 'storefront SSR is pinned to the reviewed production project host');
  assert.ok(!/process\.env\.[A-Z_]*(SECRET|SERVICE_ROLE)/.test(storefront), 'storefront SSR must not read secret env vars');
  assert.ok(!/from\(['"][^'"]*service_role/i.test(storefront));
  assert.match(storefront, /SUPABASE_PUBLISHABLE_KEY/, 'storefront SSR must use the publishable key');
  assert.match(storefront, /startsWith\('sb_secret_'\)/, 'storefront SSR must fail closed if a secret key is configured');
  assert.ok(storefront.includes('renderPublishedSalonHtml'), 'public HTML only');
  assert.ok(storefront.includes("method !== 'GET' && method !== 'HEAD'"), 'method gate');
  assert.ok(storefront.includes('escapeHtml') && storefront.includes('safeJson'), 'HTML/JSON injection guards present');
  assert.match(storefront, /\^\[a-z0-9\]\(\[a-z0-9-\]\*\[a-z0-9\]\)\?\$/, 'slug grammar stays pinned');

  const leadEntry = readFileSync('api/nexora-demo-lead.ts', 'utf8');
  assert.match(leadEntry, /export \{ nexoraDemoLeadHandler as default \}/, 'the Vercel lead function re-exports the one shared Node handler');
  const expressLead = readFileSync('server.ts', 'utf8');
  assert.match(expressLead, /app\.post\("\/api\/nexora-demo-lead", strictBody\(DEMO_LEAD_SCHEMA/, 'Express mounts the same handler behind the strict schema');
}
ok('recovery-codes and demo-lead mounts are the same code path on Express and Vercel; storefront SSR is public, pinned, SSRF-guarded and free of privileged keys');

/* --------- E. Lead-capture end-to-end wiring (Node → Edge contract) ------ */
{
  const nodeHandler = readFileSync('server/nexoraDemoLead.ts', 'utf8');
  assert.ok(nodeHandler.includes('claimLeadBudget'), 'Node handler claims the shared per-IP budget before the trusted Edge call');
  assert.ok(nodeHandler.includes('LANDING_LEAD_RATE_LIMIT_SALT is not configured'), 'missing salt fails fast, no public fallback');
  assert.ok(nodeHandler.includes('functions/v1/submit-landing-lead'), 'lead is persisted by the Edge function, never by direct table write');

  const edge = readFileSync('supabase/functions/submit-landing-lead/index.ts', 'utf8');
  assert.ok(edge.includes('verifyTurnstile'), 'edge verifies Turnstile');
  assert.ok(edge.includes('TURNSTILE_SECRET_KEY'), 'edge reads the secret from env, never a client');
  assert.ok(/if \(!token\) return false/.test(edge), 'missing token fails closed');
  assert.ok(/VERIFICATION_FAILED, 403/.test(edge), 'verification failure answers 403');
  const turnstileIdx = edge.indexOf('await verifyTurnstile(');
  const insertIdx = edge.indexOf("from('landing_leads')");
  assert.ok(turnstileIdx !== -1 && insertIdx !== -1 && turnstileIdx < insertIdx,
    'Turnstile runs before the lead is stored');
  assert.ok(/claim_landing_lead_rate_limit/.test(edge), 'edge claims the shared per-IP budget (defense in depth)');

  for (const field of ['website', 'company_website', 'fax_number']) {
    assert.ok(nodeHandler.includes(field), `node honeypot covers ${field}`);
    assert.ok(edge.includes(field), `edge honeypot covers ${field}`);
  }
  // The Node turnstile_token is forwarded verbatim to the Edge verifier.
  assert.ok(!/verifyTurnstile/.test(nodeHandler), 'Turnstile is verified once, at the Edge — the Node layer never bypasses or duplicates it');
}
ok('lead-capture end-to-end wiring: one shared Node handler on both runtimes, Edge-owned Turnstile fail-closed 403, shared per-IP budget on both layers, identical honeypots');

/* --------------------------- F. Docs exist and name the flow -------------- */
{
  const leadDoc = readFileSync('docs/LEAD-CAPTURE-CONTRACT.md', 'utf8');
  for (const needle of ['Turnstile', 'submit-landing-lead', 'nexora-demo-lead', 'fail-closed', 'honeypot', 'rate-limit']) {
    assert.ok(leadDoc.includes(needle), `docs/LEAD-CAPTURE-CONTRACT.md covers ${needle}`);
  }
  const mfaDoc = readFileSync('docs/MFA-RECOVERY-CONTRACT.md', 'utf8');
  for (const needle of ['recovery', 'per-IP', 'studioflow_mfa_recovery_audit']) {
    assert.ok(mfaDoc.includes(needle), `docs/MFA-RECOVERY-CONTRACT.md covers ${needle}`);
  }
  assert.match(mfaDoc, /single-use/i, 'docs/MFA-RECOVERY-CONTRACT.md covers single-use');
}
ok('end-to-end contracts are documented (docs/LEAD-CAPTURE-CONTRACT.md, docs/MFA-RECOVERY-CONTRACT.md)');

console.log(`\nAll route parity checks passed (${checks.length} sections).`);
