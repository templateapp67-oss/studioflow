import { useHairSpa } from "./context";
import { ArrowUpRight } from "lucide-react";
import { AppAnnouncementStrip } from "../CustomerAppPromotion";

export function QuickNavigation() {
  const model = useHairSpa();
  return (
    <>
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
            <ArrowUpRight size={12} />
          </a>
        ))}
      </nav>
      {!model.enabledSections.includes("promo") && (
        <section className="kp-offers-note" id="offers">
          <div className="kp-container">
            <span className="kp-eyebrow">CURRENT OFFERINGS</span>
            <p>
              Ask the sanctuary about any current offers when you plan your
              visit.
            </p>
          </div>
        </section>
      )}
      <AppAnnouncementStrip />
    </>
  );
}
