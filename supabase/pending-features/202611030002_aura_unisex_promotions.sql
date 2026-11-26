-- ============================================================================
-- TEMPLATE 03 — Aura Unisex Salon & Wellness Lounge
-- Promotions & Offers · Supabase mock data, admin management and coupon checkout
-- ============================================================================
-- Read this first:
--   * The database was inspected before writing this migration. The project
--     already has `public.salon_promotions` and `public.promotion_redemptions`
--     (202611020001_ziya_promotions_and_loyalty.sql) plus the shared booking
--     coupon cores (`studioflow_private.coupon_quote` / `coupon_book`). Those
--     tables and booking functions are REUSED, not duplicated. The
--     `create table if not exists` / `add column if not exists` guards below
--     make this migration safe on projects where the promotions tables have
--     not been created yet, without changing other templates' behaviour.
--   * Everything new is scoped to `businessType = 'unisex_salon'` (Template 03).
--     No other template's rows, services, copy or UI are touched.
--   * No secret keys are used, RLS is never disabled, and every write goes
--     through an authorisation check or a SECURITY DEFINER backend RPC.
--   * Apply after: studioflow-schema.sql, the shared booking migrations,
--     202611020001_ziya_promotions_and_loyalty.sql and
--     202611030001_aura_template03_content.sql.
-- ============================================================================

begin;

create schema if not exists studioflow_private;
revoke all on schema studioflow_private from public, anon;
grant usage on schema studioflow_private to authenticated;

-- ----------------------------------------------------------------------------
-- 1. Authorisation helpers (relational, never auth metadata)
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.aura_can_manage_salon(p_salon_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  allowed boolean := false;
begin
  if actor is null or p_salon_id is null then return false; end if;
  if p_salon_id = actor and exists (
    select 1 from public.studioflow_accounts a where a.user_id = actor
  ) then
    return true;
  end if;
  if to_regclass('public.studioflow_branch_staff_members') is not null then
    execute 'select exists(select 1 from public.studioflow_branch_staff_members m '
         || 'where m.site_id = $1 and m.user_id = $2 and m.is_active = true '
         || 'and m.role in (''manager'',''owner''))'
      into allowed using p_salon_id, actor;
    if allowed then return true; end if;
  end if;
  return false;
end;
$$;
revoke all on function studioflow_private.aura_can_manage_salon(uuid) from public, anon, authenticated;
grant execute on function studioflow_private.aura_can_manage_salon(uuid) to authenticated, service_role;

create or replace function studioflow_private.aura_is_template03_salon(p_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select a.draft->'profile'->>'businessType' = 'unisex_salon'
      from public.studioflow_accounts a
     where a.user_id = p_salon_id
  ), false);
$$;
revoke all on function studioflow_private.aura_is_template03_salon(uuid) from public, anon, authenticated;
grant execute on function studioflow_private.aura_is_template03_salon(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Reuse the existing promotions tables (create only when missing)
-- ----------------------------------------------------------------------------
create table if not exists public.salon_promotions (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 140),
  description text not null default '' check (char_length(description) <= 600),
  discount_type text not null check (discount_type in ('percentage', 'flat')),
  discount_value numeric(10,2) not null check (
    discount_value > 0 and (discount_type <> 'percentage' or discount_value <= 100)
  ),
  coupon_code text not null check (coupon_code ~ '^[A-Z0-9_-]{3,32}$'),
  min_booking_amount numeric(10,2) not null default 0 check (min_booking_amount >= 0),
  applicable_service_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(applicable_service_ids) = 'array'),
  starts_at date,
  ends_at date,
  max_total_uses integer check (max_total_uses is null or max_total_uses >= 1),
  max_uses_per_customer integer not null default 1 check (max_uses_per_customer >= 1),
  terms_conditions text not null default '' check (char_length(terms_conditions) <= 1000),
  banner_image_url text not null default '' check (char_length(banner_image_url) <= 2048),
  display_order integer not null default 0 check (display_order between -1000 and 10000),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  demo_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

-- Safe upgrades for an older promotions table that may predate these columns.
alter table public.salon_promotions add column if not exists description text not null default '';
alter table public.salon_promotions add column if not exists min_booking_amount numeric(10,2) not null default 0;
alter table public.salon_promotions add column if not exists applicable_service_ids jsonb not null default '[]'::jsonb;
alter table public.salon_promotions add column if not exists starts_at date;
alter table public.salon_promotions add column if not exists ends_at date;
alter table public.salon_promotions add column if not exists max_total_uses integer;
alter table public.salon_promotions add column if not exists max_uses_per_customer integer not null default 1;
alter table public.salon_promotions add column if not exists terms_conditions text not null default '';
alter table public.salon_promotions add column if not exists banner_image_url text not null default '';
alter table public.salon_promotions add column if not exists display_order integer not null default 0;
alter table public.salon_promotions add column if not exists is_active boolean not null default true;
alter table public.salon_promotions add column if not exists is_demo boolean not null default false;
alter table public.salon_promotions add column if not exists demo_approved boolean not null default false;
alter table public.salon_promotions add column if not exists created_at timestamptz not null default now();
alter table public.salon_promotions add column if not exists updated_at timestamptz not null default now();

create unique index if not exists salon_promotions_salon_code_uidx
  on public.salon_promotions (salon_id, upper(coupon_code));
create index if not exists salon_promotions_active_order_idx
  on public.salon_promotions (salon_id, is_active, display_order, created_at desc);

create or replace function studioflow_private.aura_normalize_promotion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.coupon_code := upper(btrim(coalesce(new.coupon_code, '')));
  new.title := btrim(coalesce(new.title, ''));
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function studioflow_private.aura_normalize_promotion() from public, anon, authenticated;

drop trigger if exists aura_promotions_normalize_trg on public.salon_promotions;
create trigger aura_promotions_normalize_trg
  before insert or update on public.salon_promotions
  for each row execute function studioflow_private.aura_normalize_promotion();

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid references public.salon_promotions(id) on delete set null,
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid unique references public.studioflow_bookings(id) on delete set null,
  request_id uuid not null,
  coupon_code text not null check (char_length(btrim(coupon_code)) between 3 and 32),
  original_amount numeric(10,2) not null check (original_amount >= 0),
  discount_amount numeric(10,2) not null check (discount_amount > 0),
  final_amount numeric(10,2) not null check (final_amount >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'applied', 'released')),
  redeemed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, request_id)
);

create index if not exists promotion_redemptions_promo_status_idx
  on public.promotion_redemptions (promotion_id, status);
create index if not exists promotion_redemptions_promo_customer_idx
  on public.promotion_redemptions (promotion_id, customer_id, status);
create index if not exists promotion_redemptions_salon_recent_idx
  on public.promotion_redemptions (salon_id, redeemed_at desc);

-- RLS: customers read ONLY active, in-date public offers. Only the salon owner
-- or an authorised manager can see inactive offers or write to the table.
alter table public.salon_promotions enable row level security;
alter table public.promotion_redemptions enable row level security;
revoke all on public.salon_promotions from public, anon, authenticated;
revoke all on public.promotion_redemptions from public, anon, authenticated;
grant select on public.salon_promotions to anon, authenticated;
grant insert, update, delete on public.salon_promotions to authenticated;
grant select on public.promotion_redemptions to authenticated;

drop policy if exists aura_promotions_public_active_read on public.salon_promotions;
create policy aura_promotions_public_active_read on public.salon_promotions
  for select to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= current_date)
    and (ends_at is null or ends_at >= current_date)
    and exists (
      select 1 from public.studioflow_websites w where w.owner_id = salon_promotions.salon_id
    )
  );

drop policy if exists aura_promotions_admin_read on public.salon_promotions;
create policy aura_promotions_admin_read on public.salon_promotions
  for select to authenticated
  using (studioflow_private.aura_can_manage_salon(salon_id));

drop policy if exists aura_promotions_admin_insert on public.salon_promotions;
create policy aura_promotions_admin_insert on public.salon_promotions
  for insert to authenticated
  with check (studioflow_private.aura_can_manage_salon(salon_id));

drop policy if exists aura_promotions_admin_update on public.salon_promotions;
create policy aura_promotions_admin_update on public.salon_promotions
  for update to authenticated
  using (studioflow_private.aura_can_manage_salon(salon_id))
  with check (studioflow_private.aura_can_manage_salon(salon_id));

drop policy if exists aura_promotions_admin_delete on public.salon_promotions;
create policy aura_promotions_admin_delete on public.salon_promotions
  for delete to authenticated
  using (studioflow_private.aura_can_manage_salon(salon_id));

-- Earlier migrations' public read policies call these stable SECURITY DEFINER
-- helpers. Allow anonymous visitors to evaluate them (they return false for an
-- anonymous actor) so a direct active-offer SELECT cannot fail with 42501.
do $$
begin
  if to_regprocedure('studioflow_private.can_view_salon_staff(uuid)') is not null then
    execute 'grant execute on function studioflow_private.can_view_salon_staff(uuid) to anon';
  end if;
  if to_regprocedure('studioflow_private.can_manage_salon(uuid)') is not null then
    execute 'grant execute on function studioflow_private.can_manage_salon(uuid) to anon';
  end if;
  execute 'grant execute on function studioflow_private.aura_can_manage_salon(uuid) to anon';
end;
$$;

drop policy if exists aura_promotion_holds_customer_read on public.promotion_redemptions;
create policy aura_promotion_holds_customer_read on public.promotion_redemptions
  for select to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists aura_promotion_holds_admin_read on public.promotion_redemptions;
create policy aura_promotion_holds_admin_read on public.promotion_redemptions
  for select to authenticated
  using (studioflow_private.aura_can_manage_salon(salon_id));

-- ----------------------------------------------------------------------------
-- 3. Confirmed-redemption ledger for Template 03.
--    A `reserved` hold in promotion_redemptions is NOT a redemption. A row is
--    written here ONLY after a booking is confirmed or completed. The unique
--    booking_id + (customer_id, request_id) keys make duplicate redemption for
--    the same booking impossible.
-- ----------------------------------------------------------------------------
create table if not exists public.aura_promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid references public.salon_promotions(id) on delete set null,
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null unique references public.studioflow_bookings(id) on delete cascade,
  request_id uuid not null,
  coupon_code text not null check (char_length(btrim(coupon_code)) between 3 and 32),
  original_amount numeric(10,2) not null check (original_amount >= 0),
  discount_amount numeric(10,2) not null check (discount_amount > 0),
  final_amount numeric(10,2) not null check (final_amount >= 0),
  status text not null default 'applied' check (status in ('applied', 'released')),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, request_id)
);

create index if not exists aura_promotion_redemptions_promo_idx
  on public.aura_promotion_redemptions (promotion_id, status);
create index if not exists aura_promotion_redemptions_customer_idx
  on public.aura_promotion_redemptions (promotion_id, customer_id, status);
create index if not exists aura_promotion_redemptions_salon_idx
  on public.aura_promotion_redemptions (salon_id, confirmed_at desc);

create or replace function studioflow_private.aura_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function studioflow_private.aura_touch_updated_at() from public, anon, authenticated;

drop trigger if exists aura_promotion_redemptions_touch_trg on public.aura_promotion_redemptions;
create trigger aura_promotion_redemptions_touch_trg
  before update on public.aura_promotion_redemptions
  for each row execute function studioflow_private.aura_touch_updated_at();

alter table public.aura_promotion_redemptions enable row level security;
revoke all on public.aura_promotion_redemptions from public, anon, authenticated;
grant select on public.aura_promotion_redemptions to authenticated;

drop policy if exists aura_redemptions_customer_read on public.aura_promotion_redemptions;
create policy aura_redemptions_customer_read on public.aura_promotion_redemptions
  for select to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists aura_redemptions_admin_read on public.aura_promotion_redemptions;
create policy aura_redemptions_admin_read on public.aura_promotion_redemptions
  for select to authenticated
  using (studioflow_private.aura_can_manage_salon(salon_id));

-- ----------------------------------------------------------------------------
-- 4. Idempotent Template 03 demo offers (AURA10 / STYLE200 / AURAMID15)
--    Service relationships are resolved from the salon's OWN existing service
--    IDs. No new services are ever created.
-- ----------------------------------------------------------------------------
create table if not exists studioflow_private.aura_promotion_seeds (
  salon_id uuid primary key references public.studioflow_accounts(user_id) on delete cascade,
  seeded_at timestamptz not null default now()
);
alter table studioflow_private.aura_promotion_seeds enable row level security;
revoke all on studioflow_private.aura_promotion_seeds from public, anon, authenticated;

create or replace function studioflow_private.aura_seed_demo_offers(
  p_salon_id uuid,
  p_force boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_catalog jsonb := '[]'::jsonb;
  v_all jsonb := '[]'::jsonb;
  v_hair jsonb := '[]'::jsonb;
  v_mid jsonb := '[]'::jsonb;
  v_seeded boolean := false;
begin
  if p_salon_id is null or not studioflow_private.aura_is_template03_salon(p_salon_id) then
    return;
  end if;

  select exists (
    select 1 from studioflow_private.aura_promotion_seeds s where s.salon_id = p_salon_id
  ) into v_seeded;
  if v_seeded and not p_force then return; end if;

  -- Published website content wins; otherwise the owner's saved draft menu.
  select coalesce(
    (select w.content->'services' from public.studioflow_websites w where w.owner_id = p_salon_id),
    (select a.draft->'services' from public.studioflow_accounts a where a.user_id = p_salon_id),
    '[]'::jsonb
  ) into v_catalog;
  if jsonb_typeof(v_catalog) is distinct from 'array' then v_catalog := '[]'::jsonb; end if;

  select coalesce(jsonb_agg(distinct s->>'id'), '[]'::jsonb)
    into v_all
    from jsonb_array_elements(v_catalog) s
   where coalesce(s->>'id', '') <> '';

  select coalesce(jsonb_agg(distinct s->>'id'), '[]'::jsonb)
    into v_hair
    from jsonb_array_elements(v_catalog) s
   where (s->>'id') in ('us-1', 'us-3', 'us-5', 'us-6', 'us-7', 'us-10');
  select coalesce(jsonb_agg(distinct s->>'id'), '[]'::jsonb)
    into v_mid
    from jsonb_array_elements(v_catalog) s
   where (s->>'id') in ('us-2', 'us-4', 'us-7', 'us-8', 'us-9', 'us-11');

  if jsonb_array_length(v_hair) = 0 then v_hair := v_all; end if;
  if jsonb_array_length(v_mid) = 0 then v_mid := v_all; end if;

  insert into public.salon_promotions (
    salon_id, title, description, discount_type, discount_value, coupon_code,
    min_booking_amount, applicable_service_ids, starts_at, ends_at,
    max_total_uses, max_uses_per_customer, terms_conditions, banner_image_url,
    display_order, is_active, is_demo, demo_approved
  ) values
  (
    p_salon_id,
    'Welcome to Aura',
    'Special welcome discount for your first salon visit.',
    'percentage',
    10,
    'AURA10',
    0,
    v_all,
    current_date - 7,
    current_date + 180,
    500,
    1,
    'Demo Offer — 10% off your first visit at Aura. Valid on the existing services listed with this offer. One use per customer, subject to the total usage limit. Cannot be combined with another coupon. The salon admin can edit, deactivate or approve this sample offer any time.',
    '/templates/aura-unisex/service-haircut-760.webp',
    1,
    true,
    true,
    false
  ),
  (
    p_salon_id,
    'Hair Style Special',
    'Enjoy a special discount on selected existing hair services.',
    'flat',
    200,
    'STYLE200',
    500,
    v_hair,
    current_date - 7,
    current_date + 180,
    300,
    1,
    'Demo Offer — flat ₹200 off on selected existing hair services when the booking total is ₹500 or more. One use per customer. Cannot be combined with another coupon. The salon admin can edit, deactivate or approve this sample offer any time.',
    '/templates/aura-unisex/service-styling-760.webp',
    2,
    true,
    true,
    false
  ),
  (
    p_salon_id,
    'Midweek Salon Offer',
    'A special offer on eligible existing salon services.',
    'percentage',
    15,
    'AURAMID15',
    600,
    v_mid,
    current_date - 7,
    current_date + 180,
    400,
    1,
    'Demo Offer — 15% off eligible existing salon services on midweek bookings of ₹600 or more. One use per customer. Cannot be combined with another coupon. The salon admin can edit, deactivate or approve this sample offer any time.',
    '/templates/aura-unisex/wellness-640.webp',
    3,
    true,
    true,
    false
  )
  on conflict (salon_id, upper(coupon_code)) do nothing;

  insert into studioflow_private.aura_promotion_seeds (salon_id, seeded_at)
  values (p_salon_id, now())
  on conflict (salon_id) do update set seeded_at = excluded.seeded_at;
end;
$$;
revoke all on function studioflow_private.aura_seed_demo_offers(uuid, boolean) from public, anon, authenticated;

create or replace function studioflow_private.aura_auto_seed_on_account_save()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.draft->'profile'->>'businessType', '') = 'unisex_salon' then
    perform studioflow_private.aura_seed_demo_offers(new.user_id, false);
  end if;
  return new;
end;
$$;
revoke all on function studioflow_private.aura_auto_seed_on_account_save() from public, anon, authenticated;

drop trigger if exists aura_promotions_account_seed_trg on public.studioflow_accounts;
create trigger aura_promotions_account_seed_trg
  after insert or update of draft on public.studioflow_accounts
  for each row execute function studioflow_private.aura_auto_seed_on_account_save();

-- Backfill salons that already chose Template 03.
do $$
declare rec record;
begin
  for rec in
    select a.user_id
      from public.studioflow_accounts a
     where coalesce(a.draft->'profile'->>'businessType', '') = 'unisex_salon'
  loop
    perform studioflow_private.aura_seed_demo_offers(rec.user_id, false);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Public (customer website) RPC — active, in-date offers only
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.aura_public_offers(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.studioflow_websites;
  v_offers jsonb := '[]'::jsonb;
begin
  if coalesce(btrim(p_slug), '') = '' then
    return jsonb_build_object('found', false, 'templateId', 'unisex_salon', 'offers', '[]'::jsonb);
  end if;

  select * into w from public.studioflow_websites where slug = lower(btrim(p_slug));
  if w.owner_id is null or not studioflow_private.aura_is_template03_salon(w.owner_id) then
    return jsonb_build_object('found', false, 'templateId', 'unisex_salon', 'offers', '[]'::jsonb);
  end if;

  perform studioflow_private.aura_seed_demo_offers(w.owner_id, false);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sp.id,
        'title', sp.title,
        'description', sp.description,
        'discountType', sp.discount_type,
        'discountValue', sp.discount_value,
        'couponCode', sp.coupon_code,
        'minBookingAmount', sp.min_booking_amount,
        'applicableServiceIds', sp.applicable_service_ids,
        'startsAt', sp.starts_at,
        'endsAt', sp.ends_at,
        'maxTotalUses', sp.max_total_uses,
        'maxUsesPerCustomer', sp.max_uses_per_customer,
        'termsConditions', sp.terms_conditions,
        'bannerImageUrl', sp.banner_image_url,
        'displayOrder', sp.display_order,
        'isDemo', (sp.is_demo and not sp.demo_approved),
        'isActive', sp.is_active,
        'usedCount', (
          select count(*)::int
            from public.promotion_redemptions r
           where r.promotion_id = sp.id and r.status in ('reserved', 'applied')
        )
      )
      order by sp.display_order asc, sp.created_at asc
    ),
    '[]'::jsonb
  )
  into v_offers
  from public.salon_promotions sp
  where sp.salon_id = w.owner_id
    and sp.is_active = true
    and (sp.starts_at is null or sp.starts_at <= current_date)
    and (sp.ends_at is null or sp.ends_at >= current_date)
    and (
      sp.max_total_uses is null
      or (
        select count(*) from public.promotion_redemptions r
         where r.promotion_id = sp.id and r.status in ('reserved', 'applied')
      ) < sp.max_total_uses
    );

  return jsonb_build_object(
    'found', true,
    'templateId', 'unisex_salon',
    'slug', w.slug,
    'salonId', w.owner_id,
    'offers', v_offers
  );
end;
$$;
revoke all on function studioflow_private.aura_public_offers(text) from public, anon, authenticated;

create or replace function public.studioflow_aura_public_offers(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select studioflow_private.aura_public_offers(p_slug);
$$;
revoke all on function public.studioflow_aura_public_offers(text) from public, anon, authenticated;
grant execute on function public.studioflow_aura_public_offers(text) to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. Salon admin RPCs — read, add/edit, delete, activate/deactivate, approve,
--    restore demos. Every one checks `aura_can_manage_salon`.
-- ----------------------------------------------------------------------------
create or replace function public.studioflow_aura_admin_offers(p_salon_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
  v_offers jsonb := '[]'::jsonb;
  v_redemptions jsonb := '[]'::jsonb;
  v_services jsonb := '[]'::jsonb;
  v_catalog jsonb := '[]'::jsonb;
begin
  if not studioflow_private.aura_can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorisation required' using errcode = '42501';
  end if;
  if not studioflow_private.aura_is_template03_salon(v_salon) then
    raise exception 'Promotions & Offers management is available for Template 03 (Aura Unisex Salon) only';
  end if;

  perform studioflow_private.aura_seed_demo_offers(v_salon, false);

  select coalesce(
    (select w.content->'services' from public.studioflow_websites w where w.owner_id = v_salon),
    (select a.draft->'services' from public.studioflow_accounts a where a.user_id = v_salon),
    '[]'::jsonb
  ) into v_catalog;
  if jsonb_typeof(v_catalog) is distinct from 'array' then v_catalog := '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', s->>'id', 'name', s->>'name', 'price', (s->>'price')::numeric, 'category', s->>'category') order by s->>'name'), '[]'::jsonb)
    into v_services
    from jsonb_array_elements(v_catalog) s
   where coalesce(s->>'id', '') <> '';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sp.id,
        'title', sp.title,
        'description', sp.description,
        'discountType', sp.discount_type,
        'discountValue', sp.discount_value,
        'couponCode', sp.coupon_code,
        'minBookingAmount', sp.min_booking_amount,
        'applicableServiceIds', sp.applicable_service_ids,
        'startsAt', sp.starts_at,
        'endsAt', sp.ends_at,
        'maxTotalUses', sp.max_total_uses,
        'maxUsesPerCustomer', sp.max_uses_per_customer,
        'termsConditions', sp.terms_conditions,
        'bannerImageUrl', sp.banner_image_url,
        'displayOrder', sp.display_order,
        'isActive', sp.is_active,
        'isDemo', sp.is_demo,
        'demoApproved', sp.demo_approved,
        'isDemoOffer', (sp.is_demo and not sp.demo_approved),
        'usedCount', (
          select count(*)::int from public.promotion_redemptions r
           where r.promotion_id = sp.id and r.status in ('reserved', 'applied')
        ),
        'confirmedRedemptions', (
          select count(*)::int from public.aura_promotion_redemptions r
           where r.promotion_id = sp.id and r.status = 'applied'
        ),
        'createdAt', sp.created_at,
        'updatedAt', sp.updated_at
      )
      order by sp.display_order asc, sp.created_at desc
    ),
    '[]'::jsonb
  )
  into v_offers
  from public.salon_promotions sp
  where sp.salon_id = v_salon;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'promotionId', r.promotion_id,
        'customerId', r.customer_id,
        'bookingId', r.booking_id,
        'couponCode', r.coupon_code,
        'originalAmount', r.original_amount,
        'discountAmount', r.discount_amount,
        'finalAmount', r.final_amount,
        'status', r.status,
        'confirmedAt', r.confirmed_at
      )
      order by r.confirmed_at desc
    ),
    '[]'::jsonb
  )
  into v_redemptions
  from (
    select * from public.aura_promotion_redemptions
     where salon_id = v_salon
     order by confirmed_at desc
     limit 50
  ) r;

  return jsonb_build_object(
    'found', true,
    'templateId', 'unisex_salon',
    'salonId', v_salon,
    'canManage', true,
    'offers', v_offers,
    'services', v_services,
    'redemptions', v_redemptions
  );
end;
$$;
revoke all on function public.studioflow_aura_admin_offers(uuid) from public, anon, authenticated;
grant execute on function public.studioflow_aura_admin_offers(uuid) to authenticated, service_role;

create or replace function public.studioflow_aura_admin_save_offer(
  p_payload jsonb,
  p_salon_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
  v_id uuid := nullif(btrim(coalesce(p_payload->>'id', '')), '')::uuid;
  v_title text := btrim(coalesce(p_payload->>'title', ''));
  v_desc text := left(btrim(coalesce(p_payload->>'description', '')), 600);
  v_type text := lower(btrim(coalesce(p_payload->>'discountType', 'percentage')));
  v_value numeric := nullif(btrim(coalesce(p_payload->>'discountValue', '')), '')::numeric;
  v_code text := upper(regexp_replace(btrim(coalesce(p_payload->>'couponCode', '')), '[^A-Za-z0-9_-]', '', 'g'));
  v_min numeric := greatest(0, coalesce(nullif(btrim(coalesce(p_payload->>'minBookingAmount', '')), '')::numeric, 0));
  v_services jsonb := '[]'::jsonb;
  v_starts date := nullif(btrim(coalesce(p_payload->>'startsAt', '')), '')::date;
  v_ends date := nullif(btrim(coalesce(p_payload->>'endsAt', '')), '')::date;
  v_max_total integer := nullif(btrim(coalesce(p_payload->>'maxTotalUses', '')), '')::integer;
  v_max_cust integer := greatest(1, coalesce(nullif(btrim(coalesce(p_payload->>'maxUsesPerCustomer', '')), '')::integer, 1));
  v_terms text := left(btrim(coalesce(p_payload->>'termsConditions', '')), 1000);
  v_banner text := left(btrim(coalesce(p_payload->>'bannerImageUrl', '')), 2048);
  v_order integer := coalesce(nullif(btrim(coalesce(p_payload->>'displayOrder', '')), '')::integer, 0);
  v_active boolean := coalesce((p_payload->>'isActive')::boolean, true);
  v_demo_approved boolean := coalesce((p_payload->>'demoApproved')::boolean, true);
  v_catalog jsonb := '[]'::jsonb;
  v_saved public.salon_promotions;
begin
  if not studioflow_private.aura_can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorisation required' using errcode = '42501';
  end if;
  if not studioflow_private.aura_is_template03_salon(v_salon) then
    raise exception 'Promotions & Offers management is available for Template 03 (Aura Unisex Salon) only';
  end if;
  if char_length(v_title) not between 2 and 140 then
    raise exception 'Offer title must be between 2 and 140 characters';
  end if;
  if v_type not in ('percentage', 'flat') then
    raise exception 'Discount type must be percentage or flat';
  end if;
  if v_value is null or v_value <= 0 or (v_type = 'percentage' and v_value > 100) then
    raise exception 'Enter a valid discount value (1–100 for percentage)';
  end if;
  if v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'Coupon code must be 3–32 uppercase letters, numbers, hyphens or underscores';
  end if;
  if v_starts is not null and v_ends is not null and v_ends < v_starts then
    raise exception 'Expiry date must be on or after the start date';
  end if;
  if v_min < 0 or v_min > 1000000 then raise exception 'Enter a valid minimum booking amount'; end if;
  if v_max_total is not null and (v_max_total < 1 or v_max_total > 1000000) then
    raise exception 'Usage limit must be at least 1';
  end if;
  if v_max_cust < 1 or v_max_cust > 1000 then
    raise exception 'Per-customer usage limit must be between 1 and 1000';
  end if;
  if v_order < -1000 or v_order > 10000 then raise exception 'Display order is out of range'; end if;
  if v_banner <> '' and v_banner !~ '^(https://|/)' then
    raise exception 'Offer image must be an https URL or a site-relative /path';
  end if;
  if v_banner ~* '(javascript:|data:|<\s*script)' then
    raise exception 'Offer image URL is not safe';
  end if;

  select coalesce(
    (select w.content->'services' from public.studioflow_websites w where w.owner_id = v_salon),
    (select a.draft->'services' from public.studioflow_accounts a where a.user_id = v_salon),
    '[]'::jsonb
  ) into v_catalog;
  if jsonb_typeof(v_catalog) is distinct from 'array' then v_catalog := '[]'::jsonb; end if;

  if jsonb_typeof(p_payload->'applicableServiceIds') = 'array' then
    select coalesce(jsonb_agg(distinct sid), '[]'::jsonb)
      into v_services
      from (
        select value #>> '{}' as sid
          from jsonb_array_elements(p_payload->'applicableServiceIds')
      ) x
     where sid is not null and sid <> '' and char_length(sid) <= 120;
  end if;
  -- Only EXISTING service IDs may be attached to an offer.
  if jsonb_array_length(v_services) > 0 and jsonb_array_length(v_catalog) > 0
     and exists (
       select 1 from jsonb_array_elements_text(v_services) sid
        where not exists (
          select 1 from jsonb_array_elements(v_catalog) c where c->>'id' = sid
        )
     ) then
    raise exception 'Choose only services that already exist in this salon menu';
  end if;

  if exists (
    select 1 from public.salon_promotions sp
     where sp.salon_id = v_salon
       and upper(sp.coupon_code) = v_code
       and (v_id is null or sp.id <> v_id)
  ) then
    raise exception 'Another offer already uses coupon code %', v_code;
  end if;

  if v_id is not null then
    update public.salon_promotions
       set title = v_title,
           description = v_desc,
           discount_type = v_type,
           discount_value = v_value,
           coupon_code = v_code,
           min_booking_amount = v_min,
           applicable_service_ids = v_services,
           starts_at = v_starts,
           ends_at = v_ends,
           max_total_uses = v_max_total,
           max_uses_per_customer = v_max_cust,
           terms_conditions = v_terms,
           banner_image_url = v_banner,
           display_order = v_order,
           is_active = v_active,
           demo_approved = v_demo_approved
     where id = v_id and salon_id = v_salon
     returning * into v_saved;
    if v_saved.id is null then raise exception 'Offer not found for this salon'; end if;
  else
    insert into public.salon_promotions (
      salon_id, title, description, discount_type, discount_value, coupon_code,
      min_booking_amount, applicable_service_ids, starts_at, ends_at,
      max_total_uses, max_uses_per_customer, terms_conditions, banner_image_url,
      display_order, is_active, is_demo, demo_approved
    ) values (
      v_salon, v_title, v_desc, v_type, v_value, v_code,
      v_min, v_services, v_starts, v_ends,
      v_max_total, v_max_cust, v_terms, v_banner,
      v_order, v_active, false, true
    ) returning * into v_saved;
  end if;

  return jsonb_build_object(
    'id', v_saved.id,
    'couponCode', v_saved.coupon_code,
    'isActive', v_saved.is_active,
    'isDemoOffer', (v_saved.is_demo and not v_saved.demo_approved)
  );
end;
$$;
revoke all on function public.studioflow_aura_admin_save_offer(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_aura_admin_save_offer(jsonb, uuid) to authenticated, service_role;

create or replace function public.studioflow_aura_admin_delete_offer(
  p_offer_id uuid,
  p_salon_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
  v_deleted uuid;
begin
  if not studioflow_private.aura_can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorisation required' using errcode = '42501';
  end if;
  delete from public.salon_promotions
   where id = p_offer_id and salon_id = v_salon
   returning id into v_deleted;
  if v_deleted is null then raise exception 'Offer not found for this salon'; end if;
  return jsonb_build_object('deletedId', v_deleted);
end;
$$;
revoke all on function public.studioflow_aura_admin_delete_offer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_aura_admin_delete_offer(uuid, uuid) to authenticated, service_role;

create or replace function public.studioflow_aura_admin_toggle_offer(
  p_offer_id uuid,
  p_is_active boolean,
  p_salon_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
  v_saved public.salon_promotions;
begin
  if not studioflow_private.aura_can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorisation required' using errcode = '42501';
  end if;
  if p_is_active is null then raise exception 'Active status is required'; end if;
  update public.salon_promotions
     set is_active = p_is_active
   where id = p_offer_id and salon_id = v_salon
   returning * into v_saved;
  if v_saved.id is null then raise exception 'Offer not found for this salon'; end if;
  return jsonb_build_object('id', v_saved.id, 'isActive', v_saved.is_active);
end;
$$;
revoke all on function public.studioflow_aura_admin_toggle_offer(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_aura_admin_toggle_offer(uuid, boolean, uuid) to authenticated, service_role;

create or replace function public.studioflow_aura_admin_approve_demo(
  p_offer_id uuid,
  p_salon_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
  v_saved public.salon_promotions;
begin
  if not studioflow_private.aura_can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorisation required' using errcode = '42501';
  end if;
  update public.salon_promotions
     set demo_approved = true
   where id = p_offer_id and salon_id = v_salon and is_demo = true
   returning * into v_saved;
  if v_saved.id is null then raise exception 'Demo offer not found for this salon'; end if;
  return jsonb_build_object('id', v_saved.id, 'demoApproved', v_saved.demo_approved, 'isDemoOffer', false);
end;
$$;
revoke all on function public.studioflow_aura_admin_approve_demo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_aura_admin_approve_demo(uuid, uuid) to authenticated, service_role;

create or replace function public.studioflow_aura_admin_restore_demos(p_salon_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
  v_count integer;
begin
  if not studioflow_private.aura_can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorisation required' using errcode = '42501';
  end if;
  if not studioflow_private.aura_is_template03_salon(v_salon) then
    raise exception 'Promotions & Offers management is available for Template 03 (Aura Unisex Salon) only';
  end if;
  perform studioflow_private.aura_seed_demo_offers(v_salon, true);
  select count(*)::int into v_count
    from public.salon_promotions
   where salon_id = v_salon and is_demo = true and coupon_code in ('AURA10', 'STYLE200', 'AURAMID15');
  return jsonb_build_object('restored', v_count);
end;
$$;
revoke all on function public.studioflow_aura_admin_restore_demos(uuid) from public, anon, authenticated;
grant execute on function public.studioflow_aura_admin_restore_demos(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. Secure coupon validation for the existing booking flow.
--    Prices and discount rules are read from the DATABASE. No browser-supplied
--    discount value is ever used. Checks: exists / active / dates / minimum
--    booking amount / eligible service / total usage / per-customer usage.
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.aura_coupon_quote(
  p_slug text,
  p_services jsonb,
  p_code text,
  p_booking uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  w public.studioflow_websites;
  p public.salon_promotions;
  v_catalog jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_eligible numeric := 0;
  v_discount numeric := 0;
  v_count integer := 0;
  v_filter boolean := false;
  v_total_used integer := 0;
  v_customer_used integer := 0;
begin
  if actor is null then
    raise exception 'Sign in to apply a coupon code' using errcode = '42501';
  end if;
  if v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'Enter a valid coupon code';
  end if;
  if jsonb_typeof(p_services) is distinct from 'array'
     or jsonb_array_length(p_services) not between 1 and 10
     or (select count(distinct value) from jsonb_array_elements_text(p_services)) <> jsonb_array_length(p_services) then
    raise exception 'Choose valid, distinct services';
  end if;

  select * into w from public.studioflow_websites where slug = lower(btrim(coalesce(p_slug, '')));
  if w.owner_id is null or not studioflow_private.aura_is_template03_salon(w.owner_id) then
    raise exception 'Aura salon website is unavailable';
  end if;
  perform studioflow_private.aura_seed_demo_offers(w.owner_id, false);

  v_catalog := coalesce(w.content->'services', '[]'::jsonb);
  if jsonb_typeof(v_catalog) is distinct from 'array' or jsonb_array_length(v_catalog) = 0 then
    select coalesce(a.draft->'services', '[]'::jsonb) into v_catalog
      from public.studioflow_accounts a where a.user_id = w.owner_id;
  end if;
  if jsonb_typeof(v_catalog) is distinct from 'array' then v_catalog := '[]'::jsonb; end if;

  -- 1. Coupon exists for this salon.
  select * into p
    from public.salon_promotions sp
   where sp.salon_id = w.owner_id and upper(sp.coupon_code) = v_code;
  if p.id is null then
    raise exception 'Coupon not found for this salon';
  end if;
  -- 2. Active.
  if not p.is_active then
    raise exception 'This coupon code is currently inactive';
  end if;
  -- 3. Validity dates.
  if p.starts_at is not null and p.starts_at > current_date then
    raise exception 'This promotion has not started yet';
  end if;
  if p.ends_at is not null and p.ends_at < current_date then
    raise exception 'Coupon has expired';
  end if;

  -- 4/5. Minimum booking amount and eligible service (prices from DB).
  v_filter := jsonb_typeof(p.applicable_service_ids) = 'array'
              and jsonb_array_length(p.applicable_service_ids) > 0;
  select count(*),
         coalesce(sum((s->>'price')::numeric), 0),
         coalesce(sum((s->>'price')::numeric) filter (
           where not v_filter or p.applicable_service_ids ? (s->>'id')
         ), 0)
    into v_count, v_subtotal, v_eligible
    from jsonb_array_elements(v_catalog) s
   where p_services ? (s->>'id');
  if v_count <> jsonb_array_length(p_services) then
    raise exception 'A selected service is unavailable';
  end if;
  if v_subtotal < p.min_booking_amount then
    raise exception 'Minimum booking amount of ₹% is required for coupon %',
      trim(to_char(p.min_booking_amount, 'FM999999990.00')), p.coupon_code;
  end if;
  if v_eligible <= 0 then
    raise exception 'Coupon % is not applicable to the selected services', p.coupon_code;
  end if;

  -- 6/7. Total and per-customer redemption limits. Holds on unconfirmed
  -- bookings count, so two customers cannot spend the last use at once.
  select count(*)::int into v_total_used
    from (
      select r.booking_id, r.status
        from public.promotion_redemptions r
        left join public.studioflow_bookings b on b.id = r.booking_id
       where r.promotion_id = p.id
         and (p_booking is null or r.booking_id is distinct from p_booking)
         and (
           r.status = 'applied'
           or (r.status = 'reserved' and (
             b.id is null or b.status in ('confirmed', 'completed')
             or (b.status = 'pending' and (b.hold_expires_at is null or b.hold_expires_at > now()))
           ))
         )
      union
      select ar.booking_id, 'applied'::text
        from public.aura_promotion_redemptions ar
       where ar.promotion_id = p.id
         and ar.status = 'applied'
         and (p_booking is null or ar.booking_id is distinct from p_booking)
         and not exists (
           select 1 from public.promotion_redemptions h where h.booking_id = ar.booking_id
         )
    ) u;
  if p.max_total_uses is not null and v_total_used >= p.max_total_uses then
    raise exception 'This promotion has reached its maximum usage limit';
  end if;

  select count(*)::int into v_customer_used
    from (
      select r.booking_id, r.status
        from public.promotion_redemptions r
        left join public.studioflow_bookings b on b.id = r.booking_id
       where r.promotion_id = p.id
         and r.customer_id = actor
         and (p_booking is null or r.booking_id is distinct from p_booking)
         and (
           r.status = 'applied'
           or (r.status = 'reserved' and (
             b.id is null or b.status in ('confirmed', 'completed')
             or (b.status = 'pending' and (b.hold_expires_at is null or b.hold_expires_at > now()))
           ))
         )
      union
      select ar.booking_id, 'applied'::text
        from public.aura_promotion_redemptions ar
       where ar.promotion_id = p.id
         and ar.customer_id = actor
         and ar.status = 'applied'
         and (p_booking is null or ar.booking_id is distinct from p_booking)
         and not exists (
           select 1 from public.promotion_redemptions h where h.booking_id = ar.booking_id
         )
    ) u;
  if v_customer_used >= p.max_uses_per_customer then
    raise exception 'You have already used this coupon code the maximum number of times';
  end if;

  -- 8. Discount is computed ONLY from the stored rules and stored prices.
  if p.discount_type = 'percentage' then
    v_discount := round(v_eligible * p.discount_value / 100.0, 2);
  else
    v_discount := least(v_eligible, round(p.discount_value, 2));
  end if;
  v_discount := least(greatest(v_discount, 0), v_subtotal);
  if v_discount <= 0 or v_subtotal - v_discount < 4 then
    raise exception 'Discounted total is too low for online booking. Choose an eligible service.';
  end if;

  return jsonb_build_object(
    'claimId', p.id,
    'promotionId', p.id,
    'couponKind', 'aura_promotion',
    'isDemo', (p.is_demo and not p.demo_approved),
    'code', p.coupon_code,
    'title', p.title,
    'termsConditions', p.terms_conditions,
    'originalPrice', v_subtotal,
    'discountAmount', v_discount,
    'finalPrice', v_subtotal - v_discount,
    'advanceAmount', ceil((v_subtotal - v_discount) * 100 / 4) / 100
  );
end;
$$;
revoke all on function studioflow_private.aura_coupon_quote(text, jsonb, text, uuid) from public, anon, authenticated;

create or replace function public.studioflow_aura_coupon_quote(
  p_slug text,
  p_services jsonb,
  p_code text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select studioflow_private.aura_coupon_quote(p_slug, p_services, p_code);
$$;
revoke all on function public.studioflow_aura_coupon_quote(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.studioflow_aura_coupon_quote(text, jsonb, text) to authenticated, service_role;

-- Booking wrapper: strips every browser-supplied price/discount field and
-- delegates to the existing, atomic booking core. The core re-quotes on the
-- server, so a tampered `couponExpectedTotal` is rejected.
create or replace function public.studioflow_aura_coupon_book(p_slug text, p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean jsonb;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to book' using errcode = '42501';
  end if;
  if jsonb_typeof(p_request) is distinct from 'object' then
    raise exception 'Invalid booking request';
  end if;
  select w.owner_id into v_owner
    from public.studioflow_websites w
   where w.slug = lower(btrim(coalesce(p_slug, '')));
  if v_owner is null or not studioflow_private.aura_is_template03_salon(v_owner) then
    raise exception 'Aura salon website is unavailable';
  end if;
  v_clean := p_request
    - 'discountAmount' - 'discountValue' - 'finalPrice' - 'finalAmount'
    - 'originalPrice' - 'originalAmount' - 'coupon' - 'couponQuote'
    - 'servicePrice' - 'price' - 'amount' - 'isDemo';
  return studioflow_private.coupon_book(p_slug, v_clean);
end;
$$;
revoke all on function public.studioflow_aura_coupon_book(text, jsonb) from public, anon, authenticated;
grant execute on function public.studioflow_aura_coupon_book(text, jsonb) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 8. Redemption is written ONLY after a booking is confirmed/completed.
--    Amounts are recomputed from the database, never from the browser payload.
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.aura_booking_amounts(
  p_owner_id uuid,
  p_payload jsonb,
  p_promo public.salon_promotions
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_catalog jsonb := '[]'::jsonb;
  v_ids text[];
  v_subtotal numeric := 0;
  v_eligible numeric := 0;
  v_discount numeric := 0;
  v_filter boolean := false;
begin
  select coalesce(w.content->'services', '[]'::jsonb) into v_catalog
    from public.studioflow_websites w where w.owner_id = p_owner_id;
  if jsonb_typeof(v_catalog) is distinct from 'array' or jsonb_array_length(v_catalog) = 0 then
    select coalesce(a.draft->'services', '[]'::jsonb) into v_catalog
      from public.studioflow_accounts a where a.user_id = p_owner_id;
  end if;
  if jsonb_typeof(v_catalog) is distinct from 'array' then v_catalog := '[]'::jsonb; end if;

  select array_agg(distinct sid) into v_ids from (
    select coalesce(e->>'id', trim(both '"' from e::text)) as sid
      from jsonb_array_elements(
        case when jsonb_typeof(p_payload->'serviceItems') = 'array'
             then p_payload->'serviceItems' else '[]'::jsonb end
      ) e
    union all
    select p_payload->>'serviceId'
  ) s where sid is not null and sid <> '';

  v_filter := jsonb_typeof(p_promo.applicable_service_ids) = 'array'
              and jsonb_array_length(p_promo.applicable_service_ids) > 0;
  select coalesce(sum((s->>'price')::numeric), 0),
         coalesce(sum((s->>'price')::numeric) filter (
           where not v_filter or p_promo.applicable_service_ids ? (s->>'id')
         ), 0)
    into v_subtotal, v_eligible
    from jsonb_array_elements(v_catalog) s
   where s->>'id' = any(v_ids);

  if p_promo.discount_type = 'percentage' then
    v_discount := round(v_eligible * p_promo.discount_value / 100.0, 2);
  else
    v_discount := least(v_eligible, round(p_promo.discount_value, 2));
  end if;
  v_discount := least(greatest(v_discount, 0), v_subtotal);
  return jsonb_build_object(
    'originalAmount', v_subtotal,
    'discountAmount', v_discount,
    'finalAmount', v_subtotal - v_discount
  );
end;
$$;
revoke all on function studioflow_private.aura_booking_amounts(uuid, jsonb, public.salon_promotions) from public, anon, authenticated;

create or replace function studioflow_private.aura_promotion_redemption_trg_fn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_promo public.salon_promotions;
  v_amounts jsonb;
  v_request uuid;
  v_code text := upper(btrim(coalesce(new.payload->'coupon'->>'code', '')));
begin
  if new.status = 'cancelled' then
    update public.aura_promotion_redemptions
       set status = 'released', updated_at = now()
     where booking_id = new.id and status = 'applied';
    return new;
  end if;

  if new.status not in ('confirmed', 'completed') then return new; end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then return new; end if;
  if coalesce(new.payload->'coupon'->>'couponKind', '') not in ('promotion', 'aura_promotion')
     and coalesce(new.payload->'coupon'->>'promotionId', '') = '' then
    return new;
  end if;
  if not studioflow_private.aura_is_template03_salon(new.owner_id) then return new; end if;

  select * into v_promo
    from public.salon_promotions sp
   where sp.salon_id = new.owner_id and upper(sp.coupon_code) = v_code;
  if v_promo.id is null then return new; end if;

  v_amounts := studioflow_private.aura_booking_amounts(new.owner_id, new.payload, v_promo);
  if coalesce((v_amounts->>'discountAmount')::numeric, 0) <= 0 then return new; end if;

  select coalesce(
    (select r.request_id from public.studioflow_android_requests r where r.booking_id = new.id limit 1),
    new.id
  ) into v_request;

  insert into public.aura_promotion_redemptions (
    promotion_id, salon_id, customer_id, booking_id, request_id, coupon_code,
    original_amount, discount_amount, final_amount, status
  ) values (
    v_promo.id, new.owner_id, new.customer_id, new.id, v_request, v_promo.coupon_code,
    (v_amounts->>'originalAmount')::numeric,
    (v_amounts->>'discountAmount')::numeric,
    (v_amounts->>'finalAmount')::numeric,
    'applied'
  ) on conflict (booking_id) do nothing;

  -- Turn the reservation hold into an applied hold as well (idempotent).
  update public.promotion_redemptions
     set status = 'applied', updated_at = now()
   where booking_id = new.id and status = 'reserved';
  return new;
end;
$$;
revoke all on function studioflow_private.aura_promotion_redemption_trg_fn() from public, anon, authenticated;

drop trigger if exists aura_promotion_redemption_trg on public.studioflow_bookings;
create trigger aura_promotion_redemption_trg
  after insert or update of status on public.studioflow_bookings
  for each row execute function studioflow_private.aura_promotion_redemption_trg_fn();

-- Refunds release the confirmed redemption, if the payments table exists.
do $$
begin
  if to_regclass('public.studioflow_payment_orders') is not null then
    execute $trg$
      create or replace function studioflow_private.aura_promotion_refund_trg_fn()
      returns trigger language plpgsql security definer set search_path = '' as $fn$
      begin
        if new.status = 'refunded' and old.status is distinct from 'refunded' then
          update public.aura_promotion_redemptions
             set status = 'released', updated_at = now()
           where booking_id = new.booking_id and status = 'applied';
        end if;
        return new;
      end; $fn$;
    $trg$;
    execute 'revoke all on function studioflow_private.aura_promotion_refund_trg_fn() from public, anon, authenticated';
    execute 'drop trigger if exists aura_promotion_refund_trg on public.studioflow_payment_orders';
    execute $trg2$
      create trigger aura_promotion_refund_trg
        after update of status on public.studioflow_payment_orders
        for each row execute function studioflow_private.aura_promotion_refund_trg_fn()
    $trg2$;
  end if;
end;
$$;

commit;
