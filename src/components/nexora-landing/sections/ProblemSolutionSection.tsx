import { Check, Minus } from 'lucide-react';
import { SectionHeading } from '../ui';
import { useLandingModel } from '../LandingContentProvider';

export function ProblemSolutionSection() {
  const { copy, beforePoints, withPoints } = useLandingModel();

  return (
    <section className="sl-section" aria-labelledby="sl-problem-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="BEFORE AND AFTER"
          id="sl-problem-title"
          title={copy.problemTitle}
          description={copy.problemDescription}
        />

        <div className="sl-compare">
          <article className="sl-compare__col sl-compare__col--before">
            <h3 className="sl-compare__title">
              <span className="sl-compare__badge sl-compare__badge--muted">Before Nexora</span>
            </h3>
            <ul>
              {beforePoints.map((point) => (
                <li key={point.id}>
                  <span className="sl-compare__marker sl-compare__marker--muted" aria-hidden="true">
                    <Minus size={14} strokeWidth={2.5} />
                  </span>
                  <div>
                    <b>{point.title}</b>
                    <p>{point.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="sl-compare__col sl-compare__col--after">
            <h3 className="sl-compare__title">
              <span className="sl-compare__badge">With Nexora SalonOS</span>
            </h3>
            <ul>
              {withPoints.map((point) => (
                <li key={point.id}>
                  <span className="sl-compare__marker" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <div>
                    <b>{point.title}</b>
                    <p>{point.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
