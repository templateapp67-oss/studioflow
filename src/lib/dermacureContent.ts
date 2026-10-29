import type { SalonService, SalonProfile } from '../types';

function ids(value?: string): string[] {
  try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []; } catch { return []; }
}
export function dermacureMenu(profile: SalonProfile, services: SalonService[]) {
  const headings = profile.sectionHeadings || {};
  const hidden = new Set(ids(headings.clinicHiddenServices));
  const order = ids(headings.clinicServiceOrder);
  return services.filter(s => !hidden.has(s.id)).slice().sort((a, b) => {
    const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
  });
}
export function dermacureFeatured(profile: SalonProfile, services: SalonService[]) {
  const selection = ids(profile.sectionHeadings?.clinicFeaturedServices);
  const chosen = selection.map(id => services.find(s => s.id === id)).filter((s): s is SalonService => !!s);
  return [...chosen, ...services.filter(s => !chosen.includes(s) && s.popular), ...services.filter(s => !chosen.includes(s) && !s.popular)].slice(0, 3);
}
export function clinicIds(value?: string) { return ids(value); }

export type ClinicGroup = 'skin' | 'hair' | 'cosmetology';
export function clinicServiceGroup(profile: SalonProfile, service: SalonService): ClinicGroup {
  let overrides: Record<string, string> = {};
  try { overrides = JSON.parse(profile.sectionHeadings?.clinicServiceGroups || '{}'); } catch { /* use the catalogue category */ }
  const group = overrides[service.id];
  if (group === 'skin' || group === 'hair' || group === 'cosmetology') return group;
  const text = `${service.name} ${service.category}`.toLowerCase();
  if (/hair|scalp|alopecia|dandruff/.test(text)) return 'hair';
  if (/acne|scar|pigment|melasma|eczema|dermatitis|psoriasis|warts|rosacea|skin concern/.test(text)) return 'skin';
  return 'cosmetology';
}

/** Owner confirmation is explicit: editing an unrelated field does not verify a service or fee. */
export function clinicServiceIsApproved(service: SalonService) { return service.clinicServiceApproved === true; }
export function clinicServiceIsPublished(service: SalonService) { return clinicServiceIsApproved(service) && service.clinicPublicationStatus === 'published'; }
export function clinicPriceIsVerified(service: SalonService) { return clinicServiceIsPublished(service) && service.clinicFeeStatus === 'verified' && service.clinicPriceVerified === true && typeof service.price === 'number' && Number.isFinite(service.price) && service.price >= 0; }
export function clinicPublicServices(profile: SalonProfile, services: SalonService[]) {
  // Published snapshots hold fee-on-request services separately with the price
  // omitted, so they cannot be selected by existing booking/checkout APIs.
  const ids = new Set(services.map(s => s.id));
  const enquiry = (Array.isArray(profile.clinicEnquiryServices) ? profile.clinicEnquiryServices : []).filter(s => s && !ids.has(s.id));
  const menu = dermacureMenu(profile, [...services, ...enquiry]);
  // Unsaved template previews show examples, never as real offerings or fees.
  return profile.subdomain ? menu.filter(clinicServiceIsPublished) : menu;
}
export function clinicPriceLabel(service: SalonService, currency = '₹') {
  return clinicPriceIsVerified(service) ? `${currency}${service.price.toLocaleString('en-IN')}` : 'Contact clinic for pricing';
}

/** Never substitute the private account email for a public clinic address. */
export function clinicPublicEmail(value?:string):string {
 const email=typeof value==='string'?value.trim():'';
 return email.length<=254&&/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i.test(email)?email:'';
}

/** Only expose a callable number, not an empty or malformed tel link. */
export function clinicPhone(value?:string):string {
 const text=typeof value==='string'?value.trim():'';
 if(!/^\+?[0-9\s().-]+$/.test(text)) return '';
 const digits=text.replace(/\D/g,'');
 return digits.length>=10&&digits.length<=15?(text.startsWith('+')?'+':'')+digits:'';
}
