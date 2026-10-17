begin;
do $$
declare inviter uuid:=gen_random_uuid(); member uuid:=gen_random_uuid(); standard uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); invalid_user uuid:=gen_random_uuid(); code text; members jsonb;
begin
 insert into auth.users(id,aud,role,email,created_at,updated_at) values(inviter,'authenticated','authenticated','dob-qa-'||inviter||'@example.invalid',now(),now());
 perform set_config('request.jwt.claim.sub',inviter::text,true);execute 'set local role authenticated';code:=public.studioflow_android_referral();execute 'reset role';
 insert into auth.users(id,aud,role,email,created_at,updated_at,raw_user_meta_data) values(member,'authenticated','authenticated','dob-qa-'||member||'@example.invalid',now(),now(),jsonb_build_object('full_name','DOB Referral QA','customer_referral_code',code,'date_of_birth','1995-04-20','whatsapp_number','+919876543210')),(standard,'authenticated','authenticated','dob-qa-'||standard||'@example.invalid',now(),now(),'{"full_name":"DOB Normal QA","date_of_birth":"2000-02-29","whatsapp_number":"+919123456789"}');
 if (select date_of_birth from public.studioflow_android_profiles where customer_id=member) is distinct from date '1995-04-20' then raise exception 'FAIL referral signup DOB';end if;
 if (select date_of_birth from public.studioflow_android_profiles where customer_id=standard) is distinct from date '2000-02-29' then raise exception 'FAIL normal signup DOB';end if;
 if (select whatsapp_number from public.studioflow_android_profiles where customer_id=member) is distinct from '+919876543210' then raise exception 'FAIL referral WhatsApp';end if;
 if (select whatsapp_number from public.studioflow_android_profiles where customer_id=standard) is distinct from '+919123456789' then raise exception 'FAIL normal WhatsApp';end if;
 if not exists(select 1 from public.studioflow_customer_referrals where invitee_id=member and inviter_id=inviter) then raise exception 'FAIL referral attribution';end if;
 begin
  insert into auth.users(id,aud,role,email,created_at,updated_at,raw_user_meta_data) values(invalid_user,'authenticated','authenticated','dob-qa-'||invalid_user||'@example.invalid',now(),now(),'{"date_of_birth":"2999-01-01"}');
  raise exception 'FAIL future DOB accepted';
 exception when sqlstate '22007' then null;end;
 begin
 insert into auth.users(id,aud,role,email,created_at,updated_at,raw_user_meta_data) values(invalid_user,'authenticated','authenticated','dob-qa-'||invalid_user||'@example.invalid',now(),now(),'{"whatsapp_number":"123"}');
 raise exception 'FAIL invalid WhatsApp accepted';
 exception when sqlstate '22023' then null;end;
 perform set_config('request.jwt.claim.sub',member::text,true);execute 'set local role authenticated';
 if public.studioflow_android_profile()->>'date_of_birth' is distinct from '1995-04-20' then raise exception 'FAIL own private DOB';end if;
 perform set_config('request.jwt.claim.sub',inviter::text,true);
 if exists(select 1 from public.studioflow_android_profiles where customer_id=member) then raise exception 'FAIL inviter sees private profile';end if;
 members:=public.studioflow_customer_referral_members(0);
 if members::text like '%919876543210%' or members::text like '%whatsapp_number%' then raise exception 'FAIL WhatsApp leaked to inviter';end if;
 if members::text like '%1995-04-20%' or members::text like '%date_of_birth%' then raise exception 'FAIL DOB leaked to referral list';end if;
 execute 'reset role';
 raise notice 'PASS normal/referral DOB persistence, leap day, referral attribution, future-date rejection, own profile access and inviter privacy';
end $$;
rollback;
