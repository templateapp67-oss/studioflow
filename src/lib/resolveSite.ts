export function trimSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, "");
}

/**
 * Minimal structural shape of `window.location` used for tenant routing.
 * Every field is optional so tests can pass partial stubs.
 */
export type SiteLocationLike = {
  search?: string;
  hostname?: string;
  href?: string;
  origin?: string;
};

/** Same rule the database enforces for a published slug. */
const SLUG_LABEL = /^[a-z0-9][a-z0-9-]{2,62}$/;
/** Hostname labels that belong to the platform, never to a salon site. */
const RESERVED_LABELS = new Set([
  "www", "app", "api", "admin", "dashboard", "studioflow", "nexora",
  "static", "cdn", "mail", "invite", "help", "status", "support", "blog",
]);
/** Sandbox / preview hosts always serve the owner app unless `?site=` is explicit. */
const PREVIEW_HOST_SUFFIXES = [".e2b.app", ".e2b.dev", ".vercel.app", ".chatgpt.site"];
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function querySlug(search: unknown): string | null {
  if (typeof search !== "string" || search === "") return null;
  // `?site=<slug>` share links (QR codes, WhatsApp) win over the hostname and
  // are case-insensitive: `?site=Roop-Mahal` resolves to `roop-mahal`.
  const raw = new URLSearchParams(search).get("site");
  if (!raw) return null;
  const slug = raw.trim().toLowerCase();
  return slug === "" ? null : slug;
}

function hostnameOf(loc: SiteLocationLike): string {
  if (typeof loc.hostname === "string" && loc.hostname !== "") return loc.hostname;
  for (const source of [loc.href, loc.origin]) {
    if (typeof source === "string" && source !== "") {
      try {
        return new URL(source).hostname;
      } catch {
        // try the next source
      }
    }
  }
  return "";
}

function subdomainSlug(host: string): string | null {
  const clean = host.trim().toLowerCase().replace(/\.+$/, "");
  if (clean === "") return null;
  if (clean === "localhost" || clean.endsWith(".localhost")) return null;
  if (clean.startsWith("[")) return null; // IPv6 literal, e.g. [::1]
  if (IPV4.test(clean)) return null;
  if (PREVIEW_HOST_SUFFIXES.some((suffix) => clean === suffix.slice(1) || clean.endsWith(suffix))) return null;
  const labels = clean.split(".");
  // Apex and two-label hosts (nexora.app, mysalon.in) serve the owner app;
  // only a real subdomain alias (<slug>.your-domain.com) names a tenant.
  if (labels.length < 3) return null;
  const label = labels[0];
  if (RESERVED_LABELS.has(label)) return null;
  if (!SLUG_LABEL.test(label)) return null;
  return label;
}

function pathSlug(pathname: string): string | null {
  const first = (trimSlashes(pathname).split("/")[0] || "").toLowerCase();
  if (RESERVED_LABELS.has(first) || !SLUG_LABEL.test(first)) return null;
  return first;
}

/**
 * Resolves which published salon website this URL addresses, in priority order:
 *   1. `?site=<slug>` query parameter (share links, QR codes) — case-insensitive;
 *   2. the first hostname label as a subdomain alias (`<slug>.your-domain.com`);
 *   3. a plain path string, when called with a pathname instead of `location`.
 * Returns `null` when the URL addresses the owner app (apex, `www`, reserved
 * labels, localhost/IPs, sandbox and `*.vercel.app` preview hosts), so callers
 * fall back to the StudioFlow owner experience instead of a fake tenant.
 */
export function resolveSiteSlug(loc?: SiteLocationLike | string | null): string | null {
  if (loc == null) return null;
  if (typeof loc === "string") return pathSlug(loc);
  const fromQuery = querySlug(loc.search);
  if (fromQuery) return fromQuery;
  return subdomainSlug(hostnameOf(loc));
}
