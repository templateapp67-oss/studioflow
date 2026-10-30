begin;

-- Shared branch directory. Workspace JSON remains the write path; the trigger
-- below projects its validated location/schedule data into relational tables.
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  city text not null default '',
  address text not null default '',
  phone text not null default '',
  is_active boolean not null default true,
  operating_hours jsonb not null default '[]'::jsonb check (jsonb_typeof(operating_hours)='array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id,id),
  unique(site_id,name)
);
create index if not exists branches_active_site_idx on public.branches(site_id,is_active);
alter table public.branches enable row level security;
revoke all on public.branches from public;
grant select on public.branches to anon,authenticated;
grant insert,update,delete on public.branches to authenticated;
drop policy if exists branches_public_active_read on public.branches;
create policy branches_public_active_read on public.branches for select to anon,authenticated
  using (is_active and exists(select 1 from public.studioflow_websites w where w.owner_id=branches.site_id));
drop policy if exists branches_owner_manage on public.branches;
create policy branches_owner_manage on public.branches for all to authenticated
  using(site_id=(select auth.uid())) with check(site_id=(select auth.uid()));

create table if not exists public.studioflow_branch_staff_members (
  id uuid primary key default gen_random_uuid(), site_id uuid not null, branch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check(role in ('staff','manager')),
  can_manage_inventory boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(site_id,branch_id) references public.branches(site_id,id) on delete cascade,
  unique(site_id,branch_id,user_id)
);
create index if not exists studioflow_branch_staff_user_idx on public.studioflow_branch_staff_members(user_id,branch_id) where is_active;
alter table public.studioflow_branch_staff_members enable row level security;
revoke all on public.studioflow_branch_staff_members from public,anon;
grant select,insert,update,delete on public.studioflow_branch_staff_members to authenticated;
drop policy if exists branch_staff_owner_manage on public.studioflow_branch_staff_members;
create policy branch_staff_owner_manage on public.studioflow_branch_staff_members for all to authenticated
  using(site_id=(select auth.uid())) with check(site_id=(select auth.uid()));
drop policy if exists branch_staff_self_read on public.studioflow_branch_staff_members;
create policy branch_staff_self_read on public.studioflow_branch_staff_members for select to authenticated
  using(user_id=(select auth.uid()) and is_active);

create table if not exists public.studioflow_staff_branch_schedules (
  site_id uuid not null, branch_id uuid not null, staff_id text not null,
  day_of_week text not null check(day_of_week in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  starts_at time, ends_at time, is_active boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(site_id,branch_id,staff_id,day_of_week),
  foreign key(site_id,branch_id) references public.branches(site_id,id) on delete cascade,
  check((is_active and starts_at is not null and ends_at is not null and ends_at>starts_at) or not is_active)
);
create index if not exists studioflow_staff_branch_schedule_lookup on public.studioflow_staff_branch_schedules(site_id,branch_id,day_of_week,staff_id) where is_active;
alter table public.studioflow_staff_branch_schedules enable row level security;
revoke all on public.studioflow_staff_branch_schedules from public,anon;
grant select,insert,update,delete on public.studioflow_staff_branch_schedules to authenticated;
drop policy if exists branch_schedule_owner_manage on public.studioflow_staff_branch_schedules;
create policy branch_schedule_owner_manage on public.studioflow_staff_branch_schedules for all to authenticated
  using(site_id=(select auth.uid())) with check(site_id=(select auth.uid()));
drop policy if exists branch_schedule_staff_read on public.studioflow_staff_branch_schedules;
create policy branch_schedule_staff_read on public.studioflow_staff_branch_schedules for select to authenticated
  using(exists(select 1 from public.studioflow_branch_staff_members m where m.site_id=studioflow_staff_branch_schedules.site_id and m.branch_id=studioflow_staff_branch_schedules.branch_id and m.user_id=(select auth.uid()) and m.is_active));

create table if not exists public.studioflow_branch_inventory (
  id uuid primary key default gen_random_uuid(), site_id uuid not null, branch_id uuid not null,
  name text not null check(char_length(btrim(name)) between 1 and 160), sku text not null default '',
  quantity numeric(12,2) not null default 0 check(quantity>=0), unit text not null default 'unit',
  reorder_level numeric(12,2) not null default 0 check(reorder_level>=0), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(site_id,branch_id) references public.branches(site_id,id) on delete cascade,
  unique(site_id,branch_id,sku)
);
create index if not exists studioflow_branch_inventory_lookup on public.studioflow_branch_inventory(site_id,branch_id,is_active);
alter table public.studioflow_branch_inventory enable row level security;
revoke all on public.studioflow_branch_inventory from public,anon;
grant select,insert,update,delete on public.studioflow_branch_inventory to authenticated;
drop policy if exists branch_inventory_owner_manage on public.studioflow_branch_inventory;
create policy branch_inventory_owner_manage on public.studioflow_branch_inventory for all to authenticated
  using(site_id=(select auth.uid())) with check(site_id=(select auth.uid()));
drop policy if exists branch_inventory_staff_manage on public.studioflow_branch_inventory;
create policy branch_inventory_staff_manage on public.studioflow_branch_inventory for all to authenticated
  using(exists(select 1 from public.studioflow_branch_staff_members m where m.site_id=studioflow_branch_inventory.site_id and m.branch_id=studioflow_branch_inventory.branch_id and m.user_id=(select auth.uid()) and m.is_active and m.can_manage_inventory))
  with check(exists(select 1 from public.studioflow_branch_staff_members m where m.site_id=studioflow_branch_inventory.site_id and m.branch_id=studioflow_branch_inventory.branch_id and m.user_id=(select auth.uid()) and m.is_active and m.can_manage_inventory));

-- Add branch identity to shared appointments and keep the historical payload intact.
alter table public.studioflow_bookings add column if not exists branch_id uuid;
alter table public.studioflow_bookings drop constraint if exists studioflow_bookings_branch_fk;
alter table public.studioflow_bookings add constraint studioflow_bookings_branch_fk foreign key(owner_id,branch_id) references public.branches(site_id,id) on delete restrict;
create index if not exists studioflow_bookings_branch_calendar_idx on public.studioflow_bookings(owner_id,branch_id,starts_at) where branch_id is not null;
drop policy if exists studioflow_bookings_branch_staff_read on public.studioflow_bookings;
create policy studioflow_bookings_branch_staff_read on public.studioflow_bookings for select to authenticated
  using(branch_id is not null and exists(select 1 from public.studioflow_branch_staff_members m where m.site_id=studioflow_bookings.owner_id and m.branch_id=studioflow_bookings.branch_id and m.user_id=(select auth.uid()) and m.is_active));

-- Backfill one safe primary location for all existing tenants before installing
-- synchronization, so existing single-location booking flows keep working.
insert into public.branches(site_id,name,city,address,phone,is_active,operating_hours)
select a.user_id,
  left(coalesce(nullif(btrim(a.draft->'profile'->>'businessName'),''),'Main location'),120),
  coalesce(a.draft->'profile'->>'city',''), coalesce(a.draft->'profile'->>'address',''),
  coalesce(a.draft->'profile'->>'phone',''), true,
  coalesce((select jsonb_agg(jsonb_build_object('day',d,'enabled',d<>'Sunday','fromTime','09:00','toTime','20:00')) from unnest(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) d),'[]'::jsonb)
from public.studioflow_accounts a where not exists(select 1 from public.branches b where b.site_id=a.user_id)
on conflict(site_id,name) do nothing;
create or replace function studioflow_private.sync_branches_from_workspace() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  profile jsonb:=coalesce(new.draft->'profile','{}'::jsonb); branch_data jsonb:=profile->'branches'; item jsonb; branch_key uuid;
  stylist jsonb; schedule_item jsonb; day_name text; hours jsonb; branch_row record; stylist_schedule jsonb; branch_schedule jsonb; raw_day jsonb;
  branch_ids uuid[]:='{}';
begin
  if jsonb_typeof(branch_data)='array' and jsonb_array_length(branch_data)>0 then
    if jsonb_array_length(branch_data)>50 then raise exception 'A maximum of 50 locations is supported'; end if;
    for item in select value from jsonb_array_elements(branch_data) loop
      begin branch_key:=(item->>'id')::uuid; exception when others then raise exception 'Each location needs a valid ID'; end;
      if coalesce(btrim(item->>'name'),'')='' then raise exception 'Each location needs a name'; end if;
      insert into public.branches(id,site_id,name,city,address,phone,is_active,operating_hours,updated_at)
      values(branch_key,new.user_id,left(btrim(item->>'name'),120),left(coalesce(item->>'city',''),120),left(coalesce(item->>'address',''),500),left(coalesce(item->>'phone',''),40),coalesce((item->>'isActive')::boolean,true),coalesce(item->'operatingHours','[]'::jsonb),now())
      on conflict(site_id,id) do update set name=excluded.name,city=excluded.city,address=excluded.address,phone=excluded.phone,is_active=excluded.is_active,operating_hours=excluded.operating_hours,updated_at=now();
      branch_ids:=array_append(branch_ids,branch_key);
    end loop;
    update public.branches set is_active=false,updated_at=now() where site_id=new.user_id and not(id=any(branch_ids));
  else
    select array_agg(id) into branch_ids from public.branches where site_id=new.user_id and is_active;
    if coalesce(array_length(branch_ids,1),0)=0 then
      insert into public.branches(site_id,name,city,address,phone,is_active,operating_hours)
      values(new.user_id,left(coalesce(nullif(btrim(profile->>'businessName'),''),'Main location'),120),coalesce(profile->>'city',''),coalesce(profile->>'address',''),coalesce(profile->>'phone',''),true,
        coalesce((select jsonb_agg(jsonb_build_object('day',d,'enabled',d<>'Sunday','fromTime','09:00','toTime','20:00')) from unnest(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']) d),'[]'::jsonb))
      on conflict(site_id,name) do update set is_active=true,updated_at=now() returning id into branch_key;
      branch_ids:=array[branch_key];
    end if;
  end if;

  delete from public.studioflow_staff_branch_schedules where site_id=new.user_id;
  for stylist in select value from jsonb_array_elements(coalesce(new.draft->'stylists','[]'::jsonb)) loop
    if coalesce(stylist->>'id','')='' then continue; end if;
    stylist_schedule:=coalesce(stylist->'schedule','[]'::jsonb);
    for branch_row in select id,operating_hours from public.branches where site_id=new.user_id and is_active loop
      branch_schedule:=null;
      if jsonb_typeof(stylist->'branchSchedules')='array' then
        select value->'schedule' into branch_schedule from jsonb_array_elements(stylist->'branchSchedules') value where value->>'branchId'=branch_row.id::text limit 1;
        if branch_schedule is null then continue; end if;
      else
        branch_schedule:=stylist_schedule;
        if jsonb_typeof(branch_schedule)<>'array' or jsonb_array_length(branch_schedule)=0 then branch_schedule:=branch_row.operating_hours; end if;
      end if;
      for schedule_item in select value from jsonb_array_elements(coalesce(branch_schedule,'[]'::jsonb)) loop
        day_name:=schedule_item->>'day';
        if day_name not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') then continue; end if;
        insert into public.studioflow_staff_branch_schedules(site_id,branch_id,staff_id,day_of_week,starts_at,ends_at,is_active)
        values(new.user_id,branch_row.id,stylist->>'id',day_name,
          case when coalesce((schedule_item->>'enabled')::boolean,false) then (schedule_item->>'fromTime')::time end,
          case when coalesce((schedule_item->>'enabled')::boolean,false) then (schedule_item->>'toTime')::time end,
          coalesce((schedule_item->>'enabled')::boolean,false) and (schedule_item->>'fromTime') is not null and (schedule_item->>'toTime') is not null and (schedule_item->>'toTime')::time>(schedule_item->>'fromTime')::time)
        on conflict(site_id,branch_id,staff_id,day_of_week) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,is_active=excluded.is_active,updated_at=now();
      end loop;
    end loop;
  end loop;
  return new;
end $$;
revoke all on function studioflow_private.sync_branches_from_workspace() from public,anon,authenticated;
drop trigger if exists studioflow_sync_branches_after_workspace on public.studioflow_accounts;
create trigger studioflow_sync_branches_after_workspace after insert or update of draft on public.studioflow_accounts for each row execute function studioflow_private.sync_branches_from_workspace();

-- Project the current drafts after the sync trigger is installed, then attach
-- historical reservations to a surviving primary location without rewriting payloads.
update public.studioflow_accounts set draft=draft;
update public.studioflow_bookings b set branch_id=(select id from public.branches x where x.site_id=b.owner_id and x.is_active order by x.created_at,x.id limit 1)
where b.branch_id is null and exists(select 1 from public.branches x where x.site_id=b.owner_id and x.is_active);

create or replace function studioflow_private.branch_is_open(p_branch uuid,p_day date,p_start time,p_end time) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.branches b cross join lateral jsonb_array_elements(b.operating_hours) h
  where b.id=p_branch and b.is_active and h->>'day'=trim(to_char(p_day,'Day')) and coalesce((h->>'enabled')::boolean,false)
   and p_start>=(h->>'fromTime')::time and p_end<=(h->>'toTime')::time)
$$;
revoke all on function studioflow_private.branch_is_open(uuid,date,time,time) from public,anon,authenticated;

create or replace function studioflow_private.validate_studioflow_booking_branch() returns trigger
language plpgsql security definer set search_path='' as $$
declare selected uuid; local_day date; local_start time; local_end time;
begin
  selected:=coalesce(new.branch_id,nullif(current_setting('studioflow.branch_id',true),'')::uuid,nullif(new.payload->>'branchId','')::uuid);
  if selected is null then
    select id into selected from public.branches where site_id=new.owner_id and is_active order by created_at,id limit 1;
    if (select count(*) from public.branches where site_id=new.owner_id and is_active)>1 then raise exception 'Choose a location before booking'; end if;
  end if;
  if not exists(select 1 from public.branches where site_id=new.owner_id and id=selected and is_active) then raise exception 'Selected location is unavailable'; end if;
  local_day:=(new.starts_at at time zone 'Asia/Kolkata')::date; local_start:=(new.starts_at at time zone 'Asia/Kolkata')::time; local_end:=(new.ends_at at time zone 'Asia/Kolkata')::time;
  if not exists(select 1 from public.studioflow_staff_branch_schedules s where s.site_id=new.owner_id and s.branch_id=selected and s.staff_id=new.stylist_id and s.day_of_week=trim(to_char(local_day,'Day')) and s.is_active and local_start>=s.starts_at and local_end<=s.ends_at)
     or not studioflow_private.branch_is_open(selected,local_day,local_start,local_end) then raise exception 'Specialist is not available at this location and time'; end if;
  new.branch_id:=selected;
  new.payload:=coalesce(new.payload,'{}'::jsonb)||jsonb_build_object('branchId',selected,'branchName',(select name from public.branches where id=selected));
  return new;
end $$;
revoke all on function studioflow_private.validate_studioflow_booking_branch() from public,anon,authenticated;
drop trigger if exists studioflow_booking_branch_guard on public.studioflow_bookings;
create trigger studioflow_booking_branch_guard before insert or update of branch_id,stylist_id,starts_at,ends_at on public.studioflow_bookings for each row execute function studioflow_private.validate_studioflow_booking_branch();

create or replace function studioflow_private.branch_slots(p_slug text,p_services jsonb,p_date date,p_stylist text,p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; branch_row public.branches; ids text[]; total_minutes int; result jsonb; day_name text; branch_day jsonb;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 select * into branch_row from public.branches where site_id=w.owner_id and id=p_branch and is_active;
 if w.owner_id is null or branch_row.id is null or jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 or p_date<current_date or p_date>current_date+90 then return '[]'::jsonb; end if;
 select array_agg(distinct value) into ids from jsonb_array_elements_text(p_services);
 select coalesce(sum(greatest(1,(s->>'durationMinutes')::int)),0) into total_minutes from jsonb_array_elements(w.content->'services') s where s->>'id'=any(ids);
 if coalesce(array_length(ids,1),0)<>jsonb_array_length(p_services) or total_minutes<=0 or (select count(*) from jsonb_array_elements(w.content->'services') s where s->>'id'=any(ids))<>array_length(ids,1) then return '[]'::jsonb; end if;
 day_name:=trim(to_char(p_date,'Day'));
 select value into branch_day from jsonb_array_elements(branch_row.operating_hours) value where value->>'day'=day_name limit 1;
 if branch_day is null or not coalesce((branch_day->>'enabled')::boolean,false) then return '[]'::jsonb; end if;
 with staff as (
   select s,sch.starts_at,sch.ends_at from public.studioflow_staff_branch_schedules sch
   join jsonb_array_elements(w.content->'stylists') s on s->>'id'=sch.staff_id
   where sch.site_id=w.owner_id and sch.branch_id=p_branch and sch.day_of_week=day_name and sch.is_active
     and (p_stylist in ('any','any-specialist','any_available') or sch.staff_id=p_stylist)
     and coalesce(s->>'status','Available')='Available'
     and (s->'assignedServices' is null or jsonb_typeof(s->'assignedServices')<>'array' or jsonb_array_length(s->'assignedServices')=0 or exists(select 1 from jsonb_array_elements_text(s->'assignedServices') a where a=any(ids)))
 ), candidates as (
   select staff.s->>'id' stylist_id,slot,slot+total_minutes*interval '1 minute' end_slot
   from staff cross join generate_series(p_date+(branch_day->>'fromTime')::time,p_date+(branch_day->>'toTime')::time,interval '30 minutes') slot
   where slot::time>=greatest(staff.starts_at,(branch_day->>'fromTime')::time) and (slot+total_minutes*interval '1 minute')::time<=least(staff.ends_at,(branch_day->>'toTime')::time)
 ), available as (
   select to_char(slot,'HH24:MI') time,to_char(slot,'HH12:MI AM') label,stylist_id,
    slot at time zone 'Asia/Kolkata'>now() and slot<=now()+interval '90 days'
    and slot at time zone 'Asia/Kolkata'>now()+greatest(0,coalesce((w.content->'profile'->'bookingRules'->>'leadHours')::numeric,0))*interval '1 hour'
    and not exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.branch_id=p_branch and b.stylist_id=c.stylist_id and b.status in ('pending','confirmed') and b.starts_at<(end_slot at time zone 'Asia/Kolkata') and b.ends_at>slot at time zone 'Asia/Kolkata') as available from candidates c
 ), grouped as (select time,min(label) label,bool_or(available) available,min(stylist_id) filter(where available) "stylistId" from available group by time)
 select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('branchId',p_branch,'branchName',branch_row.name) order by time),'[]'::jsonb) into result from grouped g;
 return result;
end $$;
revoke all on function studioflow_private.branch_slots(text,jsonb,date,text,uuid) from public,anon,authenticated;
grant execute on function studioflow_private.branch_slots(text,jsonb,date,text,uuid) to anon,authenticated,service_role;

-- Route the existing private validators through the selected branch inside the
-- booking transaction while preserving their original non-branch behaviour.
do $$ begin
  if to_regprocedure('studioflow_private.availability_unbranched(text,text,date,text)') is null and to_regprocedure('studioflow_private.availability(text,text,date,text)') is not null then
    alter function studioflow_private.availability(text,text,date,text) rename to availability_unbranched;
  end if;
  if to_regprocedure('studioflow_android_private.slots_unbranched(text,jsonb,date,text)') is null and to_regprocedure('studioflow_android_private.slots(text,jsonb,date,text)') is not null then
    alter function studioflow_android_private.slots(text,jsonb,date,text) rename to slots_unbranched;
  end if;
end $$;
create or replace function studioflow_private.availability(p_slug text,p_service_id text,p_date date,p_stylist_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare selected text:=nullif(current_setting('studioflow.branch_id',true),'');
begin
 if selected is not null then return studioflow_private.branch_slots(p_slug,jsonb_build_array(p_service_id),p_date,p_stylist_id,selected::uuid); end if;
 return studioflow_private.availability_unbranched(p_slug,p_service_id,p_date,p_stylist_id);
end $$;
create or replace function studioflow_android_private.slots(p_slug text,p_services jsonb,p_date date,p_stylist text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare selected text:=nullif(current_setting('studioflow.branch_id',true),'');
begin
 if selected is not null then return studioflow_private.branch_slots(p_slug,p_services,p_date,p_stylist,selected::uuid); end if;
 return studioflow_android_private.slots_unbranched(p_slug,p_services,p_date,p_stylist);
end $$;
revoke all on function studioflow_private.availability(text,text,date,text),studioflow_private.availability_unbranched(text,text,date,text),studioflow_android_private.slots(text,jsonb,date,text),studioflow_android_private.slots_unbranched(text,jsonb,date,text) from public,anon,authenticated;
grant execute on function studioflow_private.availability(text,text,date,text) to anon,authenticated,service_role;
grant execute on function studioflow_android_private.slots(text,jsonb,date,text) to anon,authenticated,service_role;

create or replace function public.studioflow_public_branches(p_slug text) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'siteId',b.site_id,'name',b.name,'city',b.city,'address',b.address,'phone',b.phone,'isActive',b.is_active,'operatingHours',b.operating_hours) order by b.created_at,b.id),'[]'::jsonb)
 from public.studioflow_websites w join public.branches b on b.site_id=w.owner_id and b.is_active where w.slug=p_slug
$$;
revoke all on function public.studioflow_public_branches(text) from public;
grant execute on function public.studioflow_public_branches(text) to anon,authenticated;

create or replace function public.studioflow_branch_specialists(p_slug text,p_service_id text,p_branch uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; service_row jsonb; result jsonb;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null or not exists(select 1 from public.branches where site_id=w.owner_id and id=p_branch and is_active) then return jsonb_build_object('published',false,'specialistIds','[]'::jsonb); end if;
 select value into service_row from jsonb_array_elements(w.content->'services') value where value->>'id'=p_service_id;
 if service_row is null then return jsonb_build_object('published',true,'specialistIds','[]'::jsonb); end if;
 select coalesce(jsonb_agg(s->>'id' order by s->>'name'),'[]'::jsonb) into result from jsonb_array_elements(w.content->'stylists') s
 where coalesce(s->>'status','Available')='Available' and exists(select 1 from public.studioflow_staff_branch_schedules x where x.site_id=w.owner_id and x.branch_id=p_branch and x.staff_id=s->>'id' and x.is_active)
 and (s->'assignedServices' is null or jsonb_typeof(s->'assignedServices')<>'array' or jsonb_array_length(s->'assignedServices')=0 or exists(select 1 from jsonb_array_elements_text(s->'assignedServices') a where a=p_service_id));
 return jsonb_build_object('published',true,'specialistIds',result);
end $$;
revoke all on function public.studioflow_branch_specialists(text,text,uuid) from public;
grant execute on function public.studioflow_branch_specialists(text,text,uuid) to anon,authenticated;

create or replace function public.studioflow_branch_available_slots(p_slug text,p_service_id text,p_date date,p_stylist text,p_branch uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select studioflow_private.branch_slots(p_slug,jsonb_build_array(p_service_id),p_date,p_stylist,p_branch)$$;
create or replace function public.studioflow_branch_android_slots(p_slug text,p_services jsonb,p_date date,p_stylist text,p_branch uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select studioflow_private.branch_slots(p_slug,p_services,p_date,p_stylist,p_branch)$$;
revoke all on function public.studioflow_branch_available_slots(text,text,date,text,uuid),public.studioflow_branch_android_slots(text,jsonb,date,text,uuid) from public;
grant execute on function public.studioflow_branch_available_slots(text,text,date,text,uuid),public.studioflow_branch_android_slots(text,jsonb,date,text,uuid) to anon,authenticated;

create or replace function public.studioflow_branch_book(p_slug text,p_request jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare branch_key uuid:=nullif(p_request->>'branchId','')::uuid; result jsonb;
begin
 if branch_key is null then raise exception 'Choose a location before booking'; end if;
 perform set_config('studioflow.branch_id',branch_key::text,true);
 result:=studioflow_private.book_with_addons(p_slug,p_request);
 return result;
end $$;
revoke all on function public.studioflow_branch_book(text,jsonb) from public;
grant execute on function public.studioflow_branch_book(text,jsonb) to authenticated;

create or replace function public.studioflow_branch_android_book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_instructions text,p_request uuid,p_branch uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if p_branch is null then raise exception 'Choose a location before booking'; end if;
 perform set_config('studioflow.branch_id',p_branch::text,true);
 return studioflow_android_private.book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions,p_request);
end $$;
revoke all on function public.studioflow_branch_android_book(text,jsonb,date,text,text,text,text,text,uuid,uuid) from public;
grant execute on function public.studioflow_branch_android_book(text,jsonb,date,text,text,text,text,text,uuid,uuid) to authenticated;

create or replace function public.studioflow_branch_coupon_book(p_slug text,p_request jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if nullif(p_request->>'branchId','') is null then raise exception 'Choose a location before booking'; end if;
 perform set_config('studioflow.branch_id',(p_request->>'branchId'),true);
 return studioflow_private.coupon_book(p_slug,p_request);
end $$;
revoke all on function public.studioflow_branch_coupon_book(text,jsonb) from public;
grant execute on function public.studioflow_branch_coupon_book(text,jsonb) to authenticated;

create or replace function public.studioflow_owner_walk_in(p_request jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if nullif(p_request->>'branchId','') is not null then perform set_config('studioflow.branch_id',(p_request->>'branchId'),true); end if;
 return studioflow_private.owner_walk_in(p_request);
end $$;
revoke all on function public.studioflow_owner_walk_in(jsonb) from public,anon,authenticated;
grant execute on function public.studioflow_owner_walk_in(jsonb) to authenticated;

create or replace function public.studioflow_android_reschedule(p_booking uuid,p_date date,p_time text,p_stylist text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare selected uuid;
begin
 select branch_id into selected from public.studioflow_bookings where id=p_booking and customer_id=(select auth.uid());
 if selected is not null then perform set_config('studioflow.branch_id',selected::text,true); end if;
 return studioflow_android_private.reschedule(p_booking,p_date,p_time,p_stylist);
end $$;
revoke all on function public.studioflow_android_reschedule(uuid,date,text,text) from public,anon,authenticated;
grant execute on function public.studioflow_android_reschedule(uuid,date,text,text) to authenticated;

-- Iron & Ink branch links. NULL schedule rows retain the legacy shared schedule;
-- branch-specific rows override those defaults for that branch and weekday.
alter table public.ink_bookings add column if not exists branch_id uuid;
alter table public.ink_bookings drop constraint if exists ink_bookings_branch_fk;
alter table public.ink_bookings add constraint ink_bookings_branch_fk foreign key(site_id,branch_id) references public.branches(site_id,id) on delete restrict;
drop policy if exists ink_bookings_branch_staff_read on public.ink_bookings;
create policy ink_bookings_branch_staff_read on public.ink_bookings for select to authenticated
  using(branch_id is not null and exists(select 1 from public.studioflow_branch_staff_members m where m.site_id=ink_bookings.site_id and m.branch_id=ink_bookings.branch_id and m.user_id=(select auth.uid()) and m.is_active));
update public.ink_bookings b set branch_id=(select id from public.branches x where x.site_id=b.site_id and x.is_active order by x.created_at,x.id limit 1)
where b.branch_id is null and exists(select 1 from public.branches x where x.site_id=b.site_id and x.is_active);
create index if not exists ink_bookings_branch_calendar_idx on public.ink_bookings(site_id,branch_id,booking_date,start_time) where branch_id is not null;
alter table public.ink_availability add column if not exists branch_id uuid;
alter table public.ink_availability drop constraint if exists ink_availability_branch_fk;
alter table public.ink_availability add constraint ink_availability_branch_fk foreign key(site_id,branch_id) references public.branches(site_id,id) on delete cascade;
alter table public.ink_availability drop constraint if exists ink_availability_site_id_artist_id_day_of_week_start_time_key;
create unique index if not exists ink_availability_branch_unique_idx on public.ink_availability(site_id,artist_id,day_of_week,start_time,coalesce(branch_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists ink_availability_branch_lookup_idx on public.ink_availability(site_id,branch_id,artist_id,day_of_week) where not is_off;
alter table public.ink_blocked_dates add column if not exists branch_id uuid;
alter table public.ink_blocked_dates drop constraint if exists ink_blocked_dates_branch_fk;
alter table public.ink_blocked_dates add constraint ink_blocked_dates_branch_fk foreign key(site_id,branch_id) references public.branches(site_id,id) on delete cascade;
alter table public.ink_blocked_dates drop constraint if exists ink_blocked_dates_site_id_artist_id_date_key;
create unique index if not exists ink_blocked_dates_branch_unique_idx on public.ink_blocked_dates(site_id,artist_id,date,coalesce(branch_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists ink_blocked_dates_branch_lookup_idx on public.ink_blocked_dates(site_id,branch_id,date);

create or replace function studioflow_private.validate_ink_booking_branch() returns trigger
language plpgsql security definer set search_path='' as $$
declare selected uuid;
begin
 selected:=coalesce(new.branch_id,nullif(current_setting('studioflow.branch_id',true),'')::uuid);
 if selected is null then
   select id into selected from public.branches where site_id=new.site_id and is_active order by created_at,id limit 1;
   if (select count(*) from public.branches where site_id=new.site_id and is_active)>1 then raise exception 'Choose a location before booking'; end if;
 end if;
 if not exists(select 1 from public.branches where site_id=new.site_id and id=selected and is_active) then raise exception 'Selected location is unavailable'; end if;
 if not exists(select 1 from public.get_branch_available_slots(new.site_id,new.artist_id,new.booking_date,coalesce((select c.duration_min from public.ink_categories c where c.site_id=new.site_id and c.id=new.category_id),60),selected) a where a.start_time=new.start_time) then raise exception 'Artist is unavailable at this location and time'; end if;
 new.branch_id:=selected;
 return new;
end $$;
revoke all on function studioflow_private.validate_ink_booking_branch() from public,anon,authenticated;
drop trigger if exists ink_booking_branch_guard on public.ink_bookings;
create trigger ink_booking_branch_guard before insert or update of branch_id,artist_id,booking_date,start_time,category_id on public.ink_bookings for each row execute function studioflow_private.validate_ink_booking_branch();

create or replace function public.get_branch_available_slots(p_site_id uuid,p_artist_id uuid,p_date date,p_duration_min integer,p_branch_id uuid)
returns table(start_time time,end_time time) language sql stable security definer set search_path='' as $$
 with day_info as (
   select b.operating_hours,trim(to_char(p_date,'Day')) day_name from public.branches b where b.site_id=p_site_id and b.id=p_branch_id and b.is_active
 ), hours as (
   select (h->>'fromTime')::time open_time,(h->>'toTime')::time close_time from day_info d cross join lateral jsonb_array_elements(d.operating_hours) h where h->>'day'=d.day_name and coalesce((h->>'enabled')::boolean,false)
 ), windows as (
   select a.start_time avail_start,a.end_time avail_end from public.ink_availability a
   where a.site_id=p_site_id and a.artist_id=p_artist_id and a.day_of_week=extract(dow from p_date)::int and not a.is_off
     and (a.branch_id=p_branch_id or (a.branch_id is null and not exists(select 1 from public.ink_availability specific where specific.site_id=a.site_id and specific.artist_id=a.artist_id and specific.day_of_week=a.day_of_week and specific.branch_id=p_branch_id)))
 ), slots as (
   select s.slot::time slot_start,(s.slot+make_interval(mins=>greatest(p_duration_min,30)))::time slot_end,h.open_time,h.close_time
   from windows w cross join hours h cross join lateral generate_series((p_date+w.avail_start)::timestamp,(p_date+w.avail_end-make_interval(mins=>greatest(p_duration_min,30)))::timestamp,interval '30 minutes') s(slot)
   where s.slot::time>=h.open_time and (s.slot+make_interval(mins=>greatest(p_duration_min,30)))::time<=h.close_time
 )
 select s.slot_start,s.slot_end from slots s
 where p_date>=current_date
 and not exists(select 1 from public.ink_blocked_dates d where d.site_id=p_site_id and d.date=p_date and (d.artist_id=p_artist_id or d.artist_id is null) and (d.branch_id=p_branch_id or d.branch_id is null))
 and not exists(select 1 from public.ink_bookings b where b.site_id=p_site_id and b.branch_id=p_branch_id and b.artist_id=p_artist_id and b.booking_date=p_date and b.status<>'cancelled' and tsrange(p_date+b.start_time,p_date+b.start_time+make_interval(mins=>greatest(coalesce((select c.duration_min from public.ink_categories c where c.site_id=b.site_id and c.id=b.category_id),60),30)),'[)') && tsrange(p_date+s.slot_start,p_date+s.slot_end,'[)'))
 order by s.slot_start
$$;
revoke all on function public.get_branch_available_slots(uuid,uuid,date,integer,uuid) from public;
grant execute on function public.get_branch_available_slots(uuid,uuid,date,integer,uuid) to anon,authenticated;

-- Preserve Template 12 age, rate-limit, category and overlap protections while
-- making its schedule and collision checks branch-specific.
create or replace function studioflow_ink_private.validate_booking_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare cat public.ink_categories; settings public.ink_studio_settings; digits text; age integer; duration integer;
begin
 if new.site_id is null or not exists(select 1 from public.studioflow_accounts where user_id=new.site_id) then raise exception 'Unknown StudioFlow site'; end if;
 if TG_OP='UPDATE' and auth.uid() is distinct from new.site_id then
   if new.status<>'cancelled' or (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Customers may only cancel their own booking'; end if;
   return new;
 end if;
 if TG_OP='INSERT' then
  digits:=regexp_replace(new.phone,'[^0-9]','','g');
  if length(digits)<10 or length(digits)>15 then raise exception 'Enter a valid phone number'; end if;
  if new.email<>'' and new.email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'Enter a valid email address'; end if;
  select * into settings from public.ink_studio_settings where site_id=new.site_id;
  if settings.site_id is not null then
   if new.customer_birth_date is null then raise exception 'Date of birth is required to verify the studio age policy'; end if;
   age:=date_part('year',age(current_date,new.customer_birth_date));
   if age<settings.min_age then raise exception 'Clients must be at least % years old',settings.min_age; end if;
  end if;
  select * into cat from public.ink_categories where site_id=new.site_id and id=new.category_id and is_active;
  if cat.id is null then raise exception 'Choose an active tattoo category'; end if;
  if not exists(select 1 from public.ink_artists where site_id=new.site_id and id=new.artist_id and is_active) then raise exception 'Choose an active artist'; end if;
  duration:=greatest(coalesce(cat.duration_min,60),30);
  perform pg_advisory_xact_lock(hashtextextended(new.site_id::text||coalesce(new.branch_id::text,'')||new.artist_id::text||new.booking_date::text,12));
  if new.booking_date<current_date then raise exception 'Choose a future booking date'; end if;
  if (select count(*) from public.ink_bookings b where b.site_id=new.site_id and regexp_replace(b.phone,'[^0-9]','','g')=digits and b.created_at>now()-interval '10 minutes')>=3 then raise exception 'Too many booking attempts. Please try again later.'; end if;
  if new.branch_id is not null then
   if not exists(select 1 from public.get_branch_available_slots(new.site_id,new.artist_id,new.booking_date,duration,new.branch_id) s where s.start_time=new.start_time) then raise exception 'That time is not available at this location. Please choose another slot.'; end if;
  elsif not exists(select 1 from public.get_available_slots(new.site_id,new.artist_id,new.booking_date,duration) s where s.start_time=new.start_time) then raise exception 'That time is not available. Please choose another slot.'; end if;
  if exists(select 1 from public.ink_bookings b where b.site_id=new.site_id and b.branch_id is not distinct from new.branch_id and b.artist_id=new.artist_id and b.booking_date=new.booking_date and b.status<>'cancelled' and tsrange(new.booking_date+new.start_time,(new.booking_date+new.start_time)+(duration||' minutes')::interval,'[)') && tsrange(b.booking_date+b.start_time,(b.booking_date+b.start_time)+(greatest(coalesce((select c.duration_min from public.ink_categories c where c.site_id=b.site_id and c.id=b.category_id),60),30)||' minutes')::interval,'[)')) then raise exception 'This artist already has a booking at that location and time'; end if;
  if cardinality(new.reference_images)>0 and exists(select 1 from unnest(new.reference_images) p where p !~ ('^'||new.site_id::text||'/')) then raise exception 'Reference images must use this site storage path'; end if;
 end if;
 return new;
end $$;
revoke all on function studioflow_ink_private.validate_booking_write() from public,anon,authenticated;

create or replace function public.create_branch_booking(p_site_id uuid,p_branch_id uuid,p_customer_name text,p_phone text,p_email text,p_category_id uuid,p_artist_id uuid,p_booking_date date,p_start_time time,p_customer_birth_date date,p_size_cm numeric default null,p_placement text default '',p_description text default '',p_reference_images text[] default '{}')
returns public.ink_bookings language plpgsql security invoker set search_path='' as $$
declare r public.ink_bookings;
begin
 if p_branch_id is null then raise exception 'Choose a location before booking'; end if;
 perform set_config('studioflow.branch_id',p_branch_id::text,true);
 select * into r from public.create_booking(p_site_id,p_customer_name,p_phone,p_email,p_category_id,p_artist_id,p_booking_date,p_start_time,p_customer_birth_date,p_size_cm,p_placement,p_description,p_reference_images);
 return r;
end $$;
revoke all on function public.create_branch_booking(uuid,uuid,text,text,text,uuid,uuid,date,time,date,numeric,text,text,text[]) from public;
grant execute on function public.create_branch_booking(uuid,uuid,text,text,text,uuid,uuid,date,time,date,numeric,text,text,text[]) to anon,authenticated;

-- Include branches in Template 12's existing public read projection.
create or replace function public.get_template12_site(p_site_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 select jsonb_build_object(
  'site_id',p_site_id,
  'branches',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'site_id',b.site_id,'name',b.name,'city',b.city,'address',b.address,'phone',b.phone,'is_active',b.is_active,'operating_hours',b.operating_hours) order by b.created_at,b.id) from public.branches b where b.site_id=p_site_id and b.is_active),'[]'::jsonb),
  'settings',(select to_jsonb(s) from public.ink_studio_settings s where s.site_id=p_site_id),
  'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.name) from public.ink_categories c where c.site_id=p_site_id and c.is_active),'[]'::jsonb),
  'artists',coalesce((select jsonb_agg(to_jsonb(a) order by a.sort_order,a.name) from public.ink_artists a where a.site_id=p_site_id and a.is_active),'[]'::jsonb),
  'portfolio',coalesce((select jsonb_agg(to_jsonb(p) order by p.is_featured desc,p.sort_order,p.created_at desc) from public.ink_portfolio p where p.site_id=p_site_id and p.is_published),'[]'::jsonb),
  'pricing',coalesce((select jsonb_agg(to_jsonb(p) order by p.price) from public.ink_pricing_plans p where p.site_id=p_site_id and p.is_active),'[]'::jsonb),
  'testimonials',coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order,t.created_at desc) from public.ink_testimonials t where t.site_id=p_site_id and t.is_published),'[]'::jsonb),
  'faqs',coalesce((select jsonb_agg(to_jsonb(f) order by f.sort_order) from public.ink_faqs f where f.site_id=p_site_id),'[]'::jsonb),
  'aftercare',coalesce((select jsonb_agg(to_jsonb(a) order by a.step_no) from public.ink_aftercare a where a.site_id=p_site_id),'[]'::jsonb),
  'blog',coalesce((select jsonb_agg(to_jsonb(b) order by b.published_at desc nulls last) from public.ink_blog_posts b where b.site_id=p_site_id and b.is_published),'[]'::jsonb)
 ) into result;
 if result->'settings'='null'::jsonb then return null; end if; return result;
end $$;
revoke all on function public.get_template12_site(uuid) from public;
grant execute on function public.get_template12_site(uuid) to anon,authenticated;

commit;
