/**
 * NEXORA template & category catalogue.
 *
 * This module is the single source of truth for how every template is
 * *presented* in the platform: the NEXORA-branded display name, the customer
 * facing category, the description, the search keywords, the badge/icon/
 * colour identity and — most importantly — the stable priority order.
 *
 * Two names are deliberately kept apart:
 *
 *   1. NEXORA template name  — owned by the platform (`displayName` below).
 *   2. Salon business name   — owned by the salon owner after they pick a
 *                              template (`SalonProfile.businessName`).
 *
 * `CATEGORY_TEMPLATES[*].title` remains the *salon demo brand* used inside the
 * generated website (hero cover, SEO, WhatsApp copy, …). The NEXORA display
 * name never overwrites it, so an owner who renames their salon keeps full
 * control of their own brand.
 *
 * Template IDs, services, prices, durations, staff and booking relationships
 * are never touched here — only presentation metadata.
 */
import type { BusinessTypeId } from '../types';

export const NEXORA_BRAND = 'NEXORA';

/** Every platform template name starts with this prefix. */
export const NEXORA_PREFIX = `${NEXORA_BRAND} `;

/**
 * Category identity: colour, icon and description. One entry per category (a category may contain multiple templates),
 * in priority order. `categoryId` is stable and used by the filter bar.
 */
export interface NexoraCategory {
  categoryId: string;
  /** Filter-button label — the simple, salon-owner friendly category name. */
  categoryName: string;
  /** What the customer sees as the card badge. */
  categoryLabel: string;
  /** One line that says exactly who the category is for. */
  categoryDescription: string;
  /** Two-letter monogram printed on the icon tile. */
  monogram: string;
  /** Lucide icon name rendered by <CategoryIcon/>. */
  icon: string;
  /** Material Symbols name, kept for the existing icon system. */
  materialIcon: string;
  /** Category colour (hex) used for the icon tile, badge and accent bar. */
  color: string;
  /** Soft tint behind the icon tile. */
  tint: string;
  /** Text colour that stays readable on the category colour. */
  onColor: string;
  searchKeywords: string[];
}

export interface NexoraTemplateMeta {
  templateId: BusinessTypeId;
  categoryId: string;
  categoryName: string;
  /** The NEXORA template name — the only name shown in the template library. */
  displayName: string;
  /** Salon demo brand that the generated website ships with. */
  salonBrand: string;
  shortName: string;
  shortDescription: string;
  /** "Best for" line on the card — identifies the salon type at a glance. */
  bestFor: string;
  /** Main services shown on the card (the template's own, unchanged menu). */
  services: string[];
  priorityRank: number;
  displayOrder: number;
  /** Menu number shown on the card: "01", "02", … "16". */
  templateNumber: string;
  searchTags: string[];
  icon: string;
  badge: string;
  /** Preview artwork is pulled from the template's own cover image. */
  previewLabel: string;
}

/**
 * Categories, in priority order. Each category maps 1:1 to a template so that
 * the filter bar, its counting and the card order can never drift apart.
 */
export const NEXORA_CATEGORIES: NexoraCategory[] = [
  {
    categoryId: 'haircut-studio',
    categoryName: 'Haircut Studio',
    categoryLabel: 'Haircut Studio',
    categoryDescription: 'Specialist women’s haircut services and modern hairstyles.',
    monogram: 'HS',
    icon: 'Scissors',
    materialIcon: 'content_cut',
    color: '#9F1239',
    tint: '#FCE7EC',
    onColor: '#FFFFFF',
    searchKeywords: ['haircut', 'hair cut', 'women', 'layers', 'butterfly', 'bob', 'fringe', 'hair studio'],
  },
  {
    categoryId: 'barber-shop',
    categoryName: 'Barber Shop',
    categoryLabel: 'Barber Shop',
    categoryDescription: 'Men’s haircuts, beard grooming and classic barber services.',
    monogram: 'BS',
    icon: 'Scissors',
    materialIcon: 'content_cut',
    color: '#1E3A5F',
    tint: '#E4EDF8',
    onColor: '#FFFFFF',
    searchKeywords: ['barber', 'beard', 'shave', 'fade', 'men', 'grooming', 'barbershop'],
  },
  {
    categoryId: 'beauty-parlour',
    categoryName: 'Beauty Parlour',
    categoryLabel: 'Beauty Parlour',
    categoryDescription: 'Beauty services, facials and makeover services.',
    monogram: 'BP',
    icon: 'Sparkles',
    materialIcon: 'auto_awesome',
    color: '#9D4B5B',
    tint: '#FBEAEE',
    onColor: '#FFFFFF',
    searchKeywords: ['beauty', 'parlour', 'parlor', 'facial', 'makeover', 'threading', 'waxing', 'cleanup'],
  },
  {
    categoryId: 'nail-studio',
    categoryName: 'Nail Studio',
    categoryLabel: 'Nail Studio',
    categoryDescription: 'Nail art, nail care and nail design services.',
    monogram: 'NS',
    icon: 'Hand',
    materialIcon: 'back_hand',
    color: '#BE185D',
    tint: '#FCE7F3',
    onColor: '#FFFFFF',
    searchKeywords: ['nail', 'nails', 'nail art', 'gel', 'manicure', 'pedicure', 'extension'],
  },
  {
    categoryId: 'unisex-salon',
    categoryName: 'Unisex Salon',
    categoryLabel: 'Unisex Salon',
    categoryDescription: 'Hair, skin, grooming and salon services for men and women.',
    monogram: 'US',
    icon: 'Users',
    materialIcon: 'diversity_3',
    color: '#6D28D9',
    tint: '#EDE9FE',
    onColor: '#FFFFFF',
    searchKeywords: ['unisex', 'men and women', 'family', 'salon', 'hair', 'skin', 'grooming'],
  },
  {
    categoryId: 'mens-hair-studio',
    categoryName: "Men's Hair Studio",
    categoryLabel: "Men's Hair Studio",
    categoryDescription: 'Men’s haircuts and men’s hair colour only.',
    monogram: 'MH',
    icon: 'UserRound',
    materialIcon: 'face_6',
    color: '#3F4A3C',
    tint: '#EDF1E9',
    onColor: '#FFFFFF',
    searchKeywords: ['men', 'mens', "men's haircut", 'fade', 'taper', 'crew cut', 'hair colour', 'highlights'],
  },
  {
    categoryId: 'hair-spa',
    categoryName: 'Hair Spa & Hair Care',
    categoryLabel: 'Hair Spa & Hair Care',
    categoryDescription: 'Hair spa, hair care and related services.',
    monogram: 'HP',
    icon: 'Droplets',
    materialIcon: 'spa',
    color: '#166534',
    tint: '#E7F5EC',
    onColor: '#FFFFFF',
    searchKeywords: ['hair spa', 'spa', 'scalp', 'hair fall', 'treatment', 'hair care', 'massage'],
  },
  {
    categoryId: 'skin-aesthetic-clinic',
    categoryName: 'Skin & Aesthetic Clinic',
    categoryLabel: 'Skin & Aesthetic Clinic',
    categoryDescription: 'Skincare, aesthetic and clinic services.',
    monogram: 'SC',
    icon: 'Stethoscope',
    materialIcon: 'medical_services',
    color: '#0369A1',
    tint: '#E0F2FE',
    onColor: '#FFFFFF',
    searchKeywords: ['skin', 'skincare', 'clinic', 'dermatologist', 'laser', 'acne', 'aesthetic'],
  },
  {
    categoryId: 'makeup-studio',
    categoryName: 'Makeup Studio',
    categoryLabel: 'Makeup Studio',
    categoryDescription: 'Professional makeup, occasion looks and makeup academy.',
    monogram: 'MS',
    icon: 'Paintbrush',
    materialIcon: 'brush',
    color: '#A16207',
    tint: '#FEF3C7',
    onColor: '#FFFFFF',
    searchKeywords: ['makeup', 'make up', 'party look', 'academy', 'artist', 'bridal makeup', 'portfolio'],
  },
  {
    categoryId: 'bridal-makeup',
    categoryName: 'Bridal Makeup',
    categoryLabel: 'Bridal Makeup & Makeover',
    categoryDescription: 'Bridal makeup, wedding looks and bridal styling.',
    monogram: 'BM',
    icon: 'Gem',
    materialIcon: 'diamond',
    color: '#7F1D1D',
    tint: '#FEE2E2',
    onColor: '#FFFFFF',
    searchKeywords: ['bridal', 'bride', 'wedding', 'makeover', 'dulhan', 'engagement', 'reception'],
  },
  {
    categoryId: 'hair-colour-studio',
    categoryName: 'Hair Colour Studio',
    categoryLabel: 'Hair Colour Studio',
    categoryDescription: 'Hair colouring, highlights, balayage and colour services.',
    monogram: 'HC',
    icon: 'Palette',
    materialIcon: 'palette',
    color: '#6B21A8',
    tint: '#F3E8FF',
    onColor: '#FFFFFF',
    searchKeywords: ['hair colour', 'hair color', 'colour', 'balayage', 'highlights', 'ombre', 'global colour'],
  },
  {
    categoryId: 'massage-wellness',
    categoryName: 'Massage & Wellness',
    categoryLabel: 'Massage & Wellness',
    categoryDescription: 'Massage, wellness and relaxation services.',
    monogram: 'MW',
    icon: 'Flower2',
    materialIcon: 'self_improvement',
    color: '#4D7C0F',
    tint: '#ECF7DF',
    onColor: '#FFFFFF',
    searchKeywords: ['massage', 'wellness', 'relaxation', 'therapy', 'body', 'aroma', 'spa'],
  },
  {
    categoryId: 'tattoo-body-art',
    categoryName: 'Tattoo & Body Art',
    categoryLabel: 'Tattoo & Body Art',
    categoryDescription: 'Tattoo designs, custom tattoos and body art.',
    monogram: 'TA',
    icon: 'PenTool',
    materialIcon: 'draw',
    color: '#B91C1C',
    tint: '#FEE2E2',
    onColor: '#FFFFFF',
    searchKeywords: ['tattoo', 'tattoos', 'body art', 'piercing', 'ink', 'artist', 'custom tattoo'],
  },
  {
    categoryId: 'lash-brow',
    categoryName: 'Lash & Brow',
    categoryLabel: 'Lash & Brow',
    categoryDescription: 'Eyelash, eyebrow and beauty services.',
    monogram: 'LB',
    icon: 'Eye',
    materialIcon: 'visibility',
    color: '#9D174D',
    tint: '#FCE7F3',
    onColor: '#FFFFFF',
    searchKeywords: ['lash', 'lashes', 'eyelash', 'brow', 'eyebrow', 'microblading', 'lift', 'tint'],
  },
  {
    categoryId: 'ayurvedic-wellness',
    categoryName: 'Ayurvedic Wellness',
    categoryLabel: 'Ayurvedic Wellness & Spa',
    categoryDescription: 'Ayurvedic wellness and spa services.',
    monogram: 'AW',
    icon: 'Leaf',
    materialIcon: 'eco',
    color: '#3F6212',
    tint: '#F1F8E5',
    onColor: '#FFFFFF',
    searchKeywords: ['ayurveda', 'ayurvedic', 'veda', 'abhyanga', 'panchakarma', 'spa', 'wellness', 'herbal'],
  },
];

/** O(1) lookups. */
const CATEGORY_BY_ID = new Map(NEXORA_CATEGORIES.map((category) => [category.categoryId, category]));

export function nexoraCategory(categoryId: string): NexoraCategory | undefined {
  return CATEGORY_BY_ID.get(categoryId);
}

/**
 * All templates in their fixed priority order.
 *
 * Order is data, not a sort: it never depends on object key order, locale
 * collation or the network. Refresh, storage and re-render can never shuffle
 * it, and alphabetical sorting is never applied.
 */
export const NEXORA_TEMPLATE_META: NexoraTemplateMeta[] = [
  {
    templateId: 'hair_salon',
    categoryId: 'haircut-studio',
    categoryName: 'Haircut Studio',
    displayName: 'NEXORA Ziya Women’s Haircut Studio',
    salonBrand: 'Ziya Women’s Hair Studio',
    shortName: 'Women’s Haircut Studio',
    shortDescription: 'Specialist women’s haircut services and modern hairstyles.',
    bestFor: 'Women’s haircut salons.',
    services: ['Layer haircut', 'Butterfly haircut', 'Bob haircut', 'Curtain bangs', 'Step cut'],
    priorityRank: 1,
    displayOrder: 1,
    templateNumber: '01',
    searchTags: ['haircut', 'hair cut', 'women', 'ladies', 'layers', 'butterfly haircut', 'bob', 'pixie', 'fringe', 'haircut studio'],
    icon: 'Scissors',
    badge: 'Most popular',
    previewLabel: 'Women’s haircut studio',
  },
  {
    templateId: 'barber',
    categoryId: 'barber-shop',
    categoryName: 'Barber Shop',
    displayName: 'NEXORA Royal Blade Men’s Barber Shop',
    salonBrand: "The Royal Blade Barber & Men's Club",
    shortName: 'Barber Shop',
    shortDescription: 'Men’s haircuts, beard grooming and classic barber services.',
    bestFor: 'Barber shops and men’s grooming lounges.',
    services: ['Skin fade', 'Beard sculpting', 'Hot towel shave', 'Classic taper', 'Hair wash'],
    priorityRank: 2,
    displayOrder: 2,
    templateNumber: '02',
    searchTags: ['barber', 'barbershop', 'beard', 'shave', 'fade', 'men', 'grooming', 'royal blade'],
    icon: 'Scissors',
    badge: 'Classic',
    previewLabel: 'Barber shop',
  },
  {
    templateId: 'beauty_parlour',
    categoryId: 'beauty-parlour',
    categoryName: 'Beauty Parlour',
    displayName: 'NEXORA Roop Mahal Beauty Parlour',
    salonBrand: 'Roop Mahal Beauty Parlour & Makeover Space',
    shortName: 'Beauty Parlour',
    shortDescription: 'Beauty services, facials and makeover services.',
    bestFor: 'Neighbourhood beauty parlours.',
    services: ['Facial', 'Threading', 'Waxing', 'Cleanup', 'Makeover package'],
    priorityRank: 3,
    displayOrder: 3,
    templateNumber: '03',
    searchTags: ['beauty', 'parlour', 'parlor', 'facial', 'makeover', 'threading', 'waxing', 'roop mahal'],
    icon: 'Sparkles',
    badge: 'Traditional',
    previewLabel: 'Beauty parlour',
  },
  {
    templateId: 'nail_studio',
    categoryId: 'nail-studio',
    categoryName: 'Nail Studio',
    displayName: 'NEXORA Pinky Nails Studio',
    salonBrand: 'Pinky Nails Studio',
    shortName: 'Nail Studio',
    shortDescription: 'Nail art, nail care and nail design services.',
    bestFor: 'Nail art bars and nail extension studios.',
    services: ['Gel nails', 'Nail art', 'Nail extensions', 'Manicure', 'Pedicure'],
    priorityRank: 4,
    displayOrder: 4,
    templateNumber: '04',
    searchTags: ['nail', 'nails', 'nail art', 'gel', 'manicure', 'pedicure', 'pinky nails'],
    icon: 'Hand',
    badge: 'Bento layout',
    previewLabel: 'Nail studio',
  },
  {
    templateId: 'unisex_salon',
    categoryId: 'unisex-salon',
    categoryName: 'Unisex Salon',
    displayName: 'NEXORA Aura Unisex Salon',
    salonBrand: 'Aura Unisex Salon & Wellness Lounge',
    shortName: 'Unisex Salon',
    shortDescription: 'Hair, skin, grooming and salon services for men and women.',
    bestFor: 'Unisex salons serving the whole family.',
    services: ['Haircut', 'Hair colour', 'Facial', 'Grooming', 'Wellness add-ons'],
    priorityRank: 5,
    displayOrder: 5,
    templateNumber: '05',
    searchTags: ['unisex', 'men and women', 'family', 'salon', 'hair', 'skin', 'grooming', 'aura'],
    icon: 'Users',
    badge: 'Trending',
    previewLabel: 'Unisex salon',
  },
  {
    templateId: 'mens_hair_studio',
    categoryId: 'mens-hair-studio',
    categoryName: "Men's Hair Studio",
    displayName: 'NEXORA KeshKraft Men’s Hair Studio',
    salonBrand: "KeshKraft Men's Hair Studio",
    shortName: "Men's Hair Studio",
    shortDescription: 'Men’s haircuts and men’s hair colour only.',
    bestFor: 'Men’s haircut and men’s hair colour studios.',
    services: ['Fades', 'Taper cuts', 'Crew cuts', 'Men’s hair colour', 'Highlights'],
    priorityRank: 6,
    displayOrder: 6,
    templateNumber: '06',
    searchTags: ['men', 'mens', "men's haircut", 'fade', 'taper', 'crew cut', 'hair colour', 'highlights', 'keshkraft'],
    icon: 'UserRound',
    badge: 'Men only',
    previewLabel: 'Men’s hair studio',
  },
  {
    templateId: 'hair_spa',
    categoryId: 'hair-spa',
    categoryName: 'Hair Spa & Hair Care',
    displayName: 'NEXORA Kesh Prakriti Hair Spa',
    salonBrand: 'Kesh Prakriti Salon & Hair Spa',
    shortName: 'Hair Spa & Hair Care',
    shortDescription: 'Hair spa, hair care and related services.',
    bestFor: 'Hair spa and hair-fall treatment centres.',
    services: ['Hair spa', 'Scalp treatment', 'Hair fall therapy', 'Keratin care', 'Head massage'],
    priorityRank: 7,
    displayOrder: 7,
    templateNumber: '07',
    searchTags: ['hair spa', 'spa', 'scalp', 'hair care', 'hair fall', 'treatment', 'kesh prakriti'],
    icon: 'Droplets',
    badge: 'Zen sanctuary',
    previewLabel: 'Hair spa',
  },
  {
    templateId: 'skincare_clinic',
    categoryId: 'skin-aesthetic-clinic',
    categoryName: 'Skin & Aesthetic Clinic',
    displayName: 'NEXORA Dermacure Aesthetic Clinic',
    salonBrand: 'Dermacure Aesthetic Dermatology & Laser Clinic',
    shortName: 'Skin & Aesthetic Clinic',
    shortDescription: 'Skincare, aesthetic and clinic services.',
    bestFor: 'Dermatology and aesthetic skin clinics.',
    services: ['Chemical peel', 'Laser treatment', 'Acne care', 'Hydrafacial', 'Pigmentation care'],
    priorityRank: 8,
    displayOrder: 8,
    templateNumber: '08',
    searchTags: ['skin', 'skincare', 'clinic', 'dermatology', 'laser', 'acne', 'aesthetic', 'dermacure'],
    icon: 'Stethoscope',
    badge: 'Derm approved',
    previewLabel: 'Skin clinic',
  },
  {
    templateId: 'makeup_studio',
    categoryId: 'makeup-studio',
    categoryName: 'Makeup Studio',
    displayName: 'NEXORA Vogue Noir Makeup Studio',
    salonBrand: 'Vogue Noir Makeup Studio & Academy',
    shortName: 'Makeup Studio',
    shortDescription: 'Professional makeup, occasion looks and makeup academy.',
    bestFor: 'Makeup artists and makeup academies.',
    services: ['Party makeup', 'Engagement makeup', 'Makeup academy', 'Airbrush makeup', 'Portfolio shoot'],
    priorityRank: 9,
    displayOrder: 9,
    templateNumber: '09',
    searchTags: ['makeup', 'make up', 'academy', 'artist', 'party look', 'portfolio', 'vogue noir'],
    icon: 'Paintbrush',
    badge: 'Editorial',
    previewLabel: 'Makeup studio',
  },
  {
    templateId: 'bridal_lounge',
    categoryId: 'bridal-makeup',
    categoryName: 'Bridal Makeup',
    displayName: 'NEXORA Shringaar Royal Bridal Lounge',
    salonBrand: 'Shringaar Royal Indian Bridal Lounge',
    shortName: 'Bridal Makeup & Makeover',
    shortDescription: 'Bridal makeup, wedding looks and bridal styling.',
    bestFor: 'Bridal makeup and wedding styling lounges.',
    services: ['Bridal makeup', 'Engagement look', 'Reception look', 'Bridal draping', 'Pre-bridal package'],
    priorityRank: 10,
    displayOrder: 10,
    templateNumber: '10',
    searchTags: ['bridal', 'bride', 'wedding', 'makeover', 'dulhan', 'shringaar', 'royal'],
    icon: 'Gem',
    badge: 'Wedding',
    previewLabel: 'Bridal lounge',
  },
  {
    templateId: 'hair_coloring',
    categoryId: 'hair-colour-studio',
    categoryName: 'Hair Colour Studio',
    displayName: 'NEXORA Prism & Chroma Hair Colour Studio',
    salonBrand: 'Prism & Chroma Hair Color Atelier',
    shortName: 'Hair Colour Studio',
    shortDescription: 'Hair colouring, highlights, balayage and colour services.',
    bestFor: 'Hair colour specialists and balayage studios.',
    services: ['Global colour', 'Balayage', 'Highlights', 'Colour correction', 'Gloss treatment'],
    priorityRank: 11,
    displayOrder: 11,
    templateNumber: '11',
    searchTags: ['hair colour', 'hair color', 'colour', 'balayage', 'highlights', 'ombre', 'prism', 'chroma'],
    icon: 'Palette',
    badge: 'Colour lab',
    previewLabel: 'Hair colour studio',
  },
  {
    templateId: 'massage_wellness',
    categoryId: 'massage-wellness',
    categoryName: 'Massage & Wellness',
    displayName: 'NEXORA Bodhi Tree Massage & Wellness',
    salonBrand: 'Bodhi Tree Massage & Wellness Sanctuary',
    shortName: 'Massage & Wellness',
    shortDescription: 'Massage, wellness and relaxation services.',
    bestFor: 'Massage centres and wellness spas.',
    services: ['Full body massage', 'Aroma therapy', 'Deep tissue massage', 'Couple massage', 'Body scrub'],
    priorityRank: 12,
    displayOrder: 12,
    templateNumber: '12',
    searchTags: ['massage', 'wellness', 'relaxation', 'therapy', 'body', 'spa', 'bodhi tree'],
    icon: 'Flower2',
    badge: 'Wellness retreat',
    previewLabel: 'Massage & wellness',
  },
  {
    templateId: 'tattoo_studio',
    categoryId: 'tattoo-body-art',
    categoryName: 'Tattoo & Body Art',
    displayName: 'NEXORA Iron & Ink Tattoo Studio',
    salonBrand: 'Iron & Ink Urban Tattoo & Body Art Studio',
    shortName: 'Tattoo & Body Art',
    shortDescription: 'Tattoo designs, custom tattoos and body art.',
    bestFor: 'Tattoo artists and body art studios.',
    services: ['Custom tattoo', 'Small tattoo', 'Cover-up tattoo', 'Piercing', 'Tattoo touch-up'],
    priorityRank: 13,
    displayOrder: 13,
    templateNumber: '13',
    searchTags: ['tattoo', 'tattoos', 'body art', 'ink', 'piercing', 'iron and ink'],
    icon: 'PenTool',
    badge: 'Body art',
    previewLabel: 'Tattoo studio',
  },
  {
    templateId: 'lash_brow',
    categoryId: 'lash-brow',
    categoryName: 'Lash & Brow',
    displayName: 'NEXORA Arch & Flutter Lash & Brow Bar',
    salonBrand: 'Arch & Flutter Lash & Brow Bar',
    shortName: 'Lash & Brow',
    shortDescription: 'Eyelash, eyebrow and beauty services.',
    bestFor: 'Lash extension and eyebrow studios.',
    services: ['Lash extensions', 'Brow shaping', 'Microblading', 'Lash lift', 'Brow tint'],
    priorityRank: 14,
    displayOrder: 14,
    templateNumber: '14',
    searchTags: ['lash', 'lashes', 'eyelash', 'brow', 'eyebrow', 'microblading', 'arch and flutter'],
    icon: 'Eye',
    badge: 'Eye-area atelier',
    previewLabel: 'Lash & brow bar',
  },
  {
    templateId: 'ayurvedic_spa',
    categoryId: 'ayurvedic-wellness',
    categoryName: 'Ayurvedic Wellness',
    displayName: 'NEXORA Veda Sanjeevani Ayurvedic Spa',
    salonBrand: 'Veda Sanjeevani Ayurvedic Wellness & Spa',
    shortName: 'Ayurvedic Wellness & Spa',
    shortDescription: 'Ayurvedic wellness and spa services.',
    bestFor: 'Ayurvedic spas and Panchakarma centres.',
    services: ['Abhyanga massage', 'Shirodhara', 'Panchakarma', 'Herbal facial', 'Ayurvedic consultation'],
    priorityRank: 15,
    displayOrder: 15,
    templateNumber: '15',
    searchTags: ['ayurveda', 'ayurvedic', 'veda', 'sanjeevani', 'abhyanga', 'shirodhara', 'panchakarma', 'spa'],
    icon: 'Leaf',
    badge: 'Heritage',
    previewLabel: 'Ayurvedic spa',
  },
  {
    templateId: 'aurelia_beauty_parlour',
    categoryId: 'beauty-parlour',
    categoryName: 'Beauty Parlour',
    displayName: 'NEXORA Aurelia Beauty Parlour',
    salonBrand: 'Aurelia Luxury Beauty & Wellness Studio',
    shortName: 'Beauty Parlour & Wellness',
    shortDescription: 'A complete beauty studio with hair, colour, skin, bridal, nails and spa services.',
    bestFor: 'Premium beauty parlours and multi-service beauty studios.',
    services: ['Hair styling', 'Balayage & gloss', 'Radiance facial', 'Bridal styling', 'Gel manicure', 'Aromatherapy massage'],
    priorityRank: 16,
    displayOrder: 16,
    templateNumber: '16',
    searchTags: ['aurelia', 'beauty', 'beauty parlour', 'beauty parlor', 'salon', 'hair styling', 'hair colour', 'facial', 'bridal', 'nails', 'spa', 'wellness'],
    icon: 'Sparkles',
    badge: 'Luxury beauty',
    previewLabel: 'Aurelia beauty parlour',
  },
];

const META_BY_ID = new Map(NEXORA_TEMPLATE_META.map((meta) => [meta.templateId, meta]));

/** Metadata for a template id (undefined for unknown ids). */
export function nexoraTemplateMeta(templateId: string): NexoraTemplateMeta | undefined {
  return META_BY_ID.get(templateId as BusinessTypeId);
}

/** The NEXORA display name for any template id, with a safe fallback. */
export function nexoraDisplayName(templateId: string, fallback = ''): string {
  return META_BY_ID.get(templateId as BusinessTypeId)?.displayName || fallback;
}

/**
 * The one sorting function used by every screen.
 *
 * Stable priority order first, then — only for ids with no metadata — a stable
 * id comparison so an unknown entry can never crash or jump to the top.
 */
export function compareTemplatesByPriority(
  a: { id: string; priorityRank?: number; displayOrder?: number },
  b: { id: string; priorityRank?: number; displayOrder?: number },
): number {
  const metaA = META_BY_ID.get(a.id as BusinessTypeId);
  const metaB = META_BY_ID.get(b.id as BusinessTypeId);
  const rankA = metaA?.priorityRank ?? a.priorityRank ?? Number.MAX_SAFE_INTEGER;
  const rankB = metaB?.priorityRank ?? b.priorityRank ?? Number.MAX_SAFE_INTEGER;
  const orderA = metaA?.displayOrder ?? a.displayOrder ?? rankA;
  const orderB = metaB?.displayOrder ?? b.displayOrder ?? rankB;
  if (rankA !== rankB) return rankA - rankB;
  if (orderA !== orderB) return orderA - orderB;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Sorts any template-shaped list into the fixed NEXORA priority order.
 * Always returns a fresh array — the caller's state is never mutated.
 */
export function sortTemplatesByPriority<T extends { id: string }>(templates: readonly T[]): T[] {
  return [...templates].sort(compareTemplatesByPriority);
}

/** Category filter bar options — "All" first, then priority order. */
export interface NexoraCategoryFilter {
  id: string;
  label: string;
  count: number;
  color: string;
  tint: string;
  onColor: string;
  icon: string;
}

export function nexoraCategoryFilters(templates: ReadonlyArray<{ id: string }>): NexoraCategoryFilter[] {
  const available = new Set(templates.map((template) => template.id));
  return [
    { id: 'all', label: 'All Templates', count: templates.length, color: '#0F172A', tint: '#E2E8F0', onColor: '#FFFFFF', icon: 'LayoutGrid' },
    ...NEXORA_CATEGORIES.filter((category) =>
      NEXORA_TEMPLATE_META.some((meta) => meta.categoryId === category.categoryId && available.has(meta.templateId)),
    ).map((category) => {
      const members = NEXORA_TEMPLATE_META.filter(
        (meta) => meta.categoryId === category.categoryId && available.has(meta.templateId),
      );
      return {
        id: category.categoryId,
        label: category.categoryName,
        count: members.length,
        color: category.color,
        tint: category.tint,
        onColor: category.onColor,
        icon: category.icon,
      };
    }),
  ];
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Everything a shopper can type into the search box. Template name, category
 * name, salon type, service names and keywords are all searchable, and the
 * search is accent/apostrophe tolerant ("women's" = "womens").
 */
export function nexoraSearchIndex(
  meta: NexoraTemplateMeta,
  template?: { title?: string; shortName?: string; subCategories?: string[]; services?: Array<{ name: string; category?: string }> },
): string {
  const category = nexoraCategory(meta.categoryId);
  const parts: string[] = [
    meta.displayName,
    meta.shortName,
    meta.categoryName,
    category?.categoryName || '',
    meta.salonBrand,
    meta.shortDescription,
    meta.bestFor,
    meta.previewLabel,
    meta.templateNumber,
    meta.badge,
    ...meta.searchTags,
    ...meta.services,
    ...(category?.searchKeywords || []),
    template?.title || '',
    template?.shortName || '',
    ...(template?.subCategories || []),
    ...(template?.services || []).flatMap((service) => [service.name, service.category || '']),
  ];
  return slugify(parts.filter(Boolean).join(' '));
}

/** True when every word the shopper typed appears in the template's index. */
export function nexoraMatchesSearch(index: string, query: string): boolean {
  const words = slugify(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  return words.every((word) => index.includes(word));
}

/** The platform wordmark + mark, used on the library, cards and category pages. */
export const NEXORA_BRAND_MARK = 'N';
export const NEXORA_BRAND_TAGLINE = 'Premium salon websites for every Indian beauty business';
