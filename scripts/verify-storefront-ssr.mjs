import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { renderPublishedSalonHtml, getStorefrontAssetTags, getStorefrontShellHtml } = require('../dist/storefront-renderer.cjs');

const fixture = {
  profile: {
    businessName: 'NEXORA SSR Test Salon',
    businessType: 'hair_salon',
    city: 'Jaipur',
    address: 'Test Road',
    phone: '+91 90000 00000',
    tagline: 'A test salon rendered on the server.',
    serviceCatalogueInitialized: true,
  },
  services: [
    { id: 'ssr-service-1', name: 'Signature Haircut', description: 'A tailored haircut.', category: 'Haircut', price: 500, durationMinutes: 45 },
  ],
  stylists: [],
  gallery: [],
  policies: {},
  branding: {},
  loyaltyConfig: {},
  clients: [{ full_name: 'Private Customer Fixture', email: 'private-fixture@example.invalid' }],
};

const result = renderPublishedSalonHtml(fixture, 'nexora-ssr-test');
const shellHtml = getStorefrontShellHtml();
const assetTags = getStorefrontAssetTags();
assert.match(shellHtml, /<div id="root">/, 'embedded Vite shell is available to the Vercel function');
assert.match(assetTags, /<script type="module"/, 'embedded assets contain the Vite module entry');
assert.match(assetTags, /rel="stylesheet"/, 'embedded assets contain the built stylesheet');
assert.match(result.html, /NEXORA SSR Test Salon/, 'server HTML contains the salon name');
assert.match(result.html, /data-salon-whatsapp-site/, 'server HTML contains the real customer salon template');
assert.ok(Array.isArray(result.preloadTags), 'React resource hints are returned separately for document head placement');
assert.ok(result.preloadTags.length > 0, 'server-rendered image resource hints are preserved');
assert.ok(result.preloadTags.every((tag) => /<link\b[^>]*\brel="preload"/i.test(tag)), 'only preload link hints are moved');
assert.doesNotMatch(result.html, /<link\b[^>]*\brel="preload"/i, 'the hydrated root must not contain resource-hint siblings');
assert.match(result.html, /Signature Haircut/, 'server HTML contains the saved salon service');
assert.equal(result.profile.subdomain, 'nexora-ssr-test');
assert.equal(result.normalizedContent.profile.businessName, 'NEXORA SSR Test Salon');
assert.equal(result.site.clients, undefined, 'private customer records are omitted from the browser payload');
assert.doesNotMatch(JSON.stringify(result.site), /Private Customer Fixture|private-fixture@example\.invalid/);

console.log('PASS: published salon HTML is rendered server-side with its own profile and services.');
