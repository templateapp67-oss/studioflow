import type { SalonProfile, SalonService, Stylist, ClientRecord, LoyaltyConfig } from '../types';
import { DEFAULT_EXTRAS } from './workspaceDefaults';
import { DEFAULT_LOYALTY_CONFIG } from '../loyaltyData';
import { normalizeServices } from './dermacureContent';

export interface WorkspaceState {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  clients: ClientRecord[];
  loyaltyConfig: LoyaltyConfig;
  onboardingComplete: boolean;
  gallery?: any[];
  policies?: any;
  extras: any;
}
export function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Structural defaults only. Missing owner details stay blank for onboarding. */
export function normalizeWorkspace(workspace: any, identityDefaults?: any): WorkspaceState {
  const saved = isRecord(workspace) ? workspace : {};
  const profile = isRecord(saved.profile) ? saved.profile : {};
  const extras = isRecord(saved.extras) ? saved.extras : {};
  const loyalty = isRecord(saved.loyaltyConfig) ? saved.loyaltyConfig : {};
  return {
    ...saved,
    profile: {
      ...profile,
      businessName: profile.businessName ?? identityDefaults?.salon_name ?? '',
      ownerName: profile.ownerName ?? identityDefaults?.full_name ?? '',
      email: profile.email ?? identityDefaults?.email ?? '',
      phone: profile.phone ?? identityDefaults?.phone_number ?? '',
      city: profile.city ?? identityDefaults?.city ?? '',
      address: profile.address ?? '',
      postalCode: profile.postalCode ?? identityDefaults?.postal_code ?? '',
    } as SalonProfile,
    // A wrapped ({data|services: [...]}) or JSON-string menu is unwrapped, never dropped.
    services: normalizeServices<SalonService>(saved.services, 'saved workspace services').filter(isRecord) as SalonService[],
    stylists: Array.isArray(saved.stylists) ? saved.stylists.filter(isRecord).map((stylist: any) => ({...stylist, specialties: Array.isArray(stylist.specialties) ? stylist.specialties : [], assignedServices: Array.isArray(stylist.assignedServices) ? stylist.assignedServices : []})) as Stylist[] : [],
    clients: Array.isArray(saved.clients) ? saved.clients.filter(isRecord) as ClientRecord[] : [],
    loyaltyConfig: {...DEFAULT_LOYALTY_CONFIG, ...loyalty, tiers: Array.isArray(loyalty.tiers) ? loyalty.tiers : DEFAULT_LOYALTY_CONFIG.tiers, rewards: Array.isArray(loyalty.rewards) ? loyalty.rewards : []} as LoyaltyConfig,
    onboardingComplete: saved.onboardingComplete === true,
    extras: {
      ...DEFAULT_EXTRAS, ...extras,
      gallery: Array.isArray(extras.gallery) ? extras.gallery : Array.isArray(saved.gallery) ? saved.gallery : [],
      policies: {...DEFAULT_EXTRAS.policies, ...(isRecord(extras.policies) ? extras.policies : {})},
      whiteLabel: {...DEFAULT_EXTRAS.whiteLabel, ...(isRecord(extras.whiteLabel) ? extras.whiteLabel : {})},
    },
  };
}
