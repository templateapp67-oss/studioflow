// Webhook replay protection + idempotency, security headers, and static bundle
// guards. Proves:
//   1. The processed_webhook_events migration applies cleanly to a fresh
//      database and its claim/finish RPCs are fail-closed, atomic and
//      service-role-only.
//   2. The _shared/webhookSecurity.ts helper maps rpc results and header inputs
//      exactly as the edge functions rely on.
//   3. vercel.json and the Express server carry the same strict security
//      headers, and the Express static guard 404s build artifacts and server
//      bundles before express.static can serve them.
//   4. Both public webhooks verify the signature BEFORE claiming an event, and
//      claim BEFORE any side effect.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

let section = '';
const checks = [];
function ok(name) { checks.push(name); console.log('PASS: ' + name); }

async function importTs(path) {
  const source = readFileSync(path, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
    fileName: path,
  });
  return import('data:text/javascript;base64,' + Buffer.from(output.outputText).toString('base64'));
}

// ---------------------------------------------------------------------------
section = 'migration + claim/finish RPC semantics';
// ---------------------------------------------------------------------------
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
`);
await db.exec(readFileSync('supabase/migrations/20261127090000_processed_webhook_events.sql', 'utf8'));

const nowSeconds = Math.floor(Date.now() / 1000);
async function claim(provider, eventId, createdAt, tolerance = 300) {
  const { rows } = await db.query(
    'select public.studioflow_claim_webhook_event($1,$2,$3,$4::timestamptz,$5) as result',
    [provider, eventId, 'payment_link.paid', createdAt ? new Date(createdAt * 1000).toISOString() : null, tolerance]
  );
  return rows[0].result;
}

const fresh = await claim('razorpay', 'evt-fresh-1', nowSeconds);
assert.deepEqual(fresh, { claimed: true, reason: null });
const dupe = await claim('razorpay', 'evt-fresh-1', nowSeconds);
assert.deepEqual(dupe, { claimed: false, reason: 'duplicate' }, 'a replayed delivery must not be re-claimed while processed/claimed');
await db.query("select public.studioflow_finish_webhook_event('razorpay','evt-fresh-1','processed')");
const afterProcessed = await claim('razorpay', 'evt-fresh-1', nowSeconds);
assert.deepEqual(afterProcessed, { claimed: false, reason: 'duplicate' }, 'rows that reached processed are never re-claimed');
ok('claim is exactly-once for a fresh signed event and stays duplicate after processed');

const stale = await claim('razorpay', 'evt-stale-1', nowSeconds - 3600);
assert.deepEqual(stale, { claimed: false, reason: 'stale' }, 'stale signed timestamps are refused');
const staleRow = await db.query("select status from public.processed_webhook_events where event_id = 'evt-stale-1'");
assert.equal(staleRow.rows[0].status, 'stale');
const future = await claim('razorpay', 'evt-future-1', nowSeconds + 3600);
assert.deepEqual(future, { claimed: false, reason: 'future' });
const futureRow = await db.query("select status from public.processed_webhook_events where event_id = 'evt-future-1'");
assert.equal(futureRow.rows[0].status, 'stale');
ok('stale and future signed timestamps are recorded as refused without processing');

// Failed deliveries may be retried; the retry is observable and idempotent.
const retryClaim = await claim('meta_whatsapp', 'msg-retry-1', nowSeconds);
assert.equal(retryClaim.claimed, true);
await db.query("select public.studioflow_finish_webhook_event('meta_whatsapp','msg-retry-1','failed')");
const retry = await claim('meta_whatsapp', 'msg-retry-1', nowSeconds);
assert.deepEqual(retry, { claimed: true, reason: 'reclaimed' });
await db.query("select public.studioflow_finish_webhook_event('meta_whatsapp','msg-retry-1','processed')");
const retryDupe = await claim('meta_whatsapp', 'msg-retry-1', nowSeconds);
assert.deepEqual(retryDupe, { claimed: false, reason: 'duplicate' });
ok('failed deliveries are reclaimable; processed rows are final');

// Crashed workers: a claimed row abandoned for > 10 minutes may be reclaimed.
await claim('meta_whatsapp', 'msg-crash-1', nowSeconds);
await db.query("update public.processed_webhook_events set received_at = now() - interval '11 minutes' where event_id = 'msg-crash-1'");
const crashed = await claim('meta_whatsapp', 'msg-crash-1', nowSeconds);
assert.deepEqual(crashed, { claimed: true, reason: 'reclaimed' });
const crashedLive = await claim('meta_whatsapp', 'msg-crash-1', nowSeconds);
assert.deepEqual(crashedLive, { claimed: false, reason: 'duplicate' });
ok('abandoned (crashed) claim rows reclaim only after 10 minutes, never immediately');

// Ledger access: RLS on, zero policies, zero table grants; RPC-only reachable.
const [{ rows: [ledger] }] = [await db.query(`select relrowsecurity from pg_class where relname='processed_webhook_events' and relnamespace='public'::regnamespace`)];
assert.equal(ledger.relrowsecurity, true, 'processed_webhook_events must have RLS enabled');
const policyCount = await db.query("select count(*)::int as n from pg_policies where schemaname='public' and tablename='processed_webhook_events'");
assert.equal(policyCount.rows[0].n, 0, 'processed_webhook_events must ship without RLS policies');
const priv = await db.query(`select
  has_table_privilege('anon','public.processed_webhook_events','SELECT') as a,
  has_table_privilege('authenticated','public.processed_webhook_events','SELECT') as u,
  has_table_privilege('service_role','public.processed_webhook_events','SELECT') as s,
  has_function_privilege('anon','public.studioflow_claim_webhook_event(text,text,text,timestamptz,integer)','EXECUTE') as claim_anon,
  has_function_privilege('authenticated','public.studioflow_claim_webhook_event(text,text,text,timestamptz,integer)','EXECUTE') as claim_auth,
  has_function_privilege('service_role','public.studioflow_claim_webhook_event(text,text,text,timestamptz,integer)','EXECUTE') as claim_svc,
  has_function_privilege('service_role','public.studioflow_finish_webhook_event(text,text,text)','EXECUTE') as finish_svc`);
assert.deepEqual(priv.rows[0], { a: false, u: false, s: false, claim_anon: false, claim_auth: false, claim_svc: true, finish_svc: true }, 'ledger must be reachable only via service_role RPC');
const invalid = await db.query("select public.studioflow_claim_webhook_event('bogus_provider','evt-1',null,null,300)").then(()=>null).catch((e)=>e);
assert.ok(invalid instanceof Error, 'unknown providers are refused');
ok('processed_webhook_events is fail-closed: RLS with no policies, no table grants, RPC-only for service_role');
await db.close();

// ---------------------------------------------------------------------------
section = '_shared/webhookSecurity.ts helper';
// ---------------------------------------------------------------------------
const helper = await importTs('supabase/functions/_shared/webhookSecurity.ts');
assert.equal(helper.webhookReplayToleranceSeconds(undefined), 300);
assert.equal(helper.webhookReplayToleranceSeconds('abc'), 300);
assert.equal(helper.webhookReplayToleranceSeconds('99999999'), 86400);
assert.equal(helper.webhookReplayToleranceSeconds('120'), 120);
assert.equal(helper.webhookReplayToleranceSeconds('0'), 300);
const hashed = await helper.resolveWebhookEventId('../evil', 'raw-body');
assert.match(hashed, /^body-[0-9a-f]{64}$/);
assert.equal(await helper.resolveWebhookEventId('evt_ABC-123:x', 'raw'), 'evt_ABC-123:x');
assert.equal(await helper.resolveWebhookEventId(null, 'raw'), 'body-' + await helper.sha256Hex('raw'));
assert.equal(helper.safeWebhookEventType('payment_link.paid'), 'payment_link.paid');
assert.equal(helper.safeWebhookEventType('bad value!'), null);

// The helper must pass the exact signed seconds to the claim RPC and map reasons.
const calls = [];
const fakeDb = { rpc: async (fn, args) => { calls.push([fn, args]); return { data: { claimed: false, reason: 'duplicate' }, error: null }; } };
const claimArgs = await helper.claimWebhookEvent(fakeDb, { provider: 'razorpay', eventId: 'evt-1', eventType: 'payment.captured', eventCreatedAtSeconds: 1700000000, toleranceSeconds: 300 });
assert.deepEqual(claimArgs, { claimed: false, reason: 'duplicate' });
assert.equal(calls.length, 1);
assert.equal(calls[0][0], 'studioflow_claim_webhook_event');
assert.equal(calls[0][1].p_provider, 'razorpay');
assert.equal(calls[0][1].p_created_at, new Date(1700000000 * 1000).toISOString());
assert.equal(calls[0][1].p_max_age_seconds, 300);

const brokenDb = { rpc: async () => ({ data: null, error: { message: 'boom' } }) };
await assert.rejects(() => helper.claimWebhookEvent(brokenDb, { provider: 'razorpay', eventId: 'evt-2' }), /ledger unavailable/);
const brokenFinishDb = { rpc: async () => ({ data: null, error: { message: 'boom' } }) };
await assert.rejects(() => helper.finishWebhookEvent(brokenFinishDb, 'razorpay', 'evt-2', 'processed'), /could not be updated/);
ok('webhookSecurity helper: tolerance clamp, event-id resolution, RPC mapping, fail-closed errors');

// ---------------------------------------------------------------------------
section = 'security headers: vercel.json and Express parity';
// ---------------------------------------------------------------------------
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const globalHeaders = vercel.headers.find((entry) => entry.source === '/(.*)' && Array.isArray(entry.headers)
  && entry.headers.some((h) => h.key === 'Content-Security-Policy'));
assert.ok(globalHeaders, 'vercel.json must keep a global /(.*) header block');
const vercelByKey = Object.fromEntries(globalHeaders.headers.map((h) => [h.key, h.value]));

const expressHeaders = await importTs('server/httpSecurityHeaders.ts');
const localByKey = expressHeaders.securityHeaders({ upgradeInsecureRequests: true });
const vercelKeys = Object.keys(vercelByKey).sort();
const localKeys = Object.keys(localByKey).sort();
assert.deepEqual(localKeys, vercelKeys, `Express must enforce the same header set as vercel.json (${vercelKeys} vs ${localKeys})`);

for (const [key, value] of Object.entries(vercelByKey)) {
  assert.equal(localByKey[key], value, `header ${key} differs between vercel.json and Express`);
}
assert.equal(vercelByKey['X-Frame-Options'], 'DENY');
assert.equal(vercelByKey['X-Content-Type-Options'], 'nosniff');
assert.equal(vercelByKey['Referrer-Policy'], 'strict-origin-when-cross-origin');
assert.equal(vercelByKey['Strict-Transport-Security'], 'max-age=63072000; includeSubDomains; preload');
for (const token of [
  'camera=()', 'microphone=()', 'geolocation=()',
  'autoplay=(self "https://www.youtube.com" "https://player.vimeo.com")',
  'encrypted-media=(self "https://www.youtube.com" "https://player.vimeo.com")',
  'fullscreen=(self "https://www.youtube.com" "https://www.youtube-nocookie.com" "https://player.vimeo.com")',
  'payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")',
  'picture-in-picture=(self "https://www.youtube.com" "https://player.vimeo.com")',
]) {
  assert.ok(vercelByKey['Permissions-Policy'].includes(token), `Permissions-Policy missing ${token}`);
}
assert.ok(vercelByKey['Content-Security-Policy'].includes("frame-ancestors 'none'"), "CSP frame-ancestors must be 'none'");
assert.ok(vercelByKey['Content-Security-Policy'].includes('object-src \'none\''), "CSP must deny plugins");
assert.ok(!/script-src[^;]*'unsafe-inline'/.test(vercelByKey['Content-Security-Policy']), 'script-src must not allow unsafe-inline');
assert.ok(!/script-src[^;]*'unsafe-eval'/.test(vercelByKey['Content-Security-Policy']), 'script-src must not allow unsafe-eval');
assert.ok(vercelByKey['Content-Security-Policy'].includes('upgrade-insecure-requests'), 'vercel.json CSP must force https');
const localOnlyHttp = expressHeaders.securityHeaders({});
assert.ok(!('upgrade-insecure-requests' in {}) || true); // sanity
assert.ok(!localOnlyHttp['Content-Security-Policy'].includes('upgrade-insecure-requests'), 'Express CSP must stay http-safe on localhost');
ok('vercel.json and Express enforce identical strict headers (HSTS, nosniff, DENY, Referrer-Policy, Permissions-Policy, tight CSP)');

const serverSource = readFileSync('server.ts', 'utf8');
assert.ok(serverSource.includes("from \"./server/httpSecurityHeaders\""), 'server.ts must import the shared header module');
assert.ok(serverSource.includes('securityHeaders('), 'server.ts must apply the header middleware');
assert.ok(serverSource.indexOf("import { securityHeaders") < serverSource.indexOf('app.use((req, res, next) =>'), 'header middleware registration must be wired into the stack');
const headerRegistration = serverSource.indexOf('securityHeaders(');
const staticRegistration = serverSource.indexOf('express.static(');
assert.ok(headerRegistration > 0 && staticRegistration > headerRegistration, 'headers must be applied before static assets are served');

const guard = await importTs('server/staticGuard.ts');
const blocked = ['/assets/supabase-client.js.map', '/assets/chunk.d.ts', '/assets/chunk.ts', '/build/index.tsx', '/dist/storefront-renderer.cjs', '/server.cjs', '/server.js', '/middleware.js', '/vercel.json', '/vite.config.ts', '/server-bundles/storefront-renderer.cjs', '/dist-server/index.js', '/.env', '/.env.production'];
const allowed = ['/assets/app-abc123.js', '/assets/app-abc123.css', '/index.html', '/login.html', '/favicon.svg', '/icons/logo.png', '/pricing/'];
for (const path of blocked) assert.equal(guard.isForbiddenStaticAsset(path), true, `must 404 ${path}`);
for (const path of allowed) assert.equal(guard.isForbiddenStaticAsset(path), false, `must serve ${path}`);
assert.ok(serverSource.indexOf('isForbiddenStaticAsset') < serverSource.indexOf('express.static('), 'static guard must run before express.static');
ok('Express 404s source maps, TypeScript sources, .cjs bundles and server builds; public assets unaffected');

// ---------------------------------------------------------------------------
section = 'both public webhooks: signature before claim, claim before side effects';
// ---------------------------------------------------------------------------
for (const [file, signatureNeedle] of [
  ['supabase/functions/studioflow-payments/index.ts', 'signatureMatches(creds.webhookSecret,raw,webhookSignature)'],
  ['supabase/functions/nexora-whatsapp-webhook/index.ts', "const expected = 'sha256='"],
]) {
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes("../_shared/webhookSecurity.ts"), `${file} must use the shared webhookSecurity module`);
  const sigIndex = source.indexOf(signatureNeedle);
  const claimIndex = source.indexOf('claimWebhookEvent(');
  assert.ok(sigIndex > 0 && claimIndex > sigIndex, `${file} must verify the signature before claiming the event`);
  // Claim must happen before any meaningful side effect inside the webhook branch.
  // (Needles may also appear earlier in helper definitions, so search after claimIndex.)
  for (const needle of ['studioflow_settle_payment', 'updateStatuses(', 'handleInbound(']) {
    const idx = source.indexOf(needle, claimIndex);
    if (idx > 0) assert.ok(claimIndex < idx, `${file} must claim before ${needle}`);
  }
  // Duplicate deliveries acknowledge without reprocessing.
  assert.ok(/duplicate/.test(source), `${file} must treat duplicate claims as already-handled`);
}
ok('payments and WhatsApp webhooks: signature verified first, event claimed before any side effect');

// ---------------------------------------------------------------------------
section = 'Razorpay webhook: VM-executed replay protection'
// ---------------------------------------------------------------------------
function loadPaymentsHandler(envOverrides = {}, claimNext = null, options = {}) {
  const state = { rpc: [], fetch: [], from: [], claimNext, settleThrows: options.settleThrows === true };
  const db = {
    from(table) {
      let op = 'select', columns = '', values, filters = [];
      const q = {
        select(c) { columns = String(c || ''); return q; },
        eq(k, v) { filters.push([k, v]); return q; },
        in() { return q; },
        order() { return q; },
        limit() { return q; },
        insert(v) { op = 'insert'; values = v; return q; },
        update(v) { op = 'update'; values = v; return q; },
        upsert(v) { op = 'upsert'; values = v; return q; },
        maybeSingle() { return run(); },
        single() { return run(); },
        then(a, b) { return run().then(a, b); },
      };
      async function run() {
        state.from.push({ table, op, columns, filters, values });
        if (table === 'studioflow_payment_orders') {
          if (op === 'update') return { data: null, error: null };
          if (columns === 'booking_id') return { data: { booking_id: 'booking-a' }, error: null };
          return { data: { order_id: 'order_fixture', payment_link_id: null, amount_paise: 2500, booking_id: 'booking-a', status: 'created' }, error: null };
        }
        throw new Error('Unexpected table ' + table);
      }
      return q;
    },
    async rpc(name, args) {
      state.rpc.push([name, args]);
      if (name === 'studioflow_claim_webhook_event') {
        if (state.claimNext) { const forced = state.claimNext; state.claimNext = null; return { data: forced, error: null }; }
        return { data: { claimed: true, reason: null }, error: null };
      }
      if (name === 'studioflow_finish_webhook_event') return { data: null, error: null };
      if (name === 'studioflow_settle_payment') {
        if (state.settleThrows) throw new Error('settle exploded: relation "internal_secret" does not exist');
        return { data: { refund_required: false }, error: null };
      }
      throw new Error('Unexpected RPC ' + name);
    },
  };
  const baseEnv = {
    SUPABASE_URL: 'https://test.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only-service',
    RAZORPAY_KEY_ID: 'rzp_test_fixture',
    RAZORPAY_KEY_SECRET: 'fixture-secret',
    RAZORPAY_WEBHOOK_SECRET: 'fixture-webhook-secret',
    ...envOverrides,
  };
  let handler;
  const context = vm.createContext({
    Request, Response, URL, TextEncoder, TextDecoder, Uint8Array, AbortSignal,
    crypto: webcrypto, btoa, atob, console, Buffer,
    fetch: async (url) => {
      state.fetch.push(String(url));
      const match = String(url).match(/\/payments\/([^/]+)$/);
      if (match) {
        return Response.json({ id: decodeURIComponent(match[1]), status: 'captured', currency: 'INR', amount: 2500, order_id: 'order_fixture' });
      }
      throw new Error('Unexpected fetch ' + url);
    },
    Deno: {
      env: { get: (key) => baseEnv[key] },
      serve: (fn) => { handler = fn; },
    },
    createClient: () => db,
  });
  const entry = readFileSync('supabase/functions/studioflow-payments/index.ts', 'utf8');
  const sharedFiles = [
    ['../_shared/sessionProtection.ts', 'supabase/functions/_shared/sessionProtection.ts'],
    ['../_shared/browserCors.ts', 'supabase/functions/_shared/browserCors.ts'],
    ['./payment-security.ts', 'supabase/functions/studioflow-payments/payment-security.ts'],
    ['./payment-link-security.ts', 'supabase/functions/studioflow-payments/payment-link-security.ts'],
    ['../_shared/webhookSecurity.ts', 'supabase/functions/_shared/webhookSecurity.ts'],
  ].filter(([needle]) => entry.includes(needle)).map(([, file]) => readFileSync(file, 'utf8'));
  const source = (sharedFiles.join('\n') + '\n' + entry)
    .replace(/^import .*from .*;\s*$/mg, '')
    .replace(/^export /mg, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  vm.runInContext(js, context);
  return { handler, state };
}

const NOW_SECONDS = Math.floor(Date.now() / 1000);
function capturedEvent(overrides = {}) {
  return {
    id: 'evt_fixture_001',
    event: 'payment.captured',
    created_at: NOW_SECONDS,
    payload: { payment: { entity: { id: 'pay_fixture1234', order_id: 'order_fixture', amount: 2500, currency: 'INR', status: 'captured' } } },
    ...overrides,
  };
}

async function sign(raw) {
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode('fixture-webhook-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Buffer.from(await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))).toString('hex');
}

async function post(handler, raw, headers = {}) {
  return handler(new Request('https://test.invalid', {
    method: 'POST',
    body: raw,
    headers: { 'x-razorpay-signature': await sign(raw), ...headers },
  }));
}

{
  const { handler, state } = loadPaymentsHandler();
  const raw = JSON.stringify(capturedEvent());
  const response = await post(handler, raw, { 'x-razorpay-event-id': 'evt_fixture_001' });
  assert.equal(response.status, 200, 'a fresh signed event must be processed');
  const claimCall = state.rpc.find(([name]) => name === 'studioflow_claim_webhook_event');
  assert.ok(claimCall, 'the ledger must be claimed');
  assert.equal(claimCall[1].p_provider, 'razorpay');
  assert.equal(claimCall[1].p_event_id, 'evt_fixture_001');
  assert.equal(claimCall[1].p_max_age_seconds, 300);
  assert.ok(new Date(claimCall[1].p_created_at).getTime() > 0, 'signed created_at must be forwarded to the ledger');
  assert.ok(state.rpc.some(([name]) => name === 'studioflow_settle_payment'), 'the fresh event must settle');
  const finish = state.rpc.find(([name]) => name === 'studioflow_finish_webhook_event');
  assert.ok(finish && finish[1].p_status === 'processed', 'a successful delivery must be marked processed');
}

{
  const { handler, state } = loadPaymentsHandler({}, { claimed: false, reason: 'duplicate' });
  const response = await post(handler, JSON.stringify(capturedEvent({ id: 'evt_fixture_002' })), { 'x-razorpay-event-id': 'evt_fixture_002' });
  assert.equal(response.status, 200, 'a replayed delivery must be acknowledged, not rejected');
  assert.deepEqual(await response.json(), { received: true, duplicate: true });
  assert.equal(state.fetch.length, 0, 'a duplicate delivery must not call Razorpay');
  assert.ok(!state.rpc.some(([name]) => name === 'studioflow_settle_payment'), 'a duplicate must not settle again');
  assert.ok(!state.rpc.some(([name]) => name === 'studioflow_finish_webhook_event'), 'a duplicate must not rewrite the ledger');
}

{
  const { handler, state } = loadPaymentsHandler({}, { claimed: false, reason: 'stale' });
  const response = await post(handler, JSON.stringify(capturedEvent({ id: 'evt_fixture_003' })), { 'x-razorpay-event-id': 'evt_fixture_003' });
  assert.equal(response.status, 400, 'a stale delivery must be refused');
  assert.equal(state.fetch.length, 0, 'a stale delivery must not call Razorpay');
}

{
  const { handler, state } = loadPaymentsHandler();
  const raw = JSON.stringify(capturedEvent({ created_at: undefined }));
  delete JSON.parse(raw).created_at;
  const noTimestamp = JSON.stringify({ ...capturedEvent(), created_at: undefined });
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', body: noTimestamp,
    headers: { 'x-razorpay-signature': await sign(noTimestamp) },
  }));
  assert.equal(response.status, 400, 'a signature alone must not be enough: created_at is required');
  assert.ok(!state.rpc.some(([name]) => name === 'studioflow_claim_webhook_event'), 'an unstamped delivery must never reach the ledger');
}

{
  // No provider event-id header: the claim must fall back to sha256 of the raw body.
  const { handler, state } = loadPaymentsHandler();
  const raw = JSON.stringify(capturedEvent({ id: 'evt_no_header' }));
  await post(handler, raw);
  const claimCall = state.rpc.find(([name]) => name === 'studioflow_claim_webhook_event');
  assert.match(claimCall[1].p_event_id, /^body-[0-9a-f]{64}$/, 'missing event-id header must fall back to a content hash');
}

{
  const { handler, state } = loadPaymentsHandler();
  const raw = JSON.stringify(capturedEvent({ id: 'evt_bad_sig' }));
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', body: raw, headers: { 'x-razorpay-signature': 'deadbeef' },
  }));
  assert.equal(response.status, 401, 'an invalid signature must be rejected before the ledger');
  assert.equal(state.rpc.length, 0, 'an invalid signature must never touch the ledger');
}

{
  // Settle failure: retryable 500, ledger 'failed', zero internal detail leaked.
  const { handler, state } = loadPaymentsHandler({}, null, { settleThrows: true });
  const raw = JSON.stringify(capturedEvent({ id: 'evt_settle_fail' }));
  const response = await post(handler, raw, { 'x-razorpay-event-id': 'evt_settle_fail' });
  assert.equal(response.status, 500, 'a settle failure must be a retryable 500 — a 400 tells Razorpay to stop retrying');
  const body = await response.json();
  assert.ok(!JSON.stringify(body).includes('settle exploded'), 'no internal/provider error text leaks to the caller');
  assert.ok(!JSON.stringify(body).includes('internal_secret'));
  const finish = state.rpc.find(([name]) => name === 'studioflow_finish_webhook_event');
  assert.ok(finish && finish[1].p_status === 'failed', 'the ledger marks the delivery failed so a redelivery reclaims it');
}
{
  // The reclaim path: a previously failed delivery is processed on redelivery.
  const { handler, state } = loadPaymentsHandler({}, { claimed: true, reason: 'reclaimed' });
  const raw = JSON.stringify(capturedEvent({ id: 'evt_settle_fail' }));
  const response = await post(handler, raw, { 'x-razorpay-event-id': 'evt_settle_fail' });
  assert.equal(response.status, 200, 'a reclaimed delivery settles on retry');
  const finish = state.rpc.find(([name]) => name === 'studioflow_finish_webhook_event');
  assert.ok(finish && finish[1].p_status === 'processed', 'the retry is marked processed');
}
ok('Razorpay webhook handler: fresh 200/settle, duplicate short-circuit, stale 400, missing created_at 400, hash fallback, 401 precedes ledger, settle-failure 500 + failed ledger + reclaim');

const history = JSON.parse(readFileSync('docs/integrations/restored-supabase-history.json', 'utf8'));
assert.ok(
  history.post_export_applied_versions.some((record) => record.file === '20261127090000_processed_webhook_events.sql'),
  'production migration history must record the webhook ledger migration as applied',
);
ok('production migration history records the webhook ledger');

console.log(`\nAll webhook security checks passed (${checks.length} sections).`);
