-- =============================================================================
-- STUDIOFLOW — MFA recovery audit log + invalid-attempt accountability
-- =============================================================================
-- Builds on 20261126143000_studioflow_mfa_recovery_codes.sql (release-pending).
--
-- Gap closed: consuming a recovery code already enforced an atomic single-use
-- spend and a per-account budget (10 attempts / 10 minutes), but failed
-- attempts left no trace an operator could investigate later — a brute-force
-- spray against a stolen session was invisible. This migration adds:
--
--   1. public.studioflow_mfa_recovery_audit — one row per consume OUTCOME that
--      passed the per-account throttle: 'invalid' (code mismatch / race lost),
--      'throttled' (budget exhausted) or 'consumed' (code spent). Rows carry
--      only the user id, the outcome and a timestamp — never the submitted
--      code, the code hash, the salt, or any token. RLS enabled, no client
--      grants, no policies: only the security-definer consume RPC and
--      service_role housekeeping can touch it.
--   2. studioflow_mfa_recovery_codes_consume() replaced to write those audit
--      rows. The atomic single-use spend and the per-account throttle are
--      preserved unchanged; audit writes happen ONLY after the throttle claim,
--      so garbage-input floods that never pass the length gate cannot grow the
--      table unboundedly.
--   3. prune_studioflow_mfa_recovery_audit() — service_role-only housekeeping
--      that deletes audit rows older than 90 days (safe to schedule).
--
-- Idempotent: the table is CREATE TABLE IF NOT EXISTS, the function is
-- CREATE OR REPLACE, and re-applying the file changes nothing.
-- Retain behind the protected manual production migration workflow; do not
-- auto-apply.
-- =============================================================================

create table if not exists public.studioflow_mfa_recovery_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  outcome text not null check (outcome in ('invalid', 'throttled', 'consumed')),
  created_at timestamptz not null default now()
);

create index if not exists studioflow_mfa_recovery_audit_user_idx
  on public.studioflow_mfa_recovery_audit (user_id, created_at desc);
create index if not exists studioflow_mfa_recovery_audit_created_idx
  on public.studioflow_mfa_recovery_audit (created_at);

alter table public.studioflow_mfa_recovery_audit enable row level security;
revoke all on table public.studioflow_mfa_recovery_audit from public, anon, authenticated, service_role;

comment on table public.studioflow_mfa_recovery_audit is
  'Outcome log for MFA recovery-code consume attempts that passed the per-account throttle. No code material or tokens are ever stored. No client role may read it.';

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
    -- Pre-throttle garbage: rejected without an audit row so the audit table
    -- can only grow at the throttled rate (<= per-account budget + 1 per window).
    return jsonb_build_object('consumed', false, 'reason', 'invalid');
  end if;

  -- Per-account attempt budget: 10 per 10 minutes, shared across instances.
  -- Bucket key is an opaque digest of the user id — a raw user id is never
  -- written into the shared rate-limit store (same contract as the Node side,
  -- see server/distributedRateLimit.ts hashBucketKey).
  v_budget := public.studioflow_edge_rate_limit_claim(
    'mfa-recovery-account:' || encode(extensions.digest('studioflow-rate-limit:mfa-recovery-account:' || p_user_id::text, 'sha256'), 'hex'),
    600,
    10
  );
  v_allowed := coalesce((v_budget->>'allowed')::boolean, false);
  if not v_allowed then
    insert into public.studioflow_mfa_recovery_audit (user_id, outcome)
    values (p_user_id, 'throttled');
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
    insert into public.studioflow_mfa_recovery_audit (user_id, outcome)
    values (p_user_id, 'invalid');
    return jsonb_build_object('consumed', false, 'reason', 'invalid');
  end if;

  -- Atomic spend: only the request that actually flips the row wins.
  update public.studioflow_mfa_recovery_codes
     set consumed_at = now()
   where id = v_match
     and consumed_at is null;
  if not found then
    insert into public.studioflow_mfa_recovery_audit (user_id, outcome)
    values (p_user_id, 'invalid');
    return jsonb_build_object('consumed', false, 'reason', 'invalid');
  end if;

  insert into public.studioflow_mfa_recovery_audit (user_id, outcome)
  values (p_user_id, 'consumed');
  return jsonb_build_object('consumed', true, 'recoveryWindowSeconds', 600);
end;
$$;

-- create or replace preserves existing privileges; re-assert the contract anyway.
revoke all on function public.studioflow_mfa_recovery_codes_consume(uuid, text) from public, anon, authenticated;
grant execute on function public.studioflow_mfa_recovery_codes_consume(uuid, text) to service_role;

-- Housekeeping: drop audit rows older than 90 days. Service-role only.
create or replace function public.prune_studioflow_mfa_recovery_audit()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.studioflow_mfa_recovery_audit
     where created_at < now() - interval '90 days'
     returning 1
  )
  select count(*)::integer from removed;
$$;

revoke all on function public.prune_studioflow_mfa_recovery_audit() from public, anon, authenticated;
grant execute on function public.prune_studioflow_mfa_recovery_audit() to service_role;
