-- Canonical refund ledger used by the existing Razorpay Edge Function and WhatsApp payment links.
alter table public.studioflow_payment_orders
  add column if not exists refund_id text,
  add column if not exists refund_status text,
  add column if not exists refund_error text,
  add column if not exists refunded_at timestamptz;

alter table public.studioflow_payment_orders
  drop constraint if exists studioflow_payment_orders_status_check;
alter table public.studioflow_payment_orders
  add constraint studioflow_payment_orders_status_check
  check (status in ('created','captured','refund_required','refunding','refunded','refund_failed'));

alter table public.studioflow_payment_orders
  drop constraint if exists studioflow_payment_orders_refund_status_check;
alter table public.studioflow_payment_orders
  add constraint studioflow_payment_orders_refund_status_check
  check (refund_status is null or refund_status in ('required','processed','failed'));

create or replace function studioflow_private.complete_refund(
  p_order text,
  p_refund text,
  p_ok boolean,
  p_error text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  o public.studioflow_payment_orders;
  b public.studioflow_bookings;
begin
  select * into o
  from public.studioflow_payment_orders
  where order_id=p_order
  for update;

  if o.booking_id is null then
    raise exception 'Payment order for refund was not found';
  end if;

  select * into b
  from public.studioflow_bookings
  where id=o.booking_id
  for update;

  if coalesce(p_ok,false) then
    update public.studioflow_payment_orders
      set status='refunded',
          refund_id=coalesce(nullif(p_refund,''),refund_id),
          refund_status='processed',
          refund_error=null,
          refunded_at=coalesce(refunded_at,now())
      where booking_id=o.booking_id;

    update public.studioflow_bookings
      set payload=payload||jsonb_build_object(
        'paymentStatus','refunded',
        'refundStatus','processed',
        'refundId',coalesce(nullif(p_refund,''),o.refund_id)
      )
      where id=o.booking_id
      returning payload into b.payload;

    return jsonb_build_object('ok',true,'status','refunded','booking',b.payload);
  end if;

  update public.studioflow_payment_orders
    set status='refund_failed',
        refund_id=coalesce(nullif(p_refund,''),refund_id),
        refund_status='failed',
        refund_error=left(coalesce(p_error,'Refund failed'),300)
    where booking_id=o.booking_id;

  update public.studioflow_bookings
    set payload=payload||jsonb_build_object(
      'refundStatus','failed',
      'refundError',left(coalesce(p_error,'Refund failed'),200)
    )
    where id=o.booking_id
    returning payload into b.payload;

  return jsonb_build_object('ok',false,'status','refund_failed','booking',b.payload);
end;
$$;

create or replace function public.studioflow_complete_refund(
  p_order text,
  p_refund text,
  p_ok boolean,
  p_error text
) returns jsonb
language sql
security invoker
set search_path=''
as $$
  select studioflow_private.complete_refund(p_order,p_refund,p_ok,p_error)
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
  if o.status in ('refunded','refund_failed') then
    raise exception 'This WhatsApp payment has already entered the refund process';
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
      set status='refund_required',payment_id=p_payment,verified_at=now(),
          payment_link_status='paid',refund_status='required'
      where booking_id=b.id;
    return jsonb_build_object('refund_required',true,'id',b.id,'payment_link_id',p_payment_link);
  end if;

  update public.studioflow_payment_orders
    set status='captured',payment_id=p_payment,verified_at=now(),
        payment_link_status='paid',refund_status=null,refund_error=null
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

revoke all on function studioflow_private.complete_refund(text,text,boolean,text) from public,anon,authenticated;
revoke all on function public.studioflow_complete_refund(text,text,boolean,text) from public,anon,authenticated;
grant usage on schema studioflow_private to service_role;
grant execute on function studioflow_private.complete_refund(text,text,boolean,text) to service_role;
grant execute on function public.studioflow_complete_refund(text,text,boolean,text) to service_role;

comment on column public.studioflow_payment_orders.refund_status is
  'Verified Razorpay refund lifecycle: required, processed or failed.';
