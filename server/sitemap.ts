import { NEXORA_PUBLIC_ORIGIN } from "../src/lib/publicSeo";
import { NEXORA_ECOSYSTEM_ROUTES } from "../src/lib/nexoraEcosystemSeo";
import { NEXORA_TEMPLATE_META, nexoraTemplatePagePath } from "../src/lib/nexoraTemplateCatalogue";
import { CANONICAL_ALIAS_HOSTS } from "./canonicalHost";
import { robotsTagForRequest } from "./robotsHeaders";

const CANONICAL_ALIAS_HOST_SET = new Set(
  CANONICAL_ALIAS_HOSTS.map((host) => host.toLowerCase()),
);

const RESERVED_SITEMAP_SLUGS = new Set([
  "api",
  "admin",
  "owner",
  "staff",
  "login",
  "sign-in",
  "sign-up",
  "app",
  "customer",
  "pricing",
  "privacy",
  "salon-os",
  "partner-rewards",
  "salon-onboarding",
  "salon-growth",
  "growth-partner-rewards",
]);

function normaliseCanonicalAliasOrigin(origin: string): string {
  const cleaned = origin.replace(/\/+$/, "");
  try {
    const host = new URL(cleaned).hostname.toLowerCase();
    if (CANONICAL_ALIAS_HOST_SET.has(host)) {
      return canonicalOrigin(NEXORA_PUBLIC_ORIGIN);
    }
  } catch {
    // Non-URL inputs fall through to the caller's validation.
  }
  return cleaned;
}

export function isPublicSitemapSlug(slug: string): boolean {
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(slug)) return false;
  if (slug.startsWith("studioflow-qa-")) return false;
  if (RESERVED_SITEMAP_SLUGS.has(slug)) return false;
  return true;
}

export function canonicalOrigin(value: string | undefined): string {
  if (!value) throw new Error("SITE_URL must be configured");
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("SITE_URL must be an HTTPS origin without a path");
  return url.origin;
}
const xml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function sitemapXml(rawOrigin: string, slugs: string[]) {
  const origin = normaliseCanonicalAliasOrigin(rawOrigin);
  // Public marketing and template pages are crawlable; app/auth/private routes are not.
  const candidates = [
    origin + "/",
    origin + "/salon-os",
    origin + "/pricing",
    origin + "/privacy",
    ...NEXORA_ECOSYSTEM_ROUTES.map((path) => origin + path),
    ...NEXORA_TEMPLATE_META.map((meta) => origin + nexoraTemplatePagePath(meta.templateId)),
    ...new Set(
      slugs
        .filter(isPublicSitemapSlug)
        .map((s) => origin + "/?site=" + encodeURIComponent(s)),
    ),
  ];
  const urls = candidates.filter((candidate) => {
    try {
      const parsed = new URL(candidate);
      return (
        parsed.protocol === "https:" &&
        robotsTagForRequest(parsed.pathname, parsed.search) === null
      );
    } catch {
      return false;
    }
  });
  if (urls.length > 50000)
    throw new Error("Sitemap index required for this catalogue size");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map((url) => "<url><loc>" + xml(url) + "</loc></url>").join("") +
    "</urlset>"
  );
}
/**
 * Hosts that must never become an SEO canonical: ephemeral preview deployments
 * and local development. A preview URL leaking into <loc> tells search engines
 * to index a throwaway domain instead of the real site.
 */
const EPHEMERAL_HOST_SUFFIXES = [
  "vercel.app",
  "netlify.app",
  "pages.dev",
  "github.io",
  "e2b.app",
  "localhost",
  "127.0.0.1",
  "nip.io",
  "sslip.io",
];

/** True for preview/local hosts whose URLs must not be published as canonicals. */
export function isEphemeralOrigin(origin: string): boolean {
  const host = new URL(origin).hostname.toLowerCase();
  return EPHEMERAL_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith("." + suffix),
  );
}

/**
 * Resolves the sitemap origin.
 *
 * A real custom domain configured through SITE_URL / VITE_SITE_URL is honoured —
 * published salon sites are served on their own domains, so the sitemap has to
 * be able to describe them. Preview and local hosts are rejected and fall back
 * to the production canonical, and canonical redirect aliases such as
 * `www.nexorasalon.online` normalize to the non-www apex origin, so a Vercel
 * preview or misconfigured `www` override can never pollute `/sitemap.xml`.
 */
export function sitemapOrigin(env: NodeJS.ProcessEnv = process.env): string {
  for (const candidate of [env.SITE_URL, env.VITE_SITE_URL]) {
    if (!candidate) continue;
    const origin = canonicalOrigin(candidate);
    if (!isEphemeralOrigin(origin)) return normaliseCanonicalAliasOrigin(origin);
  }
  return canonicalOrigin(NEXORA_PUBLIC_ORIGIN);
}

export async function generateSitemap(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  const origin = sitemapOrigin(env);
  const endpoint =
    env.SUPABASE_URL || "https://zilwgiuiygqqardzutxi.supabase.co";
  const key =
    env.SUPABASE_ANON_KEY || "sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH";
  const slugs: string[] = [];
  try {
    for (let offset = 0; offset < 50000; offset += 1000) {
      const url = new URL("/rest/v1/studioflow_websites", endpoint);
      url.searchParams.set("select", "slug");
      url.searchParams.set("order", "slug.asc");
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("limit", "1000");
      const response = await fetcher(url, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Published-site catalogue unavailable");
      const data = await response.json();
      if (
        !Array.isArray(data) ||
        data.some((row) => typeof row?.slug !== "string")
      )
        throw new Error("Invalid public catalogue");
      slugs.push(...data.map((row) => row.slug));
      if (data.length < 1000) return sitemapXml(origin, slugs);
    }
  } catch {
    // Keep the public marketing and template pages crawlable if the optional
    // published-site catalogue is temporarily unavailable. The dynamic site
    // URLs return automatically when that catalogue is reachable again.
    return sitemapXml(origin, []);
  }
  throw new Error("Sitemap index required for this catalogue size");
}
// Express and Vercel share the exact handler. No request Host is trusted as canonical.
export async function sitemapHandler(
  _req: unknown,
  res: {
    status: (n: number) => any;
    setHeader: (k: string, v: string) => unknown;
    send: (text: string) => unknown;
  },
) {
  try {
    const body = await generateSitemap();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.send(body);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    res
      .status(503)
      .send(
        "Sitemap temporarily unavailable. Check canonical-domain configuration and public catalogue connectivity.",
      );
  }
}
