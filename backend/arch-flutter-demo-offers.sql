-- =====================================================================
-- Template 13 — Arch & Flutter Lash & Brow Bar · Promotions & Offers seed
-- Idempotent. Two independent parts:
--
-- 1. Workspace content: every lash_brow website that has never carried an
--    offer list gets the six bundled sample offers on its salon profile at
--    `content->'profile'->'promoOffers'`. This is the same record shape the
--    Owner Workspace edits and saves, so nothing is hardcoded in the UI.
--    An owner who deliberately deleted every offer keeps the empty list:
--    we only fill the key when it is absent (NULL), never when it is `[]`.
--
-- 2. Offer records: mirrors the same six offers into the shared
--    public.studioflow_offers table for the published demo salon, matched
--    by title so re-running this file never duplicates a row.
--
-- Demo offers are ordinary editable records flagged `isDemo: true`. The
-- Owner Workspace > Promotions & offers panel clears that flag on the first
-- edit, hide/delete persist with the workspace, expired offers stay visible
-- in the dashboard but never render on the public website or in GlowSlot,
-- and "Reset to sample offers" restores exactly the set below.
--
-- Usage (Supabase SQL editor):
--   select set_config('studioflow.demo_slug', 'arch-flutter-demo', false);
--   -- paste this file
-- =====================================================================

do $$
declare
  demo_slug text := coalesce(nullif(current_setting('studioflow.demo_slug', true), ''), 'arch-flutter-demo');
  today date := current_date;
  festive_end date;
  offers jsonb;
  salon uuid;
  offer record;
begin
  -- "Valid till Diwali week": the next Deepavali (Lakshmi Puja) main day plus
  -- six days, so a freshly seeded festive offer is never already expired.
  select min(d + 6) into festive_end
    from (values (date '2026-11-08'), (date '2027-10-29'), (date '2028-10-17'),
                 (date '2029-11-05'), (date '2030-10-26'), (date '2031-11-12'),
                 (date '2032-11-01')) as diwali(d)
   where d + 6 >= today;

  offers := jsonb_build_array(
    jsonb_build_object(
      'id', 'af-offer-welcome',
      'title', 'Glow Up Welcome Offer',
      'description', 'Twenty percent off your first full set of classic, volume or hybrid lashes. Comes with a free consultation, eye mapping and a lash bath aftercare kit worth ₹499.',
      'image', '',
      'badge', 'New Client',
      'offerType', 'percent',
      'discountValue', 20,
      'originalPriceINR', 2499,
      'offerPriceINR', 1999,
      'applicableServices', '["af-1", "af-5", "af-9"]'::jsonb,
      'couponCode', 'FLUTTER20',
      'validFrom', to_char(today, 'YYYY-MM-DD'),
      'validTo', to_char(today + 60, 'YYYY-MM-DD'),
      'terms', 'Valid on your first appointment only. One offer per client. Cannot be combined with another code or membership.',
      'isActive', true,
      'isDemo', true
    ),
    jsonb_build_object(
      'id', 'af-offer-combo',
      'title', 'Lash + Brow Combo',
      'description', 'Our most booked pairing — full volume lashes and brow lamination in one appointment, with a saving of ₹799 on the menu price.',
      'image', '',
      'badge', 'Most Popular',
      'offerType', 'combo',
      'discountValue', 799,
      'originalPriceINR', 5298,
      'offerPriceINR', 4499,
      'applicableServices', '["af-5", "af-33"]'::jsonb,
      'couponCode', '',
      'validFrom', to_char(today, 'YYYY-MM-DD'),
      'validTo', to_char(today + 90, 'YYYY-MM-DD'),
      'terms', 'Both services must be completed in the same visit. Not valid with the bridal package or another code.',
      'isActive', true,
      'isDemo', true
    ),
    jsonb_build_object(
      'id', 'af-offer-bridal',
      'title', 'Bridal Eye Package',
      'description', 'Hybrid lashes, brow mapping and shaping, plus a bridal trial so every look is confirmed before the big day. Free aftercare kit included.',
      'image', '',
      'badge', 'Bridal Special',
      'offerType', 'combo',
      'discountValue', 1500,
      'originalPriceINR', 9499,
      'offerPriceINR', 7999,
      'applicableServices', '["af-55", "af-9", "af-26", "af-56"]'::jsonb,
      'couponCode', '',
      'validFrom', to_char(today, 'YYYY-MM-DD'),
      'validTo', to_char(today + 120, 'YYYY-MM-DD'),
      'terms', 'Book the trial at least three weeks before the wedding date. The advance booking amount is adjustable against the package.',
      'isActive', true,
      'isDemo', true
    ),
    jsonb_build_object(
      'id', 'af-offer-happy-hours',
      'title', 'Weekday Happy Hours',
      'description', 'Flat fifteen percent off any lash or brow service booked on a weekday slot. Four slots a day only, so book early.',
      'image', '',
      'badge', 'Limited Slots',
      'offerType', 'percent',
      'discountValue', 15,
      'originalPriceINR', 2499,
      'offerPriceINR', 2124,
      'applicableServices', '["af-1", "af-17", "af-25", "af-33"]'::jsonb,
      'couponCode', 'HAPPY15',
      'validFrom', to_char(today, 'YYYY-MM-DD'),
      'validTo', to_char(today + 90, 'YYYY-MM-DD'),
      'terms', 'Valid Monday to Thursday, 11:00 AM to 3:00 PM. Limited to four happy-hour slots a day.',
      'isActive', true,
      'isDemo', true
    ),
    jsonb_build_object(
      'id', 'af-offer-refer',
      'title', 'Refer a Friend',
      'description', 'Refer a friend and you both get ₹500 off your next appointment. No limit on referrals — the more friends, the more flutter.',
      'image', '',
      'badge', 'Referral',
      'offerType', 'flat',
      'discountValue', 500,
      'originalPriceINR', 0,
      'offerPriceINR', 0,
      'applicableServices', '[]'::jsonb,
      'couponCode', 'BESTIE500',
      'validFrom', to_char(today, 'YYYY-MM-DD'),
      'validTo', to_char(today + 180, 'YYYY-MM-DD'),
      'terms', 'Your friend must be a new client. Credit is applied at your next appointment and cannot be exchanged for cash.',
      'isActive', true,
      'isDemo', true
    ),
    jsonb_build_object(
      'id', 'af-offer-festive',
      'title', 'Festive Season Offer',
      'description', 'A complimentary lash lift and tint worth ₹1,999 with any volume or hybrid set booked during the festive week.',
      'image', '',
      'badge', 'Festive',
      'offerType', 'free_addon',
      'discountValue', 1999,
      'originalPriceINR', 0,
      'offerPriceINR', 0,
      'applicableServices', '["af-5", "af-6", "af-9", "af-10"]'::jsonb,
      'couponCode', '',
      'validFrom', to_char(today, 'YYYY-MM-DD'),
      'validTo', to_char(coalesce(festive_end, today + 60), 'YYYY-MM-DD'),
      'terms', 'Valid on volume and hybrid sets only. Festive week slots fill early — book at least ten days ahead.',
      'isActive', true,
      'isDemo', true
    )
  );

  -- Part 1 — workspace content for published lash_brow websites.
  update public.studioflow_websites w
     set content = jsonb_set(coalesce(w.content, '{}'::jsonb), '{profile,promoOffers}', offers, true)
   where coalesce(w.content->'profile'->>'businessType', '') = 'lash_brow'
     and coalesce(w.content->'profile'->'promoOffers', 'null'::jsonb) = 'null'::jsonb;

  -- Part 2 — mirror into the shared offers table for the published demo salon.
  select owner_id into salon from public.studioflow_websites where slug = lower(demo_slug);
  if salon is null then
    raise notice 'Arch & Flutter offers seed: no published salon at slug %, skipping studioflow_offers rows', demo_slug;
    return;
  end if;

  for offer in
    select * from (values
      ('Glow Up Welcome Offer', 'Twenty percent off your first full set of classic, volume or hybrid lashes. Comes with a free consultation, eye mapping and a lash bath aftercare kit worth ₹499.', 'FLUTTER20', 20, null, '20% off · Classic Lashes ₹2,499 → ₹1,999', 'af-1', '/templates/13/art/lash.svg', today - 1, today + 60, 0),
      ('Lash + Brow Combo', 'Our most booked pairing — full volume lashes and brow lamination in one appointment, with a saving of ₹799 on the menu price.', '', null, 799, 'Volume Lashes + Brow Lamination ₹4,499', 'af-5', '/templates/13/art/package.svg', today - 1, today + 90, 1),
      ('Bridal Eye Package', 'Hybrid lashes, brow mapping and shaping, plus a bridal trial so every look is confirmed before the big day. Free aftercare kit included.', '', null, 1500, 'Bridal Eye Ritual ₹7,999 · free aftercare kit', 'af-55', '/templates/13/art/bridal.svg', today - 1, today + 120, 2),
      ('Weekday Happy Hours', 'Flat fifteen percent off any lash or brow service booked on a weekday slot. Four slots a day only, so book early.', 'HAPPY15', 15, null, 'Mon–Thu, 11 AM – 3 PM · four slots a day', 'af-17', '/templates/13/art/studio.svg', today - 1, today + 90, 3),
      ('Refer a Friend', 'Refer a friend and you both get ₹500 off your next appointment. No limit on referrals — the more friends, the more flutter.', 'BESTIE500', null, 500, '₹500 off for you and your friend', '', '/templates/13/art/team.svg', today - 1, today + 180, 4),
      ('Festive Season Offer', 'A complimentary lash lift and tint worth ₹1,999 with any volume or hybrid set booked during the festive week.', '', null, 1999, 'Free lash lift worth ₹1,999', 'af-5', '/templates/13/art/lash-volume.svg', today - 1, coalesce(festive_end, today + 60), 5)
    ) as t(title, description, code, discount_percent, flat_discount_inr, price_note, service_id, image_url, starts_on, ends_on, sort_order)
  loop
    insert into public.studioflow_offers(
      salon_id, title, description, code, discount_percent, flat_discount_inr,
      price_note, service_id, image_url, starts_on, ends_on, active, sort_order
    )
    select salon, offer.title, offer.description, offer.code, offer.discount_percent, offer.flat_discount_inr,
           offer.price_note, offer.service_id, offer.image_url, offer.starts_on, offer.ends_on, true, offer.sort_order
    where not exists (
      select 1 from public.studioflow_offers o
      where o.salon_id = salon and o.title = offer.title
    );
  end loop;
end $$;
