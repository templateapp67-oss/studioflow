# Veda Sanjeevani — Step 1 complete files

All paths are relative to `veda-sanjeevani/`. Every project source/config file is included in full.
See README_DB.md for verification scope and deployment instructions.

## supabase/migrations/001_extensions.sql

```sql
-- Step 1: extensions. Run first, in the designated spa database.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
-- These extensions own their schemas (pg_catalog/cron and net).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
COMMIT;
```

## supabase/migrations/002_tables.sql

```sql
-- Step 1: relational schema. All timestamps are stored as timestamptz.
BEGIN;
DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','completed','cancelled','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('owner','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL CHECK (length(btrim(business_name)) BETWEEN 1 AND 200),
  tagline text NOT NULL DEFAULT '', logo_url text,
  phone text NOT NULL DEFAULT '', whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '', map_url text,
  timings jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(timings) = 'object'),
  theme_preset text NOT NULL DEFAULT 'neem',
  colors jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(colors) = 'object'),
  fonts jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(fonts) = 'object'),
  seo jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(seo) = 'object'),
  social jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(social) = 'object'),
  section_order jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(section_order) = 'array'),
  published boolean NOT NULL DEFAULT false,
  setup_step int NOT NULL DEFAULT 1 CHECK (setup_step BETWEEN 1 AND 5),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE CHECK (key IN ('hero','about','quiz','services','team','packages','gallery','testimonials','blog','booking','faq','contact')),
  title text NOT NULL DEFAULT '', subtitle text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '',
  image_url text, visible boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  category text NOT NULL CHECK (category IN ('relax','detox','pain_relief','beauty','mind')),
  short_desc text NOT NULL DEFAULT '', long_desc text NOT NULL DEFAULT '',
  benefits text[] NOT NULL DEFAULT '{}',
  duration_min int NOT NULL CHECK (duration_min > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url text, image_alt text NOT NULL DEFAULT '', dosha_tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) > 0), description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL CHECK (price >= 0), includes text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false, image_url text, image_alt text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) > 0), role text NOT NULL DEFAULT '',
  qualification text NOT NULL DEFAULT '', specialty text[] NOT NULL DEFAULT '{}',
  bio text NOT NULL DEFAULT '', photo_url text, photo_alt text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
-- Junction tables retain a unique id; their specified natural composite keys
-- are the primary keys. This also prevents duplicate eligibility/limit rows.
CREATE TABLE IF NOT EXISTS public.staff_services (
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.staff_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  image_url text NOT NULL, caption text NOT NULL DEFAULT '', sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), image_url text NOT NULL,
  image_alt text NOT NULL DEFAULT '', caption text NOT NULL DEFAULT '', category text NOT NULL DEFAULT 'general',
  sort_order int NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5), text text NOT NULL,
  photo_url text, approved boolean NOT NULL DEFAULT false, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question text NOT NULL, answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', cover_url text, cover_alt text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false, published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  phone text NOT NULL UNIQUE CHECK (phone ~ '^[6-9][0-9]{9}$'),
  email extensions.citext CHECK (email IS NULL OR (length(email::text) <= 254 AND email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  dosha text, notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  -- Immutable-by-staff price snapshot; the RPC derives it from services.
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 500),
  review_requested_at timestamptz, notification_sent_at timestamptz,
  -- Durable pg_net correlation: requested_at is set only after HTTP 2xx.
  review_request_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  EXCLUDE USING gist (staff_id WITH =, tstzrange(start_at, end_at) WITH &&)
    WHERE (status IN ('pending','confirmed'))
);
CREATE TABLE IF NOT EXISTS public.review_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (length(token) >= 32),
  expires_at timestamptz NOT NULL, used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (length(comment) BETWEEN 1 AND 1000),
  ai_summary text, approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.dosha_quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  vata int NOT NULL CHECK (vata BETWEEN 0 AND 5),
  pitta int NOT NULL CHECK (pitta BETWEEN 0 AND 5),
  kapha int NOT NULL CHECK (kapha BETWEEN 0 AND 5), result text NOT NULL,
  CHECK (vata + pitta + kapha = 5),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL,
  prompt text NOT NULL DEFAULT '', output text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), original_url text NOT NULL,
  url_400 text, url_800 text, url_1600 text, alt_text text NOT NULL DEFAULT '',
  bytes int CHECK (bytes >= 0), uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'staff', full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday int NOT NULL UNIQUE CHECK (weekday BETWEEN 0 AND 6),
  open_time time NOT NULL, close_time time NOT NULL, is_closed boolean NOT NULL DEFAULT false,
  CHECK (is_closed OR close_time > open_time),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), date date NOT NULL UNIQUE, reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), key text NOT NULL,
  window_start timestamptz NOT NULL, count int NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (key, window_start),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS review_request_id bigint;
CREATE INDEX IF NOT EXISTS bookings_start_status_idx ON public.bookings(start_at, status);
CREATE INDEX IF NOT EXISTS bookings_staff_start_idx ON public.bookings(staff_id, start_at);
CREATE INDEX IF NOT EXISTS services_slug_idx ON public.services(slug);
CREATE INDEX IF NOT EXISTS services_active_sort_idx ON public.services(active, sort_order);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS staff_active_idx ON public.staff(active);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers(phone);
CREATE INDEX IF NOT EXISTS staff_services_service_idx ON public.staff_services(service_id);
CREATE INDEX IF NOT EXISTS staff_gallery_staff_idx ON public.staff_gallery(staff_id, sort_order);
CREATE INDEX IF NOT EXISTS bookings_review_due_idx ON public.bookings(end_at)
  WHERE status = 'completed' AND review_requested_at IS NULL;
-- Close writes immediately, even before the policy migration runs.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['site_settings','sections','services','packages','staff','staff_services','staff_gallery','gallery','testimonials','faqs','blog_posts','customers','bookings','review_tokens','reviews','dosha_quiz_results','ai_generations','media','profiles','working_hours','blocked_dates','rate_limits'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
  END LOOP;
END $$;
COMMIT;
```

## supabase/migrations/003_functions.sql

```sql
-- Step 1: triggers and the seven public RPC contracts.
BEGIN;
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['site_settings','sections','services','packages','staff','staff_services','staff_gallery','gallery','testimonials','faqs','blog_posts','customers','bookings','review_tokens','reviews','dosha_quiz_results','ai_generations','media','profiles','working_hours','blocked_dates','rate_limits'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner');
$$;
CREATE OR REPLACE FUNCTION public.is_staff_or_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','staff'));
$$;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Serialize first-owner selection across simultaneous Auth signups.
  PERFORM pg_advisory_xact_lock(hashtextextended('veda:first-owner', 0));
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, (CASE WHEN EXISTS (SELECT 1 FROM public.profiles) THEN 'staff' ELSE 'owner' END)::public.user_role,
          left(coalesce(NEW.raw_user_meta_data->>'full_name', ''), 200))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.prevent_role_escalation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_owner() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only an owner may change roles' USING ERRCODE = '42501';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Staff may change only their full name' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
CREATE TRIGGER prevent_role_escalation BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

CREATE OR REPLACE FUNCTION public.protect_booking_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Trusted server/definer maintenance may record notification timestamps.
  IF public.is_owner() OR (SELECT auth.role()) = 'service_role'
     OR (current_user = 'postgres' AND session_user = 'postgres'
         AND coalesce((SELECT auth.role()), '') <> 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Staff may change only booking status' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_booking_update ON public.bookings;
CREATE TRIGGER protect_booking_update BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.protect_booking_update();

-- A slot's published end is the treatment end. An additional 15 minutes is
-- reserved after each treatment when checking both new and existing bookings.
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_service_id uuid, p_staff_id uuid, p_date date
) RETURNS TABLE(slot_start timestamptz, slot_end timestamptz, staff_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT gs.start_at, gs.start_at + make_interval(mins => s.duration_min), st.id
  FROM public.services s
  JOIN public.staff_services ss ON ss.service_id = s.id
  JOIN public.staff st ON st.id = ss.staff_id AND st.active
  JOIN public.working_hours w ON w.weekday = extract(dow FROM p_date)::int AND NOT w.is_closed
  CROSS JOIN LATERAL generate_series(
    (p_date + w.open_time) AT TIME ZONE 'Asia/Kolkata',
    (p_date + w.close_time - make_interval(mins => s.duration_min)) AT TIME ZONE 'Asia/Kolkata',
    interval '30 minutes'
  ) AS gs(start_at)
  WHERE s.id = p_service_id AND s.active
    AND (p_staff_id IS NULL OR st.id = p_staff_id)
    AND NOT EXISTS (SELECT 1 FROM public.blocked_dates d WHERE d.date = p_date)
    AND gs.start_at >= now() + interval '2 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.staff_id = st.id AND b.status IN ('pending','confirmed')
        AND tstzrange(b.start_at, b.end_at + interval '15 minutes', '[)')
         && tstzrange(gs.start_at, gs.start_at + make_interval(mins => s.duration_min + 15), '[)')
    )
  ORDER BY gs.start_at, st.sort_order, st.id;
$$;

CREATE OR REPLACE FUNCTION public.create_booking(
  p_service_id uuid, p_staff_id uuid, p_start_at timestamptz,
  p_name text, p_phone text, p_email text, p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  s public.services; st public.staff; c_id uuid; b_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[[:space:]]+', '', 'g');
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_notes text := btrim(coalesce(p_notes, ''));
  v_end timestamptz; v_local timestamp;
BEGIN
  v_phone := regexp_replace(v_phone, '^(\+91|0091|0)', '');
  IF length(v_name) NOT BETWEEN 2 AND 80 OR v_phone !~ '^[6-9][0-9]{9}$'
     OR length(v_notes) > 500 OR p_start_at IS NULL
     OR (v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) THEN
    RETURN jsonb_build_object('ok',false,'error_code','INVALID_INPUT');
  END IF;
  SELECT * INTO s FROM public.services WHERE id = p_service_id AND active;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error_code','SERVICE_NOT_FOUND'); END IF;
  IF p_start_at < now() + interval '2 hours' THEN
    RETURN jsonb_build_object('ok',false,'error_code','PAST_TIME');
  END IF;
  v_end := p_start_at + make_interval(mins => s.duration_min);
  v_local := p_start_at AT TIME ZONE 'Asia/Kolkata';
  IF EXISTS (SELECT 1 FROM public.blocked_dates WHERE date = v_local::date)
     OR NOT EXISTS (
       SELECT 1 FROM public.working_hours w
       WHERE w.weekday = extract(dow FROM v_local)::int AND NOT w.is_closed
         AND v_local::time >= w.open_time
         AND (v_end AT TIME ZONE 'Asia/Kolkata')::date = v_local::date
         AND (v_end AT TIME ZONE 'Asia/Kolkata')::time <= w.close_time
     ) THEN
    RETURN jsonb_build_object('ok',false,'error_code','CLOSED');
  END IF;
  IF p_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff_services ss JOIN public.staff x ON x.id = ss.staff_id
    WHERE ss.service_id = s.id AND ss.staff_id = p_staff_id AND x.active
  ) THEN RETURN jsonb_build_object('ok',false,'error_code','INVALID_INPUT'); END IF;

  IF p_staff_id IS NULL THEN
    -- Lock candidates in a stable order, then recheck availability. The final
    -- guard is the exclusion constraint, including for direct owner inserts.
    FOR st IN SELECT x.* FROM public.staff x JOIN public.staff_services ss ON ss.staff_id = x.id
              WHERE ss.service_id = s.id AND x.active ORDER BY x.sort_order, x.id LOOP
      PERFORM pg_advisory_xact_lock(hashtextextended(st.id::text, 0));
      IF EXISTS (SELECT 1 FROM public.get_available_slots(s.id, st.id, v_local::date) a
                 WHERE a.slot_start = p_start_at AND a.staff_id = st.id) THEN
        EXIT;
      END IF;
      st.id := NULL;
    END LOOP;
    IF st.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error_code','SLOT_TAKEN'); END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended(p_staff_id::text, 0));
    SELECT * INTO st FROM public.staff WHERE id = p_staff_id;
    IF NOT EXISTS (SELECT 1 FROM public.get_available_slots(s.id, st.id, v_local::date) a
                   WHERE a.slot_start = p_start_at AND a.staff_id = st.id) THEN
      RETURN jsonb_build_object('ok',false,'error_code','SLOT_TAKEN');
    END IF;
  END IF;

  INSERT INTO public.customers (name, phone, email) VALUES (v_name, v_phone, v_email::extensions.citext)
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, email = coalesce(EXCLUDED.email, public.customers.email)
  RETURNING id INTO c_id;
  BEGIN
    INSERT INTO public.bookings (customer_id, service_id, staff_id, start_at, end_at, price, notes)
    VALUES (c_id, s.id, st.id, p_start_at, v_end, s.price, v_notes) RETURNING id INTO b_id;
  EXCEPTION WHEN exclusion_violation THEN
    RETURN jsonb_build_object('ok',false,'error_code','SLOT_TAKEN');
  END;
  RETURN jsonb_build_object('ok',true,'booking_id',b_id,'start_at',p_start_at,'end_at',v_end,
                            'service_name',s.name,'staff_name',st.name);
END $$;

CREATE OR REPLACE FUNCTION public.submit_review(p_token text, p_rating int, p_comment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE t public.review_tokens; v_status public.booking_status; r_id uuid;
BEGIN
  SELECT * INTO t FROM public.review_tokens WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error_code','INVALID_TOKEN'); END IF;
  IF t.used_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error_code','ALREADY_USED'); END IF;
  IF t.expires_at <= now() THEN RETURN jsonb_build_object('ok',false,'error_code','EXPIRED'); END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR p_comment IS NULL
     OR length(btrim(p_comment)) NOT BETWEEN 1 AND 1000 THEN
    RETURN jsonb_build_object('ok',false,'error_code','INVALID_INPUT');
  END IF;
  SELECT status INTO v_status FROM public.bookings WHERE id = t.booking_id;
  IF v_status IS DISTINCT FROM 'completed' THEN
    RETURN jsonb_build_object('ok',false,'error_code','INVALID_INPUT');
  END IF;
  INSERT INTO public.reviews (booking_id, rating, comment) VALUES (t.booking_id, p_rating, btrim(p_comment))
  ON CONFLICT (booking_id) DO NOTHING RETURNING id INTO r_id;
  IF r_id IS NULL THEN
    UPDATE public.review_tokens SET used_at = now() WHERE id = t.id;
    RETURN jsonb_build_object('ok',false,'error_code','ALREADY_USED');
  END IF;
  UPDATE public.review_tokens SET used_at = now() WHERE id = t.id;
  RETURN jsonb_build_object('ok',true,'review_id',r_id);
END $$;

CREATE OR REPLACE FUNCTION public.save_quiz_result(p_vata int, p_pitta int, p_kapha int, p_result text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r_id uuid;
BEGIN
  IF p_vata IS NULL OR p_pitta IS NULL OR p_kapha IS NULL
     OR p_vata NOT BETWEEN 0 AND 5 OR p_pitta NOT BETWEEN 0 AND 5 OR p_kapha NOT BETWEEN 0 AND 5
     OR p_vata + p_pitta + p_kapha <> 5 OR length(btrim(coalesce(p_result,''))) NOT BETWEEN 1 AND 80 THEN
    RETURN jsonb_build_object('ok',false,'error_code','INVALID_INPUT');
  END IF;
  INSERT INTO public.dosha_quiz_results (vata,pitta,kapha,result)
  VALUES (p_vata,p_pitta,p_kapha,btrim(p_result)) RETURNING id INTO r_id;
  RETURN jsonb_build_object('ok',true,'result_id',r_id);
END $$;

CREATE OR REPLACE FUNCTION public.create_review_token(p_booking_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_token text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = p_booking_id AND status = 'completed') THEN
    RAISE EXCEPTION 'A completed booking is required' USING ERRCODE = '22023';
  END IF;
  -- Retry-safe: never invalidate an already issued token for this booking.
  INSERT INTO public.review_tokens (booking_id, token, expires_at)
  VALUES (p_booking_id, encode(extensions.gen_random_bytes(32),'hex'), now() + interval '14 days')
  ON CONFLICT (booking_id) DO UPDATE SET booking_id = EXCLUDED.booking_id
  RETURNING token INTO v_token;
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count int; v_bucket timestamptz;
BEGIN
  IF p_key IS NULL OR length(btrim(p_key)) NOT BETWEEN 1 AND 200 OR p_max IS NULL OR p_max <= 0
     OR p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Invalid rate-limit arguments' USING ERRCODE = '22023';
  END IF;
  v_bucket := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  INSERT INTO public.rate_limits (key,window_start,count) VALUES (btrim(p_key),v_bucket,1)
  ON CONFLICT (key,window_start) DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count <= p_max;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_site() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_settings public.site_settings; v_published boolean;
BEGIN
  SELECT * INTO v_settings FROM public.site_settings LIMIT 1;
  v_published := coalesce(v_settings.published,false);
  IF NOT v_published AND NOT public.is_owner() THEN
    RETURN jsonb_build_object('published',false,'settings',null,'sections','[]'::jsonb,
      'services','[]'::jsonb,'packages','[]'::jsonb,'staff','[]'::jsonb,'gallery','[]'::jsonb,
      'testimonials','[]'::jsonb,'faqs','[]'::jsonb,'blog_posts','[]'::jsonb);
  END IF;
  RETURN jsonb_build_object(
    'published',v_published,
    'settings',CASE WHEN v_settings.id IS NULL THEN NULL ELSE jsonb_build_object(
      'business_name',v_settings.business_name,'tagline',v_settings.tagline,'logo_url',v_settings.logo_url,
      'phone',v_settings.phone,'whatsapp',v_settings.whatsapp,'email',v_settings.email,'address',v_settings.address,
      'city',v_settings.city,'map_url',v_settings.map_url,'timings',v_settings.timings,
      'theme_preset',v_settings.theme_preset,'colors',v_settings.colors,'fonts',v_settings.fonts,
      'seo',v_settings.seo,'social',v_settings.social,'section_order',v_settings.section_order) END,
    'sections',coalesce((SELECT jsonb_agg(jsonb_build_object('key',x.key,'title',x.title,'subtitle',x.subtitle,
      'body',x.body,'image_url',x.image_url,'sort_order',x.sort_order) ORDER BY x.sort_order,x.key)
      FROM public.sections x WHERE x.visible),'[]'::jsonb),
    'services',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'slug',x.slug,'name',x.name,
      'category',x.category,'short_desc',x.short_desc,'long_desc',x.long_desc,'benefits',x.benefits,
      'duration_min',x.duration_min,'price',x.price,'image_url',x.image_url,'image_alt',x.image_alt,
      'dosha_tags',x.dosha_tags,'sort_order',x.sort_order) ORDER BY x.sort_order,x.name)
      FROM public.services x WHERE x.active),'[]'::jsonb),
    'packages',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'description',x.description,
      'price',x.price,'includes',x.includes,'is_featured',x.is_featured,'image_url',x.image_url,
      'image_alt',x.image_alt,'sort_order',x.sort_order) ORDER BY x.sort_order,x.name)
      FROM public.packages x WHERE x.active),'[]'::jsonb),
    'staff',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'role',x.role,
      'qualification',x.qualification,'specialty',x.specialty,'bio',x.bio,'photo_url',x.photo_url,
      'photo_alt',x.photo_alt,'sort_order',x.sort_order,
      'service_ids',coalesce((SELECT jsonb_agg(ss.service_id ORDER BY ss.service_id)
        FROM public.staff_services ss WHERE ss.staff_id = x.id),'[]'::jsonb),
      'gallery',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g.id,'image_url',g.image_url,
        'caption',g.caption,'sort_order',g.sort_order) ORDER BY g.sort_order,g.id)
        FROM public.staff_gallery g WHERE g.staff_id = x.id),'[]'::jsonb)) ORDER BY x.sort_order,x.name)
      FROM public.staff x WHERE x.active),'[]'::jsonb),
    'gallery',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'image_url',x.image_url,
      'image_alt',x.image_alt,'caption',x.caption,'category',x.category,'sort_order',x.sort_order)
      ORDER BY x.sort_order,x.id) FROM public.gallery x WHERE x.active),'[]'::jsonb),
    'testimonials',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'rating',x.rating,
      'text',x.text,'photo_url',x.photo_url,'sort_order',x.sort_order) ORDER BY x.sort_order,x.id)
      FROM public.testimonials x WHERE x.approved),'[]'::jsonb),
    'faqs',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'question',x.question,'answer',x.answer,
      'sort_order',x.sort_order) ORDER BY x.sort_order,x.id) FROM public.faqs x WHERE x.active),'[]'::jsonb),
    'blog_posts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'title',x.title,'slug',x.slug,
      'excerpt',x.excerpt,'cover_url',x.cover_url,'cover_alt',x.cover_alt,'published_at',x.published_at)
      ORDER BY x.published_at DESC,x.id) FROM public.blog_posts x WHERE x.published),'[]'::jsonb)
  );
END $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default: explicitly remove it.
REVOKE ALL ON FUNCTION public.set_updated_at(), public.handle_new_user(),
  public.prevent_role_escalation(), public.protect_booking_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_owner(), public.is_staff_or_owner(),
  public.get_available_slots(uuid,uuid,date),
  public.create_booking(uuid,uuid,timestamptz,text,text,text,text),
  public.submit_review(text,int,text), public.save_quiz_result(int,int,int,text),
  public.create_review_token(uuid), public.check_rate_limit(text,int,int),
  public.get_public_site() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_owner(), public.is_staff_or_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid,uuid,date),
  public.submit_review(text,int,text), public.save_quiz_result(int,int,int,text),
  public.get_public_site() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid,uuid,timestamptz,text,text,text,text),
  public.create_review_token(uuid), public.check_rate_limit(text,int,int) TO service_role;
COMMIT;
```

## supabase/migrations/004_rls.sql

```sql
-- Step 1: default-deny RLS and Storage. Table grants are a ceiling, not access.
BEGIN;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['site_settings','sections','services','packages','staff','staff_services','staff_gallery','gallery','testimonials','faqs','blog_posts','customers','bookings','review_tokens','reviews','dosha_quiz_results','ai_generations','media','profiles','working_hours','blocked_dates','rate_limits'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_all ON public.%I', t);
    EXECUTE format('CREATE POLICY owner_all ON public.%I FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner())', t);
  END LOOP;
END $$;
-- Only owners pass owner_all. Staff receive the narrower policies below.
-- Column-level restrictions alone cannot express "owner OR staff"; the
-- prevent_role_escalation/protect_booking_update triggers enforce those
-- differences even though authenticated has table-level UPDATE permission.

DROP POLICY IF EXISTS public_read ON public.site_settings;
CREATE POLICY public_read ON public.site_settings FOR SELECT TO anon, authenticated USING (published);
GRANT SELECT (business_name,tagline,logo_url,phone,whatsapp,email,address,city,map_url,timings,
  theme_preset,colors,fonts,seo,social,section_order,published) ON public.site_settings TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.sections;
CREATE POLICY public_read ON public.sections FOR SELECT TO anon, authenticated USING (visible);
GRANT SELECT ON public.sections TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.services;
CREATE POLICY public_read ON public.services FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT ON public.services TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.packages;
CREATE POLICY public_read ON public.packages FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT ON public.packages TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.staff;
CREATE POLICY public_read ON public.staff FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT ON public.staff TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.staff_services;
CREATE POLICY public_read ON public.staff_services FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.staff_services TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.staff_gallery;
CREATE POLICY public_read ON public.staff_gallery FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.staff_gallery TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.gallery;
CREATE POLICY public_read ON public.gallery FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT ON public.gallery TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.testimonials;
CREATE POLICY public_read ON public.testimonials FOR SELECT TO anon, authenticated USING (approved);
GRANT SELECT ON public.testimonials TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.faqs;
CREATE POLICY public_read ON public.faqs FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT ON public.faqs TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.blog_posts;
CREATE POLICY public_read ON public.blog_posts FOR SELECT TO anon, authenticated USING (published);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
DROP POLICY IF EXISTS public_read ON public.working_hours;
CREATE POLICY public_read ON public.working_hours FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.working_hours TO anon, authenticated;

DROP POLICY IF EXISTS staff_read ON public.bookings;
CREATE POLICY staff_read ON public.bookings FOR SELECT TO authenticated USING (public.is_staff_or_owner());
GRANT SELECT ON public.bookings TO authenticated;
DROP POLICY IF EXISTS staff_read ON public.customers;
CREATE POLICY staff_read ON public.customers FOR SELECT TO authenticated USING (public.is_staff_or_owner());
GRANT SELECT ON public.customers TO authenticated;
DROP POLICY IF EXISTS staff_read ON public.services;
CREATE POLICY staff_read ON public.services FOR SELECT TO authenticated USING (public.is_staff_or_owner());
DROP POLICY IF EXISTS staff_read ON public.staff;
CREATE POLICY staff_read ON public.staff FOR SELECT TO authenticated USING (public.is_staff_or_owner());
DROP POLICY IF EXISTS staff_update_status ON public.bookings;
CREATE POLICY staff_update_status ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_staff_or_owner()) WITH CHECK (public.is_staff_or_owner());
GRANT UPDATE (status) ON public.bookings TO authenticated;
DROP POLICY IF EXISTS own_profile ON public.profiles;
CREATE POLICY own_profile ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
GRANT SELECT ON public.profiles TO authenticated;
DROP POLICY IF EXISTS own_profile_name ON public.profiles;
CREATE POLICY own_profile_name ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('site-images','site-images',true,5242880,ARRAY['image/jpeg','image/png','image/webp','image/avif']),
       ('documents','documents',false,NULL,NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS veda_site_images_public_read ON storage.objects;
CREATE POLICY veda_site_images_public_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site-images');
DROP POLICY IF EXISTS veda_site_images_owner_write ON storage.objects;
CREATE POLICY veda_site_images_owner_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images' AND public.is_owner());
DROP POLICY IF EXISTS veda_site_images_owner_update ON storage.objects;
CREATE POLICY veda_site_images_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images' AND public.is_owner())
  WITH CHECK (bucket_id = 'site-images' AND public.is_owner());
DROP POLICY IF EXISTS veda_site_images_owner_delete ON storage.objects;
CREATE POLICY veda_site_images_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-images' AND public.is_owner());
DROP POLICY IF EXISTS veda_documents_owner_all ON storage.objects;
CREATE POLICY veda_documents_owner_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.is_owner())
  WITH CHECK (bucket_id = 'documents' AND public.is_owner());
COMMIT;
```

## supabase/migrations/005_cron.sql

```sql
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
```

## supabase/seed.sql

```sql
-- Editable demonstration content. Replace via admin panel before publishing.
-- Re-running the seed does not overwrite edits made in the admin panel.
BEGIN;
INSERT INTO public.site_settings (
  business_name,tagline,phone,whatsapp,email,address,city,timings,theme_preset,colors,fonts,seo,social,section_order,published,setup_step
) VALUES (
  'Veda Sanjeevani Ayurvedic Wellness & Spa','A quieter rhythm, rooted in Ayurveda.',
  '','','','','',
  '{"monday_saturday":{"open":"10:00","close":"19:00"},"sunday":{"closed":true}}'::jsonb,'neem',
  '{"sandalwood":"#F6EEDD","neem":"#2F4A3A","turmeric":"#D9A233","terracotta":"#B4572F","ink":"#1E1B16"}'::jsonb,
  '{"heading":"Cormorant Garamond","body":"Inter"}'::jsonb,
  '{"title":"Veda Sanjeevani Ayurvedic Wellness & Spa","description":"Personalised Ayurvedic wellness and spa experiences. Replace this placeholder via the admin panel."}'::jsonb,
  '{}'::jsonb,'["hero","about","quiz","services","team","packages","gallery","testimonials","blog","booking","faq","contact"]'::jsonb,false,1
) ON CONFLICT (singleton) DO NOTHING;

INSERT INTO public.sections (key,title,subtitle,body,sort_order) VALUES
 ('hero','Return to your natural rhythm','Ayurvedic care, thoughtfully personalised','Placeholder introduction. Replace via admin panel with your own welcoming story.',1),
 ('about','Our approach','Tradition meets considered care','Placeholder studio story. Describe your philosophy and trained team without medical guarantees.',2),
 ('quiz','Discover your dosha','A gentle starting point','This five-question wellness quiz is educational, not a diagnosis. Replace via admin panel.',3),
 ('services','Our rituals','Choose the care that suits you','Placeholder service introduction. Replace via admin panel.',4),
 ('team','Meet your practitioners','Care in experienced hands','Placeholder team introduction. Verify all qualifications before publishing.',5),
 ('packages','Thoughtfully paired experiences','Make time for yourself','Placeholder package introduction. Replace via admin panel.',6),
 ('gallery','Inside the sanctuary','A glimpse of our space','Add your own photographs and descriptive alternative text via the admin panel.',7),
 ('testimonials','Guest reflections','Words from our community','All seeded testimonials are fictional placeholders. Replace via admin panel with consented guest feedback.',8),
 ('blog','The wellness journal','Small rituals, everyday balance','Educational placeholder articles; replace via admin panel before publishing.',9),
 ('booking','Reserve your ritual','We look forward to welcoming you','Please arrive 15 minutes early. Share accessibility needs or sensitivities when booking.',10),
 ('faq','Before your visit','A few helpful answers','Placeholder guidance. Replace via admin panel with your current policies.',11),
 ('contact','Find us','Let us help you plan your visit','Add your verified address, phone, email and map link via the admin panel before publishing.',12)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.working_hours (weekday,open_time,close_time,is_closed) VALUES
 (0,'10:00','19:00',true),(1,'10:00','19:00',false),(2,'10:00','19:00',false),
 (3,'10:00','19:00',false),(4,'10:00','19:00',false),(5,'10:00','19:00',false),(6,'10:00','19:00',false)
ON CONFLICT (weekday) DO NOTHING;

INSERT INTO public.services (slug,name,category,duration_min,price,benefits,dosha_tags,short_desc,long_desc,sort_order) VALUES
 ('abhyanga','Abhyanga','relax',60,2400,ARRAY['Supports relaxation','Encourages a sense of grounding'],ARRAY['vata','kapha'],
  'A warm-oil, full-body massage with flowing, rhythmic strokes.',
  'This placeholder ritual uses warm herbal oils selected for your preferences. Gentle, coordinated strokes support relaxation and a feeling of grounding. Your practitioner discusses pressure and sensitivities before the session. It is a wellness experience, not a medical treatment.',1),
 ('shirodhara','Shirodhara','mind',45,2800,ARRAY['Supports mental unwinding','Encourages restful moments'],ARRAY['vata','pitta'],
  'A steady stream of warm oil over the forehead invites quiet stillness.',
  'Shirodhara is traditionally used as a calming wellness practice. A practitioner gently pours warm oil across the forehead while you rest comfortably. The experience supports time away from everyday stimulation. Suitability and comfort are discussed before beginning.',2),
 ('panchakarma-detox','Panchakarma Detox','detox',90,4800,ARRAY['Supports a mindful reset','Encourages consistent self-care'],ARRAY['kapha','vata'],
  'A spa-level wellness ritual inspired by traditional Ayurvedic practices.',
  'This introductory experience combines gentle warmth, massage and rest. It traditionally supports a considered self-care routine. The spa offering does not include medical cleansing procedures or guaranteed detoxification. A qualified clinician should advise on clinical Panchakarma.',3),
 ('udvartana','Udvartana','beauty',60,2600,ARRAY['Supports skin conditioning','Leaves skin feeling refreshed'],ARRAY['kapha'],
  'An invigorating herbal-powder massage with upward, energising strokes.',
  'A blend of finely prepared herbs is used in a rhythmic dry massage. The ritual supports gentle exfoliation and skin conditioning. Your practitioner adapts pressure to your comfort and checks for sensitivities. Results vary and no body-shape changes are promised.',4),
 ('kati-basti','Kati Basti','pain_relief',45,2200,ARRAY['Supports lower-back comfort','Encourages muscular relaxation'],ARRAY['vata'],
  'Localised warmth and warm oil are traditionally used for lower-back comfort.',
  'A comfortable oil reservoir is created over the lower back using a dough boundary. Warm oil is maintained for a short, supervised period. This wellness ritual supports relaxation around the lower back. Persistent or severe pain needs assessment by a qualified healthcare professional.',5),
 ('pizhichil','Pizhichil','pain_relief',75,3800,ARRAY['Supports whole-body relaxation','Encourages a feeling of warmth'],ARRAY['vata'],
  'Continuous warm oil and gentle massage create a deeply restful ritual.',
  'Pizhichil combines warm oil application with coordinated massage. Traditionally used as a nourishing wellness practice, it encourages comfort and rest. Your practitioner explains each step and adjusts temperature carefully. It is not a substitute for care for joint or muscle conditions.',6),
 ('netra-tarpana','Netra Tarpana','relax',30,1600,ARRAY['Encourages screen-break rest','Supports a calming pause'],ARRAY['pitta','vata'],
  'A traditional eye-area wellness ritual centred on rest and stillness.',
  'This placeholder offering is a supervised, non-invasive eye-area comfort ritual. It encourages a quiet break from screens and everyday visual demands. No eye conditions are treated or diagnosed. Clinical eye procedures require an appropriately qualified practitioner and separate assessment.',7),
 ('nasya','Nasya','detox',30,1500,ARRAY['Supports a feeling of freshness','Encourages mindful breathing'],ARRAY['kapha'],
  'A gentle facial and steam experience inspired by the tradition of Nasya.',
  'This spa adaptation combines a gentle facial massage with comfortable external steam. It is traditionally associated with a feeling of freshness in the head and neck area. No nasal medication is administered in this wellness offering. Ask a clinician about clinical Nasya or persistent symptoms.',8),
 ('mukha-lepa-herbal-facial','Mukha Lepa Herbal Facial','beauty',60,2300,ARRAY['Supports skin hydration','Encourages a refreshed appearance'],ARRAY['pitta'],
  'A cooling herbal facial tailored to your skin preferences.',
  'Gentle cleansing is followed by a herbal mask and a relaxed facial massage. Ingredients are discussed in advance and a patch test may be recommended. The ritual supports skin conditioning and a refreshed appearance. It does not diagnose or treat skin disease.',9),
 ('garbhini-care','Garbhini Care','relax',60,2700,ARRAY['Supports relaxation during pregnancy','Encourages comfortable rest'],ARRAY['vata'],
  'A gentle, position-adapted massage for expectant guests with clinical clearance.',
  'This placeholder ritual is adapted for comfort during pregnancy. Written clearance from the guest’s maternity clinician and a trained prenatal practitioner are required. Positioning and pressure are adjusted throughout the session. It does not replace antenatal care or treat pregnancy complications.',10),
 ('ayurvedic-consultation','Ayurvedic Consultation','detox',45,1800,ARRAY['Supports informed wellness choices','Encourages a personalised routine'],ARRAY['vata','pitta','kapha'],
  'A wellness conversation about your routines, preferences and goals.',
  'A practitioner listens to your daily routine and self-care goals. The discussion explores traditional Ayurvedic concepts and suitable spa experiences. Educational guidance is individualised without promising medical outcomes. Medical diagnosis and medication decisions remain with your healthcare professional.',11),
 ('yoga-meditation','Yoga & Meditation','mind',60,1200,ARRAY['Supports gentle movement','Encourages mindful breathing'],ARRAY['vata','pitta','kapha'],
  'A gentle movement and guided-breathing session adaptable to experience.',
  'A practitioner guides comfortable movement, breathing awareness and rest. Options are offered for different mobility levels and experience. The session supports a mindful pause rather than athletic performance. Tell your practitioner about injuries or pregnancy before participating.',12)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.staff (id,name,role,qualification,specialty,bio,sort_order) VALUES
 ('a1000000-0000-4000-8000-000000000001','Dr. Ananya Sharma','Lead Ayurvedic Practitioner','Placeholder: BAMS — verify before publishing',ARRAY['Ayurvedic consultation','Abhyanga'],
  'Placeholder biography for a practitioner focused on thoughtful, individual wellness routines. Replace via admin panel.',1),
 ('a1000000-0000-4000-8000-000000000002','Meera Iyer','Senior Wellness Therapist','Placeholder: recognised Ayurvedic massage training — verify',ARRAY['Shirodhara','Pizhichil'],
  'Placeholder biography describing a calm, guest-led approach to traditional spa rituals. Replace via admin panel.',2),
 ('a1000000-0000-4000-8000-000000000003','Rahul Menon','Wellness Therapist','Placeholder: spa therapy and prenatal-massage training — verify',ARRAY['Udvartana','Herbal facial','Garbhini Care'],
  'Placeholder biography for a therapist who explains each step and adapts pressure to guest comfort. Replace via admin panel.',3),
 ('a1000000-0000-4000-8000-000000000004','Kavya Rao','Yoga & Mindfulness Guide','Placeholder: recognised yoga teaching qualification — verify',ARRAY['Yoga','Meditation','Breathing awareness'],
  'Placeholder biography for a guide offering accessible movement and quiet breathing practices. Replace via admin panel.',4)
ON CONFLICT (id) DO NOTHING;

-- Stable seed IDs and a natural-key guard keep links idempotent without
-- imposing a unique constraint on real practitioners' names.
INSERT INTO public.staff_services (staff_id,service_id)
SELECT st.id,s.id FROM public.staff st JOIN public.services s ON
  (st.id = 'a1000000-0000-4000-8000-000000000001' AND s.slug <> 'yoga-meditation') OR
  (st.id = 'a1000000-0000-4000-8000-000000000002' AND s.slug IN ('abhyanga','shirodhara','panchakarma-detox','kati-basti','pizhichil','netra-tarpana','nasya','garbhini-care')) OR
  (st.id = 'a1000000-0000-4000-8000-000000000003' AND s.slug IN ('abhyanga','udvartana','kati-basti','mukha-lepa-herbal-facial','garbhini-care')) OR
  (st.id = 'a1000000-0000-4000-8000-000000000004' AND s.slug = 'yoga-meditation')
WHERE NOT EXISTS (SELECT 1 FROM public.staff_services x WHERE x.staff_id = st.id AND x.service_id = s.id);

INSERT INTO public.packages (id,name,description,price,includes,is_featured,sort_order)
SELECT 'a2000000-0000-4000-8000-000000000001','The Grounding Ritual','Placeholder: a warm-oil massage followed by a calming Shirodhara session.',4900,
  ARRAY['Abhyanga · 60 minutes','Shirodhara · 45 minutes','Herbal tea and quiet rest'],true,1
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.packages (id,name,description,price,includes,is_featured,sort_order)
SELECT 'a2000000-0000-4000-8000-000000000002','The Refresh Edit','Placeholder: an invigorating powder massage and a conditioning herbal facial.',4500,
  ARRAY['Udvartana · 60 minutes','Mukha Lepa Herbal Facial · 60 minutes','Herbal tea'],false,2
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.packages (id,name,description,price,includes,is_featured,sort_order)
SELECT 'a2000000-0000-4000-8000-000000000003','A Mindful Morning','Placeholder: a personalised wellness conversation with gentle yoga and meditation.',2700,
  ARRAY['Ayurvedic Consultation · 45 minutes','Yoga & Meditation · 60 minutes','Seasonal herbal tea'],false,3
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.faqs (id,question,answer,sort_order) VALUES
 ('a3000000-0000-4000-8000-000000000001','What should I expect on my first visit?','Please arrive 15 minutes early to discuss your preferences, sensitivities and comfort. Placeholder policy: replace via admin panel.',1),
 ('a3000000-0000-4000-8000-000000000002','Are these rituals medical treatments?','No. Spa experiences support general wellness and are not a substitute for medical diagnosis or care. Speak with a qualified clinician about health concerns.',2),
 ('a3000000-0000-4000-8000-000000000003','Can I book during pregnancy?','Please tell us when booking. Garbhini Care requires maternity-clinician clearance and an appropriately trained practitioner.',3),
 ('a3000000-0000-4000-8000-000000000004','What is your cancellation policy?','Placeholder: contact us at least 24 hours before your appointment to reschedule. Replace via admin panel with your approved policy.',4),
 ('a3000000-0000-4000-8000-000000000005','What should I bring?','Wear comfortable clothing and share relevant allergies or accessibility needs. Replace this placeholder with your visit guidance.',5),
 ('a3000000-0000-4000-8000-000000000006','How do I choose a service?','Explore the service descriptions or book a wellness consultation. The dosha quiz is educational and does not determine medical suitability.',6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.testimonials (id,name,rating,text,approved,sort_order) VALUES
 ('a4000000-0000-4000-8000-000000000001','Placeholder Guest A',5,'Fictional sample: the team explained every step and the space felt peaceful. Replace via admin panel with consented feedback.',true,1),
 ('a4000000-0000-4000-8000-000000000002','Placeholder Guest B',5,'Fictional sample: a welcome pause in a busy week. Replace via admin panel with consented feedback.',true,2),
 ('a4000000-0000-4000-8000-000000000003','Placeholder Guest C',4,'Fictional sample: thoughtful guidance and a comfortable, unhurried experience. Replace via admin panel with consented feedback.',true,3),
 ('a4000000-0000-4000-8000-000000000004','Placeholder Guest D',5,'Fictional sample: the gentle yoga session was easy to adapt to my experience. Replace via admin panel with consented feedback.',true,4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.blog_posts (title,slug,excerpt,body,published,published_at) VALUES
 ('Making room for a slower morning','making-room-for-a-slower-morning',
  'A draft collection of small, sustainable ideas for a more mindful start.',
  'Placeholder draft. Begin with a few comfortable stretches, a quiet drink and time away from notifications. Consistent rest and gentle routines support everyday wellbeing. Replace via admin panel and have wellness content reviewed before publishing.',false,NULL),
 ('Understanding the three doshas','understanding-the-three-doshas',
  'An introductory, educational guide to Vata, Pitta and Kapha.',
  'Placeholder draft. Ayurvedic tradition describes three doshas as a framework for understanding individual patterns. This framework is not a medical diagnosis. Replace via admin panel with accurately referenced educational content.',false,NULL),
 ('Preparing for your first spa visit','preparing-for-your-first-spa-visit',
  'Practical questions to ask before choosing your first ritual.',
  'Placeholder draft. Share your comfort preferences, sensitivities and access needs with your practitioner. Ask about the ingredients, session length and aftercare. Replace via admin panel with your verified policies.',false,NULL)
ON CONFLICT (slug) DO NOTHING;
COMMIT;
```

## supabase/tests/db_tests.sql

```sql
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
```

## supabase/config.toml

```toml
project_id = "veda-sanjeevani"

[db]
major_version = 17

[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

## README_DB.md

````markdown
# Veda Sanjeevani — Step 1 database

A standalone Supabase database for **Veda Sanjeevani Ayurvedic Wellness & Spa**. It is deliberately
isolated from the existing StudioFlow application: the parent repository already uses
`public.profiles`, `create_booking` and `get_available_slots` with incompatible contracts. **Use a
new, dedicated Supabase project; do not apply these migrations to the existing StudioFlow project.**

## Files and order

1. `supabase/migrations/001_extensions.sql`
2. `supabase/migrations/002_tables.sql`
3. `supabase/migrations/003_functions.sql`
4. `supabase/migrations/004_rls.sql`
5. `supabase/migrations/005_cron.sql`
6. `supabase/seed.sql`
7. `supabase/tests/db_tests.sql` — run separately, after seeding

`supabase/config.toml` selects PostgreSQL 17 for a new local Supabase stack and enables the seed
file. The SQL also uses PostgreSQL 16-compatible features. All migration and seed transactions are
repeatable. Seed conflicts do not overwrite admin edits; deleting a seeded row intentionally allows
a later seed run to restore it.

## Run locally

Install Docker and Supabase CLI 2.122 or newer. From **this directory**, not the parent StudioFlow
directory:

```bash
cd veda-sanjeevani
supabase start
supabase db reset
supabase status
```

`db reset` is destructive to the selected local database. It applies the migrations and seed. Never
point a reset at valuable data. Obtain the local PostgreSQL URL from `supabase status`, then run:

```bash
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/db_tests.sql
```

Alternatively, with the local stack running:

```bash
supabase db lint --level warning
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -v ON_ERROR_STOP=1 -f supabase/tests/db_tests.sql
```

The test file creates temporary Auth/profile/booking fixtures inside a transaction and rolls
everything back. It expects the fresh seed and no existing profiles. It makes no HTTP requests and
needs no real credentials. Run it only on a disposable/reset database.

## Hosted SQL editor

Create a **new** Supabase project. Enable `pg_cron`, `pg_net` and Vault if not already enabled.
Supabase provides the required `auth` and `storage` schemas and the `anon`, `authenticated` and
`service_role` roles; these SQL files do not impersonate or recreate those platform schemas.

Paste each complete migration into the SQL editor **in the numbered order**, then `seed.sql`. Run
each as a separate query. Finally run `db_tests.sql` only in a disposable project. The SQL editor is
not a substitute for migration history in production; use the CLI migration workflow for deployed
projects.

The extension migration assumes Supabase's standard `extensions` schema. `pg_cron` must be available
in `shared_preload_libraries`, as it is on Supabase. A plain PostgreSQL server without Supabase
Auth/Storage and these extensions is not a supported target.

## Secrets and the review job

No secret or real project URL is included in these files. Create a random secret of at least 32
characters in a password manager. In the **SQL editor as database owner**, set these Vault entries,
replacing the placeholders locally:

```sql
SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_RANDOM_32_PLUS_CHARACTER_SECRET', 'cron_secret');
```

To rotate an existing value without creating duplicate names:

```sql
SELECT vault.update_secret(id, 'YOUR_NEW_VALUE')
FROM vault.decrypted_secrets WHERE name = 'cron_secret';
```

Use the equivalent rotation for `project_url`. Set the **same cron secret** as `CRON_SECRET` on the
Step 2 `request-review` Edge Function. Never use a browser key, commit a secret, put it in a
migration, or expose `vault.decrypted_secrets` through the API. Restrict SQL editor/Vault access to
trusted administrators.

Jobs use UTC:

| Name              | Schedule          | Behaviour                                                                                              |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `review-requests` | Hourly, minute 0  | Reconcile previous HTTP responses, then queue up to 100 eligible completed visits older than 24 hours. |
| `keep-alive`      | Daily, 03:17      | `SELECT 1`.                                                                                            |
| `cleanup`         | Hourly, minute 30 | Remove rate-limit buckets older than one day.                                                          |

`pg_net` is asynchronous. `bookings.review_request_id` records the queued request.
`review_requested_at` is set **only after a non-timeout HTTP 2xx response**, normally on the next
hourly reconciliation. Failures retry; a missing response retries after 15 minutes if it is no
longer queued. The Step 2 endpoint must verify `x-cron-secret` using a constant-time comparison and
deduplicate by `booking_id` before sending messages. Delivery is at-least-once, not a claim of
exactly-once messaging. A 2xx acknowledges the endpoint, not eventual WhatsApp/SMS delivery. Missing
Vault configuration leaves the job safely idle with a warning. There is **no auto-complete job**.

Inspect safely:

```sql
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
SELECT jobid, status, return_message, start_time
FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
SELECT name FROM vault.decrypted_secrets ORDER BY name; -- no secret values
```

## RPC contract

| RPC                                                               | Execution access      |
| ----------------------------------------------------------------- | --------------------- |
| `get_public_site()`                                               | anon, authenticated   |
| `get_available_slots(uuid, uuid, date)`                           | anon, authenticated   |
| `create_booking(uuid, uuid, timestamptz, text, text, text, text)` | **service_role only** |
| `submit_review(text, int, text)`                                  | anon, authenticated   |
| `save_quiz_result(int, int, int, text)`                           | anon, authenticated   |
| `create_review_token(uuid)`                                       | **service_role only** |
| `check_rate_limit(text, int, int)`                                | **service_role only** |

The browser calls the booking Edge Function, which validates origin/rate limits and calls
`create_booking` using the server-only key. Never put a service-role key in frontend code.
`get_public_site` is the single website read call; an unpublished site returns empty content to
visitors while the owner can preview it. It excludes setup state, customer data and draft article
bodies. As explicitly required by the RLS contract, direct SELECT policies still expose active
catalogue rows independently of the site's published flag; the frontend must use `get_public_site`,
not assemble its own direct-table reads.

Slots use **Asia/Kolkata**, a 30-minute grid, actual treatment duration, a 15-minute buffer and a
two-hour minimum lead time. `slot_end` is the treatment end, not the buffer end. The last treatment
must finish by closing. The exclusion constraint prevents overlapping pending/confirmed appointments
even for direct owner writes; the RPC additionally enforces buffers, eligibility and the grid.
Owners retain full manual booking control.

`bookings.price` is a server-derived price snapshot, added so staff cannot alter a booking's price
and historical totals do not change when a service price changes. Junction tables have a unique UUID
`id` plus the requested composite primary key. Phone values are normalized to ten digits; optional
email uses case-insensitive `citext`.

## Auth, RLS and Storage

- The **first Auth user becomes owner**, later users become staff. Create the owner first through a
  controlled signup; disable public signup or use an invite-only process before launch. First-owner
  selection is serialized, but this bootstrap rule is not a substitute for secured signup.
- Only owners can change roles. Staff can read bookings/customers and change booking **status
  only**. They can read their own profile and change their own full name. Database triggers enforce
  restricted fields in addition to RLS.
- RLS is enabled on all 22 application tables. Private tables have no anon policy.
  Published/active/approved content is readable as specified. Owner policies cover all application
  rows.
- `site-images`: public read, 5 MiB, JPEG/PNG/WebP/AVIF; owner-only upload/update/delete.
- `documents`: private; owner-only access. No anon policy.
- Service-role keys bypass RLS and are server-only. Security-definer functions use a fixed search
  path with `pg_temp` last and explicit function grants.

## Before launch / scope

**Replace all seed text via admin panel** (the admin UI is a later step): practitioner names,
qualifications, biographies, prices, policies, contact details, SEO and fictional approved
testimonials. Obtain consent for real testimonials. Replace empty image URLs with owned, accessible
images. The seeded Netra Tarpana and Nasya offerings are explicitly non-clinical spa adaptations; do
not advertise clinical procedures without appropriately qualified staff. No seed copy promises to
cure disease.

Step 1 does not implement the backend, admin UI, public frontend, payment flow or `request-review`
Edge Function. It does not send messages or verify real provider delivery. Configure Auth email,
backups, custom domains, monitoring and provider credentials in their respective later steps.

## Verification checklist

The implementation includes assertions for all seven requested test groups, plus seed counts,
buffers, RPC grants, quiz validation, rate limits, Storage policies, public projections and cron
registration.

### Verified in this workspace — 2026-11-01

- Supabase CLI **2.122.0**, using `db reset --db-url … --yes` against an isolated **native
  PostgreSQL 16.2** database: all five migrations and seed applied successfully. This is the CLI's
  external-database reset path, **not** a Docker `supabase start` / local-stack reset.
- Real `btree_gist`, `pgcrypto`, `citext`, `pg_cron`, `pg_net` and `supabase_vault` extensions were
  installed. Supabase-compatible Auth/Storage tables and API roles were provided as test fixtures;
  the full Supabase service stack was not running.
- `psql -v ON_ERROR_STOP=1 -f supabase/tests/db_tests.sql`: **PASS**, transaction rolled back.
  Expected warnings explain that Vault is intentionally unconfigured.
- A separate two-connection test rejected a concurrent overlapping booking with SQLSTATE **23P01**.
- All five migrations were applied a second time successfully. Re-seeding preserved edited
  service/settings text and did not duplicate rows.
- All **22** application tables have RLS and an `updated_at` trigger.
- Final inventory: **22 tables, 14 functions, 41 application policies, 5 spa Storage policies, 3
  active cron jobs**.
- Seed inventory: **12 services, 12 sections, 4 staff, 3 packages, 6 FAQs, 4 fictional approved
  testimonials, 3 draft posts, 0 bookings**.
- No cure claims or real credentials were found in the SQL.

### Not verified

- Docker-backed `supabase db reset` on the configured PostgreSQL **17** image: Docker is unavailable
  in this workspace.
- A hosted Supabase project, real Auth signup, actual Storage HTTP uploads, PostgREST HTTP calls,
  deployed Vault secrets and scheduled wall-clock cron execution.
- `supabase db lint`: the native test server lacks the optional `plpgsql_check` extension; this is
  not reported as a passing lint run.
- The Step 2 `request-review` endpoint and real email/WhatsApp/SMS delivery. HTTP
  acknowledgement/retry bookkeeping was tested with inserted `pg_net` response fixtures, not an
  external provider.

### Final inventory

Tables: `site_settings`, `sections`, `services`, `packages`, `staff`, `staff_services`,
`staff_gallery`, `gallery`, `testimonials`, `faqs`, `blog_posts`, `customers`, `bookings`,
`review_tokens`, `reviews`, `dosha_quiz_results`, `ai_generations`, `media`, `profiles`,
`working_hours`, `blocked_dates`, `rate_limits`.

Functions: `set_updated_at`, `is_owner`, `is_staff_or_owner`, `handle_new_user`,
`prevent_role_escalation`, `protect_booking_update`, `get_available_slots`, `create_booking`,
`submit_review`, `save_quiz_result`, `create_review_token`, `check_rate_limit`, `get_public_site`,
`dispatch_review_requests`.

Policies: `owner_all` on each of the 22 application tables; `public_read` on `site_settings`,
`sections`, `services`, `packages`, `staff`, `staff_services`, `staff_gallery`, `gallery`,
`testimonials`, `faqs`, `blog_posts`, `working_hours`; `staff_read` on `bookings`, `customers`,
`services`, `staff`; `staff_update_status` on `bookings`; `own_profile` and `own_profile_name` on
`profiles`; Storage policies `veda_site_images_public_read`, `veda_site_images_owner_write`,
`veda_site_images_owner_update`, `veda_site_images_owner_delete`, `veda_documents_owner_all`.

Cron: `review-requests` (`0 * * * *`), `keep-alive` (`17 3 * * *`), `cleanup` (`30 * * * *`), all
active. No auto-complete job.

Success in the native test environment is not proof of hosted deployment. Do not mark hosted
deployment or external messaging verified until actually tested there.
````

## .gitignore

```gitignore
supabase/.temp/
supabase/.branches/
.env
.env.*
!.env.example
```
