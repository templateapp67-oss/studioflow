-- StudioFlow website publishing contract hardening.
--
-- The visible Publishing Checklist requires a business name, a selected
-- salon template, and at least one service. This function now enforces those
-- same requirements, generates a stable unique slug when none was supplied,
-- and returns the persisted published row. Optional referral tracking must
-- never roll back a successfully created customer-facing website.

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
  safe_staff jsonb;
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
  if coalesce((profile->>'serviceCatalogueInitialized')::boolean, false) is not true then
    raise exception 'Choose a salon template before publishing.' using errcode = '22023';
  end if;
  if jsonb_typeof(d->'services') is distinct from 'array'
     or jsonb_array_length(d->'services') = 0 then
    raise exception 'Add at least one service before publishing.' using errcode = '22023';
  end if;

  requested_slug := nullif(btrim(profile->>'subdomain'), '');
  auto_slug := requested_slug is null;

  if auto_slug then
    slug_base := trim(both '-' from lower(regexp_replace(btrim(business_name), '[^a-z0-9]+', '-', 'g')));
    if char_length(slug_base) < 3 then
      slug_base := 'salon-' || substr(replace(actor::text, '-', ''), 1, 8);
    end if;
    v_slug := trim(trailing '-' from left(slug_base, 63));
  else
    v_slug := trim(both '-' from lower(regexp_replace(requested_slug, '[^a-z0-9]+', '-', 'g')));
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
  select coalesce(jsonb_agg(
    s - 'schedule' - 'commissionRate' - 'accessRole' - 'assignedServices' - 'phone'
  ), '[]'::jsonb)
  into safe_staff
  from jsonb_array_elements(safe_draft->'stylists') s
  where coalesce(s->>'status', 'Available') <> 'Inactive';

  begin
    insert into public.studioflow_websites(owner_id, slug, content)
    values (actor, v_slug, studioflow_private.website_content(safe_draft))
    on conflict (owner_id) do update
      set slug = excluded.slug, content = excluded.content, published_at = now()
    returning to_jsonb(studioflow_websites.*) into result;
  exception
    when unique_violation then
      raise exception 'This website address is already in use. Change the Website address and try again.'
        using errcode = '23505';
  end;

  -- Referral tracking is optional; its absence must not block the public site.
  if to_regclass('public.partner_referrals') is not null then
    execute
      'update public.partner_referrals
       set website_created_at = coalesce(website_created_at, now()),
           website_published_at = now(),
           last_activity_at = now(),
           updated_at = now()
       where referred_user_id = $1'
      using actor;
  end if;

  -- Only advance referral onboarding when its table, RPC, and started state exist.
  if to_regclass('public.growth_onboarding') is not null
     and to_regprocedure('public.update_my_onboarding_progress(text)') is not null then
    execute
      'select exists (
         select 1 from public.growth_onboarding
         where user_id = $1 and template_started_at is not null
       )'
      into can_complete_onboarding
      using actor;
    if can_complete_onboarding then
      perform public.update_my_onboarding_progress('complete_template');
    end if;
  end if;

  return result || jsonb_build_object('slug', v_slug, 'published', true);
end
$function$;

commit;
