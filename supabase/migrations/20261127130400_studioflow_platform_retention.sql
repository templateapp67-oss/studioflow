begin;
create function public.nexora_sec_platform_retention(p_limit int default 100)
returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  with removed_cases as (
    delete from studioflow_security.platform_cases where id in (
      select id from studioflow_security.platform_cases
      where state in ('closed','cancelled') and updated_at<now()-interval '180 days'
      order by updated_at limit greatest(0,least(coalesce(p_limit,0),100))
      for update skip locked
    ) returning id
  )
  insert into studioflow_security.platform_audit(action,target_id,reason)
    select 'platform_case_purged',id,'retention' from removed_cases;
  get diagnostics removed=row_count;
  delete from studioflow_security.platform_audit where id in (
    select id from studioflow_security.platform_audit where created_at<now()-interval '1 year'
    order by created_at limit greatest(0,least(coalesce(p_limit,0),100))
  );
  return removed;
end $$;
revoke all on function public.nexora_sec_platform_retention(int) from public,anon,authenticated,service_role;
grant execute on function public.nexora_sec_platform_retention(int) to nexora_security_maintenance;
commit;
