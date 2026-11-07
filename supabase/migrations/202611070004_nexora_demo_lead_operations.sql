-- =============================================================================
-- NEXORA SALONOS — demo-lead operations (additive)
-- =============================================================================
-- Adds the operational columns the demo-request workflow needs, without
-- changing the public read model of the landing pages:
--
--   * `idempotency_key` — collapses a retried submission onto one lead row.
--   * `crm_delivery_state` / `crm_attempts` / `crm_last_error_code` —
--     records whether the optional CRM forward happened. A CRM failure never
--     removes a stored lead.
--   * `retention_expires_at` — the retention deadline for a lead row.
--   * `public.landing_lead_audit` — an append-only trail of status/note
--     changes made by a manager.
--
-- Safety rules kept from SUPABASE_DATABASE.md:
--   * `public.landing_leads` stays private to the public: there is still no
--     `anon` grant and no `anon` policy.
--   * Privileged helper functions live in the private `nexora_private`
--     schema, pin their search_path and are executable by `service_role` only.
--   * No permission is derived from `user_metadata`; the manager role comes
--     from the signed JWT's `app_metadata.site_role`.
-- =============================================================================

create schema if not exists nexora_private;
revoke all on schema nexora_private from public, anon, authenticated;
grant usage on schema nexora_private to service_role;

-- -----------------------------------------------------------------------------
-- 1. Operational columns
-- -----------------------------------------------------------------------------
alter table public.landing_leads
  add column if not exists idempotency_key text,
  add column if not exists crm_delivery_state text not null default 'not_attempted',
  add column if not exists crm_attempts integer not null default 0,
  add column if not exists crm_last_error_code text,
  add column if not exists crm_last_attempt_at timestamptz,
  add column if not exists retention_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'landing_leads_crm_delivery_state_check'
  ) then
    alter table public.landing_leads
      add constraint landing_leads_crm_delivery_state_check
      check (crm_delivery_state in ('not_attempted', 'delivered', 'failed', 'skipped'));
  end if;
end;
$$;

-- Existing rows inherit the same retention window as new ones.
update public.landing_leads
set retention_expires_at = created_at + interval '180 days'
where retention_expires_at is null;

create unique index if not exists landing_leads_idempotency_key_idx
  on public.landing_leads (idempotency_key)
  where idempotency_key is not null;

create index if not exists landing_leads_status_created_idx
  on public.landing_leads (status, created_at desc);

create index if not exists landing_leads_retention_idx
  on public.landing_leads (retention_expires_at)
  where retention_expires_at is not null;

-- -----------------------------------------------------------------------------
-- 2. Audit trail
-- -----------------------------------------------------------------------------
create table if not exists public.landing_lead_audit (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.landing_leads (id) on delete cascade,
  actor_id uuid,
  action text not null,
  from_status public.landing_lead_status,
  to_status public.landing_lead_status,
  note text,
  created_at timestamptz not null default now()
);

alter table public.landing_lead_audit enable row level security;

revoke all on table public.landing_lead_audit from anon;
grant select on table public.landing_lead_audit to authenticated;
grant select, insert, delete on table public.landing_lead_audit to service_role;

drop policy if exists landing_lead_audit_manager_read on public.landing_lead_audit;
create policy landing_lead_audit_manager_read
on public.landing_lead_audit for select to authenticated
using ((select public.can_manage_landing_leads()));

create index if not exists landing_lead_audit_lead_created_idx
  on public.landing_lead_audit (lead_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Audit trigger
-- -----------------------------------------------------------------------------
create or replace function nexora_private.record_landing_lead_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     or new.admin_notes is distinct from old.admin_notes
     or new.assigned_to is distinct from old.assigned_to then
    insert into public.landing_lead_audit (lead_id, actor_id, action, from_status, to_status, note)
    values (
      new.id,
      auth.uid(),
      'lead_updated',
      old.status,
      new.status,
      left(new.admin_notes, 500)
    );
  end if;
  return new;
end;
$$;

revoke all on function nexora_private.record_landing_lead_audit() from public, anon, authenticated;
grant execute on function nexora_private.record_landing_lead_audit() to service_role;

drop trigger if exists landing_lead_audit_trigger on public.landing_leads;
create trigger landing_lead_audit_trigger
after update on public.landing_leads
for each row execute function nexora_private.record_landing_lead_audit();

-- -----------------------------------------------------------------------------
-- 4. Retention
-- -----------------------------------------------------------------------------
-- Rows are kept for 180 days after they were created. The purge is executed
-- by the server-side job with the service role; the browser never runs it.
create or replace function nexora_private.purge_expired_landing_leads()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.landing_leads
  where retention_expires_at is not null and retention_expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function nexora_private.purge_expired_landing_leads() from public, anon, authenticated;
grant execute on function nexora_private.purge_expired_landing_leads() to service_role;
