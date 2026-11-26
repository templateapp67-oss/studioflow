import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const db = new PGlite({ extensions: { pgcrypto } });
const sql = name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const secondOwner = '22222222-2222-4222-8222-222222222222';
const customer = '33333333-3333-4333-8333-333333333333';
const invite = '44444444-4444-4444-8444-444444444444';
const token = 'a'.repeat(64);
const value = async (query, args) => (await db.query(query, args)).rows[0].value;

async function session(sub, aal) {
  await db.exec('reset role; set role authenticated;');
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub, aal, role: 'authenticated', email: 'owner@example.test' }),
  ]);
}

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role authenticator;
    create role service_role bypassrls;
    create schema auth;
    create schema extensions;
    create schema studioflow_private;
    create schema storage;
    grant usage on schema auth, studioflow_private, storage to authenticated;
    create extension pgcrypto with schema extensions;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as
      $$ select (auth.jwt()->>'sub')::uuid $$;
    create table auth.mfa_factors(user_id uuid, status text);
    create table storage.objects(id integer, bucket_id text);
    alter table storage.objects enable row level security;
    create policy existing_storage_policy on storage.objects for select to authenticated using (true);
    grant select on storage.objects to authenticated;
    insert into storage.objects values (1, 'studioflow-media'), (2, 'other-app');
    create table public.studioflow_accounts(user_id uuid primary key, draft jsonb);
    create table public.studioflow_bookings(id uuid primary key, owner_id uuid, customer_id uuid, status text);
    create table public.studioflow_staff_invites(
      id uuid primary key, owner_id uuid, staff_name text, email text,
      role text, expires_at timestamptz, status text, token_hash text
    );
    create table public.studioflow_staff_members(user_id uuid);
    create table public.studioflow_payment_orders(booking_id uuid);
    create policy existing_account_read on public.studioflow_accounts
      for select to authenticated using (user_id = auth.uid());
    create policy existing_booking_read on public.studioflow_bookings
      for select to authenticated using (owner_id = auth.uid() or customer_id = auth.uid());
    create policy existing_booking_update on public.studioflow_bookings
      for update to authenticated using (owner_id = auth.uid());
    grant select on public.studioflow_accounts, public.studioflow_bookings to authenticated;
    grant update on public.studioflow_bookings to authenticated;
    grant all on public.studioflow_staff_invites to authenticated;
    insert into public.studioflow_accounts values ('${owner}', '{}'), ('${secondOwner}', '{}');
    insert into public.studioflow_bookings values ('${invite}', '${owner}', '${customer}', 'pending');
    insert into public.studioflow_staff_invites values (
      '${invite}', '${owner}', 'Asha', 'asha@example.test', 'Service Provider',
      now() + interval '1 hour', 'pending', encode(extensions.digest('${token}', 'sha256'), 'hex')
    );
  `);
  await db.exec(sql('20261117061129_studioflow_shared_edge_rate_limits.sql'));
  await db.exec(sql('20261125100000_studioflow_auth_access_hardening.sql'));

  await session(secondOwner, 'aal1');
  assert.equal(await value('select count(*)::int value from public.studioflow_bookings'), 0);
  assert.equal(await value('select public.studioflow_staff_invite_delivery($1, $2) value', [invite, token]), null);

  await session(owner, 'aal1');
  const inviteDetails = await value('select public.studioflow_staff_invite_delivery($1, $2) value', [invite, token]);
  assert.equal(inviteDetails.owner_id, owner);
  assert.equal(inviteDetails.email, 'asha@example.test');
  assert.equal(inviteDetails.token_hash, undefined);
  assert.equal(await value('select public.studioflow_staff_invite_delivery($1, $2) value', [invite, 'b'.repeat(64)]), null);
  await assert.rejects(db.exec('select token_hash from public.studioflow_staff_invites'), /permission denied/);
  await assert.rejects(db.exec(`update public.studioflow_bookings set customer_id = '${secondOwner}'`), /Booking identity cannot be changed/);
  await db.exec("update public.studioflow_bookings set status = 'confirmed'");
  assert.equal(await value('select status value from public.studioflow_bookings'), 'confirmed');
  await assert.rejects(db.exec("select public.studioflow_edge_rate_limit_claim('test', 600, 2)"), /permission denied/);

  await db.exec(`reset role; insert into auth.mfa_factors values ('${owner}', 'verified')`);
  await session(owner, 'aal1');
  assert.equal(await value('select count(*)::int value from public.studioflow_accounts'), 0);
  assert.equal(await value("select count(*)::int value from storage.objects where bucket_id = 'studioflow-media'"), 0);
  assert.equal(await value("select count(*)::int value from storage.objects where bucket_id = 'other-app'"), 1);
  await assert.rejects(db.exec('select public.studioflow_check_rest_session()'), /Verify your authenticator/);

  await session(owner, 'aal2');
  await db.exec('select public.studioflow_check_rest_session()');
  assert.equal(await value('select count(*)::int value from public.studioflow_accounts'), 1);
  assert.equal(await value('select count(*)::int value from public.studioflow_bookings'), 1);
  assert.equal(await value('select count(*)::int value from storage.objects'), 2);

  await db.exec('reset role; set role service_role');
  const claim = () => value("select public.studioflow_edge_rate_limit_claim('test', 600, 2) value");
  assert.equal((await claim()).allowed, true);
  assert.equal((await claim()).allowed, true);
  const limited = await claim();
  assert.equal(limited.allowed, false);
  assert.ok(limited.retryAfterSeconds > 0);

  console.log('Verified invite binding, tenant isolation, MFA and RLS, booking identity, and shared rate limits.');
} finally {
  await db.close();
}
