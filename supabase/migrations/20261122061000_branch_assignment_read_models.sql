-- Small, scoped read models for the new branch assignment UI.
begin;

-- The service assignment map contains private catalogue metadata; only the
-- salon owner reads the full mapping. Staff writes remain guarded by the
-- manage_services_pricing permission in set_service_branches().
create or replace function public.studioflow_owner_service_branch_map()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare actor uuid:=(select auth.uid());
begin
  if actor is null or not exists(
    select 1 from public.studioflow_accounts a where a.user_id=actor
  ) then
    raise exception 'Salon owner access required' using errcode='42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('serviceId',s.service_id,'branchIds',s.branch_ids)
                     order by s.position,s.service_id)
    from public.studioflow_services s
    where s.owner_id=actor
      and coalesce(cardinality(s.branch_ids),0)>0
  ),'[]'::jsonb);
end;
$function$;

revoke all on function public.studioflow_owner_service_branch_map() from public,anon;
grant execute on function public.studioflow_owner_service_branch_map() to authenticated;

-- A CRM UI read model returns only branches visible to the signed-in owner or
-- staff user. Receptionists may read branch contacts but cannot mutate CRM.
create or replace function public.studioflow_owner_crm_branch_options()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  actor uuid:=(select auth.uid());
  target_owner uuid;
  owner_access boolean:=false;
  can_manage boolean:=false;
  branch_rows jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;

  owner_access:=exists(select 1 from public.studioflow_accounts a where a.user_id=actor);
  if owner_access then
    target_owner:=actor;
    can_manage:=true;
  else
    target_owner:=public.studioflow_active_staff_owner();
    if target_owner is null
       or not public.studioflow_current_staff_can(target_owner,'view_client_contacts') then
      raise exception 'CRM customer access denied' using errcode='42501';
    end if;
    can_manage:=public.studioflow_current_staff_can(target_owner,'manage_crm');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',b.id,'name',b.name,'city',b.city
  ) order by b.created_at,b.id),'[]'::jsonb)
  into branch_rows
  from public.branches b
  where b.site_id=target_owner
    and b.is_active
    and (
      owner_access
      or public.studioflow_is_assigned_branch(target_owner,b.id::text)
    );

  return jsonb_build_object(
    'isOwner',owner_access,
    'canManage',can_manage,
    'branches',coalesce(branch_rows,'[]'::jsonb)
  );
end;
$function$;

revoke all on function public.studioflow_owner_crm_branch_options() from public,anon;
grant execute on function public.studioflow_owner_crm_branch_options() to authenticated;

commit;
