-- NEXORA WhatsApp bookings and hosted payment links use the canonical StudioFlow calendar.
-- Owner identity is studioflow_accounts.user_id. Only trusted server functions may create
-- guest reservations or settle a WhatsApp-originated payment.

alter table public.studioflow_bookings
  add column if not exists booking_source text not null default 'website',
  add column if not exists external_idempotency_key text;

alter table public.studioflow_bookings
  drop constraint if exists studioflow_bookings_booking_source_check;
alter table public.studioflow_bookings
  add constraint studioflow_bookings_booking_source_check
  check (booking_source in ('website','whatsapp','app','manual'));

create unique index if not exists studioflow_bookings_owner_external_idempotency_uidx
  on public.studioflow_bookings(owner_id, external_idempotency_key)
  where external_idempotency_key is not null;

create index if not exists studioflow_bookings_owner_source_created_idx
  on public.studioflow_bookings(owner_id, booking_source, created_at desc);

alter table public.studioflow_payment_orders
  add column if not exists payment_link_id text,
  add column if not exists payment_link_url text,
  add column if not exists payment_link_status text;

create unique index if not exists studioflow_payment_orders_payment_link_id_uidx
  on public.studioflow_payment_orders(payment_link_id)
  where payment_link_id is not null;

alter table public.studioflow_payment_orders
  drop constraint if exists studioflow_payment_orders_payment_link_status_check;
alter table public.studioflow_payment_orders
  add constraint studioflow_payment_orders_payment_link_status_check
  check (payment_link_status is null or payment_link_status in ('created','partially_paid','paid','expired','cancelled'));

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
  customer_phone text;
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

  select u.phone into customer_phone
  from auth.users u where u.id=p_customer;

  if regexp_replace(coalesce(customer_phone,''),'[^0-9]','','g')
     is distinct from regexp_replace(client_phone,'[^0-9]','','g') then
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

create or replace function public.studioflow_whatsapp_book(
  p_owner uuid,
  p_customer uuid,
  p_slug text,
  p_request jsonb
) returns jsonb
language sql
security invoker
set search_path=''
as $$
  select studioflow_private.book_whatsapp(p_owner,p_customer,p_slug,p_request)
$$;

create or replace function studioflow_private.settle_payment_link(
  p_booking uuid,
  p_payment_link text,
  p_payment text,
  p_amount bigint
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  o public.studioflow_payment_orders;
  b public.studioflow_bookings;
begin
  if coalesce(p_payment,'')='' or coalesce(p_payment_link,'')='' then
    raise exception 'Verified payment and payment link references are required';
  end if;

  select * into o
  from public.studioflow_payment_orders
  where booking_id=p_booking and payment_link_id=p_payment_link
  for update;

  if o.booking_id is null or o.amount_paise<>p_amount then
    raise exception 'Payment does not match the salon booking or required deposit';
  end if;

  select * into b from public.studioflow_bookings where id=p_booking for update;
  if b.id is null or b.booking_source<>'whatsapp' then
    raise exception 'WhatsApp booking was not found';
  end if;

  if o.status='captured' then
    if o.payment_id<>p_payment then
      raise exception 'This payment link was already settled with another payment';
    end if;
    return b.payload;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||b.stylist_id,0));

  if b.status<>'pending'
     or b.hold_expires_at is null
     or b.hold_expires_at<=now()
     or exists (
       select 1 from public.studioflow_bookings other
       where other.id<>b.id
         and other.owner_id=b.owner_id
         and other.stylist_id=b.stylist_id
         and other.status in ('pending','confirmed')
         and (other.status='confirmed' or other.hold_expires_at is null or other.hold_expires_at>now())
         and other.starts_at<b.ends_at and other.ends_at>b.starts_at
     ) then
    update public.studioflow_payment_orders
      set status='refund_required',payment_id=p_payment,verified_at=now(),payment_link_status='paid'
      where booking_id=b.id;
    return jsonb_build_object('refund_required',true,'id',b.id,'payment_link_id',p_payment_link);
  end if;

  update public.studioflow_payment_orders
    set status='captured',payment_id=p_payment,verified_at=now(),payment_link_status='paid'
    where booking_id=b.id;

  update public.studioflow_bookings
    set status='confirmed',
        hold_expires_at=null,
        payload=payload||jsonb_build_object(
          'status','confirmed',
          'paymentStatus','paid_deposit',
          'amountPaid',p_amount/100.0,
          'paymentId',p_payment,
          'paymentLinkId',p_payment_link
        )
    where id=b.id
    returning payload into b.payload;

  return b.payload;
end;
$$;

revoke all on function studioflow_private.book_whatsapp(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function studioflow_private.settle_payment_link(uuid,text,text,bigint) from public,anon,authenticated;
revoke all on function public.studioflow_whatsapp_book(uuid,uuid,text,jsonb) from public,anon,authenticated;

grant usage on schema studioflow_private to service_role;
grant execute on function studioflow_private.book_whatsapp(uuid,uuid,text,jsonb) to service_role;
grant execute on function studioflow_private.settle_payment_link(uuid,text,text,bigint) to service_role;
grant execute on function public.studioflow_whatsapp_book(uuid,uuid,text,jsonb) to service_role;

comment on column public.studioflow_bookings.booking_source is
  'Origin channel for the customer appointment, including website, WhatsApp, app or manual.';
comment on column public.studioflow_bookings.external_idempotency_key is
  'Trusted integration idempotency key scoped to the salon owner.';
comment on column public.studioflow_payment_orders.payment_link_id is
  'Razorpay hosted Payment Link ID used for WhatsApp-originated deposits.';
