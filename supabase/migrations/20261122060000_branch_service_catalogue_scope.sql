-- Branch-level catalogue scoping. NULL/empty branch_ids means salon-wide (legacy).
begin;

alter table public.studioflow_services
  add column if not exists branch_ids uuid[];

alter table public.studioflow_services
  drop constraint if exists studioflow_services_branch_ids_valid;
alter table public.studioflow_services
  add constraint studioflow_services_branch_ids_valid
  check (
    branch_ids is null
    or (
      cardinality(branch_ids) <= 50
      and cardinality(branch_ids) = cardinality(array_remove(branch_ids, null))
    )
  );

create index if not exists studioflow_services_branch_ids_gin_idx
  on public.studioflow_services using gin (branch_ids)
  where branch_ids is not null and cardinality(branch_ids) > 0;

-- Validate owner/branch pairing at the one trusted write boundary: workspace sync.
create or replace function studioflow_private.validate_service_branch_ids(
  p_owner uuid,
  p_branch_ids jsonb
)
returns uuid[]
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare result uuid[];
begin
  if p_branch_ids is null then return null; end if;
  if jsonb_typeof(p_branch_ids) is distinct from 'array'
     or jsonb_array_length(p_branch_ids) > 50 then
    raise exception 'Service branches must be a list of up to 50 branch IDs' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_branch_ids) e(value)
    where jsonb_typeof(e.value) is distinct from 'string'
       or (e.value #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'Each service branch must be a valid UUID' using errcode='22023';
  end if;
  select coalesce(array_agg(x.branch_id order by x.branch_id), '{}'::uuid[])
    into result
  from (select distinct (e.value #>> '{}')::uuid as branch_id
        from jsonb_array_elements(p_branch_ids) e(value)) x;
  if cardinality(result) <> jsonb_array_length(p_branch_ids) then
    raise exception 'A service branch can only be selected once' using errcode='22023';
  end if;
  if exists (
    select 1 from unnest(result) selected(branch_id)
    left join public.branches b
      on b.id=selected.branch_id and b.site_id=p_owner
    where b.id is null
  ) then
    raise exception 'Choose branches that belong to this salon' using errcode='42501';
  end if;
  return result;
end;
$function$;

revoke all on function studioflow_private.validate_service_branch_ids(uuid,jsonb) from public,anon,authenticated;
grant execute on function studioflow_private.validate_service_branch_ids(uuid,jsonb) to postgres,service_role;

CREATE OR REPLACE FUNCTION studioflow_private.sync_service_catalogue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare menu jsonb:=coalesce(new.draft->'services','[]'::jsonb); item jsonb; image_path text; image_url text; prefix constant text:='https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/'; branch_scope uuid[];
begin
 -- Trigger entry only: callers cannot execute this private function directly.
 if auth.uid() is not null and auth.uid()<>new.user_id then
  raise exception 'You can only change your own service catalogue' using errcode='42501';
 end if;
 if jsonb_typeof(menu) is distinct from 'array' or jsonb_array_length(menu)>500 then raise exception 'Service catalogue must be a list of up to 500 services';end if;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(menu)) then raise exception 'Service IDs must be unique';end if;
 for item in select value from jsonb_array_elements(menu) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or length(btrim(item->>'id')) not between 1 and 200 then raise exception 'Each service needs a unique ID';end if;
  if jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(item->>'name')) not between 1 and 160 then raise exception 'Service name must be 1–160 characters';end if;
  if jsonb_typeof(item->'category') is distinct from 'string' or length(btrim(item->>'category')) not between 1 and 100 then raise exception 'Service category must be 1–100 characters';end if;
  if jsonb_typeof(item->'description') is distinct from 'string' or length(item->>'description')>2000 then raise exception 'Service description must be text of up to 2000 characters';end if;
  if jsonb_typeof(item->'price') is distinct from 'number' or jsonb_typeof(item->'durationMinutes') is distinct from 'number' then raise exception 'Price and duration must be numbers';end if;
  if (item->>'price')::numeric not between 0 and 10000000 or (item->>'price')::numeric<>round((item->>'price')::numeric,2) then raise exception 'Price must be 0–10000000 INR with up to two decimal places';end if;
  if (item->>'durationMinutes')::numeric not between 1 and 720 or (item->>'durationMinutes')::numeric<>trunc((item->>'durationMinutes')::numeric) then raise exception 'Duration must be 1–720 whole minutes';end if;
  image_path:=nullif(item->>'imagePath','');image_url:=nullif(item->>'imageUrl','');
  if item ? 'imagePath' and jsonb_typeof(item->'imagePath') is distinct from 'string' then raise exception 'Service image path must be text';end if;
  if item ? 'imageUrl' and jsonb_typeof(item->'imageUrl') is distinct from 'string' then raise exception 'Service image URL must be text';end if;
  if (image_path is null)<>(image_url is null) then raise exception 'Upload a service photo to save its URL and path together';end if;
  if image_path is not null then
   if length(image_path)>1024 or length(image_url)>2048 or left(image_path,length(new.user_id::text||'/services/'))<>new.user_id::text||'/services/' or image_path !~ '^[a-f0-9-]+/services/[a-f0-9-]+\.(jpg|png|webp)$' or image_url<>prefix||image_path then raise exception 'Upload your own service photo';end if;
   if not exists(select 1 from storage.objects where bucket_id='studioflow-media' and name=image_path and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp')) then raise exception 'Service photo upload is unavailable';end if;
  end if;
  if item ? 'origin' and (jsonb_typeof(item->'origin') is distinct from 'string' or item->>'origin' not in ('custom','template')) then raise exception 'Invalid service origin';end if;
  if item ? 'popular' and jsonb_typeof(item->'popular') is distinct from 'boolean' then raise exception 'Featured service must be true or false';end if;
  if item ? 'showDuration' and jsonb_typeof(item->'showDuration') is distinct from 'boolean' then raise exception 'Show duration must be true or false';end if;
  if item ? 'branchIds' then perform studioflow_private.validate_service_branch_ids(new.user_id,item->'branchIds'); end if;
 end loop;
 insert into public.studioflow_services(owner_id,service_id,name,description,category,price,duration_minutes,icon,popular,show_duration,origin,position,image_url,image_path,branch_ids)
 select new.user_id,s->>'id',s->>'name',s->>'description',s->>'category',(s->>'price')::numeric,(s->>'durationMinutes')::integer,coalesce(s->>'icon','spa'),coalesce((s->>'popular')::boolean,false),coalesce((s->>'showDuration')::boolean,true),s->>'origin',(ordinality-1)::integer,nullif(s->>'imageUrl',''),nullif(s->>'imagePath',''),studioflow_private.validate_service_branch_ids(new.user_id,s->'branchIds')
 from jsonb_array_elements(menu) with ordinality as entries(s,ordinality)
 on conflict(owner_id,service_id) do update set name=excluded.name,description=excluded.description,category=excluded.category,price=excluded.price,duration_minutes=excluded.duration_minutes,icon=excluded.icon,popular=excluded.popular,show_duration=excluded.show_duration,origin=excluded.origin,position=excluded.position,image_url=excluded.image_url,image_path=excluded.image_path,branch_ids=coalesce(excluded.branch_ids,public.studioflow_services.branch_ids),updated_at=now();
 delete from public.studioflow_services where owner_id=new.user_id and not exists(select 1 from jsonb_array_elements(menu) s where s->>'id'=service_id);
 return new;
end $function$
;

-- An empty mapping is a legacy salon-wide service. A mapped service must include
-- the selected branch; no branch context cannot book branch-only offerings.
create or replace function studioflow_private.service_catalogue_available_at_branch(
  p_owner uuid,
  p_services jsonb,
  p_branch uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if p_owner is null
     or jsonb_typeof(p_services) is distinct from 'array'
     or jsonb_array_length(p_services) not between 1 and 10
     or exists (
       select 1 from jsonb_array_elements(p_services) e(value)
       where jsonb_typeof(e.value) is distinct from 'string'
     ) then
    return false;
  end if;
  if p_branch is not null and not exists (
    select 1 from public.branches b
    where b.id=p_branch and b.site_id=p_owner and b.is_active
  ) then
    return false;
  end if;
  return not exists (
    select 1
    from jsonb_array_elements_text(p_services) requested(service_id)
    join public.studioflow_services s
      on s.owner_id=p_owner and s.service_id=requested.service_id
    where coalesce(cardinality(s.branch_ids),0)>0
      and (p_branch is null or not (p_branch = any(s.branch_ids)))
  );
end;
$function$;

revoke all on function studioflow_private.service_catalogue_available_at_branch(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function studioflow_private.service_catalogue_available_at_branch(uuid,jsonb,uuid) to postgres,service_role;

-- Do not replace the existing permissive service read policy. This restrictive
-- guard only narrows branch-mapped rows for staff; owners still see everything.
drop policy if exists studioflow_services_branch_scope_guard on public.studioflow_services;
create policy studioflow_services_branch_scope_guard
  on public.studioflow_services
  as restrictive
  for select to authenticated
  using (
    owner_id=(select auth.uid())
    or coalesce(cardinality(branch_ids),0)=0
    or exists (
      select 1 from unnest(branch_ids) assigned(branch_id)
      where public.studioflow_is_assigned_branch(owner_id,assigned.branch_id::text)
    )
  );

-- Owner and Managers with manage_services_pricing can manage only branch IDs
-- belonging to their current salon. This is independent of workspace autosave.
create or replace function studioflow_android_private.set_service_branches(
  p_service_id text,
  p_branch_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare actor uuid := (select auth.uid()); target_owner uuid; normalized uuid[];
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if exists (select 1 from public.studioflow_accounts a where a.user_id=actor) then
    target_owner:=actor;
  else
    target_owner:=public.studioflow_active_staff_owner();
    if target_owner is null or not public.studioflow_current_staff_can(target_owner,'manage_services_pricing') then
      raise exception 'Service catalogue management permission required' using errcode='42501';
    end if;
  end if;
  if p_service_id is null or length(btrim(p_service_id)) not between 1 and 200 then
    raise exception 'Invalid service ID' using errcode='22023';
  end if;
  select coalesce(array_agg(x.branch_id order by x.branch_id),'{}'::uuid[])
    into normalized
  from (select distinct branch_id from unnest(coalesce(p_branch_ids,'{}'::uuid[])) branch_id) x;
  if cardinality(normalized) <> cardinality(coalesce(p_branch_ids,'{}'::uuid[])) then
    raise exception 'Select each branch only once' using errcode='22023';
  end if;
  if cardinality(normalized)>50 or exists(select 1 from unnest(normalized) x(branch_id) where x.branch_id is null) then
    raise exception 'Choose up to 50 valid branches' using errcode='22023';
  end if;
  if target_owner<>actor and (
    cardinality(normalized)=0
    or exists(select 1 from unnest(normalized) x(branch_id)
              where not public.studioflow_is_assigned_branch(target_owner,x.branch_id::text))
  ) then
    raise exception 'Managers can only assign services to their active assigned branches' using errcode='42501';
  end if;
  if exists (
    select 1 from unnest(normalized) x(branch_id)
    where not exists (
      select 1 from public.branches b
      where b.id=x.branch_id and b.site_id=target_owner and b.is_active
    )
  ) then
    raise exception 'Choose active branches belonging to this salon' using errcode='42501';
  end if;
  update public.studioflow_services
  set branch_ids=case when cardinality(normalized)=0 then null else normalized end,
      updated_at=now()
  where owner_id=target_owner and service_id=p_service_id;
  if not found then raise exception 'Service not found in the selected salon catalogue' using errcode='P0002'; end if;
end;
$function$;

create or replace function public.studioflow_owner_set_service_branches(
  p_service_id text,
  p_branch_ids uuid[]
)
returns void
language sql
security invoker
set search_path to ''
as $function$
  select studioflow_android_private.set_service_branches(p_service_id,p_branch_ids)
$function$;

create or replace function public.studioflow_owner_service_branch_map()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare actor uuid:=(select auth.uid()); target_owner uuid;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if exists(select 1 from public.studioflow_accounts a where a.user_id=actor) then
    target_owner:=actor;
  else
    target_owner:=public.studioflow_active_staff_owner();
    if target_owner is null or not public.studioflow_current_staff_can(target_owner,'view_own_bookings') then
      raise exception 'Salon staff access required' using errcode='42501';
    end if;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('serviceId',s.service_id,'branchIds',s.branch_ids)
                     order by s.position,s.service_id)
    from public.studioflow_services s
    where s.owner_id=target_owner
      and coalesce(cardinality(s.branch_ids),0)>0
  ),'[]'::jsonb);
end;
$function$;

revoke all on function studioflow_android_private.set_service_branches(text,uuid[]) from public,anon;
grant execute on function studioflow_android_private.set_service_branches(text,uuid[]) to authenticated;
revoke all on function public.studioflow_owner_set_service_branches(text,uuid[]) from public,anon;
grant execute on function public.studioflow_owner_set_service_branches(text,uuid[]) to authenticated;
revoke all on function public.studioflow_owner_service_branch_map() from public,anon;
grant execute on function public.studioflow_owner_service_branch_map() to authenticated;

-- Add offered service IDs to the existing public branch listing; the menu
-- still comes from the published website and unassigned legacy rows stay global.
create or replace function public.studioflow_public_branches(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',b.id,'siteId',b.site_id,'name',b.name,'city',b.city,
      'address',b.address,'phone',b.phone,'isActive',b.is_active,
      'operatingHours',b.operating_hours,
      'serviceIds',coalesce((
        select jsonb_agg(published.value->>'id' order by published.ordinality)
        from jsonb_array_elements(coalesce(w.content->'services','[]'::jsonb))
             with ordinality published(value,ordinality)
        where not exists (
          select 1 from public.studioflow_services s
          where s.owner_id=b.site_id and s.service_id=published.value->>'id'
            and coalesce(cardinality(s.branch_ids),0)>0
            and not (b.id=any(s.branch_ids))
        )
      ),'[]'::jsonb)
    ) order by b.created_at,b.id
  ),'[]'::jsonb)
  from public.studioflow_websites w
  join public.branches b on b.site_id=w.owner_id and b.is_active
  where w.slug=p_slug;
$function$;

-- Branch-aware availability / booking guards.
CREATE OR REPLACE FUNCTION studioflow_private.branch_slots(p_slug text, p_services jsonb, p_date date, p_stylist text, p_branch uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w public.studioflow_websites; branch_row public.branches; v_draft jsonb; ids text[]; total_minutes int; matched_count int; lead_hours numeric; result jsonb; day_name text; branch_day jsonb; ist_today date:=(now() at time zone 'Asia/Kolkata')::date;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 select * into branch_row from public.branches where site_id=w.owner_id and id=p_branch and is_active;
 if w.owner_id is null or branch_row.id is null or jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 or p_date is null or p_date<ist_today or p_date>ist_today+90 then return '[]'::jsonb; end if;
 if exists(select 1 from jsonb_array_elements(p_services) el where jsonb_typeof(el)<>'string') then return '[]'::jsonb; end if;
 select array_agg(distinct value) into ids from jsonb_array_elements_text(p_services);
 if not studioflow_private.service_catalogue_available_at_branch(w.owner_id,p_services,p_branch) then return '[]'::jsonb; end if;
 select count(*),coalesce(sum(greatest(1,coalesce(nullif(s->>'durationMinutes','')::int,0))),0) into matched_count,total_minutes from jsonb_array_elements(w.content->'services') s where s->>'id'=any(ids);
 if coalesce(array_length(ids,1),0)<>jsonb_array_length(p_services) or total_minutes<=0 or matched_count<>array_length(ids,1) then return '[]'::jsonb; end if;
 day_name:=trim(to_char(p_date,'Day'));
 select value into branch_day from jsonb_array_elements(branch_row.operating_hours) value where value->>'day'=day_name limit 1;
 if branch_day is null or not coalesce((branch_day->>'enabled')::boolean,false) or nullif(btrim(branch_day->>'fromTime'),'') is null or nullif(btrim(branch_day->>'toTime'),'') is null or (branch_day->>'toTime')::time<=(branch_day->>'fromTime')::time then return '[]'::jsonb; end if;
 select draft into v_draft from public.studioflow_accounts where user_id=w.owner_id;
 lead_hours:=greatest(0,coalesce((w.content->'profile'->'bookingRules'->>'leadHours')::numeric,(v_draft->'extras'->>'bookingLeadHours')::numeric,0));
 with staff as (
   select s,sch.starts_at,sch.ends_at from public.studioflow_staff_branch_schedules sch
   join jsonb_array_elements(coalesce(v_draft->'stylists','[]'::jsonb)) s on s->>'id'=sch.staff_id
   where exists(select 1 from jsonb_array_elements(coalesce(w.content->'stylists','[]'::jsonb)) pub where pub->>'id'=s->>'id') and sch.site_id=w.owner_id and sch.branch_id=p_branch and sch.day_of_week=day_name and sch.is_active
     and (p_stylist in ('any','any-specialist','any_available') or sch.staff_id=p_stylist)
     and coalesce(s->>'status','Available')='Available'
     and (s->'assignedServices' is null or jsonb_typeof(s->'assignedServices')<>'array' or jsonb_array_length(s->'assignedServices')=0 or s->'assignedServices' @> to_jsonb(ids))
 ), candidates as (
   select staff.s->>'id' stylist_id,slot,slot+total_minutes*interval '1 minute' end_slot
   from staff cross join generate_series(p_date+(branch_day->>'fromTime')::time,p_date+(branch_day->>'toTime')::time,interval '30 minutes') slot
   where studioflow_private.booking_bundle_window_allowed(p_slug,p_services,p_date,staff.s->>'id',slot::time) and slot::time>=greatest(staff.starts_at,(branch_day->>'fromTime')::time) and slot+total_minutes*interval '1 minute'<=p_date+least(staff.ends_at,(branch_day->>'toTime')::time)
 ), available as (
   select to_char(slot,'HH24:MI') time,to_char(slot,'HH12:MI AM') label,stylist_id,
    (slot at time zone 'Asia/Kolkata')>now()+lead_hours*interval '1 hour'
    and (slot at time zone 'Asia/Kolkata')<=now()+interval '90 days'
    and not exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.stylist_id=c.stylist_id and b.status in ('pending','confirmed') and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now()) and b.starts_at<(end_slot at time zone 'Asia/Kolkata') and b.ends_at>(slot at time zone 'Asia/Kolkata')) as available from candidates c
 ), grouped as (select time,min(label) label,bool_or(available) available,min(stylist_id) filter(where available) "stylistId" from available group by time)
 select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('branchId',p_branch,'branchName',branch_row.name) order by time),'[]'::jsonb) into result from grouped g;
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.studioflow_branch_android_book(p_slug text, p_services jsonb, p_date date, p_time text, p_stylist text, p_name text, p_phone text, p_instructions text, p_request uuid, p_branch uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if p_branch is null then raise exception 'Choose a location before booking'; end if;
 if not studioflow_private.service_catalogue_available_at_branch((select w.owner_id from public.studioflow_websites w where w.slug=p_slug),p_services,p_branch) then raise exception 'One or more selected services are not offered at this location' using errcode='22023'; end if;
 perform set_config('studioflow.branch_id',p_branch::text,true);
 return studioflow_android_private.book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions,p_request);
end $function$
;

CREATE OR REPLACE FUNCTION public.studioflow_branch_coupon_book(p_slug text, p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if nullif(p_request->>'branchId','') is null then raise exception 'Choose a location before booking'; end if;
 if not studioflow_private.service_catalogue_available_at_branch((select w.owner_id from public.studioflow_websites w where w.slug=p_slug),p_request->'serviceIds',(p_request->>'branchId')::uuid) then raise exception 'One or more selected services are not offered at this location' using errcode='22023'; end if;
 perform set_config('studioflow.branch_id',(p_request->>'branchId'),true);
 return studioflow_private.coupon_book(p_slug,p_request);
end $function$
;

create or replace function public.studioflow_android_slots(
  p_slug text,p_services jsonb,p_date date,p_stylist text
)
returns jsonb
language sql
stable
set search_path to ''
as $function$
  select case
    when studioflow_private.service_catalogue_available_at_branch(
      (select w.owner_id from public.studioflow_websites w where w.slug=p_slug),
      p_services,null
    ) then studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)
    else '[]'::jsonb
  end;
$function$;

create or replace function public.studioflow_android_book(
  p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,
  p_name text,p_phone text,p_instructions text,p_request uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare target_owner uuid;
begin
  select w.owner_id into target_owner from public.studioflow_websites w where w.slug=p_slug;
  if not studioflow_private.service_catalogue_available_at_branch(target_owner,p_services,null) then
    raise exception 'Choose a branch that offers every selected service before booking' using errcode='22023';
  end if;
  return studioflow_android_private.book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions,p_request);
end;
$function$;

-- Preserve the pre-existing browser/service grant boundary explicitly.
revoke all on function public.studioflow_android_book(text,jsonb,date,text,text,text,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.studioflow_android_book(text,jsonb,date,text,text,text,text,text,uuid)
  to authenticated, service_role;

commit;
