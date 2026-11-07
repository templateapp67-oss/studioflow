import { ArrowRight, Check, Info } from 'lucide-react';
import { Eyebrow } from '../ui';
import { useLandingModel } from '../LandingContentProvider';
import { WorkspaceIllustration } from './WorkspaceIllustration';
import { useDemoDialog } from '../../nexora-pricing/DemoProvider';

const HERO_POINTS = [
  'Appointments from your own salon website',
  'POS billing, invoices and payment records',
  'Customer profiles, staff schedules and stock',
  'Appointment, revenue and inventory reporting',
];

export function HeroSection({
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  secondaryAction = 'link',
}: {
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** `demo` opens the request-a-demo dialog instead of following a link. */
  secondaryAction?: 'link' | 'demo';
}) {
  const { copy, cta } = useLandingModel();
  const { openDemo } = useDemoDialog();
  const heroPrimary = primaryLabel ?? copy.heroPrimary;
  const heroSecondary = secondaryLabel ?? copy.heroSecondary;

  return (
    <section className="sl-hero" aria-labelledby="sl-hero-title">
      <div className="sl-container sl-hero__inner">
        <div className="sl-hero__copy">
          <Eyebrow>{copy.heroEyebrow}</Eyebrow>
          <h1 id="sl-hero-title">{copy.heroTitle}</h1>
          <p className="sl-hero__lead">{copy.heroDescription}</p>
          <div className="sl-hero__actions">
            <a className="sl-btn sl-btn--primary" href={primaryHref ?? cta.signup}>
              {heroPrimary} <ArrowRight size={16} aria-hidden="true" />
            </a>
            {secondaryAction === 'demo' ? (
              <button type="button" className="sl-btn sl-btn--secondary" onClick={() => openDemo()}>
                {heroSecondary} <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <a className="sl-btn sl-btn--secondary" href={secondaryHref ?? '#features'}>
                {heroSecondary} <ArrowRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
          <ul className="sl-hero__points">
            {HERO_POINTS.map((point) => (
              <li key={point}>
                <span aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="sl-hero__visual">
          <WorkspaceIllustration />
          <p className="sl-hero__note">
            <Info size={14} aria-hidden="true" />
            {copy.heroNote}
          </p>
        </div>
      </div>
    </section>
  );
}
