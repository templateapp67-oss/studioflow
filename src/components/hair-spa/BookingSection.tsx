import { useHairSpa } from "./context";
import { ArrowRight, Clock3, Leaf } from "lucide-react";
import { Reveal } from "./Reveal";
import { KESH_PRAKRITI_IMAGES } from "../../lib/keshPrakriti";

/**
 * Closing call to action. It never claims a confirmed appointment: the booking
 * panel only shows "confirmed" after the server reserves the slot.
 */
export function BookingSection() {
  const model = useHairSpa();
  const canBook = model.services.length > 0;
  const canReserve = model.bookingAvailable;
  return (
    <section
      className="kp-booking-banner"
      id="booking"
      aria-labelledby="kp-booking-title"
      style={{ backgroundImage: `url(${KESH_PRAKRITI_IMAGES.bookingBanner})` }}
    >
      <div className="kp-container kp-booking-content">
        <Reveal>
          <p className="kp-eyebrow kp-light">A MOMENT FOR YOURSELF</p>
          <h2 id="kp-booking-title">
            Your Hair Wellness
            <br />
            <em>Journey Starts Here.</em>
          </h2>
          <p>
            {canReserve
              ? "Choose a treatment, date and time, then confirm in the booking panel. Live availability and prices come from the sanctuary's booking system."
              : canBook
                ? "Online booking opens once this website is live. Until then, contact the sanctuary to plan your visit."
                : "The treatment menu is being updated. Contact the sanctuary to ask which treatments are currently available."}
          </p>
          <button
            type="button"
            className="kp-button kp-button-ivory"
            onClick={() => model.book(model.firstService)}
          >
            {canReserve
              ? "Book Your Ritual"
              : canBook
                ? "Ask about booking"
                : "Contact the sanctuary"}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {canBook && model.firstService?.showDuration !== false && (
            <p className="kp-booking-note">
              <Clock3 size={14} aria-hidden="true" /> Times are shown in India
              Standard Time (IST).
            </p>
          )}
        </Reveal>
        <div className="kp-booking-stamp" aria-hidden="true">
          <Leaf size={27} />
          <span>
            KESH
            <br />
            PRAKRITI
          </span>
        </div>
      </div>
    </section>
  );
}
