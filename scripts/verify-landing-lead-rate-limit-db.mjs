// Offline database contract test: no connection to a Supabase project.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(readFileSync('supabase/migrations/20261107071230_nexora_salon_landing_rate_limits.sql', 'utf8'));
  const claim = async (key) => Number((await db.query('select public.register_landing_lead_attempt($1, 600, 5) as n', [key])).rows[0].n);
  const counts = await Promise.all(Array.from({ length: 6 }, () => claim('same-address-hash')));
  assert.deepEqual(counts.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  assert.equal(await claim('other-address-hash'), 1);
  await db.query("update public.landing_lead_rate_limits set expires_at = now() - interval '1 second' where bucket_key = $1", ['same-address-hash']);
  assert.equal(await claim('same-address-hash'), 1, 'an expired window resets');
  await db.query("update public.landing_lead_rate_limits set expires_at = now() - interval '61 minutes' where bucket_key = $1", ['other-address-hash']);
  assert.equal(Number((await db.query('select public.prune_landing_lead_rate_limits() as n')).rows[0].n), 1);
  const privileges = (await db.query("select has_function_privilege('anon', 'public.register_landing_lead_attempt(text,integer,integer)', 'execute') as anon, has_function_privilege('authenticated', 'public.register_landing_lead_attempt(text,integer,integer)', 'execute') as authenticated, has_function_privilege('service_role', 'public.register_landing_lead_attempt(text,integer,integer)', 'execute') as service")).rows[0];
  assert.deepEqual(privileges, { anon: false, authenticated: false, service: true });
} finally { await db.close(); }
console.log('PASS: isolated Postgres fixture verifies counter increments, distinct buckets, expiry, cleanup and RPC grants; no live deployment tested.');
