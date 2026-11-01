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
