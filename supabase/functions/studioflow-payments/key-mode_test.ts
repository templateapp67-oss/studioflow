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
  const keySecret = 'razorpay-secret-value-never-return';
  const webhookSecret = 'razorpay-webhook-secret-never-return';
  const samples = [
    { keyId: 'rzp_test_secretish_identifier_abc123', keyMode: 'test' },
    { keyId: 'rzp_live_secretish_identifier_xyz789', keyMode: 'live' },
    { keyId: 'rzp_other_secretish_identifier_def456', keyMode: 'unknown' },
    { keyId: '', keyMode: 'unknown' },
  ];
  for (const sample of samples) {
    const response = razorpayStatusResponse(sample.keyId, keySecret, webhookSecret);
    assertEquals(response.keyMode, sample.keyMode, 'server status keyMode');
    const serialized = JSON.stringify(response);
    const credentials = [sample.keyId, keySecret, webhookSecret].filter(Boolean);
    const forbiddenFragments = credentials.flatMap((value) => [
      value,
      value.slice(0, Math.min(8, value.length)),
      value.slice(-Math.min(6, value.length)),
    ]);
    for (const forbidden of forbiddenFragments) {
      if (forbidden && serialized.includes(forbidden)) {
        throw new Error('status response leaked key material or a key fragment');
      }
    }
    for (const forbiddenName of ['key', 'keyId', 'keySecret', 'webhookSecret']) {
      if (Object.prototype.hasOwnProperty.call(response, forbiddenName)) {
        throw new Error('status response includes a credential field');
      }
    }
  }
  const testResponse = razorpayStatusResponse(samples[0].keyId, keySecret, webhookSecret);
  assertEquals(testResponse.configured, true, 'configured');
  assertEquals(testResponse.webhookConfigured, true, 'webhookConfigured');
  assertEquals(testResponse.mode, 'test', 'legacy mode');
  const liveResponse = razorpayStatusResponse(samples[1].keyId, keySecret, webhookSecret);
  assertEquals(liveResponse.mode, 'live', 'legacy live mode');
  const withoutWebhook = razorpayStatusResponse(samples[0].keyId, keySecret, '');
  assertEquals(withoutWebhook.webhookConfigured, false, 'missing webhook secret');
});
