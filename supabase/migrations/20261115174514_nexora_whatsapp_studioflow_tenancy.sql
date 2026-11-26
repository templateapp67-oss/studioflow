-- Bind NEXORA WhatsApp to the live StudioFlow owner/workspace model.
-- The older salons/bookings/payment_orders tables are not the tenant records
-- used by the current 16-template StudioFlow website and booking application.

alter table public.salon_whatsapp_connections
  alter column salon_id drop not null,
  add column owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade;

create unique index salon_whatsapp_connections_owner_id_uidx
  on public.salon_whatsapp_connections(owner_id);

alter table public.salon_whatsapp_oauth_states
  alter column salon_id drop not null,
  add column owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade;

create index salon_whatsapp_oauth_states_owner_expiry_idx
  on public.salon_whatsapp_oauth_states(owner_id, expires_at)
  where consumed_at is null;

alter table public.salon_whatsapp_webhook_events
  add column owner_id uuid references public.studioflow_accounts(user_id) on delete set null;

create index salon_whatsapp_webhook_events_owner_received_idx
  on public.salon_whatsapp_webhook_events(owner_id, received_at desc)
  where owner_id is not null;

alter table public.salon_whatsapp_conversations
  alter column salon_id drop not null,
  add column owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade;

create unique index salon_whatsapp_conversations_owner_customer_uidx
  on public.salon_whatsapp_conversations(owner_id, customer_wa_id);

create index salon_whatsapp_conversations_owner_active_idx
  on public.salon_whatsapp_conversations(owner_id, conversation_status, updated_at desc);

alter table public.salon_whatsapp_message_log
  alter column salon_id drop not null,
  add column owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade;

alter table public.salon_whatsapp_message_log
  drop constraint salon_whatsapp_message_log_booking_id_fkey,
  drop constraint salon_whatsapp_message_log_payment_order_id_fkey;

alter table public.salon_whatsapp_message_log
  rename column payment_order_id to studioflow_payment_booking_id;

alter table public.salon_whatsapp_message_log
  add constraint salon_whatsapp_message_log_booking_id_fkey
    foreign key (booking_id) references public.studioflow_bookings(id) on delete set null,
  add constraint salon_whatsapp_message_log_studioflow_payment_booking_id_fkey
    foreign key (studioflow_payment_booking_id) references public.studioflow_payment_orders(booking_id) on delete set null;

create index salon_whatsapp_message_log_owner_created_idx
  on public.salon_whatsapp_message_log(owner_id, created_at desc);

comment on column public.salon_whatsapp_connections.owner_id is
  'Canonical StudioFlow salon owner identity. Resolves the connected WhatsApp sender to studioflow_websites and the owner dashboard.';
comment on column public.salon_whatsapp_webhook_events.owner_id is
  'Resolved StudioFlow owner, populated only after a verified phone_number_id matches an active salon connection.';
comment on column public.salon_whatsapp_message_log.studioflow_payment_booking_id is
  'References studioflow_payment_orders.booking_id, the canonical StudioFlow payment-order key.';
