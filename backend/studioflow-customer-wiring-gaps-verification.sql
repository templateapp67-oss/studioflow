-- Verifies studioflow-customer-wiring-gaps.sql inside a rollback; no real rows change.
begin;
do $$
declare owner uuid:=gen_random_uuid(); customer uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); req uuid:=gen_random_uuid(); again jsonb;
 v_slug text:='qa-gap-'||substr(owner::text,1,8); slots jsonb; booked jsonb; moved jsonb; profile jsonb;
 code text; mine text; link text; rewards jsonb; referrals jsonb; done boolean;
begin
 insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
  (owner,'authenticated','authenticated','gap-owner-'||owner||'@example.invalid',now(),'{"provider":"email","providers":["email"]}','{"full_name":"Gap Owner"}',now(),now()),
  (customer,'authenticated','authenticated','gap-customer-'||customer||'@example.invalid',now(),'{"provider":"email","providers":["email"]}','{"full_name":"Gap Customer"}',now(),now()),
  (stranger,'authenticated','authenticated','gap-stranger-'||stranger||'@example.invalid',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
 if (select count(*) from public.profiles where id in (owner,customer))<>2 then raise exception 'FAIL: profiles trigger did not create rows'; end if;

 -- Owner publishes a minimal site.
 perform set_config('request.jwt.claim.sub',owner::text,true);
 execute 'set local role authenticated';
 perform public.studioflow_ensure_account('');
 update public.studioflow_accounts set draft=jsonb_build_object('profile',jsonb_build_object('businessType','hair_salon','businessName','Gap Salon','requireDeposit',false),
  'services',jsonb_build_array(jsonb_build_object('id','svc1','name','Gap Cut','price',500,'durationMinutes',30,'category','Hair')),
  'stylists',jsonb_build_array(jsonb_build_object('id','sty1','name','Gap Stylist','status','Available','schedule','[]'::jsonb)),
  'extras',jsonb_build_object('bookingLeadHours',0),'loyaltyConfig',jsonb_build_object('programEnabled',true,'pointsPerVisit',50,'pointsPerHundredSpent',10)) where user_id=owner;
 insert into public.studioflow_websites(owner_id,slug,content) values(owner,v_slug,jsonb_build_object('profile',jsonb_build_object('businessName','Gap Salon','requireDeposit',false),
  'services',jsonb_build_array(jsonb_build_object('id','svc1','name','Gap Cut','price',500,'durationMinutes',30,'category','Hair')),
  'stylists',jsonb_build_array(jsonb_build_object('id','sty1','name','Gap Stylist','status','Available')),
  'loyaltyConfig',jsonb_build_object('programEnabled',true)));
 execute 'reset role';

 -- Signed-out slot browsing works (anon grant).
 perform set_config('request.jwt.claim.sub','',true);
 execute 'set local role anon';
 slots:=public.studioflow_android_slots(v_slug,'["svc1"]',(current_date+1)::date,'any');
 if jsonb_array_length(slots)=0 then raise exception 'FAIL: anon slots empty'; end if;
 execute 'reset role';

 -- Customer end-to-end: profile, slots, book, reschedule, review, rewards, favorite, referral.
 perform set_config('request.jwt.claim.sub',customer::text,true);
 execute 'set local role authenticated';
 profile:=public.studioflow_android_profile();
 if profile->>'customer_id'<>customer::text then raise exception 'FAIL: android profile ensure'; end if;
 perform public.studioflow_android_save_profile('Gap Customer','+919876543210');
 if (select full_name from public.studioflow_android_profiles where customer_id=customer)<>'Gap Customer' then raise exception 'FAIL: save profile'; end if;
 slots:=public.studioflow_android_slots(v_slug,'["svc1"]',(current_date+1)::date,'any');
 if slots->0->>'available'<>'true' then raise exception 'FAIL: no available slot, got %',slots; end if;
 booked:=public.studioflow_android_book(v_slug,'["svc1"]',(current_date+1)::date,slots->0->>'time','any','Gap Customer','+919876543210','',req);
 if booked->>'customer_id'<>customer::text or booked->'payload'->>'servicePrice'<>'500' then raise exception 'FAIL: book payload %',booked; end if;
 again:=public.studioflow_android_book(v_slug,'["svc1"]',(current_date+1)::date,slots->0->>'time','any','Gap Customer','+919876543210','',req);
 if again->>'id'<>booked->>'id' then raise exception 'FAIL: booking idempotency'; end if;
 moved:=public.studioflow_android_reschedule((booked->>'id')::uuid,(current_date+2)::date,'10:00','sty1');
 if moved->'payload'->>'time'<>'10:00' then raise exception 'FAIL: reschedule %',moved; end if;
 perform public.studioflow_android_review(v_slug,'Gap Customer',5,'Excellent gap closure cut.');
 if not exists(select 1 from public.studioflow_reviews where owner_id=owner and rating=5) then raise exception 'FAIL: review row'; end if;
 rewards:=public.studioflow_android_rewards();
 if jsonb_array_length(rewards)=0 then raise exception 'FAIL: rewards wallets'; end if;
 perform public.studioflow_android_favorite(v_slug);
 if not exists(select 1 from public.studioflow_android_favorites where customer_id=customer and salon_slug=v_slug) then raise exception 'FAIL: favorite'; end if;
 code:=public.studioflow_android_referral();
 if code is null or length(code)<>8 then raise exception 'FAIL: referral code'; end if;
 if public.studioflow_android_referral()<>code then raise exception 'FAIL: referral stability'; end if;
 begin perform public.studioflow_android_record_upload(stranger::text||'/photos/evil.jpg',false); raise exception 'FAIL: foreign photo path accepted';
 exception when raise_exception then if sqlerrm not like 'Invalid upload path%' then raise; end if; end;
 execute 'reset role';

 -- Tenant isolation: a stranger sees none of the customer's private rows.
 perform set_config('request.jwt.claim.sub',stranger::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.studioflow_android_profiles where customer_id=customer) then raise exception 'FAIL: cross-customer profile read'; end if;
 if exists(select 1 from public.studioflow_android_favorites where customer_id=customer) then raise exception 'FAIL: cross-customer favorites read'; end if;
 execute 'reset role';

 -- Owner growth + notification links.
 perform set_config('request.jwt.claim.sub',owner::text,true);
 execute 'set local role authenticated';
 mine:=public.get_my_referral_code();
 if mine is null or length(mine)<>12 then raise exception 'FAIL: owner referral code'; end if;
 referrals:=public.get_my_partner_referrals_filtered(100,0);
 if referrals->>'total' is null or jsonb_typeof(referrals->'rows')<>'array' then raise exception 'FAIL: partner referrals shape'; end if;
 link:=public.nexora_create_notification_link();
 if link !~ '^[a-f0-9]{64}$' then raise exception 'FAIL: notification token format'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',customer::text,true);
 execute 'set local role authenticated';
 perform public.link_my_growth_referral(mine);
 if (select growth_partner_id from public.growth_onboarding where user_id=customer)<>owner then raise exception 'FAIL: growth link'; end if;
 perform public.update_my_onboarding_progress('start_template');
 perform public.update_my_onboarding_progress('complete_template');
 if (select start_template_at is null or complete_template_at is null from public.growth_onboarding where user_id=customer) then raise exception 'FAIL: onboarding progress'; end if;
 execute 'reset role';

 -- Catalog objects exist with RLS + realtime + storage.
 if to_regclass('studioflow_android_private.slots') is null then raise exception 'FAIL: slots core missing'; end if;
 for done in select row_rls_enabled from (values
  ('public.profiles'),('public.growth_partners'),('public.growth_onboarding'),('public.partner_referrals'),
  ('public.studioflow_android_profiles'),('public.studioflow_android_favorites'),('public.studioflow_android_requests'),
  ('public.studioflow_android_push_queue'),('public.studioflow_notification_links')) v(tbl)
  join lateral (select c.relrowsecurity as row_rls_enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname=split_part(v.tbl,'.',1) and c.relname=split_part(v.tbl,'.',2)) r on true loop
  if not done then raise exception 'FAIL: RLS disabled on a gap table'; end if;
 end loop;
 if not exists(select 1 from storage.buckets where id='nexora-customer-private' and not public) then raise exception 'FAIL: private bucket'; end if;
 if (select count(*) from pg_publication_tables where pubname='supabase_realtime' and tablename in
  ('studioflow_websites','studioflow_templates','studioflow_bookings','studioflow_accounts','studioflow_demo_bookings','studioflow_customer_reward_claims'))<>6
  then raise exception 'FAIL: realtime publication incomplete'; end if;
 raise notice 'PASS: gap tables, RPC round-trip, isolation, growth, notify link, storage, realtime.';
end $$;
rollback;
