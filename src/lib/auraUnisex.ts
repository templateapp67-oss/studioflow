import type { SalonProfile, SalonService, Stylist } from '../types';
import { SALON_IMAGES } from '../assets/images';
import { CATEGORY_STANDARDIZED_DATA } from '../templateData';
import type { AccentPaletteKey } from '../themeAccents';

/**
 * Template 03 — Aura Unisex Salon & Wellness Lounge (`businessType: 'unisex_salon'`).
 *
 * Scoped design tokens, inclusive unisex copy, category showcase descriptors,
 * unisex video gallery items, seasonal offer vouchers, responsive WebP
 * photography helpers and service/team matchers used exclusively by Template 03.
 * Nothing in this module modifies any other template.
 */

export const AURA_UNISEX_COLOURS = {
  warmCream: '#FAF8F5',
  warmLinen: '#F5F0E8',
  white: '#FFFFFF',
  charcoal: '#252525',
  charcoalSoft: '#3A3A38',
  sage: '#738B78',
  sageDeep: '#5C7362',
  sageForest: '#465A4C',
  softSage: '#E7EEE7',
  beige: '#F0E6DA',
  beigeDeep: '#E5D8C7',
  gold: '#C5A46D',
  goldSoft: '#F6EFE2',
  muted: '#5E5D58',
  border: '#E4DFD6',
} as const;

export interface AuraImage {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

function img(slot: string, widths: number[], ratio: number, alt: string): AuraImage {
  const largest = widths[widths.length - 1];
  return {
    src: `/templates/aura-unisex/${slot}-${largest}.webp`,
    srcSet: widths.map((width) => `/templates/aura-unisex/${slot}-${width}.webp ${width}w`).join(', '),
    width: largest,
    height: Math.round(largest / ratio),
    alt,
  };
}

/** Every asset is a single standalone photograph — zero collages, zero watermarks. */
export const AURA_UNISEX_IMAGES = {
  heroMain: img(
    'hero-main',
    [480, 720, 1024],
    3 / 4,
    'Male and female stylists welcoming guests inside Aura Unisex Salon & Wellness Lounge',
  ),
  heroMen: img('hero-men', [480, 760], 16 / 10, 'Male client getting a clean scissor haircut at Aura Unisex Salon'),
  heroWomen: img('hero-women', [480, 760], 16 / 10, 'Female client getting a smooth blow-dry and hair styling at Aura Unisex Salon'),
  aboutInterior: img(
    'about-interior',
    [480, 760, 1080],
    4 / 3,
    'Bright sage-green and oak styling stations inside Aura Unisex Salon',
  ),
  aboutWork: img('about-work', [360, 620], 1, 'Hair colourist caring for a client during an ammonia-free colour session'),
  featureMen: img('feature-men', [640, 960], 16 / 10, 'Male client enjoying precision beard styling and hair grooming'),
  featureWomen: img('feature-women', [640, 960], 16 / 10, 'Female client enjoying hair care and glossy styling'),
  wellness: img('wellness', [640, 960, 1280], 4 / 3, 'Calm sage-green wellness and massage room at Aura Unisex Salon'),
  booking: img(
    'booking',
    [800, 1280],
    16 / 9,
    'Male and female clients enjoying haircuts and blow-dry styling together at Aura Unisex Salon',
  ),
  team: [
    img('team-1', [420, 640], 4 / 5, 'Priya Nair, Salon Director & Colorist at Aura Unisex Salon'),
    img('team-2', [420, 640], 4 / 5, 'Arjun Mehra, Senior Styling Director at Aura Unisex Salon'),
    img('team-3', [420, 640], 4 / 5, 'Saniya Sheikh, Skin & Nail Aesthetician at Aura Unisex Salon'),
  ],
  gallery: [
    img('gallery-1', [480, 760], 4 / 5, "Men's precision haircut and nape shaping at Aura Unisex Salon"),
    img('gallery-2', [480, 760], 4 / 5, "Women's layered blowout and glossy styling at Aura Unisex Salon"),
    img('gallery-3', [480, 760], 4 / 5, 'Ammonia-free botanical hair colour session at Aura Unisex Salon'),
    img('gallery-4', [480, 760], 4 / 5, 'Aura Unisex Salon & Wellness Lounge sage-green and oak interior'),
    img('gallery-5', [480, 760], 4 / 5, "Men's beard sculpting and grooming finish at Aura Unisex Salon"),
  ],
  services: {
    haircut: img('service-haircut', [480, 760], 4 / 5, 'Tailored unisex haircut and conditioning finish at Aura Salon'),
    colour: img('service-colour', [480, 760], 4 / 5, 'Ammonia-free hair colour and bond repair care at Aura Salon'),
    beard: img('service-beard', [480, 760], 4 / 5, "Men's haircut, steamed towel and beard styling at Aura Salon"),
    facial: img('service-facial', [480, 760], 4 / 5, 'Organic glow cleanup and skin care mask at Aura Salon'),
    styling: img('service-styling', [480, 760], 4 / 5, "Women's blow-dry styling and beauty care at Aura Salon"),
    pedicure: img('service-pedicure', [480, 760], 4 / 5, 'Deluxe paraffin spa pedicure and foot soak at Aura Salon'),
    hairspa: img('service-hairspa', [480, 760], 4 / 5, 'Botanical hair spa and relaxing head massage at Aura Salon'),
  },
} as const;

export type AuraServiceSlot = keyof typeof AURA_UNISEX_IMAGES.services;

/** Owner-uploaded photography is never replaced by template artwork. */
const TEMPLATE_SEED_IMAGES = new Set<string>(Object.values(SALON_IMAGES).map((value) => String(value)));

const STOCK_UNSPLASH_STYLIST_IDS = new Set(['us-st-1', 'us-st-2', 'us-st-3']);

export function isAuraTemplateSeedImage(url?: string | null): boolean {
  const clean = String(url || '').trim();
  if (!clean) return true;
  return TEMPLATE_SEED_IMAGES.has(clean);
}

const SERVICE_SLOT_RULES: Array<{ slot: AuraServiceSlot; pattern: RegExp }> = [
  { slot: 'beard', pattern: /\b(beard|shav|mustach|men'?s|groom(ing)?)\b/i },
  { slot: 'hairspa', pattern: /\b(hair\s*spa|scalp|massage|spa\s*ritual|head\s*massage|reflexology)\b/i },
  { slot: 'facial', pattern: /\b(facial|skin|clean[-\s]?up|de[-\s]?tan|detan|bleach|acne|polish|peel|pack)\b/i },
  { slot: 'pedicure', pattern: /\b(pedicure|manicure|nail|hands|feet|foot)\b/i },
  { slot: 'styling', pattern: /\b(styl(ing|ed)|blow[-\s]?dry|blowdry|setting|iron|curl|straighten|updo|makeup|mehnd?i|wax|thread|eyebrow)\b/i },
  { slot: 'colour', pattern: /\b(colou?r|colou?red|highlight|balayage|global|root\s*touch|tint|gloss|bond|olaplex)\b/i },
  { slot: 'haircut', pattern: /\b(hair\s*cut|haircut|cut|trim|keratin|smooth|repair|treatment|wash|condition)\b/i },
];

export function auraServiceSlot(service: Pick<SalonService, 'name' | 'category'>): AuraServiceSlot {
  const text = `${service.name || ''} ${service.category || ''}`;
  for (const rule of SERVICE_SLOT_RULES) {
    if (rule.pattern.test(text)) return rule.slot;
  }
  return 'haircut';
}

export function auraServiceImage(service: SalonService): { src: string; srcSet: string; alt: string } {
  const uploaded = String(service.imageUrl || '').trim();
  if (uploaded && !isAuraTemplateSeedImage(uploaded)) {
    return { src: uploaded, srcSet: '', alt: `${service.name} at Aura Unisex Salon` };
  }
  const slot = AURA_UNISEX_IMAGES.services[auraServiceSlot(service)];
  return { src: slot.src, srcSet: slot.srcSet, alt: slot.alt };
}

export function auraTeamImage(stylist: Stylist, index: number): { src: string; srcSet: string; alt: string } {
  const uploaded = String(stylist.avatarUrl || '').trim();
  const isDefaultUnsplash =
    STOCK_UNSPLASH_STYLIST_IDS.has(stylist.id) && /images\.unsplash\.com/i.test(uploaded);
  if (uploaded && !TEMPLATE_SEED_IMAGES.has(uploaded) && !isDefaultUnsplash) {
    return { src: uploaded, srcSet: '', alt: `${stylist.name}, ${stylist.role}` };
  }
  const slotIndex =
    stylist.id === 'us-st-1'
      ? 0
      : stylist.id === 'us-st-2'
        ? 1
        : stylist.id === 'us-st-3'
          ? 2
          : index % AURA_UNISEX_IMAGES.team.length;
  const fallback = AURA_UNISEX_IMAGES.team[slotIndex];
  return {
    src: fallback.src,
    srcSet: fallback.srcSet,
    alt: `${stylist.name || `Expert ${index + 1}`}, ${stylist.role || 'Salon Specialist'}`,
  };
}

/**
 * Ensures stale remote Supabase catalog rows (saved before the full 11-service
 * unisex menu) never overwrite Template 03's complete bundled services or cover
 * image in demo preview. Leaves every other template untouched.
 */
export function upgradeUnisexSalonTemplate<T extends { id: string }>(remote: T, local: Record<string, any>): T {
  if (!remote || remote.id !== 'unisex_salon') return remote;
  const raw = remote as Record<string, any>;
  const hasFullMenu =
    Array.isArray(raw.services) && raw.services.some((service: any) => String(service?.id || '') === 'us-6');
  return {
    ...raw,
    title: local.title || raw.title,
    shortName: local.shortName || raw.shortName,
    tagline: local.tagline || raw.tagline,
    about: local.about || raw.about,
    coverImageUrl: local.coverImageUrl,
    services: hasFullMenu ? raw.services : local.services,
    stylists: Array.isArray(raw.stylists) && raw.stylists.length >= 3 ? raw.stylists : local.stylists,
  } as unknown as T;
}

/* ---------------------------------------------------------------------------
   Service category tabs — only the tabs the salon's real menu supports.
   --------------------------------------------------------------------------- */

export type AuraServiceTab = 'All Services' | 'Hair' | 'Beauty' | "Men's Grooming" | 'Skin Care' | 'Wellness';

export const AURA_SERVICE_TABS: AuraServiceTab[] = [
  'All Services',
  'Hair',
  'Beauty',
  "Men's Grooming",
  'Skin Care',
  'Wellness',
];

const TAB_PATTERNS: Array<{ tab: Exclude<AuraServiceTab, 'All Services'>; pattern: RegExp }> = [
  { tab: "Men's Grooming", pattern: /\b(beard|shav|mustach|men'?s|groom(ing)?)\b/i },
  {
    tab: 'Wellness',
    pattern: /\b(massage|wellness|therapy|relax|aroma|reflexology|shirodhara|body\s*(polish|scrub|wrap)|spa\s*ritual)\b/i,
  },
  { tab: 'Skin Care', pattern: /\b(facial|skin|clean[-\s]?up|de[-\s]?tan|detan|bleach|acne|peel|polish|pack)\b/i },
  { tab: 'Beauty', pattern: /\b(beauty|wax|thread|manicure|pedicure|nail|makeup|make\s*over|mehnd?i|hands|feet)\b/i },
  { tab: 'Hair', pattern: /\b(hair|cut|trim|colou?r|highlight|balayage|keratin|smooth|style|styling|wash|condition|spa|treatment|bond|repair)\b/i },
];

export function auraServiceTab(service: Pick<SalonService, 'name' | 'category'>): Exclude<AuraServiceTab, 'All Services'> {
  const text = `${service.name || ''} ${service.category || ''}`;
  for (const entry of TAB_PATTERNS) {
    if (entry.pattern.test(text)) return entry.tab;
  }
  return 'Hair';
}

/** Tabs that actually have services behind them, always led by "All Services". */
export function auraServiceTabs(services: SalonService[]): AuraServiceTab[] {
  const present = new Set<Exclude<AuraServiceTab, 'All Services'>>();
  for (const service of services) present.add(auraServiceTab(service));
  return AURA_SERVICE_TABS.filter((tab) => tab === 'All Services' || present.has(tab as Exclude<AuraServiceTab, 'All Services'>));
}

export function auraServicesForTab(services: SalonService[], tab: AuraServiceTab): SalonService[] {
  if (tab === 'All Services') return services;
  return services.filter((service) => auraServiceTab(service) === tab);
}

export function auraGenderTab(services: SalonService[], gender: 'men' | 'women'): AuraServiceTab {
  const tabs = auraServiceTabs(services);
  if (gender === 'men') {
    if (tabs.includes("Men's Grooming")) return "Men's Grooming";
    return 'All Services';
  }
  if (tabs.includes('Beauty')) return 'Beauty';
  if (tabs.includes('Hair')) return 'Hair';
  return 'All Services';
}

/* ---------------------------------------------------------------------------
   Salon Categories showcase (visual category pillars for Him, Her & Everyone)
   --------------------------------------------------------------------------- */

export interface AuraCategoryPillar {
  id: string;
  tab: AuraServiceTab;
  audience: string;
  title: string;
  subtitle: string;
  image: AuraImage;
}

export const AURA_CATEGORY_PILLARS: AuraCategoryPillar[] = [
  {
    id: 'cat-hair',
    tab: 'Hair',
    audience: 'Men & Women',
    title: 'Haircuts, Colour & Bond Care',
    subtitle: 'Tailored cuts, blow-dry styling, ammonia-free Inoa colour and Olaplex care.',
    image: AURA_UNISEX_IMAGES.services.haircut,
  },
  {
    id: 'cat-men',
    tab: "Men's Grooming",
    audience: 'For Him',
    title: "Men's Hair & Beard Lounge",
    subtitle: 'Clean scissor cuts, sharp hairline tapers, steamed towels and beard shaping.',
    image: AURA_UNISEX_IMAGES.featureMen,
  },
  {
    id: 'cat-skin',
    tab: 'Skin Care',
    audience: 'Unisex Skin',
    title: 'Organic Cleanups & De-Tan',
    subtitle: 'Gentle fruit scrubs, pore steam and brightening masks for fresh, clear skin.',
    image: AURA_UNISEX_IMAGES.services.facial,
  },
  {
    id: 'cat-beauty',
    tab: 'Beauty',
    audience: 'Hands, Feet & Brows',
    title: 'Beauty, Brows & Spa Pedicure',
    subtitle: 'Warm paraffin pedicures, neat brow threading and everyday grooming essentials.',
    image: AURA_UNISEX_IMAGES.services.pedicure,
  },
  {
    id: 'cat-wellness',
    tab: 'Wellness',
    audience: 'Calm Lounge',
    title: 'Head Massage & Reflexology',
    subtitle: 'Tension-melting head, neck and shoulder massage plus warm foot reflexology.',
    image: AURA_UNISEX_IMAGES.wellness,
  },
];

/* ---------------------------------------------------------------------------
   Why Choose Us — four clear studio commitments
   --------------------------------------------------------------------------- */

export interface AuraWhyPillar {
  number: string;
  title: string;
  description: string;
  tag: string;
}

export const AURA_WHY_CHOOSE_US: AuraWhyPillar[] = [
  {
    number: '01',
    title: 'True Unisex Expertise',
    description:
      'Dedicated stylists trained in both men’s precision haircuts and beard grooming as well as women’s layered cuts, blowouts and colour.',
    tag: 'For Men & Women',
  },
  {
    number: '02',
    title: 'Gentle, Ammonia-Free Care',
    description:
      'We work with L’Oréal Inoa oil-based colour, Olaplex bond repair and organic skin cleanups that feel comfortable on hair and skin.',
    tag: 'Trusted Products',
  },
  {
    number: '03',
    title: 'Spotless Stations & Calm Rooms',
    description:
      'Sanitised tools, fresh towels for every guest and quiet wellness rooms where you can truly unwind between busy workdays.',
    tag: 'High Hygiene',
  },
  {
    number: '04',
    title: 'Upfront ₹ Pricing & Easy Slots',
    description:
      'Every price and timing is shared clearly before your service begins, with instant online booking and zero hidden add-ons.',
    tag: 'Clear Menu',
  },
];

/* ---------------------------------------------------------------------------
   Unisex Video Gallery — curated reference reels for both Men & Women
   --------------------------------------------------------------------------- */

export type AuraVideoFilter = 'All Videos' | "Men's Grooming" | "Women's Styling" | 'Colour & Spa' | 'Skin & Care';

export const AURA_VIDEO_FILTERS: AuraVideoFilter[] = [
  'All Videos',
  "Men's Grooming",
  "Women's Styling",
  'Colour & Spa',
  'Skin & Care',
];

export interface AuraReelItem {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<AuraVideoFilter, 'All Videos'>;
  audience: string;
  duration: string;
  videoId: string;
  embedUrl: string;
  externalUrl: string;
  posterSrc: string;
  posterSrcSet?: string;
  channelLabel: string;
  isDemo: boolean;
}

export const AURA_DEMO_REELS: AuraReelItem[] = [
  {
    id: 'aura-reel-1',
    title: 'Men’s Textured Haircut & Sharp Beard Taper',
    subtitle: 'Scissor-over-comb blending and clean beard jawline detailing.',
    category: "Men's Grooming",
    audience: 'For Him',
    duration: '0:42',
    videoId: 'KqLCuvMVB-k',
    embedUrl: 'https://www.youtube-nocookie.com/embed/KqLCuvMVB-k?autoplay=1&rel=0',
    externalUrl: 'https://www.youtube.com/shorts/KqLCuvMVB-k',
    posterSrc: AURA_UNISEX_IMAGES.featureMen.src,
    posterSrcSet: AURA_UNISEX_IMAGES.featureMen.srcSet,
    channelLabel: 'Hair & Beard Studio Reel',
    isDemo: true,
  },
  {
    id: 'aura-reel-2',
    title: 'Women’s Bouncy Layered Cut & Smooth Blowout',
    subtitle: 'Face-framing movement finished with a glossy round-brush blow dry.',
    category: "Women's Styling",
    audience: 'For Her',
    duration: '0:48',
    videoId: 'Zto1aKO3YLQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/Zto1aKO3YLQ?autoplay=1&rel=0',
    externalUrl: 'https://www.youtube.com/shorts/Zto1aKO3YLQ',
    posterSrc: AURA_UNISEX_IMAGES.heroWomen.src,
    posterSrcSet: AURA_UNISEX_IMAGES.heroWomen.srcSet,
    channelLabel: 'Women’s Hair Styling Reel',
    isDemo: true,
  },
  {
    id: 'aura-reel-3',
    title: 'Ammonia-Free Hair Colour & Mirror Gloss Finish',
    subtitle: 'Rich root-to-tip shine paired with bond-strengthening conditioning.',
    category: 'Colour & Spa',
    audience: 'Unisex Colour',
    duration: '0:39',
    videoId: 'U9moKdpniks',
    embedUrl: 'https://www.youtube-nocookie.com/embed/U9moKdpniks?autoplay=1&rel=0',
    externalUrl: 'https://www.youtube.com/shorts/U9moKdpniks',
    posterSrc: AURA_UNISEX_IMAGES.services.colour.src,
    posterSrcSet: AURA_UNISEX_IMAGES.services.colour.srcSet,
    channelLabel: 'Colour & Shine Care Reel',
    isDemo: true,
  },
  {
    id: 'aura-reel-4',
    title: 'Soothing Facial Massage & Organic Skin Glow',
    subtitle: 'Gentle pressure-point facial care and cooling botanical hydration.',
    category: 'Skin & Care',
    audience: 'Unisex Wellness',
    duration: '0:35',
    videoId: 'hzMSId-sxtY',
    embedUrl: 'https://www.youtube-nocookie.com/embed/hzMSId-sxtY?autoplay=1&rel=0',
    externalUrl: 'https://www.youtube.com/shorts/hzMSId-sxtY',
    posterSrc: AURA_UNISEX_IMAGES.services.facial.src,
    posterSrcSet: AURA_UNISEX_IMAGES.services.facial.srcSet,
    channelLabel: 'Skin & Wellness Reel',
    isDemo: true,
  },
  {
    id: 'aura-reel-5',
    title: 'Botanical Head Wash & Warm Towel Scalp Care',
    subtitle: 'Aromatic steam towel, pressure-point scalp massage and deep conditioning.',
    category: 'Colour & Spa',
    audience: 'Men & Women',
    duration: '0:31',
    videoId: 'pQdxU6K6p8U',
    embedUrl: 'https://www.youtube-nocookie.com/embed/pQdxU6K6p8U?autoplay=1&rel=0',
    externalUrl: 'https://www.youtube.com/shorts/pQdxU6K6p8U',
    posterSrc: AURA_UNISEX_IMAGES.services.hairspa.src,
    posterSrcSet: AURA_UNISEX_IMAGES.services.hairspa.srcSet,
    channelLabel: 'Head Spa & Grooming Reel',
    isDemo: true,
  },
];

/* ---------------------------------------------------------------------------
   Sample Seasonal Promotions & Offer Vouchers (used in demo preview when the
   salon has not yet published custom live offers)
   --------------------------------------------------------------------------- */

export interface AuraOfferItem {
  id: string;
  badge: string;
  audience: string;
  title: string;
  description: string;
  code: string;
  validity: string;
  serviceMatchPattern: RegExp;
  isDemo: boolean;
}

export const AURA_DEMO_OFFERS: AuraOfferItem[] = [
  {
    id: 'aura-offer-1',
    badge: '15% OFF · FIRST VISIT',
    audience: 'Men & Women',
    title: 'Welcome Haircut & Grooming Privilege',
    description:
      'Enjoy 15% savings on Designer Unisex Haircut & Conditioning or Men’s Haircut & Beard Styling on your first Aura visit.',
    code: 'AURA15',
    validity: 'Valid all week · New guests',
    serviceMatchPattern: /haircut/i,
    isDemo: true,
  },
  {
    id: 'aura-offer-2',
    badge: '₹200 SAVINGS · WEEKDAY CALM',
    audience: 'Skin & Hair Spa',
    title: 'Mid-Week Glow Cleanup & Hair Spa Offer',
    description:
      'Book an Express Glow Organic Cleanup or Deep Conditioning Hair Spa between Tuesday and Thursday and save ₹200.',
    code: 'CALMDAY',
    validity: 'Tue – Thu · 10 AM to 5 PM',
    serviceMatchPattern: /cleanup|hair\s*spa/i,
    isDemo: true,
  },
  {
    id: 'aura-offer-3',
    badge: 'COMPLIMENTARY CARE',
    audience: 'Colour & Wellness',
    title: 'Inoa Colour + Conditioning Care Pair',
    description:
      'Book Global Ammonia-Free Inoa Hair Color and receive a soothing Moroccan conditioning finish with your session.',
    code: 'INOACARE',
    validity: 'Limited monthly slots',
    serviceMatchPattern: /inoa|color|colour/i,
    isDemo: true,
  },
];

export interface AuraSampleReward {
  id: string;
  title: string;
  description: string;
  requiredPoints: number;
  category: string;
}

export const AURA_DEMO_REWARDS: AuraSampleReward[] = [
  {
    id: 'aura-rew-1',
    title: '₹100 OFF Any Unisex Haircut or Beard Styling',
    description: 'Redeemable on women’s haircuts, men’s haircut & beard combos or blow-dry styling.',
    requiredPoints: 150,
    category: 'Hair & Grooming',
  },
  {
    id: 'aura-rew-2',
    title: 'Complimentary Express Head & Neck Massage',
    description: 'Enjoy a relaxing 15-minute head and shoulder add-on with any skin cleanup or pedicure.',
    requiredPoints: 350,
    category: 'Skin & Wellness',
  },
  {
    id: 'aura-rew-3',
    title: '₹350 OFF Inoa Colour or Olaplex Bond Care',
    description: 'Instant reward savings on ammonia-free hair colour, bond repair or deep hair spa.',
    requiredPoints: 600,
    category: 'Colour & Care',
  },
];

export const AURA_LOYALTY_TIERS = [
  { name: 'Sage Member', threshold: '0+ pts', perk: 'Earn 10 pts per ₹100 + 50 visit bonus' },
  { name: 'Warm Silver', threshold: '300+ pts', perk: '1.25× points multiplier & priority slots' },
  { name: 'Aura Gold', threshold: '800+ pts', perk: '1.5× points multiplier & birthday care perk' },
] as const;

/* ---------------------------------------------------------------------------
   Salon details — always read from the owner's saved profile first.
   --------------------------------------------------------------------------- */

export const AURA_UNISEX_BRAND = 'Aura Unisex Salon & Wellness Lounge';

export function auraBrand(profile: Pick<SalonProfile, 'businessName'>): string {
  const raw = String(profile.businessName || '').trim();
  if (!raw || /^luxury editorial salon/i.test(raw)) return AURA_UNISEX_BRAND;
  return raw;
}

export function auraCity(profile: Pick<SalonProfile, 'city'>): string {
  return String(profile.city || '').trim() || 'Bengaluru, Karnataka';
}

export function auraAddress(profile: Pick<SalonProfile, 'address' | 'city' | 'postalCode'>): string {
  const street = String(profile.address || '').trim() || 'Outer Ring Road, 4th Block, Koramangala';
  const city = auraCity(profile);
  const pin = String(profile.postalCode || '').trim() || '560095';
  return [street, city, pin].filter(Boolean).join(', ');
}

export function auraMapsUrl(profile: SalonProfile): string {
  if (
    typeof profile.latitude === 'number' &&
    Number.isFinite(profile.latitude) &&
    typeof profile.longitude === 'number' &&
    Number.isFinite(profile.longitude)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`;
  }
  const query = encodeURIComponent(`${auraBrand(profile)}, ${auraAddress(profile)}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function auraWhatsApp(profile: Pick<SalonProfile, 'whatsapp' | 'phone'>): string {
  const raw = String(profile.whatsapp || profile.phone || '+91 98455 33210').replace(/\D/g, '');
  const digits = raw.length === 10 ? `91${raw}` : raw || '919845533210';
  const message = encodeURIComponent('Hi Aura, I would like to book a salon appointment.');
  return `https://wa.me/${digits}?text=${message}`;
}

export function auraPhoneDigits(profile: Pick<SalonProfile, 'phone'>): string {
  return String(profile.phone || '').replace(/[^+0-9]/g, '');
}

export interface AuraHourRow {
  days: string;
  hours: string;
}

export function auraHours(profile: SalonProfile): AuraHourRow[] {
  const standard = CATEGORY_STANDARDIZED_DATA.unisex_salon;
  const fallback = `${standard.openHourText} – ${standard.closeHourText}`;
  const rows: AuraHourRow[] = [
    { days: 'Monday – Saturday', hours: String(profile.workingHoursMonFri || '').trim() || fallback },
  ];
  if (String(profile.workingHoursTue || '').trim()) rows.push({ days: 'Tuesday', hours: String(profile.workingHoursTue).trim() });
  if (String(profile.workingHoursSat || '').trim()) rows.push({ days: 'Saturday', hours: String(profile.workingHoursSat).trim() });
  if (String(profile.workingHoursSun || '').trim()) rows.push({ days: 'Sunday', hours: String(profile.workingHoursSun).trim() });
  else rows.push({ days: 'Sunday', hours: fallback });
  return rows;
}

/* ---------------------------------------------------------------------------
   Branding colours — the owner's website editor choice always wins.
   --------------------------------------------------------------------------- */

export interface AuraAccent {
  primary: string;
  deep: string;
  soft: string;
  onPrimary: string;
}

const AURA_ACCENT_PRESETS: Record<AccentPaletteKey, AuraAccent> = {
  slate: {
    primary: AURA_UNISEX_COLOURS.sage,
    deep: AURA_UNISEX_COLOURS.sageDeep,
    soft: AURA_UNISEX_COLOURS.softSage,
    onPrimary: '#FFFFFF',
  },
  emerald: { primary: '#5C7362', deep: '#465A4C', soft: '#E7EEE7', onPrimary: '#FFFFFF' },
  ocean: { primary: '#5E7F80', deep: '#48666A', soft: '#E6EEEE', onPrimary: '#FFFFFF' },
  rose: { primary: '#8A6A72', deep: '#6F525A', soft: '#F2E9EA', onPrimary: '#FFFFFF' },
  crimson: { primary: '#8F5A5A', deep: '#744646', soft: '#F3E7E5', onPrimary: '#FFFFFF' },
  mahogany: { primary: '#7C6A54', deep: '#63533F', soft: '#F1EADD', onPrimary: '#FFFFFF' },
  purple: { primary: '#6C6A86', deep: '#55536C', soft: '#EAE9F0', onPrimary: '#FFFFFF' },
  obsidian: { primary: '#3C3C39', deep: '#252525', soft: '#E8E6E1', onPrimary: '#FFFFFF' },
};

export function auraAccent(profile: Pick<SalonProfile, 'customAccentColor' | 'themeAccentKey'>): AuraAccent {
  const custom = String(profile.customAccentColor || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(custom)) {
    return { primary: custom, deep: custom, soft: AURA_UNISEX_COLOURS.softSage, onPrimary: '#FFFFFF' };
  }
  const key = (profile.themeAccentKey || 'slate') as AccentPaletteKey;
  return AURA_ACCENT_PRESETS[key] || AURA_ACCENT_PRESETS.slate;
}

export function auraCssVariables(profile: Pick<SalonProfile, 'customAccentColor' | 'themeAccentKey'>): Record<string, string> {
  const accent = auraAccent(profile);
  return {
    '--au-accent': accent.primary,
    '--au-accent-deep': accent.deep,
    '--au-accent-soft': accent.soft,
  };
}

/* ---------------------------------------------------------------------------
   Copy — clear, welcoming, modern unisex salon language
   --------------------------------------------------------------------------- */

export const AURA_UNISEX_COPY = {
  brandSublabel: 'Unisex Salon & Wellness',
  navHome: 'Home',
  navCategories: 'Categories',
  navServices: 'Services',
  navAbout: 'About',
  navTeam: 'Our Team',
  navGallery: 'Gallery',
  navVideos: 'Videos',
  navContact: 'Contact',

  heroEyebrow: 'UNISEX SALON & WELLNESS LOUNGE',
  heroTitle: 'Hair, skin and grooming for everyone.',
  heroText:
    'A friendly salon for men and women, with haircuts, beard care, colour, skin services and relaxing wellness in one place.',
  heroPrimary: 'Book an appointment',
  heroSecondary: 'Explore Services',
  heroPoints: ['Men & Women Specialists', 'Ammonia-Free Colour', 'Clean Wellness Rooms'],
  heroCardMen: 'For Him · Haircut & Beard',
  heroCardWomen: 'For Her · Hair & Skin Care',
  heroCareBoxTitle: 'Inclusive Care for Everyone',
  heroCareBoxText: 'Thoughtful zones for men, women and families.',

  categoriesEyebrow: 'Salon Categories',
  categoriesTitle: 'Explore our salon services',
  categoriesText:
    'Choose a category to find services for men and women. Prices are shown in ₹.',

  servicesEyebrow: 'Salon & Wellness Menu',
  servicesTitle: 'Services for Men & Women',
  servicesText:
    'We’ll check what you need before starting. See each service’s price and time here.',
  bookNow: 'Book Now',

  aboutEyebrow: 'About the Salon',
  aboutTitle: 'A relaxed salon with care for everyone',
  aboutDefault:
    'At Aura, we believe everyone deserves to look sharp and feel relaxed. Whether you are visiting for a tailored haircut, neat beard styling, ammonia-free hair colour or a soothing de-tan cleanup, our friendly team listens first and works with gentle, trusted products in a bright, spotless Koramangala lounge.',
  aboutHighlights: [
    { title: 'Consultation Before Every Cut', text: 'We understand your daily routine, hair texture and comfort first.' },
    { title: 'Gentle Botanical Formulas', text: 'Ammonia-free L’Oréal Inoa colour, Olaplex care and fruit skin cleanups.' },
    { title: 'Calm & Spotless Lounge', text: 'Fresh linen, sanitised tools and unhurried chairs for men and women.' },
  ],
  aboutButton: 'Meet Our Hair Experts',

  whyEyebrow: 'Why Choose Us',
  whyTitle: 'Why Guests Trust Aura Every Month',
  whyText:
    'A friendly unisex salon where you can take your time, ask questions and feel welcome.',

  menTitle: "Men's Grooming Lounge",
  menText: 'Tailored haircuts, clean fades, beard shaping, grey blending and refreshing scalp care.',
  menButton: "Explore Men's Services",
  womenTitle: "Women's Hair & Beauty Studio",
  womenText: 'Layered cuts, smooth blowouts, ammonia-free colour, organic cleanups and brow care.',
  womenButton: "Explore Women's Services",

  wellnessEyebrow: 'Wellness Lounge',
  wellnessTitle: 'Pause, Unwind & Recharge',
  wellnessText:
    'Step into our quiet sage-green wellness room for head, neck and shoulder massage, warm foot reflexology and spa pedicures.',
  wellnessButton: 'View Wellness Services',
  wellnessEmpty: 'Wellness services will appear here as soon as the salon adds them.',

  teamEyebrow: 'Our Hair Experts',
  teamTitle: 'Meet Our Stylists & Specialists',
  teamText: 'Experienced hair stylists, colourists and skin specialists caring for both men and women.',
  teamButton: 'Book with Staff',

  galleryEyebrow: 'Salon Lookbook',
  galleryTitle: 'Inside Aura & Our Recent Work',
  galleryText: 'Separate real-salon frames across men’s grooming, women’s styling, hair colour and our lounge.',

  videosEyebrow: 'Video Gallery',
  videosTitle: 'Watch Salon Styling & Grooming Reels',
  videosText: 'Short unisex salon clips covering men’s haircuts, women’s blowouts, glossy colour and skin care.',

  reviewsEyebrow: 'Customer Reviews',
  reviewsTitle: 'Kind words from our clients',
  reviewsText: 'Honest feedback from guests who visit us for haircuts, colour, cleanups and wellness.',

  packagesEyebrow: 'Value Combos',
  packagesTitle: 'Salon Combo Packages',
  packagesText:
    'Pair two popular treatments in a single visit. Every package keeps the exact rupee price and timing set by the salon.',
  packagesButton: 'Book package',

  promoEyebrow: 'Promotions & Offers',
  promoTitle: 'Seasonal Salon Privileges',
  promoText: 'Copy an offer code or book directly to apply seasonal savings on unisex hair, skin and spa visits.',

  loyaltyEyebrow: 'Loyalty & Rewards',
  loyaltyTitle: 'Aura Wellness Club Rewards',
  loyaltyText:
    'Earn reward points on every haircut, grooming, colour and wellness visit — redeemable across men’s and women’s services.',

  bookingEyebrow: 'RESERVE YOUR CHAIR',
  bookingTitle: 'Plan Your Next Salon Visit in Seconds',
  bookingText:
    'Pick your preferred service, stylist and time window below — or message our reception desk directly on WhatsApp.',
  bookingButton: 'Book Appointment',

  contactEyebrow: 'Contact Details',
  contactTitle: 'Visit Aura Unisex Salon',
  contactText: 'Walk in, call our front desk or message us on WhatsApp — convenient parking is available right outside.',
  directions: 'Get Directions',
  callNow: 'Call the Salon',
  whatsappNow: 'WhatsApp Us',

  footerQuickLinks: 'Quick Links',
  footerServices: 'Popular Services',
  footerContact: 'Contact Us',
  footerFollow: 'Follow Us',
  footerRights: 'All rights reserved.',
  footerLegal: ['Privacy Policy', 'Terms & Conditions', 'Cancellation & Refund Policy'],
} as const;

export function auraAboutText(profile: Pick<SalonProfile, 'about'>): string {
  const raw = String(profile.about || '').trim();
  if (!raw) return AURA_UNISEX_COPY.aboutDefault;
  return raw;
}

export function money(value: number | null | undefined): string {
  const safe = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `₹${safe.toLocaleString('en-IN')}`;
}

export function durationLabel(minutes: number | null | undefined): string {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${Math.round(value)} min`;
}
