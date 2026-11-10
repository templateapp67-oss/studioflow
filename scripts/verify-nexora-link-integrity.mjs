import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

/**
 * Internal link and anchor integrity for the public marketing pages.
 *
 * The check runs against the prerendered documents, so it covers exactly what
 * a crawler sees: every internal link must point at a route that exists and
 * every same-page anchor must resolve to a rendered element id.
 */

const ROUTES = new Set(['/', '/pricing', '/salon-os', '/privacy', '/admin/demo-leads', '/login', '/index.html', '/salon-onboarding', '/salon-growth', '/growth-partner-rewards']);

const DOCUMENTS = [
  { path: '/', file: 'dist/index.html' },
  { path: '/pricing', file: 'dist/pricing/index.html' },
  { path: '/salon-os', file: 'dist/salon-os/index.html' },
  { path: '/privacy', file: 'dist/privacy/index.html' },
];

for (const document of DOCUMENTS) {
  assert.ok(existsSync(document.file), `The prerendered document ${document.file} must exist`);
}

const idsOf = (html) => {
  const ids = new Set();
  for (const match of html.matchAll(/\sid="([^"]+)"/g)) ids.add(match[1]);
  return ids;
};

const linksOf = (html) =>
  Array.from(html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)).map((match) => match[1]);

let checkedLinks = 0;
let checkedAnchors = 0;

for (const document of DOCUMENTS) {
  const html = readFileSync(document.file, 'utf8');
  const ids = idsOf(html);
  const links = linksOf(html);

  assert.ok(links.length > 0, `${document.path} must contain links`);

  for (const href of links) {
    const value = href.trim();
    assert.ok(value.length > 0, `${document.path} contains a link without a destination`);
    assert.ok(value !== '#', `${document.path} contains a placeholder link`);
    assert.ok(!value.toLowerCase().startsWith('javascript:'), `${document.path} contains a javascript link`);
    assert.ok(!value.toLowerCase().startsWith('mailto:') || value.length > 8, `${document.path} contains an empty mail link`);

    if (value.startsWith('http://') || value.startsWith('https://')) {
      // External links are allowed, but they must point at a real host.
      assert.ok(/^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(value), `${document.path} contains a malformed external link`);
      continue;
    }

    if (value.startsWith('#')) {
      const anchor = value.slice(1);
      if (!anchor) continue; // a bare "#" is handled above
      assert.ok(ids.has(anchor), `${document.path} links to #${anchor}, which is not rendered on the page`);
      checkedAnchors += 1;
      continue;
    }

    const [path, hash] = value.split('#');
    const target = path.replace(/\/+$/, '') || '/';
    if (target.startsWith('/?')) {
      // A query on the public homepage is a real route of the application.
      continue;
    }
    assert.ok(
      ROUTES.has(target) ||
        target.startsWith('/templates/') ||
        target.startsWith('/template-pages/') ||
        target.startsWith('/login'),
      `${document.path} links to ${target}, which is not a known route`,
    );
    if (hash) {
      // A cross-page anchor is only meaningful when the target page renders it.
      const targetFile = target === '/pricing' ? 'dist/pricing/index.html'
        : target === '/salon-os' ? 'dist/salon-os/index.html'
        : target === '/privacy' ? 'dist/privacy/index.html'
        : null;
      if (targetFile && existsSync(targetFile)) {
        assert.ok(
          idsOf(readFileSync(targetFile, 'utf8')).has(hash),
          `${document.path} links to ${target}#${hash}, which the target page does not render`,
        );
      }
    }
    checkedLinks += 1;
  }
}

/* The demo dialog and the plan hand-off must only use real destinations. */
const demoProvider = readFileSync('src/components/nexora-pricing/DemoProvider.tsx', 'utf8');
assert.ok(demoProvider.includes("postLeadToServerRoute('/api/nexora-demo-lead'"), 'The demo form posts to the real lead route');
assert.ok(demoProvider.includes('href="/privacy"'), 'The demo form links to the published privacy notice');

const pricingPage = readFileSync('src/components/nexora-landing/NexoraPricingLandingPage.tsx', 'utf8');
for (const route of ['/login?auth=signup', '/login', '/salon-os', '/privacy']) {
  assert.ok(pricingPage.includes(route), `The pricing page links to ${route}`);
}

/* The router must keep every public marketing route outside the owner app. */
const router = readFileSync('src/AppRouter.tsx', 'utf8');
for (const route of ['/salon-os', '/pricing', '/privacy', '/admin/demo-leads']) {
  assert.ok(router.includes(`'${route}'`), `The router serves ${route}`);
}

console.log(
  `PASS: ${checkedLinks} internal links and ${checkedAnchors} in-page anchors across ${DOCUMENTS.length} prerendered documents resolve to real routes and rendered ids; no placeholder, empty or javascript link exists.`,
);
