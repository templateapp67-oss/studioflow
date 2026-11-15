import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261115173757_nexora_salon_whatsapp_platform.sql', 'utf8');
const tenancyMigration = readFileSync('supabase/migrations/20261115174514_nexora_whatsapp_studioflow_tenancy.sql', 'utf8');
const guide = readFileSync('docs/integrations/nexora-salon-owned-whatsapp-booking.md', 'utf8');

for (const table of [
  'salon_whatsapp_connections',
  'salon_whatsapp_oauth_states',
  'salon_whatsapp_webhook_events',
  'salon_whatsapp_conversations',
  'salon_whatsapp_message_log',
]) {
  assert.ok(migration.includes(`create table if not exists public.${table}`), `Missing table: ${table}`);
  assert.ok(migration.includes(`alter table public.${table} enable row level security`), `RLS must be enabled: ${table}`);
  assert.ok(migration.includes(`revoke all on public.${table} from anon, authenticated`), `Browser roles must not access: ${table}`);
  assert.ok(migration.includes(`grant all on public.${table} to service_role`), `Trusted Edge Functions need access: ${table}`);
}

assert.match(migration, /phone_number_id text not null unique/);
assert.match(migration, /salon_id uuid not null unique references public\.salons\(id\)/);
assert.match(migration, /access_token_ciphertext text not null/);
assert.match(migration, /access_token_iv text not null/);
assert.match(migration, /state_hash text not null unique/);
assert.match(migration, /provider_event_id text not null unique/);
assert.match(migration, /booking_id uuid references public\.bookings\(id\)/);
assert.match(migration, /payment_order_id uuid references public\.payment_orders\(id\)/);
assert.match(migration, /message_kind in \('conversation','booking_confirmation','booking_reminder','payment_link','payment_success','payment_failure','payment_receipt','human_handoff'\)/);
assert.ok(tenancyMigration.includes('owner_id uuid not null references public.studioflow_accounts(user_id)'));
assert.ok(tenancyMigration.includes('references public.studioflow_bookings(id)'));
assert.ok(tenancyMigration.includes('references public.studioflow_payment_orders(booking_id)'));
assert.ok(tenancyMigration.includes('rename column payment_order_id to studioflow_payment_booking_id'));
assert.ok(guide.includes('studioflow_accounts.user_id'));
assert.ok(guide.includes('studioflow_bookings'));
assert.ok(guide.includes('studioflow_payment_orders'));
assert.match(guide, /X-Hub-Signature-256/);
assert.match(guide, /booking_source = 'whatsapp'/);
assert.match(guide, /verified provider webhook\/signature/);
assert.match(guide, /does not create a live Meta connection/);

console.log('NEXORA salon-owned WhatsApp schema contract passed.');
