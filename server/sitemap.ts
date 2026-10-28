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
  // Apex root is an auth/owner screen; deliberately exclude it and account routes.
  const urls = [
    origin + "/?app=1",
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
export async function generateSitemap(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  const origin = canonicalOrigin(env.SITE_URL);
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
