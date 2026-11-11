import React from 'react';
import { renderToString } from 'react-dom/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'vite';
import { NEXORA_CATEGORIES, NEXORA_TEMPLATE_META, nexoraTemplatePagePath } from '../src/lib/nexoraTemplateCatalogue';
import { NEXORA_PUBLIC_ORIGIN } from '../src/lib/publicSeo';
import { NEXORA_PUBLIC_TEMPLATES_BY_ID } from '../src/lib/nexoraPublicTemplates';
import { NEXORA_LANDING_SEO, nexoraSalonLandingSchema } from '../src/lib/nexoraLandingContent';
import { NEXORA_PRICING_SEO, nexoraPricingSchema } from '../src/lib/nexoraPricingSeo';
import {
  NEXORA_ECOSYSTEM_ROUTES,
  NEXORA_ECOSYSTEM_SEO,
  nexoraEcosystemCanonicalUrl,
  nexoraEcosystemSchema,
} from '../src/lib/nexoraEcosystemSeo';
import { getAppBuildId } from './buildId';

const dist = join(process.cwd(), 'dist');
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

const indexPath = join(dist, 'index.html');
const indexHtml = await readFile(indexPath, 'utf8');
const vite = await createServer({
  server: { middlewareMode: true, watch: null },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
});
let renderedHomepage: string;
let renderedLanding: string;
let renderedPricing: string;
let renderedPrivacy: string;
const renderedEcosystem: Record<string, string> = {};
try {
  const homepage = await vite.ssrLoadModule('/src/components/PublicHomepage.tsx');
  renderedHomepage = renderToString(React.createElement(homepage.PublicHomepage));
  const landing = await vite.ssrLoadModule('/src/components/nexora-landing/NexoraSalonLandingPage.tsx');
  renderedLanding = renderToString(React.createElement(landing.NexoraSalonLandingPage));
  const pricing = await vite.ssrLoadModule('/src/components/nexora-landing/NexoraPricingLandingPage.tsx');
  renderedPricing = renderToString(React.createElement(pricing.NexoraPricingLandingPage));
  const privacy = await vite.ssrLoadModule('/src/components/nexora-landing/NexoraPrivacyNoticePage.tsx');
  renderedPrivacy = renderToString(React.createElement(privacy.NexoraPrivacyNoticePage));
  const ecosystem = await vite.ssrLoadModule('/src/components/nexora-landing/NexoraEcosystemPage.tsx');
  for (const path of NEXORA_ECOSYSTEM_ROUTES) {
    renderedEcosystem[path] = renderToString(
      React.createElement(ecosystem.NexoraEcosystemPage, { path }),
    );
  }
} finally {
  await vite.close();
}
const rootMarker = '<div id="root"></div>';
if (!indexHtml.includes(rootMarker)) throw new Error('Expected an empty #root in Vite index.html before prerendering.');
await writeFile(indexPath, indexHtml.replace(rootMarker, `<div id="root">${renderedHomepage}</div>`));

// The SalonOS landing page is prerendered into its own document so crawlers
// receive the full page content instead of an empty client-only shell.
const moduleScript = indexHtml.match(/<script type="module"[^>]*><\/script>/)?.[0] ?? '';
const stylesheet = indexHtml.match(/<link rel="stylesheet"[^>]*>/)?.[0] ?? '';
if (!moduleScript || !stylesheet) throw new Error('Expected the built entry script and stylesheet in dist/index.html.');
const landingCanonical = `${NEXORA_PUBLIC_ORIGIN}${NEXORA_LANDING_SEO.canonicalPath}`;
const landingHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(NEXORA_LANDING_SEO.title)}</title>
<meta name="description" content="${escapeHtml(NEXORA_LANDING_SEO.description)}" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${escapeHtml(landingCanonical)}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
<link rel="shortcut icon" href="/favicon.ico?v=2" />
<link rel="apple-touch-icon" href="/customer-icon-192.png" />
<meta name="theme-color" content="${escapeHtml(NEXORA_LANDING_SEO.themeColor)}" />
<link rel="preload" href="/fonts/poppins/poppins-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/poppins/poppins-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="NEXORA SALONOS" />
<meta property="og:title" content="${escapeHtml(NEXORA_LANDING_SEO.title)}" />
<meta property="og:description" content="${escapeHtml(NEXORA_LANDING_SEO.description)}" />
<meta property="og:url" content="${escapeHtml(landingCanonical)}" />
<meta property="og:image" content="${escapeHtml(`${NEXORA_PUBLIC_ORIGIN}${NEXORA_LANDING_SEO.ogImagePath}`)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="NEXORA SALONOS salon management software" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(NEXORA_LANDING_SEO.title)}" />
<meta name="twitter:description" content="${escapeHtml(NEXORA_LANDING_SEO.description)}" />
<meta name="twitter:image" content="${escapeHtml(`${NEXORA_PUBLIC_ORIGIN}${NEXORA_LANDING_SEO.ogImagePath}`)}" />
<script type="application/ld+json">${safeJson(nexoraSalonLandingSchema(NEXORA_PUBLIC_ORIGIN))}</script>
${moduleScript}
${stylesheet}
</head>
<body>
<div id="root">${renderedLanding}</div>
</body>
</html>`;
await mkdir(join(dist, 'salon-os'), { recursive: true });
await writeFile(join(dist, 'salon-os', 'index.html'), landingHtml);

// The complete NEXORA SALONOS landing page is published at /pricing. It is
// prerendered into its own document so crawlers receive the full page
// content (hero, plans, comparison matrix, FAQs) instead of a client shell.
const pricingCanonical = `${NEXORA_PUBLIC_ORIGIN}/pricing`;
const pricingHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(NEXORA_PRICING_SEO.title)}</title>
<meta name="description" content="${escapeHtml(NEXORA_PRICING_SEO.description)}" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${escapeHtml(pricingCanonical)}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
<link rel="shortcut icon" href="/favicon.ico?v=2" />
<link rel="apple-touch-icon" href="/customer-icon-192.png" />
<meta name="theme-color" content="#FF2323" />
<link rel="preload" href="/fonts/poppins/poppins-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/poppins/poppins-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="NEXORA SALONOS" />
<meta property="og:title" content="${escapeHtml(NEXORA_PRICING_SEO.title)}" />
<meta property="og:description" content="${escapeHtml(NEXORA_PRICING_SEO.description)}" />
<meta property="og:url" content="${escapeHtml(pricingCanonical)}" />
<meta property="og:image" content="${escapeHtml(`${NEXORA_PUBLIC_ORIGIN}${NEXORA_PRICING_SEO.ogImagePath}`)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="NEXORA SALONOS salon management software" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(NEXORA_PRICING_SEO.title)}" />
<meta name="twitter:description" content="${escapeHtml(NEXORA_PRICING_SEO.description)}" />
<meta name="twitter:image" content="${escapeHtml(`${NEXORA_PUBLIC_ORIGIN}${NEXORA_PRICING_SEO.ogImagePath}`)}" />
<script type="application/ld+json">${safeJson(nexoraPricingSchema(NEXORA_PUBLIC_ORIGIN))}</script>
${moduleScript}
${stylesheet}
</head>
<body>
<div id="root">${renderedPricing}</div>
</body>
</html>`;
await mkdir(join(dist, 'pricing'), { recursive: true });
await writeFile(join(dist, 'pricing', 'index.html'), pricingHtml);

// The public privacy notice is prerendered as well, so the demo form can
// link to a real policy document instead of a dead anchor.
const privacyCanonical = `${NEXORA_PUBLIC_ORIGIN}/privacy`;
const privacyTitle = 'Privacy notice \u2014 Nexora SalonOS demo requests';
const privacyDescription =
  'How Nexora SalonOS collects, stores, uses and deletes the details you send with a demo request.';
const privacyHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(privacyTitle)}</title>
<meta name="description" content="${escapeHtml(privacyDescription)}" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${escapeHtml(privacyCanonical)}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
<link rel="shortcut icon" href="/favicon.ico?v=2" />
<link rel="apple-touch-icon" href="/customer-icon-192.png" />
<meta name="theme-color" content="#CC1C1C" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="NEXORA SALONOS" />
<meta property="og:title" content="${escapeHtml(privacyTitle)}" />
<meta property="og:description" content="${escapeHtml(privacyDescription)}" />
<meta property="og:url" content="${escapeHtml(privacyCanonical)}" />
<meta property="og:image" content="${escapeHtml(`${NEXORA_PUBLIC_ORIGIN}/nexora-homepage-og.jpg`)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="NEXORA SALONOS salon management software" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(privacyTitle)}" />
<meta name="twitter:description" content="${escapeHtml(privacyDescription)}" />
${moduleScript}
${stylesheet}
</head>
<body>
<div id="root">${renderedPrivacy}</div>
</body>
</html>`;
await mkdir(join(dist, 'privacy'), { recursive: true });
await writeFile(join(dist, 'privacy', 'index.html'), privacyHtml);

// The three NEXORA marketing routes (/salon-onboarding, /salon-growth and
// /growth-partner-rewards) share one component but must not share a document:
// served from the SPA shell they would all carry the homepage's title,
// description and canonical, so the two growth routes would compete with the
// homepage instead of being indexable pages of their own. Each route is
// prerendered with the head metadata owned by `nexoraEcosystemSeo.ts`.
for (const path of NEXORA_ECOSYSTEM_ROUTES) {
  const seo = NEXORA_ECOSYSTEM_SEO[path];
  const rendered = renderedEcosystem[path];
  if (!rendered?.includes(seo.contentMarker)) {
    throw new Error(`Prerender produced the wrong document for ${path}`);
  }
  const canonical = nexoraEcosystemCanonicalUrl(path);
  const ogImage = `${NEXORA_PUBLIC_ORIGIN}${seo.ogImagePath}`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(seo.title)}</title>
<meta name="description" content="${escapeHtml(seo.description)}" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
<link rel="shortcut icon" href="/favicon.ico?v=2" />
<link rel="apple-touch-icon" href="/customer-icon-192.png" />
<meta name="theme-color" content="${escapeHtml(seo.themeColor)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="NEXORA SALONOS" />
<meta property="og:title" content="${escapeHtml(seo.title)}" />
<meta property="og:description" content="${escapeHtml(seo.description)}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta property="og:image" content="${escapeHtml(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${escapeHtml(seo.ogImageAlt)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(seo.title)}" />
<meta name="twitter:description" content="${escapeHtml(seo.description)}" />
<meta name="twitter:image" content="${escapeHtml(ogImage)}" />
<meta name="twitter:image:alt" content="${escapeHtml(seo.ogImageAlt)}" />
<script type="application/ld+json">${safeJson(nexoraEcosystemSchema(path))}</script>
${moduleScript}
${stylesheet}
</head>
<body>
<div id="root">${rendered}</div>
</body>
</html>`;
  const directory = join(dist, path.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), html);
}

const pagesDirectory = join(dist, 'template-pages');
await mkdir(pagesDirectory, { recursive: true });
for (const meta of NEXORA_TEMPLATE_META) {
  const template = NEXORA_PUBLIC_TEMPLATES_BY_ID[meta.templateId];
  if (!template) throw new Error(`Missing public card metadata for ${meta.templateId}`);
  const image = template.coverImageUrl;
  const imageType = image.toLowerCase().endsWith('.webp') ? 'image/webp' : image.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const canonical = `${NEXORA_PUBLIC_ORIGIN}${nexoraTemplatePagePath(meta.templateId)}`;
  const description = `${meta.shortDescription} Explore the ${meta.categoryName.toLowerCase()} design and start with this editable NEXORA website template.`;
  const category = NEXORA_CATEGORIES.find((entry) => entry.categoryId === meta.categoryId);
  const signupUrl = `/login?auth=signup&template=${encodeURIComponent(meta.templateId)}&create=1`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.displayName,
    description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'NEXORA Salon OS', url: `${NEXORA_PUBLIC_ORIGIN}/` },
    about: { '@type': 'SoftwareApplication', name: 'NEXORA Salon OS', applicationCategory: 'BusinessApplication', operatingSystem: 'Web' },
    primaryImageOfPage: { '@type': 'ImageObject', contentUrl: `${NEXORA_PUBLIC_ORIGIN}${image}` },
  };
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#2A1E4A">
<title>${escapeHtml(meta.displayName)} Website Template | NEXORA Salon OS</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/template-pages.css">
<link rel="preload" href="${escapeHtml(image)}" as="image" type="${imageType}" fetchpriority="high">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NEXORA Salon OS">
<meta property="og:title" content="${escapeHtml(meta.displayName)} Website Template | NEXORA">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(`${NEXORA_PUBLIC_ORIGIN}${image}`)}">
<meta property="og:image:alt" content="${escapeHtml(`${meta.shortName} salon website template preview`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.displayName)} Website Template | NEXORA">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(`${NEXORA_PUBLIC_ORIGIN}${image}`)}">
<script type="application/ld+json">${safeJson(schema)}</script>
</head>
<body>
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="template-page-header"><a class="template-page-brand" href="/" aria-label="NEXORA Salon OS home">NEXORA <span>Salon OS</span></a><nav aria-label="Main navigation"><a href="/">All templates</a><a href="/login">Sign in</a></nav></header>
<main id="main-content" class="template-page" data-template-id="${escapeHtml(meta.templateId)}">
<section class="template-hero" aria-labelledby="template-title">
<div class="template-copy"><p class="template-eyebrow" style="color:${escapeHtml(category?.color || '#6d4b7e')}">${escapeHtml(meta.categoryName)} · Template ${escapeHtml(meta.templateNumber)}</p><h1 id="template-title">${escapeHtml(meta.displayName)}</h1><p class="template-lede">${escapeHtml(meta.shortDescription)}</p><p>${escapeHtml(meta.bestFor)} Preview the design, then customise the content, imagery and services for your own business before publishing.</p><div class="template-actions"><a class="template-button" href="${escapeHtml(signupUrl)}">Start with this template</a><a class="template-button secondary" href="/">Browse all 16 templates</a></div></div>
<div class="template-preview"><img src="${escapeHtml(image)}" alt="${escapeHtml(`${meta.shortName} salon website template preview`)}" fetchpriority="high" decoding="async"></div>
</section>
<section class="template-details" aria-labelledby="sample-services"><h2 id="sample-services">Example services in this ${escapeHtml(meta.categoryName.toLowerCase())} design</h2><p>These are sample service categories to help you explore the layout. Add your own menu, timings and prices in the owner workspace.</p><ul class="template-services">${meta.services.map((service) => `<li>${escapeHtml(service)}</li>`).join('')}</ul><p class="template-note">NEXORA is a salon website and business-management platform. Every template can be customised before you publish.</p></section>
</main>
<footer class="template-page-footer"><p><strong>NEXORA Salon OS</strong> · Salon websites and business tools</p><p><a href="/">Explore all templates</a> · <a href="/login?auth=signup">Create an account</a></p></footer>
</body>
</html>`;
  const slug = meta.templateId.replace(/_/g, '-');
  await writeFile(join(pagesDirectory, `${slug}.html`), html);
}

const buildId = getAppBuildId();
await writeFile(join(dist, 'app-version.json'), `${JSON.stringify({ version: buildId })}\n`);
console.log(`Prerendered the public homepage, the SalonOS landing page, the pricing landing page, the privacy notice, ${NEXORA_ECOSYSTEM_ROUTES.length} NEXORA marketing route documents (${NEXORA_ECOSYSTEM_ROUTES.join(', ')}), ${NEXORA_TEMPLATE_META.length} template landing pages, and build ${buildId}.`);
