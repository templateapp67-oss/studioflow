import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Template 12 loyalty state.
 *
 * This deliberately reuses StudioFlow's existing, authorized customer rewards
 * dashboard RPC. The RPC is security-invoker and derives the customer from
 * `auth.uid()`, so the browser can only receive the signed-in customer's own
 * wallets. Template 12 never derives a balance, tier or visit count locally.
 */
export type IronInkLoyaltyWallet = {
  slug: string;
  salon: string;
  points: number;
  earned: number;
  spent: number;
  tier: string;
  tierAt: number;
  nextTier: string | null;
  nextAt: number | null;
};

export type IronInkLoyaltyState = {
  status: "guest" | "loading" | "ready" | "error" | "unavailable";
  wallet: IronInkLoyaltyWallet | null;
  error: string;
};

const GUEST_STATE: IronInkLoyaltyState = {
  status: "guest",
  wallet: null,
  error: "",
};

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Pick only this studio's wallet from the RPC rows; never fall back to another row. */
export function ironInkWalletForSite(
  rows: unknown,
  siteSlug: string | undefined,
): Record<string, unknown> | null {
  if (!siteSlug || !Array.isArray(rows)) return null;
  const match = (rows as Record<string, unknown>[]).find(
    (wallet) => String(wallet?.slug || "") === siteSlug,
  );
  return match || null;
}

function normalizeWallet(value: Record<string, unknown>): IronInkLoyaltyWallet {
  const nextAt = value.nextAt === null || value.nextAt === undefined
    ? null
    : number(value.nextAt);
  return {
    slug: String(value.slug || ""),
    salon: String(value.salon || ""),
    points: number(value.points),
    earned: number(value.earned),
    spent: number(value.spent),
    tier: String(value.tier || "").trim(),
    tierAt: number(value.tierAt),
    nextTier: value.nextTier ? String(value.nextTier) : null,
    nextAt: nextAt && nextAt > 0 ? nextAt : null,
  };
}

export function useIronInkLoyalty(
  siteSlug: string | undefined,
  signedIn: boolean,
  programEnabled: boolean,
) {
  const [state, setState] = useState<IronInkLoyaltyState>(
    signedIn ? { status: "loading", wallet: null, error: "" } : GUEST_STATE,
  );
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  // Re-read after a sign-in/sign-out swap so a previous customer's wallet can
  // never remain on screen. The RPC itself always derives the customer from
  // the current auth.uid().
  useEffect(() => {
    if (!signedIn) return;
    const { data } = supabase.auth.onAuthStateChange(() =>
      setRevision((value) => value + 1),
    );
    return () => data.subscription.unsubscribe();
  }, [signedIn]);

  useEffect(() => {
    let active = true;
    if (!signedIn) {
      setState(GUEST_STATE);
      return;
    }
    if (!programEnabled) {
      setState({ status: "unavailable", wallet: null, error: "" });
      return;
    }
    if (!siteSlug) {
      setState({
        status: "unavailable",
        wallet: null,
        error: "This studio page is not published, so a loyalty balance cannot be shown.",
      });
      return;
    }
    setState({ status: "loading", wallet: null, error: "" });
    void (async () => {
      try {
        const { data, error } =
          await supabase.rpc("studioflow_customer_rewards_dashboard");
        if (!active) return;
        if (error) {
          setState({
            status: "error",
            wallet: null,
            error:
              error.message ||
              "Your loyalty balance could not load. Please retry.",
          });
          return;
        }
        const match = ironInkWalletForSite(
          (data as { wallets?: unknown })?.wallets,
          siteSlug,
        );
        setState({
          status: "ready",
          wallet: match ? normalizeWallet(match) : null,
          error: "",
        });
      } catch {
        if (!active) return;
        setState({
          status: "error",
          wallet: null,
          error: "Your loyalty balance could not load. Please retry.",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [siteSlug, signedIn, programEnabled, revision]);

  return { ...state, refresh };
}
