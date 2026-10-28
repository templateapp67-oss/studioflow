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
          <p className="kp-eyebrow kp-light">READY FOR A VISIT?</p>
          <h2 id="kp-booking-title">
            Your next salon visit
            <br />
            <em>starts here.</em>
          </h2>
          <p>
            {canReserve
              ? "Choose your treatment, a time that suits you and the team member you would like. One flow, one confirmation — your appointment is reserved only after the salon accepts it."
              : canBook
                ? "Online booking opens once this website is live. Until then, contact the salon to plan your visit."
                : "The service menu is being updated. Contact the salon to ask what is available."}
          </p>
          <button
            type="button"
            className="kp-button kp-button-ivory"
            onClick={() => model.book(model.firstService)}
          >
            {canReserve
              ? "Book an Appointment"
              : canBook
                ? "Ask about booking"
                : "Contact the salon"}{" "}
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
