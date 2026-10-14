// Design reference: profit-studio-projects-free/barbershop-booking-website.
/**
 * Centralised image catalog. Swap any URL here to retheme the site.
 * All images are sourced from Unsplash (royalty-free) and tuned with
 * `auto=format&fit=crop&q=80` for responsive delivery.
 */

export const BARBER_REFERENCE_IMAGES = {
  hero:
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1600&q=80",
  heroSecondary:
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80",
  aboutPrimary:
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=80",
  aboutSecondary:
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1000&q=80",
  bookingAccent:
    "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80",
  signature:
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80",
  fade:
    "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1200&q=80",
  beard:
    "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80",
  cutBeard:
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80",
  shave:
    "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80",
  heritage:
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
  fallback:
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
};


export function barberServiceImage(name:string){
 if(/heritage|premium|package/i.test(name))return BARBER_REFERENCE_IMAGES.heritage;
 if(/shave|towel|razor/i.test(name))return BARBER_REFERENCE_IMAGES.shave;
 if(/beard/i.test(name))return BARBER_REFERENCE_IMAGES.beard;
 if(/fade/i.test(name))return BARBER_REFERENCE_IMAGES.fade;
 return BARBER_REFERENCE_IMAGES.signature;
}
