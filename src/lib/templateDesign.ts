export function applyTemplateDesign(profile: any, template: any) {
  return {
    ...profile,
    businessType: template.id || profile.businessType,
    coverImageUrl: template.coverImageUrl || profile.coverImageUrl,
    tagline: template.tagline || profile.tagline,
    themeStyle: template.themeStyle || profile.themeStyle
  };
}
