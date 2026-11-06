import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppRouter, requiresFullApplication } from '../src/AppRouter';
import { PublicHomepage, PUBLIC_SIGNUP_PATH, templateSignupPath } from '../src/components/PublicHomepage';
import { AuthPage } from '../src/components/AuthPage';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { NEXORA_TEMPLATE_META } from '../src/lib/nexoraTemplateCatalogue';
import { nexoraPreviewImage } from '../src/lib/nexoraPreviewImages';
import { resolveSiteSlug } from '../src/lib/resolveSite';
import { generateSitemap } from '../server/sitemap';
import type { BusinessTypeId } from '../src/types';
import {
  applyPublicSeoMetadata,
  NEXORA_HOME_OG_IMAGE,
  NEXORA_HOME_SEO,
  NEXORA_LOGIN_SEO,
  NEXORA_PUBLIC_ORIGIN,
} from '../src/lib/publicSeo';

const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll("'", '&#x27;').replaceAll('"', '&quot;');
assert.equal(requiresFullApplication({ pathname: '/', search: '', hash: '', hostname: 'www.nexora.app' }), false, 'public root stays lightweight');
assert.equal(requiresFullApplication({ pathname: '/', search: '?site=salon', hash: '', hostname: 'www.nexora.app' }), true, 'published salon route keeps using the application');
assert.equal(requiresFullApplication({ pathname: '/login', search: '', hash: '', hostname: 'www.nexora.app' }), true, 'auth routes keep using the application');
assert.equal(requiresFullApplication({ pathname: '/', search: '?app=1', hash: '', hostname: 'www.nexora.app' }), true, 'explicit application entry stays supported');
assert.equal(requiresFullApplication({ pathname: '/', search: '', hash: '', hostname: 'owner.nexorasalon.online' }), true, 'published salon subdomains keep using the application');
assert.equal(NEXORA_PUBLIC_ORIGIN, 'https://nexorasalon.online', 'SEO must use the production domain, never a Vercel preview host');
const homeHtml = renderToStaticMarkup(<PublicHomepage />);
const authenticatedHomeHtml = renderToStaticMarkup(<PublicHomepage authenticated />);
const renderRoutedRoot = (session: string | null) => {
  const previousWindow = (globalThis as any).window;
  try {
    (globalThis as any).window = {
      location: { pathname: '/', search: '', hash: '', hostname: 'www.nexora.app' },
      localStorage: { getItem: (key: string) => key === 'studioflow_supabase_session' ? session : null },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    return renderToStaticMarkup(<AppRouter />);
  } finally {
    if (previousWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = previousWindow;
  }
};
const signedInRootHtml = renderRoutedRoot('persisted-session');
const signedOutRootHtml = renderRoutedRoot(null);
assert.ok(signedInRootHtml.includes('public-home-title'), 'authenticated visitors stay on the public root');
assert.ok(signedInRootHtml.includes('Owner Workspace'), 'the routed homepage detects a persisted owner session');
assert.ok(signedOutRootHtml.includes('public-home-title'), 'signed-out visitors stay on the public root');
assert.ok(signedOutRootHtml.includes('Sign In'), 'the routed homepage offers sign-in when no session exists');
assert.equal((homeHtml.match(/<h1\b/g) || []).length, 1, 'homepage has exactly one H1');
assert.ok(homeHtml.includes('<h1 id="public-home-title"'), 'homepage H1 is the marketing headline');
assert.ok(homeHtml.includes('A beautiful salon website, made for your brand'), 'premium hero headline renders');
assert.ok(authenticatedHomeHtml.includes('Owner Workspace'), 'signed-in owners receive a workspace action');
assert.ok(authenticatedHomeHtml.includes('Open Workspace'), 'signed-in owners can open the full workspace');
assert.ok(!authenticatedHomeHtml.includes('Get Started'), 'signed-in owners do not see the signup CTA');
assert.ok(homeHtml.includes('href="#public-main-content">Skip to main content</a>'), 'homepage provides a keyboard skip link');
assert.ok(homeHtml.includes('<main id="public-main-content">'), 'skip link target exists');
assert.ok(!homeHtml.includes('Launch Your NEXORA Salon Website in 30 Minutes'), 'SEO title copy is not substituted for the premium hero');
assert.ok(!homeHtml.includes('Sign in to NEXORA Salon OS.'), 'login headline never appears on homepage');
assert.equal((homeHtml.match(/data-template-id="/g) || []).length, 16, 'all 16 registry templates render once');
assert.equal((homeHtml.match(/data-category-shortcut="/g) || []).length, 15, 'all existing category shortcuts render');
assert.equal((homeHtml.match(/data-category-filter="/g) || []).length, 16, 'All Templates + 15 existing filters');
for (const meta of NEXORA_TEMPLATE_META) {
  assert.ok(homeHtml.includes(`data-template-id="${meta.templateId}"`), `${meta.templateId} card exists`);
  assert.ok(homeHtml.includes(esc(meta.displayName)), `${meta.templateId} keeps its existing name`);
  assert.ok(homeHtml.includes(esc(meta.categoryName)), `${meta.templateId} keeps its existing category`);
  assert.ok(homeHtml.includes(esc(nexoraPreviewImage(CATEGORY_TEMPLATES[meta.templateId]))), `${meta.templateId} has reliable preview artwork`);
}
for (const text of ['Categories', '16 Templates', 'How It Works', 'Features', 'Sign In', 'Get Started', 'Explore Templates', 'View All Templates', 'Choose Your Template', 'Customise Your Website', 'Launch Your Website']) {
  assert.ok(homeHtml.includes(text), `homepage includes ${text}`);
}
for (const feature of ['Ready-made salon websites', 'Easy website customisation', 'Services &amp; pricing', 'Staff profiles', 'Online appointment booking', 'Gallery &amp; customer reviews', 'Mobile-friendly websites', 'Easy business management']) {
  assert.ok(homeHtml.includes(feature), `supported feature: ${feature}`);
}
assert.ok(homeHtml.indexOf('id="salon-categories"') < homeHtml.indexOf('id="nexora-template-library"'));
assert.ok(homeHtml.indexOf('id="nexora-template-library"') < homeHtml.indexOf('id="how-it-works"'));
assert.ok(homeHtml.indexOf('id="how-it-works"') < homeHtml.indexOf('id="features"'));
assert.ok(homeHtml.indexOf('id="features"') < homeHtml.indexOf('<footer'));

assert.equal(PUBLIC_SIGNUP_PATH, '/login?auth=signup');
for (const id of Object.keys(CATEGORY_TEMPLATES) as BusinessTypeId[]) {
  const path = templateSignupPath(id);
  assert.ok(path.startsWith('/login?auth=signup&template='));
  assert.ok(path.endsWith('&create=1'));
  assert.ok(path.includes(encodeURIComponent(id)));
}
assert.equal(resolveSiteSlug('/login'), null, '/login is never interpreted as a published salon slug');
assert.equal(resolveSiteSlug('/'), null);

// AuthPage reads the current query for mode and selected-template redirect state.
(globalThis as any).location = { search: '', hash: '', pathname: '/login', href: 'https://owner.test/login', origin: 'https://owner.test' };
const loginHtml = renderToStaticMarkup(<AuthPage />);
assert.equal((loginHtml.match(/<h1\b/g) || []).length, 1, 'login has exactly one H1');
assert.ok(loginHtml.includes('Sign in to NEXORA Salon OS.'), 'exact login H1');
assert.ok(loginHtml.includes('existing salon website, team and business information'));
assert.ok(!loginHtml.includes('Launch Your NEXORA Salon Website in 30 Minutes'), 'marketing headline never appears on login');

// Lightweight DOM harness verifies route-owned metadata and preview-host-independent canonicals.
class MetaElement {
  attributes = new Map<string, string>();
  constructor(public tagName: string) {}
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  getAttribute(key: string) { return this.attributes.get(key) || null; }
}
const headChildren: MetaElement[] = [];
const documentHarness = {
  title: '',
  head: { appendChild: (element: MetaElement) => { headChildren.push(element); } },
  createElement: (tag: string) => new MetaElement(tag),
  querySelector: (selector: string) => {
    const meta = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
    if (meta) return headChildren.find(element => element.tagName === 'meta' && element.getAttribute(meta[1]) === meta[2]) || null;
    if (selector === 'link[rel="canonical"]') return headChildren.find(element => element.tagName === 'link' && element.getAttribute('rel') === 'canonical') || null;
    return null;
  },
  getElementById: () => null,
};
(globalThis as any).document = documentHarness;
const value = (attribute: 'name' | 'property', key: string) => documentHarness.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content');

applyPublicSeoMetadata(NEXORA_HOME_SEO);
assert.equal(documentHarness.title, 'NEXORA Salon OS – Launch Your NEXORA Salon Website in 30 Minutes');
assert.equal(value('name', 'description'), NEXORA_HOME_SEO.description);
assert.equal(value('property', 'og:title'), NEXORA_HOME_SEO.ogTitle);
assert.equal(value('property', 'og:description'), NEXORA_HOME_SEO.ogDescription);
assert.equal(value('name', 'twitter:title'), NEXORA_HOME_SEO.twitterTitle);
assert.equal(value('name', 'twitter:description'), 'Create your salon website with 16 ready-made templates. Customise and launch easily with NEXORA Salon OS.');
assert.equal(value('name', 'twitter:card'), 'summary_large_image');
assert.equal(value('property', 'og:image'), NEXORA_HOME_OG_IMAGE);
assert.equal(value('name', 'twitter:image'), NEXORA_HOME_OG_IMAGE);
assert.equal(documentHarness.querySelector('link[rel="canonical"]')?.getAttribute('href'), `${NEXORA_PUBLIC_ORIGIN}/`);

applyPublicSeoMetadata(NEXORA_LOGIN_SEO);
assert.equal(documentHarness.title, 'NEXORA Salon OS — Sign in');
assert.equal(value('name', 'robots'), 'noindex,follow');
assert.equal(value('name', 'description'), 'Sign in to NEXORA to keep your website, team and business data with your account across devices.');
assert.equal(value('property', 'og:title'), NEXORA_LOGIN_SEO.ogTitle);
assert.equal(value('property', 'og:description'), NEXORA_LOGIN_SEO.ogDescription);
assert.equal(value('name', 'twitter:title'), NEXORA_LOGIN_SEO.twitterTitle);
assert.equal(value('name', 'twitter:description'), NEXORA_LOGIN_SEO.twitterDescription);
assert.equal(documentHarness.querySelector('link[rel="canonical"]')?.getAttribute('href'), `${NEXORA_PUBLIC_ORIGIN}/login`);

const indexHtml = readFileSync('index.html', 'utf8');
assert.ok(indexHtml.includes(`<title>${NEXORA_HOME_SEO.title}</title>`));
assert.ok(indexHtml.includes(NEXORA_HOME_SEO.description));
assert.ok(indexHtml.includes(NEXORA_HOME_SEO.twitterDescription));
assert.ok(indexHtml.includes(NEXORA_HOME_OG_IMAGE));
assert.ok(indexHtml.includes(`<link rel="canonical" href="${NEXORA_PUBLIC_ORIGIN}/" />`));
assert.ok(indexHtml.includes('type="application/ld+json"'), 'homepage exposes static structured data');
const jsonLdMatch = indexHtml.match(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/);
assert.ok(jsonLdMatch, 'homepage JSON-LD script is present');
const homepageSchema = JSON.parse(jsonLdMatch[1]) as { url?: string };
assert.equal(homepageSchema.url, `${NEXORA_PUBLIC_ORIGIN}/`, 'homepage structured data uses the production origin');
assert.ok(indexHtml.includes('/fonts/hanken-grotesk-latin-wght-normal.woff2'), 'homepage preloads its local font');
assert.ok(!indexHtml.includes('window.fetch'), 'fetch is not monkey-patched');
assert.ok(!indexHtml.includes('fonts.googleapis.com/css'), 'marketing HTML has no render-blocking third-party font stylesheet');
assert.ok(!indexHtml.includes('15 template categories'), 'outdated homepage SEO copy removed');
const loginDocument = readFileSync('login.html', 'utf8');
assert.ok(loginDocument.includes(`<title>${NEXORA_LOGIN_SEO.title}</title>`), 'raw login HTML owns the sign-in title');
assert.ok(loginDocument.includes(NEXORA_LOGIN_SEO.description), 'raw login HTML owns the sign-in description');
assert.ok(loginDocument.includes(`<link rel="canonical" href="${NEXORA_PUBLIC_ORIGIN}/login" />`));
assert.ok(loginDocument.includes('<meta name="robots" content="noindex,follow" />'));
assert.ok(!loginDocument.includes('window.fetch'), 'login does not monkey-patch fetch');
assert.ok(loginDocument.includes(`<meta name="twitter:title" content="${NEXORA_LOGIN_SEO.twitterTitle}" />`));
assert.ok(!loginDocument.includes(NEXORA_HOME_SEO.description), 'login never reuses homepage metadata');
assert.ok(readFileSync('server/sitemap.ts', 'utf8').includes('origin + "/",'), 'public root is included in sitemap');
const robotsTxt = readFileSync('public/robots.txt', 'utf8');
assert.ok(robotsTxt.includes(`Sitemap: ${NEXORA_PUBLIC_ORIGIN}/sitemap.xml`), 'robots.txt sitemap URL uses the production origin');
const generatedSitemap = await generateSitemap({
  SITE_URL: 'https://studioflow-ashen-pi.vercel.app',
  SUPABASE_URL: 'https://supabase.example',
  SUPABASE_ANON_KEY: 'test-key',
}, async () => new Response('[]', { status: 200 }));
assert.ok(generatedSitemap.includes(`<loc>${NEXORA_PUBLIC_ORIGIN}/</loc>`), 'generated sitemap uses the production origin');
assert.ok(!generatedSitemap.includes('vercel.app'), 'generated sitemap ignores preview-host environment overrides');
assert.ok(![indexHtml, loginDocument, robotsTxt].some(source => source.includes('studioflow-ashen-pi.vercel.app')), 'static SEO files contain no preview-domain URLs');

console.log('PASS: public homepage hierarchy/content, 16 templates/15 categories, signup template handoff, exact login H1, distinct home/login SEO, social images, canonical URLs and sitemap.');
