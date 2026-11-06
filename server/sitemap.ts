import { NEXORA_PUBLIC_ORIGIN } from "../src/lib/publicSeo";
import { NEXORA_TEMPLATE_META, nexoraTemplatePagePath } from "../src/lib/nexoraTemplateCatalogue";

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
export function sitemapXml(origin: string, slugs: string[]) {
  // Public marketing and template pages are crawlable; app/auth routes are not.
  const urls = [
    origin + "/",
    ...NEXORA_TEMPLATE_META.map((meta) => origin + nexoraTemplatePagePath(meta.templateId)),
    ...new Set(
      slugs
        .filter((s) => /^[a-z0-9][a-z0-9-]{2,62}$/.test(s))
        .map((s) => origin + "/?site=" + encodeURIComponent(s)),
    ),
  ];
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
 * to the production canonical, so a Vercel preview build can never publish
 * `*.vercel.app` URLs. A malformed value still throws, exactly as before, and
 * surfaces as the handler's 503 instead of a silently wrong sitemap.
 */
export function sitemapOrigin(env: NodeJS.ProcessEnv = process.env): string {
  for (const candidate of [env.SITE_URL, env.VITE_SITE_URL]) {
    if (!candidate) continue;
    const origin = canonicalOrigin(candidate);
    if (!isEphemeralOrigin(origin)) return origin;
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
