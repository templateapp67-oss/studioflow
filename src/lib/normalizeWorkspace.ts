import type { SalonProfile, SalonService, Stylist, ClientRecord, LoyaltyConfig } from '../types';

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

export function normalizeWorkspace(workspace: any, identityDefaults?: any): WorkspaceState {
  const profile = workspace?.profile || {};
  return {
    profile: {
      businessName: profile.businessName || identityDefaults?.salon_name || 'My Salon & Spa Studio',
      ownerName: profile.ownerName || identityDefaults?.full_name || 'Salon Owner',
      email: profile.email || identityDefaults?.email || '',
      phone: profile.phone || '',
      city: profile.city || 'Mumbai',
      address: profile.address || '',
      postalCode: profile.postalCode || '',
      selectedTemplateId: profile.selectedTemplateId || 'hair_salon',
      layoutStyle: profile.layoutStyle || 'modern',
      themePreset: profile.themePreset || 'default',
      paletteLabel: profile.paletteLabel || 'Default Palette',
      themeStyle: profile.themeStyle || {},
      ...profile
    },
    services: Array.isArray(workspace?.services) ? workspace.services : [],
    stylists: Array.isArray(workspace?.stylists) ? workspace.stylists : [],
    clients: Array.isArray(workspace?.clients) ? workspace.clients : [],
    loyaltyConfig: workspace?.loyaltyConfig || { enabled: false, pointsPerRupee: 1, tiers: [], pointsPerVisit: 0, pointsPerHundredSpent: 0, tierMultipliers: {}, tierThresholds: {} },
    onboardingComplete: !!workspace?.onboardingComplete,
    gallery: Array.isArray(workspace?.gallery) ? workspace.gallery : [],
    policies: Array.isArray(workspace?.policies) ? workspace.policies : [],
    extras: workspace?.extras || {}
  };
}
export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}
