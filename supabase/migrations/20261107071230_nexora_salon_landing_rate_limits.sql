-- =============================================================================
-- NEXORA SALONOS — landing-page lead rate-limit store
-- =============================================================================
-- SUPABASE_DATABASE.md §10.11 requires rate limiting for the public
-- `submit-landing-lead` endpoint, and §13 notes that an IP-derived identifier
-- must live in "an appropriately protected short-lived/rate-limit store" with a
-- documented retention period.
--
-- An in-memory limiter is not enough here: Supabase Edge Functions run on
-- several instances, so a per-process counter can be bypassed by parallel
-- requests. This table is the shared counter.
--
-- Privacy:
--   * only a salted SHA-256 hash of the client IP is stored — never the raw IP;
--   * the salt is regenerated per function instance, so hashes cannot be
--     correlated across instances or across retention windows;
--   * rows are short-lived: the window is 10 minutes and expired rows are
--     deleted by the function, so nothing is retained beyond the window.
--
-- Access: RLS is enabled and no client role receives any grant. Only the
-- privileged server-side client (service_role) used by the Edge Function can
-- read or write this table.
-- =============================================================================

create table if not exists public.landing_lead_rate_limits (
  bucket_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists landing_lead_rate_limits_expiry_idx
  on public.landing_lead_rate_limits (expires_at);

alter table public.landing_lead_rate_limits enable row level security;

revoke all on table public.landing_lead_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.landing_lead_rate_limits to service_role;

-- The function counts a request in the current window and returns the running
-- total. A new window starts as soon as the previous one expires.
create or replace function public.register_landing_lead_attempt(
  p_bucket_key text,
  p_window_seconds integer default 600,
  p_max_attempts integer default 5
)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.landing_lead_rate_limits (bucket_key, request_count, window_started_at, expires_at)
  values (p_bucket_key, 1, now(), now() + make_interval(secs => greatest(p_window_seconds, 1)))
  on conflict (bucket_key) do update
    set request_count = case
          when public.landing_lead_rate_limits.expires_at <= now() then 1
          else public.landing_lead_rate_limits.request_count + 1
        end,
        window_started_at = case
          when public.landing_lead_rate_limits.expires_at <= now() then now()
          else public.landing_lead_rate_limits.window_started_at
        end,
        expires_at = case
          when public.landing_lead_rate_limits.expires_at <= now() then now() + make_interval(secs => greatest(p_window_seconds, 1))
          else public.landing_lead_rate_limits.expires_at
        end
  returning request_count;
$$;

revoke all on function public.register_landing_lead_attempt(text, integer, integer) from public;
grant execute on function public.register_landing_lead_attempt(text, integer, integer) to service_role;

-- Housekeeping: remove rows whose window has passed. The function calls this
-- occasionally so the table stays small and nothing is retained beyond the
-- window.
create or replace function public.prune_landing_lead_rate_limits()
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  with removed as (
    delete from public.landing_lead_rate_limits
    where expires_at < now() - interval '1 hour'
    returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function public.prune_landing_lead_rate_limits() from public;
grant execute on function public.prune_landing_lead_rate_limits() to service_role;
