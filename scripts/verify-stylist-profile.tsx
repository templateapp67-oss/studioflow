import React from 'react';import {act,create} from 'react-test-renderer';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';
import {StylistProfile} from '../src/components/StylistProfile';import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';import {INITIAL_SALON_PROFILE} from '../src/mockData';import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {normalizeWorkspace} from '../src/lib/normalizeWorkspace';import {supabase} from '../src/lib/supabase';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;(globalThis as any).document={activeElement:null,body:{style:{}},addEventListener(){},removeEventListener(){}};(globalThis as any).window={addEventListener(){},removeEventListener(){}};
const staff:any={id:'specialist-1',name:'Anita',role:'Senior Makeup Artist',experienceYears:7.5,bio:'Professional bridal and occasion makeup specialist.',specialties:['Bridal'],phone:'PRIVATE-PHONE',commissionRate:50,schedule:[{private:true}]};
for(const template of Object.values(CATEGORY_TEMPLATES)){
 const profile={...INITIAL_SALON_PROFILE,businessType:template.id};
 // Template 09 (Bodhi Tree) is multi-page: therapist cards live on its Team page,
 // which is exactly where a customer taps through from the menu.
 const teamPage=template.id==='massage_wellness';
 if(teamPage)(globalThis as any).window={addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),location:{hash:'#team'},scrollTo(){}};
 const html=renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={[]} stylists={[staff]} readOnly onAddAppointment={async a=>a}/>);
 if(teamPage)(globalThis as any).window={addEventListener(){},removeEventListener(){}};
 assert.ok(html.includes(template.id==='tattoo_studio'?'View artist profile':'View profile &amp; reviews'),`${template.id}: specialist cards open the full profile`);assert.ok(html.includes('7.5'),`${template.id}: experience is published`);const saved=normalizeWorkspace({profile,stylists:[staff]});assert.equal(saved.stylists[0].experienceYears,7.5);
}
let args:any,logged=0;let canReview=false;
(supabase as any).rpc=async(name:string,input:any)=>{if(name==='studioflow_staff_review_submit'){args=input;return{data:{reviews:[{id:'review',name:'Customer',rating:4,comment:input.p_comment}],average:4,count:1,ownReview:{rating:4,comment:input.p_comment},canReview:true},error:null}}return{data:{reviews:[],count:0,average:null,canReview},error:null}};
let tree:any;const props={staff,profile:INITIAL_SALON_PROFILE,slug:'live-salon',onClose(){},onBook(){},onLogin(){logged++}};
await act(async()=>{tree=create(<StylistProfile {...props}/>)});assert.ok(JSON.stringify(tree.toJSON()).includes('7.5 years of experience'));assert.ok(!JSON.stringify(tree.toJSON()).includes('PRIVATE-PHONE'));assert.equal(tree.root.findAllByType('form').length,0);const signin=tree.root.findAllByType('button').find((n:any)=>n.props.children==='Sign in to review');await act(async()=>signin.props.onClick());assert.equal(logged,1);await act(async()=>tree.unmount());
canReview=true;await act(async()=>{tree=create(<StylistProfile {...props} signedIn/>)});await act(async()=>tree.root.findByType('textarea').props.onChange({target:{value:'A careful and thoughtful specialist experience.'}}));await act(async()=>tree.root.findByType('select').props.onChange({target:{value:'4'}}));await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.deepEqual(args,{p_slug:'live-salon',p_staff_id:'specialist-1',p_rating:4,p_comment:'A careful and thoughtful specialist experience.'});assert.ok(JSON.stringify(tree.toJSON()).includes('Your review has been saved.'));await act(async()=>tree.unmount());
canReview=false;await act(async()=>{tree=create(<StylistProfile {...props} signedIn/>)});assert.equal(tree.root.findAllByType('form').length,0);assert.ok(JSON.stringify(tree.toJSON()).includes('Complete a booking'));await act(async()=>tree.unmount());
console.log('PASS: experience in all 14 templates; safe public profile, guest login, completed-visit review form, exact staff submission and saved rating.');
