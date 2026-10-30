import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Check,
  Copy,
  Settings2,
  Sparkles,
  Tag,
} from "lucide-react";
import type { SalonProfile } from "../../types";
import {
  promotionValidTillLabel,
  resolvePromotionOffers,
  type PromotionOffer,
} from "../../lib/promotionsMock";
import { fadeUp, stagger } from "./motion";

const COPIED_RESET_MS = 2000;

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy selection copy below.
  }
  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand("copy");
    document.body.removeChild(area);
    return done;
  } catch {
    return false;
  }
}

function CouponChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = async () => {
    setError("");
    const ok = await copyText(code);
    if (!ok) {
      setError("Select the code and copy it manually.");
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };
  return (
    <div className="ii-promo-coupon">
      <span className="ii-promo-code" aria-label={`Coupon code ${code}`}>
        <Tag size={12} aria-hidden="true" />
        {code}
      </span>
      <button
        type="button"
        className="ii-promo-copy"
        onClick={() => void copy()}
        aria-label={copied ? `${code} copied` : `Copy coupon code ${code}`}
      >
        {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
        {copied ? "Copied!" : "Copy"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {error || (copied ? `Copied coupon code ${code}` : "")}
      </span>
      {error && (
        <span className="ii-promo-copy-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function IronInkPromotions({
  profile,
  offers,
  onBookOffer,
  onManage,
}: {
  profile: SalonProfile;
  /**
   * Real offers from the database. When omitted the salon's existing marketing
   * campaign is used, then `promotionsMock` (preview fallback).
   */
  offers?: PromotionOffer[];
  /** Opens the existing booking flow with this offer pre-selected. */
  onBookOffer?: (offer: PromotionOffer) => void;
  /** Owner preview only. */
  onManage?: () => void;
}) {
  const reduced = useReducedMotion();
  const { offers: liveOffers, usingMock } = resolvePromotionOffers(profile, offers);
  const title =
    profile.sectionHeadings?.promotionsTitle?.trim() || "Promotions & offers";

  return (
    <section
      className="ii-section ii-promos"
      id="promotions"
      aria-labelledby="ii-promotions-title"
      data-section="promo"
    >
      <div className="ii-section-head">
        <span className="ii-kicker">CURRENT OFFERS</span>
        <h2 id="ii-promotions-title">{title}</h2>
        <p>
          Flash days, first-tattoo offers and studio bundles. Mention the code
          when you book, or start a booking straight from an offer below.
        </p>
        {onManage && (
          <button type="button" className="ii-text-link" onClick={onManage}>
            <Settings2 size={14} aria-hidden="true" /> EDIT OFFERS
          </button>
        )}
      </div>

      {liveOffers.length === 0 ? (
        <div className="ii-promo-empty" role="note">
          <Sparkles size={22} aria-hidden="true" />
          <div>
            <strong>No active offers right now.</strong>
            <p>
              Current offers will appear here when the salon announces them. Ask
              the studio about upcoming flash days.
            </p>
          </div>
        </div>
      ) : (
        <>
          <motion.div
            className="ii-promo-grid"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            {liveOffers.map((offer) => {
              const validLabel = promotionValidTillLabel(offer);
              return (
                <motion.article
                  className="ii-promo-card"
                  key={offer.id}
                  variants={fadeUp}
                  whileHover={reduced ? undefined : { y: -4 }}
                  data-demo={offer.isMock ? "true" : "false"}
                >
                  <div className="ii-promo-head">
                    <span className="ii-promo-badge">{offer.badge}</span>
                    {offer.isMock && <span className="ii-promo-sample">SAMPLE OFFER</span>}
                  </div>
                  <h3>{offer.title}</h3>
                  <p className="ii-promo-description">{offer.description}</p>
                  <p className="ii-promo-valid">
                    <CalendarDays size={13} aria-hidden="true" />
                    <span>{validLabel}</span>
                  </p>
                  {offer.couponCode && <CouponChip code={offer.couponCode} />}
                  <button
                    type="button"
                    className="ii-promo-book"
                    onClick={() => onBookOffer?.(offer)}
                    aria-label={`Book the offer ${offer.title}`}
                  >
                    BOOK THIS OFFER
                  </button>
                </motion.article>
              );
            })}
          </motion.div>
          {usingMock && (
            <p className="ii-promo-note">
              Preview offers shown by the studio template. The salon&rsquo;s own
              published offers replace these automatically.
            </p>
          )}
        </>
      )}
    </section>
  );
}
