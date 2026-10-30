import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Settings2,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { SalonProfile } from "../../types";
import {
  ironInkSocialLinks,
  type IronInkSocialPlatform,
} from "../../lib/ironInkSocial";
import { fadeUp, stagger } from "./motion";

const ICONS: Record<IronInkSocialPlatform, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

export function IronInkSocial({
  profile,
  onManage,
}: {
  profile: SalonProfile;
  /** Owner preview only: opens the existing studio settings editor. */
  onManage?: () => void;
}) {
  const reduced = useReducedMotion();
  const links = ironInkSocialLinks(profile);
  const studioName = profile.businessName || "the studio";
  const title = profile.sectionHeadings?.socialTitle?.trim() || "Follow our studio";

  return (
    <section
      className="ii-section ii-social"
      id="social"
      aria-labelledby="ii-social-title"
      data-section="social"
    >
      <div className="ii-section-head">
        <span className="ii-kicker">STAY CLOSE</span>
        <h2 id="ii-social-title">{title}</h2>
        <p>
          New work, healed pieces and the quiet studio moments in between.
          These open {studioName}&rsquo;s own profiles in a new tab.
        </p>
        {onManage && links.length > 0 && (
          <button type="button" className="ii-text-link" onClick={onManage}>
            <Settings2 size={14} aria-hidden="true" /> EDIT SOCIAL LINKS
          </button>
        )}
      </div>

      {links.length > 0 ? (
        <motion.div
          className="ii-social-grid"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {links.map((link) => {
            const Icon = ICONS[link.platform];
            return (
              <motion.a
                key={link.platform}
                variants={fadeUp}
                whileHover={reduced ? undefined : { y: -4 }}
                className={`ii-social-card ii-social-${link.platform}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                data-platform={link.platform}
                aria-label={`Follow ${studioName} on ${link.label} at ${link.handle} (opens in a new tab)`}
              >
                <span className="ii-social-icon" aria-hidden="true">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="ii-social-copy">
                  <small>FOLLOW ON {link.label.toUpperCase()}</small>
                  <strong>{link.handle}</strong>
                  <span>{link.description}</span>
                </span>
                <ArrowUpRight
                  className="ii-social-arrow"
                  size={17}
                  aria-hidden="true"
                />
                <span className="sr-only"> (opens in a new tab)</span>
              </motion.a>
            );
          })}
        </motion.div>
      ) : (
        <div className="ii-social-empty" role="note">
          <span className="ii-social-empty-icon" aria-hidden="true">
            <Instagram size={20} />
            <Facebook size={20} />
            <Youtube size={20} />
          </span>
          <div>
            <strong>Social profiles are not linked yet.</strong>
            <p>
              {onManage
                ? "Add your Instagram, Facebook and YouTube profiles in the studio settings. Unconfigured links stay hidden on the public site."
                : `${studioName} has not added its social profiles here yet. Check back soon, or ask the studio for its official links.`}
            </p>
          </div>
          {onManage && (
            <button type="button" className="ii-outline" onClick={onManage}>
              <Settings2 size={15} aria-hidden="true" /> ADD SOCIAL LINKS
            </button>
          )}
        </div>
      )}
    </section>
  );
}
