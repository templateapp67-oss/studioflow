-- Per-salon Tawk.to widget configuration. Public widget identifiers only; no credentials.
alter table studioflow_tawk_private.property_mappings
  add column if not exists tawk_widget_id text;

alter table studioflow_tawk_private.property_mappings
  drop constraint if exists property_mappings_tawk_widget_id_format;

alter table studioflow_tawk_private.property_mappings
  add constraint property_mappings_tawk_widget_id_format
  check (tawk_widget_id is null or tawk_widget_id ~ '^[A-Za-z0-9_-]{8,64}$');

create or replace function public.studioflow_tawk_public_config(p_slug text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('propertyId', m.tawk_property_id, 'widgetId', m.tawk_widget_id)
  from studioflow_tawk_private.property_mappings m
  join public.studioflow_websites w on w.slug = m.website_slug and w.owner_id = m.owner_id
    and w.published_at is not null and w.published_at <= now()
  where m.website_slug = p_slug and m.status = 'active' and m.tawk_widget_id is not null
  limit 1;
$$;
revoke all on function public.studioflow_tawk_public_config(text) from public;
grant execute on function public.studioflow_tawk_public_config(text) to anon, authenticated;

create or replace function public.studioflow_tawk_owner_connection(
  p_action text, p_owner_id uuid, p_slug text default null,
  p_property_id text default null, p_widget_id text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_existing studioflow_tawk_private.property_mappings%rowtype;
  v_websites jsonb;
  v_connections jsonb;
begin
  if not exists (select 1 from public.studioflow_accounts a where a.user_id = p_owner_id) then
    raise exception 'owner_workspace_not_found' using errcode = '42501';
  end if;

  if p_action = 'status' then
    select coalesce(jsonb_agg(jsonb_build_object('slug', w.slug, 'published_at', w.published_at)
      order by w.published_at desc), '[]'::jsonb)
      into v_websites from public.studioflow_websites w
      where w.owner_id = p_owner_id and w.published_at is not null;
    select coalesce(jsonb_agg(jsonb_build_object('website_slug', m.website_slug,
      'tawk_property_id', m.tawk_property_id, 'tawk_widget_id', m.tawk_widget_id, 'status', m.status)), '[]'::jsonb)
      into v_connections from studioflow_tawk_private.property_mappings m
      where m.owner_id = p_owner_id;
    return jsonb_build_object('websites', v_websites, 'connections', v_connections);
  end if;

  if p_slug is null or not exists (
    select 1 from public.studioflow_websites w
    where w.owner_id = p_owner_id and w.slug = p_slug and w.published_at is not null
  ) then
    raise exception 'published_website_not_owned' using errcode = '42501';
  end if;

  select * into v_existing from studioflow_tawk_private.property_mappings m
    where m.owner_id = p_owner_id and m.website_slug = p_slug limit 1;

  if p_action = 'disconnect' then
    update studioflow_tawk_private.property_mappings
      set status = 'inactive', tawk_widget_id = null, updated_at = now()
      where owner_id = p_owner_id and website_slug = p_slug;
    return jsonb_build_object('disconnected', true);
  elsif p_action = 'connect' then
    if p_property_id !~ '^[A-Za-z0-9_-]{8,64}$' or p_widget_id !~ '^[A-Za-z0-9_-]{8,64}$' then
      raise exception 'invalid_tawk_ids' using errcode = '22023';
    end if;
    if v_existing.property_id is null then
      insert into studioflow_tawk_private.property_mappings
        (property_id, tawk_property_id, tawk_widget_id, owner_id, website_slug, branch_id, status)
      values (gen_random_uuid(), p_property_id, p_widget_id, p_owner_id, p_slug, null, 'active');
    else
      update studioflow_tawk_private.property_mappings
        set tawk_property_id = p_property_id, tawk_widget_id = p_widget_id,
            status = 'active', updated_at = now()
        where property_id = v_existing.property_id;
    end if;
    return jsonb_build_object('connected', true, 'websiteSlug', p_slug);
  end if;
  raise exception 'unknown_action' using errcode = '22023';
end;
$$;
revoke all on function public.studioflow_tawk_owner_connection(text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.studioflow_tawk_owner_connection(text, uuid, text, text, text) to service_role;
