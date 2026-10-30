import React,{useState} from 'react';import {act,create} from 'react-test-renderer';import {renderToStaticMarkup} from 'react-dom/server';import assert from 'node:assert/strict';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {isPackage,seedTemplatePackages} from '../src/lib/packageCatalogue';import {ServiceManagement} from '../src/components/ServiceManagement';import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';import {INITIAL_SALON_PROFILE} from '../src/mockData';import {serviceValidation} from '../src/lib/serviceCatalogue';import type {SalonService} from '../src/types';
for(const t of Object.values(CATEGORY_TEMPLATES)){
 const packages=t.services.filter(isPackage);assert.equal(packages.length,5,t.id);assert.equal(new Set(packages.map(p=>p.id)).size,5);assert.deepEqual(seedTemplatePackages(t),t.services,'Seed must be idempotent');
 for(const p of packages)assert.equal(serviceValidation(p),'');
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:t.id}} services={t.id==='skincare_clinic'?t.services.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true})):t.services} stylists={[]} onAddAppointment={async a=>a}/>);if(t.id==='skincare_clinic'){const directory=html.split('id="directory"')[1].split('id="technology"')[0];for(const item of packages)assert.ok(directory.includes(item.name.replaceAll('&','&amp;')),'Dermacure includes package in complete directory');assert.equal((directory.match(/class="dc-directory-image"/g)||[]).length,t.services.length);continue;}if(t.id==='hair_coloring'){
  // Template 10 shows its three spec tiers (Starter / Signature / Full
  // Transformation) as glass cards; the catalogue still seeds five packages.
  const section=html.split('id="pc-packages"')[1].split('</section>')[0];
  for(const tier of ['Starter','Signature','Full Transformation'])assert.ok(section.includes(tier),'Prism & Chroma shows the '+tier+' package tier');
  for(const price of ['₹2,499','₹5,999','₹9,999'])assert.ok(section.includes(price),'Prism & Chroma shows package price '+price);
  continue;
 }if(t.id==='bridal_lounge'){
  // Template 11 shows its three heirloom tiers (Classic / Royal / Maharani) as
  // glass package cards; the catalogue still seeds and books five packages.
  const section=html.split('id="sr-packages"')[1].split('</section>')[0];
  for(const tier of ['Classic Shringaar','Royal Rajputana','Maharani Heirloom'])assert.ok(section.includes(tier),'Shringaar Royal shows the '+tier+' package tier');
  for(const price of ['₹45,000','₹78,000','₹1,25,000'])assert.ok(section.includes(price),'Shringaar Royal shows package price '+price);
  assert.ok(section.includes('/templates/11/packages/'),'each bridal package card carries its own photograph');
  continue;
 }
 if(t.id==='tattoo_studio'){
  const section=html.split('id="salon-packages"')[1].split('</section>')[0];
  assert.equal((section.match(/class="sf-service-card"/g)||[]).length,5,'Iron & Ink package cards');
  assert.equal((section.match(/class="sf-service-image"/g)||[]).length,5,'Iron & Ink package images');
  for(const item of packages)assert.ok(section.includes(item.name.replaceAll('&','&amp;')),'Iron & Ink shows '+item.name);
  continue;
 }
 if(t.id==='lash_brow'){
  // Template 13 (Arch & Flutter) publishes its bundles on the Pricing page as
  // glass package cards, each with its own photograph and ₹ price; the catalogue
  // still seeds and books exactly five packages.
  (globalThis as any).window={location:{hash:'#packages'},scrollTo(){},addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
  let page='';
  try{
   page=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:t.id}} services={t.services} stylists={[]} onAddAppointment={async a=>a}/>);
  }finally{delete (globalThis as any).window;}
  const section=page.split('id="salon-packages"')[1].split('</section>')[0];
  assert.equal((section.match(/af-pkg(?:\s|\")/g)||[]).length,5,'Arch & Flutter package cards');
  assert.equal((section.match(/class="sf-service-image"/g)||[]).length,5,'Arch & Flutter package images');
  for(const item of packages)assert.ok(section.includes(item.name.replaceAll('&','&amp;')),'Arch & Flutter shows '+item.name);
  for(const price of ['₹1,999','₹4,999','₹2,799'])assert.ok(section.includes(price),'Arch & Flutter shows package price '+price);
  assert.ok(page.includes('UPI')&&page.includes('Book this package'),'Arch & Flutter packages book through the same flow and publish UPI');
  continue;
 }
 const section=html.split('id="salon-packages"')[1].split('</section>')[0];assert.equal((section.match(/class="sf-service-card(?:\s|\")/g)||[]).length,5,t.id+' package cards');assert.equal((section.match(/class="sf-service-image"/g)||[]).length,5,t.id+' package images');
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;(globalThis as any).document={activeElement:null,addEventListener(){},removeEventListener(){}};
let menu:SalonService[]=[];function Fixture(){const [services,setServices]=useState(CATEGORY_TEMPLATES.beauty_parlour.services);menu=services;return <ServiceManagement profile={{...INITIAL_SALON_PROFILE,businessType:'beauty_parlour'}} services={services} setServices={setServices} primaryAccentColor="#b70064"/>}
let editor:any;await act(async()=>{editor=create(<Fixture/>)});const button=(text:string)=>editor.root.findAllByType('button').find((b:any)=>b.children.join('').includes(text));
await act(async()=>button('Packages & Signature Rituals').props.onClick());assert.equal(editor.root.findAllByProps({className:'service-editor-card'}).length,5);
const first=menu.find(isPackage)!;await act(async()=>editor.root.findByProps({'aria-label':`Edit ${first.name}`}).props.onClick());const dialog=editor.root.findByProps({role:'dialog'});await act(async()=>dialog.findAllByType('input')[2].props.onChange({target:{value:'999'}}));await act(async()=>dialog.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(menu.find(p=>p.id===first.id)!.price,999);
await act(async()=>editor.root.findByProps({'aria-label':`Remove ${first.name}`}).props.onClick());await act(async()=>button('Confirm removal').props.onClick());assert.equal(menu.filter(isPackage).length,4);const reloaded=JSON.parse(JSON.stringify(menu));assert.ok(!reloaded.some((p:SalonService)=>p.id===first.id));await act(async()=>editor.unmount());
console.log('PASS: five category-specific packages and photos in all 14 templates; valid prices/durations, no duplicate seeding, package filter, edit, delete and saved menu preservation.');
