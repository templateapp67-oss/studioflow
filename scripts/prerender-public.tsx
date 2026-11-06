import React from 'react';
import { renderToString } from 'react-dom/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'vite';
import { NEXORA_CATEGORIES, NEXORA_TEMPLATE_META, nexoraTemplatePagePath } from '../src/lib/nexoraTemplateCatalogue';
import { NEXORA_PUBLIC_ORIGIN } from '../src/lib/publicSeo';
import { NEXORA_PUBLIC_TEMPLATES_BY_ID } from '../src/lib/nexoraPublicTemplates';
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
try {
  const homepage = await vite.ssrLoadModule('/src/components/PublicHomepage.tsx');
  renderedHomepage = renderToString(React.createElement(homepage.PublicHomepage));
} finally {
  await vite.close();
}
const rootMarker = '<div id="root"></div>';
if (!indexHtml.includes(rootMarker)) throw new Error('Expected an empty #root in Vite index.html before prerendering.');
await writeFile(indexPath, indexHtml.replace(rootMarker, `<div id="root">${renderedHomepage}</div>`));

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
console.log(`Prerendered the public homepage, ${NEXORA_TEMPLATE_META.length} template landing pages, and build ${buildId}.`);
