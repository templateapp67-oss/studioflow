import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicHomepage, PUBLIC_SIGNUP_PATH, templateSignupPath } from '../src/components/PublicHomepage';
import { AuthPage } from '../src/components/AuthPage';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { NEXORA_TEMPLATE_META } from '../src/lib/nexoraTemplateCatalogue';
import { nexoraPreviewImage } from '../src/lib/nexoraPreviewImages';
import { resolveSiteSlug } from '../src/lib/resolveSite';
import type { BusinessTypeId } from '../src/types';
import {
  applyPublicSeoMetadata,
  NEXORA_HOME_OG_IMAGE,
  NEXORA_HOME_SEO,
  NEXORA_LOGIN_SEO,
  NEXORA_PUBLIC_ORIGIN,
} from '../src/lib/publicSeo';

const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll("'", '&#x27;').replaceAll('"', '&quot;');
const homeHtml = renderToStaticMarkup(<PublicHomepage />);
assert.equal((homeHtml.match(/<h1\b/g) || []).length, 1, 'homepage has exactly one H1');
assert.ok(homeHtml.includes('<h1 id="public-home-title"'), 'homepage H1 is the marketing headline');
assert.ok(homeHtml.includes('Launch Your Salon Website in 30 Minutes'));
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
assert.ok(!loginHtml.includes('Launch Your Salon Website in 30 Minutes'), 'marketing headline never appears on login');

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
assert.equal(documentHarness.title, 'NEXORA Salon OS – Launch Your Salon Website in 30 Minutes');
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
assert.ok(!indexHtml.includes('15 template categories'), 'outdated homepage SEO copy removed');
const loginDocument = readFileSync('login.html', 'utf8');
assert.ok(loginDocument.includes(`<title>${NEXORA_LOGIN_SEO.title}</title>`), 'raw login HTML owns the sign-in title');
assert.ok(loginDocument.includes(NEXORA_LOGIN_SEO.description), 'raw login HTML owns the sign-in description');
assert.ok(loginDocument.includes(`<link rel="canonical" href="${NEXORA_PUBLIC_ORIGIN}/login" />`));
assert.ok(loginDocument.includes(`<meta name="twitter:title" content="${NEXORA_LOGIN_SEO.twitterTitle}" />`));
assert.ok(!loginDocument.includes(NEXORA_HOME_SEO.description), 'login never reuses homepage metadata');
assert.ok(readFileSync('server/sitemap.ts', 'utf8').includes('origin + "/",'), 'public root is included in sitemap');

console.log('PASS: public homepage hierarchy/content, 16 templates/15 categories, signup template handoff, exact login H1, distinct home/login SEO, social images, canonical URLs and sitemap.');
