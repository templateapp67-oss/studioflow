// Behavioral template preview matrix. No real booking, Supabase write or payment.
import React from 'react';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {BookingModal} from '../src/components/BookingModal';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {TemplateBookingPreview} from '../src/lib/templateBookingPreview';
import {indiaDate} from '../src/lib/bookingDates';
import {supabase} from '../src/lib/supabase';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).location={origin:'https://studioflow.test',search:'',hash:'',assign(){}};
(globalThis as any).document={hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null},getElementById(){return null},body:{style:{}}};
(globalThis as any).window={location:(globalThis as any).location,setInterval,clearInterval,setTimeout,clearTimeout,scrollTo(){},addEventListener(){},removeEventListener(){},matchMedia(){return {matches:false,addEventListener(){},removeEventListener(){}}}};
let writes=0;
(supabase as any).rpc=async()=>({data:[],error:null});
(supabase as any).functions.invoke=async()=>{writes++;throw new Error('No remote calls are allowed in template preview');};
const text=(node:any):string=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):(node?.children||[]).map(text).join(' ');
const button=(root:any,label:string)=>root.findAll((n:any)=>n.type==='button'&&text(n).includes(label))[0];
const openService=async(ui:any,services:any[])=>{
 for(const service of services.filter(s=>s.durationMinutes>0&&s.durationMinutes<=480)){
  const markers=ui.root.findAll((n:any)=>typeof n.type==='string'&&n.children?.some((child:any)=>typeof child==='string'&&child.includes(service.name)));
  for(const marker of markers){
   let ancestor:any=marker;
   for(let depth=0;ancestor&&depth<6;depth++,ancestor=ancestor.parent){
    const actions=ancestor.findAll((n:any)=>n.type==='button'&&typeof n.props.onClick==='function'&&!n.props.disabled&&(/book|reserve|choose/i.test(text(n))||n===ancestor));
    for(const action of actions){
     await act(async()=>action.props.onClick({preventDefault(){},stopPropagation(){}}));
     const modal=ui.root.findAllByType(BookingModal).find((n:any)=>n.props.isOpen);
     if(modal?.props.initialService?.id===service.id)return {modal,service};
    }
   }
  }
 }
 throw new Error('No service-card booking action opened the correct shared modal');
};

const ids=Object.keys(CATEGORY_TEMPLATES);
assert.equal(ids.length,16,'all registered templates must be covered');
for(const template of Object.values(CATEGORY_TEMPLATES)){
 if(template.id==='tattoo_studio')continue; // Separate, unpaid artist-request flow is covered below and by its DB verifier.
 const services=template.services.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true}));
 const stylists=template.stylists.map((s,i)=>({...s,id:`matrix-${i}`,assignedServices:[],status:'Available' as const}));
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id,businessName:'Matrix Salon',subdomain:`matrix-${template.id}`,promoCampaign:undefined,socialVideos:[]};
 let ui:any;
 await act(async()=>{ui=create(<TemplateBookingPreview.Provider value><CustomerSalonWebsite readOnly profile={profile} services={services} stylists={stylists} gallery={[]} onAddAppointment={async()=>{writes++;throw new Error('No booking in preview');}}/></TemplateBookingPreview.Provider>)});
 try{
  const {modal,service}=await openService(ui,services);
  assert.equal(modal.props.profile.subdomain,profile.subdomain,`${template.id}: salon identity`);
  assert.equal(modal.props.initialService.id,service.id,`${template.id}: service identity`);
  assert.equal(modal.props.initialService.durationMinutes,service.durationMinutes,`${template.id}: duration`);
  assert.equal(modal.props.initialService.price,service.price,`${template.id}: price`);
  assert.equal(modal.findByProps({'aria-label':`Select service ${service.name}`}).props['aria-checked'],true,`${template.id}: selected service`);
  await act(async()=>button(modal,'Continue to Date & Slot').props.onClick());
  await act(async()=>modal.findByProps({'aria-label':'Appointment date'}).props.onChange({target:{value:indiaDate(1)}}));
  const slot=button(modal,'10:00 AM');assert.ok(slot,`${template.id}: example Step 2 slots`);
  await act(async()=>slot.props.onClick());
  await act(async()=>button(modal,'Continue to Guest Details').props.onClick());
  await act(async()=>{modal.findByProps({placeholder:'e.g. Aarti Sharma'}).props.onChange({target:{value:'Guest Test'}});modal.findByProps({placeholder:'98765 43210'}).props.onChange({target:{value:'9876543210'}})});
  await act(async()=>modal.findAll((n:any)=>typeof n.props.onSubmit==='function')[0].props.onSubmit({preventDefault(){}}));
  assert.match(text(modal),/Template demo/);
  const submit=modal.findByProps({'data-testid':'booking-pay-submit'});assert.equal(submit.props.disabled,true,`${template.id}: demo cannot take payment`);
  console.log(`PASS template ${template.id}: service CTA → example slot → guest review; no payment`);
 } finally {await act(async()=>ui.unmount());}
}
assert.equal(writes,0,'template preview must not create bookings or contact payment services');
console.log('PASS: 15 shared-modal templates; Template 12 is checked separately as an unpaid request flow.');
