-- All test identities, published rows and bookings are rolled back.
begin;
create temporary table sf_qa_users(label text,id uuid);
insert into sf_qa_users values('owner',gen_random_uuid()),('customer',gen_random_uuid());
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select id,'authenticated','authenticated','studioflow-qa-'||id||'@example.invalid',now(),'{"provider":"email","providers":["email"]}'::jsonb,jsonb_build_object('full_name','StudioFlow QA '||label,'salon_name','StudioFlow QA salon'),now(),now() from sf_qa_users;
do $$
declare a uuid; b uuid; code text; d jsonb; saved jsonb; booked jsonb; v_slug text; blocked boolean; n int;
begin
 select id into a from sf_qa_users where label='owner'; select id into b from sf_qa_users where label='customer';
 perform set_config('request.jwt.claim.sub',a::text,true);
 execute 'set local role authenticated';
 perform public.studioflow_ensure_account(null);
 code:=public.get_my_referral_code();
 if code is null then raise exception 'FAIL: persisted referral code'; end if;
 if not public.studioflow_validate_ref(lower(code)) then raise exception 'FAIL: case-insensitive code'; end if;
 blocked:=false;begin perform public.studioflow_ensure_account(code);exception when sqlstate '22023' then blocked:=true;end;
 if not blocked then raise exception 'FAIL: self referral';end if;
 v_slug:='qa-'||substr(a::text,1,12);
 d:=jsonb_build_object('profile',jsonb_build_object('businessType','hair_salon','businessName','QA Salon','ownerName','QA Owner','phone','+919876543210','whatsapp','+919876543210','city','Mumbai','postalCode','400001','subdomain',v_slug,'requireDeposit',true,'depositPercentage',25), 'services',jsonb_build_array(jsonb_build_object('id','qa-service','name','QA Haircut','price',800,'durationMinutes',30)), 'stylists',jsonb_build_array(jsonb_build_object('id','qa-stylist','name','QA Stylist','status','Available','phone','private','accessRole','Manager','commissionRate',50,'schedule','[]'::jsonb)), 'clients',jsonb_build_array(jsonb_build_object('phone','PRIVATE CRM')), 'extras','{}'::jsonb);
 saved:=public.studioflow_save_workspace(d,0);
 if (saved->>'revision')::int<>1 then raise exception 'FAIL: saved revision';end if;
 blocked:=false;begin perform public.studioflow_save_workspace(d,0);exception when sqlstate 'P0001' then blocked:=true;end;
 if not blocked then raise exception 'FAIL: stale write rejected';end if;
 saved:=public.studioflow_publish();
 if saved->'content' ? 'clients' or (saved->'content'->'stylists'->0) ? 'phone' then raise exception 'FAIL: public private data separation';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.studioflow_ensure_account(lower(code));
 perform public.studioflow_ensure_account(lower(code));
 if (public.get_my_growth_referral()->>'referral_code')<>code then raise exception 'FAIL: referral attribution';end if;
 select count(*) into n from public.studioflow_accounts where user_id=a;
 if n<>0 then raise exception 'FAIL: cross-account RLS isolation';end if;
 booked:=public.studioflow_book(v_slug,jsonb_build_object('serviceId','qa-service','stylistId','qa-stylist','clientName','QA Customer','clientPhone','+919876543210','date',(current_date+3)::text,'time','11:00','servicePrice',1,'amountPaid',800));
 if booked->>'status'<>'pending' or (booked->>'amountPaid')::numeric<>0 or (booked->>'servicePrice')::numeric<>800 then raise exception 'FAIL: authoritative pricing/payment state';end if;
 blocked:=false;begin perform public.studioflow_book(v_slug,jsonb_build_object('serviceId','qa-service','stylistId','qa-stylist','clientName','QA Customer','clientPhone','+919876543210','date',(current_date+3)::text,'time','11:15'));exception when others then if sqlerrm like '%slot has just been booked%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'FAIL: overlapping booking rejected';end if;
 perform public.studioflow_update_booking((booked->>'id')::uuid,'cancelled');
 perform set_config('request.jwt.claim.sub',a::text,true);
 select count(*) into n from public.studioflow_bookings where owner_id=a;
 if n<>1 then raise exception 'FAIL: dashboard booking read';end if;
 execute 'set local role anon';
 select count(*) into n from public.studioflow_templates;
 if n<>14 then raise exception 'FAIL: public template catalog';end if;
 select count(*) into n from public.studioflow_websites where slug=v_slug; -- public websites only
 if n<1 then raise exception 'FAIL: public published site';end if;
 execute 'reset role';
 select count(*) into n from public.partner_referrals where referred_user_id=b;
 if n<>1 then raise exception 'FAIL: referral idempotency';end if;
end $$;
rollback;
