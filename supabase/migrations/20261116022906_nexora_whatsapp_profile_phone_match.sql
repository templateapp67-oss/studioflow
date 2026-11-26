-- Allow a verified WhatsApp number to match either Auth phone or an existing profile contact.
-- This preserves the authenticated customer identity for customers whose WhatsApp is stored separately.
create or replace function studioflow_private.book_whatsapp(
  p_owner uuid,
  p_customer uuid,
  p_slug text,
  p_request jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  w public.studioflow_websites;
  customer_phone_matches boolean;
  svc jsonb;
  staff jsonb;
  candidate jsonb;
  owner_draft jsonb;
  schedule jsonb;
  day_entry jsonb;
  start_time timestamptz;
  end_time timestamptz;
  payload jsonb;
  existing_booking public.studioflow_bookings;
  bid uuid:=gen_random_uuid();
  idempotency_key text:=left(coalesce(p_request->>'idempotencyKey',''),120);
  client_name text:=left(btrim(coalesce(p_request->>'clientName','')),150);
  client_phone text:=left(btrim(coalesce(p_request->>'clientPhone','')),30);
begin
  if p_owner is null or p_customer is null then
    raise exception 'Salon owner and verified WhatsApp customer are required' using errcode='22023';
  end if;

  if idempotency_key='' then
    raise exception 'Booking idempotency key is required' using errcode='22023';
  end if;

  select * into existing_booking
  from public.studioflow_bookings
  where owner_id=p_owner and external_idempotency_key=idempotency_key;

  if existing_booking.id is not null then
    return existing_booking.payload;
  end if;

  select * into w
  from public.studioflow_websites
  where owner_id=p_owner and slug=p_slug;

  if w.owner_id is null then
    raise exception 'Published salon website was not found for this owner';
  end if;

  if not exists (
    select 1 from public.salon_whatsapp_connections c
    where c.owner_id=p_owner
      and c.connection_status='connected'
      and c.webhook_subscribed=true
  ) then
    raise exception 'This salon WhatsApp number is not connected';
  end if;

  select exists (
    select 1
    from auth.users u
    left join public.profiles owner_profile on owner_profile.id=u.id
    where u.id=p_customer
      and (
        regexp_replace(coalesce(u.phone,''),'[^0-9]','','g')=regexp_replace(client_phone,'[^0-9]','','g')
        or regexp_replace(coalesce(owner_profile.phone_number,''),'[^0-9]','','g')=regexp_replace(client_phone,'[^0-9]','','g')
        or regexp_replace(coalesce(owner_profile.phone,''),'[^0-9]','','g')=regexp_replace(client_phone,'[^0-9]','','g')
        or regexp_replace(coalesce(owner_profile.whatsapp,''),'[^0-9]','','g')=regexp_replace(client_phone,'[^0-9]','','g')
      )
  ) into customer_phone_matches;

  if not coalesce(customer_phone_matches,false) then
    raise exception 'WhatsApp customer phone does not match the verified customer account' using errcode='42501';
  end if;

  if client_name='' or length(regexp_replace(client_phone,'[^0-9]','','g'))<10 then
    raise exception 'Valid customer name and phone are required' using errcode='22023';
  end if;

  select s into svc
  from jsonb_array_elements(w.content->'services') s
  where s->>'id'=p_request->>'serviceId';

  if svc is null then
    raise exception 'Choose a service from this salon';
  end if;

  if coalesce((svc->>'isActive')::boolean,true)=false
     or coalesce((svc->>'isAvailable')::boolean,true)=false then
    raise exception 'This service is not currently available';
  end if;

  if coalesce((svc->>'price')::numeric,0)<0
     or coalesce((svc->>'durationMinutes')::integer,0)<1 then
    raise exception 'Salon service has invalid price or duration';
  end if;

  if coalesce(p_request->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
     or coalesce(p_request->>'time','') !~ '^(?:[01]\d|2[0-3]):[0-5]\d$' then
    raise exception 'Choose a valid appointment date and time' using errcode='22023';
  end if;

  select slot into candidate
  from jsonb_array_elements(
    studioflow_private.availability(
      p_slug,
      p_request->>'serviceId',
      (p_request->>'date')::date,
      coalesce(nullif(p_request->>'stylistId',''),'any')
    )
  ) slot
  where slot->>'time'=p_request->>'time'
    and coalesce((slot->>'available')::boolean,false)=true;

  if candidate is null then
    raise exception 'This appointment slot is no longer available. Please choose another time.';
  end if;

  select s into staff
  from jsonb_array_elements(w.content->'stylists') s
  where s->>'id'=candidate->>'stylistId';

  if staff is null then
    raise exception 'Selected specialist is no longer available';
  end if;

  start_time:=((p_request->>'date')::date+(p_request->>'time')::time) at time zone 'Asia/Kolkata';
  end_time:=start_time+greatest(1,(svc->>'durationMinutes')::integer)*interval '1 minute';

  if start_time<now() or start_time>now()+interval '90 days' then
    raise exception 'Choose a future appointment within 90 days';
  end if;

  select draft into owner_draft
  from public.studioflow_accounts
  where user_id=p_owner;

  select s->'schedule' into schedule
  from jsonb_array_elements(owner_draft->'stylists') s
  where s->>'id'=staff->>'id';

  if schedule is not null and jsonb_typeof(schedule)='array' and jsonb_array_length(schedule)>0 then
    select entry into day_entry
    from jsonb_array_elements(schedule) entry
    where entry->>'day'=trim(to_char(start_time at time zone 'Asia/Kolkata','Day'));

    if day_entry is null
       or not coalesce((day_entry->>'enabled')::boolean,false)
       or (start_time at time zone 'Asia/Kolkata')::time<(day_entry->>'fromTime')::time
       or (end_time at time zone 'Asia/Kolkata')::time>(day_entry->>'toTime')::time then
      raise exception 'Selected specialist is not working at this time';
    end if;
  end if;

  if (
    select count(*) from public.studioflow_bookings
    where customer_id=p_customer and created_at>now()-interval '1 hour'
  )>=10 then
    raise exception 'Too many booking requests. Please try again later';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner::text||(staff->>'id'),0));

  if exists (
    select 1 from public.studioflow_bookings b
    where b.owner_id=p_owner
      and b.stylist_id=staff->>'id'
      and b.status in ('pending','confirmed')
      and (b.status='confirmed' or b.hold_expires_at is null or b.hold_expires_at>now())
      and b.starts_at<end_time and b.ends_at>start_time
  ) then
    raise exception 'This slot was just booked. Please choose another time';
  end if;

  payload:=jsonb_build_object(
    'id',bid,
    'clientName',client_name,
    'clientPhone',client_phone,
    'serviceId',svc->>'id',
    'serviceName',svc->>'name',
    'servicePrice',(svc->>'price')::numeric,
    'stylistId',staff->>'id',
    'stylistName',staff->>'name',
    'date',p_request->>'date',
    'time',p_request->>'time',
    'status','pending',
    'paymentStatus','pay_at_salon',
    'amountPaid',0,
    'bookingSource','whatsapp',
    'createdAt',now()
  );

  insert into public.studioflow_bookings(
    id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload,
    hold_expires_at,booking_source,external_idempotency_key
  ) values (
    bid,p_owner,p_customer,staff->>'id',start_time,end_time,'pending',payload,
    now()+interval '15 minutes','whatsapp',idempotency_key
  );

  return payload;
end;
$$;
