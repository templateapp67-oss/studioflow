// CORS contract for every browser-callable Edge Function.
//
// G-02 was a live-outage bug with no test behind it: studioflow-service-ai-images
// pinned a single legacy origin, so after the product moved to
// https://nexorasalon.online every image-generation request from the real site
// was blocked by the browser. The first version of this guard only covered the
// two functions it knew about, and the identical bug survived in
// studioflow-welcome-whatsapp. So the contract is now enumerated from the app's
// own .invoke() call sites: any function the browser calls must allowlist the
// canonical origin, echo only approved origins, send Vary: Origin, deny other
// origins, and keep Origin-less server-to-server callers working.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_ALLOWED_ORIGINS,
  campaignPreflight,
  isCampaignOriginAllowed,
} from '../supabase/functions/studioflow-campaign-whatsapp/cors.ts';

const CANONICAL = 'https://nexorasalon.online';
const SOURCE = readFileSync('supabase/functions/studioflow-service-ai-images/index.ts', 'utf8');

// --- the deployment origin must be allowlisted in both functions ----------
const allowedInSource = [...SOURCE.matchAll(/'https:\/\/[a-z0-9.-]+'/gi)].map((m) => m[0]);
assert.ok(
  allowedInSource.includes(`'${CANONICAL}'`),
  `service-ai-images must allow the canonical origin ${CANONICAL}; found ${allowedInSource.join(', ')}`,
);
assert.ok(
  (CAMPAIGN_ALLOWED_ORIGINS as readonly string[]).includes(CANONICAL),
  'campaign sender must allow the canonical origin',
);

// --- no wildcard on any origin-gated function ----------------------------
assert.ok(
  !/Access-Control-Allow-Origin'\s*:\s*'\*'/.test(SOURCE),
  'service-ai-images must not fall back to a wildcard origin',
);

// --- both functions are gated on the same set ---------------------------
for (const origin of CAMPAIGN_ALLOWED_ORIGINS) {
  assert.ok(
    allowedInSource.includes(`'${origin}'`),
    `service-ai-images is missing an origin the campaign sender allows: ${origin}`,
  );
}

// --- campaign preflight behaviour (live) --------------------------------
for (const origin of CAMPAIGN_ALLOWED_ORIGINS) {
  const preflight = campaignPreflight(
    new Request('https://fn.example.test/campaign', {
      method: 'OPTIONS',
      headers: { origin, 'access-control-request-method': 'POST' },
    }),
  );
  assert.equal(preflight?.status, 204, `preflight must succeed for ${origin}`);
  assert.equal(preflight?.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(preflight?.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.equal(preflight?.headers.get('Vary'), 'Origin');
}

const denied = campaignPreflight(
  new Request('https://fn.example.test/campaign', {
    method: 'OPTIONS',
    headers: { origin: 'https://attacker.example' },
  }),
);
assert.equal(denied?.status, 403, 'an unapproved origin must not get a preflight');
assert.equal(denied?.headers.get('Access-Control-Allow-Origin'), null);
assert.equal(isCampaignOriginAllowed('https://attacker.example'), false);
// Server-to-server callers send no Origin at all.
assert.equal(isCampaignOriginAllowed(null), true);
assert.equal(campaignPreflight(new Request('https://fn.example.test/campaign', { method: 'POST' })), null);

// --- service-ai-images keeps a denial branch for unapproved origins -------
assert.ok(
  /Origin not allowed/.test(SOURCE),
  'service-ai-images must reject an unapproved browser origin',
);

// --- every browser-invoked function, enumerated from the app --------------
// Enumerated rather than hand-listed: a new .invoke() target cannot quietly
// skip this contract. Only functions on the explicit PUBLIC_BY_DESIGN list in
// verify-edge-functions.mjs may serve a wildcard, and none of those need Origin
// gating.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'veda-sanjeevani']);
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((entry) => {
    if (SKIP_DIRS.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const invoked = new Set<string>();
for (const file of ['src', 'app', 'server', 'api'].flatMap((dir) => {
  try { return walk(dir); } catch { return []; }
}).filter((file) => /\.(ts|tsx|mjs|js)$/.test(file))) {
  for (const match of readFileSync(file, 'utf8').matchAll(/\.invoke\(\s*['"`]([a-z0-9-]+)['"`]/g)) {
    invoked.add(match[1]);
  }
}
assert.ok(invoked.size > 0, 'no .invoke() call sites found; the enumeration is broken');

// Wildcard is acceptable *only* where access is decided by something other than
// ambient browser credentials: these send a bearer token in an Authorization
// header, so a wildcard origin cannot grant a caller anything a 401/403 would
// not already deny. Anything that gates on Origin must allowlist exact origins.
const WILDCARD_BY_DESIGN = new Map([
  ['studioflow-booking-emails', 'bearer token in Authorization; denial is 401/403 server-side'],
  ['studioflow-payments', 'bearer/worker token; denial is 401/403 server-side'],
  ['studioflow-map-locations', 'public endpoint gated on the project anon key'],
  ['nexora-mobile-qr', 'bearer token in Authorization; denial is 401/403 server-side'],
]);

const originGated: string[] = [];
const wildcard: string[] = [];
for (const name of invoked) {
  // The allowlist may live in a sibling module (the campaign sender keeps it in
  // cors.ts), so the contract is checked across the whole function folder.
  let source: string;
  try {
    source = walk(`supabase/functions/${name}`)
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
  } catch { continue; } // missing source is verify-edge-functions.mjs's job
  // Emitting the header at all is what matters. Gating on "reads the Origin
  // header" missed studioflow-welcome-whatsapp, which answered with one static
  // legacy origin and never read the request — the exact G-02 bug.
  const emitsOrigin = /Access-Control-Allow-Origin/.test(source);
  if (!emitsOrigin) continue;
  if (WILDCARD_BY_DESIGN.has(name)) { wildcard.push(name); continue; }
  originGated.push(name);

  assert.ok(
    source.includes(`'${CANONICAL}'`),
    `${name} is called from the browser but does not allowlist the canonical origin ${CANONICAL}`,
  );
  assert.ok(
    /Vary['"]?\s*:\s*['"]Origin['"]/.test(source),
    `${name} must send Vary: Origin so caches cannot serve the wrong origin`,
  );
  // Two correct shapes: refuse outright (403) or withhold the header so the
  // browser blocks it. Both must gate the header on allowlist membership.
  // What is never acceptable is granting the header to an arbitrary origin.
  assert.ok(
    /Origin not allowed/.test(source) || /\.has\(origin\)/.test(source),
    `${name} grants CORS without checking allowlist membership; an unapproved origin would be accepted`,
  );
  assert.ok(
    !/Access-Control-Allow-Origin'\s*:\s*'\*'/.test(source),
    `${name} must not answer with a wildcard origin`,
  );
  // The legacy branded host must never be the *only* allowed origin again.
  const quoted = [...source.matchAll(/'(https:\/\/[a-z0-9.-]+)'/gi)].map((m) => m[1]);
  assert.ok(
    new Set(quoted).size >= 2,
    `${name} pins a single origin (${quoted.join(', ')}); that is the G-02 bug`,
  );
}

assert.ok(originGated.length >= 4, `expected 4 origin-gated functions, found ${originGated.length}: ${originGated.join(', ')}`);
for (const [name, reason] of WILDCARD_BY_DESIGN) {
  assert.ok(invoked.has(name), `WILDCARD_BY_DESIGN lists "${name}" (${reason}) but the app no longer invokes it`);
}

console.log(
  `PASS: exact-origin CORS across ${originGated.length} browser-invoked functions`
  + ` (${originGated.join(', ')}), ${wildcard.length} wildcard-by-design;`
  + ' canonical nexorasalon.online allowed,'
  + ' Vary: Origin present, wildcards absent, unapproved origins never granted.',
);

