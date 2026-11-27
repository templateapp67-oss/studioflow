begin;

create role nexora_security_writer nologin noinherit;
create role nexora_security_maintenance nologin noinherit;

create schema studioflow_security;
revoke all on schema studioflow_security from public, anon, authenticated, service_role;

create table studioflow_security.tenants (
  id uuid primary key default gen_random_uuid(),
  website_owner_id uuid references public.studioflow_websites(owner_id) on delete set null,
  active boolean not null default true
);
create unique index security_active_website on studioflow_security.tenants(website_owner_id) where active;

-- Keep the initial tenant boundary aligned with the existing StudioFlow website owner.
-- No salon/organization identifiers are guessed or mixed into this mapping.
insert into studioflow_security.tenants(website_owner_id)
select distinct owner_id from public.studioflow_websites where owner_id is not null
on conflict (website_owner_id) where active do nothing;

create function studioflow_security.sync_website_tenant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is not null then
    insert into studioflow_security.tenants(website_owner_id)
    values (new.owner_id)
    on conflict (website_owner_id) where active do nothing;
  end if;
  return new;
end $$;

create trigger studioflow_security_sync_website_tenant
  after insert or update of owner_id on public.studioflow_websites
  for each row execute function studioflow_security.sync_website_tenant();

create table studioflow_security.admin_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('inventory','approve','cancel','report','stop')),
  expires_at timestamptz not null,
  primary key (user_id, permission)
);
create table studioflow_security.control (
  singleton boolean primary key default true check (singleton),
  stopped boolean not null default true
);
insert into studioflow_security.control default values;

create table studioflow_security.domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references studioflow_security.tenants(id),
  claimed_by uuid not null references auth.users(id),
  hostname text not null check (
    length(hostname) <= 230 and hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z][a-z0-9-]{0,61}[a-z0-9]$'
    and hostname !~ '\.(local|internal|localhost|onion|invalid|test|example|arpa)$'
  ),
  state text not null default 'pending' check (state in ('pending','verified','revoked')),
  proof_hash text check (proof_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  challenge_until timestamptz not null default (now() + interval '15 minutes'),
  verified_until timestamptz,
  unique (tenant_id, id),
  check (state <> 'verified' or (proof_hash is not null and verified_until is not null))
);
create unique index security_verified_hostname on studioflow_security.domains(hostname) where state = 'verified';
create index security_domain_tenant_time on studioflow_security.domains(tenant_id, issued_at desc);

create table studioflow_security.scopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  domain_id uuid not null,
  policy text not null default 'dns_txt_presence_v1' check (policy = 'dns_txt_presence_v1'),
  approved_by uuid not null,
  ticket text not null check (ticket ~ '^[A-Za-z0-9_-]{3,64}$'),
  valid_until timestamptz not null,
  revoked_at timestamptz,
  foreign key (tenant_id, domain_id) references studioflow_security.domains(tenant_id, id),
  unique (tenant_id, id)
);
create index security_scope_domain on studioflow_security.scopes(tenant_id, domain_id);
create table studioflow_security.jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  scope_id uuid not null,
  requested_by uuid not null references auth.users(id),
  request_key uuid not null,
  state text not null default 'running' check (state in ('running','completed','failed','cancelled','timed_out')),
  created_at timestamptz not null default now(),
  deadline timestamptz not null default (now() + interval '30 seconds'),
  finished_at timestamptz,
  foreign key (tenant_id, scope_id) references studioflow_security.scopes(tenant_id, id),
  unique (tenant_id, request_key),
  unique (tenant_id, id)
);
create unique index security_one_running on studioflow_security.jobs(tenant_id) where state = 'running';
create index security_job_tenant_time on studioflow_security.jobs(tenant_id, created_at desc);
create index security_job_deadline on studioflow_security.jobs(deadline) where state = 'running';

create table studioflow_security.findings (
  tenant_id uuid not null,
  job_id uuid not null,
  code text not null check (code in ('dns_proof_present','dns_proof_missing')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, job_id),
  foreign key (tenant_id, job_id) references studioflow_security.jobs(tenant_id, id) on delete cascade
);
create table studioflow_security.audit (
  id bigint generated always as identity primary key,
  tenant_id uuid references studioflow_security.tenants(id),
  actor_id uuid,
  action text not null,
  target_id uuid,
  reason text not null check (length(reason) <= 64),
  created_at timestamptz not null default now()
);
create index security_audit_tenant_time on studioflow_security.audit(tenant_id, created_at desc);
create index security_audit_retention on studioflow_security.audit(created_at);

-- An authenticated session has no direct access, including when the schema
-- is accidentally added to PostgREST. Public RPCs are the only application path.
do $ml$
declare item text;
begin
  foreach item in array array['tenants','admin_grants','control','domains','scopes','jobs','findings','audit']
  loop
    execute format('alter table studioflow_security.%I enable row level security', item);
  end loop;
end
$ml$;
revoke all on all tables in schema studioflow_security from public, anon, authenticated, service_role;

create function studioflow_security.owner_ok(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt()->>'aal' = 'aal2', false) and exists (
    select 1 from studioflow_security.tenants t
    join public.studioflow_websites w on w.owner_id = t.website_owner_id
    where t.id = p_tenant and t.active and t.website_owner_id = auth.uid()
      and w.published_at <= now()
  )
$$;

create function studioflow_security.admin_ok(p_permission text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt()->>'aal' = 'aal2', false) and exists (
    select 1 from studioflow_security.admin_grants g
    where g.user_id = auth.uid() and g.permission = p_permission and g.expires_at > now()
  )
$$;

-- Defense in depth. No grants to query tables directly. Sensitive reads use
-- guarded RPCs so they can write audit records in the same transaction.
create policy domain_tenant_read on studioflow_security.domains for select to authenticated
  using (studioflow_security.owner_ok(tenant_id));
create policy scope_tenant_read on studioflow_security.scopes for select to authenticated
  using (studioflow_security.owner_ok(tenant_id));
create policy job_tenant_read on studioflow_security.jobs for select to authenticated
  using (studioflow_security.owner_ok(tenant_id));

create function studioflow_security.record(p_tenant uuid, p_action text, p_target uuid, p_reason text)
returns void language sql set search_path = '' as $$
  insert into studioflow_security.audit(tenant_id, actor_id, action, target_id, reason)
  values (p_tenant, auth.uid(), p_action, p_target, p_reason)
$$;

create function studioflow_security.revoke_domain(p_tenant uuid, p_domain uuid, p_actor uuid)
returns void language plpgsql set search_path = '' as $$
begin
  update studioflow_security.domains set state='revoked', proof_hash=null
   where tenant_id=p_tenant and id=p_domain;
  update studioflow_security.scopes set revoked_at=now()
   where tenant_id=p_tenant and domain_id=p_domain and revoked_at is null;
  with cancelled as (
    update studioflow_security.jobs j set state='cancelled',finished_at=now()
    from studioflow_security.scopes s
    where (s.tenant_id,s.id)=(j.tenant_id,j.scope_id)
      and s.tenant_id=p_tenant and s.domain_id=p_domain and j.state='running'
    returning j.tenant_id,j.id
  )
  insert into studioflow_security.audit(tenant_id,actor_id,action,target_id,reason)
  select tenant_id,p_actor,'cancelled',id,'domain_revoked' from cancelled;
end $$;

create function public.nexora_sec_request(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  tenant uuid;
  obj uuid;
  domain_row studioflow_security.domains%rowtype;
  scope_row studioflow_security.scopes%rowtype;
  job studioflow_security.jobs%rowtype;
  result jsonb;
  reason text;
  token text;
  request_key_value uuid;
begin
  if not coalesce(auth.jwt()->>'aal'='aal2',false) or auth.uid() is null then
    return jsonb_build_object('error','forbidden');
  end if;
  -- A short transactional lock gives claim, expiry, authorization, quota,
  -- completion and cancel a single ordering. DNS happens outside the lock.
  if p_action not in ('list','inventory','report','admin_report','audit') then
    perform pg_catalog.pg_advisory_xact_lock(736448216);
  end if;
  select t.id into tenant from studioflow_security.tenants t
  where t.website_owner_id=auth.uid() and studioflow_security.owner_ok(t.id);

  if p_action='stop' then
    if not studioflow_security.admin_ok('stop') or coalesce(p_data->>'ticket','') !~ '^[A-Za-z0-9_-]{3,64}$'
       or jsonb_typeof(p_data->'stopped') is distinct from 'boolean' then
      perform studioflow_security.record(null,'denied',null,'stop');
      return jsonb_build_object('error','forbidden');
    end if;
    update studioflow_security.control set stopped=(p_data->>'stopped')::boolean;
    if (p_data->>'stopped')::boolean then
      with stopped_jobs as (
        update studioflow_security.jobs set state='cancelled',finished_at=now()
        where state='running' returning tenant_id,id
      )
      insert into studioflow_security.audit(tenant_id,actor_id,action,target_id,reason)
      select tenant_id,auth.uid(),'cancelled',id,'emergency_stop' from stopped_jobs;
    end if;
    perform studioflow_security.record(null,'stop_changed',null,p_data->>'ticket');
    return jsonb_build_object('stopped',(p_data->>'stopped')::boolean);
  end if;

  if p_action in ('inventory','audit') then
    if not studioflow_security.admin_ok('inventory') or coalesce(p_data->>'ticket','') !~ '^[A-Za-z0-9_-]{3,64}$' then
      perform studioflow_security.record(null,'denied',null,p_action);
      return jsonb_build_object('error','forbidden');
    end if;
    if p_action='inventory' then
      select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
        select d.id,d.tenant_id,d.hostname,d.state,d.verified_until,
          (select count(*) from studioflow_security.jobs j where j.tenant_id=d.tenant_id and j.state='running' and j.deadline>now()) running
        from studioflow_security.domains d order by d.issued_at desc limit 100
      ) q;
    else
      select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
        select a.id,a.tenant_id,a.actor_id,a.action,a.target_id,a.reason,a.created_at
        from studioflow_security.audit a order by a.id desc limit 100
      ) q;
    end if;
    perform studioflow_security.record(null,p_action,null,p_data->>'ticket');
    return result;
  end if;

  if p_action='approve' then
    if not studioflow_security.admin_ok('approve') or coalesce(p_data->>'ticket','') !~ '^[A-Za-z0-9_-]{3,64}$' then
      perform studioflow_security.record(null,'denied',null,p_action);
      return jsonb_build_object('error','forbidden');
    end if;
    select * into domain_row from studioflow_security.domains
    where id=(p_data->>'id')::uuid and state='verified' and verified_until>now();
    if not found then return jsonb_build_object('error','not_found'); end if;
    insert into studioflow_security.scopes(tenant_id,domain_id,approved_by,ticket,valid_until)
    values(domain_row.tenant_id,domain_row.id,auth.uid(),p_data->>'ticket',
           least(domain_row.verified_until,now()+interval '7 days')) returning * into scope_row;
    perform studioflow_security.record(domain_row.tenant_id,'scope_approved',scope_row.id,p_data->>'ticket');
    return jsonb_build_object('scope_id',scope_row.id);
  end if;

  if p_action in ('admin_cancel','admin_report') then
    if not studioflow_security.admin_ok(case when p_action='admin_cancel' then 'cancel' else 'report' end)
       or coalesce(p_data->>'ticket','') !~ '^[A-Za-z0-9_-]{3,64}$' then
      perform studioflow_security.record(null,'denied',null,p_action);
      return jsonb_build_object('error','forbidden');
    end if;
    select j.tenant_id into tenant from studioflow_security.jobs j where j.id=(p_data->>'id')::uuid;
  end if;

  if tenant is null then
    perform studioflow_security.record(null,'denied',null,p_action);
    return jsonb_build_object('error','not_found');
  end if;

  if p_action='list' then
    return jsonb_build_object(
      'domains',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (
        select id,hostname,state,challenge_until,verified_until
        from studioflow_security.domains where tenant_id=tenant order by issued_at desc limit 100
      ) q),
      'scopes',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (
        select id,domain_id,valid_until,revoked_at from studioflow_security.scopes
        where tenant_id=tenant order by valid_until desc limit 100
      ) q),
      'jobs',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (
        select id,scope_id,case when state='running' and deadline<=now() then 'timed_out' else state end as state,
               created_at,finished_at from studioflow_security.jobs
        where tenant_id=tenant order by created_at desc limit 100
      ) q)
    );
  end if;

  if p_action='claim' then
    if (select count(*) from studioflow_security.domains
        where tenant_id=tenant and issued_at>now()-interval '1 hour')>=5
       or (select count(*) from studioflow_security.domains
           where issued_at>now()-interval '1 hour')>=100 then
      perform studioflow_security.record(tenant,'denied',null,'claim_quota');
      return jsonb_build_object('error','rate_limited');
    end if;
    if exists(select 1 from studioflow_security.domains where tenant_id=tenant
      and hostname=p_data->>'hostname' and state='verified' and verified_until>now()) then
      return jsonb_build_object('error','revoke_before_renewal');
    end if;
    token := 'nexora-v1=' || replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
    insert into studioflow_security.domains(tenant_id,claimed_by,hostname,proof_hash)
    values(tenant,auth.uid(),p_data->>'hostname',encode(sha256(convert_to(token,'UTF8')),'hex'))
    returning * into domain_row;
    perform studioflow_security.record(tenant,'challenge_created',domain_row.id,'owner');
    return jsonb_build_object('id',domain_row.id,'record','_nexora-security.'||domain_row.hostname,
                             'value',token,'expires_at',domain_row.challenge_until);
  end if;

  if p_action in ('verify_input','revoke') then
    select * into domain_row from studioflow_security.domains where id=(p_data->>'id')::uuid and tenant_id=tenant;
    if not found then
      perform studioflow_security.record(tenant,'denied',null,p_action);
      return jsonb_build_object('error','not_found');
    end if;
    if p_action='revoke' then
      if domain_row.state<>'revoked' then
        perform studioflow_security.revoke_domain(tenant,domain_row.id,auth.uid());
        perform studioflow_security.record(tenant,'domain_revoked',domain_row.id,'owner');
      end if;
      return jsonb_build_object('state','revoked');
    end if;
    if domain_row.state<>'pending' or domain_row.challenge_until<=now() then
      return jsonb_build_object('error','not_found');
    end if;
    if (select count(*) from studioflow_security.audit where action='verify_attempt'
        and tenant_id=tenant and created_at>now()-interval '1 minute')>=5
       or (select count(*) from studioflow_security.audit where action='verify_attempt'
        and created_at>now()-interval '1 minute')>=100 then
      return jsonb_build_object('error','rate_limited');
    end if;
    perform studioflow_security.record(tenant,'verify_attempt',domain_row.id,'owner');
    return jsonb_build_object('id',domain_row.id,'hostname',domain_row.hostname,'proof_hash',domain_row.proof_hash);
  end if;

  if p_action='request' then
    request_key_value := (p_data->>'request_key')::uuid;
    select * into job from studioflow_security.jobs
    where tenant_id=tenant and request_key=request_key_value;
    if found then
      if job.scope_id<>(p_data->>'id')::uuid then return jsonb_build_object('error','idempotency_conflict'); end if;
      return jsonb_build_object('id',job.id,'state',
        case when job.state='running' and job.deadline<=now() then 'timed_out' else job.state end);
    end if;
    select * into scope_row from studioflow_security.scopes
    where id=(p_data->>'id')::uuid and tenant_id=tenant and revoked_at is null and valid_until>now();
    if not found or (select stopped from studioflow_security.control) then
      perform studioflow_security.record(tenant,'denied',null,'scope_or_stop');
      return jsonb_build_object('error','not_found');
    end if;
    select * into domain_row from studioflow_security.domains
    where id=scope_row.domain_id and tenant_id=tenant and state='verified' and verified_until>now();
    if not found then return jsonb_build_object('error','not_found'); end if;
    with expired as (
      update studioflow_security.jobs set state='timed_out',finished_at=now()
      where state='running' and deadline<=now() returning tenant_id,id
    )
    insert into studioflow_security.audit(tenant_id,actor_id,action,target_id,reason)
    select tenant_id,null,'timed_out',id,'deadline' from expired;
    if exists(select 1 from studioflow_security.jobs where tenant_id=tenant and state='running')
       or (select count(*) from studioflow_security.jobs where state='running')>=5
       or (select count(*) from studioflow_security.jobs where tenant_id=tenant
           and created_at>now()-interval '24 hours')>=3 then
      perform studioflow_security.record(tenant,'denied',scope_row.id,'job_quota');
      return jsonb_build_object('error','rate_limited');
    end if;
    insert into studioflow_security.jobs(tenant_id,scope_id,requested_by,request_key)
    values(tenant,scope_row.id,auth.uid(),request_key_value) returning * into job;
    perform studioflow_security.record(tenant,'request_started',job.id,'dns_txt_presence_v1');
    return jsonb_build_object('id',job.id,'state',job.state,'hostname',domain_row.hostname,'proof_hash',domain_row.proof_hash);
  end if;

  if p_action in ('cancel','admin_cancel','report','admin_report') then
    select * into job from studioflow_security.jobs where id=(p_data->>'id')::uuid and tenant_id=tenant;
    if not found then
      perform studioflow_security.record(tenant,'denied',null,p_action);
      return jsonb_build_object('error','not_found');
    end if;
    reason := case when p_action like 'admin_%' then p_data->>'ticket' else 'owner' end;
    if p_action in ('cancel','admin_cancel') then
      if job.state='running' then
        update studioflow_security.jobs set state=case when deadline<=now() then 'timed_out' else 'cancelled' end,
          finished_at=now() where id=job.id returning * into job;
        perform studioflow_security.record(tenant,job.state,job.id,reason);
      end if;
      return jsonb_build_object('id',job.id,'state',job.state);
    end if;
    if job.state<>'completed' then return jsonb_build_object('error','not_found'); end if;
    select jsonb_build_object('id',job.id,'completed_at',job.finished_at,'policy','dns_txt_presence_v1',
      'hostname',d.hostname,'code',f.code,'remediation',case when f.code='dns_proof_missing'
        then 'Restore the reviewed DNS TXT record and request fresh verification.'
        else 'Keep the DNS TXT record in place until the authorization expires.' end)
    into result from studioflow_security.findings f
      join studioflow_security.scopes s on (s.tenant_id,s.id)=(job.tenant_id,job.scope_id)
      join studioflow_security.domains d on (d.tenant_id,d.id)=(s.tenant_id,s.domain_id)
    where f.tenant_id=tenant and f.job_id=job.id and f.created_at>now()-interval '180 days';
    if result is null then return jsonb_build_object('error','not_found'); end if;
    perform studioflow_security.record(tenant,'report_accessed',job.id,reason);
    return result;
  end if;
  return jsonb_build_object('error','bad_request');
exception when invalid_text_representation or check_violation or not_null_violation then
  return jsonb_build_object('error','bad_request');
end $$;

create function public.nexora_sec_result(p_action text,p_id uuid,p_outcome text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  d studioflow_security.domains%rowtype;
  old_domain studioflow_security.domains%rowtype;
  j studioflow_security.jobs%rowtype;
  s studioflow_security.scopes%rowtype;
  next_state text;
  verified_actor uuid;
begin
  if p_outcome is null or p_outcome not in ('present','missing','unavailable') then
    return jsonb_build_object('error','bad_request');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(736448216);
  if p_action='verify' then
    select dom.* into d from studioflow_security.domains dom
    join studioflow_security.tenants t on t.id=dom.tenant_id
    join public.studioflow_websites w on w.owner_id=t.website_owner_id
    where dom.id=p_id and t.active and t.website_owner_id=dom.claimed_by
      and w.owner_id=dom.claimed_by and w.published_at<=now()
      and dom.state='pending' and dom.challenge_until>now();
    if not found then return jsonb_build_object('error','not_found'); end if;
    verified_actor := d.claimed_by;
    if p_outcome<>'present' then
      insert into studioflow_security.audit(tenant_id,actor_id,action,target_id,reason)
      values(d.tenant_id,verified_actor,'verification_failed',d.id,p_outcome);
      return jsonb_build_object('error',case when p_outcome='missing' then 'proof_missing' else 'unavailable' end);
    end if;
    select * into old_domain from studioflow_security.domains
    where hostname=d.hostname and state='verified';
    if found then
      if old_domain.verified_until>now() then return jsonb_build_object('error','hostname_unavailable'); end if;
      perform studioflow_security.revoke_domain(old_domain.tenant_id,old_domain.id,verified_actor);
    end if;
    update studioflow_security.domains set state='verified', verified_until=now()+interval '30 days' where id=d.id;
    insert into studioflow_security.audit(tenant_id,actor_id,action,target_id,reason)
    values(d.tenant_id,verified_actor,'domain_verified',d.id,'dns_txt');
    return jsonb_build_object('state','verified','id',d.id);
  end if;
  if p_action<>'complete' then return jsonb_build_object('error','bad_request'); end if;
  select * into j from studioflow_security.jobs where id=p_id;
  if not found then return jsonb_build_object('error','not_found'); end if;
  verified_actor := j.requested_by;
  if not exists (select 1 from studioflow_security.tenants t
    join public.studioflow_websites w on w.owner_id=t.website_owner_id
    where t.id=j.tenant_id and t.active and t.website_owner_id=verified_actor and w.published_at<=now()) then
    return jsonb_build_object('error','not_found');
  end if;
  if j.state<>'running' then return jsonb_build_object('state',j.state,'id',j.id); end if;
  select * into s from studioflow_security.scopes where (scopes.tenant_id,scopes.id)=(j.tenant_id,j.scope_id);
  select * into d from studioflow_security.domains where (domains.tenant_id,domains.id)=(j.tenant_id,s.domain_id);
  if j.deadline<=now() then
    next_state := 'timed_out';
  elsif (select stopped from studioflow_security.control)
        or s.revoked_at is not null or s.valid_until<=now() or d.state<>'verified' or d.verified_until<=now()
        or not exists(select 1 from studioflow_security.tenants t
          join public.studioflow_websites w on w.owner_id=t.website_owner_id
          where t.id=j.tenant_id and t.active and t.website_owner_id=verified_actor and w.owner_id=verified_actor and w.published_at<=now()) then
    next_state := 'cancelled';
  elsif p_outcome='unavailable' then
    next_state := 'failed';
  else
    next_state := 'completed';
    insert into studioflow_security.findings(tenant_id,job_id,code) values
      (j.tenant_id,j.id,case when p_outcome='present' then 'dns_proof_present' else 'dns_proof_missing' end);
  end if;
  update studioflow_security.jobs set state=next_state,finished_at=now() where id=j.id;
  if next_state='completed' and p_outcome='missing' then
    perform studioflow_security.revoke_domain(d.tenant_id,d.id,verified_actor);
    insert into studioflow_security.audit(tenant_id,actor_id,action,target_id,reason)
    values(d.tenant_id,verified_actor,'domain_revoked',d.id,'dns_proof_missing');
  end if;
  insert into studioflow_security.audit(tenant_id,actor_id,action,target_id,reason)
  values(j.tenant_id,verified_actor,next_state,j.id,p_outcome);
  return jsonb_build_object('state',next_state,'id',j.id);
end $$;

revoke all on all functions in schema studioflow_security from public, anon, authenticated, service_role;
revoke all on function public.nexora_sec_request(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.nexora_sec_request(text,jsonb) to authenticated;
revoke all on function public.nexora_sec_result(text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.nexora_sec_result(text,uuid,text) to nexora_security_writer;
commit;
