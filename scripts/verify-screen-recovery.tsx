import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {act,create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {normalizeWorkspace} from '../src/lib/normalizeWorkspace';
import {loadScreen} from '../src/lib/loadScreen';
import {OwnerWorkspace} from '../src/components/OwnerWorkspace';
import {SaaSDashboard} from '../src/components/SaaSDashboard';
import {SalonWebsitePreview} from '../src/components/SalonWebsitePreview';
import {AppErrorBoundary} from '../src/components/AppErrorBoundary';
import {captureReferral} from '../src/lib/supabase';
(globalThis as any).location={search:'',origin:'https://studioflow.test'};
const noop=()=>{};
const raw={profile:{businessName:'Saved Salon',ownerName:null,phone:null},services:[],stylists:[{id:'s',name:'Saved Stylist'}],loyaltyConfig:{rewards:null},extras:{whiteLabel:null,policies:null,gallery:null}};
assert.throws(()=>renderToStaticMarkup(<OwnerWorkspace profile={raw.profile as any} extras={raw.extras as any} services={[]} stylists={[]} appointments={[]} templates={[]} setProfile={noop} setServices={noop} setStylists={noop} setExtras={noop} onPublish={async()=>{}} sessionEmail="" published={null} onOpenPreview={noop} onOpenDashboard={noop} onOpenWizard={noop}/>),'Incomplete draft reproduced the old owner crash');
const d=normalizeWorkspace(raw,{full_name:'Saved Owner'});
assert.equal(d.profile.businessName,'Saved Salon');assert.equal(d.profile.ownerName,'Saved Owner');assert.equal(d.stylists[0].name,'Saved Stylist');assert.deepEqual(d.stylists[0].specialties,[]);
for(const sample of [d,normalizeWorkspace({}),normalizeWorkspace({profile:{businessName:'Existing'},extras:{whiteLabel:{platformName:'My Brand'}},loyaltyConfig:{rewards:[]}})]) {
 assert.ok(renderToStaticMarkup(<OwnerWorkspace {...sample} appointments={[]} templates={[]} setProfile={noop} setServices={noop} setStylists={noop} setExtras={noop} onPublish={async()=>{}} sessionEmail="" published={null} onOpenPreview={noop} onOpenDashboard={noop} onOpenWizard={noop}/>).includes('Website editing steps'));
 renderToStaticMarkup(<SaaSDashboard {...sample} appointments={[]} setProfile={noop} setServices={noop} setStylists={noop} setAppointments={noop}/>);
 renderToStaticMarkup(<SalonWebsitePreview {...sample} gallery={sample.extras.gallery} readOnly onAddAppointment={async()=>{throw new Error('Demo');}}/>);
}
const storage=new Map<string,string>();let reloads=0;
(globalThis as any).window={location:{reload(){reloads++;}}};
(globalThis as any).sessionStorage={getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value)};
const chunkError=new Error('Failed to fetch dynamically imported module');
void loadScreen(async()=>{throw chunkError;});await new Promise(r=>setTimeout(r,0));assert.equal(reloads,1);
await assert.rejects(loadScreen(async()=>{throw chunkError;}));assert.equal(reloads,1,'Do not reload repeatedly');
await assert.rejects(loadScreen(async()=>{throw new Error('Application bug');}));assert.equal(reloads,1,'Application bugs must not trigger reload');
(globalThis as any).localStorage={getItem(){throw new Error('Blocked storage');}};assert.equal(captureReferral(),'');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
function Broken(){throw new Error('Test screen failure');return null;}
let renderer:any;const originalError=console.error;console.error=()=>{};
try {
 await act(async()=>{renderer=create(<AppErrorBoundary resetKey="broken"><Broken/></AppErrorBoundary>);});
 assert.ok(renderer.root.findByType('details'));
 await act(async()=>renderer.update(<AppErrorBoundary resetKey="home"><p>Working workspace</p></AppErrorBoundary>));
 assert.equal(renderer.root.findByType('p').children[0],'Working workspace');
 await act(async()=>renderer.unmount());
}finally{console.error=originalError;}
console.log('PASS: reproduced incomplete-draft crash; normalized owner/dashboard/public preview; preserved content; single chunk recovery; blocked storage; boundary navigation recovery.');
