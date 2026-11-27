-- One authoritative, tenant-scoped availability calculation for the directory,
-- storefronts and the booking guards. No customer/appointment table is made public.
begin;

-- Earlier workspace projections also copied salon hours into staff shifts and
-- copied personal schedules to every branch. Their rows have no reliable
-- provenance. Keep them for owner review, but do not treat them as proof of a
-- shift. New owner-managed writes are identifiable and remain intact across
-- unrelated workspace saves.
alter table public.studioflow_staff_branch_schedules add column if not exists schedule_source text;
update public.studioflow_staff_branch_schedules set schedule_source='legacy' where schedule_source is null;
alter table public.studioflow_staff_branch_schedules alter column schedule_source set default 'direct';
alter table public.studioflow_staff_branch_schedules alter column schedule_source set not null;

create or replace function studioflow_private.mark_branch_schedule_source()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.schedule_source:=case when current_setting('studioflow.projecting_shifts',true)='on' then 'workspace' else 'direct' end;
 return new;
end $$;
revoke all on function studioflow_private.mark_branch_schedule_source() from public,anon,authenticated;
drop trigger if exists studioflow_mark_branch_schedule_source on public.studioflow_staff_branch_schedules;
create trigger studioflow_mark_branch_schedule_source before insert or update of site_id,branch_id,staff_id,day_of_week,starts_at,ends_at,is_active
 on public.studioflow_staff_branch_schedules for each row execute function studioflow_private.mark_branch_schedule_source();

-- PostgreSQL's DOW convention is Sunday=0 through Saturday=6; ISO Sunday=7
-- is also accepted. Text names are matched independently of database locale.
create or replace function studioflow_private.booking_weekday(value text)
returns integer language sql immutable set search_path='' as $$
 select case lower(btrim(coalesce(value,'')))
  when '0' then 0 when '7' then 0 when 'sun' then 0 when 'sunday' then 0
  when '1' then 1 when 'mon' then 1 when 'monday' then 1
  when '2' then 2 when 'tue' then 2 when 'tues' then 2 when 'tuesday' then 2
  when '3' then 3 when 'wed' then 3 when 'wednesday' then 3
  when '4' then 4 when 'thu' then 4 when 'thur' then 4 when 'thurs' then 4 when 'thursday' then 4
  when '5' then 5 when 'fri' then 5 when 'friday' then 5
  when '6' then 6 when 'sat' then 6 when 'saturday' then 6
  else null end
$$;

create or replace function studioflow_private.booking_time(value text)
returns time language plpgsql immutable set search_path='' as $$
begin
 if nullif(btrim(value),'') is null then return null; end if;
 return btrim(value)::time;
exception when invalid_datetime_format or datetime_field_overflow then return null;
end $$;

create or replace function studioflow_private.booking_duration(value text)
returns integer language sql immutable set search_path='' as $$
 select case when value ~ '^[0-9]{1,4}$' then value::integer else null end
$$;

create or replace function studioflow_private.booking_hours_enabled(value jsonb)
returns boolean language sql immutable set search_path='' as $$
 select case
  when value is null then false
  when value ? 'enabled' then lower(value->>'enabled') in ('true','1')
  when value ? 'is_closed' then lower(value->>'is_closed') in ('false','0')
  when value ? 'is_off' then lower(value->>'is_off') in ('false','0')
  when value ? 'is_working' then lower(value->>'is_working') in ('true','1')
  else true end
$$;

-- A removed/archived service must not keep an obsolete staff restriction alive.
-- Match catalogue IDs exactly: names are neither unique nor stable. A present,
-- active assignment is still restrictive, even if other entries are stale.
create or replace function studioflow_private.booking_service_active(value jsonb)
returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(value)='object' and nullif(btrim(value->>'id'),'') is not null
  and lower(coalesce(value->>'isActive','true')) not in ('false','0')
  and lower(coalesce(value->>'is_active','true')) not in ('false','0')
  and lower(coalesce(value->>'active','true')) not in ('false','0')
  and lower(coalesce(value->>'status','active')) not in ('inactive','archived','deleted')
  and lower(coalesce(value->>'deleted','false')) not in ('true','1')
  and lower(coalesce(value->>'archived','false')) not in ('true','1')
  and nullif(value->>'deletedAt','') is null and nullif(value->>'deleted_at','') is null
  and nullif(value->>'archivedAt','') is null and nullif(value->>'archived_at','') is null
$$;

create or replace function studioflow_private.booking_staff_can_perform(p_staff jsonb,p_services jsonb,p_menu jsonb)
returns boolean language sql immutable set search_path='' as $$
 with assignments as (
  select value from jsonb_array_elements_text(case when jsonb_typeof(p_staff->'assignedServices')='array' then p_staff->'assignedServices' else '[]'::jsonb end)
 ), valid as (
  select distinct a.value from assignments a
  where exists(select 1 from jsonb_array_elements(case when jsonb_typeof(p_menu)='array' then p_menu else '[]'::jsonb end) svc
   where svc->>'id'=a.value and studioflow_private.booking_service_active(svc))
 )
 select not exists(select 1 from valid)
  or not exists(select 1 from jsonb_array_elements_text(p_services) r where not exists(select 1 from valid a where a.value=r.value))
$$;

-- A configured but closed/missing day never falls back to a default. A lone
-- legacy location may inherit the salon's published hours; a location in a
-- multi-branch salon needs its own hours. Staff still need an explicit shift.
create or replace function studioflow_private.booking_business_window(p_owner uuid,p_branch uuid,p_day date)
returns table(configured boolean,opens_at time,closes_at time)
language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; d jsonb; hours jsonb; h jsonb; normalized_salon uuid; weekday integer:=extract(dow from p_day)::integer; closed boolean;
begin
 select * into w from public.studioflow_websites where owner_id=p_owner;
 select draft into d from public.studioflow_accounts where user_id=p_owner;
 if p_branch is not null then
  select b.operating_hours into hours from public.branches b where b.site_id=p_owner and b.id=p_branch and b.is_active;
  if not found then return; end if;
  if (jsonb_typeof(hours) is distinct from 'array' or jsonb_array_length(hours)=0)
   and (select count(*) from public.branches b where b.site_id=p_owner and b.is_active)>1 then
   configured:=true; opens_at:=null; closes_at:=null; return next; return;
  end if;
 end if;
 if jsonb_typeof(hours) is distinct from 'array' or jsonb_array_length(hours)=0 then
  hours:=case
   when jsonb_typeof(w.content->'profile'->'operatingHours')='array' and jsonb_array_length(w.content->'profile'->'operatingHours')>0 then w.content->'profile'->'operatingHours'
   when jsonb_typeof(w.content->'profile'->'businessHours')='array' and jsonb_array_length(w.content->'profile'->'businessHours')>0 then w.content->'profile'->'businessHours'
   when w.content->'profile'->>'businessType'='mens_hair_studio' and jsonb_typeof(d->'profile'->'mensStudio'->'hours')='array' and jsonb_array_length(d->'profile'->'mensStudio'->'hours')>0 then d->'profile'->'mensStudio'->'hours'
   when jsonb_typeof(d->'profile'->'operatingHours')='array' and jsonb_array_length(d->'profile'->'operatingHours')>0 then d->'profile'->'operatingHours'
   else '[]'::jsonb end;
 end if;
 if jsonb_typeof(hours)='array' and jsonb_array_length(hours)>0 then
  configured:=true;
  select x into h from jsonb_array_elements(hours) x
   where studioflow_private.booking_weekday(coalesce(x->>'day',x->>'day_of_week',x->>'weekday'))=weekday limit 1;
  if studioflow_private.booking_hours_enabled(h) then
   opens_at:=studioflow_private.booking_time(coalesce(h->>'fromTime',h->>'opening_time',h->>'opens_at',h->>'start_time'));
   closes_at:=studioflow_private.booking_time(coalesce(h->>'toTime',h->>'closing_time',h->>'closes_at',h->>'end_time'));
   if opens_at is null or closes_at is null or closes_at<=opens_at then opens_at:=null; closes_at:=null; end if;
  end if;
  return next; return;
 end if;
 -- Some sites use the normalized salon_hours model instead of profile JSON.
 -- A matching slug is not proof of ownership across the two catalogues. Only
 -- use normalized hours when the website owner is also an active owner/manager
 -- of that salon's organization; otherwise keep the catalogues isolated.
 select s.id into normalized_salon from public.salons s
  where s.slug=w.slug and s.is_active and s.deleted_at is null
   and exists(select 1 from public.organization_members m
    where m.organization_id=s.organization_id and m.user_id=p_owner
     and m.status='active' and m.role in ('owner','manager'))
  limit 1;
 if normalized_salon is not null and exists(select 1 from public.salon_hours where salon_id=normalized_salon) then
  configured:=true;
  select h.opens_at,h.closes_at,h.is_closed into opens_at,closes_at,closed
   from public.salon_hours h where h.salon_id=normalized_salon
    and (h.day_of_week=weekday or weekday=0 and h.day_of_week=7) limit 1;
  if not found or coalesce(closed,true) or opens_at is null or closes_at is null or closes_at<=opens_at then opens_at:=null; closes_at:=null; end if;
  return next; return;
 end if;
 configured:=false; opens_at:=null; closes_at:=null; return next;
end $$;

-- Map stale workspace branch IDs to the existing canonical ID by the saved
-- location name, without using names to identify services or specialists.
create or replace function studioflow_private.booking_workspace_branch_schedule(p_profile jsonb,p_staff jsonb,p_branch uuid,p_name text)
returns jsonb language sql immutable set search_path='' as $$
 select entry->'schedule'
 from jsonb_array_elements(case when jsonb_typeof(p_staff->'branchSchedules')='array' then p_staff->'branchSchedules' else '[]'::jsonb end) entry
 where entry->>'branchId'=p_branch::text or exists(
  select 1 from jsonb_array_elements(case when jsonb_typeof(p_profile->'branches')='array' then p_profile->'branches' else '[]'::jsonb end) b
  where b->>'id'=entry->>'branchId' and left(btrim(coalesce(b->>'name','')),120)=p_name
 )
 order by case when entry->>'branchId'=p_branch::text then 0 else 1 end limit 1
$$;

create or replace function studioflow_private.booking_staff_window(p_owner uuid,p_branch uuid,p_day date,p_staff text)
returns table(opens_at time,closes_at time,grid_start time)
language plpgsql stable security definer set search_path='' as $$
declare business record; s jsonb; profile jsonb; branch_name text; schedule jsonb; day_entry jsonb; shift_row public.studioflow_staff_branch_schedules; staff_open time; staff_close time; has_shifts boolean; has_branch_shifts boolean;
begin
 select * into business from studioflow_private.booking_business_window(p_owner,p_branch,p_day);
 if not found or business.configured and business.opens_at is null then return; end if;
 select x,a.draft->'profile' into s,profile from public.studioflow_accounts a left join public.studioflow_websites w on w.owner_id=a.user_id cross join lateral jsonb_array_elements(
  case when jsonb_typeof(a.draft->'stylists')='array' then a.draft->'stylists'
   when jsonb_typeof(w.content->'stylists')='array' then w.content->'stylists' else '[]'::jsonb end
 ) x where a.user_id=p_owner and x->>'id'=p_staff limit 1;
 if s is null then return; end if;
 if p_branch is not null then
  select exists(select 1 from public.studioflow_staff_branch_schedules x where x.site_id=p_owner and x.staff_id=p_staff and x.schedule_source in ('workspace','direct')),
         exists(select 1 from public.studioflow_staff_branch_schedules x where x.site_id=p_owner and x.staff_id=p_staff and x.branch_id=p_branch and x.schedule_source in ('workspace','direct'))
   into has_shifts,has_branch_shifts;
  if has_branch_shifts then
   select * into shift_row from public.studioflow_staff_branch_schedules x
    where x.site_id=p_owner and x.branch_id=p_branch and x.staff_id=p_staff and x.schedule_source in ('workspace','direct')
     and studioflow_private.booking_weekday(x.day_of_week)=extract(dow from p_day)::integer
    order by x.is_active, x.day_of_week limit 1;
   -- A missing day or an explicit day off never falls back to another source.
   if not found or not shift_row.is_active then return; end if;
   staff_open:=shift_row.starts_at; staff_close:=shift_row.ends_at;
   if staff_open is null or staff_close is null or staff_close<=staff_open then return; end if;
  elsif jsonb_typeof(s->'branchSchedules')='array' then
   select b.name into branch_name from public.branches b where b.site_id=p_owner and b.id=p_branch;
   schedule:=studioflow_private.booking_workspace_branch_schedule(profile,s,p_branch,branch_name);
   -- An explicit branch list (including an empty list) is authoritative.
   if jsonb_typeof(schedule) is distinct from 'array' then return; end if;
  elsif has_shifts or (select count(*) from public.branches b where b.site_id=p_owner and b.is_active)>1 then
   -- A trusted shift elsewhere, or a personal schedule at several locations,
   -- cannot be used to assign this specialist to the selected branch.
   return;
  else
   schedule:=s->'schedule';
  end if;
 else
  schedule:=s->'schedule';
 end if;
 if not coalesce(has_branch_shifts,false) then
  -- Opening hours or unattributed legacy rows do not prove an individual's shift.
  if jsonb_typeof(schedule) is distinct from 'array' or jsonb_array_length(schedule)=0 then return; end if;
  select x into day_entry from jsonb_array_elements(schedule) x
   where studioflow_private.booking_weekday(coalesce(x->>'day',x->>'day_of_week',x->>'weekday'))=extract(dow from p_day)::integer limit 1;
  if not studioflow_private.booking_hours_enabled(day_entry) then return; end if;
  staff_open:=studioflow_private.booking_time(coalesce(day_entry->>'fromTime',day_entry->>'start_time',day_entry->>'opens_at'));
  staff_close:=studioflow_private.booking_time(coalesce(day_entry->>'toTime',day_entry->>'end_time',day_entry->>'closes_at'));
  if staff_open is null or staff_close is null or staff_close<=staff_open then return; end if;
 end if;
 if business.configured then
  opens_at:=greatest(business.opens_at,staff_open);
  closes_at:=least(business.closes_at,staff_close);
  grid_start:=business.opens_at;
 else
  -- No guessed opening hours: require a real individual schedule.
  opens_at:=staff_open; closes_at:=staff_close; grid_start:=staff_open;
 end if;
 if opens_at is null or closes_at is null or closes_at<=opens_at then return; end if;
 return next;
end $$;

-- Keep the branch trigger aligned with the same fallback, weekday and hours
-- logic used to offer a slot. This guard also covers owner/other booking paths.
create or replace function studioflow_private.validate_studioflow_booking_branch()
returns trigger language plpgsql security definer set search_path='' as $$
declare selected uuid; local_day date; local_start time; local_end time;
begin
 selected:=coalesce(new.branch_id,nullif(current_setting('studioflow.branch_id',true),'')::uuid,nullif(new.payload->>'branchId','')::uuid);
 if selected is null then
  select id into selected from public.branches where site_id=new.owner_id and is_active order by created_at,id limit 1;
  if (select count(*) from public.branches where site_id=new.owner_id and is_active)>1 then raise exception 'Choose a location before booking'; end if;
 end if;
 if selected is null then
  -- Legacy salons with no branches at all may use their own configured hours;
  -- deliberately deactivated locations must not become bookable by fallback.
  if exists(select 1 from public.branches where site_id=new.owner_id) then raise exception 'Selected location is unavailable'; end if;
 elsif not exists(select 1 from public.branches where site_id=new.owner_id and id=selected and is_active) then raise exception 'Selected location is unavailable'; end if;
 local_day:=(new.starts_at at time zone 'Asia/Kolkata')::date;
 local_start:=(new.starts_at at time zone 'Asia/Kolkata')::time;
 local_end:=(new.ends_at at time zone 'Asia/Kolkata')::time;
 if (new.ends_at at time zone 'Asia/Kolkata')::date<>local_day or local_end<=local_start
  or not exists(select 1 from studioflow_private.booking_staff_window(new.owner_id,selected,local_day,new.stylist_id) x
   where local_start>=x.opens_at and local_end<=x.closes_at) then
  raise exception 'Specialist is not available at this location and time';
 end if;
 if selected is not null then
  new.branch_id:=selected;
  new.payload:=coalesce(new.payload,'{}'::jsonb)||jsonb_build_object('branchId',selected,'branchName',(select name from public.branches where id=selected));
 end if;
 return new;
end $$;

-- Every writer of the canonical appointment ledger, including service-role
-- imports and owner-side changes, must participate in the same lock protocol as
-- website, Android, WhatsApp and rescheduling RPCs. The branch guard above is
-- about working hours; it did not itself prevent two direct writes overlapping.
-- A statement started at REPEATABLE READ can retain a pre-lock snapshot, so do
-- not silently accept a write that cannot recheck the winner's commit.
create or replace function studioflow_private.guard_booking_conflict()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status not in ('pending','confirmed')
  or (new.status='pending' and new.hold_expires_at is not null and new.hold_expires_at<=now()) then
  return new;
 end if;
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Appointment writes require READ COMMITTED isolation for conflict checks' using errcode='25001';
 end if;
 if new.owner_id is null or nullif(new.stylist_id,'') is null or new.starts_at is null
  or new.ends_at is null or new.ends_at<=new.starts_at then
  raise exception 'Appointment requires a specialist and valid time range' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.stylist_id,0));
 if exists(select 1 from public.studioflow_bookings b
  where b.id is distinct from new.id and b.owner_id=new.owner_id and b.stylist_id=new.stylist_id
   and b.status in ('pending','confirmed')
   and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now())
   and b.starts_at<new.ends_at and b.ends_at>new.starts_at) then
  raise exception 'This specialist already has a booking at that time' using errcode='23P01';
 end if;
 return new;
end $$;
revoke all on function studioflow_private.guard_booking_conflict() from public,anon,authenticated;
drop trigger if exists studioflow_booking_conflict_guard on public.studioflow_bookings;
create trigger studioflow_booking_conflict_guard before insert or update of owner_id,stylist_id,starts_at,ends_at,status,hold_expires_at
 on public.studioflow_bookings for each row execute function studioflow_private.guard_booking_conflict();

-- Template 15 keeps its additional service, holiday, leave and break rules;
-- only its weekday parsing is shared with the other templates.
create or replace function studioflow_private.booking_bundle_window_allowed(p_slug text,p_services jsonb,p_date date,p_staff text,p_start time)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; d jsonb; c jsonb; h jsonb; staff jsonb; minutes int; finish timestamp;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then return true; end if;
 select draft into d from public.studioflow_accounts where user_id=w.owner_id;
 c:=coalesce(d->'profile'->'mensStudio','{}');
 if exists(select 1 from jsonb_array_elements_text(p_services) id where not exists(
  select 1 from jsonb_array_elements(w.content->'services') s where s->>'id'=id and studioflow_private.mens_service(s))) then return false; end if;
 select sum(studioflow_private.booking_duration(s->>'durationMinutes')) into minutes from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 select s into staff from jsonb_array_elements(d->'stylists') s where s->>'id'=p_staff
  and s->>'businessType'='mens_hair_studio' and coalesce((s->>'mensMaleOnly')::boolean,false)
  and coalesce(s->>'role','') !~* 'women|woman|female|unisex|kids?|child|beard|shav|facial|spa\M|treatment|makeup|bridal|nail|wax'
  and s->>'status'='Available';
 if staff is null or minutes is null or coalesce(c->'holidays','[]') ? p_date::text then return false; end if;
 if exists(select 1 from jsonb_array_elements(coalesce(c->'leave','[]')) l where l->>'staffId'=p_staff and p_date between (l->>'from')::date and (l->>'to')::date) then return false; end if;
 select x into h from jsonb_array_elements(coalesce(c->'hours','[]')) x where studioflow_private.booking_weekday(x->>'day')=extract(dow from p_date)::integer limit 1;
 finish:=p_date+p_start+minutes*interval '1 minute';
 if h is null or not studioflow_private.booking_hours_enabled(h) or studioflow_private.booking_time(h->>'fromTime') is null or studioflow_private.booking_time(h->>'toTime') is null
  or p_start<studioflow_private.booking_time(h->>'fromTime') or finish>p_date+studioflow_private.booking_time(h->>'toTime') then return false; end if;
 if exists(select 1 from jsonb_array_elements(coalesce(c->'breaks','[]')) b where b->>'staffId'=p_staff and p_start<(b->>'toTime')::time and finish>p_date+(b->>'fromTime')::time) then return false; end if;
 return true;
end $$;

create or replace function studioflow_private.booking_slots(p_slug text,p_services jsonb,p_date date,p_stylist text,p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; d jsonb; roster jsonb; ids text[]; n integer; minutes integer; lead_hours numeric:=0; lead_text text; s jsonb; window_row record; candidate timestamp; ending timestamp; rows jsonb:='[]'::jsonb; result jsonb; is_available boolean; effective_branch uuid:=p_branch; branch_count integer; ist_today date:=(now() at time zone 'Asia/Kolkata')::date;
begin
 if jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 or p_date is null or p_date<ist_today or p_date>ist_today+90 then return '[]'::jsonb; end if;
 if exists(select 1 from jsonb_array_elements(p_services) x where jsonb_typeof(x)<>'string') then return '[]'::jsonb; end if;
 select array_agg(distinct value) into ids from jsonb_array_elements_text(p_services);
 if coalesce(array_length(ids,1),0)<>jsonb_array_length(p_services) then return '[]'::jsonb; end if;
 select * into w from public.studioflow_websites where slug=p_slug and published_at<=now();
 if w.owner_id is null or jsonb_typeof(w.content->'services') is distinct from 'array' or jsonb_typeof(w.content->'stylists') is distinct from 'array' then return '[]'::jsonb; end if;
 if effective_branch is null then
  select count(*) into branch_count from public.branches b where b.site_id=w.owner_id and b.is_active;
  if branch_count>1 then return '[]'::jsonb; end if;
  if branch_count=1 then select b.id into effective_branch from public.branches b where b.site_id=w.owner_id and b.is_active limit 1;
  elsif exists(select 1 from public.branches b where b.site_id=w.owner_id) then return '[]'::jsonb; end if;
 end if;
 if effective_branch is not null and not exists(select 1 from public.branches b where b.site_id=w.owner_id and b.id=effective_branch and b.is_active) then return '[]'::jsonb; end if;
 if not studioflow_private.service_catalogue_available_at_branch(w.owner_id,p_services,effective_branch) then return '[]'::jsonb; end if;
 select count(*),sum(studioflow_private.booking_duration(x->>'durationMinutes'))
  into n,minutes from jsonb_array_elements(w.content->'services') x where x->>'id'=any(ids) and studioflow_private.booking_service_active(x);
 if n<>array_length(ids,1) or minutes is null or minutes<1 or minutes>1440
  or exists(select 1 from jsonb_array_elements(w.content->'services') x where x->>'id'=any(ids) and coalesce(studioflow_private.booking_duration(x->>'durationMinutes') between 1 and 1440,false)=false) then return '[]'::jsonb; end if;
 select draft into d from public.studioflow_accounts where user_id=w.owner_id;
 roster:=case when jsonb_typeof(d->'stylists')='array' then d->'stylists' else w.content->'stylists' end;
 lead_text:=coalesce(w.content->'profile'->'bookingRules'->>'leadHours',d->'extras'->>'bookingLeadHours','0');
 if lead_text ~ '^[0-9]+(\.[0-9]+)?$' then lead_hours:=least(2160,lead_text::numeric); end if;
 for s in select x from jsonb_array_elements(roster) x
  where (p_stylist in ('any','any_available','any-specialist') or x->>'id'=p_stylist)
   and lower(coalesce(x->>'status','Available'))='available'
   and coalesce(x->>'isActive','true')<>'false'
   and exists(select 1 from jsonb_array_elements(w.content->'stylists') pub where pub->>'id'=x->>'id')
   and studioflow_private.booking_staff_can_perform(x,p_services,w.content->'services' || case when jsonb_typeof(d->'services')='array' then d->'services' else '[]'::jsonb end)
 loop
  select * into window_row from studioflow_private.booking_staff_window(w.owner_id,effective_branch,p_date,s->>'id');
  if not found then continue; end if;
  for candidate in select generate_series(p_date+window_row.grid_start,p_date+window_row.closes_at,interval '30 minutes') loop
   ending:=candidate+minutes*interval '1 minute';
   if candidate::time<window_row.opens_at or ending>p_date+window_row.closes_at then continue; end if;
   if not studioflow_private.booking_bundle_window_allowed(p_slug,p_services,p_date,s->>'id',candidate::time) then continue; end if;
   is_available:=(candidate at time zone 'Asia/Kolkata')>now()+lead_hours*interval '1 hour'
    and (candidate at time zone 'Asia/Kolkata')<=now()+interval '90 days'
    and not exists(select 1 from public.studioflow_bookings b
     where b.owner_id=w.owner_id and b.stylist_id=s->>'id' and b.status in ('pending','confirmed')
      and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now())
      and b.starts_at<(ending at time zone 'Asia/Kolkata') and b.ends_at>(candidate at time zone 'Asia/Kolkata'));
   rows:=rows||jsonb_build_array(jsonb_build_object('time',to_char(candidate,'HH24:MI'),'label',to_char(candidate,'HH12:MI AM'),'staff',s->>'id','available',is_available));
  end loop;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('time',time,'label',label,'available',available,'stylistId',staff)
  ||case when effective_branch is not null then jsonb_build_object('branchId',effective_branch,'branchName',(select name from public.branches where id=effective_branch)) else '{}'::jsonb end order by time),'[]'::jsonb) into result
 from (select x->>'time' time,min(x->>'label') label,bool_or((x->>'available')::boolean) available,min(x->>'staff') filter(where (x->>'available')::boolean) staff
  from jsonb_array_elements(rows) x group by x->>'time') grouped;
 return result;
end $$;

create or replace function studioflow_private.branch_slots(p_slug text,p_services jsonb,p_date date,p_stylist text,p_branch uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select studioflow_private.booking_slots(p_slug,p_services,p_date,p_stylist,p_branch)
$$;
create or replace function studioflow_private.availability_unbranched(p_slug text,p_service_id text,p_date date,p_stylist_id text)
returns jsonb language sql stable security definer set search_path='' as $$
 select studioflow_private.booking_slots(p_slug,jsonb_build_array(p_service_id),p_date,p_stylist_id,null)
$$;
create or replace function studioflow_android_private.slots_unbranched(p_slug text,p_services jsonb,p_date date,p_stylist text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x->>'time'),'[]'::jsonb) from jsonb_array_elements(studioflow_private.booking_slots(p_slug,p_services,p_date,p_stylist,null)) x where coalesce((x->>'available')::boolean,false)
$$;

-- Resolve the implicit single branch before validating branch-scoped services.
create or replace function studioflow_android_private.slots(p_slug text,p_services jsonb,p_date date,p_stylist text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x->>'time'),'[]'::jsonb)
 from jsonb_array_elements(studioflow_private.booking_slots(p_slug,p_services,p_date,p_stylist,nullif(current_setting('studioflow.branch_id',true),'')::uuid)) x
 where coalesce((x->>'available')::boolean,false)
$$;

create or replace function public.studioflow_mens_slots(p_slug text,p_service_id text,p_date date,p_stylist_id text,p_branch uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x->>'time'),'[]'::jsonb)
 from public.studioflow_websites w cross join lateral jsonb_array_elements(
  studioflow_private.booking_slots(p_slug,jsonb_build_array(p_service_id),p_date,p_stylist_id,p_branch)
 ) x
 where w.slug=p_slug and w.published_at<=now() and w.content->'profile'->>'businessType'='mens_hair_studio'
  and coalesce((x->>'available')::boolean,false)
$$;

create or replace function studioflow_private.booking_specialists(p_slug text,p_service_id text)
returns jsonb language sql stable security definer set search_path='' as $$
 with salon as (
  select w.content,a.draft from public.studioflow_websites w left join public.studioflow_accounts a on a.user_id=w.owner_id where w.slug=p_slug and w.published_at<=now()
 ), eligible as (
  select s->>'id' id from salon cross join lateral jsonb_array_elements(case when jsonb_typeof(salon.draft->'stylists')='array' then salon.draft->'stylists' else coalesce(salon.content->'stylists','[]'::jsonb) end) s
  where exists(select 1 from jsonb_array_elements(coalesce(salon.content->'services','[]'::jsonb)) svc where svc->>'id'=p_service_id and studioflow_private.booking_service_active(svc))
   and exists(select 1 from jsonb_array_elements(coalesce(salon.content->'stylists','[]'::jsonb)) pub where pub->>'id'=s->>'id')
   and lower(coalesce(s->>'status','Available'))='available' and coalesce(s->>'isActive','true')<>'false'
   and studioflow_private.booking_staff_can_perform(s,jsonb_build_array(p_service_id),salon.content->'services' || case when jsonb_typeof(salon.draft->'services')='array' then salon.draft->'services' else '[]'::jsonb end)
 ) select jsonb_build_object('published',exists(select 1 from salon),'specialistIds',coalesce((select jsonb_agg(id order by id) from eligible),'[]'::jsonb))
$$;

create or replace function public.studioflow_branch_specialists(p_slug text,p_service_id text,p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; d jsonb; roster jsonb; result jsonb;
begin
 select * into w from public.studioflow_websites where slug=p_slug and published_at<=now();
 if w.owner_id is null or not exists(select 1 from public.branches where site_id=w.owner_id and id=p_branch and is_active) then return jsonb_build_object('published',false,'specialistIds','[]'::jsonb); end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(w.content->'services','[]'::jsonb)) x where x->>'id'=p_service_id and studioflow_private.booking_service_active(x))
  or not studioflow_private.service_catalogue_available_at_branch(w.owner_id,jsonb_build_array(p_service_id),p_branch) then return jsonb_build_object('published',true,'specialistIds','[]'::jsonb,'specialists','[]'::jsonb); end if;
 select draft into d from public.studioflow_accounts where user_id=w.owner_id;
 roster:=case when jsonb_typeof(d->'stylists')='array' then d->'stylists' else coalesce(w.content->'stylists','[]'::jsonb) end;
 select coalesce(jsonb_agg(s->>'id' order by s->>'name'),'[]'::jsonb) into result from jsonb_array_elements(roster) s
  where exists(select 1 from jsonb_array_elements(coalesce(w.content->'stylists','[]'::jsonb)) pub where pub->>'id'=s->>'id')
   and lower(coalesce(s->>'status','Available'))='available' and coalesce(s->>'isActive','true')<>'false'
   and exists(select 1 from generate_series(0,6) as day_offsets(offset_days)
    cross join lateral studioflow_private.booking_staff_window(w.owner_id,p_branch,(now() at time zone 'Asia/Kolkata')::date+day_offsets.offset_days,s->>'id') window_row)
   and studioflow_private.booking_staff_can_perform(s,jsonb_build_array(p_service_id),w.content->'services' || case when jsonb_typeof(d->'services')='array' then d->'services' else '[]'::jsonb end);
 return jsonb_build_object('published',true,'specialistIds',result,'specialists',studioflow_private.booking_staff_profiles(p_slug,result));
end $$;

-- The single-service website reservation previously repeated an exact-English
-- weekday check after availability. Revalidate the authoritative slot under the
-- existing per-professional lock instead, so displayed and bookable slots agree.
create or replace function studioflow_private.book(p_slug text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); w public.studioflow_websites; svc jsonb; staff jsonb; start_time timestamptz; end_time timestamptz; payload jsonb; bid uuid:=gen_random_uuid(); candidate jsonb;
begin
 if actor is null then raise exception 'Please sign in to book an appointment' using errcode='42501'; end if;
 select * into w from public.studioflow_websites where slug=p_slug and published_at<=now();
 if w.owner_id is null then raise exception 'Website is not published'; end if;
 select s into svc from jsonb_array_elements(w.content->'services') s where s->>'id'=p_request->>'serviceId';
 select slot into candidate from jsonb_array_elements(studioflow_private.availability(p_slug,p_request->>'serviceId',(p_request->>'date')::date,p_request->>'stylistId')) slot where slot->>'time'=p_request->>'time' and (slot->>'available')::boolean;
 if candidate is null then raise exception 'This slot has just been booked or is unavailable. Choose another time.'; end if;
 select s into staff from jsonb_array_elements(w.content->'stylists') s where s->>'id'=candidate->>'stylistId';
 if svc is null or staff is null then raise exception 'Choose an available service and specialist'; end if;
 if coalesce(btrim(p_request->>'clientName'),'')='' or length(regexp_replace(coalesce(p_request->>'clientPhone',''),'[^0-9]','','g'))<10 then raise exception 'Enter your name and a valid phone number'; end if;
 start_time:=((p_request->>'date')::date+(p_request->>'time')::time) at time zone 'Asia/Kolkata';
 end_time:=start_time+greatest(1,(svc->>'durationMinutes')::int)*interval '1 minute';
 if start_time is null or start_time<now() or start_time>now()+interval '90 days' then raise exception 'Choose a future appointment within 90 days'; end if;
 if (select count(*) from public.studioflow_bookings where customer_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many booking requests. Please try later.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||(staff->>'id'),0));
 if not exists(select 1 from jsonb_array_elements(studioflow_private.availability(p_slug,p_request->>'serviceId',(p_request->>'date')::date,staff->>'id')) slot where slot->>'time'=p_request->>'time' and coalesce((slot->>'available')::boolean,false)) then raise exception 'This slot has just been booked or is unavailable. Choose another time.'; end if;
 if exists(select 1 from public.studioflow_bookings where owner_id=w.owner_id and stylist_id=staff->>'id' and status in ('pending','confirmed') and (status='confirmed' or hold_expires_at is null or hold_expires_at>now()) and starts_at<end_time and ends_at>start_time) then raise exception 'This slot has just been booked. Choose another time.'; end if;
 payload:=jsonb_build_object('id',bid,'clientName',left(btrim(p_request->>'clientName'),150),'clientPhone',left(p_request->>'clientPhone',30),'clientEmail',(select email from auth.users where id=actor),'serviceId',svc->>'id','serviceName',svc->>'name','servicePrice',(svc->>'price')::numeric,'stylistId',staff->>'id','stylistName',staff->>'name','date',p_request->>'date','time',p_request->>'time','status','pending','paymentStatus','pay_at_salon','amountPaid',0,'createdAt',now());
 insert into public.studioflow_bookings as sb(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload,hold_expires_at) values(bid,w.owner_id,actor,staff->>'id',start_time,end_time,'pending',payload,now()+interval '15 minutes') returning sb.payload into payload;
 return payload;
end $$;

-- Keep reservation validation and the implicit single-branch service scope aligned.
create or replace function studioflow_android_private.book(
  p_slug text,
  p_services jsonb,
  p_date date,
  p_time text,
  p_stylist text,
  p_name text,
  p_phone text,
  p_instructions text,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  w public.studioflow_websites;
  result jsonb;
  existing public.studioflow_android_requests;
  finger text;
  slot jsonb;
  menu jsonb;
  total numeric;
  minutes int;
  bid uuid:=gen_random_uuid();
  start_at timestamptz;
  staff_name text;
  names text;
  selected_branch text:=nullif(current_setting('studioflow.branch_id',true),'');
  branch_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode='42501';
  end if;
  if p_request is null or p_stylist is null or p_time is null or p_date is null or p_name is null or p_phone is null then
    raise exception 'Complete booking details';
  end if;
  if length(btrim(p_name)) not between 2 and 150
     or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 10 and 15
     or length(coalesce(p_instructions,''))>1000 then
    raise exception 'Enter valid contact details';
  end if;
  if exists(select 1 from auth.users where id=auth.uid() and banned_until>now()) then
    raise exception 'Account unavailable' using errcode='42501';
  end if;

  select * into w from public.studioflow_websites where slug=p_slug and published_at<=now();
  if w.owner_id is null then raise exception 'Salon is not published'; end if;
  if selected_branch is null then
    select count(*) into branch_count from public.branches b where b.site_id=w.owner_id and b.is_active;
    if branch_count>1 then raise exception 'Choose a location before booking'; end if;
    if branch_count=1 then
      select b.id::text into selected_branch from public.branches b where b.site_id=w.owner_id and b.is_active limit 1;
      perform set_config('studioflow.branch_id',selected_branch,true);
    elsif exists(select 1 from public.branches b where b.site_id=w.owner_id) then
      raise exception 'Selected location is unavailable';
    end if;
  end if;
  if selected_branch is not null and not exists(select 1 from public.branches b where b.site_id=w.owner_id and b.id=selected_branch::uuid and b.is_active) then
    raise exception 'Selected location is unavailable';
  end if;

  -- Keep the historical fingerprint for existing retries, but additionally
  -- compare the resolved branch against the actual stored booking.
  finger:=md5(jsonb_build_array(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions)::text);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,8));
  select * into existing
  from public.studioflow_android_requests
  where customer_id=auth.uid() and request_id=p_request;
  if existing.booking_id is not null then
    if existing.fingerprint<>finger or not exists(
      select 1 from public.studioflow_bookings b where b.id=existing.booking_id and b.owner_id=w.owner_id
       and b.branch_id is not distinct from selected_branch::uuid
    ) then
      raise exception 'Request changed; choose the slot again';
    end if;
    return(select to_jsonb(b) from public.studioflow_bookings b where id=existing.booking_id);
  end if;
  if(select count(*) from public.studioflow_bookings
     where customer_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then
    raise exception 'Too many bookings; try again later';
  end if;

  if not studioflow_private.service_catalogue_available_at_branch(
    w.owner_id,p_services,selected_branch::uuid
  ) then
    raise exception 'One or more selected services are not offered at this location' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||p_stylist,0));
  select v into slot
  from jsonb_array_elements(studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)) v
  where v->>'time'=p_time and v->>'stylistId'=p_stylist and coalesce((v->>'available')::boolean,false);
  if slot is null then raise exception 'Slot unavailable. Choose another time.'; end if;

  select jsonb_agg(s),sum((s->>'price')::numeric),sum((s->>'durationMinutes')::int),
         string_agg(s->>'name',' + ' order by s->>'id')
    into menu,total,minutes,names
  from jsonb_array_elements(w.content->'services') s
  where p_services ? (s->>'id');
  select e->>'name' into staff_name
  from jsonb_array_elements(w.content->'stylists') e
  where e->>'id'=p_stylist;
  start_at:=(p_date+p_time::time) at time zone 'Asia/Kolkata';

  insert into public.studioflow_bookings(
    id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,hold_expires_at,payload
  )
  values(
    bid,w.owner_id,auth.uid(),p_stylist,start_at,start_at+minutes*interval '1 minute',
    'pending',now()+interval '15 minutes',
    jsonb_build_object(
      'id',bid,'clientName',btrim(p_name),'clientPhone',btrim(p_phone),
      'clientEmail',(select email from auth.users where id=auth.uid()),
      'serviceId',p_services->>0,'serviceName',names,'servicePrice',total,
      'serviceItems',menu,'durationMinutes',minutes,'stylistId',p_stylist,
      'stylistName',staff_name,'date',p_date,'time',p_time,
      'instructions',coalesce(p_instructions,''),'status','pending',
      'paymentStatus','pay_at_salon','amountPaid',0,'source','nexora_android','createdAt',now()
    )
  );

  insert into public.studioflow_android_requests(
    customer_id,request_id,fingerprint,booking_id
  ) values(auth.uid(),p_request,finger,bid);

  return(select to_jsonb(b) from public.studioflow_bookings b where id=bid);
end
$function$;


-- Preserve canonical branch ID mapping while projecting only explicitly saved
-- staff shifts. This affects future workspace saves, not existing rows.
create or replace function studioflow_private.sync_branches_from_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  profile jsonb := coalesce(new.draft->'profile', '{}'::jsonb);
  old_profile jsonb := case when tg_op='UPDATE' then coalesce(old.draft->'profile','{}'::jsonb) else '{}'::jsonb end;
  branch_data jsonb := profile->'branches';
  item jsonb;
  old_item jsonb;
  supplied_branch_key uuid;
  branch_key uuid;
  branch_name text;
  old_branch_name text;
  stylist jsonb;
  old_stylist jsonb;
  schedule_item jsonb;
  day_name text;
  branch_row record;
  branch_schedule jsonb;
  old_branch_schedule jsonb;
  prior_projection text := current_setting('studioflow.projecting_shifts',true);
  from_t time;
  to_t time;
  day_enabled boolean;
  branch_ids uuid[] := '{}';
  branch_id_map jsonb := '{}'::jsonb;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text || ':studioflow-branches', 0)
  );

  if jsonb_typeof(branch_data) = 'array'
     and jsonb_array_length(branch_data) > 0 then
    if jsonb_array_length(branch_data) > 50 then
      raise exception 'A maximum of 50 locations is supported';
    end if;

    for item in select value from jsonb_array_elements(branch_data) loop
      begin
        supplied_branch_key := (item->>'id')::uuid;
      exception when others then
        raise exception 'Each location needs a valid ID';
      end;

      branch_name := left(btrim(coalesce(item->>'name', '')), 120);
      if branch_name = '' then
        raise exception 'Each location needs a name';
      end if;

      old_item := null;
      select entry into old_item from jsonb_array_elements(
        case when jsonb_typeof(old_profile->'branches')='array' then old_profile->'branches' else '[]'::jsonb end
      ) entry where entry->>'id'=supplied_branch_key::text limit 1;

      -- Prefer an actual ID, then the current name, then the old name of a
      -- stale workspace ID. This keeps a rename attached to the canonical row.
      branch_key := null;
      select b.id into branch_key from public.branches b
       where b.site_id=new.user_id and b.id=supplied_branch_key for update;
      if branch_key is null then
        select b.id into branch_key from public.branches b
         where b.site_id=new.user_id and b.name=branch_name for update;
      end if;
      if branch_key is null and old_item is not null then
        select b.id into branch_key from public.branches b
         where b.site_id=new.user_id and b.name=left(btrim(coalesce(old_item->>'name','')),120) for update;
      end if;
      if branch_key is not null and exists(select 1 from public.branches b where b.site_id=new.user_id and b.name=branch_name and b.id<>branch_key) then
        raise exception 'A location with that name already exists';
      end if;
      if branch_key is not null and branch_key=any(branch_ids) then
        raise exception 'Each location must have a distinct ID and name';
      end if;

      if branch_key is not null then
        update public.branches
        set name = branch_name,
            city = left(coalesce(item->>'city', ''), 120),
            address = left(coalesce(item->>'address', ''), 500),
            phone = left(coalesce(item->>'phone', ''), 40),
            is_active = coalesce((item->>'isActive')::boolean, true),
            operating_hours = case when item ? 'operatingHours' and item->'operatingHours' is distinct from old_item->'operatingHours'
              then item->'operatingHours' else operating_hours end,
            updated_at = now()
        where site_id = new.user_id
          and id = branch_key;
      else
        branch_key := supplied_branch_key;
        insert into public.branches(
          id, site_id, name, city, address, phone, is_active,
          operating_hours, updated_at
        )
        values(
          branch_key, new.user_id, branch_name,
          left(coalesce(item->>'city', ''), 120),
          left(coalesce(item->>'address', ''), 500),
          left(coalesce(item->>'phone', ''), 40),
          coalesce((item->>'isActive')::boolean, true),
          coalesce(item->'operatingHours', '[]'::jsonb),
          now()
        )
        on conflict(site_id, id) do update
          set name = excluded.name,
              city = excluded.city,
              address = excluded.address,
              phone = excluded.phone,
              is_active = excluded.is_active,
              operating_hours = excluded.operating_hours,
              updated_at = now();
      end if;

      branch_id_map := branch_id_map
        || jsonb_build_object(supplied_branch_key::text, branch_key::text)
        || jsonb_build_object(branch_key::text, branch_key::text);

      branch_ids := array_append(branch_ids, branch_key);
    end loop;

    update public.branches
    set is_active = false, updated_at = now()
    where site_id = new.user_id
      and not (id = any(branch_ids));
  else
    select array_agg(id)
      into branch_ids
    from public.branches
    where site_id = new.user_id
      and is_active;

    if coalesce(array_length(branch_ids, 1), 0) = 0
       and not exists(select 1 from public.branches b where b.site_id=new.user_id) then
      -- This is a location shell, not invented business hours. Never reactivate
      -- an explicitly deactivated location merely because the draft has none.
      insert into public.branches(
        site_id, name, city, address, phone, is_active, operating_hours
      ) values(
        new.user_id,
        left(coalesce(nullif(btrim(profile->>'businessName'), ''), 'Main location'), 120),
        coalesce(profile->>'city', ''), coalesce(profile->>'address', ''),
        coalesce(profile->>'phone', ''), true, '[]'::jsonb
      ) returning id into branch_key;
      branch_ids := array[branch_key];
    end if;
  end if;

  -- Only explicit workspace branch-schedule changes replace their particular
  -- specialist/location. An unrelated save must not erase legacy or directly
  -- managed shifts, including shifts for a different branch.
  perform set_config('studioflow.projecting_shifts','on',true);
  delete from public.studioflow_staff_branch_schedules x
  where x.site_id=new.user_id and x.schedule_source='workspace'
   and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(new.draft->'stylists')='array' then new.draft->'stylists' else '[]'::jsonb end) s where s->>'id'=x.staff_id);

  for stylist in
    select value from jsonb_array_elements(case when jsonb_typeof(new.draft->'stylists')='array' then new.draft->'stylists' else '[]'::jsonb end)
  loop
    if coalesce(stylist->>'id', '') = '' then continue; end if;
    old_stylist:=null;
    if tg_op='UPDATE' then
      select value into old_stylist from jsonb_array_elements(case when jsonb_typeof(old.draft->'stylists')='array' then old.draft->'stylists' else '[]'::jsonb end)
       where value->>'id'=stylist->>'id' limit 1;
    end if;

    for branch_row in select id,name from public.branches where site_id=new.user_id loop
      select coalesce((select entry->>'name' from jsonb_array_elements(
        case when jsonb_typeof(old_profile->'branches')='array' then old_profile->'branches' else '[]'::jsonb end
      ) entry where coalesce(branch_id_map->>(entry->>'id'),entry->>'id')=branch_row.id::text limit 1),branch_row.name)
       into old_branch_name;
      branch_schedule:=studioflow_private.booking_workspace_branch_schedule(profile,stylist,branch_row.id,branch_row.name);
      old_branch_schedule:=studioflow_private.booking_workspace_branch_schedule(old_profile,old_stylist,branch_row.id,old_branch_name);
      if branch_schedule is not distinct from old_branch_schedule then continue; end if;

      -- The owner explicitly changed this specialist/location. Replace only
      -- that pair; other specialists, branches and unrelated saves are untouched.
      delete from public.studioflow_staff_branch_schedules
       where site_id=new.user_id and staff_id=stylist->>'id' and branch_id=branch_row.id;
      if jsonb_typeof(branch_schedule) is distinct from 'array' then continue; end if;
      for schedule_item in select value from jsonb_array_elements(branch_schedule) loop
        day_name := (array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[
          studioflow_private.booking_weekday(coalesce(schedule_item->>'day',schedule_item->>'day_of_week',schedule_item->>'weekday'))+1
        ];
        if day_name is null then continue; end if;

        day_enabled := studioflow_private.booking_hours_enabled(schedule_item);
        from_t := studioflow_private.booking_time(coalesce(schedule_item->>'fromTime',schedule_item->>'start_time',schedule_item->>'opens_at'));
        to_t := studioflow_private.booking_time(coalesce(schedule_item->>'toTime',schedule_item->>'end_time',schedule_item->>'closes_at'));

        insert into public.studioflow_staff_branch_schedules(
          site_id, branch_id, staff_id, day_of_week,
          starts_at, ends_at, is_active
        )
        values(
          new.user_id, branch_row.id, stylist->>'id', day_name,
          case when day_enabled and from_t is not null
                    and to_t is not null and to_t > from_t
               then from_t end,
          case when day_enabled and from_t is not null
                    and to_t is not null and to_t > from_t
               then to_t end,
          day_enabled and from_t is not null
            and to_t is not null and to_t > from_t
        )
        on conflict(site_id, branch_id, staff_id, day_of_week) do update
          set starts_at = excluded.starts_at,
              ends_at = excluded.ends_at,
              is_active = excluded.is_active,
              updated_at = now();
      end loop;
    end loop;
  end loop;

  perform set_config('studioflow.projecting_shifts',coalesce(prior_projection,''),true);
  return new;
end
$function$;

-- Practice bookings remain isolated and unpaid. Bind retries to the exact
-- selection (including branch), and include that branch in the demo receipt.
-- Old receipts without a fingerprint are kept, but cannot be replayed as a
-- different request under the same idempotency key.
create or replace function studioflow_android_private.demo_book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; prior public.studioflow_demo_bookings; chosen jsonb; items jsonb; names text; list_price numeric; minutes int; staff_name text;
 selected_branch text:=nullif(current_setting('studioflow.branch_id',true),''); finger text;
begin
 if auth.uid() is null then raise exception 'Sign in to save a demo booking' using errcode='42501'; end if;
 if p_request is null or p_name is null or length(btrim(p_name)) not between 2 and 150 or length(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g')) not between 10 and 15 then raise exception 'Enter valid booking details'; end if;
 finger:=md5(jsonb_build_array(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,selected_branch)::text);
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,17));
 select * into prior from public.studioflow_demo_bookings where customer_id=auth.uid() and request_id=p_request;
 if prior.id is not null then
  if prior.payload->>'requestFingerprint' is distinct from finger then raise exception 'Demo request changed; choose the slot again'; end if;
  return to_jsonb(prior);
 end if;
 if (select count(*) from public.studioflow_demo_bookings where customer_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Demo limit reached. Try later.'; end if;
 select * into w from public.studioflow_websites where slug=p_slug and published_at<=now();
 if w.owner_id is null then raise exception 'Salon unavailable'; end if;
 select v into chosen from jsonb_array_elements(studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)) v
  where v->>'time'=p_time and v->>'stylistId'=p_stylist and coalesce((v->>'available')::boolean,false);
 if chosen is null then raise exception 'Choose an available demo time'; end if;
 select jsonb_agg(s),string_agg(s->>'name',' + '),sum((s->>'price')::numeric),sum((s->>'durationMinutes')::int)
  into items,names,list_price,minutes from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 select s->>'name' into staff_name from jsonb_array_elements(w.content->'stylists') s where s->>'id'=p_stylist;
 insert into public.studioflow_demo_bookings(customer_id,owner_id,request_id,payload)
 values(auth.uid(),w.owner_id,p_request,jsonb_build_object('demo',true,'source','nexora_demo','serviceId',p_services->>0,'serviceItems',items,
  'serviceName',names,'servicePrice',0,'listPrice',list_price,'durationMinutes',minutes,'date',p_date,'time',p_time,
  'stylistId',p_stylist,'stylistName',staff_name,'clientName',btrim(p_name),'clientPhone',btrim(p_phone),
  'branchId',chosen->>'branchId','branchName',chosen->>'branchName','requestFingerprint',finger,
  'amountPaid',0,'paymentStatus','demo_no_payment','status','confirmed')) returning * into prior;
 return to_jsonb(prior);
end $$;
revoke all on function studioflow_android_private.demo_book(text,jsonb,date,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function studioflow_android_private.demo_book(text,jsonb,date,text,text,text,text,uuid) to authenticated;

-- The wrapper requires an authenticated caller and selects the same explicit
-- branch used by the slot lookup; the private function rechecks availability.
create or replace function public.studioflow_branch_demo_book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_request uuid,p_branch uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_branch is null then raise exception 'Choose a location before booking'; end if;
 perform set_config('studioflow.branch_id',p_branch::text,true);
 return studioflow_android_private.demo_book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_request);
end $$;
revoke all on function public.studioflow_branch_demo_book(text,jsonb,date,text,text,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.studioflow_branch_demo_book(text,jsonb,date,text,text,text,text,uuid,uuid) to authenticated;

-- Template 15 uses its own receipt before delegating to the shared booking
-- engine. Do not let an idempotent retry return another branch or specialist.
-- Coupon and bundle handling are the existing Template 15 implementation.
create or replace function public.studioflow_mens_book(p_slug text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; selected jsonb; result jsonb; quote jsonb; existing public.studioflow_bookings; code text:=btrim(coalesce(p_request->>'couponCode','')); request_id uuid; ids jsonb; selected_branch uuid; branch_count integer;
begin
 if auth.uid() is null then raise exception 'Sign in to book' using errcode='42501';end if;
 request_id:=(p_request->>'requestId')::uuid;if request_id is null then raise exception 'Request ID is required';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then raise exception 'Men''s studio unavailable';end if;
 selected_branch:=nullif(p_request->>'branchId','')::uuid;
 if selected_branch is null then
  select count(*) into branch_count from public.branches where site_id=w.owner_id and is_active;
  if branch_count>1 then raise exception 'Choose a location before booking';end if;
  if branch_count=1 then select id into selected_branch from public.branches where site_id=w.owner_id and is_active limit 1;
  elsif exists(select 1 from public.branches where site_id=w.owner_id) then raise exception 'Selected location is unavailable';end if;
 end if;
 if selected_branch is not null and not exists(select 1 from public.branches where site_id=w.owner_id and id=selected_branch and is_active) then raise exception 'Selected location is unavailable';end if;
 perform set_config('studioflow.branch_id',coalesce(selected_branch::text,''),true);
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||auth.uid()::text,15));
 select * into existing from public.studioflow_bookings where owner_id=w.owner_id and customer_id=auth.uid() and payload->>'mensRequestId'=request_id::text;
 if existing.id is not null then
  if coalesce(existing.payload->'serviceIds',jsonb_build_array(existing.payload->>'serviceId')) is distinct from coalesce(p_request->'serviceIds',jsonb_build_array(p_request->>'serviceId')||coalesce(p_request->'addOnIds','[]')) then raise exception 'Request changed. Start a new reservation';end if;
  if existing.payload->>'serviceId' is distinct from p_request->>'serviceId' or existing.payload->>'date' is distinct from p_request->>'date' or existing.payload->>'time' is distinct from p_request->>'time' or coalesce(existing.payload->>'couponCode','') is distinct from upper(code)
   or existing.branch_id is distinct from selected_branch
   or coalesce(p_request->>'stylistId','') not in ('any','any_available','any-specialist',existing.stylist_id) then raise exception 'Request changed. Start a new reservation';end if;
  return existing.payload;
 end if;
 ids:=coalesce(p_request->'serviceIds',jsonb_build_array(p_request->>'serviceId')||coalesce(p_request->'addOnIds','[]'));
 select x into selected from jsonb_array_elements(studioflow_android_private.slots(p_slug,ids,(p_request->>'date')::date,p_request->>'stylistId')) x where x->>'time'=p_request->>'time' and coalesce((x->>'available')::boolean,false);
 if selected is null then raise exception 'This slot has just been booked or is unavailable. Choose another time';end if;
 if code<>'' then
  quote:=public.studioflow_mens_coupon_quote(p_slug,ids,code);
  if (p_request->>'couponExpectedTotal')::numeric is distinct from (quote->>'finalPrice')::numeric then raise exception 'Price changed. Reapply the coupon';end if;
  if not quote ? 'mensOfferId' then
   result:=studioflow_private.coupon_book(p_slug,p_request||jsonb_build_object('stylistId',selected->>'stylistId'));
   update public.studioflow_bookings set payload=payload||jsonb_build_object('mensRequestId',request_id,'serviceId',ids->>0,'serviceIds',ids) where id=(result->>'id')::uuid returning payload into result;
   return result;
  end if;
 end if;
 result:=studioflow_private.book_with_addons(p_slug,(p_request-'servicePrice'-'discountAmount'-'coupon'-'originalPrice')||jsonb_build_object('stylistId',selected->>'stylistId','serviceIds',ids));
 result:=result||jsonb_build_object('mensRequestId',request_id,'serviceId',ids->>0,'serviceIds',ids,'couponCode',upper(code));
 if quote is not null then result:=result||jsonb_build_object('coupon',quote,'originalPrice',quote->'originalPrice','discountAmount',quote->'discountAmount','servicePrice',quote->'finalPrice');end if;
 update public.studioflow_bookings set payload=result where id=(result->>'id')::uuid;
 return result;
end $$;
revoke all on function public.studioflow_mens_book(text,jsonb) from public,anon,authenticated;
grant execute on function public.studioflow_mens_book(text,jsonb) to authenticated;

-- The separately deployed normalized storefront returns salon_services IDs;
-- staff_services also has a foreign key to salon_services, not services. Keep
-- that catalogue authoritative for price, duration, eligibility and assignments.
-- Legacy services IDs are accepted only when the same salon has exactly one
-- explicit editor_key provenance link; names and cross-tenant guesses never map.
-- Both optional legacy functions retain their existing owners and EXECUTE ACLs.
do $normalized$
declare original text; patched text; missing text;
begin
 if to_regprocedure('public.nexora_customer_booking_options(uuid,uuid[],date,uuid)') is not null
    or to_regprocedure('public.nexora_save_owner_workspace(jsonb)') is not null then
  if to_regprocedure('public.nexora_catalog_uuid(uuid,text,text)') is null
    or to_regclass('public.services') is null or to_regclass('public.salon_services') is null then
   raise exception 'Normalized catalogue prerequisites are missing; review booking repair';
  end if;
  execute $definition$
   create or replace function studioflow_private.normalized_booking_service_ids(p_salon_id uuid,p_service_ids uuid[])
   returns uuid[] language sql stable set search_path='' as $function$
    with requested as (select x.id from unnest(coalesce(p_service_ids,'{}'::uuid[])) x(id)),
    candidates as (
     select r.id requested_id,s.id actual_id
      from requested r join public.salon_services s on s.id=r.id and s.salon_id=p_salon_id
      where s.is_active=true and s.status='active' and s.is_bookable_online=true
     union
     select r.id,s.id
      from requested r join public.services old on old.id=r.id and old.salon_id=p_salon_id
       and old.is_active=true and old.is_bookable_online=true
      join public.salon_services s on s.salon_id=p_salon_id and left(s.editor_key,8)='service:'
       and length(s.editor_key)>8
       and public.nexora_catalog_uuid(p_salon_id,'service',substring(s.editor_key from 9))=old.id
      where s.is_active=true and s.status='active' and s.is_bookable_online=true
    ), resolved as (
     select r.id,count(c.actual_id) matches,min(c.actual_id::text)::uuid actual_id
     from requested r left join candidates c on c.requested_id=r.id group by r.id
    )
    select case
     when coalesce(cardinality(p_service_ids),0) not between 1 and 10
       or cardinality(p_service_ids)<>(select count(distinct id) from requested)
       or exists(select 1 from resolved where matches<>1)
       or cardinality(p_service_ids)<>(select count(distinct actual_id) from resolved)
      then null
     else (select array_agg(actual_id order by actual_id) from resolved) end
   $function$
  $definition$;
  execute 'revoke all on function studioflow_private.normalized_booking_service_ids(uuid,uuid[]) from public,anon,authenticated';

  -- The owner workspace writes services before its after-save catalogue sync.
  -- Materialize the exact editor-key row for a newly assigned service first;
  -- otherwise the old writer tries to insert a services UUID into a foreign key
  -- targeting salon_services. Existing unmatched IDs fail closed. This helper
  -- is private and is only invoked after the owner RPC has authorized target.
  execute $definition$
   create or replace function studioflow_private.normalized_editor_assignment_id(p_salon_id uuid,p_raw text,p_state jsonb)
   returns uuid language plpgsql set search_path='' as $function$
   declare item jsonb; result uuid; matches integer;
   begin
    if nullif(p_raw,'') is null or not exists(select 1 from public.services s
      where s.salon_id=p_salon_id and s.id=public.nexora_catalog_uuid(p_salon_id,'service',p_raw) and s.is_active=true) then
     raise exception 'Assigned service is not available in this salon' using errcode='22023';
    end if;
    select count(*) into matches from jsonb_array_elements(case when jsonb_typeof(p_state->'services')='array' then p_state->'services' else '[]'::jsonb end) v
     where v->>'id'=p_raw;
    if matches>1 then raise exception 'Duplicate editor service ID' using errcode='22023'; end if;
    if matches=1 then
     select v into item from jsonb_array_elements(p_state->'services') v where v->>'id'=p_raw;
     insert into public.salon_services(salon_id,name,category,description,price,price_paise,duration_minutes,icon,is_active,is_bookable_online,is_featured,display_order,editor_key)
     values(p_salon_id,btrim(item->>'name'),coalesce(nullif(item->>'category',''),'General'),nullif(item->>'description',''),
      greatest(0,coalesce((item->>'price')::numeric,0)),round(greatest(0,coalesce((item->>'price')::numeric,0))*100)::bigint,
      greatest(1,coalesce((item->>'durationMinutes')::int,45)),coalesce(nullif(item->>'icon',''),'sparkles'),
      true,coalesce((item->>'isBookableOnline')::boolean,true),coalesce((item->>'popular')::boolean,false),
      coalesce((item->>'sortOrder')::int,0),'service:'||p_raw)
     on conflict(salon_id,editor_key) do update set name=excluded.name,category=excluded.category,description=excluded.description,
      price=excluded.price,price_paise=excluded.price_paise,duration_minutes=excluded.duration_minutes,icon=excluded.icon,
      is_active=excluded.is_active,is_bookable_online=excluded.is_bookable_online,is_featured=excluded.is_featured,
      display_order=excluded.display_order,updated_at=now();
    end if;
    select s.id into result from public.salon_services s
     where s.salon_id=p_salon_id and s.editor_key='service:'||p_raw and s.is_active=true and s.status='active';
    if result is null then
     raise exception 'Assigned service has no active same-salon catalogue entry; save and review the service first' using errcode='22023';
    end if;
    return result;
   end $function$
  $definition$;
  execute 'revoke all on function studioflow_private.normalized_editor_assignment_id(uuid,text,jsonb) from public,anon,authenticated';
 end if;

 -- The existing catalogue sync updates price without updating price_paise.
 -- On the reviewed schema the BEFORE UPDATE money trigger then restores the
 -- old price, so an unassigned service can keep a stale public/booking price.
 -- Preserve the rest of the deployed sync body and its privileges.
 if (to_regprocedure('public.nexora_customer_booking_options(uuid,uuid[],date,uuid)') is not null
     or to_regprocedure('public.nexora_save_owner_workspace(jsonb)') is not null)
    and to_regprocedure('public.sync_owner_template_catalogue()') is not null then
  select pg_get_functiondef('public.sync_owner_template_catalogue()'::regprocedure) into original;
  if position('price_paise=round(excluded.price*100)::bigint' in original)=0 then
   if position('price=excluded.price,duration_minutes=excluded.duration_minutes' in original)=0 then
    raise exception 'Unexpected sync_owner_template_catalogue definition: review normalized price synchronization';
   end if;
   patched:=replace(original,'price=excluded.price,duration_minutes=excluded.duration_minutes',
    'price=excluded.price,price_paise=round(excluded.price*100)::bigint,duration_minutes=excluded.duration_minutes');
   execute patched;
  end if;
  -- A workspace save includes its authorized target salon. The old trigger
  -- ignored it and projected into the owner's newest salon instead, including
  -- another salon's service IDs. Honor the explicit target; an owner with
  -- several salons must choose one instead of projecting into the newest.
  select pg_get_functiondef('public.sync_owner_template_catalogue()'::regprocedure) into original;
  if position('booking_selected_salon_guard' in original)=0 then
   if position('select s.id into sid from public.salons s join public.organization_members m' in original)=0
      or position('and s.deleted_at is null order by s.created_at desc limit 1;' in original)=0
      or position('if sid is null then return new; end if;' in original)=0 then
    raise exception 'Unexpected sync_owner_template_catalogue definition: review normalized tenant targeting';
   end if;
   patched:=replace(original,'select s.id into sid from public.salons s join public.organization_members m', $target$
    if nullif(btrim(new.state->>'salonId'),'') is null and
     (select count(distinct s.id) from public.salons s join public.organization_members m on m.organization_id=s.organization_id
      where m.user_id=new.owner_id and m.status='active' and m.role in ('owner','manager') and s.deleted_at is null)>1 then
     raise exception 'Select a salon before saving this workspace' using errcode='22023';
    end if;
    select s.id into sid from public.salons s join public.organization_members m$target$);
   patched:=replace(patched,'and s.deleted_at is null order by s.created_at desc limit 1;',
    'and s.deleted_at is null and (nullif(btrim(new.state->>''salonId''),'''') is null or s.id::text=lower(btrim(new.state->>''salonId''))) order by s.created_at desc limit 1; -- booking_selected_salon_guard');
   patched:=replace(patched,'if sid is null then return new; end if;',
    'if sid is null and nullif(btrim(new.state->>''salonId''),'''') is not null then raise exception ''Selected salon is not available to this owner'' using errcode=''42501''; end if; if sid is null then return new; end if;');
   execute patched;
  end if;
 end if;

 if to_regprocedure('public.nexora_save_owner_workspace(jsonb)') is not null then
  select pg_get_functiondef('public.nexora_save_owner_workspace(jsonb)'::regprocedure) into original;
  if position('studioflow_private.normalized_editor_assignment_id' in original)=0 then
   if position('values (local_id, svc_id, true)' in original)=0
      or position('public.nexora_catalog_uuid(target, ''service''' in original)=0 then
    raise exception 'Unexpected nexora_save_owner_workspace definition: review normalized service assignments';
   end if;
   patched:=replace(original,'values (local_id, svc_id, true)',
    'values (local_id, studioflow_private.normalized_editor_assignment_id(target, trim(both ''"'' from schedule::text), p_state), true)');
   execute patched;
  end if;
 end if;

 if to_regprocedure('public.nexora_customer_booking_options(uuid,uuid[],date,uuid)') is not null then
  select pg_get_functiondef('public.nexora_customer_booking_options(uuid,uuid[],date,uuid)'::regprocedure) into original;
  if position('normalized_booking_service_ids' in original)=0 and
     (position('from public.services' in original)=0 or position('where ss_any.staff_id = st.id' in original)=0
      or position('where ss.staff_id = st.id' in original)=0) then
   raise exception 'Unexpected nexora_customer_booking_options definition: review normalized booking repair';
  end if;
  -- The reviewed production function referred to nonexistent bookings columns
  -- and staff_time_off. Require the actual normalized schema rather than deploy
  -- an RPC that appears installed but fails or silently ignores conflicts.
  select string_agg(required.t||'.'||required.c,', ' order by required.t,required.c) into missing
  from (values ('bookings','salon_id'),('bookings','staff_id'),('bookings','appointment_date'),('bookings','booking_date'),
    ('bookings','start_time'),('bookings','end_time'),('bookings','status'),('bookings','booking_status'),
    ('staff_schedules','is_off'),('staff_schedules','is_working'),('staff_leave_requests','staff_id'),
    ('staff_leave_requests','start_date'),('staff_leave_requests','end_date'),('staff_leave_requests','status')) required(t,c)
  where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=required.t and c.column_name=required.c);
  if missing is not null then raise exception 'Normalized booking prerequisites missing: %',missing; end if;
  execute $definition$
   create or replace function public.nexora_customer_booking_options(p_salon_id uuid,p_service_ids uuid[],p_date date,p_staff_id uuid default null)
   returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $function$
   declare
    salon public.salons%rowtype; hours public.salon_hours%rowtype; specialist record;
    candidate timestamp; starts timestamptz; duration integer; price bigint; need integer;
    service_ids uuid[]; slots jsonb:='[]'::jsonb; specialists jsonb:='[]'::jsonb; free boolean;
   begin
    select * into salon from public.salons where id=p_salon_id and is_active=true and is_listed=true
     and online_booking_enabled=true and deleted_at is null;
    if not found then return jsonb_build_object('available_slots','[]'::jsonb,'available_staff','[]'::jsonb,'closed',true); end if;
    service_ids:=studioflow_private.normalized_booking_service_ids(p_salon_id,p_service_ids);
    if service_ids is null or p_date is null or p_date<(now() at time zone coalesce(nullif(salon.timezone,''),'Asia/Kolkata'))::date
      or p_date>(now() at time zone coalesce(nullif(salon.timezone,''),'Asia/Kolkata'))::date+90 then
     return jsonb_build_object('available_slots','[]'::jsonb,'available_staff','[]'::jsonb);
    end if;
    select count(*),coalesce(sum(duration_minutes),0),coalesce(sum(price_paise),0) into need,duration,price
    from public.salon_services where salon_id=p_salon_id and id=any(service_ids) and is_active=true
     and status='active' and is_bookable_online=true and price_paise is not null and price_paise>=0 and duration_minutes>0
    having count(*)=cardinality(service_ids);
    if not found or duration<=0 or duration>1440 then return jsonb_build_object('available_slots','[]'::jsonb,'available_staff','[]'::jsonb); end if;
    select * into hours from public.salon_hours where salon_id=p_salon_id and day_of_week=extract(dow from p_date)::integer and not is_closed;
    if not found or hours.opens_at is null or hours.closes_at is null or hours.closes_at<=hours.opens_at then
     return jsonb_build_object('available_slots','[]'::jsonb,'available_staff','[]'::jsonb,'closed',true);
    end if;
    for specialist in
     select st.id,st.full_name,st.role_title,st.profile_photo_url,sc.start_time,sc.end_time
     from public.staff st join public.staff_schedules sc on sc.staff_id=st.id and sc.day_of_week=extract(dow from p_date)::integer
     where st.salon_id=p_salon_id and st.is_active=true and st.is_public=true and st.employment_status='active' and st.deleted_at is null
      and (p_staff_id is null or st.id=p_staff_id) and sc.is_working=true and not sc.is_off
      and sc.start_time is not null and sc.end_time is not null and sc.end_time>sc.start_time
      and not exists(select 1 from public.staff_leave_requests l where l.staff_id=st.id and l.status='approved' and p_date between l.start_date and l.end_date)
      and (
       not exists(select 1 from public.staff_services ss_any join public.salon_services a on a.id=ss_any.service_id
        where ss_any.staff_id=st.id and ss_any.is_active=true and a.salon_id=p_salon_id and a.is_active=true and a.status='active')
       or (select count(distinct ss.service_id) from public.staff_services ss join public.salon_services a on a.id=ss.service_id
        where ss.staff_id=st.id and ss.is_active=true and a.salon_id=p_salon_id and a.is_active=true and a.status='active'
         and ss.service_id=any(service_ids))=need
      )
     order by coalesce(st.display_order,0),st.full_name
    loop
     specialists:=specialists||jsonb_build_array(jsonb_build_object('id',specialist.id,'name',specialist.full_name,'role_title',specialist.role_title,'photo_url',specialist.profile_photo_url));
    end loop;
    candidate:=p_date+hours.opens_at;
    while candidate+make_interval(mins=>duration)<=p_date+hours.closes_at loop
     starts:=candidate at time zone coalesce(nullif(salon.timezone,''),'Asia/Kolkata');
     free:=false;
     for specialist in
      select st.id,sc.start_time,sc.end_time from public.staff st join public.staff_schedules sc on sc.staff_id=st.id and sc.day_of_week=extract(dow from p_date)::integer
      where st.id in (select (value->>'id')::uuid from jsonb_array_elements(specialists))
     loop
      if starts>now() and starts<=now()+interval '90 days'
       and candidate::time>=greatest(hours.opens_at,specialist.start_time)
       and candidate+make_interval(mins=>duration)<=p_date+least(hours.closes_at,specialist.end_time)
       and not exists(select 1 from public.bookings b where b.salon_id=p_salon_id
        and (b.staff_id=specialist.id or b.staff_id is null)
        -- Unknown legacy states remain blocking; only known terminal states
        -- release a slot. booking_status takes precedence over legacy status.
        and lower(coalesce(nullif(btrim(b.booking_status),''),nullif(btrim(b.status),''),'pending')) not in ('cancelled','canceled','completed','no_show','expired')
        -- Inconsistent dates block both named days rather than guessing.
        and (b.appointment_date is null and b.booking_date is null or b.appointment_date=p_date or b.booking_date=p_date)
        and (b.start_time is null or b.end_time is null or b.end_time<=b.start_time
         or tsrange(p_date+b.start_time,p_date+b.end_time,'[)') && tsrange(candidate,candidate+make_interval(mins=>duration),'[)')))
      then free:=true; exit; end if;
     end loop;
     if free then slots:=slots||jsonb_build_array(jsonb_build_object('time',to_char(candidate,'HH24:MI'),'starts_at',starts,'ends_at',starts+make_interval(mins=>duration))); end if;
     candidate:=candidate+interval '30 minutes';
    end loop;
    return jsonb_build_object('available_slots',slots,'available_staff',specialists,'duration_minutes',duration,'total_paise',price);
   end $function$
  $definition$;
 end if;
end $normalized$;

-- New helpers are private. Public callers retain the existing narrowly scoped
-- RPC EXECUTE grants; private appointments and staff schedules stay under RLS.
revoke all on function studioflow_private.booking_weekday(text),studioflow_private.booking_time(text),studioflow_private.booking_duration(text),studioflow_private.booking_hours_enabled(jsonb),studioflow_private.booking_service_active(jsonb),studioflow_private.booking_staff_can_perform(jsonb,jsonb,jsonb),studioflow_private.booking_business_window(uuid,uuid,date),studioflow_private.booking_workspace_branch_schedule(jsonb,jsonb,uuid,text),studioflow_private.booking_staff_window(uuid,uuid,date,text),studioflow_private.booking_bundle_window_allowed(text,jsonb,date,text,time),studioflow_private.booking_slots(text,jsonb,date,text,uuid),studioflow_private.validate_studioflow_booking_branch(),studioflow_private.sync_branches_from_workspace() from public,anon,authenticated;
-- CREATE OR REPLACE preserves prior ACLs, but explicitly set the intended public
-- read entry points too, so an installation missing an older definition does
-- not inherit PostgreSQL's default PUBLIC function privilege.
revoke all on function public.studioflow_mens_slots(text,text,date,text,uuid),public.studioflow_branch_specialists(text,text,uuid) from public,anon,authenticated;
grant execute on function public.studioflow_mens_slots(text,text,date,text,uuid),public.studioflow_branch_specialists(text,text,uuid) to anon,authenticated,service_role;

commit;
