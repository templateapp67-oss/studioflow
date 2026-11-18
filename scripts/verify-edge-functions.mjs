// Guards the layout contract for Supabase Edge Functions (gap G-01):
//   1. `supabase/functions/<name>/index.ts` is the only deployment source.
//   2. Every function the app invokes in the browser has real source there.
//   3. No stale `backend/functions` copy is re-introduced (git mv silently
//      overwrites a duplicate, which is how implementations get lost).
//   4. No script, source file, config or doc points back to `backend/functions`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { historicalEdgeReferences } from './lib/historicalEdgeReferences.mjs';

const FUNCTIONS_DIR = 'supabase/functions';
// `veda-sanjeevani/` is a separate nested application with its own
// supabase/functions tree, so it is deliberately outside this contract.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'veda-sanjeevani']);
const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((entry) => {
    if (SKIP_DIRS.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

// --- 1. every deployment folder has an entrypoint -------------------------
const folders = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
assert.ok(folders.length >= 10, `expected the full function set, found ${folders.length}`);
for (const name of folders) {
  assert.ok(statSync(join(FUNCTIONS_DIR, name, 'index.ts')).isFile(), `${name} has no index.ts`);
}

// --- 2. every app-invoked function is backed by source --------------------
const invoked = new Set();
for (const file of ['src', 'app', 'server', 'api'].flatMap((dir) => {
  try { return walk(dir); } catch { return []; }
}).filter((file) => /\.(ts|tsx|mjs|js)$/.test(file))) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\.invoke\(\s*['"`]([a-z0-9-]+)['"`]/g)) invoked.add(match[1]);
}
assert.ok(invoked.size > 0, 'no functions.invoke call sites found; the scan is broken');
for (const name of invoked) {
  assert.ok(folders.includes(name), `handler invokes "${name}" but ${FUNCTIONS_DIR}/${name} does not exist`);
  assert.ok(
    statSync(join(FUNCTIONS_DIR, name, 'index.ts')).isFile(),
    `handler invokes "${name}" but it has no index.ts`,
  );
}

// --- 2b. functions reached by raw URL, not through .invoke ---------------
// pg_net jobs, the shared server handler and the docs call
// /functions/v1/<name> directly, so .invoke alone would miss a broken name.
const urlCallers = [];
const isHistoricalReference = historicalEdgeReferences(
  JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json', 'utf8')),
  (file) => readFileSync(file, 'utf8'),
);
for (const file of walk('.').filter((file) => /\.(ts|tsx|mjs|js|sql|md)$/.test(file))) {
  if (file.endsWith('verify-edge-functions.mjs')) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    for (const match of line.matchAll(/functions\/v1\/([a-z0-9-]+)/g)) {
      urlCallers.push({ name: match[1], file, where: `${file}:${index + 1}` });
    }
  });
}
let historicalDependencies = 0;
for (const { name, file, where } of urlCallers) {
  if (!folders.includes(name) && isHistoricalReference(file, name)) {
    historicalDependencies++;
    continue;
  }
  assert.ok(
    folders.includes(name),
    `${where} calls /functions/v1/${name} but that function has no source folder`,
  );
}

// --- 3 & 4. no duplicate tree, no stale references ------------------------
const stray = [];
try {
  stray.push(...readdirSync('backend/functions'));
} catch { /* the folder should not exist */ }
assert.deepEqual(stray, [], 'backend/functions must not exist; Edge Functions live in supabase/functions only');

const offenders = [];
for (const file of walk('.').filter((file) => /\.(ts|tsx|mjs|js|json|md)$/.test(file))) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    // This guard is the one place allowed to name the old tree.
    if (line.includes('backend/functions') && !file.endsWith('verify-edge-functions.mjs')) {
      offenders.push(`${file}:${index + 1}`);
    }
  });
}
assert.deepEqual(offenders, [], `stale backend/functions references:\n  ${offenders.join('\n  ')}`);

// --- 4b. every function validates its own caller --------------------------
// These deploy with --no-verify-jwt, so an entrypoint that never reads a
// credential header is open to anyone holding the public anon key. Merely
// *using* the service-role key does not count: `snapshot-accounts` did exactly
// that with no caller check, letting any signed-in user queue a full copy of
// every account row. Requiring a header read plus a 401/403 keeps that shut.
const CREDENTIAL_HEADERS = /headers\.get\(\s*['"](authorization|apikey|x-worker-token|x-razorpay-signature)['"]/i;
const REJECTS = /\b(401|403)\b/;

// Public by design, with the reason recorded so this stays a deliberate list.
// A new function must either check its caller or be added here on purpose.
const PUBLIC_BY_DESIGN = new Map([
  ['iron-ink-public', 'public read surface: anon key + RLS and validated RPCs decide access'],
  ['submit-landing-lead', 'public lead form: rate-limited + Turnstile, service-role path gated separately'],
]);

const unguarded = [];
for (const name of folders) {
  if (PUBLIC_BY_DESIGN.has(name)) continue;
  const path = join(FUNCTIONS_DIR, name, 'index.ts');
  const body = readFileSync(path, 'utf8');
  if (!CREDENTIAL_HEADERS.test(body) || !REJECTS.test(body)) unguarded.push(path);
}
assert.deepEqual(
  unguarded,
  [],
  `functions reachable without a caller check (read a credential header and reject 401/403):\n  ${
    unguarded.join('\n  ')}`,
);
for (const name of PUBLIC_BY_DESIGN.keys()) {
  assert.ok(folders.includes(name), `PUBLIC_BY_DESIGN lists "${name}", which no longer exists`);
}

// --- 4c. Tawk.to owner/public tenant boundary ------------------------------
const tawkConnectSource = readFileSync(
  join(FUNCTIONS_DIR, 'studioflow-tawk-connect', 'index.ts'),
  'utf8',
);
assert.match(tawkConnectSource, /admin\.auth\.getUser\(token\)/,
  'Tawk owner connection validates the caller token with Supabase Auth getUser()');
assert.match(tawkConnectSource, /auth\.user\.is_anonymous/,
  'Tawk owner connection rejects anonymous sessions');
assert.match(tawkConnectSource, /studioflow_accounts[\s\S]*?eq\('user_id', ownerId\)/,
  'Tawk owner connection requires an owner workspace');
assert.match(tawkConnectSource, /admin\.rpc\(['"]studioflow_tawk_owner_connection['"]/,
  'Tawk owner connection uses the private service-role RPC');
assert.match(tawkConnectSource, /SUPABASE_SERVICE_ROLE_KEY/,
  'Tawk owner RPC is called from the server-side service-role client');
assert.match(tawkConnectSource, /Cache-Control['"]\s*,\s*['"]no-store/i,
  'Tawk owner responses are not cached');
const tawkConfig = readFileSync('supabase/config.toml', 'utf8');
assert.match(tawkConfig, /\[functions\.studioflow-tawk-connect\]\s*verify_jwt\s*=\s*false/,
  'Tawk function uses handler-side JWT validation rather than gateway-only JWT validation');

const tawkPanelSource = readFileSync('src/components/TawkConnectionPanel.tsx', 'utf8');
assert.match(tawkPanelSource, /functions\.invoke\(['"]studioflow-tawk-connect['"]/,
  'Tawk owner panel invokes the dedicated owner function');
assert.doesNotMatch(tawkPanelSource, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]+|tawk_api_key/i,
  'Tawk service-role and API secrets are not exposed to browser code');

const tawkPublicSource = readFileSync('src/components/TawkPublicWidget.tsx', 'utf8');
assert.match(tawkPublicSource, /studioflow_tawk_public_config/,
  'Published salon widget reads its own public widget configuration');
assert.match(tawkPublicSource, /embed\.tawk\.to\//,
  'Published salon widget builds the Tawk embed URL from public IDs');
assert.match(readFileSync('src/App.tsx', 'utf8'), /<TawkPublicWidget\s+slug=\{slug\}\s*\/>/,
  'The shared published-site renderer attaches the salon-specific widget');

// --- 5. each entrypoint actually starts a server --------------------------
// `snapshot-accounts` still uses the legacy std/http `serve` helper, so accept
// either style rather than forcing an out-of-scope rewrite of that function.
const entrypoints = folders.map((name) => join(FUNCTIONS_DIR, name, 'index.ts'));
for (const path of entrypoints) {
  const body = readFileSync(path, 'utf8');
  const startsServer = body.includes('Deno.serve(')
    || /import\s*\{[^}]*\bserve\b[^}]*\}\s*from\s*['"]https:\/\/deno\.land\/std/.test(body);
  assert.ok(startsServer, `${path} is not an Edge Function entrypoint`);
}

console.log(
  `ok edge functions: ${folders.length} deployed, ${invoked.size} invoked from the app,`
  + ` ${urlCallers.length - historicalDependencies} raw /functions/v1 call sites resolved,`
  + ` ${historicalDependencies} recorded historical dependencies (deployment unverified),`
  + ` ${PUBLIC_BY_DESIGN.size} public by design`,
);
