import {normalizeWorkspace} from './normalizeWorkspace';
export function workspaceSnapshot(value:unknown){const d=normalizeWorkspace(value);return {profile:{...d.profile,bookingRules:{leadHours:d.extras.bookingLeadHours,cancellationWindow:d.extras.cancellationWindow}},services:d.services,stylists:d.stylists,clients:d.clients,loyaltyConfig:d.loyaltyConfig,extras:d.extras,onboardingComplete:d.onboardingComplete};}
const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])])):value;
export const sameWorkspace=(a:unknown,b:unknown)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export type ConflictChoice='error'|'local'|'remote';
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keyed=(v:any[])=>v.every(x=>object(x)&&typeof x.id==='string')&&new Set(v.map(x=>x.id)).size===v.length;
/** Three-way merge: changes to different staff IDs/fields combine; competing changes stay explicit. */
export function mergeWorkspace<T>(base:T,local:T,remote:T,choice:ConflictChoice='error'):{draft:T;conflicts:string[]}{
 const conflicts:string[]=[];
 const merge=(b:any,l:any,r:any,path:string):any=>{
  if(sameWorkspace(l,b))return r;
  if(sameWorkspace(r,b)||sameWorkspace(l,r))return l;
  if(object(l)&&object(r)&&(object(b)||b===undefined)){
   const result:any=Object.create(null);for(const key of new Set([...Object.keys(b||{}),...Object.keys(l),...Object.keys(r)])){const value=merge(b?.[key],l[key],r[key],path?path+'.'+key:key);if(value!==undefined)result[key]=value;}return result;
  }
  if(Array.isArray(b)&&Array.isArray(l)&&Array.isArray(r)&&keyed(b)&&keyed(l)&&keyed(r)){
   const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),rm=new Map(r.map(x=>[x.id,x]));
   const baseOrder=b.map(x=>x.id),localOrder=l.filter(x=>bm.has(x.id)).map(x=>x.id);
   const order=sameWorkspace(localOrder,baseOrder)?[...r,...l]:[...l,...r];
   const ids=Array.from(new Set(order.map(x=>x.id)));
   // Keep deletion-vs-edit conflicts visible, including IDs absent from either result order.
   for(const id of bm.keys())if(!ids.includes(id))ids.push(id);
   return ids.map(id=>merge(bm.get(id),lm.get(id),rm.get(id),`${path}.${id}`)).filter(x=>x!==undefined);
  }
  conflicts.push(path||'workspace');return choice==='remote'?r:l;
 };
 return {draft:merge(base,local,remote,'') as T,conflicts};
}
export function revisionConflict(error:{message?:string;code?:string}){return /workspace changed in another tab|workspace revision|revision conflict/i.test(error.message||'');}
export const conflictMessage='The same fields were changed in another tab. Your edits are kept here. Choose which edits to keep below.';
