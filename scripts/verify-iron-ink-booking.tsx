// Behavioral Iron Ink flow with mocked RPCs only: no real request or payment.
import React from 'react';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {IronInkWebsite} from '../src/components/IronInkWebsite';
import {getInkAvailableSlots} from '../src/templates/iron-ink/api';
import {TemplateBookingPreview} from '../src/lib/templateBookingPreview';
import {indiaDate} from '../src/lib/bookingDates';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {supabase} from '../src/lib/supabase';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).location={origin:'https://studioflow.test',search:'',hash:'',assign(){}};
(globalThis as any).document={hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null},getElementById(){return null},body:{style:{}},documentElement:{style:{}}};
(globalThis as any).window={location:(globalThis as any).location,scrollY:0,setInterval,clearInterval,setTimeout,clearTimeout,scrollTo(){},addEventListener(){},removeEventListener(){},matchMedia(){return {matches:false,addEventListener(){},removeEventListener(){}}}};
const siteId='11111111-1111-4111-8111-111111111111',artistId='22222222-2222-4222-8222-222222222222',categoryId='33333333-3333-4333-8333-333333333333';
const tomorrow=indiaDate(1),nextDay=indiaDate(2);
const category={id:categoryId,site_id:siteId,slug:'fine-line',name:'Fine Line',image_url:'',description:'',starting_price:1500,duration_min:60,duration_label:'60 min',is_active:true};
const artist={id:artistId,site_id:siteId,name:'Real Artist',photo_url:'',bio:'Tattoo artist',specialties:[],experience_years:3,is_active:true};
const site:any={site_id:siteId,branches:[],settings:null,categories:[category],artists:[artist],portfolio:[],pricing:[],testimonials:[],faqs:[],aftercare:[]};
const calls:Array<{name:string,args:any}>=[];let paymentCalls=0,siteResponse:any=site,slotResponse:any=[],deferDate='',deferred:((value:any)=>void)|null=null;
(supabase as any).rpc=async(name:string,args:any)=>{
 calls.push({name,args});
 if(name==='get_template12_site_by_slug')return {data:siteResponse,error:null};
 if(name==='get_available_slots'||name==='get_branch_available_slots'){
  if(args.p_date===deferDate)return new Promise(resolve=>{deferred=resolve});
  return {data:typeof slotResponse==='function'?slotResponse(args):slotResponse,error:null};
 }
 if(name==='create_booking'||name==='create_branch_booking')return {data:{id:'44444444-4444-4444-8444-444444444444',branch_id:args.p_branch_id||null,status:'pending',deposit_paid:false},error:null};
 return {data:null,error:null};
};
(supabase as any).functions.invoke=async()=>{paymentCalls++;throw new Error('No payment calls in this test');};
const valid={start_time:'11:00:00',end_time:'12:00:00'};
slotResponse=[null,{start_time:'xx:yy',end_time:'12:00'},valid,{start_time:'18:00',end_time:'25:00'},{start_time:5,end_time:'12:00'}];
assert.deepEqual(await getInkAvailableSlots(siteId,artistId,tomorrow,60),[valid],'only well-formed times survive');
slotResponse={start_time:'11:00',end_time:'12:00'};
await assert.rejects(getInkAvailableSlots(siteId,artistId,tomorrow),/could not load/i,'non-array results fail closed');
slotResponse=[valid];
await getInkAvailableSlots(siteId,artistId,tomorrow,60,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
assert.equal(calls.at(-1)?.name,'get_branch_available_slots');
assert.equal(calls.at(-1)?.args.p_branch_id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

const text=(node:any):string=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):(node?.children||[]).map(text).join(' ');
const button=(ui:any,label:string)=>ui.root.findAll((node:any)=>node.type==='button'&&text(node).includes(label))[0];
const click=async(node:any)=>act(async()=>node.props.onClick());
const props:any={profile:{...INITIAL_SALON_PROFILE,businessType:'tattoo_studio',businessName:'Test Ink',subdomain:'test-ink'},services:CATEGORY_TEMPLATES.tattoo_studio.services,stylists:CATEGORY_TEMPLATES.tattoo_studio.stylists,galleryPhotos:[],siteSlug:'test-ink',bookingAvailable:true,onBook:()=>{throw new Error('Live request must not use the preview handoff');}};
const begin=async(ui:any)=>{await click(ui.root.findByProps({className:'ii-book-head'}));await click(button(ui,'CONTINUE'));await click(button(ui,'CONTINUE'));};
const dateField=(ui:any)=>ui.root.findAll((node:any)=>node.type==='input'&&node.props.type==='date')[0];
const timeField=(ui:any)=>ui.root.findAll((node:any)=>node.type==='select')[0];
const optionValues=(ui:any)=>timeField(ui).findAllByType('option').map((option:any)=>option.props.value);

// A slow old date response must not replace the current artist/date slots.
slotResponse=(args:any)=>args.p_date===nextDay?[{start_time:'12:00:00',end_time:'13:00:00'}]:[valid];
deferDate=tomorrow;
let ui:any;await act(async()=>{ui=create(<IronInkWebsite {...props}/>)});await begin(ui);
await act(async()=>dateField(ui).props.onChange({target:{value:tomorrow}}));
assert.equal(button(ui,'CONTINUE').props.disabled,true);
assert.ok(deferred,'the first date request is still pending');
await act(async()=>dateField(ui).props.onChange({target:{value:nextDay}}));
assert.ok(optionValues(ui).includes('12:00'));
assert.ok(!optionValues(ui).includes('11:00'));
await act(async()=>{deferred!({data:[valid],error:null});});
assert.ok(optionValues(ui).includes('12:00')&&!optionValues(ui).includes('11:00'),'stale availability response is ignored');
await act(async()=>timeField(ui).props.onChange({target:{value:'12:00'}}));
await click(button(ui,'CONTINUE'));
assert.match(text(ui.toJSON()),/unpaid request/i);
await act(async()=>{
 ui.root.findByProps({placeholder:'Full name'}).props.onChange({target:{value:'Guest Test'}});
 ui.root.findByProps({placeholder:'Phone number'}).props.onChange({target:{value:'9876543210'}});
 ui.root.findByProps({placeholder:'e.g. outer forearm, or not sure yet'}).props.onChange({target:{value:'Forearm'}});
 dateField(ui).props.onChange({target:{value:'1990-01-01'}});
 timeField(ui).props.onChange({target:{value:'Small · under 5 cm'}});
});
assert.equal(button(ui,'REQUEST THIS SESSION').props.disabled,true,'unpaid request requires explicit acknowledgement');
await act(async()=>ui.root.findByProps({className:'ii-deposit-ack'}).findByType('input').props.onChange({target:{checked:true}}));
assert.equal(button(ui,'REQUEST THIS SESSION').props.disabled,false);
await click(button(ui,'REQUEST THIS SESSION'));
const request=calls.findLast(call=>call.name==='create_booking');
assert.ok(request);assert.equal(request.args.p_site_id,siteId);assert.equal(request.args.p_artist_id,artistId);assert.equal(request.args.p_category_id,categoryId);
assert.equal(request.args.p_booking_date,nextDay);assert.equal(request.args.p_start_time,'12:00');assert.equal(request.args.p_placement,'Forearm');
assert.match(text(ui.toJSON()),/REQUEST RECEIVED · NOT YET CONFIRMED/);
assert.match(text(ui.toJSON()),/No payment has been taken/);
assert.equal(paymentCalls,0);
await act(async()=>ui.unmount());

// No live data means no fabricated live times and no request.
deferDate='';siteResponse=null;slotResponse=[valid];
await act(async()=>{ui=create(<IronInkWebsite {...props}/>)});await begin(ui);
await act(async()=>dateField(ui).props.onChange({target:{value:tomorrow}}));
assert.deepEqual(optionValues(ui),['']);
assert.match(text(ui.toJSON()),/Online availability could not be loaded/);
assert.equal(button(ui,'CONTINUE').props.disabled,true);
await act(async()=>ui.unmount());

// Public template preview is deliberately illustrative and cannot make an RPC.
siteResponse=site;const handoffs:any[]=[];const before=calls.length;
await act(async()=>{ui=create(<TemplateBookingPreview.Provider value><IronInkWebsite {...props} onBook={(...args:any[])=>handoffs.push(args)}/></TemplateBookingPreview.Provider>)});
await begin(ui);await act(async()=>dateField(ui).props.onChange({target:{value:tomorrow}}));
assert.match(text(ui.toJSON()),/example times only/i);
const sample=optionValues(ui).find((value:any)=>value);assert.ok(sample);
await act(async()=>timeField(ui).props.onChange({target:{value:sample}}));await click(button(ui,'CONTINUE'));
await act(async()=>ui.root.findByProps({className:'ii-deposit-ack'}).findByType('input').props.onChange({target:{checked:true}}));
await click(button(ui,'CONTINUE DEMO'));
assert.equal(handoffs.length,1);assert.equal(handoffs[0][2].date,tomorrow);assert.equal(handoffs[0][2].time,sample);
assert.ok(!calls.slice(before).some(call=>['get_template12_site_by_slug','get_available_slots','create_booking','create_branch_booking'].includes(call.name)),'preview does not query or write real bookings');
assert.equal(paymentCalls,0);
await act(async()=>ui.unmount());
console.log('PASS: Iron Ink malformed-response guards, stale availability, live unpaid request, unavailable live data and non-writing template preview.');
