-- NEXORA WhatsApp booking integration: isolated QA ledger only.
-- These rows are deliberately separate from studioflow_bookings and never
-- hold/reserve a live calendar slot or trigger payment/loyalty workflows.

create table if not exists public.studioflow_whatsapp_test_bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  request_id uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 100),
  customer_phone_hash text not null check (customer_phone_hash ~ '^[a-f0-9]{64}$'),
  customer_phone_last4 text not null check (customer_phone_last4 ~ '^[0-9]{4}$'),
  service_ids text[] not null check (cardinality(service_ids) between 1 and 10),
  stylist_id text not null,
  branch_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'test_only' check (status = 'test_only'),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint studioflow_whatsapp_test_bookings_request_unique unique (owner_id, request_id),
  constraint studioflow_whatsapp_test_bookings_time_check check (ends_at > starts_at)
);

create index if not exists studioflow_whatsapp_test_bookings_owner_created_idx
  on public.studioflow_whatsapp_test_bookings(owner_id, created_at desc);

alter table public.studioflow_whatsapp_test_bookings enable row level security;
revoke all on table public.studioflow_whatsapp_test_bookings from public, anon, authenticated;
grant select, insert, update, delete on table public.studioflow_whatsapp_test_bookings to service_role;

comment on table public.studioflow_whatsapp_test_bookings is
  'Private test-only WhatsApp booking simulation records. Never reserves the live studioflow_bookings calendar and is excluded from payment, loyalty and revenue flows.';

-- Private rolling-window limiter for WhatsApp test calls.
create table if not exists public.private_whatsapp_test_rate_limits (
  owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  phone_hash text not null check (phone_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  primary key (owner_id, phone_hash)
);

alter table public.private_whatsapp_test_rate_limits enable row level security;
revoke all on table public.private_whatsapp_test_rate_limits from public, anon, authenticated, service_role;

create or replace function public.private_whatsapp_test_rate_limit(
  p_owner_id uuid,
  p_phone_hash text,
  p_max_attempts integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
  v_window timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_owner_id is null or p_phone_hash is null
     or p_phone_hash !~ '^[a-f0-9]{64}$'
     or p_max_attempts is null or p_max_attempts not between 1 and 100 then
    raise exception 'Invalid rate-limit request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text || ':' || p_phone_hash, 91));

  insert into public.private_whatsapp_test_rate_limits(owner_id, phone_hash, window_started_at, attempt_count)
  values (p_owner_id, p_phone_hash, now(), 1)
  on conflict (owner_id, phone_hash) do update
    set window_started_at = case
          when public.private_whatsapp_test_rate_limits.window_started_at <= now() - interval '1 hour'
          then now()
          else public.private_whatsapp_test_rate_limits.window_started_at
        end,
        attempt_count = case
          when public.private_whatsapp_test_rate_limits.window_started_at <= now() - interval '1 hour'
          then 1
          else public.private_whatsapp_test_rate_limits.attempt_count + 1
        end
  returning attempt_count, window_started_at into v_count, v_window;

  return jsonb_build_object(
    'allowed', v_count <= p_max_attempts,
    'count', v_count,
    'remaining', greatest(0, p_max_attempts - v_count),
    'retryAfterSeconds', greatest(0, ceil(extract(epoch from (v_window + interval '1 hour' - now())))::integer)
  );
end
$function$;

revoke all on function public.private_whatsapp_test_rate_limit(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.private_whatsapp_test_rate_limit(uuid, text, integer) to service_role;

comment on table public.private_whatsapp_test_rate_limits is
  'Private rolling-window counters for the isolated NEXORA WhatsApp test endpoint.';
