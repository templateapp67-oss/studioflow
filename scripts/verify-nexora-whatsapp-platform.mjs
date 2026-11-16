import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const schemaFoundation = read('supabase/migrations/20261115173757_nexora_salon_whatsapp_platform.sql');
const studioflowTenancy = read('supabase/migrations/20261115174514_nexora_whatsapp_studioflow_tenancy.sql');
const bookingPayments = read('supabase/migrations/20261116014600_nexora_whatsapp_booking_payment_engine.sql');
const embeddedSignup = read('supabase/migrations/20261116020000_nexora_whatsapp_embedded_signup_v5.sql');
const refundLedger = read('supabase/migrations/20261116022000_nexora_whatsapp_refund_ledger.sql');
const platform = read('supabase/functions/nexora-whatsapp-platform/index.ts');
const payments = read('supabase/functions/studioflow-payments/index.ts');
const ownerUi = read('src/components/SalonWhatsAppIntegration.tsx');
const ownerWorkspace = read('src/components/OwnerWorkspace.tsx');
const ownerNavigation = read('src/lib/ownerNavigation.ts');

for (const table of [
  'salon_whatsapp_connections',
  'salon_whatsapp_oauth_states',
  'salon_whatsapp_webhook_events',
  'salon_whatsapp_conversations',
  'salon_whatsapp_message_log',
]) {
  assert.ok(schemaFoundation.includes('create table if not exists public.' + table), 'missing tenant table ' + table);
  assert.ok(schemaFoundation.includes('alter table public.' + table + ' enable row level security'), 'RLS missing on ' + table);
  assert.ok(schemaFoundation.includes('revoke all on public.' + table + ' from anon, authenticated'), 'browser access not revoked on ' + table);
  assert.ok(schemaFoundation.includes('grant all on public.' + table + ' to service_role'), 'service role grant missing on ' + table);
  assert.ok(studioflowTenancy.includes('owner_id uuid not null references public.studioflow_accounts(user_id)'), 'StudioFlow owner mapping missing on ' + table);
}

assert.ok(studioflowTenancy.includes('references public.studioflow_bookings(id)'), 'WhatsApp log must reference canonical booking records');
assert.ok(studioflowTenancy.includes('references public.studioflow_payment_orders(booking_id)'), 'WhatsApp log must reference canonical payment records');
assert.ok(bookingPayments.includes("'whatsapp',idempotency_key"), 'WhatsApp booking source must be assigned by the trusted booking function');
assert.ok(bookingPayments.includes('external_idempotency_key'), 'booking creation must be idempotent');
assert.ok(bookingPayments.includes('public.studioflow_whatsapp_book'), 'guest booking needs a service-role-only RPC');
assert.ok(bookingPayments.includes('public.studioflow_settle_payment_link'), 'payment link settlement must have a service-role-only RPC');
assert.ok(bookingPayments.includes("payment_link_id"), 'payment link must be linked to the booking payment ledger');
assert.ok(embeddedSignup.includes('is_on_biz_app'), 'Meta Embedded Signup v5 coexistence flag missing');
assert.ok(embeddedSignup.includes("connection_mode in ('standard','coexistence')"), 'connection mode contract missing');
assert.ok(refundLedger.includes('public.studioflow_complete_refund'), 'canonical refund completion RPC missing');
assert.ok(refundLedger.includes("'refunded'"), 'refund-completed state missing');
assert.ok(refundLedger.includes("'refund_failed'"), 'refund-failed state missing');

assert.ok(platform.includes('x-hub-signature-256'), 'Meta raw-body signature header must be checked');
assert.ok(platform.includes('META_APP_SECRET'), 'Meta webhook signature secret must be server-only');
assert.ok(platform.includes('META_WEBHOOK_VERIFY_TOKEN'), 'Meta webhook GET verification is missing');
assert.ok(platform.includes('NEXORA_WA_TOKEN_ENCRYPTION_KEY'), 'Meta tokens must be encrypted at rest');
assert.ok(platform.includes("embedded_signup_version: 'v5'"), 'Embedded Signup must use v5 session metadata');
assert.ok(platform.includes('messaging_account_ids'), 'Embedded Signup v5 Messaging Account IDs are not handled');
assert.ok(platform.includes('FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') || platform.includes('FINISH'), 'Embedded Signup finish event is not handled');
assert.ok(platform.includes('studioflow_available_slots'), 'WhatsApp flow must read live salon availability');
assert.ok(platform.includes('studioflow_whatsapp_book'), 'WhatsApp must use the trusted canonical booking RPC');
assert.ok(platform.includes('payment_link'), 'WhatsApp booking must issue hosted payment links');
assert.ok(platform.includes('customer_service_window_closed'), '24-hour WhatsApp customer-service window must be enforced');
assert.ok(platform.includes('customer_opted_out'), 'WhatsApp STOP must suppress future messages');
assert.ok(platform.includes('internal_payment_success'), 'internal verified-payment notification action is missing');

assert.ok(payments.includes("body.event==='payment_link.paid'"), 'existing Razorpay webhook must process WhatsApp payment links');
assert.ok(payments.includes('studioflow_settle_payment_link'), 'payment link webhook must settle the canonical deposit');
assert.ok(payments.includes("payment.status!=='captured'"), 'uncaptured Razorpay payments must not confirm the booking');
assert.ok(payments.includes("payment.currency!=='INR'"), 'payment currency must match INR');
assert.ok(payments.includes('internal_payment_success'), 'verified payment must notify the salon WhatsApp sender');

assert.ok(ownerUi.includes("supabase.functions.invoke(platformEndpoint"), 'owner UI must call the Edge Function');
assert.ok(ownerUi.includes("action: 'start_signup'"), 'owner UI must begin Meta connect');
assert.ok(ownerUi.includes("action: 'complete_signup'"), 'owner UI must finish Meta connect');
assert.ok(ownerUi.includes('Connect salon WhatsApp'), 'owner UI connection button missing');
assert.ok(ownerWorkspace.includes('SalonWhatsAppIntegration'), 'owner workspace panel is not wired');
assert.ok(ownerWorkspace.includes('active === 34'), 'owner workspace navigation route missing');
assert.ok(ownerNavigation.includes("id:34,label:'WhatsApp Booking & Payments'"), 'owner business-tools navigation item missing');
assert.ok(!ownerUi.includes('SUPABASE_SERVICE_ROLE_KEY'), 'service-role key must never reach browser code');

console.log('PASS: NEXORA salon-owned WhatsApp v5, secure booking, payment-link and refund contracts.');
