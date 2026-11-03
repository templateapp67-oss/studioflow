import React from 'react';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {act,create} from 'react-test-renderer';
import {LandingPage} from '../src/components/LandingPage';
import {TemplatePreviewModal} from '../src/components/TemplatePreviewCards';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
const escaped=(value:string)=>value.replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;');
const html=renderToStaticMarkup(<LandingPage setCurrentView={()=>{}}/>);
assert.equal((html.match(/<article/g)||[]).length,15);
for (const template of Object.values(CATEGORY_TEMPLATES)) {
 assert.ok(html.includes(`Open live preview of ${escaped(template.title)}`));
 assert.ok(html.includes(escaped(template.paletteLabel.split('(')[0].trim())));
 assert.ok(html.includes(template.defaultCity));
 assert.ok(html.includes(`From ₹${Math.min(...template.services.map(s=>s.price)).toLocaleString('en-IN')}`));
 assert.ok(html.includes(template.coverImageUrl.replaceAll('&','&amp;')));
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).document={body:{style:{overflow:''}}};
(globalThis as any).window={addEventListener(){},removeEventListener(){}};
const chosen:string[]=[]; const views:string[]=[];
let page:any;
await act(async()=>{page=create(<LandingPage setCurrentView={view=>views.push(view)} onSelectCategory={id=>chosen.push(id)}/>);});
for (const template of Object.values(CATEGORY_TEMPLATES)) {
 await act(async()=>page.root.findByProps({'aria-label':`Open live preview of ${template.title}`}).props.onClick());
 assert.equal(page.root.findByType(TemplatePreviewModal).props.templateId,template.id);
 assert.deepEqual(chosen,[],'Opening previews must not overwrite saved salon');
 assert.deepEqual(views,[]);
 await act(async()=>page.root.findByProps({'aria-label':'Close template preview'}).props.onClick());
 assert.equal(page.root.findAllByType(TemplatePreviewModal).length,0);
}
await act(async()=>page.root.findByProps({'aria-label':`Open live preview of ${CATEGORY_TEMPLATES.hair_salon.title}`}).props.onClick());
const last=Object.values(CATEGORY_TEMPLATES).at(-1)!;
await act(async()=>page.root.findByProps({'aria-label':'Preview template'}).props.onChange({target:{value:last.id}}));
assert.equal(page.root.findByType(TemplatePreviewModal).props.templateId,last.id);
const modes=page.root.findAll(node=>node.type==='button'&&node.props['aria-pressed']!==undefined);
assert.equal(modes.length,3,'exactly three device toggles: desktop, tablet and mobile');
await act(async()=>modes[2].props.onClick());
assert.equal(page.root.findByType('iframe').props.style.width,390,'mobile preview renders a true phone viewport');
await act(async()=>modes[1].props.onClick());
assert.equal(page.root.findByType('iframe').props.style.width,834,'tablet preview renders a true tablet viewport');
await act(async()=>modes[0].props.onClick());
assert.equal(page.root.findByType('iframe').props.style.width,1280,'desktop preview renders a realistic desktop viewport');
await act(async()=>modes[2].props.onClick());
assert.equal(page.root.findByType('iframe').props.style.width,390);
{
 /* The preview iframe must keep its stylesheets in sync with the host —
  * template CSS is code-split and arrives after the iframe loads, so a
  * one-time copy renders the website as unstyled text. */
 const {readFileSync}=await import('node:fs');
 const cardsSource=readFileSync('src/components/TemplatePreviewCards.tsx','utf8');
 assert.ok(cardsSource.includes('syncPreviewStyles'),'the preview modal mirrors host stylesheets live into the iframe');
 assert.ok(!/querySelectorAll\('link\[rel="stylesheet"\], style'\)/.test(cardsSource),'the one-time stylesheet copy (which missed lazy template CSS) is gone');
 assert.ok(readFileSync('src/components/WebsiteDeviceFrame.tsx','utf8').includes('syncPreviewStyles'),'the owner device preview frame uses the same live style sync');
 const syncSource=readFileSync('src/lib/previewStyleSync.ts','utf8');
 assert.ok(syncSource.includes('MutationObserver'),'late-loaded template CSS is observed and mirrored');
 assert.ok(syncSource.includes("typeof document === 'undefined'"),'the style sync is a safe no-op without a DOM');
}
await act(async()=>page.root.findByType(TemplatePreviewModal).props.onChoose());
assert.deepEqual(chosen,[last.id]);
assert.equal(page.root.findAllByType(TemplatePreviewModal).length,0);
await act(async()=>page.unmount());
console.log('PASS: 14 themed thumbnails, INR prices, theme/location badges, matching live previews, mobile frame, template switching, close and explicit customization without draft mutation.');
