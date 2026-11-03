/**
 * Canonical NEXORA presentation data loaded from the catalogue.
 *
 * The metadata itself lives in `nexoraTemplateCatalogue.ts` (data only); this
 * module adds the lookup helpers that need the live template registry.
 */
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import type { CategoryTemplateConfig } from '../types';
import {
  NEXORA_TEMPLATE_META,
  nexoraTemplateMeta,
  sortTemplatesByPriority,
  type NexoraTemplateMeta,
} from './nexoraTemplateCatalogue';

/** Template registry entries in the fixed NEXORA priority order. */
export function nexoraTemplates(): CategoryTemplateConfig[] {
  return sortTemplatesByPriority(Object.values(CATEGORY_TEMPLATES));
}

/** Metadata for a template, falling back to a generic NEXORA label. */
export function nexoraMetaOrFallback(templateId: string): NexoraTemplateMeta {
  const meta = nexoraTemplateMeta(templateId);
  if (meta) return meta;
  const template = CATEGORY_TEMPLATES[templateId];
  return {
    templateId: templateId as NexoraTemplateMeta['templateId'],
    categoryId: 'uncategorised',
    categoryName: 'Salon',
    displayName: template?.title ? `NEXORA ${template.title}` : 'NEXORA Salon Template',
    salonBrand: template?.title || '',
    shortName: template?.shortName || 'Salon',
    shortDescription: template?.tagline || '',
    bestFor: 'Salon and wellness businesses.',
    services: (template?.services || []).slice(0, 5).map((service) => service.name),
    priorityRank: 99,
    displayOrder: 99,
    templateNumber: '—',
    searchTags: [],
    icon: 'Scissors',
    badge: 'Template',
    previewLabel: 'Salon template',
  };
}

/** Display name for a template id — always the NEXORA name when known. */
export function nexoraName(templateId: string, fallback = ''): string {
  return nexoraTemplateMeta(templateId)?.displayName || fallback || nexoraMetaOrFallback(templateId).displayName;
}

/** All 15 NEXORA names, in priority order. */
export const NEXORA_TEMPLATE_NAMES = NEXORA_TEMPLATE_META.map((meta) => meta.displayName);
