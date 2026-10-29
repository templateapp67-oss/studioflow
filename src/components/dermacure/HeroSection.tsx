import { isBundledClinicPhoto } from "../../lib/dermacureSite";
import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { fade, stagger } from "./animation";

export function HeroSection() {
  const {
    hero,
    hasTeam,
    reduced,
    booking,
    bookingAvailable,
    visible,
    services,
    y,
    profile,
  } = useDermacure();
  if (!visible.hero) return <section id="home" ref={hero} aria-label="Home" />;
  return (
    <>
      <section className="dc-hero" id="home" ref={hero}>
        <div className="dc-hero-copy">
          <motion.div
            initial={reduced ? false : "hidden"}
            animate="show"
            variants={stagger}
          >
            <motion.p variants={fade} className="dc-eyebrow">
              <span /> {profile.businessName}
            </motion.p>
            <motion.p variants={fade} className="dc-hero-topline">SKIN &nbsp; / &nbsp; HAIR &nbsp; / &nbsp; COSMETOLOGY</motion.p>
            <motion.h1 variants={fade}>
              {profile.sectionHeadings?.heroTitle || (
                <>
                  Skin, Hair &amp; <br /><em>Beauty Needs.</em>
                </>
              )}
            </motion.h1>
            <motion.p variants={fade} className="dc-intro">
              {profile.sectionHeadings?.heroDescription ||
                "Explore our treatment menu and discuss your skin needs with our team."}
            </motion.p>
            <motion.div variants={fade} className="dc-actions">
              <button className="dc-btn" onClick={booking}>
                {bookingAvailable
                  ? "Book a Consultation"
                  : "Contact the Clinic"}{" "}
                <ArrowUpRight size={16} />
              </button>
              {visible.services && services.length > 0 && (
                <a className="dc-text-link" href="#treatments">
                  Explore Treatments <ArrowRight size={16} />
                </a>
              )}
              {visible.stylists && hasTeam && (
                <a className="dc-text-link" href="#salon-team">
                  Meet the care team <ArrowRight size={16} />
                </a>
              )}
            </motion.div>
          </motion.div>

          <div className="dc-hero-bottom">
            <span>PERSONALISED CARE, BEAUTIFULLY CONSIDERED</span>
            <a
              href={visible.about ? "#about" : "#technology"}
              aria-label="Scroll to the next section"
            >
              <ArrowDown size={18} />
            </a>
          </div>
        </div>
        <div className="dc-hero-photo">
          <motion.div className="dc-hero-parallax" style={{ y }}>
            <EditorialImage
              fallback="/templates/dermacure/hero-wide.webp"
              fallbackAlt="Illustrative editorial portrait celebrating natural skin"
              src={
                profile.coverImageUrl || "/templates/dermacure/hero-wide.webp"
              }
              alt={
                profile.coverImageUrl && !isBundledClinicPhoto(profile.coverImageUrl)
                  ? `${profile.businessName} clinic`
                  : "Illustrative editorial portrait celebrating natural skin"
              }
              fetchPriority="high"
            />
          </motion.div>
          <div className="dc-hero-photo-label">
            SKIN HEALTH <span> / </span> SELF CONFIDENCE
          </div>
        </div>
        <div className="dc-hero-side">
          A LITTLE MORE LIKE YOU <span> — </span> EVERY DAY
        </div>
      </section>
    </>
  );
}
