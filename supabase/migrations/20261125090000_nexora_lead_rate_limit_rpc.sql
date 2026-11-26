-- Shared lead counter. Preserve the original table and the older RPC during
-- rolling deploys: old and new handlers can spend the same bucket. The table
-- may already exist in environments that applied the 20261107071230 migration.
create table if not exists public.landing_lead_rate_limits (
  bucket_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
create index if not exists landing_lead_rate_limits_expiry_idx
  on public.landing_lead_rate_limits (expires_at);
alter table public.landing_lead_rate_limits enable row level security;
revoke all on table public.landing_lead_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.landing_lead_rate_limits to service_role;

-- Only a trusted server may choose a bucket or limits. Callers supply a salted
-- SHA-256 digest, not an address. The upsert locks the row and increments or
-- resets it atomically, even across multiple serverless instances.
create or replace function public.claim_landing_lead_rate_limit(
  p_bucket_key text,
  p_window_seconds integer default 600,
  p_max_attempts integer default 5
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_expires timestamptz;
  v_allowed boolean;
  v_retry integer;
begin
  if p_bucket_key is null or p_bucket_key !~ '^[a-f0-9]{64}$'
     or p_window_seconds is null or p_window_seconds not between 1 and 86400
     or p_max_attempts is null or p_max_attempts not between 1 and 1000 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into public.landing_lead_rate_limits as limits
    (bucket_key, request_count, window_started_at, expires_at)
  values (p_bucket_key, 1, statement_timestamp(), statement_timestamp() + make_interval(secs => p_window_seconds))
  on conflict (bucket_key) do update set
    request_count = case
      when limits.expires_at <= statement_timestamp() then 1
      when limits.request_count < 2147483647 then limits.request_count + 1
      else 2147483647
    end,
    window_started_at = case when limits.expires_at <= statement_timestamp() then statement_timestamp() else limits.window_started_at end,
    expires_at = case when limits.expires_at <= statement_timestamp() then statement_timestamp() + make_interval(secs => p_window_seconds) else limits.expires_at end
  returning limits.request_count, limits.expires_at into v_count, v_expires;

  v_allowed := v_count <= p_max_attempts;
  v_retry := case when v_allowed then 0 else greatest(1, ceil(extract(epoch from (v_expires - clock_timestamp())))::integer) end;
  return jsonb_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'limit', p_max_attempts,
    'remaining', greatest(p_max_attempts - v_count, 0),
    'retry_after_seconds', v_retry
  );
end;
$$;

revoke all on function public.claim_landing_lead_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_landing_lead_rate_limit(text, integer, integer) to service_role;

-- Make the new RPC discoverable by PostgREST after this transaction commits.
notify pgrst, 'reload schema';
