-- Per-salon Tawk.to configuration and the private Booking API property mapping.
-- Both private tables are prerequisites: create them before any ALTER or RPC statement.
create schema if not exists studioflow_tawk_private;
revoke all on schema studioflow_tawk_private from public, anon, authenticated;
grant usage on schema studioflow_tawk_private to service_role;

create table if not exists studioflow_tawk_private.property_mappings (
  property_id uuid primary key default gen_random_uuid(),
  tawk_property_id text not null,
  owner_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  website_slug text not null references public.studioflow_websites(slug) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_mappings_tawk_property_id_nonempty
    check (length(btrim(tawk_property_id)) between 1 and 160),
  constraint property_mappings_website_slug_format
    check (website_slug ~ '^[a-z0-9][a-z0-9-]{2,62}$')
);

create table if not exists studioflow_tawk_private.widget_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  website_slug text not null references public.studioflow_websites(slug) on delete cascade,
  tawk_property_id text not null,
  tawk_widget_id text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tawk_widget_connections_slug_uidx unique (website_slug),
  constraint tawk_widget_connections_property_uidx unique (tawk_property_id),
  constraint tawk_widget_connections_property_format check (tawk_property_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  constraint tawk_widget_connections_widget_format check (
    lower(tawk_widget_id) = 'default'
    or tawk_widget_id ~ '^[A-Za-z0-9_-]{8,64}$'
  )
);

-- Indexes and access controls are installed only after both table prerequisites exist.
create unique index if not exists property_mappings_tawk_property_id_uidx
  on studioflow_tawk_private.property_mappings(tawk_property_id);
create index if not exists property_mappings_branch_id_idx
  on studioflow_tawk_private.property_mappings(branch_id)
  where branch_id is not null;
create index if not exists property_mappings_created_at_idx
  on studioflow_tawk_private.property_mappings(created_at desc);
create index if not exists property_mappings_owner_slug_idx
  on studioflow_tawk_private.property_mappings(owner_id, website_slug);

alter table studioflow_tawk_private.property_mappings enable row level security;
revoke all on studioflow_tawk_private.property_mappings from anon, authenticated;
grant all on studioflow_tawk_private.property_mappings to service_role;

alter table studioflow_tawk_private.widget_connections enable row level security;
revoke all on studioflow_tawk_private.widget_connections from anon, authenticated;
grant all on studioflow_tawk_private.widget_connections to service_role;

-- CREATE TABLE IF NOT EXISTS does not update constraints on an existing table.
alter table studioflow_tawk_private.widget_connections
  drop constraint if exists tawk_widget_connections_widget_format;
alter table studioflow_tawk_private.widget_connections
  add constraint tawk_widget_connections_widget_format
  check (
    lower(tawk_widget_id) = 'default'
    or tawk_widget_id ~ '^[A-Za-z0-9_-]{8,64}$'
  );

create or replace function public.studioflow_tawk_public_config(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'propertyId', c.tawk_property_id,
    'widgetId', c.tawk_widget_id
  )
  from studioflow_tawk_private.widget_connections c
  join public.studioflow_websites w
    on w.slug = c.website_slug
   and w.owner_id = c.owner_id
   and w.published_at is not null
   and w.published_at <= now()
  where c.website_slug = p_slug
    and c.status = 'active'
  limit 1;
$$;

revoke all on function public.studioflow_tawk_public_config(text) from public;
grant execute on function public.studioflow_tawk_public_config(text) to anon, authenticated;

create or replace function public.studioflow_tawk_owner_connection(
  p_action text,
  p_owner_id uuid,
  p_slug text default null,
  p_property_id text default null,
  p_widget_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing studioflow_tawk_private.widget_connections%rowtype;
  v_websites jsonb;
  v_connections jsonb;
begin
  if not exists (
    select 1
    from public.studioflow_accounts a
    where a.user_id = p_owner_id
  ) then
    raise exception 'owner_workspace_not_found' using errcode = '42501';
  end if;

  if p_action = 'status' then
    select coalesce(
      jsonb_agg(
        jsonb_build_object('slug', w.slug, 'published_at', w.published_at)
        order by w.published_at desc
      ),
      '[]'::jsonb
    )
    into v_websites
    from public.studioflow_websites w
    where w.owner_id = p_owner_id
      and w.published_at is not null;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'website_slug', c.website_slug,
          'tawk_property_id', c.tawk_property_id,
          'tawk_widget_id', c.tawk_widget_id,
          'status', c.status
        )
      ),
      '[]'::jsonb
    )
    into v_connections
    from studioflow_tawk_private.widget_connections c
    where c.owner_id = p_owner_id;

    return jsonb_build_object('websites', v_websites, 'connections', v_connections);
  end if;

  if p_slug is null or not exists (
    select 1
    from public.studioflow_websites w
    where w.owner_id = p_owner_id
      and w.slug = p_slug
      and w.published_at is not null
  ) then
    raise exception 'published_website_not_owned' using errcode = '42501';
  end if;

  select *
  into v_existing
  from studioflow_tawk_private.widget_connections c
  where c.owner_id = p_owner_id
    and c.website_slug = p_slug
  limit 1;

  if p_action = 'disconnect' then
    update studioflow_tawk_private.widget_connections
    set status = 'inactive', updated_at = now()
    where owner_id = p_owner_id
      and website_slug = p_slug;

    return jsonb_build_object('disconnected', true);

  elsif p_action = 'connect' then
    if p_property_id is null
      or p_property_id !~ '^[A-Za-z0-9_-]{8,64}$'
      or p_widget_id is null
      or not (
        lower(p_widget_id) = 'default'
        or p_widget_id ~ '^[A-Za-z0-9_-]{8,64}$'
      )
    then
      raise exception 'invalid_tawk_ids' using errcode = '22023';
    end if;

    if v_existing.id is null then
      insert into studioflow_tawk_private.widget_connections (
        owner_id, website_slug, tawk_property_id, tawk_widget_id, status
      )
      values (
        p_owner_id, p_slug, p_property_id, p_widget_id, 'active'
      );
    else
      update studioflow_tawk_private.widget_connections
      set tawk_property_id = p_property_id,
          tawk_widget_id = p_widget_id,
          status = 'active',
          updated_at = now()
      where id = v_existing.id;
    end if;

    return jsonb_build_object('connected', true, 'websiteSlug', p_slug);
  end if;

  raise exception 'unknown_action' using errcode = '22023';
end;
$$;

revoke all on function public.studioflow_tawk_owner_connection(text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.studioflow_tawk_owner_connection(text, uuid, text, text, text)
  to service_role;
