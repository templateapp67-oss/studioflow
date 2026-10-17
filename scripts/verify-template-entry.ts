import assert from 'node:assert/strict';
import {requestedTemplate,templateDraft} from '../src/lib/templateEntry';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
for(const t of Object.values(CATEGORY_TEMPLATES)){assert.equal(requestedTemplate('?template='+t.id),t);const draft=templateDraft(t);assert.equal(draft.profile.businessType,t.id);assert.deepEqual(draft.services.map(s=>s.id),t.services.map(s=>s.id));assert.equal(draft.profile.businessName,t.title);}
for(const [category,id] of Object.entries({Hair:'hair_salon',Barber:'barber',Spa:'hair_spa',Nails:'nail_studio',Tattoo:'tattoo_studio',Beauty:'beauty_parlour'}))assert.equal(requestedTemplate('?category='+category)?.id,id);
for(const id of ['invalid','__proto__','constructor'])assert.equal(requestedTemplate('?template='+id),null);
console.log('PASS: all 14 template destinations, preview content, legacy category links, and invalid IDs.');
