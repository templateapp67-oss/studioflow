import type { BusinessTypeId } from '../types';
import { NEXORA_TEMPLATE_META, type NexoraTemplateMeta } from './nexoraTemplateCatalogue';
import { nexoraPreviewImage } from './nexoraPreviewImages';

/** Small, text-and-image-only data for the signed-out template library. */
export interface NexoraTemplateCardData {
  id: BusinessTypeId;
  title: string;
  shortName: string;
  tagline: string;
  coverImageUrl: string;
  /** Owner-workspace cards may also provide their live sample menu/location. */
  defaultCity?: string;
  services?: Array<{ id?: string; name: string; category?: string; price?: number }>;
  subCategories?: string[];
}

export function publicTemplateCard(meta: NexoraTemplateMeta): NexoraTemplateCardData {
  return {
    id: meta.templateId,
    title: meta.salonBrand,
    shortName: meta.shortName,
    tagline: meta.shortDescription,
    coverImageUrl: nexoraPreviewImage({ id: meta.templateId, coverImageUrl: '' }),
  };
}

/** Avoid importing the full owner/editor catalogue into the marketing entry. */
export const NEXORA_PUBLIC_TEMPLATES: NexoraTemplateCardData[] = NEXORA_TEMPLATE_META.map(publicTemplateCard);

export const NEXORA_PUBLIC_TEMPLATES_BY_ID = Object.fromEntries(
  NEXORA_PUBLIC_TEMPLATES.map((template) => [template.id, template]),
) as Record<BusinessTypeId, NexoraTemplateCardData>;
