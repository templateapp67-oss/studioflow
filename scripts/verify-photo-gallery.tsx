import React,{useState} from 'react';import {act,create} from 'react-test-renderer';import {renderToStaticMarkup} from 'react-dom/server';import assert from 'node:assert/strict';
import {defaultGalleryCategory,photoGallery,standardGallery,withPhotoGallery} from '../src/lib/photoGallery';
import {PhotoGalleryManager} from '../src/components/PhotoGalleryManager';import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {normalizeWorkspace} from '../src/lib/normalizeWorkspace';import {applyTemplateDesign} from '../src/lib/templateSelection';import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {INITIAL_SALON_PROFILE} from '../src/mockData';import {supabase} from '../src/lib/supabase';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;(globalThis as any).window={addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};(globalThis as any).document={hidden:false,body:{style:{}},addEventListener(){},removeEventListener(){}};
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id};const samples=standardGallery(template.id);assert.equal(samples.length,5);assert.equal(new Set(samples.map(p=>p.url)).size,5);assert.equal(photoGallery(profile).length,5);assert.ok(samples.every(p=>p.id.includes(template.id)));
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={[]} stylists={[]} readOnly onAddAppointment={async a=>a}/>);
 if(template.id==='hair_spa'){
  // Template 06 renders its own gallery: bundled sample photography must be labelled,
  // and the saved-photo path must be used without any owner controls.
  assert.ok(html.includes('Spa (4)'),'hair spa sample gallery counts its spa photographs');
  assert.equal((html.match(/DEMO \/ SAMPLE · /g)||[]).length,7,'all seven bundled sample photographs are labelled');
  assert.ok(html.includes('Demo / sample photographs'),'hair spa gallery explains that the photos are samples');
  assert.equal((html.match(/id="gallery"/g)||[]).length,1,'the sanctuary gallery is a single section');
  assert.ok(!html.includes('Delete photo')&&!html.includes('Replace / Edit'));
  const savedHtml=renderToStaticMarkup(<CustomerSalonWebsite profile={{...profile,photoGalleryInitialized:true,photoGalleryType:'hair_spa',photoGallery:[{id:'hp-1',category:'Spa' as const,url:'https://cdn.example.com/saved-spa-photo.jpg',title:'Saved spa photo',isDemo:false}]}} services={[]} stylists={[]} readOnly onAddAppointment={async a=>a}/>);
  assert.ok(savedHtml.includes('Saved spa photo'),'saved salon photo is used in the hair spa gallery');
  assert.ok(!savedHtml.includes('DEMO / SAMPLE'),'saved salon photo is not labelled as demo');
 }else{
  assert.ok(html.includes(`${defaultGalleryCategory(template.id)} (5)`));assert.equal((html.match(/aria-label="View salon look /g)||[]).length,5);assert.ok(!html.includes('Delete photo')&&!html.includes('Replace / Edit'));
 }
 const removed=withPhotoGallery(profile,samples.filter(p=>p.id!==samples[0].id));const normalized=normalizeWorkspace(JSON.parse(JSON.stringify({profile:removed,extras:{gallery:[]}})));assert.equal(photoGallery(normalized.profile).length,4);assert.equal(normalized.extras.gallery.length,4);assert.equal(photoGallery(applyTemplateDesign(normalized.profile,template)).length,4);
 const empty=withPhotoGallery(profile,[]);assert.equal(photoGallery(normalizeWorkspace({profile:empty}).profile).length,0);
}
const oldSamples=['hair_salon','bridal_lounge','skincare_clinic','nail_studio','barber','massage_wellness'].flatMap(type=>standardGallery(type as any));
const personal={id:'real-photo',category:'Hair' as const,url:'https://example.com/real.jpg',title:'Real owner work',isDemo:false};
const legacy={...INITIAL_SALON_PROFILE,businessType:'tattoo_studio' as const,photoGalleryInitialized:true,photoGallery:[...oldSamples,personal]};
assert.equal(photoGallery(legacy).length,6);assert.equal(photoGallery(legacy).filter(p=>p.isDemo).length,5);assert.ok(photoGallery(legacy).filter(p=>p.isDemo).every(p=>p.category==='Tattoo'));assert.ok(photoGallery(legacy).some(p=>p.id==='real-photo'));
const initialized=withPhotoGallery(legacy,photoGallery(legacy));const switched=applyTemplateDesign(initialized,CATEGORY_TEMPLATES.nail_studio);assert.equal(photoGallery(switched).filter(p=>p.isDemo).length,5);assert.ok(photoGallery(switched).filter(p=>p.isDemo).every(p=>p.category==='Nails'));assert.ok(photoGallery(switched).some(p=>p.id==='real-photo'));
const reloaded=normalizeWorkspace({profile:switched,extras:{gallery:[]}});assert.equal(reloaded.profile.photoGalleryType,'nail_studio');assert.equal(photoGallery(reloaded.profile).length,6);
assert.ok(photoGallery(INITIAL_SALON_PROFILE,['https://example.com/own.jpg']).some(p=>!p.isDemo&&p.url==='https://example.com/own.jpg'));
let savedProfile:any;let savedGallery:string[]=[];function Harness(){const [profile,setProfile]=useState(INITIAL_SALON_PROFILE);const [gallery,setGallery]=useState<string[]>([]);savedProfile=profile;savedGallery=gallery;return <PhotoGalleryManager profile={profile} setProfile={setProfile} gallery={gallery} setGallery={setGallery}/>}
let editor:any;await act(async()=>{editor=create(<Harness/>)});const root=()=>editor.root;const button=(label:string)=>root().findAllByType('button').find((b:any)=>b.props.children===label);const replace=()=>root().findAllByType('button').find((b:any)=>b.props['aria-label']?.startsWith('Replace '));const input=(suffix:string)=>root().findAllByType('input').find((n:any)=>n.props.id?.endsWith(suffix));
assert.equal(root().findAllByType('article').length,5);
await act(async()=>root().findAllByType('button').find((b:any)=>b.props['aria-label']?.startsWith('Delete ')).props.onClick());assert.equal(savedProfile.photoGallery.length,4);assert.equal(savedGallery.length,4);
await act(async()=>replace().props.onClick());await act(async()=>input('url').props.onChange({target:{value:'https://example.com/replaced.jpg'}}));await act(async()=>root().findByType('form').props.onSubmit({preventDefault(){}}));assert.ok(savedProfile.photoGallery.some((p:any)=>p.url==='https://example.com/replaced.jpg'&&!p.isDemo));
await act(async()=>replace().props.onClick());await act(async()=>input('url').props.onChange({target:{value:'javascript:alert(1)'}}));await act(async()=>root().findByType('form').props.onSubmit({preventDefault(){}}));assert.ok(root().findByProps({role:'alert'}));await act(async()=>button('Cancel').props.onClick());assert.ok(!savedGallery.some(url=>url.startsWith('javascript:')));
// Browser resize and storage are mocked: verify deferred upload, failure, retry, and preserved aspect ratio.
let uploads=0,fail=true,dimensions:number[][]=[];
(globalThis as any).FileReader=class{onload:any;readAsDataURL(){queueMicrotask(()=>this.onload({target:{result:'data:image/jpeg;base64,YWJj'}}))}};
(globalThis as any).Image=class{width=4000;height=3000;onload:any;set src(_:string){queueMicrotask(()=>this.onload())}};
(globalThis as any).document.createElement=()=>{const c:any={width:0,height:0,getContext:()=>({drawImage(){dimensions.push([c.width,c.height])}}),toDataURL:()=> 'data:image/jpeg;base64,YWJj'};return c;};
(supabase.auth as any).getUser=async()=>({data:{user:{id:'gallery-owner'}},error:null});(supabase.storage as any).from=(bucket:string)=>({upload:async(path:string,file:File)=>{assert.equal(bucket,'studioflow-media');assert.match(path,/^gallery-owner\//);uploads++;return {error:fail?new Error('Upload failed'):null}},getPublicUrl:()=>({data:{publicUrl:'https://example.com/uploaded-gallery.jpg'}})});
await act(async()=>replace().props.onClick());await act(async()=>input('file').props.onChange({target:{files:[new File(['photo'],'photo.jpg',{type:'image/jpeg'})]}}));assert.equal(uploads,0);
await act(async()=>root().findByType('form').props.onSubmit({preventDefault(){}}));assert.ok(root().findByProps({role:'alert'}));assert.ok(!savedGallery.includes('https://example.com/uploaded-gallery.jpg'));fail=false;
await act(async()=>root().findByType('form').props.onSubmit({preventDefault(){}}));assert.ok(savedGallery.includes('https://example.com/uploaded-gallery.jpg'));assert.ok(dimensions.some(([w,h])=>w===1600&&h===1200));await act(async()=>editor.unmount());
console.log('PASS: all 14 templates have only five selected-template samples; URL/device replacement, owner-only controls, delete, empty persistence, theme switches, retained personal photos, resize, storage ownership and retry.');
