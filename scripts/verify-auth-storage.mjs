import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { build } from 'esbuild';

/**
 * Secrets & auth-token storage audit (offline).
 *
 * Three layers of proof:
 *  1. Static scan of every browser-served source (root app, Veda Sanjeevani
 *     frontend): no localStorage access with a token-like key, no privileged
 *     secret/credential values shipped to the client.
 *  2. Configuration checks: the browser Supabase clients use the
 *     sessionStorage-backed adapter, .env.example never assigns a privileged
 *     value to a VITE_* variable, and .env files stay gitignored.
 *  3. Behavioural test of the storage adapter itself: legacy localStorage
 *     tokens migrate to sessionStorage exactly once, writes purge the
 *     localStorage copy, sign-out removes both copies, the module-load sweep
 *     deletes legacy keys, and storage-blocked environments fall back to
 *     memory.
 *
 * No network access, no real credentials.
 */

const root = process.cwd();
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.html', '.css', '.json', '.svg', '.webmanifest', '.xml', '.txt']);
const browserRoots = ['src', 'public', 'veda-sanjeevani/src'];
const browserFiles = [];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

function collect(entry) {
  const stat = statSync(entry);
  if (stat.isDirectory()) {
    if (SKIP_DIRS.has(entry.split('/').pop())) return;
    for (const child of readdirSync(entry)) collect(join(entry, child));
    return;
  }
  if (stat.size > 1024 * 1024) return;
  if (TEXT_EXTENSIONS.has(extname(entry).toLowerCase())) browserFiles.push(entry);
}
for (const base of browserRoots) collect(join(root, base));
for (const file of ['index.html', 'login.html', 'sw.js', 'middleware.js']) browserFiles.push(join(root, file));

const TOKEN_ISH_CALL = /localStorage\s*\.\s*(getItem|setItem|removeItem)\s*\(/;
const TOKEN_ISH_LINE = /access_token|refresh_token|auth[-_]?token|supabase_session|jwt|secret|service[-_]?role|bearer/i;
const PRIVILEGED_VALUE_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]{8,}/,
  /eyJhbGciOi[A-Za-z0-9_-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|RESEND_API_KEY|GEMINI_API_KEY|NEXORA_CRM_LEAD_TOKEN|STUDIOFLOW_MARKETING_WHATSAPP_TOKEN|NEXORA_WA_ACCESS_TOKEN|TURNSTILE_SECRET_KEY)\s*[:=]\s*['"][^'"]{6,}['"]/,
  /JWT_SECRET|jwtSecret/,
];

for (const file of browserFiles) {
  const relative = file.slice(root.length + 1);
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (TOKEN_ISH_CALL.test(line) && TOKEN_ISH_LINE.test(line)) {
      assert.fail(`${relative}:${index + 1} reads/writes a token-like key in localStorage: ${line.trim().slice(0, 120)}`);
    }
  });
  for (const pattern of PRIVILEGED_VALUE_PATTERNS) {
    const match = text.match(pattern);
    assert.equal(match, null, `${relative} contains a privileged secret value matching ${pattern}: ${match?.[0]?.slice(0, 40)}`);
  }
}
console.log(`ok: scanned ${browserFiles.length} browser-served files — no token-like localStorage access, no privileged secret values`);

/* ---------- .env.example ---------- */
const envExample = readFileSync('.env.example', 'utf8');
for (const rawLine of envExample.split('\n')) {
  const line = rawLine.trim();
  if (!/^VITE_[A-Z0-9_]*(SECRET|SERVICE|PRIVATE|PASSWORD|JWT|TOKEN)[A-Z0-9_]*=/.test(line)) continue;
  const value = line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  assert.equal(value, '', `.env.example must never assign a privileged value to ${line.split('=')[0]}`);
}
assert.ok(readFileSync('.gitignore', 'utf8').split('\n').some((line) => line.trim() === '.env*'), '.gitignore must keep .env files out of git');
console.log('ok: .env.example carries no privileged VITE_* values and .env stays gitignored');

/* ---------- structural wiring ---------- */
const read = (relative) => readFileSync(join(root, relative), 'utf8');
const supabaseLib = read('src/lib/supabase.ts');
assert.match(supabaseLib, /storage:\s*createSessionAuthStorage\(/, 'root browser client must use the sessionStorage auth adapter');
assert.ok(supabaseLib.includes("storageKey: AUTH_STORAGE_KEY"), 'root browser client keeps the stable application storage key');
assert.ok(supabaseLib.includes('removeLegacyAuthTokens'), 'root browser client sweeps legacy localStorage tokens');
assert.ok(!/auth:\s*\{[^}]*localStorage/.test(supabaseLib), 'root browser client must not reference localStorage');
const authStorage = read('src/lib/authStorage.ts');
for (const token of ['sessionStorage', 'localStorage', 'removeLegacyAuthTokens', 'createSessionAuthStorage', 'hasPersistedAuthSession']) {
  assert.ok(authStorage.includes(token), `src/lib/authStorage.ts exports ${token}`);
}
const appRouter = read('src/AppRouter.tsx');
assert.ok(appRouter.includes('hasPersistedAuthSession'), 'router reads the persisted session through the shared helper');
assert.ok(!appRouter.includes("localStorage.getItem('studioflow_supabase_session')"), 'router never reads tokens from localStorage');
const vedaApi = read('veda-sanjeevani/src/lib/api.ts');
assert.ok(vedaApi.includes('createSessionAuthStorage'), 'Veda Sanjeevani browser client must use the sessionStorage auth adapter');
const vedaAuthStorage = read('veda-sanjeevani/src/lib/authStorage.ts');
assert.ok(vedaAuthStorage.includes('sessionStorage'), 'Veda Sanjeevani ships the sessionStorage auth adapter');
console.log('ok: browser clients are wired to sessionStorage auth storage');

/* ---------- behavioural audit of the adapter ---------- */
const workdir = mkdtempSync(join(tmpdir(), 'auth-storage-audit-'));
const bundle = await build({
  entryPoints: [join(root, 'src/lib/authStorage.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const bundlePath = join(workdir, 'authStorage.mjs');
writeFileSync(bundlePath, bundle.outputFiles[0].text);
const { createSessionAuthStorage, removeLegacyAuthTokens, hasPersistedAuthSession } = await import(bundlePath);

const makeStorage = (seed = {}) => {
  const map = new Map(Object.entries(seed));
  return {
    _map: map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
  };
};
const stubGlobals = (session, local) => {
  const previous = { session: globalThis.sessionStorage, local: globalThis.localStorage, window: globalThis.window };
  if (session === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = session;
  if (local === undefined) delete globalThis.localStorage; else globalThis.localStorage = local;
  if (typeof globalThis.window !== 'undefined') delete globalThis.window;
  return () => {
    if (previous.session === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previous.session;
    if (previous.local === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous.local;
    if (previous.window !== undefined) globalThis.window = previous.window;
  };
};
const sessionJson = JSON.stringify({ access_token: 'a.b.c', refresh_token: 'refresh-value', expires_at: 4_000_000_000 });

// 1. A legacy localStorage token migrates to sessionStorage exactly once.
{
  const session = makeStorage(); const legacy = makeStorage({ studioflow_supabase_session: sessionJson });
  const restore = stubGlobals(session, legacy);
  const storage = createSessionAuthStorage();
  assert.equal(storage.getItem('studioflow_supabase_session'), sessionJson, 'legacy token is honoured');
  assert.equal(session.getItem('studioflow_supabase_session'), sessionJson, 'legacy token is copied into sessionStorage');
  assert.equal(legacy.getItem('studioflow_supabase_session'), null, 'legacy localStorage copy is deleted');
  assert.equal(hasPersistedAuthSession(), true, 'persisted session detected after migration');
  restore();
}
// 2. Writes land in sessionStorage and purge any localStorage copy.
{
  const session = makeStorage(); const legacy = makeStorage({ studioflow_supabase_session: 'stale-local' });
  const restore = stubGlobals(session, legacy);
  const storage = createSessionAuthStorage();
  storage.setItem('studioflow_supabase_session', sessionJson);
  assert.equal(session.getItem('studioflow_supabase_session'), sessionJson);
  assert.equal(legacy.getItem('studioflow_supabase_session'), null, 'localStorage copy is purged on write');
  restore();
}
// 3. Sign-out removes the key from both stores.
{
  const session = makeStorage({ studioflow_supabase_session: sessionJson });
  const legacy = makeStorage({ studioflow_supabase_session: sessionJson });
  const restore = stubGlobals(session, legacy);
  const storage = createSessionAuthStorage();
  storage.removeItem('studioflow_supabase_session');
  assert.equal(session.getItem('studioflow_supabase_session'), null);
  assert.equal(legacy.getItem('studioflow_supabase_session'), null);
  restore();
}
// 4. The module-load sweep migrates and deletes only token-like keys.
{
  const session = makeStorage();
  const legacy = makeStorage({
    studioflow_supabase_session: sessionJson,
    'sb-ziexample-auth-token': sessionJson,
    'sb-ziexample-auth-token-code-verifier': 'verifier-value',
    salon_guest_booking_info: '{"name":"Keep Me"}',
    studioflow_draft_123: '{"draft":true}',
    studioflow_pending_ref: 'REF123',
  });
  const restore = stubGlobals(session, legacy);
  const removed = removeLegacyAuthTokens();
  assert.equal(removed, 3, 'sweep removes exactly the token-like keys');
  assert.equal(legacy.getItem('studioflow_supabase_session'), null);
  assert.equal(legacy.getItem('sb-ziexample-auth-token'), null);
  assert.equal(legacy.getItem('sb-ziexample-auth-token-code-verifier'), null);
  assert.equal(session.getItem('studioflow_supabase_session'), sessionJson, 'sweep migrates the session for seamless sign-in continuity');
  assert.equal(legacy.getItem('salon_guest_booking_info'), '{"name":"Keep Me"}', 'guest details are preserved');
  assert.equal(legacy.getItem('studioflow_draft_123'), '{"draft":true}', 'workspace drafts are preserved');
  assert.equal(legacy.getItem('studioflow_pending_ref'), 'REF123', 'referral attribution is preserved');
  restore();
}
// 5. Storage-blocked environments fall back to memory without throwing.
{
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const restore = stubGlobals(blocked, blocked);
  const storage = createSessionAuthStorage();
  storage.setItem('studioflow_supabase_session', sessionJson);
  assert.equal(storage.getItem('studioflow_supabase_session'), sessionJson, 'memory fallback keeps the session for the tab');
  storage.removeItem('studioflow_supabase_session');
  assert.equal(storage.getItem('studioflow_supabase_session'), null, 'memory fallback honours sign-out');
  assert.equal(hasPersistedAuthSession(), false);
  restore();
}
rmSync(workdir, { recursive: true, force: true });
console.log('ok: storage adapter migrates legacy tokens, purges localStorage on write/sign-out, sweeps legacy keys and falls back to memory');
console.log('PASS: secrets and auth-token storage audit');
