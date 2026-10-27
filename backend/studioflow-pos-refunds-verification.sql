begin;
create temporary table sf_pos_qa(id uuid);
insert into sf_pos_qa values(gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select id,'authenticated','authenticated','studioflow-pos-qa-'||id||'@example.invalid',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now() from sf_pos_qa;
do $$
declare actor uuid; slug text; walk jsonb; bid uuid; paid jsonb; done jsonb; booked jsonb; oid text; late jsonb; claimed jsonb; refunded jsonb;
begin
 select id into actor from sf_pos_qa; perform set_config('request.jwt.claim.sub',actor::text,true); execute 'set local role authenticated';
 perform public.studioflow_ensure_account(''); slug:='pos-qa-'||substr(actor::text,1,8);
 perform public.studioflow_save_workspace(jsonb_build_object(
  'profile',jsonb_build_object('businessType','hair_salon','businessName','POS QA','ownerName','QA','phone','+919876543210','subdomain',slug,'requireDeposit',true),
  'services',jsonb_build_array(jsonb_build_object('id','s','name','QA cut','category','Hair','price',1000,'durationMinutes',30,'description','QA','icon','spa')),
  'stylists',jsonb_build_array(jsonb_build_object('id','t','name','QA stylist','status','Available','schedule','[]'::jsonb)),
  'extras','{}'::jsonb
 ),0);
 perform public.studioflow_publish();
 walk:=public.studioflow_owner_walk_in(jsonb_build_object('serviceId','s','stylistId','t','clientName','Walk Guest','clientPhone','9876543210','date',(current_date+1)::text,'time','11:00','collectMode','deposit','posMethod','upi'));
 if walk->>'status'<>'confirmed' or walk->>'paymentStatus'<>'paid_deposit' or (walk->>'amountPaid')::numeric<>250 or walk->>'walkIn'<>'true' then raise exception 'FAIL walk-in deposit POS'; end if;
 bid:=(walk->>'id')::uuid;
 if exists(select 1 from public.studioflow_bookings where id=bid and customer_id is not null) then raise exception 'FAIL walk-in must not attach a customer account'; end if;
 paid:=public.studioflow_collect_balance(bid,'cash',750);
 if paid->>'paymentStatus'<>'paid_full' or (paid->>'amountPaid')::numeric<>1000 then raise exception 'FAIL remaining balance collection'; end if;
 execute 'reset role';
 update public.studioflow_bookings set starts_at=now()-interval '2 minutes', ends_at=now()+interval '20 minutes' where id=bid;
 execute 'set local role authenticated';
 done:=public.studioflow_complete_visit(bid,'cash',0);
 if done->>'status'<>'completed' or done->>'paymentStatus'<>'paid_full' then raise exception 'FAIL complete visit'; end if;

 booked:=public.studioflow_book(slug,jsonb_build_object('serviceId','s','stylistId','t','clientName','Online','clientPhone','9876543210','date',(current_date+2)::text,'time','11:00'));
 bid:=(booked->>'id')::uuid; oid:='pos_order_'||replace(bid::text,'-','');
 execute 'reset role';
 perform public.studioflow_register_payment(bid,oid,25000);
 perform public.studioflow_settle_payment(oid,'pay_ok_'||bid,25000);
 execute 'set local role authenticated';
 perform public.studioflow_update_booking(bid,'cancelled');
 execute 'reset role';
 if not exists(select 1 from public.studioflow_payment_orders where order_id=oid and status='refund_required') then raise exception 'FAIL cancel did not queue Razorpay refund'; end if;
 claimed:=public.studioflow_claim_refunds(10);
 if jsonb_array_length(claimed)<>1 or claimed->0->>'order_id'<>oid then raise exception 'FAIL refund claim'; end if;
 refunded:=public.studioflow_complete_refund(oid,'rfnd_ok',true,null);
 if refunded->>'status'<>'refunded' then raise exception 'FAIL refund complete'; end if;

 execute 'set local role authenticated';
 booked:=public.studioflow_book(slug,jsonb_build_object('serviceId','s','stylistId','t','clientName','Late','clientPhone','9876543210','date',(current_date+2)::text,'time','12:00'));
 bid:=(booked->>'id')::uuid; oid:='pos_late_'||replace(bid::text,'-','');
 execute 'reset role';
 perform public.studioflow_register_payment(bid,oid,25000);
 update public.studioflow_bookings set hold_expires_at=now()-interval '1 second' where id=bid;
 late:=public.studioflow_settle_payment(oid,'pay_late_'||bid,25000);
 if not coalesce((late->>'refund_required')::boolean,false) then raise exception 'FAIL expired capture must queue refund'; end if;
 if not exists(select 1 from public.studioflow_payment_orders where order_id=oid and status='refund_required') then raise exception 'FAIL expired capture status'; end if;
 if public.studioflow_expire_unpaid_holds() is null then raise exception 'FAIL expire holds'; end if;
end $$;
select 'PASS: walk-in POS, remaining balance, complete visit, cancel queues refund, expired capture queues refund' as result;
rollback;
