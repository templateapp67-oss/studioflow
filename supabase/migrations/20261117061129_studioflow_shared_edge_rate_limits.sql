-- =============================================================================
-- STUDIOFLOW — shared Edge Function rate-limit store (gap G-06)
-- =============================================================================
-- `studioflow-booking-emails` kept its send quota in a module-level Map. On
-- Supabase Edge each isolate has its own memory and several run in parallel, so
-- the real ceiling was `MAX_PER_WINDOW × live isolates` and it reset on every
-- cold start. An in-memory counter is therefore not a limit at all — it only
-- bounds what a single warm instance does.
--
-- This is the shared counter, the same model the landing-lead limiter already
-- uses (202611070003), generalised so any Edge Function can claim a bucket.
--
-- Privacy: bucket keys are opaque server-generated strings (user id + booking
-- reference + message type). No client IP, e-mail address or phone number is
-- stored here. Rows expire with their window and are pruned by the function.
--
-- Access: RLS is enabled and no client role gets a grant. Only the privileged
-- service-role client used by an Edge Function can claim a bucket, so a signed-in
-- customer cannot spend or reset another caller's budget directly.
-- =============================================================================

create table if not exists public.studioflow_edge_rate_limits (
  bucket_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists studioflow_edge_rate_limits_expiry_idx
  on public.studioflow_edge_rate_limits (expires_at);

alter table public.studioflow_edge_rate_limits enable row level security;

revoke all on table public.studioflow_edge_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.studioflow_edge_rate_limits to service_role;

comment on table public.studioflow_edge_rate_limits is
  'Shared rate-limit counters for Edge Functions. Service-role only; rows expire with their window.';

-- Claim one attempt in the current window and report the outcome atomically.
-- A single upsert keeps this race-free across parallel isolates: two concurrent
-- callers cannot both read a stale count.
create or replace function public.studioflow_edge_rate_limit_claim(
  p_bucket_key text,
  p_window_seconds integer default 600,
  p_max_attempts integer default 5
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  claimed_count integer;
  window_ends timestamptz;
  allowed_max integer := greatest(coalesce(p_max_attempts, 5), 1);
  effective_window integer := greatest(coalesce(p_window_seconds, 600), 1);
begin
  if p_bucket_key is null or btrim(p_bucket_key) = '' or char_length(p_bucket_key) > 320 then
    raise exception 'A valid rate-limit bucket key is required' using errcode = '22023';
  end if;

  insert into public.studioflow_edge_rate_limits as limits
    (bucket_key, request_count, window_started_at, expires_at)
  values
    (p_bucket_key, 1, now(), now() + make_interval(secs => effective_window))
  on conflict (bucket_key) do update set
    request_count = case
      when limits.expires_at <= now() then 1
      else limits.request_count + 1
    end,
    window_started_at = case
      when limits.expires_at <= now() then now()
      else limits.window_started_at
    end,
    expires_at = case
      when limits.expires_at <= now() then now() + make_interval(secs => effective_window)
      else limits.expires_at
    end
  returning limits.request_count, limits.expires_at into claimed_count, window_ends;

  return jsonb_build_object(
    'allowed', claimed_count <= allowed_max,
    'count', claimed_count,
    'remaining', greatest(allowed_max - claimed_count, 0),
    'retryAfterSeconds', greatest(ceil(extract(epoch from (window_ends - now()))), 0)::integer
  );
end
$$;

revoke all on function public.studioflow_edge_rate_limit_claim(text, integer, integer) from public, anon, authenticated;
grant execute on function public.studioflow_edge_rate_limit_claim(text, integer, integer) to service_role;

-- Housekeeping so the table cannot grow without bound. Windows are 10 minutes;
-- an hour of slack keeps a just-expired row available for a late retry.
create or replace function public.prune_studioflow_edge_rate_limits()
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  with removed as (
    delete from public.studioflow_edge_rate_limits
    where expires_at < now() - interval '1 hour'
    returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function public.prune_studioflow_edge_rate_limits() from public, anon, authenticated;
grant execute on function public.prune_studioflow_edge_rate_limits() to service_role;
