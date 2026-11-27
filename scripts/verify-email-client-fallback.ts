import assert from 'node:assert/strict';
import { sendBookingEmail, checkEmailServiceStatus } from '../src/lib/emailService';

const params = {
  to: 'customer@example.com',
  clientName: 'Guest',
  bookingRef: '11111111-1111-4111-8111-111111111111',
  serviceName: 'Haircut',
  servicePrice: 100,
  date: '2026-11-07',
  time: '10:00',
  salonName: 'Salon',
};

let session: { access_token: string } | null = { access_token: 'token-1' };
const invokeCalls: Array<[string, Record<string, unknown> | undefined]> = [];
let invokeImpl: (name: string, options?: Record<string, unknown>) => Promise<any> = async () => ({
  data: { success: true, accepted: true, delivered: false, emailId: 're_1234567890' },
  error: null,
});

(globalThis as any).__emailGetSession = async () => ({ data: { session }, error: null });
(globalThis as any).__emailInvoke = async (name: string, options?: Record<string, unknown>) => {
  invokeCalls.push([name, options]);
  return invokeImpl(name, options);
};

const countInvokes = () => invokeCalls.length;
const assertSingleInvocation = (before: number, message: string) => {
  assert.equal(countInvokes(), before + 1, message);
  assert.equal(invokeCalls.at(-1)?.[0], 'studioflow-booking-emails');
};

session = null;
let result = await sendBookingEmail(params);
assert.equal(result.success, false);
assert.match(result.error || '', /Sign in/);
assert.equal(countInvokes(), 0, 'unauthenticated callers never invoke the Edge Function');

session = { access_token: 'token-1' };
let before = countInvokes();
result = await sendBookingEmail(params);
assert.equal(result.success, true);
assert.equal(result.accepted, true);
assert.equal(result.delivered, false, 'Resend acceptance must not be misreported as delivery');
assert.equal(result.emailId, 're_1234567890');
assertSingleInvocation(before, 'successful sends use exactly one Edge Function request');
assert.deepEqual(invokeCalls.at(-1)?.[1], { body: params });

invokeImpl = async () => ({
  data: null,
  error: {
    message: 'FunctionsHttpError',
    context: { json: async () => ({ error: 'Booking not found for this account.' }) },
  },
});
before = countInvokes();
result = await sendBookingEmail(params);
assert.equal(result.success, false);
assert.equal(result.error, 'Booking not found for this account.');
assertSingleInvocation(before, 'authoritative authorization errors are returned without retry');

invokeImpl = async () => ({ data: null, error: { message: 'network request outcome unknown' } });
before = countInvokes();
result = await sendBookingEmail(params);
assert.equal(result.success, false);
assert.match(result.error || '', /network request outcome unknown/);
assertSingleInvocation(before, 'uncertain network outcomes must never trigger a second send');

invokeImpl = async () => ({ data: { success: false, error: 'Email service unavailable' }, error: null });
before = countInvokes();
result = await sendBookingEmail(params);
assert.equal(result.success, false);
assert.equal(result.error, 'Email service unavailable');
assertSingleInvocation(before, 'provider failures are returned without duplicate fallback requests');

invokeImpl = async () => ({
  data: { status: 'ok', configured: false, provider: 'resend', mode: 'unconfigured' },
  error: null,
});
before = countInvokes();
const status = await checkEmailServiceStatus();
assert.equal(status.configured, false);
assert.equal(status.mode, 'unconfigured');
assert.equal(countInvokes(), before + 1);
assert.deepEqual(invokeCalls.at(-1)?.[1], { method: 'GET' }, 'status uses the Edge Function GET endpoint');

invokeImpl = async () => ({ data: null, error: { message: 'status unavailable' } });
const unavailable = await checkEmailServiceStatus();
assert.equal(unavailable.configured, false);
assert.equal(unavailable.mode, 'unconfigured');

console.log('PASS: email client requires a session, invokes the Edge Function once, distinguishes accepted from delivered, preserves authoritative errors, never retries uncertain sends, and reports honest service status.');
