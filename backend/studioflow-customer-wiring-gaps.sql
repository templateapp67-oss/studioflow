-- Gap closure: objects referenced by StudioFlow migrations or called by the
-- web client that were never created in this repository. Safe to apply on a
-- fresh project and idempotent on the shared project.
-- PART 3 of 3: multi-service booking cores + remaining public RPCs + storage +
-- realtime. Apply after customer-reviews/customer-referrals/studioflow-book*
-- migrations (bodies bind to review/reward/booking objects), and before
-- booking-coupons.sql / booking-add-ons.sql / customer-demo-bookings.sql
-- (their bodies bind to slots()/book()).
begin;
-- 5. Multi-service private cores -------------------------------------------
create or replace function studioflow_android_private.slots(p_slug text,p_services jsonb,p_date date,p_stylist text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; v_draft jsonb; ids text[]; total_minutes integer; found_count integer; result jsonb;
begin
 if jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 then return '[]'::jsonb; end if;
 select array_agg(distinct value) into ids from jsonb_array_elements_text(p_services);
 if coalesce(array_length(ids,1),0)<>jsonb_array_length(p_services) then return '[]'::jsonb; end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then return '[]'::jsonb; end if;
 select draft into v_draft from public.studioflow_accounts where user_id=w.owner_id;
 select count(*),coalesce(sum(greatest(1,(s->>'durationMinutes')::int)),0) into found_count,total_minutes
  from jsonb_array_elements(w.content->'services') s where s->>'id'=any(ids);
 if found_count<>array_length(ids,1) or p_date is null or p_date<current_date or p_date>current_date+90 then return '[]'::jsonb; end if;
 with staff as (
  select s,(select entry from jsonb_array_elements(coalesce(s->'schedule','[]'::jsonb)) entry where entry->>'day'=trim(to_char(p_date,'Day'))) as day
  from jsonb_array_elements(coalesce(v_draft->'stylists','[]'::jsonb)) s
  where (p_stylist in ('any','any-specialist','any_available') or s->>'id'=p_stylist)
   and coalesce(s->>'status','Available')='Available'
   and (s->'assignedServices' is null or jsonb_typeof(s->'assignedServices')<>'array' or jsonb_array_length(s->'assignedServices')=0
    or exists(select 1 from jsonb_array_elements_text(s->'assignedServices') a where a=any(ids)))
 ), candidates as (
  select staff.s->>'id' as stylist_id,slot at time zone 'Asia/Kolkata' as starts_at,slot,slot+total_minutes*interval '1 minute' as end_slot
  from staff cross join generate_series(p_date+time '09:00',p_date+time '20:00',interval '30 minutes') slot
  where (staff.day is null and jsonb_array_length(coalesce(staff.s->'schedule','[]'::jsonb))=0)
   or (coalesce((staff.day->>'enabled')::boolean,false) and slot::time>=(staff.day->>'fromTime')::time and (slot+total_minutes*interval '1 minute')::time<=(staff.day->>'toTime')::time)
 ), availability as (
  select to_char(slot,'HH24:MI') as time,to_char(slot,'HH12:MI AM') as label,stylist_id,
  starts_at>now()+greatest(0,coalesce((v_draft->'extras'->>'bookingLeadHours')::numeric,0))*interval '1 hour'
  and end_slot<=p_date+time '21:00'
  and not exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.stylist_id=c.stylist_id and b.status in ('pending','confirmed') and b.starts_at<(end_slot at time zone 'Asia/Kolkata') and b.ends_at>c.starts_at) as available from candidates c
 ), grouped as (
  select time,min(label) as label,bool_or(available) as available,min(stylist_id) filter(where available) as "stylistId" from availability group by time
 ) select coalesce(jsonb_agg(to_jsonb(g) order by time),'[]'::jsonb) into result from grouped g;
 return result;
end $$;
revoke all on function studioflow_android_private.slots(text,jsonb,date,text) from public,anon,authenticated;
grant execute on function studioflow_android_private.slots(text,jsonb,date,text) to anon,authenticated,service_role;

create or replace function studioflow_android_private.book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_instructions text,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); w public.studioflow_websites; ids text[]; items jsonb; total_price numeric; total_minutes integer; names text; found_count integer;
 candidate jsonb; bid uuid:=gen_random_uuid(); bstatus text; start_time timestamptz; end_time timestamptz; payload jsonb; existing_id uuid; b public.studioflow_bookings;
begin
 if actor is null then raise exception 'Sign in to book' using errcode='42501'; end if;
 if p_request is null then raise exception 'Booking request ID required'; end if;
 if jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 then raise exception 'Choose valid services'; end if;
 select array_agg(distinct value) into ids from jsonb_array_elements_text(p_services);
 if coalesce(array_length(ids,1),0)<>jsonb_array_length(p_services) then raise exception 'Choose valid, distinct services'; end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Website is not published'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s->>'id','name',s->>'name','price',(s->>'price')::numeric,'durationMinutes',(s->>'durationMinutes')::int,'category',s->>'category') order by s->>'name'),'[]'::jsonb),
  coalesce(sum((s->>'price')::numeric),0),coalesce(sum(greatest(1,(s->>'durationMinutes')::int)),0),
  string_agg(s->>'name',' + ' order by s->>'name'),count(*) into items,total_price,total_minutes,names,found_count
  from jsonb_array_elements(w.content->'services') s where s->>'id'=any(ids);
 if found_count<>array_length(ids,1) then raise exception 'A selected service is unavailable'; end if;
 select r.booking_id into existing_id from public.studioflow_android_requests r where r.customer_id=actor and r.request_id=p_request;
 if existing_id is not null then select * into b from public.studioflow_bookings where id=existing_id; return to_jsonb(b); end if;
 if p_stylist in ('any','any_available','any-specialist') then p_stylist:='any'; end if;
 select s into candidate from jsonb_array_elements(studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)) s where s->>'time'=p_time and (s->>'available')::boolean;
 if candidate is null then raise exception 'This slot has just been booked or is unavailable. Choose another time.'; end if;
 if coalesce(btrim(p_name),'')='' or length(btrim(p_name))>150 or length(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'))<10 then raise exception 'Enter your name and a valid phone number'; end if;
 start_time:=(p_date+p_time::time) at time zone 'Asia/Kolkata';
 end_time:=start_time+total_minutes*interval '1 minute';
 if start_time is null or start_time<now() or start_time>now()+interval '90 days' then raise exception 'Choose a future appointment within 90 days'; end if;
 if (select count(*) from public.studioflow_bookings where customer_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many booking requests. Please try later.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||(candidate->>'stylistId'),0));
 if exists(select 1 from public.studioflow_bookings where owner_id=w.owner_id and stylist_id=candidate->>'stylistId' and status in ('pending','confirmed') and starts_at<end_time and ends_at>start_time) then raise exception 'This slot has just been booked. Choose another time.'; end if;
 bstatus:=case when coalesce((w.content->'profile'->>'requireDeposit')::boolean,true) then 'pending' else 'confirmed' end;
 payload:=jsonb_build_object('id',bid,'clientName',left(btrim(p_name),150),'clientPhone',left(p_phone,30),'clientEmail',(select email from auth.users where id=actor),
  'serviceId',ids[1],'serviceName',names,'servicePrice',total_price,'serviceItems',items,'durationMinutes',total_minutes,
  'stylistId',candidate->>'stylistId','stylistName',(select s->>'name' from jsonb_array_elements(w.content->'stylists') s where s->>'id'=candidate->>'stylistId'),
  'date',p_date::text,'time',p_time,'status',bstatus,'paymentStatus','pay_at_salon','amountPaid',0,'instructions',left(coalesce(p_instructions,''),1000),'createdAt',now());
 insert into public.studioflow_bookings(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload) values(bid,w.owner_id,actor,candidate->>'stylistId',start_time,end_time,bstatus,payload);
 insert into public.studioflow_android_requests(request_id,customer_id,booking_id) values(p_request,actor,bid) on conflict(request_id) do nothing;
 return (select to_jsonb(x) from public.studioflow_bookings x where id=bid);
end $$;
revoke all on function studioflow_android_private.book(text,jsonb,date,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function studioflow_android_private.book(text,jsonb,date,text,text,text,text,text,uuid) to authenticated,service_role;

create or replace function studioflow_android_private.reschedule(p_booking uuid,p_date date,p_time text,p_stylist text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); b public.studioflow_bookings; d public.studioflow_demo_bookings; ids jsonb; slug text; candidate jsonb;
 start_time timestamptz; end_time timestamptz; minutes integer; resolved text; staff jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_date is null or p_time is null or p_time !~ '^[0-9]{2}:[0-9]{2}$' then raise exception 'Choose a valid date and time'; end if;
 select * into b from public.studioflow_bookings where id=p_booking and customer_id=actor;
 if b.id is not null and b.status not in ('pending','confirmed') then raise exception 'Only upcoming appointments can be rescheduled'; end if;
 if b.id is null then
  select * into d from public.studioflow_demo_bookings where id=p_booking and customer_id=actor;
  if d.id is null then raise exception 'Appointment not found'; end if;
 end if;
 ids:=(select coalesce(jsonb_agg(x.sid),'[]'::jsonb) from jsonb_array_elements(
  coalesce((coalesce(b.payload,d.payload)->'serviceItems'),jsonb_build_array(jsonb_build_object('id',coalesce(b.payload,d.payload)->>'serviceId')))) e
  cross join lateral (select case when jsonb_typeof(e)='object' then e->>'id' else trim(both '"' from e::text) end as sid) x);
 if jsonb_array_length(ids)=0 then raise exception 'Appointment has no services to reschedule'; end if;
 select s.slug into slug from public.studioflow_websites s where s.owner_id=coalesce(b.owner_id,d.owner_id);
 if slug is null then raise exception 'Salon is no longer published'; end if;
 resolved:=case when p_stylist in ('any','any_available','any-specialist') then 'any' else p_stylist end;
 select s into candidate from jsonb_array_elements(studioflow_android_private.slots(slug,ids,p_date,resolved)) s where s->>'time'=p_time;
 if candidate is null then raise exception 'This slot is unavailable. Choose another time.'; end if;
 if resolved='any' then
  resolved:=candidate->>'stylistId';
  if resolved is null then
   if b.id is not null then resolved:=b.stylist_id; else raise exception 'Choose an available specialist'; end if;
  end if;
 end if;
 minutes:=greatest(1,coalesce((coalesce(b.payload,d.payload)->>'durationMinutes')::int,30));
 start_time:=(p_date+p_time::time) at time zone 'Asia/Kolkata';
 end_time:=start_time+minutes*interval '1 minute';
 if start_time<now() or start_time>now()+interval '90 days' then raise exception 'Choose a future appointment within 90 days'; end if;
 select s into staff from jsonb_array_elements((select draft->'stylists' from public.studioflow_accounts where user_id=coalesce(b.owner_id,d.owner_id))) s where s->>'id'=resolved;
 if staff is null or coalesce(staff->>'status','Available')<>'Available' then raise exception 'Specialist is unavailable at this time'; end if;
 if jsonb_array_length(coalesce(staff->'schedule','[]'::jsonb))>0 and not exists(
  select 1 from jsonb_array_elements(staff->'schedule') entry where entry->>'day'=trim(to_char(p_date,'Day'))
  and coalesce((entry->>'enabled')::boolean,false) and (start_time at time zone 'Asia/Kolkata')::time>=(entry->>'fromTime')::time
  and (end_time at time zone 'Asia/Kolkata')::time<=(entry->>'toTime')::time) then raise exception 'Specialist is unavailable at this time'; end if;
 if b.id is not null then
  perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||resolved,0));
  if exists(select 1 from public.studioflow_bookings o where o.owner_id=b.owner_id and o.stylist_id=resolved and o.id<>b.id and o.status in ('pending','confirmed') and o.starts_at<end_time and o.ends_at>start_time) then raise exception 'This slot has just been booked. Choose another time.'; end if;
  update public.studioflow_bookings set stylist_id=resolved,starts_at=start_time,ends_at=end_time,
   payload=payload||jsonb_build_object('date',p_date::text,'time',p_time,'stylistId',resolved) where id=b.id;
  return (select to_jsonb(x) from public.studioflow_bookings x where id=b.id);
 end if;
 update public.studioflow_demo_bookings set payload=payload||jsonb_build_object('date',p_date::text,'time',p_time,'stylistId',resolved) where id=d.id;
 return (select to_jsonb(x) from public.studioflow_demo_bookings x where id=d.id);
end $$;
revoke all on function studioflow_android_private.reschedule(uuid,date,text,text) from public,anon,authenticated;
grant execute on function studioflow_android_private.reschedule(uuid,date,text,text) to authenticated,service_role;

create or replace function studioflow_android_private.profile() returns public.studioflow_android_profiles
language plpgsql security definer set search_path='' as $$
declare me public.studioflow_android_profiles;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into public.studioflow_android_profiles(customer_id,full_name)
 values(auth.uid(),left(coalesce((select raw_user_meta_data->>'full_name' from auth.users where id=auth.uid()),''),150))
 on conflict(customer_id) do nothing returning * into me;
 if me.customer_id is null then select * into me from public.studioflow_android_profiles where customer_id=auth.uid(); end if;
 return me;
end $$;
revoke all on function studioflow_android_private.profile() from public,anon,authenticated;
grant execute on function studioflow_android_private.profile() to authenticated,service_role;
create or replace function public.studioflow_android_slots(p_slug text,p_services jsonb,p_date date,p_stylist text) returns jsonb
language sql stable security invoker set search_path='' as $$select studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)$$;
revoke all on function public.studioflow_android_slots(text,jsonb,date,text) from public,anon,authenticated;
grant execute on function public.studioflow_android_slots(text,jsonb,date,text) to anon,authenticated,service_role;
create or replace function public.studioflow_android_book(p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,p_name text,p_phone text,p_instructions text default '',p_request uuid default null) returns jsonb
language sql security invoker set search_path='' as $$select studioflow_android_private.book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions,p_request)$$;
revoke all on function public.studioflow_android_book(text,jsonb,date,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.studioflow_android_book(text,jsonb,date,text,text,text,text,text,uuid) to authenticated,service_role;
create or replace function public.studioflow_android_reschedule(p_booking uuid,p_date date,p_time text,p_stylist text) returns jsonb
language sql security invoker set search_path='' as $$select studioflow_android_private.reschedule(p_booking,p_date,p_time,p_stylist)$$;
revoke all on function public.studioflow_android_reschedule(uuid,date,text,text) from public,anon,authenticated;
grant execute on function public.studioflow_android_reschedule(uuid,date,text,text) to authenticated,service_role;
create or replace function public.studioflow_android_review(p_slug text,p_name text,p_rating integer,p_comment text) returns jsonb
language sql security invoker set search_path='' as $$select studioflow_review_private.submit_review(p_slug,p_name,p_rating,p_comment)$$;
revoke all on function public.studioflow_android_review(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.studioflow_android_review(text,text,integer,text) to authenticated,service_role;
create or replace function public.studioflow_android_rewards() returns jsonb
language sql stable security invoker set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('owner_id',w.owner_id,'slug',w.slug,'salon',w.content->'profile'->>'businessName',
 'points',greatest(0,studioflow_android_private.reward_earnings(w.owner_id,auth.uid())-coalesce((select sum(points_spent) from public.studioflow_customer_reward_claims where customer_id=auth.uid() and owner_id=w.owner_id),0)),
 'earned',studioflow_android_private.reward_earnings(w.owner_id,auth.uid()),
 'spent',coalesce((select sum(points_spent) from public.studioflow_customer_reward_claims where customer_id=auth.uid() and owner_id=w.owner_id),0))
 order by w.published_at desc),'[]'::jsonb)
from public.studioflow_websites w where w.slug not like 'studioflow-qa-%' and coalesce((w.content->'loyaltyConfig'->>'programEnabled')::boolean,false)$$;
revoke all on function public.studioflow_android_rewards() from public,anon,authenticated;
grant execute on function public.studioflow_android_rewards() to authenticated,service_role;
create or replace function public.studioflow_android_favorite(p_slug text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not exists(select 1 from public.studioflow_websites where slug=p_slug) then raise exception 'Salon is no longer published'; end if;
 insert into public.studioflow_android_favorites(customer_id,salon_slug) values(auth.uid(),p_slug) on conflict(customer_id,salon_slug) do nothing;
end $$;
revoke all on function public.studioflow_android_favorite(text) from public,anon,authenticated;
grant execute on function public.studioflow_android_favorite(text) to authenticated,service_role;
-- 7. Private customer photo bucket -----------------------------------------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('nexora-customer-private','nexora-customer-private',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
drop policy if exists nexora_customer_private_read on storage.objects;
create policy nexora_customer_private_read on storage.objects for select to authenticated
 using(bucket_id='nexora-customer-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists nexora_customer_private_insert on storage.objects;
create policy nexora_customer_private_insert on storage.objects for insert to authenticated
 with check(bucket_id='nexora-customer-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists nexora_customer_private_delete on storage.objects;
create policy nexora_customer_private_delete on storage.objects for delete to authenticated
 using(bucket_id='nexora-customer-private' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- 8. Realtime publication for live channels ---------------------------------
do $$
declare t text;
begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then return; end if;
 foreach t in array array['studioflow_websites','studioflow_templates','studioflow_bookings','studioflow_accounts','studioflow_demo_bookings','studioflow_customer_reward_claims'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end $$;
commit;
