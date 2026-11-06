import type { CategoryTemplateConfig } from '../types';

/**
 * First-party artwork used on NEXORA's public template cards. Keeping this map
 * independent of the full template registry lets the signed-out homepage avoid
 * downloading owner/editor service, staff and configuration data.
 */
export const NEXORA_PREVIEW_ARTWORK: Record<string, string> = {
  hair_salon: '/templates/luxury-editorial/hero-960.webp',
  barber: '/templates/barber/hero.jpg',
  beauty_parlour: '/templates/roop-mahal/hero-bridal.webp',
  nail_studio: '/templates/pinky-nails/hero-nail-artist.webp',
  unisex_salon: '/templates/aura-unisex/hero-main-720.webp',
  hair_spa: '/templates/kesh-prakriti/hero-reference.jpg',
  skincare_clinic: '/templates/dermacure/hero.webp',
  makeup_studio: '/templates/vogue-noir/hero-1.webp',
  massage_wellness: '/templates/bodhi-tree/preview.webp',
  hair_coloring: '/templates/10/hero.webp',
  bridal_lounge: '/templates/11/hero-bride.webp',
  tattoo_studio: '/templates/12/media/studio-practice.jpg',
  lash_brow: '/templates/13/preview.jpg',
  ayurvedic_spa: '/templates/14/hero-800.webp',
  mens_hair_studio: '/templates/15/hero.webp',
  aurelia_beauty_parlour: '/templates/aurelia/hero.webp',
};

export function nexoraPreviewImage(template: Pick<CategoryTemplateConfig, 'id' | 'coverImageUrl'>) {
  return NEXORA_PREVIEW_ARTWORK[template.id] || template.coverImageUrl;
}
