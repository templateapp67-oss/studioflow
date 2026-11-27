-- Account backup table hardening.
--
-- supabase/migrations/daily_snapshot.sql is an operations runbook, not a
-- verified migration, and it never enables row level security on the table it
-- proposes. public.studioflow_accounts_backup, when it exists, is a FULL COPY
-- of public.studioflow_accounts (owner PII, salon details, payment metadata)
-- kept for disaster recovery. Supabase grants default privileges on new public
-- tables to anon and authenticated, so without this lock-down the anon key
-- could read that copy through the Data API.
--
-- This migration is idempotent and a no-op when the backup table was never
-- created. It is safe to apply before or after the runbook is executed.

do $$
begin
  if to_regclass('public.studioflow_accounts_backup') is not null then
    execute 'alter table public.studioflow_accounts_backup enable row level security';
    execute 'revoke all on table public.studioflow_accounts_backup from public, anon, authenticated';
    -- The snapshot writer and the restore path both run with a privileged
    -- role; service_role bypasses RLS, so this is belt and braces for
    -- direct SQL and PostgREST access.
    execute 'grant all on table public.studioflow_accounts_backup to service_role';
  end if;
end $$;
