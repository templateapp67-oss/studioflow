import React, { useEffect, useRef, useState } from "react";
import { Check, Link2, Settings2, Share2 } from "lucide-react";
import type { SalonProfile } from "../../types";
import { websiteLink } from "../../lib/supabase";

const TOAST_MS = 3000;

/** Official WhatsApp glyph — lucide ships no brand icon for it. */
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17.47 14.38c-.29-.15-1.7-.84-1.97-.94-.26-.1-.46-.15-.65.15-.2.29-.77.94-.94 1.13-.17.2-.35.22-.64.08-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.48.1-.2.05-.37-.02-.51-.08-.15-.65-1.56-.9-2.13-.23-.56-.47-.49-.65-.5h-.55c-.2 0-.5.07-.77.37-.26.29-1 .98-1 2.38 0 1.41 1.02 2.77 1.17 2.96.15.2 2.02 3.08 4.9 4.32.68.29 1.22.47 1.64.6.69.22 1.31.19 1.81.12.55-.08 1.7-.7 1.94-1.37.24-.68.24-1.26.17-1.38-.07-.12-.26-.2-.55-.34Z" />
      <path d="M12.04 2C6.6 2 2.17 6.42 2.17 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.86 9.86 0 0 0 4.68 1.19h.01c5.44 0 9.87-4.42 9.87-9.86 0-2.64-1.03-5.12-2.9-6.98A9.8 9.8 0 0 0 12.04 2Zm0 17.97h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.16 8.16 0 0 1-1.25-4.36 8.2 8.2 0 0 1 8.2-8.19c2.19 0 4.25.85 5.8 2.4a8.15 8.15 0 0 1 2.4 5.8c0 4.52-3.68 8.19-8.2 8.19Z" />
    </svg>
  );
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy below.
  }
  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, value.length);
    const done = document.execCommand("copy");
    document.body.removeChild(area);
    return done;
  } catch {
    return false;
  }
}

type Toast = { message: string; tone: "success" | "error" } | null;

export function IronInkShare({
  profile,
  siteSlug,
  onManage,
}: {
  profile: SalonProfile;
  /** The current salon slug — the shared link must always use this. */
  siteSlug?: string;
  /** Owner preview only. */
  onManage?: () => void;
}) {
  const salonName = profile.businessName || "our studio";
  const slug = String(siteSlug || profile.subdomain || "").trim();
  // Never hardcode a domain: the link always points at this salon's own slug.
  const shareUrl = slug
    ? websiteLink(slug)
    : typeof location === "undefined"
      ? ""
      : location.origin;
  const shareMessage = `Check out ${salonName} — tattoo & body art studio. Book here: ${shareUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const [toast, setToast] = useState<Toast>(null);
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  // Auto-hide the toast three seconds after the last real action.
  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
  };

  const copyLink = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (!ok) {
      setManualCopy(true);
      setCopied(false);
      showToast("Copying was blocked. Select the link below and copy it.", "error");
      return;
    }
    setManualCopy(false);
    setCopied(true);
    showToast("Salon link copied. Thank you!");
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), TOAST_MS);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({
        title: `${salonName} — tattoo & body art studio`,
        text: `Check out ${salonName}.`,
        url: shareUrl,
      });
      showToast("Salon link shared. Thank you!");
    } catch (error) {
      // Dismissing the share sheet is not a failure — stay silent.
      if (error instanceof Error && error.name === "AbortError") return;
      showToast("Sharing is unavailable here. Copy the link instead.", "error");
      setManualCopy(true);
    }
  };

  return (
    <section
      className="ii-section ii-share"
      id="salon-share"
      aria-labelledby="ii-share-title"
      data-section="share"
    >
      <div className="ii-section-head">
        <span className="ii-kicker">REFER A FRIEND</span>
        <h2 id="ii-share-title">Share &amp; referral</h2>
        <p>
          Send {salonName} to a friend who has been planning their first piece.
          The link opens this studio&rsquo;s own page.
        </p>
        {onManage && (
          <button type="button" className="ii-text-link" onClick={onManage}>
            <Settings2 size={14} aria-hidden="true" /> EDIT REFERRAL DETAILS
          </button>
        )}
      </div>

      <div className="ii-share-card">
        <div className="ii-share-link">
          <span className="ii-kicker">STUDIO LINK</span>
          <p title={shareUrl}>{shareUrl || "Studio link will be available after publishing."}</p>
        </div>
        <div className="ii-share-actions">
          <a
            className="ii-share-btn ii-share-whatsapp"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              showToast("Opening WhatsApp — your salon link is ready to send.")
            }
            aria-label={`Share ${salonName} on WhatsApp (opens in a new tab)`}
          >
            <WhatsAppIcon size={18} />
            Share on WhatsApp
          </a>
          <button
            type="button"
            className="ii-share-btn ii-share-copy"
            onClick={() => void copyLink()}
            aria-label={`Copy ${salonName}'s salon link`}
          >
            {copied ? <Check size={17} aria-hidden="true" /> : <Link2 size={17} aria-hidden="true" />}
            {copied ? "Link copied" : "Copy salon link"}
          </button>
          {canNativeShare && (
            <button
              type="button"
              className="ii-share-btn ii-share-native"
              onClick={() => void nativeShare()}
              aria-label="Share this salon with your device's share menu"
            >
              <Share2 size={17} aria-hidden="true" />
              Share…
            </button>
          )}
        </div>

        {toast && (
          <p
            className={`ii-share-toast${toast.tone === "error" ? " is-error" : ""}`}
            role={toast.tone === "error" ? "alert" : "status"}
            aria-live={toast.tone === "error" ? "assertive" : "polite"}
          >
            {toast.tone === "success" ? (
              <Check size={15} aria-hidden="true" />
            ) : (
              <Link2 size={15} aria-hidden="true" />
            )}
            <span>{toast.message}</span>
          </p>
        )}

        {manualCopy && (
          <label className="ii-share-manual">
            <span>Copy this link manually</span>
            <input
              readOnly
              value={shareUrl}
              aria-label={`${salonName} salon link for manual copying`}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
        )}
      </div>
    </section>
  );
}
