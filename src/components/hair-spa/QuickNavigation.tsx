import { useHairSpa } from "./context";
import { ArrowUpRight } from "lucide-react";
import { AppAnnouncementStrip } from "../CustomerAppPromotion";

/**
 * Quick section navigation. Only sections that actually rendered get a link;
 * when the salon has no active promotion the strip explains that instead of
 * linking to an empty `#offers` target.
 */
export function QuickNavigation() {
  const model = useHairSpa();
  const hasPromo = model.enabledSections.includes("promo");
  return (
    <>
      {model.dockLinks.length > 1 && (
        <nav
          data-layout="dock"
          className="kp-quick-nav"
          aria-label="Quick section navigation"
        >
          {model.dockLinks.map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo(id);
              }}
            >
              {label}
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          ))}
        </nav>
      )}
      {!hasPromo && Boolean(model.profile.subdomain) && (
        <section className="kp-offers-note" id="offers" aria-label="Current offers">
          <div className="kp-container">
            <span className="kp-eyebrow">CURRENT OFFERINGS</span>
            <p>
              No offers are listed right now. Please ask the salon about current offers.
            </p>
          </div>
        </section>
      )}
      <AppAnnouncementStrip />
    </>
  );
}
