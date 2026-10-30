export function clinicPriceIsVerified(service: any): boolean {
  return !!service.clinicPriceVerified;
}

export function clinicPublicServices(services: any[]): any[] {
  return services.filter(s => s.clinicPublicationStatus === 'published');
}

export function clinicServiceIsPublished(service: any): boolean {
  return service.clinicPublicationStatus === 'published';
}

export const clinicIds = {
  consultation: 'clinic-consult',
  treatment: 'clinic-treat'
};

export function clinicServiceGroup(service: any): string {
  return service.category || 'general';
}

export const clinicPublicEmail = 'contact@dermacure.clinic';
export const clinicPhone = '+91 98765 43210';

export function clinicPriceLabel(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

export const dermacureFeatured = [
  { id: 't1', title: 'Laser Hair Reduction', price: 2000 },
  { id: 't2', title: 'Chemical Peel', price: 3500 }
];
