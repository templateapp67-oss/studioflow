// Behaves as the shared rate-limit store for G-06.
//
// The old booking-email quota lived in a module-level Map, so the real ceiling
// was `MAX_PER_WINDOW × live isolates` and it reset on every cold start. This
// applies the real migration to Postgres (PGlite) and proves the counter that
// replaced it actually enforces a single shared ceiling:
//   * the 6th attempt in a window is refused, the 5th is allowed;
//   * budgets are per bucket, so one booking cannot spend another's;
//   * a successful claim after the window expires starts a fresh window;
//   * parallel claims cannot exceed the ceiling (the atomic-upsert property);
//   * durations are reported as retryAfterSeconds rather than guessed.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const MIGRATION = 'supabase/migrations/202611120001_studioflow_edge_rate_limits.sql';
const sql = readFileSync(MIGRATION, 'utf8');

const db = await new PGlite();
// Supabase ships these roles; a bare Postgres does not. Recreate the ones the
// migration grants to so the privilege assertions test the real ACL.
await db.exec(`
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
`);
await db.exec(sql);

const claim = async (key, windowSeconds = 600, max = 5) => {
  const { rows } = await db.query(
    'select public.studioflow_edge_rate_limit_claim($1,$2,$3) as decision',
    [key, windowSeconds, max],
  );
  return rows[0].decision;
};

// --- the ceiling is enforced across callers, not per isolate --------------
const key = 'user-1:11111111-1111-4111-8111-111111111111:confirmation';
const decisions = [];
for (let attempt = 1; attempt <= 6; attempt += 1) decisions.push(await claim(key));

assert.deepEqual(
  decisions.map((d) => d.allowed),
  [true, true, true, true, true, false],
  `the 6th send in a window must be refused; got ${JSON.stringify(decisions.map((d) => d.allowed))}`,
);
assert.equal(decisions[4].count, 5);
assert.equal(decisions[4].remaining, 0);
assert.equal(decisions[5].count, 6, 'the refused attempt is still counted, so hammering cannot reset the window');
assert.ok(decisions[5].retryAfterSeconds > 0, 'a refused caller must be told when to retry');
assert.ok(decisions[5].retryAfterSeconds <= 600);

// --- buckets are independent ---------------------------------------------
const other = await claim('user-2:22222222-2222-4222-8222-222222222222:reminder');
assert.equal(other.allowed, true, 'one exhausted bucket must not spend another bucket');
assert.equal(other.count, 1);

// The same booking but a different message type is a different budget.
const otherType = await claim('user-1:11111111-1111-4111-8111-111111111111:reminder');
assert.equal(otherType.allowed, true);
assert.equal(otherType.count, 1);

// --- the window actually rolls over --------------------------------------
// Force expiry rather than sleeping 10 minutes.
await db.query(
  `update public.studioflow_edge_rate_limits
      set expires_at = now() - interval '1 second'
    where bucket_key = $1`,
  [key],
);
const afterWindow = await claim(key);
assert.equal(afterWindow.allowed, true, 'a new window must allow sends again');
assert.equal(afterWindow.count, 1, 'the counter must restart, not continue from 6');

// --- parallel claims cannot exceed the ceiling ---------------------------
// This is the property a per-isolate Map could never provide.
const parallelKey = 'user-3:33333333-3333-4333-8333-333333333333:confirmation';
const concurrent = await Promise.all(
  Array.from({ length: 12 }, () => claim(parallelKey)),
);
const allowedCount = concurrent.filter((d) => d.allowed).length;
assert.equal(allowedCount, 5, `exactly 5 of 12 parallel claims may pass; got ${allowedCount}`);
// Counts must be a permutation of 1..12 — no lost updates from a read-then-write.
const counts = concurrent.map((d) => d.count).sort((a, b) => a - b);
assert.deepEqual(counts, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'every claim must get a distinct count');

// --- validation and access control ---------------------------------------
await assert.rejects(
  () => db.query('select public.studioflow_edge_rate_limit_claim($1,$2,$3)', ['', 600, 5]),
  /valid rate-limit bucket key/i,
);
await assert.rejects(
  () => db.query('select public.studioflow_edge_rate_limit_claim($1,$2,$3)', ['x'.repeat(321), 600, 5]),
  /valid rate-limit bucket key/i,
);

// Defensive parameters cannot turn the limiter off or make it unbounded.
const clamped = await claim('user-4:44444444-4444-4444-8444-444444444444:confirmation', 0, 0);
assert.equal(clamped.allowed, true);
const clampedSecond = await claim('user-4:44444444-4444-4444-8444-444444444444:confirmation', 0, 0);
assert.equal(clampedSecond.allowed, false, 'max_attempts=0 must clamp to 1, not disable the limit');

// --- only the service role may call it -----------------------------------
const { rows: privileges } = await db.query(`
  select
    has_function_privilege('anon', 'public.studioflow_edge_rate_limit_claim(text,integer,integer)', 'EXECUTE') as anon_can,
    has_function_privilege('authenticated', 'public.studioflow_edge_rate_limit_claim(text,integer,integer)', 'EXECUTE') as authenticated_can,
    has_function_privilege('service_role', 'public.studioflow_edge_rate_limit_claim(text,integer,integer)', 'EXECUTE') as service_can
`);
assert.equal(privileges[0].anon_can, false, 'anon must not be able to spend a bucket directly');
assert.equal(privileges[0].authenticated_can, false, 'a signed-in customer must not be able to spend a bucket directly');
assert.equal(privileges[0].service_can, true, 'the Edge Function (service role) must be able to claim');

const { rows: tablePrivileges } = await db.query(`
  select
    has_table_privilege('anon', 'public.studioflow_edge_rate_limits', 'SELECT') as anon_read,
    has_table_privilege('authenticated', 'public.studioflow_edge_rate_limits', 'UPDATE') as authenticated_write
`);
assert.equal(tablePrivileges[0].anon_read, false);
assert.equal(tablePrivileges[0].authenticated_write, false);

// --- housekeeping keeps the table bounded --------------------------------
await db.query(
  `insert into public.studioflow_edge_rate_limits (bucket_key, request_count, expires_at)
   values ('stale-bucket', 3, now() - interval '2 hours')`,
);
const { rows: pruned } = await db.query('select public.prune_studioflow_edge_rate_limits() as removed');
assert.ok(pruned[0].removed >= 1, 'expired rows must be removable');
const { rows: leftover } = await db.query(
  `select count(*)::int as remaining from public.studioflow_edge_rate_limits where bucket_key = 'stale-bucket'`,
);
assert.equal(leftover[0].remaining, 0, 'the stale row must be gone');

console.log(
  'PASS: shared Edge rate limit enforces one ceiling across callers (6th refused),'
  + ' per-bucket isolation, window rollover, 5-of-12 under parallel load,'
  + ' service-role-only access and pruning. No in-memory counter involved.',
);
