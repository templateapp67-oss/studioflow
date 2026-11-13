-- Template 12 (Iron & Ink) multi-branch support.
-- Runs only after 20261113120946_template12_iron_ink.sql creates the ink schema.
begin;

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
