import type { SalonProfile, SalonService } from '../types';

export type ClinicGroup = 'skin' | 'hair' | 'cosmetology';

/**
 * Turns whatever the services value happens to be into a real array without
 * touching the services themselves. Supported shapes: an array, a JSON string,
 * or an object wrapping the array in `data`, `services`, `items` or `rows`
 * (the shapes returned by Supabase RPCs, cached drafts and template config).
 * Anything else becomes an empty array and is reported in development only.
 */
export function normalizeServices<T = SalonService>(value: unknown, source = 'services'): T[] {
  const seen = new Set<unknown>();
  const unwrap = (input: unknown): T[] | null => {
    if (Array.isArray(input)) return input as T[];
    if (typeof input === 'string') {
      try { return unwrap(JSON.parse(input)); } catch { return null; }
    }
    if (input && typeof input === 'object' && !seen.has(input)) {
      seen.add(input);
      const record = input as Record<string, unknown>;
      for (const key of ['data', 'services', 'items', 'rows']) {
        if (key in record) {
          const found = unwrap(record[key]);
          if (found) return found;
        }
      }
    }
    return null;
  };
  const result = unwrap(value);
  if (result) return result;
  if (value !== null && value !== undefined && (import.meta as any).env?.DEV) {
    console.warn(`[services] ${source} was not an array (received ${typeof value}); using an empty list.`);
  }
  return [];
}

export function clinicIds(value: unknown): string[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function dermacureMenu(profile: Partial<SalonProfile> | null | undefined, services: unknown): SalonService[] {
  const list = normalizeServices<SalonService>(services, 'dermacureMenu services');
  const headings = ((profile as any)?.sectionHeadings || {}) as Record<string, string>;
  const hidden = new Set(clinicIds(headings.clinicHiddenServices));
  const order = clinicIds(headings.clinicServiceOrder);
  return list
    .filter(s => s && !hidden.has(s.id))
    .slice()
    .sort((a, b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
      return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
    });
}

export function dermacureFeatured(profile: Partial<SalonProfile> | null | undefined, services: unknown): SalonService[] {
  const list = normalizeServices<SalonService>(services, 'dermacureFeatured services');
  const selection = clinicIds(((profile as any)?.sectionHeadings || {}).clinicFeaturedServices);
  const chosen = selection.map(id => list.find(s => s.id === id)).filter((s): s is SalonService => !!s);
  return [
    ...chosen,
    ...list.filter(s => !chosen.includes(s) && s.popular),
    ...list.filter(s => !chosen.includes(s) && !s.popular),
  ].slice(0, 3);
}

export function clinicServiceGroup(profile: Partial<SalonProfile> | null | undefined, service: SalonService): ClinicGroup {
  let overrides: Record<string, string> = {};
  try { overrides = JSON.parse(((profile as any)?.sectionHeadings?.clinicServiceGroups) || '{}'); } catch { /* ignore invalid JSON */ }
  const group = overrides[service.id];
  if (group === 'skin' || group === 'hair' || group === 'cosmetology') return group;
  const text = `${service.name} ${service.category}`.toLowerCase();
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
  return clinicServiceIsPublished(service)
    && service.clinicFeeStatus === 'verified'
    && service.clinicPriceVerified === true
    && typeof service.price === 'number'
    && Number.isFinite(service.price)
    && service.price >= 0;
}

/** Public clinic menu: (profile, services). `services` may arrive in any supported shape. */
export function clinicPublicServices(profile: Partial<SalonProfile> | null | undefined, services: unknown): SalonService[] {
  const list = normalizeServices<SalonService>(services, 'clinicPublicServices services');
  const ids = new Set(list.map(s => s?.id));
  const rawEnquiry = (profile as any)?.clinicEnquiryServices;
  const enquiry = normalizeServices<SalonService>(rawEnquiry, 'clinicEnquiryServices').filter(s => s && !ids.has(s.id));
  const menu = dermacureMenu(profile, [...list, ...enquiry]);
  return (profile as any)?.subdomain ? menu.filter(clinicServiceIsPublished) : menu;
}

export function clinicPriceLabel(service: any, currency = '₹'): string {
  if (clinicPriceIsVerified(service)) return `${currency}${service.price.toLocaleString('en-IN')}`;
  if (service?.clinicDemoData === true && typeof service.price === 'number' && Number.isFinite(service.price) && service.price >= 0) {
    return `Demo price · ${currency}${service.price.toLocaleString('en-IN')}`;
  }
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
