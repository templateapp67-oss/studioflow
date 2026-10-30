begin;

-- Refuse to discard distinct branch schedules when restoring the legacy
-- Template 12 unique keys. Consolidate those rows before retrying rollback.
do $$ begin
  if exists(select 1 from public.ink_availability group by site_id,artist_id,day_of_week,start_time having count(*)>1) then
    raise exception 'Cannot rollback: merge branch-specific Template 12 availability rows before removing branch links';
  end if;
  if exists(select 1 from public.ink_blocked_dates where artist_id is not null group by site_id,artist_id,date having count(*)>1) then
    raise exception 'Cannot rollback: merge branch-specific blocked dates before removing branch links';
  end if;
end $$;

drop trigger if exists studioflow_sync_branches_after_workspace on public.studioflow_accounts;
drop trigger if exists studioflow_booking_branch_guard on public.studioflow_bookings;
drop trigger if exists ink_booking_branch_guard on public.ink_bookings;
drop function if exists studioflow_private.sync_branches_from_workspace();
drop function if exists studioflow_private.validate_studioflow_booking_branch();
drop function if exists studioflow_private.validate_ink_booking_branch();

drop function if exists public.studioflow_public_branches(text);
drop function if exists public.studioflow_branch_specialists(text,text,uuid);
drop function if exists public.studioflow_branch_available_slots(text,text,date,text,uuid);
drop function if exists public.studioflow_branch_android_slots(text,jsonb,date,text,uuid);
drop function if exists public.studioflow_branch_book(text,jsonb);
drop function if exists public.studioflow_branch_android_book(text,jsonb,date,text,text,text,text,text,uuid,uuid);
drop function if exists public.studioflow_branch_coupon_book(text,jsonb);
drop function if exists studioflow_private.branch_slots(text,jsonb,date,text,uuid);
drop function if exists studioflow_private.branch_is_open(uuid,date,time,time);
drop function if exists public.get_branch_available_slots(uuid,uuid,date,integer,uuid);
drop function if exists public.create_branch_booking(uuid,uuid,text,text,text,uuid,uuid,date,time,date,numeric,text,text,text[]);

-- Restore the original shared private validators that the migration wrapped.
drop function if exists studioflow_private.availability(text,text,date,text);
alter function studioflow_private.availability_unbranched(text,text,date,text) rename to availability;
grant execute on function studioflow_private.availability(text,text,date,text) to anon,authenticated,service_role;
drop function if exists studioflow_android_private.slots(text,jsonb,date,text);
alter function studioflow_android_private.slots_unbranched(text,jsonb,date,text) rename to slots;
grant execute on function studioflow_android_private.slots(text,jsonb,date,text) to anon,authenticated,service_role;
create or replace function studioflow_ink_private.validate_booking_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare cat public.ink_categories; settings public.ink_studio_settings; digits text; age integer; duration integer; avail boolean;
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
  perform pg_advisory_xact_lock(hashtextextended(new.site_id::text||new.artist_id::text||new.booking_date::text,12));
  if new.booking_date<current_date then raise exception 'Choose a future booking date'; end if;
  if (select count(*) from public.ink_bookings b where b.site_id=new.site_id and regexp_replace(b.phone,'[^0-9]','','g')=digits and b.created_at>now()-interval '10 minutes')>=3 then raise exception 'Too many booking attempts. Please try again later.'; end if;
  if not exists(select 1 from public.get_available_slots(new.site_id,new.artist_id,new.booking_date,duration) s where s.start_time=new.start_time) then raise exception 'That time is not available. Please choose another slot.'; end if;
  if exists(select 1 from public.ink_bookings b where b.site_id=new.site_id and b.artist_id=new.artist_id and b.booking_date=new.booking_date and b.status<>'cancelled' and tsrange(new.booking_date+new.start_time,(new.booking_date+new.start_time)+(duration||' minutes')::interval,'[)') && tsrange(b.booking_date+b.start_time,(b.booking_date+b.start_time)+(greatest(coalesce((select c.duration_min from public.ink_categories c where c.site_id=b.site_id and c.id=b.category_id),60),30)||' minutes')::interval,'[)')) then raise exception 'This artist already has a booking at that time'; end if;
  if cardinality(new.reference_images)>0 and exists(select 1 from unnest(new.reference_images) p where p !~ ('^'||new.site_id::text||'/')) then raise exception 'Reference images must use this site storage path'; end if;
 end if;
 return new;
end $$;
revoke all on function studioflow_ink_private.validate_booking_write() from public,anon,authenticated;
create or replace function public.studioflow_owner_walk_in(p_request jsonb) returns jsonb
language sql security invoker set search_path='' as $$select studioflow_private.owner_walk_in(p_request)$$;
revoke all on function public.studioflow_owner_walk_in(jsonb) from public,anon,authenticated;
grant execute on function public.studioflow_owner_walk_in(jsonb) to authenticated;
create or replace function public.studioflow_android_reschedule(p_booking uuid,p_date date,p_time text,p_stylist text) returns jsonb
language sql security invoker set search_path='' as $$select studioflow_android_private.reschedule(p_booking,p_date,p_time,p_stylist)$$;
revoke all on function public.studioflow_android_reschedule(uuid,date,text,text) from public,anon,authenticated;
grant execute on function public.studioflow_android_reschedule(uuid,date,text,text) to authenticated;

drop policy if exists studioflow_bookings_branch_staff_read on public.studioflow_bookings;
drop policy if exists ink_bookings_branch_staff_read on public.ink_bookings;
update public.studioflow_bookings set payload=payload-'branchId'-'branchName' where payload ? 'branchId' or payload ? 'branchName';

alter table public.studioflow_bookings drop constraint if exists studioflow_bookings_branch_fk;
drop index if exists public.studioflow_bookings_branch_calendar_idx;
alter table public.studioflow_bookings drop column if exists branch_id;

alter table public.ink_bookings drop constraint if exists ink_bookings_branch_fk;
drop index if exists public.ink_bookings_branch_calendar_idx;
alter table public.ink_bookings drop column if exists branch_id;

alter table public.ink_availability drop constraint if exists ink_availability_branch_fk;
drop index if exists public.ink_availability_branch_lookup_idx;
drop index if exists public.ink_availability_branch_unique_idx;
alter table public.ink_availability add constraint ink_availability_site_id_artist_id_day_of_week_start_time_key unique(site_id,artist_id,day_of_week,start_time);
alter table public.ink_availability drop column if exists branch_id;

alter table public.ink_blocked_dates drop constraint if exists ink_blocked_dates_branch_fk;
drop index if exists public.ink_blocked_dates_branch_lookup_idx;
drop index if exists public.ink_blocked_dates_branch_unique_idx;
alter table public.ink_blocked_dates add constraint ink_blocked_dates_site_id_artist_id_date_key unique(site_id,artist_id,date);
alter table public.ink_blocked_dates drop column if exists branch_id;

-- Restore the Template 12 public projection without its additive branches key.
create or replace function public.get_template12_site(p_site_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 select jsonb_build_object(
  'site_id',p_site_id,
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

drop table if exists public.studioflow_branch_inventory;
drop table if exists public.studioflow_staff_branch_schedules;
drop table if exists public.studioflow_branch_staff_members;
drop table if exists public.branches;

commit;
