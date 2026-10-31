import type { SalonProfile, CategoryTemplateConfig } from '../types';

export function applyTemplateDesign(profile: SalonProfile, template: CategoryTemplateConfig): SalonProfile {
  return {
    ...profile,
    businessType: template.id,
    selectedTemplateId: template.id,
    layoutStyle: template.layoutStyle,
    themePreset: template.themePreset,
    paletteLabel: template.paletteLabel,
    themeStyle: template.themeStyle
  };
}
