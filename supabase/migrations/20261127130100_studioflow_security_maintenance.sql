begin;
create function public.nexora_sec_maintenance()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  expired record;
  jobs_expired integer;
  jobs_purged integer;
  audit_purged integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(736448216);
  with expired_jobs as (
    update studioflow_security.jobs set state='timed_out',finished_at=now()
    where state='running' and deadline<=now() returning tenant_id,id
  )
  insert into studioflow_security.audit(tenant_id,action,target_id,reason)
    select tenant_id,'timed_out',id,'deadline' from expired_jobs;
  get diagnostics jobs_expired=row_count;

  for expired in
    select id,tenant_id from studioflow_security.domains
    where (state='pending' and challenge_until<=now())
       or (state='verified' and verified_until<=now())
    limit 1000
  loop
    perform studioflow_security.revoke_domain(expired.tenant_id,expired.id);
    perform studioflow_security.record(expired.tenant_id,'domain_expired',expired.id,'maintenance');
  end loop;
  delete from studioflow_security.jobs where id in (
    select id from studioflow_security.jobs where state<>'running'
      and finished_at<now()-interval '180 days' limit 1000
  );
  get diagnostics jobs_purged=row_count;
  delete from studioflow_security.scopes s where s.id in (
    select a.id from studioflow_security.scopes a
    where least(a.valid_until,coalesce(a.revoked_at,a.valid_until))<now()-interval '180 days'
      and not exists(select 1 from studioflow_security.jobs j where j.scope_id=a.id)
    limit 1000
  );
  delete from studioflow_security.domains d where d.id in (
    select a.id from studioflow_security.domains a where a.state='revoked'
      and greatest(a.issued_at,coalesce(a.verified_until,a.challenge_until))<now()-interval '180 days'
      and not exists(select 1 from studioflow_security.scopes s where s.domain_id=a.id)
    limit 1000
  );
  delete from studioflow_security.audit where id in (
    select id from studioflow_security.audit where created_at<now()-interval '1 year' limit 1000
  );
  get diagnostics audit_purged=row_count;
  return jsonb_build_object('timed_out',jobs_expired,'jobs_purged',jobs_purged,'audit_purged',audit_purged);
end $$;
revoke all on function public.nexora_sec_maintenance() from public,anon,authenticated,service_role;
grant execute on function public.nexora_sec_maintenance() to nexora_security_maintenance;
create function public.nexora_sec_deactivate_tenant(p_tenant uuid,p_ticket text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare asset record;
begin
  if coalesce(p_ticket,'') !~ '^[A-Za-z0-9_-]{3,64}$' then
    raise exception 'Case reference required' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(736448216);
  update studioflow_security.tenants set active=false where id=p_tenant and active;
  if not found then return false; end if;
  for asset in select id from studioflow_security.domains where tenant_id=p_tenant and state<>'revoked'
  loop
    perform studioflow_security.revoke_domain(p_tenant,asset.id);
  end loop;
  perform studioflow_security.record(p_tenant,'tenant_deactivated',null,p_ticket);
  return true;
end $$;
revoke all on function public.nexora_sec_deactivate_tenant(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.nexora_sec_deactivate_tenant(uuid,text) to nexora_security_maintenance;
commit;
