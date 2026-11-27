-- =============================================================================
-- Security hardening (2026-11-27): revoke the standing app_admin bootstrap that
-- 20260928013304_nexora_admin_bootstrap_allowlist_20260928.sql granted to the
-- personal account templateapp67@gmail.com, and disarm the baked-in auto-grant
-- mechanism it created.
--
-- 20260928013304 seeded public.admin_email_allowlist with that address and
-- installed a security-definer trigger (trg_profiles_assign_allowlisted_admin
-- on public.profiles, function public.assign_allowlisted_admin()) that
-- auto-granted app_admins to ANY profile row created for an allowlisted
-- email — so the personal account held, and every future profile bearing that
-- address would re-acquire, app_admin rights with no operator action.
--
-- Applied migrations are never edited; this migration removes exactly what the
-- bootstrap put in place:
--   1. the allowlist entry for the bootstrap email (any casing/whitespace);
--   2. every app_admins row for the auth user(s) registered with that email;
--   3. the auto-grant trigger and its function — after this, app_admins can
--      only change by explicit operator action (service role / SQL), never by
--      a profile insert;
--   4. re-asserts fail-closed grants (owner-only) on both tables.
--
-- is_my_app_admin() is intentionally left in place: growth-partner and reward
-- migrations depend on it as the authorization gate, and with the bootstrap
-- grant removed it simply returns false until an operator grants app_admins
-- explicitly.
--
-- Idempotent and safe to re-run; objects absent from an environment are
-- skipped rather than erroring (to_regclass guards). Compensating audit rows
-- are written ONLY when a row, a trigger or a function was actually removed —
-- a clean re-run writes nothing. The audit table carries no client grants.
--
-- Retain behind the protected manual production migration workflow; do not
-- auto-apply. Not editable once applied.
-- =============================================================================

create table if not exists public.app_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.app_admin_audit_logs enable row level security;
revoke all on public.app_admin_audit_logs from public, anon, authenticated, service_role;

do $$
declare
  n integer := 0;
  r record;
  v_trigger_existed boolean := false;
  v_function_existed boolean := false;
begin
  -- 1. Remove the bootstrap allowlist entry (idempotent).
  if to_regclass('public.admin_email_allowlist') is not null then
    delete from public.admin_email_allowlist
     where lower(btrim(email)) = 'templateapp67@gmail.com';
    get diagnostics n = row_count;
    if n > 0 then
      insert into public.app_admin_audit_logs (actor_id, action, entity, entity_id, before, after, reason)
      values (null, 'revoke-admin-allowlist-bootstrap', 'admin_email_allowlist', 'bootstrap-allowlist',
              jsonb_build_object('rows_deleted', n), null,
              'Removed the bootstrap allowlist entry for the baked-in personal account; app_admin grants require explicit operator action going forward.');
    end if;
  end if;

  -- 2. Remove standing app_admins grants for the bootstrap account (idempotent),
  --    one audit row per removed grant.
  if to_regclass('public.app_admins') is not null then
    for r in
      delete from public.app_admins a
       where exists (select 1 from auth.users u
                      where u.id = a.user_id
                        and lower(btrim(u.email)) = 'templateapp67@gmail.com')
      returning a.user_id
    loop
      insert into public.app_admin_audit_logs (actor_id, action, entity, entity_id, before, after, reason)
      values (r.user_id, 'revoke-app-admin-bootstrap', 'app_admins', r.user_id::text,
              jsonb_build_object('user_id', r.user_id), null,
              'Removed the standing app_admin grant bootstrapped by 20260928013304_nexora_admin_bootstrap_allowlist_20260928; explicit grants only.');
      n := n + 1;
    end loop;

    -- 4. Re-assert fail-closed grants (idempotent; owner-only access).
    revoke all on public.app_admins from public, anon, authenticated, service_role;
    grant select on public.app_admins to authenticated;
  end if;

  if to_regclass('public.admin_email_allowlist') is not null then
    revoke all on public.admin_email_allowlist from public, anon, authenticated, service_role;
  end if;

  -- 3. Disarm the baked-in auto-grant path (idempotent guard): no profile
  --    insert may ever auto-grant app_admins again.
  if to_regclass('public.profiles') is not null then
    select exists (select 1 from pg_trigger t
                    join pg_class c on c.oid = t.tgrelid
                    join pg_namespace n2 on n2.oid = c.relnamespace
                   where n2.nspname = 'public' and c.relname = 'profiles'
                     and t.tgname = 'trg_profiles_assign_allowlisted_admin')
      into v_trigger_existed;
    if v_trigger_existed then
      execute 'drop trigger trg_profiles_assign_allowlisted_admin on public.profiles';
      insert into public.app_admin_audit_logs (actor_id, action, entity, entity_id, before, after, reason)
      values (null, 'disarm-admin-auto-grant-trigger', 'pg_trigger', 'trg_profiles_assign_allowlisted_admin',
              jsonb_build_object('trigger', 'trg_profiles_assign_allowlisted_admin', 'table', 'public.profiles'), null,
              'Dropped the security-definer trigger that auto-granted app_admins to profiles bearing a baked-in allowlisted email.');
    end if;
  end if;

  select exists (select 1 from pg_proc p
                   join pg_namespace n2 on n2.oid = p.pronamespace
                  where n2.nspname = 'public' and p.proname = 'assign_allowlisted_admin')
    into v_function_existed;
  if v_function_existed then
    execute 'drop function public.assign_allowlisted_admin()';
    insert into public.app_admin_audit_logs (actor_id, action, entity, entity_id, before, after, reason)
    values (null, 'disarm-admin-auto-grant-function', 'pg_proc', 'assign_allowlisted_admin',
            jsonb_build_object('function', 'public.assign_allowlisted_admin()'), null,
            'Dropped the security-definer auto-grant function; no profile-insert path may re-create app_admins grants implicitly.');
  end if;
end $$;
