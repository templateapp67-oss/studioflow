import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarHeart,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Facebook,
  Gift,
  Instagram,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  Star,
  Youtube,
  X,
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../../types';
import {
  VEDA_DISCLAIMER,
  vedaFormatDuration,
  vedaFormatInr,
  vedaServiceGroups,
  vedaWhatsappLink,
  type VedaConfig,
  type VedaGalleryImage,
} from '../../lib/vedaSanjeevani';
import { heroHeadline } from '../../lib/motion';
import {
  VedaBotanical,
  VedaBtn,
  VedaIcon,
  VedaImage,
  VedaGlassCard,
  VedaPageHead,
  VedaReveal,
  VedaRevealGroup,
  VedaRevealItem,
  VedaSectionHead,
  VedaTextLink,
  useVedaBodyLock,
  useVedaEscape,
  vedaOpenStatus,
} from './VedaParts';

export type VedaPage = 'home' | 'about' | 'therapies' | 'packages' | 'gallery' | 'experts' | 'contact' | 'booking' | 'offers';

export type VedaSectionProps = {
  config: VedaConfig;
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  galleryImages: VedaGalleryImage[];
  navigate: (page: VedaPage) => void;
  onBook: (service?: SalonService, stylist?: Stylist) => void;
  whatsappHref: string;
  telHref: string;
  copyCode: (code: string) => void;
  copiedCode: string;
  openFaq: string | null;
  onToggleFaq: (id: string | null) => void;
  onOpenLightbox: (index: number) => void;
  lightbox: number | null;
  onCloseLightbox: () => void;
  onRequestVoucher?: () => void;
  /** Opens the shared specialist profile (experience, reviews, booking). */
  onViewSpecialist?: (id: string) => void;
};

const hours = (profile: SalonProfile) => {
  const rows = [
    { label: 'Monday – Friday', value: (profile as any).workingHoursMonFri },
    { label: 'Saturday', value: (profile as any).workingHoursSat },
    { label: 'Sunday', value: (profile as any).workingHoursSun },
  ].filter((row) => typeof row.value === 'string' && row.value.trim());
  return rows.length ? (rows as Array<{ label: string; value: string }>) : null;
};

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

export function VedaHero({ config, profile, navigate, onBook, whatsappHref }: VedaSectionProps) {
  const layout = config.layout;
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const parallax = useTransform(scrollY, [0, 700], [0, reduce ? 0 : 90]);
  const fade = useTransform(scrollY, [0, 620], [1, reduce ? 1 : 0.55]);
  const status = vedaOpenStatus(
    String((profile as any).openTime || '09:30'),
    String((profile as any).closeTime || '20:00'),
  );
  const headline = config.hero.headline;

  const media = (
    <div className="vd-hero__media">
      <motion.div style={{ position: 'absolute', inset: '-8% 0', y: parallax, willChange: 'transform' }}>
        <VedaImage
          slot="hero"
          src={config.hero.image}
          alt={`${profile.businessName || 'Veda Sanjeevani'} treatment room`}
          priority
          sizes="100vw"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </motion.div>
    </div>
  );

  const copy = (
    <div className="vd-hero__copy">
      <p className="vd-eyebrow vd-hero__eyebrow">{config.hero.eyebrow}</p>
      {reduce ? (
        <h1 className="vd-hero__headline">{headline}</h1>
      ) : (
        <motion.h1 className="vd-hero__headline" variants={heroHeadline} initial="hidden" animate="visible">
          {headline}
        </motion.h1>
      )}
      <p className="vd-hero__desc">{config.hero.description}</p>
      <div className="vd-hero__ctas">
        <VedaBtn variant="gold" onClick={() => onBook()}>
          {config.hero.primaryCta} <ArrowRight size={17} aria-hidden="true" />
        </VedaBtn>
        <VedaBtn variant="ghost" onClick={() => navigate('therapies')}>
          {config.hero.secondaryCta}
        </VedaBtn>
      </div>
      <p className="vd-hero__caption" style={{ marginTop: 26 }}>{config.hero.caption}</p>
    </div>
  );

  const aside = (
    <div className="vd-hero__aside">
      <VedaGlassCard className="vd-hero__card" as="div" ariaLabel="Today at the sanctuary">
        <div className="vd-hero__card-head">
          <span className="vd-hero__card-title">Today at the sanctuary</span>
          <span className="vd-open-pill" data-open={status.open}>
            <i aria-hidden="true" /> {status.label}
          </span>
        </div>
        <div className="vd-hero__stats">
          {config.hero.stats.slice(0, 4).map((stat) => (
            <div className="vd-hero__stat" key={stat.label}>
              <b>{stat.value}</b>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        <a className="vd-btn vd-btn--ghost vd-btn--sm" href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={15} aria-hidden="true" /> Ask on WhatsApp
        </a>
      </VedaGlassCard>
    </div>
  );

  if (layout === 'editorial') {
    return (
      <section className="vd-hero vd-hero--editorial" aria-label="Veda Sanjeevani">
        <div className="vd-container">
          <div className="vd-hero__inner">
            <div className="vd-hero__aside">{aside}</div>
            <div className="vd-hero__media">
              <VedaImage slot="hero" src={config.hero.image} alt={`${profile.businessName || 'Veda Sanjeevani'} treatment room`} priority sizes="(max-width: 900px) 100vw, 50vw" />
            </div>
            <div className="vd-hero__copy" style={{ order: 0 }}>
              <p className="vd-eyebrow vd-hero__eyebrow">{config.hero.eyebrow}</p>
              <h1 className="vd-hero__headline">{headline}</h1>
              <p className="vd-hero__desc">{config.hero.description}</p>
              <div className="vd-hero__ctas">
                <VedaBtn variant="gold" onClick={() => onBook()}>
                  {config.hero.primaryCta} <ArrowRight size={17} aria-hidden="true" />
                </VedaBtn>
                <VedaBtn variant="ghost" onClick={() => navigate('therapies')}>
                  {config.hero.secondaryCta}
                </VedaBtn>
              </div>
              <p className="vd-hero__caption" style={{ marginTop: 24 }}>{config.hero.caption}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`vd-hero${layout === 'minimal' ? ' vd-hero--minimal' : ' vd-hero--cinematic'}`} aria-label="Veda Sanjeevani">
      {media}
      <div className="vd-hero__scrim" aria-hidden="true" />
      {layout === 'minimal' ? (
        <div className="vd-container">
          <motion.div className="vd-hero__inner" style={{ opacity: fade }}>
            {copy}
          </motion.div>
        </div>
      ) : (
        <div className="vd-container">
          <div className="vd-hero__inner">
            {copy}
            {aside}
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Philosophy / About
 * ------------------------------------------------------------------ */

export function VedaPhilosophy({ config }: VedaSectionProps) {
  return (
    <section className="vd-section" id="about" aria-labelledby="vd-philosophy-title">
      <div className="vd-container">
        <div className="vd-philosophy">
          <VedaReveal className="vd-philosophy__media">
            <VedaImage slot="sanctuary" src={config.philosophy.image} alt="Inside the Veda Sanjeevani sanctuary" ratio="4 / 5" sizes="(max-width: 900px) 100vw, 44vw" />
            <div className="vd-philosophy__quote">
              <p>{config.philosophy.quote}</p>
              <span>{config.philosophy.signature}</span>
            </div>
          </VedaReveal>
          <VedaReveal className="vd-head" delay={0.08}>
            <p className="vd-eyebrow">{config.philosophy.eyebrow}</p>
            <h2 className="vd-h2" id="vd-philosophy-title">{config.philosophy.title}</h2>
            <p className="vd-lead">{config.philosophy.body}</p>
            <div className="vd-pillars">
              {config.philosophy.pillars.map((pillar, index) => (
                <div className="vd-pillar" key={pillar.title}>
                  <span className="vd-pillar__index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{pillar.title}</h3>
                    <p>{pillar.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </VedaReveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Therapies
 * ------------------------------------------------------------------ */

function TherapyCard({
  service,
  index,
  onBook,
  navigate,
}: {
  service: SalonService;
  index: number;
  onBook: (service?: SalonService) => void;
  navigate: (page: VedaPage) => void;
}) {
  const benefits = ((service as SalonService & { benefits?: string[] }).benefits || []).slice(0, 3);
  return (
    <VedaRevealItem className="vd-card" as="article" variant="glass">
      <div className="vd-card__media">
        <VedaImage slot="abhyanga" src={service.imageUrl} alt={service.name} ratio="4 / 3" sizes="(max-width: 760px) 100vw, (max-width: 1100px) 46vw, 30vw" />
        <div className="vd-card__badges">
          <span className="vd-chip">{service.category}</span>
          {service.popular ? <span className="vd-chip vd-chip--gold">Guest favourite</span> : null}
        </div>
      </div>
      <div className="vd-card__body">
        <p className="vd-card__cat">{String(index + 1).padStart(2, '0')} · {service.category}</p>
        <h3 className="vd-card__title">{service.name}</h3>
        <p className="vd-card__desc">{service.description}</p>
        {benefits.length ? (
          <ul className="vd-benefits">
            {benefits.map((benefit) => (
              <li key={benefit}>
                <Check size={13} aria-hidden="true" /> {benefit}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="vd-card__meta">
          <span className="vd-price">
            {vedaFormatInr(service.price)}
            <small>per session</small>
          </span>
          {service.showDuration === false ? null : (
            <span className="vd-duration">
              <Clock3 size={14} aria-hidden="true" /> {vedaFormatDuration(service.durationMinutes)}
            </span>
          )}
        </div>
        <div className="vd-card__cta">
          <VedaBtn size="sm" onClick={() => onBook(service)}>
            Book this ritual
          </VedaBtn>
          <VedaBtn size="sm" variant="quiet" onClick={() => navigate('therapies')} ariaLabel={`Details for ${service.name}`}>
            <ArrowUpRight size={16} aria-hidden="true" />
          </VedaBtn>
        </div>
      </div>
    </VedaRevealItem>
  );
}

export function VedaTherapiesFeatured(props: VedaSectionProps) {
  const { config, services, onBook, navigate } = props;
  const featured = useMemo(() => services.filter((service) => service.popular).slice(0, 6), [services]);
  const list = featured.length >= 3 ? featured : services.slice(0, 6);
  const categories = useMemo(() => vedaServiceGroups(services).slice(0, 4), [services]);
  return (
    <section className="vd-section vd-section--sand" id="therapies" aria-labelledby="vd-therapies-title">
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead
            eyebrow={config.therapies.eyebrow}
            title={config.therapies.title}
            body={config.therapies.body}
            id="vd-therapies-title"
            action={<VedaTextLink onClick={() => navigate('therapies')}>See all {services.length} rituals</VedaTextLink>}
          />
        </VedaReveal>
        <div className="vd-therapy-tabs" role="tablist" aria-label="Therapy categories">
          {categories.map((group) => (
            <button key={group.category} type="button" role="tab" aria-selected="false" onClick={() => navigate('therapies')}>
              {group.category} ({group.services.length})
            </button>
          ))}
        </div>
        <VedaRevealGroup className="vd-grid vd-grid--3" variant="glass">
          {list.map((service, index) => (
            <TherapyCard key={service.id} service={service} index={index} onBook={onBook} navigate={navigate} />
          ))}
        </VedaRevealGroup>
      </div>
    </section>
  );
}

/** Full catalogue (Therapies page + home tab navigation target). */
export function VedaTherapyCatalogue({ config, services, onBook, navigate }: VedaSectionProps) {
  const groups = useMemo(() => vedaServiceGroups(services), [services]);
  const [active, setActive] = useState('All');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups
      .filter((group) => active === 'All' || group.category === active)
      .map((group) => ({
        ...group,
        services: group.services.filter(
          (service) => !needle || `${service.name} ${service.description} ${service.category}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.services.length);
  }, [groups, active, query]);
  const count = filtered.reduce((total, group) => total + group.services.length, 0);
  return (
    <>
      <VedaPageHead
        crumb="Therapies"
        head={
          <VedaSectionHead eyebrow={config.therapies.eyebrow} title={config.therapies.title} body={config.therapies.body} />
        }
      >
        <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
      </VedaPageHead>
      <section className="vd-section vd-section--tight" aria-label="All therapies">
        <div className="vd-container">
          <div className="vd-therapy-tabs" role="tablist" aria-label="Filter therapies">
            <button type="button" role="tab" aria-selected={active === 'All'} aria-pressed={active === 'All'} onClick={() => setActive('All')}>
              All rituals ({services.length})
            </button>
            {groups.map((group) => (
              <button key={group.category} type="button" role="tab" aria-pressed={active === group.category} onClick={() => setActive(group.category)}>
                {group.category} ({group.services.length})
              </button>
            ))}
          </div>
          <div className="vd-field" style={{ maxWidth: 420, marginBottom: 26 }}>
            <label htmlFor="vd-therapy-search">Search rituals</label>
            <input
              id="vd-therapy-search"
              type="search"
              value={query}
              placeholder="Try “shirodhara”, “back” or “steam”"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {filtered.map((group) => (
            <div key={group.category} style={{ marginBottom: 44 }}>
              <VedaReveal>
                <div className="vd-head__row" style={{ marginBottom: 20 }}>
                  <div>
                    <p className="vd-eyebrow">{group.category}</p>
                    <h2 className="vd-h3" style={{ marginTop: 8 }}>{group.category}</h2>
                  </div>
                  <span className="vd-small vd-muted">{group.services.length} ritual{group.services.length === 1 ? '' : 's'}</span>
                </div>
              </VedaReveal>
              <VedaRevealGroup className="vd-grid vd-grid--3" variant="glass">
                {group.services.map((service, index) => (
                  <TherapyCard key={service.id} service={service} index={index} onBook={onBook} navigate={navigate} />
                ))}
              </VedaRevealGroup>
            </div>
          ))}
          {!count ? (
            <div className="vd-form__notice">
              No rituals match “{query}”. Clear the search or ask us on WhatsApp — we may offer it on request.
            </div>
          ) : null}
          <p className="vd-disclaimer" style={{ marginTop: 28, maxWidth: 720 }}>{VEDA_DISCLAIMER}</p>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Signature experiences
 * ------------------------------------------------------------------ */

export function VedaSignature({ config }: VedaSectionProps) {
  return (
    <section className="vd-section" id="signature" aria-labelledby="vd-signature-title">
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead eyebrow={config.signature.eyebrow} title={config.signature.title} body={config.signature.body} id="vd-signature-title" />
        </VedaReveal>
        <div className="vd-signature">
          {config.signature.items.map((item, index) => (
            <VedaReveal key={item.id} className="vd-signature__row" delay={index * 0.05}>
              <div className="vd-signature__media">
                <VedaImage slot="ritual" src={item.imageUrl} alt={item.title} ratio="4 / 3" sizes="(max-width: 900px) 100vw, 44vw" />
              </div>
              <div className="vd-signature__body">
                <span className="vd-signature__num">{String(index + 1).padStart(2, '0')}</span>
                <p className="vd-signature__meta">{item.meta}</p>
                <h3>{item.title}</h3>
                <p className="vd-lead">{item.body}</p>
              </div>
            </VedaReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Why choose us
 * ------------------------------------------------------------------ */

export function VedaWhy({ config }: VedaSectionProps) {
  return (
    <section className="vd-section vd-section--forest" id="why" aria-labelledby="vd-why-title">
      <VedaBotanical />
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead eyebrow={config.why.eyebrow} title={config.why.title} body={config.why.body} id="vd-why-title" />
        </VedaReveal>
        <VedaRevealGroup className="vd-why">
          {config.why.items.map((item) => (
            <VedaRevealItem key={item.id} className="vd-why__item" as="div">
              <span className="vd-why__icon"><VedaIcon name={item.icon} size={19} /></span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </VedaRevealItem>
          ))}
        </VedaRevealGroup>
        <VedaReveal delay={0.08}>
          <figure className="vd-why__figure">
            <VedaImage
              slot="treatment-room"
              alt="A Veda Sanjeevani treatment room: carved teak droni, brass dhara vessel and jaali light"
              ratio="21 / 9"
              sizes="(max-width: 900px) 100vw, 88vw"
            />
            <figcaption>Four rooms, never more than four guests at a time.</figcaption>
          </figure>
        </VedaReveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Experts
 * ------------------------------------------------------------------ */

export function VedaExperts({ config, stylists, navigate, onBook, onViewSpecialist }: VedaSectionProps) {
  return (
    <section className="vd-section" id="experts" aria-labelledby="vd-experts-title">
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead
            eyebrow={config.experts.eyebrow}
            title={config.experts.title}
            body={config.experts.body}
            id="vd-experts-title"
            action={<VedaTextLink onClick={() => navigate('booking')}>Request a therapist</VedaTextLink>}
          />
        </VedaReveal>
        <VedaRevealGroup className="vd-grid vd-grid--3" style={{ marginTop: 34 }} variant="glass">
          {stylists.map((person) => (
            <VedaRevealItem key={person.id} className="vd-expert" as="article" variant="glass">
              <div className="vd-expert__media">
                <VedaImage slot="therapist-ananya" src={person.avatarUrl} alt={person.name} ratio="3 / 4" sizes="(max-width: 760px) 100vw, 30vw" />
              </div>
              <div className="vd-expert__body">
                <p className="vd-expert__role">{person.role}</p>
                <h3 className="vd-expert__name">{person.name}</h3>
                {person.bio ? <p className="vd-desc vd-small vd-muted">{person.bio}</p> : null}
                {person.specialties?.length ? (
                  <div className="vd-expert__tags">
                    {person.specialties.slice(0, 3).map((tag) => (
                      <span className="vd-tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}
                <div className="vd-expert__meta">
                  {person.experienceYears ? <span>{person.experienceYears} years’ practice</span> : null}
                  {person.languages?.length ? <span>{person.languages.join(' · ')}</span> : null}
                  {person.qualifications?.length ? <span>{person.qualifications[0]}</span> : null}
                </div>
                <div className="vd-expert__actions">
                  <VedaBtn size="sm" onClick={() => onBook(undefined, person)}>
                    Book with {person.name.split(' ')[0]}
                  </VedaBtn>
                  {onViewSpecialist ? (
                    <button type="button" className="vd-textlink" onClick={() => onViewSpecialist(person.id)}>
                      View profile &amp; reviews <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
            </VedaRevealItem>
          ))}
        </VedaRevealGroup>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Gallery + lightbox
 * ------------------------------------------------------------------ */

export function VedaGallery({ config, navigate, galleryImages, lightbox, onOpenLightbox, onCloseLightbox }: VedaSectionProps) {
  return (
    <section className="vd-section vd-section--sand" id="gallery" aria-labelledby="vd-gallery-title">
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead
            eyebrow={config.gallery.eyebrow}
            title={config.gallery.title}
            body={config.gallery.body}
            id="vd-gallery-title"
            action={<VedaTextLink onClick={() => navigate('gallery')}>Open the full gallery</VedaTextLink>}
          />
        </VedaReveal>
        <VedaGalleryGrid images={galleryImages.slice(0, 9)} onOpen={onOpenLightbox} />
      </div>
      <VedaLightbox images={galleryImages} index={lightbox} onClose={onCloseLightbox} />
    </section>
  );
}

export function VedaGalleryGrid({ images, onOpen }: { images: VedaGalleryImage[]; onOpen: (index: number) => void }) {
  return (
    <VedaRevealGroup className="vd-gallery">
      {images.map((image, index) => (
        <VedaRevealItem key={image.id} className="vd-gallery__cell" as="div">
          <button type="button" className="vd-gallery__tile" onClick={() => onOpen(index)} aria-label={`Open photo: ${image.title}`}>
            <VedaImage
              slot="gallery"
              src={image.url}
              alt={image.alt || image.title}
              ratio="4 / 3"
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 46vw, 30vw"
            />
            <span className="vd-gallery__label">{image.title}</span>
          </button>
        </VedaRevealItem>
      ))}
    </VedaRevealGroup>
  );
}

export function VedaLightbox({ images, index, onClose }: { images: VedaGalleryImage[]; index: number | null; onClose: () => void }) {
  useVedaBodyLock(index !== null);
  useVedaEscape(index !== null, onClose);
  if (index === null || !images[index]) return null;
  const image = images[index];
  return (
    <div className="vd-lightbox" role="dialog" aria-modal="true" aria-label={image.title} onClick={onClose}>
      <button type="button" className="vd-lightbox__close" onClick={onClose} aria-label="Close photo">
        <X size={20} aria-hidden="true" />
      </button>
      <figure onClick={(event) => event.stopPropagation()}>
        <VedaImage slot="gallery" src={image.url} alt={image.alt || image.title} priority sizes="(max-width: 900px) 100vw, 70vw" />
        <figcaption>
          <strong>{image.title}</strong>
          {image.caption ? <span> — {image.caption}</span> : null}
        </figcaption>
      </figure>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Packages
 * ------------------------------------------------------------------ */

export function VedaPackages({ config, onBook, navigate }: VedaSectionProps) {
  return (
    <section className="vd-section" id="packages" aria-labelledby="vd-packages-title">
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead
            eyebrow={config.packages.eyebrow}
            title={config.packages.title}
            body={config.packages.body}
            id="vd-packages-title"
            action={<VedaTextLink onClick={() => navigate('packages')}>Compare all plans</VedaTextLink>}
          />
        </VedaReveal>
        <VedaRevealGroup className="vd-grid vd-grid--2" style={{ marginTop: 34 }} variant="glass">
          {config.packages.items.map((item) => (
            <VedaRevealItem key={item.id} as="article" variant="glass">
              <div className="vd-package" data-popular={item.popular ? 'true' : 'false'}>
                <div className="vd-package__media">
                  <VedaImage slot="ritual" src={item.imageUrl} alt={item.name} ratio="16 / 9" sizes="(max-width: 900px) 100vw, 46vw" />
                </div>
                <div className="vd-package__body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                    <h3 className="vd-package__name">{item.name}</h3>
                    {item.popular ? <span className="vd-chip vd-chip--gold">Most booked</span> : null}
                  </div>
                  <p className="vd-small vd-muted">{item.tagline}</p>
                  <div className="vd-package__price">
                    <b>{vedaFormatInr(item.price)}</b>
                    {item.originalPrice > item.price ? <s>{vedaFormatInr(item.originalPrice)}</s> : null}
                  </div>
                  <p className="vd-small vd-muted">{item.duration} · {item.sessions}</p>
                  <ul className="vd-package__includes">
                    {item.includes.map((include) => (
                      <li key={include}><Check size={14} aria-hidden="true" /> {include}</li>
                    ))}
                  </ul>
                  <div className="vd-package__foot">
                    <VedaBtn size="sm" onClick={() => onBook()}>Reserve this package</VedaBtn>
                  </div>
                </div>
              </div>
            </VedaRevealItem>
          ))}
        </VedaRevealGroup>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Offers + vouchers
 * ------------------------------------------------------------------ */

export function VedaOffers({ config, profile, copyCode, copiedCode, whatsappHref }: VedaSectionProps) {
  const regular = config.offers.items.filter((offer) => !offer.voucher);
  const voucher = config.offers.items.find((offer) => offer.voucher);
  return (
    <section className="vd-section vd-section--sand" id="offers" aria-labelledby="vd-offers-title">
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead eyebrow={config.offers.eyebrow} title={config.offers.title} body={config.offers.body} id="vd-offers-title" />
        </VedaReveal>
        <div className="vd-offers">
          <VedaRevealGroup variant="glass">
            {regular.map((offer) => (
              <VedaRevealItem key={offer.id} className="vd-offer" as="article" variant="glass">
                <div className="vd-offer__media">
                  <VedaImage slot="oil-ritual" src={offer.imageUrl} alt={offer.title} ratio="1 / 1" sizes="140px" />
                </div>
                <div className="vd-offer__body">
                  <span className="vd-offer__badge">{offer.badge}{offer.validTill ? ` · till ${offer.validTill}` : ''}</span>
                  <h3>{offer.title}</h3>
                  <p>{offer.body}</p>
                  {offer.code ? (
                    <div className="vd-offer__code">
                      <code className="vd-code">{offer.code}</code>
                      <button type="button" className="vd-textlink" style={{ background: 'none', border: '0', cursor: 'pointer' }} onClick={() => copyCode(offer.code)}>
                        <Copy size={13} aria-hidden="true" /> {copiedCode === offer.code ? 'Copied' : 'Copy code'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </VedaRevealItem>
            ))}
          </VedaRevealGroup>
          <VedaReveal className="vd-voucher" delay={0.06}>
            <span className="vd-voucher__seal"><Gift size={16} aria-hidden="true" /> Gift voucher</span>
            <h3>{voucher?.title || 'Gift an Ayurvedic ritual'}</h3>
            <p>{voucher?.body || 'A hand-written voucher for any therapy or package, valid for a year.'}</p>
            <p className="vd-small" style={{ color: 'color-mix(in srgb, var(--vd-ivory) 70%, var(--vd-sage))' }}>{config.offers.voucherNote}</p>
            <a className="vd-btn vd-btn--gold vd-btn--sm" href={vedaWhatsappLink(profile.whatsapp || profile.phone, `Hello ${profile.businessName || 'Veda Sanjeevani'}, I would like to buy a gift voucher. Could you share the options?`)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={15} aria-hidden="true" /> Buy a voucher
            </a>
            <span className="vd-small" style={{ color: 'color-mix(in srgb, var(--vd-ivory) 62%, var(--vd-sage))' }}>{whatsappHref ? 'Replies within the hour during opening times.' : ''}</span>
          </VedaReveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Testimonials
 * ------------------------------------------------------------------ */

export function VedaTestimonials({ config }: VedaSectionProps) {
  return (
    <section className="vd-section" id="testimonials" aria-labelledby="vd-testimonials-title">
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead eyebrow={config.testimonials.eyebrow} title={config.testimonials.title} body={config.testimonials.body} id="vd-testimonials-title" align="center" />
        </VedaReveal>
        <VedaRevealGroup className="vd-quotes" variant="glass">
          {config.testimonials.items.slice(0, 3).map((quote) => (
            <VedaRevealItem key={quote.id} className="vd-quote" as="figure" variant="glass">
              <span className="vd-quote__stars" aria-label={`${quote.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={13} fill={index < quote.rating ? 'currentColor' : 'none'} aria-hidden="true" />
                ))}
              </span>
              <blockquote>
                <Quote size={16} aria-hidden="true" style={{ opacity: 0.4, marginBottom: 6 }} />
                {quote.quote}
              </blockquote>
              <figcaption className="vd-quote__who">
                <img src={quote.photoUrl} alt="" loading="lazy" />
                <div>
                  <b>{quote.name}</b>
                  <span>{quote.treatment}{quote.location ? ` · ${quote.location}` : ''}</span>
                </div>
              </figcaption>
            </VedaRevealItem>
          ))}
        </VedaRevealGroup>
        <p className="vd-small vd-muted" style={{ textAlign: 'center', marginTop: 22 }}>
          Reviews are shared by guests after their visit. Sample stories are labelled and replaced as real reviews arrive.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * FAQ
 * ------------------------------------------------------------------ */

export function VedaFaq({ config, openFaq, onToggleFaq }: VedaSectionProps) {
  return (
    <section className="vd-section vd-section--sand" id="faq" aria-labelledby="vd-faq-title">
      <div className="vd-container">
        <div className="vd-booking" style={{ gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.2fr)', alignItems: 'start' }}>
          <VedaReveal>
            <VedaSectionHead eyebrow={config.faq.eyebrow} title={config.faq.title} body={config.faq.body} id="vd-faq-title" />
          </VedaReveal>
          <div className="vd-faq">
            {config.faq.items.map((item) => {
              const open = openFaq === item.id;
              return (
                <div className="vd-faq__item" data-open={open} key={item.id}>
                  <h3 style={{ margin: 0 }}>
                    <button
                      type="button"
                      className="vd-faq__q"
                      aria-expanded={open}
                      aria-controls={`vd-faq-${item.id}`}
                      onClick={() => onToggleFaq(open ? null : item.id)}
                    >
                      {item.question}
                      <span aria-hidden="true"><ChevronDown size={16} /></span>
                    </button>
                  </h3>
                  <div className="vd-faq__a" id={`vd-faq-${item.id}`} hidden={!open}>
                    <p>{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Contact
 * ------------------------------------------------------------------ */

export function VedaContact({ config, profile, navigate, telHref, whatsappHref }: VedaSectionProps) {
  // The map embed is click-to-load: nothing third-party is requested until the
  // visitor asks for it, which keeps the page fast and privacy-friendly.
  const [mapLoaded, setMapLoaded] = useState(false);
  const hoursRows = hours(profile) || config.contact.hours;
  const address = [profile.address, profile.city].filter(Boolean).join(', ');
  const socials = [
    { label: 'Instagram', url: profile.instagramHandle ? `https://instagram.com/${String(profile.instagramHandle).replace(/^@/, '')}` : '' },
    { label: 'Facebook', url: (profile as any).facebookPage || '' },
    { label: 'YouTube', url: (profile as any).youtubeChannel || '' },
  ].filter((item) => item.url);
  return (
    <section className="vd-section" id="contact" aria-labelledby="vd-contact-title">
      <div className="vd-container">
        <VedaReveal>
          <VedaSectionHead eyebrow={config.contact.eyebrow} title={config.contact.title} body={config.contact.body} id="vd-contact-title" />
        </VedaReveal>
        <div className="vd-contact" style={{ marginTop: 34 }}>
          <VedaGlassCard className="vd-contact__card" as="div" ariaLabel="Contact details and opening hours">
            <div className="vd-contact__lines">
              <div className="vd-contact__line">
                <i><MapPin size={17} aria-hidden="true" /></i>
                <div>
                  <b>Studio</b>
                  <p>{address || 'Civil Lines, Kota, Rajasthan'}</p>
                </div>
              </div>
              <div className="vd-contact__line">
                <i><Phone size={17} aria-hidden="true" /></i>
                <div>
                  <b>Call</b>
                  <a href={telHref}>{profile.phone || '+91 98290 44117'}</a>
                </div>
              </div>
              <div className="vd-contact__line">
                <i><MessageCircle size={17} aria-hidden="true" /></i>
                <div>
                  <b>WhatsApp</b>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">Message the sanctuary</a>
                </div>
              </div>
              <div className="vd-contact__line">
                <i><Mail size={17} aria-hidden="true" /></i>
                <div>
                  <b>Email</b>
                  <a href={`mailto:${profile.email || 'care@vedasanjeevani.in'}`}>{profile.email || 'care@vedasanjeevani.in'}</a>
                </div>
              </div>
            </div>
            <div className="vd-hours">
              {hoursRows.map((row) => (
                <div className="vd-hours__row" key={row.label}>
                  <b>{row.label}</b>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <VedaBtn onClick={() => navigate('booking')}><CalendarHeart size={16} aria-hidden="true" /> Book a ritual</VedaBtn>
              <VedaBtn variant="quiet" href={config.contact.mapLink} external>Get directions <ArrowUpRight size={15} aria-hidden="true" /></VedaBtn>
            </div>
          </VedaGlassCard>
          <VedaReveal delay={0.06}>
            <div className="vd-map">
              {mapLoaded ? (
                <iframe
                  title="Veda Sanjeevani location map"
                  src={config.contact.mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <button type="button" className="vd-map__facade" onClick={() => setMapLoaded(true)}>
                  <span className="vd-map__ping" aria-hidden="true"><MapPin size={22} /></span>
                  <span className="vd-map__facade-copy">
                    <strong>{address || 'Civil Lines, Kota, Rajasthan'}</strong>
                    <span className="vd-small vd-muted">Load the interactive map</span>
                  </span>
                </button>
              )}
              <div className="vd-map__foot">
                <span className="vd-small vd-muted">Civil Lines, Kota · parking in the courtyard</span>
                <a className="vd-textlink" href={config.contact.mapLink} target="_blank" rel="noopener noreferrer">Open in maps</a>
              </div>
            </div>
            {socials.length ? (
              <div className="vd-socials" style={{ marginTop: 16 }} aria-label="Social media">
                {socials.map((social) => (
                  <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                    {social.label === 'Instagram' ? <Instagram size={17} aria-hidden="true" /> : social.label === 'Facebook' ? <Facebook size={17} aria-hidden="true" /> : <Youtube size={17} aria-hidden="true" />}
                  </a>
                ))}
              </div>
            ) : null}
            <p className="vd-disclaimer" style={{ marginTop: 18 }}>{config.contact.disclaimer || VEDA_DISCLAIMER}</p>
          </VedaReveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * About page
 * ------------------------------------------------------------------ */

export function VedaAboutPage(props: VedaSectionProps) {
  const { config, profile, stylists, navigate } = props;
  return (
    <>
      <VedaPageHead
        crumb="About"
        head={
          <VedaSectionHead eyebrow={config.philosophy.eyebrow} title={config.philosophy.title} body={config.philosophy.body} />
        }
      >
        <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
      </VedaPageHead>
      <VedaPhilosophy {...props} />
      <section className="vd-section vd-section--tight" aria-label="Our story">
        <div className="vd-container">
          <div className="vd-philosophy" style={{ alignItems: 'start' }}>
            <VedaReveal className="vd-head">
              <p className="vd-eyebrow">The studio</p>
              <h2 className="vd-h2">Built around four rooms and one rule: listen first.</h2>
              <p className="vd-lead">{profile.about || config.philosophy.body}</p>
              <p className="vd-lead">
                Veda Sanjeevani began as a two-room practice in {profile.city || 'Kota'} with a single physician and a small
                preparation kitchen. We have grown slowly since — never more than four treatment rooms, never a script read
                from a menu — because the rituals only work when there is time to do them properly.
              </p>
              <p className="vd-lead">
                Every oil is warmed to body temperature, every herb paste is mixed the morning it is used, and every plan is
                written down for you in plain language. If a therapy is not right for you, we will say so.
              </p>
            </VedaReveal>
            <VedaReveal delay={0.06}>
              <VedaImage slot="ritual" alt="Herbal ritual preparation at Veda Sanjeevani" ratio="4 / 3" sizes="(max-width: 900px) 100vw, 48vw" style={{ borderRadius: 'var(--vd-radius-lg)', boxShadow: 'var(--vd-shadow)' }} />
              <div className="vd-grid vd-grid--2" style={{ marginTop: 16 }}>
                <VedaImage slot="herbs" alt="Ayurvedic ingredients" ratio="1 / 1" sizes="(max-width: 900px) 46vw, 24vw" style={{ borderRadius: 'var(--vd-radius)', width: '100%', objectFit: 'cover' }} />
                <VedaImage slot="steam" alt="Herbal steam suite" ratio="1 / 1" sizes="(max-width: 900px) 46vw, 24vw" style={{ borderRadius: 'var(--vd-radius)', width: '100%', objectFit: 'cover' }} />
              </div>
            </VedaReveal>
          </div>
        </div>
      </section>
      <VedaExperts {...props} />
      <section className="vd-section vd-section--forest vd-section--tight">
        <div className="vd-container">
          <VedaReveal className="vd-head vd-head--center">
            <p className="vd-eyebrow">{config.why.eyebrow}</p>
            <h2 className="vd-h2">{config.why.title}</h2>
            <p className="vd-lead">{config.why.body}</p>
          </VedaReveal>
          <div className="vd-why" style={{ marginTop: 30 }}>
            {config.why.items.slice(0, 3).map((item) => (
              <VedaReveal key={item.id} className="vd-why__item">
                <span className="vd-why__icon"><VedaIcon name={item.icon} size={19} /></span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </VedaReveal>
            ))}
          </div>
          <div style={{ marginTop: 30, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <VedaBtn variant="gold" onClick={() => navigate('booking')}>Book a first ritual <ArrowRight size={16} aria-hidden="true" /></VedaBtn>
            <VedaBtn variant="ghost" onClick={() => navigate('contact')}>Visit us</VedaBtn>
          </div>
          <p className="vd-small" style={{ marginTop: 22, maxWidth: 760, color: 'color-mix(in srgb, var(--vd-ivory) 66%, var(--vd-sage))' }}>
            {stylists.length} therapists on the team · {profile.city || 'Kota'}
          </p>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Gallery page
 * ------------------------------------------------------------------ */

export function VedaGalleryPage({ config, navigate, galleryImages, lightbox, onOpenLightbox, onCloseLightbox }: VedaSectionProps) {
  return (
    <>
      <VedaPageHead
        crumb="Gallery"
        head={
          <VedaSectionHead eyebrow={config.gallery.eyebrow} title={config.gallery.title} body={config.gallery.body} />
        }
      >
        <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
      </VedaPageHead>
      <section className="vd-section vd-section--tight" aria-label="Photo gallery">
        <div className="vd-container">
          <VedaGalleryGrid images={galleryImages} onOpen={onOpenLightbox} />
          <p className="vd-small vd-muted" style={{ marginTop: 22 }}>
            Sample photographs are bundled with the template. Replace them with your own from the customizer → Photos.
          </p>
        </div>
      </section>
      <VedaLightbox images={galleryImages} index={lightbox} onClose={onCloseLightbox} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Packages page
 * ------------------------------------------------------------------ */

export function VedaPackagesPage(props: VedaSectionProps) {
  const { config, navigate, onBook } = props;
  return (
    <>
      <VedaPageHead
        crumb="Packages"
        head={
          <VedaSectionHead eyebrow={config.packages.eyebrow} title={config.packages.title} body={config.packages.body} />
        }
      >
        <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
      </VedaPageHead>
      <section className="vd-section vd-section--tight" aria-label="Wellness packages">
        <div className="vd-container">
          <VedaRevealGroup className="vd-grid vd-grid--2" variant="glass">
            {config.packages.items.map((item) => (
              <VedaRevealItem className="vd-package" as="article" variant="glass" key={item.id}>
                <div className="vd-package__media">
                  <VedaImage slot="ritual" src={item.imageUrl} alt={item.name} ratio="16 / 9" sizes="(max-width: 900px) 100vw, 46vw" />
                </div>
                <div className="vd-package__body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                    <h2 className="vd-package__name" style={{ fontSize: '1.55rem' }}>{item.name}</h2>
                    {item.popular ? <span className="vd-chip vd-chip--gold">Most booked</span> : null}
                  </div>
                  <p className="vd-small vd-muted">{item.tagline}</p>
                  <div className="vd-package__price">
                    <b>{vedaFormatInr(item.price)}</b>
                    {item.originalPrice > item.price ? <s>{vedaFormatInr(item.originalPrice)}</s> : null}
                  </div>
                  <p className="vd-small vd-muted">{item.duration} · {item.sessions}</p>
                  <ul className="vd-package__includes">
                    {item.includes.map((include) => (
                      <li key={include}><Check size={14} aria-hidden="true" /> {include}</li>
                    ))}
                  </ul>
                  <div className="vd-package__foot">
                    <VedaBtn size="sm" onClick={() => onBook()}>Reserve this package</VedaBtn>
                    <VedaBtn size="sm" variant="quiet" onClick={() => navigate('booking')}>Ask about this plan</VedaBtn>
                  </div>
                </div>
              </VedaRevealItem>
            ))}
          </VedaRevealGroup>
          <VedaGlassCard className="vd-form" delay={0.05}>
            <p className="vd-eyebrow">How packages work</p>
            <p className="vd-lead">
              Every package is a plan, not a coupon. Your therapist confirms what suits you at the first sitting, and unused
              sessions stay valid for 90 days. Advance payment holds the slot for the retreat day and couple suite.
            </p>
            <p className="vd-disclaimer">{VEDA_DISCLAIMER}</p>
          </VedaGlassCard>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Offers page
 * ------------------------------------------------------------------ */

export function VedaOffersPage(props: VedaSectionProps) {
  const { config, navigate } = props;
  return (
    <>
      <VedaPageHead
        crumb="Offers"
        head={
          <VedaSectionHead eyebrow={config.offers.eyebrow} title={config.offers.title} body={config.offers.body} />
        }
      >
        <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
      </VedaPageHead>
      <VedaOffers {...props} />
      <section className="vd-section vd-section--tight">
        <div className="vd-container">
          <p className="vd-disclaimer" style={{ maxWidth: 760 }}>
            Offers cannot be combined, are subject to therapist availability, and may be withdrawn at any time. Gift vouchers
            are valid until the printed expiry date and are not refundable in cash.
          </p>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Contact page
 * ------------------------------------------------------------------ */

export function VedaContactPage(props: VedaSectionProps) {
  const { navigate } = props;
  return (
    <>
      <VedaPageHead
        crumb="Contact"
        eyebrow="Visit us"
        title="Civil Lines, Kota."
        body="Walk in for a consultation, or message before you come so the right therapist is free."
      >
        <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
      </VedaPageHead>
      <VedaContact {...props} />
      <VedaFaq {...props} />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Footer
 * ------------------------------------------------------------------ */

export function VedaFooter({
  config,
  profile,
  navigate,
  telHref,
  whatsappHref,
}: Pick<VedaSectionProps, 'config' | 'profile' | 'navigate' | 'telHref' | 'whatsappHref'>) {
  const instagram = profile.instagramHandle ? `https://instagram.com/${String(profile.instagramHandle).replace(/^@/, '')}` : '';
  const facebook = (profile as any).facebookPage || '';
  const youtube = (profile as any).youtubeChannel || '';
  return (
    <footer className="vd-footer">
      <div className="vd-container">
        <div className="vd-footer__grid">
          <div className="vd-footer__brand">
            <h3>{profile.businessName || 'Veda Sanjeevani'}</h3>
            <p>
              Ayurvedic wellness rituals in {profile.city || 'Kota'} — warm oils, unhurried hands and rooms that stay quiet.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.84rem' }}>
              <a href={telHref} className="vd-textlink" style={{ color: 'inherit', borderColor: 'color-mix(in srgb, currentColor 40%, transparent)' }}>
                <Phone size={14} aria-hidden="true" /> {profile.phone || '+91 98290 44117'}
              </a>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="vd-textlink" style={{ color: 'inherit', borderColor: 'color-mix(in srgb, currentColor 40%, transparent)' }}>
                <MessageCircle size={14} aria-hidden="true" /> WhatsApp
              </a>
            </div>
            <div className="vd-socials">
              {instagram ? <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={17} aria-hidden="true" /></a> : null}
              {facebook ? <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={17} aria-hidden="true" /></a> : null}
              {youtube ? <a href={youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube size={17} aria-hidden="true" /></a> : null}
            </div>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              {(['therapies', 'packages', 'experts', 'gallery', 'about'] as VedaPage[]).map((page) => (
                <li key={page}>
                  <button type="button" onClick={() => navigate(page)}>{page.charAt(0).toUpperCase() + page.slice(1)}</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Visit</h3>
            <ul>
              <li><button type="button" onClick={() => navigate('contact')}>Contact & map</button></li>
              <li><button type="button" onClick={() => navigate('booking')}>Book a ritual</button></li>
              <li><button type="button" onClick={() => navigate('offers')}>Offers & vouchers</button></li>
              <li><a href={`mailto:${profile.email || 'care@vedasanjeevani.in'}`}>Email us</a></li>
            </ul>
          </div>
          <div>
            <h3>Open hours</h3>
            <ul>
              {config.contact.hours.slice(0, 4).map((row) => (
                <li key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.84rem' }}>
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="vd-footer__bottom">
          <span>© {new Date().getFullYear()} {profile.businessName || 'Veda Sanjeevani'} · {profile.city || 'Kota, Rajasthan'}</span>
          <div className="vd-footer__policy">
            <button type="button" onClick={() => navigate('home')}>Privacy</button>
            <button type="button" onClick={() => navigate('home')}>Terms</button>
            <button type="button" onClick={() => navigate('contact')}>Cancellations</button>
          </div>
        </div>
        <p className="vd-small" style={{ marginTop: 14, maxWidth: 900, color: 'color-mix(in srgb, var(--vd-ivory) 55%, var(--vd-sage))' }}>
          {config.contact.disclaimer || VEDA_DISCLAIMER}
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ *
 * Announcement bar
 * ------------------------------------------------------------------ */

export function VedaAnnouncement({ config, navigate }: Pick<VedaSectionProps, 'config' | 'navigate'>) {
  if (!config.announcement.enabled) return null;
  return (
    <div className="vd-announce">
      <div className="vd-announce__inner">
        <Sparkles size={13} aria-hidden="true" />
        <span>{config.announcement.text}</span>
        <a href="#booking" onClick={(event) => { event.preventDefault(); navigate('booking'); }}>{config.announcement.linkLabel}</a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Mobile action bar
 * ------------------------------------------------------------------ */

export function VedaMobileBar({ navigate, whatsappHref, config }: Pick<VedaSectionProps, 'navigate' | 'whatsappHref' | 'config'>) {
  return (
    <div className="vd-mobile-bar">
      <VedaBtn onClick={() => navigate('booking')}><CalendarHeart size={16} aria-hidden="true" /> {config.hero.primaryCta}</VedaBtn>
      <VedaBtn variant="ghost" href={whatsappHref} target="_blank"><MessageCircle size={16} aria-hidden="true" /> WhatsApp</VedaBtn>
    </div>
  );
}

/** Floating WhatsApp bubble (desktop + mobile). */
export function VedaWhatsappFab({ whatsappHref }: { whatsappHref: string }) {
  return (
    <a className="vd-float-wa" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Book on WhatsApp">
      <MessageCircle size={22} aria-hidden="true" />
    </a>
  );
}

export { Leaf };
