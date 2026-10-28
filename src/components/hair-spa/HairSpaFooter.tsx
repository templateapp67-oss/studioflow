import { useHairSpa } from "./context";
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Leaf,
  Music2,
  Youtube,
} from "lucide-react";
import { keshSocialLinks } from "../../lib/keshPrakriti";
import { websiteSections } from "../../lib/websiteContent";

const SOCIAL_ICONS = {
  Instagram,
  Facebook,
  YouTube: Youtube,
  TikTok: Music2,
} as const;

/**
 * Closing summary: brand, navigation, verified contact details, verified social
 * profiles and the legal/account links. No hero copy, service catalogue or
 * promotional blocks are repeated here.
 */
export function HairSpaFooter() {
  const model = useHairSpa();
  // The footer is the only place social profiles appear on this page, so it
  // follows the owner's saved social toggle and heading.
  const socials =
    websiteSections(model.profile).social === false
      ? []
      : keshSocialLinks(model.profile);
  const socialTitle =
    String(model.profile.sectionHeadings?.socialTitle || "").trim() || "FOLLOW";
  return (
    <footer className="kp-footer" data-layout="footer">
      <div className="kp-container kp-footer-main">
        <a
          className="kp-wordmark kp-footer-mark"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            model.scrollTo("home");
          }}
        >
          <span className="kp-mark">
            <Leaf size={19} />
          </span>
          <span>
            <strong>{model.profile.businessName}</strong>
            <small>SALON · HAIR SPA</small>
          </span>
        </a>
        <p>Hair, skin and grooming care in a quiet corner of the city.</p>
        <div className="kp-footer-links">
          <span>EXPLORE</span>
          {model.pageLinks.map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo(id);
              }}
            >
              {label}
            </a>
          ))}
          <a
            href="#faq"
            onClick={(event) => {
              event.preventDefault();
              model.scrollTo("faq");
            }}
          >
            FAQs
          </a>
        </div>
        <div className="kp-footer-contact">
          <span>VISIT &amp; CONTACT</span>
          {model.address && (
            <address className="kp-footer-address">{model.address}</address>
          )}
          {model.phone && (
            <a href={`tel:${model.phone.replace(/\s/g, "")}`}>{model.phone}</a>
          )}
          {model.email && <a href={`mailto:${model.email}`}>{model.email}</a>}
          {model.wa && (
            <a href={model.wa} target="_blank" rel="noreferrer">
              WhatsApp <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          )}
          {model.mapHref && (
            <a href={model.mapHref} target="_blank" rel="noreferrer">
              Directions <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          )}
          {!model.hasAnyContact && (
            <p className="kp-muted">Contact details haven&apos;t been added yet.</p>
          )}
          {socials.length > 0 && (
            <>
              <span className="kp-footer-social-title">{socialTitle}</span>
              <ul className="kp-footer-social">
                {socials.map(([label, url]) => {
                  const Icon =
                    SOCIAL_ICONS[label as keyof typeof SOCIAL_ICONS];
                  return (
                    <li key={label}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${model.profile.businessName} on ${label}`}
                      >
                        <Icon size={14} aria-hidden="true" />
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="kp-container kp-footer-bottom">
        <span>
          © {new Date().getFullYear()} {model.profile.businessName}. All rights
          reserved.
        </span>
        <nav className="kp-footer-legal" aria-label="Legal and account links">
          {model.hasPoliciesSection && (
            <a href="#salon-policies">Salon policies</a>
          )}
          <a href="#faq">FAQs</a>
          <button type="button" onClick={() => model.onMyBookings()}>
            My bookings
          </button>
        </nav>
        <a
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            model.scrollTo("home");
          }}
        >
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
