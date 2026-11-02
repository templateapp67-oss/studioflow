import type { SalonProfile, SalonService, Stylist } from '../types';

/**
 * Ziya Women’s Hair Studio (`businessType: 'hair_salon'`, Template 01).
 *
 * Scoped design tokens, editorial copy, responsive WebP photography, verified
 * women's haircut video showcase, and helper matchers exclusively for the
 * women's haircut specialist salon template.
 */

export const LUXURY_EDITORIAL_COLOURS = {
  canvas: '#FAF6F1',
  cream: '#F5ECE4',
  sand: '#ECDCD3',
  blush: '#E4C5BE',
  blushSoft: '#F8EEEC',
  espresso: '#2A1E1B',
  charcoal: '#3E2E2A',
  taupe: '#725C56',
  gold: '#C49A5C',
  goldLight: '#d8c5a3',
  goldDeep: '#9A7034',
  terracotta: '#B57B72',
  white: '#FFFFFF',
  success: '#4A6B53',
} as const;

export interface EditorialImage {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

function img(slot: string, widths: number[], ratio: number, alt: string): EditorialImage {
  const largest = widths[widths.length - 1];
  return {
    src: `/templates/luxury-editorial/${slot}-${largest}.webp`,
    srcSet: widths
      .map((width) => `/templates/luxury-editorial/${slot}-${width}.webp ${width}w`)
      .join(', '),
    width: largest,
    height: Math.round(largest / ratio),
    alt,
  };
}

export const LUXURY_EDITORIAL_IMAGES = {
  hero: img(
    'hero',
    [480, 680, 960],
    4 / 5,
    'Young Indian woman smiling in a rose-ivory studio as a female hairstylist refines her layered haircut with precision shears',
  ),
  heroDetail: img(
    'hero-detail',
    [360, 560],
    1,
    'Japanese precision haircutting shears and carbon sectioning comb on warm stone',
  ),
  about: img(
    'about',
    [480, 760, 1040],
    4 / 3,
    'Sunlit Ziya Women’s Hair Studio interior with muted blush chairs, arched gold mirrors and a female hairstylist consulting a client',
  ),
  aboutDetail: img(
    'about-detail',
    [360, 620],
    1,
    'Female hairstylist shaping precision layers on dark glossy hair',
  ),
  booking: img(
    'booking',
    [800, 1200],
    16 / 9,
    'Warm ivory and champagne-gold women’s haircutting station ready for an appointment',
  ),
  services: {
    layer: img('service-layer', [480, 760], 4 / 5, 'Multi-tiered cascading layer haircut on glossy dark hair'),
    butterfly: img('service-butterfly', [480, 760], 4 / 5, 'Voluminous butterfly haircut with airy crown lift and feathered wings'),
    bob: img('service-bob', [480, 760], 4 / 5, 'Sculpted chin-to-collarbone bob haircut accentuating the jawline'),
    uvCut: img('service-uv-cut', [480, 760], 4 / 5, 'Curved U-cut and V-cut back silhouette with healthy polished ends'),
    step: img('service-step', [480, 760], 4 / 5, 'Defined graduated step haircut with structured tiers and bounce'),
    pixie: img('service-pixie', [480, 760], 4 / 5, 'Modern feminine textured pixie haircut with soft crown movement'),
    blunt: img('service-blunt', [480, 760], 4 / 5, 'Crisp one-length blunt haircut with sleek mirror-gloss perimeter'),
    long: img('service-long', [480, 760], 4 / 5, 'Length-preserving long women’s haircut with soft movement'),
    short: img('service-short', [480, 760], 4 / 5, 'Chic above-the-shoulder short women’s haircut'),
    bangs: img('service-bangs', [480, 760], 4 / 5, 'Cheekbone-grazing curtain bangs and soft fringe framing the face'),
    framing: img('service-framing', [480, 760], 4 / 5, 'Contoured face-framing haircut angles tailored to facial features'),
    curly: img('service-curly', [480, 760], 4 / 5, 'Curl-by-curl dry shape haircut on natural Indian curls'),
    consult: img('service-consult', [480, 760], 4 / 5, 'Personalised women’s face-shape and hair-texture consultation at the mirror'),
    styling: img('service-styling', [480, 760], 4 / 5, 'Relaxing hair wash and signature round-brush blowout styling with haircut'),
  },
  team: [
    img('team-1', [420, 680, 960], 3 / 4, 'Ziya Khan — Founder & Master Women’s Haircut Specialist'),
    img('team-2', [420, 680], 3 / 4, 'Meera Nair — Senior Bob, Blunt & Short Haircut Specialist'),
    img('team-3', [420, 680], 3 / 4, 'Kavya Sharma — Butterfly Cut, Layer & Curtain Bangs Specialist'),
    img('team-4', [420, 680], 3 / 4, 'Diya Kulkarni — Curly Haircut & Face-Shape Styling Specialist'),
  ],
  gallery: [
    img('gallery-1', [480, 760], 4 / 5, 'Textured French micro-bob haircut'),
    img('gallery-2', [480, 760], 4 / 5, 'Long cascading multi-layer haircut'),
    img('gallery-3', [480, 760], 4 / 5, 'Feathered butterfly haircut with crown volume'),
    img('gallery-4', [480, 760], 4 / 5, 'Soft wavy modern pixie haircut'),
    img('gallery-5', [480, 760], 4 / 5, 'Cheekbone curtain bangs with sleek long cut'),
    img('gallery-6', [480, 760], 4 / 5, 'Curved U-cut layered back silhouette'),
    img('gallery-7', [480, 760], 4 / 5, 'Defined curl-by-curl women’s curly haircut'),
    img('gallery-8', [480, 760], 4 / 5, 'Jawline blunt bob haircut'),
    img('gallery-9', [480, 760], 4 / 5, 'Graduated step cut and blowout transformation'),
  ],
} as const;

export function luxuryEditorialServiceImage(
  service: Pick<SalonService, 'name' | 'category'> & { imageUrl?: string },
): string {
  const saved = String(service.imageUrl || '').trim();
  if (saved && !saved.includes('service-bridal') && !saved.includes('service-colour') && !saved.includes('service-scalp') && !saved.includes('service-keratin')) {
    return saved;
  }
  const text = `${service.name || ''} ${service.category || ''}`.toLowerCase();
  if (/butterfly/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.butterfly.src;
  if (/pixie/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.pixie.src;
  if (/curtain|bang|fringe/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.bangs.src;
  if (/face[-\s]?fram|contour/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.framing.src;
  if (/curl|wave|coil/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.curly.src;
  if (/blunt|one[-\s]?length|glass/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.blunt.src;
  if (/\bbob\b|lob/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.bob.src;
  if (/\bu\s*cut\b|\bv\s*cut\b|u\s*[&/]\s*v|u-cut|v-cut/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.uvCut.src;
  if (/step/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.step.src;
  if (/short|crop/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.short.src;
  if (/long/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.long.src;
  if (/consult|face[-\s]?shape|assess/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.consult.src;
  if (/wash|styl|blow/.test(text)) return LUXURY_EDITORIAL_IMAGES.services.styling.src;
  return LUXURY_EDITORIAL_IMAGES.services.layer.src;
}

export function luxuryEditorialSrcSet(url: string): string | undefined {
  const match = url.match(/^\/templates\/luxury-editorial\/([a-z0-9-]+)-\d+\.webp$/);
  if (!match) return undefined;
  const slot = match[1];
  const widthsBySlot: Record<string, number[]> = {
    hero: [480, 680, 960],
    'hero-detail': [360, 560],
    about: [480, 760, 1040],
    'about-detail': [360, 620],
    booking: [800, 1200],
    'team-1': [420, 680, 960],
    'team-2': [420, 680],
    'team-3': [420, 680],
    'team-4': [420, 680],
  };
  const widths =
    widthsBySlot[slot] ||
    (slot.startsWith('service-') || slot.startsWith('gallery-') ? [480, 760] : null);
  if (!widths) return undefined;
  return widths
    .map((width) => `/templates/luxury-editorial/${slot}-${width}.webp ${width}w`)
    .join(', ');
}

const LEGACY_MALE_OR_STOCK_AVATARS = [
  '1534528741775',
  '1507003211169',
  '1500648767791',
  '1506794778202',
];

export function luxuryEditorialStylistPhoto(stylist: Pick<Stylist, 'avatarUrl' | 'name'>, index: number): EditorialImage {
  const fallback = LUXURY_EDITORIAL_IMAGES.team[index % LUXURY_EDITORIAL_IMAGES.team.length];
  const custom = String(stylist.avatarUrl || '').trim();
  const isLegacyBad = LEGACY_MALE_OR_STOCK_AVATARS.some((token) => custom.includes(token));
  if (custom && !custom.startsWith('/templates/luxury-editorial/') && !isLegacyBad) {
    return { src: custom, srcSet: '', width: 680, height: 907, alt: stylist.name };
  }
  if (custom.startsWith('/templates/luxury-editorial/team-')) {
    return {
      src: custom,
      srcSet: luxuryEditorialSrcSet(custom) || fallback.srcSet,
      width: fallback.width,
      height: fallback.height,
      alt: stylist.name,
    };
  }
  return { ...fallback, alt: `${stylist.name} — Women’s Haircut Specialist` };
}

export function isLegacyMirakiText(value?: string | null): boolean {
  const clean = String(value || '').trim().toLowerCase();
  return (
    clean === 'miraki atelier' ||
    clean === 'luxury editorial salon' ||
    clean.includes('miraki atelier')
  );
}

export function resolveZiyaStudioName(profile: Pick<SalonProfile, 'businessName'>): string {
  const raw = String(profile.businessName || '').trim();
  if (!raw || isLegacyMirakiText(raw)) return LUXURY_EDITORIAL_COPY.brandName;
  return raw;
}

/** Excludes accidental men's barbering/beard items from this women's haircut template. */
export function isWomensHaircutService(service: Pick<SalonService, 'name' | 'category'>): boolean {
  const text = `${service.name || ''} ${service.category || ''}`.toLowerCase();
  if (/\bbeard\b|\bshav(e|ing)\b|\bmustache\b|\bgroom\s*makeup\b|\bmen'?s\b/.test(text)) {
    return false;
  }
  return true;
}

export interface ZiyaHaircutVideo {
  id: string;
  videoId: string;
  youtubeUrl: string;
  title: string;
  subtitle: string;
  styleCategory: 'Layer & Butterfly' | 'Bob & Blunt' | 'Short & Pixie' | 'Bangs & Framing' | 'Before & After';
  durationLabel: string;
  stylistCredit: string;
  posterUrl: string;
  fallbackPosterUrl: string;
  isOwnerVideo?: boolean;
  previewVideoUrl?: string;
}

/**
 * Every video in Ziya Women's Hair Studio is strictly about women's haircuts:
 * cutting in progress, layer & butterfly transformations, bob & blunt cuts,
 * curtain bangs, face-framing scissor work, and short/curly women's cuts.
 * Verified public & embeddable via YouTube oEmbed; features women only.
 */
export const ZIYA_VIDEO_GALLERY: ZiyaHaircutVideo[] = [
  {
    id: 'ziya-vid-1',
    videoId: 'Zto1aKO3YLQ',
    youtubeUrl: 'https://www.youtube.com/shorts/Zto1aKO3YLQ',
    title: 'Multi-Layer Haircut Transformation',
    subtitle: 'Precision elevation cutting and bouncy cascading layers on long hair',
    styleCategory: 'Layer & Butterfly',
    durationLabel: '0:42 · Layer Cut',
    stylistCredit: 'Bhatia Bijal · Women’s Cut Studio',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.layer.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/Zto1aKO3YLQ/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-2',
    videoId: 'SZvWrR21Tqs',
    youtubeUrl: 'https://www.youtube.com/shorts/SZvWrR21Tqs',
    title: 'Long Butterfly Haircut Step-by-Step',
    subtitle: 'Crown lift sectioning and feathered face-framing wings while keeping length',
    styleCategory: 'Layer & Butterfly',
    durationLabel: '0:55 · Butterfly Cut',
    stylistCredit: 'MyGuiltyCrown · Cut Tutorial',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.butterfly.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/SZvWrR21Tqs/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-3',
    videoId: 'sixEsYNvTmo',
    youtubeUrl: 'https://www.youtube.com/shorts/sixEsYNvTmo',
    title: 'Before & After Chin-Length Bob Cut',
    subtitle: 'Full salon transformation from heavy mid-length ends to a sculpted bob',
    styleCategory: 'Before & After',
    durationLabel: '0:34 · Bob Makeover',
    stylistCredit: 'Madison Sullivan · Salon Cut',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.bob.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/sixEsYNvTmo/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-4',
    videoId: 'X4vi0G8HJ9s',
    youtubeUrl: 'https://www.youtube.com/shorts/X4vi0G8HJ9s',
    title: 'Cheekbone Curtain Bangs Cutting',
    subtitle: 'Triangle fringe parting and soft diagonal slide-cutting around the eyes',
    styleCategory: 'Bangs & Framing',
    durationLabel: '0:38 · Curtain Bangs',
    stylistCredit: 'Ankita Barapatre · Fringe Cut',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.bangs.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/X4vi0G8HJ9s/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-5',
    videoId: 'qNTfVB4Ptcw',
    youtubeUrl: 'https://www.youtube.com/shorts/qNTfVB4Ptcw',
    title: 'Face-Framing Fluffy Layers Technique',
    subtitle: 'Close-up scissor angle control to contour cheekbones and jawline',
    styleCategory: 'Bangs & Framing',
    durationLabel: '0:49 · Face-Framing',
    stylistCredit: 'ProStylistTV · Technique',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.framing.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/qNTfVB4Ptcw/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-6',
    videoId: 'jdB_DQzqRyw',
    youtubeUrl: 'https://www.youtube.com/shorts/jdB_DQzqRyw',
    title: 'Precision Layered Bob in Progress',
    subtitle: 'Graduated back weight removal and soft tucked perimeter shaping',
    styleCategory: 'Bob & Blunt',
    durationLabel: '0:46 · Layered Bob',
    stylistCredit: 'ProStylistTV · Bob Cut',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.short.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/jdB_DQzqRyw/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-7',
    videoId: 'K0x4fZsDGGI',
    youtubeUrl: 'https://www.youtube.com/shorts/K0x4fZsDGGI',
    title: 'Sleek One-Length Blunt Cut Finish',
    subtitle: 'Zero-elevation glass-edge perimeter check and smooth straight finish',
    styleCategory: 'Bob & Blunt',
    durationLabel: '0:31 · Blunt Cut',
    stylistCredit: 'Glam Girl Gabi · Blunt Bob',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.blunt.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/K0x4fZsDGGI/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-8',
    videoId: 'ci5zyGar5cs',
    youtubeUrl: 'https://www.youtube.com/shorts/ci5zyGar5cs',
    title: 'Short Layered Cut & Curtain Fringe',
    subtitle: 'Airy crown texture and effortless movement on above-shoulder hair',
    styleCategory: 'Short & Pixie',
    durationLabel: '0:29 · Short Cut',
    stylistCredit: 'Coach Kimmy · Short Layers',
    posterUrl: LUXURY_EDITORIAL_IMAGES.gallery[0].src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/ci5zyGar5cs/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-9',
    videoId: 'cQbdS1OQkgw',
    youtubeUrl: 'https://www.youtube.com/shorts/cQbdS1OQkgw',
    title: 'Curly Pixie Haircut & Texture Shaping',
    subtitle: 'Tapered nape, sculpted curly crown and soft feminine silhouette',
    styleCategory: 'Short & Pixie',
    durationLabel: '0:44 · Pixie & Curls',
    stylistCredit: 'Kendra Scott · Curl Cut',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.pixie.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/cQbdS1OQkgw/hqdefault.jpg',
  },
  {
    id: 'ziya-vid-10',
    videoId: 'mTSsNFsQ7Po',
    youtubeUrl: 'https://www.youtube.com/shorts/mTSsNFsQ7Po',
    title: 'Long-to-Fresh U-Cut Haircut Makeover',
    subtitle: 'Before-and-after curved U-shape perimeter cut for healthy bounce',
    styleCategory: 'Before & After',
    durationLabel: '0:40 · U-Cut Result',
    stylistCredit: 'Andrea Henty · U-Shape Cut',
    posterUrl: LUXURY_EDITORIAL_IMAGES.services.uvCut.src,
    fallbackPosterUrl: 'https://img.youtube.com/vi/mTSsNFsQ7Po/hqdefault.jpg',
  },
];

export interface ZiyaBeforeAfterPair {
  id: string;
  title: string;
  cutName: string;
  stylistName: string;
  faceShapeNote: string;
  beforeImage: EditorialImage;
  afterImage: EditorialImage;
}

export const ZIYA_BEFORE_AFTER_PAIRS: ZiyaBeforeAfterPair[] = [
  {
    id: 'ba-butterfly',
    title: 'Grown-Out Length to Voluminous Butterfly Cut',
    cutName: 'Butterfly Haircut + Curtain Bangs',
    stylistName: 'Ziya Khan',
    faceShapeNote: 'Oval & Heart Face Mapping · Kept full waist-grazing length while lifting flat roots',
    beforeImage: LUXURY_EDITORIAL_IMAGES.services.long,
    afterImage: LUXURY_EDITORIAL_IMAGES.services.butterfly,
  },
  {
    id: 'ba-bob',
    title: 'Heavy Ends to Sculpted Collarbone Bob',
    cutName: 'Precision Bob Haircut',
    stylistName: 'Meera Nair',
    faceShapeNote: 'Square & Soft-Round Jawline Balance · Removed dry split ends for a crisp silhouette',
    beforeImage: LUXURY_EDITORIAL_IMAGES.services.blunt,
    afterImage: LUXURY_EDITORIAL_IMAGES.services.bob,
  },
];

export interface ZiyaStyleLookMeta {
  styleFilter: 'Long Layers' | 'Butterfly & Step' | 'Bob & Blunt' | 'Short & Pixie' | 'Curtain Bangs & Framing' | 'Curly Cuts';
  faceShape: string;
  cutTag: string;
}

export function matchGalleryStyleMeta(title: string, index: number): ZiyaStyleLookMeta {
  const lower = String(title || '').toLowerCase();
  if (/pixie|micro/.test(lower)) {
    return { styleFilter: 'Short & Pixie', faceShape: 'Heart & Oval Faces', cutTag: 'Pixie & Short Cut' };
  }
  if (/curly|curl/.test(lower)) {
    return { styleFilter: 'Curly Cuts', faceShape: 'All Curl Patterns (2B–3C)', cutTag: 'Dry Curl Cut' };
  }
  if (/butterfly|step/.test(lower)) {
    return { styleFilter: 'Butterfly & Step', faceShape: 'Round, Oval & Diamond', cutTag: 'Butterfly / Step Cut' };
  }
  if (/curtain|bang|fringe|fram/.test(lower)) {
    return { styleFilter: 'Curtain Bangs & Framing', faceShape: 'Long, Forehead-Softening & Square', cutTag: 'Bangs & Face-Framing' };
  }
  if (/bob|blunt|short/.test(lower)) {
    return { styleFilter: 'Bob & Blunt', faceShape: 'Oval, Heart & Delicate Jawlines', cutTag: 'Precision Bob & Blunt' };
  }
  const defaults: ZiyaStyleLookMeta[] = [
    { styleFilter: 'Short & Pixie', faceShape: 'Oval & Heart Faces', cutTag: 'Short Textured Cut' },
    { styleFilter: 'Long Layers', faceShape: 'All Face Shapes', cutTag: 'Multi-Layer Cut' },
    { styleFilter: 'Butterfly & Step', faceShape: 'Round & Oval Faces', cutTag: 'Butterfly Cut' },
    { styleFilter: 'Short & Pixie', faceShape: 'Petite & Heart Faces', cutTag: 'Modern Pixie Cut' },
    { styleFilter: 'Curtain Bangs & Framing', faceShape: 'Square & Oblong Faces', cutTag: 'Curtain Bangs' },
    { styleFilter: 'Long Layers', faceShape: 'Medium to Thick Hair', cutTag: 'U-Cut & V-Cut' },
    { styleFilter: 'Curly Cuts', faceShape: 'Natural Waves & Curls', cutTag: 'Curly Shape Cut' },
    { styleFilter: 'Bob & Blunt', faceShape: 'Sleek Jawline Focus', cutTag: 'Blunt Bob Cut' },
    { styleFilter: 'Butterfly & Step', faceShape: 'High-Volume Bounce', cutTag: 'Graduated Step Cut' },
  ];
  return defaults[index % defaults.length];
}

export const LUXURY_EDITORIAL_SELECTOR_LABEL = 'Ziya Women’s Hair Studio';
export const LUXURY_EDITORIAL_TAGLINE =
  'Professional women’s haircuts designed around your face shape, hair type and personal style.';
export const LUXURY_EDITORIAL_ABOUT =
  'Ziya Women’s Hair Studio is a dedicated women’s haircutting studio built exclusively around precision scissor work, face-shape matching, and modern women’s haircut silhouettes — from cascading layers, butterfly cuts and curtain bangs to sculpted bobs, pixies and curl-by-curl dry cuts.';

const LEGACY_HAIR_SALON_URLS = [
  '1560066984-138dadb4c035',
  '1562322140-8baeececf3df',
  '1522337360788-8b13dee7a37e',
  '1595476108010-b4d1f102b1b1',
  '/templates/luxury-editorial/hero-900.webp',
];

const LEGACY_HAIR_SALON_TAGLINES = [
  'sculpted cuts, mirror-shine keratin & global color artistry.',
  'precision haircraft, architectural styling, and calm luxury — designed around you.',
  'expert women’s haircuts designed to match your face shape, hair type and personal style.',
];

const LEGACY_HAIR_SALON_ABOUTS = [
  'led by international academy educators, our atelier combines structural cutting precision with restorative fiber chemistry.',
  'a serene indian hair atelier dedicated to tailored cuts, dimensional colour, and restorative hair rituals',
];

export function isLegacyHairSalonStockUrl(url?: string | null): boolean {
  const clean = String(url || '').trim();
  if (!clean) return true;
  return LEGACY_HAIR_SALON_URLS.some((token) => clean.includes(token));
}

export function isLegacyHairSalonTagline(text?: string | null): boolean {
  const clean = String(text || '').trim().toLowerCase();
  if (!clean) return true;
  return LEGACY_HAIR_SALON_TAGLINES.some((snippet) => clean.includes(snippet));
}

export function isLegacyHairSalonAbout(text?: string | null): boolean {
  const clean = String(text || '').trim().toLowerCase();
  if (!clean) return true;
  return LEGACY_HAIR_SALON_ABOUTS.some((snippet) => clean.includes(snippet));
}

export function luxuryEditorialBrand(profile: Pick<SalonProfile, 'businessName'>): string {
  return resolveZiyaStudioName(profile);
}

export function luxuryEditorialCity(profile: Pick<SalonProfile, 'city'>): string {
  return String(profile.city || '').trim() || 'Bengaluru, Karnataka';
}

export function luxuryEditorialAddress(profile: Pick<SalonProfile, 'address' | 'city' | 'postalCode'>): string {
  const street = String(profile.address || '').trim() || '100 Feet Road, HAL 2nd Stage, Indiranagar';
  const city = luxuryEditorialCity(profile);
  const pin = String(profile.postalCode || '').trim() || '560038';
  return [street, city, pin].filter(Boolean).join(', ');
}

export function luxuryEditorialMapsUrl(profile: SalonProfile): string {
  if (typeof profile.latitude === 'number' && Number.isFinite(profile.latitude) && typeof profile.longitude === 'number' && Number.isFinite(profile.longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`;
  }
  const query = encodeURIComponent(`${luxuryEditorialBrand(profile)}, ${luxuryEditorialAddress(profile)}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function luxuryEditorialWhatsApp(profile: Pick<SalonProfile, 'whatsapp' | 'phone' | 'businessName'>): string {
  const raw = String(profile.whatsapp || profile.phone || '+91 98450 12890').replace(/\D/g, '');
  const digits = raw.length === 10 ? `91${raw}` : raw || '919845012890';
  const studio = luxuryEditorialBrand(profile);
  const msg = encodeURIComponent(`Hi ${studio}, I would like to book a women’s haircut appointment.`);
  return `https://wa.me/${digits}?text=${msg}`;
}

export function luxuryEditorialHours(profile: SalonProfile): Array<{ days: string; hours: string }> {
  const open = String((profile as unknown as Record<string, unknown>).openTime || '').trim();
  const close = String((profile as unknown as Record<string, unknown>).closeTime || '').trim();
  if (open && close) {
    return [
      { days: 'Tuesday – Sunday', hours: `${open} – ${close}` },
      { days: 'Monday', hours: 'By Prior Appointment' },
    ];
  }
  return [
    { days: 'Tuesday – Friday', hours: '10:00 AM – 8:00 PM' },
    { days: 'Saturday – Sunday', hours: '9:30 AM – 8:30 PM' },
    { days: 'Monday', hours: 'Closed · Studio Training' },
  ];
}

export function luxuryEditorialTeamImage(stylist: Pick<Stylist, 'avatarUrl' | 'name'>, index: number): EditorialImage {
  return luxuryEditorialStylistPhoto(stylist, index);
}

export function luxuryEditorialCssVariables(profile: Pick<SalonProfile, 'customAccentColor'>): Record<string, string> {
  const custom = String(profile.customAccentColor || '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(custom)) {
    return { '--le-owner-accent': custom };
  }
  return {};
}

export const LUXURY_EDITORIAL_COPY = {
  brandName: 'Ziya Women’s Hair Studio',
  brandSublabel: 'Women’s Haircut Specialist Salon',
  heroEyebrow: 'Ziya Women’s Hair Studio · Specialist Cut Atelier',
  heroHeadline: 'Your Hair, Your Style, Your Confidence',
  heroSubheadline:
    'Professional women’s haircuts designed around your face shape, hair type and personal style.',
  heroPrimaryCta: 'Book Your Haircut',
  heroSecondaryCta: 'Explore Haircut Styles',
  heroHighlights: [
    'Face-Shape Matched Cuts',
    '100% Female Hairstylist Team',
    '14 Signature Women’s Haircuts',
  ],
  aboutEyebrow: 'About Ziya Women’s Hair Studio',
  aboutTitle: 'Specialists in Women’s Haircuts',
  aboutQuote:
    'A great women’s haircut should frame your features effortlessly — looking just as graceful on day thirty at home as the moment you step out of our chair.',
  aboutBody:
    'Ziya Women’s Hair Studio is a dedicated women’s haircutting studio built exclusively around the art of precision scissor work. Unlike general parlours, our female haircut specialists focus solely on modern women’s silhouettes — studying your bone structure, natural hair fall, crown growth and daily styling routine before making the first section.',
  aboutBodySecondary:
    'Whether you want airy butterfly layers that keep every inch of length, cheekbone-skimming curtain bangs, a sculpted jawline bob, or a curl-by-curl dry shape cut, every appointment begins with personalised face-shape mapping and finishes with effortless, wearable movement.',
  pillars: [
    {
      number: '01',
      title: 'Face-Shape Mapping',
      detail: 'We analyse cheekbones, jawline balance and forehead proportion to recommend cuts that flatter naturally.',
    },
    {
      number: '02',
      title: 'Hair-Type Precision',
      detail: 'Tailored wet, dry and point-cutting techniques for straight, wavy, thick Indian lengths and natural curls.',
    },
    {
      number: '03',
      title: 'Effortless Grow-Out',
      detail: 'Clean internal weight balance so layers, bobs and bangs hold their shape week after week.',
    },
  ],
  servicesEyebrow: 'Women’s Haircut Services',
  servicesTitle: 'Precision Haircuts Designed Around You',
  servicesIntro:
    'Every haircut at Ziya includes a one-on-one face-shape check, clean sectioning and styling guidance tailored exclusively for women.',
  featuredLabel: 'Most Loved Cut',
  packagesEyebrow: 'Curated Haircut Combinations',
  packagesTitle: 'Signature Haircut & Styling Packages',
  videosEyebrow: 'Watch Our Cuts in Motion',
  videosTitle: 'Women’s Haircut Video Gallery',
  videosIntro:
    'Explore real women’s haircut transformations — cascading layers, butterfly wings, sleek bobs, curtain bangs and close-up scissor artistry.',
  teamEyebrow: 'Hair Experts & Team',
  teamTitle: 'Meet Our Female Hairstylists',
  teamIntro:
    'An all-female team of dedicated women’s haircut specialists trained in modern layering, architectural bobs, short crops, bangs and curl shaping.',
  galleryEyebrow: 'Haircut Style Gallery',
  galleryTitle: 'Signature Women’s Haircuts & Transformations',
  galleryIntro:
    'Browse real women’s haircut silhouettes by length and texture — from feathered butterfly cuts and long layers to chic bobs, pixies and defined curls.',
  testimonialsEyebrow: 'Customer Reviews',
  testimonialsTitle: 'Why Women Trust Ziya With Their Hair',
  bookingEyebrow: 'Online Appointment Desk',
  bookingTitle: 'Book Your Women’s Haircut',
  bookingSubtitle:
    'Choose your preferred women’s haircut service, select a female hairstylist, pick a convenient date and reserve an available studio slot in seconds.',
  locationEyebrow: 'Visit the Studio',
  locationTitle: 'Hours, Location & Direct Contact',
  footerTagline:
    'Dedicated women’s haircut specialist studio crafting face-framing layers, bobs, butterfly cuts, bangs and curly silhouettes with precision and warmth.',
} as const;
