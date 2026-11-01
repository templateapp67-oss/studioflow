-- Editable demonstration content. Replace via admin panel before publishing.
-- Re-running the seed does not overwrite edits made in the admin panel.
BEGIN;
INSERT INTO public.site_settings (
  business_name,tagline,phone,whatsapp,email,address,city,timings,theme_preset,colors,fonts,seo,social,section_order,published,setup_step
) VALUES (
  'Veda Sanjeevani Ayurvedic Wellness & Spa','A quieter rhythm, rooted in Ayurveda.',
  '','','','','',
  '{"monday_saturday":{"open":"10:00","close":"19:00"},"sunday":{"closed":true}}'::jsonb,'neem',
  '{"sandalwood":"#F6EEDD","neem":"#2F4A3A","turmeric":"#D9A233","terracotta":"#B4572F","ink":"#1E1B16"}'::jsonb,
  '{"heading":"Cormorant Garamond","body":"Inter"}'::jsonb,
  '{"title":"Veda Sanjeevani Ayurvedic Wellness & Spa","description":"Personalised Ayurvedic wellness and spa experiences. Replace this placeholder via the admin panel."}'::jsonb,
  '{}'::jsonb,'["hero","about","quiz","services","team","packages","gallery","testimonials","blog","booking","faq","contact"]'::jsonb,false,1
) ON CONFLICT (singleton) DO NOTHING;

INSERT INTO public.sections (key,title,subtitle,body,sort_order) VALUES
 ('hero','Return to your natural rhythm','Ayurvedic care, thoughtfully personalised','Placeholder introduction. Replace via admin panel with your own welcoming story.',1),
 ('about','Our approach','Tradition meets considered care','Placeholder studio story. Describe your philosophy and trained team without medical guarantees.',2),
 ('quiz','Discover your dosha','A gentle starting point','This five-question wellness quiz is educational, not a diagnosis. Replace via admin panel.',3),
 ('services','Our rituals','Choose the care that suits you','Placeholder service introduction. Replace via admin panel.',4),
 ('team','Meet your practitioners','Care in experienced hands','Placeholder team introduction. Verify all qualifications before publishing.',5),
 ('packages','Thoughtfully paired experiences','Make time for yourself','Placeholder package introduction. Replace via admin panel.',6),
 ('gallery','Inside the sanctuary','A glimpse of our space','Add your own photographs and descriptive alternative text via the admin panel.',7),
 ('testimonials','Guest reflections','Words from our community','All seeded testimonials are fictional placeholders. Replace via admin panel with consented guest feedback.',8),
 ('blog','The wellness journal','Small rituals, everyday balance','Educational placeholder articles; replace via admin panel before publishing.',9),
 ('booking','Reserve your ritual','We look forward to welcoming you','Please arrive 15 minutes early. Share accessibility needs or sensitivities when booking.',10),
 ('faq','Before your visit','A few helpful answers','Placeholder guidance. Replace via admin panel with your current policies.',11),
 ('contact','Find us','Let us help you plan your visit','Add your verified address, phone, email and map link via the admin panel before publishing.',12)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.working_hours (weekday,open_time,close_time,is_closed) VALUES
 (0,'10:00','19:00',true),(1,'10:00','19:00',false),(2,'10:00','19:00',false),
 (3,'10:00','19:00',false),(4,'10:00','19:00',false),(5,'10:00','19:00',false),(6,'10:00','19:00',false)
ON CONFLICT (weekday) DO NOTHING;

INSERT INTO public.services (slug,name,category,duration_min,price,benefits,dosha_tags,short_desc,long_desc,sort_order) VALUES
 ('abhyanga','Abhyanga','relax',60,2400,ARRAY['Supports relaxation','Encourages a sense of grounding'],ARRAY['vata','kapha'],
  'A warm-oil, full-body massage with flowing, rhythmic strokes.',
  'This placeholder ritual uses warm herbal oils selected for your preferences. Gentle, coordinated strokes support relaxation and a feeling of grounding. Your practitioner discusses pressure and sensitivities before the session. It is a wellness experience, not a medical treatment.',1),
 ('shirodhara','Shirodhara','mind',45,2800,ARRAY['Supports mental unwinding','Encourages restful moments'],ARRAY['vata','pitta'],
  'A steady stream of warm oil over the forehead invites quiet stillness.',
  'Shirodhara is traditionally used as a calming wellness practice. A practitioner gently pours warm oil across the forehead while you rest comfortably. The experience supports time away from everyday stimulation. Suitability and comfort are discussed before beginning.',2),
 ('panchakarma-detox','Panchakarma Detox','detox',90,4800,ARRAY['Supports a mindful reset','Encourages consistent self-care'],ARRAY['kapha','vata'],
  'A spa-level wellness ritual inspired by traditional Ayurvedic practices.',
  'This introductory experience combines gentle warmth, massage and rest. It traditionally supports a considered self-care routine. The spa offering does not include medical cleansing procedures or guaranteed detoxification. A qualified clinician should advise on clinical Panchakarma.',3),
 ('udvartana','Udvartana','beauty',60,2600,ARRAY['Supports skin conditioning','Leaves skin feeling refreshed'],ARRAY['kapha'],
  'An invigorating herbal-powder massage with upward, energising strokes.',
  'A blend of finely prepared herbs is used in a rhythmic dry massage. The ritual supports gentle exfoliation and skin conditioning. Your practitioner adapts pressure to your comfort and checks for sensitivities. Results vary and no body-shape changes are promised.',4),
 ('kati-basti','Kati Basti','pain_relief',45,2200,ARRAY['Supports lower-back comfort','Encourages muscular relaxation'],ARRAY['vata'],
  'Localised warmth and warm oil are traditionally used for lower-back comfort.',
  'A comfortable oil reservoir is created over the lower back using a dough boundary. Warm oil is maintained for a short, supervised period. This wellness ritual supports relaxation around the lower back. Persistent or severe pain needs assessment by a qualified healthcare professional.',5),
 ('pizhichil','Pizhichil','pain_relief',75,3800,ARRAY['Supports whole-body relaxation','Encourages a feeling of warmth'],ARRAY['vata'],
  'Continuous warm oil and gentle massage create a deeply restful ritual.',
  'Pizhichil combines warm oil application with coordinated massage. Traditionally used as a nourishing wellness practice, it encourages comfort and rest. Your practitioner explains each step and adjusts temperature carefully. It is not a substitute for care for joint or muscle conditions.',6),
 ('netra-tarpana','Netra Tarpana','relax',30,1600,ARRAY['Encourages screen-break rest','Supports a calming pause'],ARRAY['pitta','vata'],
  'A traditional eye-area wellness ritual centred on rest and stillness.',
  'This placeholder offering is a supervised, non-invasive eye-area comfort ritual. It encourages a quiet break from screens and everyday visual demands. No eye conditions are treated or diagnosed. Clinical eye procedures require an appropriately qualified practitioner and separate assessment.',7),
 ('nasya','Nasya','detox',30,1500,ARRAY['Supports a feeling of freshness','Encourages mindful breathing'],ARRAY['kapha'],
  'A gentle facial and steam experience inspired by the tradition of Nasya.',
  'This spa adaptation combines a gentle facial massage with comfortable external steam. It is traditionally associated with a feeling of freshness in the head and neck area. No nasal medication is administered in this wellness offering. Ask a clinician about clinical Nasya or persistent symptoms.',8),
 ('mukha-lepa-herbal-facial','Mukha Lepa Herbal Facial','beauty',60,2300,ARRAY['Supports skin hydration','Encourages a refreshed appearance'],ARRAY['pitta'],
  'A cooling herbal facial tailored to your skin preferences.',
  'Gentle cleansing is followed by a herbal mask and a relaxed facial massage. Ingredients are discussed in advance and a patch test may be recommended. The ritual supports skin conditioning and a refreshed appearance. It does not diagnose or treat skin disease.',9),
 ('garbhini-care','Garbhini Care','relax',60,2700,ARRAY['Supports relaxation during pregnancy','Encourages comfortable rest'],ARRAY['vata'],
  'A gentle, position-adapted massage for expectant guests with clinical clearance.',
  'This placeholder ritual is adapted for comfort during pregnancy. Written clearance from the guest’s maternity clinician and a trained prenatal practitioner are required. Positioning and pressure are adjusted throughout the session. It does not replace antenatal care or treat pregnancy complications.',10),
 ('ayurvedic-consultation','Ayurvedic Consultation','detox',45,1800,ARRAY['Supports informed wellness choices','Encourages a personalised routine'],ARRAY['vata','pitta','kapha'],
  'A wellness conversation about your routines, preferences and goals.',
  'A practitioner listens to your daily routine and self-care goals. The discussion explores traditional Ayurvedic concepts and suitable spa experiences. Educational guidance is individualised without promising medical outcomes. Medical diagnosis and medication decisions remain with your healthcare professional.',11),
 ('yoga-meditation','Yoga & Meditation','mind',60,1200,ARRAY['Supports gentle movement','Encourages mindful breathing'],ARRAY['vata','pitta','kapha'],
  'A gentle movement and guided-breathing session adaptable to experience.',
  'A practitioner guides comfortable movement, breathing awareness and rest. Options are offered for different mobility levels and experience. The session supports a mindful pause rather than athletic performance. Tell your practitioner about injuries or pregnancy before participating.',12)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.staff (id,name,role,qualification,specialty,bio,sort_order) VALUES
 ('a1000000-0000-4000-8000-000000000001','Dr. Ananya Sharma','Lead Ayurvedic Practitioner','Placeholder: BAMS — verify before publishing',ARRAY['Ayurvedic consultation','Abhyanga'],
  'Placeholder biography for a practitioner focused on thoughtful, individual wellness routines. Replace via admin panel.',1),
 ('a1000000-0000-4000-8000-000000000002','Meera Iyer','Senior Wellness Therapist','Placeholder: recognised Ayurvedic massage training — verify',ARRAY['Shirodhara','Pizhichil'],
  'Placeholder biography describing a calm, guest-led approach to traditional spa rituals. Replace via admin panel.',2),
 ('a1000000-0000-4000-8000-000000000003','Rahul Menon','Wellness Therapist','Placeholder: spa therapy and prenatal-massage training — verify',ARRAY['Udvartana','Herbal facial','Garbhini Care'],
  'Placeholder biography for a therapist who explains each step and adapts pressure to guest comfort. Replace via admin panel.',3),
 ('a1000000-0000-4000-8000-000000000004','Kavya Rao','Yoga & Mindfulness Guide','Placeholder: recognised yoga teaching qualification — verify',ARRAY['Yoga','Meditation','Breathing awareness'],
  'Placeholder biography for a guide offering accessible movement and quiet breathing practices. Replace via admin panel.',4)
ON CONFLICT (id) DO NOTHING;

-- Stable seed IDs and a natural-key guard keep links idempotent without
-- imposing a unique constraint on real practitioners' names.
INSERT INTO public.staff_services (staff_id,service_id)
SELECT st.id,s.id FROM public.staff st JOIN public.services s ON
  (st.id = 'a1000000-0000-4000-8000-000000000001' AND s.slug <> 'yoga-meditation') OR
  (st.id = 'a1000000-0000-4000-8000-000000000002' AND s.slug IN ('abhyanga','shirodhara','panchakarma-detox','kati-basti','pizhichil','netra-tarpana','nasya','garbhini-care')) OR
  (st.id = 'a1000000-0000-4000-8000-000000000003' AND s.slug IN ('abhyanga','udvartana','kati-basti','mukha-lepa-herbal-facial','garbhini-care')) OR
  (st.id = 'a1000000-0000-4000-8000-000000000004' AND s.slug = 'yoga-meditation')
WHERE NOT EXISTS (SELECT 1 FROM public.staff_services x WHERE x.staff_id = st.id AND x.service_id = s.id);

INSERT INTO public.packages (id,name,description,price,includes,is_featured,sort_order)
SELECT 'a2000000-0000-4000-8000-000000000001','The Grounding Ritual','Placeholder: a warm-oil massage followed by a calming Shirodhara session.',4900,
  ARRAY['Abhyanga · 60 minutes','Shirodhara · 45 minutes','Herbal tea and quiet rest'],true,1
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.packages (id,name,description,price,includes,is_featured,sort_order)
SELECT 'a2000000-0000-4000-8000-000000000002','The Refresh Edit','Placeholder: an invigorating powder massage and a conditioning herbal facial.',4500,
  ARRAY['Udvartana · 60 minutes','Mukha Lepa Herbal Facial · 60 minutes','Herbal tea'],false,2
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.packages (id,name,description,price,includes,is_featured,sort_order)
SELECT 'a2000000-0000-4000-8000-000000000003','A Mindful Morning','Placeholder: a personalised wellness conversation with gentle yoga and meditation.',2700,
  ARRAY['Ayurvedic Consultation · 45 minutes','Yoga & Meditation · 60 minutes','Seasonal herbal tea'],false,3
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.faqs (id,question,answer,sort_order) VALUES
 ('a3000000-0000-4000-8000-000000000001','What should I expect on my first visit?','Please arrive 15 minutes early to discuss your preferences, sensitivities and comfort. Placeholder policy: replace via admin panel.',1),
 ('a3000000-0000-4000-8000-000000000002','Are these rituals medical treatments?','No. Spa experiences support general wellness and are not a substitute for medical diagnosis or care. Speak with a qualified clinician about health concerns.',2),
 ('a3000000-0000-4000-8000-000000000003','Can I book during pregnancy?','Please tell us when booking. Garbhini Care requires maternity-clinician clearance and an appropriately trained practitioner.',3),
 ('a3000000-0000-4000-8000-000000000004','What is your cancellation policy?','Placeholder: contact us at least 24 hours before your appointment to reschedule. Replace via admin panel with your approved policy.',4),
 ('a3000000-0000-4000-8000-000000000005','What should I bring?','Wear comfortable clothing and share relevant allergies or accessibility needs. Replace this placeholder with your visit guidance.',5),
 ('a3000000-0000-4000-8000-000000000006','How do I choose a service?','Explore the service descriptions or book a wellness consultation. The dosha quiz is educational and does not determine medical suitability.',6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.testimonials (id,name,rating,text,approved,sort_order) VALUES
 ('a4000000-0000-4000-8000-000000000001','Placeholder Guest A',5,'Fictional sample: the team explained every step and the space felt peaceful. Replace via admin panel with consented feedback.',true,1),
 ('a4000000-0000-4000-8000-000000000002','Placeholder Guest B',5,'Fictional sample: a welcome pause in a busy week. Replace via admin panel with consented feedback.',true,2),
 ('a4000000-0000-4000-8000-000000000003','Placeholder Guest C',4,'Fictional sample: thoughtful guidance and a comfortable, unhurried experience. Replace via admin panel with consented feedback.',true,3),
 ('a4000000-0000-4000-8000-000000000004','Placeholder Guest D',5,'Fictional sample: the gentle yoga session was easy to adapt to my experience. Replace via admin panel with consented feedback.',true,4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.blog_posts (title,slug,excerpt,body,published,published_at) VALUES
 ('Making room for a slower morning','making-room-for-a-slower-morning',
  'A draft collection of small, sustainable ideas for a more mindful start.',
  'Placeholder draft. Begin with a few comfortable stretches, a quiet drink and time away from notifications. Consistent rest and gentle routines support everyday wellbeing. Replace via admin panel and have wellness content reviewed before publishing.',false,NULL),
 ('Understanding the three doshas','understanding-the-three-doshas',
  'An introductory, educational guide to Vata, Pitta and Kapha.',
  'Placeholder draft. Ayurvedic tradition describes three doshas as a framework for understanding individual patterns. This framework is not a medical diagnosis. Replace via admin panel with accurately referenced educational content.',false,NULL),
 ('Preparing for your first spa visit','preparing-for-your-first-spa-visit',
  'Practical questions to ask before choosing your first ritual.',
  'Placeholder draft. Share your comfort preferences, sensitivities and access needs with your practitioner. Ask about the ingredients, session length and aftercare. Replace via admin panel with your verified policies.',false,NULL)
ON CONFLICT (slug) DO NOTHING;
COMMIT;
