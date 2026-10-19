-- Additive customer portal extension; existing salon, auth and booking tables stay shared.
create table public.studioflow_customer_addresses (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 label text not null check(length(btrim(label)) between 1 and 40),
 address_line text not null check(length(btrim(address_line)) between 5 and 500),
 city text not null check(length(btrim(city)) between 2 and 100),
 postal_code text not null default '' check(length(postal_code)<=12),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index studioflow_customer_addresses_owner_created on public.studioflow_customer_addresses(customer_id,created_at desc);
create table public.studioflow_customer_preferences (
 customer_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 theme text not null default 'light' check(theme in ('light','dark')),
 language text not null default 'en' check(language in ('en','hi')),
 updated_at timestamptz not null default now()
);
alter table public.studioflow_customer_addresses enable row level security;
alter table public.studioflow_customer_preferences enable row level security;
revoke all on public.studioflow_customer_addresses,public.studioflow_customer_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.studioflow_customer_addresses,public.studioflow_customer_preferences to authenticated;
grant all on public.studioflow_customer_addresses,public.studioflow_customer_preferences to service_role;
create policy customer_addresses_read on public.studioflow_customer_addresses for select to authenticated using(customer_id=(select auth.uid()));
create policy customer_addresses_insert on public.studioflow_customer_addresses for insert to authenticated with check(customer_id=(select auth.uid()));
create policy customer_addresses_update on public.studioflow_customer_addresses for update to authenticated using(customer_id=(select auth.uid())) with check(customer_id=(select auth.uid()));
create policy customer_addresses_delete on public.studioflow_customer_addresses for delete to authenticated using(customer_id=(select auth.uid()));
create policy customer_preferences_read on public.studioflow_customer_preferences for select to authenticated using(customer_id=(select auth.uid()));
create policy customer_preferences_insert on public.studioflow_customer_preferences for insert to authenticated with check(customer_id=(select auth.uid()));
create policy customer_preferences_update on public.studioflow_customer_preferences for update to authenticated using(customer_id=(select auth.uid())) with check(customer_id=(select auth.uid()));
create policy customer_preferences_delete on public.studioflow_customer_preferences for delete to authenticated using(customer_id=(select auth.uid()));

create or replace function public.studioflow_customer_catalog() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'templates',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.config->>'title','shortName',t.config->>'shortName','tagline',t.config->>'tagline','coverImageUrl',t.config->>'coverImageUrl','themePreset',t.config->>'themePreset','subCategories',coalesce(t.config->'subCategories','[]'::jsonb)) order by t.id),'[]'::jsonb) from public.studioflow_templates t where t.active),
 'salons',(select coalesce(jsonb_agg(jsonb_build_object('slug',w.slug,'owner_id',w.owner_id,'content',w.content) order by w.published_at desc),'[]'::jsonb) from public.studioflow_websites w where w.slug not like 'studioflow-qa-%')
 );
$$;
revoke all on function public.studioflow_customer_catalog() from public;
grant execute on function public.studioflow_customer_catalog() to anon,authenticated,service_role;

