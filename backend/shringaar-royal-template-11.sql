-- Template 11 ("Shringaar Royal Indian Bridal Lounge") — catalog sync
-- Idempotent, single-row update of the template catalogue for `bridal_lounge`.
-- Salon-owned website rows (studioflow_websites) and every owner's saved draft
-- are intentionally untouched: this only refreshes the demo template card, its
-- bundled photography, its ₹ demo menu and the wedding-season demo offer that
-- the Nexora customer app shows for Template 11.
update public.studioflow_templates
set title = 'Shringaar Royal Indian Bridal Lounge',
    config = config || jsonb_build_object(
      'id', 'bridal_lounge',
      'title', 'Shringaar Royal Indian Bridal Lounge',
      'shortName', 'Bridal Makeup & Makeover Lounge',
      'tagline', 'Royal Rajputana Trousseaus · Sabyasachi Aesthetic · Heirloom Makeover Packages',
      'about', 'Shringaar Royal is a bridal atelier in Jaipur, not a beauty parlour. For eleven wedding seasons we have dressed Rajputana brides in hand-worked lehengas, kundan heirlooms and jewellery set by our founder — with a private bridal chamber, a written look book and a pre-bridal ubtan plan for every bride.',
      'icon', 'diamond',
      'layoutStyle', 'palace_heritage',
      'paletteLabel', 'Royal Rajputana Maroon & Gold',
      'themePreset', 'royal_crimson_gold',
      'defaultCity', 'Jaipur, Rajasthan',
      'defaultAddress', 'MI Road, Near Panch Batti & Raj Mandir',
      'defaultPostalCode', '302001',
      'phone', '+91 98290 33411',
      'whatsapp', '+91 98290 33411',
      'ownerName', 'Anuradha Rathore',
      'ownerRole', 'Founder & Bridal Couture Director',
      'ownerPhotoUrl', '/templates/11/artist-anuradha.jpg',
      'coverImageUrl', '/templates/11/hero-bride.jpg',
      'instagramHandle', '@shringaarroyal.jaipur',
      'subCategories', '["Bridal Makeup","Bridal Hair","Draping & Styling","Mehendi","Pre-Bridal Rituals"]'::jsonb,
      'themeStyle', '{
        "heroBackground": "bg-[#5A0F1E]",
        "heroTextColor": "text-[#FBF4E6]",
        "cardBorder": "border-[#C9A24B]/45",
        "cardBackground": "bg-[#FBF4E6]",
        "cardRadius": "rounded-2xl",
        "accentColor": "text-[#5A0F1E]",
        "accentBg": "bg-[#5A0F1E]",
        "badgeBg": "bg-[#C9A24B]/20",
        "badgeText": "text-[#5A0F1E]",
        "buttonBg": "bg-[#5A0F1E] hover:bg-[#4a0c18]",
        "buttonText": "text-[#FBF4E6]",
        "priceColor": "text-[#5A0F1E]",
        "isDark": false,
        "headerBanner": "bg-[#FBF4E6] border-b border-[#C9A24B]/40"
      }'::jsonb,
      'stylists', '[
        {"id":"sr-st-1","name":"Anuradha Rathore","role":"Founder & Bridal Couture Director","avatarUrl":"/templates/11/team/anuradha.jpg","specialties":["Rajputana Trousseau","Airbrush Longevity","Jewellery Setting"],"rating":5,"bio":"Twenty-two wedding seasons styling Rajputana brides. Anuradha designs the look book and personally sets the heirloom jewellery on the wedding morning."},
        {"id":"sr-st-2","name":"Janki Khandelwal","role":"Senior Bridal Makeup Artist","avatarUrl":"/templates/11/team/janki.jpg","specialties":["HD Bridal Base","Sangeet Glam","Skin Prep"],"rating":4.97,"bio":"Known for a base that photographs like second skin and stays put through the pheras, the varmala and the after-party."},
        {"id":"sr-st-3","name":"Farzana Sheikh","role":"Draping & Hair Architecture Specialist","avatarUrl":"/templates/11/team/farzana.jpg","specialties":["Poshak Draping","Gajra Juda","Safa & Turban"],"rating":4.93,"bio":"Pins fifteen-kilo zardozi so a bride can sit, dance and hug her mother without a single pleat slipping."}
      ]'::jsonb,
      'services', '[
        {"id":"sr-1","name":"Royal Rajputana Bridal Trousseau (HD + Airbrush)","category":"Bridal Makeup","durationMinutes":240,"price":35000,"description":"Airbrush base built to last 18 hours, gold-leaf eye work, kundan matha patti setting and a hand-pinned poshak drape for the pheras.","icon":"workspace_premium","popular":true,"imageUrl":"/templates/11/services/makeup.jpg","origin":"template"},
        {"id":"sr-2","name":"Sabyasachi Crimson Bridal Glam","category":"Bridal Makeup","durationMinutes":180,"price":24000,"description":"Flushed bronze cheeks, winged liner, old-world kohl and a velvet dupatta set with our signature crimson drape.","icon":"diamond","popular":true,"imageUrl":"/templates/11/services/glow.jpg","origin":"template"},
        {"id":"sr-3","name":"Sangeet & Cocktail Glow Look","category":"Bridal Makeup","durationMinutes":120,"price":12000,"description":"Shimmer lid, soft contour and international textured waves — designed for dancing, safely under the lights.","icon":"celebration","imageUrl":"/templates/11/services/hair.jpg","origin":"template"},
        {"id":"sr-4","name":"Heritage Bridal Hair Architecture","category":"Bridal Hair","durationMinutes":75,"price":6500,"description":"Gajra-wrapped juda, matha patti and kalgi setting, braid work with fresh flowers — pinned so nothing moves through the night.","icon":"content_cut","imageUrl":"/templates/11/services/hair.jpg","origin":"template"},
        {"id":"sr-5","name":"Poshak, Dupatta & Safa Draping","category":"Draping & Styling","durationMinutes":45,"price":4500,"description":"Hand-pleated lehenga or saree, secure pinning for 15 kg zardozi, and a royal safa or turban for the groom.","icon":"styler","imageUrl":"/templates/11/services/draping.jpg","origin":"template"},
        {"id":"sr-6","name":"Heirloom Bridal Mehendi (Hands & Feet)","category":"Mehendi","durationMinutes":180,"price":8500,"description":"Rajasthani jaali motifs, portrait detailing and a deep mahogany stain developed with our own henna blend.","icon":"brush","imageUrl":"/templates/11/services/mehendi.jpg","origin":"template"},
        {"id":"sr-7","name":"Pre-Bridal 7-Day Ubtan & Glow Ritual","category":"Pre-Bridal Rituals","durationMinutes":180,"price":16500,"description":"Seven sittings of sandalwood-rose ubtan, kesh spa, full body polishing and a diamond radiance facial before the wedding week.","icon":"spa","imageUrl":"/templates/11/services/prebridal.jpg","origin":"template"},
        {"id":"sr-8","name":"Bridal Radiance Facial & Neck Glow","category":"Pre-Bridal Rituals","durationMinutes":75,"price":5500,"description":"Brightening facial with a separate neck and décolleté routine — so the blouse neckline photographs evenly.","icon":"face","imageUrl":"/templates/11/services/glow.jpg","origin":"template"},
        {"id":"sr-pkg-classic","name":"Classic Shringaar Bridal Package","category":"Heirloom Packages","durationMinutes":300,"price":45000,"description":"Wedding-day makeup and hair, one drape, mehendi touch-up and a two-visit pre-bridal plan.","icon":"workspace_premium","imageUrl":"/templates/11/packages/classic.jpg","origin":"template"},
        {"id":"sr-pkg-royal","name":"Royal Rajputana Bridal Package","category":"Heirloom Packages","durationMinutes":420,"price":78000,"description":"Trial look book, wedding-day HD + airbrush, sangeet look, two drapes, bridal mehendi and a five-visit glow plan.","icon":"diamond","popular":true,"imageUrl":"/templates/11/packages/royal.jpg","origin":"template"},
        {"id":"sr-pkg-maharani","name":"Maharani Heirloom Bridal Package","category":"Heirloom Packages","durationMinutes":600,"price":125000,"description":"Three-event styling, heirloom jewellery setting, family makeup for four, seven-visit pre-bridal ritual and a private suite for the bridal party.","icon":"workspace_premium","imageUrl":"/templates/11/packages/maharani.jpg","origin":"template"}
      ]'::jsonb,
      'demoOffer', '{
        "headline": "Wedding Season 2026 dates are open",
        "subtext": "Book this month for a complimentary trial look book and ₹5,000 off the Maharani Heirloom package.",
        "discountPercent": 10,
        "promoCode": "SHRINGAAR26",
        "customOfferText": "Complimentary trial look book + ₹5,000 off Maharani Heirloom",
        "aesthetic": "luxury_gold",
        "aspectRatio": "16:9",
        "campaignTheme": "festive_special",
        "imageUrl": "/templates/11/og-image.jpg"
      }'::jsonb
    ),
    updated_at = now()
where id = 'bridal_lounge';
