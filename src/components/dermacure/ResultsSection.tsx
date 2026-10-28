import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from "./EditorialImage";
import { useDermacure } from "./context";
import { ArrowUpRight } from "lucide-react";
import { ResultsCarousel } from "./ResultsCarousel";

export function ResultsSection() {
  const { visible, booking, bookingLabel, comparisons } = useDermacure();
  return (
    <>
      {visible.gallery && (
        <section className="dc-results dc-section" id="results">
          <div className="dc-container dc-results-grid">
            <div>
              <p className="dc-eyebrow">
                <span />{" "}
                {comparisons.length
                  ? "BEFORE & AFTER"
                  : "YOUR SKIN, YOUR STORY"}
              </p>
              <h2>
                {comparisons.length ? (
                  <>
                    Real People.
                    <br />
                    <em>Real Transformations.</em>
                  </>
                ) : (
                  <>
                    Your Skin.
                    <br />
                    <em>Your Story.</em>
                  </>
                )}
              </h2>
              <p>
                Every skin journey is different. Start a conversation about your
                concerns and the care that may be right for you.
              </p>
              <button className="dc-btn" onClick={booking}>
                {bookingLabel} <ArrowUpRight size={16} />
              </button>
              <small>Individual experiences and results vary.</small>
            </div>
            <div className="dc-results-image">
              {comparisons.length ? (
                <ResultsCarousel />
              ) : (
                <>
                  <EditorialImage
                    fallback={NEUTRAL_CLINIC_IMAGE}
                    src="/templates/dermacure/hero.webp"
                    alt="Illustrative skin portrait — not a patient result"
                    loading="lazy"
                  />
                  <span>YOUR SKIN, YOUR STORY.</span>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
