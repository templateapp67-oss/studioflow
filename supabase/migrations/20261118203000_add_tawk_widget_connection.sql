-- Per-salon Tawk.to widget configuration. Public widget identifiers only; no credentials.
alter table studioflow_tawk_private.property_mappings
  add column if not exists tawk_widget_id text;

alter table studioflow_tawk_private.property_mappings
  drop constraint if exists property_mappings_tawk_widget_id_format;

alter table studioflow_tawk_private.property_mappings
  add constraint property_mappings_tawk_widget_id_format
  check (tawk_widget_id is null or tawk_widget_id ~ '^[A-Za-z0-9_-]{8,64}$');

create or replace function public.studioflow_tawk_public_config(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'propertyId', m.tawk_property_id,
    'widgetId', m.tawk_widget_id
  )
  from studioflow_tawk_private.property_mappings m
  join public.studioflow_websites w
    on w.slug = m.website_slug
   and w.owner_id = m.owner_id
   and w.published_at is not null
   and w.published_at <= now()
  where m.website_slug = p_slug
    and m.status = 'active'
    and m.tawk_widget_id is not null
  limit 1;
$$;

revoke all on function public.studioflow_tawk_public_config(text) from public;
grant execute on function public.studioflow_tawk_public_config(text) to anon, authenticated;
