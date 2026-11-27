/**
 * Unified wiring patch — static + runtime verification.
 *
 * Static checks pin the wiring that no compiler can prove:
 *   - `/sign-in` and `/sign-up` are served and routed as first-class aliases.
 *   - `ProfileCompletionGate` replaces the Google sign-up dead-end.
 *   - `www`/plain-http 308 to `https://nexorasalon.online` in both vercel.json
 *     and the Express server, without redirecting preview hosts.
 *   - `/api/booking-deposit` (server-side 25% guard) is registered in both the
 *     Express server and the Vercel function directory.
 *   - the full template suite still covers every template in the catalogue.
 *
 * Runtime behaviour is asserted by `scripts/verify-unified-wiring.tsx`.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

const read = (path) => readFileSync(path, 'utf8');

const app = read('src/App.tsx');
const router = read('src/AppRouter.tsx');
const authPage = read('src/components/AuthPage.tsx');
const gate = read('src/components/ProfileCompletionGate.tsx');
const authRoutes = read('src/lib/authRoutes.ts');
const server = read('server.ts');
const canonical = read('server/canonicalHost.ts');
const depositGuard = read('server/depositGuard.ts');
const depositHandler = read('server/bookingDeposit.ts');
const vercel = JSON.parse(read('vercel.json'));
const pkg = JSON.parse(read('package.json'));

// ------------------------------------------------------- 1. auth route aliases
assert.match(authRoutes, /'\/sign-in':\s*'signin'/, 'authRoutes must map /sign-in to the sign-in mode');
assert.match(authRoutes, /'\/sign-up':\s*'signup'/, 'authRoutes must map /sign-up to the sign-up mode');
assert.match(router, /isAuthEntryPath\(location\.pathname\)/, 'the router must boot the app for every auth alias');
assert.match(app, /isAuthEntryPath\(location\.pathname\)/, 'App must treat every auth alias as the login route');
assert.match(app, /<AuthPage initialMode=\{authModeForPath\(location\.pathname\)\|\|undefined\} \/>/, 'the alias path must select the AuthPage mode');
assert.match(authPage, /const pathAuthMode = authModeForPath\(safePathname\)/, 'AuthPage must derive its mode from an alias path too');
assert.match(authPage, /authCallbackPath\(safePathname, cleanOwnerAuthSearch\)/, 'OAuth must return to the canonical login document');
assert.match(authPage, /isAuthEntryPath\(safePathname\)/, 'AuthPage must preserve owner auth entry for aliases');

const rewrite = (source) => vercel.rewrites.find((rule) => rule.source === source);
for (const alias of ['/sign-in', '/sign-up']) {
  assert.equal(rewrite(alias)?.destination, '/login.html', `${alias} must be rewritten to the login document`);
}
assert.equal(rewrite('/login')?.destination, '/login.html', 'the canonical /login rewrite is unchanged');

// The login document is served for `/login` and both aliases, in dev and in
// production, while keeping the requested path for client-side routing.
assert.equal(server.split('(?:login|sign-in|sign-up)').length - 1, 2, 'the dev and production servers must alias the auth paths');

// ------------------------------------------- 2. ProfileCompletionGate wiring
assert.match(gate, /export function ProfileCompletionGate/, 'the gate component must be exported');
assert.match(gate, /missingGoogleSignupFields\(role, clean\)/, 'the gate must validate with the shared mandatory fields');
assert.match(app, /import \{ ProfileCompletionGate \}/, 'App must render the gate');
assert.match(app, /if\(googleOAuthStatus==='incomplete'&&googleProfileGate\)/, 'App must route incomplete Google sign-ups to the gate');
assert.match(app, /applyGoogleSignupProfile\(gate\.intent,values,/, 'the gate must save through the same profile writer as the OAuth return');
assert.match(app, /async function applyGoogleSignupProfile/, 'the profile writer must be shared, not duplicated');
assert.match(app, /missingGoogleSignupFields\(intent\.role,values\)/, 'the OAuth return must detect incomplete sign-ups');
assert.doesNotMatch(app, /Google sign-up is missing required customer details/, 'the old customer dead-end error must be gone');
assert.doesNotMatch(app, /Please sign out and complete salon sign-up again/, 'the old owner dead-end error must be gone');
assert.match(app, /studioflow_customer_update_details/, 'customer details still use the authenticated RPC');
assert.match(app, /studioflow_customer_claim_ref/, 'the referral claim is preserved');
assert.match(app, /profiles'\)\.update\(\{full_name:fullName,salon_name:/, 'the owner profile update is preserved');
assert.match(app, /isNewGoogleAccount\(intent,session\.user\.created_at\)/, 'existing Google identities still skip signup attribution');

// ------------------------------------------------- 3. canonical host redirects
assert.match(canonical, /export const CANONICAL_HOST = 'nexorasalon\.online'/, 'the canonical host is declared once');
assert.match(canonical, /CANONICAL_STATUS = 308/, 'redirects must be permanent 308s');
assert.match(canonical, /www\.nexorasalon\.online/, 'www is redirected to the apex origin');
assert.match(canonical, /EXEMPT_PREFIXES = \['\/api\/', '\/\.well-known\/'/, 'API and well-known paths are exempt');
assert.match(server, /app\.use\(canonicalHostRedirect\(\)\)/, 'the Express server must install the canonical middleware');
const wwwRedirect = (vercel.redirects || []).find((rule) =>
  (rule.has || []).some((condition) => condition.type === 'host' && condition.value === 'www.nexorasalon.online'));
assert.ok(wwwRedirect, 'vercel.json must redirect the www host');
assert.equal(wwwRedirect.permanent, true, 'the Vercel redirect must be permanent (308)');
assert.equal(wwwRedirect.destination, 'https://nexorasalon.online/$1', 'the Vercel redirect must keep the path');

// ------------------------------------- 4. server-side 25% deposit safety guard
assert.match(depositGuard, /export const DEPOSIT_PERCENT = 25/, 'the guard enforces the 25% deposit');
assert.match(depositGuard, /export const MIN_DEPOSIT_PAISE = 100/, 'the guard mirrors the register_payment minimum');
assert.match(depositGuard, /BigInt\(value\) \+ 3n\) \/ 4n/, 'the deposit uses an exact integer ceiling');
assert.match(depositHandler, /assertDepositSatisfied\(quote, \{ enforce \}\)/, 'the endpoint must reject an under-paid deposit');
assert.match(server, /app\.all\("\/api\/booking-deposit", strictBody\(BOOKING_DEPOSIT_SCHEMA[^)]*\)[^)]*\)?, depositLimiter, bookingDepositHandler\)/, 'the Express server must expose the deposit check behind strictBody');
assert.match(read('api/booking-deposit.ts'), /bookingDepositHandler/, 'the Vercel function must expose the deposit check');
assert.match(depositHandler, /'deposit_required'/, 'the endpoint reports a stable deposit error code');

// ------------------------------------------------- 5. full template checks
assert.ok(pkg.scripts['test:wiring'], 'the all-template wiring suite must stay runnable');
assert.match(pkg.scripts['test'], /run-all-verifications\.mjs/, 'npm test must run every verification suite');
assert.ok(read('scripts/verify-website-wiring.mjs').includes('verify-website-wiring.tsx'), 'the wiring suite keeps its runtime harness');
const wiring = read('scripts/verify-website-wiring.tsx');
assert.ok(
  wiring.includes('for(const template of Object.values(CATEGORY_TEMPLATES)'),
  'the wiring suite must iterate every template in the catalogue',
);
const templates = read('src/categoryTemplates.ts');
const declaredIds = new Set([...templates.matchAll(/id:\s*'([a-z0-9_]+)'/g)].map((match) => match[1]));
assert.ok(declaredIds.size >= 14, `the catalogue must still expose every template (found ${declaredIds.size})`);
for (const id of ['hair_salon', 'barber', 'ayurvedic_spa', 'skincare_clinic', 'tattoo_studio']) {
  assert.ok(declaredIds.has(id), `template ${id} must stay in the catalogue`);
}
assert.ok(
  /Object\.keys\(CATEGORY_TEMPLATES\)|Object\.values\(CATEGORY_TEMPLATES\)/.test(wiring),
  'the wiring suite must enumerate the catalogue rather than a hard-coded list',
);
const runner = read('scripts/run-all-verifications.mjs');
assert.ok(runner.includes("name.startsWith('verify-')"), 'the verification runner auto-discovers new suites');

const built = await build({
  entryPoints: ['scripts/verify-unified-wiring.tsx'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  write: false,
  jsx: 'automatic',
  loader: { '.css': 'empty', '.jpg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl' },
});
const result = spawnSync(process.execPath, ['--input-type=module'], {
  input: built.outputFiles[0].text,
  stdio: ['pipe', 'inherit', 'inherit'],
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

console.log('PASS: unified wiring — auth aliases, Google profile completion gate, canonical 308 redirects, 25% deposit guard and full template checks.');
