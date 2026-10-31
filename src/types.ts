export type AppView = 
  | 'landing'
  | 'onboarding'
  | 'dashboard'
  | 'workspace'
  | 'website'
  | 'customizer'
  | 'customer';

export type BusinessTypeId = 
  | 'hair_salon'
  | 'barber'
  | 'unisex_salon'
  | 'beauty_parlour'
  | 'nail_studio'
  | 'hair_spa'
  | 'skincare_clinic'
  | 'makeup_studio'
  | 'massage_wellness'
  | 'hair_coloring'
  | 'bridal_lounge'
  | 'tattoo_studio'
  | 'lash_brow'
  | 'ayurvedic_spa'
  | string;

export interface BusinessTypeOption {
  id: BusinessTypeId;
  title: string;
  categoryTag?: string;
  icon?: string;
  aestheticDescription?: string;
  paletteName?: string;
  badge?: string;
  defaultServices?: any[];
}

export interface SalonOffer {
  id: string;
  title: string;
  description?: string;
  promoCode?: string;
  discountPercent?: number;
  isActive?: boolean;
  validUntil?: string;
  imageUrl?: string;
  campaignTheme?: string;
  customOfferText?: string;
  subtext?: string;
  aspectRatio?: string;
  aesthetic?: string;
  headline?: string;
  selectedServiceId?: string;
  originalPriceINR?: number;
  offerPriceINR?: number;
  offerType?: string;
  discountValue?: number;
  validFrom?: string;
  validTo?: string;
  couponCode?: string;
  image?: string;
}

export interface SocialVideo {
  id: string;
  title: string;
  url?: string;
  platform?: 'instagram' | 'youtube' | 'tiktok' | 'reels' | 'other' | string;
  thumbnailUrl?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  topic?: string;
  videoId?: string;
  categoryTag?: string;
  isOwnerVideo?: boolean;
  isDemo?: boolean;
  description?: string;
  youtubeUrl?: string;
}

export interface SalonService {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description?: string;
  icon?: string;
  popular?: boolean;
  imageUrl?: string;
  origin?: 'template' | 'custom' | string;
  showDuration?: boolean;
  clinicDemoData?: boolean;
  clinicServiceApproved?: boolean;
  clinicPriceVerified?: boolean;
  clinicFeeStatus?: string;
  clinicPublicationStatus?: string;
}

export interface Stylist {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  specialties?: string[];
  rating?: number;
  bio?: string;
  experienceYears?: number;
  status?: string;
}

export interface BranchLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  isMain?: boolean;
}

export interface RewardThreshold {
  points: number;
  perkName: string;
  description?: string;
}

export interface SalonProfile {
  id?: string;
  businessName: string;
  businessType?: BusinessTypeId;
  tagline?: string;
  about?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  ownerName?: string;
  ownerRole?: string;
  ownerPhotoUrl?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagramHandle?: string;
  facebookPage?: string;
  youtubeChannel?: string;
  subdomain?: string;
  selectedTemplateId?: string;
  layoutStyle?: string;
  themePreset?: string;
  paletteLabel?: string;
  themeStyle?: any;
  demoTemplateId?: string;
  heroVideoUrl?: string;
  socialVideos?: SocialVideo[];
  gallery?: any[];
  branches?: BranchLocation[];
  loyaltyConfig?: LoyaltyConfig;
  customDomain?: string;
  isPublished?: boolean;
  customAccentColor?: string;
  websiteSections?: any;
  seo?: any;
  vogueNoir?: any;
  shringaarRoyal?: any;
  serviceCatalogueInitialized?: boolean;
  demoVideosInitialized?: boolean;
  currency?: string;
  websiteTestimonials?: any[];
  comparisonPhotos?: any[];
  reviewSource?: string;
  requireDeposit?: boolean;
  depositPercentage?: number;
  workingHoursMonFri?: string;
  workingHoursTue?: string;
  workingHoursSun?: string;
  workingHoursSat?: string;
  tiktokProfile?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  prismChroma?: PrismChromaConfig;
  themeAccentKey?: string;
  darkCanvas?: boolean;
  photoGalleryInitialized?: boolean;
  photoGallery?: any[];
  photoGalleryType?: string;
  bookingRules?: any;
  demoTestimonialsInitialized?: boolean;
  demoGalleryType?: string;
  demoGalleryInitialized?: boolean;
  headerNavigation?: any;
  bodhiTree?: any;
  archFlutter?: any;
  promoOffers?: SalonOffer[];
  googleBusinessUrl?: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId?: string;
  serviceName?: string;
  stylistId?: string;
  stylistName?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalAmount?: number;
  servicePrice?: number;
  notes?: string;
  createdAt?: string;
  paymentStatus?: 'pending' | 'paid' | 'refunded' | string;
  amountPaid?: number;
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalVisits?: number;
  totalSpent?: number;
  lastVisit?: string;
  loyaltyPoints?: number;
  points?: number;
  lifetimePoints?: number;
  loyaltyTier?: string;
  pointHistory?: any[];
  redeemedRewards?: any[];
  notes?: string;
  favoriteStylist?: string;
}

export interface LoyaltyTier {
  name: string;
  minPoints: number;
  discountPercent: number;
  color?: string;
  perks?: string[];
}

export interface LoyaltyConfig {
  enabled: boolean;
  pointsPerRupee: number;
  tiers: LoyaltyTier[];
  thresholds?: RewardThreshold[];
}

export interface CategoryTemplateConfig {
  id: string;
  title: string;
  shortName: string;
  tagline: string;
  about: string;
  icon: string;
  layoutStyle: string;
  paletteLabel: string;
  themePreset: string;
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
  instagramHandle?: string;
  themeStyle: any;
  services: SalonService[];
  stylists: Stylist[];
}

// Shringaar types
export interface ShringaarBeforeAfter { id: string; title: string; beforeUrl?: string; afterUrl?: string; before?: string; after?: string; alt?: string; }
export interface ShringaarCollectionItem { id: string; title?: string; imageUrl?: string; name?: string; subtitle?: string; image?: string; alt?: string; }
export interface ShringaarFaqItem { id: string; question: string; answer: string; }
export interface ShringaarLookItem { id: string; title?: string; imageUrl?: string; category?: string; image?: string; alt?: string; caption?: string; tag?: string; }
export interface ShringaarPackageItem { id: string; title?: string; price: number; services?: string[]; serviceId?: string; tier?: string; tagline?: string; image?: string; alt?: string; sessions?: string; popular?: boolean; includes?: string[]; badge?: string; }
export interface ShringaarProcessStep { id: string; stepNumber?: number; title: string; description?: string; text?: string; image?: string; alt?: string; durationLabel?: string; }
export interface ShringaarReviewItem { id: string; name: string; rating: number; text?: string; date?: string; weddingPlace?: string; quote?: string; avatar?: string; alt?: string; }
export interface ShringaarRoyalColors { maroon: string; gold: string; cream?: string; ivory?: string; saffron?: string; teal?: string; blush?: string; ink?: string; }
export interface ShringaarRoyalConfig { enabled: boolean; selectorLabel?: string; heroHeading?: string; heroScript?: string; heroSubtext?: string; heroImageUrl?: string; aboutHeading?: string; aboutStory?: string; aboutImageUrl?: string; collectionsHeading?: string; collectionsSubtext?: string; looksHeading?: string; looksSubtext?: string; servicesHeading?: string; packagesHeading?: string; packageEyebrow?: string; processHeading?: string; reviewsHeading?: string; galleryHeading?: string; offerHeading?: string; offerText?: string; bookingHeading?: string; announcementText?: string; bookingImageUrl?: string; offerImageUrl?: string; publicEmail?: string; workingHoursDisplay?: string; mapEmbedUrl?: string; established?: string; openTime?: string; closeTime?: string; colors?: ShringaarRoyalColors; stats?: ShringaarStatItem[]; collections?: ShringaarCollectionItem[]; looks?: ShringaarLookItem[]; packages?: ShringaarPackageItem[]; beforeAfter?: ShringaarBeforeAfter[]; processSteps?: ShringaarProcessStep[]; reviews?: ShringaarReviewItem[]; faqs?: ShringaarFaqItem[]; galleryUrls?: string[]; }
export interface ShringaarStatItem { label: string; value: string; id?: string; image?: string; alt?: string; }

// Prism Chroma types
export interface PrismChromaBeforeAfter { id: string; title: string; beforeUrl: string; afterUrl: string; beforeAlt?: string; afterAlt?: string; serviceLabel?: string; sessionsNote?: string; stylistName?: string; }
export interface PrismChromaCareStep { id: string; title: string; text: string; when?: string; }
export interface PrismChromaProcessStep { id: string; title: string; text: string; image?: string; alt?: string; durationLabel?: string; points?: string[]; }
export interface PrismChromaBranch { id: string; name: string; address: string; phone: string; area?: string; hours?: string; landmark?: string; metroNote?: string; parkingNote?: string; }
export interface PrismChromaFaqItem { id: string; question: string; answer: string; category?: string; }
export interface PrismChromaPackage { id: string; title?: string; price: number; description?: string; tier?: string; imageUrl?: string; popular?: boolean; badgeLabel?: string; imageAlt?: string; includes?: string[]; linkedServiceId?: string; sessionsCount?: number; validityDays?: number; savingsNote?: string; carePlanAddon?: string | number; }
export interface PrismChromaReviewItem { id: string; name: string; rating: number; comment?: string; tag?: string; serviceName?: string; quote?: string; avatarUrl?: string; shadeName?: string; visitLabel?: string; verified?: boolean; }
export interface PrismChromaShade { id: string; name: string; hex?: string; family?: string; maintenanceLevel?: any; longevityWeeks?: any; swatch?: string; tintFilter?: string; price?: number; blurb?: string; imageUrl?: string; imageAlt?: string; linkedServiceId?: string; undertone?: string; finish?: string; bestFor?: string; careTip?: string; }
export interface PrismChromaStatItem { id: string; label: string; value: string; }
export interface PrismChromaThemeColors { primary?: string; secondary?: string; bg?: string; violet?: string; magenta?: string; coral?: string; cyan?: string; text?: string; muted?: string; }

// Bodhi Tree types
export interface BodhiTreeBranch { id: string; name: string; address: string; phone: string; area?: string; hours?: string; }
export interface BodhiTreeFaqItem { id: string; question: string; answer: string; }
export interface BodhiTreePalaceItem { id: string; title: string; imageUrl: string; place?: string; price?: number; duration?: string; blurb?: string; includes?: string[]; imageAlt?: string; linkedServiceId?: string; popular?: boolean; badgeLabel?: string; }
export interface BodhiTreeReviewItem { id: string; name: string; rating: number; comment?: string; tag?: string; quote?: string; serviceName?: string; avatarUrl?: string; }
export interface BodhiTreeStatItem { id: string; label: string; value: string; }
export interface BodhiTreeThemeColors { primary?: string; secondary?: string; bgCream?: string; bgSage?: string; forest?: string; sage?: string; gold?: string; sandstone?: string; textMuted?: string; }

// Arch Flutter types
export type ArchFlutterSectionId = string;
export type ArchFlutterSectionState = any;
export interface ArchFlutterFonts { heading: string; body: string; }
export interface ArchFlutterPost { id: string; title: string; content: string; date: string; image?: string; excerpt?: string; body?: string; imageUrl?: string; tag?: string; minutes?: string; }
export interface ArchFlutterStat { id: string; label: string; value: string; icon?: string; }
export interface ArchFlutterCategory { id: string; label?: string; count?: number; name?: string; blurb?: string; imageUrl?: string; featured?: boolean; }
export interface ArchFlutterColors { primary?: string; secondary?: string; accent?: string; background?: string; surface?: string; border?: string; text?: string; textMuted?: string; blush?: string; ivory?: string; espresso?: string; gold?: string; mauve?: string; }
export interface ArchFlutterConfig { enabled: boolean; payAtSalon?: boolean; upiHandle?: string; gstin?: string; showGstNote?: boolean; offersHeading?: string; journalHeading?: string; contactHeading?: string; bookingHeading?: string; bookingSubtext?: string; ctaBannerImageUrl?: string; footerImageUrl?: string; publicEmail?: string; workingHoursDisplay?: string; mapEmbedUrl?: string; established?: string; stats?: any[]; categories?: any[]; packages?: any[]; beforeAfter?: any[]; reels?: any[]; featuredVideo?: any; reviews?: any[]; faqs?: any[]; posts?: any[]; offers?: any[]; openTime?: string; closeTime?: string; faqsHeading?: string; sections?: any; fonts?: ArchFlutterFonts; cornerRadius?: string; glassBlur?: string; heroPrimaryLabel?: string; heroPrimaryAction?: any; heroPrimaryUrl?: string; heroSecondaryLabel?: string; heroSecondaryAction?: any; heroSecondaryUrl?: string; heroMockupImageUrl?: string; colors?: ArchFlutterColors; galleryUrls?: string[]; selectorLabel?: string; heroKicker?: string; heroHeading?: string; heroSubtext?: string; heroImageUrl?: string; aboutHeading?: string; aboutStory?: string; aboutImageUrl?: string; categoriesHeading?: string; categoriesSubtext?: string; servicesHeading?: string; servicesSubtext?: string; packagesHeading?: string; packagesSubtext?: string; resultsHeading?: string; reelsHeading?: string; reelsSubtext?: string; teamHeading?: string; reviewsHeading?: string; galleryHeading?: string; }
export interface ArchFlutterFaq { id: string; question: string; answer: string; }
export interface ArchFlutterOffer { id: string; title?: string; description?: string; discount?: string; code?: string; headline?: string; detail?: string; imageUrl?: string; }
export interface ArchFlutterPackage { id: string; title: string; price: number; services: string[]; tier?: string; name?: string; durationMinutes?: number; includes?: string[]; imageUrl?: string; }
export interface ArchFlutterReel { id: string; title: string; videoUrl?: string; thumbnail?: string; caption?: string; sourceUrl?: string; previewVideoUrl?: string; posterUrl?: string; }
export interface ArchFlutterReview { id: string; name: string; rating: number; comment?: string; date?: string; area?: string; service?: string; quote?: string; avatarUrl?: string; }
export interface ArchFlutterBeforeAfter { id: string; title: string; beforeUrl?: string; afterUrl?: string; alt?: string; before?: string; after?: string; }
export interface ArchFlutterHeroAction { label: string; href: string; primary?: boolean; }

// Vogue Noir types
export interface VogueNoirAcademyCourse { id: string; title: string; duration: string; fee: number; description?: string; summary?: string; batchOverride?: string; syllabus?: string[]; imageUrl?: string; imageAlt?: string; certification?: string; emiNote?: string; }
export interface VogueNoirBeforeAfterItem { id: string; title: string; beforeUrl: string; afterUrl: string; category?: string; beforeAlt?: string; afterAlt?: string; }
export interface VogueNoirBridalPackage { id: string; title?: string; price: number; inclusions: string[]; tier?: string; popular?: boolean; badgeLabel?: string; imageUrl?: string; imageAlt?: string; linkedServiceId?: string; }
export interface VogueNoirConfig { enabled: boolean; selectorLabel?: string; heroHeading?: string; heroSubtext?: string; heroDesktopUrl?: string; heroMobileUrl?: string; aboutHeading?: string; aboutStory?: string; aboutImageUrl?: string; publicEmail?: string; workingHoursDisplay?: string; mapEmbedUrl?: string; gstin?: string; sacCode?: string; gstPricing?: 'inclusive' | 'exclusive' | ''; colors?: VogueNoirThemeColors; stats?: VogueNoirStatItem[]; bridalPackages?: VogueNoirBridalPackage[]; academyEnabled?: boolean; academyHeading?: string; academySubtext?: string; academyHeroUrl?: string; academyHighlights?: string[]; academyScheduleText?: string; courses?: VogueNoirAcademyCourse[]; portfolio?: VogueNoirPortfolioItem[]; beforeAfter?: VogueNoirBeforeAfterItem[]; reviews?: VogueNoirReviewItem[]; faqs?: VogueNoirFaqItem[]; }
export interface VogueNoirFaqItem { id: string; question: string; answer: string; }
export type VogueNoirPortfolioCategory = 'Bridal' | 'Party' | 'Editorial' | 'Academy Work' | string;
export interface VogueNoirPortfolioItem { id: string; title: string; imageUrl: string; category: VogueNoirPortfolioCategory; alt?: string; }
export interface VogueNoirReviewItem { id: string; name: string; rating: number; comment?: string; tag?: string; quote?: string; avatarUrl?: string; }
export interface VogueNoirStatItem { id: string; label: string; value: string; }
export interface VogueNoirThemeColors { obsidian?: string; gold?: string; bgPrimary?: string; bgSurface?: string; borderSubtle?: string; accentGold?: string; textPrimary?: string; textMuted?: string; highlightBlush?: string; }
