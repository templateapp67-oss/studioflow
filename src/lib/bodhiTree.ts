import type {
  BodhiTreeBranch,
  BodhiTreeFaqItem,
  BodhiTreePalaceItem,
  BodhiTreeReviewItem,
  BodhiTreeStatItem,
  BodhiTreeThemeColors,
  SalonProfile,
  SalonService,
  Stylist,
} from '../types';

/**
 * Template 09 — Bodhi Tree Massage & Wellness Sanctuary.
 * Category: Massage, Spa & Wellness (`massage_wellness`), slug `bodhi-tree`.
 *
 * Theme: "A royal Jaipur retreat" — sage green + cream, soft gold accents,
 * deep forest-green text and small touches of Jaipur pink-sandstone.
 *
 * All copy below is DEFAULT demo content in simple Indian English. Owners
 * edit everything during onboarding (business name, logo, tagline, phone,
 * WhatsApp, address, services, INR prices, timings, staff, gallery, social
 * links, brand colours) — nothing here is hard-coded into the storefront.
 * Prices are always INR (₹), formatted the Indian way (₹2,500).
 */

export const BODHI_TREE_TEMPLATE_CODE = '09';
export const BODHI_TREE_SLUG = 'bodhi-tree';
export const BODHI_TREE_SELECTOR_LABEL = 'Bodhi Tree (09)';
export const BODHI_TREE_BRAND_NAME = 'Bodhi Tree Massage & Wellness Sanctuary';
export const BODHI_TREE_TAGLINE = 'Rest well. Feel light. Padharo, Jaipur.';
export const BODHI_TREE_HERO_HEADING = 'Rest Well. Feel Light.';
export const BODHI_TREE_HERO_SUBTEXT =
  'A calm massage and wellness place in the heart of Jaipur. Pure oils, trained therapists and simple, honest care — so you can relax, sleep better and feel fresh.';
export const BODHI_TREE_DEFAULT_ABOUT =
  'Bodhi Tree is a calm place in the heart of Jaipur. Our trained therapists use pure oils and Ayurvedic methods to help you relax, sleep better and feel fresh.';
export const BODHI_TREE_DEFAULT_CITY = 'Jaipur, Rajasthan';
export const BODHI_TREE_DEFAULT_ADDRESS = 'Sardar Patel Marg, C-Scheme';
export const BODHI_TREE_DEFAULT_POSTAL_CODE = '302001';
export const BODHI_TREE_DEFAULT_PHONE = '+91 98290 10009';
export const BODHI_TREE_DEFAULT_EMAIL = 'hello@bodhitree.example';
export const BODHI_TREE_DEFAULT_HOURS = 'Open all days · 9:00 AM - 9:00 PM';

export const BODHI_TREE_DEFAULT_COLORS: BodhiTreeThemeColors = {
  bgCream: '#FAF6EE',
  bgSage: '#EAF0E2',
  forest: '#1E3A2F',
  sage: '#4E6E58',
  gold: '#C5A46D',
  sandstone: '#E8B4A0',
  textMuted: '#54655A',
};

/** Bundled demo photography, served from this repository (never a remote
 * stock host) so the template renders offline and in CI. Free-to-use
 * sources are credited in /public/templates/bodhi-tree/README.md. */
export const BODHI_TREE_IMAGES = {
  logoSvg: '/templates/bodhi-tree/logo.svg',
  logoPng: '/templates/bodhi-tree/logo.png',
  faviconSvg: '/templates/bodhi-tree/favicon.svg',
  favicon32: '/templates/bodhi-tree/favicon-32x32.png',
  favicon192: '/templates/bodhi-tree/favicon-192x192.png',
  appleTouchIcon: '/templates/bodhi-tree/apple-touch-icon.png',
  heroDesktop: '/templates/bodhi-tree/hero.webp',
  heroMobile: '/templates/bodhi-tree/hero-mobile.webp',
  preview: '/templates/bodhi-tree/preview.webp',
  aboutMassage: '/templates/bodhi-tree/about-massage.webp',
  aboutStones: '/templates/bodhi-tree/about-stones.webp',
  contact: '/templates/bodhi-tree/contact.webp',
  ogImage: '/templates/bodhi-tree/og-image.jpg',
  services: {
    abhyanga: '/templates/bodhi-tree/services/abhyanga.webp',
    swedish: '/templates/bodhi-tree/services/swedish.webp',
    deepTissue: '/templates/bodhi-tree/services/deep-tissue.webp',
    shirodhara: '/templates/bodhi-tree/services/shirodhara.webp',
    thai: '/templates/bodhi-tree/services/thai.webp',
    foot: '/templates/bodhi-tree/services/foot-reflexology.webp',
    couples: '/templates/bodhi-tree/services/couples.webp',
    aroma: '/templates/bodhi-tree/services/aroma.webp',
    champi: '/templates/bodhi-tree/services/champi.webp',
  },
  palace: {
    hawaMahal: '/templates/bodhi-tree/palace/hawa-mahal.webp',
    cityPalace: '/templates/bodhi-tree/palace/city-palace.webp',
    amberFort: '/templates/bodhi-tree/palace/amber-fort.webp',
    jalMahal: '/templates/bodhi-tree/palace/jal-mahal.webp',
    nahargarh: '/templates/bodhi-tree/palace/nahargarh.webp',
    rambagh: '/templates/bodhi-tree/palace/rambagh.webp',
    albertHall: '/templates/bodhi-tree/palace/albert-hall.webp',
  },
  packages: {
    fullDayRelax: '/templates/bodhi-tree/packages/full-day-relax.webp',
    bridalGlow: '/templates/bodhi-tree/packages/bridal-glow.webp',
    weekendRelax: '/templates/bodhi-tree/packages/weekend-relax.webp',
  },
  gallery: {
    spaRoom: '/templates/bodhi-tree/gallery/spa-room.webp',
    towelsHerbs: '/templates/bodhi-tree/gallery/towels-herbs.webp',
    marigoldDiyas: '/templates/bodhi-tree/gallery/marigold-diyas.webp',
    candles: '/templates/bodhi-tree/gallery/candles.webp',
    oils: '/templates/bodhi-tree/gallery/oils.webp',
    treatment: '/templates/bodhi-tree/gallery/treatment.webp',
    lounge: '/templates/bodhi-tree/gallery/lounge.webp',
    herbalTea: '/templates/bodhi-tree/gallery/herbal-tea.webp',
    entrance: '/templates/bodhi-tree/gallery/entrance.webp',
    stonesFlowers: '/templates/bodhi-tree/gallery/stones-flowers.webp',
  },
  team: {
    kavita: '/templates/bodhi-tree/team/kavita.webp',
    deepak: '/templates/bodhi-tree/team/deepak.webp',
    rekha: '/templates/bodhi-tree/team/rekha.webp',
    sunita: '/templates/bodhi-tree/team/sunita.webp',
  },
  testimonials: {
    neha: '/templates/bodhi-tree/testimonials/neha.webp',
    priya: '/templates/bodhi-tree/testimonials/priya.webp',
    sunita: '/templates/bodhi-tree/testimonials/sunita.webp',
  },
} as const;

export const BODHI_TREE_DEFAULT_STATS: BodhiTreeStatItem[] = [
  { id: 'bt-stat-1', value: '9+', label: 'Years of care' },
  { id: 'bt-stat-2', value: '25,000+', label: 'Happy guests' },
  { id: 'bt-stat-3', value: '4', label: 'Jaipur branches' },
  { id: 'bt-stat-4', value: '4.9', label: 'Guest rating' },
];

/** The everyday massage menu. Prices in INR (₹). */
export const BODHI_TREE_CORE_SERVICES: SalonService[] = [
  { id: 'bt-s1', name: 'Abhyanga (Ayurvedic Oil Massage)', category: 'Ayurvedic Massage', durationMinutes: 60, price: 2500, description: 'Full body massage with warm Ayurvedic oil. Helps you relax and sleep better.', icon: 'spa', popular: true, imageUrl: BODHI_TREE_IMAGES.services.abhyanga },
  { id: 'bt-s2', name: 'Swedish Massage', category: 'Classic Massage', durationMinutes: 60, price: 2200, description: 'Soft, gentle strokes for full body relax. A good first massage.', icon: 'self_improvement', imageUrl: BODHI_TREE_IMAGES.services.swedish },
  { id: 'bt-s3', name: 'Deep Tissue Massage', category: 'Classic Massage', durationMinutes: 60, price: 2800, description: 'Strong pressure for tight back, neck and shoulders. Good after long work hours.', icon: 'fitness_center', popular: true, imageUrl: BODHI_TREE_IMAGES.services.deepTissue },
  { id: 'bt-s4', name: 'Shirodhara', category: 'Ayurvedic Massage', durationMinutes: 60, price: 3200, description: 'Warm oil flows gently on your forehead. Very calming for the mind.', icon: 'water_drop', popular: true, imageUrl: BODHI_TREE_IMAGES.services.shirodhara },
  { id: 'bt-s5', name: 'Thai Massage', category: 'Classic Massage', durationMinutes: 60, price: 3000, description: 'Dry massage with gentle stretches. Makes the body feel light and open.', icon: 'accessibility_new', imageUrl: BODHI_TREE_IMAGES.services.thai },
  { id: 'bt-s6', name: 'Foot Reflexology', category: 'Head & Foot Care', durationMinutes: 45, price: 1200, description: 'Foot massage with pressure points. Great for tired feet and long days.', icon: 'pan_tool', imageUrl: BODHI_TREE_IMAGES.services.foot },
  { id: 'bt-s7', name: "Couple's Massage", category: 'Couple & Specials', durationMinutes: 60, price: 6500, description: 'Side-by-side massage for two in our private couple room.', icon: 'favorite', popular: true, imageUrl: BODHI_TREE_IMAGES.services.couples },
  { id: 'bt-s8', name: 'Aroma Massage', category: 'Classic Massage', durationMinutes: 60, price: 2600, description: 'Light massage with sweet-smelling natural oils. Calm and fresh feeling.', icon: 'local_florist', imageUrl: BODHI_TREE_IMAGES.services.aroma },
  { id: 'bt-s9', name: 'Head, Neck & Shoulder Champi', category: 'Head & Foot Care', durationMinutes: 30, price: 900, description: 'Our desi champi with warm oil. Quick relief for head and shoulders.', icon: 'spa', imageUrl: BODHI_TREE_IMAGES.services.champi },
];

/** The Jaipur Palace Collection, as bookable services. Prices in INR (₹). */
export const BODHI_TREE_PALACE_SERVICES: SalonService[] = [
  { id: 'bt-pal-hawa', name: 'Hawa Mahal Calm Ritual', category: 'Palace Collection', durationMinutes: 60, price: 2499, description: '60 min light oil massage with head massage. Inspired by the pink windows of Hawa Mahal.', icon: 'account_balance', imageUrl: BODHI_TREE_IMAGES.palace.hawaMahal },
  { id: 'bt-pal-city', name: 'City Palace Royal Abhyanga', category: 'Palace Collection', durationMinutes: 90, price: 3999, description: '90 min Ayurvedic oil massage with steam. Slow, rich and full of care, like the City Palace.', icon: 'account_balance', popular: true, imageUrl: BODHI_TREE_IMAGES.palace.cityPalace },
  { id: 'bt-pal-amber', name: 'Amer Fort Warrior Recovery', category: 'Palace Collection', durationMinutes: 75, price: 3499, description: 'Deep tissue massage with hot herbal potli. Made for tired backs, necks and shoulders.', icon: 'account_balance', imageUrl: BODHI_TREE_IMAGES.palace.amberFort },
  { id: 'bt-pal-jal', name: 'Jal Mahal Lakeside Shirodhara', category: 'Palace Collection', durationMinutes: 60, price: 3299, description: 'Oil flow on the forehead for 60 min. Calm like Jal Mahal sitting in the lake.', icon: 'account_balance', imageUrl: BODHI_TREE_IMAGES.palace.jalMahal },
  { id: 'bt-pal-nahargarh', name: 'Nahargarh Sunset Relax', category: 'Palace Collection', durationMinutes: 75, price: 2999, description: 'Aroma massage with foot care. Soft and slow, like the sunset view from Nahargarh.', icon: 'account_balance', imageUrl: BODHI_TREE_IMAGES.palace.nahargarh },
  { id: 'bt-pal-rambagh', name: 'Rambagh Maharani (Full Day)', category: 'Palace Collection', durationMinutes: 300, price: 9999, description: 'A full day of royal care: massage, facial, hair spa and a light lunch. Our most special package.', icon: 'workspace_premium', popular: true, imageUrl: BODHI_TREE_IMAGES.palace.rambagh },
  { id: 'bt-pal-albert', name: 'Albert Hall Heritage Reset', category: 'Palace Collection', durationMinutes: 75, price: 4499, description: 'Swedish massage with a herbal tea ritual. A gentle reset, inspired by the calm halls of Albert Hall.', icon: 'account_balance', imageUrl: BODHI_TREE_IMAGES.palace.albertHall },
];

/** Value packages shown on the Packages page. Prices in INR (₹). */
export const BODHI_TREE_PACKAGE_SERVICES: SalonService[] = [
  { id: 'bt-pkg-fullday', name: 'Full Day Relax Package', category: 'Packages', durationMinutes: 240, price: 7999, description: 'Massage, facial, foot care and herbal tea. A full day just for you.', icon: 'card_giftcard', popular: true, imageUrl: BODHI_TREE_IMAGES.packages.fullDayRelax },
  { id: 'bt-pkg-bridal', name: 'Bridal Glow Package', category: 'Packages', durationMinutes: 180, price: 5499, description: 'Body massage, facial and hair spa before your big day. Marigold and mehendi mood, fully relaxed.', icon: 'card_giftcard', imageUrl: BODHI_TREE_IMAGES.packages.bridalGlow },
  { id: 'bt-pkg-weekend', name: 'Weekend Relax Package', category: 'Packages', durationMinutes: 150, price: 4499, description: 'Aroma massage, head champi and foot care. Perfect for a slow weekend.', icon: 'card_giftcard', imageUrl: BODHI_TREE_IMAGES.packages.weekendRelax },
  { id: 'bt-pkg-couple', name: 'Couple Special Package', category: 'Packages', durationMinutes: 120, price: 8999, description: 'Couple massage, foot care and herbal tea for two in our private room.', icon: 'card_giftcard', imageUrl: BODHI_TREE_IMAGES.services.couples },
  { id: 'bt-pkg-monthly', name: 'Monthly Care Package (4 Visits)', category: 'Packages', durationMinutes: 60, price: 8499, description: 'Four 60 min massages in one month. For regular care and better sleep.', icon: 'card_giftcard', imageUrl: BODHI_TREE_IMAGES.gallery.candles },
];

export const BODHI_TREE_TEMPLATE_SERVICES: SalonService[] = [
  ...BODHI_TREE_CORE_SERVICES,
  ...BODHI_TREE_PALACE_SERVICES,
  ...BODHI_TREE_PACKAGE_SERVICES,
];

/** Palace Collection cards — the highlight of Template 09. */
export const BODHI_TREE_DEFAULT_PALACE_COLLECTION: BodhiTreePalaceItem[] = [
  {
    id: 'bt-palace-hawa',
    place: 'Hawa Mahal',
    title: 'Hawa Mahal Calm Ritual',
    price: 2499,
    duration: '60 min',
    blurb: 'Inspired by the pink windows of Hawa Mahal. Light, breezy and calming.',
    includes: ['60 min light oil massage', 'Head massage', 'Herbal tea'],
    imageUrl: BODHI_TREE_IMAGES.palace.hawaMahal,
    imageAlt: 'Hawa Mahal pink sandstone windows in Jaipur',
    linkedServiceId: 'bt-pal-hawa',
  },
  {
    id: 'bt-palace-city',
    place: 'City Palace',
    title: 'City Palace Royal Abhyanga',
    price: 3999,
    duration: '90 min',
    blurb: 'A royal treatment, just like the City Palace. Slow, rich and full of care.',
    includes: ['90 min Ayurvedic oil massage', 'Herbal steam', 'Herbal tea'],
    imageUrl: BODHI_TREE_IMAGES.palace.cityPalace,
    imageAlt: 'Colourful Peacock Gate at City Palace, Jaipur',
    linkedServiceId: 'bt-pal-city',
    popular: true,
    badgeLabel: 'Most Loved',
  },
  {
    id: 'bt-palace-amber',
    place: 'Amber Fort (Amer)',
    title: 'Amer Fort Warrior Recovery',
    price: 3499,
    duration: '75 min',
    blurb: 'Strong like the walls of Amer Fort. Made for tired backs, necks and shoulders.',
    includes: ['Deep tissue massage', 'Hot herbal potli', 'Warm towel finish'],
    imageUrl: BODHI_TREE_IMAGES.palace.amberFort,
    imageAlt: 'Amber Fort (Amer) on the hill in Jaipur',
    linkedServiceId: 'bt-pal-amber',
  },
  {
    id: 'bt-palace-jal',
    place: 'Jal Mahal',
    title: 'Jal Mahal Lakeside Shirodhara',
    price: 3299,
    duration: '60 min',
    blurb: 'Calm like Jal Mahal sitting in the lake. Helps you rest and sleep better.',
    includes: ['Shirodhara oil flow (60 min)', 'Head & shoulder massage', 'Herbal tea'],
    imageUrl: BODHI_TREE_IMAGES.palace.jalMahal,
    imageAlt: 'Jal Mahal palace in Man Sagar Lake, Jaipur',
    linkedServiceId: 'bt-pal-jal',
  },
  {
    id: 'bt-palace-nahargarh',
    place: 'Nahargarh Fort',
    title: 'Nahargarh Sunset Relax',
    price: 2999,
    duration: '75 min',
    blurb: 'Soft and slow, like the sunset view from Nahargarh Fort over Jaipur.',
    includes: ['Aroma massage', 'Foot care', 'Herbal tea'],
    imageUrl: BODHI_TREE_IMAGES.palace.nahargarh,
    imageAlt: 'Nahargarh Fort at sunset above Jaipur city',
    linkedServiceId: 'bt-pal-nahargarh',
  },
  {
    id: 'bt-palace-rambagh',
    place: 'Rambagh Palace',
    title: 'Rambagh Maharani Package',
    price: 9999,
    duration: 'Full day',
    blurb: 'A full day of royal care, the Rambagh way. Our most special package.',
    includes: ['Full body massage', 'Facial', 'Hair spa', 'Light lunch', 'Foot care'],
    imageUrl: BODHI_TREE_IMAGES.palace.rambagh,
    imageAlt: 'Royal palace garden with fountain in Jaipur, inspired by Rambagh Palace',
    linkedServiceId: 'bt-pal-rambagh',
    popular: true,
    badgeLabel: 'Royal Special',
  },
  {
    id: 'bt-palace-albert',
    place: 'Albert Hall',
    title: 'Albert Hall Heritage Reset',
    price: 4499,
    duration: '75 min',
    blurb: 'A gentle reset, inspired by the calm halls of the Albert Hall Museum.',
    includes: ['Swedish massage', 'Herbal tea ritual', 'Warm foot soak'],
    imageUrl: BODHI_TREE_IMAGES.palace.albertHall,
    imageAlt: 'Albert Hall Museum in Jaipur lit up in the evening',
    linkedServiceId: 'bt-pal-albert',
  },
];

/** Default Jaipur branches. Owners can add more areas and cities. */
export const BODHI_TREE_DEFAULT_BRANCHES: BodhiTreeBranch[] = [
  { id: 'bt-br-cscheme', name: 'C-Scheme', area: 'C-Scheme', address: 'Sardar Patel Marg, C-Scheme, Jaipur - 302001', phone: BODHI_TREE_DEFAULT_PHONE, hours: '9:00 AM - 9:00 PM' },
  { id: 'bt-br-malviya', name: 'Malviya Nagar', area: 'Malviya Nagar', address: 'Near World Trade Park, Malviya Nagar, Jaipur - 302017', phone: BODHI_TREE_DEFAULT_PHONE, hours: '9:00 AM - 9:00 PM' },
  { id: 'bt-br-vaishali', name: 'Vaishali Nagar', area: 'Vaishali Nagar', address: 'Amrapali Circle, Vaishali Nagar, Jaipur - 302021', phone: BODHI_TREE_DEFAULT_PHONE, hours: '9:00 AM - 9:00 PM' },
  { id: 'bt-br-banipark', name: 'Bani Park', area: 'Bani Park', address: 'Collectorate Circle, Jai Singh Highway, Bani Park, Jaipur - 302016', phone: BODHI_TREE_DEFAULT_PHONE, hours: '9:00 AM - 9:00 PM' },
];

export const BODHI_TREE_DEFAULT_STYLISTS: Stylist[] = [
  {
    id: 'bt-st-1',
    name: 'Kavita Sharma',
    role: 'Senior Ayurvedic Therapist',
    experienceYears: 9,
    avatarUrl: BODHI_TREE_IMAGES.team.kavita,
    specialties: ['Abhyanga', 'Shirodhara', 'Herbal Potli'],
    rating: 4.9,
    bio: 'Kavita has 9 years of Ayurvedic massage experience. Guests love her calm nature and slow, caring hands.',
  },
  {
    id: 'bt-st-2',
    name: 'Deepak Yadav',
    role: 'Deep Tissue & Thai Massage Therapist',
    experienceYears: 7,
    avatarUrl: BODHI_TREE_IMAGES.team.deepak,
    specialties: ['Deep Tissue', 'Thai Massage', 'Back & Shoulder Care'],
    rating: 4.9,
    bio: 'Deepak is the right person for tight backs and stiff shoulders. Firm pressure, done with full care.',
  },
  {
    id: 'bt-st-3',
    name: 'Rekha Jain',
    role: 'Aroma & Swedish Massage Therapist',
    experienceYears: 6,
    avatarUrl: BODHI_TREE_IMAGES.team.rekha,
    specialties: ['Aroma Massage', 'Swedish Massage', "Couple's Massage"],
    rating: 4.8,
    bio: 'Rekha does soft, relaxing treatments with natural aroma oils. Perfect for a slow, peaceful visit.',
  },
  {
    id: 'bt-st-4',
    name: 'Sunita Kumari',
    role: 'Champi & Foot Care Therapist',
    experienceYears: 5,
    avatarUrl: BODHI_TREE_IMAGES.team.sunita,
    specialties: ['Head Champi', 'Foot Reflexology', 'Neck & Shoulder Care'],
    rating: 4.8,
    bio: 'Sunita is known for her desi champi and foot care. Small treatments, big relief.',
  },
];

export const BODHI_TREE_DEFAULT_REVIEWS: BodhiTreeReviewItem[] = [
  { id: 'bt-rev-1', name: 'Neha S.', tag: 'C-Scheme, Jaipur', rating: 5, serviceName: 'Abhyanga', quote: 'Very calm place. The Abhyanga massage was so relaxing, I slept like a baby that night. Staff is polite and the rooms are clean.', avatarUrl: BODHI_TREE_IMAGES.testimonials.neha },
  { id: 'bt-rev-2', name: 'Rohit M.', tag: 'Malviya Nagar, Jaipur', rating: 5, serviceName: 'Deep Tissue Massage', quote: 'My back pain from long desk work feels much better after the deep tissue massage. Good pressure, no hurry. Price is also fair.', avatarUrl: '' },
  { id: 'bt-rev-3', name: 'Priya K.', tag: 'Vaishali Nagar, Jaipur', rating: 5, serviceName: 'Shirodhara', quote: 'Tried Shirodhara for the first time. The warm oil on the forehead is a different level of peace. Will come again with my mother.', avatarUrl: BODHI_TREE_IMAGES.testimonials.priya },
  { id: 'bt-rev-4', name: 'Aman J.', tag: 'Bani Park, Jaipur', rating: 5, serviceName: "Couple's Massage", quote: "Booked the couple's massage for our anniversary. Private room, nice smell, very good service. The herbal tea at the end was a sweet touch.", avatarUrl: '' },
  { id: 'bt-rev-5', name: 'Sunita D.', tag: 'C-Scheme, Jaipur', rating: 5, serviceName: 'Foot Reflexology', quote: 'I go every month for foot reflexology. My feet feel light and fresh. Booking on WhatsApp is very easy.', avatarUrl: BODHI_TREE_IMAGES.testimonials.sunita },
];

export const BODHI_TREE_DEFAULT_FAQS: BodhiTreeFaqItem[] = [
  { id: 'bt-faq-1', question: 'Do I need to book before coming?', answer: 'Booking is better, so your room and therapist are ready for you. You can book on this website, by phone or on WhatsApp. Walk-ins are welcome if a slot is free.' },
  { id: 'bt-faq-2', question: 'What are your timings?', answer: 'We are open all 7 days, 9:00 AM - 9:00 PM. The last booking is taken at 8:00 PM.' },
  { id: 'bt-faq-3', question: 'Which oils do you use?', answer: 'We use pure cold-pressed oils and Ayurvedic herbal oils. If you have any allergy, please tell us before your treatment and we will choose the right oil for you.' },
  { id: 'bt-faq-4', question: 'This is my first massage. Which one should I pick?', answer: 'Start with the Swedish Massage or Abhyanga. Both are gentle and full-body. Our team will also guide you when you reach.' },
  { id: 'bt-faq-5', question: 'How can I pay?', answer: 'You can pay by UPI, card or cash. All prices on this website are in ₹ (INR) only — no hidden charges.' },
  { id: 'bt-faq-6', question: 'Can I choose a male or female therapist?', answer: 'Yes, of course. Tell us your choice while booking and we will do our best to give you the same.' },
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function bodhiSanitizeHexColor(input: string | undefined, fallback: string): string {
  const trimmed = (input || '').trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

/** Format an amount in INR with Indian digit grouping, e.g. ₹2,500 / ₹12,000. */
export function bodhiFormatInr(price: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(price || 0));
}

export function bodhiTreeServiceImage(
  service: Pick<SalonService, 'id' | 'name' | 'category' | 'imageUrl'>,
): string {
  if (service.imageUrl && service.imageUrl.trim()) return service.imageUrl.trim();
  const text = `${service.id} ${service.name} ${service.category}`.toLowerCase();
  if (/hawa/.test(text)) return BODHI_TREE_IMAGES.palace.hawaMahal;
  if (/rambagh|maharani/.test(text)) return BODHI_TREE_IMAGES.palace.rambagh;
  if (/city palace|royal abhyanga/.test(text)) return BODHI_TREE_IMAGES.palace.cityPalace;
  if (/amber|amer|warrior/.test(text)) return BODHI_TREE_IMAGES.palace.amberFort;
  if (/jal mahal|lakeside/.test(text)) return BODHI_TREE_IMAGES.palace.jalMahal;
  if (/nahargarh|sunset/.test(text)) return BODHI_TREE_IMAGES.palace.nahargarh;
  if (/albert|heritage reset/.test(text)) return BODHI_TREE_IMAGES.palace.albertHall;
  if (/shirodhara/.test(text)) return BODHI_TREE_IMAGES.services.shirodhara;
  if (/abhyang/.test(text)) return BODHI_TREE_IMAGES.services.abhyanga;
  if (/deep tissue|sports/.test(text)) return BODHI_TREE_IMAGES.services.deepTissue;
  if (/thai|stretch/.test(text)) return BODHI_TREE_IMAGES.services.thai;
  if (/foot|reflex/.test(text)) return BODHI_TREE_IMAGES.services.foot;
  if (/couple/.test(text)) return BODHI_TREE_IMAGES.services.couples;
  if (/aroma/.test(text)) return BODHI_TREE_IMAGES.services.aroma;
  if (/champi|head|neck|shoulder/.test(text)) return BODHI_TREE_IMAGES.services.champi;
  if (/bridal|dulhan|wedding/.test(text)) return BODHI_TREE_IMAGES.packages.bridalGlow;
  if (/weekend/.test(text)) return BODHI_TREE_IMAGES.packages.weekendRelax;
  if (/full day|monthly|package|combo/.test(text)) return BODHI_TREE_IMAGES.packages.fullDayRelax;
  if (/swedish/.test(text)) return BODHI_TREE_IMAGES.services.swedish;
  return BODHI_TREE_IMAGES.services.abhyanga;
}

/** The pre-Template-09 massage_wellness demo used remote stock photos. */
export function isLegacyMassageWellnessStockUrl(url?: string | null): boolean {
  const value = (url || '').trim();
  if (!value) return false;
  return value.includes('images.unsplash.com');
}

export function upgradeLegacyMassageWellnessStylists<T extends Pick<Stylist, 'id' | 'avatarUrl'>>(
  stylists: T[],
  businessType?: string,
): T[] {
  if (businessType !== 'massage_wellness' || !Array.isArray(stylists)) return stylists;
  const fallbackPortraits = [
    BODHI_TREE_IMAGES.team.kavita,
    BODHI_TREE_IMAGES.team.deepak,
    BODHI_TREE_IMAGES.team.rekha,
    BODHI_TREE_IMAGES.team.sunita,
  ];
  return stylists.map((stylist, index) => {
    const current = (stylist.avatarUrl || '').trim();
    if (!current || isLegacyMassageWellnessStockUrl(current)) {
      return {
        ...stylist,
        avatarUrl: fallbackPortraits[index % fallbackPortraits.length],
      };
    }
    return stylist;
  });
}

/**
 * The remote template catalogue may still hold the old (Goa) massage_wellness
 * demo. Keep the redesigned Jaipur content unless the remote copy already
 * uses the bundled Bodhi Tree imagery.
 */
export function upgradeMassageWellnessTemplate<T extends { id: string }>(
  remote: T,
  local: Record<string, any>,
): T {
  if (!remote || remote.id !== 'massage_wellness') return remote;
  const raw = remote as Record<string, any>;
  const remoteStylists =
    Array.isArray(raw.stylists) && raw.stylists.length >= 4 && !raw.stylists.some((s: any) => isLegacyMassageWellnessStockUrl(s?.avatarUrl))
      ? raw.stylists
      : local.stylists;
  // The remote catalogue may be customised; never replace it based on partial fingerprints.
  const remoteServices =
    Array.isArray(raw.services) && raw.services.length >= 9 && raw.services.some((s: any) => String(s?.imageUrl || '').startsWith('/templates/bodhi-tree/'))
      ? raw.services
      : local.services;
  return {
    ...raw,
    ...local,
    services: remoteServices,
    stylists: remoteStylists,
  } as unknown as T;
}

export interface ResolvedBodhiTreeConfig {
  selectorLabel: string;
  heroHeading: string;
  heroSubtext: string;
  heroDesktopUrl: string;
  heroMobileUrl: string;
  aboutHeading: string;
  aboutStory: string;
  aboutImageUrl: string;
  aboutImage2Url: string;
  palaceHeading: string;
  palaceSubtext: string;
  contactImageUrl: string;
  publicEmail: string;
  workingHoursDisplay: string;
  mapEmbedUrl: string;
  colors: BodhiTreeThemeColors;
  stats: BodhiTreeStatItem[];
  palaceCollection: BodhiTreePalaceItem[];
  branches: BodhiTreeBranch[];
  faqs: BodhiTreeFaqItem[];
  reviews: BodhiTreeReviewItem[];
}

export function resolveBodhiTreeConfig(profile: SalonProfile): ResolvedBodhiTreeConfig {
  const raw = profile.bodhiTree || {};
  const rawColors = raw.colors || {};
  const colors: BodhiTreeThemeColors = {
    bgCream: bodhiSanitizeHexColor(rawColors.bgCream, BODHI_TREE_DEFAULT_COLORS.bgCream),
    bgSage: bodhiSanitizeHexColor(rawColors.bgSage, BODHI_TREE_DEFAULT_COLORS.bgSage),
    forest: bodhiSanitizeHexColor(rawColors.forest, BODHI_TREE_DEFAULT_COLORS.forest),
    sage: bodhiSanitizeHexColor(
      rawColors.sage || profile.customAccentColor,
      BODHI_TREE_DEFAULT_COLORS.sage,
    ),
    gold: bodhiSanitizeHexColor(rawColors.gold, BODHI_TREE_DEFAULT_COLORS.gold),
    sandstone: bodhiSanitizeHexColor(rawColors.sandstone, BODHI_TREE_DEFAULT_COLORS.sandstone),
    textMuted: bodhiSanitizeHexColor(rawColors.textMuted, BODHI_TREE_DEFAULT_COLORS.textMuted),
  };

  const heroDesktopCandidate = (raw.heroDesktopUrl || profile.coverImageUrl || '').trim();
  const heroDesktopUrl =
    heroDesktopCandidate && !isLegacyMassageWellnessStockUrl(heroDesktopCandidate)
      ? heroDesktopCandidate
      : BODHI_TREE_IMAGES.heroDesktop;
  const heroMobileUrl = (raw.heroMobileUrl || '').trim() || BODHI_TREE_IMAGES.heroMobile;
  const aboutImageUrl = (raw.aboutImageUrl || '').trim() || BODHI_TREE_IMAGES.aboutMassage;
  const aboutImage2Url = (raw.aboutImage2Url || '').trim() || BODHI_TREE_IMAGES.aboutStones;
  const contactImageUrl = (raw.contactImageUrl || '').trim() || BODHI_TREE_IMAGES.contact;

  const stats =
    Array.isArray(raw.stats) && raw.stats.length > 0
      ? raw.stats.map((item, idx) => ({
          id: item.id || `bt-stat-${idx + 1}`,
          value: (item.value || '').trim() || BODHI_TREE_DEFAULT_STATS[idx % BODHI_TREE_DEFAULT_STATS.length].value,
          label: (item.label || '').trim() || BODHI_TREE_DEFAULT_STATS[idx % BODHI_TREE_DEFAULT_STATS.length].label,
        }))
      : BODHI_TREE_DEFAULT_STATS;

  const palaceCollection =
    Array.isArray(raw.palaceCollection) && raw.palaceCollection.length > 0
      ? raw.palaceCollection.map((item, idx) => {
          const fallback = BODHI_TREE_DEFAULT_PALACE_COLLECTION[idx % BODHI_TREE_DEFAULT_PALACE_COLLECTION.length];
          return {
            id: item.id || fallback.id,
            place: (item.place || '').trim() || fallback.place,
            title: (item.title || '').trim() || fallback.title,
            price: Number.isFinite(Number(item.price)) && Number(item.price) > 0 ? Number(item.price) : fallback.price,
            duration: (item.duration || '').trim() || fallback.duration,
            blurb: (item.blurb || '').trim() || fallback.blurb,
            includes:
              Array.isArray(item.includes) && item.includes.filter(Boolean).length > 0
                ? item.includes.map((line) => String(line).trim()).filter(Boolean)
                : fallback.includes,
            imageUrl: (item.imageUrl || '').trim() || fallback.imageUrl,
            imageAlt: (item.imageAlt || '').trim() || fallback.imageAlt,
            linkedServiceId: item.linkedServiceId || fallback.linkedServiceId,
            popular: typeof item.popular === 'boolean' ? item.popular : fallback.popular,
            badgeLabel: (item.badgeLabel || '').trim() || fallback.badgeLabel,
          };
        })
      : BODHI_TREE_DEFAULT_PALACE_COLLECTION;

  const branches =
    Array.isArray(raw.branches) && raw.branches.length > 0
      ? raw.branches.map((branch, idx) => {
          const fallback = BODHI_TREE_DEFAULT_BRANCHES[idx % BODHI_TREE_DEFAULT_BRANCHES.length];
          return {
            id: branch.id || `bt-br-${idx + 1}`,
            name: (branch.name || '').trim() || fallback.name,
            area: (branch.area || branch.name || '').trim() || fallback.area,
            address: (branch.address || '').trim() || fallback.address,
            phone: (branch.phone || '').trim(),
            hours: (branch.hours || '').trim() || '9:00 AM - 9:00 PM',
          };
        })
      : BODHI_TREE_DEFAULT_BRANCHES;

  const faqs =
    Array.isArray(raw.faqs) && raw.faqs.length > 0
      ? raw.faqs.map((faq, idx) => {
          const fallback = BODHI_TREE_DEFAULT_FAQS[idx % BODHI_TREE_DEFAULT_FAQS.length];
          return {
            id: faq.id || `bt-faq-${idx + 1}`,
            question: (faq.question || '').trim() || fallback.question,
            answer: (faq.answer || '').trim() || fallback.answer,
          };
        })
      : BODHI_TREE_DEFAULT_FAQS;

  const reviews =
    Array.isArray(raw.reviews) && raw.reviews.length > 0
      ? raw.reviews.map((rev, idx) => {
          const fallback = BODHI_TREE_DEFAULT_REVIEWS[idx % BODHI_TREE_DEFAULT_REVIEWS.length];
          return {
            id: rev.id || fallback.id,
            name: (rev.name || '').trim() || fallback.name,
            tag: (rev.tag || '').trim() || fallback.tag,
            rating: Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5))),
            quote: (rev.quote || '').trim() || fallback.quote,
            serviceName: (rev.serviceName || '').trim() || fallback.serviceName,
            avatarUrl: typeof rev.avatarUrl === 'string' ? rev.avatarUrl : fallback.avatarUrl,
          };
        })
      : BODHI_TREE_DEFAULT_REVIEWS;

  const profileAbout = (profile.about || '').trim();
  const aboutStory =
    (raw.aboutStory || '').trim() ||
    (profileAbout && !profileAbout.includes('Candolim') ? profileAbout : '') ||
    BODHI_TREE_DEFAULT_ABOUT;

  return {
    selectorLabel: (raw.selectorLabel || '').trim() || BODHI_TREE_SELECTOR_LABEL,
    heroHeading: (raw.heroHeading || '').trim() || BODHI_TREE_HERO_HEADING,
    heroSubtext:
      (raw.heroSubtext || '').trim() ||
      ((profile.tagline || '').trim() && profile.tagline.trim() !== BODHI_TREE_TAGLINE
        ? profile.tagline.trim()
        : '') ||
      BODHI_TREE_HERO_SUBTEXT,
    heroDesktopUrl,
    heroMobileUrl,
    aboutHeading: (raw.aboutHeading || '').trim() || 'A Calm Corner in the Pink City',
    aboutStory,
    aboutImageUrl,
    aboutImage2Url,
    palaceHeading: (raw.palaceHeading || '').trim() || 'The Jaipur Palace Collection',
    palaceSubtext:
      (raw.palaceSubtext || '').trim() ||
      'Seven special treatments, one for each famous place in Jaipur. Pick your favourite palace — we will do the rest.',
    contactImageUrl,
    publicEmail: (raw.publicEmail || '').trim() || BODHI_TREE_DEFAULT_EMAIL,
    workingHoursDisplay: (raw.workingHoursDisplay || '').trim() || BODHI_TREE_DEFAULT_HOURS,
    mapEmbedUrl: (raw.mapEmbedUrl || '').trim(),
    colors,
    stats,
    palaceCollection,
    branches,
    faqs,
    reviews,
  };
}

export function bodhiTreeCssVariables(colors: BodhiTreeThemeColors): Record<string, string> {
  return {
    '--bt-cream': colors.bgCream,
    '--bt-sage-soft': colors.bgSage,
    '--bt-forest': colors.forest,
    '--bt-sage': colors.sage,
    '--bt-gold': colors.gold,
    '--bt-sandstone': colors.sandstone,
    '--bt-muted': colors.textMuted,
  };
}

export function buildBodhiTreeSeo(
  profile: SalonProfile,
  config: ResolvedBodhiTreeConfig,
  siteUrl = 'https://bodhitree.example',
) {
  const brand = (profile.businessName || '').trim() || BODHI_TREE_BRAND_NAME;
  const city = (profile.city || '').trim() || BODHI_TREE_DEFAULT_CITY;
  const address = (profile.address || '').trim() || `${BODHI_TREE_DEFAULT_ADDRESS}, ${BODHI_TREE_DEFAULT_CITY}`;
  const phone = (profile.phone || profile.whatsapp || '').trim() || BODHI_TREE_DEFAULT_PHONE;

  const title =
    (profile.seo?.metaTitle || '').trim() ||
    `${brand} | Massage, Spa & Wellness in Jaipur`;
  const description =
    (profile.seo?.metaDescription || '').trim() ||
    (brand === BODHI_TREE_BRAND_NAME
      ? 'Massage, spa and Ayurvedic wellness in Jaipur — C-Scheme, Malviya Nagar, Vaishali Nagar and Bani Park. Abhyanga, Shirodhara, deep tissue and the Jaipur Palace Collection. Prices in INR (₹). Open 9:00 AM - 9:00 PM.'
      : `Massage and wellness at ${brand} in ${city}. Book online — prices in INR (₹).`);
  const ogImage = (profile.seo?.ogImageUrl || '').trim() || BODHI_TREE_IMAGES.ogImage;

  const localBusinessSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': ['DaySpa', 'HealthAndBeautyBusiness'],
    name: brand,
    description,
    image: ogImage,
    logo: (profile.logoUrl || '').trim() || BODHI_TREE_IMAGES.logoPng,
    url: siteUrl,
    telephone: phone,
    email: config.publicEmail,
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: city,
      postalCode: (profile.postalCode || '').trim() || BODHI_TREE_DEFAULT_POSTAL_CODE,
      addressCountry: 'IN',
    },
    openingHours: ['Mo-Su 09:00-21:00'],
  };

  return {
    title,
    description,
    ogImage,
    jsonLd: [localBusinessSchema],
  };
}
