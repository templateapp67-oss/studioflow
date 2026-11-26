-- NEXORA per-salon WhatsApp connections, webhook inbox and message ledger.
-- Secrets are stored only as authenticated-encrypted ciphertext by the Edge Function.
-- This migration intentionally does not create Meta credentials or enable production booking.

create table if not exists public.salon_whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null unique references public.salons(id) on delete cascade,
  waba_id text not null,
  phone_number_id text not null unique,
  business_id text,
  display_phone_number text not null,
  verified_name text,
  connection_status text not null default 'pending'
    check (connection_status in ('pending','connected','needs_reauth','suspended','disconnected')),
  access_token_ciphertext text not null,
  access_token_iv text not null,
  token_key_version integer not null default 1,
  token_expires_at timestamptz,
  webhook_subscribed boolean not null default false,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  disconnected_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_whatsapp_connections_phone_number_id_nonempty check (length(trim(phone_number_id)) > 0),
  constraint salon_whatsapp_connections_waba_id_nonempty check (length(trim(waba_id)) > 0)
);

create index if not exists salon_whatsapp_connections_status_idx
  on public.salon_whatsapp_connections(connection_status, webhook_subscribed);

create table if not exists public.salon_whatsapp_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  salon_id uuid not null references public.salons(id) on delete cascade,
  initiated_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists salon_whatsapp_oauth_states_expiry_idx
  on public.salon_whatsapp_oauth_states(expires_at) where consumed_at is null;

create table if not exists public.salon_whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  phone_number_id text,
  salon_id uuid references public.salons(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'received'
    check (processing_status in ('received','processing','processed','ignored','failed')),
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists salon_whatsapp_webhook_events_pending_idx
  on public.salon_whatsapp_webhook_events(processing_status, received_at);

create table if not exists public.salon_whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  customer_wa_id text not null,
  customer_name text,
  conversation_status text not null default 'active'
    check (conversation_status in ('active','awaiting_confirmation','booked','handed_off','closed')),
  flow_state jsonb not null default '{}'::jsonb,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, customer_wa_id)
);
create index if not exists salon_whatsapp_conversations_active_idx
  on public.salon_whatsapp_conversations(salon_id, conversation_status, updated_at desc);

create table if not exists public.salon_whatsapp_message_log (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  provider_message_id text unique,
  direction text not null check (direction in ('inbound','outbound')),
  recipient_wa_id text not null,
  message_kind text not null
    check (message_kind in ('conversation','booking_confirmation','booking_reminder','payment_link','payment_success','payment_failure','payment_receipt','human_handoff')),
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued','sent','delivered','read','failed','received')),
  template_name text,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists salon_whatsapp_message_log_salon_created_idx
  on public.salon_whatsapp_message_log(salon_id, created_at desc);
create index if not exists salon_whatsapp_message_log_booking_idx
  on public.salon_whatsapp_message_log(booking_id, created_at desc) where booking_id is not null;
create index if not exists salon_whatsapp_message_log_payment_idx
  on public.salon_whatsapp_message_log(payment_order_id, created_at desc) where payment_order_id is not null;

-- These records contain tenant secrets, customer identifiers and webhook payloads.
-- Only trusted Edge Functions using the service role may access them.
alter table public.salon_whatsapp_connections enable row level security;
alter table public.salon_whatsapp_oauth_states enable row level security;
alter table public.salon_whatsapp_webhook_events enable row level security;
alter table public.salon_whatsapp_conversations enable row level security;
alter table public.salon_whatsapp_message_log enable row level security;

revoke all on public.salon_whatsapp_connections from anon, authenticated;
revoke all on public.salon_whatsapp_oauth_states from anon, authenticated;
revoke all on public.salon_whatsapp_webhook_events from anon, authenticated;
revoke all on public.salon_whatsapp_conversations from anon, authenticated;
revoke all on public.salon_whatsapp_message_log from anon, authenticated;

grant all on public.salon_whatsapp_connections to service_role;
grant all on public.salon_whatsapp_oauth_states to service_role;
grant all on public.salon_whatsapp_webhook_events to service_role;
grant all on public.salon_whatsapp_conversations to service_role;
grant all on public.salon_whatsapp_message_log to service_role;

comment on table public.salon_whatsapp_connections is
  'One Meta WhatsApp Business Platform connection per NEXORA salon tenant. Access tokens must be AES-GCM encrypted by trusted Edge Functions before storage.';
comment on table public.salon_whatsapp_webhook_events is
  'Deduplicated Meta webhook inbox. Process using phone_number_id to resolve the owning salon tenant.';
comment on table public.salon_whatsapp_message_log is
  'Per-salon WhatsApp delivery and payment-message audit log for owner dashboard metrics.';
