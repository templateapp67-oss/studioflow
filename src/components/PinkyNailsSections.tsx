import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CalendarCheck,
  Check,
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Sparkles,
  Star,
  Youtube,
} from 'lucide-react';
import type { PhotoCategory, SalonGalleryPhoto } from '../lib/photoGallery';
import type { SalonProfile, SalonService, Stylist } from '../types';
import {
  PINKY_NAILS_COPY,
  PINKY_NAILS_IMAGES,
  PINKY_NAILS_PALETTE,
  hasOwnerCustomNailCover,
  hasOwnerCustomNailPhoto,
  hasOwnerCustomNailTagline,
  hasValidNailDuration,
  hasValidNailPrice,
  isValidNailService,
  pinkyNailsContactSummary,
} from '../lib/pinkyNails';
import { ServicePhoto } from './ServicePhoto';
import { useWebsiteLanguage } from './WebsiteLanguage';

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

type ExtendedPinkyProfile = SalonProfile & {
  disableImageFallbacks?: boolean;
  heroDescription?: string;
  heroSecondaryImageUrl?: string | null;
  aboutImageUrl?: string | null;
  aboutSecondaryImageUrl?: string | null;
  bookingBannerImageUrl?: string | null;
  footerDescription?: string | null;
  nailArtFeatureImageUrl?: string | null;
  teamPortraitImageUrl?: string | null;
};

const SOCIAL_ICON_MAP = {
  Instagram,
  Facebook,
  YouTube: Youtube,
  TikTok: Music2,
} as const;

function useImageFallback(primary?: string | null) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [primary]);
  return [failed, setFailed] as const;
}

/** Small rose-gold nail mark used beside the word-mark (no fake logo imagery). */
export function PinkyNailsMark({ className = 'sf-pn-mark' }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M14 2.6c3.1 5.6 4.6 8.9 4.6 11.6a4.6 4.6 0 1 1-9.2 0c0-2.7 1.5-6 4.6-11.6Z"
          fill={PINKY_NAILS_PALETTE.deepBerry}
        />
        <path
          d="M14 8.2c1.9 3.6 2.8 5.7 2.8 7.4a2.8 2.8 0 1 1-5.6 0c0-1.7.9-3.8 2.8-7.4Z"
          fill={PINKY_NAILS_PALETTE.warmWhite}
        />
        <path d="M6.4 23.4h15.2" stroke={PINKY_NAILS_PALETTE.roseGold} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  children?: React.ReactNode;
}) {
  return (
    <div className={`sf-pn-section-heading${align === 'center' ? ' is-center' : ''}`}>
      <div>
        {eyebrow && <p className="sf-pn-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="sf-pn-section-desc">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero — Nail Art Editorial (35% copy / 40% hero / 25% two image cards) */
/* ------------------------------------------------------------------ */
export function PinkyNailsHero({
  profile,
  onBook,
  bookingAvailable = true,
  hasServicesTarget = true,
}: {
  profile: SalonProfile;
  onBook?: (service?: SalonService) => void;
  bookingAvailable?: boolean;
  hasServicesTarget?: boolean;
}) {
  const { t } = useWebsiteLanguage();
  const ext = profile as ExtendedPinkyProfile;
  const customCover = hasOwnerCustomNailCover(profile);
  const [coverFailed, setCoverFailed] = useImageFallback(profile.coverImageUrl);

  const mainImage =
    customCover && !coverFailed && !ext.disableImageFallbacks
      ? profile.coverImageUrl!.trim()
      : !ext.disableImageFallbacks
        ? PINKY_NAILS_IMAGES.heroArtist
        : '';
  const [closeupFailed, setCloseupFailed] = useImageFallback(ext.heroSecondaryImageUrl);
  const [manicureFailed, setManicureFailed] = useImageFallback(ext.heroSecondaryImageUrl);

  const closeupSrc =
    ext.heroSecondaryImageUrl !== undefined
      ? String(ext.heroSecondaryImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? PINKY_NAILS_IMAGES.nailArtCloseup
        : '';
  const manicureSrc = !ext.disableImageFallbacks ? PINKY_NAILS_IMAGES.manicureTreatment : '';

  const showMain = Boolean(mainImage);
  const showCloseup = Boolean(closeupSrc) && !closeupFailed;
  const showManicure = Boolean(manicureSrc) && !manicureFailed;
  const showSide = showCloseup || showManicure;

  const heroTitle = hasOwnerCustomNailTagline(profile)
    ? profile.tagline!.trim()
    : PINKY_NAILS_COPY.heroTitle;
  const rawDescription =
    profile.sectionHeadings?.heroSubtitle !== undefined
      ? profile.sectionHeadings.heroSubtitle
      : ext.heroDescription !== undefined
        ? ext.heroDescription
        : PINKY_NAILS_COPY.heroDescription;
  const description = String(rawDescription || '').trim();

  const canBook = Boolean(bookingAvailable && typeof onBook === 'function');

  return (
    <section className="sf-pn-hero" aria-label="Pinky Nails Studio hero">
      <span className="sr-only">Rich warm mood</span>
      {canBook && <span className="sr-only">Verified checkout</span>}
      <div className={`sf-container sf-pn-hero-grid${showMain ? '' : ' is-no-main'}${showSide ? '' : ' is-no-side'}`}>
        <div className="sf-pn-hero-copy">
          <p className="sf-pn-welcome">
            <PinkyNailsMark />
            <span>{PINKY_NAILS_COPY.welcome}</span>
          </p>
          <h1 className="sf-pn-hero-title">{heroTitle}</h1>
          {description && <p className="sf-pn-hero-desc">{description}</p>}
          {(canBook || hasServicesTarget) && (
            <div className="sf-pn-hero-actions">
              {canBook && (
                <button
                  type="button"
                  className="sf-button sf-pn-btn-primary"
                  onClick={() => onBook?.()}
                >
                  <CalendarCheck size={17} />
                  {t('Book Appointment')}
                </button>
              )}
              {hasServicesTarget && (
                <a className="sf-button sf-pn-btn-ghost" href="#services-section">
                  Explore Services
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>
          )}
        </div>

        {showMain && (
          <figure className="sf-pn-hero-main">
            <img
              src={mainImage}
              alt={`Nail artist working on a client's nails at ${profile.businessName?.trim() || 'Pinky Nails Studio'}`}
              fetchPriority="high"
              onError={() => setCoverFailed(true)}
            />
          </figure>
        )}

        {showSide && (
          <div className={`sf-pn-hero-side${showCloseup && showManicure ? '' : ' is-single'}`}>
            {showCloseup && (
              <figure className="sf-pn-hero-side-card">
                <img
                  src={closeupSrc}
                  alt="Close-up of finished pink and rose-gold nail art"
                  loading="lazy"
                  onError={() => setCloseupFailed(true)}
                />
              </figure>
            )}
            {showManicure && (
              <figure className="sf-pn-hero-side-card">
                <img
                  src={manicureSrc}
                  alt="Professional manicure treatment in the nail studio"
                  loading="lazy"
                  onError={() => setManicureFailed(true)}
                />
              </figure>
            )}
            <p className="sf-pn-hero-badge">{PINKY_NAILS_COPY.heroBadge}</p>
          </div>
        )}

        <ul className="sf-pn-hero-highlights" aria-label="Nail studio highlights">
          {PINKY_NAILS_COPY.heroHighlights.map((item) => (
            <li key={item}>
              <Sparkles size={13} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Services — image-led nail art cards (3 / 2 / 1 per row)             */
/* ------------------------------------------------------------------ */
export function PinkyNailsServiceCard({
  service,
  bookingAvailable = true,
  onBook,
}: {
  key?: React.Key;
  service: SalonService;
  bookingAvailable?: boolean;
  onBook?: (service: SalonService) => void;
}) {
  const { t } = useWebsiteLanguage();
  const validPrice = hasValidNailPrice(service.price);
  const validDuration = hasValidNailDuration(service);
  const description = service.description?.trim() || '';
  const category = service.category?.trim() || '';
  const canBook = Boolean(bookingAvailable && typeof onBook === 'function');

  return (
    <article className="sf-pn-service-card">
      <div className="sf-pn-service-media">
        <ServicePhoto service={service} type="nail_studio" className="sf-service-image" />
        {category && <span className="sf-pn-service-tag">{category}</span>}
      </div>
      <div className="sf-pn-service-body">
        <h3 tabIndex={0}>{service.name.trim()}</h3>
        {description && (
          <p tabIndex={0} aria-label={`Description of ${service.name}`}>
            {description}
          </p>
        )}
        {(validPrice || validDuration) && (
          <div className="sf-pn-service-meta">
            {validPrice && <strong>{money(service.price)}</strong>}
            {validDuration && (
              <span>
                <Clock size={13} aria-hidden="true" />
                {service.durationMinutes} min
              </span>
            )}
          </div>
        )}
        {canBook && (
          <button type="button" className="sf-button sf-pn-btn-primary sf-pn-service-book" onClick={() => onBook?.(service)}>
            {t('Book Now')}
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* About — large studio image + small overlapping artist image         */
/* ------------------------------------------------------------------ */
export function PinkyNailsAboutSection({
  profile,
  knowMoreHref = '',
}: {
  profile: SalonProfile;
  knowMoreHref?: string;
}) {
  const ext = profile as ExtendedPinkyProfile;
  const [primaryFailed, setPrimaryFailed] = useImageFallback(ext.aboutImageUrl);
  const [secondaryFailed, setSecondaryFailed] = useImageFallback(profile.ownerPhotoUrl);

  const primarySrc =
    ext.aboutImageUrl !== undefined
      ? String(ext.aboutImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? PINKY_NAILS_IMAGES.studioInterior
        : '';
  const secondarySrc =
    ext.aboutSecondaryImageUrl !== undefined
      ? String(ext.aboutSecondaryImageUrl || '').trim()
      : hasOwnerCustomNailPhoto(profile)
        ? profile.ownerPhotoUrl!.trim()
        : !ext.disableImageFallbacks
          ? PINKY_NAILS_IMAGES.aboutNailArtist
          : '';

  const showPrimary = Boolean(primarySrc) && !primaryFailed;
  const showSecondary = Boolean(secondarySrc) && !secondaryFailed;
  const aboutText = profile.about?.trim() || PINKY_NAILS_COPY.aboutDescription;

  return (
    <section id="salon-about" className="sf-section sf-pn-about-section">
      <div className={`sf-container sf-pn-about-grid${showPrimary || showSecondary ? '' : ' is-no-media'}`}>
        {(showPrimary || showSecondary) && (
          <div className={`sf-pn-about-media${showPrimary && showSecondary ? '' : ' is-single'}`}>
            {showPrimary && (
              <figure className="sf-pn-about-primary">
                <img
                  src={primarySrc}
                  alt="Modern nail studio interior with manicure desks and polish displays"
                  loading="lazy"
                  onError={() => setPrimaryFailed(true)}
                />
              </figure>
            )}
            {showSecondary && (
              <figure className={`sf-pn-about-small${showPrimary ? '' : ' is-standalone'}`}>
                <img
                  src={secondarySrc}
                  alt="Nail artist at work inside the studio"
                  loading="lazy"
                  onError={() => setSecondaryFailed(true)}
                />
              </figure>
            )}
          </div>
        )}

        <div className="sf-pn-about-copy">
          <p className="sf-pn-eyebrow">About Pinky Nails Studio</p>
          <h2>{profile.sectionHeadings?.aboutTitle || PINKY_NAILS_COPY.aboutTitle}</h2>
          <p className="sf-pn-about-text">{aboutText}</p>
          <ul className="sf-pn-about-highlights">
            {PINKY_NAILS_COPY.aboutHighlights.map(([title, text]) => (
              <li key={title}>
                <span aria-hidden="true">
                  <Check size={14} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </div>
              </li>
            ))}
          </ul>
          {knowMoreHref && (
            <a className="sf-button sf-pn-btn-outline" href={knowMoreHref}>
              Know More
              <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Nail art feature — asymmetric showcase                             */
/* ------------------------------------------------------------------ */
export function PinkyNailsArtFeature({
  profile,
  hasServicesTarget = true,
}: {
  profile: SalonProfile;
  hasServicesTarget?: boolean;
}) {
  const ext = profile as ExtendedPinkyProfile;
  const [largeFailed, setLargeFailed] = useImageFallback(ext.nailArtFeatureImageUrl);
  const [portfolioFailed, setPortfolioFailed] = useState(false);
  const [careFailed, setCareFailed] = useState(false);

  const largeSrc =
    ext.nailArtFeatureImageUrl !== undefined
      ? String(ext.nailArtFeatureImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? PINKY_NAILS_IMAGES.nailExtension
        : '';
  const portfolioSrc = !ext.disableImageFallbacks ? PINKY_NAILS_IMAGES.nailArtPortfolio : '';
  const careSrc = !ext.disableImageFallbacks ? PINKY_NAILS_IMAGES.nailCareTreatment : '';

  const showLarge = Boolean(largeSrc) && !largeFailed;
  const showPortfolio = Boolean(portfolioSrc) && !portfolioFailed;
  const showCare = Boolean(careSrc) && !careFailed;

  return (
    <section className="sf-section sf-pn-art-section" aria-label="Nail art showcase">
      <div className="sf-container sf-pn-art-grid">
        {showLarge && (
          <figure className="sf-pn-art-large">
            <img
              src={largeSrc}
              alt="Close-up of professionally finished nail extensions"
              loading="lazy"
              onError={() => setLargeFailed(true)}
            />
          </figure>
        )}
        <div className="sf-pn-art-content">
          <div className="sf-pn-art-small">
            {showPortfolio && (
              <figure>
                <img
                  src={portfolioSrc}
                  alt="Different elegant nail art styles on natural hands"
                  loading="lazy"
                  onError={() => setPortfolioFailed(true)}
                />
              </figure>
            )}
            {showCare && (
              <figure>
                <img
                  src={careSrc}
                  alt="Nail care treatment in a clean studio"
                  loading="lazy"
                  onError={() => setCareFailed(true)}
                />
              </figure>
            )}
          </div>
          <div className="sf-pn-art-copy">
            <p className="sf-pn-eyebrow">Nail Art</p>
            <h2>{PINKY_NAILS_COPY.artTitle}</h2>
            <p>{PINKY_NAILS_COPY.artDescription}</p>
            <p className="sf-pn-art-note">Sample design inspiration from the studio.</p>
            {hasServicesTarget && (
              <a className="sf-button sf-pn-btn-primary" href="#services-section">
                View Services
                <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery — masonry grid with the existing lightbox                   */
/* ------------------------------------------------------------------ */
export function PinkyNailsGallery({
  entries,
  heading,
  category,
  onCategory,
  onOpen,
  onBroken,
}: {
  entries: SalonGalleryPhoto[];
  heading: string;
  category: PhotoCategory | 'All';
  onCategory: (category: PhotoCategory | 'All') => void;
  onOpen: (entry: SalonGalleryPhoto) => void;
  onBroken: (id: string) => void;
}) {
  const hasDemo = entries.some((entry) => entry.isDemo);
  const categories = Array.from(new Set(entries.map((entry) => entry.category)));
  const activeCategory = categories.includes(category as PhotoCategory) ? category : 'All';
  const visibleEntries =
    activeCategory === 'All'
      ? entries
      : entries.filter((entry) => entry.category === activeCategory);
  return (
    <section id="salon-lookbook" className="sf-section sf-pn-gallery-section">
      <div className="sf-container">
        <SectionHeading
          eyebrow="Nail Art Gallery"
          title={heading}
          description={PINKY_NAILS_COPY.gallerySubtitle}
        >
          <p className="sf-pn-demo-label">
            {hasDemo ? 'Demo lookbook · Sample nail-art imagery. Studio photos are labelled separately.' : 'Studio nail art photos'}
          </p>
        </SectionHeading>
        {categories.length > 0 && (
          <div className="sf-pn-gallery-categories" role="group" aria-label="Nail gallery categories">
            {(['All', ...categories] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={activeCategory === item}
                onClick={() => onCategory(item as PhotoCategory | 'All')}
              >
                {item} ({entries.filter((entry) => item === 'All' || entry.category === item).length})
              </button>
            ))}
          </div>
        )}
        <div className="sf-pn-masonry">
          {visibleEntries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={`sf-pn-masonry-item${index === 0 ? ' is-featured' : ''}`}
              onClick={() => onOpen(entry)}
              aria-label={`View salon look ${index + 1}`}
            >
              <img
                src={entry.url}
                alt={entry.title || 'Nail art design'}
                loading="lazy"
                onError={() => onBroken(entry.id)}
              />
              <span className="sf-pn-masonry-label">
                {entry.isDemo ? 'Sample inspiration' : 'Studio photo'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Team — nail artist cards (different layout to service cards)         */
/* ------------------------------------------------------------------ */
export function PinkyNailsTeamCard({
  staff,
  selected,
  bookingAvailable = true,
  onView,
  onToggle,
  onBook,
}: {
  key?: React.Key;
  staff: Stylist;
  selected: boolean;
  bookingAvailable?: boolean;
  onView: () => void;
  onToggle: () => void;
  onBook: () => void;
}) {
  const { t } = useWebsiteLanguage();
  const [failed, setFailed] = useImageFallback(staff.avatarUrl);
  const name = staff.name?.trim() || '';
  if (!name) return null;

  const avatar = staff.avatarUrl?.trim() || '';
  const showPhoto = Boolean(avatar) && !failed;
  const role = staff.role?.trim() || '';
  const skills = (staff.specialties || []).map((item) => item?.trim()).filter(Boolean) as string[];
  const rated =
    typeof staff.rating === 'number' && Number.isFinite(staff.rating) && staff.rating > 0 && staff.rating <= 5;
  const unavailable = staff.status === 'On Leave' || staff.status === 'Inactive';
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');

  return (
    <article className={`sf-pn-team-card${selected ? ' is-selected' : ''}${showPhoto ? '' : ' is-no-photo'}`}>
      <button type="button" className="sf-pn-team-portrait" onClick={onView} aria-label={`${t('View profile & reviews')}: ${name}`}>
        {showPhoto ? (
          <img src={avatar} alt={name} loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <span className="sf-pn-team-initials" aria-hidden="true">
            {initials || 'PN'}
          </span>
        )}
        {rated && (
          <span className="sf-pn-team-rating" title="Salon-listed rating">
            <Star size={11} fill="currentColor" />
            {Number(staff.rating).toFixed(2)}
          </span>
        )}
      </button>
      <div className="sf-pn-team-body">
        <h3>
          <button type="button" onClick={onView}>
            {name}
          </button>
        </h3>
        {role && <p className="sf-pn-team-role">{role}</p>}
        {skills.length > 0 && (
          <ul className="sf-pn-team-skills" aria-label={`${name} skills`}>
            {skills.slice(0, 3).map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        )}
        {bookingAvailable && (
          <div className="sf-pn-team-actions">
            <button
              type="button"
              className="sf-pn-team-toggle"
              aria-pressed={selected}
              aria-label={`${t('Choose for online booking')}: ${name}`}
              disabled={unavailable}
              onClick={onToggle}
            >
              <i aria-hidden="true" />
              <span>{selected ? '✓ Selected' : t('Choose for online booking')}</span>
            </button>
            <button
              type="button"
              className="sf-button sf-pn-btn-primary sf-pn-book-staff"
              disabled={unavailable}
              onClick={onBook}
            >
              <CalendarCheck size={15} />
              {unavailable ? 'Currently unavailable' : 'Book with Staff'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function PinkyNailsTeamPortrait({ profile }: { profile?: SalonProfile }) {
  const ext = (profile || {}) as ExtendedPinkyProfile;
  const [failed, setFailed] = useImageFallback(ext.teamPortraitImageUrl);
  const src =
    ext.teamPortraitImageUrl !== undefined
      ? String(ext.teamPortraitImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? PINKY_NAILS_IMAGES.teamNailArtist
        : '';
  if (!src || failed) return null;
  return (
    <figure className="sf-pn-team-portrait-frame">
      <img
        src={src}
        alt="Nail artist in the studio"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Booking banner — full width deep berry                             */
/* ------------------------------------------------------------------ */
export function PinkyNailsBookingBanner({
  profile,
  bookingAvailable = true,
  onBook,
}: {
  profile?: SalonProfile;
  bookingAvailable?: boolean;
  onBook?: () => void;
}) {
  const { t } = useWebsiteLanguage();
  const ext = (profile || {}) as ExtendedPinkyProfile;
  const [failed, setFailed] = useImageFallback(ext.bookingBannerImageUrl);
  const src =
    ext.bookingBannerImageUrl !== undefined
      ? String(ext.bookingBannerImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? PINKY_NAILS_IMAGES.bookingBanner
        : '';
  const showMedia = Boolean(src) && !failed;
  const canBook = Boolean(bookingAvailable && typeof onBook === 'function');

  return (
    <section className="sf-pn-booking-banner" aria-label="Book a nail appointment">
      <div className="sf-container">
        <div className={`sf-pn-booking-inner${showMedia ? '' : ' is-no-media'}`}>
          <div className="sf-pn-booking-copy">
            <p className="sf-pn-booking-eyebrow">{PINKY_NAILS_COPY.bookingEyebrow}</p>
            <h2>{PINKY_NAILS_COPY.bookingTitle}</h2>
            <p>{PINKY_NAILS_COPY.bookingDescription}</p>
            {canBook && (
              <button type="button" className="sf-button sf-pn-btn-light" onClick={onBook}>
                <CalendarCheck size={18} />
                {t('Book Appointment')}
              </button>
            )}
          </div>
          {showMedia && (
            <figure className="sf-pn-booking-media">
              <img
                src={src}
                alt="Elegant nail art on a soft pink background"
                loading="lazy"
                onError={() => setFailed(true)}
              />
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Contact — existing salon details only                              */
/* ------------------------------------------------------------------ */
export function PinkyNailsContactSection({
  profile,
  mapUrl,
  whatsappUrl,
  headingText,
}: {
  profile: SalonProfile;
  mapUrl: string;
  whatsappUrl: string;
  headingText: string;
}) {
  const { t } = useWebsiteLanguage();
  const contact = pinkyNailsContactSummary(profile, mapUrl, whatsappUrl);
  const showDetailsCard = Boolean(
    contact.fullAddress ||
      contact.landmark ||
      contact.phone ||
      contact.email ||
      contact.whatsappUrl ||
      contact.hasDirections ||
      contact.socials.length > 0,
  );
  const showHoursCard = contact.validHours.length > 0;
  const singleCard = (showDetailsCard ? 1 : 0) + (showHoursCard ? 1 : 0) <= 1;

  return (
    <div className="sf-pn-contact-wrap">
      <SectionHeading
        eyebrow="Studio Information"
        title={headingText}
        description={PINKY_NAILS_COPY.contactSubtitle}
      >
        {contact.hasDirections && (
          <a className="sf-button sf-pn-btn-outline" href={contact.mapUrl} target="_blank" rel="noreferrer">
            <MapPin size={16} />
            {t('Get directions')}
            <ArrowUpRight size={15} />
          </a>
        )}
      </SectionHeading>

      <div className={`sf-pn-contact-grid${singleCard ? ' is-single-card' : ''}`}>
        {showDetailsCard && (
          <article className="sf-pn-contact-card">
            <h3>Studio Address &amp; Contact</h3>
            {contact.fullAddress && <address>{contact.fullAddress}</address>}
            {contact.landmark && <p className="sf-pn-contact-landmark">Near {contact.landmark}</p>}
            {contact.phone && (
              <p className="sf-pn-contact-line">
                <Phone size={15} aria-hidden="true" />
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </p>
            )}
            {contact.email && (
              <p className="sf-pn-contact-line">
                <Mail size={15} aria-hidden="true" />
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </p>
            )}
            {(contact.phone || contact.whatsappUrl || contact.hasDirections) && (
              <div className="sf-pn-contact-actions">
                {contact.phone && (
                  <a className="sf-pn-contact-pill is-primary" href={`tel:${contact.phone}`}>
                    <Phone size={15} />
                    Call Now
                  </a>
                )}
                {contact.whatsappUrl && (
                  <a
                    className="sf-pn-contact-pill is-whatsapp"
                    href={contact.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Chat with the studio on WhatsApp"
                  >
                    <MessageCircle size={15} />
                    WhatsApp Inquiry
                    <ArrowUpRight size={14} />
                  </a>
                )}
                {contact.hasDirections && (
                  <a className="sf-pn-contact-pill" href={contact.mapUrl} target="_blank" rel="noreferrer">
                    <MapPin size={15} />
                    Get Directions
                  </a>
                )}
              </div>
            )}
            {contact.socials.length > 0 && (
              <div className="sf-pn-contact-socials" aria-label="Studio social media links">
                {contact.socials.map(([label, url]) => {
                  const Icon = SOCIAL_ICON_MAP[label];
                  return (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer">
                      <Icon size={15} aria-hidden="true" />
                      <span>{label}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </article>
        )}

        {showHoursCard && (
          <article className="sf-pn-contact-card">
            <h3>
              <Clock size={16} aria-hidden="true" />
              Opening Hours
            </h3>
            <dl className="sf-pn-hours-list">
              {contact.validHours.map(([day, hours]) => (
                <div key={day}>
                  <dt>{day}</dt>
                  <dd>{hours}</dd>
                </div>
              ))}
            </dl>
            <p className="sf-hours-note">All appointments are scheduled in India Standard Time.</p>
          </article>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Footer — four columns on deep berry                                */
/* ------------------------------------------------------------------ */
export function PinkyNailsFooter({
  profile,
  services,
  branding,
  mapUrl,
  whatsappUrl,
  hasTeam = false,
  availableTargets,
  bookingAvailable = true,
  onBook,
}: {
  profile: SalonProfile;
  services: SalonService[];
  branding?: { platformName: string; poweredBy: boolean; supportEmail: string };
  mapUrl: string;
  whatsappUrl: string;
  hasTeam?: boolean;
  availableTargets?: ReadonlySet<string>;
  bookingAvailable?: boolean;
  onBook?: (service?: SalonService) => void;
}) {
  const ext = profile as ExtendedPinkyProfile;
  const [logoFailed, setLogoFailed] = useImageFallback(profile.logoUrl);
  const targetExists = (id: string) => !availableTargets || availableTargets.has(id);
  const contact = pinkyNailsContactSummary(profile, mapUrl, whatsappUrl);
  const validServices = services.filter(isValidNailService).filter((s) => s.name?.trim());

  const quickLinks = (
    [
      ['Home', '#salon-home', targetExists('salon-home')],
      ['Services', '#services-section', targetExists('services-section')],
      ['About', '#salon-about', targetExists('salon-about')],
      ['Nail Gallery', '#salon-lookbook', targetExists('salon-lookbook')],
      ['Our Team', '#salon-team', Boolean(hasTeam) && targetExists('salon-team')],
      ['Contact', '#salon-location', targetExists('salon-location')],
    ] as Array<[string, string, boolean]>
  ).filter(([, , show]) => show);

  const socials = contact.socials;
  const hasContactCol = Boolean(
    contact.phone || contact.email || contact.fullAddress || contact.whatsappUrl || contact.hasDirections || socials.length > 0,
  );

  const logoSrc = profile.logoUrl?.trim() || '';
  const showLogoImg = Boolean(logoSrc) && !logoFailed;
  const salonName = profile.businessName?.trim() || 'Pinky Nails Studio';
  const footerDescription =
    ext.footerDescription !== undefined
      ? String(ext.footerDescription || '').trim()
      : PINKY_NAILS_COPY.footerDescription;

  const showQuickLinksCol = quickLinks.length > 0;
  const showServicesCol = validServices.length > 0;
  const colCount = 1 + (showQuickLinksCol ? 1 : 0) + (showServicesCol ? 1 : 0) + (hasContactCol ? 1 : 0);
  const canBook = Boolean(bookingAvailable && typeof onBook === 'function');
  const hasPoliciesDestination = targetExists('salon-policies');
  const year = new Date().getFullYear();

  return (
    <footer data-layout="footer" className="sf-footer sf-pn-footer">
      <div className="sf-container">
        <div className="sf-pn-footer-columns" data-col-count={colCount}>
          <div className="sf-pn-footer-brand">
            <div className={`sf-pn-footer-logo${showLogoImg ? '' : ' is-text-brand'}`}>
              {showLogoImg ? (
                <img src={logoSrc} alt={salonName} onError={() => setLogoFailed(true)} />
              ) : (
                <PinkyNailsMark className="sf-pn-mark is-footer" />
              )}
              <div>
                <strong>{salonName}</strong>
                {profile.city?.trim() && <span>{profile.city.trim()}</span>}
              </div>
            </div>
            {footerDescription && <p>{footerDescription}</p>}
          </div>

          {showQuickLinksCol && (
            <div className="sf-pn-footer-col">
              <h3>Quick Links</h3>
              <ul>
                {quickLinks.map(([label, href]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showServicesCol && (
            <div className="sf-pn-footer-col">
              <h3>Nail Services</h3>
              <ul>
                {validServices.slice(0, 5).map((service) => (
                  <li key={service.id}>
                    {targetExists('services-section') ? (
                      <a href="#services-section">{service.name.trim()}</a>
                    ) : canBook ? (
                      <button type="button" onClick={() => onBook?.(service)}>
                        {service.name.trim()}
                      </button>
                    ) : (
                      <span>{service.name.trim()}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasContactCol && (
            <div className="sf-pn-footer-col">
              <h3>Contact</h3>
              <ul className="sf-pn-footer-contact">
                {contact.fullAddress && <li>{contact.fullAddress}</li>}
                {contact.phone && (
                  <li>
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  </li>
                )}
                {contact.email && (
                  <li>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </li>
                )}
                {contact.whatsappUrl && (
                  <li>
                    <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </li>
                )}
                {contact.hasDirections && (
                  <li>
                    <a href={contact.mapUrl} target="_blank" rel="noreferrer">
                      Google Maps ↗
                    </a>
                  </li>
                )}
              </ul>
              {socials.length > 0 && (
                <div className="sf-pn-footer-socials" aria-label="Social media links">
                  {socials.map(([label, url]) => {
                    const Icon = SOCIAL_ICON_MAP[label];
                    return (
                      <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
                        <Icon size={16} aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sf-pn-footer-bottom">
          <p>© {year} {salonName}. All rights reserved.</p>
          <div className="sf-pn-footer-legal">
            {hasPoliciesDestination && <a href="#salon-policies">Policies &amp; Terms</a>}
            {branding?.poweredBy && <small>Powered by {branding.platformName || 'StudioFlow'}</small>}
            {targetExists('salon-home') && <a href="#salon-home">Back to top ↑</a>}
          </div>
        </div>
      </div>
    </footer>
  );
}
