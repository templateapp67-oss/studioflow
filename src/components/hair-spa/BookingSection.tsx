import { useHairSpa } from "./context";
import { ArrowRight, Leaf } from "lucide-react";
import { Reveal } from "./Reveal";

export function BookingSection() {
  const model = useHairSpa();
  return (
    <>
      <section className="kp-booking-banner">
        <div className="kp-container kp-booking-content">
          <Reveal>
            <p className="kp-eyebrow kp-light">A MOMENT FOR YOURSELF</p>
            <h2>
              Your Hair Wellness
              <br />
              <em>Journey Starts Here.</em>
            </h2>
            <p>
              Find the treatment that suits your needs and connect with our team
              to plan your visit.
            </p>
            <button
              className="kp-button kp-button-ivory"
              onClick={() => model.onBook(model.firstService)}
            >
              Book Your Ritual <ArrowRight size={16} />
            </button>
          </Reveal>
          <div className="kp-booking-stamp">
            <Leaf size={27} />
            <span>
              KESH
              <br />
              PRAKRITI
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
