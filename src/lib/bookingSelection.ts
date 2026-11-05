import type {SalonService, Stylist} from '../types';

export const MAX_BOOKING_SERVICES = 10;

export function toggleBookingService(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter(value => value !== id);
  return ids.length < MAX_BOOKING_SERVICES ? [...ids, id] : ids;
}

export function summarizeBookingServices(services: SalonService[]) {
  return {
    serviceName: services.map(service => service.name).join(' + '),
    subtotal: Math.round(services.reduce((sum, service) => sum + service.price, 0) * 100) / 100,
    totalMinutes: services.reduce((sum, service) => sum + service.durationMinutes, 0),
  };
}

/** Eligibility is authoritative on the server; never invent staff for missing IDs. */
export function resolveBookingSpecialists(ids: string[], published: Stylist[], fallback: Stylist[]): Stylist[] {
  const profiles = new Map(fallback.map(staff => [staff.id, staff]));
  for (const staff of published) {
    if (staff && typeof staff.id === 'string' && typeof staff.name === 'string') profiles.set(staff.id, staff);
  }
  return [...new Set(ids)].flatMap(id => {
    const staff = profiles.get(id);
    return staff ? [staff] : [];
  });
}
