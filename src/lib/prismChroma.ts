import type {
  PrismChromaBeforeAfter,
  PrismChromaCareStep,
  PrismChromaProcessStep,
  PrismChromaBranch,
  PrismChromaFaqItem,
  PrismChromaPackage,
  PrismChromaReviewItem,
  PrismChromaShade,
  PrismChromaStatItem,
  PrismChromaThemeColors,
  SalonProfile,
  SalonService,
  Stylist,
} from '../types';

/**
 * Template 10 — Prism & Chroma Hair Color Atelier.
 * Category: Hair Coloring Studio (`hair_coloring`), slug `prism-chroma`.
 *
 * Design: "Light through a Prism" — ink-black premium base (#0B0B14) with a
 * holographic violet → magenta → coral → cyan glow, glass bento cards,
 * Syne display type + Manrope body. Every colour is a CSS variable
 * (--bg, --violet, --magenta, --coral, --cyan, --text, --muted) so the
 * onboarding brand-colour step can override the whole look.
 *
 * All copy below is DEFAULT demo content in simple Indian English. Owners
 * edit everything during onboarding (salon name, logo, tagline, phone,
 * WhatsApp, email, city/address, timings, services, INR prices, team,
 * gallery, social links, brand colours) — nothing here is hard-coded into
 * the storefront. Prices are always INR (₹), Indian format (₹5,499).
 *
 * This is a Vite + React SPA (not Next.js), so images use the shared
 * SafeImage component (plain <img loading="lazy"> with fixed width/height
 * and descriptive alt text) — the same pattern as Templates 08 and 09.
 * framer-motion is already a project dependency and is wired through
 * src/lib/motion.ts + MotionConfig reducedMotion="user".
 */

export const PRISM_CHROMA_TEMPLATE_CODE = '10';
export const PRISM_CHROMA_SLUG = 'prism-chroma';
export const PRISM_CHROMA_SELECTOR_LABEL = 'Prism & Chroma (10)';
export const PRISM_CHROMA_BRAND_NAME = 'Prism & Chroma Hair Color Atelier';
export const PRISM_CHROMA_TAGLINE = 'Colour that turns heads. Care that keeps hair strong.';
export const PRISM_CHROMA_HERO_HEADING = 'Your Hair, Every Colour of Light';
export const PRISM_CHROMA_HERO_SUBTEXT =
  'Balayage, bold fashion colours, soft pastels and full colour correction — done by trained colour experts who first check your hair, then colour it with care.';
export const PRISM_CHROMA_DEFAULT_ABOUT =
  'Prism & Chroma is a premium hair colour studio. We do balayage, global colour, fashion and pastel shades, highlights, colour correction, keratin and gloss treatments. Before any colour, we check your hair health, do a patch test, and tell you the full price in ₹ — no surprises later. You pick the shade, we mix it fresh for your hair and skin tone.';
export const PRISM_CHROMA_DEFAULT_CITY = 'Mumbai, Maharashtra';
export const PRISM_CHROMA_DEFAULT_ADDRESS = 'Linking Road, Bandra West';
export const PRISM_CHROMA_DEFAULT_POSTAL_CODE = '400050';
export const PRISM_CHROMA_DEFAULT_PHONE = '+91 98200 10010';
export const PRISM_CHROMA_DEFAULT_EMAIL = 'hello@prismchroma.example';
export const PRISM_CHROMA_DEFAULT_HOURS = 'Open all days · 10:00 AM - 8:30 PM';

export const PRISM_CHROMA_DEFAULT_COLORS: PrismChromaThemeColors = {
  bg: '#0B0B14',
  violet: '#7C5CFF',
  magenta: '#FF4FD8',
  coral: '#FF8A5B',
  cyan: '#35E0F0',
  text: '#F5F3FF',
  muted: '#A9A6C2',
};

/** Default photography — every image is bundled locally in
 * /public/templates/10/ (AI-generated for StudioFlow; see README.md there),
 * so the template renders fully offline with zero stock-site hotlinks.
 * Every slot is onboarding-replaceable: owner uploads win, these are only
 * the fallback. */
const L = (path: string) => `/templates/10/${path}`;

export const PRISM_CHROMA_IMAGES = {
  logoSvg: '/templates/10/logo.svg',
  faviconSvg: '/templates/10/favicon.svg',
  hero: '/templates/10/hero.jpg',
  about: '/templates/10/about.jpg',
  booking: '/templates/10/hero.jpg',
  preview: '/templates/10/hero.jpg',
  ogImage: '/templates/10/hero.jpg',
  interior: L('interior.jpg'),
  services: {
    balayage: L('services/balayage.jpg'),
    global: L('services/global-colour.jpg'),
    pastel: L('services/pastel.jpg'),
    highlights: L('services/highlights.jpg'),
    correction: L('services/correction.jpg'),
    keratin: L('services/keratin.jpg'),
    gloss: L('services/gloss.jpg'),
    root: L('services/root-touchup.jpg'),
  },
  shades: {
    violet: L('shades/violet.jpg'),
    magenta: L('shades/magenta.jpg'),
    coral: L('shades/coral.jpg'),
    cyan: L('shades/cyan.jpg'),
    roseGold: L('shades/rose-gold.jpg'),
    honey: L('shades/honey.jpg'),
  },
  beforeAfter: {
    oneBefore: L('results/before-1.jpg'),
    oneAfter: L('results/after-1.jpg'),
    twoBefore: L('results/before-2.jpg'),
    twoAfter: L('results/after-2.jpg'),
    threeBefore: L('results/before-3.jpg'),
    threeAfter: L('results/after-3.jpg'),
  },
  process: {
    consult: L('process/consultation.jpg'),
    mapping: L('process/mapping.jpg'),
    application: L('process/application.jpg'),
    finish: L('process/finish.jpg'),
  },
  team: {
    aarushi: L('team/aarushi.jpg'),
    kiara: L('team/kiara.jpg'),
    priya: L('team/priya.jpg'),
    tara: L('team/tara.jpg'),
  },
  testimonials: {
    ananya: L('testimonials/ananya.jpg'),
    ishita: L('testimonials/ishita.jpg'),
    meera: L('testimonials/meera.jpg'),
  },
  gallery: [
    { src: L('gallery/gallery-1.jpg'), title: 'Violet balayage with soft waves', tag: 'Balayage' },
    { src: L('gallery/gallery-2.jpg'), title: 'Fresh balayage in the studio', tag: 'Balayage' },
    { src: L('gallery/gallery-3.jpg'), title: 'Magenta muse colour', tag: 'Fashion Colour' },
    { src: L('gallery/gallery-4.jpg'), title: 'Face-light highlights', tag: 'Highlights' },
    { src: L('gallery/gallery-5.jpg'), title: 'Pastel pink shades', tag: 'Fashion Colour' },
    { src: L('gallery/gallery-6.jpg'), title: 'Honey gloss finish', tag: 'Gloss' },
    { src: L('gallery/gallery-7.jpg'), title: 'Smooth keratin finish', tag: 'Keratin' },
    { src: L('gallery/gallery-8.jpg'), title: 'Global colour and blow-dry', tag: 'Global Colour' },
    { src: L('gallery/gallery-9.jpg'), title: 'Colour work at the wash station', tag: 'In Studio' },
    { src: L('gallery/gallery-10.jpg'), title: 'Root touch-up in progress', tag: 'In Studio' },
  ],
} as const;

export const PRISM_CHROMA_DEFAULT_STATS: PrismChromaStatItem[] = [
  { id: 'pc-stat-1', value: '8+', label: 'Years of colour work' },
  { id: 'pc-stat-2', value: '25,000+', label: 'Happy clients' },
  { id: 'pc-stat-3', value: '12', label: 'Colour experts' },
  { id: 'pc-stat-4', value: '4.9★', label: 'Client rating' },
];

export const PRISM_CHROMA_CORE_SERVICES: SalonService[] = [
  { id: 'pc-s1', name: 'Signature Balayage', category: 'Balayage & Highlights', durationMinutes: 180, price: 5499, description: 'Hand-painted colour that grows out soft. No harsh lines, just light and shine.', icon: 'brush', popular: true, imageUrl: PRISM_CHROMA_IMAGES.services.balayage },
  { id: 'pc-s2', name: 'Global Colour', category: 'Global Colour', durationMinutes: 150, price: 3999, description: 'Full-head colour from root to tip, mixed fresh for your skin tone.', icon: 'palette', popular: true, imageUrl: PRISM_CHROMA_IMAGES.services.global },
  { id: 'pc-s3', name: 'Fashion & Pastel Colours', category: 'Fashion Colours', durationMinutes: 180, price: 4999, description: 'Violet, pink, blue, peach — bold shades done with full hair care.', icon: 'auto_awesome', popular: true, imageUrl: PRISM_CHROMA_IMAGES.services.pastel },
  { id: 'pc-s4', name: 'Highlights & Money Piece', category: 'Balayage & Highlights', durationMinutes: 120, price: 2999, description: 'Light pieces around the face and crown. Your face looks fresh at once.', icon: 'flare', imageUrl: PRISM_CHROMA_IMAGES.services.highlights },
  { id: 'pc-s5', name: 'Colour Correction', category: 'Colour Correction', durationMinutes: 240, price: 6999, description: 'Colour gone wrong? We fix patchy, brassy or too-dark colour, step by step.', icon: 'healing', imageUrl: PRISM_CHROMA_IMAGES.services.correction },
  { id: 'pc-s6', name: 'Keratin Smooth Treatment', category: 'Keratin & Care', durationMinutes: 180, price: 5999, description: 'Smooth, frizz-free hair for months. Safe after colour too.', icon: 'waves', imageUrl: PRISM_CHROMA_IMAGES.services.keratin },
  { id: 'pc-s7', name: 'Gloss & Shine Treatment', category: 'Keratin & Care', durationMinutes: 45, price: 1499, description: 'A quick shine coat that makes any colour look new again.', icon: 'water_drop', imageUrl: PRISM_CHROMA_IMAGES.services.gloss },
  { id: 'pc-s8', name: 'Root Touch-Up & Grey Cover', category: 'Global Colour', durationMinutes: 60, price: 1299, description: 'Roots and greys covered neat and clean, matched to your current shade.', icon: 'format_color_fill', imageUrl: PRISM_CHROMA_IMAGES.services.root },
];

/** The three pricing packages, also bookable services (category "Packages"). */
export const PRISM_CHROMA_PACKAGE_SERVICES: SalonService[] = [
  { id: 'pc-pkg-starter', name: 'Starter Colour Refresh Package', category: 'Packages', durationMinutes: 90, price: 2499, description: 'Root touch-up, gloss treatment and a clean trim. A quick full refresh.', icon: 'card_giftcard', imageUrl: PRISM_CHROMA_IMAGES.services.gloss },
  { id: 'pc-pkg-signature', name: 'Signature Colour Package', category: 'Packages', durationMinutes: 210, price: 5999, description: 'Balayage or global colour, gloss, hair spa and styling. Our most loved package.', icon: 'card_giftcard', popular: true, imageUrl: PRISM_CHROMA_IMAGES.services.balayage },
  { id: 'pc-pkg-transform', name: 'Full Transformation Package', category: 'Packages', durationMinutes: 300, price: 9999, description: 'Full colour change, keratin or gloss, spa, cut and styling. A brand-new you.', icon: 'card_giftcard', popular: true, imageUrl: PRISM_CHROMA_IMAGES.services.pastel },
  { id: 'pc-pkg-monthly', name: 'Monthly Colour Care Package', category: 'Packages', durationMinutes: 90, price: 7999, description: 'Four gloss and care visits in one month. Keeps colour fresh and hair strong.', icon: 'card_giftcard', imageUrl: PRISM_CHROMA_IMAGES.services.keratin },
  { id: 'pc-pkg-bridal', name: 'Bridal Colour Package', category: 'Packages', durationMinutes: 240, price: 8499, description: 'Colour, gloss, spa and styling before your big day. Full trial included.', icon: 'card_giftcard', imageUrl: PRISM_CHROMA_IMAGES.services.highlights },
];

export const PRISM_CHROMA_TEMPLATE_SERVICES: SalonService[] = [
  ...PRISM_CHROMA_CORE_SERVICES,
  ...PRISM_CHROMA_PACKAGE_SERVICES,
];

export const PRISM_CHROMA_DEFAULT_PACKAGES: PrismChromaPackage[] = [
  { id: 'pc-pack-1', tier: 'Starter', price: 2499, imageUrl: PRISM_CHROMA_IMAGES.services.gloss, imageAlt: 'Gloss shine treatment at Prism & Chroma', includes: ['Root touch-up', 'Gloss & shine treatment', 'Clean trim', 'Blow-dry finish'], linkedServiceId: 'pc-pkg-starter', sessionsCount: 1, validityDays: 30, savingsNote: 'Save ₹800 vs separate services', carePlanAddon: 499, },
  { id: 'pc-pack-2', tier: 'Signature', price: 5999, popular: true, badgeLabel: 'Most Loved', imageUrl: PRISM_CHROMA_IMAGES.services.balayage, imageAlt: 'Signature balayage colour at Prism & Chroma', includes: ['Balayage or global colour', 'Gloss & shine treatment', 'Hair spa', 'Cut and styling'], linkedServiceId: 'pc-pkg-signature', sessionsCount: 1, validityDays: 45, savingsNote: 'Save ₹1,500 vs separate services', carePlanAddon: 499, },
  { id: 'pc-pack-3', tier: 'Full Transformation', price: 9999, badgeLabel: 'Full Makeover', imageUrl: PRISM_CHROMA_IMAGES.services.pastel, imageAlt: 'Full fashion colour transformation at Prism & Chroma', includes: ['Full colour change', 'Keratin or gloss care', 'Hair spa and deep care', 'Cut, styling and home-care kit'], linkedServiceId: 'pc-pkg-transform', sessionsCount: 2, validityDays: 60, savingsNote: 'Save ₹2,500 vs separate services', carePlanAddon: 0, },
];

export const PRISM_CHROMA_DEFAULT_SHADES: PrismChromaShade[] = [
  { id: 'pc-sh-violet', name: 'Violet Storm', swatch: '#7C5CFF', tintFilter: 'hue-rotate(40deg) saturate(1.4)', price: 4999, blurb: 'Deep violet with a soft shine. Bold, but easy to carry every day.', imageUrl: PRISM_CHROMA_IMAGES.shades.violet, imageAlt: 'Model hair tinted violet in the Shade Studio', linkedServiceId: 'pc-s3' , undertone: 'Cool', finish: 'Gloss', maintenanceLevel: 4, longevityWeeks: '6-8 weeks', bestFor: 'Medium to deep skin tones; loves a bold change.', careTip: 'Use a violet-safe colour shampoo once a week to stop fade.', family: 'vivid', },
  { id: 'pc-sh-magenta', name: 'Magenta Muse', swatch: '#FF4FD8', tintFilter: 'hue-rotate(80deg) saturate(1.5)', price: 4999, blurb: 'Bright pink-magenta that pops in photos and in real life.', imageUrl: PRISM_CHROMA_IMAGES.shades.magenta, imageAlt: 'Model hair tinted magenta in the Shade Studio', linkedServiceId: 'pc-s3' , undertone: 'Cool-Neutral', finish: 'Gloss', maintenanceLevel: 4, longevityWeeks: '5-7 weeks', bestFor: 'Fair to medium skin tones; photo-friendly brightness.', careTip: 'Wash with cool water — hot water fades pink shades fast.', family: 'vivid', },
  { id: 'pc-sh-coral', name: 'Coral Sunset', swatch: '#FF8A5B', tintFilter: 'hue-rotate(-30deg) saturate(1.3)', price: 4499, blurb: 'Warm coral-peach tones, like sunset light in your hair.', imageUrl: PRISM_CHROMA_IMAGES.shades.coral, imageAlt: 'Model hair tinted coral in the Shade Studio', linkedServiceId: 'pc-s3' , undertone: 'Warm', finish: 'Metallic', maintenanceLevel: 3, longevityWeeks: '6-8 weeks', bestFor: 'Warm and wheatish skin tones; soft festive glow.', careTip: 'A peach gloss refresh every 6 weeks keeps the sunset tone alive.', family: 'warm', },
  { id: 'pc-sh-cyan', name: 'Cyan Ice', swatch: '#35E0F0', tintFilter: 'hue-rotate(150deg) saturate(1.3)', price: 4999, blurb: 'Cool blue-cyan shades for a fresh, fearless look.', imageUrl: PRISM_CHROMA_IMAGES.shades.cyan, imageAlt: 'Model hair tinted cyan in the Shade Studio', linkedServiceId: 'pc-s3' , undertone: 'Cool', finish: 'Matte', maintenanceLevel: 5, longevityWeeks: '4-6 weeks', bestFor: 'Fair skin tones and fearless, experimental looks.', careTip: 'Blue shades fade fastest — plan a refresh gloss in month one.', family: 'cool', },
  { id: 'pc-sh-rose', name: 'Rose Gold', swatch: '#F2A7C3', tintFilter: 'hue-rotate(-55deg) saturate(1.1) brightness(1.05)', price: 5499, blurb: 'Soft pink-gold shine. Sweet, classy and very popular.', imageUrl: PRISM_CHROMA_IMAGES.shades.roseGold, imageAlt: 'Model hair tinted rose gold in the Shade Studio', linkedServiceId: 'pc-s1' , undertone: 'Neutral', finish: 'Gloss', maintenanceLevel: 3, longevityWeeks: '6-8 weeks', bestFor: 'Almost every skin tone; soft, premium and wedding friendly.', careTip: 'Use a pink-tinted conditioner to keep the rose tone fresh at home.', family: 'pastel', },
  { id: 'pc-sh-honey', name: 'Honey Balayage', swatch: '#E8B06A', tintFilter: 'sepia(0.35) saturate(1.2) brightness(1.05)', price: 5499, blurb: 'Warm honey light pieces. Natural, sunny and low care.', imageUrl: PRISM_CHROMA_IMAGES.shades.honey, imageAlt: 'Model hair with honey balayage in the Shade Studio', linkedServiceId: 'pc-s1' , undertone: 'Warm', finish: 'Gloss', maintenanceLevel: 2, longevityWeeks: '10-12 weeks', bestFor: 'Natural look lovers; grows out soft with no harsh root line.', careTip: 'Just a gloss every 8 weeks — the easiest shade to maintain.', family: 'natural', },
];

export const PRISM_CHROMA_DEFAULT_BEFORE_AFTER: PrismChromaBeforeAfter[] = [
  { id: 'pc-ba-1', title: 'Dull brown to violet balayage', beforeUrl: PRISM_CHROMA_IMAGES.beforeAfter.oneBefore, afterUrl: PRISM_CHROMA_IMAGES.beforeAfter.oneAfter, beforeAlt: 'Hair before colour — dull and flat', afterAlt: 'Hair after violet balayage colour', serviceLabel: 'Fashion Colour + Balayage', sessionsNote: 'Done in 1 sitting (about 3 hours)', stylistName: 'Kiara', },
  { id: 'pc-ba-2', title: 'Faded colour to bright highlights', beforeUrl: PRISM_CHROMA_IMAGES.beforeAfter.twoBefore, afterUrl: PRISM_CHROMA_IMAGES.beforeAfter.twoAfter, beforeAlt: 'Hair before highlights — faded colour', afterAlt: 'Hair after bright face-light highlights', serviceLabel: 'Highlights & Money Piece', sessionsNote: 'Done in 1 sitting (about 2 hours)', stylistName: 'Tara', },
  { id: 'pc-ba-3', title: 'Dry hair to smooth pastel shine', beforeUrl: PRISM_CHROMA_IMAGES.beforeAfter.threeBefore, afterUrl: PRISM_CHROMA_IMAGES.beforeAfter.threeAfter, beforeAlt: 'Hair before treatment — dry and frizzy', afterAlt: 'Hair after pastel colour and smooth finish', serviceLabel: 'Pastel Colour + Gloss Care', sessionsNote: '2 sittings over 2 weeks', stylistName: 'Priya', },
];

export const PRISM_CHROMA_DEFAULT_BRANCHES: PrismChromaBranch[] = [
  { id: 'pc-br-mumbai', name: 'Mumbai', area: 'Bandra West', address: 'Linking Road, Bandra West, Mumbai - 400050', phone: PRISM_CHROMA_DEFAULT_PHONE, hours: '10:00 AM - 8:30 PM', landmark: 'Near Linking Road market', metroNote: 'Bandra station (W) — 8 min auto', parkingNote: 'Paid parking on Linking Road', },
  { id: 'pc-br-delhi', name: 'Delhi', area: 'Hauz Khas Village', address: 'Hauz Khas Village, New Delhi - 110016', phone: PRISM_CHROMA_DEFAULT_PHONE, hours: '10:00 AM - 8:30 PM', landmark: 'Inside Hauz Khas Village market lane', metroNote: 'Green Park metro — 6 min walk', parkingNote: 'Village parking near the lake gate', },
  { id: 'pc-br-jaipur', name: 'Jaipur', area: 'Vaishali Nagar', address: 'Amrapali Circle, Vaishali Nagar, Jaipur - 302021', phone: PRISM_CHROMA_DEFAULT_PHONE, hours: '10:00 AM - 8:30 PM', landmark: 'At Amrapali Circle', metroNote: 'Civil Lines metro — 10 min auto', parkingNote: 'Free parking outside the studio', },
  { id: 'pc-br-blr', name: 'Bengaluru', area: 'Indiranagar', address: '100 Feet Road, Indiranagar, Bengaluru - 560038', phone: PRISM_CHROMA_DEFAULT_PHONE, hours: '10:00 AM - 8:30 PM', landmark: 'Near 100 Feet Road signal', metroNote: 'Indiranagar metro — 5 min walk', parkingNote: 'Basement parking in the building', },
];

export const PRISM_CHROMA_DEFAULT_STYLISTS: Stylist[] = [
  { id: 'pc-st-1', name: 'Aarushi Mehta', role: 'Master Colourist & Founder', experienceYears: 10, avatarUrl: PRISM_CHROMA_IMAGES.team.aarushi, specialties: ['Balayage', 'Colour Correction', 'Global Colour'], rating: 5.0, bio: 'Aarushi started Prism & Chroma. She is known for soft balayage and honest advice — she will tell you clearly what your hair can and cannot take.' },
  { id: 'pc-st-2', name: 'Kiara Kapoor', role: 'Senior Colour Expert', experienceYears: 8, avatarUrl: PRISM_CHROMA_IMAGES.team.kiara, specialties: ['Fashion Colours', 'Pastel Shades', 'Highlights'], rating: 4.9, bio: 'Kiara loves bold colours — violet, magenta, cyan. If you want a full change, Kiara is your person.' },
  { id: 'pc-st-3', name: 'Priya Nair', role: 'Colour & Keratin Expert', experienceYears: 7, avatarUrl: PRISM_CHROMA_IMAGES.team.priya, specialties: ['Keratin', 'Gloss Treatment', 'Grey Cover'], rating: 4.9, bio: 'Priya cares for the health of your hair first. Her keratin and gloss work keeps hair smooth and shiny for months.' },
  { id: 'pc-st-4', name: 'Tara Shah', role: 'Balayage Artist', experienceYears: 6, avatarUrl: PRISM_CHROMA_IMAGES.team.tara, specialties: ['Balayage', 'Money Piece', 'Root Touch-Up'], rating: 4.8, bio: 'Tara is quick, neat and friendly. Her money-piece highlights make the face look fresh in one sitting.' },
];

export const PRISM_CHROMA_DEFAULT_REVIEWS: PrismChromaReviewItem[] = [
  { id: 'pc-rev-1', name: 'Ananya Kapoor', tag: 'Bandra West, Mumbai', rating: 5, serviceName: 'Signature Balayage', quote: 'Best balayage in Mumbai! Aarushi first checked my hair, told me the full price, and only then started. My hair looks soft and shiny, not dry at all.', avatarUrl: PRISM_CHROMA_IMAGES.testimonials.ananya, shadeName: 'Honey Balayage', visitLabel: 'Visited recently', verified: true, },
  { id: 'pc-rev-2', name: 'Ishita Rao', tag: 'Hauz Khas, Delhi', rating: 5, serviceName: 'Fashion Colours', quote: 'I got violet-magenta colour done by Kiara. The shade is exactly like the photo I showed. Three months later, it still looks fresh.', avatarUrl: PRISM_CHROMA_IMAGES.testimonials.ishita, shadeName: 'Violet Storm', visitLabel: 'Visited recently', verified: true, },
  { id: 'pc-rev-3', name: 'Meera Joshi', tag: 'Vaishali Nagar, Jaipur', rating: 5, serviceName: 'Colour Correction', quote: 'My home colour went orange and patchy. The team fixed it in one visit and did not push extra services. Very honest people.', avatarUrl: PRISM_CHROMA_IMAGES.testimonials.meera, visitLabel: 'Visited recently', verified: true, },
  { id: 'pc-rev-4', name: 'Sana Khan', tag: 'Indiranagar, Bengaluru', rating: 5, serviceName: 'Keratin Smooth Treatment', quote: 'Keratin here is worth every rupee. My frizz is gone and the colour shine stayed. Booking on WhatsApp was super easy.', avatarUrl: '', visitLabel: 'Visited recently', verified: true, },
  { id: 'pc-rev-5', name: 'Ritika Jain', tag: 'Bandra West, Mumbai', rating: 5, serviceName: 'Highlights & Money Piece', quote: 'Small change, big difference. The face-light pieces by Tara make me look fresh in every photo. My go-to studio now.', avatarUrl: '', shadeName: 'Honey Balayage', visitLabel: 'Visited recently', verified: true, },
  { id: 'pc-rev-6', name: 'Divya Menon', tag: 'Hauz Khas, Delhi', rating: 5, serviceName: 'Gloss & Shine Treatment', quote: 'Took the gloss treatment before my sister wedding. Hair looked like glass in all the photos. Quick service, fair price in ₹.', avatarUrl: '', visitLabel: 'Visited recently', verified: true, },
];

export const PRISM_CHROMA_DEFAULT_FAQS: PrismChromaFaqItem[] = [
  { id: 'pc-faq-1', question: 'Do I need a patch test before colour?', answer: 'Yes. We do a small patch test 24-48 hours before full colour, mostly for global and fashion colours. It takes 2 minutes and keeps your skin safe.', category: 'Hair Health' },
  { id: 'pc-faq-2', question: 'How long does balayage last?', answer: 'Balayage grows out soft, so it looks good for 3-4 months. A gloss treatment every 6-8 weeks keeps the shine fresh.', category: 'Colour Care' },
  { id: 'pc-faq-3', question: 'Will colour damage my hair?', answer: 'We first check your hair health and use bond-care products with every lightening service. If your hair is too weak, we will tell you honestly and suggest care first.', category: 'Hair Health' },
  { id: 'pc-faq-4', question: 'How do I take care of colour at home?', answer: 'Use a sulphate-free shampoo, wash with cool water, and use a colour-care mask once a week. We will give you a simple home-care plan after your service.', category: 'Colour Care' },
  { id: 'pc-faq-5', question: 'How long does fashion colour last?', answer: 'Pastel and bright shades slowly fade in 4-8 weeks, based on how often you wash. A colour-refresh gloss brings the shade back quickly.', category: 'Colour Care' },
  { id: 'pc-faq-6', question: 'Can you fix colour done at home or at another salon?', answer: 'Yes, colour correction is our special work. Please book a free consult first — we check your hair, then share the plan and full price in ₹ before we start.', category: 'Booking' },
  { id: 'pc-faq-7', question: 'What are your prices? Any hidden charges?', answer: 'All prices are in ₹ (INR) and shown before we start. Final price depends on hair length and thickness — we confirm it at your consult, before any colour touches your hair.', category: 'Pricing' },
  { id: 'pc-faq-8', question: 'Do I need to book, or can I walk in?', answer: 'Booking is better, so your colour expert and chair are ready. You can book on this website, by phone or on WhatsApp. Walk-ins are welcome if a slot is free.', category: 'Booking' },
];


export const PRISM_CHROMA_DEFAULT_ANNOUNCEMENT =
  'Colour Days are on — flat 20% off on Signature Balayage this week. Full price in ₹ shared before we start, always.';
export const PRISM_CHROMA_DEFAULT_ANNOUNCEMENT_CTA = 'See Offer';

export const PRISM_CHROMA_DEFAULT_PROCESS_STEPS: PrismChromaProcessStep[] = [
  {
    id: 'pc-step-1',
    title: 'Consultation',
    text: 'We talk, check your hair health and do a patch test. Full price in ₹ is shared before we start.',
    image: PRISM_CHROMA_IMAGES.process.consult,
    alt: 'Colour consultation and hair check at the studio',
    durationLabel: '15 mins',
    points: ['Hair health check', 'Patch test for safety', 'Full ₹ price upfront'],
  },
  {
    id: 'pc-step-2',
    title: 'Colour Mapping',
    text: 'We pick your shade with a swatch chart, matched to your skin tone and hair history.',
    image: PRISM_CHROMA_IMAGES.process.mapping,
    alt: 'Colour expert mapping shades with a swatch chart',
    durationLabel: '15 mins',
    points: ['Swatch chart matching', 'Skin-tone match', 'Hair history reviewed'],
  },
  {
    id: 'pc-step-3',
    title: 'Application',
    text: 'Colour is applied in sections with bond-care, so hair stays strong while the shade develops.',
    image: PRISM_CHROMA_IMAGES.process.application,
    alt: 'Colour expert applying colour in sections',
    durationLabel: '60-120 mins',
    points: ['Bond-care protection', 'Section-wise neat work', 'Shade checked as it develops'],
  },
  {
    id: 'pc-step-4',
    title: 'Finish & Care',
    text: 'Wash, gloss, trim and styling — plus a simple home-care plan made for your new shade.',
    image: PRISM_CHROMA_IMAGES.process.finish,
    alt: 'Final gloss and styling finish after colour',
    durationLabel: '30 mins',
    points: ['Gloss and shine coat', 'Trim and styling', 'Home-care plan in hand'],
  },
];

export const PRISM_CHROMA_DEFAULT_CARE_GUIDE: PrismChromaCareStep[] = [
  { id: 'pc-care-1', when: 'First 48 hours', title: 'Do not wash yet', text: 'Let the colour settle. Keep hair dry, avoid tight ties and skip heat styling for two days.' },
  { id: 'pc-care-2', when: 'Week 1', title: 'Gentle first wash', text: 'First wash with cool water and a sulphate-free shampoo. Use the colour-care mask we gave you.' },
  { id: 'pc-care-3', when: 'Weeks 2-4', title: 'Protect the shade', text: 'Wash 2-3 times a week only. Use heat protection before blow-dry and keep hair tied in harsh sun.' },
  { id: 'pc-care-4', when: 'Weeks 6-8', title: 'Gloss refresh visit', text: 'Book a quick gloss refresh. It brings back shine, re-seals the shade and keeps ends healthy.' },
];


/** What is included in every service of a category — shown on service cards. */
export const PRISM_CHROMA_SERVICE_INCLUDES: Record<string, string[]> = {
  'Balayage & Highlights': ['Free consultation and hair-health check', 'Patch test before colour day', 'Bond-care protection while lightening', 'Gloss toning for the perfect shade', 'Wash, cut finish and styling', 'Home-care plan for your shade'],
  'Global Colour': ['Free consultation and skin-tone match', 'Patch test before colour day', 'Fresh-mixed colour for your tone', 'Root-to-tip even application', 'Wash and blow-dry finish', 'Grey coverage check at the roots'],
  'Fashion Colours': ['Free consultation and shade planning', 'Patch test before colour day', 'Gentle lightening in steps', 'Bond-care protection throughout', 'Vivid shade application and toning', 'Colour-safe care kit guidance'],
  'Colour Correction': ['Free correction consultation first', 'Strand test on your hair', 'Step-by-step correction plan in writing', 'Full price shared before we start', 'Bond-care repair treatment', 'Follow-up check within 2 weeks'],
  'Keratin & Care': ['Hair-health check before treatment', 'Deep cleansing wash', 'Treatment applied section by section', 'Heat sealing for smooth finish', 'Wash and styling finish', 'After-care do and do-not list'],
  Packages: ['Everything in the included services', 'One fixed price — no surprises', 'Priority booking for package visits', 'Care reminders on WhatsApp'],
};

export function prismServiceIncludes(category?: string): string[] {
  return PRISM_CHROMA_SERVICE_INCLUDES[(category || '').trim()] || PRISM_CHROMA_SERVICE_INCLUDES['Global Colour'];
}

export interface PrismShadeQuizAnswers {
  current: string;
  vibe: string;
  maintenance: string;
}

export interface PrismQuizQuestion {
  id: keyof PrismShadeQuizAnswers;
  question: string;
  helper: string;
  options: { id: string; label: string; note: string }[];
}

export const PRISM_CHROMA_QUIZ_QUESTIONS: PrismQuizQuestion[] = [
  {
    id: 'current',
    question: 'How is your hair right now?',
    helper: 'Be honest — this helps us plan bleach and care the right way.',
    options: [
      { id: 'natural-dark', label: 'Natural dark hair', note: 'No colour on it yet' },
      { id: 'coloured', label: 'Coloured before', note: 'Colour or highlights already on' },
      { id: 'light', label: 'Light / bleached hair', note: 'Already lightened once' },
      { id: 'grey', label: 'Greys showing', note: 'Roots or greys to cover' },
    ],
  },
  {
    id: 'vibe',
    question: 'What look do you dream of?',
    helper: 'Pick the feeling, not the exact shade — we will match the shade to you.',
    options: [
      { id: 'vivid', label: 'Bold & bright', note: 'Violet, magenta — full drama' },
      { id: 'pastel', label: 'Soft pastel', note: 'Rose gold, dreamy and sweet' },
      { id: 'natural', label: 'Natural & sunny', note: 'Honey light, soft grow-out' },
      { id: 'warm', label: 'Warm glow', note: 'Coral and sunset tones' },
      { id: 'cool', label: 'Cool & icy', note: 'Cyan ice, fearless and fresh' },
    ],
  },
  {
    id: 'maintenance',
    question: 'How much care can you give at home?',
    helper: 'Every shade needs a different level of upkeep. No wrong answer here.',
    options: [
      { id: 'low', label: 'Very little time', note: 'Wash and go, mostly' },
      { id: 'regular', label: 'Some care is fine', note: 'Mask once a week, gloss visits ok' },
      { id: 'full', label: 'Full routine, no problem', note: 'I love caring for my hair' },
    ],
  },
];

export interface PrismShadeRecommendation {
  shade: PrismChromaShade;
  reason: string;
  caution: string;
}

export function recommendShade(
  shades: PrismChromaShade[],
  answers: PrismShadeQuizAnswers,
): PrismShadeRecommendation | null {
  if (!Array.isArray(shades) || shades.length === 0) return null;
  const scored = shades.map((shade, index) => {
    let score = 0;
    if (shade.family && shade.family === answers.vibe) score += 10;
    const level = shade.maintenanceLevel || 3;
    if (answers.maintenance === 'low') score += Math.max(0, 5 - level) * 2;
    if (answers.maintenance === 'regular') score += level <= 3 ? 3 : 1;
    if (answers.maintenance === 'full') score += level;
    if (answers.current === 'grey' && (shade.family === 'natural' || shade.family === 'warm')) score += 2;
    if (answers.current === 'natural-dark' && shade.family === 'pastel') score -= 2;
    return { shade, score, index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const best = scored[0].shade;
  const level = best.maintenanceLevel || 3;
  const reason =
    answers.maintenance === 'low'
      ? `${best.name} suits your low-care routine — it stays fresh for ${best.longevityWeeks || 'many weeks'} with very little work at home.`
      : answers.maintenance === 'full'
        ? `${best.name} is a high-drama shade, and your full care routine will keep it bright for ${best.longevityWeeks || 'weeks'}.`
        : `${best.name} matches your dream look and needs only simple weekly care to stay fresh for ${best.longevityWeeks || 'weeks'}.`;
  const caution =
    answers.current === 'natural-dark' && best.family === 'pastel'
      ? 'Your hair is dark right now, so we will lighten it gently in steps. Full plan and price are shared at your free consult.'
      : answers.current === 'coloured'
        ? 'You have old colour on your hair, so we first do a strand test. If needed, we correct the base before the new shade.'
        : level >= 4
          ? 'This is a high-care shade. A gloss refresh every 4-6 weeks keeps it looking salon-fresh.'
          : 'A patch test is done 24-48 hours before your colour day. It takes only 2 minutes.';
  return { shade: best, reason, caution };
}

export interface PrismLengthOption {
  id: string;
  label: string;
  note: string;
  multiplier: number;
}

export const PRISM_CHROMA_LENGTH_OPTIONS: PrismLengthOption[] = [
  { id: 'short', label: 'Short', note: 'Above shoulders', multiplier: 0.9 },
  { id: 'medium', label: 'Medium', note: 'Shoulder length', multiplier: 1 },
  { id: 'long', label: 'Long', note: 'Below shoulders', multiplier: 1.25 },
  { id: 'extra-long', label: 'Extra long', note: 'Waist length', multiplier: 1.5 },
];

export function estimateColourPrice(basePrice: number, lengthId: string): number {
  const option = PRISM_CHROMA_LENGTH_OPTIONS.find((o) => o.id === lengthId) || PRISM_CHROMA_LENGTH_OPTIONS[1];
  const raw = (Number(basePrice) || 0) * option.multiplier;
  return Math.max(0, Math.round(raw / 10) * 10);
}

export function prismMaintenanceLabel(level?: number): string {
  const value = level || 3;
  if (value <= 2) return 'Low care';
  if (value === 3) return 'Some care';
  return 'High care';
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function prismSanitizeHexColor(input: string | undefined, fallback: string): string {
  const trimmed = (input || '').trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

/** Format an amount in INR with Indian digit grouping, e.g. ₹5,499. */
export function prismFormatInr(price: number | null | undefined): string {
  return `₹${Number(price || 0).toLocaleString('en-IN')}`;
}

export function prismChromaServiceImage(
  service: Pick<SalonService, 'id' | 'name' | 'category' | 'imageUrl'>,
): string {
  if (service.imageUrl && service.imageUrl.trim()) return service.imageUrl.trim();
  const text = `${service.id} ${service.name} ${service.category}`.toLowerCase();
  if (/balayage/.test(text)) return PRISM_CHROMA_IMAGES.services.balayage;
  if (/pastel|fashion|vivid/.test(text)) return PRISM_CHROMA_IMAGES.services.pastel;
  if (/highlight|money piece|foil/.test(text)) return PRISM_CHROMA_IMAGES.services.highlights;
  if (/correction|fix/.test(text)) return PRISM_CHROMA_IMAGES.services.correction;
  if (/keratin|smooth/.test(text)) return PRISM_CHROMA_IMAGES.services.keratin;
  if (/gloss|shine/.test(text)) return PRISM_CHROMA_IMAGES.services.gloss;
  if (/root|grey|gray/.test(text)) return PRISM_CHROMA_IMAGES.services.root;
  if (/package|combo/.test(text)) return PRISM_CHROMA_IMAGES.services.balayage;
  return PRISM_CHROMA_IMAGES.services.global;
}

/** The pre-Template-10 hair_coloring demo (generic storefront) ids. */
const LEGACY_HAIR_COLORING_SERVICE_IDS = new Set(['hc-1', 'hc-2', 'hc-3', 'hc-4', 'hc-5']);
const LEGACY_HAIR_COLORING_STYLIST_IDS = new Set(['hc-st-1', 'hc-st-2', 'hc-st-3']);

/**
 * The remote template catalogue may still hold the old generic hair_coloring
 * demo (5 services, hard-coded Unsplash portraits). Keep the redesigned
 * Prism & Chroma catalogue unless the remote copy already uses pc-* ids.
 */
export function upgradeHairColoringTemplate<T extends { id: string }>(
  remote: T,
  local: Record<string, any>,
): T {
  if (!remote || remote.id !== 'hair_coloring') return remote;
  const raw = remote as Record<string, any>;
  const remoteServices =
    Array.isArray(raw.services) &&
    raw.services.length >= 8 &&
    raw.services.some((s: any) => String(s?.id || '').startsWith('pc-'))
      ? raw.services
      : local.services;
  const remoteStylists =
    Array.isArray(raw.stylists) &&
    raw.stylists.length >= 4 &&
    !raw.stylists.some((s: any) => LEGACY_HAIR_COLORING_STYLIST_IDS.has(String(s?.id || '')))
      ? raw.stylists
      : local.stylists;
  return { ...raw, ...local, services: remoteServices, stylists: remoteStylists } as unknown as T;
}

/** The pre-Template-10 hair_coloring demo used remote stock photos. */
export function isLegacyHairColoringStockUrl(url?: string | null): boolean {
  const value = (url || '').trim();
  if (!value) return false;
  return value.includes('images.unsplash.com');
}

export function upgradeLegacyHairColoringStylists<T extends Pick<Stylist, 'id' | 'avatarUrl'>>(
  stylists: T[],
  businessType?: string,
): T[] {
  if (businessType !== 'hair_coloring' || !Array.isArray(stylists)) return stylists;
  const fallbackPortraits = [
    PRISM_CHROMA_IMAGES.team.aarushi,
    PRISM_CHROMA_IMAGES.team.kiara,
    PRISM_CHROMA_IMAGES.team.priya,
    PRISM_CHROMA_IMAGES.team.tara,
  ];
  return stylists.map((stylist, index) => {
    const current = (stylist.avatarUrl || '').trim();
    if (!current || isLegacyHairColoringStockUrl(current)) {
      return { ...stylist, avatarUrl: fallbackPortraits[index % fallbackPortraits.length] };
    }
    return stylist;
  });
}

export function isLegacyHairColoringService(id?: string | null): boolean {
  return LEGACY_HAIR_COLORING_SERVICE_IDS.has(String(id || ''));
}

export interface ResolvedPrismChromaConfig {
  selectorLabel: string;
  heroHeading: string;
  heroSubtext: string;
  heroImageUrl: string;
  aboutHeading: string;
  aboutStory: string;
  aboutImageUrl: string;
  shadesHeading: string;
  shadesSubtext: string;
  bookingImageUrl: string;
  publicEmail: string;
  workingHoursDisplay: string;
  mapEmbedUrl: string;
  colors: PrismChromaThemeColors;
  stats: PrismChromaStatItem[];
  shades: PrismChromaShade[];
  packages: PrismChromaPackage[];
  beforeAfter: PrismChromaBeforeAfter[];
  branches: PrismChromaBranch[];
  faqs: PrismChromaFaqItem[];
  reviews: PrismChromaReviewItem[];
  announcementText: string;
  announcementCtaLabel: string;
  openTime: string;
  closeTime: string;
  processSteps: PrismChromaProcessStep[];
  careGuide: PrismChromaCareStep[];
}

export function resolvePrismChromaConfig(profile: SalonProfile): ResolvedPrismChromaConfig {
  const raw = profile.prismChroma || {};
  const rawColors = raw.colors || {};
  const colors: PrismChromaThemeColors = {
    bg: prismSanitizeHexColor(rawColors.bg, PRISM_CHROMA_DEFAULT_COLORS.bg),
    violet: prismSanitizeHexColor(
      rawColors.violet || profile.customAccentColor,
      PRISM_CHROMA_DEFAULT_COLORS.violet,
    ),
    magenta: prismSanitizeHexColor(rawColors.magenta, PRISM_CHROMA_DEFAULT_COLORS.magenta),
    coral: prismSanitizeHexColor(rawColors.coral, PRISM_CHROMA_DEFAULT_COLORS.coral),
    cyan: prismSanitizeHexColor(rawColors.cyan, PRISM_CHROMA_DEFAULT_COLORS.cyan),
    text: prismSanitizeHexColor(rawColors.text, PRISM_CHROMA_DEFAULT_COLORS.text),
    muted: prismSanitizeHexColor(rawColors.muted, PRISM_CHROMA_DEFAULT_COLORS.muted),
  };

  const pickList = <T,>(list: T[] | undefined, fallback: T[]): T[] =>
    Array.isArray(list) && list.length > 0 ? list : fallback;

  return {
    selectorLabel: (raw.selectorLabel || '').trim() || PRISM_CHROMA_SELECTOR_LABEL,
    heroHeading: (raw.heroHeading || '').trim() || PRISM_CHROMA_HERO_HEADING,
    heroSubtext:
      (raw.heroSubtext || '').trim() ||
      ((profile.tagline || '').trim() && profile.tagline.trim() !== PRISM_CHROMA_TAGLINE
        ? profile.tagline.trim()
        : '') ||
      PRISM_CHROMA_HERO_SUBTEXT,
    heroImageUrl: (raw.heroImageUrl || '').trim() || (profile.coverImageUrl || '').trim() || PRISM_CHROMA_IMAGES.hero,
    aboutHeading: (raw.aboutHeading || '').trim() || 'A Colour Studio, Not Just a Salon',
    aboutStory: (raw.aboutStory || '').trim() || (profile.about || '').trim() || PRISM_CHROMA_DEFAULT_ABOUT,
    aboutImageUrl: (raw.aboutImageUrl || '').trim() || PRISM_CHROMA_IMAGES.about,
    shadesHeading: (raw.shadesHeading || '').trim() || 'Shade Studio',
    shadesSubtext:
      (raw.shadesSubtext || '').trim() ||
      'Tap a colour dot and see the shade on hair. Like one? Book it in one tap.',
    bookingImageUrl: (raw.bookingImageUrl || '').trim() || PRISM_CHROMA_IMAGES.booking,
    publicEmail: (raw.publicEmail || '').trim() || (profile.email || '').trim() || PRISM_CHROMA_DEFAULT_EMAIL,
    workingHoursDisplay: (raw.workingHoursDisplay || '').trim() || PRISM_CHROMA_DEFAULT_HOURS,
    mapEmbedUrl: (raw.mapEmbedUrl || '').trim(),
    colors,
    stats: pickList(raw.stats, PRISM_CHROMA_DEFAULT_STATS),
    shades: pickList(raw.shades, PRISM_CHROMA_DEFAULT_SHADES),
    packages: pickList(raw.packages, PRISM_CHROMA_DEFAULT_PACKAGES),
    beforeAfter: pickList(raw.beforeAfter, PRISM_CHROMA_DEFAULT_BEFORE_AFTER),
    branches: pickList(raw.branches, PRISM_CHROMA_DEFAULT_BRANCHES),
    faqs: pickList(raw.faqs, PRISM_CHROMA_DEFAULT_FAQS),
    reviews: pickList(raw.reviews, PRISM_CHROMA_DEFAULT_REVIEWS),
    announcementText: (raw.announcementText || '').trim(),
    announcementCtaLabel: (raw.announcementCtaLabel || '').trim() || PRISM_CHROMA_DEFAULT_ANNOUNCEMENT_CTA,
    openTime: /^\d{1,2}:\d{2}$/.test((raw.openTime || '').trim()) ? (raw.openTime || '').trim() : '10:00',
    closeTime: /^\d{1,2}:\d{2}$/.test((raw.closeTime || '').trim()) ? (raw.closeTime || '').trim() : '20:30',
    processSteps: pickList(raw.processSteps, PRISM_CHROMA_DEFAULT_PROCESS_STEPS),
    careGuide: pickList(raw.careGuide, PRISM_CHROMA_DEFAULT_CARE_GUIDE),
  };
}


/** "20:30" → "8:30 PM" (simple Indian-English clock label). */
export function prismFormatTime(hhmm: string): string {
  const [hRaw, mRaw] = (hhmm || '').split(':');
  const h = Number(hRaw);
  const m = Number(mRaw || 0);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export interface PrismOpenStatus {
  open: boolean;
  label: string;
}

/** Open/closed status for the hero chip, from owner open/close times. */
export function prismOpenStatus(openTime: string, closeTime: string, now: Date = new Date()): PrismOpenStatus {
  const toMinutes = (value: string) => {
    const [h, m] = (value || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const openMin = toMinutes(openTime || '10:00');
  const closeMin = toMinutes(closeTime || '20:30');
  const current = now.getHours() * 60 + now.getMinutes();
  const open = closeMin > openMin ? current >= openMin && current < closeMin : current >= openMin || current < closeMin;
  return open
    ? { open: true, label: `Open now · Closes ${prismFormatTime(closeTime || '20:30')}` }
    : { open: false, label: `Closed · Opens ${prismFormatTime(openTime || '10:00')}` };
}

/** CSS variables for the .pc-site scope — onboarding brand colours win. */
export function prismChromaCssVariables(colors: PrismChromaThemeColors): Record<string, string> {
  return {
    '--bg': colors.bg,
    '--violet': colors.violet,
    '--magenta': colors.magenta,
    '--coral': colors.coral,
    '--cyan': colors.cyan,
    '--text': colors.text,
    '--muted': colors.muted,
    '--prism-gradient': `linear-gradient(120deg, ${colors.violet}, ${colors.magenta}, ${colors.coral}, ${colors.cyan})`,
  };
}

export function buildPrismChromaSeo(
  profile: SalonProfile,
  config: ResolvedPrismChromaConfig,
  siteUrl = 'https://prismchroma.example',
) {
  const brand = (profile.businessName || '').trim() || PRISM_CHROMA_BRAND_NAME;
  const city = (profile.city || '').trim() || PRISM_CHROMA_DEFAULT_CITY;
  const address = (profile.address || '').trim() || `${PRISM_CHROMA_DEFAULT_ADDRESS}, ${PRISM_CHROMA_DEFAULT_CITY}`;
  const phone = (profile.phone || profile.whatsapp || '').trim() || PRISM_CHROMA_DEFAULT_PHONE;
  const title =
    (profile.seo?.metaTitle || '').trim() ||
    `${brand} | Hair Colour Studio in ${city.split(',')[0]} — Balayage, Fashion Colours & Keratin`;
  const description =
    (profile.seo?.metaDescription || '').trim() ||
    `Premium hair colour studio in ${city}. Balayage, global colour, fashion & pastel shades, highlights, colour correction, keratin and gloss treatments. Clear prices in ₹ (INR). Book online.`;
  const ogImage = (profile.seo?.ogImageUrl || '').trim() || PRISM_CHROMA_IMAGES.ogImage;
  const localBusinessSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': ['HairSalon', 'HealthAndBeautyBusiness'],
    name: brand,
    description,
    image: ogImage,
    logo: (profile.logoUrl || '').trim() || PRISM_CHROMA_IMAGES.logoSvg,
    url: siteUrl,
    telephone: phone,
    email: config.publicEmail,
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: city,
      postalCode: (profile.postalCode || '').trim() || PRISM_CHROMA_DEFAULT_POSTAL_CODE,
      addressCountry: 'IN',
    },
    openingHours: [`Mo-Su ${(config.openTime || '10:00')}-${config.closeTime || '20:30'}`],
  };
  if (config.reviews.length) {
    const avg = config.reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / config.reviews.length;
    localBusinessSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avg.toFixed(1),
      reviewCount: config.reviews.length,
    };
  }
  if (config.branches.length > 1) {
    localBusinessSchema.location = config.branches.map((branch) => ({
      '@type': 'HairSalon',
      name: `${brand} — ${branch.area}`,
      address: branch.address,
      telephone: branch.phone || phone,
    }));
  }
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
  const servicesSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hair colour services at ${brand}`,
    itemListElement: config.packages.map((pkg, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: `${pkg.tier} Colour Package`,
        provider: { '@type': 'HairSalon', name: brand },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: pkg.price,
        },
      },
    })),
  };
  return { title, description, ogImage, jsonLd: [localBusinessSchema, faqSchema, servicesSchema] };
}
