-- Recovered from the verified deployed database functions. No customer data included.
begin;
create table if not exists studioflow_private.coupon_holds(claim_id uuid primary key references public.studioflow_customer_reward_claims(id),booking_id uuid not null unique references public.studioflow_bookings(id) on delete cascade);
alter table studioflow_private.coupon_holds enable row level security;
revoke all on studioflow_private.coupon_holds from public,anon,authenticated;
CREATE OR REPLACE FUNCTION studioflow_android_private.use_reward(p_claim uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.studioflow_customer_reward_claims;
begin
 select * into c from public.studioflow_customer_reward_claims where id=p_claim and owner_id=auth.uid() and status='active' for update;
 if c.id is null then raise exception 'Voucher not active or not owned by your salon' using errcode='42501';end if;
 if exists(select 1 from studioflow_private.coupon_holds h join public.studioflow_bookings b on b.id=h.booking_id where h.claim_id=c.id and (b.status in ('confirmed','completed') or b.status='pending' and b.hold_expires_at>now())) then raise exception 'Coupon is reserved on an online booking. It is marked used after payment confirmation.';end if;
 update public.studioflow_customer_reward_claims set status='used',used_at=now() where id=p_claim;
end $function$
;
CREATE OR REPLACE FUNCTION studioflow_private.coupon_quote(p_slug text, p_services jsonb, p_code text, p_booking uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w public.studioflow_websites; c public.studioflow_customer_reward_claims; subtotal numeric; eligible numeric; discount numeric; amount numeric; count_services int; category text; reward_type text; held public.studioflow_bookings; terms jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to apply your reward coupon' using errcode='42501';end if;
 if p_code is null or length(btrim(p_code)) not between 4 and 100 or upper(p_code) like '%-XXXX' then raise exception 'Enter your actual issued reward code. XXXX is an example only.';end if;
 if jsonb_typeof(p_services) is distinct from 'array' or jsonb_array_length(p_services) not between 1 and 10 or (select count(distinct value) from jsonb_array_elements_text(p_services))<>jsonb_array_length(p_services) then raise exception 'Choose valid, distinct services';end if;
 select * into w from public.studioflow_websites where slug=p_slug;
 select * into c from public.studioflow_customer_reward_claims where customer_id=auth.uid() and owner_id=w.owner_id and upper(coupon_code)=upper(btrim(p_code));
 if c.id is null then raise exception 'Coupon not found for your account at this salon';end if;
 if c.status<>'active' then raise exception 'Coupon has already been used';end if;
 select b.* into held from studioflow_private.coupon_holds h join public.studioflow_bookings b on b.id=h.booking_id where h.claim_id=c.id;
 if held.id is not null and held.id is distinct from p_booking and (held.status in ('confirmed','completed') or held.status='pending' and held.hold_expires_at>now()) then raise exception 'Coupon is reserved on another booking. Finish or cancel that reservation first.';end if;
 terms:=c.reward_terms;category:=lower(coalesce(nullif(terms->>'applicableCategory',''),'all services'));reward_type:=terms->>'rewardType';
 if terms ? 'expiresAt' and nullif(terms->>'expiresAt','') is not null and (terms->>'expiresAt')::timestamptz<=now() then raise exception 'Coupon has expired';end if;
 select count(*),sum((s->>'price')::numeric),coalesce(sum((s->>'price')::numeric) filter(where category in ('all','all services') or lower(s->>'category')=category),0) into count_services,subtotal,eligible from jsonb_array_elements(w.content->'services') s where p_services ? (s->>'id');
 if count_services<>jsonb_array_length(p_services) then raise exception 'A selected service is unavailable';end if;
 if subtotal<coalesce((terms->>'minimumSpend')::numeric,0) then raise exception 'Minimum booking amount for this coupon is not met';end if;
 if eligible<=0 then raise exception 'Coupon is not applicable to the selected service category';end if;
 amount:=(terms->>'discountValue')::numeric;
 if amount is null or amount<=0 then raise exception 'Invalid reward discount';end if;
 if reward_type='percentage_discount' and amount<=100 then discount:=round(eligible*amount/100,2);
 elsif reward_type='flat_discount' then discount:=least(eligible,round(amount,2));
 else raise exception 'This reward must be redeemed at the salon; it is not an online discount coupon';end if;
 if discount<=0 or subtotal-discount<4 then raise exception 'Discounted total is too low for online advance payment. Contact the salon.';end if;
 return jsonb_build_object('claimId',c.id,'code',c.coupon_code,'title',c.reward_title,'originalPrice',subtotal,'discountAmount',discount,'finalPrice',subtotal-discount,'advanceAmount',ceil((subtotal-discount)*100/4)/100);
end $function$
;
CREATE OR REPLACE FUNCTION public.studioflow_coupon_quote(p_slug text, p_services jsonb, p_code text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$select studioflow_private.coupon_quote(p_slug,p_services,p_code)$function$
;
CREATE OR REPLACE FUNCTION studioflow_private.consume_booking_coupon()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.status in ('confirmed','completed') then
  update public.studioflow_customer_reward_claims c set status='used',used_at=coalesce(used_at,now()) from studioflow_private.coupon_holds h where h.claim_id=c.id and h.booking_id=new.id and c.status='active';
 end if;return new;
end $function$
;
CREATE OR REPLACE FUNCTION studioflow_android_private.redeem_reward(p_slug text, p_reward text, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid(); w public.studioflow_websites; r jsonb; cost integer; available bigint; claim public.studioflow_customer_reward_claims;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_request is null then raise exception 'Request ID required';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,451));
 select * into claim from public.studioflow_customer_reward_claims where customer_id=actor and request_id=p_request;
 if found then if claim.reward_id<>p_reward or not exists(select 1 from public.studioflow_websites where slug=p_slug and owner_id=claim.owner_id) then raise exception 'Request already used';end if;return jsonb_build_object('id',claim.id,'code',claim.coupon_code,'status',claim.status);end if;
 select * into w from public.studioflow_websites where slug=p_slug and slug not like 'studioflow-qa-%' for share;
 if not found or not coalesce((w.content->'loyaltyConfig'->>'programEnabled')::boolean,false) then raise exception 'Salon loyalty program is unavailable';end if;
 select value into r from jsonb_array_elements(coalesce(w.content->'loyaltyConfig'->'rewards','[]')) where value->>'id'=p_reward and value->>'isActive'='true';
 if r is null or coalesce(r->>'requiredPoints','') !~ '^[0-9]+$' then raise exception 'Reward unavailable';end if;
 cost:=(r->>'requiredPoints')::integer;if cost<1 or cost>1000000 then raise exception 'Reward unavailable';end if;
 select studioflow_android_private.reward_earnings(w.owner_id,actor)-coalesce(sum(points_spent),0) into available from public.studioflow_customer_reward_claims where customer_id=actor and owner_id=w.owner_id;
 if available<cost then raise exception 'Not enough points at this salon';end if;
 insert into public.studioflow_customer_reward_claims(customer_id,owner_id,reward_id,reward_title,reward_terms,points_spent,coupon_code,request_id) values(actor,w.owner_id,p_reward,r->>'title',r-'couponCodePrefix',cost,coalesce(nullif(left(regexp_replace(upper((select rr->>'couponCodePrefix' from public.studioflow_accounts account cross join lateral jsonb_array_elements(account.draft->'loyaltyConfig'->'rewards') rr where account.user_id=w.owner_id and rr->>'id'=p_reward limit 1)),'[^A-Z0-9]','','g'),16),''),'NX')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,14)),p_request) returning * into claim;
 return jsonb_build_object('id',claim.id,'code',claim.coupon_code,'status',claim.status);
end $function$
;
CREATE OR REPLACE FUNCTION studioflow_private.coupon_book(p_slug text, p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ids jsonb; quote jsonb; v_claim_id uuid; result jsonb; b public.studioflow_bookings; resolved text; candidate jsonb; existing_id uuid; v_request_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to book' using errcode='42501';end if;
 v_request_id:=(p_request->>'requestId')::uuid;if v_request_id is null then raise exception 'Booking request ID required';end if;
 ids:=coalesce(p_request->'serviceIds',jsonb_build_array(p_request->>'serviceId')||coalesce(p_request->'addOnIds','[]'::jsonb));
 select c.id into v_claim_id from public.studioflow_customer_reward_claims c join public.studioflow_websites w on w.owner_id=c.owner_id where w.slug=p_slug and c.customer_id=auth.uid() and upper(c.coupon_code)=upper(btrim(p_request->>'couponCode')) for update of c;
 if v_claim_id is null then raise exception 'Coupon not found for your account at this salon';end if;
 select r.booking_id into existing_id from public.studioflow_android_requests r where r.customer_id=auth.uid() and r.request_id=v_request_id;
 if existing_id is not null then
  select * into b from public.studioflow_bookings where id=existing_id;
  if b.payload->'coupon'->>'claimId' is distinct from v_claim_id::text then raise exception 'Booking request changed. Start a new reservation.';end if;
  resolved:=b.stylist_id;
 else
  resolved:=case when p_request->>'stylistId' in ('any','any_available','any-specialist') then 'any' else p_request->>'stylistId' end;
  select s into candidate from jsonb_array_elements(studioflow_android_private.slots(p_slug,ids,(p_request->>'date')::date,resolved)) s where s->>'time'=p_request->>'time';
  if candidate is null then raise exception 'Slot unavailable. Choose another time.';end if;resolved:=candidate->>'stylistId';
 end if;
 if existing_id is null then quote:=studioflow_private.coupon_quote(p_slug,ids,p_request->>'couponCode');if p_request ? 'couponExpectedTotal' and (p_request->>'couponExpectedTotal')::numeric is distinct from (quote->>'finalPrice')::numeric then raise exception 'Prices changed. Remove and reapply the coupon before booking.';end if;end if;
 if p_request->>'stylistId' not in ('any','any_available','any-specialist',resolved) then raise exception 'Booking specialist changed';end if;
 result:=studioflow_android_private.book(p_slug,ids,(p_request->>'date')::date,p_request->>'time',resolved,p_request->>'clientName',p_request->>'clientPhone',coalesce(p_request->>'instructions',''),v_request_id);
 if existing_id is not null then return result;end if;
 insert into studioflow_private.coupon_holds(claim_id,booking_id) values(v_claim_id,(result->>'id')::uuid) on conflict(claim_id) do update set booking_id=excluded.booking_id;
 update public.studioflow_bookings set payload=payload||jsonb_build_object('originalPrice',quote->'originalPrice','discountAmount',quote->'discountAmount','servicePrice',quote->'finalPrice','coupon',quote,'source','nexora_coupon_booking') where id=(result->>'id')::uuid returning * into b;
 return to_jsonb(b);
end $function$
;
CREATE OR REPLACE FUNCTION public.studioflow_coupon_book(p_slug text, p_request jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$select studioflow_private.coupon_book(p_slug,p_request)$function$
;
drop trigger if exists studioflow_consume_booking_coupon on public.studioflow_bookings;
create trigger studioflow_consume_booking_coupon after update of status on public.studioflow_bookings for each row execute function studioflow_private.consume_booking_coupon();
revoke all on function studioflow_private.coupon_quote(text,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function studioflow_private.coupon_quote(text,jsonb,text,uuid) to authenticated;
revoke all on function studioflow_private.coupon_book(text,jsonb) from public,anon,authenticated;
grant execute on function studioflow_private.coupon_book(text,jsonb) to authenticated;
revoke all on function public.studioflow_coupon_quote(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.studioflow_coupon_quote(text,jsonb,text) to authenticated;
revoke all on function public.studioflow_coupon_book(text,jsonb) from public,anon,authenticated;
grant execute on function public.studioflow_coupon_book(text,jsonb) to authenticated;
revoke all on function studioflow_private.consume_booking_coupon() from public,anon,authenticated;
commit;

