-- Step 4 additive admin support. Keep Steps 1–3 migrations unchanged.
BEGIN;

-- The Step 1 column allowed only 1–5. Step 4 adds seven resumable setup screens.
ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_setup_step_check;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_setup_step_check CHECK (setup_step BETWEEN 1 AND 7);

-- Public sign-up can be offered only before the first profile is created.
-- This reveals a boolean, never user/profile identities.
CREATE OR REPLACE FUNCTION public.first_owner_setup_available()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1);
$$;
REVOKE ALL ON FUNCTION public.first_owner_setup_available() FROM PUBLIC, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.first_owner_setup_available() TO anon;

-- Enable booking changefeeds without exposing more rows; Realtime still applies RLS.
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings';
  END IF;
END $$;

COMMIT;
