import React from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';
import {SidePanelCustomizer,DEFAULT_SECTION_VISIBILITY} from '../src/components/SidePanelCustomizer';
import {AILogoSuiteModal} from '../src/components/AILogoSuiteModal';
import {STUDIO_AI_VIBES,STUDIO_AI_HEADINGS,studioAiPreset,studioCopyFallback,generateStudioCopy} from '../src/lib/studioAi';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {CATEGORY_STANDARDIZED_DATA} from '../src/templateData';
import {ACCENT_PALETTES} from '../src/themeAccents';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;

// ---------- lib: preset parsing, vibes, headings ----------
assert.equal(studioAiPreset('luxury'),'luxury');
assert.equal(studioAiPreset('bridal'),'bridal');
assert.equal(studioAiPreset('genz'),'genz');
assert.equal(studioAiPreset('ayurvedic'),'ayurvedic');
assert.equal(studioAiPreset('custom'),'custom');
assert.equal(studioAiPreset('nonsense'),'custom');
assert.equal(studioAiPreset(''),'custom');
assert.equal(studioAiPreset(null),'custom');
for(const preset of ['luxury','bridal','genz','ayurvedic','custom'] as const)assert.ok(STUDIO_AI_VIBES[preset].length>3,preset);
assert.ok(STUDIO_AI_HEADINGS.luxury?.servicesTitle.includes('Haute'));
assert.ok(STUDIO_AI_HEADINGS.bridal?.servicesTitle.includes('Bridal'));
assert.ok(STUDIO_AI_HEADINGS.ayurvedic?.servicesTitle.includes('Ayurvedic'));
assert.equal(STUDIO_AI_HEADINGS.genz,undefined);
assert.equal(STUDIO_AI_HEADINGS.custom,undefined);

// ---------- lib: curated offline fallback copy ----------
const salon={businessName:'Royal Jaipur Salon',city:'Jaipur'};
assert.ok(studioCopyFallback(salon,'luxury').tagline.includes('Jaipur'));
assert.ok(studioCopyFallback(salon,'luxury').bio.includes('Royal Jaipur Salon'));
assert.ok(studioCopyFallback(salon,'bridal').tagline.includes('Bridal'));
assert.ok(studioCopyFallback(salon,'genz').bio.includes('trendsetters'));
assert.ok(studioCopyFallback(salon,'ayurvedic').tagline.includes('Ayurvedic'));
const custom=studioCopyFallback(salon,'custom','emerald spa glow');
assert.ok(custom.bio.includes('emerald spa glow')&&custom.bio.includes('Royal Jaipur Salon'));
assert.ok(studioCopyFallback(salon,'custom','   ').bio.includes('personalized care'));
assert.ok(studioCopyFallback({businessName:'  ',city:'  '},'luxury').bio.includes('our salon'));

// ---------- lib: live server AI honours source:"ai" only ----------
const realFetch=(globalThis as any).fetch;
let sentBody:any=null;
(globalThis as any).fetch=async(_url:string,init:any)=>{sentBody=JSON.parse(init.body);return{ok:true,json:async()=>({source:'ai',tagline:'Live AI tagline',bio:'Live AI bio'})};};
const live=await generateStudioCopy({businessName:'Royal Jaipur Salon',businessType:'nail_studio',ownerName:'Meera',vibe:STUDIO_AI_VIBES.luxury,specialties:'Gel Manicure, Lash Lift'});
assert.equal(live.source,'ai');assert.equal(live.tagline,'Live AI tagline');assert.equal(live.bio,'Live AI bio');
assert.equal(sentBody.businessName,'Royal Jaipur Salon');assert.equal(sentBody.businessType,'nail_studio');
assert.equal(sentBody.vibe,STUDIO_AI_VIBES.luxury);assert.ok(sentBody.specialties.includes('Gel Manicure'));
(globalThis as any).fetch=async()=>({ok:true,json:async()=>({source:'template',tagline:'T',bio:'B'})});
await assert.rejects(()=>generateStudioCopy({businessName:'S',businessType:'nail_studio',ownerName:'O',vibe:'v',specialties:'s'}),/AI copy unavailable/);
(globalThis as any).fetch=async()=>({ok:true,json:async()=>({source:'ai',tagline:'  ',bio:'B'})});
await assert.rejects(()=>generateStudioCopy({businessName:'S',businessType:'nail_studio',ownerName:'O',vibe:'v',specialties:'s'}),/AI copy unavailable/);
(globalThis as any).fetch=async()=>({ok:false});
await assert.rejects(()=>generateStudioCopy({businessName:'S',businessType:'nail_studio',ownerName:'O',vibe:'v',specialties:'s'}),/Bio service unavailable/);
(globalThis as any).fetch=async()=>{throw new Error('offline');};
await assert.rejects(()=>generateStudioCopy({businessName:'S',businessType:'nail_studio',ownerName:'O',vibe:'v',specialties:'s'}),/offline/);
(globalThis as any).fetch=(_url:string,init:any)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('aborted'))));
await assert.rejects(()=>generateStudioCopy({businessName:'S',businessType:'nail_studio',ownerName:'O',vibe:'v',specialties:'s',timeoutMs:15}),/aborted/);
(globalThis as any).fetch=realFetch;

// ---------- panel: AI Studio tab updates the active template design ----------
let profile={...INITIAL_SALON_PROFILE,businessType:'nail_studio' as const,businessName:'Royal Jaipur Salon',coverImageUrl:'https://example.com/old-hero.jpg'};
let categoryKey='nail_studio';let accentKey='slate' as any;let dark=false;
const aiCalls:Array<[string,string?]>=[];
let editor:any;
const tree=()=><SidePanelCustomizer isOpen onToggle={()=>{}} profile={profile} setProfile={(next:any)=>{profile=typeof next==='function'?next(profile):next;act(()=>{editor.update(tree());});}} selectedCategoryKey={categoryKey as any} selectedAccentKey={accentKey} setSelectedAccentKey={(key:any)=>{accentKey=key;act(()=>{editor.update(tree());});}} primaryAccentColor="#0f172a" isDarkCanvas={dark} setIsDarkCanvas={(value:boolean)=>{dark=value;act(()=>{editor.update(tree());});}} sectionVisibility={DEFAULT_SECTION_VISIBILITY} setSectionVisibility={()=>{}} onAIGeneratePrompt={(preset,custom)=>{aiCalls.push([preset,custom]);}} onSelectCategory={(id)=>{categoryKey=id;act(()=>{editor.update(tree());});}}/>;
await act(async()=>{editor=create(tree());});
const collect=(node:any):string=>{if(typeof node==='string'||typeof node==='number')return String(node);if(!node||!node.children)return '';return node.children.map(collect).join('');};
const buttonWith=(text:string)=>editor.root.findAllByType('button').find((b:any)=>collect(b).includes(text));
await act(async()=>{buttonWith('AI Studio')!.props.onClick();});
assert.ok(collect(editor.root).includes('Update template design'));
assert.ok(collect(editor.root).includes(CATEGORY_TEMPLATES.nail_studio.shortName));
assert.ok(collect(editor.root).includes('module 10'));

// Template switcher updates the active template.
const templateSelect=editor.root.findByType('select');
assert.equal(templateSelect.props.value,'nail_studio');
assert.equal(templateSelect.props.children.length,Object.keys(CATEGORY_TEMPLATES).length);
await act(async()=>{templateSelect.props.onChange({target:{value:'barber'}});});
assert.equal(categoryKey,'barber');
assert.ok(collect(editor.root).includes(CATEGORY_TEMPLATES.barber.shortName));

// Brand colour palettes + custom hex.
const paletteButton=(name:string)=>editor.root.findAllByType('button').find((b:any)=>b.props.title===name);
const paletteNames=Object.values(ACCENT_PALETTES).map(p=>p.name);
for(const name of paletteNames)assert.ok(paletteButton(name),name);
await act(async()=>{paletteButton('Botanical Emerald')!.props.onClick();});
assert.equal(accentKey,'emerald');
assert.equal(profile.customAccentColor,undefined);
const hexInput=editor.root.findAllByType('input').find((i:any)=>i.props.placeholder==='#0F172A');
await act(async()=>{hexInput.props.onChange({target:{value:'#123456'}});});
assert.equal(profile.customAccentColor,'#123456');

// Hero banner presets + custom URL.
const heroPreset=CATEGORY_STANDARDIZED_DATA.barber.gallery[0];
const heroButton=editor.root.findAllByType('button').find((b:any)=>b.props.title===heroPreset.title);
assert.ok(heroButton,heroPreset.title);
await act(async()=>{heroButton.props.onClick();});
assert.equal(profile.coverImageUrl,heroPreset.url);
const heroUrl=editor.root.findAllByType('input').find((i:any)=>i.props.placeholder==='Paste hero image URL…');
await act(async()=>{heroUrl.props.onChange({target:{value:'https://example.com/new-hero.jpg'}});});
await act(async()=>{buttonWith('Apply')!.props.onClick();});
assert.equal(profile.coverImageUrl,'https://example.com/new-hero.jpg');

// Logo actions: AI logo suite opens, branding tab reachable.
assert.ok(buttonWith('Generate AI logos'));
await act(async()=>{buttonWith('Generate AI logos')!.props.onClick();});
assert.equal(editor.root.findByType(AILogoSuiteModal).props.isOpen,true);
await act(async()=>{editor.root.findByType(AILogoSuiteModal).props.onClose();});
await act(async()=>{buttonWith('Logo & media →')!.props.onClick();});
assert.ok(collect(editor.root).includes('Salon Header Logo'));
await act(async()=>{buttonWith('AI Studio')!.props.onClick();});

// Canvas light/dark toggle.
await act(async()=>{buttonWith('Dark')!.props.onClick();});
assert.equal(dark,true);

// Copywriter presets + custom prompt still route through the AI callback.
await act(async()=>{buttonWith('Ultra-Luxury & Botanical')!.props.onClick();});
await act(async()=>{buttonWith('Festive & Bridal Packages')!.props.onClick();});
await act(async()=>{buttonWith('Modern Trendsetter Tone')!.props.onClick();});
await act(async()=>{buttonWith('Holistic Ayurvedic Glow')!.props.onClick();});
assert.deepEqual(aiCalls.slice(0,4).map(c=>c[0]),['luxury','bridal','genz','ayurvedic']);
const promptBox=editor.root.findByType('textarea');
await act(async()=>{promptBox.props.onChange({target:{value:'emerald spa glow'}});});
await act(async()=>{buttonWith('Generate & Apply to Canvas')!.props.onClick();});
assert.deepEqual(aiCalls[4],['custom','emerald spa glow']);
assert.equal(editor.root.findByType('textarea').props.value,'');
await act(async()=>{editor.unmount();});
console.log('PASS: AI Studio honours live server AI (source ai only) with labelled offline fallback; template, brand colour, hero banner, logo and canvas update from the AI tab for the active template.');
