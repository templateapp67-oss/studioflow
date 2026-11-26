begin;

create or replace function studioflow_private.publish()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  d jsonb;
  profile jsonb;
  business_name text;
  requested_slug text;
  slug_base text;
  v_slug text;
  slug_suffix text;
  auto_slug boolean := false;
  result jsonb;
  safe_draft jsonb;
  can_complete_onboarding boolean := false;
begin
  if actor is null then
    raise exception 'Sign in required. Sign in again before publishing.'
      using errcode = '42501';
  end if;

  select draft into d
  from public.studioflow_accounts
  where user_id = actor
  for update;

  if not found or jsonb_typeof(d) is distinct from 'object' then
    raise exception 'Your salon workspace was not found. Save your workspace and try publishing again.'
      using errcode = 'P0001';
  end if;

  profile := coalesce(d->'profile', '{}'::jsonb);
  business_name := nullif(btrim(profile->>'businessName'), '');
  if business_name is null then
    raise exception 'Add your business name before publishing.' using errcode = '22023';
  end if;
  if char_length(business_name) > 120 then
    raise exception 'Business name must be 120 characters or fewer.' using errcode = '22023';
  end if;
  if nullif(btrim(profile->>'businessType'), '') is null
     or (
       case
         when profile ? 'serviceCatalogueInitialized'
           then coalesce((profile->>'serviceCatalogueInitialized')::boolean, false)
         else true
       end
     ) is not true then
    raise exception 'Choose a salon template before publishing.' using errcode = '22023';
  end if;
  if jsonb_typeof(d->'services') is distinct from 'array'
     or jsonb_array_length(d->'services') = 0 then
    raise exception 'Add at least one service before publishing.' using errcode = '22023';
  end if;

  requested_slug := nullif(btrim(profile->>'subdomain'), '');
  auto_slug := requested_slug is null;

  if auto_slug then
    slug_base := trim(both '-' from regexp_replace(lower(btrim(business_name)), '[^a-z0-9]+', '-', 'g'));
    if char_length(slug_base) < 3 then
      slug_base := 'salon-' || substr(replace(actor::text, '-', ''), 1, 8);
    end if;
    v_slug := trim(trailing '-' from left(slug_base, 63));
  else
    v_slug := trim(both '-' from regexp_replace(lower(btrim(requested_slug)), '[^a-z0-9]+', '-', 'g'));
    if v_slug !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
      raise exception 'Website address must be 3–63 lowercase letters, numbers or hyphens.'
        using errcode = '22023';
    end if;
  end if;

  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
    raise exception 'We could not create a valid website address from this business name. Enter a website address and try again.'
      using errcode = '22023';
  end if;

  -- Serialize claims for the same slug. If an auto-generated slug is taken,
  -- add a stable owner suffix; never silently rewrite a custom slug.
  perform pg_advisory_xact_lock(hashtextextended('studioflow-publish-slug:' || v_slug, 0));

  if exists (
    select 1 from public.studioflow_websites w
    where lower(w.slug) = v_slug and w.owner_id <> actor
  ) then
    if not auto_slug then
      raise exception 'This website address is already in use. Change the Website address and try again.'
        using errcode = '23505';
    end if;

    slug_suffix := '-' || substr(replace(actor::text, '-', ''), 1, 8);
    v_slug := trim(trailing '-' from left(slug_base, 63 - char_length(slug_suffix))) || slug_suffix;
    perform pg_advisory_xact_lock(hashtextextended('studioflow-publish-slug:' || v_slug, 0));

    if exists (
      select 1 from public.studioflow_websites w
      where lower(w.slug) = v_slug and w.owner_id <> actor
    ) then
      raise exception 'A unique website address could not be generated. Enter a different Website address and try again.'
        using errcode = '23505';
    end if;
  end if;

  safe_draft := jsonb_set(
    d, '{stylists}',
    case when jsonb_typeof(d->'stylists') = 'array' then d->'stylists' else '[]'::jsonb end,
    true
  );

  begin
    insert into public.studioflow_websites(owner_id, slug, content)
    values (
      actor,
      v_slug,
      jsonb_set(studioflow_private.website_content(safe_draft), '{profile,subdomain}', to_jsonb(v_slug), true)
    )
    on conflict (owner_id) do update
      set slug = excluded.slug, content = excluded.content, published_at = now()
    returning to_jsonb(studioflow_websites.*) into result;
  exception
    when unique_violation then
      raise exception 'This website address is already in use. Change the Website address and try again.'
        using errcode = '23505';
  end;

  return result || jsonb_build_object('slug', v_slug, 'published', true);
end
$function$;

create or replace function public.studioflow_track_publish()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  tracking_state text;
  can_complete_onboarding boolean := false;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  -- Each optional tracker runs in its own subtransaction. Its failure is
  -- logged with a safe SQLSTATE and cannot undo studioflow_publish().
  if to_regclass('public.partner_referrals') is not null then
    begin
      execute
        'update public.partner_referrals
         set website_created_at = coalesce(website_created_at, now()),
             website_published_at = now(),
             last_activity_at = now(),
             updated_at = now()
         where referred_user_id = $1'
        using actor;
    exception when others then
      get stacked diagnostics tracking_state = returned_sqlstate;
      raise warning '[StudioFlow] Optional referral tracking failed (SQLSTATE %)', tracking_state;
    end;
  end if;

  if to_regclass('public.growth_onboarding') is not null
     and to_regprocedure('public.update_my_onboarding_progress(text)') is not null then
    begin
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'growth_onboarding' and column_name = 'template_started_at'
      ) then
        execute
          'select exists (
             select 1 from public.growth_onboarding
             where user_id = $1 and template_started_at is not null
           )'
          into can_complete_onboarding
          using actor;
      elsif exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'growth_onboarding' and column_name = 'start_template_at'
      ) then
        execute
          'select exists (
             select 1 from public.growth_onboarding
             where user_id = $1 and start_template_at is not null
           )'
          into can_complete_onboarding
          using actor;
      end if;
      if can_complete_onboarding then
        perform public.update_my_onboarding_progress('complete_template');
      end if;
    exception when others then
      get stacked diagnostics tracking_state = returned_sqlstate;
      raise warning '[StudioFlow] Optional onboarding tracking failed (SQLSTATE %)', tracking_state;
    end;
  end if;

  return jsonb_build_object('tracked', true);
end
$function$;

revoke all on function public.studioflow_track_publish() from public, anon;
grant execute on function public.studioflow_track_publish() to authenticated;
commit;
