import type {BusinessTypeId,SalonService, Stylist} from '../types';

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

/** Match the published JSON catalogue's active/archived conventions. */
export function isBookingServiceActive(service: { id: string } | null | undefined): boolean {
  if (!service || typeof service !== 'object') return false;
  const row = service as unknown as Record<string, unknown>;
  const flag = (key: string, fallback: string) => String(row[key] ?? fallback).toLowerCase();
  return typeof row.id === 'string' && row.id.trim().length > 0
    && !['false', '0'].includes(flag('isActive', 'true'))
    && !['false', '0'].includes(flag('is_active', 'true'))
    && !['false', '0'].includes(flag('active', 'true'))
    && !['inactive', 'archived', 'deleted'].includes(flag('status', 'active'))
    && !['true', '1'].includes(flag('deleted', 'false'))
    && !['true', '1'].includes(flag('archived', 'false'))
    && !row.deletedAt && !row.deleted_at && !row.archivedAt && !row.archived_at;
}

/**
 * Display-only fallback if the specialist RPC is unavailable, and for previews.
 * Empty or exclusively stale assignments have the historical "all services" meaning;
 * any active assignment remains a restriction across the complete catalogue. If no
 * catalogue is supplied, do not guess which IDs are stale. The server remains
 * authoritative when slots are fetched and when a reservation is created.
 */
export function localEligibleSpecialists(stylists: Stylist[], serviceIds: string[], branchId = '', catalogue?: SalonService[]): Stylist[] {
  const activeIds = catalogue && new Set(catalogue.filter(isBookingServiceActive).map(service => service.id));
  return stylists.filter(staff => {
    if (!staff || typeof staff.id !== 'string' || typeof staff.name !== 'string') return false;
    if ((staff.status ?? 'Available').toLowerCase() !== 'available') return false;
    if (branchId && Array.isArray(staff.branchSchedules) && !staff.branchSchedules.some(item => item.branchId === branchId)) return false;
    const assigned = Array.isArray(staff.assignedServices) ? staff.assignedServices : [];
    const valid = activeIds ? assigned.filter(id => activeIds.has(id)) : assigned;
    return !valid.length || serviceIds.every(id => valid.includes(id));
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

/**
 * Select the salon owner's real staff for an unpublished website preview.
 * This never creates staff from template/demo defaults and follows the same
 * service, branch and availability rules as the local booking fallback.
 */
export function previewDraftSpecialists(
  stylists: Stylist[],
  serviceIds: string[],
  businessType: BusinessTypeId,
  branchId = '',
  catalogue?: SalonService[],
): Stylist[] {
  if (!serviceIds.length || !Array.isArray(stylists)) return [];
  const sameTemplate = stylists.filter(staff => staff?.isTemplateSeed !== true && (!staff?.businessType || staff.businessType === businessType));
  return localEligibleSpecialists(sameTemplate, serviceIds, branchId, catalogue);
}
