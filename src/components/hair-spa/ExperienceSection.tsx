import { useHairSpa } from "./context";
import { Reveal } from "./Reveal";

export function ExperienceSection() {
  const model = useHairSpa();
  return (
    <>
      <section
        className="kp-experience kp-section"
        id="experiences"
        data-layout="experiences"
      >
        <div className="kp-container">
          <div className="kp-section-heading">
            <Reveal>
              <p className="kp-eyebrow">A CONSIDERED EXPERIENCE</p>
              <h2>
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
            <div className="kp-review-grid">
              {model.realReviews.map((review, index) => (
                <article className="kp-review-card" key={review.id || index}>
                  <p>“{review.comment}”</p>
                  <div>
                    <strong>{review.name}</strong>
                    {review.serviceName && <small>{review.serviceName}</small>}
                    {review.verified && <span>Verified review</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="kp-experience-points">
              <article>
                <span>01</span>
                <h3>Listen first</h3>
                <p>Your concerns and preferences shape the conversation.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Choose together</h3>
                <p>Explore the service menu and ask the team for guidance.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Make space</h3>
                <p>Enjoy a calm moment devoted to your own wellbeing.</p>
              </article>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
