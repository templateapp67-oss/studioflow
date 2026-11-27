-- StudioFlow / Nexora transactional email outbox and Resend webhook ledger.
-- Apply this migration to NEXORA-QA first. It intentionally does not modify
-- bookings, payment balances, Razorpay ledgers, or Auth OTP storage.

begin;

create table if not exists public.studioflow_transactional_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  kind text not null check (kind in (
    'booking_confirmation', 'booking_reminder', 'payment_receipt'
  )),
  recipient_email text not null check (recipient_email = lower(btrim(recipient_email))),
  email_payload jsonb not null,
  booking_id uuid,
  payment_id text,
  status text not null default 'pending' check (status in (
    'pending', 'sending', 'sent', 'delivered',
    'bounced', 'failed', 'complained', 'suppressed'
  )),
  resend_email_id text unique,
  attempts integer not null default 0 check (attempts >= 0),
  retryable boolean not null default false,
  next_attempt_at timestamptz,
  last_error_code text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studioflow_email_payload_object check (jsonb_typeof(email_payload) = 'object')
);

create index if not exists studioflow_email_outbox_retry_idx
  on public.studioflow_transactional_email_outbox(next_attempt_at, created_at)
  where status = 'failed' and retryable = true;

create index if not exists studioflow_email_outbox_booking_idx
  on public.studioflow_transactional_email_outbox(booking_id, created_at desc)
  where booking_id is not null;

create table if not exists public.studioflow_resend_webhook_events (
  event_id text primary key check (length(btrim(event_id)) between 1 and 256),
  event_type text not null check (event_type in (
    'email.delivered', 'email.bounced', 'email.failed', 'email.complained'
  )),
  resend_email_id text,
  recipient_email text,
  event_data jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.studioflow_email_suppressions (
  email_address text primary key check (email_address = lower(btrim(email_address))),
  reason text not null check (reason in ('hard_bounce', 'complaint')),
  source_event_id text,
  created_at timestamptz not null default now()
);

alter table public.studioflow_transactional_email_outbox enable row level security;
alter table public.studioflow_resend_webhook_events enable row level security;
alter table public.studioflow_email_suppressions enable row level security;

revoke all on public.studioflow_transactional_email_outbox from public, anon, authenticated;
revoke all on public.studioflow_resend_webhook_events from public, anon, authenticated;
revoke all on public.studioflow_email_suppressions from public, anon, authenticated;
grant all on public.studioflow_transactional_email_outbox to service_role;
grant all on public.studioflow_resend_webhook_events to service_role;
grant all on public.studioflow_email_suppressions to service_role;

-- Claims one logical email event. A duplicate event_key never creates a second
-- outbox row. An uncertain send is reclaimable only during Resend's 24-hour
-- idempotency window, and it reuses the exact same event_key/payload.
create or replace function public.studioflow_email_claim(
  p_event_key text,
  p_kind text,
  p_recipient_email text,
  p_email_payload jsonb,
  p_booking_id uuid default null,
  p_payment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_status text;
begin
  if p_event_key is null or length(btrim(p_event_key)) < 1 or length(p_event_key) > 200
     or p_kind not in ('booking_confirmation', 'booking_reminder', 'payment_receipt')
     or p_recipient_email is null
     or lower(btrim(p_recipient_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or jsonb_typeof(p_email_payload) <> 'object'
     or coalesce(length(p_email_payload->>'subject'), 0) < 1
     or coalesce(length(p_email_payload->>'html'), 0) < 1
     or coalesce(length(p_email_payload->>'text'), 0) < 1 then
    raise exception 'Invalid transactional email request' using errcode = '22023';
  end if;

  insert into public.studioflow_transactional_email_outbox(
    event_key, kind, recipient_email, email_payload, booking_id, payment_id
  ) values (
    btrim(p_event_key), p_kind, lower(btrim(p_recipient_email)),
    p_email_payload, p_booking_id, p_payment_id
  )
  on conflict (event_key) do nothing;

  update public.studioflow_transactional_email_outbox
     set status = 'sending',
         attempts = attempts + 1,
         retryable = false,
         next_attempt_at = null,
         last_error_code = null,
         updated_at = now()
   where event_key = btrim(p_event_key)
     and attempts < 5
     and (
       status = 'pending'
       or (status = 'failed' and retryable and next_attempt_at <= now())
       or (
         status = 'sending'
         and updated_at < now() - interval '2 minutes'
         and created_at > now() - interval '23 hours'
       )
     )
  returning id into v_id;

  if v_id is not null then
    return jsonb_build_object('claimed', true, 'id', v_id);
  end if;

  select status into v_status
    from public.studioflow_transactional_email_outbox
   where event_key = btrim(p_event_key);

  return jsonb_build_object(
    'claimed', false,
    'duplicate', true,
    'status', coalesce(v_status, 'unknown')
  );
end;
$$;

create or replace function public.studioflow_email_mark_sent(
  p_event_key text,
  p_resend_email_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient text;
  v_updated boolean;
begin
  if p_resend_email_id is null or length(btrim(p_resend_email_id)) = 0 then
    raise exception 'Resend email id is required' using errcode = '22023';
  end if;

  update public.studioflow_transactional_email_outbox o
     set status = case
           when exists (select 1 from public.studioflow_resend_webhook_events e where e.resend_email_id = p_resend_email_id and e.event_type = 'email.complained') then 'complained'
           when exists (select 1 from public.studioflow_resend_webhook_events e where e.resend_email_id = p_resend_email_id and e.event_type = 'email.bounced') then 'bounced'
           when exists (select 1 from public.studioflow_resend_webhook_events e where e.resend_email_id = p_resend_email_id and e.event_type = 'email.delivered') then 'delivered'
           when exists (select 1 from public.studioflow_resend_webhook_events e where e.resend_email_id = p_resend_email_id and e.event_type = 'email.failed') then 'failed'
           else 'sent'
         end,
         resend_email_id = p_resend_email_id,
         sent_at = coalesce(sent_at, now()),
         delivered_at = case
           when exists (select 1 from public.studioflow_resend_webhook_events e where e.resend_email_id = p_resend_email_id and e.event_type = 'email.delivered') then coalesce(delivered_at, now())
           else delivered_at
         end,
         retryable = false,
         next_attempt_at = null,
         last_error_code = null,
         updated_at = now()
   where event_key = btrim(p_event_key)
     and status = 'sending'
  returning recipient_email into v_recipient;

  v_updated := found;

  -- A webhook can arrive before the email ID is saved on the outbox row.
  -- Reconcile any early hard-bounce/complaint event now, but only for a
  -- recipient belonging to this Nexora outbox message.
  if v_updated and v_recipient is not null then
    if exists (
      select 1 from public.studioflow_resend_webhook_events e
      where e.resend_email_id = p_resend_email_id
        and e.event_type = 'email.complained'
        and (e.recipient_email is null or e.recipient_email = v_recipient)
    ) then
      insert into public.studioflow_email_suppressions(email_address,reason,source_event_id)
      select v_recipient,'complaint',e.event_id
        from public.studioflow_resend_webhook_events e
       where e.resend_email_id = p_resend_email_id
         and e.event_type = 'email.complained'
         and (e.recipient_email is null or e.recipient_email = v_recipient)
       order by e.received_at desc
       limit 1
      on conflict(email_address) do update
        set reason = 'complaint', source_event_id = excluded.source_event_id;
    elsif exists (
      select 1 from public.studioflow_resend_webhook_events e
      where e.resend_email_id = p_resend_email_id
        and e.event_type = 'email.bounced'
        and lower(coalesce(e.event_data->>'bounce_type','')) = 'permanent'
        and (e.recipient_email is null or e.recipient_email = v_recipient)
    ) then
      insert into public.studioflow_email_suppressions(email_address,reason,source_event_id)
      select v_recipient,'hard_bounce',e.event_id
        from public.studioflow_resend_webhook_events e
       where e.resend_email_id = p_resend_email_id
         and e.event_type = 'email.bounced'
         and lower(coalesce(e.event_data->>'bounce_type','')) = 'permanent'
         and (e.recipient_email is null or e.recipient_email = v_recipient)
       order by e.received_at desc
       limit 1
      on conflict(email_address) do nothing;
    end if;
  end if;

  return v_updated;
end;
$$;

create or replace function public.studioflow_email_mark_failed(
  p_event_key text,
  p_error_code text,
  p_retryable boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  update public.studioflow_transactional_email_outbox
     set status = 'failed',
         retryable = coalesce(p_retryable, false) and attempts < 5
           and created_at > now() - interval '20 hours',
         next_attempt_at = case
           when coalesce(p_retryable, false) and attempts < 5
             and created_at > now() - interval '20 hours'
           then now() + make_interval(secs => least(3600, 60 * power(2, greatest(attempts - 1, 0))::integer))
           else null
         end,
         last_error_code = left(coalesce(nullif(p_error_code, ''), 'send_failed'), 80),
         updated_at = now()
   where event_key = btrim(p_event_key)
     and status = 'sending'
  returning attempts into v_attempts;

  return found;
end;
$$;

-- Worker claim: jobs are short-locked with SKIP LOCKED so multiple scheduled
-- invocations cannot send the same retry concurrently.
create or replace function public.studioflow_email_claim_due(
  p_limit integer default 20
)
returns setof public.studioflow_transactional_email_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select id
      from public.studioflow_transactional_email_outbox
     where status = 'failed'
       and retryable = true
       and next_attempt_at <= now()
       and attempts < 5
       and created_at > now() - interval '20 hours'
     order by next_attempt_at, created_at
     limit greatest(1, least(coalesce(p_limit, 20), 100))
     for update skip locked
  )
  update public.studioflow_transactional_email_outbox o
     set status = 'sending',
         attempts = o.attempts + 1,
         retryable = false,
         next_attempt_at = null,
         updated_at = now()
    from due
   where o.id = due.id
  returning o.*;
end;
$$;

-- Resend webhook event ingestion is atomic: event deduplication, email-status
-- update and suppression update commit together.
create or replace function public.studioflow_resend_process_event(
  p_event_id text,
  p_event_type text,
  p_resend_email_id text,
  p_recipient_email text default null,
  p_hard_bounce boolean default false,
  p_event_data jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
  v_email text := lower(btrim(coalesce(p_recipient_email, '')));
begin
  if p_event_id is null or length(btrim(p_event_id)) < 1 or length(p_event_id) > 256
     or p_event_type not in ('email.delivered','email.bounced','email.failed','email.complained')
     or p_resend_email_id is null or length(btrim(p_resend_email_id)) < 1 then
    raise exception 'Invalid Resend event' using errcode = '22023';
  end if;

  insert into public.studioflow_resend_webhook_events(
    event_id,event_type,resend_email_id,recipient_email,event_data
  ) values (
    btrim(p_event_id),p_event_type,p_resend_email_id,
    nullif(v_email,''),coalesce(p_event_data,'{}'::jsonb)
  )
  on conflict (event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 'duplicate';
  end if;

  if p_event_type = 'email.delivered' then
    update public.studioflow_transactional_email_outbox
       set status = 'delivered',
           delivered_at = coalesce(delivered_at, now()),
           updated_at = now()
     where resend_email_id = p_resend_email_id
       and status not in ('bounced','complained','suppressed')
       and (v_email = '' or recipient_email = v_email);

  elsif p_event_type = 'email.bounced' then
    update public.studioflow_transactional_email_outbox
       set status = 'bounced',
           retryable = false,
           next_attempt_at = null,
           last_error_code = 'recipient_bounced',
           updated_at = now()
     where resend_email_id = p_resend_email_id
       and status <> 'complained'
       and (v_email = '' or recipient_email = v_email);

    if coalesce(p_hard_bounce,false) then
      insert into public.studioflow_email_suppressions(email_address,reason,source_event_id)
      select o.recipient_email,'hard_bounce',btrim(p_event_id)
        from public.studioflow_transactional_email_outbox o
       where o.resend_email_id = p_resend_email_id
         and (v_email = '' or o.recipient_email = v_email)
      on conflict(email_address) do nothing;
    end if;

  elsif p_event_type = 'email.failed' then
    update public.studioflow_transactional_email_outbox
       set status = 'failed',
           retryable = false,
           next_attempt_at = null,
           last_error_code = 'provider_failed',
           updated_at = now()
     where resend_email_id = p_resend_email_id
       and status not in ('delivered','bounced','complained','suppressed')
       and (v_email = '' or recipient_email = v_email);

  elsif p_event_type = 'email.complained' then
    update public.studioflow_transactional_email_outbox
       set status = 'complained',
           retryable = false,
           next_attempt_at = null,
           last_error_code = 'recipient_complaint',
           updated_at = now()
     where resend_email_id = p_resend_email_id
       and (v_email = '' or recipient_email = v_email);

    insert into public.studioflow_email_suppressions(email_address,reason,source_event_id)
    select o.recipient_email,'complaint',btrim(p_event_id)
      from public.studioflow_transactional_email_outbox o
     where o.resend_email_id = p_resend_email_id
       and (v_email = '' or o.recipient_email = v_email)
    on conflict(email_address) do update
      set reason = 'complaint',
          source_event_id = excluded.source_event_id;
  end if;

  update public.studioflow_resend_webhook_events
     set processed_at = now()
   where event_id = btrim(p_event_id);

  return 'processed';
end;
$$;

create or replace function public.studioflow_email_mark_suppressed(
  p_event_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.studioflow_transactional_email_outbox
     set status = 'suppressed',
         retryable = false,
         next_attempt_at = null,
         last_error_code = 'recipient_suppressed',
         updated_at = now()
   where event_key = btrim(p_event_key)
     and status = 'sending';
  return found;
end;
$$;

revoke all on function public.studioflow_email_claim(text,text,text,jsonb,uuid,text)
  from public, anon, authenticated;
revoke all on function public.studioflow_email_mark_sent(text,text)
  from public, anon, authenticated;
revoke all on function public.studioflow_email_mark_failed(text,text,boolean)
  from public, anon, authenticated;
revoke all on function public.studioflow_email_mark_suppressed(text)
  from public, anon, authenticated;
revoke all on function public.studioflow_email_claim_due(integer)
  from public, anon, authenticated;
revoke all on function public.studioflow_resend_process_event(text,text,text,text,boolean,jsonb)
  from public, anon, authenticated;

grant execute on function public.studioflow_email_claim(text,text,text,jsonb,uuid,text)
  to service_role;
grant execute on function public.studioflow_email_mark_sent(text,text)
  to service_role;
grant execute on function public.studioflow_email_mark_failed(text,text,boolean)
  to service_role;
grant execute on function public.studioflow_email_mark_suppressed(text)
  to service_role;
grant execute on function public.studioflow_email_claim_due(integer)
  to service_role;
grant execute on function public.studioflow_resend_process_event(text,text,text,text,boolean,jsonb)
  to service_role;

commit;
