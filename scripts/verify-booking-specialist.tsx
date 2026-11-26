import React from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';
import {BookingModal} from '../src/components/BookingModal';import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {INITIAL_SALON_PROFILE} from '../src/mockData';import {supabase} from '../src/lib/supabase';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
let eligibleIds:string[]=[];const calls:any[]=[];supabase.rpc=(async(name:string,args:any)=>{calls.push({name,args});if(name==='studioflow_public_branches')return {data:[],error:null};if(name==='studioflow_booking_specialists')return {data:{published:true,specialistIds:eligibleIds},error:null};return {data:[{time:'12:00',label:'12:00 PM',available:true,stylistId:'qa-staff'}],error:null};}) as any;
globalThis.fetch=async()=>new Response(JSON.stringify({configured:true}),{headers:{'Content-Type':'application/json'}});
const text=(node:any):string=>typeof node==='string'?node:node?.children?.map(text).join('')||'';
for(const template of Object.values(CATEGORY_TEMPLATES)){
 eligibleIds=template.stylists.map(st=>st.id);let editor:any;await act(async()=>{editor=create(<BookingModal isOpen onClose={()=>{}} profile={{...INITIAL_SALON_PROFILE,businessType:template.id,subdomain:'qa-salon'}} services={template.services} stylists={template.stylists} themeAccentHex="#ffffff"/>)});
 const button=(label:string)=>editor.root.findAllByType('button').find((node:any)=>text(node).includes(label));
 const next=button('Continue to Date & Slot');assert.equal(next.props.style.color,'#1e293b','White accent needs dark readable action text');assert.ok(next.props.style.border);
 const specialist=editor.root.findByProps({'aria-label':`Select specialist ${template.stylists[0].name}`});await act(async()=>specialist.props.onClick());assert.equal(specialist.props['aria-pressed'],true);assert.equal(calls.at(-1).args.p_stylist_id,template.stylists[0].id);
 const any=editor.root.findByProps({'aria-label':'Select Any Specialist'});await act(async()=>any.props.onClick());assert.equal(any.props['aria-pressed'],true);assert.equal(specialist.props['aria-pressed'],false);assert.equal(calls.at(-1).args.p_stylist_id,'any_available');
 await act(async()=>next.props.onClick());assert.equal(button('Continue to Guest Details').props.disabled,true,'Do not bypass real slot selection');
 await act(async()=>button('12:00 PM').props.onClick());assert.equal(button('Continue to Guest Details').props.disabled,false);
 await act(async()=>button('Continue to Guest Details').props.onClick());
 await act(async()=>{editor.root.findByProps({placeholder:'e.g. Aarti Sharma'}).props.onChange({target:{value:'QA Customer'}});editor.root.findByProps({placeholder:'98765 43210'}).props.onChange({target:{value:'9876543210'}});});
 const form=editor.root.findAll(n=>typeof n.props.onSubmit==='function')[0];await act(async()=>form.props.onSubmit({preventDefault(){}}));
 assert.ok(button('Pay ₹'),'Guest form can advance to payment review without making payment');assert.equal(button('Pay ₹').props.style.color,'#1e293b');
 await act(async()=>editor.unmount());
}
const template=CATEGORY_TEMPLATES.nail_studio;
eligibleIds=template.stylists.map(st=>st.id);
let restricted:any;await act(async()=>{restricted=create(<BookingModal isOpen onClose={()=>{}} profile={{...INITIAL_SALON_PROFILE,subdomain:'qa-salon'}} services={template.services} stylists={template.stylists} initialStylist={template.stylists[0]}/>)});
eligibleIds=[template.stylists[1].id,template.stylists[2].id];
const treatment=restricted.root.findAllByType('button').find((node:any)=>text(node).includes(template.services[1].name));await act(async()=>treatment.props.onClick());
assert.equal(restricted.root.findAllByProps({'aria-label':`Select specialist ${template.stylists[0].name}`}).length,0,'Unassigned specialist must disappear for the new service');assert.equal(restricted.root.findByProps({'aria-label':'Select Any Specialist'}).props['aria-pressed'],true,'Changing treatment resets stale specialist');
assert.equal(restricted.root.findAllByProps({'aria-label':`Select specialist ${template.stylists[1].name}`}).length,1);
eligibleIds=[];await act(async()=>restricted.root.findAllByType('button').find((node:any)=>text(node).includes(template.services[2].name)).props.onClick());assert.equal(restricted.root.findAllByType('button').find((node:any)=>text(node).includes('Continue to Date & Slot')).props.disabled,true,'Do not show fake availability when no specialist is eligible');
await act(async()=>restricted.unmount());
assert.ok(calls.every(call=>['studioflow_android_slots','studioflow_mens_slots','studioflow_available_slots','studioflow_booking_specialists','studioflow_public_branches'].includes(call.name)),'No booking or payment created by this test');console.log('PASS: all 14 templates, white-accent contrast, specialist/any selection and RPC wiring, date/slot gating, guest form and payment review. No bookings or payments created.');

// RPC outage: the step must still render the salon's own roster (with a notice), keep
// multi-service assignment honest, and keep View Profile independent of selection.
{
 const original=supabase.rpc;
 (supabase as any).rpc=(async(name:string)=>name==='studioflow_public_branches'?{data:[],error:null}:{data:null,error:{message:'Could not find the function public.studioflow_booking_specialists'}}) as any;
 const tpl=CATEGORY_TEMPLATES.nail_studio;
 const staff=tpl.stylists.map((st,i)=>i===0?{...st,assignedServices:[tpl.services[0].id]}:{...st,assignedServices:[]});
 let down:any;await act(async()=>{down=create(<BookingModal isOpen onClose={()=>{}} profile={{...INITIAL_SALON_PROFILE,subdomain:'qa-salon'}} services={tpl.services} stylists={staff}/>)});
 const pick=(label:string)=>down.root.findAllByType('button').find((node:any)=>text(node).includes(label));
 await act(async()=>pick(tpl.services[0].name).props.onClick());
 await act(async()=>pick(tpl.services[1].name).props.onClick());
 assert.equal(down.root.findAllByProps({'aria-label':`Select specialist ${staff[0].name}`}).length,0,'Fallback must drop specialists not assigned to every selected service');
 assert.equal(down.root.findAllByProps({'aria-label':`Select specialist ${staff[1].name}`}).length,1,'Fallback must still show eligible specialists');
 const notice=down.root.findAll((node:any)=>node.type==='p'&&node.props.role==='status'&&text(node).includes('Live specialist check is unavailable')).length;
 assert.equal(notice,1,'Fallback shows exactly one notice');
 assert.ok(!text(down.toJSON()).includes('Could not find the function'),'RPC error text must not leak into the UI');
 assert.ok(text(down.toJSON()).includes('Expert in:'),'Specialist cards list the services they are expert in');
 const toggle=down.root.findByProps({'aria-label':`View Profile: ${staff[1].name}`});
 await act(async()=>toggle.props.onClick());
 assert.equal(down.root.findByProps({'aria-label':'Select Any Specialist'}).props['aria-pressed'],true,'Opening a profile never changes selection');
 await act(async()=>down.unmount());
 (supabase as any).rpc=original;
}
console.log('PASS: specialist RPC outage falls back to the salon roster with a notice, matches multi-service assignment and keeps View Profile passive.');
