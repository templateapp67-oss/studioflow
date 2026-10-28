import { useHairSpa } from "./context";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Reveal } from "./Reveal";

/**
 * Contact block built strictly from saved salon details. Missing phone,
 * WhatsApp, email, address or hours show an honest notice rather than a
 * placeholder contact.
 */
export function ContactSection() {
  const model = useHairSpa();
  if (!model.hasAnyContact && model.openingHours.length === 0) return null;
  return (
    <section
      className="kp-contact kp-section"
      id="contact"
      data-layout="location"
      aria-labelledby="kp-contact-title"
    >
      <div className="kp-container kp-contact-grid">
        <Reveal>
          <p className="kp-eyebrow">GET IN TOUCH</p>
          <h2 id="kp-contact-title">
            We&apos;d love to
            <br />
            <em>hear from you.</em>
          </h2>
          <p>
            Call or WhatsApp us with your questions, or get in touch to plan your visit.
          </p>
          <div className="kp-contact-actions">
            {model.phone && (
              <a href={`tel:${model.phone.replace(/\s/g, "")}`}>
                <Phone size={17} aria-hidden="true" /> {model.phone}
              </a>
            )}
            {model.wa && (
              <a href={model.wa} target="_blank" rel="noreferrer">
                <MessageCircle size={17} aria-hidden="true" /> WhatsApp us{" "}
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            )}
            {model.email && (
              <a href={`mailto:${model.email}`}>
                <Mail size={17} aria-hidden="true" /> {model.email}
              </a>
            )}
            {model.mapHref && (
              <a href={model.mapHref} target="_blank" rel="noreferrer">
                <MapPin size={17} aria-hidden="true" /> Get directions
              </a>
            )}
            {!model.hasAnyContact && (
              <p className="kp-muted">
                Contact details have not been added yet. Ask at the salon or
                check back soon.
              </p>
            )}
          </div>
        </Reveal>
        <Reveal className="kp-contact-card">
          <span className="kp-contact-leaf">
            <Leaf size={23} aria-hidden="true" />
          </span>
          <p className="kp-eyebrow">VISIT THE SALON</p>
          <h3>{model.profile.businessName}</h3>
          {model.address && <address>{model.address}</address>}
          {model.landmark && <p className="kp-muted">Near {model.landmark}</p>}
          {!model.address && (
            <p className="kp-muted">
              The street address has not been added to this website yet.
            </p>
          )}
          {model.openingHours.length > 0 ? (
            <div className="kp-hours-list">
              <h4>Opening hours</h4>
              <dl>
                {model.openingHours.map(([day, hours]) => (
                  <div key={day}>
                    <dt>{day}</dt>
                    <dd>{hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="kp-muted">
              Opening hours are not listed yet. Please contact the salon
              before travelling.
            </p>
          )}
          <button
            type="button"
            className="kp-button"
            onClick={() => model.book(model.firstService)}
          >
            {model.services.length ? "Book an appointment" : "See our services"}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </Reveal>
      </div>
    </section>
  );
}
