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

export interface SocialVideo {
  id: string;
  title: string;
  url: string;
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
  origin?: string;
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
  notes?: string;
  createdAt?: string;
  paymentStatus?: 'pending' | 'paid' | 'refunded' | string;
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
export interface ShringaarBeforeAfter { id: string; title: string; beforeUrl: string; afterUrl: string; }
export interface ShringaarCollectionItem { id: string; title: string; imageUrl: string; }
export interface ShringaarFaqItem { id: string; question: string; answer: string; }
export interface ShringaarLookItem { id: string; title: string; imageUrl: string; category?: string; }
export interface ShringaarPackageItem { id: string; title: string; price: number; services: string[]; }
export interface ShringaarProcessStep { id: string; stepNumber: number; title: string; description: string; }
export interface ShringaarReviewItem { id: string; name: string; rating: number; text: string; date?: string; }
export interface ShringaarRoyalColors { maroon: string; gold: string; cream: string; }
export interface ShringaarRoyalConfig { enabled: boolean; headline?: string; }
export interface ShringaarStatItem { label: string; value: string; }

// Vogue Noir types
export interface VogueNoirAcademyCourse { id: string; title: string; duration: string; fee: number; description: string; }
export interface VogueNoirBeforeAfterItem { id: string; title: string; beforeUrl: string; afterUrl: string; }
export interface VogueNoirBridalPackage { id: string; title: string; price: number; inclusions: string[]; }
export interface VogueNoirConfig { enabled: boolean; }
export interface VogueNoirFaqItem { id: string; question: string; answer: string; }
export interface VogueNoirPortfolioCategory { id: string; label: string; }
export interface VogueNoirPortfolioItem { id: string; title: string; imageUrl: string; category: string; }
export interface VogueNoirReviewItem { id: string; name: string; rating: number; comment: string; }
export interface VogueNoirStatItem { label: string; value: string; }
export interface VogueNoirThemeColors { obsidian: string; gold: string; }
