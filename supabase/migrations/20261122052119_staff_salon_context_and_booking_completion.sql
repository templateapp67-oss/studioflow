-- Explicit staff salon context and safe own-booking completion.
-- Additive only: no booking RLS policies or existing booking records are changed.
-- Domain RLS migration 20261121120000 remains untouched.

begin;

create table if not exists studioflow_android_private.staff_active_contexts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table studioflow_android_private.staff_active_contexts enable row level security;
revoke all on table studioflow_android_private.staff_active_contexts from public, anon, authenticated;

create or replace function public.studioflow_active_staff_owner()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor uuid := (select auth.uid());
  active_count integer;
  sole_owner uuid;
  selected_owner uuid;
begin
  if actor is null then return null; end if;
  select count(*)::integer,
         (array_agg(m.owner_id order by m.created_at, m.id))[1]
    into active_count, sole_owner
  from public.studioflow_staff_members m
  where m.user_id = actor and m.is_active is true;

  if active_count = 1 then return sole_owner; end if;
  if active_count < 1 then return null; end if;

  select c.owner_id into selected_owner
  from studioflow_android_private.staff_active_contexts c
  where c.user_id = actor;

  if selected_owner is null or not exists (
    select 1 from public.studioflow_staff_members m
    where m.user_id = actor and m.owner_id = selected_owner and m.is_active is true
  ) then return null; end if;
  return selected_owner;
end;
$function$;

create or replace function public.studioflow_set_active_staff_salon(p_owner uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := (select auth.uid());
  salon_name text;
begin
  if actor is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_owner is null or not exists (
    select 1 from public.studioflow_staff_members m
    where m.user_id = actor and m.owner_id = p_owner and m.is_active is true
  ) then
    raise exception 'That salon is not an active staff membership.' using errcode = '42501';
  end if;

  insert into studioflow_android_private.staff_active_contexts(user_id, owner_id, updated_at)
  values (actor, p_owner, now())
  on conflict (user_id) do update set owner_id = excluded.owner_id, updated_at = now();

  select coalesce(a.draft->'profile'->>'businessName', '') into salon_name
  from public.studioflow_accounts a where a.user_id = p_owner;
  return jsonb_build_object('ownerId', p_owner, 'salonName', coalesce(salon_name, ''));
end;
$function$;

revoke all on function public.studioflow_active_staff_owner() from public, anon;
revoke all on function public.studioflow_set_active_staff_salon(uuid) from public, anon;
grant execute on function public.studioflow_active_staff_owner() to authenticated, service_role;
grant execute on function public.studioflow_set_active_staff_salon(uuid) to authenticated;

do $migration$
declare v_definition text; v_updated text;
begin
  v_definition := pg_get_functiondef('public.studioflow_my_staff_context()'::regprocedure);
  v_updated := replace(
    v_definition,
    'where m.user_id = (select auth.uid())
    and m.is_active',
    'where m.user_id = (select auth.uid())
    and m.is_active
    and m.owner_id = public.studioflow_active_staff_owner()'
  );
  if v_updated = v_definition then
    if position('studioflow_active_staff_owner()' in v_definition) = 0 then
      raise exception 'Could not safely update studioflow_my_staff_context membership selector';
    end if;
  else execute v_updated; end if;

  v_definition := pg_get_functiondef('public.studioflow_staff_workspace()'::regprocedure);
  v_updated := replace(
    v_definition,
    'where m.user_id = actor and m.is_active',
    'where m.user_id = actor and m.is_active
    and m.owner_id = public.studioflow_active_staff_owner()'
  );
  if v_updated = v_definition then
    if position('studioflow_active_staff_owner()' in v_definition) = 0 then
      raise exception 'Could not safely update studioflow_staff_workspace membership selector';
    end if;
  else execute v_updated; end if;
end;
$migration$;

create or replace function studioflow_android_private.crm_effective_owner(p_permission text)
returns uuid
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare actor uuid := (select auth.uid()); target_owner uuid;
begin
  if actor is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then return actor; end if;
  if p_permission not in ('view_client_contacts', 'manage_crm') then
    raise exception 'CRM permission is invalid' using errcode = '42501';
  end if;
  target_owner := public.studioflow_active_staff_owner();
  if target_owner is null then
    raise exception 'Select one active salon workspace before opening staff CRM' using errcode = '42501';
  end if;
  if not public.studioflow_current_staff_can(target_owner, 'view_client_contacts') then
    raise exception 'CRM customer access denied' using errcode = '42501';
  end if;
  if p_permission = 'manage_crm'
     and not public.studioflow_current_staff_can(target_owner, 'manage_crm') then
    raise exception 'CRM management permission required' using errcode = '42501';
  end if;
  return target_owner;
end;
$function$;

create or replace function studioflow_private.update_booking(p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := (select auth.uid());
  b public.studioflow_bookings;
  result jsonb;
  staff_completion boolean := false;
begin
  if actor is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into b from public.studioflow_bookings where id = p_id for update;
  if b.id is null then raise exception 'Booking unavailable' using errcode = '42501'; end if;
  if p_status not in ('cancelled', 'completed', 'confirmed') then raise exception 'Invalid status'; end if;

  if actor <> b.owner_id and actor <> b.customer_id then
    staff_completion := (
      p_status = 'completed'
      and public.studioflow_active_staff_owner() = b.owner_id
      and exists (
        select 1 from public.studioflow_staff_members m
        where m.user_id = actor
          and m.owner_id = b.owner_id
          and m.is_active is true
          and public.studioflow_current_staff_can(b.owner_id, 'complete_own_bookings')
          and b.stylist_id = public.studioflow_current_staff_id(b.owner_id)
          and public.studioflow_is_assigned_branch(
            b.owner_id,
            coalesce(b.branch_id::text, nullif(b.payload->>'branchId', ''))
          )
      )
    );
    if not staff_completion then raise exception 'Booking unavailable' using errcode = '42501'; end if;
  end if;

  if actor <> b.owner_id and p_status <> 'cancelled' and not staff_completion then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if staff_completion and p_status <> 'completed' then
    raise exception 'Staff may only complete their own assigned appointment' using errcode = '42501';
  end if;
  if b.status in ('completed', 'cancelled') then raise exception 'This booking is already closed'; end if;
  if p_status = 'confirmed' and b.status = 'pending' then
    raise exception 'Advance payment must be verified by the payment provider before confirming';
  end if;
  if p_status = 'completed' and (b.status <> 'confirmed' or b.ends_at > now()) then
    raise exception 'Only confirmed past appointments can be completed';
  end if;

  update public.studioflow_bookings
  set status = p_status, payload = jsonb_set(payload, '{status}', to_jsonb(p_status))
  where id = p_id returning payload into result;
  return result;
end;
$function$;

comment on table studioflow_android_private.staff_active_contexts is
  'Private per-user selected salon for staff logins with more than one active salon membership.';
comment on function public.studioflow_set_active_staff_salon(uuid) is
  'Selects one salon from the authenticated user active staff memberships; never accepts arbitrary owner access.';

commit;
