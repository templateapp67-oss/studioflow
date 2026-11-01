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
