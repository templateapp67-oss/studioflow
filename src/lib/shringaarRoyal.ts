import type {
  SalonProfile,
  SalonService,
  ShringaarBeforeAfter,
  ShringaarCollectionItem,
  ShringaarFaqItem,
  ShringaarLookItem,
  ShringaarPackageItem,
  ShringaarProcessStep,
  ShringaarReviewItem,
  ShringaarRoyalColors,
  ShringaarRoyalConfig,
  ShringaarStatItem,
  Stylist,
} from '../types';

/**
 * Template 11 — Shringaar Royal Indian Bridal Lounge.
 * Category: Bridal Makeup & Makeover Lounge (`bridal_lounge`), slug `shringaar-royal`.
 *
 * Design: "Royal Rajputana × Sabyasachi" — an editorial, handcrafted bridal
 * house on antique ivory (#FBF4E6) with oxblood maroon (#5A0F1E), royal gold
 * (#C9A24B), marigold saffron (#E8962E), peacock teal (#0F5C5A) and rose blush
 * (#E9B8B0). Headings are a high-contrast serif (Cormorant Garamond / Playfair
 * Display), body copy is a clean sans (Inter / Hanken Grotesk), and a script
 * accent (Great Vibes) is used only for tiny flourishes.
 *
 * Every value below is DEFAULT demo content. Owners replace it during
 * onboarding (business name, logo, tagline, about, phone, WhatsApp, email,
 * city, address, timings, services, ₹ prices, team, gallery, social links and
 * brand colours); the resolver fills any blank with these defaults so a
 * published site never renders an empty section.
 *
 * This is a Vite + React SPA (not Next.js), so photography is served from
 * bundled local files under /public/templates/11/ through the shared
 * <SafeImage> component (plain <img loading="lazy">, fixed width/height,
 * descriptive alt text) — no external stock hotlinks and no empty frames.
 */

export const SHRINGAAR_TEMPLATE_CODE = '11';
export const SHRINGAAR_SLUG = 'shringaar-royal';
export const SHRINGAAR_SELECTOR_LABEL = 'Shringaar Royal (11)';
export const SHRINGAAR_BRAND_NAME = 'Shringaar Royal Indian Bridal Lounge';
export const SHRINGAAR_TAGLINE =
  'Royal Rajputana Trousseaus · Sabyasachi Aesthetic · Heirloom Makeover Packages';
export const SHRINGAAR_HERO_HEADING = 'Where Every Bride Becomes Royalty';
export const SHRINGAAR_HERO_SCRIPT = 'Shringaar';
export const SHRINGAAR_HERO_SUBTEXT =
  'Heirloom bridal makeovers, hand-draped Rajputana trousseaus and heirloom jewellery styling — crafted in Jaipur for the bride who wants to be remembered.';
export const SHRINGAAR_DEFAULT_ABOUT =
  'Shringaar is a bridal lounge, not a parlour. For eleven wedding seasons our Jaipur atelier has dressed Rajputana brides in hand-worked lehengas, kundan heirlooms and a makeover that survives a fourteen-hour wedding day. Every bride is styled in her own private chamber — with a trial, a written look book and a pre-bridal ritual plan.';
export const SHRINGAAR_DEFAULT_CITY = 'Jaipur, Rajasthan';
export const SHRINGAAR_DEFAULT_ADDRESS = 'MI Road, Near Panch Batti & Raj Mandir';
export const SHRINGAAR_DEFAULT_POSTAL_CODE = '302001';
export const SHRINGAAR_DEFAULT_PHONE = '+91 98290 33411';
export const SHRINGAAR_DEFAULT_EMAIL = 'brides@shringaarroyal.example';
export const SHRINGAAR_DEFAULT_HOURS = 'Open all days · 10:00 AM – 8:30 PM';
export const SHRINGAAR_DEFAULT_ESTABLISHED = 'Est. 2014 · Jaipur';

export const SHRINGAAR_DEFAULT_COLORS: ShringaarRoyalColors = {
  maroon: '#5A0F1E',
  gold: '#C9A24B',
  ivory: '#FBF4E6',
  saffron: '#E8962E',
  teal: '#0F5C5A',
  blush: '#E9B8B0',
  ink: '#2A1A17',
};

/** Bundled photography — every slot is onboarding-replaceable. */
const R = (path: string) => `/templates/11/${path}`;

export const SHRINGAAR_IMAGES = {
  logoSvg: R('logo.svg'),
  faviconSvg: R('favicon.svg'),
  ogImage: R('og-image.jpg'),
  hero: R('hero-bride.jpg'),
  about: R('venue.jpg'),
  booking: R('hero-bride.jpg'),
  offer: R('venue.jpg'),
  preview: R('hero-bride.jpg'),
  owner: R('artist-anuradha.jpg'),
  collections: {
    lehenga: R('collections/lehenga.jpg'),
    poshak: R('collections/poshak.jpg'),
    jewellery: R('collections/jewellery.jpg'),
    dupatta: R('collections/dupatta.jpg'),
    veil: R('collections/veil.jpg'),
    accessories: R('collections/accessories.jpg'),
  },
  looks: {
    one: R('looks/look-1.jpg'),
    two: R('looks/look-2.jpg'),
    three: R('looks/look-3.jpg'),
    four: R('looks/look-4.jpg'),
    five: R('looks/look-5.jpg'),
    six: R('looks/look-6.jpg'),
    seven: R('looks/look-7.jpg'),
    eight: R('looks/look-8.jpg'),
  },
  packages: {
    classic: R('packages/classic.jpg'),
    royal: R('packages/royal.jpg'),
    maharani: R('packages/maharani.jpg'),
  },
  services: {
    makeup: R('services/makeup.jpg'),
    hair: R('services/hair.jpg'),
    draping: R('services/draping.jpg'),
    mehendi: R('services/mehendi.jpg'),
    prebridal: R('services/prebridal.jpg'),
    glow: R('services/glow.jpg'),
  },
  beforeAfter: {
    afterOne: R('results/after-1.jpg'),
    beforeOne: R('results/before-1.jpg'),
    afterTwo: R('results/after-2.jpg'),
    beforeTwo: R('results/before-2.jpg'),
  },
  team: {
    anuradha: R('team/anuradha.jpg'),
    janki: R('team/janki.jpg'),
    farzana: R('team/farzana.jpg'),
  },
  process: {
    consultation: R('process/consultation.jpg'),
    trial: R('process/trial.jpg'),
    ritual: R('process/ritual.jpg'),
    weddingDay: R('process/wedding-day.jpg'),
  },
  testimonials: {
    brideOne: R('testimonials/bride-1.jpg'),
    brideTwo: R('testimonials/bride-2.jpg'),
    brideThree: R('testimonials/bride-3.jpg'),
  },
  gallery: [
    R('gallery/gallery-1.jpg'),
    R('gallery/gallery-2.jpg'),
    R('gallery/gallery-3.jpg'),
    R('gallery/gallery-4.jpg'),
    R('gallery/gallery-5.jpg'),
    R('gallery/gallery-6.jpg'),
    R('gallery/gallery-7.jpg'),
    R('gallery/gallery-8.jpg'),
  ],
} as const;

/** Demo bridal menu — the onboarding service catalogue starts from this list. */
export const SHRINGAAR_SERVICES: SalonService[] = [
  {
    id: 'sr-1',
    name: 'Royal Rajputana Bridal Trousseau (HD + Airbrush)',
    category: 'Bridal Makeup',
    durationMinutes: 240,
    price: 35000,
    description:
      'Airbrush base built to last 18 hours, gold-leaf eye work, kundan matha patti setting and a hand-pinned poshak drape for the pheras.',
    icon: 'workspace_premium',
    popular: true,
    imageUrl: SHRINGAAR_IMAGES.services.makeup,
  },
  {
    id: 'sr-2',
    name: 'Sabyasachi Crimson Bridal Glam',
    category: 'Bridal Makeup',
    durationMinutes: 180,
    price: 24000,
    description:
      'Flushed bronze cheeks, winged liner, old-world kohl and a velvet dupatta set with our signature crimson drape.',
    icon: 'diamond',
    popular: true,
    imageUrl: SHRINGAAR_IMAGES.services.glow,
  },
  {
    id: 'sr-3',
    name: 'Sangeet & Cocktail Glow Look',
    category: 'Bridal Makeup',
    durationMinutes: 120,
    price: 12000,
    description:
      'Shimmer lid, soft contour and international textured waves — designed for dancing, safely under the lights.',
    icon: 'celebration',
    imageUrl: SHRINGAAR_IMAGES.services.hair,
  },
  {
    id: 'sr-4',
    name: 'Heritage Bridal Hair Architecture',
    category: 'Bridal Hair',
    durationMinutes: 75,
    price: 6500,
    description:
      'Gajra-wrapped juda, matha patti and kalgi setting, braid work with fresh flowers — pinned so nothing moves through the night.',
    icon: 'content_cut',
    imageUrl: SHRINGAAR_IMAGES.services.hair,
  },
  {
    id: 'sr-5',
    name: 'Poshak, Dupatta & Safa Draping',
    category: 'Draping & Styling',
    durationMinutes: 45,
    price: 4500,
    description:
      'Hand-pleated lehenga or saree, secure pinning for 15 kg zardozi, and a royal safa or turban for the groom.',
    icon: 'styler',
    imageUrl: SHRINGAAR_IMAGES.services.draping,
  },
  {
    id: 'sr-6',
    name: 'Heirloom Bridal Mehendi (Hands & Feet)',
    category: 'Mehendi',
    durationMinutes: 180,
    price: 8500,
    description:
      'Rajasthani jaali motifs, portrait detailing and a deep mahogany stain developed with our own henna blend.',
    icon: 'brush',
    imageUrl: SHRINGAAR_IMAGES.services.mehendi,
  },
  {
    id: 'sr-7',
    name: 'Pre-Bridal 7-Day Ubtan & Glow Ritual',
    category: 'Pre-Bridal Rituals',
    durationMinutes: 180,
    price: 16500,
    description:
      'Seven sittings of sandalwood-rose ubtan, kesh spa, full body polishing and a diamond radiance facial before the wedding week.',
    icon: 'spa',
    imageUrl: SHRINGAAR_IMAGES.services.prebridal,
  },
  {
    id: 'sr-8',
    name: 'Bridal Radiance Facial & Neck Glow',
    category: 'Pre-Bridal Rituals',
    durationMinutes: 75,
    price: 5500,
    description:
      'Brightening facial with a separate neck and décolleté routine — so the blouse neckline photographs evenly.',
    icon: 'face',
    imageUrl: SHRINGAAR_IMAGES.services.glow,
  },
  {
    id: 'sr-pkg-classic',
    name: 'Classic Shringaar Bridal Package',
    category: 'Heirloom Packages',
    durationMinutes: 300,
    price: 45000,
    description:
      'Wedding-day makeup and hair, one drape, mehendi touch-up and a two-visit pre-bridal plan.',
    icon: 'workspace_premium',
    imageUrl: SHRINGAAR_IMAGES.packages.classic,
  },
  {
    id: 'sr-pkg-royal',
    name: 'Royal Rajputana Bridal Package',
    category: 'Heirloom Packages',
    durationMinutes: 420,
    price: 78000,
    description:
      'Trial look book, wedding-day HD + airbrush, sangeet look, two drapes, bridal mehendi and a five-visit glow plan.',
    icon: 'diamond',
    popular: true,
    imageUrl: SHRINGAAR_IMAGES.packages.royal,
  },
  {
    id: 'sr-pkg-maharani',
    name: 'Maharani Heirloom Bridal Package',
    category: 'Heirloom Packages',
    durationMinutes: 600,
    price: 125000,
    description:
      'Three-event styling, heirloom jewellery setting, family makeup for four, seven-visit pre-bridal ritual and a private suite for the bridal party.',
    icon: 'workspace_premium',
    imageUrl: SHRINGAAR_IMAGES.packages.maharani,
  },
];

export const SHRINGAAR_TEMPLATE_SERVICES: SalonService[] = SHRINGAAR_SERVICES.map(
  (service) => ({ ...service, origin: 'template' as const }),
);

export const SHRINGAAR_DEFAULT_STYLISTS: Stylist[] = [
  {
    id: 'sr-st-1',
    name: 'Anuradha Rathore',
    role: 'Founder & Bridal Couture Director',
    avatarUrl: SHRINGAAR_IMAGES.team.anuradha,
    specialties: ['Rajputana Trousseau', 'Airbrush Longevity', 'Jewellery Setting'],
    rating: 5,
    bio: 'Twenty-two wedding seasons styling Rajputana brides. Anuradha designs the look book and personally sets the heirloom jewellery on the wedding morning.',
  },
  {
    id: 'sr-st-2',
    name: 'Janki Khandelwal',
    role: 'Senior Bridal Makeup Artist',
    avatarUrl: SHRINGAAR_IMAGES.team.janki,
    specialties: ['HD Bridal Base', 'Sangeet Glam', 'Skin Prep'],
    rating: 4.97,
    bio: 'Known for a base that photographs like second skin and stays put through the pheras, the varmala and the after-party.',
  },
  {
    id: 'sr-st-3',
    name: 'Farzana Sheikh',
    role: 'Draping & Hair Architecture Specialist',
    avatarUrl: SHRINGAAR_IMAGES.team.farzana,
    specialties: ['Poshak Draping', 'Gajra Juda', 'Safa & Turban'],
    rating: 4.93,
    bio: 'Pins fifteen-kilo zardozi so a bride can sit, dance and hug her mother without a single pleat slipping.',
  },
];

export const SHRINGAAR_DEFAULT_STATS: ShringaarStatItem[] = [
  { id: 'stat-1', value: '1,200+', label: 'Brides styled', image: SHRINGAAR_IMAGES.looks.one, alt: 'Bride in a maroon zardozi lehenga' },
  { id: 'stat-2', value: '11', label: 'Wedding seasons', image: SHRINGAAR_IMAGES.looks.seven, alt: 'Kundan bridal jewellery set' },
  { id: 'stat-3', value: '9', label: 'Craft awards', image: SHRINGAAR_IMAGES.looks.three, alt: 'Bridal mehendi detailing on hands' },
  { id: 'stat-4', value: '4.9', label: 'Bride rating', image: SHRINGAAR_IMAGES.looks.two, alt: 'Bridal makeup close-up' },
];

export const SHRINGAAR_DEFAULT_COLLECTIONS: ShringaarCollectionItem[] = [
  { id: 'col-1', name: 'The Rajputana Lehenga', subtitle: 'Hand-worked zardozi & dabka', image: SHRINGAAR_IMAGES.collections.lehenga, alt: 'Oxblood bridal lehenga with dense gold zardozi embroidery' },
  { id: 'col-2', name: 'Royal Poshak', subtitle: 'Odhni, kanchli & ghagra', image: SHRINGAAR_IMAGES.collections.poshak, alt: 'Rajputana poshak with maroon velvet odhni displayed on a brass stand' },
  { id: 'col-3', name: 'Kundan Heirlooms', subtitle: 'Polki, pearl & emerald', image: SHRINGAAR_IMAGES.collections.jewellery, alt: 'Antique kundan polki bridal jewellery set on ivory silk' },
  { id: 'col-4', name: 'Zari Dupatta', subtitle: 'Sheer veils, gold borders', image: SHRINGAAR_IMAGES.collections.dupatta, alt: 'Sheer maroon bridal dupatta with gold zari border floating in light' },
  { id: 'col-5', name: 'The Bridal Veil', subtitle: 'Draped for the pheras', image: SHRINGAAR_IMAGES.collections.veil, alt: 'Cascading bridal veil detail in gold thread' },
  { id: 'col-6', name: 'Bridal Accessories', subtitle: 'Kalgi, nath & bangles', image: SHRINGAAR_IMAGES.collections.accessories, alt: 'Bridal bangles and jewellery accessories arranged on silk' },
];

export const SHRINGAAR_DEFAULT_LOOKS: ShringaarLookItem[] = [
  { id: 'look-1', image: SHRINGAAR_IMAGES.looks.one, alt: 'Bride in a maroon zardozi lehenga under a gold jharokha arch', caption: 'The Marwar Bride', tag: 'Rajputana Trousseau' },
  { id: 'look-2', image: SHRINGAAR_IMAGES.looks.two, alt: 'Close-up of a bride with antique gold eye makeup and maroon lips', caption: 'Sabyasachi Crimson', tag: 'Bridal Makeup' },
  { id: 'look-3', image: SHRINGAAR_IMAGES.looks.three, alt: 'Intricate bridal mehendi on hands with gold bangles', caption: 'Heirloom Mehendi', tag: 'Mehendi' },
  { id: 'look-4', image: SHRINGAAR_IMAGES.looks.four, alt: 'Detail of an oxblood lehenga skirt with gold embroidery', caption: 'Zardozi at Dusk', tag: 'Couture' },
  { id: 'look-5', image: SHRINGAAR_IMAGES.looks.five, alt: 'Sheer gold-bordered dupatta draped in warm light', caption: 'The Zari Veil', tag: 'Draping' },
  { id: 'look-6', image: SHRINGAAR_IMAGES.looks.six, alt: 'Rajputana poshak displayed with antique jewellery', caption: 'Royal Poshak', tag: 'Trousseau' },
  { id: 'look-7', image: SHRINGAAR_IMAGES.looks.seven, alt: 'Kundan and pearl bridal jewellery laid on silk', caption: 'Polki Heirlooms', tag: 'Jewellery' },
  { id: 'look-8', image: SHRINGAAR_IMAGES.looks.eight, alt: 'Pre-bridal ubtan ritual with rose petals and brass bowls', caption: 'Ubtan Mornings', tag: 'Pre-Bridal' },
];

export const SHRINGAAR_DEFAULT_PACKAGES: ShringaarPackageItem[] = [
  {
    id: 'pkg-classic',
    tier: 'Classic Shringaar',
    tagline: 'The wedding-day essentials, beautifully done',
    serviceId: 'sr-pkg-classic',
    price: 45000,
    image: SHRINGAAR_IMAGES.packages.classic,
    alt: 'Gold zardozi lehenga detail representing the Classic Shringaar package',
    sessions: '2 visits',
    includes: [
      'Wedding-day HD makeup & hair architecture',
      'One poshak or saree drape with pinning',
      'Bridal mehendi touch-up on the morning',
      'Two pre-bridal glow sittings',
      'Bridal chamber with chai for two',
    ],
  },
  {
    id: 'pkg-royal',
    tier: 'Royal Rajputana',
    tagline: 'Our most-loved bridal journey',
    serviceId: 'sr-pkg-royal',
    price: 78000,
    image: SHRINGAAR_IMAGES.packages.royal,
    alt: 'Royal Rajputana poshak with gold jewellery for the Royal package',
    popular: true,
    badge: 'Most chosen by Jaipur brides',
    sessions: '5 visits',
    includes: [
      'Trial look book with two signature looks',
      'Wedding-day airbrush + HD makeup & hair',
      'Sangeet or cocktail glow look',
      'Two drapes with heirloom jewellery setting',
      'Full bridal mehendi, hands & feet',
      'Five pre-bridal ubtan & glow sittings',
    ],
  },
  {
    id: 'pkg-maharani',
    tier: 'Maharani Heirloom',
    tagline: 'Three events, the whole family, one suite',
    serviceId: 'sr-pkg-maharani',
    price: 125000,
    image: SHRINGAAR_IMAGES.packages.maharani,
    alt: 'Bridal portrait under a jharokha arch for the Maharani package',
    sessions: '7 visits',
    badge: 'Private suite',
    includes: [
      'Everything in Royal Rajputana',
      'Three-event styling: mehendi, sangeet, wedding',
      'Makeup & hair for four family members',
      'Heirloom jewellery setting & safa for the groom',
      'Seven-visit pre-bridal ritual plan',
      'Private bridal suite on the wedding morning',
      'On-location artist team within Jaipur',
    ],
  },
];

export const SHRINGAAR_DEFAULT_BEFORE_AFTER: ShringaarBeforeAfter[] = [
  {
    id: 'ba-1',
    title: 'Bridal base — bare skin to pheras',
    before: SHRINGAAR_IMAGES.beforeAfter.beforeOne,
    after: SHRINGAAR_IMAGES.beforeAfter.afterOne,
    alt: 'Demo before and after of a bridal makeup transformation',
  },
  {
    id: 'ba-2',
    title: 'Ubtan glow — day one to wedding week',
    before: SHRINGAAR_IMAGES.beforeAfter.beforeTwo,
    after: SHRINGAAR_IMAGES.beforeAfter.afterTwo,
    alt: 'Demo before and after of a pre-bridal ubtan glow ritual',
  },
];

export const SHRINGAAR_DEFAULT_PROCESS: ShringaarProcessStep[] = [
  {
    id: 'step-1',
    title: 'The Consultation',
    text: 'We sit with you and your mother, look at the trousseau, and write down the wedding calendar — events, venues, light and timings.',
    image: SHRINGAAR_IMAGES.process.consultation,
    alt: 'Palace mandap with jharokha arches where the bridal consultation happens',
    durationLabel: 'Day 1',
  },
  {
    id: 'step-2',
    title: 'Trial & Look Book',
    text: 'One full trial of your signature look, photographed in your own dupatta, so nothing is a surprise on the wedding morning.',
    image: SHRINGAAR_IMAGES.process.trial,
    alt: 'Bride at a makeup trial with antique gold eye makeup',
    durationLabel: 'Week 1',
  },
  {
    id: 'step-3',
    title: 'Pre-Bridal Ritual',
    text: 'Sandalwood-rose ubtan, kesh spa and glow facials at a gentle pace — never a last-minute facial before the wedding.',
    image: SHRINGAAR_IMAGES.process.ritual,
    alt: 'Ubtan paste and rose petals for the pre-bridal ritual',
    durationLabel: 'Week 2–6',
  },
  {
    id: 'step-4',
    title: 'The Wedding Morning',
    text: 'Your private suite opens at sunrise. Base, hair architecture, drape and heirloom jewellery — finished before the baraat arrives.',
    image: SHRINGAAR_IMAGES.process.weddingDay,
    alt: 'Bride ready under a marigold-decorated arch on her wedding day',
    durationLabel: 'The day',
  },
];

export const SHRINGAAR_DEFAULT_REVIEWS: ShringaarReviewItem[] = [
  {
    id: 'rev-1',
    name: 'Gayatri Rathore',
    weddingPlace: 'Palace wedding · C-Scheme, Jaipur',
    rating: 5,
    quote:
      'Fifteen kilos of zardozi and not one pin slipped from the varmala to the vidaai. Anuradha set my grandmother’s polki herself, and the base was still flawless at 2 am.',
    avatar: SHRINGAAR_IMAGES.testimonials.brideOne,
    alt: 'Portrait of Gayatri Rathore, a Shringaar bride',
    date: '3 weeks ago',
  },
  {
    id: 'rev-2',
    name: 'Ananya Singhal',
    weddingPlace: 'Destination bride · London → Jaipur',
    rating: 5,
    quote:
      'I flew in for a three-day wedding and had exactly one trial. The look book meant my sangeet and wedding looks matched without repeating a single thing.',
    avatar: SHRINGAAR_IMAGES.testimonials.brideTwo,
    alt: 'Portrait of Ananya Singhal, a Shringaar destination bride',
    date: '2 months ago',
  },
  {
    id: 'rev-3',
    name: 'Meher Bhandari',
    weddingPlace: 'Sangeet & pheras · Rambagh, Jaipur',
    rating: 5,
    quote:
      'The seven-day ubtan plan is the reason my skin needed almost no base. My photographer asked who did my makeup before he even asked for my name.',
    avatar: SHRINGAAR_IMAGES.testimonials.brideThree,
    alt: 'Portrait of Meher Bhandari, a Shringaar bride',
    date: '4 months ago',
  },
];

export const SHRINGAAR_DEFAULT_FAQS: ShringaarFaqItem[] = [
  {
    id: 'faq-1',
    question: 'How early should I book my bridal date?',
    answer:
      'Eight to twelve months ahead for the wedding season (November to February). Your date is blocked in the diary with a booking amount, and the trial is scheduled four to six weeks before the wedding.',
  },
  {
    id: 'faq-2',
    question: 'Do you travel for destination weddings?',
    answer:
      'Yes. Our team travels across Rajasthan, Delhi NCR and Udaipur, and to destination weddings in India. Travel, stay and a two-artist minimum are quoted separately in ₹ before you confirm.',
  },
  {
    id: 'faq-3',
    question: 'What is included in the trial?',
    answer:
      'One full signature look with base, eyes, hair architecture and drape, photographed in your own dupatta. The trial fee is adjusted against your final package when you book with us.',
  },
  {
    id: 'faq-4',
    question: 'Will the makeup last through the pheras?',
    answer:
      'We use an airbrush base sealed for heat, tears and long hours, plus a touch-up kit with blotting papers, lipstick and pins. Most brides need one touch-up after the varmala — nothing more.',
  },
  {
    id: 'faq-5',
    question: 'Can you style my own lehanga and jewellery?',
    answer:
      'Always. Bring your own trousseau to the consultation. We plan the drape, jewellery setting and hair architecture around the pieces you already own, and share a written plan.',
  },
];

export const SHRINGAAR_DEFAULT_ANNOUNCEMENT =
  'Wedding season 2026 dates are open · Complimentary trial look book on bookings made this month';

export const SHRINGAAR_SERVICE_INCLUDES: Record<string, string[]> = {
  'Bridal Makeup': ['Airbrush + HD base', 'Waterproof, 18-hour seal', 'Lashes & touch-up kit'],
  'Bridal Hair': ['Gajra juda or braid', 'Matha patti & kalgi setting', 'Pin kit for the night'],
  'Draping & Styling': ['Hand-pleated drape', 'Secure pinning for heavy work', 'Safa or turban styling'],
  Mehendi: ['Rajasthani jaali motifs', 'Own henna blend, deep stain', 'Feet & hands covered'],
  'Pre-Bridal Rituals': ['Sandalwood-rose ubtan', 'Kesh spa & body polish', 'Written glow calendar'],
  'Heirloom Packages': ['Trial look book', 'Multi-event styling', 'Bridal suite access'],
};

export function shringaarServiceIncludes(category?: string): string[] {
  return SHRINGAAR_SERVICE_INCLUDES[(category || '').trim()] || ['Bridal consultation', 'Written look book', '₹ price confirmed upfront'];
}

/** Map a saved service to the bundled photo for its category. */
export function shringaarServiceImage(service: Pick<SalonService, 'id' | 'name' | 'category' | 'imageUrl'>): string {
  if (service.imageUrl && service.imageUrl.trim()) return service.imageUrl.trim();
  const text = `${service.category} ${service.name}`.toLowerCase();
  if (/mehendi|henna/.test(text)) return SHRINGAAR_IMAGES.services.mehendi;
  if (/drap|saree|safa|turban|poshak|styling/.test(text)) return SHRINGAAR_IMAGES.services.draping;
  if (/hair|juda|braid/.test(text)) return SHRINGAAR_IMAGES.services.hair;
  if (/ubtan|pre-bridal|prebridal|ritual|polish|spa/.test(text)) return SHRINGAAR_IMAGES.services.prebridal;
  if (/facial|glow|skin/.test(text)) return SHRINGAAR_IMAGES.services.glow;
  if (/package|trousseau|bridal|makeup/.test(text)) return SHRINGAAR_IMAGES.services.makeup;
  return SHRINGAAR_IMAGES.services.makeup;
}

const hex = (value: string | undefined, fallback: string): string =>
  /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test((value || '').trim()) ? (value || '').trim() : fallback;

export interface ResolvedShringaarConfig {
  selectorLabel: string;
  heroHeading: string;
  heroScript: string;
  heroSubtext: string;
  heroImageUrl: string;
  aboutHeading: string;
  aboutStory: string;
  aboutImageUrl: string;
  collectionsHeading: string;
  collectionsSubtext: string;
  looksHeading: string;
  looksSubtext: string;
  servicesHeading: string;
  packagesHeading: string;
  packageEyebrow: string;
  processHeading: string;
  reviewsHeading: string;
  galleryHeading: string;
  offerHeading: string;
  offerText: string;
  bookingHeading: string;
  announcementText: string;
  bookingImageUrl: string;
  offerImageUrl: string;
  publicEmail: string;
  workingHoursDisplay: string;
  mapEmbedUrl: string;
  established: string;
  colors: ShringaarRoyalColors;
  stats: ShringaarStatItem[];
  collections: ShringaarCollectionItem[];
  looks: ShringaarLookItem[];
  packages: ShringaarPackageItem[];
  beforeAfter: ShringaarBeforeAfter[];
  processSteps: ShringaarProcessStep[];
  reviews: ShringaarReviewItem[];
  faqs: ShringaarFaqItem[];
  galleryUrls: string[];
  /** "HH:MM" 24h — open-now chip. */
  openTime: string;
  /** "HH:MM" 24h — open-now chip. */
  closeTime: string;
}

const list = <T,>(value: T[] | undefined, fallback: T[]): T[] =>
  Array.isArray(value) && value.length > 0 ? value : fallback;

/** Resolve stored owner content over the bundled demo content. */
export function resolveShringaarRoyalConfig(profile: SalonProfile): ResolvedShringaarConfig {
  const raw: ShringaarRoyalConfig = profile.shringaarRoyal || {};
  const colors = raw.colors || {};
  const tagline = (profile.tagline || '').trim();
  return {
    selectorLabel: (raw.selectorLabel || '').trim() || SHRINGAAR_SELECTOR_LABEL,
    heroHeading: (raw.heroHeading || '').trim() || SHRINGAAR_HERO_HEADING,
    heroScript: (raw.heroScript || '').trim() || SHRINGAAR_HERO_SCRIPT,
    heroSubtext:
      (raw.heroSubtext || '').trim() ||
      (tagline && tagline !== SHRINGAAR_TAGLINE ? tagline : '') ||
      SHRINGAAR_HERO_SUBTEXT,
    // A cover inherited from another template's stock photography is not bridal
    // imagery — fall back to the bundled bride portrait instead of showing it.
    heroImageUrl:
      (raw.heroImageUrl || '').trim() ||
      ((profile.coverImageUrl || '').trim() && !isLegacyBridalStockUrl(profile.coverImageUrl)
        ? (profile.coverImageUrl || '').trim()
        : '') ||
      SHRINGAAR_IMAGES.hero,
    aboutHeading: (raw.aboutHeading || '').trim() || 'A Bridal Atelier, Not a Beauty Parlour',
    aboutStory: (raw.aboutStory || '').trim() || (profile.about || '').trim() || SHRINGAAR_DEFAULT_ABOUT,
    aboutImageUrl: (raw.aboutImageUrl || '').trim() || SHRINGAAR_IMAGES.about,
    collectionsHeading: (raw.collectionsHeading || '').trim() || 'Royal Rajputana Trousseaus',
    collectionsSubtext:
      (raw.collectionsSubtext || '').trim() ||
      'Six heirloom edits — hand-worked lehengas, poshaks and kundan — styled for the Rajputana bride.',
    looksHeading: (raw.looksHeading || '').trim() || 'The Sabyasachi Aesthetic',
    looksSubtext:
      (raw.looksSubtext || '').trim() ||
      'Old-world richness, modern restraint. Gold on oxblood, kohl-lined eyes, and jewellery that has a story.',
    servicesHeading: (raw.servicesHeading || '').trim() || 'The Bridal Menu',
    packagesHeading: (raw.packagesHeading || '').trim() || 'Heirloom Makeover Packages',
    packageEyebrow: (raw.packageEyebrow || '').trim() || 'Three Journeys',
    processHeading: (raw.processHeading || '').trim() || 'Your Bridal Journey',
    reviewsHeading: (raw.reviewsHeading || '').trim() || 'Brides Who Became Royalty',
    galleryHeading: (raw.galleryHeading || '').trim() || 'From Our Bridal Diaries',
    offerHeading: (raw.offerHeading || '').trim() || 'Wedding Season 2026',
    offerText:
      (raw.offerText || '').trim() ||
      'Book your bridal date this month and receive a complimentary trial look book, a pre-bridal glow consultation and ₹5,000 off the Maharani Heirloom package.',
    bookingHeading: (raw.bookingHeading || '').trim() || 'Book Your Bridal Consultation',
    announcementText: (raw.announcementText || '').trim() || SHRINGAAR_DEFAULT_ANNOUNCEMENT,
    bookingImageUrl: (raw.bookingImageUrl || '').trim() || SHRINGAAR_IMAGES.booking,
    offerImageUrl: (raw.offerImageUrl || '').trim() || SHRINGAAR_IMAGES.offer,
    publicEmail: (raw.publicEmail || '').trim() || (profile.email || '').trim() || SHRINGAAR_DEFAULT_EMAIL,
    workingHoursDisplay: (raw.workingHoursDisplay || '').trim() || SHRINGAAR_DEFAULT_HOURS,
    mapEmbedUrl: (raw.mapEmbedUrl || '').trim(),
    established: (raw.established || '').trim() || SHRINGAAR_DEFAULT_ESTABLISHED,
    colors: {
      maroon: hex(colors.maroon, SHRINGAAR_DEFAULT_COLORS.maroon),
      gold: hex(colors.gold, SHRINGAAR_DEFAULT_COLORS.gold),
      ivory: hex(colors.ivory, SHRINGAAR_DEFAULT_COLORS.ivory),
      saffron: hex(colors.saffron, SHRINGAAR_DEFAULT_COLORS.saffron),
      teal: hex(colors.teal, SHRINGAAR_DEFAULT_COLORS.teal),
      blush: hex(colors.blush, SHRINGAAR_DEFAULT_COLORS.blush),
      ink: hex(colors.ink, SHRINGAAR_DEFAULT_COLORS.ink),
    },
    stats: list(raw.stats, SHRINGAAR_DEFAULT_STATS),
    collections: list(raw.collections, SHRINGAAR_DEFAULT_COLLECTIONS),
    looks: list(raw.looks, SHRINGAAR_DEFAULT_LOOKS),
    packages: list(raw.packages, SHRINGAAR_DEFAULT_PACKAGES),
    beforeAfter: list(raw.beforeAfter, SHRINGAAR_DEFAULT_BEFORE_AFTER),
    processSteps: list(raw.processSteps, SHRINGAAR_DEFAULT_PROCESS),
    reviews: list(raw.reviews, SHRINGAAR_DEFAULT_REVIEWS),
    faqs: list(raw.faqs, SHRINGAAR_DEFAULT_FAQS),
    galleryUrls: list(raw.galleryUrls, [...SHRINGAAR_IMAGES.gallery]),
    openTime: /^\d{1,2}:\d{2}$/.test((raw.openTime || '').trim()) ? (raw.openTime || '').trim() : '10:00',
    closeTime: /^\d{1,2}:\d{2}$/.test((raw.closeTime || '').trim()) ? (raw.closeTime || '').trim() : '20:30',
  };
}

/** CSS variables for the .sr-site scope — onboarding brand colours win. */
export function shringaarCssVariables(colors: ShringaarRoyalColors): Record<string, string> {
  return {
    '--sr-maroon': colors.maroon,
    '--sr-gold': colors.gold,
    '--sr-ivory': colors.ivory,
    '--sr-saffron': colors.saffron,
    '--sr-teal': colors.teal,
    '--sr-blush': colors.blush,
    '--sr-ink': colors.ink,
  };
}

/** ₹ formatting in Indian digit grouping — same helper shape as Templates 08–10. */
export function shringaarFormatInr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return 'On consult';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function shringaarFormatTime(hhmm: string): string {
  const [hRaw, mRaw] = (hhmm || '').split(':');
  const h = Number(hRaw);
  const m = Number(mRaw || 0);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export interface ShringaarOpenStatus {
  open: boolean;
  label: string;
}

/** Open/closed chip for the sticky navbar, from the owner's open/close times. */
export function shringaarOpenStatus(openTime = '10:00', closeTime = '20:30', now: Date = new Date()): ShringaarOpenStatus {
  const toMinutes = (value: string) => {
    const [h, m] = (value || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const openMin = toMinutes(openTime);
  const closeMin = toMinutes(closeTime);
  const current = now.getHours() * 60 + now.getMinutes();
  const open = closeMin > openMin ? current >= openMin && current < closeMin : current >= openMin || current < closeMin;
  return open
    ? { open: true, label: `Open today · till ${shringaarFormatTime(closeTime)}` }
    : { open: false, label: `Closed now · opens ${shringaarFormatTime(openTime)}` };
}

/**
 * Packages read their ₹ price and duration from the live onboarding service
 * catalogue when the linked service still exists, so an owner's price edit in
 * the workspace is what brides see on the website.
 */
export function resolveShringaarPackages(
  packages: ShringaarPackageItem[],
  services: SalonService[],
): Array<ShringaarPackageItem & { livePrice: number | null; liveServiceId?: string; durationMinutes?: number; bookable: boolean }> {
  return packages.map((pkg) => {
    const linked =
      services.find((service) => pkg.serviceId && service.id === pkg.serviceId) ||
      services.find((service) => (service.name || '').trim().toLowerCase() === (pkg.tier || '').trim().toLowerCase()) ||
      services.find((service) => /package|combo|bundle/i.test(`${service.category} ${service.name}`) && new RegExp(pkg.tier.split(' ')[0], 'i').test(service.name));
    return {
      ...pkg,
      livePrice: linked && linked.price != null ? linked.price : pkg.price ?? null,
      liveServiceId: linked?.id,
      durationMinutes: linked?.durationMinutes,
      bookable: Boolean(linked),
    };
  });
}


const LEGACY_BRIDAL_SERVICE_IDS = new Set(['bl-1', 'bl-2', 'bl-3', 'bl-4', 'bl-5']);
const LEGACY_BRIDAL_STYLIST_IDS = new Set(['bl-st-1', 'bl-st-2', 'bl-st-3']);

/**
 * The remote template catalogue still holds the old generic bridal demo
 * (bl-* services, Unsplash portraits). Keep the redesigned Shringaar Royal
 * catalogue unless the remote copy already carries the sr-* ids.
 */
export function upgradeShringaarTemplate<T extends { id: string }>(remote: T, local: Record<string, any>): T {
  if (!remote || remote.id !== 'bridal_lounge') return remote;
  const raw = remote as Record<string, any>;
  const remoteServices =
    Array.isArray(raw.services) && raw.services.some((s: any) => String(s?.id || '').startsWith('sr-'))
      ? raw.services
      : local.services;
  const remoteStylists =
    Array.isArray(raw.stylists) && raw.stylists.length >= 3 && !raw.stylists.some((s: any) => LEGACY_BRIDAL_STYLIST_IDS.has(String(s?.id || '')))
      ? raw.stylists
      : local.stylists;
  return { ...raw, ...local, services: remoteServices, stylists: remoteStylists } as unknown as T;
}

/** Any pre-Template-11 bridal demo photo was a remote stock URL. */
export function isLegacyBridalStockUrl(url?: string | null): boolean {
  const value = (url || '').trim();
  if (!value) return false;
  return value.includes('images.unsplash.com') || /\/templates\/roop-mahal\//.test(value);
}

export function upgradeLegacyBridalStylists<T extends Pick<Stylist, 'id' | 'avatarUrl'>>(
  stylists: T[],
  businessType?: string,
): T[] {
  if (businessType !== 'bridal_lounge' || !Array.isArray(stylists)) return stylists;
  const fallbackPortraits = [SHRINGAAR_IMAGES.team.anuradha, SHRINGAAR_IMAGES.team.janki, SHRINGAAR_IMAGES.team.farzana];
  return stylists.map((stylist, index) => {
    const current = (stylist.avatarUrl || '').trim();
    if (!current || isLegacyBridalStockUrl(current)) {
      return { ...stylist, avatarUrl: fallbackPortraits[index % fallbackPortraits.length] };
    }
    return stylist;
  });
}

export function isLegacyBridalService(id?: string | null): boolean {
  return LEGACY_BRIDAL_SERVICE_IDS.has(String(id || ''));
}

/** SEO title, description, OG tags and LocalBusiness JSON-LD for the storefront. */
export function buildShringaarSeo(
  profile: SalonProfile,
  config: ResolvedShringaarConfig,
  siteUrl = 'https://shringaarroyal.example',
) {
  const brand = (profile.businessName || '').trim() || SHRINGAAR_BRAND_NAME;
  const city = (profile.city || '').trim() || SHRINGAAR_DEFAULT_CITY;
  const phone = (profile.phone || profile.whatsapp || '').trim() || SHRINGAAR_DEFAULT_PHONE;
  const address = [
    (profile.address || '').trim() || SHRINGAAR_DEFAULT_ADDRESS,
    city,
    (profile.postalCode || '').trim() || SHRINGAAR_DEFAULT_POSTAL_CODE,
  ].filter(Boolean).join(', ');
  const cheapest = SHRINGAAR_SERVICES.filter((s) => !/package|combo|bundle/i.test(`${s.category} ${s.name}`)).reduce<number | undefined>(
    (min, s) => (s.price != null && (min === undefined || s.price < min) ? s.price : min),
    undefined,
  );
  const title = `${brand} — Royal Rajputana Bridal Makeup & Trousseau Lounge in ${city}`;
  const description =
    `Heirloom bridal makeovers, hand-draped Rajputana trousseaus, kundan jewellery styling and pre-bridal ubtan rituals at ${brand}, ${city}.` +
    (cheapest ? ` Bridal services from ${shringaarFormatInr(cheapest)}.` : '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: brand,
    description: config.aboutStory.slice(0, 300),
    url: siteUrl,
    image: `${siteUrl.replace(/\/$/, '')}${SHRINGAAR_IMAGES.ogImage}`,
    telephone: phone,
    priceRange: '₹₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: (profile.address || '').trim() || SHRINGAAR_DEFAULT_ADDRESS,
      addressLocality: city,
      postalCode: (profile.postalCode || '').trim() || SHRINGAAR_DEFAULT_POSTAL_CODE,
      addressCountry: 'IN',
    },
    openingHours: config.workingHoursDisplay,
    makesOffer: SHRINGAAR_SERVICES.map((service) => ({
      '@type': 'Offer',
      name: service.name,
      price: service.price,
      priceCurrency: 'INR',
    })),
  };
  return { title, description, ogTitle: title, ogDescription: description, ogImage: SHRINGAAR_IMAGES.ogImage, jsonLd };
}

/** Reject malformed CMS rows before the existing template reads service fields. */
export function sanitizeShringaarServices(services: unknown): SalonService[] {
  return Array.isArray(services) ? services.filter((service): service is SalonService =>
    service !== null && typeof service === 'object' && typeof service.name === 'string' && !!service.name.trim()
  ) : [];
}
