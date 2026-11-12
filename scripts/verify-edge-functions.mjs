// Guards the layout contract for Supabase Edge Functions (gap G-01):
//   1. `supabase/functions/<name>/index.ts` is the only deployment source.
//   2. Every function the app invokes in the browser has real source there.
//   3. No stale `backend/functions` copy is re-introduced (git mv silently
//      overwrites a duplicate, which is how implementations get lost).
//   4. No script, source file, config or doc points back to `backend/functions`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const FUNCTIONS_DIR = 'supabase/functions';
const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === '.git') return [];
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

console.log(`ok edge functions: ${folders.length} deployed, ${invoked.size} invoked from the app`);
