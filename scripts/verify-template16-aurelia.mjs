import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(path,'utf8');
const types=read('src/types.ts');
const catalogue=read('src/lib/nexoraTemplateCatalogue.ts');
const categories=read('src/categoryTemplates.ts');
const entry=read('src/lib/templateEntry.ts');
const preview=read('src/components/SalonWebsitePreview.tsx');
const customer=read('src/components/CustomerSalonWebsite.tsx');
const standardized=read('src/templateData.ts');
const gallery=read('src/lib/photoGallery.ts');
const videos=read('src/lib/showcaseVideos.ts');
const data=read('src/lib/aureliaBeauty.ts');
const site=read('src/components/aurelia/AureliaBeautyWebsite.tsx');
const editor=read('src/components/aurelia/AureliaBeautyEditor.tsx');
const migration=read('supabase/migrations/202611030004_template15_16_catalogue_sync.sql');

assert.match(types,/\|\s*'aurelia_beauty_parlour'/,'Template 16 ID must be in BusinessTypeId');
assert.match(types,/aureliaBeauty\?: AureliaBeautyConfig/,'Aurelia owner config must be part of SalonProfile');
assert.match(categories,/aurelia_beauty_parlour:\s*\{/,'Template 16 must be registered in CATEGORY_TEMPLATES');
assert.match(categories,/categoryTag:\s*'Beauty Parlour'/,'Template 16 must appear under Beauty Parlour in wizard/category options');
assert.match(entry,/'16':'aurelia_beauty_parlour'/,'Template 16 numeric route alias must work');
assert.match(entry,/'aurelia-beauty-parlour':'aurelia_beauty_parlour'/,'Template 16 slug route alias must work');

const metaStart=catalogue.indexOf('export const NEXORA_TEMPLATE_META');
const metaEnd=catalogue.indexOf('\n];',metaStart);
assert.ok(metaStart>=0&&metaEnd>metaStart,'NEXORA template metadata must exist');
const metaBlock=catalogue.slice(metaStart,metaEnd);
const templateIds=[...metaBlock.matchAll(/templateId:\s*'([^']+)'/g)].map(m=>m[1]);
assert.equal(templateIds.length,16,'NEXORA template library must contain exactly 16 metadata entries');
assert.equal(new Set(templateIds).size,16,'Template IDs must be unique');
const aureliaMeta=metaBlock.match(/\{\s*templateId:\s*'aurelia_beauty_parlour',[\s\S]*?\n\s*\},/);
assert.ok(aureliaMeta,'Aurelia template metadata must exist');
assert.match(aureliaMeta[0],/categoryId:\s*'beauty-parlour'/,'Aurelia must share the existing Beauty Parlour category');
assert.match(aureliaMeta[0],/displayName:\s*'NEXORA Aurelia Beauty Parlour'/,'Aurelia template name must be NEXORA branded');
assert.match(aureliaMeta[0],/priorityRank:\s*16/,'Aurelia must be listed as Template 16');

const beautyCategoryMatches=[...metaBlock.matchAll(/categoryId:\s*'beauty-parlour'/g)];
assert.equal(beautyCategoryMatches.length,2,'Beauty Parlour category must contain both Roop Mahal and Aurelia');
assert.match(preview,/businessType==='aurelia_beauty_parlour'\?<AureliaBeautyEditor/,'Owner preview must open the Aurelia editor');
assert.match(customer,/businessType==='aurelia_beauty_parlour'\?<AureliaBeautyWebsite/,'Public website renderer must open Aurelia');
assert.match(standardized,/aurelia_beauty_parlour:\s*\{/,'Aurelia must have standard gallery and review data');
assert.match(gallery,/standardGallery\('aurelia_beauty_parlour'\)/,'Aurelia gallery must be available to shared gallery normalization');
assert.match(videos,/profile\.businessType==='aurelia_beauty_parlour'/,'Aurelia must not receive unrelated generic demo videos');

const serviceIds=[...data.matchAll(/id:'aur-(?:hair|colour|skin|nails|spa|bridal)-\d+'/g)].map(m=>m[0]);
assert.equal(serviceIds.length,10,'Aurelia must start with ten demo service records');
const staffIds=[...data.matchAll(/id:'aur-staff-[^']+'/g)].map(m=>m[0]);
assert.equal(staffIds.length,4,'Aurelia must start with four demo staff records');
for(const asset of [
 'hero_aurelia_arch_1793409239063.jpg',
 'service_hairstyling_1793409240754.jpg',
 'service_haircolour_1793409239777.jpg',
 'service_skincare_1793409239190.jpg',
 'service_bridal_1793409259837.jpg',
 'service_nailstudio_1793409259976.jpg',
 'service_spa_1793409260106.jpg',
 'story_stylist_1793409260598.jpg',
 'room_lookbook_interior_1793383607293.jpg'
]) assert.ok(data.includes(asset),'Aurelia image path missing: '+asset);
assert.match(site,/BookingModal/,'Aurelia must use shared StudioFlow booking modal');
assert.match(site,/CustomerReviewPanel/,'Aurelia must use shared customer review panel');
assert.match(editor,/uploadSalonImage/,'Owner image uploads must use StudioFlow Supabase media');
assert.match(editor,/Add new offer/,'Owner must be able to add offers');
assert.match(editor,/Website section order/,'Owner must be able to reorder website sections');
assert.match(migration,/mens_hair_studio/,'Catalogue migration must restore missing Template 15 record');
assert.match(migration,/aurelia_beauty_parlour/,'Catalogue migration must add Template 16');
assert.match(migration,/on conflict \(id\) do update/i,'Catalogue migration must be safe to re-run');
assert.doesNotMatch(migration,/drop\s+table/i,'Catalogue migration must not drop tables');

console.log('Template 16 Aurelia offline verification passed.');
