begin;
create temporary table sf_payment_qa(id uuid);
insert into sf_payment_qa values(gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select id,'authenticated','authenticated','studioflow-payment-qa-'||id||'@example.invalid',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now() from sf_payment_qa;
do $$
declare actor uuid;draft jsonb;slug text;booked jsonb;bid uuid;again jsonb;blocked boolean;oid text;expired jsonb;
begin
 select id into actor from sf_payment_qa;perform set_config('request.jwt.claim.sub',actor::text,true);execute 'set local role authenticated';
 perform public.studioflow_ensure_account('');slug:='payment-qa-'||substr(actor::text,1,10);
 draft:=jsonb_build_object('profile',jsonb_build_object('businessType','hair_salon','businessName','Payment QA','ownerName','QA','phone','+919876543210','subdomain',slug,'requireDeposit',false),'services',jsonb_build_array(jsonb_build_object('id','s','name','QA service','price',999,'durationMinutes',30)),'stylists',jsonb_build_array(jsonb_build_object('id','t','name','QA stylist','status','Available','schedule','[]'::jsonb)),'extras','{}'::jsonb);
 perform public.studioflow_save_workspace(draft,0);perform public.studioflow_publish();
 booked:=public.studioflow_book(slug,jsonb_build_object('serviceId','s','stylistId','t','clientName','QA','clientPhone','9876543210','date',(current_date+3)::text,'time','11:00','amountPaid',999,'paymentStatus','paid_full'));
 bid:=(booked->>'id')::uuid;oid:='qa_order_'||bid;
 if booked->>'status'<>'pending' or (booked->>'amountPaid')::numeric<>0 then raise exception 'FAIL mandatory deposit cannot be bypassed';end if;
 blocked:=false;begin perform public.studioflow_settle_payment(oid,'fake',24975);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'FAIL client must not settle payments';end if;
 execute 'reset role';
 blocked:=false;begin perform public.studioflow_register_payment(bid,oid,100);exception when others then blocked:=true;end;
 if not blocked then raise exception 'FAIL tampered deposit accepted';end if;
 perform public.studioflow_register_payment(bid,oid,24975);
 again:=public.studioflow_settle_payment(oid,'qa_payment_'||bid,24975);
 if again->>'status'<>'confirmed' or (again->>'amountPaid')::numeric<>249.75 or again->>'paymentStatus'<>'paid_deposit' then raise exception 'FAIL deposit certification';end if;
 if public.studioflow_settle_payment(oid,'qa_payment_'||bid,24975)<>again then raise exception 'FAIL repeat settlement';end if;
 execute 'set local role authenticated';
 expired:=public.studioflow_book(slug,jsonb_build_object('serviceId','s','stylistId','t','clientName','QA','clientPhone','9876543210','date',(current_date+3)::text,'time','12:00'));execute 'reset role';
 bid:=(expired->>'id')::uuid;oid:='qa_order_'||bid;perform public.studioflow_register_payment(bid,oid,24975);
 update public.studioflow_bookings set hold_expires_at=now()-interval '1 second' where id=bid;
 if not exists(select 1 from jsonb_array_elements(public.studioflow_available_slots(slug,'s',current_date+3,'t')) slot where slot->>'time'='12:00' and (slot->>'available')::boolean) then raise exception 'FAIL expired reservation blocks slot';end if;
 if not (public.studioflow_settle_payment(oid,'qa_expired_'||bid,24975)->>'refund_required')::boolean then raise exception 'FAIL expired payment confirmed';end if;
 if not exists(select 1 from public.studioflow_bookings where id=bid and status='pending') then raise exception 'FAIL expired payment changed booking';end if;
end $$;
select 'PASS: mandatory 25%, caller cannot settle, exact server amount, paid certification/idempotency, expiry releases slots and late payment flagged for refund' as result;
rollback;
