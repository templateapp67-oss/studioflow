import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument } from 'htmlparser2';
import { AppRouter, requiresFullApplication } from '../src/AppRouter';
import { PublicHomepage, PUBLIC_SIGNUP_PATH, templateSignupPath } from '../src/components/PublicHomepage';
import { NEXORA_TAWK_WIDGET_URL } from '../src/components/NexoraTawkWidget';
import {
  buildWhatsAppClickToChatUrl,
  NEXORA_OFFICIAL_WHATSAPP_MESSAGE,
  NEXORA_OFFICIAL_WHATSAPP_NUMBER,
  NEXORA_OFFICIAL_WHATSAPP_URL,
} from '../src/lib/whatsappContact';
import { AuthPage } from '../src/components/AuthPage';
import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { NEXORA_TEMPLATE_META, nexoraTemplatePagePath } from '../src/lib/nexoraTemplateCatalogue';
import { NEXORA_ECOSYSTEM_ROUTES } from '../src/lib/nexoraEcosystemSeo';
import { nexoraPreviewImage } from '../src/lib/nexoraPreviewImages';
import { resolveSiteSlug } from '../src/lib/resolveSite';
import { generateSitemap, isEphemeralOrigin, sitemapOrigin, sitemapXml } from '../server/sitemap';
import { robotsTagForRequest } from '../server/robotsHeaders';
import { AUTH_CALLBACK_FRAGMENT_KEYS, AUTH_CALLBACK_QUERY_KEYS, hasAuthCallbackFragment, hasAuthCallbackQuery } from '../src/lib/authEntry';
import type { BusinessTypeId, SalonProfile } from '../types';
import {
  applyNoIndexMetadata,
  applyPublicSeoMetadata,
  hasNoIndexPathPrefix,
  NEXORA_HOME_OG_IMAGE,
  NEXORA_HOME_SEO,
  NEXORA_LOGIN_SEO,
  NEXORA_PUBLIC_ORIGIN,
  NOINDEX_QUERY_KEYS,
  NOINDEX_ROBOTS,
} from '../src/lib/publicSeo';
import { applySeoMetadata } from '../src/lib/useSeoMetadata';

const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll("'", '&#x27;').replaceAll('"', '&quot;');
assert.equal(requiresFullApplication({ pathname: '/', search: '', hash: '', hostname: 'www.nexora.app' }), false, 'public root stays lightweight');
assert.equal(requiresFullApplication({ pathname: '/', search: '?site=salon', hash: '', hostname: 'www.nexora.app' }), true, 'published salon route keeps using the application');
assert.equal(requiresFullApplication({ pathname: '/login', search: '', hash: '', hostname: 'www.nexora.app' }), true, 'auth routes keep using the application');
assert.equal(requiresFullApplication({ pathname: '/', search: '?app=1', hash: '', hostname: 'www.nexora.app' }), true, 'explicit application entry stays supported');
assert.equal(requiresFullApplication({ pathname: '/', search: '', hash: '', hostname: 'owner.nexorasalon.online' }), true, 'published salon subdomains keep using the application');

// Regression matrix: the prerendered public root must not swallow legacy query
// entries or Supabase auth callbacks/errors after the lightweight router split.
const publicRoot = { pathname: '/', hash: '', hostname: 'www.nexora.app' };
for (const search of ['', '?ref=ABC123', '?utm_source=audit']) {
  assert.equal(requiresFullApplication({ ...publicRoot, search }), false, `public root stays lightweight for ${search || '(no query)'}`);
}
assert.equal(requiresFullApplication({ ...publicRoot, search: '', hash: '#nexora-template-library' }), false, 'marketing fragments stay lightweight');
for (const key of ['site', 's', 'subdomain', 'app', 'customer', 'customer_ref', 'create', 'owner', 'panel', 'template', 'category', 'module', ...AUTH_CALLBACK_QUERY_KEYS]) {
  assert.equal(requiresFullApplication({ ...publicRoot, search: `?${key}=1` }), true, `legacy/application query must load the full app: ${key}`);
}
for (const key of AUTH_CALLBACK_FRAGMENT_KEYS) {
  assert.equal(requiresFullApplication({ ...publicRoot, search: '', hash: `#${key}=callback` }), true, `auth fragment must load the full app: ${key}`);
  assert.equal(hasAuthCallbackFragment(`#${key}=callback`), true, `application must treat ${key} fragment as an auth entry`);
}
for (const pathname of ['/login', '/login/', '/index.html', '/template-pages/hair-salon.html', '/salon-slug']) {
  assert.equal(requiresFullApplication({ pathname, search: '', hash: '', hostname: 'www.nexora.app' }), pathname === '/index.html' ? false : true, `path routing contract: ${pathname}`);
}
for (const key of AUTH_CALLBACK_QUERY_KEYS) {
  assert.equal(hasAuthCallbackQuery(`?${key}=1`), true, `application must treat ${key} as an auth entry`);
}
assert.equal(hasAuthCallbackQuery('?ref=ABC123'), false, 'business referrals alone stay on the public signup path');
assert.equal(NEXORA_PUBLIC_ORIGIN, 'https://nexorasalon.online', 'SEO must use the production domain, never a Vercel preview host');
const homeHtml = renderToStaticMarkup(<PublicHomepage />);
const authenticatedHomeHtml = renderToStaticMarkup(<PublicHomepage authenticated />);
const whatsappLinks: any[] = [];
const collectWhatsappLinks = (node: any) => {
  if (node.type === 'tag' && node.name === 'a' && node.attribs?.['data-nexora-whatsapp-cta']) whatsappLinks.push(node.attribs);
  for (const child of node.children ?? []) collectWhatsappLinks(child);
};
collectWhatsappLinks(parseDocument(homeHtml, { decodeEntities: true }));
assert.deepEqual(
  whatsappLinks.map((link) => link['data-nexora-whatsapp-cta']),
  ['desktop-header', 'hero', 'footer', 'floating'],
  'homepage renders one tracked WhatsApp link at each approved desktop and page placement',
);
for (const link of whatsappLinks) {
  assert.equal(link.href, NEXORA_OFFICIAL_WHATSAPP_URL, 'every tracked WhatsApp action uses the official click-to-chat destination');
  assert.equal(link.target, '_blank', 'every WhatsApp action opens a new tab');
  assert.ok(link.rel.includes('noopener') && link.rel.includes('noreferrer'), 'every new-tab WhatsApp link is isolated from its opener');
}

// Live Chat is a hosted tawk.to widget on the public NEXORA homepage only.
assert.equal(
  NEXORA_TAWK_WIDGET_URL,
  'https://embed.tawk.to/6af928650ca0f03c41f84ba9/1k7ekbjg3',
  'homepage uses the exact tawk.to widget supplied for NEXORA',
);
assert.ok(!homeHtml.includes('embed.tawk.to'), 'the external widget is loaded client-side, not duplicated into prerendered HTML');

// NEXORA support click-to-chat must use the supplied E.164 business number and
// preserve the exact prefilled text after WhatsApp decodes its URL parameter.
assert.equal(NEXORA_OFFICIAL_WHATSAPP_NUMBER, '+91 7852877721');
assert.equal(new URL(NEXORA_OFFICIAL_WHATSAPP_URL).pathname, '/917852877721');
assert.equal(new URL(NEXORA_OFFICIAL_WHATSAPP_URL).searchParams.get('text'), NEXORA_OFFICIAL_WHATSAPP_MESSAGE);
assert.equal(
  NEXORA_OFFICIAL_WHATSAPP_URL,
  'https://wa.me/917852877721?text=Hi%2C%20I%20found%20your%20website%20and%20I%27d%20like%20more%20information%20about%20NEXORA%20Salon%20OS.',
  'official URL uses the correct international number and encoded message',
);
assert.equal(
  buildWhatsAppClickToChatUrl({ phoneNumber: '+91 7852877721' }),
  'https://wa.me/917852877721',
  'the reusable URL helper supports a blank optional message',
);
assert.equal(
  buildWhatsAppClickToChatUrl({ phoneNumber: '+1 (415) 555-0199', prefilledMessage: '  Hello there  ' }),
  'https://wa.me/14155550199?text=Hello%20there',
  'the reusable URL helper trims and encodes message text',
);
assert.throws(
  () => buildWhatsAppClickToChatUrl({ phoneNumber: '7852877721' }),
  /international format/,
  'the reusable URL helper rejects a number without a country code',
);
const expectedWhatsappHref = `href="${NEXORA_OFFICIAL_WHATSAPP_URL}"`;
assert.equal(
  homeHtml.split(expectedWhatsappHref).length - 1,
  4,
  'homepage renders one WhatsApp link each in desktop header, hero, footer and floating shortcut',
);
assert.equal(
  (homeHtml.match(/data-nexora-whatsapp-cta="/g) || []).length,
  4,
  'server-rendered WhatsApp CTA placements are deliberate and non-duplicated',
);
assert.ok(homeHtml.includes('Questions? Chat with NEXORA on WhatsApp'), 'homepage hero provides a direct WhatsApp option');
assert.ok(homeHtml.includes('WhatsApp Support'), 'homepage footer provides a WhatsApp contact link');
assert.ok(homeHtml.includes('Help Centre'), 'homepage nav links to the public knowledge base');
assert.ok(homeHtml.includes('aria-label="Chat with NEXORA on WhatsApp"'), 'icon-only WhatsApp shortcut has an accessible name');
const homepageSource = readFileSync('src/components/PublicHomepage.tsx', 'utf8');
const siteHeaderSource = readFileSync('src/components/nexora-landing/sections/SiteHeader.tsx', 'utf8');
const mainSource = readFileSync('src/main.tsx', 'utf8');
assert.ok(mainSource.includes('<AppUpdateManagerAfterHydration />') && mainSource.includes('useEffect(() => setReady(true), [])'), 'app-update polling mounts after the hydration-safe first commit, including public pages');
const supportWidgetSource = readFileSync('src/components/NexoraTawkWidget.tsx', 'utf8');
assert.ok(supportWidgetSource.includes("script.src = NEXORA_TAWK_WIDGET_URL"), 'public marketing pages inject the hosted Live Chat script');
assert.ok(supportWidgetSource.includes("position: 'bl'"), 'Live Chat is positioned bottom-left on desktop and mobile');
assert.ok(supportWidgetSource.includes("tawkApi.hideWidget?.()"), 'Live Chat is hidden when leaving public marketing pages');
assert.ok(supportWidgetSource.includes("script.onerror = () => script.remove()"), 'a failed widget request can be retried after route remount');
assert.ok(supportWidgetSource.includes("document.getElementById(NEXORA_TAWK_WIDGET_SCRIPT_ID)"), 'widget script is not injected more than once');
const routerSource = readFileSync('src/AppRouter.tsx', 'utf8');
assert.ok(routerSource.includes('withNexoraPublicSupport(<NexoraPricingLandingPage />)'), 'pricing page gets Tawk chat');
assert.ok(routerSource.includes('withNexoraPublicSupport(<PublicHomepage authenticated={authenticated} />)'), 'homepage gets Tawk chat');
assert.ok(!routerSource.includes('withNexoraPublicSupport(<FullApplication />)'), 'owner app is excluded from the public Tawk widget');
assert.ok(homepageSource.includes("name: 'data-nexora-whatsapp-cta'") && homepageSource.includes("compactValue: 'mobile-menu'"), 'homepage configures a tracked WhatsApp action for the compact navigation');
assert.ok(siteHeaderSource.includes('secondaryAction.dataAttribute.compactValue') && siteHeaderSource.includes('{...secondaryActionAttributes}'), 'shared header applies the compact tracking value to its action link');
assert.ok(homepageSource.includes('!menuOpen && !previewId && !footerVisible'), 'floating shortcut steps aside for the mobile menu, template preview and footer');
assert.ok(homepageSource.includes("document.querySelector('.public-homepage footer')"), 'floating shortcut visibility tracks the real homepage footer');
const homepageCss = readFileSync('src/components/publicHomepage.css', 'utf8');
assert.match(homepageCss, /\.public-homepage \.nexora-whatsapp-fab\s*\{[^}]*position:\s*fixed/s, 'floating WhatsApp shortcut is fixed to the viewport');
assert.ok(homepageCss.includes('env(safe-area-inset-bottom'), 'floating shortcut respects mobile safe-area inset');
assert.ok(homepageCss.includes('z-index: 40'), 'floating shortcut stays below the sticky header and skip link');
const renderRoutedRoot = (session: string | null) => {
  const previousWindow = (globalThis as any).window;
  try {
    (globalThis as any).window = {
      location: { pathname: '/', search: '', hash: '', hostname: 'www.nexora.app' },
      sessionStorage: { getItem: (key: string) => key === 'studioflow_supabase_session' ? session : null },
      localStorage: { getItem: (_key: string) => null, removeItem: (_key: string) => undefined },
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
assert.ok(!signedInRootHtml.includes('Owner Workspace'), 'SSR does not read browser-only owner state before hydration');
assert.ok(signedInRootHtml.includes('Sign In'), 'SSR matches the signed-out prerender until the owner CTA updates after hydration');
assert.ok(signedOutRootHtml.includes('public-home-title'), 'signed-out visitors stay on the public root');
assert.ok(signedOutRootHtml.includes('Sign In'), 'the routed homepage offers sign-in when no session exists');
assert.equal((homeHtml.match(/<h1\b/g) || []).length, 1, 'homepage has exactly one H1');
assert.ok(homeHtml.includes('<h1 id="public-home-title"'), 'homepage H1 is the marketing headline');
assert.match(homeHtml, /<nav class="nx-breadcrumbs" aria-label="Breadcrumb">[\s\S]*?aria-current="page"[\s\S]*?<\/nav>/, 'homepage exposes its current breadcrumb as a labeled navigation landmark');
assert.ok(homeHtml.includes('Build your salon website and manage appointments, customers, billing and more.'), 'homepage renders the approved website-builder and salon-management headline');
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
(globalThis as any).location = { search: '?passwordUpdated=1', hash: '', pathname: '/', href: 'https://owner.test/?passwordUpdated=1', origin: 'https://owner.test' };
const passwordUpdatedHtml = renderToStaticMarkup(<AuthPage />);
assert.ok(passwordUpdatedHtml.includes('Password updated successfully. Sign in with your new password.'), 'legacy post-recovery redirect keeps its success state');

// Lightweight DOM harness verifies route-owned metadata, SPA transitions,
// deduplication and preview-host-independent canonicals.
class MetaElement {
  attributes = new Map<string, string>();
  id = '';
  type = '';
  textContent = '';
  constructor(public tagName: string) {}
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
    if (key === 'id') this.id = value;
  }
  getAttribute(key: string) { return this.attributes.get(key) || null; }
  remove() {
    const idx = headChildren.indexOf(this);
    if (idx >= 0) headChildren.splice(idx, 1);
  }
}
const headChildren: MetaElement[] = [];
const documentHarness = {
  title: '',
  head: {
    appendChild: (element: MetaElement) => { headChildren.push(element); },
    querySelectorAll: (selector: string) => {
      if (selector === 'script[type="application/ld+json"]') {
        return headChildren.filter(
          (element) => element.tagName === 'script' && (element.type === 'application/ld+json' || element.getAttribute('type') === 'application/ld+json'),
        );
      }
      return [];
    },
  },
  createElement: (tag: string) => new MetaElement(tag),
  querySelector: (selector: string) => {
    const meta = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
    if (meta) return headChildren.find(element => element.tagName === 'meta' && element.getAttribute(meta[1]) === meta[2]) || null;
    if (selector === 'link[rel="canonical"]') return headChildren.find(element => element.tagName === 'link' && element.getAttribute('rel') === 'canonical') || null;
    return null;
  },
  querySelectorAll: (selector: string) => {
    if (selector === 'meta[name]') return headChildren.filter(element => element.tagName === 'meta' && element.getAttribute('name') !== null);
    if (selector === 'link[rel]') return headChildren.filter(element => element.tagName === 'link' && element.getAttribute('rel') !== null);
    return [];
  },
  getElementById: (id: string) => headChildren.find(element => element.id === id) || null,
};
(globalThis as any).document = documentHarness;
const value = (attribute: 'name' | 'property', key: string) => documentHarness.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content');
const robotsTags = () => headChildren.filter(element => element.tagName === 'meta' && element.getAttribute('name')?.toLowerCase() === 'robots');
const canonicalTags = () => headChildren.filter(element => element.tagName === 'link' && element.getAttribute('rel')?.toLowerCase() === 'canonical');

applyPublicSeoMetadata(NEXORA_HOME_SEO);
assert.equal(documentHarness.title, NEXORA_HOME_SEO.title);
assert.equal(value('name', 'description'), NEXORA_HOME_SEO.description);
assert.equal(value('name', 'description'), NEXORA_HOME_SEO.description);
assert.equal(value('property', 'og:title'), NEXORA_HOME_SEO.ogTitle);
assert.equal(value('property', 'og:description'), NEXORA_HOME_SEO.ogDescription);
assert.equal(value('name', 'twitter:title'), NEXORA_HOME_SEO.twitterTitle);
assert.equal(value('name', 'twitter:description'), NEXORA_HOME_SEO.twitterDescription);
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

// Simulate stale duplicate robots, canonical and un-ID'd prerendered JSON-LD tags before navigating into an app view.
const extraRobots = documentHarness.createElement('meta');
extraRobots.setAttribute('name', 'ROBOTS');
extraRobots.setAttribute('content', 'index,follow');
documentHarness.head.appendChild(extraRobots);
const extraCanonical = documentHarness.createElement('link');
extraCanonical.setAttribute('rel', 'canonical');
extraCanonical.setAttribute('href', `${NEXORA_PUBLIC_ORIGIN}/stale`);
documentHarness.head.appendChild(extraCanonical);
const staticJsonLd = documentHarness.createElement('script');
staticJsonLd.type = 'application/ld+json';
staticJsonLd.textContent = '{"@context":"https://schema.org"}';
documentHarness.head.appendChild(staticJsonLd);

applyNoIndexMetadata('Owner Workspace — NEXORA Salon OS');
assert.equal(documentHarness.title, 'Owner Workspace — NEXORA Salon OS');
assert.equal(robotsTags().length, 1, 'applyNoIndexMetadata collapses duplicate robots tags into one');
assert.equal(robotsTags()[0].getAttribute('content'), NOINDEX_ROBOTS, 'private/app routes mark robots as noindex, nofollow');
assert.equal(canonicalTags().length, 0, 'noindex app routes strip all public canonical links');
assert.equal(documentHarness.getElementById('studioflow-seo-jsonld'), null, 'noindex app routes strip storefront JSON-LD');
assert.equal(documentHarness.head.querySelectorAll('script[type="application/ld+json"]').length, 0, 'noindex app routes strip un-IDd prerendered head JSON-LD');

// Private path prefixes (/owner, /admin, /staff, /api) enforce noindex on client too.
assert.equal(hasNoIndexPathPrefix('/owner'), true);
assert.equal(hasNoIndexPathPrefix('/ADMIN/demo-leads/'), true);
assert.equal(hasNoIndexPathPrefix('/partner-rewards'), false);
for (const privatePath of ['/owner', '/admin']) {
  (globalThis as any).window = {
    location: { origin: NEXORA_PUBLIC_ORIGIN, pathname: privatePath, search: '', href: `${NEXORA_PUBLIC_ORIGIN}${privatePath}` },
  };
  applySeoMetadata({ businessName: 'Leaked', businessType: 'unisex_salon', seo: {} } as SalonProfile);
  assert.equal(robotsTags().length, 1);
  assert.equal(robotsTags()[0].getAttribute('content'), NOINDEX_ROBOTS, `${privatePath} enforces client noindex, nofollow`);
  assert.equal(canonicalTags().length, 0, `${privatePath} strips canonical link`);
}

// SPA transition: NoIndex app view -> published ?site=glow storefront restores robots, canonical & JSON-LD.
(globalThis as any).window = {
  location: { origin: NEXORA_PUBLIC_ORIGIN, pathname: '/', search: '?site=glow', href: `${NEXORA_PUBLIC_ORIGIN}/?site=glow` },
};
const sampleSalonProfile = {
  businessName: 'Glow Studio',
  businessType: 'unisex_salon',
  city: 'Jaipur',
  subdomain: 'glow',
  tagline: 'Modern hair and skin studio in Jaipur',
  phone: '+91 98765 43210',
  address: 'MI Road, Jaipur',
  seo: {},
} as SalonProfile;
applySeoMetadata(sampleSalonProfile);
assert.equal(robotsTags().length, 1, 'published storefront keeps exactly one robots meta tag');
assert.equal(robotsTags()[0].getAttribute('content'), 'index,follow', 'navigating from app view to ?site= storefront restores index,follow');
assert.equal(canonicalTags().length, 1, 'published storefront restores a single canonical link');
assert.equal(canonicalTags()[0].getAttribute('href'), `${NEXORA_PUBLIC_ORIGIN}/?site=glow`, 'published ?site= storefront canonicalises to its own ?site= URL');
assert.ok(documentHarness.getElementById('studioflow-seo-jsonld')?.textContent.includes('Glow Studio'), 'published storefront restores #studioflow-seo-jsonld');

// Combined ?site=<slug> + any app/session query key must enforce noindex on the client too.
for (const key of [...NOINDEX_QUERY_KEYS, 'APP']) {
  (globalThis as any).window = {
    location: { origin: NEXORA_PUBLIC_ORIGIN, pathname: '/', search: `?site=glow&${key}=1`, href: `${NEXORA_PUBLIC_ORIGIN}/?site=glow&${key}=1` },
  };
  applySeoMetadata(sampleSalonProfile);
  assert.equal(robotsTags().length, 1, `?site=glow&${key}=1 keeps a single robots tag`);
  assert.equal(robotsTags()[0].getAttribute('content'), NOINDEX_ROBOTS, `?site=glow&${key}=1 forces noindex, nofollow`);
  assert.equal(canonicalTags().length, 0, `?site=glow&${key}=1 clears canonical link`);
  assert.equal(documentHarness.getElementById('studioflow-seo-jsonld'), null, `?site=glow&${key}=1 clears storefront JSON-LD`);
}

// SPA transition: NoIndex app view -> Public homepage restores index,follow, canonical, strips storefront JSON-LD and restores homepage JSON-LD.
applyPublicSeoMetadata(NEXORA_HOME_SEO);
assert.equal(robotsTags().length, 1, 'returning to public homepage keeps exactly one robots tag');
assert.equal(value('name', 'robots'), 'index,follow', 'returning to a public route restores index,follow');
assert.equal(canonicalTags().length, 1, 'returning to public homepage restores a single canonical link');
assert.equal(documentHarness.querySelector('link[rel="canonical"]')?.getAttribute('href'), `${NEXORA_PUBLIC_ORIGIN}/`, 'returning to a public route restores its canonical link');
assert.equal(documentHarness.getElementById('studioflow-seo-jsonld'), null, 'returning to public homepage removes storefront JSON-LD');
assert.equal(documentHarness.head.querySelectorAll('script[type="application/ld+json"]').length, 1, 'returning to public homepage maintains exactly one homepage JSON-LD block');
assert.ok(documentHarness.getElementById('nexora-home-jsonld')?.textContent.includes('SoftwareApplication'), 'homepage JSON-LD schema is restored');

for (const [reqPath, reqSearch, expected] of [
  ['/api', '', 'noindex, nofollow'],
  ['/api/health', '', 'noindex, nofollow'],
  ['/API/health', '', 'noindex, nofollow'],
  ['/admin', '', 'noindex, nofollow'],
  ['/admin/', '', 'noindex, nofollow'],
  ['/ADMIN', '', 'noindex, nofollow'],
  ['/admin/demo-leads', '', 'noindex, nofollow'],
  ['/Admin/Demo-Leads/', '', 'noindex, nofollow'],
  ['/owner', '', 'noindex, nofollow'],
  ['/owner/', '', 'noindex, nofollow'],
  ['//owner//settings/', '', 'noindex, nofollow'],
  ['/staff', '', 'noindex, nofollow'],
  ['/staff/', '', 'noindex, nofollow'],
  ['/staff/login', '', 'noindex, nofollow'],
  ['/Staff/Login/', '', 'noindex, nofollow'],
  ['/staff/accept', '?token=abc', 'noindex, nofollow'],
  ['/', '?app=1', 'noindex, nofollow'],
  ['/', '?APP=1', 'noindex, nofollow'],
  ['/', '?app=1&site=glow', 'noindex, nofollow'],
  ['/', '?site=glow&app=1', 'noindex, nofollow'],
  ['/', '?site=glow&customer=1', 'noindex, nofollow'],
  ['/', '?site=glow&owner=glow', 'noindex, nofollow'],
  ['/', '?Site=glow&Owner=glow', 'noindex, nofollow'],
  ['/', '?site=glow&panel=demo', 'noindex, nofollow'],
  ['/', '?site=glow&create=1', 'noindex, nofollow'],
  ['/', '?site=glow&module=4', 'noindex, nofollow'],
  ['/', '?site=glow&invite=1', 'noindex, nofollow'],
  ['/', '?site=glow&recovery=1', 'noindex, nofollow'],
  ['/login', '?app=1', 'noindex, nofollow'],
  ['/login', '?auth=signup&template=hair_salon&create=1', 'noindex, nofollow'],
  ['/login', '', 'noindex, follow'],
  ['/login/', '', 'noindex, follow'],
  ['/LOGIN/', '', 'noindex, follow'],
  ['/login.html', '', 'noindex, follow'],
  ['/login', '?auth=signup', 'noindex, follow'],
  ['/sign-in', '', 'noindex, follow'],
  ['/sign-in/', '', 'noindex, follow'],
  ['/sign-up', '', 'noindex, follow'],
  ['/sign-up/', '', 'noindex, follow'],
  ['/', '', null],
  ['/pricing', '', null],
  ['/salon-os', '', null],
  ['/privacy', '', null],
  ['/salon-onboarding', '', null],
  ['/salon-growth', '', null],
  ['/growth-partner-rewards', '', null],
  ['/partner-rewards', '', null],
  ['/partner-rewards/', '', null],
  ['/template-pages/hair-salon.html', '', null],
  ['/sitemap.xml', '', null],
  ['/', '?site=glow', null],
] as const) {
  assert.equal(robotsTagForRequest(reqPath, reqSearch), expected, `X-Robots-Tag for ${reqPath}${reqSearch}`);
}

const indexHtml = readFileSync('index.html', 'utf8');
assert.ok(indexHtml.includes(`<title>${esc(NEXORA_HOME_SEO.title)}</title>`));
assert.equal((indexHtml.match(/<title>/g) || []).length, 1, 'homepage document has exactly one title');
assert.ok(indexHtml.includes(NEXORA_HOME_SEO.description));
assert.equal((indexHtml.match(/<meta name="description"/g) || []).length, 1, 'homepage document has exactly one meta description');
assert.ok(indexHtml.includes(NEXORA_HOME_SEO.twitterDescription));
assert.ok(indexHtml.includes(NEXORA_HOME_OG_IMAGE));
assert.ok(indexHtml.includes(`<link rel="canonical" href="${NEXORA_PUBLIC_ORIGIN}/" />`));
assert.ok(indexHtml.includes('type="application/ld+json"'), 'homepage exposes static structured data');
const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(jsonLdMatch, 'homepage JSON-LD script is present');
const homepageSchema = JSON.parse(jsonLdMatch[1]) as {
  '@graph'?: Array<Record<string, unknown>>;
  '@type'?: string;
  url?: string;
};
const homepageGraph = homepageSchema['@graph'] ?? [homepageSchema];
const homepageApplication = homepageGraph.find((node) => node['@type'] === 'SoftwareApplication');
const homepageBreadcrumb = homepageGraph.find((node) => node['@type'] === 'BreadcrumbList');
assert.equal(homepageApplication?.url, `${NEXORA_PUBLIC_ORIGIN}/`, 'homepage structured data uses the production origin');
assert.ok(homepageBreadcrumb, 'the homepage retains its existing structured-data publishing and adds the root breadcrumb');
assert.deepEqual(homepageBreadcrumb.itemListElement, [
  { '@type': 'ListItem', position: 1, name: 'Home', item: `${NEXORA_PUBLIC_ORIGIN}/` },
]);
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
const robotsLines = robotsTxt.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
const defaultAgentIndex = robotsLines.lastIndexOf('User-agent: *');
const defaultAgentRules = robotsLines.slice(defaultAgentIndex + 1);
const defaultDisallowRules = defaultAgentRules.filter((line) => line.startsWith('Disallow:')).map((line) => line.slice('Disallow:'.length).trim());
assert.ok(robotsLines.includes('User-agent: *'), 'robots.txt applies to all crawlers');
assert.ok(robotsLines.includes('Allow: /'), 'robots.txt allows public routes');
assert.deepEqual(defaultDisallowRules, ['/api/'], 'the default crawler group disallows only /api/ so crawlers can fetch noindex HTML/app routes to read X-Robots-Tag/meta noindex and crawl published ?site= storefronts');
assert.ok(robotsLines.includes(`Sitemap: ${NEXORA_PUBLIC_ORIGIN}/sitemap.xml`), 'robots.txt sitemap URL uses the canonical production origin');
assert.ok(!robotsTxt.includes('www.nexorasalon.online'), 'robots.txt avoids redirecting www host in Sitemap');
const generatedSitemap = await generateSitemap({
  SITE_URL: 'https://studioflow-ashen-pi.vercel.app',
  SUPABASE_URL: 'https://supabase.example',
  SUPABASE_ANON_KEY: 'test-key',
}, async () => new Response('[]', { status: 200 }));
assert.ok(generatedSitemap.includes(`<loc>${NEXORA_PUBLIC_ORIGIN}/</loc>`), 'generated sitemap uses the production origin');
assert.ok(!generatedSitemap.includes('vercel.app'), 'generated sitemap ignores preview-host environment overrides');
const fallbackSitemap = await generateSitemap({
  SITE_URL: NEXORA_PUBLIC_ORIGIN,
  SUPABASE_URL: 'https://supabase.example',
  SUPABASE_ANON_KEY: 'test-key',
}, async () => { throw new Error('catalogue offline'); });
assert.ok(fallbackSitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
assert.ok(fallbackSitemap.endsWith('</urlset>'), 'catalogue outage still returns valid sitemap XML');
const fallbackLocations = [...fallbackSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedPublicLocations = [
  `${NEXORA_PUBLIC_ORIGIN}/`,
  `${NEXORA_PUBLIC_ORIGIN}/salon-os`,
  `${NEXORA_PUBLIC_ORIGIN}/pricing`,
  `${NEXORA_PUBLIC_ORIGIN}/privacy`,
  ...NEXORA_ECOSYSTEM_ROUTES.map((path) => `${NEXORA_PUBLIC_ORIGIN}${path}`),
  ...NEXORA_TEMPLATE_META.map((meta) => `${NEXORA_PUBLIC_ORIGIN}${nexoraTemplatePagePath(meta.templateId)}`),
];
assert.deepEqual(fallbackLocations, expectedPublicLocations, 'fallback lists every public marketing/template page exactly once');
assert.equal(new Set(fallbackLocations).size, fallbackLocations.length, 'sitemap contains no duplicate public page URLs');
assert.ok(fallbackLocations.every((location) => new URL(location).protocol === 'https:'), 'every sitemap location is an absolute HTTPS URL');
// Both halves of the sitemap origin contract must hold at once: preview hosts are
// rejected, but a real custom domain is still honoured (verify-gap-completion asserts
// the custom-domain half, so hardcoding the canonical here regresses that suite).
for (const preview of ['https://studioflow-ashen-pi.vercel.app', 'https://x.preview.vercel.app', 'https://3000-sandbox.e2b.app', 'https://site.netlify.app', 'https://site.pages.dev', 'http://localhost:3000']) {
  if (preview.startsWith('http://')) continue; // canonicalOrigin already rejects non-HTTPS
  assert.equal(isEphemeralOrigin(preview), true, `preview host must be rejected: ${preview}`);
  assert.equal(sitemapOrigin({ SITE_URL: preview }), NEXORA_PUBLIC_ORIGIN, `preview host must fall back to the canonical: ${preview}`);
}
assert.equal(sitemapOrigin({ SITE_URL: 'https://www.nexorasalon.online' }), NEXORA_PUBLIC_ORIGIN, 'www redirect alias normalises to non-www canonical');
assert.equal(sitemapOrigin({ VITE_SITE_URL: 'https://www.nexorasalon.online/' }), NEXORA_PUBLIC_ORIGIN, 'Vite www redirect alias normalises to non-www canonical');
const filteredSitemap = sitemapXml('https://www.nexorasalon.online', [
  'glow-studio',
  'studioflow-qa-12345',
  'admin',
  'owner',
  'staff',
  'login',
  'sign-in',
  'sign-up',
  'api',
]);
assert.ok(!filteredSitemap.includes('www.nexorasalon.online'), 'sitemapXml never emits redirecting www URLs');
assert.ok(filteredSitemap.includes(`<loc>${NEXORA_PUBLIC_ORIGIN}/partner-rewards</loc>`), 'sitemap includes /partner-rewards');
assert.ok(filteredSitemap.includes(`<loc>${NEXORA_PUBLIC_ORIGIN}/?site=glow-studio</loc>`), 'sitemap includes published salon ?site= URLs');
for (const excluded of ['studioflow-qa-12345', '?site=admin', '?site=owner', '?site=staff', '?site=login', '?site=sign-in', '?site=sign-up', '?site=api']) {
  assert.ok(!filteredSitemap.includes(excluded), `sitemap excludes QA/reserved slug: ${excluded}`);
}
const filteredLocations = [...filteredSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
for (const loc of filteredLocations) {
  const parsed = new URL(loc);
  assert.equal(robotsTagForRequest(parsed.pathname, parsed.search), null, `every sitemap URL must stay indexable: ${loc}`);
  assert.ok(!parsed.pathname.startsWith('/api/'), `sitemap must never emit /api/ paths: ${loc}`);
}
assert.equal(isEphemeralOrigin('https://nexorasalon.online'), false);
assert.equal(isEphemeralOrigin('https://clinic.example'), false);
assert.equal(sitemapOrigin({ SITE_URL: 'https://clinic.example' }), 'https://clinic.example', 'a real custom domain stays configurable');
assert.equal(sitemapOrigin({ VITE_SITE_URL: 'https://clinic.example' }), 'https://clinic.example', 'the Vite fallback stays configurable');
assert.equal(sitemapOrigin({ SITE_URL: 'https://x.vercel.app', VITE_SITE_URL: 'https://clinic.example' }), 'https://clinic.example', 'a preview SITE_URL falls through to a real custom domain');
assert.equal(sitemapOrigin({}), NEXORA_PUBLIC_ORIGIN, 'with no configuration the production canonical is used');
assert.throws(() => sitemapOrigin({ SITE_URL: 'https://clinic.example/path' }), 'a malformed origin still fails loudly');
const customDomainSitemap = await generateSitemap({
  SITE_URL: 'https://clinic.example',
  SUPABASE_URL: 'https://supabase.example',
  SUPABASE_ANON_KEY: 'test-key',
}, async () => new Response('[{"slug":"real-clinic"}]', { status: 200 }));
assert.ok(customDomainSitemap.includes('<loc>https://clinic.example/?site=real-clinic</loc>'), 'published salons keep their own domain in the sitemap');
assert.ok(!customDomainSitemap.includes(NEXORA_PUBLIC_ORIGIN), 'a custom-domain sitemap does not mix in the platform canonical');
const llmsTxt = readFileSync('public/llms.txt', 'utf8');
assert.ok(llmsTxt.includes(`${NEXORA_PUBLIC_ORIGIN}/`), 'llms.txt uses the canonical production origin');
assert.ok(!/https?:\/\/[^\s)]+\.vercel\.app/i.test(llmsTxt), 'llms.txt contains zero vercel.app URLs');
assert.ok(!/https?:\/\/[^\s)]*\/(?:login|sign-in|sign-up|admin|owner|staff|api)(?:[/?#)\s]|$)/i.test(llmsTxt), 'llms.txt links no private/auth/admin/staff/api URLs');
assert.ok(!/[?&]app=/i.test(llmsTxt), 'llms.txt contains no ?app= session links');
assert.equal(existsSync('public/sitemap.xml'), false, 'no static public/sitemap.xml overrides the dynamic /api/sitemap rewrite');
assert.ok(![indexHtml, loginDocument, robotsTxt, llmsTxt].some(source => source.includes('studioflow-ashen-pi.vercel.app')), 'static SEO files contain no preview-domain URLs');

console.log('PASS: public homepage hierarchy/content, 16 templates/15 categories, signup template handoff, exact login H1, distinct home/login SEO, social images, canonical URLs and sitemap.');
