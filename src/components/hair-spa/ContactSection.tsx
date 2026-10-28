import { useHairSpa } from "./context";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Reveal } from "./Reveal";

export function ContactSection() {
  const model = useHairSpa();
  const openingHours = [
    ["Mon–Fri (except Tuesday)", model.profile.workingHoursMonFri],
    ["Tuesday", model.profile.workingHoursTue],
    ["Saturday", model.profile.workingHoursSat],
    ["Sunday", model.profile.workingHoursSun],
  ].filter(([, hours]) => Boolean(hours?.trim()));

  return (
    <>
      <section
        className="kp-contact kp-section"
        id="contact"
        data-layout="location"
      >
        <div className="kp-container kp-contact-grid">
          <Reveal>
            <p className="kp-eyebrow">COME AS YOU ARE</p>
            <h2>
              We'd love to
              <br />
              <em>hear from you.</em>
            </h2>
            <p>
              Reach out to ask a question or plan your visit. Booking requests
              are enquiries; the team will confirm the details with you.
            </p>
            <div className="kp-contact-actions">
              {model.phone && (
                <a href={`tel:${model.phone}`}>
                  <Phone size={17} /> {model.phone}
                </a>
              )}
              {model.wa && (
                <a
                  href={`https://wa.me/${model.wa}?text=${encodeURIComponent(`Hello ${model.profile.businessName}, I would like to enquire about a visit.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={17} /> WhatsApp Inquiry{" "}
                  <ArrowUpRight size={15} />
                </a>
              )}
              {model.mapHref && (
                <a href={model.mapHref} target="_blank" rel="noreferrer">
                  <ArrowUpRight size={15} /> Get directions
                </a>
              )}
            </div>
          </Reveal>
          <Reveal className="kp-contact-card">
            <span className="kp-contact-leaf">
              <Leaf size={23} />
            </span>
            <p className="kp-eyebrow">VISIT THE SANCTUARY</p>
            <h3>{model.profile.businessName}</h3>
            {model.address && <address>{model.address}</address>}
            {model.profile.landmark && (
              <p className="kp-muted">Near {model.profile.landmark}</p>
            )}
            {openingHours.length > 0 && (
              <div className="kp-hours-list">
                <h4>Hours as listed</h4>
                <dl>
                  {openingHours.map(([day, hours]) => (
                    <div key={day}>
                      <dt>{day}</dt>
                      <dd>{hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {model.profile.email && (
              <a href={`mailto:${model.profile.email}`}>
                {model.profile.email}
              </a>
            )}
            <button
              className="kp-button"
              onClick={() => model.onBook(model.firstService)}
            >
              Send a booking enquiry <ArrowRight size={16} />
            </button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
