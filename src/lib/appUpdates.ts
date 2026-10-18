export const CURRENT_BUILD=import.meta.env?.VITE_SCREEN_BUILD||'development';
export async function latestAppVersion():Promise<string|null>{
 const response=await fetch('/app-version.json?t='+Date.now(),{cache:'no-store',credentials:'omit'});
 if(!response.ok)return null;
 const data=await response.json();return typeof data.version==='string'&&/^[a-z0-9-]{16,80}$/i.test(data.version)?data.version:null;
}
export function applyAppVersion(version:string):boolean{
 const url=new URL(window.location.href);
 url.searchParams.set('__sf_update',version);url.searchParams.set('__sf_reload',String(Date.now()));
 try{sessionStorage.setItem('nexora_updated_version',version)}catch{/* The URL also prevents automatic loops. */}
 window.location.replace(url.href);return true;
}
export function alreadyTriedVersion(version:string):boolean{
 if(new URL(window.location.href).searchParams.get('__sf_update')===version)return true;
 try{return sessionStorage.getItem('nexora_updated_version')===version}catch{return false}
}
export function updateReadiness(dirty:Set<Element>){
 const active=document.activeElement;
 const blocking=document.querySelector('[data-workspace-sync="pending"],[aria-busy="true"],[role="dialog"],[aria-modal="true"],.sf-booking-overlay,.cr-overlay,.sf-staff-editor-overlay,.service-editor-backdrop,.fixed.inset-0,.razorpay-container,iframe[src*="razorpay"]');
 for(const node of dirty){
  const input=node as HTMLInputElement;
  if(!node.isConnected||((input.tagName==='INPUT'||input.tagName==='TEXTAREA')&&input.value==='')||(node.closest('[data-workspace-sync="saved"]')&&active!==node))dirty.delete(node);
 }
 const editing=!!active?.matches('input,textarea,select,[contenteditable="true"]');
 const busy=!!blocking;
 return {busy,safe:!busy&&!editing&&!dirty.size,reason:busy?'Booking, payment ya form khula hai. Pehle complete/save karke close karein.':dirty.size||editing?'Form mein edits hain. Pehle save karein; Update now page reload karega.':''};
}
