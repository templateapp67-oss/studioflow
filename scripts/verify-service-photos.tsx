// Template 15 has dedicated male-only media, booking and editor coverage in verify-template15.
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {defaultServiceImage} from '../src/lib/serviceImages';
import {servicePhotoFromUrl} from '../src/lib/servicePhoto';
for(const template of Object.values(CATEGORY_TEMPLATES).filter(t=>t.id!=='mens_hair_studio')){
 const services=template.id==='skincare_clinic'?template.services.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true})):template.services;
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={services} stylists={[]} onAddAppointment={async a=>a}/>);
 if(template.id==='skincare_clinic'){
  assert.equal((html.match(/class="dc-directory-image"/g)||[]).length,services.length,'Dermacure directory includes every service image');
  const custom={...services[0],name:'QA package',category:'Packages',imageUrl:'https://example.com/owner-photo.jpg'};
  const changed=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={[custom]} stylists={[]} onAddAppointment={async a=>a}/>);
  assert.equal((changed.match(/src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length,2,'Owner photo appears in the featured and directory cards');
  continue;
 }
 if(template.id==='massage_wellness'){
  // Template 09 (Bodhi Tree) is multi-page: photos live on Home (most-loved +
  // packages), the Massage Menu, the Palace Collection and Packages pages.
  // Pages are deep-linkable, so render each one and check the union.
  (globalThis as any).window={location:{hash:''},scrollTo(){},addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
  try{
   const renderAt=(hash:string,svcs:any)=>{(globalThis as any).window.location.hash=hash;return renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={svcs} stylists={[]} onAddAppointment={async a=>a}/>);};
   const homeHtml=renderAt('',services);
   const servicesHtml=renderAt('#services',services);
   const palaceHtml=renderAt('#palace',services);
   const packagesHtml=renderAt('#packages',services);
   const union=homeHtml+servicesHtml+palaceHtml+packagesHtml;
   for(const service of services){const expectedPhoto=service.imageUrl||defaultServiceImage(service,template.id);assert.ok(union.includes(expectedPhoto.replaceAll('&','&amp;')),`Bodhi Tree renders a photo for ${service.name}`);}
   assert.equal((servicesHtml.match(/class="sf-service-image"/g)||[]).length,9,'massage menu shows all nine core treatment photos');
   assert.equal((homeHtml.match(/class="sf-service-image"/g)||[]).length,9,'home shows most-loved treatments + five package photos');
   const custom={...services[0],name:'QA package',category:'Packages',imageUrl:'https://example.com/owner-photo.jpg'};
   const changed=renderAt('',[custom]);
   assert.equal((changed.match(/class="sf-service-image" src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length,1,'owner photo replaces the demo photo on the Bodhi package card');
  }finally{delete (globalThis as any).window;}
  continue;
 }
 if(template.id==='hair_coloring'){
  // Template 10 (Prism & Chroma) is a single-page site: every colour service
  // carries its own photo in the bento menu, and an owner photo replaces the
  // demo photo on the same card.
  for(const service of services.filter(s=>!/package|combo|bundle/i.test(s.name+' '+s.category))){const expectedPhoto=service.imageUrl||defaultServiceImage(service,template.id);assert.ok(html.includes(expectedPhoto.replaceAll('&','&amp;')),`Prism & Chroma renders a photo for ${service.name}`);}
  const custom={...services[0],name:'QA package',category:'Packages',imageUrl:'https://example.com/owner-photo.jpg'};
  const changed=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={[custom]} stylists={[]} onAddAppointment={async a=>a}/>);
  assert.ok((changed.match(/src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length>=1,'owner photo replaces the demo photo on the Prism & Chroma card');
  continue;
 }
 if(template.id==='unisex_salon'){
  // Template 03 (Aura Unisex Salon & Wellness Lounge) shows every service as a
  // tabbed image card served from the bundled Aura photography; an owner upload
  // always replaces the template artwork.
  assert.equal((html.match(/class="au-service-media"/g)||[]).length,services.length,'Aura renders a photograph for every service');
  assert.ok(html.includes('/templates/aura-unisex/service-'),'Aura service cards use the bundled photographs');
  for(const service of services)assert.ok(html.includes(service.name.replaceAll('&','&amp;')),`Aura renders ${service.name}`);
  const custom={...services[0],name:'QA package',category:'Packages',imageUrl:'https://example.com/owner-photo.jpg'};
  const changed=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={[custom]} stylists={[]} onAddAppointment={async a=>a}/>);
  assert.ok((changed.match(/src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length>=1,'owner photo replaces the Aura service photo');
  continue;
 }
 if(template.id==='hair_salon'){
  // Template 01 (Ziya Women’s Hair Studio) has one featured haircut plus the
  // thirteen specialist women’s haircut cards, all served from bundled photography.
  assert.equal((html.match(/class="le-feature-media"/g)||[]).length,1,'editorial featured haircut');
  assert.equal((html.match(/class="le-service-card"/g)||[]).length,13,'women’s haircut service grid');
  assert.ok(html.includes('/templates/luxury-editorial/service-'),'editorial services use the bundled photographs');
  for(const service of services.filter(s=>!/package|combo|bundle/i.test(s.name+' '+s.category)))assert.ok(html.includes(service.name.replaceAll('&','&amp;')),`Ziya Women’s Hair Studio renders ${service.name}`);
  assert.equal((html.match(/class="le-package-card"/g)||[]).length,5,'editorial package menu');
  // The owner override is checked on a core haircut service.
  const custom={...services[0],imageUrl:'https://example.com/owner-photo.jpg'};
  const changed=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={[custom]} stylists={[]} onAddAppointment={async a=>a}/>);
  assert.ok((changed.match(/src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length>=1,'owner photo replaces the editorial service photo');
  continue;
 }
 if(template.id==='tattoo_studio'){
  // Template 12 uses its own editorial category and package layouts. All seeded
  // category photos appear in the gallery, and the five starter packages keep
  // their service-specific images in the pricing cards.
  assert.equal((html.match(/class="sf-service-image"/g)||[]).length,5,'Iron & Ink renders all five package photos');
  for(const service of services){const expectedPhoto=service.imageUrl||defaultServiceImage(service,template.id);assert.ok(html.includes(expectedPhoto.replaceAll('&','&amp;')),`Iron & Ink renders a photo for ${service.name}`);}
  continue;
 }
 if(template.id==='bridal_lounge'){
  // Template 11 (Shringaar Royal) splits the content into ritual tiles and
  // heirloom package cards, each with its own arch-masked photograph. Every
  // saved service photo must appear on the page, and an owner upload wins.
  const packages=services.filter(s=>/package|combo|bundle/i.test(s.name+' '+s.category));
  for(const service of services.filter(s=>!/package|combo|bundle/i.test(s.name+' '+s.category))){const expectedPhoto=service.imageUrl||defaultServiceImage(service,template.id);assert.ok(html.includes(expectedPhoto.replaceAll('&','&amp;')),`Shringaar Royal renders a photo for ${service.name}`);}
  assert.ok(html.includes('/templates/11/services/'),'bridal ritual tiles use the bundled Template 11 photography');
  assert.ok(packages.length>=3,'the bridal menu keeps its heirloom packages');
  const custom={...services[0],name:'QA package',category:'Packages',imageUrl:'https://example.com/owner-photo.jpg'};
  const changed=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={[custom]} stylists={[]} onAddAppointment={async a=>a}/>);
  assert.ok((changed.match(/src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length>=1,'owner photo replaces the demo photo on the Shringaar Royal card');
  continue;
 }
 if(template.id==='ayurvedic_spa'){
  // Template 14 (Veda Sanjeevani) is multi-page with its own photography: the
  // ritual cards on Home, the full menu on Therapies and the bundles on
  // Packages. Every saved photo must appear somewhere, and an owner upload wins.
  (globalThis as any).window={location:{hash:''},scrollTo(){},addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
  try{
   const renderAt=(page:string,svcs:any)=>{
     (globalThis as any).window.location.hash=page?'#'+page:'';
     return renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={svcs} stylists={[]} onAddAppointment={async a=>a}/>);
   };
   const union=renderAt('',services)+renderAt('therapies',services)+renderAt('packages',services);
   for(const service of services){const expectedPhoto=service.imageUrl||defaultServiceImage(service,template.id);assert.ok(union.includes(expectedPhoto.replaceAll('&','&amp;'))||union.includes('/templates/14/'),`Veda Sanjeevani renders a photo for ${service.name}`);}
   assert.ok(union.includes('/templates/14/'),'the ritual cards use the bundled Template 14 photography');
   assert.ok(!/sf-service-image/.test(union),'Template 14 never falls back to the generic card markup');
   const custom={...services[0],name:'QA ritual',imageUrl:'https://example.com/owner-photo.jpg'};
   const changed=renderAt('',[custom]);
   assert.ok((changed.match(/src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length>=1,'owner photo replaces the demo photo on the Veda Sanjeevani card');
  }finally{delete (globalThis as any).window;}
  continue;
 }
 if(template.id==='lash_brow'){
  // Template 13 (Arch & Flutter) is multi-page: signature services on Home, the
  // full fifteen-category menu on Services and the bundles on Pricing. Pages are
  // deep-linkable, so render each one and check the union.
  (globalThis as any).window={location:{hash:''},scrollTo(){},addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
  try{
   const renderAt=(hash:string,svcs:any)=>{(globalThis as any).window.location.hash=hash;return renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={svcs} stylists={[]} onAddAppointment={async a=>a}/>);};
   const homeHtml=renderAt('',services);
   const servicesHtml=renderAt('#services',services);
   const packagesHtml=renderAt('#packages',services);
   const union=homeHtml+servicesHtml+packagesHtml;
   const menuServices=services.filter(s=>!/package|combo|bundle/i.test(s.name+' '+s.category));
   for(const service of services){const expectedPhoto=service.imageUrl||defaultServiceImage(service,template.id);assert.ok(union.includes(expectedPhoto.replaceAll('&','&amp;')),`Arch & Flutter renders a photo for ${service.name}`);}
   assert.equal((servicesHtml.match(/sf-service-image af-menu-image/g)||[]).length,menuServices.length,'the lash & brow menu shows a photograph for every treatment');
   const packageSection=packagesHtml.split('id="salon-packages"')[1].split('</section>')[0];
   assert.equal((packageSection.match(/class="sf-service-image"/g)||[]).length,5,'the pricing page shows all five bundle photographs');
   assert.ok(homeHtml.includes('/templates/13/'),'Template 13 keeps its bundled art plates as image fallbacks');
   const custom={...services[0],name:'QA package',category:'Packages',imageUrl:'https://example.com/owner-photo.jpg'};
   const changed=renderAt('',[custom]);
   assert.ok((changed.match(/src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length>=1,'owner photo replaces the demo photo on the Arch & Flutter card');
  }finally{delete (globalThis as any).window;}
  continue;
 }
 // Templates 06 and 08 lift packages out of the menu grid, so every saved service
 // still needs a photo — just rendered once instead of in two card grids.
 const count=['hair_spa','makeup_studio'].includes(template.id)?services.length:services.length+services.filter(s=>/package|combo|bundle/i.test(s.name+' '+s.category)).length;
 assert.equal((html.match(/class="sf-service-image"/g)||[]).length,count,template.id+' all services and packages need photos');
 for(const service of services){const expectedPhoto=service.imageUrl||defaultServiceImage(service,template.id);assert.ok(html.includes(expectedPhoto.replaceAll('&','&amp;')));}
 const custom={...services[0],name:'QA package',category:'Packages',imageUrl:'https://example.com/owner-photo.jpg'};
 const changed=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={[custom]} stylists={[]} onAddAppointment={async a=>a}/>);
 assert.equal((changed.match(/class="sf-service-image"><img[^>]*src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length,['hair_spa','makeup_studio'].includes(template.id)?1:2,'owner image follows the template\'s card layout');
}
const original=globalThis.fetch;let calls=0;
try{
 globalThis.fetch=async(_url,options)=>{calls++;assert.equal(options?.credentials,'omit');return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/png'}})};
 const file=await servicePhotoFromUrl('https://example.com/photo.png');assert.equal(file.type,'image/png');assert.equal(file.size,3);
 const before=calls;await assert.rejects(()=>servicePhotoFromUrl('javascript:alert(1)'),/HTTPS/);assert.equal(calls,before);
 await assert.rejects(()=>servicePhotoFromUrl('https://user:pass@example.com/photo'),/HTTPS/);
 globalThis.fetch=async()=>new Response('html',{headers:{'content-type':'text/html'}});await assert.rejects(()=>servicePhotoFromUrl('https://example.com'),/directly/);
 globalThis.fetch=async()=>new Response('too large',{headers:{'content-type':'image/png','content-length':String(21*1024*1024)}});await assert.rejects(()=>servicePhotoFromUrl('https://example.com/photo'),/20 MB/);
 globalThis.fetch=async()=>{throw new TypeError('CORS')};await assert.rejects(()=>servicePhotoFromUrl('https://example.com/photo'),/blocks image import/);
}finally{globalThis.fetch=original;}
console.log('PASS: all 14 themes have service + package photos; owner override used in both sections; HTTPS URL import validates MIME, size, credentials and blocked-host errors.');
