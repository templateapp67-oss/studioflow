import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const component = read('src/components/TemplateImageField.tsx');
const css = read('src/styles/TemplateImageField.css');
const editor = read('src/components/iron-ink/IronInkEditor.tsx');
const catalogue = read('src/lib/nexoraTemplateCatalogue.ts');
const tattooData = read('src/lib/ironInk.ts');

assert.match(component, /uploadSalonImage\(processed\.file\)/, 'reuse authenticated Supabase upload');
assert.match(component, /templateId:\s*string/);
assert.match(component, /templateName:\s*string/);
assert.match(component, /sectionLabel:\s*string/);
assert.match(component, /processTemplateImage/);
assert.match(css, /object-fit:\s*cover/);
assert.match(css, /overflow:\s*hidden/);
assert.match(editor, /templateId:\s*"tattoo_studio"/);
assert.match(editor, /TEMPLATE 13 · NEXORA IRON & INK/);
assert.doesNotMatch(editor, /TEMPLATE 12 · IRON & INK/);
for (const frame of ['hero', 'interior', 'guide', 'reel', 'service', 'avatar']) {
  assert.match(editor, new RegExp('frame="' + frame + '"'), 'missing ' + frame + ' image field');
}
assert.equal((editor.match(/<TemplateImageField\b/g) || []).length, 6, 'all six image field groups use the shared component');
assert.match(editor, /updateCategory\(item\.slug, "image", url\)/);
assert.match(editor, /updateTestimonial\(item\.id, "avatarUrl", url\)/);

const metaStart = catalogue.indexOf('export const NEXORA_TEMPLATE_META');
const metaEnd = catalogue.indexOf('const META_BY_ID', metaStart);
assert.ok(metaStart >= 0 && metaEnd > metaStart, 'template catalogue metadata block exists');
const meta = catalogue.slice(metaStart, metaEnd);
const ids = [...meta.matchAll(/templateId:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
assert.equal(ids.length, 16, 'the NEXORA catalogue must remain at 16 templates');
assert.ok(ids.includes('tattoo_studio'));
assert.match(meta, /templateId:\s*'tattoo_studio'[\s\S]*?categoryName:\s*'Tattoo & Body Art'[\s\S]*?templateNumber:\s*'13'/);

const dataStart = tattooData.indexOf('export const IRON_INK_CATEGORIES');
const dataEnd = tattooData.indexOf('export const ironInkDefaults', dataStart);
assert.ok(dataStart >= 0 && dataEnd > dataStart, 'tattoo category data exists');
const count = [...tattooData.slice(dataStart, dataEnd).matchAll(/^\s{2}\[\s*$/gm)].length;
assert.equal(count, 30, 'all 30 tattoo/body-art categories must remain');

console.log('PASS: authenticated Supabase upload helper is reused');
console.log('PASS: six responsive image frames are integrated');
console.log('PASS: hero, interior, guides, reels, 30 category images and client photos retain existing state callbacks');
console.log('PASS: object-fit cover and overflow protection are present');
console.log('PASS: catalogue remains at 16 templates; tattoo_studio is Template 13');
console.log('PASS: all 30 tattoo/body-art categories remain');
