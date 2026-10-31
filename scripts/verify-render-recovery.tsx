import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {act,create} from 'react-test-renderer';
import {normalizeServices,hasServicesArray} from '../src/lib/normalizeServices';
import {clinicPublicServices,clinicPriceIsVerified} from '../src/lib/dermacureContent';
import {normalizeWorkspace} from '../src/lib/normalizeWorkspace';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {AccountLoading} from '../src/components/AccountLoading';

const service:any={id:'x',name:'Custom Care',description:'Owner description',category:'Skin',price:300,imageUrl:'https://example.com/image.jpg',clinicServiceApproved:true,clinicPublicationStatus:'published',clinicFeeStatus:'verified',clinicPriceVerified:true};
for(const input of [[service],{data:{services:[service]}},{content:{services:[service]}}]) {assert.deepEqual(normalizeServices(input,false),[service]);assert.deepEqual(clinicPublicServices({subdomain:'clinic'} as any,input),[service]);}
for(const input of [[],null,undefined,{},'invalid',42]) assert.deepEqual(normalizeServices(input,false),[]);
assert.equal(hasServicesArray([service,null]),false);assert.equal(hasServicesArray({data:{services:[service]}}),true);
assert.equal(clinicPriceIsVerified(service),true);assert.equal(clinicPublicServices(null,[service]).length,1);
const normalized = normalizeWorkspace({services:{data:{services:[service]}}}).services[0];
for (const [key,value] of Object.entries(service)) assert.deepEqual((normalized as any)[key],value, `preserves ${key}`);
assert.ok(renderToStaticMarkup(<CustomerSalonWebsite profile={undefined as any} services={[]} stylists={[]} onAddAppointment={async a=>a}/>).includes('profile is unavailable'));
for(const id of ['skincare_clinic','tattoo_studio']) {
 const template=CATEGORY_TEMPLATES[id];const profile={...INITIAL_SALON_PROFILE,businessType:id};
 const menu=id==='skincare_clinic'?template.services.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published',clinicFeeStatus:'verified',clinicPriceVerified:true})):template.services;
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={menu as any} stylists={template.stylists} onAddAppointment={async a=>a}/>);
 assert.ok(html.length>1000,`${id} renders`);
 const malformed=renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={[{...service,category:123,description:null} ] as any} stylists={null as any} onAddAppointment={async a=>a}/>);assert.ok(malformed.length>1000);
 const empty=renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={null as any} stylists={[]} onAddAppointment={async a=>a}/>);assert.ok(empty.length>1000);
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let callback:()=>void=()=>{};let cleared=false;const oldSet=globalThis.setTimeout,oldClear=globalThis.clearTimeout;
const marker = {};
(globalThis as any).setTimeout=(fn:()=>void,ms:number,...args:any[])=>{if(ms===10000){callback=fn;return marker;} return oldSet(fn,ms,...args)};
(globalThis as any).clearTimeout=(id:any)=>{if(id===marker)cleared=true;else oldClear(id)};
let retries=0;let renderer:any;
await act(()=>{renderer=create(<AccountLoading onRetry={()=>retries++}/>)});
assert.equal(renderer.root.findAllByType('button').length,0);
await act(()=>callback());
assert.ok(JSON.stringify(renderer.toJSON()).includes('Account loading state: loading'));
await act(()=>{const click=renderer.root.findByType('button').props.onClick;click();click();});assert.equal(retries,1);
await act(()=>renderer.unmount());assert.ok(cleared);
globalThis.setTimeout=oldSet;globalThis.clearTimeout=oldClear;
console.log('PASS: service shapes, profile fallback, clinic/tattoo server rendering, 10-second loading diagnostic, retry and timer cleanup');
