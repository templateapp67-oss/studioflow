import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'esbuild';

/**
 * NEXORA marketing route wiring (release gate).
 *
 * `/salon-onboarding`, `/salon-growth` and `/growth-partner-rewards` are three
 * different pages rendered by one shared component. Before this suite existed
 * they were routed in `AppRouter.tsx` but had no document of their own, so every
 * URL answered with the homepage shell: one title, one description and one
 * canonical shared by three pages, none of them in the sitemap.
 *
 * The suite asserts the emitted artefacts — not the source — so it fails if the
 * prerenderer, the deployment rewrites or the sitemap ever stop agreeing:
 *   1. each route ships its own document with a unique head;
 *   2. the document contains that route's copy and no sibling's copy;
 *   3. the structured data describes the same URL as the canonical;
 *   4. Vercel rewrites the route to its document instead of the SPA shell;
 *   5. the sitemap lists each route exactly once, next to the old ones.
 */

/** Bundles a TypeScript module to a self-contained ESM data URL. */
async function loadModule(options) {
  const result = await build({
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    write: false,
    logLevel: 'silent',
    ...options,
  });
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const seo = await loadModule({
  stdin: {
    contents: [
      "export * from './src/lib/nexoraEcosystemSeo.ts';",
      "export { NEXORA_PUBLIC_ORIGIN, NEXORA_HOME_SEO } from './src/lib/publicSeo.ts';",
    ].join('\n'),
    resolveDir: process.cwd(),
    loader: 'ts',
  },
});
const { sitemapXml } = await loadModule({ entryPoints: ['server/sitemap.ts'] });

const { NEXORA_ECOSYSTEM_ROUTES, NEXORA_ECOSYSTEM_SEO, NEXORA_PUBLIC_ORIGIN, NEXORA_HOME_SEO } = seo;

assert.deepEqual(
  [...NEXORA_ECOSYSTEM_ROUTES],
  ['/salon-onboarding', '/salon-growth', '/growth-partner-rewards'],
  'The three routed marketing pages are covered by the metadata source',
);
assert.equal(new URL(NEXORA_HOME_SEO.canonicalUrl).origin, NEXORA_PUBLIC_ORIGIN);

/* The head is HTML-escaped when written, so compare decoded values. */
const decode = (value) =>
  value?.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({
    amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'",
  })[entity]);

const attribute = (html, name) =>
  decode(html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1]);
const property = (html, name) =>
  decode(html.match(new RegExp(`<meta property="${name}" content="([^"]*)"`))?.[1]);
const titleOf = (html) => decode(html.match(/<title>([^<]*)<\/title>/)?.[1]);
const canonicalOf = (html) => decode(html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]);
const jsonLdOf = (html) =>
  Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map((match) => match[1]);

const seenTitles = new Map();
const seenDescriptions = new Map();
const seenCanonicals = new Map();

for (const path of NEXORA_ECOSYSTEM_ROUTES) {
  const meta = NEXORA_ECOSYSTEM_SEO[path];
  const file = `dist${path}/index.html`;

  assert.ok(existsSync(file), `${path} must ship its own prerendered document at ${file}`);
  const html = readFileSync(file, 'utf8');

  /* 1. The head is owned by this route, not by the homepage shell. */
  assert.equal(titleOf(html), meta.title, `${path} serves its own <title>`);
  assert.equal(attribute(html, 'description'), meta.description, `${path} serves its own description`);
  assert.equal(attribute(html, 'robots'), 'index,follow', `${path} is indexable`);
  assert.equal(canonicalOf(html), `${NEXORA_PUBLIC_ORIGIN}${path}`, `${path} canonicalises to itself`);
  assert.equal(property(html, 'og:url'), `${NEXORA_PUBLIC_ORIGIN}${path}`, `${path} shares its own URL`);
  assert.equal(property(html, 'og:title'), meta.title, `${path} shares its own title`);
  assert.equal(property(html, 'og:description'), meta.description, `${path} shares its own description`);
  assert.equal(property(html, 'og:image'), `${NEXORA_PUBLIC_ORIGIN}${meta.ogImagePath}`, `${path} shares the approved card`);
  assert.equal(attribute(html, 'twitter:card'), 'summary_large_image', `${path} declares a Twitter card`);
  assert.equal(attribute(html, 'twitter:title'), meta.title, `${path} declares its own Twitter title`);
  assert.equal(attribute(html, 'theme-color'), meta.themeColor, `${path} mirrors the page brand colour`);
  assert.notEqual(titleOf(html), NEXORA_HOME_SEO.title, `${path} must not inherit the homepage title`);
  assert.notEqual(canonicalOf(html), NEXORA_HOME_SEO.canonicalUrl, `${path} must not canonicalise to the homepage`);

  /* 2. The document really is this route's page, and only this route's page. */
  assert.ok(html.includes(meta.contentMarker), `${path} document contains its own hero copy`);
  for (const sibling of NEXORA_ECOSYSTEM_ROUTES.filter((entry) => entry !== path)) {
    assert.ok(
      !html.includes(NEXORA_ECOSYSTEM_SEO[sibling].contentMarker),
      `${path} document must not contain the ${sibling} copy`,
    );
  }

  /* 3. Structured data describes the same page the canonical points at. */
  const blocks = jsonLdOf(html);
  assert.equal(blocks.length, 1, `${path} ships exactly one JSON-LD block`);
  const schema = JSON.parse(blocks[0]);
  const graph = schema['@graph'] ?? [schema];
  const page = graph.find((node) => node['@type'] === 'WebPage');
  const breadcrumb = graph.find((node) => node['@type'] === 'BreadcrumbList');
  assert.ok(page, `${path} declares a WebPage node`);
  assert.equal(page.url, `${NEXORA_PUBLIC_ORIGIN}${path}`, `${path} WebPage url matches the canonical`);
  assert.equal(page.name, meta.title, `${path} WebPage name matches the title`);
  assert.ok(breadcrumb, `${path} declares a breadcrumb`);
  const home = breadcrumb.itemListElement.find((item) => item.position === 1);
  const self = breadcrumb.itemListElement.find((item) => item.position === 2);
  assert.equal(home.item, `${NEXORA_PUBLIC_ORIGIN}/`, `${path} breadcrumb starts at the homepage`);
  assert.equal(self.item, `${NEXORA_PUBLIC_ORIGIN}${path}`, `${path} breadcrumb ends on itself`);
  assert.equal(self.name, meta.label, `${path} breadcrumb label matches the shared label`);

  /* The prerendered shell must still boot the app so the page hydrates. */
  assert.match(html, /<script type="module"[^>]*src="\/assets\/[^"]+\.js"/, `${path} loads the built entry script`);
  assert.match(html, /<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"/, `${path} loads the built stylesheet`);

  // Keep a built-CSS regression guard for Rewards. Its component lives outside
  // the default public-page Tailwind globs, so missing source registration can
  // otherwise ship a visible HTML page without its background and layout styles.
  if (path === '/growth-partner-rewards') {
    const stylesheetPaths = Array.from(
      html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/g),
      (match) => `dist/${match[1].replace(/^\//, '')}`,
    );
    assert.ok(stylesheetPaths.length > 0, 'Growth Partner Rewards emits at least one stylesheet');
    const stylesheet = stylesheetPaths.map((assetPath) => {
      assert.ok(existsSync(assetPath), `Built stylesheet exists: ${assetPath}`);
      return readFileSync(assetPath, 'utf8');
    }).join('\n');
    assert.ok(
      stylesheet.includes('#101a2b') && stylesheet.includes('#f8fafc'),
      'Growth Partner Rewards hero and page background utilities are included in the built CSS',
    );
  }
  assert.ok(html.includes(`<div id="root">`), `${path} hydrates into the root element`);

  for (const [map, value, label] of [
    [seenTitles, titleOf(html), 'title'],
    [seenDescriptions, attribute(html, 'description'), 'description'],
    [seenCanonicals, canonicalOf(html), 'canonical'],
  ]) {
    assert.ok(!map.has(value), `${path} shares its ${label} with ${map.get(value)}`);
    map.set(value, path);
  }
}

/* 4. Every route is rewritten to its own document, ahead of the SPA fallback. */
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const rewrites = vercel.rewrites.map((entry) => [entry.source, entry.destination]);
const fallbackIndex = rewrites.findIndex(([source]) => source === '/(.*)');
assert.ok(fallbackIndex > 0, 'The SPA fallback rewrite must stay the last rewrite');
for (const path of NEXORA_ECOSYSTEM_ROUTES) {
  const index = rewrites.findIndex(([source]) => source === path);
  assert.ok(index >= 0, `${path} must be served by its own rewrite`);
  assert.equal(rewrites[index][1], `${path}/index.html`, `${path} rewrites to its document`);
  assert.ok(index < fallbackIndex, `${path} must be resolved before the SPA fallback`);
}
assert.equal(rewrites.filter(([source]) => source === '/(.*)').length, 1, 'Only one SPA fallback exists');

/* 5. The sitemap lists each route once, without dropping the existing ones. */
const sitemap = sitemapXml(NEXORA_PUBLIC_ORIGIN, []);
const locations = Array.from(sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)).map((match) => match[1]);
for (const path of [...NEXORA_ECOSYSTEM_ROUTES, '/', '/salon-os', '/pricing', '/privacy']) {
  const url = `${NEXORA_PUBLIC_ORIGIN}${path}`;
  assert.equal(locations.filter((entry) => entry === url).length, 1, `${path} is listed exactly once`);
}
assert.equal(
  new Set(locations).size,
  locations.length,
  'The sitemap contains no duplicate URL',
);
assert.ok(!sitemap.includes('vercel.app') && !sitemap.includes('localhost'), 'No preview host leaks into the sitemap');

/* The routes stay outside the owner application and its API surface. */
const router = readFileSync('src/AppRouter.tsx', 'utf8');
for (const path of NEXORA_ECOSYSTEM_ROUTES) {
  assert.ok(router.includes(`'${path}'`), `The router serves ${path} as a public route`);
}

/* The client renderer must own the same head as the build, from one source. */
const page = readFileSync('src/components/nexora-landing/NexoraEcosystemPage.tsx', 'utf8');
assert.ok(
  page.includes('<NexoraEcosystemSeoHead path={path} />'),
  'The shared marketing page applies its route metadata on the client, so the development server and a client entry agree with the built document',
);
const head = readFileSync('src/components/nexora-landing/NexoraEcosystemSeoHead.tsx', 'utf8');
assert.ok(
  head.includes('NEXORA_ECOSYSTEM_SEO[path]') && !/title:\s*['"]/.test(head),
  'The client head reads the shared metadata source instead of duplicating route copy',
);

console.log(
  `PASS: ${NEXORA_ECOSYSTEM_ROUTES.length} NEXORA marketing routes ship their own prerendered documents with unique titles, descriptions and canonicals, route-correct structured data, deployment rewrites ahead of the SPA fallback and single sitemap entries; the existing public routes are unchanged.`,
);
