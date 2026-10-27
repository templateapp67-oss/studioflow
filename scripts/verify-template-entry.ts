import assert from 'node:assert/strict';
import {developmentTemplateForSiteSlug,requestedTemplate,templateDraft} from '../src/lib/templateEntry';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
for(const t of Object.values(CATEGORY_TEMPLATES)){assert.equal(requestedTemplate('?template='+t.id),t);const draft=templateDraft(t);assert.equal(draft.profile.businessType,t.id);assert.deepEqual(draft.services.map(s=>s.id),t.services.map(s=>s.id));assert.equal(draft.profile.businessName,t.title);}
const roop=CATEGORY_TEMPLATES.beauty_parlour;
assert.equal(roop.title,'Roop Mahal Beauty Parlour & Makeover Space');
assert.equal(roop.paletteLabel,'Warm Cream, Soft Rose, Deep Maroon & Champagne Gold');
assert.equal(roop.coverImageUrl,'/templates/roop-mahal/hero-bridal.jpg');
assert.equal(roop.ownerPhotoUrl,'/templates/roop-mahal/staff-sunita.jpg');
assert.deepEqual(roop.stylists.map(s=>s.avatarUrl),['/templates/roop-mahal/staff-sunita.jpg','/templates/roop-mahal/staff-meenakshi.jpg','/templates/roop-mahal/staff-pooja.jpg']);
assert.equal(requestedTemplate('?template=beauty_parlour')?.coverImageUrl,roop.coverImageUrl);
assert.equal(templateDraft(roop).profile.coverImageUrl,roop.coverImageUrl);
assert.equal(developmentTemplateForSiteSlug('roop-mahal',true)?.id,'beauty_parlour');
assert.equal(developmentTemplateForSiteSlug('beauty_parlour',true)?.id,'beauty_parlour');
assert.equal(developmentTemplateForSiteSlug('unrelated-real-salon',true),null);
assert.equal(developmentTemplateForSiteSlug('roop-mahal',false),null,'Production must never replace a missing website with sample content');
for(const [category,id] of Object.entries({Hair:'hair_salon',Barber:'barber',Spa:'hair_spa',Nails:'nail_studio',Tattoo:'tattoo_studio',Beauty:'beauty_parlour'}))assert.equal(requestedTemplate('?category='+category)?.id,id);
for(const id of ['invalid','__proto__','constructor'])assert.equal(requestedTemplate('?template='+id),null);
console.log('PASS: all 14 template destinations, preview content, legacy category links, and invalid IDs.');
