import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';

const source = readFileSync('supabase/functions/studioflow-whatsapp-booking/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20261115131821_studioflow_whatsapp_test_booking_api.sql', 'utf8');
const spec = JSON.parse(readFileSync('docs/integrations/nexora-whatsapp-booking.openapi.json', 'utf8'));
const docs = readFileSync('docs/integrations/NEXORA-WHATSAPP-BOOKING-TEST.md', 'utf8');
const renameMigration = readFileSync('supabase/migrations/20261115145202_private_whatsapp_test_rate_limit.sql', 'utf8');

assert.match(source, /NEXORA_TAWK_BOOKING_API_KEY/);
assert.ok(source.includes("req.headers.get('authorization')"));
assert.ok(source.includes("Bearer\\s+"));
assert.match(source, /constantTimeEqual/);
assert.match(source, /studioflow_android_slots/);
assert.match(source, /studioflow_branch_android_slots/);
assert.match(source, /private_whatsapp_test_rate_limit/);
assert.ok(source.includes('if (body.customerConfirmed !== true)'));
assert.match(source, /Choose a salon location before checking times/);
assert.match(source, /studioflow_whatsapp_test_bookings/);
assert.match(source, /calendarReserved:\s*false/);
assert.match(source, /never log or echo raw customer messages, phone numbers, API keys or DB errors/i);
assert.doesNotMatch(source, /\.from\(['"]studioflow_bookings['"]\)\.insert/);
assert.doesNotMatch(source, /\.rpc\(['"]studioflow_(?:android_book|book|branch_book)['"]/);

assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all .* from public, anon, authenticated/i);
assert.match(migration, /grant select, insert, update, delete .* to service_role/i);
assert.match(migration, /unique \(owner_id, request_id\)/i);
assert.match(migration, /never reserves the live studioflow_bookings calendar/i);
assert.match(migration, /studioflow_whatsapp_test_rate_limit/i);
assert.match(renameMigration, /studioflow_whatsapp_test_rate_limit/i);
assert.match(renameMigration, /rename to private_whatsapp_test_rate_limit/i);

assert.equal(spec.openapi, '3.0.3');
assert.equal(spec.components.securitySchemes.NexoraBookingKey.type, 'http');
assert.equal(spec.components.securitySchemes.NexoraBookingKey.scheme, 'bearer');
assert.ok(spec.paths['/catalogue'] && spec.paths['/availability'] && spec.paths['/test-booking']);
assert.match(spec.paths['/test-booking'].post.description, /does NOT book the appointment/i);
assert.ok(spec.components.schemas.TestBookingRequest.required.includes('customerConfirmed'));
assert.match(docs, /has NOT been booked/i);
assert.match(docs, /Authorization: Bearer/i);

// Execute the actual applied base and rename instead of an alternate draft
// that creates a second counter table and replaces the deployed helper.
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.role() returns text language sql stable as $$
      select current_setting('request.jwt.claim.role',true)$$;
    create table public.studioflow_accounts(user_id uuid primary key);
    insert into public.studioflow_accounts values ('00000000-0000-4000-8000-000000000001');`);
  await db.exec(migration);
  await db.exec(renameMigration);
  await db.exec("set role service_role; select set_config('request.jwt.claim.role','service_role',false)");
  for (let count=1; count<=3; count++) {
    const {rows} = await db.query('select public.private_whatsapp_test_rate_limit($1,$2,2) as decision',
      ['00000000-0000-4000-8000-000000000001','a'.repeat(64)]);
    assert.equal(rows[0].decision.count,count);
    assert.equal(rows[0].decision.allowed,count<=2);
  }
  await db.exec('reset role');
  assert.equal((await db.query("select to_regclass('public.private_whatsapp_test_rate_limits') as extra")).rows[0].extra,null);
  assert.equal((await db.query('select attempt_count from public.studioflow_whatsapp_test_rate_limits')).rows[0].attempt_count,3);
  await db.exec('set role authenticated');
  await assert.rejects(() => db.query('select public.private_whatsapp_test_rate_limit($1,$2,2)',
    ['00000000-0000-4000-8000-000000000001','a'.repeat(64)]),/permission denied/);
} finally {
  await db.close();
}

console.log('PASS: WhatsApp test API auth, live availability RPC wiring, test-only persistence, RLS, idempotency, rate limit and OpenAPI contract.');
