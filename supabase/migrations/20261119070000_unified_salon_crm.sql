-- NEXORA unified salon CRM: customer timeline, follow-up tasks and logged interactions.
-- This migration is additive. Existing bookings, customer preferences, contact notes,
-- WhatsApp connections, payment flows and template data are not rewritten.

create table if not exists studioflow_android_private.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null,
  title text not null,
  details text not null default '',
  task_type text not null default 'follow_up'
    check (task_type in ('call', 'whatsapp', 'visit', 'service_follow_up', 'general')),
  status text not null default 'open'
    check (status in ('open', 'completed', 'cancelled')),
  due_at timestamptz not null,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_tasks_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint crm_tasks_details_length check (char_length(details) <= 3000)
);

create index if not exists crm_tasks_owner_status_due_idx
  on studioflow_android_private.crm_tasks (owner_id, status, due_at);

create index if not exists crm_tasks_owner_customer_created_idx
  on studioflow_android_private.crm_tasks (owner_id, customer_id, created_at desc);

alter table studioflow_android_private.crm_tasks enable row level security;

drop policy if exists crm_tasks_owner_access on studioflow_android_private.crm_tasks;
create policy crm_tasks_owner_access
  on studioflow_android_private.crm_tasks
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create table if not exists studioflow_android_private.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  source text not null default 'walk_in' check (source in ('walk_in','phone','referral','social','imported','other')),
  tags text not null default '',
  notes text not null default '',
  do_not_contact boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contacts_name_length check (char_length(btrim(full_name)) between 2 and 120),
  constraint crm_contacts_phone_length check (char_length(regexp_replace(phone,'[^0-9]','','g')) between 11 and 15),
  constraint crm_contacts_email_length check (email is null or char_length(email) <= 254),
  constraint crm_contacts_tags_length check (char_length(tags) <= 200),
  constraint crm_contacts_notes_length check (char_length(notes) <= 2000)
);

create unique index if not exists crm_contacts_owner_phone_idx
  on studioflow_android_private.crm_contacts (
    owner_id,
    (case
      when char_length(regexp_replace(phone,'[^0-9]','','g')) = 12
        and left(regexp_replace(phone,'[^0-9]','','g'),2) = '91'
      then right(regexp_replace(phone,'[^0-9]','','g'),10)
      else regexp_replace(phone,'[^0-9]','','g')
    end)
  );

create index if not exists crm_contacts_owner_created_idx
  on studioflow_android_private.crm_contacts (owner_id, created_at desc);

alter table studioflow_android_private.crm_contacts enable row level security;
drop policy if exists crm_contacts_owner_access on studioflow_android_private.crm_contacts;
create policy crm_contacts_owner_access on studioflow_android_private.crm_contacts
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create table if not exists studioflow_android_private.crm_activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null,
  activity_type text not null
    check (activity_type in ('note', 'call', 'whatsapp', 'email', 'meeting', 'follow_up_created', 'follow_up_completed', 'other')),
  channel text not null default 'internal'
    check (channel in ('phone', 'whatsapp', 'email', 'in_person', 'internal')),
  direction text not null default 'internal'
    check (direction in ('inbound', 'outbound', 'internal')),
  summary text not null,
  details text not null default '',
  related_task_id uuid references studioflow_android_private.crm_tasks(id) on delete set null,
  related_booking_id uuid references public.studioflow_bookings(id) on delete set null,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint crm_activities_summary_length check (char_length(btrim(summary)) between 1 and 180),
  constraint crm_activities_details_length check (char_length(details) <= 3000)
);

create index if not exists crm_activities_owner_customer_created_idx
  on studioflow_android_private.crm_activities (owner_id, customer_id, created_at desc);

alter table studioflow_android_private.crm_activities enable row level security;

drop policy if exists crm_activities_owner_access on studioflow_android_private.crm_activities;
create policy crm_activities_owner_access
  on studioflow_android_private.crm_activities
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create or replace function studioflow_android_private.crm_create_contact(
  p_full_name text,p_phone text,p_email text,p_source text,p_date_of_birth date
)
returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  digits text := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  normalized text;
  contact_id uuid;
begin
  if actor is null or not exists (
    select 1 from public.studioflow_accounts a where a.user_id=actor
  ) then
    raise exception 'Salon owner access required' using errcode='42501';
  end if;
  if char_length(digits)=10 then digits:='91'||digits; end if;
  normalized:=case when char_length(digits)=12 and left(digits,2)='91'
    then right(digits,10) else digits end;
  if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 120
     or char_length(digits) not between 11 and 15
     or (nullif(btrim(coalesce(p_email,'')),'') is not null
       and (char_length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+
-- identifier is accepted from the browser. Bookings remain the source of truth.
create or replace function studioflow_android_private.crm_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  customer_rows jsonb;
  task_rows jsonb;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.value->>'id',
        'name', coalesce(nullif(c.value->>'name', ''), 'Customer'),
        'whatsapp', coalesce(c.value->>'whatsapp', ''),
        'email', (
          select nullif(b.payload->>'clientEmail', '')
          from public.studioflow_bookings b
          where b.owner_id = actor
            and b.customer_id = (c.value->>'id')::uuid
            and nullif(b.payload->>'clientEmail', '') is not null
          order by b.created_at desc
          limit 1
        ),
        'dateOfBirth', c.value->'dateOfBirth',
        'birthdayShared', coalesce((c.value->>'birthdayShared')::boolean, false),
        'optIn', coalesce((c.value->>'optIn')::boolean, false),
        'consentUpdated', c.value->'consentUpdated',
        'blocked', coalesce((c.value->>'blocked')::boolean, false),
        'tags', coalesce(c.value->>'tags', ''),
        'notes', coalesce(c.value->>'notes', ''),
        'bookingCount', coalesce(bs.booking_count, 0),
        'completedBookingCount', coalesce(bs.completed_count, 0),
        'upcomingBookingCount', coalesce(bs.upcoming_count, 0),
        'totalValue', coalesce(bs.total_value, 0),
        'totalPaid', coalesce(bs.total_paid, 0),
        'firstBookingAt', bs.first_booking_at,
        'lastVisit', bs.last_visit,
        'nextAppointment', bs.next_appointment,
        'lastBookingAt', bs.last_booking_at,
        'bookingHistory', coalesce(bh.items, '[]'::jsonb),
        'activities', coalesce(ac.items, '[]'::jsonb),
        'openTaskCount', coalesce(tc.open_count, 0)
      )
      order by coalesce(bs.last_booking_at, bs.first_booking_at) desc nulls last,
               lower(coalesce(c.value->>'name', 'customer'))
    ),
    '[]'::jsonb
  )
  into customer_rows
  from jsonb_array_elements(studioflow_android_private.owner_contacts()) as c(value)
  left join lateral (
    select
      count(*)::integer as booking_count,
      (count(*) filter (where lower(b.status) = 'completed'))::integer as completed_count,
      (count(*) filter (where b.starts_at >= now() and lower(b.status) not in ('cancelled', 'rejected', 'no_show')))::integer as upcoming_count,
      coalesce(sum(greatest(coalesce(nullif(b.payload->>'servicePrice', '')::numeric, 0), 0)), 0) as total_value,
      coalesce(sum(greatest(coalesce(nullif(b.payload->>'amountPaid', '')::numeric, 0), 0)), 0) as total_paid,
      min(b.created_at) as first_booking_at,
      max(b.starts_at) filter (where lower(b.status) = 'completed') as last_visit,
      min(b.starts_at) filter (
        where b.starts_at >= now()
          and lower(b.status) not in ('cancelled', 'rejected', 'no_show')
      ) as next_appointment,
      max(b.created_at) as last_booking_at
    from public.studioflow_bookings b
    where b.owner_id = actor
      and b.customer_id = (c.value->>'id')::uuid
  ) bs on true
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'startsAt', b.starts_at,
          'endsAt', b.ends_at,
          'status', b.status,
          'source', b.booking_source,
          'serviceName', coalesce(nullif(b.payload->>'serviceName', ''), 'Salon service'),
          'servicePrice', coalesce(nullif(b.payload->>'servicePrice', '')::numeric, 0),
          'amountPaid', coalesce(nullif(b.payload->>'amountPaid', '')::numeric, 0),
          'paymentStatus', coalesce(b.payload->>'paymentStatus', 'unknown'),
          'stylistName', coalesce(nullif(b.payload->>'stylistName', ''), 'Any available specialist'),
          'instructions', coalesce(b.payload->>'instructions', '')
        )
        order by b.starts_at desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select b.*
      from public.studioflow_bookings b
      where b.owner_id = actor
        and b.customer_id = (c.value->>'id')::uuid
      order by b.starts_at desc
      limit 30
    ) b
  ) bh on true
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.activity_type,
          'channel', a.channel,
          'direction', a.direction,
          'summary', a.summary,
          'details', a.details,
          'createdAt', a.created_at,
          'relatedBookingId', a.related_booking_id,
          'relatedTaskId', a.related_task_id
        )
        order by a.created_at desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select a.*
      from studioflow_android_private.crm_activities a
      where a.owner_id = actor
        and a.customer_id = (c.value->>'id')::uuid
      order by a.created_at desc
      limit 40
    ) a
  ) ac on true
  left join lateral (
    select count(*)::integer as open_count
    from studioflow_android_private.crm_tasks t
    where t.owner_id = actor
      and t.customer_id = (c.value->>'id')::uuid
      and t.status = 'open'
  ) tc on true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'customerId', t.customer_id,
        'title', t.title,
        'details', t.details,
        'taskType', t.task_type,
        'status', t.status,
        'dueAt', t.due_at,
        'completedAt', t.completed_at,
        'createdAt', t.created_at
      )
      order by
        case when t.status = 'open' then 0 else 1 end,
        t.due_at asc,
        t.created_at desc
    ),
    '[]'::jsonb
  )
  into task_rows
  from (
    select *
    from studioflow_android_private.crm_tasks
    where owner_id = actor
    order by
      case when status = 'open' then 0 else 1 end,
      due_at asc,
      created_at desc
    limit 300
  ) t;

  customer_rows := customer_rows || coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',m.id::text,'name',m.full_name,'whatsapp',m.phone,'email',m.email,
      'dateOfBirth',m.date_of_birth,'birthdayShared',false,'optIn',false,
      'consentUpdated',null,'blocked',m.do_not_contact,'tags',m.tags,'notes',m.notes,
      'isManual',true,'customerSource',m.source,
      'bookingCount',0,'completedBookingCount',0,'upcomingBookingCount',0,
      'totalValue',0,'totalPaid',0,'firstBookingAt',m.created_at,
      'lastVisit',null,'nextAppointment',null,'lastBookingAt',m.created_at,
      'bookingHistory','[]'::jsonb,'activities',coalesce(ac.items,'[]'::jsonb),
      'openTaskCount',coalesce(tc.open_count,0)
    ) order by m.created_at desc)
    from studioflow_android_private.crm_contacts m
    left join lateral (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',a.id,'type',a.activity_type,'channel',a.channel,'direction',a.direction,
        'summary',a.summary,'details',a.details,'createdAt',a.created_at,
        'relatedBookingId',a.related_booking_id,'relatedTaskId',a.related_task_id
      ) order by a.created_at desc),'[]'::jsonb) as items
      from (select a.* from studioflow_android_private.crm_activities a
        where a.owner_id=actor and a.customer_id=m.id
        order by a.created_at desc limit 40) a
    ) ac on true
    left join lateral (
      select count(*)::integer as open_count from studioflow_android_private.crm_tasks t
      where t.owner_id=actor and t.customer_id=m.id and t.status='open'
    ) tc on true
    where m.owner_id=actor
  ),'[]'::jsonb);

  return jsonb_build_object(
    'customers', customer_rows,
    'tasks', task_rows,
    'generatedAt', now()
  );
end;
$function$;

create or replace function studioflow_android_private.crm_add_activity(
  p_customer uuid,
  p_activity_type text,
  p_channel text,
  p_direction text,
  p_summary text,
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  activity_id uuid;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_customer is null
     or (
       not exists (
         select 1 from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
         where c.value->>'id'=p_customer::text
       )
       and not exists (
         select 1 from studioflow_android_private.crm_contacts m
         where m.id=p_customer and m.owner_id=actor
       )
     ) then
    raise exception 'Customer unavailable' using errcode='42501';
  end if;

  if p_activity_type is null or p_channel is null or p_direction is null
     or p_activity_type not in ('note', 'call', 'whatsapp', 'email', 'meeting', 'other')
     or p_channel not in ('phone', 'whatsapp', 'email', 'in_person', 'internal')
     or p_direction not in ('inbound', 'outbound', 'internal')
     or char_length(btrim(coalesce(p_summary, ''))) not between 1 and 180
     or char_length(coalesce(p_details, '')) > 3000 then
    raise exception 'Invalid CRM activity details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, actor_id
  )
  values (
    actor, p_customer, p_activity_type, p_channel, p_direction,
    btrim(p_summary), btrim(coalesce(p_details, '')), actor
  )
  returning id into activity_id;

  return activity_id;
end;
$function$;

create or replace function studioflow_android_private.crm_create_task(
  p_customer uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_task_type text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  task_id uuid;
  activity_id uuid;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_customer is null
     or (
       not exists (
         select 1 from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
         where c.value->>'id'=p_customer::text
       )
       and not exists (
         select 1 from studioflow_android_private.crm_contacts m
         where m.id=p_customer and m.owner_id=actor
       )
     ) then
    raise exception 'Customer unavailable' using errcode='42501';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
     or char_length(coalesce(p_details, '')) > 3000
     or p_due_at is null
     or p_due_at < now() - interval '365 days'
     or p_due_at > now() + interval '5 years'
     or p_task_type is null
     or p_task_type not in ('call', 'whatsapp', 'visit', 'service_follow_up', 'general') then
    raise exception 'Invalid follow-up task details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_tasks (
    owner_id, customer_id, title, details, task_type, due_at, created_by
  )
  values (
    actor, p_customer, btrim(p_title), btrim(coalesce(p_details, '')),
    p_task_type, p_due_at, actor
  )
  returning id into task_id;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, related_task_id, actor_id
  )
  values (
    actor, p_customer, 'follow_up_created', 'internal', 'internal',
    'Follow-up scheduled: ' || btrim(p_title),
    btrim(coalesce(p_details, '')), task_id, actor
  )
  returning id into activity_id;

  return task_id;
end;
$function$;

create or replace function studioflow_android_private.crm_update_task(
  p_task uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  task_row studioflow_android_private.crm_tasks;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_task is null or p_status is null or p_status not in ('open', 'completed', 'cancelled') then
    raise exception 'Invalid follow-up task update' using errcode = '22023';
  end if;

  select * into task_row
  from studioflow_android_private.crm_tasks t
  where t.id = p_task
    and t.owner_id = actor
  for update;

  if task_row.id is null then
    raise exception 'Follow-up task unavailable' using errcode = '42501';
  end if;

  if task_row.status = p_status then
    return;
  end if;

  update studioflow_android_private.crm_tasks
  set status = p_status,
      completed_at = case when p_status = 'completed' then now() else null end,
      updated_at = now()
  where id = p_task
    and owner_id = actor;

  if p_status = 'completed' then
    insert into studioflow_android_private.crm_activities (
      owner_id, customer_id, activity_type, channel, direction,
      summary, details, related_task_id, actor_id
    )
    values (
      actor, task_row.customer_id, 'follow_up_completed', 'internal', 'internal',
      'Follow-up completed: ' || task_row.title,
      task_row.details, task_row.id, actor
    );
  end if;
end;
$function$;

-- Public wrappers follow the existing StudioFlow pattern. The data and
-- privileged mutations stay in the non-exposed private schema.
create or replace function public.studioflow_owner_crm_create_contact(
  p_full_name text,p_phone text,p_email text,p_source text,p_date_of_birth date
)
returns uuid language sql set search_path to ''
as $function$
  select studioflow_android_private.crm_create_contact(p_full_name,p_phone,p_email,p_source,p_date_of_birth)
$function$;

create or replace function public.studioflow_owner_crm_update_contact(
  p_customer uuid,p_full_name text,p_phone text,p_email text,p_date_of_birth date,
  p_tags text,p_notes text,p_blocked boolean
)
returns void language sql set search_path to ''
as $function$
  select studioflow_android_private.crm_update_contact(
    p_customer,p_full_name,p_phone,p_email,p_date_of_birth,p_tags,p_notes,p_blocked
  )
$function$;

create or replace function public.studioflow_owner_crm_dashboard()
returns jsonb
language sql
stable
set search_path to ''
as $function$
  select studioflow_android_private.crm_dashboard()
$function$;

create or replace function public.studioflow_owner_crm_add_activity(
  p_customer uuid,
  p_activity_type text,
  p_channel text,
  p_direction text,
  p_summary text,
  p_details text default ''
)
returns uuid
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_add_activity(
    p_customer, p_activity_type, p_channel, p_direction, p_summary, p_details
  )
$function$;

create or replace function public.studioflow_owner_crm_create_task(
  p_customer uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_task_type text
)
returns uuid
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_create_task(
    p_customer, p_title, p_details, p_due_at, p_task_type
  )
$function$;

create or replace function public.studioflow_owner_crm_update_task(
  p_task uuid,
  p_status text
)
returns void
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_update_task(p_task, p_status)
$function$;

revoke all on function studioflow_android_private.crm_create_contact(text,text,text,text,date) from public, anon;
revoke all on function studioflow_android_private.crm_update_contact(uuid,text,text,text,date,text,text,boolean) from public, anon;
grant execute on function studioflow_android_private.crm_create_contact(text,text,text,text,date) to authenticated;
grant execute on function studioflow_android_private.crm_update_contact(uuid,text,text,text,date,text,text,boolean) to authenticated;

revoke all on function public.studioflow_owner_crm_create_contact(text,text,text,text,date) from public, anon;
revoke all on function public.studioflow_owner_crm_update_contact(uuid,text,text,text,date,text,text,boolean) from public, anon;
grant execute on function public.studioflow_owner_crm_create_contact(text,text,text,text,date) to authenticated;
grant execute on function public.studioflow_owner_crm_update_contact(uuid,text,text,text,date,text,text,boolean) to authenticated;

-- Do not leave new RPCs executable by anon/PUBLIC.
revoke all on function studioflow_android_private.crm_dashboard() from public, anon;
revoke all on function studioflow_android_private.crm_add_activity(uuid, text, text, text, text, text) from public, anon;
revoke all on function studioflow_android_private.crm_create_task(uuid, text, text, timestamptz, text) from public, anon;
revoke all on function studioflow_android_private.crm_update_task(uuid, text) from public, anon;

grant usage on schema studioflow_android_private to authenticated;
grant execute on function studioflow_android_private.crm_dashboard() to authenticated;
grant execute on function studioflow_android_private.crm_add_activity(uuid, text, text, text, text, text) to authenticated;
grant execute on function studioflow_android_private.crm_create_task(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function studioflow_android_private.crm_update_task(uuid, text) to authenticated;

revoke all on function public.studioflow_owner_crm_dashboard() from public, anon;
revoke all on function public.studioflow_owner_crm_add_activity(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.studioflow_owner_crm_create_task(uuid, text, text, timestamptz, text) from public, anon;
revoke all on function public.studioflow_owner_crm_update_task(uuid, text) from public, anon;

grant execute on function public.studioflow_owner_crm_dashboard() to authenticated;
grant execute on function public.studioflow_owner_crm_add_activity(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.studioflow_owner_crm_create_task(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function public.studioflow_owner_crm_update_task(uuid, text) to authenticated;
)) then
    raise exception 'Enter a valid customer name, phone number and email' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
    where case
      when char_length(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'))=12
        and left(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'),2)='91'
      then right(regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g'),10)
      else regexp_replace(coalesce(c.value->>'whatsapp',''),'[^0-9]','','g')
    end=normalized
  ) then
    raise exception 'A customer with this WhatsApp number already exists. Select the existing customer instead.' using errcode='23505';
  end if;
  if exists (
    select 1 from studioflow_android_private.crm_contacts c
    where c.owner_id=actor
      and case when char_length(regexp_replace(c.phone,'[^0-9]','','g'))=12
        and left(regexp_replace(c.phone,'[^0-9]','','g'),2)='91'
        then right(regexp_replace(c.phone,'[^0-9]','','g'),10)
        else regexp_replace(c.phone,'[^0-9]','','g') end=normalized
  ) then
    raise exception 'A CRM contact with this phone number already exists.' using errcode='23505';
  end if;
  insert into studioflow_android_private.crm_contacts(
    owner_id,full_name,phone,email,date_of_birth,source,created_by
  ) values (
    actor,btrim(p_full_name),digits,nullif(lower(btrim(coalesce(p_email,''))),''),
    p_date_of_birth,
    case when p_source in ('walk_in','phone','referral','social','imported','other') then p_source else 'other' end,
    actor
  ) returning id into contact_id;
  return contact_id;
end;
$function$;

create or replace function studioflow_android_private.crm_update_contact(
  p_customer uuid,p_full_name text,p_phone text,p_email text,p_date_of_birth date,
  p_tags text,p_notes text,p_blocked boolean
)
returns void language plpgsql security definer set search_path to ''
as $function$
declare
  actor uuid:=auth.uid();
  digits text:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  normalized text;
begin
  if actor is null or not exists (
    select 1 from public.studioflow_accounts a where a.user_id=actor
  ) then
    raise exception 'Salon owner access required' using errcode='42501';
  end if;
  if char_length(digits)=10 then digits:='91'||digits; end if;
  normalized:=case when char_length(digits)=12 and left(digits,2)='91'
    then right(digits,10) else digits end;
  if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 120
     or char_length(digits) not between 11 and 15
     or char_length(coalesce(p_tags,''))>200
     or char_length(coalesce(p_notes,''))>2000
     or p_blocked is null
     or (nullif(btrim(coalesce(p_email,'')),'') is not null
       and (char_length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+
-- identifier is accepted from the browser. Bookings remain the source of truth.
create or replace function studioflow_android_private.crm_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  customer_rows jsonb;
  task_rows jsonb;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.value->>'id',
        'name', coalesce(nullif(c.value->>'name', ''), 'Customer'),
        'whatsapp', coalesce(c.value->>'whatsapp', ''),
        'email', (
          select nullif(b.payload->>'clientEmail', '')
          from public.studioflow_bookings b
          where b.owner_id = actor
            and b.customer_id = (c.value->>'id')::uuid
            and nullif(b.payload->>'clientEmail', '') is not null
          order by b.created_at desc
          limit 1
        ),
        'dateOfBirth', c.value->'dateOfBirth',
        'birthdayShared', coalesce((c.value->>'birthdayShared')::boolean, false),
        'optIn', coalesce((c.value->>'optIn')::boolean, false),
        'consentUpdated', c.value->'consentUpdated',
        'blocked', coalesce((c.value->>'blocked')::boolean, false),
        'tags', coalesce(c.value->>'tags', ''),
        'notes', coalesce(c.value->>'notes', ''),
        'bookingCount', coalesce(bs.booking_count, 0),
        'completedBookingCount', coalesce(bs.completed_count, 0),
        'upcomingBookingCount', coalesce(bs.upcoming_count, 0),
        'totalValue', coalesce(bs.total_value, 0),
        'totalPaid', coalesce(bs.total_paid, 0),
        'firstBookingAt', bs.first_booking_at,
        'lastVisit', bs.last_visit,
        'nextAppointment', bs.next_appointment,
        'lastBookingAt', bs.last_booking_at,
        'bookingHistory', coalesce(bh.items, '[]'::jsonb),
        'activities', coalesce(ac.items, '[]'::jsonb),
        'openTaskCount', coalesce(tc.open_count, 0)
      )
      order by coalesce(bs.last_booking_at, bs.first_booking_at) desc nulls last,
               lower(coalesce(c.value->>'name', 'customer'))
    ),
    '[]'::jsonb
  )
  into customer_rows
  from jsonb_array_elements(studioflow_android_private.owner_contacts()) as c(value)
  left join lateral (
    select
      count(*)::integer as booking_count,
      (count(*) filter (where lower(b.status) = 'completed'))::integer as completed_count,
      (count(*) filter (where b.starts_at >= now() and lower(b.status) not in ('cancelled', 'rejected', 'no_show')))::integer as upcoming_count,
      coalesce(sum(greatest(coalesce(nullif(b.payload->>'servicePrice', '')::numeric, 0), 0)), 0) as total_value,
      coalesce(sum(greatest(coalesce(nullif(b.payload->>'amountPaid', '')::numeric, 0), 0)), 0) as total_paid,
      min(b.created_at) as first_booking_at,
      max(b.starts_at) filter (where lower(b.status) = 'completed') as last_visit,
      min(b.starts_at) filter (
        where b.starts_at >= now()
          and lower(b.status) not in ('cancelled', 'rejected', 'no_show')
      ) as next_appointment,
      max(b.created_at) as last_booking_at
    from public.studioflow_bookings b
    where b.owner_id = actor
      and b.customer_id = (c.value->>'id')::uuid
  ) bs on true
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'startsAt', b.starts_at,
          'endsAt', b.ends_at,
          'status', b.status,
          'source', b.booking_source,
          'serviceName', coalesce(nullif(b.payload->>'serviceName', ''), 'Salon service'),
          'servicePrice', coalesce(nullif(b.payload->>'servicePrice', '')::numeric, 0),
          'amountPaid', coalesce(nullif(b.payload->>'amountPaid', '')::numeric, 0),
          'paymentStatus', coalesce(b.payload->>'paymentStatus', 'unknown'),
          'stylistName', coalesce(nullif(b.payload->>'stylistName', ''), 'Any available specialist'),
          'instructions', coalesce(b.payload->>'instructions', '')
        )
        order by b.starts_at desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select b.*
      from public.studioflow_bookings b
      where b.owner_id = actor
        and b.customer_id = (c.value->>'id')::uuid
      order by b.starts_at desc
      limit 30
    ) b
  ) bh on true
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.activity_type,
          'channel', a.channel,
          'direction', a.direction,
          'summary', a.summary,
          'details', a.details,
          'createdAt', a.created_at,
          'relatedBookingId', a.related_booking_id,
          'relatedTaskId', a.related_task_id
        )
        order by a.created_at desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select a.*
      from studioflow_android_private.crm_activities a
      where a.owner_id = actor
        and a.customer_id = (c.value->>'id')::uuid
      order by a.created_at desc
      limit 40
    ) a
  ) ac on true
  left join lateral (
    select count(*)::integer as open_count
    from studioflow_android_private.crm_tasks t
    where t.owner_id = actor
      and t.customer_id = (c.value->>'id')::uuid
      and t.status = 'open'
  ) tc on true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'customerId', t.customer_id,
        'title', t.title,
        'details', t.details,
        'taskType', t.task_type,
        'status', t.status,
        'dueAt', t.due_at,
        'completedAt', t.completed_at,
        'createdAt', t.created_at
      )
      order by
        case when t.status = 'open' then 0 else 1 end,
        t.due_at asc,
        t.created_at desc
    ),
    '[]'::jsonb
  )
  into task_rows
  from (
    select *
    from studioflow_android_private.crm_tasks
    where owner_id = actor
    order by
      case when status = 'open' then 0 else 1 end,
      due_at asc,
      created_at desc
    limit 300
  ) t;

  return jsonb_build_object(
    'customers', customer_rows,
    'tasks', task_rows,
    'generatedAt', now()
  );
end;
$function$;

create or replace function studioflow_android_private.crm_add_activity(
  p_customer uuid,
  p_activity_type text,
  p_channel text,
  p_direction text,
  p_summary text,
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  activity_id uuid;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_customer is null
     or not exists (
       select 1
       from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
       where c.value->>'id' = p_customer::text
     ) then
    raise exception 'Customer unavailable' using errcode = '42501';
  end if;

  if p_activity_type is null or p_channel is null or p_direction is null
     or p_activity_type not in ('note', 'call', 'whatsapp', 'email', 'meeting', 'other')
     or p_channel not in ('phone', 'whatsapp', 'email', 'in_person', 'internal')
     or p_direction not in ('inbound', 'outbound', 'internal')
     or char_length(btrim(coalesce(p_summary, ''))) not between 1 and 180
     or char_length(coalesce(p_details, '')) > 3000 then
    raise exception 'Invalid CRM activity details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, actor_id
  )
  values (
    actor, p_customer, p_activity_type, p_channel, p_direction,
    btrim(p_summary), btrim(coalesce(p_details, '')), actor
  )
  returning id into activity_id;

  return activity_id;
end;
$function$;

create or replace function studioflow_android_private.crm_create_task(
  p_customer uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_task_type text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  task_id uuid;
  activity_id uuid;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_customer is null
     or not exists (
       select 1
       from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
       where c.value->>'id' = p_customer::text
     ) then
    raise exception 'Customer unavailable' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
     or char_length(coalesce(p_details, '')) > 3000
     or p_due_at is null
     or p_due_at < now() - interval '365 days'
     or p_due_at > now() + interval '5 years'
     or p_task_type is null
     or p_task_type not in ('call', 'whatsapp', 'visit', 'service_follow_up', 'general') then
    raise exception 'Invalid follow-up task details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_tasks (
    owner_id, customer_id, title, details, task_type, due_at, created_by
  )
  values (
    actor, p_customer, btrim(p_title), btrim(coalesce(p_details, '')),
    p_task_type, p_due_at, actor
  )
  returning id into task_id;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, related_task_id, actor_id
  )
  values (
    actor, p_customer, 'follow_up_created', 'internal', 'internal',
    'Follow-up scheduled: ' || btrim(p_title),
    btrim(coalesce(p_details, '')), task_id, actor
  )
  returning id into activity_id;

  return task_id;
end;
$function$;

create or replace function studioflow_android_private.crm_update_task(
  p_task uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  task_row studioflow_android_private.crm_tasks;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_task is null or p_status is null or p_status not in ('open', 'completed', 'cancelled') then
    raise exception 'Invalid follow-up task update' using errcode = '22023';
  end if;

  select * into task_row
  from studioflow_android_private.crm_tasks t
  where t.id = p_task
    and t.owner_id = actor
  for update;

  if task_row.id is null then
    raise exception 'Follow-up task unavailable' using errcode = '42501';
  end if;

  if task_row.status = p_status then
    return;
  end if;

  update studioflow_android_private.crm_tasks
  set status = p_status,
      completed_at = case when p_status = 'completed' then now() else null end,
      updated_at = now()
  where id = p_task
    and owner_id = actor;

  if p_status = 'completed' then
    insert into studioflow_android_private.crm_activities (
      owner_id, customer_id, activity_type, channel, direction,
      summary, details, related_task_id, actor_id
    )
    values (
      actor, task_row.customer_id, 'follow_up_completed', 'internal', 'internal',
      'Follow-up completed: ' || task_row.title,
      task_row.details, task_row.id, actor
    );
  end if;
end;
$function$;

-- Public wrappers follow the existing StudioFlow pattern. The data and
-- privileged mutations stay in the non-exposed private schema.
create or replace function public.studioflow_owner_crm_dashboard()
returns jsonb
language sql
stable
set search_path to ''
as $function$
  select studioflow_android_private.crm_dashboard()
$function$;

create or replace function public.studioflow_owner_crm_add_activity(
  p_customer uuid,
  p_activity_type text,
  p_channel text,
  p_direction text,
  p_summary text,
  p_details text default ''
)
returns uuid
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_add_activity(
    p_customer, p_activity_type, p_channel, p_direction, p_summary, p_details
  )
$function$;

create or replace function public.studioflow_owner_crm_create_task(
  p_customer uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_task_type text
)
returns uuid
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_create_task(
    p_customer, p_title, p_details, p_due_at, p_task_type
  )
$function$;

create or replace function public.studioflow_owner_crm_update_task(
  p_task uuid,
  p_status text
)
returns void
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_update_task(p_task, p_status)
$function$;

-- Do not leave new RPCs executable by anon/PUBLIC.
revoke all on function studioflow_android_private.crm_dashboard() from public, anon;
revoke all on function studioflow_android_private.crm_add_activity(uuid, text, text, text, text, text) from public, anon;
revoke all on function studioflow_android_private.crm_create_task(uuid, text, text, timestamptz, text) from public, anon;
revoke all on function studioflow_android_private.crm_update_task(uuid, text) from public, anon;

grant usage on schema studioflow_android_private to authenticated;
grant execute on function studioflow_android_private.crm_dashboard() to authenticated;
grant execute on function studioflow_android_private.crm_add_activity(uuid, text, text, text, text, text) to authenticated;
grant execute on function studioflow_android_private.crm_create_task(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function studioflow_android_private.crm_update_task(uuid, text) to authenticated;

revoke all on function public.studioflow_owner_crm_dashboard() from public, anon;
revoke all on function public.studioflow_owner_crm_add_activity(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.studioflow_owner_crm_create_task(uuid, text, text, timestamptz, text) from public, anon;
revoke all on function public.studioflow_owner_crm_update_task(uuid, text) from public, anon;

grant execute on function public.studioflow_owner_crm_dashboard() to authenticated;
grant execute on function public.studioflow_owner_crm_add_activity(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.studioflow_owner_crm_create_task(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function public.studioflow_owner_crm_update_task(uuid, text) to authenticated;
)) then
    raise exception 'Invalid customer details' using errcode='22023';
  end if;
  if exists (
    select 1 from studioflow_android_private.crm_contacts c
    where c.owner_id=actor and c.id<>p_customer
      and case when char_length(regexp_replace(c.phone,'[^0-9]','','g'))=12
        and left(regexp_replace(c.phone,'[^0-9]','','g'),2)='91'
        then right(regexp_replace(c.phone,'[^0-9]','','g'),10)
        else regexp_replace(c.phone,'[^0-9]','','g') end=normalized
  ) then
    raise exception 'Another CRM contact already uses this phone number.' using errcode='23505';
  end if;
  update studioflow_android_private.crm_contacts
  set full_name=btrim(p_full_name),phone=digits,
      email=nullif(lower(btrim(coalesce(p_email,''))),''),
      date_of_birth=p_date_of_birth,tags=btrim(coalesce(p_tags,'')),
      notes=btrim(coalesce(p_notes,'')),do_not_contact=p_blocked,updated_at=now()
  where id=p_customer and owner_id=actor;
  if not found then raise exception 'Manual CRM contact unavailable' using errcode='42501'; end if;
end;
$function$;

-- The dashboard response is always derived from auth.uid(); no salon/owner
-- identifier is accepted from the browser. Bookings remain the source of truth.
create or replace function studioflow_android_private.crm_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  customer_rows jsonb;
  task_rows jsonb;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.value->>'id',
        'name', coalesce(nullif(c.value->>'name', ''), 'Customer'),
        'whatsapp', coalesce(c.value->>'whatsapp', ''),
        'email', (
          select nullif(b.payload->>'clientEmail', '')
          from public.studioflow_bookings b
          where b.owner_id = actor
            and b.customer_id = (c.value->>'id')::uuid
            and nullif(b.payload->>'clientEmail', '') is not null
          order by b.created_at desc
          limit 1
        ),
        'dateOfBirth', c.value->'dateOfBirth',
        'birthdayShared', coalesce((c.value->>'birthdayShared')::boolean, false),
        'optIn', coalesce((c.value->>'optIn')::boolean, false),
        'consentUpdated', c.value->'consentUpdated',
        'blocked', coalesce((c.value->>'blocked')::boolean, false),
        'tags', coalesce(c.value->>'tags', ''),
        'notes', coalesce(c.value->>'notes', ''),
        'bookingCount', coalesce(bs.booking_count, 0),
        'completedBookingCount', coalesce(bs.completed_count, 0),
        'upcomingBookingCount', coalesce(bs.upcoming_count, 0),
        'totalValue', coalesce(bs.total_value, 0),
        'totalPaid', coalesce(bs.total_paid, 0),
        'firstBookingAt', bs.first_booking_at,
        'lastVisit', bs.last_visit,
        'nextAppointment', bs.next_appointment,
        'lastBookingAt', bs.last_booking_at,
        'bookingHistory', coalesce(bh.items, '[]'::jsonb),
        'activities', coalesce(ac.items, '[]'::jsonb),
        'openTaskCount', coalesce(tc.open_count, 0)
      )
      order by coalesce(bs.last_booking_at, bs.first_booking_at) desc nulls last,
               lower(coalesce(c.value->>'name', 'customer'))
    ),
    '[]'::jsonb
  )
  into customer_rows
  from jsonb_array_elements(studioflow_android_private.owner_contacts()) as c(value)
  left join lateral (
    select
      count(*)::integer as booking_count,
      (count(*) filter (where lower(b.status) = 'completed'))::integer as completed_count,
      (count(*) filter (where b.starts_at >= now() and lower(b.status) not in ('cancelled', 'rejected', 'no_show')))::integer as upcoming_count,
      coalesce(sum(greatest(coalesce(nullif(b.payload->>'servicePrice', '')::numeric, 0), 0)), 0) as total_value,
      coalesce(sum(greatest(coalesce(nullif(b.payload->>'amountPaid', '')::numeric, 0), 0)), 0) as total_paid,
      min(b.created_at) as first_booking_at,
      max(b.starts_at) filter (where lower(b.status) = 'completed') as last_visit,
      min(b.starts_at) filter (
        where b.starts_at >= now()
          and lower(b.status) not in ('cancelled', 'rejected', 'no_show')
      ) as next_appointment,
      max(b.created_at) as last_booking_at
    from public.studioflow_bookings b
    where b.owner_id = actor
      and b.customer_id = (c.value->>'id')::uuid
  ) bs on true
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'startsAt', b.starts_at,
          'endsAt', b.ends_at,
          'status', b.status,
          'source', b.booking_source,
          'serviceName', coalesce(nullif(b.payload->>'serviceName', ''), 'Salon service'),
          'servicePrice', coalesce(nullif(b.payload->>'servicePrice', '')::numeric, 0),
          'amountPaid', coalesce(nullif(b.payload->>'amountPaid', '')::numeric, 0),
          'paymentStatus', coalesce(b.payload->>'paymentStatus', 'unknown'),
          'stylistName', coalesce(nullif(b.payload->>'stylistName', ''), 'Any available specialist'),
          'instructions', coalesce(b.payload->>'instructions', '')
        )
        order by b.starts_at desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select b.*
      from public.studioflow_bookings b
      where b.owner_id = actor
        and b.customer_id = (c.value->>'id')::uuid
      order by b.starts_at desc
      limit 30
    ) b
  ) bh on true
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'type', a.activity_type,
          'channel', a.channel,
          'direction', a.direction,
          'summary', a.summary,
          'details', a.details,
          'createdAt', a.created_at,
          'relatedBookingId', a.related_booking_id,
          'relatedTaskId', a.related_task_id
        )
        order by a.created_at desc
      ),
      '[]'::jsonb
    ) as items
    from (
      select a.*
      from studioflow_android_private.crm_activities a
      where a.owner_id = actor
        and a.customer_id = (c.value->>'id')::uuid
      order by a.created_at desc
      limit 40
    ) a
  ) ac on true
  left join lateral (
    select count(*)::integer as open_count
    from studioflow_android_private.crm_tasks t
    where t.owner_id = actor
      and t.customer_id = (c.value->>'id')::uuid
      and t.status = 'open'
  ) tc on true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'customerId', t.customer_id,
        'title', t.title,
        'details', t.details,
        'taskType', t.task_type,
        'status', t.status,
        'dueAt', t.due_at,
        'completedAt', t.completed_at,
        'createdAt', t.created_at
      )
      order by
        case when t.status = 'open' then 0 else 1 end,
        t.due_at asc,
        t.created_at desc
    ),
    '[]'::jsonb
  )
  into task_rows
  from (
    select *
    from studioflow_android_private.crm_tasks
    where owner_id = actor
    order by
      case when status = 'open' then 0 else 1 end,
      due_at asc,
      created_at desc
    limit 300
  ) t;

  return jsonb_build_object(
    'customers', customer_rows,
    'tasks', task_rows,
    'generatedAt', now()
  );
end;
$function$;

create or replace function studioflow_android_private.crm_add_activity(
  p_customer uuid,
  p_activity_type text,
  p_channel text,
  p_direction text,
  p_summary text,
  p_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  activity_id uuid;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_customer is null
     or not exists (
       select 1
       from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
       where c.value->>'id' = p_customer::text
     ) then
    raise exception 'Customer unavailable' using errcode = '42501';
  end if;

  if p_activity_type is null or p_channel is null or p_direction is null
     or p_activity_type not in ('note', 'call', 'whatsapp', 'email', 'meeting', 'other')
     or p_channel not in ('phone', 'whatsapp', 'email', 'in_person', 'internal')
     or p_direction not in ('inbound', 'outbound', 'internal')
     or char_length(btrim(coalesce(p_summary, ''))) not between 1 and 180
     or char_length(coalesce(p_details, '')) > 3000 then
    raise exception 'Invalid CRM activity details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, actor_id
  )
  values (
    actor, p_customer, p_activity_type, p_channel, p_direction,
    btrim(p_summary), btrim(coalesce(p_details, '')), actor
  )
  returning id into activity_id;

  return activity_id;
end;
$function$;

create or replace function studioflow_android_private.crm_create_task(
  p_customer uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_task_type text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  task_id uuid;
  activity_id uuid;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_customer is null
     or not exists (
       select 1
       from jsonb_array_elements(studioflow_android_private.owner_contacts()) c(value)
       where c.value->>'id' = p_customer::text
     ) then
    raise exception 'Customer unavailable' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
     or char_length(coalesce(p_details, '')) > 3000
     or p_due_at is null
     or p_due_at < now() - interval '365 days'
     or p_due_at > now() + interval '5 years'
     or p_task_type is null
     or p_task_type not in ('call', 'whatsapp', 'visit', 'service_follow_up', 'general') then
    raise exception 'Invalid follow-up task details' using errcode = '22023';
  end if;

  insert into studioflow_android_private.crm_tasks (
    owner_id, customer_id, title, details, task_type, due_at, created_by
  )
  values (
    actor, p_customer, btrim(p_title), btrim(coalesce(p_details, '')),
    p_task_type, p_due_at, actor
  )
  returning id into task_id;

  insert into studioflow_android_private.crm_activities (
    owner_id, customer_id, activity_type, channel, direction,
    summary, details, related_task_id, actor_id
  )
  values (
    actor, p_customer, 'follow_up_created', 'internal', 'internal',
    'Follow-up scheduled: ' || btrim(p_title),
    btrim(coalesce(p_details, '')), task_id, actor
  )
  returning id into activity_id;

  return task_id;
end;
$function$;

create or replace function studioflow_android_private.crm_update_task(
  p_task uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor uuid := auth.uid();
  task_row studioflow_android_private.crm_tasks;
begin
  if actor is null
     or not exists (select 1 from public.studioflow_accounts a where a.user_id = actor) then
    raise exception 'Salon owner access required' using errcode = '42501';
  end if;

  if p_task is null or p_status is null or p_status not in ('open', 'completed', 'cancelled') then
    raise exception 'Invalid follow-up task update' using errcode = '22023';
  end if;

  select * into task_row
  from studioflow_android_private.crm_tasks t
  where t.id = p_task
    and t.owner_id = actor
  for update;

  if task_row.id is null then
    raise exception 'Follow-up task unavailable' using errcode = '42501';
  end if;

  if task_row.status = p_status then
    return;
  end if;

  update studioflow_android_private.crm_tasks
  set status = p_status,
      completed_at = case when p_status = 'completed' then now() else null end,
      updated_at = now()
  where id = p_task
    and owner_id = actor;

  if p_status = 'completed' then
    insert into studioflow_android_private.crm_activities (
      owner_id, customer_id, activity_type, channel, direction,
      summary, details, related_task_id, actor_id
    )
    values (
      actor, task_row.customer_id, 'follow_up_completed', 'internal', 'internal',
      'Follow-up completed: ' || task_row.title,
      task_row.details, task_row.id, actor
    );
  end if;
end;
$function$;

-- Public wrappers follow the existing StudioFlow pattern. The data and
-- privileged mutations stay in the non-exposed private schema.
create or replace function public.studioflow_owner_crm_dashboard()
returns jsonb
language sql
stable
set search_path to ''
as $function$
  select studioflow_android_private.crm_dashboard()
$function$;

create or replace function public.studioflow_owner_crm_add_activity(
  p_customer uuid,
  p_activity_type text,
  p_channel text,
  p_direction text,
  p_summary text,
  p_details text default ''
)
returns uuid
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_add_activity(
    p_customer, p_activity_type, p_channel, p_direction, p_summary, p_details
  )
$function$;

create or replace function public.studioflow_owner_crm_create_task(
  p_customer uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_task_type text
)
returns uuid
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_create_task(
    p_customer, p_title, p_details, p_due_at, p_task_type
  )
$function$;

create or replace function public.studioflow_owner_crm_update_task(
  p_task uuid,
  p_status text
)
returns void
language sql
set search_path to ''
as $function$
  select studioflow_android_private.crm_update_task(p_task, p_status)
$function$;

-- Do not leave new RPCs executable by anon/PUBLIC.
revoke all on function studioflow_android_private.crm_dashboard() from public, anon;
revoke all on function studioflow_android_private.crm_add_activity(uuid, text, text, text, text, text) from public, anon;
revoke all on function studioflow_android_private.crm_create_task(uuid, text, text, timestamptz, text) from public, anon;
revoke all on function studioflow_android_private.crm_update_task(uuid, text) from public, anon;

grant usage on schema studioflow_android_private to authenticated;
grant execute on function studioflow_android_private.crm_dashboard() to authenticated;
grant execute on function studioflow_android_private.crm_add_activity(uuid, text, text, text, text, text) to authenticated;
grant execute on function studioflow_android_private.crm_create_task(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function studioflow_android_private.crm_update_task(uuid, text) to authenticated;

revoke all on function public.studioflow_owner_crm_dashboard() from public, anon;
revoke all on function public.studioflow_owner_crm_add_activity(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.studioflow_owner_crm_create_task(uuid, text, text, timestamptz, text) from public, anon;
revoke all on function public.studioflow_owner_crm_update_task(uuid, text) from public, anon;

grant execute on function public.studioflow_owner_crm_dashboard() to authenticated;
grant execute on function public.studioflow_owner_crm_add_activity(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.studioflow_owner_crm_create_task(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function public.studioflow_owner_crm_update_task(uuid, text) to authenticated;
