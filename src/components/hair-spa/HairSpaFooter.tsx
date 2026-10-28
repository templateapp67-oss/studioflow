import { useHairSpa } from "./context";
import { ArrowUpRight, Leaf } from "lucide-react";

export function HairSpaFooter() {
  const model = useHairSpa();
  return (
    <>
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
              <strong>Kesh Prakriti</strong>
              <small>HAIR SPA · SCALP SANCTUARY</small>
            </span>
          </a>
          <p>
            Thoughtful hair and scalp care, inspired by nature and centred
            around you.
          </p>
          <div className="kp-footer-links">
            <span>EXPLORE</span>
            {model.navLinks.slice(0, 4).map(([label, id]) => (
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
          </div>
          <div className="kp-footer-contact">
            <span>CONNECT</span>
            {model.phone && <a href={`tel:${model.phone}`}>{model.phone}</a>}
            {model.profile.email && (
              <a href={`mailto:${model.profile.email}`}>
                {model.profile.email}
              </a>
            )}
            {model.mapHref && (
              <a href={model.mapHref} target="_blank" rel="noreferrer">
                Directions <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        </div>
        <div className="kp-container kp-footer-bottom">
          <span>
            © {new Date().getFullYear()} {model.profile.businessName}. All
            rights reserved.
          </span>
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
    </>
  );
}
