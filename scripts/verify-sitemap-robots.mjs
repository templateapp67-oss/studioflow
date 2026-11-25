import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'esbuild';

/**
 * Sitemap and robots.txt release gate.
 * Covers catalogue-driven sitemap generation, the safe static fallback,
 * robots.txt, canonical-host handling, template coverage and deployment routes.
 */
async function loadSeoModules() {
  const result = await build({
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    write: false,
    logLevel: 'silent',
    stdin: {
      contents: [
        "export { sitemapXml, generateSitemap, canonicalOrigin, sitemapOrigin, isPublicSitemapSlug } from './server/sitemap.ts';",
        "export { NEXORA_TEMPLATE_META, nexoraTemplatePagePath } from './src/lib/nexoraTemplateCatalogue.ts';",
        "export { NEXORA_ECOSYSTEM_ROUTES } from './src/lib/nexoraEcosystemSeo.ts';",
        "export { NEXORA_PUBLIC_ORIGIN } from './src/lib/publicSeo.ts';",
      ].join('\n'),
      resolveDir: process.cwd(),
      loader: 'ts',
    },
  });
  const source = result.outputFiles[0]?.text;
  assert.ok(source, 'SEO modules bundle for the test');
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

const {
  sitemapXml,
  generateSitemap,
  canonicalOrigin,
  sitemapOrigin,
  isPublicSitemapSlug,
  NEXORA_TEMPLATE_META,
  nexoraTemplatePagePath,
  NEXORA_ECOSYSTEM_ROUTES,
  NEXORA_PUBLIC_ORIGIN,
} = await loadSeoModules();

const robotsPath = 'public/robots.txt';
const sitemapApiPath = 'api/sitemap.ts';
const serverPath = 'server.ts';
const vercelPath = 'vercel.json';

for (const file of [robotsPath, sitemapApiPath, serverPath, vercelPath]) {
  assert.ok(existsSync(file), file + ' exists');
}

/* robots.txt is a public static asset and must point at the canonical sitemap. */
const robots = readFileSync(robotsPath, 'utf8').replace(/^\uFEFF/, '');
const robotsLines = robots.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const meaningfulRobotsLines = robotsLines.filter((line) => !line.startsWith('#'));
const sitemapDirectives = meaningfulRobotsLines.filter((line) => /^Sitemap:/i.test(line));
const robotsGroups = new Map();
let activeAgents = [];
for (const line of meaningfulRobotsLines) {
  const agent = line.match(/^User-agent:\s*(.+)$/i);
  if (agent) {
    activeAgents = [agent[1].trim()];
    for (const name of activeAgents) robotsGroups.set(name, []);
    continue;
  }
  if (/^(Allow|Disallow):/i.test(line)) {
    for (const name of activeAgents) robotsGroups.get(name)?.push(line);
  }
}
const expectedSearchAgents = ['Googlebot','Googlebot-Image','Bingbot','OAI-SearchBot','ChatGPT-User','Claude-SearchBot','Claude-User','PerplexityBot','Perplexity-User'];
for (const agent of expectedSearchAgents) {
  assert.deepEqual(robotsGroups.get(agent), ['Allow: /','Disallow: /api/'], agent + ' can crawl public pages but not API endpoints');
}
for (const agent of ['GPTBot','ClaudeBot','Google-Extended']) {
  assert.deepEqual(robotsGroups.get(agent), ['Disallow: /'], agent + ' is not granted model-training crawl access by default');
}
assert.deepEqual(robotsGroups.get('*'), ['Allow: /','Disallow: /api/'], 'default crawlers can access public pages but not APIs');
assert.deepEqual(
  sitemapDirectives,
  ['Sitemap: ' + NEXORA_PUBLIC_ORIGIN + '/sitemap.xml'],
  'robots.txt contains exactly one canonical Sitemap directive',
);
assert.ok(!robotsGroups.get('*')?.some((rule) => /^Disallow:\s*\/$/i.test(rule)), 'the default crawler group never blocks the entire site');

/* The public URL maps to a real Vercel function and an Express fallback route. */
const vercel = JSON.parse(readFileSync(vercelPath, 'utf8'));
const storefrontPathRewrite = (vercel.rewrites ?? []).find((entry) => entry.source === String.raw\`/:path((?!(?:api|admin|owner|staff|login|sign-in|sign-up|assets|fonts|templates|template-pages)(?:/|$))(?!.*\.[^/]+$).*)\`);
assert.ok(storefrontPathRewrite, 'unreserved vanity paths route to the SSR storefront handler');
assert.equal(storefrontPathRewrite.destination, '/api/storefront?path=/:path*', 'vanity paths preserve the requested path as the storefront selector');
const sitemapRewrites = (vercel.rewrites ?? []).filter((entry) => entry.source === '/sitemap.xml');
const aboutRewrites = (vercel.rewrites ?? []).filter((entry) => entry.source === '/about' && entry.destination === '/about/index.html');
assert.equal(aboutRewrites.length, 1, 'About page has one explicit prerendered Vercel rewrite');
const wwwRedirects = (vercel.redirects ?? []).filter((entry) => entry.source === '/(.*)' && (entry.has ?? []).some((condition) => condition.type === 'host' && condition.value === 'www.nexorasalon.online') && entry.destination === 'https://nexorasalon.online/$1' && entry.permanent === true);
assert.equal(wwwRedirects.length, 1, 'www host is redirected directly to the canonical apex URL');
assert.equal(sitemapRewrites.length, 1, 'Vercel has one explicit /sitemap.xml rewrite');
assert.equal(sitemapRewrites[0].destination, '/api/sitemap', '/sitemap.xml is routed to the sitemap API function');

const apiEntry = readFileSync(sitemapApiPath, 'utf8');
assert.match(apiEntry, /export\s*\{\s*sitemapHandler\s+as\s+default\s*\}/, 'Vercel sitemap function exports the shared handler');
const serverSource = readFileSync(serverPath, 'utf8');
assert.match(serverSource, /app\.get\(\s*["']\/sitemap\.xml["']\s*,\s*sitemapHandler\s*\)/, 'Express also serves the same sitemap handler');

/* Canonical origin must be HTTPS, pathless and normalized to the apex host. */
assert.equal(canonicalOrigin(NEXORA_PUBLIC_ORIGIN + '/'), NEXORA_PUBLIC_ORIGIN);
assert.equal(
  sitemapOrigin({ SITE_URL: 'https://www.nexorasalon.online/' }),
  NEXORA_PUBLIC_ORIGIN,
  'www alias never becomes a sitemap canonical',
);
assert.equal(
  sitemapOrigin({ SITE_URL: 'https://preview-build.vercel.app/' }),
  NEXORA_PUBLIC_ORIGIN,
  'ephemeral Vercel preview hosts never become sitemap canonicals',
);
assert.throws(() => canonicalOrigin('http://nexorasalon.online/'), /HTTPS origin/);
assert.throws(() => canonicalOrigin('https://nexorasalon.online/private'), /HTTPS origin/);

/* Only public, well-formed salon slugs may be added to the dynamic sitemap. */
assert.equal(isPublicSitemapSlug('artbyuma'), true);
assert.equal(isPublicSitemapSlug('salon-jaipur-01'), true);
assert.equal(isPublicSitemapSlug('studioflow-qa-preview'), false);
assert.equal(isPublicSitemapSlug('login'), false);
assert.equal(isPublicSitemapSlug('pricing'), false);
assert.equal(isPublicSitemapSlug('UPPERCASE'), false);
assert.equal(isPublicSitemapSlug('has spaces'), false);
assert.equal(isPublicSitemapSlug('ab'), false);

/* Every public page and every current template appears exactly once. */
const publishedSlugs = [
  'artbyuma',
  'artbyuma',
  'salon-jaipur-01',
  'studioflow-qa-preview',
  'login',
  'pricing',
  'UPPERCASE',
  'has spaces',
];

const xml = sitemapXml(NEXORA_PUBLIC_ORIGIN, publishedSlugs);
assert.match(
  xml,
  /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">[\s\S]*<\/urlset>$/,
  'sitemap is a complete XML urlset document with the standard namespace',
);

const rawLocs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
const urlElements = [...xml.matchAll(/<url>/g)];
assert.equal(rawLocs.length, urlElements.length, 'every <url> has one <loc> and no malformed <loc> is present');

const decodeXml = (value) => value.replace(/&(amp|lt|gt|quot|apos);/g, (_, entity) => ({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
})[entity]);
const urls = rawLocs.map((loc) => {
  const decoded = decodeXml(loc);
  const parsed = new URL(decoded);
  assert.equal(parsed.origin, NEXORA_PUBLIC_ORIGIN, 'sitemap URL uses the canonical origin: ' + decoded);
  assert.equal(parsed.protocol, 'https:', 'sitemap URL is HTTPS: ' + decoded);
  return decoded;
});

assert.equal(new Set(urls).size, urls.length, 'sitemap contains no duplicate URLs');
for (const publicPath of [
  '/',
  '/salon-os',
  '/pricing',
  '/privacy',
  ...NEXORA_ECOSYSTEM_ROUTES,
  ...NEXORA_TEMPLATE_META.map((meta) => nexoraTemplatePagePath(meta.templateId)),
]) {
  const url = NEXORA_PUBLIC_ORIGIN + publicPath;
  assert.equal(urls.filter((entry) => entry === url).length, 1, publicPath + ' appears exactly once');
}
assert.ok(NEXORA_TEMPLATE_META.length >= 16, 'all 16 current NEXORA templates remain represented');
assert.equal(urls.filter((url) => url === NEXORA_PUBLIC_ORIGIN + '/?site=artbyuma').length, 1, 'published storefront slug appears once');
assert.equal(urls.filter((url) => url === NEXORA_PUBLIC_ORIGIN + '/?site=salon-jaipur-01').length, 1, 'second published storefront slug appears once');
assert.ok(
  !urls.some((url) => /studioflow-qa-|\/(?:api|admin|owner|staff|login|sign-in|sign-up)(?:\/|$)/i.test(new URL(url).pathname + new URL(url).search)),
  'private, API and QA routes never enter the sitemap',
);

/* Published salons are discovered from the public catalogue, with a safe fallback on errors. */
const fetchCalls = [];
const dynamicXml = await generateSitemap(
  {
    SITE_URL: NEXORA_PUBLIC_ORIGIN + '/',
    SUPABASE_URL: 'https://catalogue-fixture.supabase.co',
    SUPABASE_ANON_KEY: 'fixture-publishable-key',
  },
  async (input, init) => {
    const requestUrl = new URL(String(input));
    fetchCalls.push({ url: requestUrl, init });
    return {
      ok: true,
      json: async () => [{ slug: 'artbyuma' }, { slug: 'studioflow-qa-test' }],
    };
  },
);
assert.equal(fetchCalls.length, 1, 'published-site catalogue is fetched once when under the page limit');
assert.equal(fetchCalls[0].url.origin, 'https://catalogue-fixture.supabase.co');
assert.equal(fetchCalls[0].url.pathname, '/rest/v1/studioflow_websites');
assert.equal(fetchCalls[0].url.searchParams.get('select'), 'slug');
assert.equal(fetchCalls[0].url.searchParams.get('limit'), '1000');
assert.ok(dynamicXml.includes(NEXORA_PUBLIC_ORIGIN + '/?site=artbyuma'), 'published salon URL is included');
assert.ok(!dynamicXml.includes('studioflow-qa-test'), 'QA salon URL is excluded from the dynamic sitemap');

const fallbackXml = await generateSitemap(
  {
    SITE_URL: NEXORA_PUBLIC_ORIGIN,
    SUPABASE_URL: 'https://catalogue-fixture.supabase.co',
    SUPABASE_ANON_KEY: 'fixture-publishable-key',
  },
  async () => ({ ok: false, json: async () => [] }),
);
assert.ok(fallbackXml.includes(NEXORA_PUBLIC_ORIGIN + '/'), 'catalogue outage retains public marketing URLs');
assert.ok(
  NEXORA_TEMPLATE_META.every((meta) => fallbackXml.includes(NEXORA_PUBLIC_ORIGIN + nexoraTemplatePagePath(meta.templateId))),
  'catalogue outage retains every public template URL',
);
assert.ok(!fallbackXml.includes('?site='), 'catalogue outage does not invent or emit published-salon URLs');

console.log(
  'PASS: robots.txt, Vercel + Express sitemap routing, canonical HTTPS origin, ' +
  NEXORA_TEMPLATE_META.length +
  ' template URLs, public storefront slug filtering, XML structure and catalogue-outage fallback.',
);
