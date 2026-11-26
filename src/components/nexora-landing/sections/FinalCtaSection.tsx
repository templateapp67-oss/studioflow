import { ArrowRight, MessageCircle } from 'lucide-react';
import { Eyebrow } from '../ui';
import { useDemoDialog } from '../../nexora-pricing/DemoProvider';
import { useLandingModel } from '../LandingContentProvider';

export function FinalCtaSection({
  id = 'get-started',
  primaryLabel,
  demoLabel = 'Talk to Our Team',
}: {
  id?: string;
  primaryLabel?: string;
  demoLabel?: string;
}) {
  const { openDemo } = useDemoDialog();
  const { copy, cta, disclosures } = useLandingModel();
  return (
    <section className="sl-section sl-final" id={id} aria-labelledby="sl-final-title">
      <div className="sl-container">
        <div className="sl-final__panel">
          <Eyebrow tone="dark">YOUR NEXT STEP</Eyebrow>
          <h2 id="sl-final-title">{copy.finalTitle}</h2>
          <p>{copy.finalDescription}</p>
          <div className="sl-final__actions">
            <a className="sl-btn sl-btn--accent" href={cta.signup}>
              {primaryLabel ?? 'Get Started With Nexora SalonOS'} <ArrowRight size={16} aria-hidden="true" />
            </a>
            <button type="button" className="sl-btn sl-btn--on-dark" onClick={() => openDemo()}>
              {demoLabel} <MessageCircle size={16} aria-hidden="true" />
            </button>
          </div>
          <p className="sl-final__note">
            Annual plans are GST-inclusive. Monthly billing, subscription checkout and add-on rates are confirmed
            directly with Nexora before you purchase.
          </p>
          <ul className="sl-final__disclosures">
            {disclosures.map((disclosure) => (
              <li key={disclosure}>{disclosure}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
