import type { CSSProperties } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { NEXORA_ECOSYSTEM_SEO, type NexoraEcosystemPath } from '../../../lib/nexoraEcosystemSeo';
import { NEXORA_TITLE_MOTION, useNexoraTitleDemote } from './useNexoraTitleDemote';
import './nexoraEcosystemHero.css';

/**
 * Dark, minimal hero shared by the NEXORA marketing routes.
 *
 * Layout: a slim navigation bar (wordmark left, route links right) sitting on
 * the same deep purple-to-charcoal gradient as the rest of the hero, a
 * left-hand editorial column (lead, two buttons) and a floating frosted phone
 * that renders the Ziya Women's Hair Studio template as a live preview.
 *
 * The `<h1>` opens centred and large, holds, then demotes into the section tag
 * the layout reserves for it in the top-left corner while the rest of the hero
 * grows in beneath the flight (`title-demote-to-label`, variant A). See
 * `useNexoraTitleDemote` for the timeline; the stylesheet reads the same frame
 * values from custom properties so the two cannot drift.
 */

const NAV_LINKS = [
  { label: 'Salon Onboarding', href: '/salon-onboarding' },
  { label: 'Salon Growth', href: '/salon-growth' },
  { label: 'Growth Partner Rewards', href: '/growth-partner-rewards' },
  { label: 'Pricing', href: '/pricing' },
];

/** Sample services shown inside the phone preview (taken from template 01). */
const PREVIEW_SERVICES = ['Layer haircut', 'Curtain bangs', 'Step cut'];

/** The title is the only part of the hero that moves before the demotion. */
function splitTitle(heading: string) {
  const trailing = /[.!?]$/.test(heading) ? heading.slice(-1) : '';
  const body = trailing ? heading.slice(0, -1) : heading;
  const words = body.split(/\s+/).filter(Boolean);
  return { words, trailing };
}

export function NexoraEcosystemHeader() {
  return (
    <header className="nxh-nav">
      <div className="nxh-nav__inner">
        <a className="nxh-nav__brand" href="/" aria-label="NEXORA SALON OS home">
          <span className="nxh-nav__mark" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 32 32" focusable="false">
              <path
                d="M9.5 23.5v-15l13 15v-15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="nxh-nav__wordmark">
            NEXORA<span className="nxh-nav__wordmark-suffix">SALON OS</span>
          </span>
        </a>
        <nav className="nxh-nav__links" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a key={link.href} className="nxh-nav__link" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <a className="nxh-nav__cta" href="/login">
          Owner Workspace <ArrowUpRight size={14} strokeWidth={2.2} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}

export function NexoraEcosystemHero({
  path,
  heading,
  intro,
  primaryLabel,
  primaryHref,
  tagNumber = '01',
}: {
  path: NexoraEcosystemPath;
  heading: string;
  intro: string;
  primaryLabel: string;
  primaryHref: string;
  /** Section number that takes over the tag as the title lands. */
  tagNumber?: string;
}) {
  const { label } = NEXORA_ECOSYSTEM_SEO[path];
  const { words, trailing } = splitTitle(heading);
  const { heroRef, copyRef, titleRef, stage } = useNexoraTitleDemote(words.length);

  return (
    <section
      ref={heroRef}
      className={`nxh-hero nxh-hero--${stage}`}
      aria-labelledby="nxe-hero-title"
      /* One source for the timeline: CSS reads these, the hook schedules the
         stage changes from the same numbers. */
      style={
        {
          '--nxh-rise': NEXORA_TITLE_MOTION.rise,
          '--nxh-demote': NEXORA_TITLE_MOTION.demote,
          '--nxh-eyebrow': NEXORA_TITLE_MOTION.eyebrowOut,
          '--nxh-content-start': NEXORA_TITLE_MOTION.contentStart,
          '--nxh-prefix-delay': NEXORA_TITLE_MOTION.prefixDelay,
          '--nxh-prefix-in': `${NEXORA_TITLE_MOTION.prefixIn}ms`,
        } as CSSProperties
      }
    >
      <NexoraEcosystemHeader />
      <div className="nxh-hero__glow nxh-hero__glow--violet" aria-hidden="true" />
      <div className="nxh-hero__glow nxh-hero__glow--ember" aria-hidden="true" />
      <div className="nxh-hero__glow nxh-hero__glow--halo" aria-hidden="true" />
      <div className="nxh-hero__grid" aria-hidden="true" />

      <div className="nxh-hero__inner">
        <div className="nxh-hero__stage">
          <p className="nxh-hero__eyebrow">
            <span className="nxh-hero__eyebrow-dot" aria-hidden="true" />
            Nexora SalonOS
            <span className="nxh-hero__eyebrow-sep" aria-hidden="true">
              /
            </span>
            {label}
          </p>

          <h1 className="nxh-hero__title" id="nxe-hero-title" ref={titleRef}>
            <span className="nxh-hero__prefix" aria-hidden="true">
              {tagNumber} /
            </span>
            {words.map((word, index) => (
              <span className="nxh-hero__word-mask" key={`${word}-${index}`}>
                <span
                  className="nxh-hero__word"
                  style={{ '--nxh-word-delay': Math.round(index * NEXORA_TITLE_MOTION.wordStagger) } as CSSProperties}
                >
                  {word}
                </span>
              </span>
            ))}
            {trailing ? <span className="nxh-hero__period">{trailing}</span> : null}
          </h1>
        </div>

        <div className="nxh-hero__copy" ref={copyRef}>
          <p className="nxh-hero__lead">{intro}</p>

          <div className="nxh-hero__actions nxh-reveal" style={{ '--nxh-reveal-delay': 90 } as CSSProperties}>
            <a className="nxh-btn nxh-btn--primary" href={primaryHref}>
              {primaryLabel}
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </a>
            <a className="nxh-btn nxh-btn--ghost" href="/">
              Back to Nexora
            </a>
          </div>

          <p
            className="nxh-hero__footnote nxh-reveal"
            style={{ '--nxh-reveal-delay': 180 } as CSSProperties}
          >
            16 ready-made salon templates
            <span className="nxh-hero__footnote-dot" aria-hidden="true" />
            Edit, preview and publish
          </p>
        </div>

        <div className="nxh-hero__visual nxh-reveal" style={{ '--nxh-reveal-delay': 270 } as CSSProperties}>
          <div className="nxh-phone">
            <div className="nxh-phone__glare" aria-hidden="true" />
            <div className="nxh-phone__frame">
              <div className="nxh-phone__notch" aria-hidden="true" />
              <div className="nxh-phone__screen">
                <div className="nxh-phone__status" aria-hidden="true">
                  <span className="nxh-phone__time">9:41</span>
                  <span className="nxh-phone__status-icons">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>

                <div className="nxh-phone__bar">
                  <span className="nxh-phone__logo">ZIYA</span>
                  <span className="nxh-phone__menu" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                </div>

                <div className="nxh-phone__shot">
                  <img
                    src="/templates/luxury-editorial/hero-680.webp"
                    srcSet="/templates/luxury-editorial/hero-480.webp 480w, /templates/luxury-editorial/hero-680.webp 680w"
                    sizes="300px"
                    width={680}
                    height={850}
                    alt="Ziya Women's Hair Studio template hero: a stylist finishing a layered haircut in a rose-ivory studio"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="nxh-phone__shot-copy">
                    <p className="nxh-phone__shot-kicker">Women&apos;s hair studio</p>
                    <p className="nxh-phone__shot-title">Precision cuts, softly done</p>
                  </div>
                </div>

                <div className="nxh-phone__body">
                  <div className="nxh-phone__cta">Book an appointment</div>
                  <ul className="nxh-phone__services">
                    {PREVIEW_SERVICES.map((service) => (
                      <li key={service}>
                        <span className="nxh-phone__service-name">{service}</span>
                        <span className="nxh-phone__service-plus" aria-hidden="true">
                          +
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="nxh-phone__tabs" aria-hidden="true">
                    <i className="is-active" />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="nxh-glass-card nxh-reveal" style={{ '--nxh-reveal-delay': 360 } as CSSProperties}>
            <span className="nxh-glass-card__badge">Template 01</span>
            <p className="nxh-glass-card__name">Luxury Editorial</p>
            <p className="nxh-glass-card__meta">Ziya Women&apos;s Hair Studio</p>
          </div>

          <div className="nxh-glass-pill" aria-hidden="true">
            <span className="nxh-glass-pill__dot" />
            Live template preview
          </div>
        </div>
      </div>
    </section>
  );
}
