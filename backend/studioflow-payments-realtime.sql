begin;
alter table public.studioflow_bookings add column if not exists hold_expires_at timestamptz;
create table if not exists public.studioflow_payment_orders (
 booking_id uuid primary key references public.studioflow_bookings(id),
 order_id text not null unique,
 payment_id text unique,
 amount_paise bigint not null check(amount_paise>0),
 currency text not null default 'INR' check(currency='INR'),
 status text not null default 'created' check(status in ('created','captured','refund_required')),
 created_at timestamptz not null default now(),verified_at timestamptz
);
alter table public.studioflow_payment_orders enable row level security;
drop policy if exists studioflow_payment_orders_deny_clients on public.studioflow_payment_orders;
create policy studioflow_payment_orders_deny_clients on public.studioflow_payment_orders as restrictive for all to anon,authenticated using(false) with check(false);
revoke all on public.studioflow_payment_orders from anon,authenticated;
grant all on public.studioflow_payment_orders to service_role;
grant select on public.studioflow_bookings to service_role;
-- No browser or tenant role can certify a payment.
create or replace function studioflow_private.register_payment(p_booking uuid,p_order text,p_amount bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b public.studioflow_bookings; o public.studioflow_payment_orders; expected bigint;
begin
 select * into b from public.studioflow_bookings where id=p_booking for update;
 if b.id is null or b.status<>'pending' or b.hold_expires_at is null or b.hold_expires_at<=now() then raise exception 'Booking reservation expired or is unavailable';end if;
 expected:=ceil((b.payload->>'servicePrice')::numeric*100*0.25)::bigint;
 if p_amount<>expected or expected<100 then raise exception 'Invalid mandatory 25 percent INR deposit';end if;
 insert into public.studioflow_payment_orders(booking_id,order_id,amount_paise) values(b.id,p_order,expected) on conflict(booking_id) do nothing;
 select * into o from public.studioflow_payment_orders where booking_id=b.id;
 return to_jsonb(o);
end $$;
create or replace function public.studioflow_register_payment(p_booking uuid,p_order text,p_amount bigint) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.register_payment(p_booking,p_order,p_amount)$$;
create or replace function studioflow_private.settle_payment(p_order text,p_payment text,p_amount bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.studioflow_payment_orders; b public.studioflow_bookings;
begin
 select * into o from public.studioflow_payment_orders where order_id=p_order for update;
 if o.order_id is null or o.amount_paise<>p_amount or coalesce(p_payment,'')='' then raise exception 'Payment does not match reserved order';end if;
 select * into b from public.studioflow_bookings where id=o.booking_id for update;
 if o.status='captured' then
  if o.payment_id<>p_payment then raise exception 'Order already paid with another payment';end if;
  return b.payload;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||b.stylist_id,0));
 if b.status<>'pending' or b.hold_expires_at is null or b.hold_expires_at<=now() or exists(select 1 from public.studioflow_bookings other where other.id<>b.id and other.owner_id=b.owner_id and other.stylist_id=b.stylist_id and other.status in ('pending','confirmed') and (other.status='confirmed' or other.hold_expires_at is null or other.hold_expires_at>now()) and other.starts_at<b.ends_at and other.ends_at>b.starts_at) then
  update public.studioflow_payment_orders set status='refund_required',payment_id=p_payment,verified_at=now() where booking_id=b.id;
  return jsonb_build_object('refund_required',true,'id',b.id);
 end if;
 update public.studioflow_payment_orders set status='captured',payment_id=p_payment,verified_at=now() where booking_id=b.id;
 update public.studioflow_bookings set status='confirmed',hold_expires_at=null,payload=payload||jsonb_build_object('status','confirmed','paymentStatus','paid_deposit','amountPaid',p_amount/100.0,'paymentId',p_payment,'orderId',p_order) where id=b.id returning payload into b.payload;
 return b.payload;
end $$;
create or replace function public.studioflow_settle_payment(p_order text,p_payment text,p_amount bigint) returns jsonb language sql security invoker set search_path='' as $$select studioflow_private.settle_payment(p_order,p_payment,p_amount)$$;
revoke all on function studioflow_private.register_payment(uuid,text,bigint),public.studioflow_register_payment(uuid,text,bigint),studioflow_private.settle_payment(text,text,bigint),public.studioflow_settle_payment(text,text,bigint) from public,anon,authenticated;
grant usage on schema studioflow_private to service_role;
grant execute on function studioflow_private.register_payment(uuid,text,bigint),public.studioflow_register_payment(uuid,text,bigint),studioflow_private.settle_payment(text,text,bigint),public.studioflow_settle_payment(text,text,bigint) to service_role;
do $$declare t text;begin
 foreach t in array array['studioflow_accounts','studioflow_bookings','studioflow_websites'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
 end loop;
end $$;
commit;
