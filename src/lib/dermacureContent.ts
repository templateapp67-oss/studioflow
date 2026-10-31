import type { SalonProfile, SalonService } from '../types';
import { normalizeServices } from './normalizeServices';

export type ClinicGroup = 'skin' | 'hair' | 'cosmetology';
export function clinicIds(value: unknown): string[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}
export function dermacureMenu(profile: SalonProfile | null | undefined, input: unknown): SalonService[] {
  const services = normalizeServices(input);
  const headings = (profile as any)?.sectionHeadings || {};
  const hidden = new Set(clinicIds(headings.clinicHiddenServices));
  const order = clinicIds(headings.clinicServiceOrder);
  return services.filter(s => !hidden.has(s.id)).slice().sort((a,b) => {
    const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
  });
}
export function dermacureFeatured(profile: SalonProfile | null | undefined, services: SalonService[]): SalonService[] {
  const selection = clinicIds((profile as any)?.sectionHeadings?.clinicFeaturedServices);
  const chosen = selection.map(id => services.find(s => s.id === id)).filter((s): s is SalonService => !!s);
  return [...chosen, ...services.filter(s => !chosen.includes(s) && s.popular), ...services.filter(s => !chosen.includes(s) && !s.popular)].slice(0,3);
}
export function clinicServiceGroup(profile: SalonProfile | null | undefined, service: SalonService): ClinicGroup {
  let overrides: Record<string, unknown> = {};
  try { overrides = JSON.parse((profile as any)?.sectionHeadings?.clinicServiceGroups || '{}') || {}; } catch {}
  const group = overrides[service.id];
  if (group === 'skin' || group === 'hair' || group === 'cosmetology') return group;
  const text = `${service.name || ''} ${service.category || ''}`.toLowerCase();
  if (/hair|scalp|alopecia|dandruff/.test(text)) return 'hair';
  if (/dermatolog|consultation|acne|scar|pigment|melasma|eczema|dermatitis|psoriasis|warts|rosacea|skin concern|skin treatment/.test(text)) return 'skin';
  return 'cosmetology';
}
export function clinicServiceIsApproved(service: any): boolean { return service?.clinicServiceApproved === true; }
export function clinicServiceIsPublished(service: any): boolean { return clinicServiceIsApproved(service) && service?.clinicPublicationStatus === 'published'; }
export function clinicPriceIsVerified(service: any): boolean {
  return clinicServiceIsPublished(service) && service.clinicFeeStatus === 'verified' && service.clinicPriceVerified === true && typeof service.price === 'number' && Number.isFinite(service.price) && service.price >= 0;
}
export function clinicPublicServices(profile: SalonProfile | null | undefined, input: unknown): SalonService[] {
  const services = normalizeServices(input);
  const ids = new Set(services.map(s => s.id));
  const enquiry = normalizeServices((profile as any)?.clinicEnquiryServices, false).filter(s => !ids.has(s.id));
  const menu = dermacureMenu(profile, [...services, ...enquiry]);
  return profile?.subdomain ? menu.filter(clinicServiceIsPublished) : menu;
}
export function clinicPriceLabel(service: any, currency = '₹'): string {
  if (clinicPriceIsVerified(service)) return `${currency}${service.price.toLocaleString('en-IN')}`;
  if (service?.clinicDemoData === true && typeof service.price === 'number' && Number.isFinite(service.price) && service.price >= 0) return `Demo price · ${currency}${service.price.toLocaleString('en-IN')}`;
  return 'Contact clinic for pricing';
}
export function clinicPublicEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim() : '';
  return email.length <= 254 && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i.test(email) ? email : '';
}
export function clinicPhone(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\+?[0-9\s().-]+$/.test(text)) return '';
  const digits = text.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? (text.startsWith('+') ? '+' : '') + digits : '';
}
