import 'dotenv/config';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const NEXORA_TEMPLATE_IDS = [
  'hair_salon',
  'barber',
  'beauty_parlour',
  'nail_studio',
  'unisex_salon',
  'mens_hair_studio',
  'hair_spa',
  'skincare_clinic',
  'makeup_studio',
  'bridal_lounge',
  'hair_coloring',
  'massage_wellness',
  'tattoo_studio',
  'lash_brow',
  'ayurvedic_spa',
  'aurelia_beauty_parlour',
];

const DEFAULT_ORIGIN = 'https://nexorasalon.online';
const DEFAULT_SUPABASE_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH';

export function canonicalOrigin(value = DEFAULT_ORIGIN) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('SITE_URL must be an HTTPS origin without a path');
  }
  return url.origin;
}

const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
})[character]);

function publicSlugs(values) {
  return [...new Set(values
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter((slug) =>
      /^[a-z0-9][a-z0-9-]{2,62}$/.test(slug) &&
      !slug.startsWith('studioflow-qa-')
    ))].sort();
}

export function sitemapXml(origin, slugs) {
  const urls = [
    origin + '/?app=1',
    ...NEXORA_TEMPLATE_IDS.map((id) => origin + '/?template=' + encodeURIComponent(id)),
    ...publicSlugs(slugs).map((slug) => origin + '/?site=' + encodeURIComponent(slug)),
  ];
  if (urls.length > 50000) {
    throw new Error('Sitemap index required for more than 50,000 URLs');
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls.map((url) => '<url><loc>' + escapeXml(url) + '</loc></url>').join('') +
    '</urlset>\n';
}

export async function fetchPublishedSlugs(env = process.env, fetcher = fetch) {
  const endpoint = env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_PUBLISHABLE_KEY;
  const slugs = [];

  for (let offset = 0; offset < 50000; offset += 1000) {
    const url = new URL('/rest/v1/studioflow_websites', endpoint);
    url.searchParams.set('select', 'slug');
    url.searchParams.set('order', 'slug.asc');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', '1000');

    const response = await fetcher(url, {
      headers: { apikey: key, accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error('Published salon catalogue could not be loaded (' + response.status + ')');
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.some((row) => typeof row?.slug !== 'string')) {
      throw new Error('Published salon catalogue returned an invalid response');
    }

    slugs.push(...rows.map((row) => row.slug));
    if (rows.length < 1000) return publicSlugs(slugs);
  }

  throw new Error('Sitemap index required for more than 50,000 published salons');
}

export async function generateSitemap(env = process.env, fetcher = fetch) {
  const origin = canonicalOrigin(
    env.SITE_URL || env.VITE_SITE_URL || DEFAULT_ORIGIN
  );
  const slugs = await fetchPublishedSlugs(env, fetcher);
  return sitemapXml(origin, slugs);
}

export async function writeSitemapFile(
  env = process.env,
  fetcher = fetch,
  outputPath = path.resolve(process.cwd(), 'public', 'sitemap.xml'),
) {
  try {
    const xml = await generateSitemap(env, fetcher);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, xml, 'utf8');
    console.log('Generated public/sitemap.xml with published salon URLs.');
    return { path: outputPath, refreshed: true };
  } catch (error) {
    // A temporary catalogue outage should not erase the last good sitemap or
    // block a production build. A fresh checkout includes a checked-in sitemap.
    if (existsSync(outputPath)) {
      console.warn(
        'Sitemap refresh failed; keeping the existing public/sitemap.xml:',
        error instanceof Error ? error.message : String(error),
      );
      return { path: outputPath, refreshed: false, error };
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeSitemapFile();
}
