begin;
create role nexora_security_dns_monitor nologin noinherit;
grant usage on schema public to nexora_security_dns_monitor;

create table studioflow_security.dns_watch (
  tenant_id uuid not null,
  domain_id uuid not null,
  enabled boolean not null default false,
  zone text,
  expected_ns_hash text check (expected_ns_hash ~ '^[0-9a-f]{64}$'),
  next_at timestamptz not null default now(),
  lease uuid,
  lease_until timestamptz,
  last_kind text,
  misses int not null default 0,
  outages int not null default 0,
  primary key(tenant_id,domain_id),
  foreign key(tenant_id,domain_id) references studioflow_security.domains(tenant_id,id) on delete cascade,
  check ((zone is null)=(expected_ns_hash is null)),
  check (zone is null or length(zone) between 3 and 230)
);
create index dns_watch_due on studioflow_security.dns_watch(next_at) where enabled;

create table studioflow_security.dns_alerts (
  tenant_id uuid not null,
  domain_id uuid not null,
  kind text not null check (kind in ('renew_soon','proof_missing','delegation_changed','resolver_unavailable','expired')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  primary key(tenant_id,domain_id,kind),
  foreign key(tenant_id,domain_id) references studioflow_security.domains(tenant_id,id) on delete cascade
);
create index dns_alerts_inbox on studioflow_security.dns_alerts(tenant_id,created_at desc);
alter table studioflow_security.dns_watch enable row level security;
alter table studioflow_security.dns_alerts enable row level security;
revoke all on studioflow_security.dns_watch,studioflow_security.dns_alerts from public,anon,authenticated,service_role;

create function studioflow_security.domain_watch_on_change() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.state='verified' and new.state='revoked' then
    if old.verified_until<=now() then
      insert into studioflow_security.dns_alerts(tenant_id,domain_id,kind)
      values(new.tenant_id,new.id,'expired') on conflict do nothing;
    end if;
    update studioflow_security.dns_watch set enabled=false,lease=null,lease_until=null
    where tenant_id=new.tenant_id and domain_id=new.id;
  end if;
  return new;
end $$;
revoke all on function studioflow_security.domain_watch_on_change() from public,anon,authenticated,service_role;
create trigger watch_domain_state after update of state on studioflow_security.domains
  for each row execute function studioflow_security.domain_watch_on_change();

create function public.nexora_sec_dns_due(p_limit int default 10)
returns table(domain_id uuid,hostname text,proof_hash text,zone text,expected_ns_hash text,lease uuid)
language plpgsql security definer set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(736448216);
  -- Reminder delivery is an audited, tenant-scoped inbox. No external messages.
  with due_alerts as (
    insert into studioflow_security.dns_alerts(tenant_id,domain_id,kind)
    select w.tenant_id,w.domain_id,'renew_soon'
    from studioflow_security.dns_watch w
    join studioflow_security.domains d on (d.tenant_id,d.id)=(w.tenant_id,w.domain_id)
    join studioflow_security.tenants t on t.id=w.tenant_id and t.active
    join public.studioflow_websites s on s.owner_id=t.website_owner_id and s.published_at<=now()
    where w.enabled and d.state='verified' and d.verified_until between now() and now()+interval '7 days'
      and not exists(select 1 from studioflow_security.dns_alerts a where
        (a.tenant_id,a.domain_id,a.kind)=(w.tenant_id,w.domain_id,'renew_soon'))
    limit 100 on conflict do nothing returning dns_alerts.tenant_id,dns_alerts.domain_id
  )
  insert into studioflow_security.audit(tenant_id,action,target_id,reason)
    select tenant_id,'dns_alert',due_alerts.domain_id,'renew_soon' from due_alerts;

  return query with picked as (
    select w.tenant_id,w.domain_id
    from studioflow_security.dns_watch w
    join studioflow_security.domains d on (d.tenant_id,d.id)=(w.tenant_id,w.domain_id)
    join studioflow_security.tenants t on t.id=w.tenant_id and t.active
    join public.studioflow_websites s on s.owner_id=t.website_owner_id and s.published_at<=now()
    where w.enabled and d.state='verified' and d.verified_until>now() and w.next_at<=now()
      and (w.lease_until is null or w.lease_until<=now())
    order by w.next_at,w.domain_id limit greatest(0,least(coalesce(p_limit,0),20))
  ), leased as (
    update studioflow_security.dns_watch w
    set lease=gen_random_uuid(),lease_until=now()+interval '4 minutes'
    from picked p where (w.tenant_id,w.domain_id)=(p.tenant_id,p.domain_id)
    returning w.*
  )
  select d.id,d.hostname,d.proof_hash,l.zone,l.expected_ns_hash,l.lease from leased l
  join studioflow_security.domains d on (d.tenant_id,d.id)=(l.tenant_id,l.domain_id);
end $$;

create function public.nexora_sec_dns_observe(p_id uuid,p_lease uuid,p_kind text)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  w studioflow_security.dns_watch%rowtype;
  alert text;
begin
  if p_kind is null or p_kind not in ('healthy','proof_missing','delegation_changed','resolver_unavailable') then
    return false;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(736448216);
  select watch.* into w from studioflow_security.dns_watch watch
  join studioflow_security.domains d on (d.tenant_id,d.id)=(watch.tenant_id,watch.domain_id)
  join studioflow_security.tenants t on t.id=watch.tenant_id and t.active
  join public.studioflow_websites s on s.owner_id=t.website_owner_id and s.published_at<=now()
  where watch.domain_id=p_id and watch.enabled and watch.lease=p_lease
    and watch.lease_until>now() and d.state='verified' and d.verified_until>now();
  if not found or (p_kind='delegation_changed' and w.zone is null) then return false; end if;

  update studioflow_security.dns_watch set
    last_kind=p_kind,lease=null,lease_until=null,
    misses=case when p_kind in ('proof_missing','delegation_changed')
      then case when last_kind=p_kind then misses+1 else 1 end else 0 end,
    outages=case when p_kind='resolver_unavailable' then least(outages+1,3) else 0 end,
    next_at=now()+case p_kind when 'healthy' then interval '6 hours' else interval '15 minutes' end
  where tenant_id=w.tenant_id and domain_id=w.domain_id returning * into w;
  if w.misses>=2 then alert:=p_kind; end if;
  if w.outages=3 then alert:='resolver_unavailable'; end if;
  if alert is not null then
    insert into studioflow_security.dns_alerts(tenant_id,domain_id,kind)
    values(w.tenant_id,w.domain_id,alert) on conflict do nothing;
    if found then perform studioflow_security.record(w.tenant_id,'dns_alert',w.domain_id,alert); end if;
  end if;
  if w.misses>=2 then
    perform studioflow_security.revoke_domain(w.tenant_id,w.domain_id,null);
    perform studioflow_security.record(w.tenant_id,'domain_revoked',w.domain_id,p_kind);
  end if;
  return true;
end $$;

create function public.nexora_sec_dns_inbox(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare answer jsonb;
declare ticket text;
begin
  if p_action='admin_list' then
    ticket:=p_data->>'ticket';
    if not studioflow_security.admin_ok('inventory') or coalesce(ticket,'') !~ '^[A-Za-z0-9_-]{3,64}$' then
      return jsonb_build_object('error','forbidden');
    end if;
    perform studioflow_security.record(null,'dns_alerts_listed',null,ticket);
  elsif p_action not in ('list','ack') or not coalesce(auth.jwt()->>'aal'='aal2',false) or auth.uid() is null then
    return jsonb_build_object('error','forbidden');
  end if;
  if p_action='ack' then
    update studioflow_security.dns_alerts a set acknowledged_at=now()
    where a.domain_id=(p_data->>'id')::uuid and a.kind=p_data->>'kind'
      and a.acknowledged_at is null and studioflow_security.owner_ok(a.tenant_id);
    return jsonb_build_object('acknowledged',found);
  end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') into answer from (
    select a.domain_id,a.kind,a.created_at,a.acknowledged_at,d.hostname
    from studioflow_security.dns_alerts a
    join studioflow_security.domains d on (a.tenant_id,a.domain_id)=(d.tenant_id,d.id)
    where p_action='admin_list' or studioflow_security.owner_ok(a.tenant_id)
    order by a.created_at desc limit 100
  ) q;
  return answer;
exception when invalid_text_representation then
  return jsonb_build_object('error','bad_request');
end $$;

revoke all on function public.nexora_sec_dns_due(int),public.nexora_sec_dns_observe(uuid,uuid,text),
  public.nexora_sec_dns_inbox(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.nexora_sec_dns_due(int),public.nexora_sec_dns_observe(uuid,uuid,text) to nexora_security_dns_monitor;
grant execute on function public.nexora_sec_dns_inbox(text,jsonb) to authenticated;
commit;
