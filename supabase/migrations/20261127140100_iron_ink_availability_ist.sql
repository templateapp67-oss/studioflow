-- Template 12 has a separate tattoo-request system, not a Razorpay checkout.
-- Keep its existing pending/unpaid and adult-safety rules while making guest
-- availability use the same Asia/Kolkata calendar and conflict boundaries.
begin;

create or replace function public.get_available_slots(p_site_id uuid,p_artist_id uuid,p_date date,p_duration_min integer default 60)
returns table(start_time time,end_time time)
language sql stable security definer set search_path='' as $$
 select s.slot::time,(s.slot+make_interval(mins=>greatest(p_duration_min,30)))::time
 from public.ink_availability a
 join public.ink_artists artist on artist.site_id=a.site_id and artist.id=a.artist_id and artist.is_active
 cross join lateral generate_series((p_date+a.start_time)::timestamp,(p_date+a.end_time-make_interval(mins=>greatest(p_duration_min,30)))::timestamp,interval '30 minutes') s(slot)
 where a.site_id=p_site_id and a.artist_id=p_artist_id and a.day_of_week=extract(dow from p_date)::int and not a.is_off
  and exists(select 1 from public.studioflow_websites w where w.owner_id=p_site_id and w.published_at<=now() and w.content->'profile'->>'businessType'='tattoo_studio')
  and p_duration_min between 1 and 1440
  and p_date between (now() at time zone 'Asia/Kolkata')::date and (now() at time zone 'Asia/Kolkata')::date+90
  and (s.slot at time zone 'Asia/Kolkata')>now()
  and not exists(select 1 from public.ink_blocked_dates d where d.site_id=p_site_id and d.date=p_date and (d.artist_id=p_artist_id or d.artist_id is null))
  and not exists(select 1 from public.ink_bookings b where b.site_id=p_site_id and b.artist_id=p_artist_id and b.booking_date=p_date and b.status<>'cancelled'
   and tsrange(p_date+b.start_time,p_date+b.start_time+make_interval(mins=>greatest(coalesce((select c.duration_min from public.ink_categories c where c.site_id=b.site_id and c.id=b.category_id),60),30)),'[)')
    && tsrange(s.slot,s.slot+make_interval(mins=>greatest(p_duration_min,30)),'[)'))
 order by s.slot
$$;
revoke all on function public.get_available_slots(uuid,uuid,date,integer) from public,anon,authenticated;
grant execute on function public.get_available_slots(uuid,uuid,date,integer) to anon,authenticated,service_role;

-- Branch-specific Iron Ink support is an optional, separately deployed feature.
-- Replace its RPC only if it already exists; do not add its columns or enable it
-- implicitly in production. A legacy shared artist schedule applies only when
-- there is exactly one active branch. Conflicts cover the artist across branches.
do $install$
begin
 if to_regprocedure('public.get_branch_available_slots(uuid,uuid,date,integer,uuid)') is not null then
  execute $branch$
   create or replace function public.get_branch_available_slots(p_site_id uuid,p_artist_id uuid,p_date date,p_duration_min integer,p_branch_id uuid)
   returns table(start_time time,end_time time) language sql stable security definer set search_path='' as $body$
    with hours as (
     select studioflow_private.booking_time(coalesce(h->>'fromTime',h->>'opening_time',h->>'opens_at',h->>'start_time')) open_time,
            studioflow_private.booking_time(coalesce(h->>'toTime',h->>'closing_time',h->>'closes_at',h->>'end_time')) close_time
     from public.branches b cross join lateral jsonb_array_elements(case when jsonb_typeof(b.operating_hours)='array' then b.operating_hours else '[]'::jsonb end) h
     where b.site_id=p_site_id and b.id=p_branch_id and b.is_active
      and studioflow_private.booking_weekday(coalesce(h->>'day',h->>'day_of_week',h->>'weekday'))=extract(dow from p_date)::int
      and studioflow_private.booking_hours_enabled(h)
    ), windows as (
     select a.start_time avail_start,a.end_time avail_end from public.ink_availability a
     join public.ink_artists artist on artist.site_id=a.site_id and artist.id=a.artist_id and artist.is_active
     where a.site_id=p_site_id and a.artist_id=p_artist_id and a.day_of_week=extract(dow from p_date)::int and not a.is_off
      and (a.branch_id=p_branch_id or (a.branch_id is null
       and (select count(*) from public.branches b where b.site_id=p_site_id and b.is_active)=1
       and not exists(select 1 from public.ink_availability specific where specific.site_id=a.site_id and specific.artist_id=a.artist_id and specific.day_of_week=a.day_of_week and specific.branch_id=p_branch_id)))
    ), slots as (
     select s.slot,s.slot+make_interval(mins=>greatest(p_duration_min,30)) finish
     from windows w cross join hours h cross join lateral generate_series((p_date+w.avail_start)::timestamp,(p_date+w.avail_end-make_interval(mins=>greatest(p_duration_min,30)))::timestamp,interval '30 minutes') s(slot)
     where h.open_time is not null and h.close_time>h.open_time and s.slot>=p_date+h.open_time and s.slot+make_interval(mins=>greatest(p_duration_min,30))<=p_date+h.close_time
    )
    select distinct s.slot::time,s.finish::time from slots s
    where exists(select 1 from public.studioflow_websites w where w.owner_id=p_site_id and w.published_at<=now() and w.content->'profile'->>'businessType'='tattoo_studio')
     and p_duration_min between 1 and 1440
     and p_date between (now() at time zone 'Asia/Kolkata')::date and (now() at time zone 'Asia/Kolkata')::date+90
     and (s.slot at time zone 'Asia/Kolkata')>now()
     and not exists(select 1 from public.ink_blocked_dates d where d.site_id=p_site_id and d.date=p_date and (d.artist_id=p_artist_id or d.artist_id is null) and (d.branch_id=p_branch_id or d.branch_id is null))
     and not exists(select 1 from public.ink_bookings b where b.site_id=p_site_id and b.artist_id=p_artist_id and b.booking_date=p_date and b.status<>'cancelled'
      and tsrange(p_date+b.start_time,p_date+b.start_time+make_interval(mins=>greatest(coalesce((select c.duration_min from public.ink_categories c where c.site_id=b.site_id and c.id=b.category_id),60),30)),'[)') && tsrange(s.slot,s.finish,'[)'))
    order by 1
   $body$
  $branch$;
  execute 'revoke all on function public.get_branch_available_slots(uuid,uuid,date,integer,uuid) from public,anon,authenticated';
  execute 'grant execute on function public.get_branch_available_slots(uuid,uuid,date,integer,uuid) to anon,authenticated,service_role';
 end if;
end $install$;

-- Preserve the existing tattoo age, reference, rate-limit and pending-request
-- protections. Both legacy and optional branch schemas use a single per-artist
-- advisory lock, then re-check the same slot before creating the request.
create or replace function studioflow_ink_private.validate_booking_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare cat public.ink_categories; settings public.ink_studio_settings; digits text; client_age integer; duration integer; selected_branch uuid; allowed boolean;
begin
 if new.site_id is null or not exists(select 1 from public.studioflow_accounts where user_id=new.site_id) then raise exception 'Unknown StudioFlow site'; end if;
 if tg_op='UPDATE' and auth.uid() is distinct from new.site_id then
  if new.status<>'cancelled' or (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Customers may only cancel their own booking'; end if;
  return new;
 end if;
 if tg_op='INSERT' then
  digits:=regexp_replace(new.phone,'[^0-9]','','g');
  if length(digits)<10 or length(digits)>15 then raise exception 'Enter a valid phone number'; end if;
  if new.email<>'' and new.email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' then raise exception 'Enter a valid email address'; end if;
  select * into settings from public.ink_studio_settings where site_id=new.site_id;
  if settings.site_id is not null then
   if new.customer_birth_date is null then raise exception 'Date of birth is required to verify the studio age policy'; end if;
   client_age:=date_part('year',age((now() at time zone 'Asia/Kolkata')::date,new.customer_birth_date));
   if client_age<settings.min_age then raise exception 'Clients must be at least % years old',settings.min_age; end if;
  end if;
  select * into cat from public.ink_categories where site_id=new.site_id and id=new.category_id and is_active;
  if cat.id is null then raise exception 'Choose an active tattoo category'; end if;
  if not exists(select 1 from public.ink_artists where site_id=new.site_id and id=new.artist_id and is_active) then raise exception 'Choose an active artist'; end if;
  duration:=greatest(coalesce(cat.duration_min,60),30);
  perform pg_advisory_xact_lock(hashtextextended(new.site_id::text||new.artist_id::text||new.booking_date::text,12));
  if new.booking_date<(now() at time zone 'Asia/Kolkata')::date then raise exception 'Choose a future booking date'; end if;
  if (select count(*) from public.ink_bookings b where b.site_id=new.site_id and regexp_replace(b.phone,'[^0-9]','','g')=digits and b.created_at>now()-interval '10 minutes')>=3 then raise exception 'Too many booking attempts. Please try again later.'; end if;
  selected_branch:=nullif(to_jsonb(new)->>'branch_id','')::uuid;
  if selected_branch is not null then
   if to_regprocedure('public.get_branch_available_slots(uuid,uuid,date,integer,uuid)') is null then raise exception 'Location availability is unavailable'; end if;
   execute 'select exists(select 1 from public.get_branch_available_slots($1,$2,$3,$4,$5) s where s.start_time=$6)' into allowed using new.site_id,new.artist_id,new.booking_date,duration,selected_branch,new.start_time;
  else
   select exists(select 1 from public.get_available_slots(new.site_id,new.artist_id,new.booking_date,duration) s where s.start_time=new.start_time) into allowed;
  end if;
  if not coalesce(allowed,false) then raise exception 'That time is not available. Please choose another slot.'; end if;
  if exists(select 1 from public.ink_bookings b where b.site_id=new.site_id and b.artist_id=new.artist_id and b.booking_date=new.booking_date and b.status<>'cancelled'
   and tsrange(new.booking_date+new.start_time,(new.booking_date+new.start_time)+make_interval(mins=>duration),'[)')
    && tsrange(b.booking_date+b.start_time,(b.booking_date+b.start_time)+make_interval(mins=>greatest(coalesce((select c.duration_min from public.ink_categories c where c.site_id=b.site_id and c.id=b.category_id),60),30)),'[)')) then raise exception 'This artist already has a booking at that time'; end if;
  if cardinality(new.reference_images)>0 and exists(select 1 from unnest(new.reference_images) p where p !~ ('^'||new.site_id::text||'/')) then raise exception 'Reference images must use this site storage path'; end if;
 end if;
 return new;
end $$;
revoke all on function studioflow_ink_private.validate_booking_write() from public,anon,authenticated;

commit;
