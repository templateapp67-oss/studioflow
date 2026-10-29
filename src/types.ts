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
  | 'ayurvedic_terracotta';

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
  | 'ayurvedic_terracotta';

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
  };
  vogueNoir?: VogueNoirConfig;

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

