-- Idempotently repair the live Template 04 catalog row without touching its
-- service catalogue or any other template. Salon-owned website photos live in
-- studioflow_websites and are intentionally not modified by this catalog sync.
update public.studioflow_templates
set title = 'Roop Mahal Beauty Parlour & Makeover Space',
    config = config || jsonb_build_object(
      'id', 'beauty_parlour',
      'title', 'Roop Mahal Beauty Parlour & Makeover Space',
      'shortName', 'Beauty Parlour',
      'tagline', 'Bridal Makeovers, Signature Facials, Hair Care & Everyday Beauty Studio',
      'about', 'Serving patrons for over 18 years in Connaught Place, Roop Mahal blends classic Indian herbal beauty secrets like turmeric, saffron, and sandalwood with modern waxing and gold facials.',
      'paletteLabel', 'Warm Cream, Soft Rose, Deep Maroon & Champagne Gold',
      'themePreset', 'rose_gold_ivory',
      'layoutStyle', 'curved_elegant',
      'ownerPhotoUrl', '/templates/roop-mahal/staff-sunita.jpg',
      'coverImageUrl', '/templates/roop-mahal/hero-bridal.jpg',
      'themeStyle', '{
        "heroBackground": "bg-[#FFF8F1]",
        "heroTextColor": "text-[#352622]",
        "cardBorder": "border-[#C5A16B]/40",
        "cardBackground": "bg-[#FFFFFF]",
        "cardRadius": "rounded-2xl",
        "accentColor": "text-[#6D2638]",
        "accentBg": "bg-[#6D2638]",
        "badgeBg": "bg-[#D9A6A1]/25",
        "badgeText": "text-[#6D2638]",
        "buttonBg": "bg-[#6D2638] hover:bg-[#581e2d]",
        "buttonText": "text-white",
        "priceColor": "text-[#6D2638]",
        "isDark": false,
        "headerBanner": "bg-[#FFF8F1] border-b border-[#C5A16B]/35"
      }'::jsonb,
      'stylists', '[
        {"id":"bp-st-1","name":"Sunita Agarwal","role":"Master Aesthetician","avatarUrl":"/templates/roop-mahal/staff-sunita.jpg","specialties":["Gold Facials","Threading","Herbal Recipes"],"rating":4.96},
        {"id":"bp-st-2","name":"Meenakshi Joshi","role":"Senior Skin Therapist","avatarUrl":"/templates/roop-mahal/staff-meenakshi.jpg","specialties":["Rica Waxing","Anti-Tan Peels"],"rating":4.92},
        {"id":"bp-st-3","name":"Pooja Sundaram","role":"Threading & Henna Expert","avatarUrl":"/templates/roop-mahal/staff-pooja.jpg","specialties":["Eyebrow Arching","Festive Combos"],"rating":4.87}
      ]'::jsonb
    ),
    updated_at = now()
where id = 'beauty_parlour';
