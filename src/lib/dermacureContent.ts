import { normalizeServices } from './normalizeServices';

export { normalizeServices };

export function clinicPriceIsVerified(service: any): boolean {
  return !!(service && (service.clinicPriceVerified || service.clinicFeeStatus === 'verified'));
}

export function clinicPublicServices(profileOrServices: any, servicesArg?: any): any[] {
  let profile: any;
  let servicesInput: any;

  if (servicesArg !== undefined) {
    profile = profileOrServices;
    servicesInput = servicesArg;
  } else {
    profile = null;
    servicesInput = profileOrServices;
  }

  const list = normalizeServices(servicesInput);

  if (profile && typeof profile === 'object' && profile.subdomain) {
    return list.filter(
      (s: any) =>
        s &&
        s.clinicPublicationStatus === 'published' &&
        s.clinicServiceApproved !== false
    );
  }

  return list;
}

export function clinicServiceIsPublished(service: any): boolean {
  return Boolean(service && service.clinicPublicationStatus === 'published');
}

export const clinicIds = {
  consultation: 'clinic-consult',
  treatment: 'clinic-treat'
};

export function clinicServiceGroup(service: any): string {
  return (service && service.category) || 'general';
}

export function clinicPublicEmail(profile?: any): string {
  if (profile && typeof profile === 'object' && profile.email && typeof profile.email === 'string') {
    return profile.email.trim();
  }
  return 'contact@dermacure.clinic';
}

export function clinicPhone(value?: any): string {
  if (value && typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && value.phone && typeof value.phone === 'string') return value.phone.trim();
  return '+91 98765 43210';
}

export function clinicPriceLabel(serviceOrPrice: any, currency = '₹'): string {
  if (typeof serviceOrPrice === 'number') {
    return `${currency}${Number(serviceOrPrice || 0).toLocaleString('en-IN')}`;
  }
  if (serviceOrPrice && typeof serviceOrPrice === 'object') {
    const price = Number(serviceOrPrice.price || 0);
    return `${currency}${price.toLocaleString('en-IN')}`;
  }
  return `${currency}0`;
}

export function dermacureFeatured(profile?: any, servicesInput?: any[]): any[] {
  const services = normalizeServices(servicesInput);
  if (services.length > 0) {
    const featured = services.filter((s: any) => s && (s.popular || s.clinicFeatured));
    if (featured.length > 0) return featured;
    return services.slice(0, 3);
  }
  return [
    { id: 't1', title: 'Laser Hair Reduction', name: 'Laser Hair Reduction', price: 2000, category: 'Aesthetic Dermatology' },
    { id: 't2', title: 'Chemical Peel', name: 'Chemical Peel', price: 3500, category: 'Clinical Dermatology' }
  ];
}
