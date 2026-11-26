import React from 'react';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {act,create} from 'react-test-renderer';
import {LandingPage} from '../src/components/LandingPage';
import {TemplatePreviewModal} from '../src/components/TemplatePreviewCards';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {NEXORA_CATEGORIES, NEXORA_TEMPLATE_META, nexoraTemplateMeta, sortTemplatesByPriority} from '../src/lib/nexoraTemplateCatalogue';
const escaped=(value:string)=>value.replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;');
const html=renderToStaticMarkup(<LandingPage setCurrentView={()=>{}}/>);

/* ---------- 16 NEXORA cards, priority order, unique artwork ---------- */
assert.equal((html.match(/<article/g)||[]).length,16,'exactly sixteen template cards');
const cards=[...html.matchAll(/data-template-id="([^"]+)" data-template-rank="(\d+)"/g)].map(m=>({id:m[1],rank:Number(m[2])}));
assert.equal(cards.length,16,'every card carries its template id and priority rank');
assert.deepEqual(cards.map(c=>c.id),NEXORA_TEMPLATE_META.map(m=>m.templateId),'cards are rendered in the fixed NEXORA priority order');
assert.deepEqual(cards.map(c=>c.rank),Array.from({length:16},(_,i)=>i+1),'priority ranks are stable 1..16');
assert.equal(cards[0].id,'hair_salon','Haircut Studio is first');
assert.equal(cards[1].id,'barber','Barber Shop is second');
assert.equal(cards[2].id,'beauty_parlour','Beauty Parlour is third');
assert.equal(cards[3].id,'nail_studio','Nail Studio is fourth');
const cardOrder=[...html.matchAll(/id="nexora-template-(\d{2})"/g)].map(m=>m[1]);
assert.deepEqual(cardOrder,Array.from({length:16},(_,i)=>String(i+1).padStart(2,'0')),'template numbers run 01 → 16 in order');

const seenCovers=new Map<string,string>();
for (const template of Object.values(CATEGORY_TEMPLATES)) {
 const meta=nexoraTemplateMeta(template.id)!;
 assert.ok(meta,'every template has NEXORA metadata');
 assert.ok(meta.displayName.startsWith('NEXORA '),`${template.id} display name starts with NEXORA`);
 assert.equal(meta.priorityRank,meta.displayOrder,'priorityRank and displayOrder agree');
 assert.ok(html.includes(escaped(meta.displayName)),`${template.id} is listed by its NEXORA name`);
 assert.ok(html.includes(`Open full preview of ${escaped(meta.displayName)}`),`${template.id} preview button names the NEXORA template`);
 assert.ok(html.includes(`Customize ${escaped(meta.displayName)}`),`${template.id} customize button names the NEXORA template`);
 assert.ok(html.includes(escaped(meta.categoryName)),`${template.id} shows its category`);
 assert.ok(html.includes(escaped(meta.bestFor)),`${template.id} says who it is best for`);
 assert.ok(html.includes(escaped(meta.shortDescription)),`${template.id} shows its description`);
 for(const service of meta.services)assert.ok(html.includes(escaped(service)),`${template.id} lists ${service}`);
 assert.ok(html.includes(template.defaultCity),`${template.id} shows its city`);
 assert.ok(html.includes(`From ₹${Math.min(...template.services.map(s=>s.price)).toLocaleString('en-IN')}`),`${template.id} shows its INR starting price`);
 assert.ok(html.includes(template.coverImageUrl.replaceAll('&','&amp;')),`${template.id} renders its own preview image`);
 seenCovers.set(template.coverImageUrl,(seenCovers.get(template.coverImageUrl)||'')+template.id);
}
assert.equal(seenCovers.size,16,'every template card uses a unique preview image');
assert.ok((html.match(/data-template-id="[^"]+"[\s\S]*?data-nexora-brand-mark/g)||[]).length>0,'cards carry the NEXORA brand mark');
assert.equal((html.match(/<article[\s\S]*?<\/article>/g)||[]).filter(card=>card.includes('data-nexora-brand-mark')).length,16,'every template card carries the NEXORA brand mark');
assert.ok(html.includes('data-nexora-logo'),'the template library shows the NEXORA logo');
for(const category of NEXORA_CATEGORIES)assert.ok(html.includes(escaped(category.categoryName)),`category filter ${category.categoryName} is shown`);
assert.ok((html.match(/data-category-filter="/g)||[]).length, 'category filters render');
assert.equal((html.match(/data-category-filter="/g)||[]).length,16,'All Templates + 15 category filters');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).document={body:{style:{overflow:''}}};
(globalThis as any).window={addEventListener(){},removeEventListener(){}};
const chosen:string[]=[]; const views:string[]=[];
let page:any;
await act(async()=>{page=create(<LandingPage setCurrentView={view=>views.push(view)} onSelectCategory={id=>chosen.push(id)}/>);});

/* ---------- Category filter behaviour ---------- */
const cardIds=()=>page.root.findAll((n:any)=>n.type==='article'&&n.props['data-template-id']).map((n:any)=>n.props['data-template-id'] as string);
const filter=(id:string)=>page.root.findByProps({'data-category-filter':id});
await act(async()=>filter('barber-shop').props.onClick());
assert.deepEqual(cardIds(),['barber'],'Barber Shop filter shows only the barber template');
assert.equal(filter('barber-shop').props['aria-pressed'],true,'the selected category is clearly marked');
await act(async()=>filter('nail-studio').props.onClick());
assert.deepEqual(cardIds(),['nail_studio'],'Nail Studio filter shows only the nail template');
await act(async()=>filter('mens-hair-studio').props.onClick());
assert.deepEqual(cardIds(),['mens_hair_studio'],'Men’s Hair Studio filter is a real, separate category');
await act(async()=>filter('all').props.onClick());
assert.deepEqual(cardIds(),NEXORA_TEMPLATE_META.map(m=>m.templateId),'All Templates restores all fifteen in priority order');

/* ---------- Search behaviour (and search + filter together) ---------- */
const search=(value:string)=>page.root.findByProps({'aria-label':'Search templates by name, category, salon type, service or keyword'}).props.onChange({target:{value}});
const expectIds=(query:string,ids:string[])=>assert.deepEqual(cardIds(),ids,`search "${query}"`);
await act(async()=>search('haircut'));
assert.ok(cardIds().includes('hair_salon'),'search "haircut" finds the haircut studio');
assert.ok(!cardIds().includes('tattoo_studio'),'search "haircut" excludes unrelated templates');
await act(async()=>search('barber'));
expectIds('barber',['barber']);
await act(async()=>search('nails'));
expectIds('nails',['nail_studio','aurelia_beauty_parlour']);
await act(async()=>search('beauty'));
assert.equal(cardIds()[0],'beauty_parlour','search "beauty" puts the Beauty Parlour first');
for(const id of cardIds())assert.match(id,/beauty_parlour|unisex_salon|lash_brow/,'"beauty" only returns templates that really offer beauty services');
await act(async()=>search('men'));
const men=cardIds();
assert.ok(men.includes('barber')&&men.includes('mens_hair_studio'),'search "men" finds the barber and men’s hair studio');
await act(async()=>search('bridal'));
assert.ok(cardIds().includes('bridal_lounge'),'search "bridal" finds the bridal lounge');
assert.deepEqual(cardIds(),sortTemplatesByPriority(cardIds().map(id=>({id}))).map(t=>t.id),'filtered results stay in priority order');
await act(async()=>search('balayage'));
assert.deepEqual(cardIds(),['hair_coloring','aurelia_beauty_parlour'],'search hits every matching service name');
await act(async()=>search('keratin'));
assert.ok(cardIds().includes('hair_spa'),'search hits template keywords');
await act(async()=>search('ziya'));
assert.deepEqual(cardIds(),['hair_salon'],'search matches the template name');
await act(async()=>search('nonsense-query-xyz'));
assert.deepEqual(cardIds(),[],'an unmatched search shows no cards');
assert.ok(renderToStaticMarkup(<LandingPage setCurrentView={()=>{}}/>).length>0,'the empty state never crashes the page');
await act(async()=>search(''));
assert.equal(cardIds().length,16,'clearing the search restores all sixteen');
await act(async()=>filter('haircut-studio').props.onClick());
await act(async()=>search('butterfly'));
assert.deepEqual(cardIds(),['hair_salon'],'search and category filters combine');
await act(async()=>search('tattoo'));
assert.deepEqual(cardIds(),[],'search never leaks a template from another category');
await act(async()=>filter('all').props.onClick());
await act(async()=>search(''));

/* ---------- Order stability across re-renders ---------- */
const before=cardIds();
const reversed=[...Object.values(CATEGORY_TEMPLATES)].reverse();
const sorted=sortTemplatesByPriority(reversed);
assert.deepEqual(sorted.map(t=>t.id),before,'the shared sorting function always returns priority order, whatever the input order');
assert.deepEqual(sortTemplatesByPriority(sorted).map(t=>t.id),before,'sorting twice is idempotent (refresh can never reshuffle)');

/* ---------- Preview + customize wiring ---------- */
for (const template of Object.values(CATEGORY_TEMPLATES)) {
 const meta=nexoraTemplateMeta(template.id)!;
 await act(async()=>page.root.findByProps({'aria-label':`Open full preview of ${meta.displayName}`}).props.onClick());
 assert.equal(page.root.findByType(TemplatePreviewModal).props.templateId,template.id,`${template.id} opens its own preview`);
 assert.deepEqual(chosen,[],'Opening previews must not overwrite saved salon');
 assert.deepEqual(views,[],'Opening previews must not change the view');
 await act(async()=>page.root.findByProps({'aria-label':'Close template preview'}).props.onClick());
 assert.equal(page.root.findAllByType(TemplatePreviewModal).length,0);
}
for (const template of Object.values(CATEGORY_TEMPLATES)) {
 const meta=nexoraTemplateMeta(template.id)!;
 await act(async()=>page.root.findByProps({'aria-label':`Customize ${meta.displayName}`}).props.onClick());
 assert.deepEqual(chosen,[template.id],`${template.id} customize button targets exactly its own template id`);
 chosen.length=0;
}

/* ---------- Preview modal ---------- */
await act(async()=>page.root.findByProps({'aria-label':`Open full preview of ${nexoraTemplateMeta('hair_salon')!.displayName}`}).props.onClick());
assert.ok(page.root.findByType(TemplatePreviewModal).findAll((n:any)=>n.props?.children==='NEXORA Ziya Women’s Haircut Studio').length>0,'the preview title uses the NEXORA name');
const last=Object.values(CATEGORY_TEMPLATES).at(-1)!;
await act(async()=>page.root.findByProps({'aria-label':'Preview template'}).props.onChange({target:{value:last.id}}));
assert.equal(page.root.findByType(TemplatePreviewModal).props.templateId,last.id);
const options=page.root.findByProps({'aria-label':'Preview template'}).findAllByType('option');
assert.deepEqual(options.map((o:any)=>o.props.children),NEXORA_TEMPLATE_META.map(m=>m.displayName),'the prevew switcher lists all fifteen NEXORA names in priority order');
const deviceGroup=page.root.findByProps({'aria-label':'Preview device'});
const modes=deviceGroup.findAll(node=>node.type==='button'&&node.props['aria-pressed']!==undefined);
assert.equal(modes.length,3,'exactly three device toggles: desktop, tablet and mobile');
await act(async()=>modes[2].props.onClick());
assert.equal(page.root.findByType('iframe').props.style.width,390,'mobile preview renders a true phone viewport');
await act(async()=>modes[1].props.onClick());
assert.equal(page.root.findByType('iframe').props.style.width,834,'tablet preview renders a true tablet viewport');
await act(async()=>modes[0].props.onClick());
assert.equal(page.root.findByType('iframe').props.style.width,1280,'desktop preview renders a realistic desktop viewport');

/* ---------- Unified action button (both original buttons merged) ---------- */
assert.equal(page.root.findAllByProps({'data-template-actions':true}).length,1,'the header has one unified action component, not overlapping buttons');
assert.equal(page.root.findByProps({'data-template-actions':true}).props['data-template-primary-action'],'customize','the merged primary button customizes first');
assert.equal(page.root.findAllByProps({'aria-label':'Customize this template'}).length,0,'the old “Customize this template” button is no longer loose in the header');
assert.equal(page.root.findAllByProps({'aria-label':'Create my website with this template'}).length,0,'the old “Create my website with this template” button is folded into the dropdown');
await act(async()=>page.root.findByProps({'aria-label':'More template actions'}).props.onClick());
assert.ok(page.root.findByProps({'data-template-action-menu':true}),'the merged button opens its organised action menu');
assert.ok(page.root.findByProps({'aria-label':'Customize this template'}),'the customize flow is preserved inside the menu');
assert.ok(page.root.findByProps({'aria-label':'Create my website with this template'}),'the create-website flow is preserved inside the menu');
assert.equal(page.root.findByProps({'aria-label':'More template actions'}).props['aria-expanded'],true,'the dropdown announces its open state');
await act(async()=>page.root.findByProps({'aria-label':'More template actions'}).props.onClick());
assert.equal(page.root.findAllByProps({'data-template-action-menu':true}).length,0,'the dropdown closes again');

/* ---------- Full-page viewport preview ---------- */
const {previewDialogClass,previewFrameWidth,previewStageClass}=await import('../src/components/template-preview/TemplatePreviewChrome');
assert.ok(previewDialogClass(true).includes('w-screen')&&previewDialogClass(true).includes('h-dvh')&&previewDialogClass(true).includes('max-w-none')&&previewDialogClass(true).includes('max-h-none'),'full-page mode covers 100% of the screen width and height');
assert.ok(previewDialogClass(true).includes('rounded-none')&&previewDialogClass(true).includes('border-0'),'full-page mode drops the dashboard framing and rounded window');
assert.ok(previewStageClass(true).includes('p-0'),'full-page mode drops the preview stage padding');
assert.equal(previewFrameWidth({fullPage:true,device:'desktop',stageWidth:1600,desktopWidth:1280}),1600,'full-page desktop fills the real screen width');
assert.equal(previewFrameWidth({fullPage:false,device:'desktop',stageWidth:1600,desktopWidth:1280}),1280,'the dashboard window keeps the true desktop viewport');
const fullPageToggle=page.root.findByProps({'aria-label':'Full-page preview'});
assert.equal(fullPageToggle.props['aria-pressed'],false,'the full-page toggle sits next to the device views and starts off');
assert.equal(page.root.findByType('dialog').props['data-preview-mode'],'windowed');
await act(async()=>fullPageToggle.props.onClick());
assert.equal(page.root.findByType('dialog').props['data-preview-mode'],'full-page','clicking the toggle expands the preview to the full page');
assert.ok(page.root.findByType('dialog').props.className.includes('w-screen'),'the expanded preview is 100% wide');
assert.equal(page.root.findByProps({'aria-label':'Exit full-page preview'}).props['aria-pressed'],true,'the toggle becomes a clear exit control');
assert.equal(page.root.findByProps({'aria-label':'Exit full-page preview and close'}).props['aria-label'],'Exit full-page preview and close','closing is still available in full-page mode');
await act(async()=>page.root.findByProps({'aria-label':'Exit full-page preview'}).props.onClick());
assert.equal(page.root.findByType('dialog').props['data-preview-mode'],'windowed','the exit control returns to the normal dashboard view');
{
 /* The preview iframe must keep its stylesheets in sync with the host —
  * template CSS is code-split and arrives after the iframe loads, so a
  * one-time copy renders the website as unstyled text. */
 const {readFileSync}=await import('node:fs');
 const cardsSource=readFileSync('src/components/TemplatePreviewModal.tsx','utf8');
 assert.ok(cardsSource.includes('syncPreviewStyles'),'the preview modal mirrors host stylesheets live into the iframe');
 assert.ok(!/querySelectorAll\('link\[rel="stylesheet"\], style'\)/.test(cardsSource),'the one-time stylesheet copy (which missed lazy template CSS) is gone');
 assert.ok(readFileSync('src/components/WebsiteDeviceFrame.tsx','utf8').includes('syncPreviewStyles'),'the owner device preview frame uses the same live style sync');
 const syncSource=readFileSync('src/lib/previewStyleSync.ts','utf8');
 assert.ok(syncSource.includes('MutationObserver'),'late-loaded template CSS is observed and mirrored');
 assert.ok(syncSource.includes("typeof document === 'undefined'"),'the style sync is a safe no-op without a DOM');
 const landing=readFileSync('src/components/LandingPage.tsx','utf8');
 assert.ok(landing.includes('NexoraTemplateLibrary'),'the landing page renders the NEXORA template library');
 assert.ok(!/StudioFlow/.test(landing),'the customer-facing landing page carries NEXORA branding only');
 for(const wrong of ['Nexorra','Nexora Salon','NEXORAA'])assert.ok(!cardsSource.includes(wrong)&&!landing.includes(wrong),`no misspelt brand: ${wrong}`);
}
await act(async()=>page.root.findByProps({'aria-label':'More template actions'}).props.onClick());
await act(async()=>page.root.findByProps({'aria-label':'Create my website with this template'}).props.onClick());
assert.deepEqual(chosen,[last.id],'the merged dropdown still creates a website with the chosen template');
assert.equal(page.root.findAllByType(TemplatePreviewModal).length,0);
await act(async()=>page.unmount());
console.log('PASS: 16 NEXORA template cards in fixed priority order, unique artwork, category filters, combined search, empty state, NEXORA preview titles/switcher, matching live previews, three device frames, one merged action button with both flows intact, full-page viewport preview with a clear exit, close and explicit customization without draft mutation.');
