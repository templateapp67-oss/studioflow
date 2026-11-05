import type { CategoryTemplateConfig } from '../types';

/**
 * Bundled copies/reference artwork for registry covers that otherwise depend on
 * remote stock hosts. The registry's coverImageUrl remains untouched; this is
 * presentation-only and keeps the public gallery reliable offline and in CI.
 */
const BUNDLED_PREVIEW_ARTWORK: Record<string, string> = {
  barber: '/templates/barber/hero.jpg',
  hair_spa: '/templates/kesh-prakriti/hero-reference.jpg',
  tattoo_studio: '/templates/12/media/studio-practice.jpg',
  lash_brow: '/templates/13/preview.jpg',
  aurelia_beauty_parlour: '/templates/aurelia/hero.jpg',
};

export function nexoraPreviewImage(template: Pick<CategoryTemplateConfig, 'id' | 'coverImageUrl'>) {
  return BUNDLED_PREVIEW_ARTWORK[template.id] || template.coverImageUrl;
}
