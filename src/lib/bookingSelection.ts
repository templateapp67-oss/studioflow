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

/**
 * Client-side fallback used ONLY while the specialist RPC is unavailable (function not
 * deployed yet, stale PostgREST schema cache, network error). It mirrors the SQL rule from
 * migration 202611050001 so the step can still render staff cards instead of a dead end:
 * the specialist must be Available, scheduled at the chosen branch (when schedules are
 * listed) and assigned to EVERY selected service (a missing/empty assignment list means
 * "all services"). The server stays authoritative: it re-validates eligibility when slots
 * are fetched and again when the booking is created.
 */
export function localEligibleSpecialists(stylists: Stylist[], serviceIds: string[], branchId = ''): Stylist[] {
  return stylists.filter(staff => {
    if (!staff || typeof staff.id !== 'string' || typeof staff.name !== 'string') return false;
    if ((staff.status ?? 'Available') !== 'Available') return false;
    if (branchId && staff.branchSchedules?.length && !staff.branchSchedules.some(item => item.branchId === branchId)) return false;
    const assigned = Array.isArray(staff.assignedServices) ? staff.assignedServices : [];
    return !assigned.length || serviceIds.every(id => assigned.includes(id));
  });
}

/**
 * Service names a specialist can be presented as "Expert in". Assigned services win because
 * they are what the eligibility check actually uses; listed expertise fills the gaps, and
 * free-text specialties are the last resort so the line never invents a service name.
 */
export function specialistExpertise(staff: Stylist, services: SalonService[]): string[] {
  const ids = [...(staff.assignedServices ?? []), ...(staff.expertiseServiceIds ?? [])];
  const names = [...new Set(ids)].flatMap(id => {
    const name = services.find(service => service.id === id)?.name;
    return name ? [name] : [];
  });
  return names.length ? names : (staff.specialties ?? []).filter(Boolean);
}
