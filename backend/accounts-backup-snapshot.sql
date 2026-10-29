-- Daily snapshot target for the snapshot-accounts Edge Function.
-- The backup table mirrors studioflow_accounts, is readable only by the service
-- role, and is never exposed to the customer app or the public anon key.
begin;

create table if not exists public.studioflow_accounts_backup (
  like public.studioflow_accounts including all,
  snapshot_date timestamptz not null default timezone('utc'::text, now())
);

comment on table public.studioflow_accounts_backup is
  'Nightly copy of studioflow_accounts written by the snapshot-accounts function. Service-role only.';

alter table public.studioflow_accounts_backup enable row level security;
revoke all on public.studioflow_accounts_backup from public, anon, authenticated;
grant select, insert on public.studioflow_accounts_backup to service_role;

-- Snapshots are append-only history: no policy is granted to customers, so an
-- RLS-protected table with no policy denies every anon/authenticated read.
drop policy if exists accounts_backup_service_read on public.studioflow_accounts_backup;
create policy accounts_backup_service_read
  on public.studioflow_accounts_backup
  for select
  to service_role
  using (true);

commit;
