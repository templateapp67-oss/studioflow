import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const salon = '11111111-1111-4111-8111-111111111111';
const otherSalon = '22222222-2222-4222-8222-222222222222';
const customer = '33333333-3333-4333-8333-333333333333';
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key, banned_until timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon, authenticated;
    create table storage.objects(bucket_id text, name text);
    create table public.studioflow_websites(owner_id uuid primary key, slug text unique);
    create table public.studioflow_bookings(owner_id uuid, customer_id uuid, status text, payload jsonb);
  `);
  for (const file of [
    'migrations/20261014123207_studioflow_customer_reviews.sql',
    'migrations/20261014124327_studioflow_owner_review_update.sql',
    'pending-features/20261126160000_require_completed_booking_for_customer_reviews.sql',
  ]) await db.exec(readFileSync('supabase/' + file, 'utf8'));
  await db.query('insert into auth.users(id) values ($1), ($2), ($3)', [salon, otherSalon, customer]);
  await db.query("insert into public.studioflow_websites values ($1,'qa'),($2,'other')", [salon, otherSalon]);
  await db.query(`insert into public.studioflow_bookings values
    ($1,$3,'confirmed','{}'),($1,$3,'completed','{"demo":true}'),
    ($1,$3,'completed','{"isDemo":true}'),($2,$3,'completed','{}')`, [salon, otherSalon, customer]);
  const actAs = async (id, role) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec(role === 'anon' ? 'set role anon' : 'set role authenticated');
  };
  const list = async () => (await db.query("select studioflow_list_reviews('qa') as value")).rows[0].value;
  const submit = async () => (await db.query(
    "select studioflow_submit_review('qa','A reviewer',5,'A sufficiently detailed review') as value",
  )).rows[0].value;
  await actAs('', 'anon');
  assert.equal((await list()).canReview, false);
  await assert.rejects(submit, { code: '42501' });
  await actAs(customer, 'authenticated');
  assert.equal((await list()).canReview, false);
  await assert.rejects(submit, { code: '42501', message: /Complete an appointment/ });
  await db.exec('reset role');
  await db.query("insert into public.studioflow_bookings values ($1,$2,'completed','{}')", [salon, customer]);
  await actAs(customer, 'authenticated');
  assert.equal((await list()).canReview, true);
  assert.equal((await submit()).ownReview.verified, true);
  await actAs(salon, 'authenticated');
  assert.equal((await list()).canReview, true);
  const ownerUpdate = (await submit()).ownReview;
  assert.equal(ownerUpdate.isOwnerReview, true);
  assert.equal(ownerUpdate.verified, false);
  console.log('PASS: public review RPC rejects anonymous, demo, unfinished and cross-salon visits; verified reviews and owner updates work.');
} finally {
  await db.close();
}
