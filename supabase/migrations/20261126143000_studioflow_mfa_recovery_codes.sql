-- =============================================================================
-- STUDIOFLOW — MFA backup recovery codes + distributed claim helpers
-- =============================================================================
-- Recovery codes are the supported way back into an account whose second
-- factor is lost (new phone, authenticator deleted). Design contract:
--
--  - Plaintext codes exist only in the browser at generation time. Storage is
--    SHA-256(salt . ':' . normalized-code) with a per-code random salt.
--  - Codes are single-use: consumption flips `consumed_at` in the same
--    statement that verifies the hash, so two concurrent requests cannot both
--    spend one code.
--  - Consumption is rate-limited per account (10 attempts / 10 minutes) via
--    the shared `studioflow_edge_rate_limits` table — brute force against the
--    80-bit code space is not viable, and a throttled caller is told to wait.
--  - Consuming a code opens a 10-minute recovery window. Within it, the
--    account may use authenticated surfaces (and PostgREST, via the
--    `mfa_session_allowed()` change below) so the owner can set up a fresh
--    authenticator. The window is short, single-use-per-code and grants no
--    durable privilege.
--  - Issuing/re-issuing codes requires an AAL2 session — the same assurance
--    the Account security screen is behind. Re-issuing REPLACES all unconsumed
--    codes atomically (old codes die with the new batch).
--  - Nothing user-scoped is readable without a session, and direct table
--    access is revoked for every client role: the RPCs are the only surface.
--
-- Access:
--   issue  — `authenticated`, and the caller MUST hold an AAL2 JWT.
--   count  — `authenticated`; returns only the caller's own unused count.
--   consume / active — `service_role` only. They run behind a Node route that
--            verifies the caller's bearer token first: at AAL1 the PostgREST
--            pre-request hook blocks every authenticated call, so the lost-
--            authenticator path must travel with the service role.
-- =============================================================================

create table if not exists public.studioflow_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  salt text not null check (salt ~ '^[0-9a-f]{32}$'),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  constraint studioflow_mfa_recovery_codes_unique_hash unique (user_id, code_hash)
);

create index if not exists studioflow_mfa_recovery_codes_unused_idx
  on public.studioflow_mfa_recovery_codes (user_id)
  where consumed_at is null;
create index if not exists studioflow_mfa_recovery_codes_consumed_idx
  on public.studioflow_mfa_recovery_codes (user_id, consumed_at desc)
  where consumed_at is not null;

alter table public.studioflow_mfa_recovery_codes enable row level security;
revoke all on table public.studioflow_mfa_recovery_codes from public, anon, authenticated;

comment on table public.studioflow_mfa_recovery_codes is
  'SHA-256 + per-code salt hashes of MFA recovery codes. Single-use; no client role has direct access — the recovery RPCs are the only surface.';

-- ---------------------------------------------------------------------------
-- Issue (or re-issue) codes. AAL2 mandatory. One batch replaces all prior
-- unconsumed codes for the caller, atomically.
-- p_codes: jsonb array of {salt: 32-hex, code_hash: 64-hex}, 1..8 entries.
-- Returns the number of codes stored.
-- ---------------------------------------------------------------------------
create or replace function public.studioflow_mfa_recovery_codes_issue(p_codes jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_seen text[] := '{}';
  v_count integer;
begin
  if v_user is null then
    raise exception 'Sign in before generating recovery codes.' using errcode = '42501';
  end if;
  if coalesce(auth.jwt()->>'aal', 'aal1') is distinct from 'aal2' then
    raise exception 'Verify your authenticator before generating recovery codes.'
      using errcode = '42501';
  end if;
  if p_codes is null or jsonb_typeof(p_codes) <> 'array' then
    raise exception 'Expected an array of recovery code entries.' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_codes);
  if v_count < 1 or v_count > 8 then
    raise exception 'Generate between 1 and 8 recovery codes.' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_codes) as t(value) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'salt', '') !~ '^[0-9a-f]{32}$'
       or coalesce(v_item->>'code_hash', '') !~ '^[0-9a-f]{64}$' then
      raise exception 'Each entry must carry a 32-hex salt and a 64-hex SHA-256 hash.' using errcode = '22023';
    end if;
    if v_item->>'code_hash' = any(v_seen) then
      raise exception 'Duplicate recovery code entries are not allowed.' using errcode = '22023';
    end if;
    v_seen := v_seen || (v_item->>'code_hash');
  end loop;

  delete from public.studioflow_mfa_recovery_codes
   where user_id = v_user and consumed_at is null;

  insert into public.studioflow_mfa_recovery_codes (user_id, salt, code_hash)
  select v_user, value->>'salt', value->>'code_hash'
    from jsonb_array_elements(p_codes) as t(value);

  return v_count;
end;
$$;

revoke all on function public.studioflow_mfa_recovery_codes_issue(jsonb) from public, anon;
grant execute on function public.studioflow_mfa_recovery_codes_issue(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Count of unused codes for the caller (drives the "N codes remaining" UI).
-- ---------------------------------------------------------------------------
create or replace function public.studioflow_mfa_recovery_codes_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.studioflow_mfa_recovery_codes
   where user_id = auth.uid() and consumed_at is null;
$$;

revoke all on function public.studioflow_mfa_recovery_codes_count() from public, anon;
grant execute on function public.studioflow_mfa_recovery_codes_count() to authenticated;

-- ---------------------------------------------------------------------------
-- Consume a code. Service-role only: this must bypass the AAL1 pre-request
-- block, because it is the lost-authenticator path. `p_user_id` always comes
-- from the Node route's verified session — never from the browser.
-- Returns { consumed: true, recoveryWindowSeconds } on success, or
-- { consumed: false, reason: 'invalid' | 'throttled' [, retryAfterSeconds] }.
-- ---------------------------------------------------------------------------
create or replace function public.studioflow_mfa_recovery_codes_consume(p_user_id uuid, p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_budget jsonb;
  v_allowed boolean;
  v_match uuid;
begin
  if p_user_id is null then
    return jsonb_build_object('consumed', false, 'reason', 'invalid');
  end if;
  -- Normalization identical to the client and the Node route: strip every
  -- non-alphanumeric, upper-case. The caller hashes the normalized form.
  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(v_code) < 16 or char_length(v_code) > 32 then
    return jsonb_build_object('consumed', false, 'reason', 'invalid');
  end if;

  -- Per-account attempt budget: 10 per 10 minutes, shared across instances.
  v_budget := public.studioflow_edge_rate_limit_claim('mfa-recovery:' || p_user_id::text, 600, 10);
  v_allowed := coalesce((v_budget->>'allowed')::boolean, false);
  if not v_allowed then
    return jsonb_build_object(
      'consumed', false,
      'reason', 'throttled',
      'retryAfterSeconds',
        greatest(coalesce((v_budget->>'retryAfterSeconds')::integer, 600), 1)
    );
  end if;

  select id into v_match
    from public.studioflow_mfa_recovery_codes
   where user_id = p_user_id
     and consumed_at is null
     and encode(extensions.digest(salt || ':' || v_code, 'sha256'), 'hex') = code_hash
   limit 1;

  if v_match is null then
    return jsonb_build_object('consumed', false, 'reason', 'invalid');
  end if;

  -- Atomic spend: only the request that actually flips the row wins.
  update public.studioflow_mfa_recovery_codes
     set consumed_at = now()
   where id = v_match
     and consumed_at is null;
  if not found then
    return jsonb_build_object('consumed', false, 'reason', 'invalid');
  end if;

  return jsonb_build_object('consumed', true, 'recoveryWindowSeconds', 600);
end;
$$;

revoke all on function public.studioflow_mfa_recovery_codes_consume(uuid, text) from public, anon, authenticated;
grant execute on function public.studioflow_mfa_recovery_codes_consume(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Is a recovery window currently open for this user? Service-role only,
-- called by the Node recovery probe. True for 10 minutes after consumption.
-- ---------------------------------------------------------------------------
create or replace function public.studioflow_mfa_recovery_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.studioflow_mfa_recovery_codes
     where user_id = p_user_id
       and consumed_at > now() - interval '10 minutes'
  );
$$;

revoke all on function public.studioflow_mfa_recovery_active(uuid) from public, anon, authenticated;
grant execute on function public.studioflow_mfa_recovery_active(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Housekeeping: consumed codes are single-purpose; after 30 days they are
-- dead weight. Service-role only; safe to schedule (cron) or run manually.
-- ---------------------------------------------------------------------------
create or replace function public.prune_studioflow_mfa_recovery_codes()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.studioflow_mfa_recovery_codes
     where consumed_at is not null and consumed_at < now() - interval '30 days'
     returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function public.prune_studioflow_mfa_recovery_codes() from public, anon, authenticated;
grant execute on function public.prune_studioflow_mfa_recovery_codes() to service_role;

-- ---------------------------------------------------------------------------
-- The pre-request hook and every AAL2 policy now also honour the 10-minute
-- recovery window, so a consumed code unlocks authenticated surfaces exactly
-- like an AAL2 session — briefly and only until re-enrolment. Everything else
-- about the assurance rule is preserved.
-- ---------------------------------------------------------------------------
create or replace function studioflow_private.mfa_session_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt()->>'aal' = 'aal2', false)
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = (select auth.uid()) and status = 'verified'
    )
    or exists (
      select 1 from public.studioflow_mfa_recovery_codes
      where user_id = (select auth.uid())
        and consumed_at > now() - interval '10 minutes'
    );
$$;

revoke all on function studioflow_private.mfa_session_allowed() from public, anon, authenticated;
grant execute on function studioflow_private.mfa_session_allowed() to authenticated;
