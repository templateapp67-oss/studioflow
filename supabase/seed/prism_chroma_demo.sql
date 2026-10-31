-- =====================================================================
-- Template 10 — Prism & Chroma demo seed
-- Idempotent. Two independent parts:
--
-- 1. Catalogue sync: refreshes the public demo template card that onboarding,
--    template previews and the Nexora/GlowSlot customer app read. This is the
--    demo data a brand-new hair_coloring salon starts from.
-- 2. Demo salon content: if a published salon exists at the slug stored in
--    `studioflow.demo_slug` (default `prism-chroma-demo`), ensure three dated
--    offers and one approved owner update exist for it. Existing owner data is
--    never overwritten; rows are matched by title/code.
--
-- Usage (Supabase SQL editor):
--   select set_config('studioflow.demo_slug', 'my-demo-salon', false);
--   -- paste this file
-- =====================================================================

update public.studioflow_templates
set title = 'Prism & Chroma Hair Color Atelier',
    config = config || jsonb_build_object(
      'id', 'hair_coloring',
      'title', 'Prism & Chroma Hair Color Atelier',
      'shortName', 'Hair Colour Studio',
      'tagline', 'Colour that turns heads. Care that keeps hair strong.',
      'about', 'Prism & Chroma is a premium hair colour studio. We do balayage, global colour, fashion and pastel shades, highlights, colour correction, keratin and gloss treatments. Before any colour we check hair health, do a patch test, and share the full price in rupees — no surprises later.',
      'icon', 'palette',
      'layoutStyle', 'prism_holographic',
      'paletteLabel', 'Ink Black & Holographic Chroma',
      'themePreset', 'chroma_gradient',
      'subCategories', '["Balayage & Highlights","Global Colour","Fashion Colours","Colour Correction","Keratin & Care"]'::jsonb,
      'defaultCity', 'Mumbai, Maharashtra',
      'defaultAddress', 'Linking Road, Bandra West',
      'defaultPostalCode', '400050',
      'phone', '+91 98200 10010',
      'whatsapp', '+91 98200 10010',
      'ownerName', 'Aarushi Mehta',
      'ownerRole', 'Master Colourist & Founder',
      'ownerPhotoUrl', '/templates/10/team/aarushi.jpg',
      'coverImageUrl', '/templates/10/hero.jpg',
      'instagramHandle', '@prismchroma.colour',
      'themeStyle', '{
        "heroBackground": "bg-[#0B0B14]",
        "heroTextColor": "text-[#F5F3FF]",
        "cardBorder": "border-[#7C5CFF]/40",
        "cardBackground": "bg-[#141422]",
        "cardRadius": "rounded-3xl",
        "accentColor": "text-[#7C5CFF]",
        "accentBg": "bg-[#7C5CFF]",
        "badgeBg": "bg-[#FF4FD8]/20",
        "badgeText": "text-[#F5F3FF]",
        "buttonBg": "bg-gradient-to-r from-[#7C5CFF] via-[#FF4FD8] to-[#FF8A5B]",
        "buttonText": "text-white",
        "priceColor": "text-[#F5F3FF]",
        "isDark": true,
        "headerBanner": "bg-[#0B0B14] border-b border-white/10"
      }'::jsonb,
      'stylists', '[
        {"id":"pc-st-1","name":"Aarushi Mehta","role":"Master Colourist & Founder","experienceYears":10,"avatarUrl":"/templates/10/team/aarushi.jpg","specialties":["Balayage","Colour Correction","Global Colour"],"rating":5,"bio":"Aarushi started Prism & Chroma. She is known for soft balayage and honest advice — she will tell you clearly what your hair can and cannot take."},
        {"id":"pc-st-2","name":"Kiara Kapoor","role":"Senior Colour Expert","experienceYears":8,"avatarUrl":"/templates/10/team/kiara.jpg","specialties":["Fashion Colours","Pastel Shades","Highlights"],"rating":4.9,"bio":"Kiara loves bold colours — violet, magenta, cyan. If you want a full change, Kiara is your person."},
        {"id":"pc-st-3","name":"Priya Nair","role":"Colour & Keratin Expert","experienceYears":7,"avatarUrl":"/templates/10/team/priya.jpg","specialties":["Keratin","Gloss Treatment","Grey Cover"],"rating":4.9,"bio":"Priya cares for the health of your hair first. Her keratin and gloss work keeps hair smooth and shiny for months."},
        {"id":"pc-st-4","name":"Tara Shah","role":"Balayage Artist","experienceYears":6,"avatarUrl":"/templates/10/team/tara.jpg","specialties":["Balayage","Money Piece","Root Touch-Up"],"rating":4.8,"bio":"Tara is quick, neat and friendly. Her money-piece highlights make the face look fresh in one sitting."}
      ]'::jsonb,
      'services', '[
        {"id":"pc-s1","name":"Signature Balayage","category":"Balayage & Highlights","durationMinutes":180,"price":5499,"description":"Hand-painted colour that grows out soft. No harsh lines, just light and shine.","icon":"brush","popular":true,"imageUrl":"/templates/10/services/balayage.jpg","origin":"template"},
        {"id":"pc-s2","name":"Global Colour","category":"Global Colour","durationMinutes":150,"price":3999,"description":"Full-head colour from root to tip, mixed fresh for your skin tone.","icon":"palette","popular":true,"imageUrl":"/templates/10/services/global-colour.jpg","origin":"template"},
        {"id":"pc-s3","name":"Fashion & Pastel Colours","category":"Fashion Colours","durationMinutes":180,"price":4999,"description":"Violet, pink, blue, peach — bold shades done with full hair care.","icon":"auto_awesome","popular":true,"imageUrl":"/templates/10/services/pastel.jpg","origin":"template"},
        {"id":"pc-s4","name":"Highlights & Money Piece","category":"Balayage & Highlights","durationMinutes":120,"price":2999,"description":"Light pieces around the face and crown. Your face looks fresh at once.","icon":"flare","imageUrl":"/templates/10/services/highlights.jpg","origin":"template"},
        {"id":"pc-s5","name":"Colour Correction","category":"Colour Correction","durationMinutes":240,"price":6999,"description":"Colour gone wrong? We fix patchy, brassy or too-dark colour, step by step.","icon":"healing","imageUrl":"/templates/10/services/correction.jpg","origin":"template"},
        {"id":"pc-s6","name":"Keratin Smooth Treatment","category":"Keratin & Care","durationMinutes":180,"price":5999,"description":"Smooth, frizz-free hair for months. Safe after colour too.","icon":"waves","imageUrl":"/templates/10/services/keratin.jpg","origin":"template"},
        {"id":"pc-s7","name":"Gloss & Shine Treatment","category":"Keratin & Care","durationMinutes":45,"price":1499,"description":"A quick shine coat that makes any colour look new again.","icon":"water_drop","imageUrl":"/templates/10/services/gloss.jpg","origin":"template"},
        {"id":"pc-s8","name":"Root Touch-Up & Grey Cover","category":"Global Colour","durationMinutes":60,"price":1299,"description":"Roots and greys covered neat and clean, matched to your current shade.","icon":"format_color_fill","imageUrl":"/templates/10/services/root-touchup.jpg","origin":"template"},
        {"id":"pc-pkg-starter","name":"Starter Colour Refresh Package","category":"Packages","durationMinutes":90,"price":2499,"description":"Root touch-up, gloss treatment and a clean trim. A quick full refresh.","icon":"card_giftcard","imageUrl":"/templates/10/services/gloss.jpg","origin":"template"},
        {"id":"pc-pkg-signature","name":"Signature Colour Package","category":"Packages","durationMinutes":210,"price":5999,"description":"Balayage or global colour, gloss, hair spa and styling. Our most loved package.","icon":"card_giftcard","popular":true,"imageUrl":"/templates/10/services/balayage.jpg","origin":"template"},
        {"id":"pc-pkg-transform","name":"Full Transformation Package","category":"Packages","durationMinutes":300,"price":9999,"description":"Full colour change, keratin or gloss, spa, cut and styling. A brand-new you.","icon":"card_giftcard","popular":true,"imageUrl":"/templates/10/services/pastel.jpg","origin":"template"},
        {"id":"pc-pkg-monthly","name":"Monthly Colour Care Package","category":"Packages","durationMinutes":90,"price":7999,"description":"Four gloss and care visits in one month. Keeps colour fresh and hair strong.","icon":"card_giftcard","imageUrl":"/templates/10/services/keratin.jpg","origin":"template"},
        {"id":"pc-pkg-bridal","name":"Bridal Colour Package","category":"Packages","durationMinutes":240,"price":8499,"description":"Colour, gloss, spa and styling before your big day. Full trial included.","icon":"card_giftcard","imageUrl":"/templates/10/services/highlights.jpg","origin":"template"}
      ]'::jsonb,
      'prismChroma', '{"shades": [{"id": "pc-shade-violet", "name": "Violet Storm", "swatch": "#7C5CFF", "price": 5499, "blurb": "Cool violet with a glassy finish — our most requested fashion shade.", "imageUrl": "/templates/10/shades/violet.jpg", "family": "vivid", "maintenanceLevel": 3, "longevityWeeks": "6-8 weeks", "undertone": "Cool", "bestFor": "Olive and neutral skin tones", "linkedServiceId": "pc-s3"}, {"id": "pc-shade-magenta", "name": "Magenta Muse", "swatch": "#FF4FD8", "price": 5499, "blurb": "Pink-magenta that photographs beautifully in daylight.", "imageUrl": "/templates/10/shades/magenta.jpg", "family": "vivid", "maintenanceLevel": 4, "longevityWeeks": "4-6 weeks", "undertone": "Cool", "bestFor": "Fair and wheatish skin tones", "linkedServiceId": "pc-s3"}, {"id": "pc-shade-coral", "name": "Coral Canvas", "swatch": "#FF8A5B", "price": 4999, "blurb": "Warm coral that lifts dull, grown-out colour.", "imageUrl": "/templates/10/shades/coral.jpg", "family": "warm", "maintenanceLevel": 3, "longevityWeeks": "6-8 weeks", "undertone": "Warm", "bestFor": "Warm undertones", "linkedServiceId": "pc-s3"}, {"id": "pc-shade-cyan", "name": "Cyan Ice", "swatch": "#35E0F0", "price": 5999, "blurb": "Icy cyan on pre-lightened hair. Best after a hair-health check.", "imageUrl": "/templates/10/shades/cyan.jpg", "family": "cool", "maintenanceLevel": 5, "longevityWeeks": "3-5 weeks", "undertone": "Cool", "bestFor": "Bold first-time colour clients", "linkedServiceId": "pc-s1"}, {"id": "pc-shade-caramel", "name": "Caramel Glow", "swatch": "#C98A4B", "price": 5499, "blurb": "Soft caramel balayage that grows out without a harsh line.", "imageUrl": "/templates/10/shades/caramel.jpg", "family": "natural", "maintenanceLevel": 2, "longevityWeeks": "8-10 weeks", "undertone": "Warm", "bestFor": "Everyday office-friendly colour", "linkedServiceId": "pc-s1"}, {"id": "pc-shade-ash", "name": "Ash Mist", "swatch": "#9AA3B2", "price": 5499, "blurb": "Neutral ash that removes brassiness from dark hair.", "imageUrl": "/templates/10/shades/ash.jpg", "family": "cool", "maintenanceLevel": 3, "longevityWeeks": "6-8 weeks", "undertone": "Neutral", "bestFor": "Brassy or yellow-toned hair", "linkedServiceId": "pc-s2"}], "packages": [{"id": "pc-pkg-starter", "tier": "Starter Colour Refresh", "price": 2499, "popular": false, "imageUrl": "/templates/10/services/gloss.jpg", "includes": ["Root touch-up", "Gloss and shine treatment", "Clean trim"], "linkedServiceId": "pc-pkg-starter", "sessionsCount": 1}, {"id": "pc-pkg-signature", "tier": "Signature Colour", "price": 5999, "popular": true, "badgeLabel": "Most loved", "imageUrl": "/templates/10/services/balayage.jpg", "includes": ["Balayage or global colour", "Gloss treatment", "Hair spa", "Blow-dry styling"], "linkedServiceId": "pc-pkg-signature", "sessionsCount": 1}, {"id": "pc-pkg-transform", "tier": "Full Transformation", "price": 9999, "popular": true, "badgeLabel": "Best value", "imageUrl": "/templates/10/services/pastel.jpg", "includes": ["Full colour change", "Keratin or gloss", "Hair spa", "Cut and styling"], "linkedServiceId": "pc-pkg-transform", "sessionsCount": 1}], "beforeAfter": [{"id": "pc-ba-1", "title": "Brass to cool violet", "beforeUrl": "/templates/10/results/before-1.jpg", "afterUrl": "/templates/10/results/after-1.jpg", "serviceLabel": "Fashion & Pastel Colours"}, {"id": "pc-ba-2", "title": "Grown-out roots to soft caramel balayage", "beforeUrl": "/templates/10/results/before-2.jpg", "afterUrl": "/templates/10/results/after-2.jpg", "serviceLabel": "Signature Balayage"}, {"id": "pc-ba-3", "title": "Patchy box dye to even global colour", "beforeUrl": "/templates/10/results/before-3.jpg", "afterUrl": "/templates/10/results/after-3.jpg", "serviceLabel": "Colour Correction"}], "faqs": [{"id": "pc-faq-1", "question": "Do you do a patch test before colour?", "answer": "Yes. Every first-time colour client gets a patch test at least 48 hours before the appointment. It takes two minutes and it is free.", "category": "Safety"}, {"id": "pc-faq-2", "question": "How much does a colour appointment cost?", "answer": "Our menu starts at ₹1,299 for a root touch-up and ₹5,499 for signature balayage. The full price in rupees is shared before any colour starts.", "category": "Pricing"}, {"id": "pc-faq-3", "question": "How long does balayage take?", "answer": "Plan for about three hours: consultation, hand-painting, processing, gloss and styling. Long or very dark hair can take longer.", "category": "Timing"}, {"id": "pc-faq-4", "question": "Will colour damage my hair?", "answer": "We check hair health first and build the formula around it. Bond-care is added to every lightening service, and we will tell you honestly if your hair needs to wait.", "category": "Hair health"}, {"id": "pc-faq-5", "question": "Can I book a specific colourist?", "answer": "Yes. Pick your colourist while booking and the live slot list shows only the times that colourist is free.", "category": "Booking"}, {"id": "pc-faq-6", "question": "What if I need to cancel?", "answer": "You can cancel from My Bookings with the account you booked with. The studio''s cancellation window is shown when you book.", "category": "Booking"}], "stats": [{"id": "pc-live-1", "value": "4", "label": "Colour experts"}, {"id": "pc-live-2", "value": "13", "label": "Colour services"}, {"id": "pc-live-3", "value": "10+", "label": "Years of colour"}], "publicEmail": "hello@prismchroma.example", "openTime": "10:00", "closeTime": "20:30", "workingHoursDisplay": "Open all days · 10:00 AM – 8:30 PM"}'::jsonb,
      'demoOffer', '{
        "headline": "Colour Days 2026 are open",
        "subtext": "Flat 20% off Signature Balayage this week. Full price in rupees is shared before we start, always.",
        "discountPercent": 20,
        "promoCode": "PRISM20",
        "customOfferText": "Flat 20% off Signature Balayage",
        "aesthetic": "bold_graphic",
        "aspectRatio": "16:9",
        "campaignTheme": "flash_discount",
        "imageUrl": "/templates/10/og-image.jpg"
      }'::jsonb
    ),
    updated_at = now()
where id = 'hair_coloring';

-- ---------------------------------------------------------------------
-- Optional demo salon content (no-op when the salon is not published)
-- ---------------------------------------------------------------------
do $$
declare
  demo_slug text := coalesce(nullif(current_setting('studioflow.demo_slug', true), ''), 'prism-chroma-demo');
  salon uuid;
  offer record;
  created_review uuid;
begin
  select owner_id into salon from public.studioflow_websites where slug = lower(demo_slug);
  if salon is null then
    raise notice 'Prism & Chroma seed: no published salon at slug %, skipping demo offers/reviews', demo_slug;
    return;
  end if;

  for offer in
    select * from (values
      ('Colour Days — 20% off Signature Balayage', 'Flat 20% off hand-painted balayage. Free patch test and a full price in rupees before we start.', 'PRISM20', 20, null, 'This week only', 12499, 0),
      ('First-Time Gloss at ₹999', 'A quick gloss and shine coat for first-time clients. Add a trim at 20% off.', 'FIRSTGLOSS', null, 500, 'Mon–Thu, 11 AM–4 PM', 999, 1),
      ('Bridal Colour Trial — Complimentary', 'Book a bridal colour package and your trial gloss is on us.', 'BRIDALTRIAL', null, 1500, 'Valid 45 days before the wedding', null, 2)
    ) as t(title, description, code, discount_percent, flat_discount_inr, price_note, price_from_inr, sort_order)
  loop
    insert into public.studioflow_offers(
      salon_id, title, description, code, discount_percent, flat_discount_inr, price_note, sort_order, active, starts_on, ends_on
    )
    select salon, offer.title, offer.description, offer.code, offer.discount_percent, offer.flat_discount_inr,
           offer.price_note, offer.sort_order, true, current_date - 1, current_date + 45
    where not exists (
      select 1 from public.studioflow_offers o
      where o.salon_id = salon and o.title = offer.title
    );
  end loop;

  -- Fill only the sections the demo site has left empty, so a demo slug shows
  -- the full Prism & Chroma experience without overwriting owner edits.
  update public.studioflow_websites w
     set content = (w.content - 'gallery' - 'profile')
       || jsonb_build_object(
            'gallery', case
              when coalesce(jsonb_array_length(w.content->'gallery'), 0) = 0 then '[{"id": "pc-live-gallery-1", "category": "Hair", "url": "/templates/10/gallery/gallery-1.jpg", "title": "Prism & Chroma colour work 1", "isDemo": false}, {"id": "pc-live-gallery-2", "category": "Hair", "url": "/templates/10/gallery/gallery-2.jpg", "title": "Prism & Chroma colour work 2", "isDemo": false}, {"id": "pc-live-gallery-3", "category": "Hair", "url": "/templates/10/gallery/gallery-3.jpg", "title": "Prism & Chroma colour work 3", "isDemo": false}, {"id": "pc-live-gallery-4", "category": "Hair", "url": "/templates/10/gallery/gallery-4.jpg", "title": "Prism & Chroma colour work 4", "isDemo": false}, {"id": "pc-live-gallery-5", "category": "Hair", "url": "/templates/10/gallery/gallery-5.jpg", "title": "Prism & Chroma colour work 5", "isDemo": false}, {"id": "pc-live-gallery-6", "category": "Hair", "url": "/templates/10/gallery/gallery-6.jpg", "title": "Prism & Chroma colour work 6", "isDemo": false}]'::jsonb
              else w.content->'gallery' end,
            'profile', coalesce(w.content->'profile', '{}'::jsonb)
              || jsonb_build_object(
                   'prismChroma', case
                     when coalesce(w.content->'profile'->'prismChroma', '{}'::jsonb) = '{}'::jsonb then '{"shades": [{"id": "pc-shade-violet", "name": "Violet Storm", "swatch": "#7C5CFF", "price": 5499, "blurb": "Cool violet with a glassy finish — our most requested fashion shade.", "imageUrl": "/templates/10/shades/violet.jpg", "family": "vivid", "maintenanceLevel": 3, "longevityWeeks": "6-8 weeks", "undertone": "Cool", "bestFor": "Olive and neutral skin tones", "linkedServiceId": "pc-s3"}, {"id": "pc-shade-magenta", "name": "Magenta Muse", "swatch": "#FF4FD8", "price": 5499, "blurb": "Pink-magenta that photographs beautifully in daylight.", "imageUrl": "/templates/10/shades/magenta.jpg", "family": "vivid", "maintenanceLevel": 4, "longevityWeeks": "4-6 weeks", "undertone": "Cool", "bestFor": "Fair and wheatish skin tones", "linkedServiceId": "pc-s3"}, {"id": "pc-shade-coral", "name": "Coral Canvas", "swatch": "#FF8A5B", "price": 4999, "blurb": "Warm coral that lifts dull, grown-out colour.", "imageUrl": "/templates/10/shades/coral.jpg", "family": "warm", "maintenanceLevel": 3, "longevityWeeks": "6-8 weeks", "undertone": "Warm", "bestFor": "Warm undertones", "linkedServiceId": "pc-s3"}, {"id": "pc-shade-cyan", "name": "Cyan Ice", "swatch": "#35E0F0", "price": 5999, "blurb": "Icy cyan on pre-lightened hair. Best after a hair-health check.", "imageUrl": "/templates/10/shades/cyan.jpg", "family": "cool", "maintenanceLevel": 5, "longevityWeeks": "3-5 weeks", "undertone": "Cool", "bestFor": "Bold first-time colour clients", "linkedServiceId": "pc-s1"}, {"id": "pc-shade-caramel", "name": "Caramel Glow", "swatch": "#C98A4B", "price": 5499, "blurb": "Soft caramel balayage that grows out without a harsh line.", "imageUrl": "/templates/10/shades/caramel.jpg", "family": "natural", "maintenanceLevel": 2, "longevityWeeks": "8-10 weeks", "undertone": "Warm", "bestFor": "Everyday office-friendly colour", "linkedServiceId": "pc-s1"}, {"id": "pc-shade-ash", "name": "Ash Mist", "swatch": "#9AA3B2", "price": 5499, "blurb": "Neutral ash that removes brassiness from dark hair.", "imageUrl": "/templates/10/shades/ash.jpg", "family": "cool", "maintenanceLevel": 3, "longevityWeeks": "6-8 weeks", "undertone": "Neutral", "bestFor": "Brassy or yellow-toned hair", "linkedServiceId": "pc-s2"}], "packages": [{"id": "pc-pkg-starter", "tier": "Starter Colour Refresh", "price": 2499, "popular": false, "imageUrl": "/templates/10/services/gloss.jpg", "includes": ["Root touch-up", "Gloss and shine treatment", "Clean trim"], "linkedServiceId": "pc-pkg-starter", "sessionsCount": 1}, {"id": "pc-pkg-signature", "tier": "Signature Colour", "price": 5999, "popular": true, "badgeLabel": "Most loved", "imageUrl": "/templates/10/services/balayage.jpg", "includes": ["Balayage or global colour", "Gloss treatment", "Hair spa", "Blow-dry styling"], "linkedServiceId": "pc-pkg-signature", "sessionsCount": 1}, {"id": "pc-pkg-transform", "tier": "Full Transformation", "price": 9999, "popular": true, "badgeLabel": "Best value", "imageUrl": "/templates/10/services/pastel.jpg", "includes": ["Full colour change", "Keratin or gloss", "Hair spa", "Cut and styling"], "linkedServiceId": "pc-pkg-transform", "sessionsCount": 1}], "beforeAfter": [{"id": "pc-ba-1", "title": "Brass to cool violet", "beforeUrl": "/templates/10/results/before-1.jpg", "afterUrl": "/templates/10/results/after-1.jpg", "serviceLabel": "Fashion & Pastel Colours"}, {"id": "pc-ba-2", "title": "Grown-out roots to soft caramel balayage", "beforeUrl": "/templates/10/results/before-2.jpg", "afterUrl": "/templates/10/results/after-2.jpg", "serviceLabel": "Signature Balayage"}, {"id": "pc-ba-3", "title": "Patchy box dye to even global colour", "beforeUrl": "/templates/10/results/before-3.jpg", "afterUrl": "/templates/10/results/after-3.jpg", "serviceLabel": "Colour Correction"}], "faqs": [{"id": "pc-faq-1", "question": "Do you do a patch test before colour?", "answer": "Yes. Every first-time colour client gets a patch test at least 48 hours before the appointment. It takes two minutes and it is free.", "category": "Safety"}, {"id": "pc-faq-2", "question": "How much does a colour appointment cost?", "answer": "Our menu starts at ₹1,299 for a root touch-up and ₹5,499 for signature balayage. The full price in rupees is shared before any colour starts.", "category": "Pricing"}, {"id": "pc-faq-3", "question": "How long does balayage take?", "answer": "Plan for about three hours: consultation, hand-painting, processing, gloss and styling. Long or very dark hair can take longer.", "category": "Timing"}, {"id": "pc-faq-4", "question": "Will colour damage my hair?", "answer": "We check hair health first and build the formula around it. Bond-care is added to every lightening service, and we will tell you honestly if your hair needs to wait.", "category": "Hair health"}, {"id": "pc-faq-5", "question": "Can I book a specific colourist?", "answer": "Yes. Pick your colourist while booking and the live slot list shows only the times that colourist is free.", "category": "Booking"}, {"id": "pc-faq-6", "question": "What if I need to cancel?", "answer": "You can cancel from My Bookings with the account you booked with. The studio''s cancellation window is shown when you book.", "category": "Booking"}], "stats": [{"id": "pc-live-1", "value": "4", "label": "Colour experts"}, {"id": "pc-live-2", "value": "13", "label": "Colour services"}, {"id": "pc-live-3", "value": "10+", "label": "Years of colour"}], "publicEmail": "hello@prismchroma.example", "openTime": "10:00", "closeTime": "20:30", "workingHoursDisplay": "Open all days · 10:00 AM – 8:30 PM"}'::jsonb
                     else w.content->'profile'->'prismChroma' end)
          )
   where w.owner_id = salon;

  if not exists (
    select 1 from public.studioflow_reviews where owner_id = salon and customer_id = salon
  ) then
    insert into public.studioflow_reviews(owner_id, customer_id, name, rating, comment, service_name, status, approved_at, approved_by)
    values (
      salon, salon, 'Prism & Chroma Studio', 5,
      'Welcome to our colour studio. Every review from a real client appears here after the salon approves it. Your colour starts with a free consultation and a patch test.',
      'Studio introduction', 'approved', now(), salon
    )
    returning id into created_review;
    raise notice 'Prism & Chroma seed: added salon introduction review %', created_review;
  end if;
end $$;

notify pgrst, 'reload schema';
