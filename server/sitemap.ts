export const DEFAULT_SITEMAP_ORIGIN = "https://studioflow-ashen-pi.vercel.app";

const NEXORA_TEMPLATE_IDS = [
  "hair_salon",
  "barber",
  "beauty_parlour",
  "nail_studio",
  "unisex_salon",
  "mens_hair_studio",
  "hair_spa",
  "skincare_clinic",
  "makeup_studio",
  "bridal_lounge",
  "hair_coloring",
  "massage_wellness",
  "tattoo_studio",
  "lash_brow",
  "ayurvedic_spa",
  "aurelia_beauty_parlour",
] as const;

export function canonicalOrigin(value: string | undefined): string {
  const candidate = value?.trim() || DEFAULT_SITEMAP_ORIGIN;
  const url = new URL(candidate);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("SITE_URL must be an HTTPS origin without a path");
  }
  return url.origin;
}

const xml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );

export function sitemapXml(origin: string, slugs: string[]) {
  const salonUrls = [
    ...new Set(
      slugs
        .filter((slug) => /^[a-z0-9][a-z0-9-]{2,62}$/.test(slug))
        .map((slug) => origin + "/?site=" + encodeURIComponent(slug)),
    ),
  ];

  // The public marketing homepage is now the root URL. Include the existing
  // customer app, all public template previews, and published salon entries.
  const urls = [
    origin + "/",
    origin + "/?app=1",
    ...NEXORA_TEMPLATE_IDS.map(
      (id) => origin + "/?template=" + encodeURIComponent(id),
    ),
    ...salonUrls,
  ];

  if (urls.length > 50000) {
    throw new Error("Sitemap index required for this catalogue size");
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map((url) => "<url><loc>" + xml(url) + "</loc></url>").join("") +
    "</urlset>\n"
  );
}

export async function generateSitemap(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  let origin = DEFAULT_SITEMAP_ORIGIN;
  try {
    origin = canonicalOrigin(
      env.SITE_URL || env.VITE_SITE_URL || DEFAULT_SITEMAP_ORIGIN,
    );
  } catch (error) {
    // A missing or stale SITE_URL must not turn /sitemap.xml into a 503 page.
    console.error("[SITEMAP] Invalid SITE_URL; using the configured site origin:", error);
  }

  const endpoint =
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    "https://zilwgiuiygqqardzutxi.supabase.co";
  const key =
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    "sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH";

  const slugs: string[] = [];

  try {
    for (let offset = 0; offset < 50000; offset += 1000) {
      const url = new URL("/rest/v1/studioflow_websites", endpoint);
      url.searchParams.set("select", "slug");
      url.searchParams.set("order", "slug.asc");
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("limit", "1000");

      const response = await fetcher(url, {
        headers: {
          apikey: key,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(
          "Published-site catalogue unavailable (" + response.status + ")",
        );
      }

      const data = await response.json();
      if (
        !Array.isArray(data) ||
        data.some((row) => typeof row?.slug !== "string")
      ) {
        throw new Error("Invalid public salon catalogue");
      }

      slugs.push(...data.map((row) => row.slug));
      if (data.length < 1000) {
        return sitemapXml(origin, slugs);
      }
    }

    throw new Error("Sitemap index required for more than 50,000 salon URLs");
  } catch (error) {
    // Keep the XML response usable during a temporary Supabase outage. The
    // returned fallback still lists the homepage and all known template URLs.
    console.error("[SITEMAP] Could not load published salon URLs:", error);
    return sitemapXml(origin, []);
  }
}

// Express and Vercel share this handler. Never trust the request Host as canonical.
export async function sitemapHandler(
  _req: unknown,
  res: {
    status: (statusCode: number) => any;
    setHeader: (name: string, value: string) => unknown;
    send: (body: string) => unknown;
  },
) {
  let body: string;
  try {
    body = await generateSitemap();
  } catch (error) {
    console.error("[SITEMAP] Generation failed; returning the static URL set:", error);
    body = sitemapXml(DEFAULT_SITEMAP_ORIGIN, []);
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  res.send(body);
}
