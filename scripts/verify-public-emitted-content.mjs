// Cross-document checks on the HTML shipped by the build, not on JSX source.
// Dynamic salon SSR, external HTTP targets and client-only listings need separate QA.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parseDocument } from 'htmlparser2';
import { selectAll } from 'css-select';
import { textContent } from 'domutils';
import { build } from 'esbuild';

const origin = 'https://nexorasalon.online';
const publicRoutes = ['/', '/salon-os', '/pricing', '/privacy', '/salon-onboarding', '/salon-growth', '/growth-partner-rewards', '/partner-rewards'];
const templates = readdirSync('dist/template-pages').filter((name) => name.endsWith('.html')).sort().map((name) => `/template-pages/${name}`);
assert.equal(templates.length, 16, 'all 16 template documents exist');
const routes = [...publicRoutes, ...templates];
const documents = new Map(routes.map((path) => {
  const file = path === '/' ? 'dist/index.html' : path.endsWith('.html') ? `dist${path}` : `dist${path}/index.html`;
  return [path, parseDocument(readFileSync(file, 'utf8'))];
}));
const inbound = new Map(routes.map((path) => [path, new Set()]));
const titles = new Set();
const descriptions = new Set();
let imageCount = 0, linkCount = 0;

function only(doc, selector, path) {
  const elements = selectAll(selector, doc);
  assert.equal(elements.length, 1, `${path}: exactly one ${selector}`);
  return elements[0];
}
function meta(doc, attr, name, path) {
  const value = only(doc, `meta[${attr}="${name}"]`, path).attribs.content?.trim();
  assert.ok(value, `${path}: nonempty ${name}`);
  return value;
}
function localAsset(value, path) {
  const url = new URL(value, origin + path);
  if (url.origin !== origin) return;
  assert.ok(existsSync(`dist${decodeURIComponent(url.pathname)}`), `${path}: missing asset ${url.pathname}`);
}
for (const [path, doc] of documents) {
  const canonical = only(doc, 'link[rel="canonical"]', path).attribs.href;
  assert.equal(canonical, origin + path, `${path}: canonical`);
  const title = textContent(only(doc, 'title', path)).trim();
  const description = meta(doc, 'name', 'description', path);
  assert.ok(title && !titles.has(title), `${path}: unique, nonempty title`); titles.add(title);
  assert.ok(!descriptions.has(description), `${path}: unique description`); descriptions.add(description);
  assert.ok(textContent(only(doc, 'h1', path)).trim(), `${path}: meaningful H1`);
  assert.equal(meta(doc, 'property', 'og:url', path), canonical, `${path}: OG URL matches canonical`);
  assert.equal(meta(doc, 'property', 'og:type', path), 'website', `${path}: OG type`);
  meta(doc, 'property', 'og:title', path);
  meta(doc, 'property', 'og:description', path);
  const ogImage = meta(doc, 'property', 'og:image', path);
  assert.equal(new URL(ogImage).origin, origin, `${path}: local absolute OG image`);
  localAsset(ogImage, path);
  assert.equal(meta(doc, 'name', 'twitter:image', path), ogImage, `${path}: social image agreement`);
  if (path.startsWith('/template-pages/')) {
    assert.equal(meta(doc, 'property', 'og:title', path), title, `${path}: template title agreement`);
    assert.equal(meta(doc, 'name', 'twitter:title', path), title, `${path}: template Twitter title agreement`);
  }
  const schemas = selectAll('script[type="application/ld+json"]', doc).map((el) => JSON.parse(textContent(el)));
  if (path !== '/privacy') {
    assert.ok(schemas.length, `${path}: JSON-LD exists`);
    const nodes = schemas.flatMap((schema) => schema['@graph'] || [schema]);
    assert.ok(nodes.some((node) => ['WebPage', 'SoftwareApplication'].includes(node['@type']) && node.url === canonical), `${path}: primary schema URL agrees with canonical`);
  }
  for (const img of selectAll('img', doc)) {
    imageCount++;
    assert.ok('alt' in img.attribs, `${path}: image must declare alt (empty is valid for decorative images)`);
    if (img.attribs.src) localAsset(img.attribs.src, path);
  }
  for (const el of selectAll('[srcset]', doc)) {
    for (const candidate of el.attribs.srcset.split(',')) localAsset(candidate.trim().split(/\s+/)[0], path);
  }
  for (const a of selectAll('a[href]', doc)) {
    linkCount++;
    const href = a.attribs.href.trim();
    assert.ok(href && href !== '#' && !/^javascript:/i.test(href), `${path}: unsafe or empty link`);
    const url = new URL(href, origin + path);
    if (url.origin !== origin) continue;
    const target = url.pathname.replace(/\/$/, '') || '/';
    if (documents.has(target)) {
      if (target !== path) inbound.get(target).add(path);
      if (url.hash) {
        const id = decodeURIComponent(url.hash.slice(1));
        assert.ok(selectAll('[id]', documents.get(target)).some((el) => el.attribs.id === id), `${path}: missing anchor ${target}#${id}`);
      }
    } else {
      // Login/admin are app routes, not prerendered content; files must really exist.
      assert.ok(target === '/login' || target === '/admin/demo-leads' || target === '/index.html' || existsSync(`dist${target}`), `${path}: unknown internal target ${href}`);
    }
  }
}
for (const path of routes.filter((path) => path !== '/')) assert.ok(inbound.get(path).size, `${path}: no inbound prerendered link`);

const bundled = await build({ entryPoints: ['server/sitemap.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false, logLevel: 'silent' });
const { sitemapXml } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const sitemap = sitemapXml(origin, []);
for (const path of routes) {
  const url = origin + path;
  assert.equal(sitemap.split(`<loc>${url}</loc>`).length - 1, 1, `${path}: occurs once in sitemap`);
}
console.log(`PASS: ${routes.length} prerendered public documents, ${imageCount} images and ${linkCount} links; metadata, canonical/schema URLs, local media, anchors, inbound navigation and sitemap coverage checked.`);
