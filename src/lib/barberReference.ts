// Design reference: profit-studio-projects-free/barbershop-booking-website.
/**
 * Centralised image catalog. Swap any URL here to retheme the site.
 * All images are sourced from Unsplash (royalty-free) and tuned with
 * `auto=format&fit=crop&q=80` for responsive delivery.
 */

export const BARBER_REFERENCE_IMAGES = {
  hero:
    "/templates/royal-blade/hero.webp",
  heroSecondary:
    "/templates/royal-blade/feature.webp",
  aboutPrimary:
    "/templates/royal-blade/feature.webp",
  aboutSecondary:
    "/templates/royal-blade/hero.webp",
  bookingAccent:
    "/templates/royal-blade/shave.webp",
  signature:
    "/templates/royal-blade/feature.webp",
  fade:
    "/templates/royal-blade/feature.webp",
  beard:
    "/templates/royal-blade/shave.webp",
  cutBeard:
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80",
  shave:
    "/templates/royal-blade/shave.webp",
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
