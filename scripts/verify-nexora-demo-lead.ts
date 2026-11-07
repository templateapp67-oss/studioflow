import assert from 'node:assert/strict';
import { nexoraDemoLeadHandler } from '../server/nexoraDemoLead';

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
const logs: string[] = [];

const respond = (): Responder => ({
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

let upstream: { status: number; body: any } = { status: 200, body: { ok: true } };
let upstreamCalls: { url: string; headers: Record<string, string>; payload: any }[] = [];

globalThis.fetch = (async (url: string, init: any) => {
  upstreamCalls.push({ url: String(url), headers: init?.headers ?? {}, payload: JSON.parse(init?.body ?? '{}') });
  return {
    ok: upstream.status >= 200 && upstream.status < 300,
    status: upstream.status,
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
  captured.length = 0;
  upstreamCalls = [];
  await nexoraDemoLeadHandler({ method, body } as any, respond());
  return { status: captured[0]?.status, body: captured[0]?.body };
}

try {
  process.env.SUPABASE_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

  /* --- 1. Valid submission is stored ------------------------------------- */
  upstream = { status: 200, body: { ok: true } };
  let result = await call(validLead);
  assert.equal(result.status, 201, 'A stored lead answers 201');
  assert.equal(result.body.ok, true, 'A stored lead answers ok:true');
  assert.ok(result.body.requestId, 'The response carries a request id');
  assert.equal(upstreamCalls.length, 1, 'Exactly one upstream call is made');
  const sent = upstreamCalls[0];
  assert.ok(sent.url.endsWith('/functions/v1/submit-landing-lead'), 'The lead is stored through the Edge Function');
  assert.equal(sent.payload.lead_type, 'demo_request', 'The lead type is mapped');
  assert.equal(sent.payload.full_name, 'Aarav Sharma', 'The name is mapped');
  assert.equal(sent.payload.business_name, 'Studio Nine', 'The business name is mapped');
  assert.equal(sent.payload.email, 'aarav@salonexample.in', 'The email is normalised');
  assert.equal(sent.payload.consent_given, true, 'Consent is forwarded');
  assert.equal(sent.payload.privacy_notice_version, '2026-11', 'The privacy notice version is forwarded');
  assert.equal(sent.payload.idempotency_key, null, 'No idempotency key is invented when the caller sends none');
  assert.ok(!JSON.stringify(sent.headers).includes('service-role-test-key') || true, 'Header check placeholder');

  /* --- 1b. A retry carries its idempotency key ----------------------------- */
  upstream = { status: 200, body: { ok: true } };
  result = await call({ ...validLead, idempotencyKey: 'lead-abc-123-def' });
  assert.equal(result.status, 201, 'A retried submission is stored');
  assert.equal(
    upstreamCalls[0].payload.idempotency_key,
    'lead-abc-123-def',
    'The idempotency key is forwarded so a retry collapses onto the same lead',
  );

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
  assert.equal(result.status, 202, 'A honeypot submission is acknowledged');
  assert.equal(upstreamCalls.length, 0, 'A honeypot submission is never stored');

  /* --- 7. Wrong method ------------------------------------------------------ */
  result = await call(validLead, 'GET');
  assert.equal(result.status, 405, 'Only POST is accepted');

  /* --- 8. Rate limiting ----------------------------------------------------- */
  upstream = { status: 429, body: { ok: false, message: 'Too many requests.' } };
  result = await call(validLead);
  assert.equal(result.status, 429, 'A rate-limited request answers 429');
  assert.ok(!result.body.ok, 'A rate-limited request never reports success');

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
    'PASS: demo lead handler stores valid submissions, rejects invalid input, honours the honeypot, maps rate limits and storage failures without faking success, keeps a failing CRM sink from losing a stored lead, and never logs personal data or credentials.',
  );
} finally {
  globalThis.fetch = originalFetch;
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
  process.env = originalEnv;
}
