-- =====================================================================
-- Template 10 — Prism & Chroma Hair Color Atelier
-- Additive, idempotent wiring for the sections that had no durable store:
--   • studioflow_offers              — dated, coded colour promotions
--   • studioflow_enquiries           — contact/enquiry leads
--   • studioflow_newsletter_subscribers
--   • studioflow_reviews moderation  — status / salon reply / approval
--   • studioflow_prism_site(slug)    — one public, tenant-safe site payload
--   • studioflow_prism_enquire(...)  — validated public lead insert
--   • studioflow_prism_newsletter(...) — validated public subscribe
--
-- Services, packages, staff, gallery, before/after pairs and business
-- information already live in the published studioflow_websites.content
-- projection (owner workspace is the single source of truth). This file does
-- NOT duplicate them into a second write path.
--
-- Apply AFTER studioflow-schema.sql, studioflow-storage-and-booking-status.sql,
-- studioflow-customer-reviews.sql and studioflow-owner-review-update.sql.
-- Safe to re-run.
-- =====================================================================

create schema if not exists studioflow_prism_private;
revoke all on schema studioflow_prism_private from public, anon;
grant usage on schema studioflow_prism_private to authenticated;

-- ---------------------------------------------------------------------
-- updated_at helper (private; never executable by browser roles)
-- ---------------------------------------------------------------------
create or replace function studioflow_prism_private.touch_updated_at() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke all on function studioflow_prism_private.touch_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Offers / promotions
-- salon_id = public.studioflow_websites.owner_id (the salon record)
-- ---------------------------------------------------------------------
create table if not exists public.studioflow_offers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_websites(owner_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 600),
  code text not null default '' check (char_length(btrim(code)) <= 40),
  discount_percent integer check (discount_percent is null or discount_percent between 1 and 100),
  flat_discount_inr integer check (flat_discount_inr is null or flat_discount_inr between 1 and 1000000),
  price_note text not null default '' check (char_length(price_note) <= 120),
  service_id text not null default '' check (char_length(service_id) <= 200),
  image_url text check (image_url is null or char_length(image_url) <= 2048),
  starts_on date,
  ends_on date,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);
create index if not exists studioflow_offers_salon_active_idx
  on public.studioflow_offers(salon_id, active, sort_order);
create index if not exists studioflow_offers_window_idx
  on public.studioflow_offers(salon_id, starts_on, ends_on);

drop trigger if exists studioflow_offers_touch on public.studioflow_offers;
create trigger studioflow_offers_touch before update on public.studioflow_offers
  for each row execute function studioflow_prism_private.touch_updated_at();

alter table public.studioflow_offers enable row level security;
-- Public visitors read this table only through studioflow_prism_site(slug),
-- which strips salon_id and filters inactive/expired offers. Direct table
-- reads are owner-only, so one salon can never enumerate another's offers.
revoke all on public.studioflow_offers from anon, authenticated;
grant select on public.studioflow_offers to authenticated;
grant insert, update, delete on public.studioflow_offers to authenticated;

drop policy if exists studioflow_offers_owner_read on public.studioflow_offers;
create policy studioflow_offers_owner_read on public.studioflow_offers
  for select to authenticated using (salon_id = (select auth.uid()));

drop policy if exists studioflow_offers_owner_insert on public.studioflow_offers;
create policy studioflow_offers_owner_insert on public.studioflow_offers
  for insert to authenticated with check (salon_id = (select auth.uid()));

drop policy if exists studioflow_offers_owner_update on public.studioflow_offers;
create policy studioflow_offers_owner_update on public.studioflow_offers
  for update to authenticated
  using (salon_id = (select auth.uid()))
  with check (salon_id = (select auth.uid()));

drop policy if exists studioflow_offers_owner_delete on public.studioflow_offers;
create policy studioflow_offers_owner_delete on public.studioflow_offers
  for delete to authenticated using (salon_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Enquiries / contact leads
-- ---------------------------------------------------------------------
create table if not exists public.studioflow_enquiries (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_websites(owner_id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  service_id text not null default '' check (char_length(service_id) <= 200),
  service_name text not null default '' check (char_length(service_name) <= 160),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  phone text not null check (char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15),
  email text not null default '' check (char_length(email) <= 254),
  message text not null default '' check (char_length(message) <= 1000),
  preferred_date date,
  source text not null default 'template_10' check (source in ('template_10', 'website', 'glowslot')),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studioflow_enquiries_salon_idx
  on public.studioflow_enquiries(salon_id, created_at desc);
create index if not exists studioflow_enquiries_status_idx
  on public.studioflow_enquiries(salon_id, status, created_at desc);
create index if not exists studioflow_enquiries_customer_idx
  on public.studioflow_enquiries(customer_id) where customer_id is not null;

drop trigger if exists studioflow_enquiries_touch on public.studioflow_enquiries;
create trigger studioflow_enquiries_touch before update on public.studioflow_enquiries
  for each row execute function studioflow_prism_private.touch_updated_at();

alter table public.studioflow_enquiries enable row level security;
-- No browser INSERT: leads are only created through the validated RPC below.
revoke all on public.studioflow_enquiries from anon, authenticated;
grant select on public.studioflow_enquiries to authenticated;
grant update (status, updated_at) on public.studioflow_enquiries to authenticated;

drop policy if exists studioflow_enquiries_owner_read on public.studioflow_enquiries;
create policy studioflow_enquiries_owner_read on public.studioflow_enquiries
  for select to authenticated using (salon_id = (select auth.uid()));

drop policy if exists studioflow_enquiries_owner_update on public.studioflow_enquiries;
create policy studioflow_enquiries_owner_update on public.studioflow_enquiries
  for update to authenticated
  using (salon_id = (select auth.uid()))
  with check (salon_id = (select auth.uid()));

drop policy if exists studioflow_enquiries_customer_read on public.studioflow_enquiries;
create policy studioflow_enquiries_customer_read on public.studioflow_enquiries
  for select to authenticated using (customer_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Newsletter subscribers
-- ---------------------------------------------------------------------
create table if not exists public.studioflow_newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_websites(owner_id) on delete cascade,
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) between 5 and 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
  ),
  name text not null default '' check (char_length(name) <= 120),
  source text not null default 'template_10' check (source in ('template_10', 'website', 'glowslot')),
  consent boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, email)
);
create index if not exists studioflow_newsletter_salon_idx
  on public.studioflow_newsletter_subscribers(salon_id, created_at desc);

drop trigger if exists studioflow_newsletter_touch on public.studioflow_newsletter_subscribers;
create trigger studioflow_newsletter_touch before update on public.studioflow_newsletter_subscribers
  for each row execute function studioflow_prism_private.touch_updated_at();

alter table public.studioflow_newsletter_subscribers enable row level security;
revoke all on public.studioflow_newsletter_subscribers from anon, authenticated;
grant select, delete on public.studioflow_newsletter_subscribers to authenticated;

drop policy if exists studioflow_newsletter_owner_read on public.studioflow_newsletter_subscribers;
create policy studioflow_newsletter_owner_read on public.studioflow_newsletter_subscribers
  for select to authenticated using (salon_id = (select auth.uid()));

drop policy if exists studioflow_newsletter_owner_delete on public.studioflow_newsletter_subscribers;
create policy studioflow_newsletter_owner_delete on public.studioflow_newsletter_subscribers
  for delete to authenticated using (salon_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Review moderation (existing table used by Templates 01–09)
-- Existing rows keep working: they default to approved. Template 10 salons hold
-- new submissions in 'pending' until the owner approves them; every other
-- template keeps auto-publishing reviews exactly as before.
-- ---------------------------------------------------------------------
alter table public.studioflow_reviews add column if not exists status text;
update public.studioflow_reviews set status = 'approved' where status is null;
alter table public.studioflow_reviews alter column status set default 'pending';
alter table public.studioflow_reviews alter column status set not null;
do $$ begin
  alter table public.studioflow_reviews
    add constraint studioflow_reviews_status_check check (status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;
alter table public.studioflow_reviews add column if not exists salon_reply text;
alter table public.studioflow_reviews add column if not exists approved_at timestamptz;
alter table public.studioflow_reviews add column if not exists approved_by uuid;
alter table public.studioflow_reviews add column if not exists staff_id text not null default '';
create index if not exists studioflow_reviews_owner_status_idx
  on public.studioflow_reviews(owner_id, status, updated_at desc);

revoke update on public.studioflow_reviews from anon, authenticated;
grant update (status, salon_reply, approved_at, approved_by) on public.studioflow_reviews to authenticated;

drop policy if exists studioflow_review_owner_moderate on public.studioflow_reviews;
create policy studioflow_review_owner_moderate on public.studioflow_reviews
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Public payload builder
-- ---------------------------------------------------------------------
create or replace function studioflow_prism_private.site(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  w public.studioflow_websites;
  p jsonb;
  cfg jsonb;
  rev jsonb;
  own jsonb;
  off jsonb;
  summary jsonb;
begin
  if coalesce(btrim(p_slug), '') = '' then return jsonb_build_object('found', false); end if;
  select * into w from public.studioflow_websites where slug = lower(btrim(p_slug));
  if w.owner_id is null then return jsonb_build_object('found', false); end if;
  p := coalesce(w.content->'profile', '{}'::jsonb);
  cfg := coalesce(p->'prismChroma', '{}'::jsonb);

  select coalesce(jsonb_agg(studioflow_review_private.review_json(r) order by r.updated_at desc), '[]'::jsonb)
    into rev
    from (
      select * from public.studioflow_reviews
      where owner_id = w.owner_id and status = 'approved'
      order by updated_at desc limit 50
    ) r;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id,
      'title', o.title,
      'description', o.description,
      'code', o.code,
      'discountPercent', o.discount_percent,
      'flatDiscountInr', o.flat_discount_inr,
      'priceNote', o.price_note,
      'serviceId', o.service_id,
      'imageUrl', o.image_url,
      'startsOn', o.starts_on,
      'endsOn', o.ends_on,
      'active', o.active
    ) order by o.sort_order, o.starts_on desc nulls last, o.created_at desc), '[]'::jsonb)
    into off
    from public.studioflow_offers o
    where o.salon_id = w.owner_id and o.active
      and (o.starts_on is null or o.starts_on <= current_date)
      and (o.ends_on is null or o.ends_on >= current_date);

  select jsonb_build_object(
      'count', count(*),
      'average', coalesce(round(avg(rating)::numeric, 1), 0)
    ) into summary
    from public.studioflow_reviews
    where owner_id = w.owner_id and status = 'approved';

  -- A customer can always see their own pending review (never anyone else's).
  select studioflow_review_private.review_json(r) into own
    from public.studioflow_reviews r
    where r.owner_id = w.owner_id and r.customer_id = auth.uid();

  return jsonb_build_object(
    'found', true,
    'salon', jsonb_build_object(
      'id', w.owner_id,
      'slug', w.slug,
      'publishedAt', w.published_at,
      'template', coalesce(p->>'businessType', ''),
      'name', coalesce(nullif(btrim(p->>'businessName'), ''), ''),
      'tagline', coalesce(p->>'tagline', ''),
      'about', coalesce(p->>'about', ''),
      'logoUrl', coalesce(p->>'logoUrl', ''),
      'phone', coalesce(p->>'phone', ''),
      'whatsapp', coalesce(p->>'whatsapp', ''),
      'email', coalesce(nullif(cfg->>'publicEmail', ''), ''),
      'address', coalesce(p->>'address', ''),
      'city', coalesce(p->>'city', ''),
      'postalCode', coalesce(p->>'postalCode', ''),
      'instagram', coalesce(p->>'instagramHandle', ''),
      'facebook', coalesce(p->>'facebookPage', ''),
      'youtube', coalesce(p->>'youtubeChannel', ''),
      'mapEmbedUrl', coalesce(cfg->>'mapEmbedUrl', ''),
      'latitude', p->'latitude',
      'longitude', p->'longitude',
      'openTime', coalesce(nullif(cfg->>'openTime', ''), '10:00'),
      'closeTime', coalesce(nullif(cfg->>'closeTime', ''), '20:30'),
      'workingHoursDisplay', coalesce(nullif(cfg->>'workingHoursDisplay', ''), ''),
      'requireDeposit', coalesce((p->>'requireDeposit')::boolean, true),
      'bookingLeadHours', coalesce((p->'bookingRules'->>'leadHours')::numeric, 0),
      'cancellationWindow', coalesce((p->'bookingRules'->>'cancellationWindow')::numeric, 0)
    ),
    'business', jsonb_build_object(
      'address', coalesce(p->>'address', ''),
      'city', coalesce(p->>'city', ''),
      'postalCode', coalesce(p->>'postalCode', ''),
      'phone', coalesce(p->>'phone', ''),
      'whatsapp', coalesce(p->>'whatsapp', ''),
      'email', coalesce(nullif(cfg->>'publicEmail', ''), ''),
      'workingHoursDisplay', coalesce(nullif(cfg->>'workingHoursDisplay', ''), ''),
      'openTime', coalesce(nullif(cfg->>'openTime', ''), '10:00'),
      'closeTime', coalesce(nullif(cfg->>'closeTime', ''), '20:30'),
      'mapEmbedUrl', coalesce(cfg->>'mapEmbedUrl', ''),
      'social', jsonb_build_object(
        'instagram', coalesce(p->>'instagramHandle', ''),
        'facebook', coalesce(p->>'facebookPage', ''),
        'youtube', coalesce(p->>'youtubeChannel', '')
      )
    ),
    'packages', coalesce(cfg->'packages', '[]'::jsonb),
    'transformations', coalesce(cfg->'beforeAfter', '[]'::jsonb),
    'faqs', coalesce(cfg->'faqs', '[]'::jsonb),
    'shades', coalesce(cfg->'shades', '[]'::jsonb),
    'branches', coalesce(cfg->'branches', '[]'::jsonb),
    'reviews', rev,
    'ownReview', own,
    'reviewSummary', summary,
    'offers', off,
    'counts', jsonb_build_object(
      'services', coalesce(jsonb_array_length(w.content->'services'), 0),
      'staff', coalesce(jsonb_array_length(w.content->'stylists'), 0),
      'gallery', coalesce(jsonb_array_length(w.content->'gallery'), 0),
      'reviews', (summary->>'count')::int,
      'offers', coalesce(jsonb_array_length(off), 0)
    )
  );
end $$;
revoke all on function studioflow_prism_private.site(text) from public, anon, authenticated;
grant execute on function studioflow_prism_private.site(text) to anon, authenticated;
create or replace function public.studioflow_prism_site(p_slug text) returns jsonb
language sql stable security invoker set search_path = '' as $$ select studioflow_prism_private.site(p_slug) $$;
revoke all on function public.studioflow_prism_site(text) from public, anon, authenticated;
grant execute on function public.studioflow_prism_site(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Public enquiry insert (validated, rate-limited, published salons only)
-- ---------------------------------------------------------------------
create or replace function studioflow_prism_private.enquire(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text default '',
  p_service_id text default '',
  p_service_name text default '',
  p_message text default '',
  p_preferred_date date default null,
  p_source text default 'template_10'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  salon uuid;
  actor uuid := auth.uid();
  digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  mail text := lower(btrim(coalesce(p_email, '')));
  sid uuid;
begin
  if exists(select 1 from auth.users where id = actor and banned_until > now()) then
    raise exception 'Account unavailable' using errcode = '42501';
  end if;
  select owner_id into salon from public.studioflow_websites where slug = lower(btrim(coalesce(p_slug, '')));
  if salon is null then raise exception 'This salon website is not available for enquiries'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'Enter your name (2–120 characters)';
  end if;
  if char_length(digits) not between 10 and 15 then
    raise exception 'Enter a valid phone number with 10–15 digits';
  end if;
  if mail <> '' and mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'Enter a valid email address or leave it empty';
  end if;
  if char_length(coalesce(p_message, '')) > 1000 then
    raise exception 'Keep your message under 1000 characters';
  end if;
  if char_length(coalesce(p_service_id, '')) > 200 or char_length(coalesce(p_service_name, '')) > 160 then
    raise exception 'Choose a service from the menu';
  end if;
  if p_preferred_date is not null and (p_preferred_date < current_date or p_preferred_date > current_date + 120) then
    raise exception 'Choose a preferred date within the next 120 days';
  end if;
  if (select count(*) from public.studioflow_enquiries
      where salon_id = salon and phone = coalesce(nullif(btrim(p_phone), ''), '')
        and created_at > now() - interval '15 minutes') >= 3
     or (select count(*) from public.studioflow_enquiries
      where salon_id = salon and regexp_replace(phone, '[^0-9]', '', 'g') = digits
        and created_at > now() - interval '15 minutes') >= 3 then
    raise exception 'You have already sent a few enquiries. Please call the salon or try again later.';
  end if;
  if coalesce(p_source, '') not in ('template_10', 'website', 'glowslot') then
    p_source := 'template_10';
  end if;
  insert into public.studioflow_enquiries(
    salon_id, customer_id, service_id, service_name, name, phone, email, message, preferred_date, source
  ) values (
    salon, actor, btrim(coalesce(p_service_id, '')), btrim(coalesce(p_service_name, '')),
    btrim(p_name), btrim(p_phone), mail, btrim(coalesce(p_message, '')), p_preferred_date, p_source
  ) returning id into sid;
  return jsonb_build_object('id', sid, 'status', 'new');
end $$;
revoke all on function studioflow_prism_private.enquire(text, text, text, text, text, text, text, date, text) from public, anon, authenticated;
grant execute on function studioflow_prism_private.enquire(text, text, text, text, text, text, text, date, text) to anon, authenticated;
create or replace function public.studioflow_prism_enquire(
  p_slug text, p_name text, p_phone text, p_email text default '', p_service_id text default '',
  p_service_name text default '', p_message text default '', p_preferred_date date default null,
  p_source text default 'template_10'
) returns jsonb
language sql security invoker set search_path = '' as $$
  select studioflow_prism_private.enquire(p_slug, p_name, p_phone, p_email, p_service_id, p_service_name, p_message, p_preferred_date, p_source)
$$;
revoke all on function public.studioflow_prism_enquire(text, text, text, text, text, text, text, date, text) from public, anon, authenticated;
grant execute on function public.studioflow_prism_enquire(text, text, text, text, text, text, text, date, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Public newsletter subscribe (double-submit safe, re-subscribe supported)
-- ---------------------------------------------------------------------
create or replace function studioflow_prism_private.newsletter(
  p_slug text, p_email text, p_name text default ''
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  salon uuid;
  mail text := lower(btrim(coalesce(p_email, '')));
  sub uuid;
begin
  select owner_id into salon from public.studioflow_websites where slug = lower(btrim(coalesce(p_slug, '')));
  if salon is null then raise exception 'This salon website is not available'; end if;
  if char_length(mail) not between 5 and 254 or mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'Enter a valid email address';
  end if;
  if char_length(coalesce(p_name, '')) > 120 then raise exception 'Keep your name under 120 characters'; end if;
  insert into public.studioflow_newsletter_subscribers(salon_id, email, name, source, consent, unsubscribed_at)
  values (salon, mail, btrim(coalesce(p_name, '')), 'template_10', true, null)
  on conflict (salon_id, email) do update
    set consent = true,
        unsubscribed_at = null,
        name = coalesce(nullif(excluded.name, ''), public.studioflow_newsletter_subscribers.name),
        updated_at = now()
  returning id into sub;
  return jsonb_build_object('id', sub, 'subscribed', true);
end $$;
revoke all on function studioflow_prism_private.newsletter(text, text, text) from public, anon, authenticated;
grant execute on function studioflow_prism_private.newsletter(text, text, text) to anon, authenticated;
create or replace function public.studioflow_prism_newsletter(p_slug text, p_email text, p_name text default '') returns jsonb
language sql security invoker set search_path = '' as $$ select studioflow_prism_private.newsletter(p_slug, p_email, p_name) $$;
revoke all on function public.studioflow_prism_newsletter(text, text, text) from public, anon, authenticated;
grant execute on function public.studioflow_prism_newsletter(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Reviews: approved-only public list, pending submissions, own review
-- (replaces the two functions from studioflow-owner-review-update.sql)
-- ---------------------------------------------------------------------
create or replace function studioflow_review_private.review_json(r public.studioflow_reviews) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'name', r.name, 'rating', r.rating, 'comment', r.comment,
    'serviceName', r.service_name, 'staffId', r.staff_id, 'imageUrl', r.image_url,
    'date', r.created_at, 'status', r.status, 'salonReply', r.salon_reply,
    'isMine', r.customer_id = auth.uid(), 'isOwnerReview', r.customer_id = r.owner_id,
    'verified', r.customer_id <> r.owner_id and exists(
      select 1 from public.studioflow_bookings b
      where b.owner_id = r.owner_id and b.customer_id = r.customer_id and b.status = 'completed'
    )
  );
$$;
revoke all on function studioflow_review_private.review_json(public.studioflow_reviews) from public, anon, authenticated;

create or replace function studioflow_review_private.list_reviews(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare salon uuid; actor uuid := auth.uid(); result jsonb; own jsonb;
begin
  select owner_id into salon from public.studioflow_websites where slug = p_slug;
  if salon is null then raise exception 'Publish the salon website before collecting customer reviews'; end if;
  select coalesce(jsonb_agg(studioflow_review_private.review_json(r) order by r.updated_at desc), '[]'::jsonb)
    into result
    from (
      select * from public.studioflow_reviews
      where owner_id = salon and status = 'approved'
      order by updated_at desc limit 50
    ) r;
  select studioflow_review_private.review_json(r) into own
    from public.studioflow_reviews r where owner_id = salon and customer_id = actor;
  return jsonb_build_object('reviews', result, 'ownReview', own, 'canReview', actor is not null);
end;
$$;

create or replace function studioflow_review_private.submit_review(
  p_slug text, p_name text, p_rating integer, p_comment text,
  p_service_name text default '', p_image_url text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  salon uuid; actor uuid := auth.uid(); prefix text; image_path text;
  existing public.studioflow_reviews;
  v_template text;
  v_status text;
begin
  if actor is null then raise exception 'Sign in to submit a review' using errcode = '42501'; end if;
  if exists(select 1 from auth.users where id = actor and banned_until > now()) then
    raise exception 'Account unavailable' using errcode = '42501';
  end if;
  select owner_id, coalesce(content->'profile'->>'businessType', '')
    into salon, v_template
    from public.studioflow_websites where slug = p_slug;
  if salon is null then raise exception 'Salon website is unavailable'; end if;
  -- Template 10 moderates every new review before it is published. Every other
  -- template keeps its previous behaviour (reviews appear immediately).
  v_status := case when v_template = 'hair_coloring' then 'pending' else 'approved' end;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 100
     or p_rating is null or p_rating not between 1 and 5
     or char_length(btrim(coalesce(p_comment, ''))) not between 10 and 2000
     or char_length(coalesce(p_service_name, '')) > 150 then
    raise exception 'Provide your name, a 1–5 star rating and a review of 10–2000 characters';
  end if;
  p_image_url := nullif(btrim(p_image_url), '');
  if p_image_url is not null then
    prefix := 'https://zilwgiuiygqqardzutxi.supabase.co/storage/v1/object/public/studioflow-media/';
    if left(p_image_url, char_length(prefix || actor::text || '/')) <> prefix || actor::text || '/' then
      raise exception 'Upload your own review photo';
    end if;
    image_path := substr(p_image_url, char_length(prefix) + 1);
    if not exists(select 1 from storage.objects where bucket_id = 'studioflow-media' and name = image_path) then
      raise exception 'Review photo upload is unavailable';
    end if;
  end if;
  select * into existing from public.studioflow_reviews where owner_id = salon and customer_id = actor;
  if existing.id is not null and existing.updated_at > now() - interval '10 seconds' then
    raise exception 'Please wait a few seconds before updating your review';
  end if;
  insert into public.studioflow_reviews(owner_id, customer_id, name, rating, comment, service_name, image_url, status)
  values (salon, actor, btrim(p_name), p_rating, btrim(p_comment), btrim(coalesce(p_service_name, '')), p_image_url, v_status)
  on conflict (owner_id, customer_id) do update
    set name = excluded.name, rating = excluded.rating, comment = excluded.comment,
        service_name = excluded.service_name, image_url = excluded.image_url,
        status = case when v_status = 'pending' then 'pending' else 'approved' end,
        salon_reply = case when v_status = 'pending' then null else salon_reply end,
        approved_at = case when v_status = 'pending' then null else coalesce(approved_at, now()) end,
        approved_by = case when v_status = 'pending' then null else coalesce(approved_by, actor) end,
        updated_at = now();
  return studioflow_review_private.list_reviews(p_slug);
end;
$$;
revoke all on function studioflow_review_private.list_reviews(text) from public;
revoke all on function studioflow_review_private.submit_review(text, text, integer, text, text, text) from public, anon;
grant execute on function studioflow_review_private.list_reviews(text) to anon, authenticated;
grant execute on function studioflow_review_private.submit_review(text, text, integer, text, text, text) to authenticated;
create or replace function public.studioflow_list_reviews(p_slug text) returns jsonb
language sql stable security invoker set search_path = '' as $$ select studioflow_review_private.list_reviews(p_slug) $$;
create or replace function public.studioflow_submit_review(
  p_slug text, p_name text, p_rating integer, p_comment text,
  p_service_name text default '', p_image_url text default null
) returns jsonb
language sql security invoker set search_path = '' as $$
  select studioflow_review_private.submit_review(p_slug, p_name, p_rating, p_comment, p_service_name, p_image_url)
$$;
revoke all on function public.studioflow_list_reviews(text) from public;
revoke all on function public.studioflow_submit_review(text, text, integer, text, text, text) from public, anon;
grant execute on function public.studioflow_list_reviews(text) to anon, authenticated;
grant execute on function public.studioflow_submit_review(text, text, integer, text, text, text) to authenticated;

-- Owner moderation helper: stamp the approver server-side, never trust the client.
create or replace function studioflow_prism_private.moderate_review(p_review_id uuid, p_status text, p_reply text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.studioflow_reviews;
begin
  if actor is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'Invalid review status'; end if;
  if char_length(coalesce(p_reply, '')) > 1000 then raise exception 'Keep the salon reply under 1000 characters'; end if;
  select * into r from public.studioflow_reviews where id = p_review_id and owner_id = actor for update;
  if r.id is null then raise exception 'Review not found for this salon' using errcode = '42501'; end if;
  update public.studioflow_reviews
    set status = p_status,
        salon_reply = nullif(btrim(coalesce(p_reply, '')), ''),
        approved_at = case when p_status = 'approved' then now() else null end,
        approved_by = case when p_status = 'approved' then actor else null end,
        updated_at = now()
    where id = p_review_id
    returning * into r;
  return studioflow_review_private.review_json(r);
end $$;
revoke all on function studioflow_prism_private.moderate_review(uuid, text, text) from public, anon, authenticated;
grant execute on function studioflow_prism_private.moderate_review(uuid, text, text) to authenticated;
create or replace function public.studioflow_prism_moderate_review(p_review_id uuid, p_status text, p_reply text default null) returns jsonb
language sql security invoker set search_path = '' as $$ select studioflow_prism_private.moderate_review(p_review_id, p_status, p_reply) $$;
revoke all on function public.studioflow_prism_moderate_review(uuid, text, text) from public, anon, authenticated;
grant execute on function public.studioflow_prism_moderate_review(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Storage: the shared public media bucket (public read, owner-only write)
-- Object policies for studioflow-media are created by
-- studioflow-storage-and-booking-status.sql; re-assert the public-read flag.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studioflow-media', 'studioflow-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------
-- Realtime (site polls as a fallback; these tables push instantly)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if not exists(select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  foreach t in array array['studioflow_offers', 'studioflow_enquiries', 'studioflow_newsletter_subscribers', 'studioflow_reviews'] loop
    if not exists(
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
