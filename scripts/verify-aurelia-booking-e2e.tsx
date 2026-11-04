import React from 'react';
import assert from 'node:assert/strict';
import {act,create} from 'react-test-renderer';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {AURELIA_DEFAULT_SERVICES,AURELIA_DEFAULT_STAFF} from '../src/lib/aureliaBeauty';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {supabase} from '../src/lib/supabase';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).document={body:{style:{overflow:''}},hidden:false,activeElement:null,addEventListener(){},removeEventListener(){}};
(globalThis as any).localStorage={getItem(){return null},setItem(){}};
const rpcCalls:any[]=[];
let savedAppointment:any=null;
let razorpayVerified=false;
const profile={...INITIAL_SALON_PROFILE,businessType:'aurelia_beauty_parlour' as const,businessName:'Aurelia QA Studio',subdomain:'aurelia-qa-booking',city:'Mumbai',address:'Bandra West, Mumbai',bookingEnabled:true} as any;
const qaDate=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
const qaTime='11:00';

(supabase as any).rpc=async(name:string,args:any)=>{
 rpcCalls.push({name,args});
 if(name==='studioflow_public_branches')return {data:[],error:null};
 if(name==='studioflow_booking_specialists')return {data:{specialistIds:AURELIA_DEFAULT_STAFF.map(st=>st.id),published:true},error:null};
 if(name==='studioflow_available_slots')return {data:[{time:qaTime,label:'11:00 AM',available:true,status:'available'}],error:null};
 if(name==='studioflow_list_reviews')return {data:{reviews:[],canReview:false,ownReview:null},error:null};
 if(name==='studioflow_book'){
  savedAppointment={...args.p_request,id:'qa-booking-aurelia-001',status:'pending'};
  return {data:savedAppointment,error:null};
 }
 if(name==='studioflow_save_booking_message')return {data:{ok:true},error:null};
 return {data:[],error:null};
};
(supabase.functions as any).invoke=async(_name:string,options:any)=>{
 const action=options?.body?.action;
 if(action==='status')return {data:{configured:true},error:null};
 if(action==='create')return {data:{keyId:'rzp_test_simulated',orderId:'order_aurelia_qa',amount:35000,currency:'INR',bookingId:'qa-booking-aurelia-001'},error:null};
 if(action==='verify'){
  razorpayVerified=true;
  return {data:{booking:{...savedAppointment,status:'confirmed',amountPaid:350,stylistName:savedAppointment?.stylistName}},error:null};
 }
 throw new Error('Unexpected mocked payment action: '+action);
};
class MockRazorpay {
 options:any;
 handlers:Record<string,Function>={};
 constructor(options:any){this.options=options;}
 on(name:string,handler:Function){this.handlers[name]=handler;return this;}
 open(){void Promise.resolve().then(()=>this.options.handler({razorpay_order_id:'order_aurelia_qa',razorpay_payment_id:'pay_aurelia_qa',razorpay_signature:'simulated-signature'}));}
}
(globalThis as any).window={innerHeight:900,addEventListener(){},removeEventListener(){},Razorpay:MockRazorpay};
const onAddAppointment=async(appointment:any)=>{
 const {data,error}=await (supabase as any).rpc('studioflow_book',{p_slug:profile.subdomain,p_request:appointment});
 if(error)throw error;
 return data?.payload||data;
};
const rootText=(node:any):string=>typeof node==='string'?node:Array.isArray(node)?node.map(rootText).join(' '):node?.props?rootText(node.props.children):'';
const findButton=(tree:any,predicate:(node:any)=>boolean)=>tree.root.findAllByType('button').find(predicate);
const settle=async()=>{await act(async()=>{await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,5));});};

let tree:any;
await act(async()=>{tree=create(<CustomerSalonWebsite profile={profile} services={AURELIA_DEFAULT_SERVICES} stylists={AURELIA_DEFAULT_STAFF} readOnly onAddAppointment={onAddAppointment}/>);});
const service=AURELIA_DEFAULT_SERVICES.find(item=>item.name==='Aurelia Blowout');
assert.ok(service,'the seeded Aurelia service must be present');
const serviceButton=findButton(tree,node=>node.props['aria-label']===`Book ${service!.name}`);
assert.ok(serviceButton,'customer-facing Aurelia menu must provide a book action for the service');
await act(async()=>serviceButton.props.onClick());
await settle();

const chosenStaff=AURELIA_DEFAULT_STAFF[0];
assert.ok(tree.root.findByProps({'aria-label':`Select specialist ${chosenStaff.name}`}), 'booking must show the service-matched staff member');
await act(async()=>tree.root.findByProps({'aria-label':`Select specialist ${chosenStaff.name}`}).props.onClick());
await settle();
const continueToSlot=findButton(tree,node=>rootText(node.props.children).includes('Continue to Date & Slot'));
assert.ok(continueToSlot&&!continueToSlot.props.disabled,'customer can continue after the staff RPC resolves');
await act(async()=>continueToSlot.props.onClick());
await settle();

const dateInput=tree.root.findByProps({'aria-label':'Appointment date'});
await act(async()=>dateInput.props.onChange({target:{value:qaDate}}));
await settle();
const slotButton=findButton(tree,node=>rootText(node.props.children).includes('11:00 AM'));
assert.ok(slotButton,'availability RPC must provide a selectable time');
await act(async()=>slotButton.props.onClick());
const continueToGuest=findButton(tree,node=>rootText(node.props.children).includes('Continue to Guest Details'));
assert.ok(continueToGuest&&!continueToGuest.props.disabled,'the selected available slot must unlock guest details');
await act(async()=>continueToGuest.props.onClick());

const nameInput=tree.root.findAllByType('input').find(node=>node.props.placeholder==='e.g. Aarti Sharma');
const phoneInput=tree.root.findAllByType('input').find(node=>node.props.placeholder==='98765 43210');
assert.ok(nameInput&&phoneInput,'guest name and Indian mobile fields must be present');
await act(async()=>nameInput.props.onChange({target:{value:'Aurelia QA Guest'}}));
await act(async()=>phoneInput.props.onChange({target:{value:'9876543210'}}));
const guestForm=tree.root.findAllByType('form').find(node=>typeof node.props.onSubmit==='function');
assert.ok(guestForm,'guest details form must submit');
await act(async()=>guestForm.props.onSubmit({preventDefault(){}}));
await settle();

const payButton=findButton(tree,node=>rootText(node.props.children).includes('Pay ₹350 & Book'));
assert.ok(payButton&&!payButton.props.disabled,'simulated Razorpay test checkout must be ready');
await act(async()=>{await payButton.props.onClick();await new Promise(resolve=>setTimeout(resolve,10));});
await settle();

assert.ok(savedAppointment,'the shared studioflow_book RPC must receive and save the booking request');
assert.equal(savedAppointment.serviceId,service!.id);
assert.equal(savedAppointment.serviceName,service!.name);
assert.equal(savedAppointment.stylistId,chosenStaff.id);
assert.equal(savedAppointment.stylistName,chosenStaff.name);
assert.equal(savedAppointment.date,qaDate);
assert.equal(savedAppointment.time,qaTime);
assert.equal(savedAppointment.clientName,'Aurelia QA Guest');
assert.equal(savedAppointment.clientPhone,'+91 9876543210');
assert.equal(savedAppointment.status,'pending');
assert.ok(razorpayVerified,'the mocked Razorpay verification must complete');
assert.ok(rpcCalls.some(call=>call.name==='studioflow_booking_specialists'&&call.args.p_service_id===service!.id),'staff list must be scoped to the chosen service');
assert.ok(rpcCalls.some(call=>call.name==='studioflow_available_slots'&&call.args.p_service_id===service!.id&&call.args.p_stylist_id===chosenStaff.id&&call.args.p_date===qaDate),'slot lookup must use the selected service, staff and date');
assert.equal(rpcCalls.filter(call=>call.name==='studioflow_book').length,1,'one booking request must be saved once');
assert.ok(rootText(tree.toJSON()).includes('Booking confirmed'),'booking confirmation must appear after the simulated payment verification');
await act(async()=>tree.unmount());
console.log('PASS: simulated Aurelia customer E2E — service selection, staff selection, Supabase specialist/slot RPCs, date/time selection, guest details, studioflow_book save and Razorpay test verification. No live customer appointment or payment was created.');
