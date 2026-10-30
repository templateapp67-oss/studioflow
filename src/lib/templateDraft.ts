export function templateDraft(template: any) {
  return {
    profile: {
      businessName: template.title || 'Salon',
      tagline: template.tagline || '',
      about: template.about || '',
      city: template.defaultCity || 'New Delhi',
      address: template.defaultAddress || '',
      coverImageUrl: template.coverImageUrl || '',
      businessType: template.id || 'unisex_salon',
      themeStyle: template.themeStyle || {}
    },
    services: template.services || [],
    stylists: template.stylists || [],
    extras: { gallery: [] }
  };
}
