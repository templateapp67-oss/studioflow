-- Step 1: scheduled maintenance. No project URL or secret is seeded.
BEGIN;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
REVOKE ALL ON SCHEMA vault FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA vault FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA vault FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA cron, net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA cron, net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron, net FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_review_requests() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_url text; v_secret text; v_ids uuid[]; v_request bigint; v_sent integer := 0;
BEGIN
  -- Serialize dispatch/reconciliation; row locks also protect manual callers.
  IF NOT pg_try_advisory_xact_lock(hashtextextended('veda:review-dispatch',0)) THEN RETURN 0; END IF;

  -- pg_net is asynchronous: a request id means queued, NOT delivered.
  -- Reconcile the previous batch before considering another request.
  WITH responses AS (
    SELECT b.id, r.status_code, r.timed_out, r.error_msg, r.created
    FROM public.bookings b JOIN net._http_response r ON r.id = b.review_request_id
    WHERE b.review_requested_at IS NULL AND b.review_request_id IS NOT NULL
  ), acknowledged AS (
    UPDATE public.bookings b SET review_requested_at = r.created
    FROM responses r WHERE b.id = r.id AND r.status_code BETWEEN 200 AND 299
      AND NOT r.timed_out AND r.error_msg IS NULL
    RETURNING b.id
  )
  UPDATE public.bookings b SET review_request_id = NULL
  FROM responses r WHERE b.id = r.id
    AND (r.status_code IS NULL OR r.status_code NOT BETWEEN 200 AND 299 OR r.timed_out OR r.error_msg IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM acknowledged a WHERE a.id = b.id);

  -- A lost worker/response must not strand a booking forever. The Step 2
  -- endpoint MUST deduplicate by booking_id before sending any message.
  UPDATE public.bookings SET review_request_id = NULL
  WHERE review_requested_at IS NULL AND review_request_id IS NOT NULL
    AND updated_at < now() - interval '15 minutes'
    AND NOT EXISTS (SELECT 1 FROM net.http_request_queue q WHERE q.id = review_request_id);

  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;
  IF v_url IS NULL OR v_secret IS NULL OR length(v_secret) < 32 THEN
    RAISE WARNING 'review-requests waiting for Vault project_url and cron_secret (32+ characters)';
    RETURN 0;
  END IF;
  v_url := rtrim(btrim(v_url), '/');
  IF v_url !~ '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'Vault project_url must be an HTTPS project URL' USING ERRCODE = '22023';
  END IF;
  SELECT array_agg(id) INTO v_ids FROM (
    SELECT id FROM public.bookings
    WHERE status = 'completed' AND end_at < now() - interval '24 hours'
      AND review_requested_at IS NULL AND review_request_id IS NULL
    ORDER BY end_at LIMIT 100 FOR UPDATE SKIP LOCKED
  ) due;
  IF v_ids IS NULL THEN RETURN 0; END IF;
  v_request := net.http_post(
    url := v_url || '/functions/v1/request-review',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',v_secret),
    body := jsonb_build_object('booking_ids',to_jsonb(v_ids)),
    timeout_milliseconds := 10000
  );
  IF v_request IS NOT NULL THEN
    UPDATE public.bookings SET review_request_id = v_request WHERE id = ANY(v_ids);
    GET DIAGNOSTICS v_sent = ROW_COUNT;
  END IF;
  RETURN v_sent;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_review_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_review_requests() TO service_role;

-- cron.schedule permits duplicate names; remove only our own named jobs first.
DO $$ DECLARE j record; BEGIN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname IN ('review-requests','keep-alive','cleanup') LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;
SELECT cron.schedule('review-requests','0 * * * *','SELECT public.dispatch_review_requests()');
SELECT cron.schedule('keep-alive','17 3 * * *','SELECT 1');
SELECT cron.schedule('cleanup','30 * * * *',
  'DELETE FROM public.rate_limits WHERE window_start < now() - interval ''1 day''');
-- No auto-complete job: the owner marks completed bookings manually.
COMMIT;
