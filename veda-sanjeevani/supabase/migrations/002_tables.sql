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
