-- Execute branch-catalogue checks inside private SECURITY DEFINER RPCs.
-- Browser-facing invoker wrappers must not call the private checker directly.
begin;

CREATE OR REPLACE FUNCTION studioflow_android_private.slots(p_slug text, p_services jsonb, p_date date, p_stylist text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  selected text:=nullif(current_setting('studioflow.branch_id',true),'');
  normalized_stylist text:=case when p_stylist in ('any_available','any-specialist') then 'any' else p_stylist end;
  target_owner uuid;
begin
 select w.owner_id into target_owner
 from public.studioflow_websites w
 where w.slug=p_slug;
 if target_owner is null then return '[]'::jsonb; end if;
 if selected is not null then
  return (
    select coalesce(jsonb_agg(s order by s->>'time'),'[]'::jsonb)
    from jsonb_array_elements(studioflow_private.branch_slots(p_slug,p_services,p_date,p_stylist,selected::uuid)) s
    where coalesce((s->>'available')::boolean,false)
  );
 end if;
 if not studioflow_private.service_catalogue_available_at_branch(target_owner,p_services,null) then
  return '[]'::jsonb;
 end if;
 return studioflow_android_private.slots_unbranched(p_slug,p_services,p_date,normalized_stylist);
end $function$
;

CREATE OR REPLACE FUNCTION studioflow_android_private.book(p_slug text, p_services jsonb, p_date date, p_time text, p_stylist text, p_name text, p_phone text, p_instructions text, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w public.studioflow_websites; result jsonb; existing public.studioflow_android_requests; finger text; slot jsonb; menu jsonb; total numeric; minutes int; bid uuid:=gen_random_uuid(); start_at timestamptz; staff_name text; names text;
 selected_branch text:=nullif(current_setting('studioflow.branch_id',true),'');
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_request is null or p_stylist is null or p_time is null or p_date is null or p_name is null or p_phone is null then raise exception 'Complete booking details';end if;
 if length(btrim(p_name)) not between 2 and 150 or length(regexp_replace(p_phone,'[^0-9]','','g')) not between 10 and 15 or length(coalesce(p_instructions,''))>1000 then raise exception 'Enter valid contact details';end if;
 if exists(select 1 from auth.users where id=auth.uid() and banned_until>now()) then raise exception 'Account unavailable' using errcode='42501';end if;
 finger:=md5(jsonb_build_array(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions)::text);
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,8));
 select * into existing from public.studioflow_android_requests where customer_id=auth.uid() and request_id=p_request;
 if existing.booking_id is not null then
  if existing.fingerprint<>finger then raise exception 'Request changed; choose the slot again';end if;
  return(select to_jsonb(b) from public.studioflow_bookings b where id=existing.booking_id);
 end if;
 if(select count(*) from public.studioflow_bookings where customer_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many bookings; try again later';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Salon is not published';end if;
 if not studioflow_private.service_catalogue_available_at_branch(
   w.owner_id,p_services,selected_branch::uuid
 ) then
  raise exception 'One or more selected services are not offered at this location' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text||p_stylist,0));
 select v into slot from jsonb_array_elements(studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)) v where v->>'time'=p_time and v->>'stylistId'=p_stylist;
 if slot is null then raise exception 'Slot unavailable. Choose another time.';end if;
 select jsonb_agg(s),sum((s->>'price')::numeric),sum((s->>'durationMinutes')::int),string_agg(s->>'name',' + ' order by s->>'id') into menu,total,minutes,names from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 select e->>'name' into staff_name from jsonb_array_elements(w.content->'stylists') e where e->>'id'=p_stylist;
 start_at:=(p_date+p_time::time) at time zone 'Asia/Kolkata';
 insert into public.studioflow_bookings(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,hold_expires_at,payload)
 values(bid,w.owner_id,auth.uid(),p_stylist,start_at,start_at+minutes*interval '1 minute','pending',now()+interval '15 minutes',
 jsonb_build_object('id',bid,'clientName',btrim(p_name),'clientPhone',btrim(p_phone),'clientEmail',(select email from auth.users where id=auth.uid()),'serviceId',p_services->>0,'serviceName',names,'servicePrice',total,'serviceItems',menu,'durationMinutes',minutes,'stylistId',p_stylist,'stylistName',staff_name,'date',p_date,'time',p_time,'instructions',coalesce(p_instructions,''),'status','pending','paymentStatus','pay_at_salon','amountPaid',0,'source','nexora_android','createdAt',now()));
 insert into public.studioflow_android_requests values(auth.uid(),p_request,finger,bid);
 return(select to_jsonb(b) from public.studioflow_bookings b where id=bid);
end $function$
;

CREATE OR REPLACE FUNCTION studioflow_android_private.reschedule(p_booking uuid, p_date date, p_time text, p_stylist text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare b public.studioflow_bookings; w public.studioflow_websites; services jsonb; chosen jsonb; start_at timestamptz; old_duration interval; cancel_hours numeric; staff_name text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into b from public.studioflow_bookings where id=p_booking and customer_id=auth.uid() for update;
 if b.id is null or b.status<>'confirmed' then raise exception 'Choose a confirmed appointment to reschedule';end if;
 select * into w from public.studioflow_websites where owner_id=b.owner_id;
 if w.owner_id is null then raise exception 'Salon is unavailable';end if;
 if b.branch_id is not null then
  perform set_config('studioflow.branch_id',b.branch_id::text,true);
 end if;
 select coalesce((draft->'extras'->>'cancellationWindow')::numeric,24) into cancel_hours from public.studioflow_accounts where user_id=b.owner_id;
 if b.starts_at<=now()+greatest(0,cancel_hours)*interval '1 hour' then raise exception 'Contact the salon to reschedule inside its cancellation window';end if;
 services:=coalesce((select jsonb_agg(s->>'id') from jsonb_array_elements(b.payload->'serviceItems') s),jsonb_build_array(b.payload->>'serviceId'));
 perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||least(b.stylist_id,p_stylist),0));
 perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||greatest(b.stylist_id,p_stylist),0));
 -- Remove only this appointment from conflict checks, within the same transaction.
 perform set_config('studioflow.android_temporary_move','yes',true);
 update public.studioflow_bookings set status='cancelled' where id=b.id;
 select s into chosen from jsonb_array_elements(studioflow_android_private.slots(w.slug,services,p_date,p_stylist)) s where s->>'time'=p_time and s->>'stylistId'=p_stylist;
 if chosen is null then raise exception 'New slot unavailable. Your original booking has been retained.';end if;
 start_at:=(p_date+p_time::time) at time zone 'Asia/Kolkata';
 select s->>'name' into staff_name from jsonb_array_elements(w.content->'stylists') s where s->>'id'=p_stylist;
 -- Keep original contracted duration and paid amounts. Menu duration changes require a new booking.
 if (select sum((s->>'durationMinutes')::int) from jsonb_array_elements(w.content->'services') s where services ? (s->>'id'))*interval '1 minute' <> b.ends_at-b.starts_at then raise exception 'Service duration changed. Contact the salon to move this booking.';end if;
 perform set_config('studioflow.android_temporary_move','no',true);
 update public.studioflow_bookings set status='confirmed',stylist_id=p_stylist,starts_at=start_at,ends_at=start_at+(b.ends_at-b.starts_at),payload=b.payload||jsonb_build_object('date',p_date,'time',p_time,'stylistId',p_stylist,'stylistName',staff_name,'rescheduledAt',now()) where id=b.id;
 return(select to_jsonb(row) from public.studioflow_bookings row where id=b.id);
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
 select studioflow_android_private.slots(p_slug,p_services,p_date,p_stylist)
$function$
;

create or replace function public.studioflow_android_book(
 p_slug text,p_services jsonb,p_date date,p_time text,p_stylist text,
 p_name text,p_phone text,p_instructions text,p_request uuid
)
returns jsonb
language sql
security invoker
set search_path to ''
as $function$
 select studioflow_android_private.book(p_slug,p_services,p_date,p_time,p_stylist,p_name,p_phone,p_instructions,p_request)
$function$;

CREATE OR REPLACE FUNCTION public.studioflow_branch_android_book(p_slug text, p_services jsonb, p_date date, p_time text, p_stylist text, p_name text, p_phone text, p_instructions text, p_request uuid, p_branch uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if p_branch is null then raise exception 'Choose a location before booking'; end if;
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
 perform set_config('studioflow.branch_id',(p_request->>'branchId'),true);
 return studioflow_private.coupon_book(p_slug,p_request);
end $function$
;

commit;
