import type {
  PrismChromaBeforeAfter,
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

/** Default photography. Hero/about/booking shots are bundled locally in
 * /public/templates/10/ (see README.md there); the rest are free-license
 * Unsplash photos. Every slot is onboarding-replaceable: owner uploads win,
 * these are only the fallback. */
const U = (id: string, w = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const PRISM_CHROMA_IMAGES = {
  logoSvg: '/templates/10/logo.svg',
  faviconSvg: '/templates/10/favicon.svg',
  hero: '/templates/10/hero.jpg',
  about: '/templates/10/about.jpg',
  booking: '/templates/10/hero.jpg',
  preview: '/templates/10/hero.jpg',
  ogImage: '/templates/10/hero.jpg',
  interior: U('photo-1560066984-138dadb4c035', 1200),
  services: {
    balayage: U('photo-1562322140-8baeececf3df', 1000),
    global: U('photo-1522337360788-8b13dee7a37e', 1000),
    pastel: U('photo-1521590832167-7bcbfaa6381f', 1000),
    highlights: U('photo-1605497788044-5a32c7078486', 1000),
    correction: U('photo-1580618672591-eb180b1a973f', 1000),
    keratin: U('photo-1522338242992-e1a54906a8da', 1000),
    gloss: U('photo-1519699047748-de8e457a634e', 1000),
    root: U('photo-1492106087820-71f1a00d2b11', 1000),
  },
  shades: {
    violet: U('photo-1562322140-8baeececf3df', 900),
    magenta: U('photo-1526045478516-99145907023c', 900),
    coral: U('photo-1595959183082-7b570b7e08e2', 900),
    cyan: U('photo-1620331311520-246422fd82f9', 900),
    roseGold: U('photo-1523263685509-57c1d050d19b', 900),
    honey: U('photo-1519699047748-de8e457a634e', 900),
  },
  beforeAfter: {
    oneBefore: U('photo-1595476108010-b4d1f102b1b1', 900),
    oneAfter: U('photo-1562322140-8baeececf3df', 900),
    twoBefore: U('photo-1523263685509-57c1d050d19b', 900),
    twoAfter: U('photo-1605497788044-5a32c7078486', 900),
    threeBefore: U('photo-1492106087820-71f1a00d2b11', 900),
    threeAfter: U('photo-1521590832167-7bcbfaa6381f', 900),
  },
  process: {
    consult: U('photo-1580618672591-eb180b1a973f', 800),
    mapping: U('photo-1522338242992-e1a54906a8da', 800),
    application: U('photo-1560066984-138dadb4c035', 800),
    finish: U('photo-1522335789203-aabd1fc54bc9', 800),
  },
  team: {
    aarushi: U('photo-1573496359142-b8d87734a5a2', 600),
    kabir: U('photo-1507003211169-0a1dd7228f2d', 600),
    priya: U('photo-1534528741775-53994a69daeb', 600),
    rohan: U('photo-1500648767791-00dcc994a43e', 600),
  },
  testimonials: {
    ananya: U('photo-1494790108377-be9c29b29330', 200),
    ishita: U('photo-1438761681033-6461ffad8d80', 200),
    meera: U('photo-1544005313-94ddf0286df2', 200),
  },
  gallery: [
    { src: U('photo-1562322140-8baeececf3df', 900), title: 'Violet balayage with soft waves', tag: 'Balayage' },
    { src: U('photo-1522337360788-8b13dee7a37e', 900), title: 'Fresh global colour and blow-dry', tag: 'Global Colour' },
    { src: U('photo-1605497788044-5a32c7078486', 900), title: 'Face-light highlights', tag: 'Highlights' },
    { src: U('photo-1521590832167-7bcbfaa6381f', 900), title: 'Pastel pink money piece', tag: 'Fashion Colour' },
    { src: U('photo-1519699047748-de8e457a634e', 900), title: 'Honey gloss finish', tag: 'Gloss' },
    { src: U('photo-1580618672591-eb180b1a973f', 900), title: 'Colour check at the wash station', tag: 'In Studio' },
    { src: U('photo-1560066984-138dadb4c035', 900), title: 'Inside our colour studio', tag: 'Studio' },
    { src: U('photo-1523263685509-57c1d050d19b', 900), title: 'Rose gold tones', tag: 'Fashion Colour' },
    { src: U('photo-1492106087820-71f1a00d2b11', 900), title: 'Smooth keratin finish', tag: 'Keratin' },
    { src: U('photo-1522335789203-aabd1fc54bc9', 900), title: 'Make-up and colour, done together', tag: 'In Studio' },
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
  { id: 'pc-pack-1', tier: 'Starter', price: 2499, imageUrl: PRISM_CHROMA_IMAGES.services.gloss, imageAlt: 'Gloss shine treatment at Prism & Chroma', includes: ['Root touch-up', 'Gloss & shine treatment', 'Clean trim', 'Blow-dry finish'], linkedServiceId: 'pc-pkg-starter' },
  { id: 'pc-pack-2', tier: 'Signature', price: 5999, popular: true, badgeLabel: 'Most Loved', imageUrl: PRISM_CHROMA_IMAGES.services.balayage, imageAlt: 'Signature balayage colour at Prism & Chroma', includes: ['Balayage or global colour', 'Gloss & shine treatment', 'Hair spa', 'Cut and styling'], linkedServiceId: 'pc-pkg-signature' },
  { id: 'pc-pack-3', tier: 'Full Transformation', price: 9999, badgeLabel: 'Full Makeover', imageUrl: PRISM_CHROMA_IMAGES.services.pastel, imageAlt: 'Full fashion colour transformation at Prism & Chroma', includes: ['Full colour change', 'Keratin or gloss care', 'Hair spa and deep care', 'Cut, styling and home-care kit'], linkedServiceId: 'pc-pkg-transform' },
];

export const PRISM_CHROMA_DEFAULT_SHADES: PrismChromaShade[] = [
  { id: 'pc-sh-violet', name: 'Violet Storm', swatch: '#7C5CFF', tintFilter: 'hue-rotate(40deg) saturate(1.4)', price: 4999, blurb: 'Deep violet with a soft shine. Bold, but easy to carry every day.', imageUrl: PRISM_CHROMA_IMAGES.shades.violet, imageAlt: 'Model hair tinted violet in the Shade Studio', linkedServiceId: 'pc-s3' },
  { id: 'pc-sh-magenta', name: 'Magenta Muse', swatch: '#FF4FD8', tintFilter: 'hue-rotate(80deg) saturate(1.5)', price: 4999, blurb: 'Bright pink-magenta that pops in photos and in real life.', imageUrl: PRISM_CHROMA_IMAGES.shades.magenta, imageAlt: 'Model hair tinted magenta in the Shade Studio', linkedServiceId: 'pc-s3' },
  { id: 'pc-sh-coral', name: 'Coral Sunset', swatch: '#FF8A5B', tintFilter: 'hue-rotate(-30deg) saturate(1.3)', price: 4499, blurb: 'Warm coral-peach tones, like sunset light in your hair.', imageUrl: PRISM_CHROMA_IMAGES.shades.coral, imageAlt: 'Model hair tinted coral in the Shade Studio', linkedServiceId: 'pc-s3' },
  { id: 'pc-sh-cyan', name: 'Cyan Ice', swatch: '#35E0F0', tintFilter: 'hue-rotate(150deg) saturate(1.3)', price: 4999, blurb: 'Cool blue-cyan shades for a fresh, fearless look.', imageUrl: PRISM_CHROMA_IMAGES.shades.cyan, imageAlt: 'Model hair tinted cyan in the Shade Studio', linkedServiceId: 'pc-s3' },
  { id: 'pc-sh-rose', name: 'Rose Gold', swatch: '#F2A7C3', tintFilter: 'hue-rotate(-55deg) saturate(1.1) brightness(1.05)', price: 5499, blurb: 'Soft pink-gold shine. Sweet, classy and very popular.', imageUrl: PRISM_CHROMA_IMAGES.shades.roseGold, imageAlt: 'Model hair tinted rose gold in the Shade Studio', linkedServiceId: 'pc-s1' },
  { id: 'pc-sh-honey', name: 'Honey Balayage', swatch: '#E8B06A', tintFilter: 'sepia(0.35) saturate(1.2) brightness(1.05)', price: 5499, blurb: 'Warm honey light pieces. Natural, sunny and low care.', imageUrl: PRISM_CHROMA_IMAGES.shades.honey, imageAlt: 'Model hair with honey balayage in the Shade Studio', linkedServiceId: 'pc-s1' },
];

export const PRISM_CHROMA_DEFAULT_BEFORE_AFTER: PrismChromaBeforeAfter[] = [
  { id: 'pc-ba-1', title: 'Dull brown to violet balayage', beforeUrl: PRISM_CHROMA_IMAGES.beforeAfter.oneBefore, afterUrl: PRISM_CHROMA_IMAGES.beforeAfter.oneAfter, beforeAlt: 'Hair before colour — dull and flat', afterAlt: 'Hair after violet balayage colour' },
  { id: 'pc-ba-2', title: 'Faded colour to bright highlights', beforeUrl: PRISM_CHROMA_IMAGES.beforeAfter.twoBefore, afterUrl: PRISM_CHROMA_IMAGES.beforeAfter.twoAfter, beforeAlt: 'Hair before highlights — faded colour', afterAlt: 'Hair after bright face-light highlights' },
  { id: 'pc-ba-3', title: 'Dry hair to smooth pastel shine', beforeUrl: PRISM_CHROMA_IMAGES.beforeAfter.threeBefore, afterUrl: PRISM_CHROMA_IMAGES.beforeAfter.threeAfter, beforeAlt: 'Hair before treatment — dry and frizzy', afterAlt: 'Hair after pastel colour and smooth finish' },
];

export const PRISM_CHROMA_DEFAULT_BRANCHES: PrismChromaBranch[] = [
  { id: 'pc-br-mumbai', name: 'Mumbai', area: 'Bandra West', address: 'Linking Road, Bandra West, Mumbai - 400050', phone: PRISM_CHROMA_DEFAULT_PHONE, hours: '10:00 AM - 8:30 PM' },
  { id: 'pc-br-delhi', name: 'Delhi', area: 'Hauz Khas Village', address: 'Hauz Khas Village, New Delhi - 110016', phone: PRISM_CHROMA_DEFAULT_PHONE, hours: '10:00 AM - 8:30 PM' },
  { id: 'pc-br-jaipur', name: 'Jaipur', area: 'Vaishali Nagar', address: 'Amrapali Circle, Vaishali Nagar, Jaipur - 302021', phone: PRISM_CHROMA_DEFAULT_PHONE, hours: '10:00 AM - 8:30 PM' },
  { id: 'pc-br-blr', name: 'Bengaluru', area: 'Indiranagar', address: '100 Feet Road, Indiranagar, Bengaluru - 560038', phone: PRISM_CHROMA_DEFAULT_PHONE, hours: '10:00 AM - 8:30 PM' },
];

export const PRISM_CHROMA_DEFAULT_STYLISTS: Stylist[] = [
  { id: 'pc-st-1', name: 'Aarushi Mehta', role: 'Master Colourist & Founder', experienceYears: 10, avatarUrl: PRISM_CHROMA_IMAGES.team.aarushi, specialties: ['Balayage', 'Colour Correction', 'Global Colour'], rating: 5.0, bio: 'Aarushi started Prism & Chroma. She is known for soft balayage and honest advice — she will tell you clearly what your hair can and cannot take.' },
  { id: 'pc-st-2', name: 'Kabir Anand', role: 'Senior Colour Expert', experienceYears: 8, avatarUrl: PRISM_CHROMA_IMAGES.team.kabir, specialties: ['Fashion Colours', 'Pastel Shades', 'Highlights'], rating: 4.9, bio: 'Kabir loves bold colours — violet, magenta, cyan. If you want a full change, Kabir is your person.' },
  { id: 'pc-st-3', name: 'Priya Nair', role: 'Colour & Keratin Expert', experienceYears: 7, avatarUrl: PRISM_CHROMA_IMAGES.team.priya, specialties: ['Keratin', 'Gloss Treatment', 'Grey Cover'], rating: 4.9, bio: 'Priya cares for the health of your hair first. Her keratin and gloss work keeps hair smooth and shiny for months.' },
  { id: 'pc-st-4', name: 'Rohan Verma', role: 'Balayage Artist', experienceYears: 6, avatarUrl: PRISM_CHROMA_IMAGES.team.rohan, specialties: ['Balayage', 'Money Piece', 'Root Touch-Up'], rating: 4.8, bio: 'Rohan is quick, neat and friendly. His money-piece highlights make the face look fresh in one sitting.' },
];

export const PRISM_CHROMA_DEFAULT_REVIEWS: PrismChromaReviewItem[] = [
  { id: 'pc-rev-1', name: 'Ananya Kapoor', tag: 'Bandra West, Mumbai', rating: 5, serviceName: 'Signature Balayage', quote: 'Best balayage in Mumbai! Aarushi first checked my hair, told me the full price, and only then started. My hair looks soft and shiny, not dry at all.', avatarUrl: PRISM_CHROMA_IMAGES.testimonials.ananya },
  { id: 'pc-rev-2', name: 'Ishita Rao', tag: 'Hauz Khas, Delhi', rating: 5, serviceName: 'Fashion Colours', quote: 'I got violet-magenta colour done by Kabir. The shade is exactly like the photo I showed. Three months later, it still looks fresh.', avatarUrl: PRISM_CHROMA_IMAGES.testimonials.ishita },
  { id: 'pc-rev-3', name: 'Meera Joshi', tag: 'Vaishali Nagar, Jaipur', rating: 5, serviceName: 'Colour Correction', quote: 'My home colour went orange and patchy. The team fixed it in one visit and did not push extra services. Very honest people.', avatarUrl: PRISM_CHROMA_IMAGES.testimonials.meera },
  { id: 'pc-rev-4', name: 'Sana Khan', tag: 'Indiranagar, Bengaluru', rating: 5, serviceName: 'Keratin Smooth Treatment', quote: 'Keratin here is worth every rupee. My frizz is gone and the colour shine stayed. Booking on WhatsApp was super easy.', avatarUrl: '' },
  { id: 'pc-rev-5', name: 'Ritika Jain', tag: 'Bandra West, Mumbai', rating: 5, serviceName: 'Highlights & Money Piece', quote: 'Small change, big difference. The face-light pieces by Rohan make me look fresh in every photo. My go-to studio now.', avatarUrl: '' },
  { id: 'pc-rev-6', name: 'Divya Menon', tag: 'Hauz Khas, Delhi', rating: 5, serviceName: 'Gloss & Shine Treatment', quote: 'Took the gloss treatment before my sister wedding. Hair looked like glass in all the photos. Quick service, fair price in ₹.', avatarUrl: '' },
];

export const PRISM_CHROMA_DEFAULT_FAQS: PrismChromaFaqItem[] = [
  { id: 'pc-faq-1', question: 'Do I need a patch test before colour?', answer: 'Yes. We do a small patch test 24-48 hours before full colour, mostly for global and fashion colours. It takes 2 minutes and keeps your skin safe.' },
  { id: 'pc-faq-2', question: 'How long does balayage last?', answer: 'Balayage grows out soft, so it looks good for 3-4 months. A gloss treatment every 6-8 weeks keeps the shine fresh.' },
  { id: 'pc-faq-3', question: 'Will colour damage my hair?', answer: 'We first check your hair health and use bond-care products with every lightening service. If your hair is too weak, we will tell you honestly and suggest care first.' },
  { id: 'pc-faq-4', question: 'How do I take care of colour at home?', answer: 'Use a sulphate-free shampoo, wash with cool water, and use a colour-care mask once a week. We will give you a simple home-care plan after your service.' },
  { id: 'pc-faq-5', question: 'How long does fashion colour last?', answer: 'Pastel and bright shades slowly fade in 4-8 weeks, based on how often you wash. A colour-refresh gloss brings the shade back quickly.' },
  { id: 'pc-faq-6', question: 'Can you fix colour done at home or at another salon?', answer: 'Yes, colour correction is our special work. Please book a free consult first — we check your hair, then share the plan and full price in ₹ before we start.' },
  { id: 'pc-faq-7', question: 'What are your prices? Any hidden charges?', answer: 'All prices are in ₹ (INR) and shown before we start. Final price depends on hair length and thickness — we confirm it at your consult, before any colour touches your hair.' },
  { id: 'pc-faq-8', question: 'Do I need to book, or can I walk in?', answer: 'Booking is better, so your colour expert and chair are ready. You can book on this website, by phone or on WhatsApp. Walk-ins are welcome if a slot is free.' },
];

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
  };
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
    openingHours: ['Mo-Su 10:00-20:30'],
  };
  return { title, description, ogImage, jsonLd: [localBusinessSchema] };
}
