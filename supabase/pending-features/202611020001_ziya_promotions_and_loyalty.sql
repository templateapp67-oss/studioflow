-- ============================================================================
-- Template 01: Ziya Women’s Hair Studio (formerly Miraki Atelier)
-- Promotions & Offers + Ziya Style Rewards Loyalty System + Contact Enquiry RPC
-- Safe, repeatable, idempotent migration with strict RLS & backend validation.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Sync Template 01 catalog metadata (Miraki Atelier -> Ziya Women’s Hair Studio)
--    Preserves existing service IDs, prices, durations & booking relationships.
-- ----------------------------------------------------------------------------
update public.studioflow_templates
   set title = 'Ziya Women’s Hair Studio',
       config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
         'title', 'Ziya Women’s Hair Studio',
         'shortName', 'Ziya Women’s Hair Studio',
         'tagline', 'Professional women’s haircuts designed around your face shape, hair type and personal style.',
         'about', 'Ziya Women’s Hair Studio is a dedicated women’s haircutting studio built exclusively around precision scissor work, face-shape matching, and modern women’s haircut silhouettes — from cascading layers, butterfly cuts and curtain bangs to sculpted bobs, pixies and curl-by-curl dry cuts.',
         'paletteLabel', 'Soft Ivory, Rose Beige, Muted Blush & Gold',
         'themePreset', 'chic_nude_beige',
         'ownerName', 'Ziya Khan',
         'ownerRole', 'Founder & Master Women’s Haircut Specialist',
         'ownerPhotoUrl', '/templates/luxury-editorial/team-1-960.webp',
         'coverImageUrl', '/templates/luxury-editorial/hero-960.webp',
         'instagramHandle', '@ziya.hairstudio'
       ),
       updated_at = now()
 where id = 'hair_salon';

-- ----------------------------------------------------------------------------
-- 1. Private authorization & timestamp helpers
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.ziya_touch_updated_at()
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
revoke all on function studioflow_private.ziya_touch_updated_at() from public, anon, authenticated;

create or replace function studioflow_private.ziya_normalize_promotion()
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
revoke all on function studioflow_private.ziya_normalize_promotion() from public, anon, authenticated;

create or replace function studioflow_private.can_manage_salon(p_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    auth.uid() is not null
    and p_salon_id is not null
    and (
      p_salon_id = auth.uid()
      or exists (
        select 1
          from public.studioflow_branch_staff_members m
         where m.site_id = p_salon_id
           and m.user_id = auth.uid()
           and m.is_active = true
           and m.role in ('owner', 'manager')
      )
    ),
    false
  );
$$;
revoke all on function studioflow_private.can_manage_salon(uuid) from public, anon;
grant execute on function studioflow_private.can_manage_salon(uuid) to authenticated, service_role;

create or replace function studioflow_private.can_view_salon_staff(p_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    studioflow_private.can_manage_salon(p_salon_id)
    or (
      auth.uid() is not null
      and p_salon_id is not null
      and exists (
        select 1
          from public.studioflow_branch_staff_members m
         where m.site_id = p_salon_id
           and m.user_id = auth.uid()
           and m.is_active = true
           and m.role in ('receptionist', 'stylist')
      )
    ),
    false
  );
$$;
revoke all on function studioflow_private.can_view_salon_staff(uuid) from public, anon;
grant execute on function studioflow_private.can_view_salon_staff(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Promotions & Offers tables: salon_promotions & promotion_redemptions
-- ----------------------------------------------------------------------------
create table if not exists public.salon_promotions (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 140),
  description text not null default '' check (char_length(description) <= 600),
  discount_type text not null check (discount_type in ('percentage', 'flat')),
  discount_value numeric(10,2) not null check (
    discount_value > 0
    and (discount_type <> 'percentage' or discount_value <= 100)
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

create unique index if not exists salon_promotions_salon_code_uidx
  on public.salon_promotions(salon_id, upper(coupon_code));

create index if not exists salon_promotions_active_order_idx
  on public.salon_promotions(salon_id, is_active, display_order, created_at desc);

drop trigger if exists salon_promotions_normalize_trg on public.salon_promotions;
create trigger salon_promotions_normalize_trg
  before insert or update on public.salon_promotions
  for each row execute function studioflow_private.ziya_normalize_promotion();

alter table public.salon_promotions enable row level security;
revoke all on public.salon_promotions from public, anon, authenticated;
grant select on public.salon_promotions to anon, authenticated;
grant insert, update, delete on public.salon_promotions to authenticated;

drop policy if exists salon_promotions_public_active_read on public.salon_promotions;
create policy salon_promotions_public_active_read on public.salon_promotions
  for select to anon, authenticated
  using (
    (
      is_active = true
      and (starts_at is null or starts_at <= current_date)
      and (ends_at is null or ends_at >= current_date)
      and exists (
        select 1 from public.studioflow_websites w where w.owner_id = salon_promotions.salon_id
      )
    )
    or studioflow_private.can_view_salon_staff(salon_id)
  );

drop policy if exists salon_promotions_admin_insert on public.salon_promotions;
create policy salon_promotions_admin_insert on public.salon_promotions
  for insert to authenticated
  with check (studioflow_private.can_manage_salon(salon_id));

drop policy if exists salon_promotions_admin_update on public.salon_promotions;
create policy salon_promotions_admin_update on public.salon_promotions
  for update to authenticated
  using (studioflow_private.can_manage_salon(salon_id))
  with check (studioflow_private.can_manage_salon(salon_id));

drop policy if exists salon_promotions_admin_delete on public.salon_promotions;
create policy salon_promotions_admin_delete on public.salon_promotions
  for delete to authenticated
  using (studioflow_private.can_manage_salon(salon_id));

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
  on public.promotion_redemptions(promotion_id, status);

create index if not exists promotion_redemptions_promo_customer_idx
  on public.promotion_redemptions(promotion_id, customer_id, status);

create index if not exists promotion_redemptions_salon_recent_idx
  on public.promotion_redemptions(salon_id, redeemed_at desc);

drop trigger if exists promotion_redemptions_touch_trg on public.promotion_redemptions;
create trigger promotion_redemptions_touch_trg
  before update on public.promotion_redemptions
  for each row execute function studioflow_private.ziya_touch_updated_at();

alter table public.promotion_redemptions enable row level security;
-- Customers and admins can never insert/modify redemptions directly; only backend RPCs & triggers write rows.
revoke all on public.promotion_redemptions from public, anon, authenticated;
grant select on public.promotion_redemptions to authenticated;

drop policy if exists promotion_redemptions_customer_read on public.promotion_redemptions;
create policy promotion_redemptions_customer_read on public.promotion_redemptions
  for select to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists promotion_redemptions_admin_read on public.promotion_redemptions;
create policy promotion_redemptions_admin_read on public.promotion_redemptions
  for select to authenticated
  using (studioflow_private.can_view_salon_staff(salon_id));

-- ----------------------------------------------------------------------------
-- 3. Loyalty & Rewards tables: loyalty_program_settings, loyalty_rewards, loyalty_points_ledger
-- ----------------------------------------------------------------------------
create table if not exists public.loyalty_program_settings (
  salon_id uuid primary key references public.studioflow_accounts(user_id) on delete cascade,
  program_name text not null default 'Ziya Style Rewards' check (char_length(btrim(program_name)) between 2 and 120),
  is_enabled boolean not null default true,
  points_per_100_inr integer not null default 1 check (points_per_100_inr between 1 and 100),
  points_per_visit integer not null default 0 check (points_per_visit between 0 and 1000),
  min_eligible_spend_inr numeric(10,2) not null default 100 check (min_eligible_spend_inr >= 0),
  welcome_bonus_points integer not null default 0 check (welcome_bonus_points between 0 and 1000),
  rules_summary text not null default 'Earn 1 Ziya Style Point for every ₹100 spent on completed women’s haircut appointments. Redeem your points for instant haircut discount vouchers.' check (char_length(rules_summary) <= 1000),
  terms_conditions text not null default 'Points are credited automatically after a women’s haircut appointment is marked Completed. Cancelled or refunded bookings reverse earned points safely. Reward vouchers apply to women’s haircut services and are non-transferable.' check (char_length(terms_conditions) <= 2000),
  is_demo boolean not null default false,
  demo_approved boolean not null default false,
  seeded_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists loyalty_program_settings_touch_trg on public.loyalty_program_settings;
create trigger loyalty_program_settings_touch_trg
  before update on public.loyalty_program_settings
  for each row execute function studioflow_private.ziya_touch_updated_at();

alter table public.loyalty_program_settings enable row level security;
revoke all on public.loyalty_program_settings from public, anon, authenticated;
grant select on public.loyalty_program_settings to anon, authenticated;
grant insert, update, delete on public.loyalty_program_settings to authenticated;

drop policy if exists loyalty_program_settings_public_read on public.loyalty_program_settings;
create policy loyalty_program_settings_public_read on public.loyalty_program_settings
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.studioflow_websites w where w.owner_id = loyalty_program_settings.salon_id
    )
    or studioflow_private.can_view_salon_staff(salon_id)
  );

drop policy if exists loyalty_program_settings_admin_insert on public.loyalty_program_settings;
create policy loyalty_program_settings_admin_insert on public.loyalty_program_settings
  for insert to authenticated
  with check (studioflow_private.can_manage_salon(salon_id));

drop policy if exists loyalty_program_settings_admin_update on public.loyalty_program_settings;
create policy loyalty_program_settings_admin_update on public.loyalty_program_settings
  for update to authenticated
  using (studioflow_private.can_manage_salon(salon_id))
  with check (studioflow_private.can_manage_salon(salon_id));

drop policy if exists loyalty_program_settings_admin_delete on public.loyalty_program_settings;
create policy loyalty_program_settings_admin_delete on public.loyalty_program_settings
  for delete to authenticated
  using (studioflow_private.can_manage_salon(salon_id));

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 140),
  description text not null default '' check (char_length(description) <= 500),
  points_cost integer not null check (points_cost between 1 and 100000),
  reward_type text not null default 'flat_discount' check (reward_type in ('flat_discount', 'percentage_discount')),
  discount_value numeric(10,2) not null check (
    discount_value > 0
    and (reward_type <> 'percentage_discount' or discount_value <= 100)
  ),
  min_booking_amount numeric(10,2) not null default 0 check (min_booking_amount >= 0),
  applicable_service_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(applicable_service_ids) = 'array'),
  validity_days integer not null default 90 check (validity_days between 1 and 730),
  display_order integer not null default 0 check (display_order between -1000 and 10000),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loyalty_rewards_salon_order_idx
  on public.loyalty_rewards(salon_id, is_active, display_order, points_cost);

drop trigger if exists loyalty_rewards_touch_trg on public.loyalty_rewards;
create trigger loyalty_rewards_touch_trg
  before update on public.loyalty_rewards
  for each row execute function studioflow_private.ziya_touch_updated_at();

alter table public.loyalty_rewards enable row level security;
revoke all on public.loyalty_rewards from public, anon, authenticated;
grant select on public.loyalty_rewards to anon, authenticated;
grant insert, update, delete on public.loyalty_rewards to authenticated;

drop policy if exists loyalty_rewards_public_active_read on public.loyalty_rewards;
create policy loyalty_rewards_public_active_read on public.loyalty_rewards
  for select to anon, authenticated
  using (
    (
      is_active = true
      and exists (
        select 1 from public.studioflow_websites w where w.owner_id = loyalty_rewards.salon_id
      )
    )
    or studioflow_private.can_view_salon_staff(salon_id)
  );

drop policy if exists loyalty_rewards_admin_insert on public.loyalty_rewards;
create policy loyalty_rewards_admin_insert on public.loyalty_rewards
  for insert to authenticated
  with check (studioflow_private.can_manage_salon(salon_id));

drop policy if exists loyalty_rewards_admin_update on public.loyalty_rewards;
create policy loyalty_rewards_admin_update on public.loyalty_rewards
  for update to authenticated
  using (studioflow_private.can_manage_salon(salon_id))
  with check (studioflow_private.can_manage_salon(salon_id));

drop policy if exists loyalty_rewards_admin_delete on public.loyalty_rewards;
create policy loyalty_rewards_admin_delete on public.loyalty_rewards
  for delete to authenticated
  using (studioflow_private.can_manage_salon(salon_id));

create table if not exists public.loyalty_points_ledger (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid references public.studioflow_bookings(id) on delete set null,
  reward_id uuid references public.loyalty_rewards(id) on delete set null,
  claim_id uuid references public.studioflow_customer_reward_claims(id) on delete set null,
  entry_type text not null check (
    entry_type in ('earn_booking', 'redeem_reward', 'reverse_booking', 'release_reward', 'admin_adjustment')
  ),
  points_delta integer not null check (points_delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  description text not null default '' check (char_length(description) <= 500),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 3 and 180),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (salon_id, customer_id, idempotency_key)
);

create index if not exists loyalty_points_ledger_customer_idx
  on public.loyalty_points_ledger(salon_id, customer_id, created_at desc);

create index if not exists loyalty_points_ledger_salon_idx
  on public.loyalty_points_ledger(salon_id, created_at desc);

create index if not exists loyalty_points_ledger_booking_idx
  on public.loyalty_points_ledger(booking_id)
  where booking_id is not null;

alter table public.loyalty_points_ledger enable row level security;
-- Customers and admins can never insert/modify ledger rows directly; only backend RPCs & triggers write rows.
revoke all on public.loyalty_points_ledger from public, anon, authenticated;
grant select on public.loyalty_points_ledger to authenticated;

drop policy if exists loyalty_points_ledger_customer_read on public.loyalty_points_ledger;
create policy loyalty_points_ledger_customer_read on public.loyalty_points_ledger
  for select to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists loyalty_points_ledger_admin_read on public.loyalty_points_ledger;
create policy loyalty_points_ledger_admin_read on public.loyalty_points_ledger
  for select to authenticated
  using (studioflow_private.can_view_salon_staff(salon_id));

-- ----------------------------------------------------------------------------
-- 4. Idempotent Ziya Demo Seeding (ONLY for Template 01: businessType = 'hair_salon')
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.seed_ziya_salon_defaults(
  p_salon_id uuid,
  p_force boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
  v_already_seeded boolean;
begin
  if p_salon_id is null then
    return;
  end if;

  select coalesce(a.draft->'profile'->>'businessType', '')
    into v_type
    from public.studioflow_accounts a
   where a.user_id = p_salon_id;

  if v_type <> 'hair_salon' then
    return;
  end if;

  select exists (
    select 1 from public.loyalty_program_settings s where s.salon_id = p_salon_id
  ) into v_already_seeded;

  if v_already_seeded and not p_force then
    return;
  end if;

  -- 1. Seed Ziya Style Rewards settings (clearly marked is_demo = true until admin approves)
  insert into public.loyalty_program_settings (
    salon_id,
    program_name,
    is_enabled,
    points_per_100_inr,
    points_per_visit,
    min_eligible_spend_inr,
    welcome_bonus_points,
    rules_summary,
    terms_conditions,
    is_demo,
    demo_approved,
    seeded_at
  ) values (
    p_salon_id,
    'Ziya Style Rewards',
    true,
    1,
    0,
    100,
    0,
    'Earn 1 Ziya Style Point for every ₹100 spent on eligible completed women’s haircut appointments. Redeem points anytime for haircut savings.',
    'Sample reward structure for Ziya Women’s Hair Studio — salon admin can customize or approve rules anytime. Points credit automatically when a women’s haircut booking is marked Completed and reverse on cancellations or refunds.',
    true,
    false,
    now()
  )
  on conflict (salon_id) do nothing;

  -- 2. Seed 3 demo reward tiers (100 pts = ₹50, 200 pts = ₹120, 300 pts = ₹200)
  if p_force or not exists (select 1 from public.loyalty_rewards r where r.salon_id = p_salon_id) then
    if not exists (
      select 1 from public.loyalty_rewards r where r.salon_id = p_salon_id and r.points_cost = 100 and r.is_demo = true
    ) then
      insert into public.loyalty_rewards (
        salon_id, title, description, points_cost, reward_type, discount_value,
        min_booking_amount, applicable_service_ids, validity_days, display_order, is_active, is_demo
      ) values (
        p_salon_id,
        '₹50 Haircut Discount',
        'Redeem 100 Ziya Style Points for ₹50 off any women’s haircut or fringe service.',
        100,
        'flat_discount',
        50,
        350,
        '[]'::jsonb,
        90,
        1,
        true,
        true
      );
    end if;

    if not exists (
      select 1 from public.loyalty_rewards r where r.salon_id = p_salon_id and r.points_cost = 200 and r.is_demo = true
    ) then
      insert into public.loyalty_rewards (
        salon_id, title, description, points_cost, reward_type, discount_value,
        min_booking_amount, applicable_service_ids, validity_days, display_order, is_active, is_demo
      ) values (
        p_salon_id,
        '₹120 Haircut Discount',
        'Redeem 200 Ziya Style Points for ₹120 off precision layer, bob, pixie or face-framing haircuts.',
        200,
        'flat_discount',
        120,
        550,
        '[]'::jsonb,
        90,
        2,
        true,
        true
      );
    end if;

    if not exists (
      select 1 from public.loyalty_rewards r where r.salon_id = p_salon_id and r.points_cost = 300 and r.is_demo = true
    ) then
      insert into public.loyalty_rewards (
        salon_id, title, description, points_cost, reward_type, discount_value,
        min_booking_amount, applicable_service_ids, validity_days, display_order, is_active, is_demo
      ) values (
        p_salon_id,
        '₹200 Haircut Discount',
        'Redeem 300 Ziya Style Points for ₹200 off signature butterfly cuts, curly cuts or wash & styling packages.',
        300,
        'flat_discount',
        200,
        850,
        '[]'::jsonb,
        90,
        3,
        true,
        true
      );
    end if;
  end if;

  -- 3. Seed 3 clearly labeled demo promotions (ZIYA15, NEWLOOK200, LAYER10)
  insert into public.salon_promotions (
    salon_id, title, description, discount_type, discount_value, coupon_code,
    min_booking_amount, applicable_service_ids, starts_at, ends_at,
    max_total_uses, max_uses_per_customer, terms_conditions, banner_image_url,
    display_order, is_active, is_demo, demo_approved
  ) values
  (
    p_salon_id,
    'First Haircut Welcome Offer',
    'Enjoy 15% off on women’s haircut services including face-shape consultation, precision sectioning and finish.',
    'percentage',
    15,
    'ZIYA15',
    500,
    '[]'::jsonb,
    current_date - 7,
    current_date + 180,
    500,
    1,
    'Demo studio offer — valid once per customer on women’s haircut bookings of ₹500 or above. Cannot be combined with other coupons.',
    '/templates/luxury-editorial/service-butterfly-760.webp',
    1,
    true,
    true,
    false
  ),
  (
    p_salon_id,
    'New Look Haircut Special',
    'Flat ₹200 off on selected women’s haircut packages and full transformation cuts with blowout styling.',
    'flat',
    200,
    'NEWLOOK200',
    950,
    '["hs-2", "hs-3", "hs-6", "hs-12", "hs-14", "__packages__"]'::jsonb,
    current_date - 7,
    current_date + 180,
    300,
    2,
    'Demo studio offer — valid on women’s haircut packages, Butterfly Cut, Bob Cut, Pixie Cut, Curly Cut, and Hair Wash & Styling with Haircut (min ₹950).',
    '/templates/luxury-editorial/service-styling-760.webp',
    2,
    true,
    true,
    false
  ),
  (
    p_salon_id,
    'Layer Haircut Special',
    'Save 10% on signature Layer Haircut, Step Haircut and cascading multi-layer appointments.',
    'percentage',
    10,
    'LAYER10',
    800,
    '["hs-1", "hs-5"]'::jsonb,
    current_date - 7,
    current_date + 180,
    400,
    2,
    'Demo studio offer — valid on Layer Haircut and Step Haircut bookings of ₹800 or above.',
    '/templates/luxury-editorial/service-layer-760.webp',
    3,
    true,
    true,
    false
  )
  on conflict (salon_id, upper(coupon_code)) do nothing;
end;
$$;
revoke all on function studioflow_private.seed_ziya_salon_defaults(uuid, boolean) from public, anon, authenticated;

create or replace function studioflow_private.auto_seed_ziya_on_account_save()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.draft->'profile'->>'businessType', '') = 'hair_salon' then
    perform studioflow_private.seed_ziya_salon_defaults(new.user_id, false);
  end if;
  return new;
end;
$$;
revoke all on function studioflow_private.auto_seed_ziya_on_account_save() from public, anon, authenticated;

drop trigger if exists studioflow_ziya_account_seed_trg on public.studioflow_accounts;
create trigger studioflow_ziya_account_seed_trg
  after insert or update of draft on public.studioflow_accounts
  for each row execute function studioflow_private.auto_seed_ziya_on_account_save();

-- Backfill existing Ziya Women's Hair Studio accounts safely
do $$
declare
  rec record;
begin
  for rec in
    select a.user_id
      from public.studioflow_accounts a
     where coalesce(a.draft->'profile'->>'businessType', '') = 'hair_salon'
  loop
    perform studioflow_private.seed_ziya_salon_defaults(rec.user_id, false);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Backend Coupon Validation & Atomic Booking Integration
--    Extends studioflow_private.coupon_quote & studioflow_private.coupon_book
--    (automatically powers studioflow_coupon_quote, studioflow_coupon_book,
--     and studioflow_branch_coupon_book).
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.coupon_quote(
  p_slug text,
  p_services jsonb,
  p_code text,
  p_booking uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  w public.studioflow_websites;
  c public.studioflow_customer_reward_claims;
  p public.salon_promotions;
  v_actor uuid := auth.uid();
  v_clean_code text := upper(btrim(coalesce(p_code, '')));
  v_catalog jsonb;
  subtotal numeric := 0;
  eligible numeric := 0;
  discount numeric := 0;
  amount numeric;
  count_services int := 0;
  category text;
  reward_type text;
  held public.studioflow_bookings;
  terms jsonb;
  v_total_used int := 0;
  v_customer_used int := 0;
  v_has_service_filter boolean := false;
begin
  if v_actor is null then
    raise exception 'Sign in to apply your coupon code' using errcode = '42501';
  end if;
  if p_code is null or length(v_clean_code) not between 3 and 100 or v_clean_code like '%-XXXX' then
    raise exception 'Enter a valid coupon or reward code.';
  end if;
  if jsonb_typeof(p_services) is distinct from 'array'
     or jsonb_array_length(p_services) not between 1 and 10
     or (select count(distinct value) from jsonb_array_elements_text(p_services)) <> jsonb_array_length(p_services) then
    raise exception 'Choose valid, distinct services';
  end if;

  select * into w from public.studioflow_websites where slug = p_slug;
  if w.owner_id is null then
    raise exception 'Salon website is unavailable';
  end if;

  v_catalog := case
    when jsonb_typeof(w.content->'services') = 'array' and jsonb_array_length(w.content->'services') > 0
      then w.content->'services'
    else coalesce((select draft->'services' from public.studioflow_accounts where user_id = w.owner_id), '[]'::jsonb)
  end;

  -- Path A: Customer Loyalty Reward Claim Voucher (studioflow_customer_reward_claims)
  select * into c
    from public.studioflow_customer_reward_claims
   where customer_id = v_actor
     and owner_id = w.owner_id
     and upper(coupon_code) = v_clean_code;

  if c.id is not null then
    if c.status <> 'active' then
      raise exception 'Coupon has already been used';
    end if;
    select b.* into held
      from studioflow_private.coupon_holds h
      join public.studioflow_bookings b on b.id = h.booking_id
     where h.claim_id = c.id;
    if held.id is not null
       and held.id is distinct from p_booking
       and (held.status in ('confirmed', 'completed') or (held.status = 'pending' and held.hold_expires_at > now())) then
      raise exception 'Coupon is reserved on another booking. Finish or cancel that reservation first.';
    end if;

    terms := coalesce(c.reward_terms, '{}'::jsonb);
    category := lower(coalesce(nullif(terms->>'applicableCategory', ''), 'all services'));
    reward_type := terms->>'rewardType';

    if terms ? 'expiresAt' and nullif(terms->>'expiresAt', '') is not null and (terms->>'expiresAt')::timestamptz <= now() then
      raise exception 'Coupon has expired';
    end if;

    v_has_service_filter := jsonb_typeof(terms->'applicableServiceIds') = 'array'
                            and jsonb_array_length(terms->'applicableServiceIds') > 0;

    select count(*),
           coalesce(sum((s->>'price')::numeric), 0),
           coalesce(
             sum((s->>'price')::numeric) filter (
               where (
                 not v_has_service_filter
                 and (category in ('all', 'all services') or lower(coalesce(s->>'category', '')) = category)
               )
               or (
                 v_has_service_filter
                 and (terms->'applicableServiceIds') ? (s->>'id')
               )
             ),
             0
           )
      into count_services, subtotal, eligible
      from jsonb_array_elements(v_catalog) s
     where p_services ? (s->>'id');

    if count_services <> jsonb_array_length(p_services) then
      raise exception 'A selected service is unavailable';
    end if;
    if subtotal < coalesce((terms->>'minimumSpend')::numeric, 0) then
      raise exception 'Minimum booking amount for this coupon is not met';
    end if;
    if eligible <= 0 then
      raise exception 'Coupon is not applicable to the selected service category';
    end if;

    amount := (terms->>'discountValue')::numeric;
    if amount is null or amount <= 0 then
      raise exception 'Invalid reward discount';
    end if;
    if reward_type = 'percentage_discount' and amount <= 100 then
      discount := round(eligible * amount / 100, 2);
    elsif reward_type = 'flat_discount' then
      discount := least(eligible, round(amount, 2));
    else
      raise exception 'This reward must be redeemed at the salon; it is not an online discount coupon';
    end if;

    if discount <= 0 or subtotal - discount < 4 then
      raise exception 'Discounted total is too low for online advance payment. Contact the salon.';
    end if;

    return jsonb_build_object(
      'claimId', c.id,
      'couponKind', 'reward_claim',
      'code', c.coupon_code,
      'title', c.reward_title,
      'originalPrice', subtotal,
      'discountAmount', discount,
      'finalPrice', subtotal - discount,
      'advanceAmount', ceil((subtotal - discount) * 100 / 4) / 100
    );
  end if;

  -- Path B: Salon Promotion Coupon Code (public.salon_promotions)
  if coalesce((select a.draft->'profile'->>'businessType' from public.studioflow_accounts a where a.user_id = w.owner_id), '') = 'hair_salon' then
    perform studioflow_private.seed_ziya_salon_defaults(w.owner_id, false);
  end if;

  select * into p
    from public.salon_promotions sp
   where sp.salon_id = w.owner_id
     and upper(sp.coupon_code) = v_clean_code;

  if p.id is null then
    raise exception 'Coupon not found for your account at this salon';
  end if;

  if not p.is_active then
    raise exception 'This coupon code is currently inactive';
  end if;
  if p.starts_at is not null and p.starts_at > current_date then
    raise exception 'This promotion has not started yet';
  end if;
  if p.ends_at is not null and p.ends_at < current_date then
    raise exception 'Coupon has expired';
  end if;

  -- Total redemption cap check (ignores released redemptions and expired unpaid holds)
  if p.max_total_uses is not null then
    select count(*)
      into v_total_used
      from public.promotion_redemptions r
      left join public.studioflow_bookings b on b.id = r.booking_id
     where r.promotion_id = p.id
       and (p_booking is null or r.booking_id is distinct from p_booking)
       and (
         r.status = 'applied'
         or (
           r.status = 'reserved'
           and (b.id is null or b.status in ('confirmed', 'completed') or (b.status = 'pending' and (b.hold_expires_at is null or b.hold_expires_at > now())))
         )
       );
    if v_total_used >= p.max_total_uses then
      raise exception 'This promotion has reached its maximum usage limit';
    end if;
  end if;

  -- Per-customer redemption cap check
  select count(*)
    into v_customer_used
    from public.promotion_redemptions r
    left join public.studioflow_bookings b on b.id = r.booking_id
   where r.promotion_id = p.id
     and r.customer_id = v_actor
     and (p_booking is null or r.booking_id is distinct from p_booking)
     and (
       r.status = 'applied'
       or (
         r.status = 'reserved'
         and (b.id is null or b.status in ('confirmed', 'completed') or (b.status = 'pending' and (b.hold_expires_at is null or b.hold_expires_at > now())))
       )
     );
  if v_customer_used >= p.max_uses_per_customer then
    raise exception 'You have already used this coupon code the maximum number of times';
  end if;

  v_has_service_filter := jsonb_typeof(p.applicable_service_ids) = 'array'
                          and jsonb_array_length(p.applicable_service_ids) > 0;

  select count(*),
         coalesce(sum((s->>'price')::numeric), 0),
         coalesce(
           sum((s->>'price')::numeric) filter (
             where not v_has_service_filter
                or p.applicable_service_ids ? (s->>'id')
                or (
                  p.applicable_service_ids ? '__packages__'
                  and lower(coalesce(s->>'category', '') || ' ' || coalesce(s->>'name', '')) ~ '(package|combo|bundle)'
                )
                or (
                  p.is_demo = true
                  and p.coupon_code = 'LAYER10'
                  and lower(coalesce(s->>'name', '')) ~ '(layer|step)'
                )
           ),
           0
         )
    into count_services, subtotal, eligible
    from jsonb_array_elements(v_catalog) s
   where p_services ? (s->>'id');

  if count_services <> jsonb_array_length(p_services) then
    raise exception 'A selected service is unavailable';
  end if;
  if subtotal < p.min_booking_amount then
    raise exception 'Minimum booking amount of ₹% is required for coupon %',
      trim(to_char(p.min_booking_amount, 'FM999999990')), p.coupon_code;
  end if;
  if eligible <= 0 then
    raise exception 'Coupon % is not applicable to the selected haircut service', p.coupon_code;
  end if;

  if p.discount_type = 'percentage' then
    discount := round(eligible * p.discount_value / 100.0, 2);
  else
    discount := least(eligible, round(p.discount_value, 2));
  end if;

  if discount <= 0 or subtotal - discount < 4 then
    raise exception 'Discounted total is too low for online advance payment. Choose an eligible haircut service.';
  end if;

  return jsonb_build_object(
    'claimId', p.id,
    'promotionId', p.id,
    'couponKind', 'promotion',
    'isDemo', (p.is_demo and not p.demo_approved),
    'code', p.coupon_code,
    'title', p.title,
    'originalPrice', subtotal,
    'discountAmount', discount,
    'finalPrice', subtotal - discount,
    'advanceAmount', ceil((subtotal - discount) * 100 / 4) / 100
  );
end;
$function$;

create or replace function studioflow_private.coupon_book(p_slug text, p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_clean_code text := upper(btrim(coalesce(p_request->>'couponCode', '')));
  ids jsonb;
  quote jsonb;
  v_claim_id uuid;
  v_promo public.salon_promotions;
  v_owner_id uuid;
  result jsonb;
  b public.studioflow_bookings;
  resolved text;
  candidate jsonb;
  existing_id uuid;
  v_request_id uuid;
begin
  if v_actor is null then
    raise exception 'Sign in to book' using errcode = '42501';
  end if;
  v_request_id := (p_request->>'requestId')::uuid;
  if v_request_id is null then
    raise exception 'Booking request ID required';
  end if;

  select w.owner_id into v_owner_id
    from public.studioflow_websites w
   where w.slug = p_slug;
  if v_owner_id is null then
    raise exception 'Salon website is unavailable';
  end if;

  ids := coalesce(
    p_request->'serviceIds',
    jsonb_build_array(p_request->>'serviceId') || coalesce(p_request->'addOnIds', '[]'::jsonb)
  );

  -- Check if code belongs to a customer reward claim first
  select c.id into v_claim_id
    from public.studioflow_customer_reward_claims c
   where c.owner_id = v_owner_id
     and c.customer_id = v_actor
     and upper(c.coupon_code) = v_clean_code
     for update of c;

  -- Otherwise check salon_promotions (with row lock + advisory lock for atomic limit enforcement)
  if v_claim_id is null then
    select sp.* into v_promo
      from public.salon_promotions sp
     where sp.salon_id = v_owner_id
       and upper(sp.coupon_code) = v_clean_code
       for update of sp;

    if v_promo.id is null then
      raise exception 'Coupon not found for your account at this salon';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v_promo.id::text || ':' || v_actor::text, 709));
  end if;

  select r.booking_id into existing_id
    from public.studioflow_android_requests r
   where r.customer_id = v_actor
     and r.request_id = v_request_id;

  if existing_id is not null then
    select * into b from public.studioflow_bookings where id = existing_id;
    if v_claim_id is not null and b.payload->'coupon'->>'claimId' is distinct from v_claim_id::text then
      raise exception 'Booking request changed. Start a new reservation.';
    end if;
    if v_promo.id is not null and b.payload->'coupon'->>'promotionId' is distinct from v_promo.id::text then
      raise exception 'Booking request changed. Start a new reservation.';
    end if;
    resolved := b.stylist_id;
  else
    resolved := case
      when p_request->>'stylistId' in ('any', 'any_available', 'any-specialist') then 'any'
      else p_request->>'stylistId'
    end;
    select s into candidate
      from jsonb_array_elements(studioflow_android_private.slots(p_slug, ids, (p_request->>'date')::date, resolved)) s
     where s->>'time' = p_request->>'time';
    if candidate is null then
      raise exception 'Slot unavailable. Choose another time.';
    end if;
    resolved := candidate->>'stylistId';
  end if;

  if existing_id is null then
    quote := studioflow_private.coupon_quote(p_slug, ids, v_clean_code);
    if p_request ? 'couponExpectedTotal'
       and (p_request->>'couponExpectedTotal')::numeric is distinct from (quote->>'finalPrice')::numeric then
      raise exception 'Prices changed. Remove and reapply the coupon before booking.';
    end if;
  end if;

  if p_request->>'stylistId' not in ('any', 'any_available', 'any-specialist', resolved) then
    raise exception 'Booking specialist changed';
  end if;

  result := studioflow_android_private.book(
    p_slug,
    ids,
    (p_request->>'date')::date,
    p_request->>'time',
    resolved,
    p_request->>'clientName',
    p_request->>'clientPhone',
    coalesce(p_request->>'instructions', ''),
    v_request_id
  );

  if existing_id is not null then
    return result;
  end if;

  if v_claim_id is not null then
    insert into studioflow_private.coupon_holds(claim_id, booking_id)
    values (v_claim_id, (result->>'id')::uuid)
    on conflict (claim_id) do update set booking_id = excluded.booking_id;
  elsif v_promo.id is not null then
    insert into public.promotion_redemptions (
      promotion_id, salon_id, customer_id, booking_id, request_id, coupon_code,
      original_amount, discount_amount, final_amount, status
    ) values (
      v_promo.id,
      v_owner_id,
      v_actor,
      (result->>'id')::uuid,
      v_request_id,
      v_promo.coupon_code,
      (quote->>'originalPrice')::numeric,
      (quote->>'discountAmount')::numeric,
      (quote->>'finalPrice')::numeric,
      'reserved'
    )
    on conflict (customer_id, request_id) do nothing;
  end if;

  update public.studioflow_bookings
     set payload = payload || jsonb_build_object(
       'originalPrice', quote->'originalPrice',
       'discountAmount', quote->'discountAmount',
       'servicePrice', quote->'finalPrice',
       'coupon', quote,
       'source', 'nexora_coupon_booking'
     )
   where id = (result->>'id')::uuid
   returning * into b;

  return to_jsonb(b);
end;
$function$;

revoke all on function studioflow_private.coupon_quote(text, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function studioflow_private.coupon_quote(text, jsonb, text, uuid) to authenticated;
revoke all on function studioflow_private.coupon_book(text, jsonb) from public, anon, authenticated;
grant execute on function studioflow_private.coupon_book(text, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Automatic Loyalty Point Crediting, Reversal & Redemption Lifecycle Triggers
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.credit_booking_loyalty_points(p_booking_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.studioflow_bookings;
  s public.loyalty_program_settings;
  v_amount numeric := 0;
  v_points integer := 0;
  v_balance integer := 0;
  v_service_name text;
begin
  select * into b from public.studioflow_bookings where id = p_booking_id;
  if b.id is null or b.customer_id is null or b.status <> 'completed' then
    return 0;
  end if;

  -- Ensure Ziya defaults exist if this is a hair_salon account
  if coalesce((select a.draft->'profile'->>'businessType' from public.studioflow_accounts a where a.user_id = b.owner_id), '') = 'hair_salon' then
    perform studioflow_private.seed_ziya_salon_defaults(b.owner_id, false);
  end if;

  select * into s from public.loyalty_program_settings where salon_id = b.owner_id;
  if s.salon_id is null or not s.is_enabled then
    return 0;
  end if;

  v_amount := coalesce((b.payload->>'servicePrice')::numeric, 0);
  if v_amount < s.min_eligible_spend_inr then
    return 0;
  end if;

  v_points := (floor(v_amount / 100.0)::int * s.points_per_100_inr) + s.points_per_visit;
  if v_points <= 0 then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(b.owner_id::text || ':' || b.customer_id::text, 917));

  if exists (
    select 1
      from public.loyalty_points_ledger l
     where l.salon_id = b.owner_id
       and l.customer_id = b.customer_id
       and l.idempotency_key = 'booking_complete:' || b.id::text
  ) then
    return 0;
  end if;

  select coalesce(sum(points_delta), 0)::int
    into v_balance
    from public.loyalty_points_ledger
   where salon_id = b.owner_id
     and customer_id = b.customer_id;

  v_service_name := coalesce(nullif(btrim(b.payload->>'serviceName'), ''), 'Women’s Haircut');

  insert into public.loyalty_points_ledger (
    salon_id, customer_id, booking_id, entry_type, points_delta, balance_after,
    description, idempotency_key, created_by
  ) values (
    b.owner_id,
    b.customer_id,
    b.id,
    'earn_booking',
    v_points,
    v_balance + v_points,
    format('Completed haircut: %s (₹%s)', v_service_name, trim(to_char(v_amount, 'FM999999990'))),
    'booking_complete:' || b.id::text,
    auth.uid()
  )
  on conflict (salon_id, customer_id, idempotency_key) do nothing;

  return v_points;
end;
$$;
revoke all on function studioflow_private.credit_booking_loyalty_points(uuid) from public, anon, authenticated;

create or replace function studioflow_private.reverse_booking_loyalty_points(
  p_booking_id uuid,
  p_reason text default 'Booking reversed'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_earned public.loyalty_points_ledger;
  v_balance integer := 0;
  v_deduct integer := 0;
begin
  select * into v_earned
    from public.loyalty_points_ledger l
   where l.booking_id = p_booking_id
     and l.entry_type = 'earn_booking'
   limit 1;

  if v_earned.id is null or v_earned.points_delta <= 0 then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_earned.salon_id::text || ':' || v_earned.customer_id::text, 917));

  if exists (
    select 1
      from public.loyalty_points_ledger l
     where l.salon_id = v_earned.salon_id
       and l.customer_id = v_earned.customer_id
       and l.idempotency_key = 'booking_reverse:' || p_booking_id::text
  ) then
    return 0;
  end if;

  select coalesce(sum(points_delta), 0)::int
    into v_balance
    from public.loyalty_points_ledger
   where salon_id = v_earned.salon_id
     and customer_id = v_earned.customer_id;

  -- Never allow reversal to push balance negative
  v_deduct := least(v_earned.points_delta, greatest(0, v_balance));
  if v_deduct <= 0 then
    return 0;
  end if;

  insert into public.loyalty_points_ledger (
    salon_id, customer_id, booking_id, entry_type, points_delta, balance_after,
    description, idempotency_key, created_by
  ) values (
    v_earned.salon_id,
    v_earned.customer_id,
    p_booking_id,
    'reverse_booking',
    -v_deduct,
    v_balance - v_deduct,
    left(coalesce(nullif(btrim(p_reason), ''), 'Booking reversed') || ' — points reversed', 500),
    'booking_reverse:' || p_booking_id::text,
    auth.uid()
  )
  on conflict (salon_id, customer_id, idempotency_key) do nothing;

  return v_deduct;
end;
$$;
revoke all on function studioflow_private.reverse_booking_loyalty_points(uuid, text) from public, anon, authenticated;

create or replace function studioflow_private.ziya_booking_lifecycle_trg_fn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('confirmed', 'completed') then
    update public.promotion_redemptions
       set status = 'applied',
           updated_at = now()
     where booking_id = new.id
       and status = 'reserved';
  end if;

  if new.status = 'cancelled' then
    update public.promotion_redemptions
       set status = 'released',
           updated_at = now()
     where booking_id = new.id
       and status in ('reserved', 'applied');

    if tg_op = 'UPDATE' and old.status = 'completed' then
      perform studioflow_private.reverse_booking_loyalty_points(new.id, 'Completed booking cancelled');
    end if;
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    perform studioflow_private.credit_booking_loyalty_points(new.id);
  end if;

  return new;
end;
$$;
revoke all on function studioflow_private.ziya_booking_lifecycle_trg_fn() from public, anon, authenticated;

drop trigger if exists studioflow_ziya_booking_lifecycle on public.studioflow_bookings;
create trigger studioflow_ziya_booking_lifecycle
  after insert or update of status on public.studioflow_bookings
  for each row execute function studioflow_private.ziya_booking_lifecycle_trg_fn();

create or replace function studioflow_private.ziya_payment_refund_trg_fn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'refunded' and old.status is distinct from 'refunded' then
    update public.promotion_redemptions
       set status = 'released',
           updated_at = now()
     where booking_id = new.booking_id
       and status in ('reserved', 'applied');

    perform studioflow_private.reverse_booking_loyalty_points(new.booking_id, 'Payment refunded');
  end if;
  return new;
end;
$$;
revoke all on function studioflow_private.ziya_payment_refund_trg_fn() from public, anon, authenticated;

drop trigger if exists studioflow_ziya_payment_refund_loyalty on public.studioflow_payment_orders;
create trigger studioflow_ziya_payment_refund_loyalty
  after update of status on public.studioflow_payment_orders
  for each row execute function studioflow_private.ziya_payment_refund_trg_fn();

-- ----------------------------------------------------------------------------
-- 7. Public & Customer RPCs for Ziya Women’s Hair Studio
-- ----------------------------------------------------------------------------
create or replace function studioflow_private.ziya_public_offers_and_loyalty(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.studioflow_websites;
  v_actor uuid := auth.uid();
  v_promotions jsonb := '[]'::jsonb;
  v_settings public.loyalty_program_settings;
  v_rewards jsonb := '[]'::jsonb;
  v_customer jsonb := null;
  v_balance integer := 0;
  v_earned integer := 0;
  v_redeemed integer := 0;
  v_ledger jsonb := '[]'::jsonb;
  v_vouchers jsonb := '[]'::jsonb;
  v_promo_usage jsonb := '{}'::jsonb;
  v_is_favorite boolean := false;
begin
  if coalesce(btrim(p_slug), '') = '' then
    return jsonb_build_object('found', false);
  end if;

  select * into w
    from public.studioflow_websites
   where slug = lower(btrim(p_slug));

  if w.owner_id is null then
    return jsonb_build_object('found', false);
  end if;

  if coalesce(w.content->'profile'->>'businessType', '') = 'hair_salon' then
    perform studioflow_private.seed_ziya_salon_defaults(w.owner_id, false);
  end if;

  -- Active, date-valid promotions under their max_total_uses cap
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
        'isDemo', (sp.is_demo and not sp.demo_approved)
      )
      order by sp.display_order asc, sp.created_at asc
    ),
    '[]'::jsonb
  )
    into v_promotions
    from public.salon_promotions sp
   where sp.salon_id = w.owner_id
     and sp.is_active = true
     and (sp.starts_at is null or sp.starts_at <= current_date)
     and (sp.ends_at is null or sp.ends_at >= current_date)
     and (
       sp.max_total_uses is null
       or (
         select count(*)
           from public.promotion_redemptions r
           left join public.studioflow_bookings b on b.id = r.booking_id
          where r.promotion_id = sp.id
            and (
              r.status = 'applied'
              or (r.status = 'reserved' and (b.id is null or b.status in ('confirmed', 'completed') or (b.status = 'pending' and (b.hold_expires_at is null or b.hold_expires_at > now()))))
            )
       ) < sp.max_total_uses
     );

  select * into v_settings
    from public.loyalty_program_settings s
   where s.salon_id = w.owner_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', lr.id,
        'title', lr.title,
        'description', lr.description,
        'pointsCost', lr.points_cost,
        'rewardType', lr.reward_type,
        'discountValue', lr.discount_value,
        'minBookingAmount', lr.min_booking_amount,
        'applicableServiceIds', lr.applicable_service_ids,
        'validityDays', lr.validity_days,
        'displayOrder', lr.display_order,
        'isDemo', lr.is_demo
      )
      order by lr.display_order asc, lr.points_cost asc
    ),
    '[]'::jsonb
  )
    into v_rewards
    from public.loyalty_rewards lr
   where lr.salon_id = w.owner_id
     and lr.is_active = true;

  if v_actor is not null then
    select coalesce(sum(points_delta), 0)::int,
           coalesce(sum(points_delta) filter (where points_delta > 0), 0)::int,
           coalesce(sum(-points_delta) filter (where entry_type = 'redeem_reward' and points_delta < 0), 0)::int
      into v_balance, v_earned, v_redeemed
      from public.loyalty_points_ledger
     where salon_id = w.owner_id
       and customer_id = v_actor;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'entryType', l.entry_type,
          'pointsDelta', l.points_delta,
          'balanceAfter', l.balance_after,
          'description', l.description,
          'createdAt', l.created_at
        )
        order by l.created_at desc
      ),
      '[]'::jsonb
    )
      into v_ledger
      from (
        select *
          from public.loyalty_points_ledger
         where salon_id = w.owner_id
           and customer_id = v_actor
         order by created_at desc
         limit 25
      ) l;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'title', c.reward_title,
          'couponCode', c.coupon_code,
          'pointsSpent', c.points_spent,
          'status', c.status,
          'expiresAt', c.reward_terms->>'expiresAt',
          'createdAt', c.created_at
        )
        order by c.created_at desc
      ),
      '[]'::jsonb
    )
      into v_vouchers
      from public.studioflow_customer_reward_claims c
     where c.owner_id = w.owner_id
       and c.customer_id = v_actor
       and c.status = 'active';

    select coalesce(jsonb_object_agg(promo_code, cnt), '{}'::jsonb)
      into v_promo_usage
      from (
        select upper(r.coupon_code) as promo_code, count(*)::int as cnt
          from public.promotion_redemptions r
          left join public.studioflow_bookings b on b.id = r.booking_id
         where r.salon_id = w.owner_id
           and r.customer_id = v_actor
           and r.promotion_id is not null
           and (
             r.status = 'applied'
             or (r.status = 'reserved' and (b.id is null or b.status in ('confirmed', 'completed') or (b.status = 'pending' and (b.hold_expires_at is null or b.hold_expires_at > now()))))
           )
         group by upper(r.coupon_code)
      ) u;

    select exists (
      select 1
        from public.studioflow_android_favorites f
       where f.customer_id = v_actor
         and f.salon_slug = w.slug
    ) into v_is_favorite;

    v_customer := jsonb_build_object(
      'balance', greatest(0, v_balance),
      'totalEarned', v_earned,
      'totalRedeemed', v_redeemed,
      'ledger', v_ledger,
      'activeVouchers', v_vouchers,
      'promoUsage', v_promo_usage,
      'isFavorite', v_is_favorite
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'slug', w.slug,
    'promotions', v_promotions,
    'loyalty', jsonb_build_object(
      'settings', case
        when v_settings.salon_id is null then null
        else jsonb_build_object(
          'programName', v_settings.program_name,
          'isEnabled', v_settings.is_enabled,
          'pointsPer100Inr', v_settings.points_per_100_inr,
          'pointsPerVisit', v_settings.points_per_visit,
          'minEligibleSpendInr', v_settings.min_eligible_spend_inr,
          'welcomeBonusPoints', v_settings.welcome_bonus_points,
          'rulesSummary', v_settings.rules_summary,
          'termsConditions', v_settings.terms_conditions,
          'isDemo', (v_settings.is_demo and not v_settings.demo_approved)
        )
      end,
      'rewards', v_rewards
    ),
    'customer', v_customer
  );
end;
$$;
revoke all on function studioflow_private.ziya_public_offers_and_loyalty(text) from public, anon, authenticated;

create or replace function public.studioflow_ziya_public_offers_and_loyalty(p_slug text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select studioflow_private.ziya_public_offers_and_loyalty(p_slug);
$$;
revoke all on function public.studioflow_ziya_public_offers_and_loyalty(text) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_public_offers_and_loyalty(text) to anon, authenticated;

-- Secure Customer Reward Redemption RPC
create or replace function studioflow_private.ziya_redeem_loyalty_reward(
  p_slug text,
  p_reward_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  w public.studioflow_websites;
  v_settings public.loyalty_program_settings;
  v_reward public.loyalty_rewards;
  v_existing_ledger public.loyalty_points_ledger;
  v_claim public.studioflow_customer_reward_claims;
  v_balance integer := 0;
  v_code text;
  v_expires timestamptz;
begin
  if v_actor is null then
    raise exception 'Please sign in to redeem Ziya Style Rewards points' using errcode = '42501';
  end if;
  if p_reward_id is null or p_request_id is null then
    raise exception 'Reward ID and request ID are required';
  end if;

  select * into w
    from public.studioflow_websites
   where slug = lower(btrim(coalesce(p_slug, '')));
  if w.owner_id is null then
    raise exception 'Salon website is unavailable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(w.owner_id::text || ':' || v_actor::text, 917));

  -- Idempotency check: return existing voucher if this exact request_id already completed
  select * into v_existing_ledger
    from public.loyalty_points_ledger l
   where l.salon_id = w.owner_id
     and l.customer_id = v_actor
     and l.idempotency_key = 'redeem:' || p_request_id::text;

  if v_existing_ledger.id is not null then
    if v_existing_ledger.reward_id is distinct from p_reward_id then
      raise exception 'Redemption request ID was already used for another reward';
    end if;
    select * into v_claim
      from public.studioflow_customer_reward_claims
     where id = v_existing_ledger.claim_id;
    return jsonb_build_object(
      'claimId', v_claim.id,
      'couponCode', v_claim.coupon_code,
      'title', v_claim.reward_title,
      'pointsSpent', v_claim.points_spent,
      'balanceAfter', v_existing_ledger.balance_after,
      'expiresAt', v_claim.reward_terms->>'expiresAt'
    );
  end if;

  select * into v_settings
    from public.loyalty_program_settings
   where salon_id = w.owner_id;
  if v_settings.salon_id is null or not v_settings.is_enabled then
    raise exception 'Ziya Style Rewards is currently disabled for this salon';
  end if;

  select * into v_reward
    from public.loyalty_rewards
   where id = p_reward_id
     and salon_id = w.owner_id
     and is_active = true;
  if v_reward.id is null then
    raise exception 'This loyalty reward is unavailable or inactive';
  end if;

  select coalesce(sum(points_delta), 0)::int
    into v_balance
    from public.loyalty_points_ledger
   where salon_id = w.owner_id
     and customer_id = v_actor;

  if v_balance < v_reward.points_cost then
    raise exception 'Insufficient Ziya Style Points (you have % pts, need % pts)',
      v_balance, v_reward.points_cost;
  end if;

  v_code := 'ZIYA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_expires := now() + make_interval(days => v_reward.validity_days);

  insert into public.studioflow_customer_reward_claims (
    customer_id,
    owner_id,
    reward_id,
    reward_title,
    reward_terms,
    points_spent,
    coupon_code,
    request_id
  ) values (
    v_actor,
    w.owner_id,
    v_reward.id::text,
    v_reward.title,
    jsonb_build_object(
      'rewardType', v_reward.reward_type,
      'discountValue', v_reward.discount_value,
      'minimumSpend', v_reward.min_booking_amount,
      'applicableCategory', 'all services',
      'applicableServiceIds', v_reward.applicable_service_ids,
      'expiresAt', v_expires,
      'source', 'ziya_style_rewards'
    ),
    v_reward.points_cost,
    v_code,
    p_request_id
  ) returning * into v_claim;

  insert into public.loyalty_points_ledger (
    salon_id, customer_id, reward_id, claim_id, entry_type,
    points_delta, balance_after, description, idempotency_key, created_by
  ) values (
    w.owner_id,
    v_actor,
    v_reward.id,
    v_claim.id,
    'redeem_reward',
    -v_reward.points_cost,
    v_balance - v_reward.points_cost,
    format('Redeemed %s (code %s)', v_reward.title, v_code),
    'redeem:' || p_request_id::text,
    v_actor
  );

  return jsonb_build_object(
    'claimId', v_claim.id,
    'couponCode', v_claim.coupon_code,
    'title', v_claim.reward_title,
    'pointsSpent', v_reward.points_cost,
    'balanceAfter', v_balance - v_reward.points_cost,
    'expiresAt', v_expires
  );
end;
$$;
revoke all on function studioflow_private.ziya_redeem_loyalty_reward(text, uuid, uuid) from public, anon, authenticated;

create or replace function public.studioflow_ziya_redeem_loyalty_reward(
  p_slug text,
  p_reward_id uuid,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select studioflow_private.ziya_redeem_loyalty_reward(p_slug, p_reward_id, p_request_id);
$$;
revoke all on function public.studioflow_ziya_redeem_loyalty_reward(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_redeem_loyalty_reward(text, uuid, uuid) to authenticated;

-- Public Contact / Haircut Enquiry RPC (reuses public.studioflow_enquiries)
create or replace function public.studioflow_ziya_submit_enquiry(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text default '',
  p_service_id text default '',
  p_service_name text default '',
  p_message text default '',
  p_preferred_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(p_message, ''))) < 5 then
    raise exception 'Please share a brief note about your haircut style or question (at least 5 characters)';
  end if;
  return studioflow_prism_private.enquire(
    p_slug,
    p_name,
    p_phone,
    p_email,
    p_service_id,
    p_service_name,
    p_message,
    p_preferred_date,
    'website'
  );
end;
$$;
revoke all on function public.studioflow_ziya_submit_enquiry(text, text, text, text, text, text, text, date) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_submit_enquiry(text, text, text, text, text, text, text, date) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. Salon Admin RPCs (Promotions CRUD, Loyalty Settings, Rewards CRUD & Point Adjustments)
-- ----------------------------------------------------------------------------
create or replace function public.studioflow_ziya_admin_dashboard(p_salon_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
  v_promotions jsonb := '[]'::jsonb;
  v_redemptions jsonb := '[]'::jsonb;
  v_settings public.loyalty_program_settings;
  v_rewards jsonb := '[]'::jsonb;
  v_customers jsonb := '[]'::jsonb;
  v_ledger jsonb := '[]'::jsonb;
  v_enquiries jsonb := '[]'::jsonb;
begin
  if not studioflow_private.can_view_salon_staff(v_salon) then
    raise exception 'Salon admin or staff authorization required' using errcode = '42501';
  end if;

  perform studioflow_private.seed_ziya_salon_defaults(v_salon, false);

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
        'usedCount', (
          select count(*)::int
            from public.promotion_redemptions r
           where r.promotion_id = sp.id
             and r.status in ('reserved', 'applied')
        ),
        'createdAt', sp.created_at,
        'updatedAt', sp.updated_at
      )
      order by sp.display_order asc, sp.created_at desc
    ),
    '[]'::jsonb
  )
    into v_promotions
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
        'redeemedAt', r.redeemed_at
      )
      order by r.redeemed_at desc
    ),
    '[]'::jsonb
  )
    into v_redemptions
    from (
      select * from public.promotion_redemptions
       where salon_id = v_salon
       order by redeemed_at desc
       limit 50
    ) r;

  select * into v_settings
    from public.loyalty_program_settings
   where salon_id = v_salon;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', lr.id,
        'title', lr.title,
        'description', lr.description,
        'pointsCost', lr.points_cost,
        'rewardType', lr.reward_type,
        'discountValue', lr.discount_value,
        'minBookingAmount', lr.min_booking_amount,
        'applicableServiceIds', lr.applicable_service_ids,
        'validityDays', lr.validity_days,
        'displayOrder', lr.display_order,
        'isActive', lr.is_active,
        'isDemo', lr.is_demo
      )
      order by lr.display_order asc, lr.points_cost asc
    ),
    '[]'::jsonb
  )
    into v_rewards
    from public.loyalty_rewards lr
   where lr.salon_id = v_salon;

  -- Aggregated real customer balances ( combines customers who booked or have ledger activity )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'customerId', c.customer_id,
        'customerName', coalesce(nullif(c.customer_name, ''), 'Registered Customer'),
        'customerEmail', coalesce(c.customer_email, ''),
        'balance', greatest(0, c.balance),
        'totalEarned', c.total_earned,
        'totalRedeemed', c.total_redeemed,
        'lastActivityAt', c.last_activity_at
      )
      order by c.last_activity_at desc nulls last
    ),
    '[]'::jsonb
  )
    into v_customers
    from (
      select ids.customer_id,
             coalesce(
               (select p.full_name from public.studioflow_android_profiles p where p.customer_id = ids.customer_id and btrim(p.full_name) <> '' limit 1),
               (select b.payload->>'clientName' from public.studioflow_bookings b where b.owner_id = v_salon and b.customer_id = ids.customer_id order by b.created_at desc limit 1),
               ''
             ) as customer_name,
             coalesce((select u.email from auth.users u where u.id = ids.customer_id), '') as customer_email,
             coalesce((select sum(l.points_delta) from public.loyalty_points_ledger l where l.salon_id = v_salon and l.customer_id = ids.customer_id), 0)::int as balance,
             coalesce((select sum(l.points_delta) from public.loyalty_points_ledger l where l.salon_id = v_salon and l.customer_id = ids.customer_id and l.points_delta > 0), 0)::int as total_earned,
             coalesce((select sum(-l.points_delta) from public.loyalty_points_ledger l where l.salon_id = v_salon and l.customer_id = ids.customer_id and l.entry_type = 'redeem_reward' and l.points_delta < 0), 0)::int as total_redeemed,
             greatest(
               (select max(l.created_at) from public.loyalty_points_ledger l where l.salon_id = v_salon and l.customer_id = ids.customer_id),
               (select max(b.created_at) from public.studioflow_bookings b where b.owner_id = v_salon and b.customer_id = ids.customer_id)
             ) as last_activity_at
        from (
          select distinct customer_id from public.loyalty_points_ledger where salon_id = v_salon
          union
          select distinct customer_id from public.studioflow_bookings where owner_id = v_salon and customer_id is not null
        ) ids
       limit 100
    ) c;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'customerId', l.customer_id,
        'customerEmail', coalesce((select u.email from auth.users u where u.id = l.customer_id), ''),
        'bookingId', l.booking_id,
        'entryType', l.entry_type,
        'pointsDelta', l.points_delta,
        'balanceAfter', l.balance_after,
        'description', l.description,
        'createdAt', l.created_at
      )
      order by l.created_at desc
    ),
    '[]'::jsonb
  )
    into v_ledger
    from (
      select * from public.loyalty_points_ledger
       where salon_id = v_salon
       order by created_at desc
       limit 80
    ) l;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'phone', e.phone,
        'email', e.email,
        'serviceName', e.service_name,
        'message', e.message,
        'preferredDate', e.preferred_date,
        'status', e.status,
        'createdAt', e.created_at
      )
      order by e.created_at desc
    ),
    '[]'::jsonb
  )
    into v_enquiries
    from (
      select * from public.studioflow_enquiries
       where salon_id = v_salon
       order by created_at desc
       limit 40
    ) e;

  return jsonb_build_object(
    'salonId', v_salon,
    'canManage', studioflow_private.can_manage_salon(v_salon),
    'promotions', v_promotions,
    'redemptions', v_redemptions,
    'loyaltySettings', case
      when v_settings.salon_id is null then null
      else jsonb_build_object(
        'programName', v_settings.program_name,
        'isEnabled', v_settings.is_enabled,
        'pointsPer100Inr', v_settings.points_per_100_inr,
        'pointsPerVisit', v_settings.points_per_visit,
        'minEligibleSpendInr', v_settings.min_eligible_spend_inr,
        'welcomeBonusPoints', v_settings.welcome_bonus_points,
        'rulesSummary', v_settings.rules_summary,
        'termsConditions', v_settings.terms_conditions,
        'isDemo', v_settings.is_demo,
        'demoApproved', v_settings.demo_approved
      )
    end,
    'loyaltyRewards', v_rewards,
    'customerBalances', v_customers,
    'recentLedger', v_ledger,
    'enquiries', v_enquiries
  );
end;
$$;
revoke all on function public.studioflow_ziya_admin_dashboard(uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_admin_dashboard(uuid) to authenticated;

create or replace function public.studioflow_ziya_admin_save_promotion(
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
  v_desc text := btrim(coalesce(p_payload->>'description', ''));
  v_type text := lower(btrim(coalesce(p_payload->>'discountType', 'percentage')));
  v_value numeric := (p_payload->>'discountValue')::numeric;
  v_code text := upper(regexp_replace(btrim(coalesce(p_payload->>'couponCode', '')), '[^A-Za-z0-9_-]', '', 'g'));
  v_min numeric := greatest(0, coalesce((p_payload->>'minBookingAmount')::numeric, 0));
  v_services jsonb := case
    when jsonb_typeof(p_payload->'applicableServiceIds') = 'array' then p_payload->'applicableServiceIds'
    else '[]'::jsonb
  end;
  v_starts date := nullif(btrim(coalesce(p_payload->>'startsAt', '')), '')::date;
  v_ends date := nullif(btrim(coalesce(p_payload->>'endsAt', '')), '')::date;
  v_max_total integer := nullif(btrim(coalesce(p_payload->>'maxTotalUses', '')), '')::integer;
  v_max_cust integer := greatest(1, coalesce(nullif(btrim(coalesce(p_payload->>'maxUsesPerCustomer', '')), '')::integer, 1));
  v_terms text := left(btrim(coalesce(p_payload->>'termsConditions', '')), 1000);
  v_banner text := left(btrim(coalesce(p_payload->>'bannerImageUrl', '')), 2048);
  v_order integer := coalesce((p_payload->>'displayOrder')::integer, 0);
  v_active boolean := coalesce((p_payload->>'isActive')::boolean, true);
  v_demo_approved boolean := coalesce((p_payload->>'demoApproved')::boolean, true);
  v_saved public.salon_promotions;
begin
  if not studioflow_private.can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorization required' using errcode = '42501';
  end if;
  if char_length(v_title) not between 2 and 140 then
    raise exception 'Offer title must be between 2 and 140 characters';
  end if;
  if v_type not in ('percentage', 'flat') then
    raise exception 'Discount type must be percentage or flat';
  end if;
  if v_value is null or v_value <= 0 or (v_type = 'percentage' and v_value > 100) then
    raise exception 'Enter a valid discount value';
  end if;
  if v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'Coupon code must be 3–32 uppercase letters, numbers, hyphens or underscores';
  end if;
  if v_starts is not null and v_ends is not null and v_ends < v_starts then
    raise exception 'End date must be on or after the start date';
  end if;
  if exists (
    select 1
      from public.salon_promotions sp
     where sp.salon_id = v_salon
       and upper(sp.coupon_code) = v_code
       and (v_id is null or sp.id <> v_id)
  ) then
    raise exception 'Another promotion already uses coupon code %', v_code;
  end if;

  if v_id is not null then
    update public.salon_promotions
       set title = v_title,
           description = left(v_desc, 600),
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
     where id = v_id
       and salon_id = v_salon
     returning * into v_saved;
    if v_saved.id is null then
      raise exception 'Promotion not found for this salon';
    end if;
  else
    insert into public.salon_promotions (
      salon_id, title, description, discount_type, discount_value, coupon_code,
      min_booking_amount, applicable_service_ids, starts_at, ends_at,
      max_total_uses, max_uses_per_customer, terms_conditions, banner_image_url,
      display_order, is_active, is_demo, demo_approved
    ) values (
      v_salon, v_title, left(v_desc, 600), v_type, v_value, v_code,
      v_min, v_services, v_starts, v_ends,
      v_max_total, v_max_cust, v_terms, v_banner,
      v_order, v_active, false, true
    ) returning * into v_saved;
  end if;

  return jsonb_build_object('id', v_saved.id, 'couponCode', v_saved.coupon_code, 'isActive', v_saved.is_active);
end;
$$;
revoke all on function public.studioflow_ziya_admin_save_promotion(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_admin_save_promotion(jsonb, uuid) to authenticated;

create or replace function public.studioflow_ziya_admin_delete_promotion(
  p_promotion_id uuid,
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
  if not studioflow_private.can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorization required' using errcode = '42501';
  end if;
  delete from public.salon_promotions
   where id = p_promotion_id
     and salon_id = v_salon
   returning id into v_deleted;
  if v_deleted is null then
    raise exception 'Promotion not found for this salon';
  end if;
  return jsonb_build_object('deletedId', v_deleted);
end;
$$;
revoke all on function public.studioflow_ziya_admin_delete_promotion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_admin_delete_promotion(uuid, uuid) to authenticated;

create or replace function public.studioflow_ziya_admin_save_loyalty_settings(
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
  v_name text := btrim(coalesce(nullif(p_payload->>'programName', ''), 'Ziya Style Rewards'));
  v_enabled boolean := coalesce((p_payload->>'isEnabled')::boolean, true);
  v_per_100 integer := greatest(1, least(100, coalesce((p_payload->>'pointsPer100Inr')::integer, 1)));
  v_per_visit integer := greatest(0, least(1000, coalesce((p_payload->>'pointsPerVisit')::integer, 0)));
  v_min_spend numeric := greatest(0, coalesce((p_payload->>'minEligibleSpendInr')::numeric, 100));
  v_welcome integer := greatest(0, least(1000, coalesce((p_payload->>'welcomeBonusPoints')::integer, 0)));
  v_rules text := left(btrim(coalesce(p_payload->>'rulesSummary', '')), 1000);
  v_terms text := left(btrim(coalesce(p_payload->>'termsConditions', '')), 2000);
  v_approved boolean := coalesce((p_payload->>'demoApproved')::boolean, true);
begin
  if not studioflow_private.can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorization required' using errcode = '42501';
  end if;

  insert into public.loyalty_program_settings (
    salon_id, program_name, is_enabled, points_per_100_inr, points_per_visit,
    min_eligible_spend_inr, welcome_bonus_points, rules_summary, terms_conditions,
    is_demo, demo_approved
  ) values (
    v_salon, v_name, v_enabled, v_per_100, v_per_visit,
    v_min_spend, v_welcome, v_rules, v_terms,
    false, v_approved
  )
  on conflict (salon_id) do update
    set program_name = excluded.program_name,
        is_enabled = excluded.is_enabled,
        points_per_100_inr = excluded.points_per_100_inr,
        points_per_visit = excluded.points_per_visit,
        min_eligible_spend_inr = excluded.min_eligible_spend_inr,
        welcome_bonus_points = excluded.welcome_bonus_points,
        rules_summary = excluded.rules_summary,
        terms_conditions = excluded.terms_conditions,
        demo_approved = v_approved,
        updated_at = now();

  return jsonb_build_object('salonId', v_salon, 'isEnabled', v_enabled, 'demoApproved', v_approved);
end;
$$;
revoke all on function public.studioflow_ziya_admin_save_loyalty_settings(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_admin_save_loyalty_settings(jsonb, uuid) to authenticated;

create or replace function public.studioflow_ziya_admin_save_loyalty_reward(
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
  v_desc text := left(btrim(coalesce(p_payload->>'description', '')), 500);
  v_cost integer := (p_payload->>'pointsCost')::integer;
  v_type text := lower(btrim(coalesce(p_payload->>'rewardType', 'flat_discount')));
  v_value numeric := (p_payload->>'discountValue')::numeric;
  v_min numeric := greatest(0, coalesce((p_payload->>'minBookingAmount')::numeric, 0));
  v_services jsonb := case
    when jsonb_typeof(p_payload->'applicableServiceIds') = 'array' then p_payload->'applicableServiceIds'
    else '[]'::jsonb
  end;
  v_days integer := greatest(1, least(730, coalesce((p_payload->>'validityDays')::integer, 90)));
  v_order integer := coalesce((p_payload->>'displayOrder')::integer, 0);
  v_active boolean := coalesce((p_payload->>'isActive')::boolean, true);
  v_saved public.loyalty_rewards;
begin
  if not studioflow_private.can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorization required' using errcode = '42501';
  end if;
  if char_length(v_title) not between 2 and 140 then
    raise exception 'Reward title must be between 2 and 140 characters';
  end if;
  if v_cost is null or v_cost not between 1 and 100000 then
    raise exception 'Points cost must be between 1 and 100,000';
  end if;
  if v_type not in ('flat_discount', 'percentage_discount') then
    raise exception 'Reward type must be flat_discount or percentage_discount';
  end if;
  if v_value is null or v_value <= 0 or (v_type = 'percentage_discount' and v_value > 100) then
    raise exception 'Enter a valid reward discount value';
  end if;

  if v_id is not null then
    update public.loyalty_rewards
       set title = v_title,
           description = v_desc,
           points_cost = v_cost,
           reward_type = v_type,
           discount_value = v_value,
           min_booking_amount = v_min,
           applicable_service_ids = v_services,
           validity_days = v_days,
           display_order = v_order,
           is_active = v_active,
           is_demo = false
     where id = v_id
       and salon_id = v_salon
     returning * into v_saved;
    if v_saved.id is null then
      raise exception 'Reward not found for this salon';
    end if;
  else
    insert into public.loyalty_rewards (
      salon_id, title, description, points_cost, reward_type, discount_value,
      min_booking_amount, applicable_service_ids, validity_days, display_order, is_active, is_demo
    ) values (
      v_salon, v_title, v_desc, v_cost, v_type, v_value,
      v_min, v_services, v_days, v_order, v_active, false
    ) returning * into v_saved;
  end if;

  return jsonb_build_object('id', v_saved.id, 'title', v_saved.title, 'isActive', v_saved.is_active);
end;
$$;
revoke all on function public.studioflow_ziya_admin_save_loyalty_reward(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_admin_save_loyalty_reward(jsonb, uuid) to authenticated;

create or replace function public.studioflow_ziya_admin_delete_loyalty_reward(
  p_reward_id uuid,
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
  if not studioflow_private.can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorization required' using errcode = '42501';
  end if;
  delete from public.loyalty_rewards
   where id = p_reward_id
     and salon_id = v_salon
   returning id into v_deleted;
  if v_deleted is null then
    raise exception 'Reward not found for this salon';
  end if;
  return jsonb_build_object('deletedId', v_deleted);
end;
$$;
revoke all on function public.studioflow_ziya_admin_delete_loyalty_reward(uuid, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_admin_delete_loyalty_reward(uuid, uuid) to authenticated;

create or replace function public.studioflow_ziya_admin_adjust_points(
  p_customer_id uuid,
  p_points_delta integer,
  p_reason text,
  p_request_id uuid default gen_random_uuid(),
  p_salon_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
  v_reason text := btrim(coalesce(p_reason, ''));
  v_existing public.loyalty_points_ledger;
  v_balance integer := 0;
  v_inserted public.loyalty_points_ledger;
begin
  if not studioflow_private.can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorization required' using errcode = '42501';
  end if;
  if p_customer_id is null or p_request_id is null then
    raise exception 'Customer ID and request ID are required';
  end if;
  if p_points_delta is null or p_points_delta = 0 or p_points_delta not between -50000 and 50000 then
    raise exception 'Points adjustment must be non-zero (between -50,000 and +50,000)';
  end if;
  if char_length(v_reason) not between 3 and 300 then
    raise exception 'Provide an audit reason (3–300 characters) for manual point adjustment';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_customer_id) then
    raise exception 'Customer account not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_salon::text || ':' || p_customer_id::text, 917));

  select * into v_existing
    from public.loyalty_points_ledger l
   where l.salon_id = v_salon
     and l.customer_id = p_customer_id
     and l.idempotency_key = 'admin_adj:' || p_request_id::text;

  if v_existing.id is not null then
    return jsonb_build_object(
      'id', v_existing.id,
      'balanceAfter', v_existing.balance_after
    );
  end if;

  select coalesce(sum(points_delta), 0)::int
    into v_balance
    from public.loyalty_points_ledger
   where salon_id = v_salon
     and customer_id = p_customer_id;

  if v_balance + p_points_delta < 0 then
    raise exception 'Adjustment would result in a negative point balance (current balance: % pts)', v_balance;
  end if;

  insert into public.loyalty_points_ledger (
    salon_id, customer_id, entry_type, points_delta, balance_after,
    description, idempotency_key, created_by
  ) values (
    v_salon,
    p_customer_id,
    'admin_adjustment',
    p_points_delta,
    v_balance + p_points_delta,
    'Admin adjustment: ' || v_reason,
    'admin_adj:' || p_request_id::text,
    auth.uid()
  ) returning * into v_inserted;

  return jsonb_build_object(
    'id', v_inserted.id,
    'balanceAfter', v_inserted.balance_after
  );
end;
$$;
revoke all on function public.studioflow_ziya_admin_adjust_points(uuid, integer, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_admin_adjust_points(uuid, integer, text, uuid, uuid) to authenticated;

create or replace function public.studioflow_ziya_admin_restore_demos(p_salon_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salon uuid := coalesce(p_salon_id, auth.uid());
begin
  if not studioflow_private.can_manage_salon(v_salon) then
    raise exception 'Salon owner or manager authorization required' using errcode = '42501';
  end if;
  perform studioflow_private.seed_ziya_salon_defaults(v_salon, true);
  return jsonb_build_object('restored', true);
end;
$$;
revoke all on function public.studioflow_ziya_admin_restore_demos(uuid) from public, anon, authenticated;
grant execute on function public.studioflow_ziya_admin_restore_demos(uuid) to authenticated;

-- Enable realtime on new customer-visible promotions & loyalty tables safely
do $$
declare
  v_tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_tbl in array array['salon_promotions', 'loyalty_program_settings', 'loyalty_rewards', 'loyalty_points_ledger'] loop
      if not exists (
        select 1
          from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = v_tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_tbl);
      end if;
    end loop;
  end if;
end $$;

commit;
