begin;

-- A verified Auth factor is the source of truth. A password-only JWT issued
-- before enrollment must immediately lose access, even if its expiry is later.
create or replace function studioflow_private.mfa_session_allowed()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(auth.jwt()->>'aal' = 'aal2', false)
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = (select auth.uid()) and status = 'verified'
    );
$$;

revoke all on function studioflow_private.mfa_session_allowed() from public, anon, authenticated;
grant execute on function studioflow_private.mfa_session_allowed() to authenticated;

-- RLS guards private table reads, including reads outside PostgREST.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'studioflow_accounts', 'studioflow_bookings',
    'studioflow_staff_invites', 'studioflow_staff_members',
    'studioflow_payment_orders'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists studioflow_verified_mfa on public.%I', table_name);
    execute format(
      'create policy studioflow_verified_mfa on public.%I as restrictive for all to authenticated
       using ((select studioflow_private.mfa_session_allowed()))
       with check ((select studioflow_private.mfa_session_allowed()))', table_name
    );
  end loop;
end $$;

-- Storage uses its own API and does not run PostgREST's pre-request hook.
drop policy if exists studioflow_storage_verified_mfa on storage.objects;
create policy studioflow_storage_verified_mfa on storage.objects
as restrictive for all to authenticated
using (bucket_id not like 'studioflow-%' or (select studioflow_private.mfa_session_allowed()))
with check (bucket_id not like 'studioflow-%' or (select studioflow_private.mfa_session_allowed()));

-- Apply the same assurance check to Data API RPCs. A SECURITY DEFINER
-- business RPC can otherwise bypass a table's restrictive RLS policy.
create or replace function public.studioflow_check_rest_session()
returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if auth.jwt()->>'role' = 'authenticated'
     and not studioflow_private.mfa_session_allowed() then
    raise exception 'Verify your authenticator before continuing' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.studioflow_check_rest_session() from public;
grant execute on function public.studioflow_check_rest_session() to anon, authenticated, service_role;
-- Preserve any existing hook instead of silently dropping its checks.
do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_db_role_setting s
    cross join lateral unnest(s.setconfig) as setting(value)
    where s.setrole = 'authenticator'::regrole
      and s.setdatabase in (0, (select oid from pg_catalog.pg_database where datname = current_database()))
      and split_part(setting.value, '=', 1) = 'pgrst.db_pre_request'
      and split_part(setting.value, '=', 2) not in ('', 'public.studioflow_check_rest_session')
  ) then
    raise exception 'Existing Data API pre-request hook must be composed with StudioFlow MFA before migration';
  end if;
end;
$$;
alter role authenticator set pgrst.db_pre_request = 'public.studioflow_check_rest_session';

-- Direct invitation writes bypass the RPC lifecycle, including role, branch,
-- invite rotation and state validation. All supported writes use scoped RPCs.
revoke insert, update, delete, truncate, references, trigger
  on public.studioflow_staff_invites, public.studioflow_staff_members
  from public, anon, authenticated;
revoke select on public.studioflow_staff_invites from public, anon, authenticated;

create or replace function public.studioflow_staff_invite_delivery(p_invite_id uuid, p_token text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'owner_id', i.owner_id, 'staff_name', i.staff_name, 'email', i.email,
    'role', i.role, 'expires_at', i.expires_at, 'status', i.status,
    'owner_email', auth.jwt()->>'email',
    'salon_name', coalesce(a.draft #>> '{profile,businessName}', '')
  )
  from public.studioflow_staff_invites i
  join public.studioflow_accounts a on a.user_id = i.owner_id
  where i.id = p_invite_id
    and i.owner_id = (select auth.uid())
    and (select studioflow_private.mfa_session_allowed())
    and p_token ~ '^[a-f0-9]{64}$'
    and i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;
revoke all on function public.studioflow_staff_invite_delivery(uuid, text) from public, anon, authenticated;
grant execute on function public.studioflow_staff_invite_delivery(uuid, text) to authenticated;

-- Membership in two salons never grants permission to transfer a booking
-- (or substitute its customer) via a direct authenticated table update.
create or replace function studioflow_private.guard_booking_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and (
    new.id is distinct from old.id or new.owner_id is distinct from old.owner_id
    or new.customer_id is distinct from old.customer_id
  ) then
    raise exception 'Booking identity cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function studioflow_private.guard_booking_identity() from public, anon, authenticated;
drop trigger if exists studioflow_guard_booking_identity on public.studioflow_bookings;
create trigger studioflow_guard_booking_identity
before update on public.studioflow_bookings
for each row execute function studioflow_private.guard_booking_identity();

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
commit;
