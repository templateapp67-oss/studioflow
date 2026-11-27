-- Disposable fixture for the separately deployed normalized catalogue. The
-- old availability function below is the reviewed production definition;
-- the small owner writer keeps its actual projection/assignment statements,
-- with unrelated profile/media code omitted. This is not production data.
create schema if not exists auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.salons(id uuid primary key,owner_id uuid,organization_id uuid,slug text,is_active boolean default true,is_listed boolean default true,online_booking_enabled boolean default true,deleted_at timestamptz,timezone text default 'Asia/Kolkata',created_at timestamptz default now());
create table public.salon_hours(salon_id uuid,day_of_week smallint,opens_at time,closes_at time,is_closed boolean default false,unique(salon_id,day_of_week));
create table public.services(id uuid primary key,salon_id uuid,name text,price_paise bigint,duration_minutes int,is_active boolean default true,is_bookable_online boolean default true);
create table public.salon_services(id uuid primary key default gen_random_uuid(),salon_id uuid not null,name text not null,category text not null default 'General',description text,price numeric not null default 0,price_paise bigint,duration_minutes int not null default 45,icon text not null default 'sparkles',is_active boolean not null default true,is_bookable_online boolean not null default true,is_featured boolean not null default false,display_order int not null default 0,editor_key text not null,status text not null default 'active',updated_at timestamptz default now(),unique(salon_id,editor_key));
create table public.staff(id uuid primary key default gen_random_uuid(),salon_id uuid,name text default 'Draft',full_name text,role_title text,bio text,profile_photo_url text,phone text,specialties jsonb default '[]',is_active boolean default true,is_public boolean default true,employment_status text default 'active',commission_rate numeric default 0,editor_key text,deleted_at timestamptz,display_order int default 0,updated_at timestamptz default now(),unique(salon_id,editor_key));
-- Production supplies this default through a BEFORE INSERT trigger.
create function public.nexora_fill_staff_editor_key() returns trigger language plpgsql as $$begin if nullif(btrim(new.editor_key),'') is null then new.editor_key:=new.id::text; end if; return new; end$$;
create trigger nexora_staff_editor_key_before_insert before insert on public.staff for each row execute function public.nexora_fill_staff_editor_key();
create table public.owner_editor_state(owner_id uuid primary key,state jsonb,updated_at timestamptz default now());
-- Mirror the production money trigger: price_paise wins when it is present.
create function public.fixture_sync_service_money() returns trigger language plpgsql as $$begin if new.price_paise is null and new.price is not null then new.price_paise:=round(new.price*100)::bigint; elsif new.price_paise is not null then new.price:=new.price_paise::numeric/100; end if; return new; end$$;
create trigger fixture_sync_service_money before insert or update on public.salon_services for each row execute function public.fixture_sync_service_money();
create table public.staff_schedules(staff_id uuid references public.staff(id),day_of_week smallint,start_time time,end_time time,is_off boolean not null default false,is_working boolean,unique(staff_id,day_of_week));
create table public.staff_services(staff_id uuid references public.staff(id),service_id uuid references public.salon_services(id) on delete cascade,is_active boolean default true,primary key(staff_id,service_id));
create table public.staff_leave_requests(staff_id uuid references public.staff(id),start_date date,end_date date,status text);
create table public.bookings(id uuid primary key default gen_random_uuid(),salon_id uuid,staff_id uuid,appointment_date date,booking_date date,start_time time,end_time time,status text,booking_status text);
alter table public.bookings enable row level security;
revoke all on public.bookings from public,anon,authenticated;

create function public.nexora_catalog_uuid(p_salon_id uuid,p_kind text,p_raw text) returns uuid
language plpgsql immutable strict set search_path=pg_catalog as $$
declare trimmed text:=btrim(p_raw); hash text;
begin
 if trimmed ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return lower(trimmed)::uuid; end if;
 hash:=md5(p_salon_id::text||':'||p_kind||':'||coalesce(nullif(trimmed,''),'item'));
 return (substr(hash,1,8)||'-'||substr(hash,9,4)||'-4'||substr(hash,14,3)||'-a'||substr(hash,18,3)||'-'||substr(hash,21,12))::uuid;
end $$;

-- Same service-ID validation and staff predicate as the deployed definition.
-- In production its booking conflict/time-off clauses reference columns/tables
-- that do not exist; the pending migration replaces the full function.
create function public.nexora_customer_booking_options(p_salon_id uuid, p_service_ids uuid[], p_date date, p_staff_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $function$
declare
  salon public.salons%rowtype;
  hours public.salon_hours%rowtype;
  specialist record;
  candidate timestamp;
  starts timestamptz;
  duration integer;
  price bigint;
  need integer;
  slots jsonb := '[]'::jsonb;
  specialists jsonb := '[]'::jsonb;
  free boolean;
begin
  select * into salon from public.salons where id = p_salon_id and is_active = true and is_listed = true and online_booking_enabled = true and deleted_at is null;
  if not found then return jsonb_build_object('available_slots', '[]'::jsonb, 'available_staff', '[]'::jsonb, 'closed', true); end if;
  select count(distinct id) into need from unnest(coalesce(p_service_ids, array[]::uuid[])) id;
  if need = 0 then return jsonb_build_object('available_slots', '[]'::jsonb, 'available_staff', '[]'::jsonb); end if;
  select count(*), coalesce(sum(duration_minutes), 0), coalesce(sum(price_paise), 0)
  into need, duration, price
  from public.services
  where salon_id = p_salon_id and id = any(p_service_ids) and is_active = true and is_bookable_online = true
  having count(*) = (select count(distinct id) from unnest(p_service_ids) id);
  if not found or duration <= 0 then return jsonb_build_object('available_slots', '[]'::jsonb, 'available_staff', '[]'::jsonb); end if;
  select * into hours from public.salon_hours where salon_id = p_salon_id and day_of_week = extract(dow from p_date)::integer and not is_closed;
  if not found or hours.opens_at is null or hours.closes_at is null or hours.closes_at <= hours.opens_at then
    return jsonb_build_object('available_slots', '[]'::jsonb, 'available_staff', '[]'::jsonb, 'closed', true);
  end if;
  for specialist in
    select st.id, st.full_name, st.role_title, st.profile_photo_url, sc.start_time, sc.end_time
    from public.staff st left join public.staff_schedules sc on sc.staff_id = st.id and sc.day_of_week = extract(dow from p_date)::integer
    where st.salon_id = p_salon_id and st.is_active = true and st.is_public = true and st.employment_status = 'active' and st.deleted_at is null
      and (p_staff_id is null or st.id = p_staff_id)
      and (sc.staff_id is null or (sc.is_working = true and sc.start_time is not null and sc.end_time is not null and sc.end_time > sc.start_time))
      and (
        not exists (select 1 from public.staff_services ss_any where ss_any.staff_id = st.id and ss_any.is_active = true)
        or (select count(distinct ss.service_id) from public.staff_services ss where ss.staff_id = st.id and ss.is_active = true and ss.service_id = any(p_service_ids)) = need
      )
    order by coalesce(st.display_order, 0), st.full_name
  loop
    specialists := specialists || jsonb_build_array(jsonb_build_object('id', specialist.id, 'name', specialist.full_name, 'role_title', specialist.role_title, 'photo_url', specialist.profile_photo_url));
  end loop;
  if jsonb_array_length(specialists) = 0 then return jsonb_build_object('available_slots', '[]'::jsonb, 'available_staff', '[]'::jsonb, 'duration_minutes', duration, 'total_paise', price); end if;
  candidate := p_date + hours.opens_at;
  while candidate + make_interval(mins => duration) <= p_date + hours.closes_at loop
    starts := candidate at time zone coalesce(nullif(salon.timezone, ''), 'Asia/Kolkata'); free := false;
    for specialist in
      select st.id, coalesce(sc.start_time, hours.opens_at) as start_time, coalesce(sc.end_time, hours.closes_at) as end_time
      from public.staff st left join public.staff_schedules sc on sc.staff_id = st.id and sc.day_of_week = extract(dow from p_date)::integer
      where st.id in (select (value->>'id')::uuid from jsonb_array_elements(specialists))
    loop
      if candidate::time >= greatest(hours.opens_at, specialist.start_time)
        and (candidate + make_interval(mins => duration))::time <= least(hours.closes_at, specialist.end_time)
        and not exists (select 1 from public.bookings b where b.salon_id = p_salon_id and b.primary_staff_id = specialist.id
          and b.status in ('pending', 'confirmed', 'checked_in', 'in_service')
          and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(starts, starts + make_interval(mins => duration), '[)'))
        and not exists (select 1 from public.staff_time_off off where off.staff_id = specialist.id
          and tstzrange(off.starts_at, off.ends_at, '[)') && tstzrange(starts, starts + make_interval(mins => duration), '[)'))
      then free := true; exit; end if;
    end loop;
    if free then slots := slots || jsonb_build_array(jsonb_build_object('time', to_char(candidate, 'HH24:MI'), 'starts_at', starts, 'ends_at', starts + make_interval(mins => duration))); end if;
    candidate := candidate + interval '30 minutes';
  end loop;
  return jsonb_build_object('available_slots', slots, 'available_staff', specialists, 'duration_minutes', duration, 'total_paise', price);
end $function$;
revoke all on function public.nexora_customer_booking_options(uuid,uuid[],date,uuid) from public;
grant execute on function public.nexora_customer_booking_options(uuid,uuid[],date,uuid) to anon,authenticated;

-- The deployed owner writer's service/staff/state behavior is reproduced here;
-- target selection uses owner_id as a fixture stand-in for authorized membership.
create function public.nexora_save_owner_workspace(p_state jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
 actor uuid:=auth.uid(); target uuid:=(p_state->>'salonId')::uuid; item jsonb; schedule jsonb;
 local_id uuid; svc_id uuid; day_index integer;
begin
 if target is null then select id into target from public.salons where owner_id=actor and deleted_at is null order by created_at desc limit 1; end if;
 if actor is null or not exists(select 1 from public.salons where id=target and owner_id=actor) then raise exception 'Cross-account workspace write rejected' using errcode='42501'; end if;
 for item in select value from jsonb_array_elements(coalesce(p_state->'services','[]'::jsonb)) loop
  local_id := public.nexora_catalog_uuid(target, 'service', coalesce(item->>'id', item->>'name'));
  insert into public.services(id,salon_id,name,price_paise,duration_minutes,is_active,is_bookable_online)
   values(local_id,target,item->>'name',round((item->>'price')::numeric*100)::bigint,(item->>'durationMinutes')::int,true,true)
  on conflict(id) do update set name=excluded.name,price_paise=excluded.price_paise,duration_minutes=excluded.duration_minutes,is_active=true,is_bookable_online=true
   where public.services.salon_id=target;
  if not found then raise exception 'Cross-tenant service write rejected' using errcode='42501'; end if;
 end loop;
 for item in select value from jsonb_array_elements(coalesce(p_state->'stylists','[]'::jsonb)) loop
  local_id := public.nexora_catalog_uuid(target, 'staff', coalesce(item->>'id', item->>'name'));
  insert into public.staff(id,salon_id,full_name) values(local_id,target,item->>'name') on conflict(id) do update set full_name=excluded.full_name where public.staff.salon_id=target;
  if not found then raise exception 'Cross-tenant staff write rejected' using errcode='42501'; end if;
  delete from public.staff_services where staff_id=local_id;
  if jsonb_typeof(item->'assignedServices')='array' then
   for schedule in select value from jsonb_array_elements(item->'assignedServices') loop
    svc_id := public.nexora_catalog_uuid(target, 'service', trim(both '"' from schedule::text));
    if not exists (select 1 from public.services s where s.id = svc_id and s.salon_id = target and s.is_active = true) then
      raise exception 'Assigned service is not available in this salon' using errcode = '22023';
    end if;
    insert into public.staff_services (staff_id, service_id, is_active)
    values (local_id, svc_id, true)
    on conflict (staff_id, service_id) do update set is_active = true;
   end loop;
  end if;
  -- This schedule block mirrors the reviewed deployed writer, including its
  -- is_working flag and the schema's default false is_off value.
  if jsonb_typeof(item->'schedule') = 'array' then
    delete from public.staff_schedules where staff_id = local_id;
    for schedule in select value from jsonb_array_elements(item->'schedule') loop
      day_index := case lower(coalesce(schedule->>'day', ''))
        when 'sunday' then 0 when 'monday' then 1 when 'tuesday' then 2
        when 'wednesday' then 3 when 'thursday' then 4 when 'friday' then 5
        when 'saturday' then 6 else null end;
      if day_index is null then
        raise exception 'Invalid staff schedule day' using errcode = '22023';
      end if;
      if coalesce((schedule->>'enabled')::boolean, false) and (
        nullif(schedule->>'fromTime', '')::time is null
        or nullif(schedule->>'toTime', '')::time is null
        or nullif(schedule->>'toTime', '')::time <= nullif(schedule->>'fromTime', '')::time
      ) then
        raise exception 'Invalid staff schedule time range' using errcode = '22023';
      end if;
      insert into public.staff_schedules (staff_id, day_of_week, start_time, end_time, is_working)
      values (
        local_id,
        day_index,
        coalesce(nullif(schedule->>'fromTime', '')::time, '09:00'::time),
        coalesce(nullif(schedule->>'toTime', '')::time, '18:00'::time),
        coalesce((schedule->>'enabled')::boolean, false)
      );
    end loop;
  end if;
 end loop;
 insert into public.owner_editor_state(owner_id,state,updated_at) values(actor,jsonb_set(p_state,'{salonId}',to_jsonb(target::text),true),now())
 on conflict(owner_id) do update set state=excluded.state,updated_at=now();
end $$;
revoke all on function public.nexora_save_owner_workspace(jsonb) from public,anon;
grant execute on function public.nexora_save_owner_workspace(jsonb) to authenticated;
