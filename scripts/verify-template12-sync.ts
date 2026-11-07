import assert from 'node:assert/strict';
import {
  clearTemplate12Draft,
  isTemplate12Retryable,
  readTemplate12Draft,
  syncTemplate12,
  template12DraftKey,
  writeTemplate12Draft,
} from '../src/lib/template12Sync';

const records = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { records.set(key, value); },
    removeItem: (key: string) => { records.delete(key); },
  },
});
const siteId = 'site-12';
const silent = { error: console.error };
console.error = () => {};

async function main() {
  try {
    records.clear();
    const payload = { name: 'Ink studio' };
    const draft = writeTemplate12Draft(siteId, payload);
    assert.deepEqual(readTemplate12Draft(siteId), draft, 'write-ahead data should be restorable');
    assert.equal(clearTemplate12Draft(siteId, 'different-draft-id'), false, 'a stale sync must not delete a newer draft');

    let failedFastCalls = 0;
    let failedFastSleeps = 0;
    await assert.rejects(() => syncTemplate12(siteId, payload, async () => {
      failedFastCalls += 1;
      throw Object.assign(new Error('duplicate'), { code: '23505', details: 'unique constraint' });
    }, { sleep: async () => { failedFastSleeps += 1; } }), /duplicate/);
    assert.equal(failedFastCalls, 1, 'unique violations must fail fast');
    assert.equal(failedFastSleeps, 0, 'constraint failures must not back off');
    assert.ok(readTemplate12Draft(siteId), 'failed sync must preserve its local draft');

    let attempts = 0;
    const delays: number[] = [];
    const result = await syncTemplate12(siteId, payload, async () => {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error('server unavailable'), { status: 503, code: '503' });
      return 'complete';
    }, { sleep: async milliseconds => { delays.push(milliseconds); }, random: () => 0 });
    assert.equal(result, 'complete');
    assert.equal(attempts, 2, 'a 5xx error should retry');
    assert.deepEqual(delays, [350], 'retry should use exponential backoff with zero jitter in this deterministic test');
    assert.equal(readTemplate12Draft(siteId), null, 'draft should clear only after successful sync');

    let cappedAttempts = 0;
    const cappedDelays: number[] = [];
    await assert.rejects(() => syncTemplate12(siteId, payload, async () => {
      cappedAttempts += 1;
      throw Object.assign(new Error('rate limited'), { status: 429, code: '429' });
    }, { sleep: async milliseconds => { cappedDelays.push(milliseconds); }, random: () => 0 }), /rate-limiting/);
    assert.equal(cappedAttempts, 3, 'retryable failures must stop after three writes');
    assert.deepEqual(cappedDelays, [350, 700], 'backoff should double on successive attempts');

    let authAttempts = 0;
    let refreshes = 0;
    const authResult = await syncTemplate12(siteId, payload, async () => {
      authAttempts += 1;
      if (authAttempts === 1) throw Object.assign(new Error('JWT expired'), { code: 'PGRST301', status: 401 });
      return 'authenticated';
    }, { refreshSession: async () => { refreshes += 1; return {}; }, sleep: async () => {} });
    assert.equal(authResult, 'authenticated');
    assert.equal(refreshes, 1, 'an expired JWT should refresh once');
    assert.equal(authAttempts, 2, 'successful refresh should retry the write');

    const failFastCodes = ['42501', '23503', '23505', '23502', '42P10', '42703'];
    for (const code of failFastCodes) {
      assert.equal(isTemplate12Retryable({ code, status: null, message: 'database constraint', details: '', hint: '', name: '' }), false, `${code} must fail fast`);
    }
    assert.equal(isTemplate12Retryable({ code: '', status: 429, message: 'rate limited', details: '', hint: '', name: '' }), true);
    assert.equal(isTemplate12Retryable({ code: '', status: 503, message: 'server error', details: '', hint: '', name: '' }), true);
    assert.equal(isTemplate12Retryable({ code: '', status: 401, message: 'unauthorized', details: '', hint: '', name: '' }), false, 'non-expired 401 is not retryable');
    assert.ok(records.has(template12DraftKey(siteId)) === false);
    process.stdout.write('Template 12 sync recovery and retry checks passed.\n');
  } finally {
    console.error = silent.error;
  }
}

void main();
