-- Multi-service website booking + public specialist cards.
-- Apply after booking-add-ons, booking-specialist-eligibility, multibranch and Template 15.
-- Retains server prices, full-duration overlap locks, branch schedules and men's-only rules.
begin;

-- Only explicitly public portfolio fields leave the database; never return draft/contact data.
create or replace function studioflow_private.booking_staff_profiles(p_slug text,p_ids jsonb)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
  'id',s->'id','name',s->'name','role',s->'role','avatarUrl',s->'avatarUrl',
  'experienceYears',s->'experienceYears','rating',s->'rating','bio',s->'bio',
  'specialties',s->'specialties','assignedServices',s->'assignedServices',
  'expertiseServiceIds',s->'expertiseServiceIds','qualifications',s->'qualifications',
  'languages',s->'languages','workGallery',(select coalesce(jsonb_agg(photo),'[]')
   from jsonb_array_elements(coalesce(s->'workGallery','[]')) photo where photo->>'consented'='true')
 )) order by s->>'name'),'[]')
 from public.studioflow_websites w cross join lateral jsonb_array_elements(w.content->'stylists') s
 where w.slug=p_slug and p_ids ? (s->>'id')
$$;
revoke all on function studioflow_private.booking_staff_profiles(text,jsonb) from public,anon,authenticated;

create or replace function public.studioflow_booking_specialists(p_slug text,p_service_id text)
returns jsonb language sql stable security definer set search_path='' as $$
 select result||jsonb_build_object('specialists',studioflow_private.booking_staff_profiles(p_slug,result->'specialistIds'))
 from (select studioflow_private.booking_specialists(p_slug,p_service_id) result) q
$$;
revoke all on function public.studioflow_booking_specialists(text,text) from public;
grant execute on function public.studioflow_booking_specialists(text,text) to anon,authenticated;

create or replace function public.studioflow_branch_specialists(p_slug text,p_service_id text,p_branch uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; service_row jsonb; result jsonb;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null or not exists(select 1 from public.branches where site_id=w.owner_id and id=p_branch and is_active) then return jsonb_build_object('published',false,'specialistIds','[]'::jsonb); end if;
 select value into service_row from jsonb_array_elements(w.content->'services') value where value->>'id'=p_service_id;
 if service_row is null then return jsonb_build_object('published',true,'specialistIds','[]'::jsonb); end if;
 select coalesce(jsonb_agg(s->>'id' order by s->>'name'),'[]'::jsonb) into result from public.studioflow_accounts account cross join lateral jsonb_array_elements(account.draft->'stylists') s
 where account.user_id=w.owner_id and exists(select 1 from jsonb_array_elements(w.content->'stylists') pub where pub->>'id'=s->>'id') and coalesce(s->>'status','Available')='Available' and exists(select 1 from public.studioflow_staff_branch_schedules x where x.site_id=w.owner_id and x.branch_id=p_branch and x.staff_id=s->>'id' and x.is_active)
 and (s->'assignedServices' is null or jsonb_typeof(s->'assignedServices')<>'array' or jsonb_array_length(s->'assignedServices')=0 or exists(select 1 from jsonb_array_elements_text(s->'assignedServices') a where a=p_service_id));
 return jsonb_build_object('published',true,'specialistIds',result,'specialists',studioflow_private.booking_staff_profiles(p_slug,result));
end $$;
revoke all on function public.studioflow_branch_specialists(text,text,uuid) from public;
grant execute on function public.studioflow_branch_specialists(text,text,uuid) to anon,authenticated;


-- Template 15 retains its strict service categories, staff, holidays, opening hours,
-- leave and break rules, now evaluated against the ENTIRE appointment window.
create or replace function studioflow_private.booking_bundle_window_allowed(p_slug text,p_services jsonb,p_date date,p_staff text,p_start time)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare w public.studioflow_websites; d jsonb; c jsonb; h jsonb; staff jsonb; minutes int; finish timestamp;
begin
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then return true;end if;
 select draft into d from public.studioflow_accounts where user_id=w.owner_id;
 c:=coalesce(d->'profile'->'mensStudio','{}');
 if exists(select 1 from jsonb_array_elements_text(p_services) id where not exists(
  select 1 from jsonb_array_elements(w.content->'services') s where s->>'id'=id and studioflow_private.mens_service(s))) then return false;end if;
 select sum((s->>'durationMinutes')::int) into minutes from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 select s into staff from jsonb_array_elements(d->'stylists') s where s->>'id'=p_staff
  and s->>'businessType'='mens_hair_studio' and coalesce((s->>'mensMaleOnly')::boolean,false)
  and coalesce(s->>'role','') !~* 'women|woman|female|unisex|kids?|child|beard|shav|facial|spa\M|treatment|makeup|bridal|nail|wax'
  and s->>'status'='Available';
 if staff is null or minutes is null or coalesce(c->'holidays','[]') ? p_date::text then return false;end if;
 if exists(select 1 from jsonb_array_elements(coalesce(c->'leave','[]')) l where l->>'staffId'=p_staff and p_date between (l->>'from')::date and (l->>'to')::date) then return false;end if;
 select x into h from jsonb_array_elements(coalesce(c->'hours','[]')) x where x->>'day'=trim(to_char(p_date,'Day'));
 finish:=p_date+p_start+minutes*interval '1 minute';
 if h is null or not coalesce((h->>'enabled')::boolean,false) or p_start<(h->>'fromTime')::time or finish>p_date+(h->>'toTime')::time then return false;end if;
 if exists(select 1 from jsonb_array_elements(coalesce(c->'breaks','[]')) b where b->>'staffId'=p_staff and p_start<(b->>'toTime')::time and finish>p_date+(b->>'fromTime')::time) then return false;end if;
 return true;
end $$;
revoke all on function studioflow_private.booking_bundle_window_allowed(text,jsonb,date,text,time) from public,anon,authenticated;

create or replace function studioflow_android_private.slots_unbranched(p_slug text,p_services jsonb,p_date date,p_stylist text) returns jsonb
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
   and exists(select 1 from jsonb_array_elements(w.content->'stylists') published where published->>'id'=s->>'id')
   and (s->'assignedServices' is null or jsonb_typeof(s->'assignedServices')<>'array' or jsonb_array_length(s->'assignedServices')=0
    or s->'assignedServices' @> to_jsonb(ids))
 ), candidates as (
  select staff.s->>'id' as stylist_id,slot at time zone 'Asia/Kolkata' as starts_at,slot,slot+total_minutes*interval '1 minute' as end_slot
  from staff cross join generate_series(p_date+time '09:00',p_date+time '20:00',interval '30 minutes') slot
  where studioflow_private.booking_bundle_window_allowed(p_slug,p_services,p_date,staff.s->>'id',slot::time)
   and ((staff.day is null and jsonb_array_length(coalesce(staff.s->'schedule','[]'::jsonb))=0)
   or (coalesce((staff.day->>'enabled')::boolean,false) and slot::time>=(staff.day->>'fromTime')::time and (slot+total_minutes*interval '1 minute')::time<=(staff.day->>'toTime')::time))
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
revoke all on function studioflow_android_private.slots_unbranched(text,jsonb,date,text) from public,anon,authenticated;
grant execute on function studioflow_android_private.slots_unbranched(text,jsonb,date,text) to anon,authenticated,service_role;

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
   join public.studioflow_accounts account on account.user_id=w.owner_id
   join jsonb_array_elements(account.draft->'stylists') s on s->>'id'=sch.staff_id
   where exists(select 1 from jsonb_array_elements(w.content->'stylists') pub where pub->>'id'=s->>'id') and sch.site_id=w.owner_id and sch.branch_id=p_branch and sch.day_of_week=day_name and sch.is_active
     and (p_stylist in ('any','any-specialist','any_available') or sch.staff_id=p_stylist)
     and coalesce(s->>'status','Available')='Available'
     and (s->'assignedServices' is null or jsonb_typeof(s->'assignedServices')<>'array' or jsonb_array_length(s->'assignedServices')=0 or s->'assignedServices' @> to_jsonb(ids))
 ), candidates as (
   select staff.s->>'id' stylist_id,slot,slot+total_minutes*interval '1 minute' end_slot
   from staff cross join generate_series(p_date+(branch_day->>'fromTime')::time,p_date+(branch_day->>'toTime')::time,interval '30 minutes') slot
   where studioflow_private.booking_bundle_window_allowed(p_slug,p_services,p_date,staff.s->>'id',slot::time) and slot::time>=greatest(staff.starts_at,(branch_day->>'fromTime')::time) and slot+total_minutes*interval '1 minute'<=p_date+least(staff.ends_at,(branch_day->>'toTime')::time)
 ), available as (
   select to_char(slot,'HH24:MI') time,to_char(slot,'HH12:MI AM') label,stylist_id,
    slot at time zone 'Asia/Kolkata'>now() and slot<=now()+interval '90 days'
    and slot at time zone 'Asia/Kolkata'>now()+greatest(0,coalesce((w.content->'profile'->'bookingRules'->>'leadHours')::numeric,0))*interval '1 hour'
    and not exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.stylist_id=c.stylist_id and b.status in ('pending','confirmed') and b.starts_at<(end_slot at time zone 'Asia/Kolkata') and b.ends_at>slot at time zone 'Asia/Kolkata') as available from candidates c
 ), grouped as (select time,min(label) label,bool_or(available) available,min(stylist_id) filter(where available) "stylistId" from available group by time)
 select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('branchId',p_branch,'branchName',branch_row.name) order by time),'[]'::jsonb) into result from grouped g;
 return result;
end $$;
revoke all on function studioflow_private.branch_slots(text,jsonb,date,text,uuid) from public,anon,authenticated;
grant execute on function studioflow_private.branch_slots(text,jsonb,date,text,uuid) to anon,authenticated,service_role;

-- Reuse the existing multi-service slot validator, staff locks, idempotency and payment ledger.
-- Public request prices and duration are never trusted.
create or replace function studioflow_private.book_with_addons(p_slug text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare addons jsonb:=coalesce(p_request->'addOnIds','[]'::jsonb); ids jsonb; w public.studioflow_websites; candidate jsonb; result jsonb; v_payload jsonb;
begin
 if auth.uid() is null then raise exception 'Please sign in to book an appointment' using errcode='42501';end if;
 if p_request ? 'serviceIds' then
  ids:=p_request->'serviceIds';
  if jsonb_typeof(ids) is distinct from 'array' or jsonb_array_length(ids) not between 1 and 10 then raise exception 'Choose between 1 and 10 services';end if;
  if ids->>0 is distinct from p_request->>'serviceId' then raise exception 'Primary service changed';end if;
  addons:=ids-0;
  if p_request ? 'addOnIds' and p_request->'addOnIds' is distinct from addons then raise exception 'Service selection changed';end if;
 end if;
 if jsonb_typeof(addons) is distinct from 'array' or jsonb_array_length(addons)>9 then raise exception 'Choose up to 9 add-ons';end if;
 if jsonb_array_length(addons)=0 then return studioflow_private.book(p_slug,p_request);end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Salon is not published';end if;
 if exists(select 1 from jsonb_array_elements(addons) a where jsonb_typeof(a)<>'string') then raise exception 'Invalid add-on IDs';end if;
 if not (p_request ? 'serviceIds') and exists(select 1 from jsonb_array_elements_text(addons) id where not coalesce(w.content->'profile'->'bookingAddOnServiceIds','[]'::jsonb) ? id) then raise exception 'An add-on is no longer offered. Review services again.';end if;
 ids:=jsonb_build_array(p_request->>'serviceId')||addons;
 if exists(select 1 from jsonb_array_elements(ids) id where jsonb_typeof(id)<>'string') or (select count(distinct id) from jsonb_array_elements_text(ids) id)<>jsonb_array_length(ids) then raise exception 'Choose valid, distinct services';end if;
 -- A retry must return its original reservation before checking its now-occupied slot.
 select to_jsonb(b) into result from public.studioflow_android_requests r join public.studioflow_bookings b on b.id=r.booking_id where r.customer_id=auth.uid() and r.request_id=(p_request->>'requestId')::uuid;
 if result is not null then
  if result->>'owner_id' is distinct from w.owner_id::text or result->'payload'->>'date' is distinct from p_request->>'date' or result->'payload'->>'time' is distinct from p_request->>'time'
   or not ((select coalesce(jsonb_agg(item->>'id'),'[]') from jsonb_array_elements(result->'payload'->'serviceItems') item) @> ids
    and jsonb_array_length(result->'payload'->'serviceItems')=jsonb_array_length(ids)) then raise exception 'Request changed; start a new reservation';end if;
  if p_request->>'stylistId' not in ('any','any_available','any-specialist',result->>'stylist_id') then raise exception 'Request changed; choose the slot again';end if;
  result:=studioflow_android_private.book(p_slug,ids,(p_request->>'date')::date,p_request->>'time',result->>'stylist_id',p_request->>'clientName',p_request->>'clientPhone','',(p_request->>'requestId')::uuid);
  return result->'payload';
 end if;
 select s into candidate from jsonb_array_elements(studioflow_android_private.slots(p_slug,ids,(p_request->>'date')::date,case when p_request->>'stylistId' in ('any','any_available','any-specialist') then 'any' else p_request->>'stylistId' end)) s where s->>'time'=p_request->>'time' and coalesce((s->>'available')::boolean,false);
 if candidate is null then raise exception 'This slot cannot fit the selected service and add-ons. Choose another slot.';end if;
 result:=studioflow_android_private.book(p_slug,ids,(p_request->>'date')::date,p_request->>'time',candidate->>'stylistId',p_request->>'clientName',p_request->>'clientPhone','',(p_request->>'requestId')::uuid);
 v_payload:=(result->'payload')||jsonb_build_object('serviceId',ids->>0,'serviceIds',ids,'addOnIds',addons,'source','nexora_website');
 update public.studioflow_bookings set payload=v_payload where id=(result->>'id')::uuid and customer_id=auth.uid();
 return v_payload;
end $$;
revoke all on function studioflow_private.book_with_addons(text,jsonb) from public;
grant execute on function studioflow_private.book_with_addons(text,jsonb) to anon,authenticated;
create or replace function public.studioflow_book(p_slug text,p_request jsonb) returns jsonb language sql set search_path='' as $$select studioflow_private.book_with_addons(p_slug,p_request)$$;

create or replace function public.studioflow_mens_coupon_quote(p_slug text,p_services jsonb,p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; o jsonb; total numeric; eligible numeric; discount numeric; day text:=to_char(now() at time zone 'Asia/Kolkata','YYYY-MM-DD');
begin
 if auth.uid() is null then raise exception 'Sign in to apply a coupon' using errcode='42501';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then raise exception 'Men''s studio unavailable';end if;
 if jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 then raise exception 'Choose 1 to 10 men''s services';end if;
 if (select count(distinct id) from jsonb_array_elements_text(p_services) id)<>jsonb_array_length(p_services)
 or exists(select 1 from jsonb_array_elements_text(p_services) id where not exists(select 1 from jsonb_array_elements(w.content->'services') s where s->>'id'=id and studioflow_private.mens_service(s))) then raise exception 'Service unavailable';end if;
 select sum((s->>'price')::numeric) into total from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 select x into o from jsonb_array_elements(coalesce(w.content->'profile'->'mensStudio'->'offers','[]')) x where upper(btrim(x->>'code'))=upper(btrim(p_code));
 if o is null then return studioflow_private.coupon_quote(p_slug,p_services,p_code);end if;
 if not coalesce((o->>'active')::boolean,false) or not coalesce((o->>'approved')::boolean,false) then raise exception 'Offer is inactive or awaiting admin approval';end if;
 if (nullif(o->>'from','') is not null and o->>'from'>day) or (nullif(o->>'to','') is not null and o->>'to'<day) then raise exception 'Offer is outside its validity dates';end if;
 select coalesce(sum((s->>'price')::numeric),0) into eligible from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id') and coalesce(o->'serviceIds','[]') ? (s->>'id');
 if eligible<=0 then raise exception 'Coupon is not eligible for this service';end if;
 if exists(select 1 from public.studioflow_bookings b where b.owner_id=w.owner_id and b.customer_id=auth.uid() and upper(b.payload->>'couponCode')=upper(btrim(p_code)) and (b.status in ('confirmed','completed') or b.status='pending' and (b.hold_expires_at is null or b.hold_expires_at>now()))) then raise exception 'Coupon already used or reserved on another booking';end if;
 if (o->>'discount')::numeric<=0 then raise exception 'Invalid discount';end if;
 if o->>'type'='percent' and (o->>'discount')::numeric<=100 then discount:=round(eligible*(o->>'discount')::numeric/100,2);
 elsif o->>'type'='flat' then discount:=least(eligible,(o->>'discount')::numeric);
 else raise exception 'Invalid discount';end if;
 if total-discount<4 then raise exception 'Discounted total is too low';end if;
 return jsonb_build_object('code',upper(btrim(p_code)),'title',o->>'title','originalPrice',total,'discountAmount',discount,'finalPrice',total-discount,'advanceAmount',ceil((total-discount)*25)/100,'mensOfferId',o->>'id');
end $$;
revoke all on function public.studioflow_mens_coupon_quote(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.studioflow_mens_coupon_quote(text,jsonb,text) to authenticated;


create or replace function studioflow_private.mens_booking_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; s jsonb; ids jsonb; minutes int;
begin
 select * into w from public.studioflow_websites where owner_id=new.owner_id;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then return new;end if;
 if tg_op='UPDATE' and new.starts_at=old.starts_at and new.ends_at=old.ends_at and new.stylist_id=old.stylist_id and new.payload->>'serviceId'=old.payload->>'serviceId' then return new;end if;
 ids:=coalesce((select jsonb_agg(item->>'id') from jsonb_array_elements(coalesce(new.payload->'serviceItems','[]')) item),jsonb_build_array(new.payload->>'serviceId'));
 if exists(select 1 from jsonb_array_elements_text(ids) id where not exists(select 1 from jsonb_array_elements(w.content->'services') x where x->>'id'=id and studioflow_private.mens_service(x))) then raise exception 'Only men''s haircuts and men''s hair colour can be booked';end if;
 select sum((x->>'durationMinutes')::int) into minutes from jsonb_array_elements(w.content->'services') x where ids ? (x->>'id');
 if new.ends_at<>new.starts_at+minutes*interval '1 minute' then raise exception 'Service duration changed. Choose another slot';end if;
 if not studioflow_private.booking_bundle_window_allowed(w.slug,ids,(new.starts_at at time zone 'Asia/Kolkata')::date,new.stylist_id,(new.starts_at at time zone 'Asia/Kolkata')::time) then raise exception 'Barber or salon is unavailable at this time';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.stylist_id,0));
 if exists(select 1 from public.studioflow_bookings b where b.owner_id=new.owner_id and b.id<>new.id and b.stylist_id=new.stylist_id and (b.status='confirmed' or b.status='pending' and (b.hold_expires_at is null or b.hold_expires_at>now())) and b.starts_at<new.ends_at and b.ends_at>new.starts_at) then raise exception 'This slot has just been booked';end if;
 if not exists(select 1 from jsonb_array_elements(studioflow_android_private.slots(w.slug,ids,(new.starts_at at time zone 'Asia/Kolkata')::date,new.stylist_id)) x where x->>'time'=to_char(new.starts_at at time zone 'Asia/Kolkata','HH24:MI') and coalesce((x->>'available')::boolean,false)) then raise exception 'Barber or salon is unavailable at this time';end if;
 return new;
end $$;
revoke all on function studioflow_private.mens_booking_guard() from public,anon,authenticated;

create or replace function public.studioflow_mens_book(p_slug text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.studioflow_websites; selected jsonb; result jsonb; quote jsonb; existing public.studioflow_bookings; code text:=btrim(coalesce(p_request->>'couponCode','')); request_id uuid; ids jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to book' using errcode='42501';end if;
 if nullif(p_request->>'branchId','') is not null then perform set_config('studioflow.branch_id',(p_request->>'branchId')::uuid::text,true);end if;
 request_id:=(p_request->>'requestId')::uuid;if request_id is null then raise exception 'Request ID is required';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.content->'profile'->>'businessType' is distinct from 'mens_hair_studio' then raise exception 'Men''s studio unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||auth.uid()::text,15));
 select * into existing from public.studioflow_bookings where owner_id=w.owner_id and customer_id=auth.uid() and payload->>'mensRequestId'=request_id::text;
 if existing.id is not null then
  if coalesce(existing.payload->'serviceIds',jsonb_build_array(existing.payload->>'serviceId')) is distinct from coalesce(p_request->'serviceIds',jsonb_build_array(p_request->>'serviceId')||coalesce(p_request->'addOnIds','[]')) then raise exception 'Request changed. Start a new reservation';end if;
  if existing.payload->>'serviceId' is distinct from p_request->>'serviceId' or existing.payload->>'date' is distinct from p_request->>'date' or existing.payload->>'time' is distinct from p_request->>'time' or coalesce(existing.payload->>'couponCode','') is distinct from upper(code) then raise exception 'Request changed. Start a new reservation';end if;
  return existing.payload;
 end if;
 ids:=coalesce(p_request->'serviceIds',jsonb_build_array(p_request->>'serviceId')||coalesce(p_request->'addOnIds','[]'));
 select x into selected from jsonb_array_elements(studioflow_android_private.slots(p_slug,ids,(p_request->>'date')::date,p_request->>'stylistId')) x where x->>'time'=p_request->>'time' and coalesce((x->>'available')::boolean,false);
 if selected is null then raise exception 'This slot has just been booked or is unavailable. Choose another time';end if;
 if code<>'' then
  quote:=public.studioflow_mens_coupon_quote(p_slug,ids,code);
  if (p_request->>'couponExpectedTotal')::numeric is distinct from (quote->>'finalPrice')::numeric then raise exception 'Price changed. Reapply the coupon';end if;
  -- Existing loyalty vouchers keep their shared atomic redemption/hold path.
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


commit;
