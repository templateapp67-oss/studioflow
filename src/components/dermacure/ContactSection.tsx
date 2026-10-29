import { clinicPublicEmail,clinicPhone } from "../../lib/dermacureContent";
import { socialUrl } from "../../lib/websiteContent";
import { useDermacure } from "./context";
import { ArrowUpRight, MapPin } from "lucide-react";

export function ContactSection() {
  const { address, directions, profile, visible } = useDermacure();
  if (!visible.location) return null;
  const email=clinicPublicEmail(profile.clinicPublicEmail);
  const phone=clinicPhone(profile.phone);
  const whatsapp=clinicPhone(profile.whatsapp);
  return (
    <>
      <section className="dc-contact dc-section" id="contact">
        <div className="dc-container dc-contact-grid">
          <div>
            <p className="dc-eyebrow">
              <span /> OUR LOCATION
            </p>
            <h2>
              Visit <em>Our Clinic</em>
            </h2>
          </div>
          <div>
            <h3>Visit the clinic</h3>
            {address && <p>{address}</p>}
            {directions && (
              <a
                className="dc-text-link"
                href={directions}
                target="_blank"
                rel="noreferrer"
              >
                Get directions <ArrowUpRight size={16} />
              </a>
            )}
          </div>
          <div>
            <h3>Get in touch</h3>
            {phone && (
              <p>
                <a href={`tel:${phone}`}>
                  {profile.phone}
                </a>
              </p>
            )}
            {whatsapp && (
              <p><a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp the clinic</a></p>
            )}
            {!phone && !email && !whatsapp && <p>Contact details have not been added yet.</p>}
            {email && (
              <p>
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            )}
            {socialUrl(profile.instagramHandle, "instagram") && (
              <p>
                <a
                  href={socialUrl(profile.instagramHandle, "instagram")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram ↗
                </a>
              </p>
            )}
            {socialUrl(profile.facebookPage, "facebook") && (
              <p>
                <a
                  href={socialUrl(profile.facebookPage, "facebook")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook ↗
                </a>
              </p>
            )}
            {profile.workingHoursMonFri && (
              <p>Mon–Fri: {profile.workingHoursMonFri}</p>
            )}
            {profile.workingHoursSat && (
              <p>Saturday: {profile.workingHoursSat}</p>
            )}
            {profile.workingHoursSun && (
              <p>Sunday: {profile.workingHoursSun}</p>
            )}
          </div>
          {directions && (
            <a
              className="dc-location-visual"
              href={directions}
              target="_blank"
              rel="noreferrer"
              aria-label={`Get directions to ${profile.businessName}`}
            >
              <MapPin size={40} strokeWidth={1} />
              <div>
                <strong>{profile.businessName}</strong>
                <p>{address}</p>
                <small>Open the clinic address in Google Maps</small>
              </div>
              <ArrowUpRight size={24} />
            </a>
          )}
        </div>
      </section>
    </>
  );
}
