import React from 'react';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {BookingModal} from '../src/components/BookingModal';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {supabase} from '../src/lib/supabase';
import {toggleBookingService,summarizeBookingServices} from '../src/lib/bookingSelection';
import type {SalonService,Stylist} from '../src/types';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let reservation:any;
const paymentCalls:string[]=[];
globalThis.fetch=async(_url,request)=>{
 const body=request?.body?JSON.parse(String(request.body)):null;
 if(body)paymentCalls.push(body.action);
 const order={keyId:'rzp_test_local',orderId:'order_qa',amount:108000,currency:'INR'};
 const base={...reservation,id:'fixture-booking'};
 const data=body?.action==='prepareWebCheckout'?{booking:base}:body?.action==='create'?order:body?.action==='verify'
  ?{booking:{...base,status:'confirmed',paymentStatus:'paid_full',amountPaid:1080,paymentId:body.paymentId,orderId:body.orderId}}
  :{webCheckout:{online:true,venue:true,mode:'test'}};
 return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
};
const services:SalonService[]=[{id:'cut',name:'Haircut',category:'Hair',price:800,durationMinutes:30,description:'Cut',icon:'scissors'},{id:'beard',name:'Beard Sculpting',category:'Beard',price:400,durationMinutes:45,description:'Beard',icon:'scissors'}];
const people:Stylist[]=[{id:'cut-only',name:'Hair Specialist',role:'Hair stylist',rating:4.5,avatarUrl:'',specialties:[],experienceYears:3},{id:'both',name:'Complete Specialist',role:'Senior stylist',rating:4.9,avatarUrl:'',specialties:['Cuts','Beards'],experienceYears:8,bio:'A carefully published bio'},{id:'beard-only',name:'Beard Specialist',role:'Barber',rating:4.7,avatarUrl:'',specialties:[]}];
const calls:any[]=[];let fail=false,delay=false,pending:((value:any)=>void)[]=[],empty=false;
supabase.rpc=(async(name:string,args:any)=>{
 calls.push({name,args});
 if(name==='studioflow_public_branches')return {data:[],error:null};
 if(name==='studioflow_booking_specialists'){
  if(fail)return {data:null,error:{message:'Staff connection failed'}};
  const ids=empty?[]:args.p_service_id==='cut'?['cut-only','both']:['both','beard-only'];
  const result={data:{published:true,specialistIds:ids,specialists:people.filter(p=>ids.includes(p.id))},error:null};
  if(delay)return new Promise(resolve=>pending.push(()=>resolve(result)));
  return result;
 }
 if(name==='studioflow_coupon_quote')return {data:{code:'TEN',finalPrice:1080,discountAmount:120,originalPrice:1200,advanceAmount:270},error:null};
 return {data:[{time:'12:00',label:'12:00 PM',available:true,stylistId:'both'}],error:null};
}) as any;
const text=(node:any):string=>typeof node==='string'?node:node?.children?.map(text).join('')||'';
let ui:any;
let acceptReservation=false;
const props={isOpen:true,onClose(){},profile:{...INITIAL_SALON_PROFILE,subdomain:'qa-bundle'},services,stylists:[] as Stylist[],onAddAppointment:async(apt:any)=>{reservation=apt;if(!acceptReservation)throw new Error('Stop before real payment');return {...apt,id:'fixture-booking'};}};
await act(async()=>{ui=create(<BookingModal {...props}/>)});
const label=(value:string)=>ui.root.findByProps({'aria-label':value});
const button=(value:string)=>ui.root.findAllByType('button').find((n:any)=>text(n).includes(value));
const click=async(node:any)=>act(async()=>node.props.onClick());
const total=()=>text(label('Selected services total'));
assert.match(total(),/1 services selected.*₹800.*30 mins.*₹800/);
assert.equal(label('Select Any Specialist').props['aria-pressed'],true,'Any is default');
assert.ok(label('Select specialist Complete Specialist'),'RPC published profiles render even when parent staff list is empty');
assert.equal(ui.root.findAllByProps({'aria-label':'Complete Specialist profile'}).length,0,'No automatic profile opening');
await click(label('Select specialist Complete Specialist'));
assert.equal(ui.root.findAllByProps({'aria-label':'Complete Specialist profile'}).length,0,'Selecting staff does not open profile');
await click(label('View Profile: Complete Specialist'));
assert.match(text(label('Complete Specialist profile')),/carefully published bio/);
assert.equal(label('Select specialist Complete Specialist').props['aria-pressed'],true);
await click(button('Back to booking'));
assert.equal(ui.root.findAllByProps({'aria-label':'Complete Specialist profile'}).length,0);
await click(label('Select service Beard Sculpting'));
assert.match(total(),/2 services selected.*₹1,200.*75 mins.*₹1,200/);
assert.equal(label('Select service Haircut').props['aria-checked'],true);
assert.equal(label('Select service Beard Sculpting').props['aria-checked'],true);
assert.equal(label('Select Any Specialist').props['aria-pressed'],true,'Bundle changes reset specialist');
assert.equal(ui.root.findAllByProps({'aria-label':'Select specialist Hair Specialist'}).length,0,'Must handle all services');
assert.deepEqual(calls.findLast(c=>c.name==='studioflow_android_slots').args.p_services,['cut','beard']);
await click(label('View Profile: Complete Specialist'));
assert.equal(label('Select specialist Complete Specialist').props['aria-pressed'],false,'Preview must not select');
await click(button('Back to booking'));
await click(button('Continue to Date & Slot'));await click(button('12:00 PM'));await click(button('Continue to Guest Details'));
await act(async()=>{ui.root.findByProps({placeholder:'e.g. Aarti Sharma'}).props.onChange({target:{value:'QA Guest'}});ui.root.findByProps({placeholder:'98765 43210'}).props.onChange({target:{value:'9876543210'}});ui.root.findByProps({placeholder:'name@example.in'}).props.onChange({target:{value:'qa@example.invalid'}})});
await act(async()=>ui.root.findAll(n=>typeof n.props.onSubmit==='function')[0].props.onSubmit({preventDefault(){}}));
assert.match(text(ui.toJSON()),/Haircut \+ Beard Sculpting/);assert.match(text(ui.toJSON()),/75 mins/);assert.match(text(button('Pay ₹')),/1,200/);
await act(async()=>label('Coupon code').props.onChange({target:{value:'TEN'}}));await click(button('Apply coupon'));assert.match(text(button('Pay ₹')),/1,080/);
await click(button('Pay ₹'));assert.deepEqual(reservation.serviceIds,['cut','beard']);assert.deepEqual(reservation.addOnIds,['beard']);assert.equal(reservation.servicePrice,1080);assert.equal(reservation.durationMinutes,75);
// Drive the same UI through SDK dismissal and a successful mocked callback.
acceptReservation=true;
let sdkOptions:any,opens=0;
(globalThis as any).Razorpay=class {
 constructor(options:any){sdkOptions=options;}
 open(){opens++;}
 on(){}
};
let pendingPayment:Promise<unknown>;
await act(async()=>{pendingPayment=button('Pay ₹').props.onClick();});
assert.equal(opens,1);
assert.equal(sdkOptions.amount,108000);
assert.equal(sdkOptions.order_id,'order_qa');
assert.equal(sdkOptions.prefill.email,'qa@example.invalid');
await act(async()=>{sdkOptions.modal.ondismiss();await pendingPayment;});
assert.match(text(ui.toJSON()),/Checkout closed/);
await act(async()=>{pendingPayment=button('Retry payment').props.onClick();});
assert.equal(opens,2);
await act(async()=>{
 await sdkOptions.handler({razorpay_payment_id:'pay_qa',razorpay_order_id:'order_qa',razorpay_signature:'mocked'});
 await pendingPayment;
});
assert.match(text(ui.toJSON()),/pay_qa/);
assert.ok(ui.root.findAllByType('button').some((node:any)=>text(node)==='Download receipt'));
const share=ui.root.findAllByType('a').find((node:any)=>String(node.props.href).startsWith('https://wa.me/'));
assert.equal(new URL(share.props.href).pathname,'/919876543210');
assert.match(new URL(share.props.href).searchParams.get('text')||'',/pay_qa/);
assert.deepEqual(paymentCalls,['prepareWebCheckout','create','prepareWebCheckout','create','verify']);
delete (globalThis as any).Razorpay;

// Reopening clears preview, coupon and bundle; full deselection cannot advance or fetch slots.
await act(async()=>ui.update(<BookingModal {...props} isOpen={false}/>));await act(async()=>ui.update(<BookingModal {...props}/>));
assert.match(total(),/1 services selected.*₹800/);
await click(label('Select service Haircut'));
assert.match(total(),/0 services selected.*₹0.*0 mins.*₹0/);assert.equal(button('Continue to Date & Slot').props.disabled,true);
await click(label('Select service Beard Sculpting'));assert.equal(button('Continue to Date & Slot').props.disabled,false);
fail=true;await click(label('Select service Haircut'));assert.match(text(ui.toJSON()),/Staff connection failed/);assert.equal(button('Continue to Date & Slot').props.disabled,true);
fail=false;await click(button('Retry specialist check'));assert.equal(button('Continue to Date & Slot').props.disabled,false);
// Reject an old eligibility response after the bundle changed.
delay=true;await click(label('Select service Haircut'));assert.equal(button('Continue to Date & Slot').props.disabled,true);
delay=false;empty=true;await click(label('Select service Haircut'));assert.equal(button('Continue to Date & Slot').props.disabled,true);
await act(async()=>pending.forEach(resolve=>resolve(null)));assert.equal(button('Continue to Date & Slot').props.disabled,true);assert.match(text(ui.toJSON()),/No specialist can handle all selected services/);
await act(async()=>ui.unmount());
assert.deepEqual(toggleBookingService(['cut'],'cut'),[]);assert.equal(toggleBookingService(Array.from({length:10},(_,i)=>String(i)),'11').length,10);assert.equal(summarizeBookingServices(services).subtotal,1200);
console.log('PASS: multi-select/deselect/limit, totals & full coupon-adjusted amount, full bundle payload, all-service staff eligibility, stale-parent profile loading, click-only preview, return preservation, empty/error/retry/stale-response guards. Mocked Razorpay open, dismiss, retry and confirmation receipt passed.');
