import React, {StrictMode} from 'react';
import {act, create} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {supabase} from '../src/lib/supabase';
import {useAuthSession} from '../src/lib/useAuthSession';
import {readCustomerProfile, useCustomerProfile} from '../src/components/customer/useCustomerProfile';
import {normalizeWorkspace} from '../src/lib/normalizeWorkspace';
import {workspaceSnapshot, mergeWorkspace} from '../src/lib/workspaceSync';
import {salonAccountFromRpc, salonAccountFromRow} from '../src/lib/accountBootstrap';
import {isSalon, coordinates} from '../src/components/customer/model';
import {withTemplateDemos} from '../src/components/customer/templateDemos';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).window={addEventListener(){},removeEventListener(){}};
(globalThis as any).document={hidden:false,addEventListener(){},removeEventListener(){}};
(globalThis as any).localStorage={getItem(){return null},setItem(){}};
const deferred=()=>{let resolve!:(value:any)=>void,reject!:(value:any)=>void;const promise=new Promise<any>((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const user=(id:string):any=>({user:{id,email:id+'@example.invalid',user_metadata:{}}});
const a=user('customer-a'),b=user('customer-b');

// Auth initialization, including stale initial reads and StrictMode cleanup.
const listeners=new Set<Function>();let unsubscribed=0;
(supabase.auth as any).onAuthStateChange=(callback:Function)=>{listeners.add(callback);return{data:{subscription:{unsubscribe(){listeners.delete(callback);unsubscribed++}}}}};
let initial=deferred();(supabase.auth as any).getSession=()=>initial.promise;
const emit=(event:string,session:any)=>{for(const listener of listeners)listener(event,session)};
let auth:any,view:any;
function AuthHarness(){auth=useAuthSession();return <p>{auth.ready?auth.session?.user.id||'signed out':'loading'}</p>}
await act(async()=>{view=create(<StrictMode><AuthHarness/></StrictMode>);await flush()});
assert.equal(auth.ready,false);
await act(async()=>emit('SIGNED_OUT',null));
await act(async()=>{initial.resolve({data:{session:a},error:null});await flush()});
assert.equal(auth.session,null,'Late getSession must not resurrect a signed-out account');
await act(async()=>emit('SIGNED_IN',b));assert.equal(auth.session.user.id,'customer-b');
await act(async()=>emit('TOKEN_REFRESHED',b));assert.equal(auth.session.user.id,'customer-b');
await act(async()=>emit('SIGNED_OUT',null));assert.equal(auth.session,null);
await act(async()=>view.unmount());assert.equal(listeners.size,0);assert.ok(unsubscribed>=2);
initial=deferred();
await act(async()=>{view=create(<AuthHarness/>);await flush()});
await act(async()=>{initial.reject(new Error('Session unavailable'));await flush()});
assert.equal(auth.ready,true);assert.match(auth.error,/Session unavailable/);assert.equal(auth.session,null);
await act(async()=>view.unmount());
// Reload/refresh with an existing session.
(supabase.auth as any).getSession=async()=>({data:{session:a},error:null});
await act(async()=>{view=create(<AuthHarness/>);await flush()});assert.equal(auth.session.user.id,'customer-a');await act(async()=>view.unmount());
console.log('PASS: login/logout events, refresh restoration, rejected session reads, stale session race and StrictMode subscriptions.');

// Profile loading does not assume a non-null RPC response or signed photo link.
(supabase as any).from=()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:null})});
let response:any={data:null,error:null};
(supabase as any).rpc=async()=>response;
let missing=await readCustomerProfile();assert.equal(missing.missing,true);assert.deepEqual(missing.profile,{full_name:'',phone:''});
response={data:undefined,error:null};missing=await readCustomerProfile();assert.equal(missing.missing,true);
response={data:[],error:null};await assert.rejects(readCustomerProfile(),/invalid data/);
response={data:{full_name:null,phone:null,photo_path:'private/photo.jpg'},error:null};
(supabase.storage as any).from=()=>({createSignedUrl:async()=>({data:null,error:null})});
const photo=await readCustomerProfile();assert.equal(photo.profile.full_name,'');assert.equal(photo.photoUrl,'');assert.match(photo.photoError,/could not load/);

let profile:any;
function ProfileHarness({session}:{session:any}){profile=useCustomerProfile(session,0);return <p>{profile.loaded?profile.profile.full_name||'no profile':'loading'}</p>}
let pending=deferred();(supabase as any).rpc=()=>pending.promise;
await act(async()=>{view=create(<ProfileHarness session={a}/>);await flush()});assert.equal(profile.loaded,false);
await act(async()=>{view.update(<ProfileHarness session={null}/>);await flush()});
assert.equal(profile.profile.full_name,'');assert.equal(profile.photoUrl,'');
await act(async()=>{pending.resolve({data:{full_name:'Private A',phone:'123'},error:null});await flush()});
assert.equal(profile.profile.full_name,'','Logout must invalidate pending profile reads');
const readA=deferred(),readB=deferred();let reads=0;
(supabase as any).rpc=()=>++reads===1?readA.promise:readB.promise;
await act(async()=>{view.update(<ProfileHarness session={a}/>);await flush()});
await act(async()=>{view.update(<ProfileHarness session={b}/>);await flush()});assert.equal(profile.loaded,false);
await act(async()=>{readB.resolve({data:{customer_id:'customer-b',full_name:'B',phone:'456'},error:null});await flush()});
await act(async()=>{readA.resolve({data:{customer_id:'customer-a',full_name:'A',phone:'123'},error:null});await flush()});
assert.equal(profile.profile.full_name,'B','A stale response must not overwrite another account');
await act(async()=>view.unmount());
response={data:null,error:null};(supabase as any).rpc=async()=>response;
await act(async()=>{view=create(<ProfileHarness session={a}/>);await flush()});assert.equal(profile.missing,true);assert.equal(profile.failed,false);
response={data:null,error:{message:'Profile offline'}};
await act(async()=>{await profile.reload()});assert.equal(profile.failed,true);assert.match(profile.error,/Profile offline/);
response={data:{full_name:'Recovered',phone:'789'},error:null};
await act(async()=>{await profile.reload()});assert.equal(profile.failed,false);assert.equal(profile.profile.full_name,'Recovered');await act(async()=>view.unmount());
console.log('PASS: null/missing/malformed customer profiles, unavailable photos, loading gate, logout/account-switch races and retry.');

// The exact original failure: applySnapshot(mergeWorkspace(...).draft).profile.
const base=workspaceSnapshot({profile:{businessName:'Saved salon'},clients:[{id:'client-1',name:'Saved customer'}],onboardingComplete:true,services:[],stylists:[]});
assert.equal(typeof base,'object');assert.equal(base.profile.businessName,'Saved salon');
const saved=mergeWorkspace(base,{...base,profile:{...base.profile,phone:'123'}},base);
assert.ok(saved.draft?.profile);assert.equal(saved.draft.profile.phone,'123');assert.equal(saved.draft.clients[0].name,'Saved customer');assert.equal(saved.draft.onboardingComplete,true);
for(const input of [undefined,null,{}, {profile:null}, {profile:[],clients:null,extras:null}])assert.ok(normalizeWorkspace(input).profile);
assert.equal(normalizeWorkspace(null).profile.city,'','Do not invent a city to mask missing data');
assert.equal(salonAccountFromRpc('a',{}),null);assert.equal(salonAccountFromRow('a',{user_id:'b',draft:{},revision:1}),null);
assert.ok(salonAccountFromRpc('a',{user_id:'a',draft:{},revision:0}),'A real new account can have an empty draft');
const valid:any={slug:'salon',owner_id:'owner',content:{profile:{businessName:'Real salon'}}};
for(const invalid of [undefined,null,{}, {slug:'bad',owner_id:'owner'}, {slug:'bad',owner_id:'owner',content:{}}]){assert.equal(isSalon(invalid),false);assert.equal(coordinates(invalid as any),null)}
assert.deepEqual(withTemplateDemos([undefined,null,{content:{}},valid] as any,[]),[valid]);
console.log('PASS: workspace .draft.profile contract, saved customer preservation, new-account state, ownership validation and invalid catalog records.');
