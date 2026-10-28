import { useState } from "react";
import { X } from "lucide-react";
import { usePromotionClock } from "../lib/promotionStatus";
export type PromotionalBannerProps = {
  id: string;
  text: string;
  label?: string;
  actionLabel?: string;
  actionHref?: string;
  endsAt?: string;
  enabled?: boolean;
  className?: string;
};
/** Dismissal lasts for this browser tab's session and this exact campaign version. */
export function PromotionalBanner({
  id,
  text,
  actionLabel,
  actionHref,
  endsAt,
  enabled = true,
  className = "",
  label = "Announcement",
}: PromotionalBannerProps) {
  const now = usePromotionClock();
  const key =
    "nexora-announcement:" +
    JSON.stringify([id, text, actionLabel, actionHref, endsAt]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  let stored = false;
  try {
    stored = sessionStorage.getItem(key) === "dismissed";
  } catch {
    /* Storage denied: in-memory dismissal still works. */
  }
  const safeHref =
    actionHref &&
    (/^(\/(?!\/)|#[\w-])/.test(actionHref) || /^https:\/\//i.test(actionHref))
      ? actionHref
      : undefined;
  if (
    !enabled ||
    !text.trim() ||
    dismissed.includes(key) ||
    stored ||
    (endsAt &&
      (!Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= now))
  )
    return null;
  return (
    <aside className={"nexora-announcement " + className} aria-label={label}>
      <span>{text}</span>
      {safeHref && actionLabel && <a href={safeHref}>{actionLabel}</a>}
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          setDismissed((values) => [...values, key]);
          try {
            sessionStorage.setItem(key, "dismissed");
          } catch {
            /* no persistent storage */
          }
        }}
      >
        <X size={18} />
      </button>
    </aside>
  );
}
