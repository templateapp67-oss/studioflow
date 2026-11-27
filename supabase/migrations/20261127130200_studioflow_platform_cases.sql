begin;

alter table studioflow_security.admin_grants drop constraint admin_grants_permission_check;
alter table studioflow_security.admin_grants add constraint admin_grants_permission_check
  check (permission in ('inventory','approve','cancel','report','stop','platform_read','platform_write','platform_approve'));

create table studioflow_security.platform_cases (
  id uuid primary key default gen_random_uuid(),
  ticket text not null unique check (ticket ~ '^[A-Za-z0-9_-]{3,64}$'),
  title text not null check (length(title) between 5 and 120 and title !~ '[[:cntrl:]]'),
  summary text not null check (length(summary) between 5 and 1500 and summary !~ '[[:cntrl:]]'),
  category text not null check (category in ('website','api','infrastructure','privacy','other')),
  severity text not null check (severity in ('info','low','medium','high','critical')),
  state text not null default 'open' check (state in ('open','triaged','remediating','review','closed','cancelled')),
  version int not null default 1,
  created_by uuid not null,
  submitted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index platform_cases_queue on studioflow_security.platform_cases(state,updated_at desc);
create index platform_cases_cursor on studioflow_security.platform_cases(created_at desc,id desc);

create table studioflow_security.platform_case_events (
  case_id uuid not null references studioflow_security.platform_cases(id) on delete cascade,
  version int not null,
  state text not null,
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(case_id,version)
);
alter table studioflow_security.platform_cases enable row level security;
alter table studioflow_security.platform_case_events enable row level security;
revoke all on studioflow_security.platform_cases, studioflow_security.platform_case_events
  from public,anon,authenticated,service_role;

create table studioflow_security.platform_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_id uuid,
  reason text not null check (length(reason)<=64),
  created_at timestamptz not null default now()
);
create index platform_audit_retention on studioflow_security.platform_audit(created_at);
alter table studioflow_security.platform_audit enable row level security;
revoke all on studioflow_security.platform_audit from public,anon,authenticated,service_role;
create function studioflow_security.platform_record(p_action text,p_target uuid,p_reason text)
returns void language sql set search_path='' as $$
  insert into studioflow_security.platform_audit(actor_id,action,target_id,reason)
  values(auth.uid(),p_action,p_target,p_reason)
$$;
revoke all on function studioflow_security.platform_record(text,uuid,text) from public,anon,authenticated,service_role;

create function public.nexora_sec_platform(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  c studioflow_security.platform_cases%rowtype;
  required text;
  target_state text;
  answer jsonb;
  action_ticket text;
  supplied_id uuid;
begin
  if p_action is null or p_action not in ('capabilities','list','create','transition','report','audit') then
    return jsonb_build_object('error','bad_request');
  end if;
  if p_action='capabilities' then
    return jsonb_build_object(
      'platform_read',studioflow_security.admin_ok('platform_read'),
      'platform_write',studioflow_security.admin_ok('platform_write'),
      'platform_approve',studioflow_security.admin_ok('platform_approve'),
      'salon_admin',studioflow_security.admin_ok('inventory') or studioflow_security.admin_ok('approve')
        or studioflow_security.admin_ok('cancel') or studioflow_security.admin_ok('report') or studioflow_security.admin_ok('stop'),
      'salon_owner',exists(select 1 from studioflow_security.tenants t
        where t.website_owner_id=auth.uid() and studioflow_security.owner_ok(t.id))
    );
  end if;
  if p_action in ('list','report','audit') then
    required := 'platform_read';
  elsif p_action='transition' and p_data->>'state' in ('closed','cancelled') then
    required := 'platform_approve';
  else
    required := 'platform_write';
  end if;
  if not studioflow_security.admin_ok(required) then
    perform studioflow_security.platform_record('platform_denied',null,required);
    return jsonb_build_object('error','forbidden');
  end if;
  action_ticket := p_data->>'ticket';
  if coalesce(action_ticket,'') !~ '^[A-Za-z0-9_-]{3,64}$' then
    return jsonb_build_object('error','bad_request');
  end if;

  if p_action='audit' then
    select coalesce(jsonb_agg(to_jsonb(q) order by q.id desc),'[]') into answer from (
      select id,actor_id,action,target_id,reason,created_at
      from studioflow_security.platform_audit order by id desc limit 50
    ) q;
    perform studioflow_security.platform_record('platform_audit_read',null,action_ticket);
    return answer;
  end if;

  if p_action='list' then
    if p_data ? 'before_id' then
      supplied_id := (p_data->>'before_id')::uuid;
      select * into c from studioflow_security.platform_cases where id=supplied_id;
      if not found then return jsonb_build_object('error','not_found'); end if;
    end if;
    select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') into answer from (
      select id,ticket,title,category,severity,state,version,created_at,updated_at
      from studioflow_security.platform_cases
      where supplied_id is null or (created_at,id)<(c.created_at,c.id)
      order by created_at desc,id desc limit 50
    ) q;
    perform studioflow_security.platform_record('platform_listed',null,action_ticket);
    return answer;
  end if;

  if p_action='create' then
    insert into studioflow_security.platform_cases(ticket,title,summary,category,severity,created_by)
    values(action_ticket,p_data->>'title',p_data->>'summary',p_data->>'category',p_data->>'severity',auth.uid())
    returning * into c;
    insert into studioflow_security.platform_case_events(case_id,version,state,actor_id)
    values(c.id,c.version,c.state,auth.uid());
    perform studioflow_security.platform_record('platform_created',c.id,action_ticket);
    return jsonb_build_object('id',c.id,'version',c.version,'state',c.state);
  end if;

  select * into c from studioflow_security.platform_cases where id=(p_data->>'id')::uuid for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if p_action='report' then
    select jsonb_build_object('id',c.id,'ticket',c.ticket,'title',c.title,'summary',c.summary,
      'category',c.category,'severity',c.severity,'state',c.state,'version',c.version,
      'created_at',c.created_at,'updated_at',c.updated_at,'events',
      (select jsonb_agg(jsonb_build_object('version',e.version,'state',e.state,'at',e.created_at)
        order by e.version) from studioflow_security.platform_case_events e where e.case_id=c.id))
    into answer;
    perform studioflow_security.platform_record('platform_report_accessed',c.id,action_ticket);
    return answer;
  end if;
  if (p_data->>'version')::int is distinct from c.version then
    return jsonb_build_object('error','case_changed');
  end if;
  target_state := p_data->>'state';
  if not coalesce(
      (c.state='open' and target_state in ('triaged','cancelled'))
      or (c.state='triaged' and target_state in ('remediating','cancelled'))
      or (c.state='remediating' and target_state in ('review','cancelled'))
      or (c.state='review' and target_state in ('remediating','closed','cancelled')),false)
      or (target_state='closed' and (c.submitted_by is null or c.submitted_by=auth.uid()))
      or (c.version>=49 and target_state not in ('closed','cancelled')) then
    return jsonb_build_object('error','invalid_transition');
  end if;
  update studioflow_security.platform_cases set state=target_state,version=version+1,updated_at=now(),
    submitted_by=case when target_state='review' then auth.uid() when target_state='closed' then c.submitted_by end
  where id=c.id returning * into c;
  insert into studioflow_security.platform_case_events(case_id,version,state,actor_id)
  values(c.id,c.version,c.state,auth.uid());
  perform studioflow_security.platform_record('platform_transitioned',c.id,action_ticket);
  return jsonb_build_object('id',c.id,'state',c.state,'version',c.version);
exception
  when unique_violation then return jsonb_build_object('error','case_exists');
  when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then
    return jsonb_build_object('error','bad_request');
end $$;
revoke all on function public.nexora_sec_platform(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.nexora_sec_platform(text,jsonb) to authenticated;
commit;
