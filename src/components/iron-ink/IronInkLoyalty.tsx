import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Crown,
  Gift,
  LockKeyhole,
  RefreshCw,
  Settings2,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import type { LoyaltyConfig, RewardThreshold, SalonProfile } from "../../types";
import {
  useIronInkLoyalty,
  type IronInkLoyaltyState,
  type IronInkLoyaltyWallet,
} from "./useIronInkLoyalty";

type LoyaltyView = IronInkLoyaltyState & { refresh?: () => void };

const TIER_NAMES: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

function tierName(value: string | null | undefined): string {
  const key = String(value || "").toLowerCase();
  return TIER_NAMES[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "");
}

function points(value: number): string {
  return Number(value || 0).toLocaleString("en-IN");
}

function activePerks(config?: LoyaltyConfig): RewardThreshold[] {
  if (!config?.programEnabled || !Array.isArray(config.rewards)) return [];
  return config.rewards.filter(
    (reward) => reward?.isActive && Boolean(reward.title?.trim()),
  );
}

function progressPercent(wallet: IronInkLoyaltyWallet): number {
  if (!wallet.nextAt || wallet.nextAt <= wallet.tierAt) return 100;
  const span = wallet.nextAt - wallet.tierAt;
  const completed = wallet.earned - wallet.tierAt;
  return Math.min(100, Math.max(0, Math.round((completed / (span || 1)) * 100)));
}

export function IronInkPerksDialog({
  open,
  onClose,
  config,
  signedIn,
  studioName,
  onAccount,
  onManage,
}: {
  open: boolean;
  onClose: () => void;
  config?: LoyaltyConfig;
  signedIn: boolean;
  studioName: string;
  onAccount?: () => void;
  onManage?: () => void;
}) {
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLElement | null>(null);
  const perks = activePerks(config);
  const programEnabled = config?.programEnabled === true;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusables = (): HTMLElement[] => {
      if (!node) return [];
      const elements: HTMLElement[] = [];
      node
        .querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        )
        .forEach((element) => elements.push(element));
      return elements.filter((element) => element.offsetParent !== null || element === node);
    };

    const first = focusables()[0] || node;
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        node?.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ii-loyalty-backdrop"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.section
            ref={dialogRef}
            className="ii-loyalty-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ii-loyalty-dialog-title"
            aria-describedby="ii-loyalty-dialog-desc"
            tabIndex={-1}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ii-loyalty-dialog-head">
              <span className="ii-loyalty-dialog-icon" aria-hidden="true">
                <Gift size={20} />
              </span>
              <div>
                <span className="ii-kicker">THE INK CLUB</span>
                <h2 id="ii-loyalty-dialog-title">Loyalty perks</h2>
                <p id="ii-loyalty-dialog-desc">
                  {programEnabled
                    ? `Current saved perks for ${studioName}. Points are confirmed by the studio after an eligible completed visit.`
                    : `${studioName} has paused its loyalty programme, so no perks are published right now.`}
                </p>
              </div>
              <button
                type="button"
                className="ii-loyalty-close"
                aria-label="Close loyalty perks"
                onClick={onClose}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {programEnabled && perks.length > 0 ? (
              <ul className="ii-perks-list">
                {perks.map((perk) => (
                  <li key={perk.id}>
                    <span className="ii-perk-star" aria-hidden="true">
                      <Star size={15} />
                    </span>
                    <div>
                      <h3>{perk.title || "Studio perk"}</h3>
                      {perk.description && <p>{perk.description}</p>}
                    </div>
                    <span className="ii-perk-points">
                      {points(perk.requiredPoints)} pts
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ii-perks-empty" role="status">
                {programEnabled
                  ? "The studio has not published any perks yet. Ask the team what is currently available."
                  : "No perks are active while the programme is paused."}
              </p>
            )}

            <div className="ii-loyalty-dialog-note">
              <LockKeyhole size={14} aria-hidden="true" />
              <span>
                Perks are the studio&rsquo;s saved settings, not an earned reward.
                A reward is only issued once the studio&rsquo;s records confirm the
                qualifying activity.
              </span>
            </div>

            <footer className="ii-loyalty-dialog-actions">
              {!signedIn && programEnabled && onAccount && (
                <button
                  type="button"
                  className="ii-primary"
                  onClick={() => {
                    onClose();
                    onAccount();
                  }}
                >
                  SIGN IN TO JOIN <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              )}
              {signedIn && onManage && (
                <button
                  type="button"
                  className="ii-outline"
                  onClick={() => {
                    onClose();
                    onManage();
                  }}
                >
                  <Settings2 size={15} aria-hidden="true" /> EDIT PERKS
                </button>
              )}
              <button type="button" className="ii-outline" onClick={onClose}>
                CLOSE
              </button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function IronInkLoyaltyCard({
  config,
  state: loyalty,
  signedIn,
  customerName,
  studioName,
  businessType,
  loyaltyTitle,
  onAccount,
  onMyBookings,
  onManage,
}: {
  config?: LoyaltyConfig;
  state: LoyaltyView;
  signedIn: boolean;
  customerName?: string;
  studioName: string;
  businessType?: string;
  loyaltyTitle?: string;
  onAccount?: () => void;
  onMyBookings?: () => void;
  onManage?: () => void;
}) {
  const [perksOpen, setPerksOpen] = useState(false);
  const openPerks = useCallback(() => setPerksOpen(true), []);
  const closePerks = useCallback(() => setPerksOpen(false), []);
  const programEnabled = config?.programEnabled === true;
  const title = loyaltyTitle?.trim() || "Loyalty & Rewards";
  const perks = activePerks(config);
  const wallet = loyalty.status === "ready" ? loyalty.wallet : null;
  const percent = wallet ? progressPercent(wallet) : 0;
  const tier = wallet ? tierName(wallet.tier) : "";

  return (
    <section
      className="ii-section ii-loyalty"
      id="loyalty"
      data-section="loyalty"
      data-loyalty-template={businessType}
      data-loyalty-mode="dark"
      data-loyalty-state={loyalty.status}
      aria-labelledby="ii-loyalty-title"
    >
      <div className="ii-section-head">
        <span className="ii-kicker">THE INK CLUB</span>
        <h2 id="ii-loyalty-title">{title}</h2>
        <p>
          {programEnabled
            ? "Points are added by the studio after an eligible completed visit. Your balance stays private to your account."
            : "The studio has paused its loyalty programme. Ask the salon about current benefits before you book."}
        </p>
      </div>

      <div className="ii-loyalty-shell">
        <div className="ii-loyalty-card">
          <div className="ii-loyalty-glow" aria-hidden="true" />
          <div className="ii-loyalty-card-top">
            <span className="ii-loyalty-mark" aria-hidden="true">
              <Sparkles size={18} />
            </span>
            <span className="ii-loyalty-tier" aria-live="polite">
              {!programEnabled
                ? "PAUSED"
                : signedIn && wallet
                  ? tier
                    ? `${tier.toUpperCase()} MEMBER`
                    : "MEMBER"
                  : "MEMBER"}
            </span>
            {signedIn && loyalty.status === "ready" && (
              <button
                type="button"
                className="ii-loyalty-refresh"
                aria-label="Refresh your loyalty balance"
                onClick={() => loyalty.refresh?.()}
              >
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {!programEnabled ? (
            <div className="ii-loyalty-state" role="status">
              <strong>Programme paused</strong>
              <p>No points or perks are being promised while the studio programme is paused. Ask the salon about current benefits.</p>
            </div>
          ) : !signedIn ? (
            <div className="ii-loyalty-guest">
              <div className="ii-loyalty-points" aria-label="Loyalty points hidden until sign in">
                <strong aria-hidden="true">—</strong>
                <span>Sign in to view your points</span>
              </div>
              <p>
                Join the Ink Club to keep your balance, tier and perks in one
                place. We never show another customer&rsquo;s points.
              </p>
            </div>
          ) : loyalty.status === "loading" || loyalty.status === "guest" ? (
            <div className="ii-loyalty-state" role="status" aria-live="polite">
              <span className="ii-loyalty-skeleton" />
              <p>Checking your loyalty balance…</p>
            </div>
          ) : loyalty.status === "error" ? (
            <div className="ii-loyalty-state" role="alert">
              <strong>Balance unavailable</strong>
              <p>{loyalty.error || "Your loyalty balance could not load. Please retry."}</p>
              <button
                type="button"
                className="ii-outline"
                onClick={() => loyalty.refresh?.()}
              >
                TRY AGAIN
              </button>
            </div>
          ) : loyalty.status === "unavailable" ? (
            <div className="ii-loyalty-state" role="status">
              <strong>No balance to show</strong>
              <p>{loyalty.error || "A loyalty balance is not available for this studio page yet."}</p>
            </div>
          ) : wallet ? (
            <>
              <div className="ii-loyalty-points" aria-live="polite">
                <strong>{points(wallet.points)}</strong>
                <span>points available</span>
              </div>
              <div className="ii-loyalty-progress">
                <div className="ii-loyalty-progress-label">
                  <span>{tier ? `${tier} tier` : "Member tier"}</span>
                  <span>
                    {wallet.nextAt && wallet.nextTier
                      ? `${points(wallet.earned)} / ${points(wallet.nextAt)} pts to ${tierName(wallet.nextTier)}`
                      : "Highest published tier"}
                  </span>
                </div>
                <div
                  className="ii-loyalty-bar"
                  role="progressbar"
                  aria-label="Tier progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <span style={{ width: `${percent}%` }} />
                </div>
                <small>
                  {points(wallet.earned)} lifetime points earned · {points(wallet.spent)} redeemed
                </small>
              </div>
              {customerName && (
                <p className="ii-loyalty-owner-line">
                  <Check size={13} aria-hidden="true" /> Signed in as {customerName}
                </p>
              )}
            </>
          ) : (
            <div className="ii-loyalty-state" role="status">
              <strong>No balance yet</strong>
              <p>
                You are signed in, but this studio has no loyalty balance for
                your account yet. It appears after an eligible completed visit
                is recorded by the studio.
              </p>
            </div>
          )}

          <div className="ii-loyalty-card-actions">
            <button type="button" className="ii-loyalty-view" onClick={openPerks}>
              <Crown size={15} aria-hidden="true" /> VIEW PERKS
            </button>
            {!signedIn && programEnabled && onAccount && (
              <button type="button" className="ii-primary" onClick={onAccount}>
                JOIN LOYALTY PROGRAM <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            )}
            {signedIn && onMyBookings && (
              <button type="button" className="ii-outline" onClick={onMyBookings}>
                MY BOOKINGS
              </button>
            )}
            {signedIn && onAccount && (
              <button type="button" className="ii-outline" onClick={onAccount}>
                MANAGE ACCOUNT
              </button>
            )}
            {onManage && (
              <button type="button" className="ii-text-link" onClick={onManage}>
                <Settings2 size={14} aria-hidden="true" /> EDIT PERKS
              </button>
            )}
          </div>
        </div>
      </div>

      {programEnabled && perks.length > 0 && (
        <div className="ii-loyalty-perk-preview" aria-label="Current saved loyalty perks">
          <span className="ii-kicker">CURRENT PERKS</span>
          <ul>
            {perks.map((perk) => (
              <li className="sf-loyalty-card ii-loyalty-perk" key={perk.id}>
                <strong>{perk.title}</strong>
                <small>{perk.requiredPoints} points required</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <IronInkPerksDialog
        open={perksOpen}
        onClose={closePerks}
        config={config}
        signedIn={signedIn}
        studioName={studioName}
        onAccount={onAccount}
        onManage={onManage}
      />
    </section>
  );
}

/**
 * Container: reads only the signed-in customer's wallet for this studio.
 * Guests are never queried and see a sign-in/join action instead.
 */
export function IronInkLoyalty({
  profile,
  loyaltyConfig,
  siteSlug,
  customerSignedIn = false,
  customerName,
  onCustomerAccount,
  onMyBookings,
  onManage,
}: {
  profile: SalonProfile;
  loyaltyConfig?: LoyaltyConfig;
  siteSlug?: string;
  customerSignedIn?: boolean;
  customerName?: string;
  onCustomerAccount?: () => void;
  onMyBookings?: () => void;
  onManage?: () => void;
}) {
  const enabled = loyaltyConfig?.programEnabled === true;
  const loyalty = useIronInkLoyalty(siteSlug, customerSignedIn, enabled);
  return (
    <IronInkLoyaltyCard
      config={loyaltyConfig}
      state={loyalty}
      signedIn={customerSignedIn}
      customerName={customerName}
      studioName={profile.businessName || "the studio"}
      businessType={profile.businessType}
      loyaltyTitle={profile.sectionHeadings?.loyaltyTitle}
      onAccount={onCustomerAccount}
      onMyBookings={onMyBookings}
      onManage={onManage}
    />
  );
}
