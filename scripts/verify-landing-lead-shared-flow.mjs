// Offline integration of the real Edge and Node handlers with an isolated SQL
// counter. PGlite runs statements on one connection, not real concurrent sessions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const oldFetch = globalThis.fetch, oldRandom = Math.random;
const oldDeno = globalThis.Deno, oldService = globalThis.__testSharedLeadService;
const oldEnv = { ...process.env };
let handler, inserts = 0, edgeForwards = 0;
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(readFileSync('supabase/migrations/20261107071230_nexora_salon_landing_rate_limits.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261125090000_nexora_lead_rate_limit_rpc.sql', 'utf8'));
  const invokeRpc = async (args) => (await db.query('select public.claim_landing_lead_rate_limit($1, $2, $3) as result', [args.p_bucket_key, args.p_window_seconds, args.p_max_attempts])).rows[0].result;
  globalThis.Deno = { env: { get: name => ({ SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'service-test-secret' })[name] }, serve: fn => { handler = fn; } };
  globalThis.__testSharedLeadService = {
    rpc: async (fn, args) => {
      if (fn === 'claim_landing_lead_rate_limit') return { data: await invokeRpc(args), error: null };
      if (fn === 'prune_landing_lead_rate_limits') return { data: 0, error: null };
      throw new Error('unexpected Edge RPC');
    },
    from: () => ({ insert: () => ({ select: () => ({ single: async () => { inserts++; return { data: { id: 'mock-id' }, error: null }; } }) }) }),
  };
  const edge = await build({ entryPoints: ['supabase/functions/submit-landing-lead/index.ts'], bundle: true, platform: 'node', format: 'esm', write: false, plugins: [{ name: 'supabase-stub', setup(b) {
    b.onResolve({ filter: /^npm:@supabase\/supabase-js/ }, () => ({ path: 'supabase', namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const createClient = () => globalThis.__testSharedLeadService;', loader: 'js' }));
  } }] });
  const server = await build({ entryPoints: ['server/nexoraDemoLead.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
  await import('data:text/javascript;base64,' + Buffer.from(edge.outputFiles[0].text).toString('base64'));
  const { nexoraDemoLeadHandler } = await import('data:text/javascript;base64,' + Buffer.from(server.outputFiles[0].text).toString('base64'));
  process.env.SUPABASE_URL = 'https://example.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-secret';
  delete process.env.VERCEL; delete process.env.LANDING_LEAD_RATE_LIMIT_SALT; delete process.env.NEXORA_CRM_LEAD_ENDPOINT;
  Math.random = () => 1; // Deterministically skip optional cleanup.
  globalThis.fetch = async (url, init) => {
    const target = String(url);
    if (target.endsWith('/rest/v1/rpc/claim_landing_lead_rate_limit')) return Response.json(await invokeRpc(JSON.parse(init.body)));
    if (target.endsWith('/functions/v1/submit-landing-lead')) {
      edgeForwards++;
      return handler(new Request(target, { method: 'POST', headers: init.headers, body: init.body }));
    }
    if (target.includes('/rest/v1/landing_leads?')) return new Response(null, { status: 204 });
    throw new Error('Unexpected network in offline test');
  };
  const payload = { lead_type: 'demo_request', full_name: 'Test Person', email: 'test@example.test', consent_given: true, form_elapsed_ms: 3000 };
  const direct = async () => handler(new Request('https://edge.example.test/submit', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer public-key', 'x-forwarded-for': '192.0.2.7' }, body: JSON.stringify(payload) }));
  const fallback = async () => {
    let status = 200; const headers = {}; let body;
    const res = { setHeader: (key, value) => { headers[key] = value; }, status: code => { status = code; return res; }, json: data => { body = data; return data; } };
    await nexoraDemoLeadHandler({ method: 'POST', ip: '192.0.2.7', body: { name: 'Test Person', email: 'test@example.test', salonName: 'Test salon', consent: true, formElapsedMs: 3000 } }, res);
    return { status, headers, body };
  };
  for (let i = 0; i < 3; i++) assert.equal((await direct()).status, 200);
  for (let i = 0; i < 2; i++) assert.equal((await fallback()).status, 201);
  assert.equal(inserts, 5); assert.equal(edgeForwards, 2, 'trusted forwarding is not double-counted');
  const blockedDirect = await direct(); assert.equal(blockedDirect.status, 429);
  assert(Number(blockedDirect.headers.get('retry-after')) > 0);
  const blockedFallback = await fallback(); assert.equal(blockedFallback.status, 429);
  assert(Number(blockedFallback.headers['Retry-After']) > 0);
  assert.equal(inserts, 5); assert.equal(edgeForwards, 2, 'blocked fallback never forwards');
} finally {
  globalThis.fetch = oldFetch; Math.random = oldRandom; process.env = oldEnv;
  if (oldDeno === undefined) delete globalThis.Deno; else globalThis.Deno = oldDeno;
  if (oldService === undefined) delete globalThis.__testSharedLeadService; else globalThis.__testSharedLeadService = oldService;
  await db.close();
}
console.log('PASS: real mocked Edge and server handlers spend one isolated Postgres bucket, enforce the sixth attempt, and do not double-count trusted forwarding; no live requests.');
