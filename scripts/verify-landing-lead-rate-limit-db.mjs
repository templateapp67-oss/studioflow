// Offline PGlite contract test: no connection to a Supabase project.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const oldSql = readFileSync('supabase/migrations/20261107071230_nexora_salon_landing_rate_limits.sql', 'utf8');
const newSql = readFileSync('supabase/migrations/20261125090000_nexora_lead_rate_limit_rpc.sql', 'utf8');
const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64), hashC = 'c'.repeat(64);
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(oldSql);
  await db.exec(newSql);
  await db.exec(newSql); // Reapplying must preserve the existing counter.
  const claim = async (key, window = 600, max = 5) => (await db.query('select public.claim_landing_lead_rate_limit($1, $2, $3) as result', [key, window, max])).rows[0].result;
  const claims = await Promise.all(Array.from({ length: 6 }, () => claim(hashA)));
  claims.sort((a, b) => a.count - b.count);
  assert.deepEqual(claims.map(x => x.count), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(claims.map(x => x.allowed), [true, true, true, true, true, false]);
  assert.deepEqual(claims.map(x => x.remaining), [4, 3, 2, 1, 0, 0]);
  assert(claims.every(x => x.limit === 5));
  assert(claims.slice(0, 5).every(x => x.retry_after_seconds === 0));
  assert(claims[5].retry_after_seconds > 0 && claims[5].retry_after_seconds <= 600);
  assert.equal((await claim(hashB)).count, 1, 'distinct buckets do not interact');
  // Previously deployed handler continues to use the same counter after migration.
  assert.equal(Number((await db.query('select public.register_landing_lead_attempt($1, 600, 5) as n', [hashB])).rows[0].n), 2);
  assert.equal((await claim(hashB)).count, 3);
  await db.exec(newSql);
  assert.equal((await claim(hashB)).count, 4, 'reapplying migration preserves in-flight counters');
  await db.query("update public.landing_lead_rate_limits set expires_at = now() + interval '45 seconds' where bucket_key = $1", [hashA]);
  const shortened = await claim(hashA); assert.equal(shortened.allowed, false);
  assert(shortened.retry_after_seconds > 0 && shortened.retry_after_seconds <= 45, 'retry metadata follows the actual window');
  await db.query("update public.landing_lead_rate_limits set expires_at = now() - interval '1 second' where bucket_key = $1", [hashA]);
  const reset = await claim(hashA); assert.equal(reset.count, 1); assert.equal(reset.allowed, true); assert.equal(reset.retry_after_seconds, 0);
  await db.query("update public.landing_lead_rate_limits set expires_at = now() - interval '61 minutes' where bucket_key = $1", [hashB]);
  assert.equal(Number((await db.query('select public.prune_landing_lead_rate_limits() as n')).rows[0].n), 1);
  for (const args of [['ip-address', 600, 5], [hashC, 0, 5], [hashC, 600, 0], [hashC, 86401, 5], [hashC, 600, null]]) {
    await assert.rejects(() => claim(...args), /Invalid rate limit parameters/);
  }
  const privileges = (await db.query("select has_function_privilege('anon', 'public.claim_landing_lead_rate_limit(text,integer,integer)', 'execute') as anon, has_function_privilege('authenticated', 'public.claim_landing_lead_rate_limit(text,integer,integer)', 'execute') as authenticated, has_function_privilege('service_role', 'public.claim_landing_lead_rate_limit(text,integer,integer)', 'execute') as service")).rows[0];
  assert.deepEqual(privileges, { anon: false, authenticated: false, service: true });
  const security = (await db.query("select prosecdef, proconfig from pg_proc where oid = 'public.claim_landing_lead_rate_limit(text,integer,integer)'::regprocedure")).rows[0];
  assert.equal(security.prosecdef, true); assert.deepEqual(security.proconfig, ['search_path=""']);
  // Prove the function uses its owner's privileges, not direct table grants.
  await db.exec('revoke all on public.landing_lead_rate_limits from service_role; set role service_role;');
  assert.equal((await claim(hashC)).allowed, true);
  await db.exec('reset role; set role anon;');
  await assert.rejects(() => claim(hashC), /permission denied/);
  await db.exec('reset role;');
} finally { await db.close(); }
const fresh = new PGlite();
try {
  await fresh.exec('create role anon; create role authenticated; create role service_role;');
  await fresh.exec(newSql);
  const result = (await fresh.query('select public.claim_landing_lead_rate_limit($1, 600, 5) as budget', [hashA])).rows[0].budget;
  assert.equal(result.count, 1, 'migration creates a functional counter table if absent');
} finally { await fresh.close(); }
// This fixture serializes queries on one connection: real multi-session races
// should also be exercised in authorized staging, not inferred from PGlite.
console.log('PASS: isolated PGlite verifies new RPC metadata, counts, old/new compatibility, expiry, cleanup, definer isolation, parameter validation and grants; no live deployment or multi-session race tested.');
