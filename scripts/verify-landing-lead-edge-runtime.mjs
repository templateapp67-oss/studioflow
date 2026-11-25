// Exercise the real Edge handler with fake Deno, database and Turnstile APIs.
// No provider requests, credentials, or real leads are used.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';

const built = await build({
  entryPoints: ['supabase/functions/submit-landing-lead/index.ts'],
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'stub-supabase', setup(builder) {
    builder.onResolve({ filter: /^npm:@supabase\/supabase-js/ }, () => ({ path: 'supabase', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const createClient = () => globalThis.__testLeadService;', loader: 'js' }));
  } }],
});
let handler;
const env = { SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'service-test-secret' };
globalThis.Deno = { env: { get: (name) => env[name] }, serve: (fn) => { handler = fn; } };
let rpcMode = 'ok', insertMode = 'ok', rpcCalls = 0, inserts = 0, verificationCalls = 0;
let rpcArgs;
const privateText = 'sensitive-visitor@example.test service-test-secret provider-detail';
globalThis.__testLeadService = {
  async rpc(fn, args) {
    if (fn === 'claim_landing_lead_rate_limit') rpcArgs = args;
    rpcCalls++;
    if (rpcMode === 'throw') throw new Error(privateText);
    if (rpcMode === 'error') return { data: null, error: { code: privateText, message: privateText } };
    if (rpcMode === 'malformed') return { data: null, error: null };
    if (rpcMode === 'zero') return { data: { allowed: true, count: 0, limit: 5, remaining: 5, retry_after_seconds: 0 }, error: null };
    if (rpcMode === 'inconsistent') return { data: { allowed: true, count: 6, limit: 5, remaining: 0, retry_after_seconds: 0 }, error: null };
    if (rpcMode === 'limited') return { data: { allowed: false, count: 6, limit: 5, remaining: 0, retry_after_seconds: 37 }, error: null };
    return { data: { allowed: true, count: 1, limit: 5, remaining: 4, retry_after_seconds: 0 }, error: null };
  },
  from() { return { insert() { inserts++; return { select() { return { async single() {
    if (insertMode === 'throw') throw new Error(privateText);
    if (insertMode === 'error') return { data: null, error: { code: 'XX000', message: privateText } };
    return { data: { id: 'test-only' }, error: null };
  } }; } }; } }; },
};
const priorFetch = globalThis.fetch, priorError = console.error, priorLog = console.log;
const captured = [];
console.error = (...values) => captured.push(values.map(String).join(' '));
console.log = (...values) => captured.push(values.map(String).join(' '));
globalThis.fetch = async (url) => {
  assert.equal(String(url), 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  verificationCalls++;
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
try {
  await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
  const payload = { lead_type: 'demo_request', full_name: 'Test Person', email: 'test@example.test', consent_given: true };
  async function request(extra = {}, authorization = 'Bearer public-test-key', headers = {}) {
    return handler(new Request('https://edge.example.test/submit', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization, ...headers }, body: JSON.stringify({ ...payload, ...extra }),
    }));
  }
  for (const mode of ['throw', 'error', 'malformed', 'zero', 'inconsistent']) {
    rpcMode = mode; const before = inserts;
    const response = await request();
    assert.equal(response.status, 503, `${mode} limiter failure refuses submission`);
    assert.equal(inserts, before);
  }
  rpcMode = 'limited'; const limited = await request(); assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '37');
  rpcMode = 'ok';
  for (const mode of ['error', 'throw']) {
    insertMode = mode;
    const response = await request();
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes(privateText));
  }
  insertMode = 'ok';
  // Document actual compatibility, not a claim of deployed protection.
  const quick = await request({ form_elapsed_ms: 100 }); assert.equal(quick.status, 400);
  const negative = await request({ form_elapsed_ms: -1 }); assert.equal(negative.status, 400);
  const invalidPhone = await request({ phone: 'not a number' }); assert.equal(invalidPhone.status, 400);
  const noSecret = await request({ form_elapsed_ms: 3000 }, 'Bearer public-test-key', { 'x-forwarded-for': '192.0.2.7' }); assert.equal(noSecret.status, 200);
  assert.equal(rpcArgs.p_bucket_key, createHash('sha256').update('nexora-landing-rate-limit-v1:192.0.2.7').digest('hex'));
  assert.equal(rpcArgs.p_max_attempts, 5); assert.equal(rpcArgs.p_window_seconds, 600);
  const trappedBefore = inserts; const trapped = await request({ website: 'spam' }); assert.equal(trapped.status, 200); assert.equal(inserts, trappedBefore);
  env.TURNSTILE_SECRET_KEY = 'turnstile-test-secret';
  const noToken = await request(); assert.equal(noToken.status, 400);
  const callsBeforeTrusted = rpcCalls;
  const noTokenTrusted = await request({}, 'Bearer service-test-secret'); assert.equal(noTokenTrusted.status, 400);
  assert.equal(rpcCalls, callsBeforeTrusted, 'trusted fallback currently skips the Edge IP limiter');
  assert.equal(verificationCalls, 0);
  const withToken = await request({ turnstile_token: 'synthetic-token' }); assert.equal(withToken.status, 200);
  assert.equal(verificationCalls, 1);
  assert.ok(rpcCalls >= 1);
  assert.ok(!captured.join('\n').includes(privateText));
  assert.ok(!captured.join('\n').includes('service-test-secret'));
  assert.ok(!captured.join('\n').includes('sensitive-visitor@example.test'));
} finally {
  globalThis.fetch = priorFetch; console.error = priorError; console.log = priorLog;
  delete globalThis.Deno; delete globalThis.__testLeadService;
}
console.log('PASS: mocked Edge lead handler fails closed on limiter errors, redacts upstream details, and documents current Turnstile token compatibility. No live leads or provider calls.');
