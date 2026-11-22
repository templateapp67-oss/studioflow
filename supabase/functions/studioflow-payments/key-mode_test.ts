import { razorpayKeyMode, razorpayStatusResponse } from './payment-security.ts';

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(message + ': expected ' + String(expected) + ', got ' + String(actual));
  }
}

Deno.test('test key reports test mode', () => {
  assertEquals(razorpayKeyMode('rzp_test_abc123'), 'test', 'test keyMode');
});

Deno.test('live key reports live mode', () => {
  assertEquals(razorpayKeyMode('rzp_live_abc123'), 'live', 'live keyMode');
});

Deno.test('unknown prefix reports unknown mode', () => {
  assertEquals(razorpayKeyMode('rzp_other_abc123'), 'unknown', 'unknown keyMode');
});

Deno.test('missing key reports unknown mode', () => {
  assertEquals(razorpayKeyMode(''), 'unknown', 'empty keyMode');
  assertEquals(razorpayKeyMode(null), 'unknown', 'null keyMode');
});

Deno.test('read-only status preserves legacy fields and never returns key material', () => {
  const keyId = 'rzp_test_secretish_identifier_abc123';
  const keySecret = 'razorpay-secret-value-never-return';
  const webhookSecret = 'razorpay-webhook-secret-never-return';
  const response = razorpayStatusResponse(keyId, keySecret, webhookSecret);
  assertEquals(response.configured, true, 'configured');
  assertEquals(response.webhookConfigured, true, 'webhookConfigured');
  assertEquals(response.mode, 'test', 'legacy mode');
  assertEquals(response.keyMode, 'test', 'new keyMode');
  const serialized = JSON.stringify(response);
  for (const forbidden of [keyId, keySecret, webhookSecret, 'secretish_identifier', 'abc123']) {
    if (serialized.includes(forbidden)) throw new Error('status response leaked key material');
  }
  for (const forbiddenName of ['key', 'keyId', 'keySecret', 'webhookSecret']) {
    if (Object.prototype.hasOwnProperty.call(response, forbiddenName)) {
      throw new Error('status response includes a credential field');
    }
  }
  const withoutWebhook = razorpayStatusResponse(keyId, keySecret, '');
  assertEquals(withoutWebhook.webhookConfigured, false, 'missing webhook secret');
  assertEquals(withoutWebhook.keyMode, 'test', 'test mode remains available');
});
