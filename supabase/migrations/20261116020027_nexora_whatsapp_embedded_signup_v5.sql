-- Metadata for the current Meta Embedded Signup v5 completion payload.
alter table public.salon_whatsapp_connections
  add column if not exists is_on_biz_app boolean not null default false,
  add column if not exists platform_type text,
  add column if not exists primary_waac_ids jsonb not null default '[]'::jsonb,
  add column if not exists connection_mode text not null default 'standard';

alter table public.salon_whatsapp_connections
  drop constraint if exists salon_whatsapp_connections_connection_mode_check;
alter table public.salon_whatsapp_connections
  add constraint salon_whatsapp_connections_connection_mode_check
  check (connection_mode in ('standard','coexistence'));

create or replace function public.studioflow_settle_payment_link(
  p_booking uuid,
  p_payment_link text,
  p_payment text,
  p_amount bigint
) returns jsonb
language sql
security invoker
set search_path=''
as $$
  select studioflow_private.settle_payment_link(p_booking,p_payment_link,p_payment,p_amount)
$$;

revoke all on function public.studioflow_settle_payment_link(uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.studioflow_settle_payment_link(uuid,text,text,bigint) to service_role;

comment on column public.salon_whatsapp_connections.is_on_biz_app is
  'Meta Embedded Signup v5 flag indicating the phone continues to be connected to the WhatsApp Business app.';
comment on column public.salon_whatsapp_connections.connection_mode is
  'standard for Cloud API only; coexistence when the same sender remains on WhatsApp Business app and Cloud API.';
