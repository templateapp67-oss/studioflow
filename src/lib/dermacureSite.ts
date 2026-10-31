export const dermacureSiteDefaults = {
  brandName: 'DermaCure Skin Clinic',
  address: 'Premium Skin Centre',
  phone: '+91 98765 43210'
};

export const clinicGalleryEntries = [
  { id: 'g1', url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80', title: 'Clinic Reception' },
  { id: 'g2', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80', title: 'Treatment Room' }
];

export const DERMACURE_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1579684385127-1d15d568112e?auto=format&fit=crop&w=1200&q=80',
  philosophy: 'https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=800&q=80'
};

export function dermacureTeamPortrait(stylist: any): string {
  return stylist.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
}

export function isBundledClinicPhoto(url: string): boolean {
  return url.includes('unsplash');
}
