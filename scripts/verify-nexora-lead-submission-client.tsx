import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createLeadIdempotencyKey,
  isLeadSubmissionSuccess,
  postLeadToServerRoute,
  readLeadSubmissionResponse,
} from '../src/lib/nexoraLeadSubmission';

/**
 * Regression tests for the demo-lead client contract.
 *
 * The historical failure mode was a rewritten SPA response: the browser
 * posted to a path that answered `200 text/html`, `response.json()` threw,
 * the code fell back to `{}` and the visitor was told the request had been
 * received. Every one of those cases must now fail honestly.
 */

const jsonHeaders = { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null) };
const htmlHeaders = { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null) };

const makeResponse = (options: {
  status?: number;
  ok?: boolean;
  contentType?: 'json' | 'html';
  body?: string;
}) => {
  const status = options.status ?? 200;
  const contentType = options.contentType ?? 'json';
  const body = options.body ?? '{}';
  return {
    ok: options.ok ?? (status >= 200 && status < 300),
    status,
    headers: contentType === 'json' ? jsonHeaders : htmlHeaders,
    json: async () => JSON.parse(body),
  } as any;
};

const post = (response: any, timeoutMs = 200) =>
  postLeadToServerRoute('/api/nexora-demo-lead', { name: 'Test' }, { fetchImpl: (async () => response) as any, timeoutMs });

/* 1. A rewritten SPA document (HTML) must never look like a success. */
let outcome = await readLeadSubmissionResponse(makeResponse({ contentType: 'html', body: '<!doctype html><html></html>' }));
assert.equal(outcome.ok, false, 'an HTML response is not a success');
assert.equal(isLeadSubmissionSuccess(outcome), false);

/* 2. An empty JSON body is not a success. */
outcome = await readLeadSubmissionResponse(makeResponse({ body: '' }));
assert.equal(outcome.ok, false, 'an empty body is not a success');

/* 3. Malformed JSON is not a success. */
outcome = await readLeadSubmissionResponse({
  ok: true,
  status: 200,
  headers: jsonHeaders,
  json: async () => {
    throw new Error('Unexpected token < in JSON');
  },
} as any);
assert.equal(outcome.ok, false, 'malformed JSON is not a success');

/* 4. `ok: false` is not a success, whatever the HTTP status is. */
outcome = await readLeadSubmissionResponse(makeResponse({ body: JSON.stringify({ ok: false, message: 'Please check the required fields.' }) }));
assert.equal(outcome.ok, false, 'ok:false is not a success');

/* 5. A 429 is reported as a rate limit, not as a success. */
outcome = await readLeadSubmissionResponse(makeResponse({ status: 429, body: JSON.stringify({ ok: false, message: 'Too many requests.' }) }));
assert.equal(outcome.ok, false, '429 is not a success');

/* 6. A 5xx is not a success. */
outcome = await readLeadSubmissionResponse(makeResponse({ status: 500, body: JSON.stringify({ ok: false }) }));
assert.equal(outcome.ok, false, '500 is not a success');

/* 7. A body that claims success while the transport failed is not a success. */
outcome = await readLeadSubmissionResponse(makeResponse({ status: 0, ok: false, body: JSON.stringify({ ok: true }) }));
assert.equal(outcome.ok, false, 'a failed transport is not a success');

/* 8. A confirmed JSON `{ ok: true }` is the only accepted success. */
outcome = await readLeadSubmissionResponse(makeResponse({ body: JSON.stringify({ ok: true, requestId: 'req_1' }) }));
assert.equal(outcome.ok, true, 'a confirmed JSON success is accepted');
assert.equal(isLeadSubmissionSuccess(outcome), true);

/* 9. The same contract applies to the same-origin server route. */
outcome = await post(makeResponse({ contentType: 'html', body: '<!doctype html>' }));
assert.equal(outcome.ok, false, 'the server route rejects an HTML answer');
assert.equal((outcome as any).code, 'not_json');

outcome = await post(makeResponse({ status: 502, body: JSON.stringify({ ok: false }) }));
assert.equal(outcome.ok, false, 'the server route rejects a 5xx');
assert.equal((outcome as any).code, 'server_error');

outcome = await post(makeResponse({ body: JSON.stringify({ ok: true, requestId: 'req_2' }) }));
assert.equal(outcome.ok, true, 'the server route accepts a confirmed success');

/* 10. A hung request is aborted and reported as a timeout. */
const hangingFetch = (_url: string, init: any) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });
outcome = await postLeadToServerRoute('/api/nexora-demo-lead', {}, { fetchImpl: hangingFetch as any, timeoutMs: 25 });
assert.equal(outcome.ok, false, 'a timeout is not a success');
assert.equal((outcome as any).code, 'timeout');

/* 11. A network failure is not a success. */
outcome = await postLeadToServerRoute('/api/nexora-demo-lead', {}, {
  fetchImpl: (async () => {
    throw new Error('offline');
  }) as any,
  timeoutMs: 100,
});
assert.equal(outcome.ok, false, 'a network failure is not a success');
assert.equal((outcome as any).code, 'network_error');

/* 12. Every retry carries a distinct idempotency key. */
const first = createLeadIdempotencyKey();
const second = createLeadIdempotencyKey();
assert.ok(first.length >= 16, 'the idempotency key is not empty');
assert.notEqual(first, second, 'each submission gets its own idempotency key');

/* 13. The dialog uses the shared contract and never the loose fallback. */
const demoProvider = readFileSync('src/components/nexora-pricing/DemoProvider.tsx', 'utf8');
assert.ok(demoProvider.includes('postLeadToServerRoute'), 'the dialog posts through the validated contract');
assert.ok(!demoProvider.includes("response.json().catch(() => ({}))"), 'the dialog no longer accepts a parsed-empty body');
assert.ok(demoProvider.includes('idempotency_key: idempotencyKey'), 'the dialog sends an idempotency key');
assert.ok(demoProvider.includes('createLeadIdempotencyKey'), 'the dialog creates an idempotency key');

console.log(
  'PASS: the demo-lead client accepts only a confirmed JSON `{ ok: true }` answer; SPA HTML, empty, malformed, ok:false, 429, 5xx, transport failure, timeout and network errors are all reported as failures and never as a confirmed request.',
);
