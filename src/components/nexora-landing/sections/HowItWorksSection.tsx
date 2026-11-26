import { ArrowRight } from 'lucide-react';
import { LandingIcon } from '../icons';
import { SectionHeading } from '../ui';
import { useLandingModel } from '../LandingContentProvider';

export function HowItWorksSection({ id = 'how-it-works' }: { id?: string }) {
  const { copy, howItWorks, cta } = useLandingModel();

  return (
    <section className="sl-section" id={id} aria-labelledby="sl-how-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="HOW IT WORKS"
          id="sl-how-title"
          title={copy.howTitle}
          description={copy.howDescription}
        />

        <ol className="sl-steps">
          {howItWorks.map((step, index) => (
            <li className="sl-step" key={step.id}>
              <span className="sl-step__number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="sl-step__icon">
                <LandingIcon name={step.icon} size={21} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="sl-steps__cta">
          <a className="sl-btn sl-btn--accent" href={cta.signup}>
            Start With Nexora <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
