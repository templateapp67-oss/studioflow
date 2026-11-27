/**
 * Negative-path verification for the shared HTTP hardening module
 * (server/httpValidation.ts) — the same module the Express routes and the
 * Vercel serverless handlers both load.
 *
 * Covers three layers:
 *   1. `assertSafeOutboundUrl` / `safeOutboundFetch` — the SSRF guard.
 *   2. `validateBody` / `strictBody` — strict request-body validation.
 *   3. Static wiring scans — every guarded route still calls strictBody and
 *      no raw outbound `fetch(` crept back into the server tree.
 *
 * Run: node scripts/verify-http-validation.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  AI_RECOMMENDATIONS_SCHEMA,
  BOOKING_DEPOSIT_SCHEMA,
  BOOKING_EMAIL_SCHEMA,
  DEMO_LEAD_SCHEMA,
  DEMO_LEADS_ADMIN_SCHEMA,
  GENERATE_PROMO_IMAGE_SCHEMA,
  ONBOARDING_COPY_SCHEMA,
  STAFF_INVITE_SCHEMA,
  SsrfBlockedError,
  assertSafeOutboundUrl,
  safeOutboundFetch,
  strictBody,
  validateBody,
} from '../server/httpValidation';

let passed = 0;
function section(name: string) {
  console.log(`\n== ${name}`);
}
function ok(label: string) {
  passed += 1;
  console.log(`  ok: ${label}`);
}
function expectBlocked(label: string, input: string) {
  assert.throws(() => assertSafeOutboundUrl(input), SsrfBlockedError, `${label} must throw SsrfBlockedError`);
  ok(label);
}
function expectAllowed(label: string, input: string) {
  const url = assertSafeOutboundUrl(input);
  assert.equal(url.protocol, 'https:');
  ok(label);
}

/* ------------------------------------------------------------------ *
 * 1. SSRF guard
 * ------------------------------------------------------------------ */
section('SSRF guard: rejects non-HTTPS schemes');
expectBlocked('http:// example.com', 'http://example.com/');
expectBlocked('ftp:// example.com', 'ftp://example.com/');
expectBlocked('file:// descriptor path', 'file:///etc/passwd');
expectBlocked('gopher://', 'gopher://example.com/');
// The guard must reject this URL without making a WebSocket connection.
// nosemgrep: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket
expectBlocked('insecure WebSocket scheme', 'ws://example.com/');
expectBlocked('https:// with no host', 'https://');

section('SSRF guard: credentials in the URL');
expectBlocked('user:pass embedded', 'https://user:pass@example.com/');
expectBlocked('lone user embedded', 'https://user@example.com/');

section('SSRF guard: localhost and loopback');
expectBlocked('localhost', 'https://localhost/');
expectBlocked('LOCALHOST uppercase', 'https://LOCALHOST/');
expectBlocked('localhost with trailing root dot', 'https://localhost./');
expectBlocked('sub-domain of localhost', 'https://api.localhost/');
expectBlocked('127.0.0.1', 'https://127.0.0.1/');
expectBlocked('127.1 shorthand', 'https://127.1/');
expectBlocked('127.255.255.254', 'https://127.255.255.254/');
expectBlocked('0.0.0.0', 'https://0.0.0.0/');
expectBlocked('decimal 127.0.0.1 (2130706433)', 'https://2130706433/');
expectBlocked('hex 127.0.0.1 (0x7f000001)', 'https://0x7f000001/');

section('SSRF guard: RFC1918 / special-purpose IPv4 ranges');
expectBlocked('10.0.0.1', 'https://10.0.0.1/');
expectBlocked('10.255.255.255', 'https://10.255.255.255/');
expectBlocked('172.16.0.1', 'https://172.16.0.1/');
expectBlocked('172.31.255.255', 'https://172.31.255.255/');
expectBlocked('192.168.0.1', 'https://192.168.0.1/');
expectBlocked('192.168.255.255', 'https://192.168.255.255/');
expectBlocked('169.254.169.254 (cloud metadata)', 'https://169.254.169.254/latest/meta-data');
expectBlocked('100.64.0.1 (CGN start)', 'https://100.64.0.1/');
expectBlocked('100.127.255.255 (CGN end)', 'https://100.127.255.255/');
expectBlocked('192.0.0.1 (IETF protocol assignments)', 'https://192.0.0.1/');
expectBlocked('192.0.2.1 (TEST-NET-1)', 'https://192.0.2.1/');
expectBlocked('198.51.100.5 (TEST-NET-2)', 'https://198.51.100.5/');
expectBlocked('203.0.113.9 (TEST-NET-3)', 'https://203.0.113.9/');
expectBlocked('198.18.0.1 (benchmarking range)', 'https://198.18.0.1/');
expectBlocked('224.0.0.1 (multicast)', 'https://224.0.0.1/');
expectBlocked('255.255.255.255 (broadcast)', 'https://255.255.255.255/');
expectBlocked('240.0.0.1 (reserved)', 'https://240.0.0.1/');

section('SSRF guard: IPv6 literals');
expectBlocked('[::] unspecified', 'https://[::]/');
expectBlocked('[::1] loopback', 'https://[::1]/');
expectBlocked('[::ffff:127.0.0.1] v4-mapped loopback', 'https://[::ffff:127.0.0.1]/');
expectBlocked('[::ffff:10.1.2.3] v4-mapped private', 'https://[::ffff:10.1.2.3]/');
expectBlocked('[64:ff9b::7f00:1] NAT64 of 127.0.0.1', 'https://[64:ff9b::7f00:1]/');
expectBlocked('[2002:0a00::1] 6to4 of 10.0.0.0', 'https://[2002:0a00::1]/');
expectBlocked('[2001:db8::1] documentation range', 'https://[2001:db8::1]/');
expectBlocked('[fd00::1] unique local', 'https://[fd00::1]/');
expectBlocked('[fe80::1] link-local', 'https://[fe80::1]/');
expectBlocked('[ff02::1] multicast', 'https://[ff02::1]/');
expectBlocked('[100::1] discard-only', 'https://[100::1]/');

section('SSRF guard: allowed public destinations');
expectAllowed('public domain with path', 'https://example.com/path?q=1');
expectAllowed('Supabase project host', 'https://zilwgiuiygqqardzutxi.supabase.co/rest/v1/x');
expectAllowed('public domain with root dot', 'https://example.com./');
expectAllowed('public IPv4 172.15.255.255', 'https://172.15.255.255/');
expectAllowed('public IPv4 11.0.0.1', 'https://11.0.0.1/');
expectAllowed('public IPv4 100.63.255.255 (below CGN)', 'https://100.63.255.255/');
expectAllowed('v4-mapped public [::ffff:8.8.8.8]', 'https://[::ffff:8.8.8.8]/');
expectAllowed('Google public DNS', 'https://[2001:4860:4860::8888]/');
expectAllowed('Cloudflare public DNS', 'https://[2606:4700:4700::1111]/');

section('safeOutboundFetch: guard runs before the network and disables redirects');
{
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let seenRedirect: unknown;
  let seenUrl: unknown;
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    calls += 1;
    seenUrl = url;
    seenRedirect = (init as { redirect?: string } | undefined)?.redirect;
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    await assert.rejects(() => safeOutboundFetch('http://169.254.169.254/latest'), SsrfBlockedError);
    assert.equal(calls, 0, 'fetch must not be called when the guard blocks the URL');
    ok('blocked URL never reaches fetch');
    const response = await safeOutboundFetch('https://example.com/');
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(seenRedirect, 'manual', 'safeOutboundFetch must force redirect: manual');
    assert.ok(seenUrl instanceof URL, 'safeOutboundFetch passes the parsed URL object');
    ok('allowed URL calls fetch with redirect: manual');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

/* ------------------------------------------------------------------ *
 * 2. validateBody
 * ------------------------------------------------------------------ */
section('validateBody: structural rejection');
{
  const asArray = validateBody([{ name: 'x' }] as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(asArray.ok, false);
  if (asArray.ok === false) assert.equal(asArray.status, 400);
  ok('array body rejected');
  const asString = validateBody('not an object' as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(asString.ok, false);
  ok('string body rejected');
  const asNull = validateBody(null as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(asNull.ok, false);
  ok('null body rejected');
  const asNumber = validateBody(42 as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(asNumber.ok, false);
  ok('number body rejected');
  const empty = validateBody(undefined, DEMO_LEAD_SCHEMA);
  assert.equal(empty.ok, true, 'undefined body becomes an empty object (Express empty POST)');
  ok('undefined body tolerated as {}');
}

section('validateBody: byte cap');
{
  const small = validateBody({ name: 'x'.repeat(5000) }, DEMO_LEAD_SCHEMA, 1024);
  assert.equal(small.ok, false);
  if (small.ok === false) {
    assert.equal(small.status, 413);
    assert.deepEqual(small.fields, []);
    assert.equal(small.code, 'body_too_large');
  }
  ok('payload over maxBytes rejected with 413');
}

section('validateBody: unknown fields stripped, never trusted');
{
  const result = validateBody(
    { name: 'Asha', email: 'asha@example.com', salonName: 'Studio', consent: true, isAdmin: true, role: 'owner' } as unknown,
    DEMO_LEAD_SCHEMA,
  );
  assert.equal(result.ok, true);
  if (result.ok === true) {
    assert.deepEqual(Object.keys(result.data).sort(), ['consent', 'email', 'name', 'salonName']);
    assert.ok(!('isAdmin' in result.data) && !('role' in result.data));
    assert.deepEqual([...result.dropped].sort(), ['isAdmin', 'role']);
  }
  ok('unknown keys dropped and reported');
}

section('validateBody: prototype pollution is not carried');
{
  const polluted = validateBody(
    JSON.parse('{"__proto__":{"polluted":true},"constructor":{"polluted":true},"prototype":{"polluted":true},"name":"Asha"}') as unknown,
    DEMO_LEAD_SCHEMA,
  );
  assert.equal(polluted.ok, true);
  if (polluted.ok === true) {
    assert.deepEqual(Object.keys(polluted.data), ['name']);
    assert.deepEqual([...polluted.dropped].sort(), ['__proto__', 'constructor', 'prototype']);
  }
  assert.equal(({} as Record<string, unknown>).polluted, undefined, 'global object must not be polluted');
  const pollutedNested = validateBody(
    JSON.parse('{"bookingHistory":[{"__proto__":{"isAdmin":true},"note":"keep"}]}') as unknown,
    AI_RECOMMENDATIONS_SCHEMA,
  );
  assert.equal(pollutedNested.ok, true);
  if (pollutedNested.ok === true) {
    const history = pollutedNested.data.bookingHistory as Array<Record<string, unknown>>;
    assert.equal(history[0].note, 'keep');
    assert.ok(!Object.keys(history[0]).includes('__proto__'), 'nested __proto__ key is never copied');
    assert.equal(Object.getPrototypeOf(history[0]), Object.prototype, 'nested object keeps a clean prototype');
  }
  assert.equal(({} as Record<string, unknown>).isAdmin, undefined, 'global object must not be polluted via freeform');
  ok('__proto__ / constructor / prototype dropped at every level');
}

section('validateBody: type confusion is rejected');
{
  const cases: Array<[string, unknown]> = [
    ['name as number', { name: 42 }],
    ['consent as string', { consent: 'yes' }],
    ['formElapsedMs as garbage string', { formElapsedMs: 'soon' }],
    ['formElapsedMs as object', { formElapsedMs: { value: 1 } }],
    ['email as object', { email: { address: 'a@b.co' } }],
  ];
  for (const [label, body] of cases) {
    const result = validateBody(body as unknown, DEMO_LEAD_SCHEMA);
    assert.equal(result.ok, false, `${label} must be rejected`);
  }
  ok('string/number/boolean confusion rejected');
  const integer = validateBody({ prompt: 'x', serviceName: 'y', aspectRatio: '1:1' } as unknown, GENERATE_PROMO_IMAGE_SCHEMA);
  assert.equal(integer.ok, true, 'valid enum value accepted');
  const badEnum = validateBody({ prompt: 'x', aspectRatio: '7:3' } as unknown, GENERATE_PROMO_IMAGE_SCHEMA);
  assert.equal(badEnum.ok, false, 'enum outside the allow-list rejected');
  ok('enum allow-list enforced');
  const adminBad = validateBody({ action: 'delete' } as unknown, DEMO_LEADS_ADMIN_SCHEMA);
  assert.equal(adminBad.ok, false, 'admin action outside list/export/erase rejected');
  ok('admin action allow-list enforced');
}

section('validateBody: numbers are coerced and range-checked');
{
  const coerced = validateBody({ formElapsedMs: '250' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(coerced.ok, true);
  if (coerced.ok === true) assert.equal(coerced.data.formElapsedMs, 250);
  ok('numeric strings coerced to numbers');
  const fractional = validateBody({ action: 'list', limit: 1.5 } as unknown, DEMO_LEADS_ADMIN_SCHEMA);
  assert.equal(fractional.ok, false, 'integer field rejects 1.5');
  ok('integer fields reject fractions');
  const negative = validateBody({ action: 'list', limit: 0 } as unknown, DEMO_LEADS_ADMIN_SCHEMA);
  assert.equal(negative.ok, false, 'limit below minimum rejected');
  const tooBig = validateBody({ action: 'list', limit: 201 } as unknown, DEMO_LEADS_ADMIN_SCHEMA);
  assert.equal(tooBig.ok, false, 'limit above maximum rejected');
  ok('range checks enforced');
  const notFinite = validateBody({ formElapsedMs: 'Infinity' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(notFinite.ok, false, 'Infinity is not a finite number');
  ok('non-finite numbers rejected');
}

section('validateBody: formats (email, phone, uuid, token, idempotency key)');
{
  const badEmail = validateBody({ email: 'not-an-email' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(badEmail.ok, false);
  const badEmail2 = validateBody({ email: 'a b@c.com' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(badEmail2.ok, false);
  const goodEmail = validateBody({ email: 'asha@studio.com' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(goodEmail.ok, true);
  ok('email pattern enforced');
  const badPhone = validateBody({ phone: 'call-me-maybe' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(badPhone.ok, false);
  const goodPhone = validateBody({ phone: '+91 98765 43210' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(goodPhone.ok, true);
  ok('phone pattern enforced');
  const badUuid = validateBody({ type: 'confirmation', bookingRef: 'zzz' } as unknown, BOOKING_EMAIL_SCHEMA);
  assert.equal(badUuid.ok, false);
  const goodUuid = validateBody({ type: 'confirmation', bookingRef: '550e8400-e29b-41d4-a716-446655440000' } as unknown, BOOKING_EMAIL_SCHEMA);
  assert.equal(goodUuid.ok, true);
  ok('uuid pattern enforced');
  const badToken = validateBody({ inviteId: '550e8400-e29b-41d4-a716-446655440000', token: 'nothex' } as unknown, STAFF_INVITE_SCHEMA);
  assert.equal(badToken.ok, false, 'token must be 64 hex chars');
  ok('token pattern enforced');
  const shortKey = validateBody({ idempotencyKey: 'abc' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(shortKey.ok, false, 'idempotency key shorter than 8 chars rejected');
  ok('idempotency key pattern enforced');
}

section('validateBody: control characters rejected in every string');
{
  for (const [label, body] of [
    ['tab in owner name', { kind: 'tagline', businessName: 'Studio', ownerName: 'A\tsha' }],
    ['newline in owner name', { kind: 'tagline', businessName: 'Studio', ownerName: 'A\nsha' }],
    ['carriage return', { kind: 'tagline', businessName: 'Studio', ownerName: 'A\rsha' }],
    ['DEL character', { kind: 'tagline', businessName: 'Studio', ownerName: 'A\x7fsha' }],
    ['C1 control character', { kind: 'tagline', businessName: 'Studio', ownerName: 'Asha' }],
  ] as Array<[string, unknown]>) {
    const result = validateBody(body as unknown, ONBOARDING_COPY_SCHEMA);
    assert.equal(result.ok, false, `${label} must be rejected`);
  }
  ok('tab / newline / CR / DEL / C1 control characters rejected');
}

section('validateBody: length limits');
{
  const longName = validateBody({ name: 'x'.repeat(101) } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(longName.ok, false, 'name longer than 100 chars rejected');
  const minName = validateBody({ name: '' } as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(minName.ok, false, 'empty name rejected (min 1)');
  ok('min/max string lengths enforced');
  const tooManyServices = validateBody(
    {
      bookingHistory: [],
      favorites: [],
      availableServices: Array.from({ length: 201 }, (_, index) => ({ salonSlug: `s${index}` })),
    } as unknown,
    AI_RECOMMENDATIONS_SCHEMA,
  );
  assert.equal(tooManyServices.ok, false, 'more than 200 services rejected');
  ok('array length limits enforced');
}

section('validateBody: nested objects are bounded and scrubbed');
{
  const nineKeys = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`k${index}`, index]));
  const deepObject = validateBody(
    { favorites: ['a'], bookingHistory: [], availableServices: [nineKeys] } as unknown,
    AI_RECOMMENDATIONS_SCHEMA,
  );
  assert.equal(deepObject.ok, false, 'nested object with more than 8 keys rejected');
  ok('maxKeys on nested objects enforced');
  const stripped = validateBody(
    {
      bookingHistory: [],
      favorites: [],
      availableServices: [{ salonSlug: 'studio', serviceName: 'Cut', price: '250', role: 'admin', isAdmin: true }],
    } as unknown,
    AI_RECOMMENDATIONS_SCHEMA,
  );
  assert.equal(stripped.ok, true);
  if (stripped.ok === true) {
    const services = stripped.data.availableServices as Array<Record<string, unknown>>;
    assert.deepEqual(Object.keys(services[0]).sort(), ['price', 'salonSlug', 'serviceName']);
    assert.equal(services[0].price, 250, 'nested numeric string coerced');
  }
  ok('nested unknown keys stripped, nested numbers coerced');
}

section('validateBody: free-form JSON stays bounded');
{
  const tooDeep = validateBody(
    { bookingHistory: [{ a: { b: { c: { d: { e: 'deep' } } } } }] } as unknown,
    AI_RECOMMENDATIONS_SCHEMA,
  );
  assert.equal(tooDeep.ok, false, 'depth beyond the free-form limit rejected');
  ok('free-form depth limit enforced');
  const tooWide = validateBody({ bookingHistory: Array.from({ length: 51 }, () => null) } as unknown, AI_RECOMMENDATIONS_SCHEMA);
  assert.equal(tooWide.ok, false, 'more than 50 items in a free-form array rejected');
  ok('free-form array breadth limit enforced');
  const tooLong = validateBody({ bookingHistory: ['x'.repeat(2001)] } as unknown, AI_RECOMMENDATIONS_SCHEMA);
  assert.equal(tooLong.ok, false, 'free-form string over 2000 chars rejected');
  ok('free-form string length limit enforced');
  const tooManyKeys = validateBody(
    { bookingHistory: [Object.fromEntries(Array.from({ length: 41 }, (_, index) => [`k${index}`, index]))] } as unknown,
    AI_RECOMMENDATIONS_SCHEMA,
  );
  assert.equal(tooManyKeys.ok, false, 'free-form object with more than 40 keys rejected');
  ok('free-form object key limit enforced');
  const tooManyNodes = validateBody(
    { bookingHistory: [{ a: Array.from({ length: 50 }, () => Array.from({ length: 50 }, () => 'leaf')) }] } as unknown,
    AI_RECOMMENDATIONS_SCHEMA,
  );
  assert.equal(tooManyNodes.ok, false, 'free-form node budget exceeded');
  ok('free-form node budget enforced');
  const control = validateBody({ bookingHistory: ['bad\tvalue'] } as unknown, AI_RECOMMENDATIONS_SCHEMA);
  assert.equal(control.ok, false, 'control characters rejected inside free-form strings');
  ok('free-form control characters rejected');
}

section('validateBody: flag and loose rules for booking-deposit');
{
  const objValue = validateBody({ totalPaise: { amount: 1 } } as unknown, BOOKING_DEPOSIT_SCHEMA);
  assert.equal(objValue.ok, false, 'object is not a loose scalar');
  const arrayValue = validateBody({ totalPaise: [1] } as unknown, BOOKING_DEPOSIT_SCHEMA);
  assert.equal(arrayValue.ok, false, 'array is not a loose scalar');
  ok('loose fields reject objects and arrays');
  const passthrough = validateBody({ totalPaise: '150000', enforce: 'yes' } as unknown, BOOKING_DEPOSIT_SCHEMA);
  assert.equal(passthrough.ok, true, 'loose strings and flag truthy strings pass through');
  const badFlag = validateBody({ enforce: 'maybe' } as unknown, BOOKING_DEPOSIT_SCHEMA);
  assert.equal(badFlag.ok, false);
  const numericFlag = validateBody({ enforce: 1 } as unknown, BOOKING_DEPOSIT_SCHEMA);
  assert.equal(numericFlag.ok, false, 'numeric flag rejected');
  ok('flag fields accept booleans and known truthy strings only');
}

section('validateBody: happy paths keep the client contract');
{
  const demoLead = {
    name: 'Asha',
    email: 'asha@studio.com',
    salonName: 'Roop Studio',
    phone: '+91 98765 43210',
    city: 'Jaipur',
    website: '',
    consent: true,
    pagePath: '/demo',
    idempotencyKey: 'demo_abc12345',
    formElapsedMs: 2400,
  };
  const result = validateBody(demoLead as unknown, DEMO_LEAD_SCHEMA);
  assert.equal(result.ok, true);
  if (result.ok === true) {
    assert.equal(result.data.formElapsedMs, 2400);
    assert.equal(result.data.consent, true);
    assert.equal(result.data.idempotencyKey, 'demo_abc12345');
    for (const key of Object.keys(demoLead)) assert.ok(key in result.data, `key ${key} retained`);
  }
  ok('demo-lead payload shape from DemoProvider passes');
  const reminder = validateBody({ type: 'reminder' } as unknown, BOOKING_EMAIL_SCHEMA);
  assert.equal(reminder.ok, true, 'type is optional; handler defaults to confirmation');
  ok('booking-email payload with only type passes');
}

section('validateBody: required flag is honoured when a schema sets it');
{
  const requiredSchema = { name: { type: 'string' as const, required: true, max: 10 } };
  const missing = validateBody({}, requiredSchema);
  assert.equal(missing.ok, false);
  if (missing.ok === false) assert.deepEqual(missing.fields, ['name']);
  ok('missing required field reported by name');
}

/* ------------------------------------------------------------------ *
 * 3. strictBody middleware
 * ------------------------------------------------------------------ */
section('strictBody: Express middleware behaviour');
{
  const makeRes = () => {
    const res: any = {
      statusCode: 0,
      jsonBody: undefined as unknown,
      headers: {} as Record<string, string>,
      status(code: number) { res.statusCode = code; return res; },
      json(body: unknown) { res.jsonBody = body; return res; },
      setHeader(name: string, value: string) { res.headers[name] = value; return res; },
    };
    return res;
  };
  const makeReq = (method: string, body: unknown, headers: Record<string, string> = {}) => ({ method, headers, body } as any);

  const middleware = strictBody(DEMO_LEAD_SCHEMA, { maxBytes: 64 * 1024 });

  let nextCalls = 0;
  middleware(makeReq('GET', { anything: 'goes' }, { 'content-length': '99999999' }), makeRes(), () => { nextCalls += 1; });
  assert.equal(nextCalls, 1, 'GET passes through without body inspection');
  ok('GET passes through');

  const oversizedRes = makeRes();
  let oversizedNext = 0;
  middleware(makeReq('POST', { name: 'A' }, { 'content-length': String(65 * 1024) }), oversizedRes, () => { oversizedNext += 1; });
  assert.equal(oversizedNext, 0, 'oversized content-length never reaches the handler');
  assert.equal(oversizedRes.statusCode, 413);
  assert.equal((oversizedRes.jsonBody as any).code, 'body_too_large');
  ok('content-length over the cap returns 413');

  const invalidRes = makeRes();
  let invalidNext = 0;
  middleware(makeReq('POST', { name: 42 }), invalidRes, () => { invalidNext += 1; });
  assert.equal(invalidNext, 0);
  assert.equal(invalidRes.statusCode, 400);
  assert.equal((invalidRes.jsonBody as any).code, 'invalid_request');
  assert.ok(Array.isArray((invalidRes.jsonBody as any).fields));
  ok('invalid body returns 400 with a field list');

  const validReq = makeReq('POST', { name: 'Asha', isAdmin: true });
  let validNext = 0;
  middleware(validReq, makeRes(), () => { validNext += 1; });
  assert.equal(validNext, 1);
  assert.deepEqual(Object.keys(validReq.body), ['name'], 'req.body is replaced with the stripped body');
  ok('valid body is sanitised in place and passed on');
}

/* ------------------------------------------------------------------ *
 * 4. Static wiring scans
 * ------------------------------------------------------------------ */
section('wiring: every mutating /api route is behind strictBody');
{
  const serverSource = readFileSync('server.ts', 'utf8');
  const guarded: Array<[string, string]> = [
    ['post', '/api/nexora-demo-lead'],
    ['post', '/api/nexora-demo-leads'],
    ['post', '/api/onboarding-copy'],
    ['post', '/api/generate-bio'],
    ['post', '/api/generate-promo-image'],
    ['post', '/api/generate-promo-copy'],
    ['post', '/api/veda-website-content'],
    ['post', '/api/ai-recommendations'],
    ['post', '/api/send-staff-invite'],
    ['post', '/api/send-booking-email'],
    ['all', '/api/booking-deposit'],
  ];
  for (const [method, path] of guarded) {
    const pattern = new RegExp(`app\\.${method}\\("${path.replace(/\//g, '\\/')}", strictBody\\(`);
    assert.ok(pattern.test(serverSource), `${method.toUpperCase()} ${path} must register strictBody before the handler`);
  }
  ok('11 mutating /api routes register strictBody');
  for (const getPath of ['/api/health', '/api/email-service-status', '/api/staff-invite-status']) {
    assert.ok(
      new RegExp(`app\\.get\\("${getPath.replace(/\//g, '\\/')}"`).test(serverSource),
      `${getPath} must remain a GET route`,
    );
  }
  ok('public read-only GET routes unchanged');
}

section('wiring: no raw outbound fetch() outside the guard');
{
  const roots = ['server', 'api', 'server.ts'];
  const files: string[] = [];
  for (const root of roots) {
    try {
      const stat = readdirSync(root, { withFileTypes: true });
      if (stat.length) {
        for (const entry of stat) {
          if (entry.isFile() && /\.(ts|tsx|mjs|js)$/.test(entry.name)) files.push(join(root, entry.name));
        }
        continue;
      }
    } catch {
      // root is a file, not a directory
      files.push(root);
    }
  }
  const offenders: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    // Remove the guard's own definition line, then look for a bare fetch( call.
    const stripped = source.replace('return fetch(url, { ...init, redirect: \'manual\' });', '');
    const matches = stripped.match(/[^A-Za-z0-9_]fetch\s*\(/g) ?? [];
    for (const match of matches) {
      offenders.push(`${file}: ${match.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `raw fetch() calls found: ${offenders.join(', ')}`);
  ok('only server/httpValidation.ts calls fetch, with redirect: manual');
}

section('wiring: every client upload path validates magic bytes');
{
  const magicByteSites = [
    'src/lib/supabase.ts',
    'src/utils/imageUploadHelper.ts',
    'src/lib/servicePhoto.ts',
    'src/lib/auraTemplateSections.ts',
    'src/components/customer/useCustomerProfile.ts',
    'src/templates/iron-ink/api.ts',
  ];
  for (const site of magicByteSites) {
    const source = readFileSync(site, 'utf8');
    assert.ok(source.includes('validateUploadFile'), `${site} must validate uploads by magic bytes`);
  }
  const namingSites = magicByteSites.filter((site) => site !== 'src/utils/imageUploadHelper.ts');
  for (const site of namingSites) {
    const source = readFileSync(site, 'utf8');
    assert.ok(source.includes('buildStorageFileName'), `${site} must use signature-derived storage names`);
  }
  ok('6 upload sites use validateUploadFile; 5 storage sites use buildStorageFileName');
  const registerMedia = readFileSync('veda-sanjeevani/supabase/functions/register-media/index.ts', 'utf8');
  assert.ok(registerMedia.includes('sniffImageSignature'), 'register-media must sniff stored bytes');
  assert.ok(!registerMedia.includes('method: "HEAD"'), 'register-media must not HEAD-trust uploads');
  ok('veda register-media sniffs bytes instead of HEAD');
}

console.log(`\nverify-http-validation: PASS (${passed} assertions)`);
