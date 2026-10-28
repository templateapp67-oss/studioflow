import { useHairSpa } from "./context";
import { Reveal } from "./Reveal";

/**
 * Client experiences are rendered only from reviews saved against the salon
 * (customer submissions or owner-entered stories). The bundled demo template
 * never presents sample stories as real testimonials, so an empty state is
 * shown instead.
 */
export function ExperienceSection() {
  const model = useHairSpa();
  return (
    <section
      className="kp-experience kp-section"
      id="experiences"
      data-layout="experiences"
      aria-labelledby="kp-experience-title"
    >
      <div className="kp-container">
        <div className="kp-section-heading">
          <Reveal>
            <p className="kp-eyebrow">A CONSIDERED EXPERIENCE</p>
            <h2 id="kp-experience-title">
              Every visit begins
              <br />
              <em>with listening.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              Care is personal. Make time to share what matters to you, ask
              questions and choose a ritual that feels comfortable.
            </p>
          </Reveal>
        </div>
        {model.realReviews.length > 0 ? (
          <ul className="kp-review-grid">
            {model.realReviews.map((review) => (
              <li className="kp-review-card" key={review.id || review.name}>
                <p>“{review.comment}”</p>
                <div>
                  <strong>{review.name}</strong>
                  {review.serviceName && <small>{review.serviceName}</small>}
                  {/* A "verified" badge is only ever driven by saved review data. */}
                  {review.verified && <span>Verified visit</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="kp-experience-points">
              <article>
                <span aria-hidden="true">01</span>
                <h3>Listen first</h3>
                <p>Your concerns and preferences shape the conversation.</p>
              </article>
              <article>
                <span aria-hidden="true">02</span>
                <h3>Choose together</h3>
                <p>Explore the service menu and ask the team for guidance.</p>
              </article>
              <article>
                <span aria-hidden="true">03</span>
                <h3>Make space</h3>
                <p>Enjoy a calm moment devoted to your own wellbeing.</p>
              </article>
            </div>
            <p className="kp-empty-services">
              No client reviews have been published for this sanctuary yet.
              Reviews appear here after customers share their experience.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
