import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { nexoraDemoLeadHandler, leadClientIp, isTooFast } from '../server/nexoraDemoLead';

/**
 * Offline behaviour tests for the shared demo-lead handler.
 *
 * The upstream Supabase Edge Function is stubbed so every documented outcome
 * can be checked deterministically: a stored lead, an invalid payload, a
 * missing consent, the honeypot, rate limiting, a storage outage and a
 * failing CRM sink. No real lead is created and no real credential is used.
 */

type Responder = {
  status: (code: number) => Responder;
  json: (body: unknown) => unknown;
  setHeader?: (name: string, value: string) => unknown;
};

const captured: { status: number; body: any }[] = [];
const headers: Record<string, string> = {};
const logs: string[] = [];

const respond = (): Responder => ({
  setHeader: (name, value) => { headers[name] = value; },
  status(code: number) {
    return {
      status: () => respond(),
      json: (body: unknown) => {
        captured.push({ status: code, body });
        return body;
      },
      setHeader: () => undefined,
    } as Responder;
  },
  json: (body: unknown) => {
    captured.push({ status: 200, body });
    return body;
  },
});

const originalFetch = globalThis.fetch;
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalEnv = { ...process.env };

let upstream: { status: number; body: any; retryAfter?: number } = { status: 200, body: { ok: true } };
let upstreamCalls: { url: string; headers: Record<string, string>; payload: any }[] = [];
const allowed = { allowed: true, count: 1, limit: 5, remaining: 4, retry_after_seconds: 0 };
let budgetCalls: any[] = []; let budgetValue: any = allowed; let budgetStatus = 200;

globalThis.fetch = (async (url: string, init: any) => {
  if (String(url).includes('/rest/v1/rpc/prune_landing_lead_rate_limits')) return { ok: true, status: 200, json: async () => 0 } as any;
  if (String(url).includes('/rest/v1/rpc/claim_landing_lead_rate_limit')) {
    budgetCalls.push(JSON.parse(init.body));
    return { ok: budgetStatus === 200, status: budgetStatus, json: async () => budgetValue } as any;
  }
  upstreamCalls.push({ url: String(url), headers: init?.headers ?? {}, payload: JSON.parse(init?.body ?? '{}') });
  return {
    ok: upstream.status >= 200 && upstream.status < 300,
    status: upstream.status,
    headers: { get: (name: string) => String(name).toLowerCase() === 'retry-after' && typeof upstream.retryAfter === 'number' ? String(upstream.retryAfter) : null },
    json: async () => upstream.body,
  } as any;
}) as any;

console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
console.warn = (...args: unknown[]) => logs.push(args.map(String).join(' '));
console.error = (...args: unknown[]) => logs.push(args.map(String).join(' '));

const validLead = {
  name: 'Aarav Sharma',
  email: 'Aarav@SalonExample.in',
  salonName: 'Studio Nine',
  phone: '+91 98765 43210',
  city: 'Jaipur',
  consent: true,
  website: '',
};

async function call(body: unknown, method = 'POST') {
  captured.length = 0; for (const key of Object.keys(headers)) delete headers[key];
  upstreamCalls = []; budgetCalls = [];
  await nexoraDemoLeadHandler({ method, body, ip: '192.0.2.7' } as any, respond());
  return { status: captured[0]?.status, body: captured[0]?.body };
}

try {
  process.env.SUPABASE_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
  process.env.LANDING_LEAD_RATE_LIMIT_SALT = 'demo-lead-test-salt';

  assert.equal(leadClientIp({ ip: '192.0.2.7', headers: { 'x-forwarded-for': '203.0.113.8' } }, false), '192.0.2.7');
  assert.equal(leadClientIp({ headers: { 'x-vercel-forwarded-for': '203.0.113.8' } }, true), '203.0.113.8');
  assert.equal(leadClientIp({ headers: { 'x-forwarded-for': '203.0.113.8' } }, true), 'unknown');
  assert.equal(leadClientIp({ ip: '::ffff:192.0.2.7' }, false), '192.0.2.7');
  assert.equal(isTooFast(1999), true); assert.equal(isTooFast(2000), false);
  assert.equal(isTooFast(undefined), false); assert.equal(isTooFast(-1), true);
  let quick = await call({ ...validLead, formElapsedMs: 100 });
  assert.equal(quick.status, 400); assert.equal(budgetCalls.length, 0); assert.equal(upstreamCalls.length, 0);
  // The Edge spelling (snake_case) must also trigger the timing guard on the
  // direct server route, so a bot cannot skip it by reusing that field name.
  quick = await call({ ...validLead, formElapsedMs: undefined, form_elapsed_ms: 100 });
  assert.equal(quick.status, 400); assert.equal(budgetCalls.length, 0); assert.equal(upstreamCalls.length, 0);
  budgetValue = { allowed: false, count: 6, limit: 5, remaining: 0, retry_after_seconds: 37 }; let blocked = await call(validLead); assert.equal(blocked.status, 429); assert.equal(headers['Retry-After'], '37'); assert.equal(upstreamCalls.length, 0);
  budgetValue = 'bad'; blocked = await call(validLead); assert.equal(blocked.status, 503); assert.equal(upstreamCalls.length, 0);
  budgetValue = { ...allowed, allowed: false }; blocked = await call(validLead); assert.equal(blocked.status, 503); assert.equal(upstreamCalls.length, 0);
  budgetValue = allowed; budgetStatus = 503; blocked = await call(validLead); assert.equal(blocked.status, 503); assert.equal(upstreamCalls.length, 0); budgetStatus = 200;

  /* --- 1. Valid submission is stored ------------------------------------- */
  upstream = { status: 200, body: { ok: true } };
  let result = await call(validLead);
  assert.equal(result.status, 201, 'A stored lead answers 201');
  assert.equal(result.body.ok, true, 'A stored lead answers ok:true');
  assert.ok(result.body.requestId, 'The response carries a request id');
  assert.equal(upstreamCalls.length, 1, 'Exactly one upstream call is made');
  assert.equal(budgetCalls.length, 1);
  assert.match(budgetCalls[0].p_bucket_key, /^[a-f0-9]{64}$/);
  assert.equal(budgetCalls[0].p_bucket_key, createHash('sha256').update('demo-lead-test-salt:192.0.2.7').digest('hex'));
  // Salt consistency: the configured salt must actually change the bucket key,
  // and a mismatched salt must isolate buckets (the Edge and server share a
  // budget only when both use the same salt).
  process.env.LANDING_LEAD_RATE_LIMIT_SALT = 'custom-salt-alpha';
  let salted = await call(validLead);
  assert.equal(salted.status, 201, 'a submission under a custom salt is stored');
  assert.equal(budgetCalls[0].p_bucket_key, createHash('sha256').update('custom-salt-alpha:192.0.2.7').digest('hex'), 'the custom salt changes the bucket key');
  process.env.LANDING_LEAD_RATE_LIMIT_SALT = 'custom-salt-beta';
  await call(validLead);
  assert.notEqual(budgetCalls[0].p_bucket_key, createHash('sha256').update('custom-salt-alpha:192.0.2.7').digest('hex'), 'a different salt isolates the bucket');
  delete process.env.LANDING_LEAD_RATE_LIMIT_SALT;
  await assert.rejects(
    () => call(validLead),
    /LANDING_LEAD_RATE_LIMIT_SALT/,
    'a missing bucket salt throws instead of falling back to a public default',
  );
  assert.equal(budgetCalls.length, 0, 'no budget claim happens without a salt');
  assert.equal(upstreamCalls.length, 0, 'no upstream call happens without a salt');
  process.env.LANDING_LEAD_RATE_LIMIT_SALT = 'demo-lead-test-salt';
  // Re-issue a submission under the restored salt so the budget/upstream
  // assertions below observe a fresh, valid call.
  result = await call(validLead);
  assert.equal(result.status, 201, 'a submission under a restored salt is stored');
  assert.equal(budgetCalls.length, 1);
  assert.equal(budgetCalls[0].p_window_seconds, 600);
  assert.ok(!JSON.stringify(budgetCalls).includes('192.0.2.7'), 'IP is never stored in the budget request');
  assert.equal(budgetCalls[0].p_max_attempts, 5);
  const sent = upstreamCalls[0];
  assert.ok(sent.url.endsWith('/functions/v1/submit-landing-lead'), 'The lead is stored through the Edge Function');
  assert.equal(sent.payload.lead_type, 'demo_request', 'The lead type is mapped');
  assert.equal(sent.payload.full_name, 'Aarav Sharma', 'The name is mapped');
  assert.equal(sent.payload.business_name, 'Studio Nine', 'The business name is mapped');
  assert.equal(sent.payload.email, 'aarav@salonexample.in', 'The email is normalised');
  assert.equal(sent.payload.consent_given, true, 'Consent is forwarded');
  assert.equal(sent.payload.privacy_notice_version, '2026-11', 'The privacy notice version is forwarded');
  assert.equal(sent.payload.idempotency_key, null, 'No idempotency key is invented when the caller sends none');
  assert.equal(sent.headers.Authorization, 'Bearer service-role-test-key', 'The fallback uses the trusted server credential, never sent to the browser');
  assert.ok(!JSON.stringify(result.body).includes('service-role-test-key'), 'The server credential is not returned to the browser');

  /* --- 1b. A retry carries its idempotency key ----------------------------- */
  upstream = { status: 200, body: { ok: true } };
  result = await call({ ...validLead, idempotencyKey: 'lead-abc-123-def' });
  assert.equal(result.status, 201, 'A retried submission is stored');
  assert.equal(
    upstreamCalls[0].payload.idempotency_key,
    'lead-abc-123-def',
    'The idempotency key is forwarded so a retry collapses onto the same lead',
  );

  /* --- 1c. Turnstile tokens are forwarded, never trusted ------------------- */
  upstream = { status: 200, body: { ok: true } };
  result = await call({ ...validLead, turnstileToken: 'visitor-token-abc-123' });
  assert.equal(result.status, 201, 'A submission with a token is stored');
  assert.equal(upstreamCalls[0].payload.turnstile_token, 'visitor-token-abc-123', 'The token is forwarded to the Edge Function');
  result = await call({ ...validLead, turnstile_token: 'snake-case-token-456' });
  assert.equal(result.status, 201, 'The snake_case spelling is also accepted');
  assert.equal(upstreamCalls[0].payload.turnstile_token, 'snake-case-token-456', 'The snake_case token is forwarded');
  result = await call(validLead);
  assert.equal(result.status, 201, 'Without a token the store decides; the server never trusts it alone');
  assert.equal(upstreamCalls[0].payload.turnstile_token, null, 'No token forwards as null');
  upstream = { status: 403, body: { ok: false } };
  result = await call(validLead);
  assert.equal(result.status, 403, 'An upstream verification failure answers 403');
  assert.ok(!result.body.ok, 'A verification failure never reports success');
  upstream = { status: 200, body: { ok: true } };

  /* --- 2. Invalid email ---------------------------------------------------- */
  result = await call({ ...validLead, email: 'not-an-email' });
  assert.equal(result.status, 400, 'An invalid email is rejected');
  assert.equal(upstreamCalls.length, 0, 'An invalid email never reaches the store');

  /* --- 3. Missing consent -------------------------------------------------- */
  result = await call({ ...validLead, consent: false });
  assert.equal(result.status, 400, 'A missing consent is rejected');

  /* --- 4. Missing name and business ---------------------------------------- */
  result = await call({ ...validLead, name: '' });
  assert.equal(result.status, 400, 'A missing name is rejected');
  result = await call({ ...validLead, salonName: '' });
  assert.equal(result.status, 400, 'A missing business name is rejected');

  /* --- 5. Invalid phone ---------------------------------------------------- */
  result = await call({ ...validLead, phone: 'call-me' });
  assert.equal(result.status, 400, 'An invalid phone number is rejected');

  /* --- 6. Honeypot --------------------------------------------------------- */
  result = await call({ ...validLead, website: 'https://spam.example' });
  assert.equal(result.status, 201, 'A honeypot submission is acknowledged like a stored lead');
  assert.equal(upstreamCalls.length, 0, 'A honeypot submission is never stored');
  // The alternate honeypot fields used by the Edge Function must also trap on
  // the direct server route, otherwise a bot could bypass the trap here.
  for (const field of ['company_website', 'fax_number']) {
    result = await call({ ...validLead, website: '', [field]: 'https://spam.example' });
    assert.equal(result.status, 201, `A honeypot ${field} submission is acknowledged`);
    assert.equal(upstreamCalls.length, 0, `A honeypot ${field} submission is never stored`);
  }

  /* --- 7. Wrong method ------------------------------------------------------ */
  result = await call(validLead, 'GET');
  assert.equal(result.status, 405, 'Only POST is accepted');

  /* --- 8. Rate limiting ----------------------------------------------------- */
  upstream = { status: 429, body: { ok: false, message: 'Too many requests.' } };
  result = await call(validLead);
  assert.equal(result.status, 429, 'A rate-limited request answers 429');
  assert.ok(!result.body.ok, 'A rate-limited request never reports success');
  assert.equal(headers['Retry-After'], '600', 'A 429 without an upstream Retry-After falls back to the window');
  // The actual upstream remaining window is forwarded, not the maximum.
  upstream = { status: 429, body: { ok: false, message: 'Too many requests.' }, retryAfter: 42 };
  result = await call(validLead);
  assert.equal(result.status, 429);
  assert.equal(headers['Retry-After'], '42', 'The upstream Retry-After is forwarded');

  /* --- 9. Storage outage ---------------------------------------------------- */
  upstream = { status: 500, body: { ok: false } };
  result = await call(validLead);
  assert.equal(result.status, 502, 'A storage failure answers 5xx');
  assert.ok(!result.body.ok, 'A storage failure never reports success');

  /* --- 10. Storage not configured ------------------------------------------- */
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  result = await call(validLead);
  assert.equal(result.status, 503, 'An unconfigured store answers 503');
  assert.ok(!result.body.ok, 'An unconfigured store never reports success');
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

  /* --- 11. CRM failure does not lose a stored lead -------------------------- */
  upstream = { status: 200, body: { ok: true } };
  process.env.NEXORA_CRM_LEAD_ENDPOINT = 'https://crm.example.invalid/hook';
  process.env.NEXORA_CRM_LEAD_TOKEN = 'crm-token';
  const crmCall = { url: '', headers: {} as Record<string, string>, payload: {} as any };
  const fetchStub = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: any) => {
    if (String(url).includes('crm.example.invalid')) {
      crmCall.url = String(url);
      crmCall.headers = init?.headers ?? {};
      crmCall.payload = JSON.parse(init?.body ?? '{}');
      return { ok: false, status: 500, json: async () => ({}) } as any;
    }
    return fetchStub(url, init);
  }) as any;
  result = await call({ ...validLead, idempotencyKey: 'lead-abc-123-def' });
  assert.equal(result.status, 201, 'A failing CRM sink does not lose the stored lead');
  assert.ok(crmCall.url.includes('crm.example.invalid'), 'The CRM sink is still attempted');
  assert.ok(crmCall.headers.Authorization === 'Bearer crm-token', 'The CRM token stays server-side');
  const stateCall = upstreamCalls.find((call) => call.url.includes('/rest/v1/landing_leads'));
  assert.ok(stateCall, 'The CRM delivery state is recorded on the stored lead');
  assert.equal(stateCall.payload.crm_delivery_state, 'failed', 'A CRM outage is recorded as failed');
  assert.equal(stateCall.payload.crm_last_error_code, 'crm_500', 'The CRM error code is recorded without secrets');
  delete process.env.NEXORA_CRM_LEAD_ENDPOINT;
  delete process.env.NEXORA_CRM_LEAD_TOKEN;
  globalThis.fetch = fetchStub;

  /* --- 11b. Without a CRM sink the state is recorded as skipped ------------- */
  upstream = { status: 200, body: { ok: true } };
  result = await call({ ...validLead, idempotencyKey: 'lead-skip-123-456' });
  assert.equal(result.status, 201, 'A lead without a CRM sink is still stored');
  const skipCall = upstreamCalls.find((call) => call.url.includes('/rest/v1/landing_leads'));
  assert.ok(skipCall, 'The CRM delivery state is recorded even without a sink');
  assert.equal(skipCall.payload.crm_delivery_state, 'skipped', 'No CRM sink is recorded as skipped');

  /* --- 12. Logs never contain the submitted personal data ------------------- */
  const joined = logs.join('\n');
  assert.ok(joined.includes('[nexora-demo-lead]'), 'The handler logs a redacted request id');
  assert.ok(!joined.includes('aarav@salonexample.in'), 'No email address is logged');
  assert.ok(!joined.includes('Aarav Sharma'), 'No visitor name is logged');
  assert.ok(!joined.includes('Studio Nine'), 'No business name is logged');
  assert.ok(!joined.includes('service-role-test-key'), 'No credential is logged');

  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
  console.log(
    'PASS: demo lead handler stores valid submissions, rejects invalid input, honours the honeypot, maps rate limits and storage failures without faking success, fails fast when the bucket salt is missing, keeps a failing CRM sink from losing a stored lead, and never logs personal data or credentials.',
  );
} finally {
  globalThis.fetch = originalFetch;
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
  process.env = originalEnv;
}
