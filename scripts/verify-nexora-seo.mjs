import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalogue = readFileSync('src/lib/nexoraTemplateCatalogue.ts', 'utf8');
const seo = readFileSync('src/lib/useSeoMetadata.ts', 'utf8');
const html = readFileSync('index.html', 'utf8');

const terms = [
  'NEXORA Haircut Studio',
  'NEXORA Barber Shop',
  'NEXORA Beauty Parlour',
  'NEXORA Nail Studio',
  'NEXORA Unisex Salon',
  "NEXORA Men's Hair Studio",
  'NEXORA Hair Spa',
  'NEXORA Skin & Aesthetic Clinic',
  'NEXORA Makeup Studio',
  'NEXORA Bridal Makeup',
  'NEXORA Hair Colour Studio',
  'NEXORA Massage & Wellness',
  'NEXORA Tattoo & Body Art',
  'NEXORA Lash & Brow',
  'NEXORA Ayurvedic Wellness',
];
for (const term of terms) {
  assert.ok(catalogue.includes(term), 'SEO term missing from catalogue: ' + term);
  assert.ok(html.includes(term.replaceAll('&', '&amp;')), 'SEO term missing from static homepage metadata: ' + term);
}
assert.match(seo, /NEXORA_CATEGORY_SEO_TERMS/, 'salon website SEO must include NEXORA category phrases');
assert.match(seo, /NEXORA SALON/, 'salon website title and social site name must use NEXORA SALON');
assert.match(seo, /encodeURIComponent\(profile\.subdomain\)/, 'published salon canonical URLs must retain their slug');
assert.match(html, /<title>NEXORA SALON/, 'homepage title must use NEXORA SALON');

console.log('PASS: all 15 NEXORA-prefixed categories are present in homepage and salon SEO metadata.');
