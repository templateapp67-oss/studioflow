import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {defaultServiceImage} from '../src/lib/serviceImages';
import {servicePhotoFromUrl} from '../src/lib/servicePhoto';
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const services=template.services;
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={services} stylists={[]} onAddAppointment={async a=>a}/>);
 // Template 06 lifts packages out of the menu grid, so every saved service
 // still needs a photo — just rendered once instead of in two card grids.
 const count=template.id==='hair_spa'?services.length:services.length+services.filter(s=>/package|combo|bundle/i.test(s.name+' '+s.category)).length;
 assert.equal((html.match(/class="sf-service-image"/g)||[]).length,count,template.id+' all services and packages need photos');
 for(const service of services){const expectedPhoto=service.imageUrl||defaultServiceImage(service,template.id);assert.ok(html.includes(expectedPhoto.replaceAll('&','&amp;')));}
 const custom={...services[0],name:'QA package',category:'Packages',imageUrl:'https://example.com/owner-photo.jpg'};
 const changed=renderToStaticMarkup(<CustomerSalonWebsite profile={{...INITIAL_SALON_PROFILE,businessType:template.id}} services={[custom]} stylists={[]} onAddAppointment={async a=>a}/>);
 assert.equal((changed.match(/class="sf-service-image"><img[^>]*src="https:\/\/example.com\/owner-photo.jpg"/g)||[]).length,template.id==='hair_spa'?1:2,'owner image follows the template\'s card layout');
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
