import { secureMediaUrl } from './socialVideoSource';

export const dermacureSiteDefaults = {
  brandName: 'DermaCure Skin Clinic',
  address: 'Premium Skin Centre',
  phone: '+91 98765 43210'
};

export const DERMACURE_IMAGES = {
  hero: '/templates/dermacure/hero.webp',
  heroWide: '/templates/dermacure/hero-wide.webp',
  clinic: '/templates/dermacure/clinic.webp',
  treatment: '/templates/dermacure/treatment.webp',
  technology: '/templates/dermacure/technology.webp',
  personalised: '/templates/dermacure/personalised.webp',
  consultation: '/templates/dermacure/reference-consultation.webp',
  interior: '/templates/dermacure/reference-interior.webp',
  led: '/templates/dermacure/reference-led.webp',
  rejuvenation: '/templates/dermacure/reference-rejuvenation.webp',
  hydration: '/templates/dermacure/service-hydration.webp',
  laser: '/templates/dermacure/service-laser.webp',
  peel: '/templates/dermacure/service-peel.webp',
  brandMark: '/templates/dermacure/brand-mark.svg',
  neutral: '/templates/dermacure/care-neutral.svg'
};

const BUNDLED = /^\/templates\/dermacure\/[\w-]+\.(webp|jpg|jpeg|png|svg)$/i;

/** Bundled template assets pass through; remote URLs must be HTTPS. */
export function safeClinicUrl(raw: unknown): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (BUNDLED.test(value)) return value;
  return secureMediaUrl(value);
}

export function isBundledClinicPhoto(url: unknown): boolean {
  return BUNDLED.test(String(url || '').trim());
}

export const DERMACURE_SAMPLE_GALLERY = [
  { id: 'dc-sample-1', category: 'Clinic', url: DERMACURE_IMAGES.clinic, title: 'Reception and waiting lounge', isDemo: true },
  { id: 'dc-sample-2', category: 'Treatments', url: DERMACURE_IMAGES.treatment, title: 'Treatment room set for a facial', isDemo: true },
  { id: 'dc-sample-3', category: 'Clinic', url: DERMACURE_IMAGES.interior, title: 'Consultation room', isDemo: true },
  { id: 'dc-sample-4', category: 'Treatments', url: DERMACURE_IMAGES.hydration, title: 'Hydra-infusion in progress', isDemo: true },
  { id: 'dc-sample-5', category: 'Technology', url: DERMACURE_IMAGES.laser, title: 'Laser toning equipment', isDemo: true },
  { id: 'dc-sample-6', category: 'Technology', url: DERMACURE_IMAGES.led, title: 'LED phototherapy session', isDemo: true },
  { id: 'dc-sample-7', category: 'Treatments', url: DERMACURE_IMAGES.peel, title: 'Chemical peel preparation', isDemo: true },
  { id: 'dc-sample-8', category: 'Technology', url: DERMACURE_IMAGES.rejuvenation, title: 'Skin rejuvenation consult', isDemo: true }
];

/** Saved gallery photos when present (deduped, demo photos excluded), else the labelled sample set. */
export function clinicGalleryEntries(photos: any[] = []) {
  const seen = new Set<string>();
  const saved = (Array.isArray(photos) ? photos : []).filter((photo) => {
    if (!photo || photo.isDemo) return false;
    const url = safeClinicUrl(photo.url);
    if (!url || !photo.id || seen.has(url)) return false;
    seen.add(url);
    return true;
  }).map((photo) => ({
    id: String(photo.id),
    category: photo.category || 'Clinic',
    url: safeClinicUrl(photo.url),
    title: String(photo.title || photo.category || 'Clinic photo'),
    isDemo: false
  }));
  return saved.length ? saved : DERMACURE_SAMPLE_GALLERY;
}

export const DERMACURE_TEAM_PORTRAITS: Record<string, string> = {
  'tanvi deshmukh': '/templates/dermacure/team-tanvi.jpg',
  'sameer gill': '/templates/dermacure/team-sameer.jpg',
  'neha saxena': '/templates/dermacure/team-neha.jpg'
};

const nameKey = (name: unknown) => String(name || '').toLowerCase().replace(/^(dr|mr|mrs|ms)\.?\s+/, '').replace(/\s+/g, ' ').trim();

/** A saved photo always wins; otherwise a bundled sample portrait is used and labelled as demo. */
export function dermacureTeamPortrait(person: any): { src: string; isDemo: boolean } {
  const url = safeClinicUrl(person?.avatarUrl);
  if (url) return { src: url, isDemo: isBundledClinicPhoto(url) };
  const bundled = DERMACURE_TEAM_PORTRAITS[nameKey(person?.name)];
  return bundled ? { src: bundled, isDemo: true } : { src: '', isDemo: false };
}
