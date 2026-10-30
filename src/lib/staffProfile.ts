export const STAFF_TITLES: Record<string, string[]> = new Proxy({
  hair_salon: ['Master Stylist', 'Hair Artist', 'Colorist'],
  barber: ['Master Barber', 'Fade Specialist'],
  beauty_parlour: ['Senior Beautician', 'Makeup Artist'],
  nail_studio: ['Nail Artist', 'Nail Tech'],
  hair_spa: ['Spa Therapist', 'Scalp Specialist'],
  skincare_clinic: ['MD Dermatologist', 'Cosmetologist'],
  makeup_studio: ['Bridal Artist', 'Editorial Makeup Lead'],
  massage_wellness: ['Ayurvedic Therapist', 'Wellness Lead'],
  hair_coloring: ['Master Colourist', 'Balayage Specialist'],
  bridal_lounge: ['Bridal Couture Specialist', 'Mehendi Lead'],
  tattoo_studio: ['Lead Tattoo Artist', 'Realism Specialist', 'Piercer'],
  lash_brow: ['Lash Master', 'Brow Artist']
}, {
  get: (target, prop) => {
    if (typeof prop === 'string' && target[prop]) return target[prop];
    return ['Senior Stylist', 'Specialist', 'Therapist', 'Salon Manager'];
  }
});

export function validStaffUrl(url?: string): string {
  return url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
}

export async function prepareStaffPhoto(file: File): Promise<string> {
  return Promise.resolve(URL.createObjectURL(file));
}
