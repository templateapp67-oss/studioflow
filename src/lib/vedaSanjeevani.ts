/**
 * Template 14 — Veda Sanjeevani Ayurvedic Wellness & Spa (`ayurvedic_spa`).
 *
 * Single source of truth for the template's brand, imagery, service catalogue,
 * curated content, design presets, image prompts and SEO copy. Owner edits live
 * on the platform records (`SalonProfile`, `SalonService[]`, `Stylist[]`) and in
 * `profile.veda` (see `vedaSanjeevaniCustomizer.ts`); this module only supplies
 * defaults + pure helpers, so it is safe to render on the server (SSR/test) too.
 *
 * Ayurveda claims are intentionally soft: the copy says what a ritual *is* and
 * what guests report, never a cure, a guaranteed outcome or a medical promise.
 */
import type { SalonProfile, SalonService, Stylist } from '../types';

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

export const VEDA_BRAND_NAME = 'Veda Sanjeevani';
export const VEDA_FULL_NAME = 'Veda Sanjeevani Ayurvedic Wellness & Spa';
export const VEDA_TAGLINE = 'Ayurveda, unhurried.';
export const VEDA_DEFAULT_CITY = 'Kota, Rajasthan';
export const VEDA_DEFAULT_ADDRESS = '12, Civil Lines, Near Talwandi Circle, Kota, Rajasthan 324005';
export const VEDA_DEFAULT_PHONE = '+91 98290 44117';
export const VEDA_DEFAULT_PHONE_TEL = '+919829044117';
export const VEDA_DEFAULT_EMAIL = 'care@vedasanjeevani.in';
export const VEDA_DEFAULT_INSTAGRAM = '@vedasanjeevani.kota';
export const VEDA_MAP_EMBED =
  'https://www.openstreetmap.org/export/embed.html?bbox=75.815%2C25.145%2C75.865%2C25.180&layer=mapnik&marker=25.1625%2C75.8400';
export const VEDA_MAP_LINK = 'https://www.openstreetmap.org/?mlat=25.1625&mlon=75.8400#map=15/25.1625/75.8400';

export const VEDA_BUSINESS_TYPE = 'ayurvedic_spa' as const;
/** Aliases accepted by `?template=` (`14`, `veda`, `ayurveda`, …). */
export const VEDA_TEMPLATE_ALIASES = [
  'ayurvedic_spa',
  'ayurvedic-spa',
  'ayurveda',
  'veda',
  'veda-sanjeevani',
  'vedasanjeevani',
  'wellness-spa',
  'panchakarma',
  '14',
  'template-14',
  'template14',
  'spa',
] as const;

export const VEDA_SERVICE_CATEGORIES = [
  'Ayurvedic Massage & Body Therapies',
  'Head, Mind & Relaxation',
  'Luxury Spa Experiences',
  'Consultation & Herbal Care',
] as const;
export type VedaServiceCategory = (typeof VEDA_SERVICE_CATEGORIES)[number];

/* ------------------------------------------------------------------ *
 * Imagery — committed local WebP set (public/templates/14)
 * ------------------------------------------------------------------ */

type ImageSlot = { widths: number[]; ratio: string; alt: string };

export const VEDA_IMAGE_SLOTS: Record<string, ImageSlot> = {
  hero: { widths: [800, 1200, 1600], ratio: '16/9', alt: 'Warm herbal oil being poured in a luxury Ayurvedic treatment room' },
  sanctuary: { widths: [480, 960, 1600], ratio: '16/9', alt: 'Ivory and forest-green Ayurvedic spa sanctuary interior' },
  shirodhara: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Shirodhara warm oil stream therapy' },
  abhyanga: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Abhyanga warm herbal oil massage on a carved teak table' },
  potli: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Warm herbal potli poultice therapy' },
  reflexology: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Ayurvedic foot reflexology ritual' },
  steam: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Herbal steam therapy room with eucalyptus and brass vessels' },
  herbs: { widths: [480, 800], ratio: '1/1', alt: 'Turmeric, brahmi, rose and brass bowls of Ayurvedic ingredients' },
  'oil-ritual': { widths: [480, 800, 1200], ratio: '4/3', alt: 'Warm herbal oil being prepared for a ritual' },
  'therapist-ananya': { widths: [400, 800], ratio: '3/4', alt: 'Vaidya Ananya Sharma, Ayurvedic physician' },
  'therapist-meera': { widths: [400, 800], ratio: '3/4', alt: 'Meera Pillai, senior Ayurvedic therapist' },
  'therapist-rahul': { widths: [400, 800], ratio: '3/4', alt: 'Rahul Nair, Panchakarma specialist' },
  ritual: { widths: [480, 900], ratio: '4/5', alt: 'Herbal ritual preparation with flowers and oils' },
  'ritual-hero': { widths: [480, 900], ratio: '4/5', alt: 'Ayurvedic ritual detail with brass and marigold' },
  'ayurveda-wide': { widths: [800], ratio: '16/9', alt: 'Ayurvedic spa treatment in warm natural light' },
  ingredients: { widths: [480, 800], ratio: '1/1', alt: 'Ayurvedic herbs and oils styled on ivory stone' },
  'sanctuary-alt': { widths: [640, 1264], ratio: '3/2', alt: 'Quiet corner of the Veda Sanjeevani sanctuary' },
  /* Ritual-specific photography: one slot per treatment so no two therapies
     share a photograph. */
  kizhi: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Kizhi herbal leaf poultices warmed on a teak tray with a brass bowl of oil' },
  udvartana: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Udvartana herbal powder body scrub applied in upward strokes' },
  pizhichil: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Pizhichil warm oil bath poured by two therapists on a carved teak droni' },
  'head-massage': { widths: [480, 800, 1200], ratio: '4/3', alt: 'Champi Ayurvedic head massage with warm brahmi oil' },
  consultation: { widths: [480, 800, 1200], ratio: '4/3', alt: 'Panchakarma consultation: an Ayurvedic physician reading the pulse at a teak table' },
  'couple-suite': { widths: [480, 800, 1200], ratio: '4/3', alt: 'Private couple treatment suite with two carved teak tables and brass lamps' },
  'treatment-room': { widths: [480, 800, 1200], ratio: '4/3', alt: 'Ayurvedic treatment room with a hanging brass dhara vessel and jaali light' },
  'gift-voucher': { widths: [480, 800, 1200], ratio: '4/3', alt: 'Ivory Ayurvedic gift voucher tied with forest-green ribbon and a brass seal' },
  'promo-banner': { widths: [640, 960, 1600], ratio: '16/9', alt: 'Brass bowl of warm herbal oil and folded sage linen on an ivory stone table' },
};

const imagePath = (slot: string, width: number) => `/templates/14/${slot}-${width}.webp`;

/** Largest committed width for a slot — use as the plain `<img src>`. */
export function vedaImage(slot: string): string {
  if (slot === 'logo') return '/templates/14/logo.svg';
  const widths = VEDA_IMAGE_SLOTS[slot]?.widths;
  if (!widths?.length) return imagePath(slot, 800);
  return imagePath(slot, widths[widths.length - 1]);
}

/** Real `srcset` built from the committed widths of a slot. */
export function vedaSrcSet(slot: string): string {
  const widths = VEDA_IMAGE_SLOTS[slot]?.widths || [800];
  return widths.map((width) => `${imagePath(slot, width)} ${width}w`).join(', ');
}

/** Width / height for a slot at its largest committed size (prevents layout shift). */
export function vedaIntrinsic(slot: string): { width: number; height: number } {
  const meta = VEDA_IMAGE_SLOTS[slot] || { widths: [800], ratio: '4/3', alt: '' };
  const width = meta.widths[meta.widths.length - 1];
  const [w, h] = meta.ratio.split('/').map(Number);
  return { width, height: Math.round((width * h) / w) };
}

export const VEDA_IMAGES = {
  hero: vedaImage('hero'),
  sanctuary: vedaImage('sanctuary'),
  shirodhara: vedaImage('shirodhara'),
  abhyanga: vedaImage('abhyanga'),
  potli: vedaImage('potli'),
  reflexology: vedaImage('reflexology'),
  steam: vedaImage('steam'),
  herbs: vedaImage('herbs'),
  oilRitual: vedaImage('oil-ritual'),
  ritual: vedaImage('ritual'),
  ritualHero: vedaImage('ritual-hero'),
  ayurvedaWide: vedaImage('ayurveda-wide'),
  ingredients: vedaImage('ingredients'),
  sanctuaryAlt: vedaImage('sanctuary-alt'),
  kizhi: vedaImage('kizhi'),
  udvartana: vedaImage('udvartana'),
  pizhichil: vedaImage('pizhichil'),
  headMassage: vedaImage('head-massage'),
  consultation: vedaImage('consultation'),
  coupleSuite: vedaImage('couple-suite'),
  treatmentRoom: vedaImage('treatment-room'),
  giftVoucher: vedaImage('gift-voucher'),
  promoBanner: vedaImage('promo-banner'),
} as const;

/** Bundled assets always resolve, even when an owner forgets to upload a photo. */
export function isBundledVedaAsset(url?: string | null): boolean {
  return Boolean(url && /^\/templates\/14\/[\w-]+\.(webp|jpg|svg)$/i.test(url));
}

/* ------------------------------------------------------------------ *
 * Service catalogue (₹ prices, editable)
 * ------------------------------------------------------------------ */

const svc = (
  id: string,
  name: string,
  category: VedaServiceCategory,
  durationMinutes: number,
  price: number,
  description: string,
  icon: string,
  imageSlot: string,
  popular = false,
  benefits: string[] = [],
): SalonService & { benefits: string[] } => ({
  id,
  name,
  category,
  durationMinutes,
  price,
  description,
  icon,
  imageUrl: vedaImage(imageSlot),
  popular,
  benefits,
  origin: 'template',
});

export type VedaService = SalonService & { benefits?: string[] };

export const VEDA_SERVICES: VedaService[] = [
  /* Ayurvedic massage & body therapies */
  svc(
    'veda-1',
    'Abhyanga Full-Body Ayurvedic Massage',
    'Ayurvedic Massage & Body Therapies',
    60,
    2400,
    'A slow, rhythmical full-body massage with warm Dhanwantharam oil, worked along the body’s natural lines. Two therapists can be requested for the traditional four-hand rhythm.',
    'self_improvement',
    'abhyanga',
    true,
    ['Warm oil chosen for your dosha', 'Unhurried, full-body sequence', 'Finishes with a warm towel and herbal tea'],
  ),
  svc(
    'veda-2',
    'Shirodhara Warm Oil Stream',
    'Ayurvedic Massage & Body Therapies',
    60,
    2900,
    'A continuous thread of warm herbal oil is poured across the forehead while you rest. Guests most often describe it as the deepest quiet of the entire visit.',
    'water_drop',
    'shirodhara',
    true,
    ['Continuous warm oil stream', 'Head, neck and shoulder comfort work', 'Silent rest afterwards'],
  ),
  svc(
    'veda-3',
    'Udvartana Herbal Body Scrub',
    'Ayurvedic Massage & Body Therapies',
    50,
    2100,
    'A dry herbal powder massage using chickpea, triphala and neem, worked upwards with firm strokes and finished with a warm shower.',
    'spa',
    'udvartana',
    false,
    ['Herbal powder blend mixed fresh', 'Firm upward strokes', 'Warm shower and light oil finish'],
  ),
  svc(
    'veda-4',
    'Herbal Potli Massage (Kizhi)',
    'Ayurvedic Massage & Body Therapies',
    55,
    2600,
    'Warm linen boluses of medicinal leaves and rice are pressed and rolled over tired shoulders and lower back, then the oil is left to settle.',
    'eco',
    'kizhi',
    false,
    ['Leaf-and-rice poultices warmed to order', 'Focus on shoulders, back and knees', 'Finishes with dry towel warmth'],
  ),
  svc(
    'veda-5',
    'Pizhichil Warm Oil Bath',
    'Ayurvedic Massage & Body Therapies',
    75,
    3400,
    'A traditional Kerala ritual: streams of warm medicated oil are squeezed over the body by two therapists on a carved wood droni.',
    'water',
    'pizhichil',
    true,
    ['Two-therapist ritual', 'Generous medicated oil', 'Warm rest under a linen sheet'],
  ),
  svc(
    'veda-6',
    'Njavarakizhi Rice Bolus Therapy',
    'Ayurvedic Massage & Body Therapies',
    60,
    2800,
    'Njavara rice cooked in herbal milk is tied into cloth boluses and applied in gentle, even strokes — a favourite after long travel or desk weeks.',
    'grain',
    'kizhi',
    false,
    ['Njavara rice and herbal milk', 'Gentle, even strokes', 'Warm oil finish'],
  ),
  svc(
    'veda-7',
    'Elakizhi Leaf Poultice for Stiff Joints',
    'Ayurvedic Massage & Body Therapies',
    60,
    2700,
    'Herbal leaves fried in castor oil are packed into warm boluses and worked over stiff knees, shoulders and back.',
    'local_florist',
    'potli',
    false,
    ['Warm leaf poultices', 'Focused joint-friendly sequence', 'Followed by herbal steam on request'],
  ),
  svc(
    'veda-8',
    'Panchakarma Consultation & Plan',
    'Consultation & Herbal Care',
    45,
    1500,
    'A one-to-one session with our Ayurvedic physician: pulse reading, routine and digestion review, and a written plan. Therapy sessions are quoted separately and only offered where appropriate.',
    'clinical_notes',
    'consultation',
    true,
    ['Nadi pariksha (pulse reading)', 'Written routine and food notes', 'Clear pricing before any therapy'],
  ),

  /* Head, mind & relaxation */
  svc(
    'veda-9',
    'Champi Ayurvedic Head Massage',
    'Head, Mind & Relaxation',
    30,
    1200,
    'A seated head, neck and shoulder massage with warm brahmi oil — easy to slot into a working day.',
    'psychology',
    'head-massage',
    false,
    ['Warm brahmi oil', 'Neck and shoulder release', 'No oil on the face'],
  ),
  svc(
    'veda-10',
    'Shiro Abhyanga Head & Shoulder Ritual',
    'Head, Mind & Relaxation',
    45,
    1800,
    'A longer head ritual: warm oil worked into the scalp, temples and shoulders, finished with a warm towel wrap and quiet rest.',
    'face_retouching_natural',
    'head-massage',
    true,
    ['Scalp, temple and shoulder work', 'Warm towel wrap', 'Ten minutes of silent rest'],
  ),
  svc(
    'veda-11',
    'Stress Relief Wellness Session',
    'Head, Mind & Relaxation',
    50,
    2000,
    'A gentle blend of back massage, foot work and guided breathing, designed for guests who simply feel stretched thin.',
    'spa',
    'reflexology',
    false,
    ['Breathing guidance', 'Back and shoulder work', 'Foot reflexology finish'],
  ),
  svc(
    'veda-12',
    'Foot Reflexology (Padabhyanga)',
    'Head, Mind & Relaxation',
    40,
    1400,
    'Warm herbal oil, a brass bowl and firm thumb work along the soles — a quiet close to a long day.',
    'directions_walk',
    'reflexology',
    false,
    ['Warm oil foot bath', 'Traditional pressure points', 'Finished with a warm towel'],
  ),
  svc(
    'veda-13',
    'Herbal Steam Therapy (Swedana)',
    'Head, Mind & Relaxation',
    25,
    900,
    'A short, warm herbal steam with eucalyptus and tulsi. Usually paired with a massage; available on its own too.',
    'air',
    'steam',
    false,
    ['Eucalyptus and tulsi steam', 'Cool-down area with water', 'Best paired with an oil therapy'],
  ),

  /* Luxury spa experiences */
  svc(
    'veda-14',
    'Couple Ayurvedic Spa Ritual',
    'Luxury Spa Experiences',
    90,
    5900,
    'A private suite for two: synchronised Abhyanga, foot warmth and Shirodhara, with tea afterwards. Ideal for anniversaries and slow Sundays.',
    'favorite',
    'couple-suite',
    true,
    ['Private suite for two', 'Synchronised therapists', 'Herbal tea and fruit afterwards'],
  ),
  svc(
    'veda-15',
    'Signature Relaxation Package',
    'Luxury Spa Experiences',
    120,
    4400,
    'Abhyanga, Shirodhara and a herbal steam in one unhurried sitting — our most requested introduction to the sanctuary.',
    'auto_awesome',
    'ritual',
    true,
    ['Three rituals in one visit', 'Warm oil and steam', 'Tea and rest time included'],
  ),
  svc(
    'veda-16',
    'Full-Body Rejuvenation Experience',
    'Luxury Spa Experiences',
    150,
    6200,
    'Udvartana scrub, Abhyanga and a herbal face ritual, planned with your therapist at the start of the visit.',
    'healing',
    'oil-ritual',
    false,
    ['Scrub, massage and face ritual', 'Therapist-led planning', 'Cold-pressed oil finish'],
  ),
  svc(
    'veda-17',
    'Premium Wellness Retreat Day',
    'Luxury Spa Experiences',
    240,
    9500,
    'A half-day retreat: consultation, two therapies, a light Ayurvedic meal and a garden rest period. Booked in advance.',
    'wb_twilight',
    'treatment-room',
    false,
    ['Physician consultation', 'Two therapies of your choice', 'Light Ayurvedic meal and garden rest'],
  ),

  /* Consultation & herbal care */
  svc(
    'veda-18',
    'Mukha Lepam Herbal Face Ritual',
    'Consultation & Herbal Care',
    50,
    1900,
    'A gentle exfoliation with green gram flour, then a sandalwood and rose paste applied cool. Loved before weddings and shoots.',
    'face',
    'ingredients',
    false,
    ['Green gram exfoliation', 'Sandalwood and rose paste', 'Cool compress finish'],
  ),
  svc(
    'veda-19',
    'Prenatal Wellness Massage (After First Trimester)',
    'Consultation & Herbal Care',
    45,
    2200,
    'Side-lying comfort massage with gentle oils, offered after the first trimester with your doctor’s clearance.',
    'pregnant_woman',
    'ritual-hero',
    false,
    ['Side-lying position only', 'Gentle, unscented options', 'Doctor’s clearance requested'],
  ),
  svc(
    'veda-20',
    'Dosha Discovery Session',
    'Consultation & Herbal Care',
    30,
    900,
    'A short, friendly introduction to your dosha pattern, with simple food and routine suggestions to take home.',
    'explore',
    'herbs',
    false,
    ['Dosha questionnaire and discussion', 'Seasonal routine notes', 'No obligation to book therapy'],
  ),
];

/* ------------------------------------------------------------------ *
 * Therapists (platform stylist records, editable)
 * ------------------------------------------------------------------ */

export const VEDA_THERAPISTS: Stylist[] = [
  {
    id: 'veda-st-1',
    name: 'Vaidya Ananya Sharma',
    role: 'BAMS Ayurvedic Physician',
    avatarUrl: vedaImage('therapist-ananya'),
    specialties: ['Nadi Pariksha', 'Panchakarma planning', 'Dosha balancing'],
    rating: 4.9,
    experienceYears: 14,
    languages: ['Hindi', 'English'],
    qualifications: ['BAMS, Ayurveda Vachaspati'],
    bio: 'Ananya leads consultations at Veda Sanjeevani. She reads the pulse first, then explains every suggestion in plain language before any therapy is booked.',
    status: 'Available',
  },
  {
    id: 'veda-st-2',
    name: 'Meera Pillai',
    role: 'Senior Ayurvedic Therapist',
    avatarUrl: vedaImage('therapist-meera'),
    specialties: ['Shirodhara', 'Abhyanga', 'Herbal potli'],
    rating: 4.9,
    experienceYears: 11,
    languages: ['Hindi', 'English', 'Malayalam'],
    qualifications: ['Ayurvedic Panchakarma Therapist (Kerala)'],
    bio: 'Meera trained in Kerala and has poured more Shirodhara streams than she can count. Guests ask for her by name for the four-hand Abhyanga.',
    status: 'Available',
  },
  {
    id: 'veda-st-3',
    name: 'Rahul Nair',
    role: 'Panchakarma Specialist',
    avatarUrl: vedaImage('therapist-rahul'),
    specialties: ['Pizhichil', 'Udvartana', 'Swedana'],
    rating: 4.8,
    experienceYears: 9,
    languages: ['Hindi', 'English'],
    qualifications: ['Certified Panchakarma Technician'],
    bio: 'Rahul looks after the ritual rooms and the steam suite, and is the person to ask about oil choices for a sensitive skin day.',
    status: 'Available',
  },
];

/* ------------------------------------------------------------------ *
 * Curated content
 * ------------------------------------------------------------------ */

export interface VedaPackage {
  id: string;
  name: string;
  tagline: string;
  price: number;
  originalPrice: number;
  duration: string;
  sessions: string;
  includes: string[];
  imageUrl: string;
  popular: boolean;
}
export interface VedaOffer {
  id: string;
  title: string;
  body: string;
  badge: string;
  code: string;
  validTill: string;
  imageUrl: string;
  voucher: boolean;
}
export interface VedaTestimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  quote: string;
  treatment: string;
  photoUrl: string;
}
export interface VedaFaq { id: string; question: string; answer: string }
export interface VedaSignatureExperience {
  id: string;
  title: string;
  body: string;
  meta: string;
  imageUrl: string;
}
export interface VedaPillar { title: string; body: string }
export interface VedaWhyItem { id: string; title: string; body: string; icon: string }
export interface VedaStat { value: string; label: string }
export interface VedaGalleryImage {
  id: string;
  url: string;
  title: string;
  caption: string;
  /** Optional alt override; falls back to the title. */
  alt?: string;
  /** Hidden photos stay saved but are not published. */
  visible?: boolean;
  /** Gallery grouping shown in the owner dashboard. */
  category?: string;
}

export const VEDA_PACKAGES: VedaPackage[] = [
  {
    id: 'veda-pkg-1',
    name: 'Sanjeevani Reset',
    tagline: 'A gentle first visit, planned with you.',
    price: 4400,
    originalPrice: 5000,
    duration: '2 hours',
    sessions: 'One visit',
    includes: ['Dosha discovery session', 'Abhyanga full-body massage', 'Herbal steam', 'Herbal tea and rest'],
    imageUrl: vedaImage('ritual'),
    popular: true,
  },
  {
    id: 'veda-pkg-2',
    name: 'Shirodhara Sanctuary',
    tagline: 'For the weeks that will not slow down.',
    price: 6900,
    originalPrice: 7800,
    duration: '3 sessions × 60 min',
    sessions: '3 sittings in 3 weeks',
    includes: ['Shirodhara warm oil stream', 'Shiro abhyanga', 'Foot reflexology', 'Home routine notes'],
    imageUrl: vedaImage('shirodhara'),
    popular: false,
  },
  {
    id: 'veda-pkg-3',
    name: 'Couple’s Slow Sunday',
    tagline: 'One suite, two therapists, no clocks.',
    price: 9900,
    originalPrice: 11800,
    duration: '2.5 hours',
    sessions: 'One visit for two guests',
    includes: ['Private couple suite', 'Synchronised Abhyanga', 'Shirodhara for both', 'Tea and fruit platter'],
    imageUrl: vedaImage('couple-suite'),
    popular: true,
  },
  {
    id: 'veda-pkg-4',
    name: 'Panchakarma Preparation',
    tagline: 'A structured start, only where appropriate.',
    price: 12500,
    originalPrice: 14500,
    duration: 'Across 7 days',
    sessions: 'Consultation + 3 therapies',
    includes: ['Physician consultation', 'Written routine and food notes', 'Three therapist-led sessions', 'Review call after two weeks'],
    imageUrl: vedaImage('consultation'),
    popular: false,
  },
];

export const VEDA_OFFERS: VedaOffer[] = [
  {
    id: 'veda-offer-1',
    title: 'First Ritual, 15% Off',
    body: 'A first visit to the sanctuary: 15% off any single therapy, Monday to Thursday before 4 pm. One per guest.',
    badge: 'New guest',
    code: 'VEDA15',
    validTill: '',
    imageUrl: vedaImage('promo-banner'),
    voucher: false,
  },
  {
    id: 'veda-offer-2',
    title: 'Gift an Ayurvedic Ritual',
    body: 'A printed voucher for any therapy or package, valid for a year. We can hand-letter your card and courier it within Kota.',
    badge: 'Gift voucher',
    code: '',
    validTill: '',
    imageUrl: vedaImage('gift-voucher'),
    voucher: true,
  },
  {
    id: 'veda-offer-3',
    title: 'Bring a Companion',
    body: 'Book a two-hour ritual and your companion joins the Couple Suite at 20% off. Weekday bookings only.',
    badge: 'Together',
    code: 'TOGETHER20',
    validTill: '',
    imageUrl: vedaImage('couple-suite'),
    voucher: false,
  },
];

export const VEDA_TESTIMONIALS: VedaTestimonial[] = [
  {
    id: 'veda-t1',
    name: 'Ira Bansal',
    location: 'Talwandi, Kota',
    rating: 5,
    quote: 'I booked the Shirodhara on a whim after a terrible work month and genuinely slept for nine hours that night. The room smelled of warm oil and nothing was rushed.',
    treatment: 'Shirodhara Warm Oil Stream',
    photoUrl: vedaImage('ingredients'),
  },
  {
    id: 'veda-t2',
    name: 'Nikhil Sharma',
    location: 'Civil Lines, Kota',
    rating: 5,
    quote: 'I came in sceptical about the consultation. Ananya explained what she thought was going on, what she would not claim to fix, and what a sensible routine looked like. Rare honesty.',
    treatment: 'Panchakarma Consultation & Plan',
    photoUrl: vedaImage('herbs'),
  },
  {
    id: 'veda-t3',
    name: 'Ritika Jain',
    location: 'Rajeev Gandhi Nagar',
    rating: 5,
    quote: 'The four-hand Abhyanga is the closest thing to a reset button I have found. I have already booked my mother in for the couple suite with me.',
    treatment: 'Abhyanga Full-Body Ayurvedic Massage',
    photoUrl: vedaImage('ritual'),
  },
  {
    id: 'veda-t4',
    name: 'Aarti & Viren',
    location: 'Bundi Road',
    rating: 5,
    quote: 'We took the Slow Sunday package for our anniversary. Tea afterwards in the garden was the part we talked about on the drive home.',
    treatment: 'Couple Ayurvedic Spa Ritual',
    photoUrl: vedaImage('sanctuary-alt'),
  },
  {
    id: 'veda-t5',
    name: 'Shalini Mehta',
    location: 'Kota',
    rating: 4,
    quote: 'Honest pricing, clean rooms and therapists who ask how much pressure you want. I only wish they opened earlier on Saturdays.',
    treatment: 'Udvartana Herbal Body Scrub',
    photoUrl: vedaImage('potli'),
  },
];

export const VEDA_FAQS: VedaFaq[] = [
  {
    id: 'veda-f1',
    question: 'What should I expect on a first visit?',
    answer:
      'Arrive ten minutes early for a short conversation about your routine, sleep and any areas of tightness. Your therapist will explain the ritual and the oil before you begin. Most guests start with the Abhyanga or the Shirodhara.',
  },
  {
    id: 'veda-f2',
    question: 'Do I need to book in advance?',
    answer:
      'Weekday mornings are usually available at a day’s notice. Evenings, weekends and the couple suite book up first — we recommend three to four days ahead, and a week for the Wellness Retreat Day.',
  },
  {
    id: 'veda-f3',
    question: 'Is Panchakarma available to everyone?',
    answer:
      'Panchakarma is a structured programme, not a menu item. Our physician will advise whether it is appropriate for you, and will say so plainly if it is not. Every therapy is quoted before you commit.',
  },
  {
    id: 'veda-f4',
    question: 'What should I wear, and will oil stain my clothes?',
    answer:
      'Come in something you do not mind a little oil on. We provide disposable garments, a robe and a shower afterwards, plus a hair wrap if you have had a head ritual.',
  },
  {
    id: 'veda-f5',
    question: 'Are the oils suitable for sensitive skin?',
    answer:
      'Tell us at booking. We keep unscented and lighter oil options, and we always do a small patch test on the inner arm before a full ritual if your skin has reacted before.',
  },
  {
    id: 'veda-f6',
    question: 'Do you treat medical conditions?',
    answer:
      'No. We offer traditional wellness rituals and lifestyle guidance. We do not diagnose, cure or replace medical care, and we will happily coordinate around advice you already have from your doctor.',
  },
  {
    id: 'veda-f7',
    question: 'What is your cancellation policy?',
    answer:
      'Reschedule or cancel at least six hours before your slot at no charge. Later cancellations, and no-shows for packages or the retreat day, are charged at 50% of the therapy price.',
  },
  {
    id: 'veda-f8',
    question: 'Can I book for someone else, or buy a voucher?',
    answer:
      'Yes. Buy a gift voucher at reception or on WhatsApp, and share the recipient’s name and phone number. Vouchers are valid for a year from purchase and can be used against any ritual or package.',
  },
];

export const VEDA_SIGNATURE: VedaSignatureExperience[] = [
  {
    id: 'veda-sig-1',
    title: 'The Four-Hand Abhyanga',
    body: 'Two therapists, one rhythm. Warm oil is worked in synchronised strokes from shoulders to feet on a hand-carved droni — the ritual our guests return for.',
    meta: '75 minutes · two therapists · warm Dhanwantharam oil',
    imageUrl: vedaImage('abhyanga'),
  },
  {
    id: 'veda-sig-2',
    title: 'The Shirodhara Hour',
    body: 'A brass vessel, a thread of warm oil, and a room kept deliberately quiet. Nothing to do for sixty minutes but let the mind slow down.',
    meta: '60 minutes · brass dhara vessel · silent rest after',
    imageUrl: vedaImage('shirodhara'),
  },
  {
    id: 'veda-sig-3',
    title: 'The Garden Rest',
    body: 'Every ritual at Veda Sanjeevani ends the same way: tea in the tulsi courtyard, a linen throw, and no one hurrying you out of the chair.',
    meta: 'Included with every visit · tulsi courtyard · herbal tea',
    imageUrl: vedaImage('sanctuary'),
  },
];

export const VEDA_PILLARS: VedaPillar[] = [
  { title: 'Listen first', body: 'A short conversation before every ritual. Pressure, temperature and oil are chosen for the day you are having, not a script.' },
  { title: 'Small batches', body: 'Oils are warmed and herb pastes mixed the same morning they are used. Nothing sits on a shelf for months.' },
  { title: 'Quiet rooms', body: 'Four treatment rooms, never more than four guests at a time. No music videos, no phones ringing in the corridor.' },
];

export const VEDA_WHY: VedaWhyItem[] = [
  { id: 'veda-w1', title: 'Physician-led planning', body: 'Consultations are taken by a BAMS-qualified physician, and therapy plans are written down so you know what you are paying for.', icon: 'stethoscope' },
  { id: 'veda-w2', title: 'Kerala-trained therapists', body: 'Our senior therapists trained in Kerala and work with traditional oil sequences rather than generic spa routines.', icon: 'award' },
  { id: 'veda-w3', title: 'Honest pricing', body: 'Prices are published, quoted before the ritual and never changed at the desk. Packages state exactly what is included.', icon: 'receipt' },
  { id: 'veda-w4', title: 'Fresh herbs, warmed oils', body: 'Herb pastes, leaf poultices and oils are prepared in small batches each morning in our own preparation room.', icon: 'leaf' },
  { id: 'veda-w5', title: 'Comfort checks', body: 'Pressure, temperature and scent are checked at the start and midway. If something is not right, we change it.', icon: 'heart' },
  { id: 'veda-w6', title: 'Four rooms only', body: 'A small sanctuary on purpose: unhurried slots, no corridors full of waiting guests.', icon: 'home' },
];

export const VEDA_STATS: VedaStat[] = [
  { value: '11 yrs', label: 'Serving Kota' },
  { value: '9,400+', label: 'Rituals given' },
  { value: '4.9', label: 'Average guest rating' },
  { value: '4', label: 'Treatment rooms' },
];

export const VEDA_GALLERY: VedaGalleryImage[] = [
  { id: 'veda-g1', url: vedaImage('sanctuary'), title: 'The arrival corridor', caption: 'Lime-washed green walls, ivory stone and brass lamps.' },
  { id: 'veda-g2', url: vedaImage('abhyanga'), title: 'Abhyanga room', caption: 'Hand-carved droni, warm Dhanwantharam oil.' },
  { id: 'veda-g3', url: vedaImage('shirodhara'), title: 'Shirodhara suite', caption: 'A brass vessel and a room kept deliberately quiet.' },
  { id: 'veda-g4', url: vedaImage('herbs'), title: 'Preparation room', caption: 'Turmeric, brahmi, rose and chickpea, ground fresh.' },
  { id: 'veda-g5', url: vedaImage('steam'), title: 'Herbal steam suite', caption: 'Eucalyptus and tulsi steam behind carved wood.' },
  { id: 'veda-g6', url: vedaImage('potli'), title: 'Kizhi boluses', caption: 'Leaf and rice poultices warmed to order.' },
  { id: 'veda-g7', url: vedaImage('reflexology'), title: 'Foot ritual corner', caption: 'A brass bowl, warm oil and quiet thumb work.' },
  { id: 'veda-g8', url: vedaImage('couple-suite'), title: 'Couple suite', caption: 'Two dronis, one arched window, no clocks.' },
  { id: 'veda-g9', url: vedaImage('treatment-room'), title: 'The Shirodhara room', caption: 'Brass dhara vessel, jaali light, ivory linen.' },
  { id: 'veda-g10', url: vedaImage('kizhi'), title: 'Kizhi bench', caption: 'Poultices tied in muslin and warmed on teak before every session.' },
  { id: 'veda-g11', url: vedaImage('consultation'), title: 'Consultation room', caption: 'Where every first visit begins — pulse first, plan second.' },
  { id: 'veda-g12', url: vedaImage('ritual'), title: 'Tulsi courtyard', caption: 'Where every ritual ends, with tea.' },
];

export const VEDA_OPENING_HOURS = [
  { label: 'Monday – Friday', value: '9:30 am – 8:00 pm' },
  { label: 'Saturday', value: '9:00 am – 8:30 pm' },
  { label: 'Sunday', value: '10:00 am – 6:00 pm' },
  { label: 'Last ritual', value: 'Booked 90 minutes before closing' },
];

export const VEDA_DISCLAIMER =
  'Veda Sanjeevani offers traditional Ayurvedic wellness rituals and lifestyle guidance. We do not diagnose or treat medical conditions, and our therapies are not a substitute for care from your doctor.';

/* ------------------------------------------------------------------ *
 * Design presets
 * ------------------------------------------------------------------ */

export interface VedaTheme {
  id: string;
  label: string;
  description: string;
  forest: string;
  forestDeep: string;
  ivory: string;
  sand: string;
  sage: string;
  sageSoft: string;
  gold: string;
  goldSoft: string;
  ink: string;
  isDark?: boolean;
}

export const VEDA_THEMES: VedaTheme[] = [
  {
    id: 'sanjeevani',
    label: 'Sanjeevani Forest',
    description: 'Deep forest green, warm ivory, muted sage and antique gold — the house palette.',
    forest: '#1F3B2E',
    forestDeep: '#14251D',
    ivory: '#F7F2E7',
    sand: '#EADFCB',
    sage: '#8FA58E',
    sageSoft: '#DCE4D6',
    gold: '#B08D4F',
    goldSoft: '#E4D2AE',
    ink: '#22251F',
  },
  {
    id: 'chandan',
    label: 'Chandan Ivory',
    description: 'A lighter, sunlit reading: ivory grounds, sand accents, a softer green.',
    forest: '#3A5142',
    forestDeep: '#2A3C31',
    ivory: '#FBF7EF',
    sand: '#EFE3CE',
    sage: '#9CAC97',
    sageSoft: '#E6EBDF',
    gold: '#C09A5B',
    goldSoft: '#EEDCBD',
    ink: '#26271F',
  },
  {
    id: 'neelgiri',
    label: 'Neelgiri Night',
    description: 'An evening version of the sanctuary — deep green, muted gold, calm light.',
    forest: '#16241E',
    forestDeep: '#0D1712',
    ivory: '#E9E4D6',
    sand: '#2C3A32',
    sage: '#7E947F',
    sageSoft: '#26382E',
    gold: '#C7A465',
    goldSoft: '#3D4A3C',
    ink: '#EDE8DA',
    isDark: true,
  },
  {
    id: 'gulab',
    label: 'Gulab Rosewood',
    description: 'Rosewood and clay with ivory — warmer, a little more romantic.',
    forest: '#5A3A32',
    forestDeep: '#3E2822',
    ivory: '#F8F1E9',
    sand: '#EADBD0',
    sage: '#A79B8C',
    sageSoft: '#E8DDD3',
    gold: '#B98B52',
    goldSoft: '#EBD6B8',
    ink: '#2B211D',
  },
];

export interface VedaFontPair {
  id: string;
  label: string;
  description: string;
  heading: string;
  body: string;
  headingStack: string;
  bodyStack: string;
}

export const VEDA_FONT_PAIRS: VedaFontPair[] = [
  {
    id: 'cormorant-manrope',
    label: 'Cormorant + Manrope',
    description: 'High-contrast serif headings with a clean modern sans — the house pairing.',
    heading: 'Cormorant Garamond',
    body: 'Manrope',
    headingStack: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
    bodyStack: 'Manrope, "Hanken Grotesk", system-ui, sans-serif',
  },
  {
    id: 'playfair-inter',
    label: 'Playfair + Inter',
    description: 'Strong editorial headings with a neutral, very readable body.',
    heading: 'Playfair Display',
    body: 'Inter',
    headingStack: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    bodyStack: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'cormorant-grotesk',
    label: 'Cormorant + Hanken',
    description: 'Softer, warmer body text — good for long-form storytelling.',
    heading: 'Cormorant Garamond',
    body: 'Hanken Grotesk',
    headingStack: '"Cormorant Garamond", Georgia, serif',
    bodyStack: '"Hanken Grotesk", system-ui, sans-serif',
  },
  {
    id: 'playfair-manrope',
    label: 'Playfair + Manrope',
    description: 'A crisper, more contemporary luxury voice.',
    heading: 'Playfair Display',
    body: 'Manrope',
    headingStack: '"Playfair Display", Georgia, serif',
    bodyStack: 'Manrope, system-ui, sans-serif',
  },
];

export type VedaButtonStyle = 'pill' | 'square' | 'outline';
export const VEDA_BUTTON_STYLES: Array<{ id: VedaButtonStyle; label: string; hint: string }> = [
  { id: 'pill', label: 'Soft pill', hint: 'Rounded, warm — the default.' },
  { id: 'square', label: 'Tailored square', hint: 'Sharper corners, more architectural.' },
  { id: 'outline', label: 'Fine outline', hint: 'Line-only buttons, very editorial.' },
];

export type VedaLayout = 'cinematic' | 'editorial' | 'minimal';
export const VEDA_LAYOUTS: Array<{ id: VedaLayout; label: string; hint: string }> = [
  { id: 'cinematic', label: 'Cinematic', hint: 'Full-bleed hero image with an overlapping glass card.' },
  { id: 'editorial', label: 'Editorial split', hint: 'Image and headline side by side, magazine style.' },
  { id: 'minimal', label: 'Quiet minimal', hint: 'Centred type over a softly darkened hero image.' },
];

/* ------------------------------------------------------------------ *
 * AI image studio prompts (also used for "Generate website images")
 * ------------------------------------------------------------------ */

export interface VedaImagePrompt {
  id: string;
  label: string;
  section: string;
  ratio: string;
  prompt: string;
}

const promptBase =
  'Create a photorealistic luxury Ayurvedic wellness spa photograph for Veda Sanjeevani. Authentic traditional Ayurvedic setting in an elegant Indian wellness retreat, warm natural lighting, deep forest green and earthy beige interiors, premium teak wood textures, brass vessels, herbal oils, serene atmosphere, cinematic composition, realistic professional photography, high detail, 4K quality, no text, no watermark.';

/**
 * Ready-made prompts for every section and treatment in the catalogue. Each one
 * inherits the brand block above (forest green, ivory, brass, natural light, no
 * text/watermark) and names the aspect ratio the template renders.
 */
export const VEDA_IMAGE_PROMPTS: VedaImagePrompt[] = [
  { id: 'hero', label: 'Hero banner', section: 'Hero', ratio: '16:9', prompt: `${promptBase} Show a treatment room with a carved teak droni, ivory linen and a brass vessel pouring a thin stream of golden oil, morning light through a jaali screen. Landscape 16:9 composition.` },
  { id: 'abhyanga', label: 'Abhyanga massage', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} Show a therapist's hands applying warm herbal oil to a client's forearm, client fully draped in sage linen, no faces visible, tasteful. 4:3 composition.` },
  { id: 'shirodhara', label: 'Shirodhara therapy', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} Show a brass dhara vessel suspended above a guest's forehead with a continuous stream of warm oil, eyes closed, quiet room, candle glow. 4:3 composition.` },
  { id: 'herbal', label: 'Herbal treatment close-up', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} Show leaf and rice poultices tied in muslin being pressed over a draped shoulder, steam and warm oil sheen. 4:3 composition.` },
  { id: 'interior', label: 'Luxury spa interior', section: 'Philosophy / About', ratio: '16:9', prompt: `${promptBase} Show an arched corridor of a heritage Indian spa with ivory stone floors, lime-washed green walls, linen curtains and brass lamps, late afternoon light. 16:9 composition.` },
  { id: 'therapist', label: 'Therapist portrait', section: 'Experts', ratio: '3:4', prompt: `${promptBase} A warm professional portrait of an Indian Ayurvedic therapist in a sage-green linen kurta in a softly lit spa, natural window light, editorial portrait, vertical 3:4 composition.` },
  { id: 'package', label: 'Wellness package vignette', section: 'Packages', ratio: '4:3', prompt: `${promptBase} A styled flat-lay of an Ayurvedic ritual set: brass oil cruet, herbal pouch, folded muslin, rose petals and a linen runner on ivory stone. 4:3 composition.` },
  { id: 'room', label: 'Treatment room', section: 'Gallery', ratio: '4:3', prompt: `${promptBase} A private couple suite with two carved teak tables, sage runners, arched window and soft palm shadows, candles, no people. 4:3 composition.` },
  { id: 'oils', label: 'Herbal oils & ingredients', section: 'Gallery / Offers', ratio: '1:1', prompt: `${promptBase} Amber and clear glass bottles of herbal oil with brass caps beside turmeric, neem and tulsi on textured ivory stone, warm backlight, no labels. Square 1:1 composition.` },
  { id: 'banner', label: 'Promotional banner', section: 'Offers', ratio: '16:9', prompt: `${promptBase} A serene promotional scene with a brass bowl of warm oil, dried herbs and a folded linen throw, generous empty space on the left for offer text, warm cinematic light. 16:9 composition.` },
  { id: 'about', label: 'About & Ayurveda philosophy', section: 'Philosophy / About', ratio: '4:3', prompt: `${promptBase} Show a quiet Ayurvedic preparation table with mortar and pestle, fresh tulsi, turmeric root and a brass oil cruet beside a folded ivory apron, as if a vaidya has just stepped away. 4:3 composition.` },
  { id: 'panchakarma', label: 'Panchakarma consultation', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} A respectful documentary view of an Ayurvedic physician's hands reading a client's pulse across a low teak table with a notebook and brass herb tray; only hands and forearms in focus, faces softly out of frame. 4:3 composition.` },
  { id: 'potli', label: 'Herbal potli massage', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} Warm muslin potli boluses filled with medicinal leaves and rice resting on folded sage linen on a carved teak table with a brass bowl of golden oil and scattered neem leaves, therapist hands lifting one bolus. 4:3 composition.` },
  { id: 'kizhi', label: 'Kizhi therapy', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} Close view of three muslin-tied kizhi leaf poultices warmed on a teak tray with a small brass bowl of oil, fresh tulsi sprigs and steam rising, no people. 4:3 composition.` },
  { id: 'udvartana', label: 'Udvartana body scrub', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} A therapist's hands working warm chickpea and triphala herbal powder in firm upward strokes on a draped forearm, fine powder visible, small brass bowl of powder nearby, no faces. 4:3 composition.` },
  { id: 'pizhichil', label: 'Pizhichil warm oil bath', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} Two therapists in sage-green linen squeezing streams of warm medicated oil from cloth over a guest resting on a carved teak droni, modestly draped, brass lamps and soft steam, warm side light. 4:3 composition.` },
  { id: 'head', label: 'Ayurvedic head massage', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} A champi head massage in progress at a brass bowl, therapist's oiled hands on the scalp, guest seen from behind in a linen wrap, steam from a brass vessel. 4:3 composition.` },
  { id: 'reflexology', label: 'Foot reflexology', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} Warm foot reflexology with a brass bowl of herbal water, oiled thumbs working the sole of a draped foot, folded towels and marigold petals beside it. 4:3 composition.` },
  { id: 'steam', label: 'Herbal steam therapy', section: 'Therapies', ratio: '4:3', prompt: `${promptBase} A herbal steam room interior with eucalyptus and tulsi bundles, brass vessels, warm mist and carved wooden vents, no people. 4:3 composition.` },
  { id: 'couple', label: 'Couple spa suite', section: 'Luxury spa', ratio: '4:3', prompt: `${promptBase} A private couple treatment suite with two carved teak tables side by side, sage runners, brass oil vessels, arched window with palm shadows and candles, no people. 4:3 composition.` },
  { id: 'treatment-room', label: 'Treatment room', section: 'Gallery', ratio: '4:3', prompt: `${promptBase} A single treatment room with a hanging brass dhara vessel above a carved teak droni, olive lime-washed walls, jaali screen light, potted herbs and ivory stone floor. 4:3 composition.` },
  { id: 'gift-card', label: 'Gift card & voucher', section: 'Offers', ratio: '4:3', prompt: `${promptBase} A thick ivory deckled-edge card (completely blank, no printed text) tied with forest-green silk ribbon and a small brass botanical seal, dry rose petals and tulsi on a linen runner. 4:3 composition.` },
  { id: 'testimonial', label: 'Testimonial portrait', section: 'Guest stories', ratio: '1:1', prompt: `${promptBase} A candid, warm square portrait of an Indian spa guest wrapped in a sage linen robe holding a brass cup of herbal tea in a softly lit courtyard, natural light, gentle genuine expression. Square 1:1 composition.` },
  { id: 'gallery', label: 'Sanctuary gallery detail', section: 'Gallery', ratio: '4:3', prompt: `${promptBase} A quiet sanctuary detail: folded ivory linen, a brass tray with oil cruets, a single marigold and soft jaali shadow on ivory stone. 4:3 composition.` },
];

/** Free / paid image-tool destinations shown in the AI Image Studio. */
export const VEDA_IMAGE_TOOLS: Array<{ id: string; label: string; url: string; note: string; paid: boolean }> = [
  { id: 'chatgpt', label: 'ChatGPT image generation', url: 'https://chatgpt.com/', note: 'Paste the copied prompt into a new chat. Free and paid plans both work; image limits depend on your plan.', paid: false },
  { id: 'gemini', label: 'Google Gemini', url: 'https://gemini.google.com/', note: 'Paste the prompt and ask for an image. Availability depends on your Google plan and region.', paid: false },
  { id: 'bing', label: 'Microsoft Designer', url: 'https://designer.microsoft.com/image-creator', note: 'Free image creation with a Microsoft account; daily boosts are limited.', paid: false },
  { id: 'canva', label: 'Canva Magic Media', url: 'https://www.canva.com/ai-image-generator/', note: 'Free credits every month, then a paid plan. Good for adding text to a banner.', paid: true },
];

/* ------------------------------------------------------------------ *
 * Config shape (persisted on profile.veda)
 * ------------------------------------------------------------------ */

export const VEDA_SECTION_IDS = [
  'announcement',
  'hero',
  'philosophy',
  'therapies',
  'signature',
  'why',
  'experts',
  'gallery',
  'packages',
  'offers',
  'testimonials',
  'faq',
  'contact',
] as const;
export type VedaSectionId = (typeof VEDA_SECTION_IDS)[number];

export const VEDA_SECTION_LABELS: Record<VedaSectionId, string> = {
  announcement: 'Announcement bar',
  hero: 'Hero',
  philosophy: 'Our philosophy',
  therapies: 'Featured therapies',
  signature: 'Signature experiences',
  why: 'Why choose us',
  experts: 'Our Ayurvedic experts',
  gallery: 'Gallery',
  packages: 'Wellness packages',
  offers: 'Offers & gift vouchers',
  testimonials: 'Guest stories',
  faq: 'Questions',
  contact: 'Visit us',
};

export interface VedaHeading { eyebrow: string; title: string; body: string }

export interface VedaConfig {
  schemaVersion: number;
  theme: string;
  fontPair: string;
  buttonStyle: VedaButtonStyle;
  layout: VedaLayout;
  announcement: { enabled: boolean; text: string; linkLabel: string };
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    image: string;
    caption: string;
    stats: VedaStat[];
  };
  philosophy: VedaHeading & { image: string; quote: string; signature: string; pillars: VedaPillar[] };
  therapies: VedaHeading;
  signature: VedaHeading & { items: VedaSignatureExperience[] };
  why: VedaHeading & { items: VedaWhyItem[] };
  experts: VedaHeading;
  gallery: VedaHeading & { images: VedaGalleryImage[] };
  packages: VedaHeading & { items: VedaPackage[] };
  offers: VedaHeading & { items: VedaOffer[]; voucherNote: string };
  testimonials: VedaHeading & { items: VedaTestimonial[] };
  faq: VedaHeading & { items: VedaFaq[] };
  contact: VedaHeading & { hours: Array<{ label: string; value: string }>; mapEmbedUrl: string; mapLink: string; disclaimer: string };
  seo: { title: string; description: string; keywords: string };
  booking: { note: string; depositNote: string; mode: 'whatsapp' | 'request' | 'both' };
  sections: Record<VedaSectionId, boolean>;
  order: VedaSectionId[];
  ai?: { lastGeneratedAt?: string; generated?: string[] };
}

const allVisited = () =>
  Object.fromEntries(VEDA_SECTION_IDS.map((id) => [id, true])) as Record<VedaSectionId, boolean>;

export function defaultVedaConfig(): VedaConfig {
  return {
    schemaVersion: 1,
    theme: 'sanjeevani',
    fontPair: 'cormorant-manrope',
    buttonStyle: 'pill',
    layout: 'cinematic',
    announcement: {
      enabled: true,
      text: 'Now taking bookings for the new season — first ritual 15% off with code VEDA15',
      linkLabel: 'Reserve a ritual',
    },
    hero: {
      eyebrow: 'Ayurvedic wellness & spa · Kota',
      headline: 'Return to your\nnatural rhythm.',
      description:
        'Warm oils, unhurried hands and rooms that stay quiet. Veda Sanjeevani is a small Ayurvedic sanctuary in Kota where every ritual begins with a conversation, not a menu.',
      primaryCta: 'Book a ritual',
      secondaryCta: 'Explore therapies',
      image: VEDA_IMAGES.hero,
      caption: 'The Shirodhara room, 7:40 am',
      stats: VEDA_STATS,
    },
    philosophy: {
      eyebrow: 'Our philosophy',
      title: 'Ayurveda as care,\nnot as a checklist.',
      body:
        'We keep the sanctuary deliberately small: four rooms, a physician who reads the pulse before she recommends anything, and therapists who ask how much pressure you actually want. The traditions are old; the explanations are plain.',
      image: VEDA_IMAGES.sanctuary,
      quote: '“The first ten minutes are a conversation. Everything after that is yours.”',
      signature: 'Vaidya Ananya Sharma, BAMS',
      pillars: VEDA_PILLARS,
    },
    therapies: {
      eyebrow: 'Featured therapies',
      title: 'Rituals for your\nkind of balance.',
      body:
        'Twenty therapist-led rituals across body, head and mind. Prices are published, durations are honest, and every session can be adjusted on the day.',
    },
    signature: {
      eyebrow: 'Signature experiences',
      title: 'Three things we do\nbetter than anyone in Kota.',
      body: 'Not a longer menu — a deeper one. These are the rituals our guests rebook before they leave.',
      items: VEDA_SIGNATURE,
    },
    why: {
      eyebrow: 'Why Veda Sanjeevani',
      title: 'Small on purpose.',
      body: 'No queues in the corridor, no hard sell at the desk. Just a quiet house of practice that takes its time.',
      items: VEDA_WHY,
    },
    experts: {
      eyebrow: 'Our Ayurvedic experts',
      title: 'The people who\nwill look after you.',
      body: 'A physician, a Kerala-trained senior therapist and a Panchakarma specialist. You can request any of them when you book.',
    },
    gallery: {
      eyebrow: 'The sanctuary',
      title: 'A look inside\nthe house.',
      body: 'Four rooms, a preparation kitchen, a tulsi courtyard and a great deal of ivory linen.',
      images: VEDA_GALLERY,
    },
    packages: {
      eyebrow: 'Wellness packages',
      title: 'Plans, not\nupsells.',
      body: 'Each package states exactly what is included and how long it takes. Everything can be adjusted with your therapist.',
      items: VEDA_PACKAGES,
    },
    offers: {
      eyebrow: 'Offers & gift vouchers',
      title: 'A little something\nfor the first visit.',
      body: 'Offers change with the season. Vouchers never expire before their printed date, and can be used against any ritual.',
      items: VEDA_OFFERS,
      voucherNote: 'Vouchers are hand-written and can be couriered within Kota or collected at reception.',
    },
    testimonials: {
      eyebrow: 'Guest stories',
      title: 'What guests tell us\nafterwards.',
      body: 'Reviews are collected after the visit and published unedited, good and bad.',
      items: VEDA_TESTIMONIALS,
    },
    faq: {
      eyebrow: 'Good to know',
      title: 'Questions guests\nask us most.',
      body: 'If your question is not here, message us on WhatsApp — a person replies, usually within the hour.',
      items: VEDA_FAQS,
    },
    contact: {
      eyebrow: 'Visit us',
      title: 'Civil Lines, Kota.',
      body: 'Parking is available in the courtyard. Please arrive ten minutes before your ritual so the first conversation is not rushed.',
      hours: VEDA_OPENING_HOURS,
      mapEmbedUrl: VEDA_MAP_EMBED,
      mapLink: VEDA_MAP_LINK,
      disclaimer: VEDA_DISCLAIMER,
    },
    seo: {
      title: 'Veda Sanjeevani | Ayurvedic Wellness & Spa in Kota, Rajasthan',
      description:
        'Abhyanga, Shirodhara and Ayurvedic wellness rituals in Civil Lines, Kota. Physician-led consultations, published prices and unhurried rooms. Book on WhatsApp.',
      keywords: 'ayurvedic spa Kota, abhyanga Kota, shirodhara Rajasthan, ayurvedic massage Kota, wellness spa Kota',
    },
    booking: {
      note: 'Tell us the ritual, the day and whether you would like a particular therapist. We confirm on WhatsApp.',
      depositNote: 'Packages and the retreat day hold your slot with a ₹1,000 advance, adjusted in the final bill.',
      mode: 'both',
    },
    sections: allVisited(),
    order: [...VEDA_SECTION_IDS],
  };
}

/* ------------------------------------------------------------------ *
 * Resolution helpers (stored config ⇄ defaults)
 * ------------------------------------------------------------------ */

const str = (value: unknown, fallback: string, max = 2000): string =>
  typeof value === 'string' && value.trim() ? value.slice(0, max) : fallback;

const list = <T,>(value: unknown, fallback: T[], coerce: (item: any, index: number) => T | null): T[] => {
  if (!Array.isArray(value)) return fallback;
  const out = value.map(coerce).filter((item): item is T => item !== null);
  return out.length ? out : fallback;
};

const num = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const safeImage = (value: unknown, fallback: string): string => {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) return fallback;
  if (/^https:\/\//i.test(url) || isBundledVedaAsset(url) || /^data:image\//i.test(url)) return url;
  return fallback;
};

/**
 * Merge a stored (possibly older or partially edited) config over the template
 * defaults. Unknown/invalid values always fall back — the site never renders a
 * blank section because of a bad save.
 */
export function resolveVedaConfig(raw?: Partial<VedaConfig> | null): VedaConfig {
  const base = defaultVedaConfig();
  if (!raw || typeof raw !== 'object') return base;
  const theme = VEDA_THEMES.some((item) => item.id === raw.theme) ? raw.theme! : base.theme;
  const fontPair = VEDA_FONT_PAIRS.some((item) => item.id === raw.fontPair) ? raw.fontPair! : base.fontPair;
  const buttonStyle = VEDA_BUTTON_STYLES.some((item) => item.id === raw.buttonStyle) ? raw.buttonStyle! : base.buttonStyle;
  const layout = VEDA_LAYOUTS.some((item) => item.id === raw.layout) ? raw.layout! : base.layout;
  const heading = (value: any, fallback: VedaHeading): VedaHeading => ({
    eyebrow: str(value?.eyebrow, fallback.eyebrow, 120),
    title: str(value?.title, fallback.title, 200),
    body: str(value?.body, fallback.body, 1200),
  });
  const sectionOrder = Array.isArray(raw.order)
    ? raw.order.filter((id): id is VedaSectionId => (VEDA_SECTION_IDS as readonly string[]).includes(id))
    : base.order;
  const order = [...new Set([...sectionOrder, ...VEDA_SECTION_IDS])];
  const sections = { ...base.sections };
  if (raw.sections && typeof raw.sections === 'object') {
    for (const id of VEDA_SECTION_IDS) {
      if (typeof (raw.sections as any)[id] === 'boolean') sections[id] = (raw.sections as any)[id];
    }
  }
  return {
    schemaVersion: 1,
    theme: theme as string,
    fontPair: fontPair as string,
    buttonStyle: buttonStyle as VedaButtonStyle,
    layout: layout as VedaLayout,
    announcement: {
      enabled: raw.announcement?.enabled !== false,
      text: str(raw.announcement?.text, base.announcement.text, 200),
      linkLabel: str(raw.announcement?.linkLabel, base.announcement.linkLabel, 60),
    },
    hero: {
      eyebrow: str(raw.hero?.eyebrow, base.hero.eyebrow, 120),
      headline: str(raw.hero?.headline, base.hero.headline, 120),
      description: str(raw.hero?.description, base.hero.description, 500),
      primaryCta: str(raw.hero?.primaryCta, base.hero.primaryCta, 40),
      secondaryCta: str(raw.hero?.secondaryCta, base.hero.secondaryCta, 40),
      image: safeImage(raw.hero?.image, base.hero.image),
      caption: str(raw.hero?.caption, base.hero.caption, 120),
      stats: list(raw.hero?.stats, base.hero.stats, (item) =>
        item && typeof item === 'object'
          ? { value: str(item.value, '', 16), label: str(item.label, '', 40) }
          : null,
      ).filter((item) => item.value && item.label),
    },
    philosophy: {
      ...heading(raw.philosophy, base.philosophy),
      image: safeImage(raw.philosophy?.image, base.philosophy.image),
      quote: str(raw.philosophy?.quote, base.philosophy.quote, 300),
      signature: str(raw.philosophy?.signature, base.philosophy.signature, 80),
      pillars: list(raw.philosophy?.pillars, base.philosophy.pillars, (item) =>
        item && typeof item === 'object' ? { title: str(item.title, '', 60), body: str(item.body, '', 300) } : null,
      ).filter((item) => item.title && item.body),
    },
    therapies: heading(raw.therapies, base.therapies),
    signature: {
      ...heading(raw.signature, base.signature),
      items: list(raw.signature?.items, base.signature.items, (item, index) =>
        item && typeof item === 'object'
          ? {
              id: str(item.id, `veda-sig-${index + 1}`, 60),
              title: str(item.title, 'Signature experience', 80),
              body: str(item.body, '', 400),
              meta: str(item.meta, '', 120),
              imageUrl: safeImage(item.imageUrl, base.signature.items[index % base.signature.items.length].imageUrl),
            }
          : null,
      ),
    },
    why: {
      ...heading(raw.why, base.why),
      items: list(raw.why?.items, base.why.items, (item, index) =>
        item && typeof item === 'object'
          ? {
              id: str(item.id, `veda-w${index + 1}`, 60),
              title: str(item.title, 'Why us', 80),
              body: str(item.body, '', 300),
              icon: str(item.icon, 'leaf', 30),
            }
          : null,
      ),
    },
    experts: heading(raw.experts, base.experts),
    gallery: {
      ...heading(raw.gallery, base.gallery),
      images: list(raw.gallery?.images, base.gallery.images, (item, index) =>
        item && typeof item === 'object'
          ? {
              id: str(item.id, `veda-g${index + 1}`, 60),
              url: safeImage(item.url, base.gallery.images[index % base.gallery.images.length].url),
              title: str(item.title, 'The sanctuary', 80),
              caption: str(item.caption, '', 160),
              alt: str(item.alt, '', 160) || undefined,
              visible: item.visible === false ? false : true,
              category: str(item.category, 'The sanctuary', 40),
            }
          : null,
      ),
    },
    packages: {
      ...heading(raw.packages, base.packages),
      items: list(raw.packages?.items, base.packages.items, (item, index) =>
        item && typeof item === 'object'
          ? {
              id: str(item.id, `veda-pkg-${index + 1}`, 60),
              name: str(item.name, 'Wellness package', 80),
              tagline: str(item.tagline, '', 160),
              price: num(item.price, base.packages.items[index % base.packages.items.length].price),
              originalPrice: num(item.originalPrice, 0),
              duration: str(item.duration, '', 60),
              sessions: str(item.sessions, '', 60),
              includes: Array.isArray(item.includes)
                ? item.includes.map((entry: unknown) => str(entry, '', 120)).filter(Boolean).slice(0, 8)
                : [],
              imageUrl: safeImage(item.imageUrl, base.packages.items[index % base.packages.items.length].imageUrl),
              popular: item.popular === true,
            }
          : null,
      ),
    },
    offers: {
      ...heading(raw.offers, base.offers),
      voucherNote: str(raw.offers?.voucherNote, base.offers.voucherNote, 300),
      items: list(raw.offers?.items, base.offers.items, (item, index) =>
        item && typeof item === 'object'
          ? {
              id: str(item.id, `veda-offer-${index + 1}`, 60),
              title: str(item.title, 'Offer', 80),
              body: str(item.body, '', 400),
              badge: str(item.badge, 'Offer', 40),
              code: str(item.code, '', 24),
              validTill: str(item.validTill, '', 40),
              imageUrl: safeImage(item.imageUrl, base.offers.items[index % base.offers.items.length].imageUrl),
              voucher: item.voucher === true,
            }
          : null,
      ),
    },
    testimonials: {
      ...heading(raw.testimonials, base.testimonials),
      items: list(raw.testimonials?.items, base.testimonials.items, (item, index) =>
        item && typeof item === 'object'
          ? {
              id: str(item.id, `veda-t${index + 1}`, 60),
              name: str(item.name, 'Guest', 60),
              location: str(item.location, '', 60),
              rating: Math.min(5, Math.max(1, Math.round(num(item.rating, 5)))),
              quote: str(item.quote, '', 500),
              treatment: str(item.treatment, '', 80),
              photoUrl: safeImage(item.photoUrl, base.testimonials.items[index % base.testimonials.items.length].photoUrl),
            }
          : null,
      ).filter((item) => item.quote),
    },
    faq: {
      ...heading(raw.faq, base.faq),
      items: list(raw.faq?.items, base.faq.items, (item, index) =>
        item && typeof item === 'object'
          ? {
              id: str(item.id, `veda-f${index + 1}`, 60),
              question: str(item.question, '', 160),
              answer: str(item.answer, '', 900),
            }
          : null,
      ).filter((item) => item.question && item.answer),
    },
    contact: {
      ...heading(raw.contact, base.contact),
      hours: list(raw.contact?.hours, base.contact.hours, (item) =>
        item && typeof item === 'object' ? { label: str(item.label, '', 40), value: str(item.value, '', 60) } : null,
      ).filter((item) => item.label && item.value),
      mapEmbedUrl: str(raw.contact?.mapEmbedUrl, base.contact.mapEmbedUrl, 500),
      mapLink: str(raw.contact?.mapLink, base.contact.mapLink, 500),
      disclaimer: str(raw.contact?.disclaimer, base.contact.disclaimer, 500),
    },
    seo: {
      title: str(raw.seo?.title, base.seo.title, 70),
      description: str(raw.seo?.description, base.seo.description, 200),
      keywords: str(raw.seo?.keywords, base.seo.keywords, 300),
    },
    booking: {
      note: str(raw.booking?.note, base.booking.note, 400),
      depositNote: str(raw.booking?.depositNote, base.booking.depositNote, 300),
      mode: raw.booking?.mode === 'whatsapp' || raw.booking?.mode === 'request' ? raw.booking.mode : 'both',
    },
    sections,
    order,
    ai: raw.ai && typeof raw.ai === 'object' ? { lastGeneratedAt: str(raw.ai.lastGeneratedAt, '', 40), generated: Array.isArray(raw.ai.generated) ? raw.ai.generated.map(String).slice(0, 40) : [] } : undefined,
  };
}

/** Theme + font tokens for a config (CSS custom properties are set from this). */
export function vedaThemeTokens(config: VedaConfig): VedaTheme {
  return VEDA_THEMES.find((theme) => theme.id === config.theme) || VEDA_THEMES[0];
}
export function vedaFontTokens(config: VedaConfig): VedaFontPair {
  return VEDA_FONT_PAIRS.find((pair) => pair.id === config.fontPair) || VEDA_FONT_PAIRS[0];
}

/* ------------------------------------------------------------------ *
 * Formatters + derived values
 * ------------------------------------------------------------------ */

export function vedaFormatInr(value: number | null | undefined): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'On request';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function vedaFormatDuration(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(minutes || 0)));
  if (!total) return 'Flexible';
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export function vedaWhatsappLink(phone: string, message: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  const number = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(message.slice(0, 1500))}`;
}

export function vedaTelLink(phone: string): string {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return `tel:${digits || VEDA_DEFAULT_PHONE_TEL}`;
}

export function vedaSeoTitle(profile: SalonProfile, config: VedaConfig): string {
  return (profile.seo?.metaTitle || config.seo.title || `${profile.businessName || VEDA_BRAND_NAME} | Ayurvedic Wellness & Spa`).slice(0, 70);
}
export function vedaSeoDescription(profile: SalonProfile, config: VedaConfig): string {
  return (profile.seo?.metaDescription || config.seo.description).slice(0, 200);
}

/** Group a service list into the four published categories, preserving order. */
export function vedaServiceGroups(services: SalonService[]): Array<{ category: string; services: SalonService[] }> {
  const groups = new Map<string, SalonService[]>();
  for (const service of services) {
    const category = (service.category || 'Featured rituals').trim();
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(service);
  }
  const preferred = VEDA_SERVICE_CATEGORIES as readonly string[];
  return [...groups.entries()]
    .sort((a, b) => {
      const ai = preferred.indexOf(a[0]);
      const bi = preferred.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([category, group]) => ({ category, services: group }));
}

/** Services shown in the featured grid: popular first, then the rest, capped. */
export function vedaFeaturedServices(services: SalonService[], limit = 6): SalonService[] {
  const popular = services.filter((service) => service.popular);
  const rest = services.filter((service) => !service.popular);
  return [...popular, ...rest].slice(0, limit);
}

/** Active booking mode → whether the on-site request form should be offered. */
export function vedaAcceptsRequests(config: VedaConfig): boolean {
  return config.booking.mode !== 'whatsapp';
}
export function vedaShowsWhatsapp(config: VedaConfig): boolean {
  return config.booking.mode !== 'request';
}

/** Sections that will actually render (hidden ones are skipped). */
export function vedaVisibleSections(config: VedaConfig): VedaSectionId[] {
  return config.order.filter((id) => config.sections[id] !== false);
}

/** Profile → full template config. Owner values always win over defaults. */
export function resolveVedaFromProfile(profile: SalonProfile): VedaConfig {
  const config = resolveVedaConfig((profile as SalonProfile & { veda?: Partial<VedaConfig> }).veda);
  if (profile.tagline) {
    // The workspace tagline stays the single editable "one-liner" for SEO/OG.
    config.seo.title = profile.seo?.metaTitle || config.seo.title;
  }
  return config;
}

export default VEDA_SERVICES;
