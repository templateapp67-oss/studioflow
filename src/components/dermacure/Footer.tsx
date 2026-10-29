import { clinicPublicEmail,clinicPhone } from "../../lib/dermacureContent";
import { useDermacure } from "./context";
import { socialUrl } from "../../lib/websiteContent";

export function Footer() {
  const { profile, nav, visible, policies, services, address, scrollTo } =
    useDermacure();
  const publicEmail=clinicPublicEmail(profile.clinicPublicEmail);
  const phone=clinicPhone(profile.phone);
  return (
    <>
      <footer className="dc-footer">
        <div className="dc-container">
          <div className="dc-footer-grid">
            <div>
              <a
                href="#home"
                className="dc-footer-logo"
                onClick={(event) => {
                  event.preventDefault();
                  scrollTo("home");
                }}
              >
                ✳ &nbsp;{profile.businessName}
              </a>
              <p>Expert care for healthy skin.</p>
            </div>
            <div>
              <h3>Explore</h3>
              {nav.map(([label, id]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollTo(id);
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
            {visible.services && services.length > 0 && (
              <div>
                <h3>Treatments</h3>
                {services.slice(0, 4).map((service) => (
                  <a
                    key={service.id}
                    href="#directory"
                    onClick={(event) => {
                      event.preventDefault();
                      scrollTo("directory");
                    }}
                  >
                    {service.name}
                  </a>
                ))}
              </div>
            )}
            <div>
              <h3>Contact</h3>
              {visible.location && address && <p>{address}</p>}
              {visible.location && profile.workingHoursMonFri && (
                <p>Mon–Fri: {profile.workingHoursMonFri}</p>
              )}
              {visible.location && profile.workingHoursSat && (
                <p>Saturday: {profile.workingHoursSat}</p>
              )}
              {visible.location && profile.workingHoursSun && (
                <p>Sunday: {profile.workingHoursSun}</p>
              )}
              {phone && (
                <a href={`tel:${phone}`}>
                  {profile.phone}
                </a>
              )}
              {publicEmail && (
                <a href={`mailto:${publicEmail}`}>{publicEmail}</a>
              )}
              {socialUrl(profile.instagramHandle, "instagram") && (
                <a
                  href={socialUrl(profile.instagramHandle, "instagram")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram ↗
                </a>
              )}
              {socialUrl(profile.facebookPage, "facebook") && (
                <a
                  href={socialUrl(profile.facebookPage, "facebook")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook ↗
                </a>
              )}
            </div>
          </div>
          {visible.policies &&
            policies &&
            Object.values(policies).some(
              (v) => typeof v === "string" && v.trim(),
            ) && <a href="#salon-policies">Clinic Policies</a>}
          {visible.policies && (
            <div className="dc-legal-notices">
              {(["privacy", "terms"] as const).map(
                (key) =>
                  profile.clinicLegal?.[key]?.trim() && (
                    <details key={key} id={`dc-${key}`}>
                      <summary>
                        {key === "privacy"
                          ? "Privacy Policy"
                          : "Terms & Conditions"}
                      </summary>
                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {profile.clinicLegal[key]}
                      </p>
                    </details>
                  ),
              )}
            </div>
          )}
          <div className="dc-footer-bottom">
            <span>
              © {new Date().getFullYear()} {profile.businessName}. All rights
              reserved.
            </span>
            <a
              href="#home"
              onClick={(event) => {
                event.preventDefault();
                scrollTo("home");
              }}
            >
              Back to Top ↑
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
