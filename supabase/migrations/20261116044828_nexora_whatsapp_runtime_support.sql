-- Make the NEXORA WhatsApp runtime self-contained on clean StudioFlow installs.
-- These additions are idempotent because the live production project may already
-- contain them from an earlier controlled rollout.

alter table public.salon_whatsapp_connections
  add column if not exists is_on_biz_app boolean not null default false,
  add column if not exists platform_type text,
  add column if not exists primary_waac_ids jsonb not null default '[]'::jsonb,
  add column if not exists connection_mode text not null default 'standard';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.salon_whatsapp_connections'::regclass
      and conname='salon_whatsapp_connections_connection_mode_check'
  ) then
    alter table public.salon_whatsapp_connections
      add constraint salon_whatsapp_connections_connection_mode_check
      check (connection_mode in ('standard','coexistence'));
  end if;
end;
$$;

alter table public.studioflow_payment_orders
  add column if not exists payment_link_id text,
  add column if not exists payment_link_url text,
  add column if not exists payment_link_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.studioflow_payment_orders'::regclass
      and conname='studioflow_payment_orders_payment_link_status_check'
  ) then
    alter table public.studioflow_payment_orders
      add constraint studioflow_payment_orders_payment_link_status_check
      check (
        payment_link_status is null or
        payment_link_status in ('created','partially_paid','paid','expired','cancelled')
      );
  end if;
end;
$$;

-- Provision an AES-256 key in Vault only when the installation does not already
-- have one. Never send or expose this value to a browser client.
do $$
begin
  if not exists (
    select 1 from vault.secrets
    where name='nexora_whatsapp_token_encryption_key'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32),'base64'),
      'nexora_whatsapp_token_encryption_key',
      'AES-256-GCM key for NEXORA per-salon WhatsApp token encryption. Service-role Edge Functions only.'
    );
  end if;
end;
$$;

create or replace function studioflow_private.nexora_whatsapp_token_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name='nexora_whatsapp_token_encryption_key'
  limit 1
$$;

create or replace function public.nexora_whatsapp_token_key()
returns text
language sql
stable
set search_path = ''
as $$
  select studioflow_private.nexora_whatsapp_token_key()
$$;

revoke all on function studioflow_private.nexora_whatsapp_token_key() from public, anon, authenticated;
revoke all on function public.nexora_whatsapp_token_key() from public, anon, authenticated;
grant execute on function public.nexora_whatsapp_token_key() to service_role;

-- One canonical server-only booking entry point. It requires an active,
-- webhook-subscribed connection for the same owner before creating the hold.
create or replace function public.nexora_whatsapp_book_guest(
  p_owner uuid,
  p_slug text,
  p_services jsonb,
  p_date date,
  p_time text,
  p_stylist text,
  p_name text,
  p_phone text,
  p_instructions text,
  p_request uuid,
  p_customer_id uuid,
  p_branch uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.salon_whatsapp_connections c
    where c.owner_id=p_owner
      and c.connection_status='connected'
      and c.webhook_subscribed=true
  ) then
    raise exception 'This salon WhatsApp number is not connected' using errcode='42501';
  end if;

  return studioflow_whatsapp_private.book_guest(
    p_owner,p_slug,p_services,p_date,p_time,p_stylist,
    p_name,p_phone,p_instructions,p_request,p_customer_id,p_branch
  );
end;
$$;

revoke all on function public.nexora_whatsapp_book_guest(uuid,text,jsonb,date,text,text,text,text,text,uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.nexora_whatsapp_book_guest(uuid,text,jsonb,date,text,text,text,text,text,uuid,uuid,uuid)
  to service_role;

comment on function public.nexora_whatsapp_book_guest(uuid,text,jsonb,date,text,text,text,text,text,uuid,uuid,uuid)
is 'Service-role-only WhatsApp booking entry point. Validates the active salon sender then uses the locked StudioFlow guest booking adapter.';
