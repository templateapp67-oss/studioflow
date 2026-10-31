export const dermacureSiteDefaults = {
  brandName: 'DermaCure Skin Clinic',
  address: 'Premium Skin Centre',
  phone: '+91 98765 43210'
};

export function clinicGalleryEntries(photosInput?: any[]): any[] {
  if (Array.isArray(photosInput) && photosInput.length > 0) {
    return photosInput.map((p, i) => (
      typeof p === 'string'
        ? { id: `photo-${i}`, url: p, title: `Clinic Gallery Photo ${i + 1}` }
        : p && typeof p === 'object' ? p : { id: `photo-${i}`, url: String(p), title: `Photo ${i + 1}` }
    ));
  }
  return [
    { id: 'g1', url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80', title: 'Clinic Reception' },
    { id: 'g2', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80', title: 'Treatment Room' }
  ];
}

export const DERMACURE_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1579684385127-1d15d568112e?auto=format&fit=crop&w=1200&q=80',
  philosophy: 'https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=800&q=80'
};

export function dermacureTeamPortrait(stylist?: any): string {
  if (stylist && typeof stylist === 'object' && stylist.avatarUrl) {
    return stylist.avatarUrl;
  }
  return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
}

export function isBundledClinicPhoto(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('unsplash') || url.includes('/templates/dermacure/');
}
