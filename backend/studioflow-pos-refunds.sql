-- Walk-in POS, remaining-balance collection, and automatic Razorpay refund jobs.
-- Apply after studioflow-payments-realtime.sql.

begin;

alter table public.studioflow_bookings alter column customer_id drop not null;

alter table public.studioflow_payment_orders add column if not exists refund_id text;
alter table public.studioflow_payment_orders add column if not exists refund_error text;
alter table public.studioflow_payment_orders add column if not exists refunded_at timestamptz;
alter table public.studioflow_payment_orders add column if not exists refund_attempts integer not null default 0;

alter table public.studioflow_payment_orders drop constraint if exists studioflow_payment_orders_status_check;
alter table public.studioflow_payment_orders add constraint studioflow_payment_orders_status_check
  check(status in ('created','captured','refund_required','refunding','refunded','refund_failed'));

create table if not exists studioflow_private.payment_worker(
  id boolean primary key default true check(id),
  secret_id uuid not null,
  token_hash text not null
);
alter table studioflow_private.payment_worker enable row level security;
revoke all on studioflow_private.payment_worker from public,anon,authenticated;
do $$ declare token text:=encode(extensions.gen_random_bytes(32),'hex'); secret_id uuid; begin
  if not exists(select 1 from studioflow_private.payment_worker) then
    select vault.create_secret(token,'studioflow_payment_refund_worker','Private payment refund worker authentication') into secret_id;
    insert into studioflow_private.payment_worker(secret_id,token_hash) values(secret_id,encode(extensions.digest(token,'sha256'),'hex'));
  end if;
end $$;

create or replace function studioflow_private.queue_captured_refund(p_booking uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.studioflow_payment_orders
     set status='refund_required', refund_error=null
   where booking_id=p_booking and status='captured' and payment_id is not null;
end $$;

create or replace function studioflow_private.update_booking(p_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); b public.studioflow_bookings; result jsonb;
begin
 if actor is null then raise exception 'Sign in required'; end if;
 select * into b from public.studioflow_bookings where id=p_id for update;
 if b.id is null or (actor<>b.owner_id and actor is distinct from b.customer_id) then raise exception 'Booking unavailable' using errcode='42501'; end if;
 if p_status not in ('cancelled','completed','confirmed') then raise exception 'Invalid status'; end if;
 if actor<>b.owner_id and p_status<>'cancelled' then raise exception 'Owner access required'; end if;
 if b.status in ('completed','cancelled') then raise exception 'This booking is already closed'; end if;
 if p_status='confirmed' and b.status='pending' then raise exception 'Advance payment must be verified by the payment provider before confirming'; end if;
 if p_status='completed' and (b.status<>'confirmed' or b.ends_at>now()) then raise exception 'Only confirmed past appointments can be completed'; end if;
 if p_status='cancelled' then perform studioflow_private.queue_captured_refund(b.id); end if;
 update public.studioflow_bookings set status=p_status,payload=jsonb_set(coalesce(payload,'{}'::jsonb),'{status}',to_jsonb(p_status)) where id=p_id returning payload into result;
 return result;
end $$;

create or replace function studioflow_private.settle_payment(p_order text,p_payment text,p_amount bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.studioflow_payment_orders; b public.studioflow_bookings;
begin
 select * into o from public.studioflow_payment_orders where order_id=p_order for update;
 if o.order_id is null or o.amount_paise<>p_amount or coalesce(p_payment,'')='' then raise exception 'Payment does not match reserved order';end if;
 select * into b from public.studioflow_bookings where id=o.booking_id for update;
 if o.status in ('refunded','refunding','refund_required','refund_failed') then
  return jsonb_build_object('refund_required',true,'id',b.id,'refund_status',o.status);
 end if;
 if o.status='captured' then
  if o.payment_id<>p_payment then raise exception 'Order already paid with another payment';end if;
  return b.payload;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text||b.stylist_id,0));
 if b.status<>'pending' or b.hold_expires_at is null or b.hold_expires_at<=now() or exists(select 1 from public.studioflow_bookings other where other.id<>b.id and other.owner_id=b.owner_id and other.stylist_id=b.stylist_id and other.status in ('pending','confirmed') and (other.status='confirmed' or other.hold_expires_at is null or other.hold_expires_at>now()) and other.starts_at<b.ends_at and other.ends_at>b.starts_at) then
  update public.studioflow_payment_orders set status='refund_required',payment_id=p_payment,verified_at=now(),refund_error=null where booking_id=b.id;
  return jsonb_build_object('refund_required',true,'id',b.id);
 end if;
 update public.studioflow_payment_orders set status='captured',payment_id=p_payment,verified_at=now() where booking_id=b.id;
 update public.studioflow_bookings set status='confirmed',hold_expires_at=null,payload=payload||jsonb_build_object('status','confirmed','paymentStatus','paid_deposit','amountPaid',p_amount/100.0,'paymentId',p_payment,'orderId',p_order) where id=b.id returning payload into b.payload;
 return b.payload;
end $$;

create or replace function studioflow_private.claim_refunds(p_limit integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare rec record; result jsonb:='[]'::jsonb;
begin
 if p_limit not between 1 and 20 then raise exception 'Invalid batch'; end if;
 update public.studioflow_payment_orders set status='refund_required', refund_error='stale_refunding'
  where status='refunding' and coalesce(verified_at,created_at)<now()-interval '10 minutes';
 for rec in
  select o.* from public.studioflow_payment_orders o
  where o.status='refund_required' and o.payment_id is not null and o.refund_attempts<5
  order by o.created_at
  limit p_limit
  for update skip locked
 loop
  update public.studioflow_payment_orders set status='refunding', refund_attempts=refund_attempts+1, verified_at=now()
   where booking_id=rec.booking_id;
  result:=result||jsonb_build_array(jsonb_build_object(
    'booking_id',rec.booking_id,'order_id',rec.order_id,'payment_id',rec.payment_id,'amount_paise',rec.amount_paise
  ));
 end loop;
 return result;
end $$;

create or replace function studioflow_private.complete_refund(p_order text,p_refund text,p_ok boolean,p_error text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.studioflow_payment_orders;
begin
 select * into o from public.studioflow_payment_orders where order_id=p_order for update;
 if o.order_id is null then raise exception 'Payment order not found'; end if;
 if p_ok then
  update public.studioflow_payment_orders
     set status='refunded', refund_id=left(coalesce(p_refund,o.refund_id,''),80), refunded_at=now(), refund_error=null, verified_at=now()
   where order_id=p_order returning * into o;
 else
  update public.studioflow_payment_orders
     set status=case when refund_attempts>=5 then 'refund_failed' else 'refund_required' end,
         refund_error=left(coalesce(p_error,'refund_failed'),180), verified_at=now()
   where order_id=p_order returning * into o;
 end if;
 return to_jsonb(o);
end $$;

create or replace function studioflow_private.expire_unpaid_holds() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  update public.studioflow_bookings
     set status='cancelled', payload=jsonb_set(coalesce(payload,'{}'::jsonb),'{status}','"cancelled"')
   where status='pending' and hold_expires_at is not null and hold_expires_at<=now()
     and not exists(select 1 from public.studioflow_payment_orders o where o.booking_id=studioflow_bookings.id and o.status in ('captured','refunding','refunded'));
  get diagnostics n=row_count;
  return n;
end $$;

create or replace function studioflow_private.owner_walk_in(p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); w public.studioflow_websites; svc jsonb; staff jsonb; start_time timestamptz; end_time timestamptz;
 payload jsonb; bid uuid:=gen_random_uuid(); method text; mode text; paid numeric; price numeric; deposit numeric; phone text; candidate jsonb;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_request) is distinct from 'object' then raise exception 'Invalid walk-in request'; end if;
 select * into w from public.studioflow_websites where owner_id=actor;
 if w.owner_id is null then raise exception 'Publish your salon website before accepting bookings.'; end if;
 select s into svc from jsonb_array_elements(w.content->'services') s where s->>'id'=p_request->>'serviceId';
 if svc is null then raise exception 'Choose a published service'; end if;
 phone:=regexp_replace(coalesce(p_request->>'clientPhone',''),'[^0-9]','','g');
 if coalesce(btrim(p_request->>'clientName'),'')='' or length(phone)<10 then raise exception 'Enter the guest name and a valid 10-digit phone number'; end if;
 method:=coalesce(nullif(btrim(p_request->>'posMethod'),''),'cash');
 if method not in ('cash','upi','card','none') then raise exception 'Choose cash, UPI or card'; end if;
 mode:=coalesce(nullif(btrim(p_request->>'collectMode'),''),'none');
 if mode not in ('none','deposit','full') then raise exception 'Choose no payment, the 25 percent advance, or the full ticket'; end if;
 price:=(svc->>'price')::numeric;
 if price is null or price<0 then raise exception 'Invalid service price'; end if;
 deposit:=ceil(price*100*0.25)/100.0;
 paid:=case mode when 'full' then price when 'deposit' then deposit else 0 end;
 if paid>0 and method='none' then method:='cash'; end if;
 if paid=0 then method:='none'; end if;
 select slot into candidate from jsonb_array_elements(studioflow_private.availability(w.slug,p_request->>'serviceId',(p_request->>'date')::date,coalesce(p_request->>'stylistId','any'))) slot
  where slot->>'time'=p_request->>'time' and (slot->>'available')::boolean;
 if candidate is null then raise exception 'This slot has just been booked or is unavailable. Choose another time.'; end if;
 select s into staff from jsonb_array_elements(w.content->'stylists') s where s->>'id'=candidate->>'stylistId';
 if staff is null then
  select s into staff from jsonb_array_elements((select draft->'stylists' from public.studioflow_accounts where user_id=actor)) s where s->>'id'=candidate->>'stylistId';
 end if;
 if staff is null then raise exception 'Choose an available specialist'; end if;
 start_time:=((p_request->>'date')::date+(p_request->>'time')::time) at time zone 'Asia/Kolkata';
 end_time:=start_time+greatest(1,coalesce((svc->>'durationMinutes')::int,30))*interval '1 minute';
 if start_time is null or start_time<now()-interval '4 hours' or start_time>now()+interval '90 days' then
  raise exception 'Choose a walk-in time from earlier today through the next 90 days';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||(staff->>'id'),0));
 if exists(select 1 from public.studioflow_bookings where owner_id=actor and stylist_id=staff->>'id' and status in ('pending','confirmed') and (status='confirmed' or hold_expires_at is null or hold_expires_at>now()) and starts_at<end_time and ends_at>start_time) then
  raise exception 'This slot has just been booked. Choose another time.';
 end if;
 payload:=jsonb_build_object(
  'id',bid,'clientName',left(btrim(p_request->>'clientName'),150),'clientPhone',left(p_request->>'clientPhone',30),
  'clientEmail',left(coalesce(p_request->>'clientEmail',''),150),'serviceId',svc->>'id','serviceName',svc->>'name',
  'servicePrice',price,'stylistId',staff->>'id','stylistName',staff->>'name','date',p_request->>'date','time',p_request->>'time',
  'status','confirmed','paymentStatus',case when paid>=price then 'paid_full' when paid>0 then 'paid_deposit' else 'pay_at_salon' end,
  'amountPaid',paid,'createdAt',now(),'walkIn',true,'origin','owner_pos','posMethod',method
 );
 insert into public.studioflow_bookings(id,owner_id,customer_id,stylist_id,starts_at,ends_at,status,payload,hold_expires_at)
  values(bid,actor,null,staff->>'id',start_time,end_time,'confirmed',payload,null);
 return payload;
end $$;

create or replace function studioflow_private.collect_balance(p_id uuid,p_method text,p_amount numeric) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); b public.studioflow_bookings; price numeric; paid numeric; due numeric; method text; collected numeric;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 method:=lower(btrim(coalesce(p_method,'')));
 if method not in ('cash','upi','card') then raise exception 'Choose cash, UPI or card'; end if;
 select * into b from public.studioflow_bookings where id=p_id for update;
 if b.id is null or b.owner_id<>actor then raise exception 'Booking unavailable' using errcode='42501'; end if;
 if b.status not in ('confirmed','pending') then raise exception 'This booking is already closed'; end if;
 if b.status='pending' then raise exception 'Confirm the online advance before collecting the salon balance'; end if;
 price:=coalesce((b.payload->>'servicePrice')::numeric,0);
 paid:=coalesce((b.payload->>'amountPaid')::numeric,0);
 due:=greatest(0,round((price-paid)*100)/100.0);
 if due<=0 then
  update public.studioflow_bookings set payload=payload||jsonb_build_object('paymentStatus','paid_full') where id=b.id returning payload into b.payload;
  return b.payload;
 end if;
 collected:=round(coalesce(p_amount,due)*100)/100.0;
 if collected<>due then raise exception 'Collect the remaining salon balance'; end if;
 update public.studioflow_bookings
    set payload=payload||jsonb_build_object(
      'amountPaid',price,'paymentStatus','paid_full','posMethod',method,
      'balanceMethod',method,'balanceCollectedAt',now()
    )
  where id=b.id returning payload into b.payload;
 return b.payload;
end $$;

create or replace function studioflow_private.complete_visit(p_id uuid,p_method text,p_amount numeric) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); b public.studioflow_bookings; v_payload jsonb; due numeric;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into b from public.studioflow_bookings where id=p_id for update;
 if b.id is null or b.owner_id<>actor then raise exception 'Booking unavailable' using errcode='42501'; end if;
 if b.status in ('completed','cancelled') then raise exception 'This booking is already closed'; end if;
 if b.status<>'confirmed' then raise exception 'Only confirmed appointments can be completed'; end if;
 if b.starts_at>now() then raise exception 'Visit has not started yet'; end if;
 due:=greatest(0,round((coalesce((b.payload->>'servicePrice')::numeric,0)-coalesce((b.payload->>'amountPaid')::numeric,0))*100)/100.0);
 if due>0 then
  v_payload:=studioflow_private.collect_balance(p_id,p_method,coalesce(p_amount,due));
 else
  v_payload:=b.payload;
 end if;
 v_payload:=coalesce(v_payload,b.payload)||jsonb_build_object('status','completed');
 update public.studioflow_bookings set status='completed', payload=v_payload where id=p_id;
 return v_payload;
end $$;

create or replace function public.studioflow_owner_walk_in(p_request jsonb) returns jsonb
 language sql security invoker set search_path='' as $$select studioflow_private.owner_walk_in(p_request)$$;
create or replace function public.studioflow_collect_balance(p_id uuid,p_method text,p_amount numeric) returns jsonb
 language sql security invoker set search_path='' as $$select studioflow_private.collect_balance(p_id,p_method,p_amount)$$;
create or replace function public.studioflow_complete_visit(p_id uuid,p_method text,p_amount numeric) returns jsonb
 language sql security invoker set search_path='' as $$select studioflow_private.complete_visit(p_id,p_method,p_amount)$$;
create or replace function public.studioflow_claim_refunds(p_limit integer default 10) returns jsonb
 language sql security invoker set search_path='' as $$select studioflow_private.claim_refunds(p_limit)$$;
create or replace function public.studioflow_complete_refund(p_order text,p_refund text,p_ok boolean,p_error text) returns jsonb
 language sql security invoker set search_path='' as $$select studioflow_private.complete_refund(p_order,p_refund,p_ok,p_error)$$;
create or replace function public.studioflow_expire_unpaid_holds() returns integer
 language sql security invoker set search_path='' as $$select studioflow_private.expire_unpaid_holds()$$;
create or replace function public.studioflow_payments_verify_worker(p_token text) returns boolean
 language sql stable security definer set search_path='' as $$
  select length(coalesce(p_token,''))=64 and exists(select 1 from studioflow_private.payment_worker where token_hash=encode(extensions.digest(p_token,'sha256'),'hex'))
 $$;

create or replace function studioflow_private.dispatch_refunds() returns bigint
language plpgsql security definer set search_path='' as $$
declare token text; request_id bigint;
begin
 perform studioflow_private.expire_unpaid_holds();
 select v.decrypted_secret into token from vault.decrypted_secrets v join studioflow_private.payment_worker c on c.secret_id=v.id;
 select net.http_post(
   url:='https://zilwgiuiygqqardzutxi.supabase.co/functions/v1/studioflow-payments',
   headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',token),
   body:='{"action":"refunds"}'::jsonb,
   timeout_milliseconds:=30000
 ) into request_id;
 return request_id;
end $$;

revoke all on function
  studioflow_private.owner_walk_in(jsonb), public.studioflow_owner_walk_in(jsonb),
  studioflow_private.collect_balance(uuid,text,numeric), public.studioflow_collect_balance(uuid,text,numeric),
  studioflow_private.complete_visit(uuid,text,numeric), public.studioflow_complete_visit(uuid,text,numeric),
  studioflow_private.claim_refunds(integer), public.studioflow_claim_refunds(integer),
  studioflow_private.complete_refund(text,text,boolean,text), public.studioflow_complete_refund(text,text,boolean,text),
  studioflow_private.expire_unpaid_holds(), public.studioflow_expire_unpaid_holds(),
  public.studioflow_payments_verify_worker(text), studioflow_private.dispatch_refunds(),
  studioflow_private.queue_captured_refund(uuid)
from public,anon,authenticated;

grant execute on function
  public.studioflow_owner_walk_in(jsonb), public.studioflow_collect_balance(uuid,text,numeric), public.studioflow_complete_visit(uuid,text,numeric),
  studioflow_private.owner_walk_in(jsonb), studioflow_private.collect_balance(uuid,text,numeric), studioflow_private.complete_visit(uuid,text,numeric)
to authenticated;
grant execute on function
  public.studioflow_claim_refunds(integer), public.studioflow_complete_refund(text,text,boolean,text),
  public.studioflow_expire_unpaid_holds(), public.studioflow_payments_verify_worker(text),
  studioflow_private.claim_refunds(integer), studioflow_private.complete_refund(text,text,boolean,text),
  studioflow_private.expire_unpaid_holds(), studioflow_private.dispatch_refunds(),
  studioflow_private.queue_captured_refund(uuid), studioflow_private.settle_payment(text,text,bigint)
to service_role;

select cron.schedule('studioflow-payment-refunds','* * * * *','select studioflow_private.dispatch_refunds()');

commit;
