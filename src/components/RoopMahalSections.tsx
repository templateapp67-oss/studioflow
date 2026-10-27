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
  ShieldCheck,
  Sparkles,
  Star,
  Youtube,
} from 'lucide-react';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import {
  hasOwnerCustomAbout,
  hasOwnerCustomCover,
  hasOwnerCustomPhoto,
  hasOwnerCustomTagline,
  hasValidRoopPrice,
  isValidRoopService,
  ROOP_MAHAL_IMAGES,
  roopMahalBridalServices,
  roopMahalContactSummary,
} from '../lib/roopMahalReference';
import type { SalonProfile, SalonService, Stylist } from '../types';
import { useWebsiteLanguage } from './WebsiteLanguage';

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

type ExtendedRoopProfile = SalonProfile & {
  disableImageFallbacks?: boolean;
  heroDescription?: string;
  heroSecondaryImageUrl?: string | null;
  disableSecondaryHeroImage?: boolean;
  aboutImageUrl?: string | null;
  aboutSecondaryImageUrl?: string | null;
  bridalHighlightImageUrl?: string | null;
  bookingBannerImageUrl?: string | null;
  footerDescription?: string | null;
};

const SOCIAL_ICON_MAP = {
  Instagram,
  Facebook,
  YouTube: Youtube,
  TikTok: Music2,
} as const;

export function RoopMahalLogoMark({ className = 'sf-rm-logo-svg' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1.25" y="1.25" width="41.5" height="41.5" rx="12" fill="#6D2638" stroke="#C5A16B" strokeWidth="1.5" />
      <path
        d="M22 9.5C18.8 13.8 16.5 17.8 16.5 21.8C16.5 25.1 18.9 27.6 22 27.6C25.1 27.6 27.5 25.1 27.5 21.8C27.5 17.8 25.2 13.8 22 9.5Z"
        stroke="#FFF8F1"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16.2 19.2C12.7 19.6 10.2 22.1 10.6 25.4C13.6 26.2 16.5 25.1 18.2 22.8"
        stroke="#C5A16B"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M27.8 19.2C31.3 19.6 33.8 22.1 33.4 25.4C30.4 26.2 27.5 25.1 25.8 22.8"
        stroke="#C5A16B"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M14 31.8H30" stroke="#C5A16B" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="22" cy="34.8" r="1.3" fill="#C5A16B" />
    </svg>
  );
}

export function RoopMahalHero({
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
  const ext = profile as ExtendedRoopProfile;
  const customTagline = hasOwnerCustomTagline(profile);
  const customCover = hasOwnerCustomCover(profile);

  const [ownerMainFailed, setOwnerMainFailed] = useState(false);
  const [fallbackMainFailed, setFallbackMainFailed] = useState(false);
  const [secondaryFailed, setSecondaryFailed] = useState(false);

  useEffect(() => {
    setOwnerMainFailed(false);
    setFallbackMainFailed(false);
  }, [profile.coverImageUrl]);

  useEffect(() => {
    setSecondaryFailed(false);
  }, [ext.heroSecondaryImageUrl]);

  const mainImage =
    customCover && !ownerMainFailed
      ? profile.coverImageUrl!.trim()
      : !ext.disableImageFallbacks && !fallbackMainFailed
        ? ROOP_MAHAL_IMAGES.heroBridal
        : '';

  const secondaryCandidate =
    ext.disableSecondaryHeroImage || ext.heroSecondaryImageUrl === '' || ext.heroSecondaryImageUrl === null
      ? ''
      : ext.heroSecondaryImageUrl?.trim()
        ? ext.heroSecondaryImageUrl.trim()
        : !ext.disableImageFallbacks
          ? ROOP_MAHAL_IMAGES.heroMakeupArtist
          : '';
  const showMainImage = Boolean(mainImage);
  const showSecondaryImage = Boolean(secondaryCandidate) && !secondaryFailed;
  const showAnyVisual = showMainImage || showSecondaryImage;

  const salonName = profile.businessName?.trim() || 'Roop Mahal';
  const isCustomSalonName =
    Boolean(profile.businessName?.trim()) &&
    !/roop mahal/i.test(salonName) &&
    !Object.values(CATEGORY_TEMPLATES).some((tmpl) => tmpl.title === salonName);
  const welcomeLabel = isCustomSalonName
    ? `WELCOME TO ROOP MAHAL · ${salonName.toUpperCase()}`
    : 'WELCOME TO ROOP MAHAL';

  const rawHeroDesc =
    profile.sectionHeadings?.heroSubtitle !== undefined
      ? profile.sectionHeadings.heroSubtitle
      : ext.heroDescription !== undefined
        ? ext.heroDescription
        : 'Make every occasion special with beautiful makeup, hair styling and personal beauty care.';
  const heroDesc = rawHeroDesc?.trim() || '';

  const showBookBtn = Boolean(bookingAvailable && typeof onBook === 'function');
  const showServicesBtn = Boolean(hasServicesTarget);

  return (
    <section className="sf-rm-hero" aria-label="Roop Mahal hero">
      <span className="sr-only">Rich warm mood</span>
      <div className={`sf-container sf-rm-hero-grid${showAnyVisual ? '' : ' is-no-visuals'}`}>
        {/* 1-4: Welcome text (salon name), Main heading, Description, Action buttons */}
        <div className="sf-rm-hero-copy">
          <p className="sf-rm-welcome">{welcomeLabel}</p>
          <h1 className="sf-rm-hero-title">
            {customTagline ? profile.tagline!.trim() : 'Your Beauty, Your Special Moment'}
          </h1>
          {heroDesc && <p className="sf-rm-hero-desc">{heroDesc}</p>}
          {(showBookBtn || showServicesBtn) && (
            <div className="sf-rm-hero-actions">
              {showBookBtn && (
                <button type="button" className="sf-button sf-rm-btn-primary" onClick={() => onBook?.()}>
                  <CalendarCheck size={18} />
                  {t('Book Appointment')}
                </button>
              )}
              {showServicesBtn && (
                <a className="sf-button sf-rm-btn-secondary" href="#services-section">
                  Explore Services
                  <ArrowUpRight size={17} />
                </a>
              )}
            </div>
          )}
          {showBookBtn && <span className="sr-only">Verified checkout</span>}
        </div>

        {/* 5-6: Main bridal/makeup image + Small supporting image */}
        {showAnyVisual && (
          <div className="sf-rm-hero-visuals">
            <div className={`sf-rm-hero-stage${showMainImage && showSecondaryImage ? '' : ' is-single-image'}`}>
              {showMainImage && <div className="sf-rm-hero-rose-shape" aria-hidden="true" />}
              {showMainImage && (
                <figure className="sf-rm-hero-main-frame">
                  <img
                    src={mainImage}
                    alt={`Indian bridal makeover portrait at ${salonName}`}
                    fetchPriority="high"
                    onError={() => {
                      if (customCover && !ownerMainFailed) setOwnerMainFailed(true);
                      else setFallbackMainFailed(true);
                    }}
                  />
                </figure>
              )}
              {showMainImage && (
                <div className="sf-rm-hero-gold-corner" aria-hidden="true">
                  <span />
                  <i />
                </div>
              )}
              {showSecondaryImage && (
                <figure className={`sf-rm-hero-sub-frame${showMainImage ? '' : ' is-standalone'}`}>
                  <img
                    src={secondaryCandidate}
                    alt={`Makeup artist working with a client at ${salonName}`}
                    loading="lazy"
                    onError={() => setSecondaryFailed(true)}
                  />
                  <figcaption>Personal Makeover Care</figcaption>
                </figure>
              )}
            </div>
          </div>
        )}

        {/* 7: Three beauty service highlights */}
        <ul className="sf-rm-hero-highlights" aria-label="Signature beauty highlights">
          {['Bridal Makeup', 'Party Makeup', 'Beauty & Hair Care'].map((item) => (
            <li key={item}>
              <span className="sf-rm-highlight-dot" aria-hidden="true">
                <Sparkles size={13} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function RoopMahalAboutSection({
  profile,
  knowMoreHref = '',
}: {
  profile: SalonProfile;
  knowMoreHref?: string;
}) {
  const ext = profile as ExtendedRoopProfile;
  const template = CATEGORY_TEMPLATES.beauty_parlour;
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [secondaryFailed, setSecondaryFailed] = useState(false);

  useEffect(() => {
    setPrimaryFailed(false);
  }, [ext.aboutImageUrl]);

  useEffect(() => {
    setSecondaryFailed(false);
  }, [profile.ownerPhotoUrl, ext.aboutSecondaryImageUrl]);

  const primarySrc =
    ext.aboutImageUrl !== undefined
      ? String(ext.aboutImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? ROOP_MAHAL_IMAGES.aboutInterior
        : '';

  const secondarySrc = hasOwnerCustomPhoto(profile)
    ? profile.ownerPhotoUrl!.trim()
    : ext.aboutSecondaryImageUrl !== undefined
      ? String(ext.aboutSecondaryImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? ROOP_MAHAL_IMAGES.aboutMakeupWork
        : '';

  const showPrimary = Boolean(primarySrc) && !primaryFailed;
  const showSecondary = Boolean(secondarySrc) && !secondaryFailed;
  const showMedia = showPrimary || showSecondary;

  const validAbout = hasOwnerCustomAbout(profile) ? profile.about.trim() : '';
  const fallbackEmptyAbout = `Welcome to ${profile.businessName?.trim() || 'Roop Mahal'}. Explore our services and meet the team behind your next visit.`;

  const customOwnerName =
    profile.ownerName?.trim() &&
    (!Object.values(CATEGORY_TEMPLATES).some((t) => t.ownerName === profile.ownerName) ||
      profile.ownerName === template.ownerName)
      ? profile.ownerName.trim()
      : '';
  const customOwnerRole =
    customOwnerName &&
    profile.ownerRole?.trim() &&
    (!Object.values(CATEGORY_TEMPLATES).some((t) => t.ownerRole === profile.ownerRole) ||
      profile.ownerRole === template.ownerRole)
      ? profile.ownerRole.trim()
      : '';

  return (
    <section id="salon-about" className="sf-section sf-rm-about-section">
      <div className={`sf-container sf-rm-about-grid${showMedia ? '' : ' is-no-media'}`}>
        {showMedia && (
          <div className={`sf-rm-about-media${showPrimary && showSecondary ? '' : ' is-single-media'}`}>
            {showPrimary && (
              <figure className="sf-rm-about-primary">
                <img
                  src={primarySrc}
                  alt="Warm and welcoming beauty parlour interior"
                  loading="lazy"
                  onError={() => setPrimaryFailed(true)}
                />
              </figure>
            )}
            {showSecondary && (
              <figure className={`sf-rm-about-secondary${showPrimary ? '' : ' is-standalone'}`}>
                <img
                  src={secondarySrc}
                  alt={customOwnerName ? `${customOwnerName} at the beauty studio` : 'Makeup specialist at work'}
                  loading="lazy"
                  onError={() => setSecondaryFailed(true)}
                />
              </figure>
            )}
          </div>
        )}

        <div className="sf-rm-about-copy">
          <p className="sf-eyebrow">About Roop Mahal</p>
          <h2>{profile.sectionHeadings?.aboutTitle || 'Beauty Care Made Special for You'}</h2>
          <p className="sf-rm-about-story">{validAbout || fallbackEmptyAbout}</p>
          {customOwnerName && (
            <p className="sf-rm-owner-note">
              <strong>{customOwnerName}</strong>
              {customOwnerRole ? ` · ${customOwnerRole}` : ''}
            </p>
          )}
          <div className="sf-rm-about-pillars">
            {[
              ['Friendly Team', 'Warm, attentive beauty specialists who listen to what suits you best.'],
              ['Personal Care', 'Thoughtful skin, hair and makeover care tailored for every client.'],
              ['Clean & Comfortable Space', 'Hygienic tools, fresh linens and a calm studio atmosphere.'],
            ].map(([title, desc]) => (
              <article key={title} className="sf-rm-pillar-card">
                <span className="sf-rm-pillar-icon" aria-hidden="true">
                  <Check size={15} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </article>
            ))}
          </div>
          {knowMoreHref && (
            <div className="sf-rm-about-cta">
              <a href={knowMoreHref} className="sf-button sf-rm-btn-secondary">
                Know More
                <ArrowUpRight size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function RoopMahalBridalHighlight({
  profile,
  services,
  hasServicesTarget = true,
  whatsappUrl = '',
}: {
  profile?: SalonProfile;
  services: SalonService[];
  hasServicesTarget?: boolean;
  whatsappUrl?: string;
}) {
  const ext = (profile || {}) as ExtendedRoopProfile;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [ext.bridalHighlightImageUrl]);

  const relevant = roopMahalBridalServices(services);
  const imageSrc =
    ext.bridalHighlightImageUrl !== undefined
      ? String(ext.bridalHighlightImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? ROOP_MAHAL_IMAGES.bridalHighlight
        : '';
  const showImage = Boolean(imageSrc) && !imgFailed;

  if (relevant.length === 0 && !showImage) {
    return null;
  }

  const rawDesc =
    profile?.sectionHeadings?.bridalSubtitle !== undefined
      ? profile.sectionHeadings.bridalSubtitle
      : 'Celebrate weddings, engagements, Karva Chauth, Diwali and family gatherings with radiant skin preparation, soft-glam artistry and graceful styling tailored around your outfit and comfort.';
  const description = rawDesc?.trim() || '';

  return (
    <section className="sf-section sf-rm-bridal-section" aria-label="Bridal and occasion makeover highlight">
      <div className="sf-container">
        <div className={`sf-rm-bridal-card${showImage ? '' : ' is-no-image'}`}>
          {showImage && (
            <div className="sf-rm-bridal-image">
              <img
                src={imageSrc}
                alt="Indian bridal and festive makeover look"
                loading="lazy"
                onError={() => setImgFailed(true)}
              />
            </div>
          )}
          <div className="sf-rm-bridal-content">
            <span className="sf-rm-gold-line" aria-hidden="true" />
            <p className="sf-eyebrow">Bridal &amp; Makeover Studio</p>
            <h2>Graceful Bridal &amp; Occasion Makeovers</h2>
            {description && <p className="sf-rm-bridal-desc">{description}</p>}
            {relevant.length > 0 ? (
              <ul className="sf-rm-bridal-services" aria-label="Featured studio treatments">
                {relevant.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    {hasValidRoopPrice(item.price) && <strong>{money(item.price)}</strong>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sf-rm-bridal-empty">
                Enquire with our beauty parlour for bridal and occasion makeover availability.
              </p>
            )}
            {(hasServicesTarget || whatsappUrl) && (
              <div className="sf-rm-bridal-actions">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sf-button sf-rm-btn-primary"
                    aria-label="Enquire on WhatsApp about bridal and occasion makeovers"
                  >
                    <MessageCircle size={16} />
                    Enquire on WhatsApp
                    <ArrowUpRight size={16} />
                  </a>
                )}
                {hasServicesTarget && (
                  <a href="#services-section" className="sf-button sf-rm-btn-secondary">
                    View Services
                    <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            )}
            {whatsappUrl && (
              <p className="sf-rm-bridal-note">
                This opens a WhatsApp draft; it does not create or confirm an appointment.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function RoopMahalTeamCard({
  staff,
  profile,
  selected,
  bookingAvailable = true,
  onView,
  onToggle,
  onBook,
}: {
  key?: React.Key;
  staff: Stylist;
  profile?: SalonProfile;
  selected: boolean;
  bookingAvailable?: boolean;
  onView: () => void;
  onToggle: () => void;
  onBook: () => void;
}) {
  const { t } = useWebsiteLanguage();
  const ext = (profile || {}) as ExtendedRoopProfile;
  const [ownerImgFailed, setOwnerImgFailed] = useState(false);
  const [fallbackImgFailed, setFallbackImgFailed] = useState(false);

  useEffect(() => {
    setOwnerImgFailed(false);
    setFallbackImgFailed(false);
  }, [staff.avatarUrl]);

  const staffName = staff.name?.trim() || '';
  if (!staffName) return null;

  const ownerAvatar = staff.avatarUrl?.trim() || '';
  const avatarSrc =
    ownerAvatar && !ownerImgFailed
      ? ownerAvatar
      : !ext.disableImageFallbacks && !fallbackImgFailed
        ? ROOP_MAHAL_IMAGES.staffFallback
        : '';
  const showAvatar = Boolean(avatarSrc);

  const roleText = staff.role?.trim() || '';
  const skills = (staff.specialties || []).map((s) => s?.trim()).filter(Boolean) as string[];
  const rated =
    typeof staff.rating === 'number' &&
    Number.isFinite(staff.rating) &&
    staff.rating > 0 &&
    staff.rating <= 5;
  const unavailable = staff.status === 'On Leave' || staff.status === 'Inactive';

  return (
    <article
      className={`sf-rm-team-card${selected ? ' is-selected' : ''}${showAvatar ? '' : ' is-no-photo'}`}
      aria-label={`${staffName} specialist card`}
    >
      {showAvatar && (
        <button
          type="button"
          className="sf-rm-team-portrait"
          onClick={onView}
          aria-label={`${t('View profile & reviews')}: ${staffName}`}
        >
          <img
            src={avatarSrc}
            alt={staffName}
            loading="lazy"
            onError={() => {
              if (ownerAvatar && !ownerImgFailed) setOwnerImgFailed(true);
              else setFallbackImgFailed(true);
            }}
          />
          {rated && (
            <span className="sf-rm-team-rating" title="Salon-listed rating">
              <Star size={12} fill="currentColor" />
              {Number(staff.rating).toFixed(2)}
            </span>
          )}
        </button>
      )}

      <div className="sf-rm-team-body">
        <h3>
          <button type="button" onClick={onView}>
            {staffName}
          </button>
        </h3>
        {roleText && <p className="sf-rm-team-role">{roleText}</p>}
        {skills.length > 0 && (
          <ul className="sf-rm-team-skills" aria-label={`${staffName} skills`}>
            {skills.slice(0, 4).map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        )}
      </div>

      {bookingAvailable && (
        <div className="sf-rm-team-footer">
          <button
            type="button"
            className="sf-specialist-toggle sf-rm-availability-btn"
            aria-pressed={selected}
            aria-label={`${t('Choose for online booking')}: ${staffName}`}
            disabled={unavailable}
            onClick={onToggle}
          >
            <i aria-hidden="true" />
            <span>
              {selected ? '✓ ' : ''}
              {t('Choose for online booking')}
            </span>
          </button>
          <button
            type="button"
            className="sf-button sf-rm-btn-primary sf-rm-book-staff"
            disabled={unavailable}
            onClick={onBook}
          >
            <CalendarCheck size={15} />
            {unavailable ? 'Currently unavailable' : 'Book with Staff'}
          </button>
        </div>
      )}
    </article>
  );
}

export function RoopMahalBookingBanner({
  profile,
  bookingAvailable = true,
  onBook,
}: {
  profile?: SalonProfile;
  bookingAvailable?: boolean;
  onBook?: () => void;
}) {
  const { t } = useWebsiteLanguage();
  const ext = (profile || {}) as ExtendedRoopProfile;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [ext.bookingBannerImageUrl]);

  const imgSrc =
    ext.bookingBannerImageUrl !== undefined
      ? String(ext.bookingBannerImageUrl || '').trim()
      : !ext.disableImageFallbacks
        ? ROOP_MAHAL_IMAGES.bookingMakeover
        : '';
  const showMedia = Boolean(imgSrc) && !imgFailed;
  const canBook = Boolean(bookingAvailable && typeof onBook === 'function');

  return (
    <section className="sf-rm-booking-banner" aria-label="Book your beauty appointment">
      <div className="sf-container">
        <div className={`sf-rm-booking-inner${showMedia ? '' : ' is-no-media'}`}>
          <div className="sf-rm-booking-copy">
            <span className="sf-rm-gold-line" aria-hidden="true" />
            <p className="sf-rm-booking-eyebrow">YOUR SPECIAL MOMENT STARTS HERE</p>
            <h2>Ready for Your Next Makeover?</h2>
            <p>Choose your favourite service and book a time that works for you.</p>
            {canBook && (
              <>
                <div className="sf-rm-booking-cta">
                  <button type="button" className="sf-button sf-rm-btn-gold" onClick={onBook}>
                    <CalendarCheck size={18} />
                    {t('Book Appointment')}
                  </button>
                </div>
                <p className="sf-rm-booking-note">
                  <ShieldCheck size={15} />
                  <span>Verified checkout · Secure 25% advance, balance at salon</span>
                </p>
              </>
            )}
          </div>
          {showMedia && (
            <div className="sf-rm-booking-media">
              <img
                src={imgSrc}
                alt="Professional Indian beauty makeover at Roop Mahal"
                loading="lazy"
                onError={() => setImgFailed(true)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function RoopMahalContactSection({
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
  const contact = roopMahalContactSummary(profile, mapUrl, whatsappUrl);

  const showAddressCard = Boolean(
    contact.fullAddress ||
      contact.landmark ||
      contact.phone ||
      contact.email ||
      contact.whatsappUrl ||
      contact.hasDirections ||
      contact.socials.length > 0,
  );
  const showHoursCard = contact.validHours.length > 0;
  const singleCard = (showAddressCard ? 1 : 0) + (showHoursCard ? 1 : 0) <= 1;

  return (
    <div className="sf-rm-contact-wrap">
      <div className="sf-section-heading">
        <div>
          <p className="sf-eyebrow">Salon Information</p>
          <h2>{headingText}</h2>
          <p>We would love to welcome you to our beauty parlour.</p>
        </div>
        {contact.hasDirections && (
          <a
            className="sf-button sf-rm-btn-secondary"
            href={contact.mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin size={17} />
            {t('Get Directions')}
            <ArrowUpRight size={15} />
          </a>
        )}
      </div>

      {(showAddressCard || showHoursCard) && (
        <div className={`sf-rm-contact-grid${singleCard ? ' is-single-card' : ''}`}>
          {showAddressCard && (
            <article className="sf-rm-contact-card">
              <h3>Salon Address &amp; Contact</h3>
              {contact.fullAddress && <address>{contact.fullAddress}</address>}
              {contact.landmark && <p className="sf-rm-landmark">Near {contact.landmark}</p>}
              {contact.phone && (
                <p className="sf-rm-contact-line">
                  <Phone size={15} aria-hidden="true" />
                  <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </p>
              )}
              {contact.email && (
                <p className="sf-rm-contact-line">
                  <Mail size={15} aria-hidden="true" />
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </p>
              )}
              {(contact.phone || contact.whatsappUrl || contact.hasDirections) && (
                <div className="sf-rm-contact-actions">
                  {contact.phone && (
                    <a className="sf-rm-contact-pill is-primary" href={`tel:${contact.phone}`}>
                      <Phone size={15} />
                      Call Now
                    </a>
                  )}
                  {contact.whatsappUrl && (
                    <a
                      className="sf-rm-contact-pill is-whatsapp"
                      href={contact.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="WhatsApp Inquiry · WhatsApp Us"
                    >
                      <MessageCircle size={15} />
                      WhatsApp Us
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                  {contact.hasDirections && (
                    <a
                      className="sf-rm-contact-pill"
                      href={contact.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={15} />
                      Get Directions
                    </a>
                  )}
                </div>
              )}
              {contact.socials.length > 0 && (
                <div className="sf-rm-contact-socials" aria-label="Salon social media links">
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
            <article className="sf-rm-contact-card">
              <h3>
                <Clock size={17} aria-hidden="true" /> Opening Hours
              </h3>
              <dl className="sf-rm-hours-list">
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
      )}
    </div>
  );
}

export function RoopMahalFooter({
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
  const ext = profile as ExtendedRoopProfile;
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [profile.logoUrl]);

  const targetExists = (id: string) => !availableTargets || availableTargets.has(id);
  const contact = roopMahalContactSummary(profile, mapUrl, whatsappUrl);
  const validServices = services.filter(isValidRoopService);

  const quickLinks = (
    [
      ['Home', '#salon-home', targetExists('salon-home')],
      ['About', '#salon-about', targetExists('salon-about')],
      ['Services', '#services-section', targetExists('services-section')],
      ['Gallery', '#salon-lookbook', targetExists('salon-lookbook')],
      ['Our Team', '#salon-team', Boolean(hasTeam) && targetExists('salon-team')],
      ['Contact', '#salon-location', targetExists('salon-location')],
    ] as Array<[string, string, boolean]>
  ).filter(([, , show]) => show);

  const hasFooterContact = Boolean(
    contact.phone ||
      contact.email ||
      contact.fullAddress ||
      contact.whatsappUrl ||
      contact.hasDirections ||
      contact.socials.length > 0,
  );

  const logoSrc = profile.logoUrl?.trim() || '';
  const showLogoImg = Boolean(logoSrc) && !logoFailed;
  const salonName = profile.businessName?.trim() || 'Roop Mahal Beauty Parlour & Makeover Space';
  const customTagline = hasOwnerCustomTagline(profile);
  const footerDesc =
    ext.footerDescription !== undefined
      ? String(ext.footerDescription || '').trim()
      : customTagline
        ? profile.tagline!.trim()
        : 'Make every occasion special with beautiful makeup, hair styling and personal beauty care.';

  const showQuickLinksCol = quickLinks.length > 0;
  const showServicesCol = validServices.length > 0;
  const showContactCol = hasFooterContact;
  const colCount =
    1 + (showQuickLinksCol ? 1 : 0) + (showServicesCol ? 1 : 0) + (showContactCol ? 1 : 0);

  const canBook = Boolean(bookingAvailable && typeof onBook === 'function');
  const hasServicesDestination = targetExists('services-section');
  const hasPoliciesDestination = targetExists('salon-policies');
  const hasHomeDestination = targetExists('salon-home');
  const year = new Date().getFullYear();

  return (
    <footer data-layout="footer" className="sf-footer sf-rm-footer">
      <div className="sf-container">
        <div className="sf-rm-footer-columns" data-col-count={colCount}>
          {/* Column 1 — Brand */}
          <div className="sf-rm-footer-brand">
            <div className={`sf-rm-footer-logo${showLogoImg ? '' : ' is-text-brand'}`}>
              {showLogoImg && (
                <img src={logoSrc} alt={salonName} onError={() => setLogoFailed(true)} />
              )}
              <div>
                <strong>{salonName}</strong>
                {profile.city?.trim() && <span>{profile.city.trim()}</span>}
              </div>
            </div>
            {footerDesc && <p>{footerDesc}</p>}
          </div>

          {/* Column 2 — Quick Links (shown only when valid destinations exist) */}
          {showQuickLinksCol && (
            <div className="sf-rm-footer-col">
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

          {/* Column 3 — Services (shown only when valid existing services exist) */}
          {showServicesCol && (
            <div className="sf-rm-footer-col">
              <h3>Services</h3>
              <ul>
                {validServices.slice(0, 6).map((service) => (
                  <li key={service.id}>
                    {canBook ? (
                      <button type="button" onClick={() => onBook?.(service)}>
                        {service.name}
                      </button>
                    ) : hasServicesDestination ? (
                      <a href="#services-section">{service.name}</a>
                    ) : (
                      <span>{service.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Column 4 — Contact (shown only when valid contact details or social links exist) */}
          {showContactCol && (
            <div className="sf-rm-footer-col">
              <h3>Contact</h3>
              {(contact.phone ||
                contact.email ||
                contact.fullAddress ||
                contact.whatsappUrl ||
                contact.hasDirections) && (
                <ul className="sf-rm-footer-contact">
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
                  {contact.fullAddress && <li>{contact.fullAddress}</li>}
                  {contact.whatsappUrl && (
                    <li>
                      <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
                        WhatsApp Us
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
              )}
              {contact.socials.length > 0 && (
                <div className="sf-rm-footer-socials" aria-label="Social media links">
                  {contact.socials.map(([label, url]) => {
                    const Icon = SOCIAL_ICON_MAP[label];
                    return (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                      >
                        <Icon size={16} aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sf-rm-footer-bottom">
          <p>© {year} {salonName}. All rights reserved.</p>
          <div className="sf-rm-footer-legal">
            {hasPoliciesDestination && <a href="#salon-policies">Policies &amp; Terms</a>}
            {branding?.poweredBy && (
              <small>Powered by {branding.platformName || 'StudioFlow'}</small>
            )}
            {hasHomeDestination && <a href="#salon-home">Back to top ↑</a>}
          </div>
        </div>
      </div>
    </footer>
  );
}
