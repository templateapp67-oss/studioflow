import type { SalonProfile, SalonService, Stylist, ClientRecord, LoyaltyConfig, BusinessTypeId } from '../types';
import { normalizeServices } from './normalizeServices';
import { createDemoVideos, showcaseVideos } from './showcaseVideos';
import { demoTestimonials, lookbookPhotos } from './demoWebsiteContent';
import { seedSalonOffers } from './salonOffers';

export interface WorkspaceState {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  clients: ClientRecord[];
  loyaltyConfig: LoyaltyConfig;
  onboardingComplete: boolean;
  gallery?: any[];
  policies?: any[];
  extras?: any;
}

export function normalizeWorkspace(workspaceInput: any, identityDefaults?: any): WorkspaceState {
  let workspace = workspaceInput;
  if (typeof workspace === 'string') {
    try {
      workspace = JSON.parse(workspace);
    } catch {
      workspace = {};
    }
  }
  const rawProfile = workspace?.profile || {};
  const profile: SalonProfile = {
    businessName: rawProfile.businessName || identityDefaults?.salon_name || 'My Salon & Spa Studio',
    ownerName: rawProfile.ownerName || identityDefaults?.full_name || 'Salon Owner',
    email: rawProfile.email || identityDefaults?.email || '',
    phone: rawProfile.phone || '',
    city: rawProfile.city || 'Mumbai',
    address: rawProfile.address || '',
    postalCode: rawProfile.postalCode || '',
    selectedTemplateId: rawProfile.selectedTemplateId || rawProfile.businessType || 'hair_salon',
    layoutStyle: rawProfile.layoutStyle || 'modern',
    themePreset: rawProfile.themePreset || 'default',
    paletteLabel: rawProfile.paletteLabel || 'Default Palette',
    themeStyle: rawProfile.themeStyle || {},
    ...rawProfile
  };
  const demoType = (profile.selectedTemplateId || profile.businessType || 'hair_salon') as BusinessTypeId;

  // Fresh profiles open with five labelled demo reference reels; once seeded
  // (or deleted by the owner) the flag keeps them from coming back.
  if (!profile.socialVideos?.length && !profile.demoVideosInitialized) {
    profile.socialVideos = createDemoVideos(profile.businessType || 'hair_salon');
    profile.demoVideosInitialized = true;
  } else {
    profile.socialVideos = showcaseVideos(profile);
  }

  // Demo reviews: seed once, never overwrite owner content, replace only when
  // the demo set belongs to a different template than the selected one.
  const testimonials = Array.isArray(profile.websiteTestimonials) ? profile.websiteTestimonials : [];
  if (testimonials.length && testimonials.every((r) => r.isDemo) && testimonials[0]?.id !== `demo-review-${demoType}-1`) {
    profile.websiteTestimonials = demoTestimonials(demoType);
    profile.demoTestimonialsInitialized = true;
  } else if (!testimonials.length && !profile.demoTestimonialsInitialized) {
    profile.websiteTestimonials = demoTestimonials(demoType);
    profile.demoTestimonialsInitialized = true;
  }

  // Template 13 seeds its six sample offers once; other templates stay untouched.
  const seededOffers = seedSalonOffers(profile);
  if (seededOffers !== undefined) profile.promoOffers = seededOffers;

  const extras: any = { ...(workspace?.extras || {}) };
  if (!Array.isArray(extras.gallery)) extras.gallery = Array.isArray(workspace?.gallery) ? workspace.gallery : [];
  if (!extras.gallery.length && !profile.demoGalleryInitialized) {
    extras.gallery = lookbookPhotos({ ...profile, demoGalleryInitialized: false }, []);
    profile.demoGalleryInitialized = true;
    profile.demoGalleryType = profile.businessType;
  } else {
    extras.gallery = lookbookPhotos(profile, extras.gallery);
  }

  return {
    profile,
    services: normalizeServices<SalonService>(workspace?.services),
    stylists: Array.isArray(workspace?.stylists) ? workspace.stylists : [],
    clients: Array.isArray(workspace?.clients) ? workspace.clients : [],
    loyaltyConfig: workspace?.loyaltyConfig || { enabled: false, pointsPerRupee: 1, tiers: [], pointsPerVisit: 0, pointsPerHundredSpent: 0, tierMultipliers: {}, tierThresholds: {} },
    onboardingComplete: !!workspace?.onboardingComplete,
    gallery: extras.gallery,
    policies: Array.isArray(workspace?.policies) ? workspace.policies : [],
    extras
  };
}
export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}
