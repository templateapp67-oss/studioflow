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
            <p className="kp-eyebrow">YOUR EXPERIENCE</p>
            <h2 id="kp-experience-title">
              Every visit starts
              <br />
              <em>with a conversation.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              Tell us what you need and ask any questions. We are here to help you feel comfortable.
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
                <p>Tell us what you need and what you prefer.</p>
              </article>
              <article>
                <span aria-hidden="true">02</span>
                <h3>Choose together</h3>
                <p>See the service menu and ask our team for help.</p>
              </article>
              <article>
                <span aria-hidden="true">03</span>
                <h3>Make space</h3>
                <p>Enjoy a little time for yourself.</p>
              </article>
            </div>
            <p className="kp-empty-services">
              No client reviews have been published for this salon yet.
              Reviews appear here after customers share their experience.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
