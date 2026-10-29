export type AppView = 'owner' | 'landing' | 'wizard' | 'preview' | 'dashboard';

export type BusinessTypeId = 
  | 'hair_salon'         // Hair Cut & Styling Studio
  | 'barber'             // Barber Shop / Men's Grooming
  | 'unisex_salon'       // Unisex Salon
  | 'beauty_parlour'     // Beauty Parlour
  | 'nail_studio'        // Nail Studio
  | 'hair_spa'           // Hair Spa & Treatment
  | 'skincare_clinic'    // Facial & Skincare Clinic
  | 'makeup_studio'      // Makeup Studio
  | 'massage_wellness'   // Massage & Wellness Center
  | 'hair_coloring'      // Hair Coloring Studio
  | 'bridal_lounge'      // Bridal Makeup & Makeover Lounge
  | 'tattoo_studio'      // Tattoo & Body Art Studio
  | 'lash_brow'          // Lash & Brow Bar
  | 'ayurvedic_spa';     // Ayurvedic Rejuvenation Spa

export type LayoutStyle = 
  | 'modern_minimalist'
  | 'vintage_industrial'
  | 'contemporary_balanced'
  | 'curved_elegant'
  | 'bento_grid'
  | 'zen_emerald'
  | 'clinical_clean'
  | 'dark_glam'
  | 'earth_bamboo'
  | 'creative_gallery'
  | 'royal_crimson'
  | 'urban_monochrome'
  | 'chic_nude'
  | 'ayurvedic_terracotta'
  | 'palace_heritage'
  | 'prism_holographic';

export interface BusinessTypeOption {
  id: BusinessTypeId;
  title: string;
  categoryTag: string;
  icon: string;
  aestheticDescription: string;
  description?: string;
  paletteName: string;
  badge: string;
  defaultServices: Array<{ name: string; price: number; duration: number; category: string }>;
}

export type SalonThemePreset = 
  | 'slate_silver'
  | 'vintage_brass'
  | 'pastel_blush'
  | 'rose_gold_ivory'
  | 'neon_gloss_bento'
  | 'emerald_sage'
  | 'clinical_sky_blue'
  | 'obsidian_gold'
  | 'earth_bamboo'
  | 'chroma_gradient'
  | 'royal_crimson_gold'
  | 'urban_monochrome'
  | 'chic_nude_beige'
  | 'ayurvedic_terracotta'
  | 'sage_cream_gold';

export interface CategoryTemplateConfig {
  id: BusinessTypeId;
  title: string;
  shortName: string;
  tagline: string;
  about: string;
  icon: string;
  layoutStyle: LayoutStyle;
  paletteLabel: string;
  themePreset: SalonThemePreset;
  subCategories: string[];
  defaultCity: string;
  defaultAddress: string;
  defaultPostalCode: string;
  phone: string;
  whatsapp: string;
  ownerName: string;
  ownerRole: string;
  ownerPhotoUrl: string;
  coverImageUrl: string;
  instagramHandle: string;
  themeStyle: {
    heroBackground: string;
    heroTextColor: string;
    cardBorder: string;
    cardBackground: string;
    cardRadius: string;
    accentColor: string;
    accentBg: string;
    badgeBg: string;
    badgeText: string;
    buttonBg: string;
    buttonText: string;
    priceColor: string;
    isDark?: boolean;
    headerBanner?: string;
  };
  services: SalonService[];
  stylists: Stylist[];
}

export type VideoCategoryTag = 'SHOWCASE' | 'SHORT' | 'LONG';

export interface SocialVideo {
  id: string;
  isDemo?:boolean;
  youtubeUrl: string; // Source link: YouTube or Instagram (legacy field name).
  previewVideoUrl?: string; // Optional owner-provided playable MP4/WebM preview.
  videoId: string;
  title: string;
  description?: string;
  channelTitle?: string;
  thumbnailUrl: string;
  categoryTag: VideoCategoryTag;
  isOwnerVideo: boolean; // true if added by owner ("yours"), false for default ("showcase")
  views?: string;
  transformationTag?: string;
}

export interface PromoCampaign {
  logoUrl?:string;
  endsAt?:string; lastMinute?:boolean;
  enabled: boolean; selectedServiceId: string; campaignTheme: string; discountPercent: number;
  customOfferText: string; promoCode: string; headline: string; subtext: string;
  aspectRatio: string; aesthetic: string; imageUrl: string; customPrompt: string;
}
export interface ClinicArticle { id:string; title:string; category:string; excerpt:string; body:string; imageUrl:string; publishedAt:string; published:boolean; }
export interface ClinicFaq { id:string; question:string; answer:string; published:boolean; }
export interface PatientBenefitCard {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  benefits?: string[];
  validity?: string;
  published: boolean;
  ctaLabel?: string;
  ctaAction?: 'consultation' | 'packages' | 'enquire' | 'booking';
}

export interface ClinicOfferCard {
  id: string;
  title: string;
  image: string;
  description: string;
  relatedService?: string;
  startDate?: string;
  expiryDate?: string;
  terms?: string;
  isPublished: boolean;
  ctaText: string;
}

export interface TreatmentStory {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  published: boolean;
  order?: number;
  fullContent?: string;
  whatToExpect?: string[];
  doctorQuestions?: string[];
}

export interface SalonProfile {
  /** Public projection of confirmed clinic services whose fee is not confirmed (no price). */
  clinicEnquiryServices?: SalonService[];
  clinicArticles?: ClinicArticle[];
  clinicFaq?: ClinicFaq[];
  patientBenefits?: PatientBenefitCard[];
  clinicOffers?: ClinicOfferCard[];
  treatmentStories?: TreatmentStory[];
  /** Explicitly public clinic contact address, separate from the private account email. */
  clinicPublicEmail?: string;
  clinicLegal?: {privacy:string;terms:string};
  clinicTechnology?: {name:string;manufacturer:string;specifications:string;imageUrl:string;approved:boolean};
  bookingAddOnServiceIds?:string[];
  comparisonPhotos?:import('./lib/conversionFeatures').ComparisonPhoto[];
  reviewSource?:import('./lib/conversionFeatures').ReviewSource;
  defaultWebsiteLanguage?:import('./lib/conversionFeatures').WebsiteLanguage;
  photoGalleryInitialized?:boolean;
  photoGalleryType?:BusinessTypeId;
  photoGallery?:import('./lib/photoGallery').SalonGalleryPhoto[];
  headerNavigation?:import('./lib/headerNavigation').HeaderLinkSetting[];
  serviceCatalogueInitialized?:boolean;
  demoTestimonialsInitialized?:boolean;
  demoGalleryInitialized?:boolean;
  demoGalleryType?:BusinessTypeId;
  demoVideosInitialized?:boolean;
  bookingRules?: {leadHours:number;cancellationWindow:number};
  promoCampaign?: PromoCampaign;
  websiteSections?: Record<string, boolean>;
  sectionHeadings?: Record<string, string>;
  websiteTestimonials?: import('./templateData').Testimonial[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    keywords?: string;
    twitterCard?: 'summary' | 'summary_large_image';
    canonicalUrl?: string;
  };
  vogueNoir?: VogueNoirConfig;
  bodhiTree?: BodhiTreeConfig;
  prismChroma?: PrismChromaConfig;

  businessType: BusinessTypeId;
  businessName: string;
  ownerName: string;
  ownerRole: string;
  phone: string;
  whatsapp: string;
  email: string;
  tagline: string;
  about: string;
  ownerPhotoUrl: string;
  coverImageUrl: string;
  logoUrl?: string;
  themePreset: SalonThemePreset;
  currency: string;
  subdomain: string;
  customDomain?: string;
  address: string;
  city: string;
  postalCode: string;
  shopFlatNo?: string;
  areaLocality?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  instagramHandle: string;
  facebookPage?: string;
  youtubeChannel?: string;
  tiktokProfile?: string;
  googleBusinessUrl?: string;
  socialVideos?: SocialVideo[];
  requireDeposit: boolean;
  depositPercentage: number;
  themeAccentKey?: string;
  customAccentColor?: string;
  darkCanvas?: boolean;
  landmark?: string;
  foundingYear?: string;
  workingHoursMonFri?: string;
  workingHoursSat?: string;
  workingHoursTue?: string;
  workingHoursSun?: string;
}

export interface SalonService {
  /** Template 07 starter data only: never represent these illustrative values as a clinic-confirmed offer. */
  clinicDemoData?: boolean;
  /** Template 07 only: explicit clinic confirmation, never inferred from template or edits. */
  clinicServiceApproved?: boolean;
  clinicPublicationStatus?: 'draft' | 'published' | 'unpublished';
  clinicFeeStatus?: 'unverified' | 'verified' | 'on_request';
  clinicPriceVerified?: boolean;
  clinicServiceVerifiedBy?: string;
  clinicServiceVerifiedAt?: string;
  clinicFeeVerifiedBy?: string;
  clinicFeeVerifiedAt?: string;
  imageUrl?:string;
  imagePath?:string;
  origin?:'custom'|'template';
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number | null;
  description: string;
  icon: string;
  popular?: boolean;
  showDuration?: boolean; // Defaults to true if undefined. When false, duration is hidden on public website menu.
}

export type StaffAccessRole = 'Service Provider (Assigned)' | 'Manager (Full Access)' | 'Receptionist (Frontdesk)';
export type StaffStatus = 'Available' | 'Busy' | 'On Leave' | 'Inactive';

export interface DaySchedule {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  enabled: boolean;
  fromTime: string;
  toTime: string;
}

export interface StaffWorkPhoto {id:string;imageUrl:string;caption:string;serviceId?:string;consented:boolean;}
export interface Stylist {
  businessType?:BusinessTypeId;
  workGallery?:StaffWorkPhoto[];
  expertiseServiceIds?:string[];
  experienceYears?:number;
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  specialties: string[];
  rating: number;
  phone?: string;
  commissionRate?: number;
  status?: StaffStatus;
  accessRole?: StaffAccessRole;
  hidePhone?: boolean;
  assignedServices?: string[];
  bio?: string;
  qualifications?: string[];
  registrationNumber?: string;
  specializedTreatments?: string[];
  languages?: string[];
  education?: string;
  schedule?: DaySchedule[];
}

export interface Appointment {
  consultationMessage?: string;
  couponCode?:string;
  couponExpectedTotal?:number;
  originalPrice?:number;
  discountAmount?:number;
  coupon?:import('./components/BookingCoupon').CouponQuote;
  addOnIds?:string[];
  requestId?:string;
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  stylistId: string;
  stylistName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  paymentStatus: 'paid_deposit' | 'paid_full' | 'pay_at_salon';
  amountPaid: number;
  createdAt: string;
  walkIn?: boolean;
  posMethod?: string;
  origin?: string;
}

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface RewardThreshold {
  id: string;
  title: string;
  requiredPoints: number;
  rewardType: 'percentage_discount' | 'flat_discount' | 'free_service';
  discountValue: number; // e.g. 15 for 15% or 300 for ₹300 OFF
  applicableCategory?: string;
  description: string;
  isActive: boolean;
  couponCodePrefix: string;
}

export interface LoyaltyConfig {
  programEnabled: boolean;
  pointsPerVisit: number;
  pointsPerHundredSpent: number;
  tierThresholds: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  tierMultipliers: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  rewards: RewardThreshold[];
}

export interface PointTransaction {
  id: string;
  date: string;
  description: string;
  pointsChange: number;
  type: 'visit_earned' | 'spend_earned' | 'bonus' | 'redeemed';
}

export interface RedeemedReward {
  id: string;
  rewardId: string;
  rewardTitle: string;
  discountSummary: string;
  pointsSpent: number;
  redeemedAt: string;
  couponCode: string;
  status: 'active' | 'used';
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
  notes: string;
  favoriteStylist: string;
  points: number;
  lifetimePoints: number;
  loyaltyTier: LoyaltyTier;
  pointHistory?: PointTransaction[];
  redeemedRewards?: RedeemedReward[];
}

export type VogueNoirPortfolioCategory = 'Bridal' | 'Party' | 'Editorial' | 'Academy Work';

export interface VogueNoirThemeColors {
  bgPrimary: string;
  bgSurface: string;
  borderSubtle: string;
  accentGold: string;
  textPrimary: string;
  textMuted: string;
  highlightBlush: string;
}

export interface VogueNoirStatItem {
  id: string;
  value: string;
  label: string;
}

export interface VogueNoirBridalPackage {
  id: string;
  tier: string;
  price: number;
  popular?: boolean;
  badgeLabel?: string;
  imageUrl: string;
  imageAlt?: string;
  inclusions: string[];
  linkedServiceId?: string;
}

export interface VogueNoirAcademyCourse {
  id: string;
  title: string;
  duration: string;
  fee: number;
  imageUrl: string;
  imageAlt?: string;
  summary: string;
  batchOverride?: string;
  certification: string;
  emiNote: string;
  syllabus: string[];
}

export interface VogueNoirPortfolioItem {
  id: string;
  category: VogueNoirPortfolioCategory;
  imageUrl: string;
  title: string;
  alt: string;
}

export interface VogueNoirBeforeAfterItem {
  id: string;
  title: string;
  category: string;
  beforeUrl: string;
  afterUrl: string;
  beforeAlt: string;
  afterAlt: string;
}

export interface VogueNoirFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface VogueNoirReviewItem {
  id: string;
  name: string;
  tag: string;
  rating: number;
  quote: string;
  avatarUrl: string;
}

export interface VogueNoirConfig {
  selectorLabel?: string;
  heroHeading?: string;
  heroSubtext?: string;
  heroDesktopUrl?: string;
  heroMobileUrl?: string;
  aboutHeading?: string;
  aboutStory?: string;
  aboutImageUrl?: string;
  publicEmail?: string;
  workingHoursDisplay?: string;
  mapEmbedUrl?: string;
  gstin?: string;
  sacCode?: string;
  gstPricing?: 'inclusive' | 'exclusive' | '';
  colors?: Partial<VogueNoirThemeColors>;
  stats?: VogueNoirStatItem[];
  bridalPackages?: VogueNoirBridalPackage[];
  academyEnabled?: boolean;
  academyHeading?: string;
  academySubtext?: string;
  academyHeroUrl?: string;
  academyHighlights?: string[];
  /** City-specific preferred batch labels, one line per city: City | date, date. */
  academyScheduleText?: string;
  courses?: VogueNoirAcademyCourse[];
  portfolio?: VogueNoirPortfolioItem[];
  beforeAfter?: VogueNoirBeforeAfterItem[];
  reviews?: VogueNoirReviewItem[];
  faqs?: VogueNoirFaqItem[];
}

export type AcademyEnquiryStatus = 'new' | 'contacted' | 'enrolled';

export interface AcademyEnquiryRecord {
  id: string;
  website_slug: string;
  owner_id: string;
  customer_id: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  batch: string;
  city: string;
  message: string;
  status: AcademyEnquiryStatus;
  created_at: string;
  updated_at: string;
}

/* ---------------------------------------------------------------------------
 * Template 09 — Bodhi Tree Massage & Wellness Sanctuary (massage_wellness)
 * Editable storefront content stored on the salon profile. Everything is
 * optional: the resolver in `lib/bodhiTree.ts` fills any missing value with
 * the bundled Jaipur demo defaults, so published sites never render blanks.
 * ------------------------------------------------------------------------- */

export interface BodhiTreeThemeColors {
  /** Warm cream page background. */
  bgCream: string;
  /** Soft sage section background. */
  bgSage: string;
  /** Deep forest green — headings and primary text. */
  forest: string;
  /** Sage green — buttons and primary brand surfaces. */
  sage: string;
  /** Soft gold — fine borders, icons and small highlights. */
  gold: string;
  /** Jaipur pink-sandstone — highlights and borders. */
  sandstone: string;
  /** Muted body text. */
  textMuted: string;
}

export interface BodhiTreePalaceItem {
  id: string;
  /** The Jaipur place the ritual is inspired by, e.g. "Hawa Mahal". */
  place: string;
  /** Ritual name, e.g. "Hawa Mahal Calm Ritual". */
  title: string;
  /** Price in INR (₹). */
  price: number;
  /** Display duration, e.g. "60 min". */
  duration: string;
  /** One or two simple lines about the place and the treatment. */
  blurb: string;
  includes: string[];
  imageUrl: string;
  imageAlt?: string;
  /** Bookable service the card links to. */
  linkedServiceId?: string;
  popular?: boolean;
  badgeLabel?: string;
}

export interface BodhiTreeBranch {
  id: string;
  name: string;
  area: string;
  address: string;
  phone?: string;
  hours?: string;
}

export interface BodhiTreeStatItem {
  id: string;
  value: string;
  label: string;
}

export interface BodhiTreeFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface BodhiTreeReviewItem {
  id: string;
  name: string;
  /** Branch / area tag, e.g. "C-Scheme, Jaipur". */
  tag: string;
  rating: number;
  quote: string;
  /** Service the review is about (display only). */
  serviceName?: string;
  avatarUrl: string;
}

export interface BodhiTreeConfig {
  selectorLabel?: string;
  heroHeading?: string;
  heroSubtext?: string;
  heroDesktopUrl?: string;
  heroMobileUrl?: string;
  aboutHeading?: string;
  aboutStory?: string;
  aboutImageUrl?: string;
  aboutImage2Url?: string;
  palaceHeading?: string;
  palaceSubtext?: string;
  contactImageUrl?: string;
  publicEmail?: string;
  workingHoursDisplay?: string;
  mapEmbedUrl?: string;
  colors?: Partial<BodhiTreeThemeColors>;
  stats?: BodhiTreeStatItem[];
  palaceCollection?: BodhiTreePalaceItem[];
  branches?: BodhiTreeBranch[];
  faqs?: BodhiTreeFaqItem[];
  reviews?: BodhiTreeReviewItem[];
}


/* ---------------------------------------------------------------------------
 * Template 10 — Prism & Chroma Hair Color Atelier (hair_coloring)
 * "Light through a Prism": ink-black premium base, holographic colour glow.
 * Editable storefront content stored on the salon profile. Everything is
 * optional: the resolver in `lib/prismChroma.ts` fills any missing value with
 * the bundled demo defaults, so published sites never render blanks.
 * ------------------------------------------------------------------------- */

export interface PrismChromaThemeColors {
  /** Ink-black page background (--bg). */
  bg: string;
  /** Violet brand colour (--violet). */
  violet: string;
  /** Magenta brand colour (--magenta). */
  magenta: string;
  /** Coral brand colour (--coral). */
  coral: string;
  /** Cyan brand colour (--cyan). */
  cyan: string;
  /** Main text colour (--text). */
  text: string;
  /** Muted body text (--muted). */
  muted: string;
}

export interface PrismChromaShade {
  id: string;
  /** Shade name shown in the Shade Studio, e.g. "Violet Storm". */
  name: string;
  /** CSS colour of the swatch dot. */
  swatch: string;
  /** CSS filter applied to the hair photo when the shade is picked. */
  tintFilter: string;
  /** Price in INR (₹) for this shade. */
  price: number;
  /** One simple line about the shade. */
  blurb: string;
  imageUrl: string;
  imageAlt?: string;
  /** Bookable service the shade links to. */
  linkedServiceId?: string;
  /** Warm / cool / neutral — matched to skin tone at consult. */
  undertone?: string;
  /** Gloss, Matte or Metallic finish suggestion. */
  finish?: string;
  /** 1 (very easy) to 5 (high care) upkeep level. */
  maintenanceLevel?: number;
  /** How many weeks the shade stays fresh. */
  longevityWeeks?: string;
  /** Who this shade suits best, in one simple line. */
  bestFor?: string;
  /** One home-care tip for this shade. */
  careTip?: string;
  /** Shade family used by the Find-My-Shade quiz: vivid | pastel | natural | warm | cool. */
  family?: string;
}

export interface PrismChromaPackage {
  id: string;
  tier: string;
  price: number;
  popular?: boolean;
  badgeLabel?: string;
  imageUrl: string;
  imageAlt?: string;
  includes: string[];
  linkedServiceId?: string;
  /** Number of studio visits covered, when the package spans visits. */
  sessionsCount?: number;
  /** Days the package stays valid after purchase. */
  validityDays?: number;
  /** Short saving note, e.g. "Save ₹1,500 vs separate services". */
  savingsNote?: string;
  /** Extra ₹ per visit when the care-plan toggle is on (0 = included). */
  carePlanAddon?: number;
}

export interface PrismChromaBeforeAfter {
  id: string;
  title: string;
  beforeUrl: string;
  afterUrl: string;
  beforeAlt: string;
  afterAlt: string;
  /** Service that created the change, e.g. "Signature Balayage". */
  serviceLabel?: string;
  /** e.g. "Done in 1 sitting" or "2 sittings over 3 weeks". */
  sessionsNote?: string;
  /** Colour expert who did the work. */
  stylistName?: string;
}

export interface PrismChromaProcessStep {
  id: string;
  title: string;
  text: string;
  image: string;
  alt: string;
  /** e.g. "15 mins" — time this step usually takes. */
  durationLabel?: string;
  /** Small check points shown under the step text. */
  points?: string[];
}

export interface PrismChromaCareStep {
  id: string;
  /** e.g. "Week 1". */
  when: string;
  title: string;
  text: string;
}

export interface PrismChromaBranch {
  id: string;
  name: string;
  area: string;
  address: string;
  phone?: string;
  hours?: string;
  /** Nearby landmark clients know. */
  landmark?: string;
  /** Nearest metro / local station note. */
  metroNote?: string;
  /** Parking note for drivers. */
  parkingNote?: string;
}

export interface PrismChromaStatItem {
  id: string;
  value: string;
  label: string;
}

export interface PrismChromaFaqItem {
  id: string;
  question: string;
  answer: string;
  /** Group label used by the FAQ filter chips. */
  category?: string;
}

export interface PrismChromaReviewItem {
  id: string;
  name: string;
  /** City / area tag, e.g. "Bandra West, Mumbai". */
  tag: string;
  rating: number;
  quote: string;
  serviceName?: string;
  avatarUrl: string;
  /** Shade the client picked, when known. */
  shadeName?: string;
  /** e.g. "Visited recently". */
  visitLabel?: string;
  /** Show a small "Verified visit" tick. */
  verified?: boolean;
}

export interface PrismChromaConfig {
  selectorLabel?: string;
  heroHeading?: string;
  heroSubtext?: string;
  heroImageUrl?: string;
  aboutHeading?: string;
  aboutStory?: string;
  aboutImageUrl?: string;
  shadesHeading?: string;
  shadesSubtext?: string;
  bookingImageUrl?: string;
  publicEmail?: string;
  workingHoursDisplay?: string;
  mapEmbedUrl?: string;
  colors?: Partial<PrismChromaThemeColors>;
  stats?: PrismChromaStatItem[];
  shades?: PrismChromaShade[];
  packages?: PrismChromaPackage[];
  beforeAfter?: PrismChromaBeforeAfter[];
  branches?: PrismChromaBranch[];
  faqs?: PrismChromaFaqItem[];
  reviews?: PrismChromaReviewItem[];
  /** Short offer line shown in the thin bar above the navbar. */
  announcementText?: string;
  /** Button label inside the announcement bar. */
  announcementCtaLabel?: string;
  processSteps?: PrismChromaProcessStep[];
  careGuide?: PrismChromaCareStep[];
  /** Daily opening time "HH:MM" (24h) for the Open-now chip. */
  openTime?: string;
  /** Daily closing time "HH:MM" (24h) for the Open-now chip. */
  closeTime?: string;
}
