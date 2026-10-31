import type { SalonProfile, SalonService, Stylist } from '../types';
import { normalizeServices } from './dermacureContent';

export interface WorkspaceState {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
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
    // A wrapped ({data|services: [...]}) or JSON-string menu is unwrapped, never dropped.
    services: normalizeServices<SalonService>(workspace?.services, 'saved workspace services'),
    stylists: Array.isArray(workspace?.stylists) ? workspace.stylists : [],
    gallery: Array.isArray(workspace?.gallery) ? workspace.gallery : [],
    policies: Array.isArray(workspace?.policies) ? workspace.policies : [],
    extras: workspace?.extras || {}
  };
}
