-- =============================================================================
-- NEXORA SALONOS — landing-page database baseline
-- =============================================================================
-- Scope: public marketing landing page (nexorasalon.online/salon-os) and lead
--         capture only. This baseline deliberately does NOT create or touch
--         salon operational tables (appointments, customers, staff, billing,
--         inventory, payments, multi-branch).
--
-- Applied to: zilwgiuiygqqardzutxi ("NEW FINAL TEMLETE APP")
-- Reviewed against the live project before applying:
--   * public schema already contains 222 operational tables (salons, bookings,
--     staff, payments, growth partners, job portal, food app, website_content…).
--   * NONE of the twelve landing tables, the four enums or the four helper
--     functions existed before this migration, so nothing was reconciled away.
--   * The storage bucket `nexora-public-assets` did not exist before this
--     migration either.
--
-- Safety rules honoured by this file:
--   * No DROP / TRUNCATE / RESET of any existing object. Existing application
--     tables, policies, buckets and functions are untouched.
--   * Re-runnable: every object is created with an IF NOT EXISTS / OR REPLACE
--     guard, and policies/triggers are replaced deterministically.
--   * RLS is enabled on all twelve tables and privileges are granted
--     separately from the policies (least privilege).
--   * `landing_leads` is private: no anon access, no browser INSERT path.
--   * Permissions are read from the server-managed `app_metadata.site_role`
--     claim only — never from `user_metadata`.
--
-- Source specification: SUPABASE_DATABASE.md (sections 6, 7, 8, 9).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Types (guarded so the migration can run on a project that already has them)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'landing_lead_type'
  ) then
    create type public.landing_lead_type as enum (
      'demo_request',
      'contact_request',
      'pricing_question',
      'get_started'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'landing_lead_status'
  ) then
    create type public.landing_lead_status as enum (
      'new',
      'contacted',
      'qualified',
      'converted',
      'spam',
      'closed'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'landing_contact_preference'
  ) then
    create type public.landing_contact_preference as enum (
      'phone',
      'email',
      'whatsapp',
      'no_preference'
    );
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'feature_availability'
  ) then
    create type public.feature_availability as enum (
      'included',
      'not_included',
      'add_on',
      'custom'
    );
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 1. Helper functions
--    SECURITY INVOKER (default): they never widen access, they only read the
--    server-managed JWT claim that the Auth server signs into app_metadata.
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.is_content_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'site_role') in ('site_admin', 'content_editor'),
    false
  );
$$;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'site_role') = 'site_admin',
    false
  );
$$;

create or replace function public.can_manage_landing_leads()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'site_role') in ('site_admin', 'sales'),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  brand_name text not null default 'NEXORA SALONOS',
  brand_tagline text,
  hero_headline text,
  hero_subheadline text,
  primary_cta_label text default 'Get Started',
  secondary_cta_label text default 'Explore Features',
  contact_email text,
  contact_phone text,
  whatsapp_url text,
  support_url text,
  logo_path text,
  hero_image_path text,
  footer_description text,
  footer_copyright text,
  canonical_url text,
  meta_title text,
  meta_description text,
  og_image_path text,
  social_links jsonb not null default '{}'::jsonb
    check (jsonb_typeof(social_links) = 'object'),
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  eyebrow text,
  title text,
  subtitle text,
  body text,
  primary_cta_label text,
  primary_cta_href text,
  secondary_cta_label text,
  secondary_cta_href text,
  content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(section_key) between 2 and 80)
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  location text not null default 'header'
    check (location in ('header', 'footer', 'mobile')),
  label text not null,
  href text not null,
  open_new_tab boolean not null default false,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(label) between 1 and 80),
  check (length(href) between 1 and 500),
  check (lower(href) not like 'javascript:%')
);

create table if not exists public.business_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon_key text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.feature_categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  icon_key text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  name text not null,
  tagline text,
  description text,
  price_monthly numeric(12,2),
  price_yearly numeric(12,2),
  currency text not null default 'INR'
    check (currency ~ '^[A-Z]{3}$'),
  monthly_billing_label text,
  yearly_billing_label text,
  yearly_discount_label text,
  cta_label text not null default 'Get Started',
  cta_href text,
  is_recommended boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_monthly is null or price_monthly >= 0),
  check (price_yearly is null or price_yearly >= 0)
);

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.pricing_plans(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete restrict,
  availability public.feature_availability not null,
  quantity_limit numeric(12,2),
  limit_unit text,
  display_value text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, feature_id),
  check (quantity_limit is null or quantity_limit >= 0)
);

create table if not exists public.promotional_creatives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  description text,
  image_path text not null,
  image_alt text not null,
  cta_label text,
  cta_href text,
  share_targets text[] not null default '{}',
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(image_alt) between 5 and 300)
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  person_name text not null,
  business_name text,
  business_type text,
  role_label text,
  avatar_path text,
  rating numeric(2,1),
  source_label text,
  source_url text,
  permission_confirmed boolean not null default false,
  is_verified boolean not null default false,
  is_approved boolean not null default false,
  is_published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rating is null or (rating >= 1 and rating <= 5)),
  check (length(quote) between 10 and 3000)
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(question) between 5 and 300),
  check (length(answer) between 5 and 8000)
);

create table if not exists public.landing_leads (
  id uuid primary key default gen_random_uuid(),
  lead_type public.landing_lead_type not null,
  status public.landing_lead_status not null default 'new',
  full_name text not null,
  business_name text,
  business_type text,
  email text,
  phone text,
  city text,
  preferred_contact public.landing_contact_preference not null default 'no_preference',
  interested_plan_key text,
  message text,
  page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  consent_given boolean not null default false,
  consent_at timestamptz,
  privacy_notice_version text,
  assigned_to uuid references auth.users(id) on delete set null,
  last_contacted_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(full_name) between 2 and 120),
  check (email is not null or phone is not null),
  check (email is null or length(email) <= 254),
  check (phone is null or length(phone) <= 32),
  check (business_name is null or length(business_name) <= 160),
  check (city is null or length(city) <= 120),
  check (message is null or length(message) <= 5000),
  check (consent_given = true)
);

-- -----------------------------------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------------------------------
create index if not exists landing_sections_public_order_idx
  on public.landing_sections (sort_order, section_key)
  where is_published = true;

create index if not exists navigation_items_location_order_idx
  on public.navigation_items (location, sort_order)
  where is_visible = true;

create index if not exists business_categories_active_order_idx
  on public.business_categories (sort_order)
  where is_active = true;

create index if not exists features_category_order_idx
  on public.features (category_id, sort_order)
  where is_active = true;

create index if not exists pricing_plans_public_order_idx
  on public.pricing_plans (display_order)
  where is_active = true and is_published = true;

create index if not exists plan_features_plan_order_idx
  on public.plan_features (plan_id, sort_order);

create index if not exists promotional_creatives_public_order_idx
  on public.promotional_creatives (display_order)
  where is_published = true;

create index if not exists testimonials_public_order_idx
  on public.testimonials (display_order)
  where is_approved = true and is_published = true;

create index if not exists faqs_public_order_idx
  on public.faqs (sort_order)
  where is_published = true;

create index if not exists landing_leads_status_created_idx
  on public.landing_leads (status, created_at desc);

create index if not exists landing_leads_assigned_created_idx
  on public.landing_leads (assigned_to, created_at desc)
  where assigned_to is not null;

create index if not exists landing_leads_email_idx
  on public.landing_leads (lower(email))
  where email is not null;

-- -----------------------------------------------------------------------------
-- 4. Updated-at triggers
-- -----------------------------------------------------------------------------
drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();

drop trigger if exists landing_sections_touch_updated_at on public.landing_sections;
create trigger landing_sections_touch_updated_at
before update on public.landing_sections
for each row execute function public.touch_updated_at();

drop trigger if exists navigation_items_touch_updated_at on public.navigation_items;
create trigger navigation_items_touch_updated_at
before update on public.navigation_items
for each row execute function public.touch_updated_at();

drop trigger if exists business_categories_touch_updated_at on public.business_categories;
create trigger business_categories_touch_updated_at
before update on public.business_categories
for each row execute function public.touch_updated_at();

drop trigger if exists feature_categories_touch_updated_at on public.feature_categories;
create trigger feature_categories_touch_updated_at
before update on public.feature_categories
for each row execute function public.touch_updated_at();

drop trigger if exists features_touch_updated_at on public.features;
create trigger features_touch_updated_at
before update on public.features
for each row execute function public.touch_updated_at();

drop trigger if exists pricing_plans_touch_updated_at on public.pricing_plans;
create trigger pricing_plans_touch_updated_at
before update on public.pricing_plans
for each row execute function public.touch_updated_at();

drop trigger if exists plan_features_touch_updated_at on public.plan_features;
create trigger plan_features_touch_updated_at
before update on public.plan_features
for each row execute function public.touch_updated_at();

drop trigger if exists promotional_creatives_touch_updated_at on public.promotional_creatives;
create trigger promotional_creatives_touch_updated_at
before update on public.promotional_creatives
for each row execute function public.touch_updated_at();

drop trigger if exists testimonials_touch_updated_at on public.testimonials;
create trigger testimonials_touch_updated_at
before update on public.testimonials
for each row execute function public.touch_updated_at();

drop trigger if exists faqs_touch_updated_at on public.faqs;
create trigger faqs_touch_updated_at
before update on public.faqs
for each row execute function public.touch_updated_at();

drop trigger if exists landing_leads_touch_updated_at on public.landing_leads;
create trigger landing_leads_touch_updated_at
before update on public.landing_leads
for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.site_settings enable row level security;
alter table public.landing_sections enable row level security;
alter table public.navigation_items enable row level security;
alter table public.business_categories enable row level security;
alter table public.feature_categories enable row level security;
alter table public.features enable row level security;
alter table public.pricing_plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.promotional_creatives enable row level security;
alter table public.testimonials enable row level security;
alter table public.faqs enable row level security;
alter table public.landing_leads enable row level security;

-- -----------------------------------------------------------------------------
-- 6. Grants (least privilege; reviewed separately from the RLS policies)
-- -----------------------------------------------------------------------------
revoke all on table
  public.site_settings,
  public.landing_sections,
  public.navigation_items,
  public.business_categories,
  public.feature_categories,
  public.features,
  public.pricing_plans,
  public.plan_features,
  public.promotional_creatives,
  public.testimonials,
  public.faqs,
  public.landing_leads
from anon, authenticated;

-- Anonymous visitors read published marketing content only.
grant select on table
  public.site_settings,
  public.landing_sections,
  public.navigation_items,
  public.business_categories,
  public.feature_categories,
  public.features,
  public.pricing_plans,
  public.plan_features,
  public.promotional_creatives,
  public.testimonials,
  public.faqs
to anon;

-- Signed-in clients read the same published marketing content.
grant select on table
  public.site_settings,
  public.landing_sections,
  public.navigation_items,
  public.business_categories,
  public.feature_categories,
  public.features,
  public.pricing_plans,
  public.plan_features,
  public.promotional_creatives,
  public.testimonials,
  public.faqs
to authenticated;

-- Content management is further restricted by RLS + app_metadata claims.
grant insert, update, delete on table
  public.site_settings,
  public.landing_sections,
  public.navigation_items,
  public.business_categories,
  public.feature_categories,
  public.features,
  public.pricing_plans,
  public.plan_features,
  public.promotional_creatives,
  public.testimonials,
  public.faqs
to authenticated;

-- Leads: readable by authorised lead managers only; updates limited to the
-- workflow columns. There is deliberately NO anon or client INSERT grant —
-- the `submit-landing-lead` Edge Function inserts with a server-side client.
grant select on table public.landing_leads to authenticated;
grant update (status, assigned_to, last_contacted_at, admin_notes)
  on table public.landing_leads to authenticated;

-- The Edge Function's server-side client needs full access to the lead table.
grant insert, update, delete, select on table public.landing_leads to service_role;

-- Service-side client also needs to read the content it may publish from.
grant select on table
  public.site_settings,
  public.landing_sections,
  public.navigation_items,
  public.business_categories,
  public.feature_categories,
  public.features,
  public.pricing_plans,
  public.plan_features,
  public.promotional_creatives,
  public.testimonials,
  public.faqs
to service_role;

-- -----------------------------------------------------------------------------
-- 7. Policies
--    7.1 Public read (anon + authenticated)
-- -----------------------------------------------------------------------------
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read
on public.site_settings for select to anon, authenticated
using (is_published = true);

drop policy if exists landing_sections_public_read on public.landing_sections;
create policy landing_sections_public_read
on public.landing_sections for select to anon, authenticated
using (is_published = true);

drop policy if exists navigation_items_public_read on public.navigation_items;
create policy navigation_items_public_read
on public.navigation_items for select to anon, authenticated
using (is_visible = true);

drop policy if exists business_categories_public_read on public.business_categories;
create policy business_categories_public_read
on public.business_categories for select to anon, authenticated
using (is_active = true);

drop policy if exists feature_categories_public_read on public.feature_categories;
create policy feature_categories_public_read
on public.feature_categories for select to anon, authenticated
using (is_active = true);

drop policy if exists features_public_read on public.features;
create policy features_public_read
on public.features for select to anon, authenticated
using (is_active = true);

drop policy if exists pricing_plans_public_read on public.pricing_plans;
create policy pricing_plans_public_read
on public.pricing_plans for select to anon, authenticated
using (is_active = true and is_published = true);

drop policy if exists plan_features_public_read on public.plan_features;
create policy plan_features_public_read
on public.plan_features for select to anon, authenticated
using (
  exists (
    select 1
    from public.pricing_plans p
    join public.features f on f.id = plan_features.feature_id
    where p.id = plan_features.plan_id
      and p.is_active = true
      and p.is_published = true
      and f.is_active = true
  )
);

drop policy if exists promotional_creatives_public_read on public.promotional_creatives;
create policy promotional_creatives_public_read
on public.promotional_creatives for select to anon, authenticated
using (is_published = true);

drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read
on public.testimonials for select to anon, authenticated
using (
  is_approved = true
  and is_published = true
  and permission_confirmed = true
);

drop policy if exists faqs_public_read on public.faqs;
create policy faqs_public_read
on public.faqs for select to anon, authenticated
using (is_published = true);

-- 7.2 Content administration (site_admin / content_editor)
drop policy if exists site_settings_content_admin on public.site_settings;
create policy site_settings_content_admin
on public.site_settings for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists landing_sections_content_admin on public.landing_sections;
create policy landing_sections_content_admin
on public.landing_sections for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists navigation_items_content_admin on public.navigation_items;
create policy navigation_items_content_admin
on public.navigation_items for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists business_categories_content_admin on public.business_categories;
create policy business_categories_content_admin
on public.business_categories for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists feature_categories_content_admin on public.feature_categories;
create policy feature_categories_content_admin
on public.feature_categories for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists features_content_admin on public.features;
create policy features_content_admin
on public.features for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists pricing_plans_content_admin on public.pricing_plans;
create policy pricing_plans_content_admin
on public.pricing_plans for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists plan_features_content_admin on public.plan_features;
create policy plan_features_content_admin
on public.plan_features for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists promotional_creatives_content_admin on public.promotional_creatives;
create policy promotional_creatives_content_admin
on public.promotional_creatives for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists testimonials_content_admin on public.testimonials;
create policy testimonials_content_admin
on public.testimonials for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

drop policy if exists faqs_content_admin on public.faqs;
create policy faqs_content_admin
on public.faqs for all to authenticated
using ((select public.is_content_admin()))
with check ((select public.is_content_admin()));

-- 7.3 Lead privacy (site_admin / sales only)
drop policy if exists landing_leads_manager_read on public.landing_leads;
create policy landing_leads_manager_read
on public.landing_leads for select to authenticated
using ((select public.can_manage_landing_leads()));

drop policy if exists landing_leads_manager_update on public.landing_leads;
create policy landing_leads_manager_update
on public.landing_leads for update to authenticated
using ((select public.can_manage_landing_leads()))
with check ((select public.can_manage_landing_leads()));

-- There is intentionally NO anon INSERT/SELECT/UPDATE/DELETE policy on
-- public.landing_leads: browsers submit through the `submit-landing-lead`
-- Edge Function, which inserts with a server-side privileged client.

-- -----------------------------------------------------------------------------
-- 8. Helper function privileges
-- -----------------------------------------------------------------------------
revoke all on function public.is_content_admin() from public;
revoke all on function public.is_site_admin() from public;
revoke all on function public.can_manage_landing_leads() from public;

grant execute on function public.is_content_admin() to authenticated;
grant execute on function public.is_site_admin() to authenticated;
grant execute on function public.can_manage_landing_leads() to authenticated;
grant execute on function public.is_content_admin() to service_role;
grant execute on function public.is_site_admin() to service_role;
grant execute on function public.can_manage_landing_leads() to service_role;

-- Trigger functions are invoked by triggers; do not expose them as RPC endpoints.
revoke all on function public.touch_updated_at() from public;

-- -----------------------------------------------------------------------------
-- 9. Supabase Storage — public marketing assets only
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nexora-public-assets',
  'nexora-public-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

drop policy if exists nexora_public_assets_read on storage.objects;
create policy nexora_public_assets_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'nexora-public-assets');

drop policy if exists nexora_public_assets_admin_insert on storage.objects;
create policy nexora_public_assets_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'nexora-public-assets'
  and (select public.is_content_admin())
);

drop policy if exists nexora_public_assets_admin_update on storage.objects;
create policy nexora_public_assets_admin_update
on storage.objects for update to authenticated
using (
  bucket_id = 'nexora-public-assets'
  and (select public.is_content_admin())
)
with check (
  bucket_id = 'nexora-public-assets'
  and (select public.is_content_admin())
);

drop policy if exists nexora_public_assets_admin_delete on storage.objects;
create policy nexora_public_assets_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'nexora-public-assets'
  and (select public.is_content_admin())
);

-- -----------------------------------------------------------------------------
-- 10. Self-check: RLS must be enabled on all twelve landing tables
-- -----------------------------------------------------------------------------
do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ')
    into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'site_settings', 'landing_sections', 'navigation_items', 'business_categories',
      'feature_categories', 'features', 'pricing_plans', 'plan_features',
      'promotional_creatives', 'testimonials', 'faqs', 'landing_leads'
    )
    and not c.relrowsecurity;

  if missing is not null then
    raise exception 'Row Level Security is not enabled on: %', missing;
  end if;
end
$$;
