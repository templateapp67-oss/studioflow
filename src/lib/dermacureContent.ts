import { normalizeServices } from './normalizeServices';

export { normalizeServices } from './normalizeServices';

/** Website menu group for a clinic service. */
export type ClinicGroup = 'skin' | 'hair' | 'cosmetology';

/** Parses a saved id list stored as a JSON string (or given as a plain array). */
export function clinicIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((id) => typeof id === 'string');
  try {
    const parsed = JSON.parse((typeof value === 'string' ? value : '') || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Visible menu order: hidden services are removed and the owner-saved order
 * (`sectionHeadings.clinicServiceOrder`) is applied; everything else keeps its
 * original order.
 */
export function dermacureMenu(profile: any, services: unknown): any[] {
  const list = normalizeServices<any>(services);
  const headings = (profile && profile.sectionHeadings) || {};
  const hidden = new Set(clinicIds(headings.clinicHiddenServices));
  const order = clinicIds(headings.clinicServiceOrder);
  return list.filter((s) => s && !hidden.has(s.id)).slice().sort((a, b) => {
    const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
    return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
  });
}

/**
 * Signature/featured cards: the owner-saved featured ids in their saved order,
 * then popular services, then the rest — up to three cards.
 */
export function dermacureFeatured(profile: any, services: unknown): any[] {
  const list = normalizeServices<any>(services);
  const selection = clinicIds(profile?.sectionHeadings?.clinicFeaturedServices);
  const chosen = selection.map((id) => list.find((s) => s && s.id === id)).filter((s) => !!s);
  return [...chosen, ...list.filter((s) => !chosen.includes(s) && s.popular), ...list.filter((s) => !chosen.includes(s) && !s.popular)].slice(0, 3);
}

/** Website category of a service: the owner-saved group wins, then name/category keywords. */
export function clinicServiceGroup(profile: any, service: any): ClinicGroup {
  let overrides: Record<string, unknown> = {};
  try {
    overrides = JSON.parse(profile?.sectionHeadings?.clinicServiceGroups || '{}');
  } catch {
    overrides = {};
  }
  const group = service?.id ? overrides[service.id] : undefined;
  if (group === 'skin' || group === 'hair' || group === 'cosmetology') return group;
  const text = `${service?.name || ''} ${service?.category || ''}`.toLowerCase();
  if (/hair|scalp|alopecia|dandruff/.test(text)) return 'hair';
  if (/dermatolog|consultation|acne|scar|pigment|melasma|eczema|dermatitis|psoriasis|warts|rosacea|skin concern|skin treatment/.test(text)) return 'skin';
  return 'cosmetology';
}

export function clinicServiceIsApproved(service: any): boolean {
  return service?.clinicServiceApproved === true;
}

export function clinicServiceIsPublished(service: any): boolean {
  return clinicServiceIsApproved(service) && service?.clinicPublicationStatus === 'published';
}

export function clinicPriceIsVerified(service: any): boolean {
  return clinicServiceIsPublished(service) && service?.clinicFeeStatus === 'verified' && service?.clinicPriceVerified === true && typeof service?.price === 'number' && Number.isFinite(service.price) && service.price >= 0;
}

/**
 * Public menu for a clinic website. Enquiry-only services saved on the profile
 * are merged in; on a live published site (profile has a subdomain) only
 * approved + published services remain, in the owner-saved menu order.
 * Template previews (no subdomain) keep the whole menu.
 */
export function clinicPublicServices(profile: any, services: unknown): any[] {
  const list = normalizeServices<any>(services);
  const ids = new Set(list.map((s) => s?.id));
  const enquiry = (Array.isArray(profile?.clinicEnquiryServices) ? profile.clinicEnquiryServices : []).filter((s) => s && !ids.has(s.id));
  const menu = dermacureMenu(profile, [...list, ...enquiry]);
  return profile?.subdomain ? menu.filter(clinicServiceIsPublished) : menu;
}

/**
 * Price label for the public site. Verified fees show the plain amount;
 * unverified demo fees are clearly labelled "Demo price · ₹X"; everything
 * else asks the client to contact the clinic (never a misleading ₹0).
 */
export function clinicPriceLabel(service: any, currency = '₹'): string {
  if (clinicPriceIsVerified(service)) return `${currency}${service.price.toLocaleString('en-IN')}`;
  if (service?.clinicDemoData === true && typeof service?.price === 'number' && Number.isFinite(service.price) && service.price >= 0) {
    return `Demo price · ${currency}${service.price.toLocaleString('en-IN')}`;
  }
  return 'Contact clinic for pricing';
}

/** Returns the public clinic email when valid, otherwise an empty string. */
export function clinicPublicEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim() : '';
  return email.length <= 254 && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i.test(email) ? email : '';
}

/** Normalizes a phone number for tel: links; returns '' when invalid. */
export function clinicPhone(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\+?[0-9\s().-]+$/.test(text)) return '';
  const digits = text.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? (text.startsWith('+') ? '+' : '') + digits : '';
}
