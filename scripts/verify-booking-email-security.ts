import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { bookingEmailHandler, emailStatusHandler } from '../server/bookingEmail';
import { bookingEmailFeedback } from '../src/lib/emailFeedback';

const BOOKING = '11111111-1111-4111-8111-111111111111';
const bookingId = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;

function responder() {
  const state = { status: 0, body: null as any, headers: {} as Record<string, string> };
  const res: any = {
    status(code: number) { state.status = code; return res; },
    json(body: unknown) { state.body = body; return state; },
    setHeader(name: string, value: string) { state.headers[name] = value; },
  };
  return { res, state };
}

async function call(handler: any, req: any) {
  const { res, state } = responder();
  await handler(req, res);
  return state;
}

const resendCalls: any[] = [];
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function installFetch() {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    if (url.includes('/auth/v1/user')) {
      const token = (init?.headers?.Authorization || '').replace(/^Bearer\s+/i, '');
      if (token === 'bad-token') return { ok: false, status: 401, json: async () => ({}) } as any;
      const id = token === 'owner-token' ? 'owner-1' : token === 'other-token' ? 'other-1' : 'customer-1';
      const email = token === 'owner-token' ? 'owner@example.com' : 'customer@example.com';
      return { ok: true, status: 200, json: async () => ({ id, email }) } as any;
    }
    if (url.includes('/rest/v1/studioflow_bookings')) {
      const token = (init?.headers?.Authorization || '').replace(/^Bearer\s+/i, '');
      if (token === 'other-token') return { ok: true, status: 200, json: async () => [] } as any;
      const id = decodeURIComponent(url.split('id=eq.')[1].split('&')[0]);
      return {
        ok: true,
        status: 200,
        json: async () => [{
          id,
          owner_id: 'owner-1',
          customer_id: 'customer-1',
          status: 'confirmed',
          payload: {
            clientEmail: 'customer@example.com',
            clientName: '<script>alert(1)</script>',
            serviceName: 'Haircut & Spa',
            servicePrice: 1000,
            amountPaid: 250,
            stylistName: 'Asha',
            date: '2026-11-07',
            time: '10:00',
          },
        }],
      } as any;
    }
    if (url.includes('api.resend.com/emails')) {
      resendCalls.push(JSON.parse(init.body));
      return { ok: true, status: 200, json: async () => ({ id: 'email-1' }) } as any;
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as any;
}

function baseReq(overrides: any = {}) {
  const { body: bodyOverrides, ...rest } = overrides;
  return {
    method: 'POST',
    headers: { authorization: 'Bearer customer-token' },
    body: {
      type: 'confirmation',
      bookingRef: BOOKING,
      to: 'customer@example.com',
      salonName: 'NEXORA Salon',
      ...bodyOverrides,
    },
    ...rest,
  };
}

try {
  installFetch();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'publishable-test-key';
  delete process.env.RESEND_API_KEY;

  let result = await call(bookingEmailHandler, baseReq({ headers: {} }));
  assert.equal(result.status, 401, 'missing JWT must be rejected');
  result = await call(bookingEmailHandler, baseReq({ body: { bookingRef: 'NX-BOOKING' } }));
  assert.equal(result.status, 400, 'legacy non-UUID booking reference must be rejected');
  result = await call(bookingEmailHandler, baseReq({ headers: { authorization: 'Bearer bad-token' } }));
  assert.equal(result.status, 401, 'invalid JWT must be rejected');
  result = await call(bookingEmailHandler, baseReq({ body: { to: 'attacker@example.com' } }));
  assert.equal(result.status, 403, 'caller cannot redirect email to an arbitrary recipient');
  result = await call(bookingEmailHandler, baseReq({ headers: { authorization: 'Bearer other-token' }, body: { bookingRef: bookingId(2) } }));
  assert.equal(result.status, 404, 'RLS-invisible booking must not be emailed');
  result = await call(bookingEmailHandler, baseReq({ body: { bookingRef: bookingId(3) } }));
  assert.equal(result.status, 503, 'unconfigured Resend must fail honestly');
  assert.equal(result.body.simulated, undefined, 'no simulated success may be returned');
  assert.equal(resendCalls.length, 0, 'unconfigured provider must not be called');

  process.env.RESEND_API_KEY = 're_test_key';
  result = await call(bookingEmailHandler, baseReq({ body: { bookingRef: bookingId(4) } }));
  assert.equal(result.status, 200);
  assert.equal(result.body.delivered, true);
  assert.equal(result.body.to, 'customer@example.com');
  assert.equal(resendCalls.length, 1);
  assert.equal(resendCalls[0].to[0], 'customer@example.com', 'recipient must come from the stored booking');
  assert.ok(resendCalls[0].html.includes('&lt;script&gt;'), 'stored/client HTML must be escaped');
  assert.ok(!resendCalls[0].html.includes('<script>alert(1)</script>'));
  assert.ok(resendCalls[0].subject.includes('Haircut & Spa'));

  result = await call(bookingEmailHandler, baseReq({ headers: { authorization: 'Bearer owner-token' }, body: { bookingRef: bookingId(5), type: 'reminder', to: 'customer@example.com' } }));
  assert.equal(result.status, 200, 'owner may send a reminder for their booking');
  assert.equal(result.body.type, 'reminder');

  const limitedBooking = bookingId(6);
  for (let i = 0; i < 5; i++) {
    result = await call(bookingEmailHandler, baseReq({ body: { bookingRef: limitedBooking } }));
    assert.equal(result.status, 200);
  }
  result = await call(bookingEmailHandler, baseReq({ body: { bookingRef: limitedBooking } }));
  assert.equal(result.status, 429, 'per-user/booking/type throttle must engage');
  assert.equal(result.headers['Retry-After'], '600');

  const status = await call(emailStatusHandler, { method: 'GET' });
  assert.equal(status.status, 200);
  assert.equal(status.body.configured, true);
  assert.equal(status.body.mode, 'live');
  delete process.env.RESEND_API_KEY;
  const unconfiguredStatus = await call(emailStatusHandler, { method: 'GET' });
  assert.equal(unconfiguredStatus.body.mode, 'unconfigured');

  assert.equal(bookingEmailFeedback({ success: true, delivered: true }, 'a@b.com'), 'Confirmation email delivered to a@b.com.');
  assert.match(bookingEmailFeedback({ success: true, delivered: false, simulated: true }, 'a@b.com'), /delivery is not confirmed/);
  assert.equal(bookingEmailFeedback({ success: false, error: 'Nope' }, 'a@b.com', 'Reminder'), 'Nope');

  const server = readFileSync('server.ts', 'utf8');
  assert.ok(server.includes('app.get("/api/email-service-status", emailStatusHandler)'));
  assert.ok(server.includes('app.post("/api/send-booking-email", bookingEmailHandler)'));
  assert.ok(existsSync('api/send-booking-email.ts') && existsSync('api/email-service-status.ts'), 'Vercel adapters must preserve legacy API paths');
  const edge = readFileSync('supabase/functions/studioflow-booking-emails/index.ts', 'utf8');
  assert.ok(edge.includes('/auth/v1/user') && edge.includes('/rest/v1/studioflow_bookings'));
  assert.ok(edge.includes('Booking email recipient must match the email saved on the booking.'));
  assert.ok(!edge.includes('simulated: true'), 'Edge fallback must not report simulated delivery as success');
  assert.ok(edge.includes('Email delivery is not configured.'));

  console.log('PASS: booking email requires JWT + booking RLS, binds stored recipients, escapes HTML, throttles, fails honestly when unconfigured, preserves legacy paths and gives honest UI feedback. No live email sent.');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}
