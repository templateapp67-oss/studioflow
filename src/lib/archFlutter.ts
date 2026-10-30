import type {
  ArchFlutterCategory,
  ArchFlutterColors,
  ArchFlutterConfig,
  ArchFlutterFaq,
  ArchFlutterOffer,
  ArchFlutterPackage,
  ArchFlutterPost,
  ArchFlutterReel,
  ArchFlutterReview,
  ArchFlutterStat,
  SalonProfile,
  SalonService,
  Stylist,
} from '../types';

/**
 * Template 13 — Arch & Flutter Lash & Brow Bar.
 * Category: Lash & Brow Bar (`lash_brow`), slug `arch-flutter`.
 *
 * Design: "Editorial luxury, bento-first" — warm ivory (#FBF6F1) and blush rose
 * (#F4D7D3) gradient-mesh canvases, deep espresso (#2B1B17) ink, champagne gold
 * (#C9A66B) hairlines and dusty mauve (#9A6B73) accents. Oversized serif
 * display headings over a clean sans body; arch-shaped image masks (the "Arch"
 * of the brand), feather / flutter strokes, and semi-transparent glass cards
 * with backdrop blur.
 *
 * Everything below is DEFAULT demo content. Owners replace it in onboarding and
 * the Owner Workspace (business name, logo, tagline, about, phone, WhatsApp,
 * email, city, address, timings, 15 categories, ₹ prices, artists, gallery,
 * reels, offers, journal, reviews and brand colours); `resolveArchFlutterConfig`
 * fills any blank with these defaults so a published site never shows an empty
 * section.
 *
 * Photography: every slot renders through the shared <SafeImage> (lazy
 * loading, fixed width/height, descriptive alt text, WebP via `auto=format`)
 * and falls back to a bundled arch art plate in /public/templates/13/art/, so
 * no frame is ever empty — even offline or in the template preview.
 */

export const ARCH_FLUTTER_TEMPLATE_CODE = '13';
export const ARCH_FLUTTER_SLUG = 'arch-flutter';
export const ARCH_FLUTTER_SELECTOR_LABEL = 'Arch & Flutter (13)';
export const ARCH_FLUTTER_BRAND_NAME = 'Arch & Flutter Lash & Brow Bar';
export const ARCH_FLUTTER_TAGLINE = 'Frame your eyes. Flutter your confidence.';
export const ARCH_FLUTTER_HERO_KICKER = 'Lash & Brow Atelier · Est. 2019';
export const ARCH_FLUTTER_HERO_HEADING = 'Frame Your Eyes. Flutter Your Confidence.';
export const ARCH_FLUTTER_HERO_SUBTEXT =
  'An eye-area-only beauty bar in Jaipur: weightless lash extensions, feathered brow lamination, henna and semi-permanent artistry — mapped to your bone structure, priced honestly in ₹.';
export const ARCH_FLUTTER_DEFAULT_ABOUT =
  'Arch & Flutter is not a full-service salon — we do one thing and we do it obsessively: the eye area. Since 2019 our C-Scheme bar has built a reputation for feather-light Russian volume, brushed-up laminations and powder brows that photograph like your own. Every set starts with a face-map and a patch test, every adhesive is vegan and fume-free, and every price you see is the price you pay, GST included.';
export const ARCH_FLUTTER_DEFAULT_CITY = 'Jaipur, Rajasthan';
export const ARCH_FLUTTER_DEFAULT_ADDRESS = '12, Ashok Marg, C-Scheme, Near Statue Circle';
export const ARCH_FLUTTER_DEFAULT_POSTAL_CODE = '302001';
export const ARCH_FLUTTER_DEFAULT_PHONE = '+91 98290 55214';
export const ARCH_FLUTTER_DEFAULT_EMAIL = 'hello@archandflutter.example';
export const ARCH_FLUTTER_DEFAULT_HOURS = 'Tue – Sun · 10:00 AM – 8:00 PM';
export const ARCH_FLUTTER_DEFAULT_ESTABLISHED = 'Est. 2019 · Jaipur';

export const ARCH_FLUTTER_DEFAULT_COLORS: ArchFlutterColors = {
  blush: '#F4D7D3',
  ivory: '#FBF6F1',
  espresso: '#2B1B17',
  gold: '#C9A66B',
  mauve: '#9A6B73',
};

/** Bundled art plates + rasters: the fallback layer for every photograph slot. */
const A = (path: string) => `/templates/13/${path}`;

export const ARCH_FLUTTER_ART = {
  logoSvg: A('logo.svg'),
  faviconSvg: A('favicon.svg'),
  ogImage: A('og-image.jpg'),
  preview: A('preview.jpg'),
  lash: A('art/lash.svg'),
  lashVolume: A('art/lash-volume.svg'),
  lashNatural: A('art/lash-natural.svg'),
  brow: A('art/brow.svg'),
  browLamination: A('art/brow-lamination.svg'),
  microblading: A('art/microblading.svg'),
  pmu: A('art/pmu.svg'),
  studio: A('art/studio.svg'),
  team: A('art/team.svg'),
  gallery: A('art/gallery.svg'),
  package: A('art/package.svg'),
  blog: A('art/blog.svg'),
  offer: A('art/offer.svg'),
  before: A('art/before.svg'),
  after: A('art/after.svg'),
  reel: A('art/reel.svg'),
  eyeCare: A('art/eye-care.svg'),
  bridal: A('art/bridal.svg'),
  tools: A('art/tools.svg'),
  refill: A('art/refill.svg'),
};

/** Remote photography (WebP via auto=format). Every slot has a bundled fallback. */
const U = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const PHOTO = {
  lashMacro: U('1583001931096-959e9a1a6223', 1400),
  lashSet: U('1522337360788-8b13dee7a37e', 1100),
  browFace: U('1570172619644-dfd03ed5d881', 1100),
  beautyFace: U('1487412720507-e7ab37603c6f', 1100),
  consult: U('1516975080664-ed2fc6a32937', 1100),
  browClose: U('1527799820374-dcf8d9d4a388', 1100),
  studioRoom: U('1512290900672-1f55b9e07506', 1400),
  salonInterior: U('1560066984-138dadb4c035', 1400),
  spaInterior: U('1600334129128-685c5582fd35', 1200),
  skinJournalOne: U('1519494026892-80bbd2d6fd0d', 1000),
  skinJournalTwo: U('1512290900673-700201121d5c', 1000),
  skinJournalThree: U('1598440947619-2c35fc9aa908', 1000),
  skinTreatment: U('1560750588-73207b1ef5b8', 1000),
  glowOffer: U('1629909613654-28e377c37b09', 1200),
  portraitOne: U('1573497019940-1c28c88b4f3e', 700),
  portraitTwo: U('1534528741775-53994a69daeb', 700),
  portraitThree: U('1517841905240-472988babdf9', 700),
  portraitFour: U('1573496359142-b8d87734a5a2', 700),
  avatarOne: U('1544005313-94ddf0286df2', 240),
  avatarTwo: U('1494790108377-be9c29b29330', 240),
  avatarThree: U('1438761681033-6461ffad8d80', 240),
  avatarFour: U('1580489944761-15a19d654956', 240),
} as const;

export const ARCH_FLUTTER_IMAGES = {
  logoSvg: ARCH_FLUTTER_ART.logoSvg,
  faviconSvg: ARCH_FLUTTER_ART.faviconSvg,
  ogImage: ARCH_FLUTTER_ART.ogImage,
  preview: ARCH_FLUTTER_ART.preview,
  hero: { src: PHOTO.lashMacro, fallback: ARCH_FLUTTER_ART.lash },
  about: { src: PHOTO.salonInterior, fallback: ARCH_FLUTTER_ART.studio },
  owner: { src: PHOTO.portraitOne, fallback: ARCH_FLUTTER_ART.team },
  ctaBanner: { src: PHOTO.lashSet, fallback: ARCH_FLUTTER_ART.lashVolume },
  footer: { src: PHOTO.studioRoom, fallback: ARCH_FLUTTER_ART.studio },
  categories: {
    classic: { src: PHOTO.lashSet, fallback: ARCH_FLUTTER_ART.lash },
    volume: { src: PHOTO.lashMacro, fallback: ARCH_FLUTTER_ART.lashVolume },
    hybrid: { src: PHOTO.browFace, fallback: ARCH_FLUTTER_ART.lash },
    mega: { src: PHOTO.lashSet, fallback: ARCH_FLUTTER_ART.lashVolume },
    lift: { src: PHOTO.beautyFace, fallback: ARCH_FLUTTER_ART.lashNatural },
    refill: { src: PHOTO.consult, fallback: ARCH_FLUTTER_ART.refill },
    shaping: { src: PHOTO.browFace, fallback: ARCH_FLUTTER_ART.brow },
    waxTint: { src: PHOTO.beautyFace, fallback: ARCH_FLUTTER_ART.brow },
    lamination: { src: PHOTO.browClose, fallback: ARCH_FLUTTER_ART.browLamination },
    henna: { src: PHOTO.consult, fallback: ARCH_FLUTTER_ART.brow },
    microblading: { src: PHOTO.browClose, fallback: ARCH_FLUTTER_ART.microblading },
    pmu: { src: PHOTO.skinJournalTwo, fallback: ARCH_FLUTTER_ART.pmu },
    eyeCare: { src: PHOTO.skinTreatment, fallback: ARCH_FLUTTER_ART.eyeCare },
    bridal: { src: PHOTO.glowOffer, fallback: ARCH_FLUTTER_ART.bridal },
    combos: { src: PHOTO.skinJournalThree, fallback: ARCH_FLUTTER_ART.package },
  },
  services: {
    lash: { src: PHOTO.lashSet, fallback: ARCH_FLUTTER_ART.lash },
    brow: { src: PHOTO.browFace, fallback: ARCH_FLUTTER_ART.brow },
    lift: { src: PHOTO.beautyFace, fallback: ARCH_FLUTTER_ART.lashNatural },
    pmu: { src: PHOTO.skinJournalTwo, fallback: ARCH_FLUTTER_ART.pmu },
    care: { src: PHOTO.skinTreatment, fallback: ARCH_FLUTTER_ART.eyeCare },
    bridal: { src: PHOTO.glowOffer, fallback: ARCH_FLUTTER_ART.bridal },
    tools: { src: PHOTO.consult, fallback: ARCH_FLUTTER_ART.tools },
  },
  beforeAfter: {
    beforeOne: { src: PHOTO.beautyFace, fallback: ARCH_FLUTTER_ART.before },
    afterOne: { src: PHOTO.lashMacro, fallback: ARCH_FLUTTER_ART.after },
    beforeTwo: { src: PHOTO.consult, fallback: ARCH_FLUTTER_ART.before },
    afterTwo: { src: PHOTO.browFace, fallback: ARCH_FLUTTER_ART.after },
  },
  team: {
    meher: { src: PHOTO.portraitOne, fallback: ARCH_FLUTTER_ART.team },
    ritika: { src: PHOTO.portraitTwo, fallback: ARCH_FLUTTER_ART.team },
    aisha: { src: PHOTO.portraitThree, fallback: ARCH_FLUTTER_ART.team },
    devika: { src: PHOTO.portraitFour, fallback: ARCH_FLUTTER_ART.team },
  },
  reviews: {
    one: { src: PHOTO.avatarOne, fallback: ARCH_FLUTTER_ART.team },
    two: { src: PHOTO.avatarTwo, fallback: ARCH_FLUTTER_ART.team },
    three: { src: PHOTO.avatarThree, fallback: ARCH_FLUTTER_ART.team },
    four: { src: PHOTO.avatarFour, fallback: ARCH_FLUTTER_ART.team },
  },
  gallery: [
    { src: PHOTO.lashMacro, fallback: ARCH_FLUTTER_ART.lash },
    { src: PHOTO.browFace, fallback: ARCH_FLUTTER_ART.brow },
    { src: PHOTO.lashSet, fallback: ARCH_FLUTTER_ART.lashVolume },
    { src: PHOTO.studioRoom, fallback: ARCH_FLUTTER_ART.studio },
    { src: PHOTO.browClose, fallback: ARCH_FLUTTER_ART.browLamination },
    { src: PHOTO.beautyFace, fallback: ARCH_FLUTTER_ART.lashNatural },
    { src: PHOTO.salonInterior, fallback: ARCH_FLUTTER_ART.gallery },
    { src: PHOTO.glowOffer, fallback: ARCH_FLUTTER_ART.bridal },
  ],
  offers: {
    festive: { src: PHOTO.glowOffer, fallback: ARCH_FLUTTER_ART.offer },
    bridal: { src: PHOTO.spaInterior, fallback: ARCH_FLUTTER_ART.bridal },
  },
  posts: {
    aftercare: { src: PHOTO.skinJournalOne, fallback: ARCH_FLUTTER_ART.blog },
    lift: { src: PHOTO.beautyFace, fallback: ARCH_FLUTTER_ART.lashNatural },
    mapping: { src: PHOTO.consult, fallback: ARCH_FLUTTER_ART.brow },
    pmu: { src: PHOTO.skinJournalThree, fallback: ARCH_FLUTTER_ART.pmu },
  },
  reels: {
    application: { src: A('reels/poster-lash-application.jpg'), fallback: ARCH_FLUTTER_ART.reel },
    lamination: { src: A('reels/poster-brow-lamination.jpg'), fallback: ARCH_FLUTTER_ART.reel },
    lift: { src: A('reels/poster-lash-lift.jpg'), fallback: ARCH_FLUTTER_ART.reel },
    tour: { src: A('reels/poster-studio-tour.jpg'), fallback: ARCH_FLUTTER_ART.reel },
    aftercare: { src: A('reels/poster-aftercare.jpg'), fallback: ARCH_FLUTTER_ART.reel },
  },
};

export const ARCH_FLUTTER_CATEGORIES: ArchFlutterCategory[] = [
  { id: 'af-cat-classic', name: 'Classic Lash Extensions', blurb: 'One silk lash on each natural lash — the everyday, mascara-free finish.', imageUrl: PHOTO.lashSet, featured: true },
  { id: 'af-cat-volume', name: 'Volume Lash Extensions', blurb: 'Hand-made 2D–6D fans for soft, fluffy density that still feels weightless.', imageUrl: PHOTO.lashMacro },
  { id: 'af-cat-hybrid', name: 'Hybrid Lash Extensions', blurb: 'Classics and wispy fans blended for a textured, half-and-half finish.', imageUrl: PHOTO.browFace },
  { id: 'af-cat-mega', name: 'Mega Volume · Wispy · Anime · Manga', blurb: 'Statement 8D–12D sets, spiked anime lines and wet-look manga drama.', imageUrl: PHOTO.lashSet },
  { id: 'af-cat-lift', name: 'Lash Lift & Tint', blurb: 'Your own lashes, curled from the root and tinted deep black for 6–8 weeks.', imageUrl: PHOTO.beautyFace },
  { id: 'af-cat-refill', name: 'Lash Refill & Removal', blurb: 'Three-week infills and gentle, damage-free removal with a care serum.', imageUrl: PHOTO.consult },
  { id: 'af-cat-shaping', name: 'Brow Shaping & Threading', blurb: 'Thread-and-tweezer shaping mapped to your bone structure — ₹99 and up.', imageUrl: PHOTO.browFace, featured: true },
  { id: 'af-cat-wax-tint', name: 'Brow Waxing & Tinting', blurb: 'Clean wax lines and vegetable tint for fuller-looking, defined arches.', imageUrl: PHOTO.beautyFace },
  { id: 'af-cat-lamination', name: 'Brow Lamination', blurb: 'Brushed-up, feathered arches that stay put through monsoon and gym.', imageUrl: PHOTO.browClose, featured: true },
  { id: 'af-cat-henna', name: 'Henna Brows', blurb: 'Natural henna stain that tints hair and skin for a soft powdered shape.', imageUrl: PHOTO.consult },
  { id: 'af-cat-microblading', name: 'Microblading & Powder Brows (Ombre)', blurb: 'Semi-permanent hair strokes and machine-shaded ombre, 12–18 months.', imageUrl: PHOTO.browClose },
  { id: 'af-cat-pmu', name: 'Eyeliner / Lip Blush Permanent Makeup', blurb: 'Lash-line eyeliner, kohl effects and lip blush by certified PMU artists.', imageUrl: PHOTO.skinJournalTwo },
  { id: 'af-cat-eye-care', name: 'Under-eye Treatment & Eye Care Facials', blurb: 'Brightening, de-puffing and collagen eye facials for tired eye areas.', imageUrl: PHOTO.skinTreatment },
  { id: 'af-cat-bridal', name: 'Bridal Eye Rituals', blurb: 'The bridal eye package: trial, wedding-day lashes, brow architecture and under-eye care in one plan.', imageUrl: PHOTO.glowOffer },
  { id: 'af-cat-combos', name: 'Combo Packages & Memberships', blurb: 'Lash + brow combos and the Flutter Club monthly membership.', imageUrl: PHOTO.skinJournalThree },
];

/** 60 services across the 15 categories — every price in ₹, Indian formatting. */
export const ARCH_FLUTTER_SERVICES: SalonService[] = [
  // 1 · Classic Lash Extensions
  { id: 'af-1', name: 'Classic 1:1 Natural Full Set', category: 'Classic Lash Extensions', durationMinutes: 90, price: 2499, description: 'One silk extension per natural lash for an elegant, everyday polished look. Includes cleanse, face-map and aftercare kit.', icon: 'remove_red_eye', popular: true, imageUrl: PHOTO.lashSet },
  { id: 'af-2', name: 'Classic Half Set (Outer Corner Flutter)', category: 'Classic Lash Extensions', durationMinutes: 45, price: 1499, description: 'Lashes on the outer half of each eye for a soft cat-eye lift — perfect first-timers.', icon: 'remove_red_eye', imageUrl: PHOTO.lashSet },
  { id: 'af-3', name: 'Classic Set with Coloured Accent Lashes', category: 'Classic Lash Extensions', durationMinutes: 100, price: 2799, description: 'Classic base with 8–12 hand-placed colour accents (rose, gold, mauve or espresso).', icon: 'palette', imageUrl: PHOTO.lashSet },
  { id: 'af-4', name: 'Bottom Lash Line Add-on', category: 'Classic Lash Extensions', durationMinutes: 30, price: 899, description: 'Feather-light bottom lashes to balance a top set. Book with any full set.', icon: 'visibility', imageUrl: PHOTO.lashSet },
  // 2 · Volume Lash Extensions
  { id: 'af-5', name: 'Russian Volume 2D–3D Full Set', category: 'Volume Lash Extensions', durationMinutes: 120, price: 3499, description: 'Hand-made fans of two to three lashes per natural lash — soft darkness with zero weight.', icon: 'auto_awesome', popular: true, imageUrl: PHOTO.lashMacro },
  { id: 'af-6', name: 'Volume 4D–6D Fluffy Full Set', category: 'Volume Lash Extensions', durationMinutes: 140, price: 4299, description: 'Denser cashmere fans for a fluffy, camera-ready finish that still protects your natural lash.', icon: 'auto_awesome', imageUrl: PHOTO.lashMacro },
  { id: 'af-7', name: 'Custom Mapping Set (Cat-eye / Doll-eye)', category: 'Volume Lash Extensions', durationMinutes: 130, price: 3999, description: 'Lengths and curls mapped to your eye shape — lifted cat-eye or open doll-eye.', icon: 'design_services', imageUrl: PHOTO.lashMacro },
  { id: 'af-8', name: 'Mega Volume 8D–10D Full Set', category: 'Volume Lash Extensions', durationMinutes: 160, price: 5499, description: 'Ultra-fine 8D–10D fans for intense, editorial darkness. Patch test required.', icon: 'whatshot', imageUrl: PHOTO.lashMacro },
  // 3 · Hybrid Lash Extensions
  { id: 'af-9', name: 'Hybrid 50:50 Full Set', category: 'Hybrid Lash Extensions', durationMinutes: 105, price: 2999, description: 'Classic lashes and volume fans blended half-and-half for textured, natural depth.', icon: 'tune', popular: true, imageUrl: PHOTO.browFace },
  { id: 'af-10', name: 'Hybrid Wispy Textured Full Set', category: 'Hybrid Lash Extensions', durationMinutes: 115, price: 3299, description: 'Spiked wispy tips through a hybrid base — the most-requested Instagram finish.', icon: 'tune', imageUrl: PHOTO.browFace },
  { id: 'af-11', name: 'Hybrid Set + Brow Thread Duo', category: 'Hybrid Lash Extensions', durationMinutes: 130, price: 3299, description: 'Hybrid lashes plus a precision brow thread and shape in one appointment.', icon: 'content_cut', imageUrl: PHOTO.browFace },
  // 4 · Mega Volume / Wispy / Anime / Manga
  { id: 'af-12', name: 'Mega Volume 12D+ Statement Set', category: 'Mega Volume / Wispy / Anime / Manga', durationMinutes: 180, price: 5999, description: 'Our densest set: 12D+ nano fans for a full glam, editorial lash line.', icon: 'local_fire_department', imageUrl: PHOTO.lashMacro },
  { id: 'af-13', name: 'Wispy K-pop Lash Set', category: 'Mega Volume / Wispy / Anime / Manga', durationMinutes: 150, price: 4499, description: 'Feathered, spiky-tipped wispy set inspired by Korean idol lash lines.', icon: 'sparkles', popular: true, imageUrl: PHOTO.lashSet },
  { id: 'af-14', name: 'Anime / Manga Spike Lash Set', category: 'Mega Volume / Wispy / Anime / Manga', durationMinutes: 150, price: 4799, description: 'Defined spikes at measured intervals for that drawn-on anime eye.', icon: 'bolt', imageUrl: PHOTO.lashSet },
  { id: 'af-15', name: 'Wet-look Spiked Lash Set', category: 'Mega Volume / Wispy / Anime / Manga', durationMinutes: 140, price: 4299, description: 'Closed-tip fans for a glossy, liner-effect wet look.', icon: 'water_drop', imageUrl: PHOTO.lashSet },
  { id: 'af-16', name: 'Coloured Anime Accent Set', category: 'Mega Volume / Wispy / Anime / Manga', durationMinutes: 150, price: 4999, description: 'Anime spikes with rose-gold or mauve colour spikes woven through.', icon: 'palette', imageUrl: PHOTO.lashSet },
  // 5 · Lash Lift & Tint
  { id: 'af-17', name: 'Keratin Lash Lift & Deep Black Tint', category: 'Lash Lift & Tint', durationMinutes: 60, price: 1999, description: 'Perms your natural lashes from the root with protein-rich keratin, then tints them deep black. Mascara-free for 6–8 weeks.', icon: 'auto_awesome', popular: true, imageUrl: PHOTO.beautyFace },
  { id: 'af-18', name: 'Lash Lift + Tint + Brow Thread', category: 'Lash Lift & Tint', durationMinutes: 75, price: 2299, description: 'The full eye refresh: lifted, tinted lashes plus a clean brow shape.', icon: 'content_cut', imageUrl: PHOTO.beautyFace },
  { id: 'af-19', name: 'Lash Botox / Keratin Infusion', category: 'Lash Lift & Tint', durationMinutes: 70, price: 2499, description: 'Lift with a conditioning botox infusion that plumps and thickens natural lashes over repeat visits.', icon: 'spa', imageUrl: PHOTO.beautyFace },
  { id: 'af-20', name: 'Lash Tint Only', category: 'Lash Lift & Tint', durationMinutes: 30, price: 799, description: 'Deep black or brown-black tint for naturally pale lashes.', icon: 'format_color_fill', imageUrl: PHOTO.beautyFace },
  // 6 · Lash Refill & Removal
  { id: 'af-21', name: 'Volume / Hybrid Refill (within 3 weeks)', category: 'Lash Refill & Removal', durationMinutes: 75, price: 1799, description: 'Infills for sets done at Arch & Flutter within 21 days, with 50%+ retention.', icon: 'autorenew', popular: true, imageUrl: PHOTO.consult },
  { id: 'af-22', name: 'Classic Refill (within 3 weeks)', category: 'Lash Refill & Removal', durationMinutes: 60, price: 1399, description: 'Classic set infill within 21 days. Cleanse, removal of grown-outs and refill.', icon: 'autorenew', imageUrl: PHOTO.consult },
  { id: 'af-23', name: 'Refill after 4+ Weeks (full-set rate)', category: 'Lash Refill & Removal', durationMinutes: 90, price: 2499, description: 'Beyond four weeks we rebuild the set — charged at the matching full-set price.', icon: 'update', imageUrl: PHOTO.consult },
  { id: 'af-24', name: 'Safe Lash Removal + Care Serum', category: 'Lash Refill & Removal', durationMinutes: 30, price: 699, description: 'Gel remover applied lash-by-lash — never pulled — finished with a nourishing serum.', icon: 'sanitizer', imageUrl: PHOTO.consult },
  // 7 · Brow Shaping & Threading
  { id: 'af-25', name: 'Signature Brow Thread & Shape', category: 'Brow Shaping & Threading', durationMinutes: 15, price: 99, description: 'Our house shape: threaded, tweezed and finished with aloe gel.', icon: 'content_cut', popular: true, imageUrl: PHOTO.browFace },
  { id: 'af-26', name: 'Brow Mapping + Precision Shape', category: 'Brow Shaping & Threading', durationMinutes: 30, price: 399, description: 'Golden-ratio mapping with calipers and pencil design before a single thread touches you.', icon: 'design_services', imageUrl: PHOTO.browFace },
  { id: 'af-27', name: 'Brow + Upper Lip Thread Duo', category: 'Brow Shaping & Threading', durationMinutes: 25, price: 199, description: 'Brow shape and upper lip thread in one quick visit.', icon: 'content_cut', imageUrl: PHOTO.browFace },
  { id: 'af-28', name: 'Full Face Threading', category: 'Brow Shaping & Threading', durationMinutes: 45, price: 699, description: 'Brows, upper lip, chin, forehead and sideburns — threaded and soothed.', icon: 'face', imageUrl: PHOTO.browFace },
  // 8 · Brow Waxing & Tinting
  { id: 'af-29', name: 'Brow Wax & Shape', category: 'Brow Waxing & Tinting', durationMinutes: 25, price: 499, description: 'Low-temperature wax for crisp clean lines, finished with cold gel.', icon: 'ac_unit', imageUrl: PHOTO.beautyFace },
  { id: 'af-30', name: 'Brow Tint (Vegetable / Oxidative)', category: 'Brow Waxing & Tinting', durationMinutes: 30, price: 699, description: 'Tint matched to your hair root — soft or defined, your call.', icon: 'format_color_fill', imageUrl: PHOTO.beautyFace },
  { id: 'af-31', name: 'Brow Wax + Tint Duo', category: 'Brow Waxing & Tinting', durationMinutes: 40, price: 999, description: 'Shape and tint together for four to six weeks of wake-up-ready brows.', icon: 'auto_awesome', popular: true, imageUrl: PHOTO.beautyFace },
  { id: 'af-32', name: "Men's Brow Cleanup & Tint", category: 'Brow Waxing & Tinting', durationMinutes: 25, price: 599, description: 'Neat, natural male brow cleanup with optional grey-blending tint.', icon: 'badge', imageUrl: PHOTO.beautyFace },
  // 9 · Brow Lamination
  { id: 'af-33', name: 'Brow Lamination (Feathered Brushed-up)', category: 'Brow Lamination', durationMinutes: 50, price: 1799, description: 'Restructures brow hairs upward and uniform for full, fluffy model arches. Lasts 6–8 weeks.', icon: 'brush', popular: true, imageUrl: PHOTO.browClose },
  { id: 'af-34', name: 'Lamination + Tint', category: 'Brow Lamination', durationMinutes: 65, price: 2199, description: 'Lamination with a tint to define the tail and cover greys.', icon: 'brush', imageUrl: PHOTO.browClose },
  { id: 'af-35', name: 'Lamination + Tint + Thread', category: 'Brow Lamination', durationMinutes: 75, price: 2499, description: 'The complete brow reset: shape, lift and colour in one sitting.', icon: 'brush', imageUrl: PHOTO.browClose },
  { id: 'af-36', name: 'Brow Botox / Keratin Conditioning', category: 'Brow Lamination', durationMinutes: 40, price: 1499, description: 'Deep-conditioning treatment that repairs over-processed or sparse brows.', icon: 'spa', imageUrl: PHOTO.browClose },
  // 10 · Henna Brows
  { id: 'af-37', name: 'Natural Henna Brow Stain', category: 'Henna Brows', durationMinutes: 45, price: 1299, description: 'Plant-based henna stains hair and skin for a soft powdered brow, 2–4 weeks on skin.', icon: 'eco', imageUrl: PHOTO.consult },
  { id: 'af-38', name: 'Henna Brows + Thread & Shape', category: 'Henna Brows', durationMinutes: 60, price: 1499, description: 'Shape first, then henna — the fullest natural-looking finish we do.', icon: 'eco', popular: true, imageUrl: PHOTO.consult },
  { id: 'af-39', name: 'Henna Brow Touch-up', category: 'Henna Brows', durationMinutes: 30, price: 799, description: 'Colour refresh within four weeks of your henna appointment.', icon: 'eco', imageUrl: PHOTO.consult },
  // 11 · Microblading & Powder Brows
  { id: 'af-40', name: 'Microblading Hair-stroke Brows (first sitting)', category: 'Microblading & Powder Brows (Ombre)', durationMinutes: 150, price: 9999, description: 'Ultra-fine manual hair strokes with organic pigment, mapped by golden ratio. Touch-up included at 6 weeks.', icon: 'edit', popular: true, imageUrl: PHOTO.browClose },
  { id: 'af-41', name: 'Powder / Ombre Brows (machine shading)', category: 'Microblading & Powder Brows (Ombre)', durationMinutes: 150, price: 10999, description: 'Soft pixelated shading like a powdered makeup finish — ideal for oily skin.', icon: 'gradient', imageUrl: PHOTO.browClose },
  { id: 'af-42', name: 'Nano-blading Ultra-fine Strokes', category: 'Microblading & Powder Brows (Ombre)', durationMinutes: 165, price: 12999, description: 'Single-needle machine strokes for the finest, longest-lasting hair pattern.', icon: 'draw', imageUrl: PHOTO.browClose },
  { id: 'af-43', name: 'Combination Brows (strokes + shade)', category: 'Microblading & Powder Brows (Ombre)', durationMinutes: 170, price: 11999, description: 'Hair strokes at the front blending into a powdered tail — best of both.', icon: 'tune', imageUrl: PHOTO.browClose },
  { id: 'af-44', name: 'PMU Touch-up (4–8 weeks)', category: 'Microblading & Powder Brows (Ombre)', durationMinutes: 60, price: 2999, description: 'Perfection pass for work done at Arch & Flutter within eight weeks.', icon: 'autorenew', imageUrl: PHOTO.browClose },
  { id: 'af-45', name: 'Colour Correction / Removal Consultation', category: 'Microblading & Powder Brows (Ombre)', durationMinutes: 45, price: 1499, description: 'Assessment of old or migrated pigment with a written correction plan.', icon: 'find_replace', imageUrl: PHOTO.browClose },
  // 12 · Eyeliner / Lip Blush PMU
  { id: 'af-46', name: 'Permanent Eyeliner (lash-line or wing)', category: 'Eyeliner / Lip Blush Permanent Makeup', durationMinutes: 120, price: 8999, description: 'Classic lash-line enhancement or a soft wing, numbed and machine-shaded.', icon: 'edit', imageUrl: PHOTO.skinJournalTwo },
  { id: 'af-47', name: 'Waterline Kohl Effect Eyeliner', category: 'Eyeliner / Lip Blush Permanent Makeup', durationMinutes: 135, price: 9999, description: 'Smudged kohl-look liner above and below the lash line.', icon: 'remove_red_eye', imageUrl: PHOTO.skinJournalTwo },
  { id: 'af-48', name: 'Lip Blush / Lip Ombre', category: 'Eyeliner / Lip Blush Permanent Makeup', durationMinutes: 150, price: 11999, description: 'Semi-permanent lip colour that evens tone and adds a natural flush.', icon: 'favorite', popular: true, imageUrl: PHOTO.skinJournalTwo },
  { id: 'af-49', name: 'PMU Consultation + Patch Test', category: 'Eyeliner / Lip Blush Permanent Makeup', durationMinutes: 30, price: 499, description: 'Mapping, colour choice and patch test before any permanent work.', icon: 'shield', imageUrl: PHOTO.skinJournalTwo },
  { id: 'af-50', name: 'PMU Colour Boost (12–18 months)', category: 'Eyeliner / Lip Blush Permanent Makeup', durationMinutes: 75, price: 3499, description: 'Refresh of faded Arch & Flutter permanent makeup.', icon: 'autorenew', imageUrl: PHOTO.skinJournalTwo },
  // 13 · Under-eye Treatment & Eye Care Facials
  { id: 'af-51', name: 'Under-eye Dark Circle Brightening', category: 'Under-eye Treatment & Eye Care Facials', durationMinutes: 45, price: 1699, description: 'Vitamin C and caffeine infusion with cooling massage for dark circles.', icon: 'wb_sunny', imageUrl: PHOTO.skinTreatment },
  { id: 'af-52', name: 'Puffiness & Eye De-congest Massage', category: 'Under-eye Treatment & Eye Care Facials', durationMinutes: 40, price: 1299, description: 'Lymphatic drainage massage with cold jade tools to de-puff tired eyes.', icon: 'ac_unit', imageUrl: PHOTO.skinTreatment },
  { id: 'af-53', name: 'Collagen Eye-care Facial', category: 'Under-eye Treatment & Eye Care Facials', durationMinutes: 60, price: 2299, description: 'Collagen pads, peptide serum and LED for fine lines around the eyes.', icon: 'spa', popular: true, imageUrl: PHOTO.skinTreatment },
  { id: 'af-54', name: 'Gold Eye Glow Facial (lash lift add-on)', category: 'Under-eye Treatment & Eye Care Facials', durationMinutes: 75, price: 2799, description: '24k gold eye facial paired with a keratin lash lift for event-ready eyes.', icon: 'auto_awesome', imageUrl: PHOTO.skinTreatment },
  // 14 · Bridal Eye Rituals (the bridal eye package)
  { id: 'af-55', name: 'Signature Bridal Eye Ritual (lashes, brows & care)', category: 'Bridal Eye Rituals', durationMinutes: 180, price: 7999, description: 'Trial-mapped volume lashes, brow lamination and tint, under-eye brightening and a wedding-day touch-up kit.', icon: 'diamond', popular: true, imageUrl: PHOTO.glowOffer },
  { id: 'af-56', name: 'Bridal Trial Eye Look', category: 'Bridal Eye Rituals', durationMinutes: 90, price: 2999, description: 'A full rehearsal of your wedding-day lash and brow design, photographed for reference.', icon: 'photo_camera', imageUrl: PHOTO.glowOffer },
  { id: 'af-57', name: 'Pre-bridal 3-Sitting Eye Care Plan', category: 'Bridal Eye Rituals', durationMinutes: 180, price: 5499, description: 'Three spaced sittings of brightening, de-puffing and conditioning before the big day.', icon: 'event_available', imageUrl: PHOTO.glowOffer },
  { id: 'af-58', name: 'Sangeet / Reception Flutter Lash Set', category: 'Bridal Eye Rituals', durationMinutes: 120, price: 4499, description: 'Wispy hybrid set designed to catch stage and camera light.', icon: 'celebration', imageUrl: PHOTO.glowOffer },
  { id: 'af-59', name: 'Family Bridal Eye Ritual (3 guests)', category: 'Bridal Eye Rituals', durationMinutes: 300, price: 12999, description: 'Lash lifts or classic sets and brow shaping for the bride plus two family members.', icon: 'groups', imageUrl: PHOTO.glowOffer },
  // 15 · Combo Packages & Memberships
  { id: 'af-60', name: 'Flutter Club Monthly Membership', category: 'Combo Packages & Memberships', durationMinutes: 90, price: 1999, description: 'One refill or lash lift every month, 10% off all brow services and priority slots. Billed monthly, pause anytime.', icon: 'workspace_premium', popular: true, imageUrl: PHOTO.skinJournalThree },
  { id: 'af-61', name: 'Signature Combo: Volume Lashes + Brow Lamination', category: 'Combo Packages & Memberships', durationMinutes: 170, price: 4999, description: 'Our two most-loved services in one appointment — save ₹299.', icon: 'auto_awesome', imageUrl: PHOTO.skinJournalThree },
  { id: 'af-62', name: 'Everyday Combo: Classic Lashes + Brow Thread + Tint', category: 'Combo Packages & Memberships', durationMinutes: 120, price: 3199, description: 'The complete everyday eye: classic set, clean shape and brow tint.', icon: 'checklist', imageUrl: PHOTO.skinJournalThree },
  { id: 'af-63', name: 'Eye Glow Duo: Lash Lift + Under-eye Brightening', category: 'Combo Packages & Memberships', durationMinutes: 105, price: 3299, description: 'Lifted lashes and bright under-eyes — the no-makeup glow pairing.', icon: 'wb_sunny', imageUrl: PHOTO.skinJournalThree },
  { id: 'af-64', name: 'Lash & Brow Starter Bundle', category: 'Combo Packages & Memberships', durationMinutes: 100, price: 2799, description: 'First visit? Lash lift, brow thread and henna stain with a written aftercare plan.', icon: 'redeem', imageUrl: PHOTO.skinJournalThree },
];

export const ARCH_FLUTTER_TEMPLATE_SERVICES: SalonService[] = ARCH_FLUTTER_SERVICES.map(
  (service) => ({ ...service, origin: 'template' as const }),
);

export const ARCH_FLUTTER_DEFAULT_STYLISTS: Stylist[] = [
  {
    id: 'af-st-1',
    name: 'Meher Kothari',
    role: 'Founder & Master Lash Artist',
    avatarUrl: PHOTO.portraitOne,
    specialties: ['Russian Volume', 'Mega Volume', 'Lash Mapping'],
    rating: 4.98,
    bio: 'Certified lash educator with 9,000+ sets to her name. Meher maps every eye by hand and refuses to place a fan that stresses a natural lash.',
  },
  {
    id: 'af-st-2',
    name: 'Ritika Saini',
    role: 'Brow Architect & Lamination Specialist',
    avatarUrl: PHOTO.portraitTwo,
    specialties: ['Brow Lamination', 'Golden-ratio Mapping', 'Henna'],
    rating: 4.96,
    bio: 'Ritika rebuilds over-plucked brows with calipers, pencil and patience — her laminations are the most photographed arches in C-Scheme.',
  },
  {
    id: 'af-st-3',
    name: 'Aisha Qureshi',
    role: 'Certified PMU Artist (Microblading & Powder Brows)',
    avatarUrl: PHOTO.portraitThree,
    specialties: ['Microblading', 'Powder Brows', 'Lip Blush'],
    rating: 4.95,
    bio: 'International PMU certification, single-use cartridges opened in front of you, and pigment matched to your natural hair root.',
  },
  {
    id: 'af-st-4',
    name: 'Devika Rathore',
    role: 'Bridal Eye Specialist',
    avatarUrl: PHOTO.portraitFour,
    specialties: ['Bridal Packages', 'Event Lashes', 'Eye Care Facials'],
    rating: 4.94,
    bio: 'Devika plans bridal eye timelines backwards from the pheras, so lashes peak exactly when the camera finds you.',
  },
];

export const ARCH_FLUTTER_DEFAULT_STATS: ArchFlutterStat[] = [
  { id: 'af-stat-1', value: '9,400+', label: 'Lash sets placed since 2019' },
  { id: 'af-stat-2', value: '4.9★', label: 'Average of 1,200+ Google reviews' },
  { id: 'af-stat-3', value: '100%', label: 'Vegan, fume-free adhesives' },
  { id: 'af-stat-4', value: '6–8 wks', label: 'Typical lift & lamination wear' },
];

export const ARCH_FLUTTER_DEFAULT_PACKAGES: ArchFlutterPackage[] = [
  {
    id: 'af-pkg-1',
    tier: 'Everyday',
    name: 'The Everyday Flutter',
    price: 2999,
    durationMinutes: 120,
    includes: ['Classic 1:1 full set or keratin lash lift', 'Signature brow thread & shape', 'Aftercare kit + written plan', '10% off your next refill'],
    imageUrl: PHOTO.lashSet,
  },
  {
    id: 'af-pkg-2',
    tier: 'Signature',
    name: 'The Signature Arch',
    price: 4999,
    durationMinutes: 170,
    includes: ['Volume 2D–3D or hybrid full set', 'Brow lamination with tint', 'Under-eye brightening mask', 'Priority rebooking for 8 weeks'],
    imageUrl: PHOTO.lashMacro,
    highlight: true,
    note: 'Most booked · save ₹299',
  },
  {
    id: 'af-pkg-3',
    tier: 'Bridal',
    name: 'The Bridal Flutter',
    price: 7999,
    durationMinutes: 180,
    includes: ['Trial eye look, photographed', 'Wedding-day volume lashes + brow architecture', 'Under-eye care sitting before the day', 'Wedding-morning touch-up kit'],
    imageUrl: PHOTO.glowOffer,
  },
  {
    id: 'af-pkg-4',
    tier: 'Membership',
    name: 'Flutter Club (monthly)',
    price: 1999,
    durationMinutes: 90,
    includes: ['One refill or lash lift every month', '10% off all brow services', 'Members-only priority slots', 'Pause or cancel anytime'],
    imageUrl: PHOTO.skinJournalThree,
    note: 'Billed monthly in ₹',
  },
];

export const ARCH_FLUTTER_DEFAULT_BEFORE_AFTER: import('../types').ArchFlutterBeforeAfter[] = [
  {
    id: 'af-ba-1',
    title: 'Sparse natural lashes → Russian Volume 3D',
    alt: 'Volume lash extension transformation',
    before: PHOTO.beautyFace,
    after: PHOTO.lashMacro,
  },
  {
    id: 'af-ba-2',
    title: 'Over-plucked brows → laminated & tinted arch',
    alt: 'Brow lamination and tint transformation',
    before: PHOTO.consult,
    after: PHOTO.browFace,
  },
];

export const ARCH_FLUTTER_DEFAULT_REELS: ArchFlutterReel[] = [
  { id: 'af-reel-1', title: 'Lash application, lash by lash', caption: 'Classic 1:1 · step by step', posterUrl: A('reels/poster-lash-application.jpg'), sourceUrl: 'https://www.youtube.com/shorts/x5FixAITeDY' },
  { id: 'af-reel-2', title: 'Brow lamination transformation', caption: 'Brushed-up arch in 50 minutes', posterUrl: A('reels/poster-brow-lamination.jpg'), sourceUrl: 'https://www.youtube.com/shorts/4d9MZe_vpUY' },
  { id: 'af-reel-3', title: 'Lash lift & tint reveal', caption: 'The instant “wow” moment', posterUrl: A('reels/poster-lash-lift.jpg'), sourceUrl: 'https://www.youtube.com/shorts/xhrLIpz9q5I' },
  { id: 'af-reel-4', title: 'Studio tour — C-Scheme, Jaipur', caption: 'Blush · ivory · champagne gold', posterUrl: A('reels/poster-studio-tour.jpg'), sourceUrl: 'https://www.youtube.com/shorts/eyOuZBqP-hI' },
  { id: 'af-reel-5', title: 'Aftercare: make your set last', caption: 'Wash, brush, sleep well', posterUrl: A('reels/poster-aftercare.jpg'), sourceUrl: 'https://www.youtube.com/shorts/-CEYQkj3EB8' },
];

export const ARCH_FLUTTER_DEFAULT_FEATURED_VIDEO: ArchFlutterReel = {
  id: 'af-featured',
  title: 'Brow lamination, step by step',
  caption: 'Featured film · mapping, lift, set and style',
  posterUrl: A('reels/poster-brow-lamination.jpg'),
  sourceUrl: 'https://www.youtube.com/watch?v=ySQA9OvRklE',
};

export const ARCH_FLUTTER_DEFAULT_REVIEWS: ArchFlutterReview[] = [
  { id: 'af-rv-1', name: 'Sneha Agarwal', area: 'Vaishali Nagar, Jaipur', rating: 5, service: 'Russian Volume 3D Full Set', quote: 'Third set with Meher and my natural lashes are healthier than before she started. Lightest lashes in Jaipur, I have compared.', avatarUrl: PHOTO.avatarOne },
  { id: 'af-rv-2', name: 'Priyanka Choudhary', area: 'Malviya Nagar, Jaipur', rating: 5, service: 'Brow Lamination + Tint', quote: 'Ritika mapped my brows with actual calipers before touching them. Six weeks later they still brush up perfectly. Worth every rupee.', avatarUrl: PHOTO.avatarTwo },
  { id: 'af-rv-3', name: 'Farah Siddiqui', area: 'Raja Park, Jaipur', rating: 5, service: 'Microblading (first sitting)', quote: 'Aisha explained the pigment, showed the sealed cartridge and numbed me properly. The strokes look like my own brow, just… more of it.', avatarUrl: PHOTO.avatarThree },
  { id: 'af-rv-4', name: 'Kavya Sharma', area: 'Mansarovar, Jaipur', rating: 4, service: 'Signature Bridal Eye Ritual', quote: 'My wedding lashes survived the pheras, the rain and the after-party. Only wish I had booked the trial a week earlier — slots fill fast.', avatarUrl: PHOTO.avatarFour },
];

export const ARCH_FLUTTER_DEFAULT_FAQS: ArchFlutterFaq[] = [
  { id: 'af-faq-1', question: 'Will lash extensions damage my natural lashes?', answer: 'Not when isolated correctly. We place one extension (or one hand-made fan) per natural lash, choose a weight your lash can carry, and never stick lashes together. That is why our refills look clean at three weeks.' },
  { id: 'af-faq-2', question: 'How long does a full set take, and can I wear makeup after?', answer: 'Classic sets take about 90 minutes, volume 2–3 hours. Skip eye makeup for 24 hours; after that, oil-free products only so the adhesive keeps its bond.' },
  { id: 'af-faq-3', question: 'Is microblading painful? How long does it last?', answer: 'We numb the area twice, so most clients rate it 2/10. Hair strokes last 12–18 months on normal skin; oily skin holds powder/ombre brows better. A touch-up at 6 weeks is included in the first-sitting price.' },
  { id: 'af-faq-4', question: 'Do you do a patch test before treatments?', answer: 'Yes — adhesive and tint patch tests 24–48 hours before your first lash or tint appointment, and before every PMU session. It is free and takes ten minutes.' },
  { id: 'af-faq-5', question: 'How do I pay? Can I pay at the salon?', answer: 'Pay via UPI (GPay, PhonePe, Paytm), card, net banking or simply pay at the salon after your appointment. A small advance holds bridal and PMU slots; every price shown is GST-inclusive.' },
  { id: 'af-faq-6', question: 'What if I am running late or need to reschedule?', answer: 'WhatsApp us and we will hold your bed for 15 minutes. Reschedules are free up to 12 hours before your slot — after that we move you to the next open bed without losing your advance.' },
];

export const ARCH_FLUTTER_DEFAULT_POSTS: ArchFlutterPost[] = [
  { id: 'af-post-1', title: 'The 48-hour rule: caring for new lash extensions', excerpt: 'Steam, saunas and sleep position decide how your set settles. Here is exactly what we tell every client before they leave the bed.', body: 'For the first 48 hours the adhesive is still curing: keep steam away (no facials, no dal on full boil in front of your face), sleep on your back if you can, and do not touch or pick. From day three, wash daily with a lash shampoo and brush with a clean spoolie. Clients who wash daily keep sets 25–30% longer — the oils, not water, are what break the bond.', imageUrl: PHOTO.skinJournalOne, tag: 'Aftercare', minutes: 3 },
  { id: 'af-post-2', title: 'Lash lift vs extensions: which is right for you?', excerpt: 'A lift curls what you already have; extensions add length and density. A simple checklist to choose.', body: 'Choose a lift if your lashes are straight but reasonably dense, you want zero upkeep, or you swim and gym daily. Choose extensions if you want visible length or drama, have sparse lashes, or have an event in the calendar. Not sure? Book a 15-minute consult — we will look at your lash line and tell you honestly, even if the answer is the cheaper option.', imageUrl: PHOTO.beautyFace, tag: 'Guide', minutes: 4 },
  { id: 'af-post-3', title: 'Why we map brows with calipers, not guesswork', excerpt: 'Golden-ratio mapping finds the arch your bone structure already has. What to expect in the chair.', body: 'We measure three points — the start (nostril to inner eye), the arch (nostril through the pupil) and the tail (nostril to outer eye) — then mirror them across your face with a pencil before any hair is removed. The result is a shape that belongs to you, not a stencil. Bring a photo of brows you love and we will tell you what is possible on your hair growth.', imageUrl: PHOTO.consult, tag: 'Brows', minutes: 3 },
  { id: 'af-post-4', title: 'Microblading aftercare: weeks 1–6, day by day', excerpt: 'What healing really looks like — the dark phase, the ghosting phase, and why the touch-up matters.', body: 'Days 1–3 the strokes look 30% darker; days 4–10 they flake and can look too light (the “ghosting” phase — this is normal); weeks 3–6 the true colour surfaces as the skin closes. Avoid sweat, sun and swimming for ten days, and never pick the flakes. The 6-week touch-up is where we perfect density — skipping it is the most common reason microblading “does not last”.', imageUrl: PHOTO.skinJournalThree, tag: 'PMU', minutes: 5 },
];

export const ARCH_FLUTTER_DEFAULT_OFFERS: ArchFlutterOffer[] = [
  { id: 'af-offer-1', headline: 'Festive Flutter: 15% off all volume sets', detail: 'Book any Volume, Hybrid or Mega Volume full set this month and save 15%. Includes a free under-eye mask on the day.', code: 'FLUTTER15', imageUrl: PHOTO.glowOffer },
  { id: 'af-offer-2', headline: 'Bridal season: free under-eye care with the bridal eye ritual', detail: 'Every Signature Bridal Eye Ritual booked for this wedding season includes a complimentary under-eye brightening sitting for the bride.', code: 'BRIDE26', imageUrl: PHOTO.spaInterior },
];

export const ARCH_FLUTTER_TRUST: Array<{ id: string; title: string; detail: string }> = [
  { id: 'af-trust-1', title: 'Vegan, fume-free adhesives', detail: 'Latex-free, formaldehyde-free and safe for sensitive eyes.' },
  { id: 'af-trust-2', title: 'Single-use, sterilised tools', detail: 'Cartridges and tweezers opened or autoclaved in front of you.' },
  { id: 'af-trust-3', title: 'Certified lash & PMU artists', detail: 'Internationally certified, insured and annually re-trained.' },
  { id: 'af-trust-4', title: 'Honest ₹ pricing, GST included', detail: 'The price on the menu is the price you pay. No surprises.' },
];

export const ARCH_FLUTTER_VISIT_STEPS: Array<{ id: string; title: string; detail: string }> = [
  { id: 'af-step-1', title: 'Consult & patch test', detail: 'Ten minutes on your eye area, your routine and a free patch test.' },
  { id: 'af-step-2', title: 'Map & design', detail: 'Golden-ratio mapping and a pencil design you approve before we begin.' },
  { id: 'af-step-3', title: 'Create', detail: 'You rest on a warm bed; we isolate, place and set, lash by lash.' },
  { id: 'af-step-4', title: 'Aftercare plan', detail: 'A written plan, a brush and a WhatsApp line for anything after.' },
];

const hex = (value: string | undefined, fallback: string): string =>
  /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test((value || '').trim()) ? (value || '').trim() : fallback;

export interface ResolvedArchFlutterConfig {
  selectorLabel: string;
  heroKicker: string;
  heroHeading: string;
  heroSubtext: string;
  heroImageUrl: string;
  aboutHeading: string;
  aboutStory: string;
  aboutImageUrl: string;
  categoriesHeading: string;
  categoriesSubtext: string;
  servicesHeading: string;
  servicesSubtext: string;
  packagesHeading: string;
  packagesSubtext: string;
  resultsHeading: string;
  reelsHeading: string;
  reelsSubtext: string;
  teamHeading: string;
  reviewsHeading: string;
  galleryHeading: string;
  offersHeading: string;
  journalHeading: string;
  contactHeading: string;
  bookingHeading: string;
  bookingSubtext: string;
  ctaBannerImageUrl: string;
  footerImageUrl: string;
  publicEmail: string;
  workingHoursDisplay: string;
  mapEmbedUrl: string;
  established: string;
  showGstNote: boolean;
  colors: ArchFlutterColors;
  stats: ArchFlutterStat[];
  categories: ArchFlutterCategory[];
  packages: ArchFlutterPackage[];
  beforeAfter: import('../types').ArchFlutterBeforeAfter[];
  reels: ArchFlutterReel[];
  featuredVideo: ArchFlutterReel;
  reviews: ArchFlutterReview[];
  faqs: ArchFlutterFaq[];
  posts: ArchFlutterPost[];
  offers: ArchFlutterOffer[];
  galleryUrls: Array<{ src: string; fallback: string }>;
  openTime: string;
  closeTime: string;
}

const list = <T,>(value: T[] | undefined, fallback: T[]): T[] =>
  Array.isArray(value) && value.length > 0 ? value : fallback;

/** Resolve stored owner content over the bundled demo content. */
export function resolveArchFlutterConfig(profile: SalonProfile): ResolvedArchFlutterConfig {
  const raw: ArchFlutterConfig = profile.archFlutter || {};
  const colors = raw.colors || {};
  const tagline = (profile.tagline || '').trim();
  const cover = (profile.coverImageUrl || '').trim();
  const gallery = list(raw.galleryUrls, ARCH_FLUTTER_IMAGES.gallery.map((entry) => entry.src)).map(
    (url, index) => ({
      src: url,
      fallback: ARCH_FLUTTER_IMAGES.gallery[index % ARCH_FLUTTER_IMAGES.gallery.length].fallback,
    }),
  );
  return {
    selectorLabel: (raw.selectorLabel || '').trim() || ARCH_FLUTTER_SELECTOR_LABEL,
    heroKicker: (raw.heroKicker || '').trim() || ARCH_FLUTTER_HERO_KICKER,
    heroHeading: (raw.heroHeading || '').trim() || ARCH_FLUTTER_HERO_HEADING,
    heroSubtext:
      (raw.heroSubtext || '').trim() ||
      (tagline && tagline !== ARCH_FLUTTER_TAGLINE ? tagline : '') ||
      ARCH_FLUTTER_HERO_SUBTEXT,
    heroImageUrl: (raw.heroImageUrl || '').trim() || (cover && !isLegacyLashStockUrl(cover) ? cover : '') || ARCH_FLUTTER_IMAGES.hero.src,
    aboutHeading: (raw.aboutHeading || '').trim() || 'An eye-area bar, not a full-service salon',
    aboutStory: (raw.aboutStory || '').trim() || (profile.about || '').trim() || ARCH_FLUTTER_DEFAULT_ABOUT,
    aboutImageUrl: (raw.aboutImageUrl || '').trim() || ARCH_FLUTTER_IMAGES.about.src,
    categoriesHeading: (raw.categoriesHeading || '').trim() || 'Fifteen ways to frame an eye',
    categoriesSubtext:
      (raw.categoriesSubtext || '').trim() ||
      'Every lash, brow and eye-area service we offer — tap a tile for the full menu and ₹ prices.',
    servicesHeading: (raw.servicesHeading || '').trim() || 'The full lash & brow menu',
    servicesSubtext:
      (raw.servicesSubtext || '').trim() ||
      'Filter by category. Every price is GST-inclusive and payable by UPI, card, net banking or at the salon.',
    packagesHeading: (raw.packagesHeading || '').trim() || 'Packages & the Flutter Club',
    packagesSubtext:
      (raw.packagesSubtext || '').trim() ||
      'Bundled visits that save you money, and a monthly membership that keeps your set perfect.',
    resultsHeading: (raw.resultsHeading || '').trim() || 'Before & after, unedited',
    reelsHeading: (raw.reelsHeading || '').trim() || 'Featured videos & reels',
    reelsSubtext:
      (raw.reelsSubtext || '').trim() ||
      'Application films, transformations and studio stories. Tap a reel to unmute; open the source to watch full-length.',
    teamHeading: (raw.teamHeading || '').trim() || 'The artists behind the arch',
    reviewsHeading: (raw.reviewsHeading || '').trim() || 'Clients who fluttered out',
    galleryHeading: (raw.galleryHeading || '').trim() || 'From the studio, this month',
    offersHeading: (raw.offersHeading || '').trim() || 'This season at the bar',
    journalHeading: (raw.journalHeading || '').trim() || 'Aftercare journal',
    contactHeading: (raw.contactHeading || '').trim() || 'Find us in C-Scheme',
    bookingHeading: (raw.bookingHeading || '').trim() || 'Book your appointment',
    bookingSubtext:
      (raw.bookingSubtext || '').trim() ||
      'Pick a service and an artist, choose a slot and we will hold the bed for you. Pay at the salon or online by UPI.',
    ctaBannerImageUrl: (raw.ctaBannerImageUrl || '').trim() || ARCH_FLUTTER_IMAGES.ctaBanner.src,
    footerImageUrl: (raw.footerImageUrl || '').trim() || ARCH_FLUTTER_IMAGES.footer.src,
    publicEmail: (raw.publicEmail || '').trim() || (profile.email || '').trim() || ARCH_FLUTTER_DEFAULT_EMAIL,
    workingHoursDisplay: (raw.workingHoursDisplay || '').trim() || ARCH_FLUTTER_DEFAULT_HOURS,
    mapEmbedUrl: (raw.mapEmbedUrl || '').trim(),
    established: (raw.established || '').trim() || ARCH_FLUTTER_DEFAULT_ESTABLISHED,
    showGstNote: raw.showGstNote !== false,
    colors: {
      blush: hex(colors.blush, ARCH_FLUTTER_DEFAULT_COLORS.blush),
      ivory: hex(colors.ivory, ARCH_FLUTTER_DEFAULT_COLORS.ivory),
      espresso: hex(colors.espresso, ARCH_FLUTTER_DEFAULT_COLORS.espresso),
      gold: hex(colors.gold, ARCH_FLUTTER_DEFAULT_COLORS.gold),
      // The workspace accent colour (onboarding / Owner Workspace) drives the
      // dusty-mauve accent, exactly like Templates 09–12 fold it into their
      // own palettes.
      mauve: hex(colors.mauve || profile.customAccentColor, ARCH_FLUTTER_DEFAULT_COLORS.mauve),
    },
    stats: list(raw.stats, ARCH_FLUTTER_DEFAULT_STATS),
    categories: list(raw.categories, ARCH_FLUTTER_CATEGORIES),
    packages: list(raw.packages, ARCH_FLUTTER_DEFAULT_PACKAGES),
    beforeAfter: list(raw.beforeAfter, ARCH_FLUTTER_DEFAULT_BEFORE_AFTER),
    reels: list(raw.reels, ARCH_FLUTTER_DEFAULT_REELS),
    featuredVideo: raw.featuredVideo && raw.featuredVideo.posterUrl ? raw.featuredVideo : ARCH_FLUTTER_DEFAULT_FEATURED_VIDEO,
    reviews: list(raw.reviews, ARCH_FLUTTER_DEFAULT_REVIEWS),
    faqs: list(raw.faqs, ARCH_FLUTTER_DEFAULT_FAQS),
    posts: list(raw.posts, ARCH_FLUTTER_DEFAULT_POSTS),
    offers: list(raw.offers, ARCH_FLUTTER_DEFAULT_OFFERS),
    galleryUrls: gallery,
    openTime: /^\d{1,2}:\d{2}$/.test((raw.openTime || '').trim()) ? (raw.openTime || '').trim() : '10:00',
    closeTime: /^\d{1,2}:\d{2}$/.test((raw.closeTime || '').trim()) ? (raw.closeTime || '').trim() : '20:00',
  };
}

/** CSS custom properties for the .af-site scope — onboarding colours win. */
export function archFlutterCssVariables(colors: ArchFlutterColors): Record<string, string> {
  return {
    '--af-blush': colors.blush,
    '--af-ivory': colors.ivory,
    '--af-espresso': colors.espresso,
    '--af-gold': colors.gold,
    '--af-mauve': colors.mauve,
  };
}

/** ₹ formatting with Indian digit grouping — ₹1,499 / ₹12,000. */
export function archFlutterFormatInr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return 'On consult';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function archFlutterFormatTime(hhmm: string): string {
  const [hRaw, mRaw] = (hhmm || '').split(':');
  const h = Number(hRaw);
  const m = Number(mRaw || 0);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export interface ArchFlutterOpenStatus {
  open: boolean;
  label: string;
}

export function archFlutterOpenStatus(openTime = '10:00', closeTime = '20:00', now: Date = new Date()): ArchFlutterOpenStatus {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const isOpen = minutes >= open && minutes < close;
  return {
    open: isOpen,
    label: isOpen
      ? `Open now · till ${archFlutterFormatTime(closeTime)}`
      : `Closed · opens ${archFlutterFormatTime(openTime)}`,
  };
}

/** Map any service to a themed photograph for its menu card. */
export function archFlutterServiceImage(
  service: Pick<SalonService, 'id' | 'name' | 'category' | 'imageUrl'>,
): string {
  if ((service.imageUrl || '').trim()) return (service.imageUrl || '').trim();
  const text = `${service.category} ${service.name}`.toLowerCase();
  if (/bridal|wedding|sangeet/.test(text)) return ARCH_FLUTTER_IMAGES.services.bridal.src;
  if (/microblading|powder|nano|pmu|eyeliner|lip/.test(text)) return ARCH_FLUTTER_IMAGES.services.pmu.src;
  if (/under-eye|eye care|facial|brighten|puff/.test(text)) return ARCH_FLUTTER_IMAGES.services.care.src;
  if (/lift|tint only|keratin/.test(text)) return ARCH_FLUTTER_IMAGES.services.lift.src;
  if (/brow|thread|wax|henna|lamination/.test(text)) return ARCH_FLUTTER_IMAGES.services.brow.src;
  if (/refill|removal/.test(text)) return ARCH_FLUTTER_IMAGES.services.tools.src;
  return ARCH_FLUTTER_IMAGES.services.lash.src;
}

/** Themed photograph + bundled art plate for any service card. */
export function archFlutterServicePhoto(service: Pick<SalonService, 'id' | 'name' | 'category' | 'imageUrl'>): { src: string; fallback: string } {
  const src = archFlutterServiceImage(service);
  const text = `${service.category} ${service.name}`.toLowerCase();
  let fallback = ARCH_FLUTTER_IMAGES.services.lash.fallback;
  if (/bridal|wedding|sangeet/.test(text)) fallback = ARCH_FLUTTER_IMAGES.services.bridal.fallback;
  else if (/microblading|powder|nano|pmu|eyeliner|lip/.test(text)) fallback = ARCH_FLUTTER_IMAGES.services.pmu.fallback;
  else if (/under-eye|eye care|facial|brighten|puff/.test(text)) fallback = ARCH_FLUTTER_IMAGES.services.care.fallback;
  else if (/lift|tint only|keratin/.test(text)) fallback = ARCH_FLUTTER_IMAGES.services.lift.fallback;
  else if (/brow|thread|wax|henna|lamination/.test(text)) fallback = ARCH_FLUTTER_IMAGES.services.brow.fallback;
  else if (/refill|removal/.test(text)) fallback = ARCH_FLUTTER_IMAGES.services.tools.fallback;
  return { src, fallback };
}

/** Bundled art plate for one of the 15 category tiles (index-based safety net). */
export function archFlutterCategoryFallback(category: ArchFlutterCategory, index = 0): string {
  const key = category.id.replace(/^af-cat-/, '') as keyof typeof ARCH_FLUTTER_IMAGES.categories;
  const match = ARCH_FLUTTER_IMAGES.categories[key];
  if (match) return match.fallback;
  const plates = Object.values(ARCH_FLUTTER_IMAGES.categories);
  return plates[index % plates.length].fallback;
}

const normalizeCategoryName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Services belonging to one category tile. Category names are matched exactly
 * first (after normalising punctuation, so “Mega Volume · Wispy” matches
 * “Mega Volume / Wispy”); if an owner renames a category, a two-token overlap
 * keeps the tile populated instead of showing an empty menu.
 */
export function archFlutterServicesForCategory(services: SalonService[], category: ArchFlutterCategory): SalonService[] {
  const wanted = normalizeCategoryName(category.name);
  if (!wanted) return [];
  const exact = services.filter((service) => normalizeCategoryName(service.category || '') === wanted);
  if (exact.length > 0) return exact;
  const tokens = wanted.split(' ').filter((token) => token.length > 3);
  return services.filter((service) => {
    const have = normalizeCategoryName(service.category || '');
    if (!have || tokens.length === 0) return false;
    const shared = tokens.filter((token) => have.includes(token)).length;
    return shared >= 2 || have.startsWith(tokens[0]);
  });
}

/**
 * The old plain Template 13 used a face portrait as its cover; an eye-area bar
 * hero needs eye imagery, so that single stock URL is treated as legacy and
 * replaced with the bundled lash macro when a salon switches templates.
 */
export function isLegacyLashStockUrl(url?: string | null): boolean {
  return /images\.unsplash\.com\/photo-1580489944761/.test((url || '').trim());
}

const LEGACY_LASH_SERVICE_IDS = new Set(['lb-1', 'lb-2', 'lb-3', 'lb-4', 'lb-5']);
const LEGACY_LASH_STYLIST_IDS = new Set(['lb-st-1', 'lb-st-2', 'lb-st-3']);
const LEGACY_LASH_TAGLINE = 'Feather Microblading, Russian Fluffy Volume & Brow Lamination';

/** The plain pre-Template-13 lash demo tagline, replaced on upgrade. */
export function isLegacyLashStockTagline(tagline?: string | null): boolean {
  return (tagline || '').trim().toLowerCase() === LEGACY_LASH_TAGLINE.toLowerCase();
}

/** Any pre-Template-13 lash demo service id (lb-1 … lb-5). */
export function isLegacyLashService(id?: string | null): boolean {
  return LEGACY_LASH_SERVICE_IDS.has(String(id || ''));
}

/**
 * Catalogue sync for remote template rows: refresh Template 13 only.
 *
 * The published `studioflow_templates` row still holds the old plain lash demo
 * (lb-* services, Mumbai address, nude palette). The redesigned Arch & Flutter
 * catalogue wins unless the remote copy already carries the `af-*` ids, exactly
 * like Templates 08–12 upgrade themselves.
 */
export function upgradeArchFlutterTemplate<T extends { id: string }>(remote: T, local: Record<string, any>): T {
  if (!remote || remote.id !== 'lash_brow') return remote;
  const raw = remote as Record<string, any>;
  const remoteServices =
    Array.isArray(raw.services) && raw.services.some((service: any) => String(service?.id || '').startsWith('af-'))
      ? raw.services
      : local.services;
  const remoteStylists =
    Array.isArray(raw.stylists) &&
    raw.stylists.length >= 3 &&
    !raw.stylists.some((stylist: any) => LEGACY_LASH_STYLIST_IDS.has(String(stylist?.id || '')))
      ? raw.stylists
      : local.stylists;
  return { ...raw, ...local, services: remoteServices, stylists: remoteStylists } as unknown as T;
}

/**
 * Customer-app catalog rows saved before Template 13 still describe the old
 * plain lash demo (five `lb-*` services, stock tagline and cover). Patch only
 * the copy, imagery and — when the saved list is missing or legacy — the
 * service/artist lists, so the customer catalog card matches the redesigned
 * website without changing the customer model shape. The local template is
 * passed in to keep this module free of a categoryTemplates import cycle.
 */
export function upgradeLashBrowCustomerTemplate<T extends { id: string }>(remote: T, local: Record<string, any>): T {
  if (!remote || remote.id !== 'lash_brow') return remote;
  const raw = remote as Record<string, any>;
  const next: Record<string, any> = {
    ...raw,
    title: local.title,
    shortName: local.shortName,
    tagline: local.tagline,
    about: local.about,
    coverImageUrl: local.coverImageUrl,
    themePreset: local.themePreset,
    paletteLabel: local.paletteLabel,
  };
  if (!Array.isArray(raw.subCategories) || raw.subCategories.length < 15) next.subCategories = local.subCategories;
  if (!Array.isArray(raw.services) || !raw.services.length || raw.services.some((service: any) => isLegacyLashService(String(service?.id || '')))) next.services = local.services;
  if (!Array.isArray(raw.stylists) || !raw.stylists.length || raw.stylists.some((stylist: any) => LEGACY_LASH_STYLIST_IDS.has(String(stylist?.id || '')))) next.stylists = local.stylists;
  if (raw.demoOffer === undefined || raw.demoOffer === null) next.demoOffer = local.demoOffer;
  return next as unknown as T;
}

/**
 * Saved workspaces created before Template 13 kept the old demo artists
 * (lb-st-*) with stock portraits. Swap those avatars for the redesigned
 * artist photography; an owner's own upload is never touched.
 */
export function upgradeLegacyLashBrowStylists<T extends Pick<Stylist, 'id' | 'avatarUrl'>>(
  stylists: T[],
  businessType?: string,
): T[] {
  if (businessType !== 'lash_brow' || !Array.isArray(stylists)) return stylists;
  const portraits = [
    ARCH_FLUTTER_IMAGES.team.meher.src,
    ARCH_FLUTTER_IMAGES.team.ritika.src,
    ARCH_FLUTTER_IMAGES.team.aisha.src,
    ARCH_FLUTTER_IMAGES.team.devika.src,
  ];
  return stylists.map((stylist, index) => {
    const current = (stylist.avatarUrl || '').trim();
    if (!current || LEGACY_LASH_STYLIST_IDS.has(String(stylist.id)) || isLegacyLashStockUrl(current)) {
      return { ...stylist, avatarUrl: portraits[index % portraits.length] };
    }
    return stylist;
  });
}

/** SEO title/description plus LocalBusiness JSON-LD for the Template 13 site. */
export function buildArchFlutterSeo(
  profile: SalonProfile,
  config: ResolvedArchFlutterConfig,
  siteUrl = 'https://archandflutter.example',
) {
  const businessName = (profile.businessName || '').trim() || ARCH_FLUTTER_BRAND_NAME;
  const city = (profile.city || '').trim() || ARCH_FLUTTER_DEFAULT_CITY;
  const tagline = (profile.tagline || '').trim() || ARCH_FLUTTER_TAGLINE;
  const phone = (profile.phone || profile.whatsapp || '').trim() || ARCH_FLUTTER_DEFAULT_PHONE;
  const street = (profile.address || '').trim() || ARCH_FLUTTER_DEFAULT_ADDRESS;
  const postalCode = (profile.postalCode || '').trim() || ARCH_FLUTTER_DEFAULT_POSTAL_CODE;
  const locality = city.split(',')[0].trim();
  const cheapest = ARCH_FLUTTER_SERVICES.filter((service) => !/package|combo|bundle|membership/i.test(`${service.category} ${service.name}`))
    .reduce<number | undefined>((min, service) => (service.price != null && (min === undefined || service.price < min) ? service.price : min), undefined);

  const title = `${businessName} — Lash Extensions, Brow Lamination & Microblading in ${locality}`;
  const description =
    `${tagline} ${config.heroSubtext.slice(0, 130).trim()} Classic, volume and hybrid lashes, lash lift & tint, brow shaping, lamination, henna and microblading at ${businessName}, ${locality}.` +
    (cheapest ? ` From ${archFlutterFormatInr(cheapest)}, GST included. Book online and pay by UPI, card or at the salon.` : '');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: businessName,
    slogan: tagline,
    description: config.aboutStory.slice(0, 300),
    url: siteUrl,
    image: `${siteUrl.replace(/\/$/, '')}${ARCH_FLUTTER_IMAGES.ogImage}`,
    logo: `${siteUrl.replace(/\/$/, '')}${ARCH_FLUTTER_IMAGES.logoSvg}`,
    telephone: phone,
    email: config.publicEmail,
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'UPI, GPay, PhonePe, Paytm, Credit Card, Debit Card, Net Banking, Cash at salon',
    address: {
      '@type': 'PostalAddress',
      streetAddress: street,
      addressLocality: locality,
      addressRegion: 'Rajasthan',
      postalCode,
      addressCountry: 'IN',
    },
    openingHours: config.workingHoursDisplay,
    makesOffer: ARCH_FLUTTER_SERVICES.slice(0, 40).map((service) => ({
      '@type': 'Offer',
      name: service.name,
      price: service.price,
      priceCurrency: 'INR',
    })),
  };

  return {
    title,
    description,
    metaTitle: title,
    metaDescription: description,
    ogTitle: `${businessName} | ${ARCH_FLUTTER_SELECTOR_LABEL}`,
    ogDescription: tagline,
    ogImage: ARCH_FLUTTER_IMAGES.ogImage,
    ogImageUrl: ARCH_FLUTTER_IMAGES.ogImage,
    keywords: [businessName.toLowerCase(), `lash extensions ${locality.toLowerCase()}`, 'brow lamination', 'microblading', 'lash lift and tint', 'henna brows', 'bridal lash package', 'salon booking'].filter(Boolean).join(', '),
    twitterCard: 'summary_large_image' as const,
    jsonLd,
  };
}
