-- =============================================================================
-- STUDIOFLOW — processed_webhook_events: replay protection + idempotency
-- =============================================================================
-- Both public webhooks (Razorpay payments, Meta WhatsApp) verify their
-- signature over the exact raw body, but a valid signature alone does not stop
-- a captured delivery from being replayed: every legitimate provider replays
-- (retries) its own events, and an attacker who captures one can replay it
-- verbatim forever.
--
-- Design contract:
--  * Every webhook passes through studioflow_claim_webhook_event() BEFORE any
--    side effect. A (provider, event_id) pair is processed at most once.
--  * event_id comes from the provider's event-id header when present and
--    well-formed, otherwise from sha256(exact raw body) — identical retries
--    hash identically, so content-addressing is a safe fallback.
--  * Deliveries whose signed timestamp is older than the configured tolerance
--    (default 300s, WEBHOOK_REPLAY_TOLERANCE_SECONDS) are recorded as 'stale'
--    for audit and refused before any work happens. Future-skewed timestamps
--    beyond the same tolerance are refused the same way.
--  * A row left 'claimed' by a crashed worker may be reclaimed after 10
--    minutes; a row marked 'failed' (or recorded 'stale') may be retried.
--    Rows that reached 'processed' are never re-claimed: true duplicates get a
--    200 acknowledgment so the provider stops retrying.
--  * The table is reachable ONLY through these two security-definer RPCs.
--    anon, authenticated and service_role hold no table grants and RLS has no
--    policies — the service role cannot even read the ledger directly.
-- =============================================================================

create table if not exists public.processed_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('razorpay', 'meta_whatsapp')),
  event_id text not null check (length(btrim(event_id)) > 0 and length(event_id) <= 256),
  event_type text check (event_type is null or length(event_type) <= 80),
  event_created_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'claimed' check (status in ('claimed', 'processed', 'failed', 'stale')),
  constraint processed_webhook_events_unique unique (provider, event_id)
);

create index if not exists processed_webhook_events_received_idx
  on public.processed_webhook_events (received_at desc);

alter table public.processed_webhook_events enable row level security;
revoke all on public.processed_webhook_events from public, anon, authenticated, service_role;

create or replace function public.studioflow_claim_webhook_event(
  p_provider text,
  p_event_id text,
  p_event_type text default null,
  p_created_at timestamptz default null,
  p_max_age_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_max interval := (greatest(least(coalesce(p_max_age_seconds, 300), 86400), 1)) * interval '1 second';
  v_type text := nullif(left(btrim(coalesce(p_event_type, '')), 80), '');
  v_id bigint;
begin
  if p_provider not in ('razorpay', 'meta_whatsapp') then
    raise exception 'Unknown webhook provider' using errcode = '22023';
  end if;
  if p_event_id is null or btrim(p_event_id) = '' or length(p_event_id) > 256 then
    raise exception 'Invalid webhook event id' using errcode = '22023';
  end if;

  -- Stale / not-yet-valid deliveries: record for audit, then refuse.
  if p_created_at is not null and p_created_at > v_now + v_max then
    insert into public.processed_webhook_events (provider, event_id, event_type, event_created_at, status)
    values (p_provider, btrim(p_event_id), v_type, p_created_at, 'stale')
    on conflict (provider, event_id) do nothing;
    return jsonb_build_object('claimed', false, 'reason', 'future');
  end if;
  if p_created_at is not null and p_created_at < v_now - v_max then
    insert into public.processed_webhook_events (provider, event_id, event_type, event_created_at, status)
    values (p_provider, btrim(p_event_id), v_type, p_created_at, 'stale')
    on conflict (provider, event_id) do nothing;
    return jsonb_build_object('claimed', false, 'reason', 'stale');
  end if;

  insert into public.processed_webhook_events (provider, event_id, event_type, event_created_at, status)
  values (p_provider, btrim(p_event_id), v_type, p_created_at, 'claimed')
  on conflict (provider, event_id) do nothing
  returning id into v_id;
  if v_id is not null then
    return jsonb_build_object('claimed', true, 'reason', null);
  end if;

  -- A crashed worker may reclaim an abandoned claim; a failed or previously
  -- refused (stale) row may be retried. Rows that reached 'processed' are
  -- never re-claimed.
  update public.processed_webhook_events
     set status = 'claimed',
         received_at = v_now,
         processed_at = null,
         event_type = coalesce(v_type, event_type),
         event_created_at = coalesce(p_created_at, event_created_at)
   where provider = p_provider
     and event_id = btrim(p_event_id)
     and (status in ('failed', 'stale')
          or (status = 'claimed' and received_at < v_now - interval '10 minutes'))
  returning id into v_id;
  if v_id is not null then
    return jsonb_build_object('claimed', true, 'reason', 'reclaimed');
  end if;

  return jsonb_build_object('claimed', false, 'reason', 'duplicate');
end;
$$;

create or replace function public.studioflow_finish_webhook_event(
  p_provider text,
  p_event_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_provider not in ('razorpay', 'meta_whatsapp') then
    raise exception 'Unknown webhook provider' using errcode = '22023';
  end if;
  if p_status not in ('processed', 'failed') then
    raise exception 'Invalid webhook event status' using errcode = '22023';
  end if;
  update public.processed_webhook_events
     set status = p_status,
         processed_at = now()
   where provider = p_provider
     and event_id = btrim(p_event_id)
     and status = 'claimed';
end;
$$;

revoke all on function public.studioflow_claim_webhook_event(text, text, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.studioflow_finish_webhook_event(text, text, text) from public, anon, authenticated;
grant execute on function public.studioflow_claim_webhook_event(text, text, text, timestamptz, integer) to service_role;
grant execute on function public.studioflow_finish_webhook_event(text, text, text) to service_role;
