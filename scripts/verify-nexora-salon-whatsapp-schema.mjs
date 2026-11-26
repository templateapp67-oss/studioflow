import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Execute the immutable foundation and tenancy correction in order. Historical
// references are valid in the first migration; assert the resulting catalog,
// not the obsolete intermediate table names or documentation wording.
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key);
  create table public.salons(id uuid primary key);
  create table public.bookings(id uuid primary key);
  create table public.payment_orders(id uuid primary key);
  create table public.studioflow_accounts(user_id uuid primary key references auth.users(id));
  create table public.studioflow_bookings(id uuid primary key);
  create table public.studioflow_payment_orders(booking_id uuid primary key references public.studioflow_bookings(id));
`);
for (const file of ['20261115173757_nexora_salon_whatsapp_platform.sql', '20261115174514_nexora_whatsapp_studioflow_tenancy.sql']) {
  await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
}
const tables = ['salon_whatsapp_connections', 'salon_whatsapp_oauth_states', 'salon_whatsapp_webhook_events',
  'salon_whatsapp_conversations', 'salon_whatsapp_message_log'];
for (const table of tables) {
  const { rows: [row] } = await db.query(`select c.relrowsecurity,
    has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') anon_access,
    has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') authenticated_access,
    has_table_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE,DELETE') server_access
    from pg_class c where c.oid = $1::regclass`, ['public.' + table]);
  assert.equal(row.relrowsecurity, true, table + ' RLS');
  assert.equal(row.anon_access, false, table + ' anon access');
  assert.equal(row.authenticated_access, false, table + ' authenticated access');
  assert.equal(row.server_access, true, table + ' server access');
  const { rows: [fk] } = await db.query(`select pg_get_constraintdef(oid) definition from pg_constraint
    where conrelid=$1::regclass and contype='f' and confrelid='public.studioflow_accounts'::regclass`, ['public.' + table]);
  assert.match(fk.definition, /FOREIGN KEY \(owner_id\) REFERENCES studioflow_accounts\(user_id\)/);
}
const { rows: fks } = await db.query(`select pg_get_constraintdef(oid) definition from pg_constraint
  where conrelid='public.salon_whatsapp_message_log'::regclass and contype='f'`);
assert.ok(fks.some(row => /FOREIGN KEY \(booking_id\) REFERENCES studioflow_bookings\(id\)/.test(row.definition)));
assert.ok(fks.some(row => /FOREIGN KEY \(studioflow_payment_booking_id\) REFERENCES studioflow_payment_orders\(booking_id\)/.test(row.definition)));
assert.ok(!fks.some(row => /REFERENCES (bookings|payment_orders)\(/.test(row.definition)));
const { rows: oldColumn } = await db.query(`select 1 from information_schema.columns
  where table_schema='public' and table_name='salon_whatsapp_message_log' and column_name='payment_order_id'`);
assert.equal(oldColumn.length, 0, 'Old payment_order_id column must be renamed');

// Two owners can connect without legacy salon IDs. PostgreSQL UNIQUE permits
// multiple NULLs; keeping the historical unique index does not block tenancy.
const ownerA = '00000000-0000-4000-8000-000000000001';
const ownerB = '00000000-0000-4000-8000-000000000002';
for (const owner of [ownerA, ownerB]) {
  await db.query('insert into auth.users values($1)', [owner]);
  await db.query('insert into studioflow_accounts values($1)', [owner]);
  await db.query(`insert into salon_whatsapp_connections(owner_id,waba_id,phone_number_id,display_phone_number,access_token_ciphertext,access_token_iv)
    values($1,'waba',$2,$2,'cipher','iv')`, [owner, owner]);
  await db.query(`insert into salon_whatsapp_conversations(owner_id,customer_wa_id) values($1,'919999999999')`, [owner]);
}
await assert.rejects(db.query(`insert into salon_whatsapp_connections(owner_id,waba_id,phone_number_id,display_phone_number,access_token_ciphertext,access_token_iv)
  values($1,'waba','duplicate','duplicate','cipher','iv')`, [ownerA]), /unique/i);
await assert.rejects(db.query(`insert into salon_whatsapp_message_log(owner_id,booking_id,direction,recipient_wa_id,message_kind)
  values($1,'00000000-0000-4000-8000-000000000099','inbound','919999999999','conversation')`, [ownerA]), /foreign key/i);
await db.exec('grant usage on schema public to anon, authenticated, service_role');
for (const role of ['anon', 'authenticated']) {
  await db.exec('set role ' + role);
  for (const table of tables) {
    await assert.rejects(db.query('select * from public.' + table), /permission denied/i);
  }
  await db.exec('reset role');
}
await db.exec('set role service_role');
for (const table of tables) await db.query('select * from public.' + table);
await db.exec('reset role');
const {verifyWhatsAppRuntimeCatalog}=await import('./fixtures/whatsapp-runtime-catalog.mjs');
await verifyWhatsAppRuntimeCatalog(db);
await db.close();
console.log('PASS: applied WhatsApp schema, canonical owner/booking/payment FKs, RLS, grants and nullable legacy uniqueness.');
