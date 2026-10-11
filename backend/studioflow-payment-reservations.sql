create or replace function studioflow_private.book(p_slug text,p_request jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); w public.studioflow_websites; svc jsonb; staff jsonb; start_time timestamptz; end_time timestamptz; payload jsonb; bid uuid:=gen_random_uuid(); bstatus text; candidate jsonb; schedule jsonb; day_entry jsonb; owner_draft jsonb;
begin
 if actor is null then raise exception 'Please sign in to book an appointment' using errcode='42501'; end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 if w.owner_id is null then raise exception 'Website is not published'; end if;
 select s into svc from jsonb_array_elements(w.content->'services') s where s->>'id'=p_request->>'serviceId';
 select slot into candidate from jsonb_array_elements(studioflow_private.availability(p_slug,p_request->>'serviceId',(p_request->>'date')::date,p_request->>'stylistId')) slot where slot->>'time'=p_request->>'time' and (slot->>'available')::boolean;
 if candidate is null then raise exception 'This slot has just been booked or is unavailable. Choose another time.';end if;
 select s into staff from jsonb_array_elements(w.content->'stylists') s where s->>'id'=candidate->>'stylistId';
 if svc is null or staff is null then raise exception 'Choose an available service and specialist'; end if;
 if coalesce(btrim(p_request->>'clientName'),'')='' or length(regexp_replace(coalesce(p_request->>'clientPhone',''),'[^0-9]','','g'))<10 then raise exception 'Enter your name and a valid phone number'; end if;
 start_time:=((p_request->>'date')::date+(p_request->>'time')::time) at time zone 'Asia/Kolkata';
 end_time:=start_time+greatest(1,(svc->>'durationMinutes')::int)*interval '1 minute';
 if start_time is null or start_time<now() or start_time>now()+interval '90 days' then raise exception 'Choose a future appointment within 90 days'; end if;
 select draft into owner_draft from public.studioflow_accounts where user_id=w.owner_id;
 select s->'schedule' into schedule from jsonb_array_elements(owner_draft->'stylists') s where s->>'id'=staff->>'id';
 if schedule is not null and jsonb_array_length(schedule)>0 then
   select entry into day_entry from jsonb_array_elements(schedule) entry where entry->>'day'=trim(to_char(start_time at time zone 'Asia/Kolkata','Day'));
   if day_entry is null or not coalesce((day_entry->>'enabled')::boolean,false) or (start_time at time zone 'Asia/Kolkata')::time<(day_entry->>'fromTime')::time or (end_time at time zone 'Asia/Kolkata')::time>(day_entry->>'toTime')::time then raise exception 'Specialist is unavailable at this time'; end if;
 end if;
 if (select count(*) from public.studioflow_bookings where customer_id=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many booking requests. Please try later.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text || (staff->>'id'),0));
 if exists(select 1 from public.studioflow_bookings where owner_id=w.owner_id and stylist_id=staff->>'id' and status in ('pending','confirmed') and (status='confirmed' or hold_expires_at is null or hold_expires_at>now()) and starts_at<end_time and ends_at>start_time) then raise exception 'This slot has just been booked. Choose another time.'; end if;
 bstatus:='pending';
 payload:=jsonb_build_object('id',bid,'clientName',left(btrim(p_request->>'clientName'),150),'clientPhone',left(p_request->>'clientPhone',30),'clientEmail',(select email from auth.users where id=actor),'serviceId',svc->>'id','serviceName',svc->>'name','servicePrice',(svc->>'price')::numeric,'stylistId',staff->>'id','stylistName',staff->>'name','date',p_request->>'date','time',p_request->>'time','status',bstatus,'paymentStatus','pay_at_salon','amountPaid',0,'createdAt',now());
 insert into public.studioflow_bookings(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload,hold_expires_at) values(bid,w.owner_id,actor,staff->>'id',start_time,end_time,bstatus,payload,now()+interval '15 minutes');
 return payload;
end $$;
create or replace function public.studioflow_book(p_slug text,p_request jsonb) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.book(p_slug,p_request)$$;

