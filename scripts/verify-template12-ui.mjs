// Static guardrails for Template 12 storefront/editor behavior. Run alongside the
// offline PGlite migration/booking verifier; no live Supabase project is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const categorySource = readFileSync('src/lib/ironInk.ts', 'utf8');
const storefront = readFileSync('src/components/IronInkWebsite.tsx', 'utf8');
const editor = readFileSync('src/components/iron-ink/IronInkEditor.tsx', 'utf8');
const styles = readFileSync('src/components/ironInk.css', 'utf8');
const api = readFileSync('src/templates/iron-ink/api.ts', 'utf8');

const categoryRows = categorySource.split('].map(([slug')[0];
const categoryValues = [...categoryRows.matchAll(/^\s+"([a-z0-9-]+)",\s*$/gm)].map((match) => match[1]);
const categorySlugs = categoryValues.filter((_, index) => index % 2 === 0);
assert.equal(categorySlugs.length, 30, 'the starter catalog must define all 30 distinct categories');
assert.equal(new Set(categorySlugs).size, 30, 'category slugs must be unique');
assert.match(categorySource, /\.map\(\(\[slug, name, image, description, price, duration\]\) => \(\{[\s\S]*?enabled: true/s, 'all starter categories must be enabled');
assert.match(categorySource, /ironInkDurationMinutes/, 'category durations must map to valid slot lengths');
assert.match(categorySource, /const photo =/, 'every starter category must have an image');

for (const [name, source] of [['storefront', storefront], ['onboarding editor', editor]]) {
  assert.match(source, /starting_price|price/, `${name} must surface a category price`);
  assert.match(source, /duration/, `${name} must surface category duration`);
  assert.match(source, /description/, `${name} must surface category description`);
}
assert.match(editor, /rows=\{3\}/, 'owner editor should allow multi-line service descriptions');
assert.match(editor, /savedCategories\.find/, 'older saved profiles should retain all 30 default categories');
assert.match(api, /duration_label:category\.duration/, 'category duration labels must sync to Supabase');
assert.match(storefront, /useInkAvailability/, 'booking must query live availability');
assert.match(storefront, /uploadInkReference/, 'reference images must use the private upload path');
assert.match(storefront, /depositAcknowledged/, 'customers must acknowledge the unpaid deposit/request state');
assert.match(storefront, /No payment is taken/, 'the booking UI must not claim a deposit was charged');
assert.match(storefront, /whatsappLink\(/, 'booking and availability fallback should use the studio WhatsApp link');
assert.match(storefront, /localDateInput/, 'booking date bounds should use local dates');
assert.match(storefront, /Demo lookbook/, 'sample gallery imagery must be clearly labelled');
assert.match(storefront, /!item\.isDemo/, 'demo reviews must never render as customer testimonials');
assert.doesNotMatch(storefront, /Aarav S\.|Naina K\.|Kabir M\./, 'fictional default reviews must not be published');
assert.match(editor, /Add only reviews you have permission to publish/, 'editor should warn owners to use permissioned real reviews');
assert.match(storefront, /event\.key==='Escape'/, 'portfolio lightbox should close on Escape');
assert.match(styles, /\.ii-masonry\s*\{[^}]*columns:/, 'home portfolio should use responsive masonry columns');
assert.match(styles, /backdrop-filter\s*:\s*blur/, 'storefront cards should use glass styling');
assert.match(styles, /aspect-ratio/, 'image regions should reserve dimensions to reduce layout shift');
assert.match(styles, /prefers-reduced-motion/, 'motion should respect reduced-motion preference');
assert.match(styles, /@media\(max-width:640px\)/, 'template styles should include mobile layouts');
console.log('PASS: Template 12 has 30 active starter categories, rich owner controls, truthful deposit acknowledgement, live availability/reference upload/WhatsApp paths, responsive masonry and glass styles.');
