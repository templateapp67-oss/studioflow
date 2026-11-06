import assert from 'node:assert/strict';
import { sendBookingEmail, checkEmailServiceStatus } from '../src/lib/emailService';

const params: any = {
  to: 'customer@example.com',
  clientName: 'Guest',
  bookingRef: '11111111-1111-4111-8111-111111111111',
  serviceName: 'Haircut',
  servicePrice: 100,
  date: '2026-11-07',
  time: '10:00',
  salonName: 'Salon',
};

const originalFetch = globalThis.fetch;
let session: any = { access_token: 'token-1' };
let invokeCalls: any[] = [];
let invokeImpl: any = async () => ({ data: { success: true, delivered: true }, error: null });
let fetchImpl: any = async () => new Response(JSON.stringify({ success: true, delivered: true }), { headers: { 'content-type': 'application/json' } });

(globalThis as any).__emailGetSession = async () => ({ data: { session }, error: null });
(globalThis as any).__emailInvoke = async (...args: any[]) => { invokeCalls.push(args); return invokeImpl(...args); };
globalThis.fetch = ((...args: any[]) => fetchImpl(...args)) as any;

try {
  session = null;
  let result = await sendBookingEmail(params);
  assert.equal(result.success, false);
  assert.match(result.error || '', /Sign in/);

  session = { access_token: 'token-1' };
  let authorization = '';
  fetchImpl = async (_url: string, init: any) => {
    authorization = init.headers.Authorization;
    return new Response(JSON.stringify({ success: true, delivered: true, emailId: 'e1' }), { headers: { 'content-type': 'application/json' } });
  };
  invokeCalls = [];
  result = await sendBookingEmail(params);
  assert.equal(result.delivered, true);
  assert.equal(authorization, 'Bearer token-1');
  assert.equal(invokeCalls.length, 0, 'successful proxy must not double-send through Edge');

  fetchImpl = async () => new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } });
  invokeImpl = async () => ({ data: { success: true, delivered: true }, error: null });
  invokeCalls = [];
  result = await sendBookingEmail(params);
  assert.equal(result.delivered, true);
  assert.equal(invokeCalls.length, 1, 'static HTML proxy response must fall back once');

  fetchImpl = async () => new Response(JSON.stringify({ success: false, error: 'Recipient mismatch' }), { status: 403, headers: { 'content-type': 'application/json' } });
  invokeCalls = [];
  result = await sendBookingEmail(params);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Recipient mismatch');
  assert.equal(invokeCalls.length, 0, 'authorization failures must not be bypassed via fallback');

  fetchImpl = async () => new Response(JSON.stringify({ success: false, error: 'Unconfigured' }), { status: 503, headers: { 'content-type': 'application/json' } });
  invokeImpl = async () => ({ data: { success: true, delivered: true }, error: null });
  invokeCalls = [];
  result = await sendBookingEmail(params);
  assert.equal(result.delivered, true);
  assert.equal(invokeCalls.length, 1, 'unconfigured proxy may fall back to configured Edge');

  fetchImpl = async () => { throw new Error('network'); };
  invokeImpl = async () => ({ data: null, error: { message: 'FunctionsHttpError', context: { json: async () => ({ error: 'Booking not found for this account.' }) } } });
  result = await sendBookingEmail(params);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Booking not found for this account.');

  fetchImpl = async () => new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } });
  invokeImpl = async () => ({ data: { status: 'ok', configured: false, provider: 'resend', mode: 'unconfigured' }, error: null });
  const status = await checkEmailServiceStatus();
  assert.equal(status.configured, false);
  assert.equal(status.mode, 'unconfigured');

  console.log('PASS: email client sends JWT, avoids double delivery, falls back only from missing/static/unconfigured proxies, preserves authoritative 4xx errors and reports honest status.');
} finally {
  globalThis.fetch = originalFetch;
}
