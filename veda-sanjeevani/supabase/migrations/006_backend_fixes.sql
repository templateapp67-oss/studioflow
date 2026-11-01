-- Step 2 additive migration. Do not edit the Step 1 migrations.
-- A durable, atomic claim prevents overlapping cron/HTTP retries from sending twice.
BEGIN;
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS backend_jobs jsonb NOT NULL DEFAULT '{}'
  CHECK (jsonb_typeof(backend_jobs) = 'object');
COMMENT ON COLUMN public.bookings.backend_jobs IS
  'Server-only notification/review delivery leases and outcomes. No provider credentials.';

CREATE OR REPLACE FUNCTION public.claim_backend_job(p_booking_id uuid, p_kind text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_booking public.bookings;
  v_job jsonb;
  v_token uuid := gen_random_uuid();
  v_lease timestamptz := now() + interval '10 minutes';
BEGIN
  IF p_kind NOT IN ('notification', 'review') OR p_booking_id IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_input');
  END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF p_kind = 'review' AND v_booking.status <> 'completed' THEN
    RETURN jsonb_build_object('status', 'not_completed');
  END IF;
  v_job := coalesce(v_booking.backend_jobs -> p_kind, '{}'::jsonb);
  IF v_job ->> 'status' IN ('sent', 'skipped') THEN
    RETURN jsonb_build_object('status', 'already_processed');
  END IF;
  IF (v_job ->> 'lease_until')::timestamptz > now() THEN
    RETURN jsonb_build_object('status', 'in_progress');
  END IF;
  IF v_job ->> 'status' = 'failed' AND (v_job ->> 'completed_at')::timestamptz > now() - interval '15 minutes' THEN
    RETURN jsonb_build_object('status', 'retry_later');
  END IF;
  v_job := jsonb_build_object(
    'status', 'claimed', 'token', v_token, 'lease_until', v_lease,
    'attempts', coalesce((v_job ->> 'attempts')::int, 0) + 1,
    'claimed_at', now()
  );
  UPDATE public.bookings SET backend_jobs = jsonb_set(backend_jobs, ARRAY[p_kind], v_job)
  WHERE id = p_booking_id;
  RETURN jsonb_build_object('status', 'claimed', 'token', v_token, 'lease_until', v_lease);
END $$;

CREATE OR REPLACE FUNCTION public.complete_backend_job(
  p_booking_id uuid, p_kind text, p_token uuid, p_status text, p_error_code text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_job jsonb; v_count integer;
BEGIN
  IF p_kind NOT IN ('notification', 'review') OR p_status NOT IN ('sent', 'skipped', 'failed')
     OR p_token IS NULL OR (p_error_code IS NOT NULL AND p_error_code !~ '^[A-Z][A-Z0-9_]{0,63}$') THEN
    RETURN false;
  END IF;
  SELECT backend_jobs -> p_kind INTO v_job FROM public.bookings
  WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR v_job ->> 'token' <> p_token::text OR v_job ->> 'status' <> 'claimed' THEN
    RETURN false;
  END IF;
  v_job := v_job || jsonb_build_object('status', p_status, 'completed_at', now(), 'error_code', p_error_code);
  v_job := v_job - 'token' - 'lease_until';
  UPDATE public.bookings SET
    backend_jobs = jsonb_set(backend_jobs, ARRAY[p_kind], v_job),
    notification_sent_at = CASE WHEN p_kind = 'notification' AND p_status = 'sent' THEN now() ELSE notification_sent_at END,
    review_requested_at = CASE WHEN p_kind = 'review' AND p_status IN ('sent', 'skipped') THEN now() ELSE review_requested_at END
  WHERE id = p_booking_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END $$;

REVOKE ALL ON FUNCTION public.claim_backend_job(uuid,text),
  public.complete_backend_job(uuid,text,uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_backend_job(uuid,text),
  public.complete_backend_job(uuid,text,uuid,text,text) TO service_role;
COMMIT;
