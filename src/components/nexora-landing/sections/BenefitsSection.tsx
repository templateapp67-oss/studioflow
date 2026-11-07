import { LandingIcon } from '../icons';
import { SectionHeading } from '../ui';
import { useLandingModel } from '../LandingContentProvider';

export function BenefitsSection({ id = 'benefits' }: { id?: string }) {
  const { copy, benefits } = useLandingModel();

  return (
    <section className="sl-section" id={id} aria-labelledby="sl-benefits-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="BUSINESS BENEFITS"
          id="sl-benefits-title"
          title={copy.benefitsTitle}
          description="What changes on the day-to-day floor when the salon runs on one connected workspace."
        />
        <div className="sl-benefit-grid">
          {benefits.map((benefit) => (
            <article className="sl-benefit-card" key={benefit.id}>
              <span className="sl-benefit-card__icon">
                <LandingIcon name={benefit.icon} size={20} />
              </span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
