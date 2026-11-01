-- Additive Step 2 tests. Run after migration 006; all fixtures roll back.
BEGIN;
SET LOCAL search_path = public, extensions, pg_temp;
CREATE TEMP TABLE backend_context (booking_id uuid, customer_id uuid);
INSERT INTO public.customers(name,phone,email) VALUES ('Backend Test','9000000099','backend-test@example.com');
INSERT INTO public.bookings(customer_id,service_id,staff_id,start_at,end_at,price,status)
SELECT c.id,(SELECT id FROM public.services ORDER BY sort_order LIMIT 1),
  (SELECT id FROM public.staff ORDER BY sort_order LIMIT 1),
  now()-interval '3 days',now()-interval '3 days'+interval '1 hour',100,'completed'
FROM public.customers c WHERE phone='9000000099';
INSERT INTO backend_context SELECT id,customer_id FROM public.bookings
WHERE customer_id=(SELECT id FROM public.customers WHERE phone='9000000099');
DO $$
DECLARE c backend_context; first_job jsonb; second_job jsonb; v_token uuid;
BEGIN
  SELECT * INTO c FROM backend_context;
  IF c.booking_id IS NULL THEN RAISE EXCEPTION 'Create a completed booking fixture first'; END IF;
  SELECT * INTO first_job FROM public.claim_backend_job(c.booking_id, 'review');
  SELECT * INTO second_job FROM public.claim_backend_job(c.booking_id, 'review');
  IF first_job->>'status' <> 'claimed' OR second_job->>'status' <> 'in_progress' THEN
    RAISE EXCEPTION 'Overlapping review claims must be deduplicated';
  END IF;
  v_token := (first_job->>'token')::uuid;
  IF public.complete_backend_job(c.booking_id, 'review', gen_random_uuid(), 'sent') THEN
    RAISE EXCEPTION 'Wrong lease token completed a job';
  END IF;
  IF NOT public.complete_backend_job(c.booking_id, 'review', v_token, 'sent') THEN
    RAISE EXCEPTION 'Valid lease token did not complete job';
  END IF;
  IF (SELECT review_requested_at IS NULL FROM public.bookings WHERE id=c.booking_id) THEN
    RAISE EXCEPTION 'Successful review delivery was not recorded';
  END IF;
  IF (SELECT backend_jobs->'review' ? 'token' FROM public.bookings WHERE id=c.booking_id) THEN
    RAISE EXCEPTION 'Completed job retained a lease token';
  END IF;
  IF (SELECT (public.claim_backend_job(c.booking_id,'review'))->>'status') <> 'already_processed' THEN
    RAISE EXCEPTION 'Completed review was claimed again';
  END IF;
  IF public.complete_backend_job(c.booking_id, 'review', v_token, 'failed') THEN
    RAISE EXCEPTION 'Stale completion changed a terminal job';
  END IF;
  -- Independent notification lane, failure cooldown, expiry and retry.
  SELECT * INTO first_job FROM public.claim_backend_job(c.booking_id, 'notification');
  v_token := (first_job->>'token')::uuid;
  IF (SELECT (public.claim_backend_job(c.booking_id,'notification'))->>'status') <> 'in_progress' THEN
    RAISE EXCEPTION 'Overlapping notification claims must be deduplicated';
  END IF;
  PERFORM public.complete_backend_job(c.booking_id,'notification',v_token,'failed','EMAIL_UPSTREAM');
  IF (SELECT (public.claim_backend_job(c.booking_id,'notification'))->>'status') <> 'retry_later' THEN
    RAISE EXCEPTION 'Failed notification retried before cooldown';
  END IF;
  UPDATE public.bookings SET backend_jobs = jsonb_set(backend_jobs,
    ARRAY['notification','completed_at'], to_jsonb(now()-interval '16 minutes')) WHERE id=c.booking_id;
  SELECT * INTO first_job FROM public.claim_backend_job(c.booking_id,'notification');
  IF first_job->>'status' <> 'claimed' THEN RAISE EXCEPTION 'Cooldown did not expire'; END IF;
  UPDATE public.bookings SET backend_jobs = jsonb_set(backend_jobs,
    ARRAY['notification','lease_until'], to_jsonb(now()-interval '1 second')) WHERE id=c.booking_id;
  SELECT * INTO second_job FROM public.claim_backend_job(c.booking_id,'notification');
  IF second_job->>'status' <> 'claimed' OR second_job->>'token' = first_job->>'token' THEN
    RAISE EXCEPTION 'Expired lease was not safely replaced';
  END IF;
  IF public.complete_backend_job(c.booking_id,'notification',(first_job->>'token')::uuid,'sent') THEN
    RAISE EXCEPTION 'Old worker completed a replacement lease';
  END IF;
  PERFORM public.complete_backend_job(c.booking_id,'notification',(second_job->>'token')::uuid,'sent');
  IF (SELECT notification_sent_at IS NULL FROM public.bookings WHERE id=c.booking_id) THEN
    RAISE EXCEPTION 'Notification timestamp was not recorded';
  END IF;
  IF (SELECT (public.claim_backend_job(c.booking_id,'invalid'))->>'status') <> 'invalid_input' THEN
    RAISE EXCEPTION 'Unknown job kind accepted';
  END IF;
  UPDATE public.bookings SET status='pending' WHERE id=c.booking_id;
  IF (SELECT (public.claim_backend_job(c.booking_id,'review'))->>'status') <> 'not_completed' THEN
    RAISE EXCEPTION 'Incomplete booking accepted for review';
  END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF has_function_privilege('anon','public.claim_backend_job(uuid,text)','EXECUTE')
     OR has_function_privilege('anon','public.complete_backend_job(uuid,text,uuid,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous job RPC access';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF has_function_privilege('authenticated','public.claim_backend_job(uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'User job RPC access';
  END IF;
END $$;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  IF NOT has_function_privilege('service_role','public.claim_backend_job(uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Service job RPC access missing';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'PASS: atomic notification/review claims, duplicate suppression, lease expiry, cooldown, stale-token rejection, timestamps and RPC grants'
