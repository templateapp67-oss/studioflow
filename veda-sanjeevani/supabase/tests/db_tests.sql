-- Run after migrations + seed, with psql -v ON_ERROR_STOP=1.
-- All fixtures roll back. Use a disposable/reset database, not production.
BEGIN;
SET LOCAL timezone = 'UTC';
CREATE TEMP TABLE test_context (owner_id uuid, staff_id uuid, service_id uuid, therapist_id uuid, monday date);
CREATE FUNCTION pg_temp.assert_that(p_ok boolean, p_message text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN IF p_ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %',p_message; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(p_sql text, p_code text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE v_code text;
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'FAIL: expected SQLSTATE %, statement succeeded: %',p_code,p_sql;
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_code = RETURNED_SQLSTATE;
  IF v_code <> p_code THEN
    RAISE EXCEPTION 'FAIL: expected SQLSTATE %, got %: %',p_code,v_code,SQLERRM;
  END IF;
END $$;
CREATE FUNCTION pg_temp.login(p_id uuid, p_role text DEFAULT 'authenticated') RETURNS void
LANGUAGE sql AS $$ SELECT set_config('request.jwt.claims',jsonb_build_object('sub',p_id,'role',p_role)::text,true); $$;

DO $$
DECLARE
  c test_context; r jsonb; v_id uuid; v_token text; v_start timestamptz; v_count int;
  v_owner uuid := 'b1000000-0000-4000-8000-000000000001';
  v_staff uuid := 'b1000000-0000-4000-8000-000000000002';
  v_day date; t text;
BEGIN
  -- Fresh Auth bootstrap: first user owner, subsequent user staff.
  INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
    (v_owner,'veda-db-test-owner@example.invalid','{"full_name":"Test Owner"}'),
    (v_staff,'veda-db-test-staff@example.invalid','{"full_name":"Test Staff"}');
  PERFORM pg_temp.assert_that((SELECT role = 'owner' FROM public.profiles WHERE id = v_owner),'first Auth user becomes owner');
  PERFORM pg_temp.assert_that((SELECT role = 'staff' FROM public.profiles WHERE id = v_staff),'second Auth user becomes staff');
  SELECT v_owner,v_staff,s.id,'a1000000-0000-4000-8000-000000000002'::uuid,
         (current_date + 7 + ((8 - extract(dow FROM current_date)::int) % 7))::date
  INTO c FROM public.services s WHERE s.slug = 'abhyanga';
  INSERT INTO test_context VALUES (c.*);
  v_day := c.monday; v_start := (v_day + time '10:00') AT TIME ZONE 'Asia/Kolkata';
  INSERT INTO public.customers (id,name,phone) VALUES
    ('c1000000-0000-4000-8000-000000000001','Test Guest','9000000001');

  -- 1. Exclusion protects overlapping bookings; cancellation releases them.
  INSERT INTO public.bookings (id,customer_id,service_id,staff_id,start_at,end_at,status,price)
  VALUES ('d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',c.service_id,c.therapist_id,v_start,v_start+interval '1 hour','confirmed',2400);
  PERFORM pg_temp.expect_error(format(
    'INSERT INTO public.bookings(customer_id,service_id,staff_id,start_at,end_at,status,price) VALUES (%L,%L,%L,%L,%L,%L,2400)',
    'c1000000-0000-4000-8000-000000000001',c.service_id,c.therapist_id,v_start+interval '30 minutes',v_start+interval '90 minutes','pending'),'23P01');
  UPDATE public.bookings SET status='cancelled' WHERE id='d1000000-0000-4000-8000-000000000001';
  INSERT INTO public.bookings (customer_id,service_id,staff_id,start_at,end_at,status,price)
  VALUES ('c1000000-0000-4000-8000-000000000001',c.service_id,c.therapist_id,v_start,v_start+interval '1 hour','confirmed',2400);
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM public.get_available_slots(c.service_id,c.therapist_id,v_day)
    WHERE slot_start=v_start),'booked slot absent');
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM public.get_available_slots(c.service_id,c.therapist_id,v_day)
    WHERE slot_start=v_start+interval '1 hour'),'15-minute buffer blocks next start');
  PERFORM pg_temp.assert_that((SELECT count(*)=1 FROM public.get_available_slots(c.service_id,c.therapist_id,v_day)
    WHERE slot_start=v_start+interval '90 minutes'),'slot after buffer available');

  -- 2. Anonymous clients cannot read any private table or execute server RPCs.
  PERFORM set_config('role','anon',true);
  PERFORM pg_temp.login(NULL,'anon');
  FOREACH t IN ARRAY ARRAY['bookings','customers','reviews','review_tokens','dosha_quiz_results','ai_generations','rate_limits','media','profiles','blocked_dates'] LOOP
    PERFORM pg_temp.expect_error('SELECT * FROM public.'||quote_ident(t),'42501');
  END LOOP;
  PERFORM pg_temp.expect_error(format('SELECT public.create_booking(%L,%L,%L,%L,%L,%L,%L)',
    c.service_id,c.therapist_id,v_start,'Test Guest','9000000001',NULL,NULL),'42501');
  PERFORM pg_temp.expect_error('SELECT public.check_rate_limit(''test'',2,60)','42501');
  PERFORM pg_temp.expect_error('SELECT setup_step FROM public.site_settings','42501');
  PERFORM pg_temp.assert_that(jsonb_typeof(public.get_public_site()->'settings')='null','unpublished site hides settings');
  PERFORM pg_temp.assert_that(jsonb_array_length(public.get_public_site()->'services')=0,'unpublished site hides services');
  PERFORM pg_temp.assert_that((SELECT count(*)=12 FROM public.services),'explicit active-service SELECT policy remains available');
  PERFORM set_config('role','postgres',true);

  -- 3. Staff can read operations and update status, never price/time/role.
  PERFORM pg_temp.login(v_staff);
  PERFORM set_config('role','authenticated',true);
  PERFORM pg_temp.assert_that((SELECT count(*)>0 FROM public.bookings),'staff reads bookings');
  PERFORM pg_temp.assert_that((SELECT count(*)>0 FROM public.customers),'staff reads customers');
  UPDATE public.bookings SET status='no_show' WHERE id='d1000000-0000-4000-8000-000000000001';
  PERFORM pg_temp.expect_error(format('UPDATE public.profiles SET role=''owner'' WHERE id=%L',v_staff),'42501');
  PERFORM pg_temp.expect_error(format('UPDATE public.bookings SET price=1 WHERE id=%L','d1000000-0000-4000-8000-000000000001'),'42501');
  PERFORM pg_temp.expect_error(format('UPDATE public.bookings SET start_at=%L WHERE id=%L',v_start+interval '30 minutes','d1000000-0000-4000-8000-000000000001'),'42501');
  PERFORM pg_temp.expect_error('INSERT INTO public.customers(name,phone) VALUES (''Forbidden Guest'',''9000000002'')','42501');
  DELETE FROM public.services;
  PERFORM pg_temp.assert_that((SELECT count(*)=12 FROM public.services),'staff DELETE affects no catalogue rows');
  UPDATE public.profiles SET full_name='Renamed Staff' WHERE id=v_staff;
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM public.reviews),'staff cannot read private reviews');
  -- Owner can edit the catalogue and preview the unpublished site.
  PERFORM pg_temp.login(v_owner);
  UPDATE public.services SET short_desc=short_desc WHERE id=c.service_id;
  PERFORM pg_temp.assert_that((public.get_public_site()->'settings') IS NOT NULL,'owner can preview draft');
  UPDATE public.site_settings SET published=true;
  PERFORM pg_temp.assert_that((SELECT updated_at > created_at FROM public.site_settings LIMIT 1),'updated_at trigger fires');

  -- 4. Booking validation and server-only execution.
  PERFORM set_config('role','service_role',true);
  PERFORM pg_temp.login(NULL,'service_role');
  r := public.create_booking(c.service_id,c.therapist_id,now()-interval '1 hour','Test Guest','9000000001',NULL,NULL);
  PERFORM pg_temp.assert_that(r->>'error_code'='PAST_TIME','past time rejected');
  r := public.create_booking(c.service_id,c.therapist_id,v_start,'Test Guest','12345',NULL,NULL);
  PERFORM pg_temp.assert_that(r->>'error_code'='INVALID_INPUT','invalid phone rejected');
  r := public.create_booking(c.service_id,c.therapist_id,(v_day+6+time '10:00') AT TIME ZONE 'Asia/Kolkata','Test Guest','9000000001',NULL,NULL);
  PERFORM pg_temp.assert_that(r->>'error_code'='CLOSED','Sunday closure enforced');
  PERFORM set_config('role','postgres',true);
  INSERT INTO public.blocked_dates(date,reason) VALUES (v_day+1,'Test closure');
  PERFORM set_config('role','service_role',true);
  r := public.create_booking(c.service_id,c.therapist_id,(v_day+1+time '10:00') AT TIME ZONE 'Asia/Kolkata','Test Guest','9000000001',NULL,NULL);
  PERFORM pg_temp.assert_that(r->>'error_code'='CLOSED','blocked date enforced');
  r := public.create_booking(c.service_id,c.therapist_id,v_start,'Test Guest','+91 90000 00001',NULL,NULL);
  PERFORM pg_temp.assert_that(r->>'error_code'='SLOT_TAKEN','RPC rejects taken slot');
  r := public.create_booking(c.service_id,NULL,v_start,'Test Guest','09000000001','Guest@Example.com','  Quiet room  ');
  PERFORM pg_temp.assert_that((r->>'ok')::boolean,'auto-assignment chooses another eligible staff');
  PERFORM pg_temp.assert_that((r->>'staff_id') IS NULL,'success contract has no extra staff_id key');
  v_id := (r->>'booking_id')::uuid;
  PERFORM pg_temp.assert_that((SELECT price=2400 AND notes='Quiet room' FROM public.bookings WHERE id=v_id),'server price snapshot and trimmed notes');
  PERFORM pg_temp.assert_that((SELECT email::text='Guest@Example.com' FROM public.customers WHERE phone='9000000001'),'phone prefixes normalized and citext retained');
  r := public.create_booking(c.service_id,c.therapist_id,v_start+interval '1 hour','Test Guest','9000000001',NULL,NULL);
  PERFORM pg_temp.assert_that(r->>'error_code'='SLOT_TAKEN','RPC enforces treatment buffer');
  r := public.create_booking(c.service_id,c.therapist_id,v_start+interval '15 minutes','Test Guest','9000000001',NULL,NULL);
  PERFORM pg_temp.assert_that(r->>'error_code'='SLOT_TAKEN','off-grid start rejected');

  -- 5. Availability respects time, duration, eligibility, closure and blocks.
  PERFORM set_config('role','anon',true);
  PERFORM pg_temp.assert_that(NOT EXISTS (SELECT 1 FROM public.get_available_slots(c.service_id,NULL,v_day)
    WHERE slot_start < now()+interval '2 hours'),'no slots inside two-hour lead time');
  PERFORM set_config('role','postgres',true);
  PERFORM pg_temp.assert_that(NOT EXISTS (SELECT 1 FROM public.get_available_slots(c.service_id,NULL,v_day) a
    JOIN public.bookings b ON b.staff_id=a.staff_id AND b.status IN ('pending','confirmed')
    WHERE tstzrange(a.slot_start,a.slot_end) && tstzrange(b.start_at,b.end_at)),'no overlapping available slots');
  PERFORM pg_temp.assert_that(NOT EXISTS (SELECT 1 FROM public.get_available_slots(c.service_id,c.therapist_id,v_day)
    WHERE slot_end-slot_start <> interval '1 hour'),'slot duration equals service duration');
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM public.get_available_slots(c.service_id,c.therapist_id,v_day+1)),'blocked day has no slots');
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM public.get_available_slots(c.service_id,c.therapist_id,v_day+6)),'closed day has no slots');
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM public.get_available_slots(c.service_id,'a1000000-0000-4000-8000-000000000004',v_day)),'ineligible staff has no slots');

  -- 6. Review tokens are single-use, expiring and tied to completed visits.
  PERFORM set_config('role','service_role',true);
  INSERT INTO public.bookings (id,customer_id,service_id,staff_id,start_at,end_at,status,price)
  VALUES ('d1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',c.service_id,c.therapist_id,
    now()-interval '3 days',now()-interval '3 days'+interval '1 hour','completed',2400),
    ('d1000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000001',c.service_id,c.therapist_id,
    now()-interval '2 days',now()-interval '2 days'+interval '1 hour','completed',2400);
  v_token := public.create_review_token('d1000000-0000-4000-8000-000000000002');
  PERFORM pg_temp.assert_that(length(v_token)>=32 AND public.create_review_token('d1000000-0000-4000-8000-000000000002')=v_token,'secure retry-stable review token');
  PERFORM set_config('role','anon',true);
  PERFORM pg_temp.login(NULL,'anon');
  r := public.submit_review(v_token,5,'A peaceful test visit.');
  PERFORM pg_temp.assert_that((r->>'ok')::boolean,'valid review accepted');
  PERFORM pg_temp.assert_that((public.submit_review(v_token,5,'Again'))->>'error_code'='ALREADY_USED','used token rejected');
  PERFORM pg_temp.assert_that((public.submit_review('not-a-real-token',5,'No')) ->>'error_code'='INVALID_TOKEN','invalid token rejected');
  PERFORM set_config('role','postgres',true);
  PERFORM pg_temp.assert_that((SELECT NOT approved FROM public.reviews WHERE booking_id='d1000000-0000-4000-8000-000000000002'),'new reviews require approval');
  v_token := public.create_review_token('d1000000-0000-4000-8000-000000000003');
  UPDATE public.review_tokens SET expires_at=now()-interval '1 second' WHERE token=v_token;
  PERFORM set_config('role','anon',true);
  PERFORM pg_temp.assert_that((public.submit_review(v_token,5,'Too late'))->>'error_code'='EXPIRED','expired token rejected');
  r := public.save_quiz_result(2,2,1,'Vata-Pitta');
  PERFORM pg_temp.assert_that((r->>'ok')::boolean,'valid quiz accepted');
  PERFORM pg_temp.assert_that((public.save_quiz_result(5,5,5,'Invalid'))->>'error_code'='INVALID_INPUT','invalid quiz rejected');
  PERFORM set_config('role','postgres',true);
  PERFORM pg_temp.assert_that((SELECT customer_id IS NULL FROM public.dosha_quiz_results WHERE id=(r->>'result_id')::uuid),'quiz is anonymous');

  -- 7. Singleton and seed/public projection contracts.
  PERFORM pg_temp.expect_error('INSERT INTO public.site_settings(business_name) VALUES (''Second site'')','23505');
  PERFORM pg_temp.assert_that((SELECT count(*)=12 FROM public.services),'12 services seeded');
  PERFORM pg_temp.assert_that((SELECT count(*)=12 FROM public.sections),'12 sections seeded');
  PERFORM pg_temp.assert_that((SELECT count(*)=4 FROM public.staff),'four staff seeded');
  PERFORM pg_temp.assert_that((SELECT count(*)=3 FROM public.packages),'three packages seeded');
  PERFORM pg_temp.assert_that((SELECT count(*)=1 FROM public.packages WHERE is_featured),'one featured package');
  PERFORM pg_temp.assert_that((SELECT count(*)=6 FROM public.faqs),'six FAQs seeded');
  PERFORM pg_temp.assert_that((SELECT count(*)=4 FROM public.testimonials WHERE approved),'four approved placeholders');
  PERFORM pg_temp.assert_that((SELECT count(*)=3 FROM public.blog_posts WHERE NOT published),'three draft articles');
  PERFORM set_config('role','anon',true);
  r := public.get_public_site();
  PERFORM pg_temp.assert_that(jsonb_array_length(r->'services')=12,'published RPC services');
  PERFORM pg_temp.assert_that(jsonb_array_length(r->'blog_posts')=0,'draft articles excluded');
  PERFORM pg_temp.assert_that(NOT (r->'settings') ? 'setup_step','private settings excluded');
  PERFORM pg_temp.assert_that(NOT (r->'settings') ? 'singleton','singleton control excluded');
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM public.blog_posts),'draft articles hidden by RLS');
  -- Additional RPC, Storage, cron and privilege checks.
  PERFORM set_config('role','service_role',true);
  PERFORM pg_temp.assert_that(public.check_rate_limit('db-test',2,60),'rate limit first request');
  PERFORM pg_temp.assert_that(public.check_rate_limit('db-test',2,60),'rate limit second request');
  PERFORM pg_temp.assert_that(NOT public.check_rate_limit('db-test',2,60),'rate limit third request');
  PERFORM set_config('role','postgres',true);
  PERFORM pg_temp.assert_that((SELECT count(*)=3 FROM cron.job WHERE jobname IN ('review-requests','keep-alive','cleanup')),'three cron jobs registered');
  PERFORM pg_temp.assert_that((SELECT command='SELECT 1' FROM cron.job WHERE jobname='keep-alive'),'daily keep-alive');
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM cron.job WHERE command ILIKE '%auto%complete%'),'no auto-complete job');
  PERFORM pg_temp.assert_that((SELECT public AND file_size_limit=5242880 AND allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/avif'] FROM storage.buckets WHERE id='site-images'),'image bucket restrictions');
  PERFORM pg_temp.assert_that((SELECT NOT public FROM storage.buckets WHERE id='documents'),'documents bucket private');
  -- Asynchronous dispatch: queued/failed requests are NOT acknowledgements.
  UPDATE public.bookings SET review_request_id=91000001
  WHERE id='d1000000-0000-4000-8000-000000000002';
  PERFORM pg_temp.assert_that(public.dispatch_review_requests()=0,'missing Vault configuration does not send');
  PERFORM pg_temp.assert_that((SELECT review_requested_at IS NULL FROM public.bookings WHERE id='d1000000-0000-4000-8000-000000000002'),'queued request not marked sent');
  INSERT INTO net._http_response(id,status_code,timed_out) VALUES (91000001,500,false);
  PERFORM public.dispatch_review_requests();
  PERFORM pg_temp.assert_that((SELECT review_requested_at IS NULL AND review_request_id IS NULL FROM public.bookings WHERE id='d1000000-0000-4000-8000-000000000002'),'HTTP failure remains retryable');
  UPDATE public.bookings SET review_request_id=91000002 WHERE id='d1000000-0000-4000-8000-000000000002';
  INSERT INTO net._http_response(id,status_code,timed_out) VALUES (91000002,200,false);
  PERFORM public.dispatch_review_requests();
  PERFORM pg_temp.assert_that((SELECT review_requested_at IS NOT NULL FROM public.bookings WHERE id='d1000000-0000-4000-8000-000000000002'),'HTTP success acknowledged');
  PERFORM set_config('role','anon',true);
  PERFORM pg_temp.expect_error('INSERT INTO storage.objects(bucket_id,name) VALUES (''site-images'',''anon.jpg'')','42501');
  PERFORM pg_temp.login(v_staff);
  PERFORM set_config('role','authenticated',true);
  PERFORM pg_temp.expect_error(format('INSERT INTO storage.objects(bucket_id,name) VALUES (''site-images'',''staff.jpg'')'),'42501');
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM storage.objects WHERE bucket_id='documents'),'staff cannot read documents');
  PERFORM pg_temp.login(v_owner);
  INSERT INTO storage.objects(bucket_id,name,owner) VALUES ('site-images','owner-test.jpg',v_owner);
  INSERT INTO storage.objects(bucket_id,name,owner) VALUES ('documents','owner-test.txt',v_owner);
  PERFORM set_config('role','anon',true);
  PERFORM pg_temp.assert_that((SELECT count(*)=1 FROM storage.objects WHERE bucket_id='site-images'),'public image metadata readable');
  PERFORM pg_temp.assert_that((SELECT count(*)=0 FROM storage.objects WHERE bucket_id='documents'),'private document metadata hidden');
  PERFORM set_config('role','postgres',true);
  PERFORM pg_temp.assert_that((SELECT count(*)=22 FROM pg_class cls JOIN pg_namespace n ON n.oid=cls.relnamespace WHERE n.nspname='public' AND cls.relkind='r' AND cls.relrowsecurity),'all 22 app tables enable RLS');
  RAISE NOTICE 'PASS: schema, seed, overlap/buffer, RLS, roles, booking validation, availability, reviews, quiz, singleton, RPC grants, rate limits, Storage and cron';
END $$;
ROLLBACK;
