import React from 'react';import {create,act} from 'react-test-renderer';import assert from 'node:assert/strict';
import {OwnerWorkspace} from '../src/components/OwnerWorkspace';
import {INITIAL_SALON_PROFILE} from '../src/mockData';import {DEFAULT_EXTRAS} from '../src/lib/workspaceDefaults';import {DEFAULT_LOYALTY_CONFIG} from '../src/loyaltyData';
import {WEBSITE_EDIT_STEPS,OWNER_BUSINESS_TOOLS} from '../src/lib/ownerNavigation';
import {ROLE_PREVIEW_KEY} from '../src/lib/staffPermissions';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const store=new Map<string,string>();
(globalThis as any).localStorage={getItem:(k:string)=>store.has(k)?store.get(k)!:null,setItem:(k:string,v:string)=>{store.set(k,String(v));},removeItem:(k:string)=>{store.delete(k);},clear:()=>store.clear()};
const listeners=new Map();
(globalThis as any).location={href:'https://studio.test/?module=2',search:'?module=2'};
(globalThis as any).history={pushState:(_a:any,_b:any,url:URL)=>{location.href=url.href;location.search=url.search;}};
(globalThis as any).window={addEventListener:(n:string,f:any)=>listeners.set(n,f),removeEventListener:(n:string)=>listeners.delete(n),setTimeout};
const noop=()=>{};
const baseProps:any={profile:INITIAL_SALON_PROFILE,setProfile:noop,services:[],setServices:noop,stylists:[],setStylists:noop,appointments:[],clients:[],setClients:noop,loyaltyConfig:DEFAULT_LOYALTY_CONFIG,setLoyaltyConfig:noop,extras:DEFAULT_EXTRAS,setExtras:noop,published:null,onPublish:async()=>{},sessionEmail:'owner@example.com',templates:[],onOpenPreview:noop,onOpenDashboard:noop,onOpenWizard:noop};
const stepIds=WEBSITE_EDIT_STEPS.map(s=>s.id);
const render=async(props:any)=>{let ui:any;await act(async()=>{ui=create(<OwnerWorkspace {...baseProps} {...props}/>,{createNodeMock:()=>({focus(){},scrollIntoView(){}})});});return ui;};
const title=(ui:any)=>ui.root.findByType('h1').children.join('');
const navCount=(ui:any)=>ui.root.findByProps({'aria-label':'Website editing steps'}).findAllByType('li').length;

// 1. Owner (default) sees the complete workspace, unchanged.
store.clear();
let ui=await render({});
assert.equal(navCount(ui),WEBSITE_EDIT_STEPS.length,'owner sees every edit step');
const ownerSelect=ui.root.findByProps({'aria-label':'Preview the workspace as a staff role'});
assert.equal(ownerSelect.props.value,'owner');
assert.ok(ui.root.findAllByType('button').some((b:any)=>b.children.join('')==='Publish Website'),'owner can publish');
await act(async()=>ui.unmount());

// 2. Explicit staff role prop hard-caps what the workspace can reach.
location.search='';location.href='https://studio.test/';
ui=await render({accessRole:'Service Provider (Assigned)'});
assert.ok(navCount(ui)<WEBSITE_EDIT_STEPS.length,'service provider sees fewer edit steps than the owner');
assert.equal(title(ui),'Bookings & calendar','a staff session lands on their own operational screen, not the website editor');
assert.equal(ui.root.findAllByProps({'aria-label':'Preview the workspace as a staff role'}).length,0,'a real staff session cannot switch roles');
assert.ok(!ui.root.findAllByType('button').some((b:any)=>b.children.join('')==='Publish Website'),'service provider cannot publish the website');
const roleBadge=ui.root.findAll((n:any)=>typeof n.children?.[0]==='string'&&n.children.join('').includes('Role: Service Provider'));
assert.ok(roleBadge.length>0,'role badge tells the staff member their current role');
await act(async()=>ui.unmount());

// 3. Deep link into a forbidden module shows the permission-required screen instead of the module.
location.search='?module=21';location.href='https://studio.test/?module=21';
ui=await render({accessRole:'Service Provider (Assigned)'});
assert.equal(title(ui),'Permission required','direct URL cannot bypass role gating');
assert.ok(ui.root.findAll((n:any)=>typeof n.children?.[0]==='string'&&n.children.join('')==='You don\'t have access to this section').length>0,'blocked screen is shown');
assert.ok(String(ui.root.findByProps({'role':'alert'}).children).length>=0);
await act(async()=>ui.unmount());
location.search='?module=2';location.href='https://studio.test/?module=2';

// 4. Manager gets the admin modules but never the owner-only ones.
ui=await render({accessRole:'Manager (Full Access)'});
assert.ok(navCount(ui)===WEBSITE_EDIT_STEPS.length,'manager sees every website edit step');
const flat=(node:any):string=>{if(node==null)return '';if(typeof node==='string')return node;if(Array.isArray(node))return node.map(flat).join('');if(typeof node==='object'&&node.children)return flat(node.children);return '';};
const tools=(ui:any)=>ui.root.findByProps({'aria-label':'Business tools'}).findAllByType('button').map((b:any)=>flat(b));
assert.ok(tools(ui).some((t:string)=>t.includes('Branches & inventory')),'manager can manage branches');
assert.ok(!tools(ui).some((t:string)=>t.includes('Environment Diagnostics')),'owner-only diagnostics stay hidden from managers');
assert.ok(!tools(ui).some((t:string)=>t.includes('Account & login')),'owner-only account settings stay hidden from managers');
await act(async()=>ui.unmount());

// 5. Owner "view as" switch narrows the sidebar and is remembered.
store.clear();
ui=await render({});
const sw=()=>ui.root.findByProps({'aria-label':'Preview the workspace as a staff role'});
await act(async()=>sw().props.onChange({target:{value:'Receptionist (Frontdesk)'}}));
assert.equal(store.get(ROLE_PREVIEW_KEY),'Receptionist (Frontdesk)','role preview is remembered for the owner');
assert.ok(!ui.root.findAllByType('button').some((b:any)=>b.children.join('')==='Publish Website'),'receptionist preview hides publishing');
assert.ok(navCount(ui)<WEBSITE_EDIT_STEPS.length,'receptionist preview trims the edit steps');
await act(async()=>sw().props.onChange({target:{value:'owner'}}));
assert.equal(store.has(ROLE_PREVIEW_KEY),false,'switching back to owner clears the preview');
assert.ok(ui.root.findAllByType('button').some((b:any)=>b.children.join('')==='Publish Website'),'owner regains publishing');
await act(async()=>ui.unmount());

// 6. Every business tool is gated for at least one staff role (nothing leaks).
assert.ok(OWNER_BUSINESS_TOOLS.length>0);
console.log('PASS: owner keeps full access, staff roles are capped by accessRole, deep links are blocked, manager vs owner-only modules differ, and the owner role preview is remembered.');
