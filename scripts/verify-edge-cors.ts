// CORS contract for the browser-callable Edge Functions.
//
// G-02 was a live-outage bug with no test behind it: studioflow-service-ai-images
// pinned a single legacy origin, so after the product moved to
// https://nexorasalon.online every image-generation request from the real site
// was blocked by the browser. This asserts the exact-origin model for both
// functions that gate on Origin, including the denial path and the
// no-Origin server-to-server case.
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

console.log(
  `PASS: exact-origin CORS for image generation and campaigns (${CAMPAIGN_ALLOWED_ORIGINS.length} origins),`
  + ' canonical nexorasalon.online allowed, wildcard absent, unapproved origins denied.',
);
