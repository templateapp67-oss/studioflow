import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import type { SalonProfile, SalonService, Stylist } from '../types';
import { socialUrl } from './websiteContent';

export const ROOP_MAHAL_PALETTE = {
  warmCream: '#FFF8F1',
  softRose: '#D9A6A1',
  deepMaroon: '#6D2638',
  champagneGold: '#C5A16B',
  darkBrown: '#352622',
  white: '#FFFFFF',
} as const;

export const ROOP_MAHAL_IMAGES = {
  heroBridal: '/templates/roop-mahal/hero-bridal.jpg',
  heroMakeupArtist: '/templates/roop-mahal/hero-makeup-artist.jpg',
  aboutInterior: '/templates/roop-mahal/about-interior.jpg',
  aboutMakeupWork: '/templates/roop-mahal/about-makeup-work.jpg',
  bridalHighlight: '/templates/roop-mahal/bridal-highlight.jpg',
  bookingMakeover: '/templates/roop-mahal/booking-makeover.jpg',
  serviceThreading: '/templates/roop-mahal/service-threading.jpg',
  serviceGoldFacial: '/templates/roop-mahal/service-gold-facial.jpg',
  serviceWaxing: '/templates/roop-mahal/service-waxing.jpg',
  serviceDtan: '/templates/roop-mahal/service-dtan.jpg',
  serviceFestiveCombo: '/templates/roop-mahal/service-festive-combo.jpg',
  galleryBridalDetail: '/templates/roop-mahal/gallery-bridal-detail.jpg',
  galleryPartyMakeup: '/templates/roop-mahal/gallery-party-makeup.jpg',
  galleryHairStyling: '/templates/roop-mahal/gallery-hair-styling.jpg',
  galleryRoyalBridal: '/templates/roop-mahal/gallery-royal-bridal.jpg',
  galleryStudioStations: '/templates/roop-mahal/gallery-studio-stations.jpg',
  staffFallback: '/templates/roop-mahal/staff-fallback.jpg',
} as const;

export function roopMahalServiceImage(service: Pick<SalonService, 'id' | 'name' | 'category'>): string {
  if (service.id === 'bp-1') return ROOP_MAHAL_IMAGES.serviceThreading;
  if (service.id === 'bp-2') return ROOP_MAHAL_IMAGES.serviceGoldFacial;
  if (service.id === 'bp-3') return ROOP_MAHAL_IMAGES.serviceWaxing;
  if (service.id === 'bp-4') return ROOP_MAHAL_IMAGES.serviceDtan;
  if (service.id === 'bp-5') return ROOP_MAHAL_IMAGES.serviceFestiveCombo;
  if (service.id === 'template-pkg-beauty_parlour-1') return ROOP_MAHAL_IMAGES.serviceGoldFacial;
  if (service.id === 'template-pkg-beauty_parlour-2') return ROOP_MAHAL_IMAGES.serviceWaxing;
  if (service.id === 'template-pkg-beauty_parlour-3') return ROOP_MAHAL_IMAGES.serviceFestiveCombo;
  if (service.id === 'template-pkg-beauty_parlour-4') return ROOP_MAHAL_IMAGES.serviceDtan;

  const text = `${service.category || ''} ${service.name || ''}`.toLowerCase();
  if (/thread|brow|upper lip|forehead/.test(text)) return ROOP_MAHAL_IMAGES.serviceThreading;
  if (/wax|rica|body|pedicure|manicure/.test(text)) return ROOP_MAHAL_IMAGES.serviceWaxing;
  if (/d-tan|dtan|tan|bleach|scrub|pack/.test(text)) return ROOP_MAHAL_IMAGES.serviceDtan;
  if (/combo|festive|karva|diwali|shringaar|party|bridal|makeover|makeup/.test(text)) return ROOP_MAHAL_IMAGES.serviceFestiveCombo;
  return ROOP_MAHAL_IMAGES.serviceGoldFacial;
}

export function hasOwnerCustomCover(profile: SalonProfile): boolean {
  const url = profile.coverImageUrl?.trim();
  if (!url) return false;
  return !Object.values(CATEGORY_TEMPLATES).some((t) => t.coverImageUrl === url);
}

export function hasOwnerCustomPhoto(profile: SalonProfile): boolean {
  const url = profile.ownerPhotoUrl?.trim();
  if (!url) return false;
  return !Object.values(CATEGORY_TEMPLATES).some((t) => t.ownerPhotoUrl === url);
}

export function hasOwnerCustomTagline(profile: SalonProfile): boolean {
  const tagline = profile.tagline?.trim();
  if (!tagline) return false;
  return !Object.values(CATEGORY_TEMPLATES).some((t) => t.tagline === tagline);
}

export function hasOwnerCustomAbout(profile: SalonProfile): boolean {
  const about = profile.about?.trim();
  if (!about) return false;
  return !Object.values(CATEGORY_TEMPLATES).some(
    (t) => t.id !== 'beauty_parlour' && t.about === about,
  );
}

export function isValidRoopService(service: SalonService | null | undefined): service is SalonService {
  if (!service || typeof service.name !== 'string' || !service.name.trim()) return false;
  const record = service as SalonService & {
    active?: boolean;
    isActive?: boolean;
    deleted?: boolean;
    isDeleted?: boolean;
    available?: boolean;
    status?: string;
  };
  if (record.active === false || record.isActive === false) return false;
  if (record.deleted === true || record.isDeleted === true) return false;
  if (record.available === false) return false;
  if (
    record.status &&
    ['inactive', 'deleted', 'unavailable', 'archived'].includes(record.status.toLowerCase())
  ) {
    return false;
  }
  return true;
}

export function hasValidRoopPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price > 0;
}

export function hasValidRoopDuration(service: Pick<SalonService, 'durationMinutes' | 'showDuration'>): boolean {
  return (
    service.showDuration !== false &&
    typeof service.durationMinutes === 'number' &&
    Number.isFinite(service.durationMinutes) &&
    service.durationMinutes > 0
  );
}

export function isValidRoopStaff(staff: Stylist | null | undefined): staff is Stylist {
  if (!staff || typeof staff.name !== 'string' || !staff.name.trim()) return false;
  const record = staff as Stylist & {
    active?: boolean;
    isActive?: boolean;
    deleted?: boolean;
    isDeleted?: boolean;
  };
  if (record.status === 'Inactive') return false;
  if (record.active === false || record.isActive === false) return false;
  if (record.deleted === true || record.isDeleted === true) return false;
  return true;
}

export function roopMahalBridalServices(services: SalonService[]): SalonService[] {
  const seen = new Set<string>();
  return services
    .filter(isValidRoopService)
    .filter((s) =>
      /bridal|makeup|make-up|makeover|shringaar|festive|party|glow|gold facial|radiance/i.test(
        `${s.name} ${s.category || ''}`,
      ),
    )
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .slice(0, 3);
}

export interface RoopMahalContactSummary {
  fullAddress: string;
  landmark: string;
  phone: string;
  email: string;
  whatsappUrl: string;
  mapUrl: string;
  hasDirections: boolean;
  validHours: Array<[string, string]>;
  socials: Array<['Instagram' | 'Facebook' | 'YouTube' | 'TikTok', string]>;
  hasAnyContactDetail: boolean;
}

export function roopMahalContactSummary(
  profile: SalonProfile,
  mapUrl: string,
  whatsappUrl: string,
): RoopMahalContactSummary {
  const fullAddress = [profile.address?.trim(), profile.city?.trim(), profile.postalCode?.trim()]
    .filter(Boolean)
    .join(', ');
  const landmark = profile.landmark?.trim() || '';
  const phone = profile.phone?.trim() || '';
  const rawEmail = profile.email?.trim() || '';
  const email =
    rawEmail &&
    rawEmail !== 'appointments@mirakihair.in' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
      ? rawEmail
      : '';
  const validCoords =
    typeof profile.latitude === 'number' &&
    Number.isFinite(profile.latitude) &&
    typeof profile.longitude === 'number' &&
    Number.isFinite(profile.longitude);
  const hasDirections = Boolean(mapUrl && (fullAddress || validCoords));
  const validHours = (
    [
      ['Monday – Friday (except Tuesday)', profile.workingHoursMonFri?.trim() || ''],
      ['Tuesday', profile.workingHoursTue?.trim() || ''],
      ['Sunday', profile.workingHoursSun?.trim() || ''],
    ] as Array<[string, string]>
  ).filter(([, hrs]) => Boolean(hrs));
  const socials = (
    [
      ['Instagram', socialUrl(profile.instagramHandle, 'instagram')],
      ['Facebook', socialUrl(profile.facebookPage, 'facebook')],
      ['YouTube', socialUrl(profile.youtubeChannel, 'youtube')],
      ['TikTok', socialUrl(profile.tiktokProfile, 'tiktok')],
    ] as Array<['Instagram' | 'Facebook' | 'YouTube' | 'TikTok', string]>
  ).filter(([, url]) => Boolean(url));

  const hasAnyContactDetail = Boolean(
    fullAddress ||
      landmark ||
      phone ||
      email ||
      whatsappUrl ||
      hasDirections ||
      validHours.length > 0 ||
      socials.length > 0,
  );

  return {
    fullAddress,
    landmark,
    phone,
    email,
    whatsappUrl,
    mapUrl: hasDirections ? mapUrl : '',
    hasDirections,
    validHours,
    socials,
    hasAnyContactDetail,
  };
}
