alter table public.studioflow_bookings
  add column if not exists web_checkout_method text check (web_checkout_method in ('online', 'venue')),
  add column if not exists web_receipt_whatsapp boolean not null default false;

create table public.studioflow_booking_receipts (
  booking_id uuid not null references public.studioflow_bookings(id) on delete cascade,
  details jsonb not null,
  channel text not null check (channel in ('customer_email', 'admin_email', 'whatsapp')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'accepted', 'review')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  provider_message_id text,
  primary key (booking_id, channel)
);
alter table public.studioflow_booking_receipts enable row level security;
revoke all on public.studioflow_booking_receipts from public, anon, authenticated;
grant select, update on public.studioflow_booking_receipts to service_role;

create function public.studioflow_prepare_web_checkout(
  p_booking uuid, p_customer uuid, p_email text, p_method text, p_whatsapp boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.studioflow_bookings; phone text;
begin
  select * into b from public.studioflow_bookings where id=p_booking and customer_id=p_customer for update;
  if b.id is null then raise exception 'Booking not found'; end if;
  if b.web_checkout_method is not null then
    if b.web_checkout_method is distinct from p_method then raise exception 'Payment method is locked for this booking'; end if;
    if b.payload->>'clientEmail' is distinct from lower(trim(p_email)) then raise exception 'Receipt email is locked for this booking'; end if;
    if b.status='confirmed' then return b.payload; end if;
  end if;
  if b.status<>'pending' or b.hold_expires_at is null or b.hold_expires_at<=now() then
    raise exception 'Slot reservation expired';
  end if;
  if b.web_checkout_method is not null then return b.payload; end if;
  if p_method is null or p_method not in ('online','venue') or p_email is null or length(p_email)>254
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid receipt email and payment method';
  end if;
  phone:=regexp_replace(coalesce(b.payload->>'clientPhone',''),'[^0-9]','','g');
  if phone !~ '^(91)?[6-9][0-9]{9}$' or length(trim(coalesce(b.payload->>'clientName','')))<2 then
    raise exception 'Enter a valid customer name and Indian WhatsApp number';
  end if;
  if exists (select 1 from public.studioflow_payment_orders where booking_id=b.id) then
    raise exception 'Payment has already started for this booking';
  end if;
  if p_method='venue' then
    -- Use the same staff lock and overlap predicate as captured payment settlement.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(b.owner_id::text||b.stylist_id,0));
    if exists (
      select 1 from public.studioflow_bookings o
       where o.id<>b.id and o.owner_id=b.owner_id and o.stylist_id=b.stylist_id
         and o.status in ('pending','confirmed')
         and (o.status='confirmed' or o.hold_expires_at is null or o.hold_expires_at>now())
         and o.starts_at<b.ends_at and o.ends_at>b.starts_at
    ) then raise exception 'The selected slot is no longer available'; end if;
  end if;
  update public.studioflow_bookings set
    web_checkout_method=p_method, web_receipt_whatsapp=coalesce(p_whatsapp,false),
    status=case when p_method='venue' then 'confirmed' else b.status end,
    hold_expires_at=case when p_method='venue' then null else b.hold_expires_at end,
    payload=b.payload||jsonb_build_object('clientEmail',lower(trim(p_email)),'clientPhone','+91'||right(phone,10),
      'status',case when p_method='venue' then 'confirmed' else b.status end)
  where id=b.id returning payload into b.payload;
  return b.payload;
end $$;

create function public.studioflow_register_full_web_payment(p_booking uuid, p_order text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.studioflow_bookings; o public.studioflow_payment_orders;
begin
  select * into b from public.studioflow_bookings where id=p_booking for update;
  if b.web_checkout_method is distinct from 'online' or b.status<>'pending'
     or b.hold_expires_at is null or b.hold_expires_at<=now() then
    raise exception 'Slot reservation expired or checkout is unavailable';
  end if;
  if p_order !~ '^order_[a-zA-Z0-9]+$' or p_amount<100 or
     p_amount<>round((b.payload->>'servicePrice')::numeric*100) then
    raise exception 'Invalid order or full INR amount';
  end if;
  insert into public.studioflow_payment_orders(booking_id,order_id,amount_paise)
    values(b.id,p_order,p_amount) on conflict(booking_id) do nothing;
  select * into o from public.studioflow_payment_orders where booking_id=b.id;
  return to_jsonb(o);
end $$;

create function studioflow_private.guard_web_checkout_order() returns trigger
language plpgsql security definer set search_path='' as $$
declare b public.studioflow_bookings;
begin
  select * into b from public.studioflow_bookings where id=new.booking_id for update;
  if b.web_checkout_method='venue' or (b.web_checkout_method='online' and
      (new.order_id !~ '^order_[a-zA-Z0-9]+$' or new.amount_paise<>round((b.payload->>'servicePrice')::numeric*100))) then
    raise exception 'Order does not match the booking checkout';
  end if;
  return new;
end $$;
create trigger studioflow_guard_web_checkout_order before insert on public.studioflow_payment_orders
for each row execute function studioflow_private.guard_web_checkout_order();

create function studioflow_private.complete_web_checkout() returns trigger
language plpgsql security definer set search_path='' as $$
declare o public.studioflow_payment_orders;
begin
  if new.web_checkout_method='online' then
    select * into o from public.studioflow_payment_orders where booking_id=new.id and status='captured';
    if o.payment_id is null or o.amount_paise<>round((new.payload->>'servicePrice')::numeric*100) then
      raise exception 'A verified full payment is required';
    end if;
    new.payload:=new.payload||jsonb_build_object('paymentStatus','paid_full','amountPaid',o.amount_paise/100.0,
      'paymentId',o.payment_id,'orderId',o.order_id,'razorpay_payment_id',o.payment_id,'razorpay_order_id',o.order_id);
  else
    new.payload:=new.payload||jsonb_build_object('paymentStatus','pay_at_salon','amountPaid',0);
  end if;
  insert into public.studioflow_booking_receipts(booking_id,channel,details)
    select new.id, channel, jsonb_build_object(
      'method',new.web_checkout_method,'email',new.payload->>'clientEmail','phone',new.payload->>'clientPhone',
      'service',new.payload->>'serviceName','date',new.payload->>'date','time',new.payload->>'time',
      'paid',new.payload->'amountPaid','total',new.payload->'servicePrice','transaction',new.payload->>'paymentId'
    ) from unnest(array['customer_email','admin_email','whatsapp']) as channels(channel)
    where channel<>'whatsapp' or new.web_receipt_whatsapp
    on conflict do nothing;
  return new;
end $$;
create trigger studioflow_complete_web_checkout before update on public.studioflow_bookings
for each row when (old.status='pending' and new.status='confirmed' and new.web_checkout_method is not null)
execute function studioflow_private.complete_web_checkout();

create function public.studioflow_claim_booking_receipts(p_booking uuid default null)
returns setof public.studioflow_booking_receipts language sql security definer set search_path='' as $$
  with candidates as (
    select booking_id, channel from public.studioflow_booking_receipts
    where next_attempt_at<=now() and attempts<8 and created_at>now()-interval '23 hours'
      and (p_booking is null or booking_id=p_booking)
      and (status='pending' or (status='sending' and channel<>'whatsapp'))
    order by next_attempt_at limit 15 for update skip locked
  )
  update public.studioflow_booking_receipts r set status='sending',attempts=r.attempts+1,
    next_attempt_at=now()+interval '5 minutes'
  from candidates c where r.booking_id=c.booking_id and r.channel=c.channel returning r.*;
$$;

revoke all on function public.studioflow_prepare_web_checkout(uuid,uuid,text,text,boolean),
  public.studioflow_register_full_web_payment(uuid,text,bigint), public.studioflow_claim_booking_receipts(uuid),
  studioflow_private.guard_web_checkout_order(), studioflow_private.complete_web_checkout()
  from public, anon, authenticated;
grant execute on function public.studioflow_prepare_web_checkout(uuid,uuid,text,text,boolean),
  public.studioflow_register_full_web_payment(uuid,text,bigint), public.studioflow_claim_booking_receipts(uuid) to service_role;
