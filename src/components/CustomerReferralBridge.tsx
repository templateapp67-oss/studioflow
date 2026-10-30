import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {captureCustomerReferral,clearCustomerReferral,customerReferralLink,isCustomerInviteEntry} from '../lib/customerReferral';
/** Same invitation handling for the app and published salon websites. */
export function CustomerReferralBridge(){
 if (!supabase) return null;
 const [inviteEntry]=useState(isCustomerInviteEntry);
 const [code,setCode]=useState(captureCustomerReferral),[status,setStatus]=useState('Checking your invitation…'),[retry,setRetry] = useState(0),[uid,setUid]=useState<string|null>(null),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{const changed=()=>setCode(captureCustomerReferral());window.addEventListener('nexora-referral-changed',changed);return()=>window.removeEventListener('nexora-referral-changed',changed)},[]);
 useEffect(()=>{
  if (!supabase) return;
  let active=true;
  void supabase.auth.getSession().then(({data})=>{if(active){setUid(data.session?.user.id||null);setReady(true)}});
  const {data}=supabase.auth.onAuthStateChange((_event,session)=>{setUid(session?.user.id||null);setReady(true)});
  return()=>{active=false;data.subscription.unsubscribe()}
 },[]);
 useEffect(()=>{
  if(inviteEntry||!code||!ready || !supabase) return;
  let active=true;setFailed(false);setStatus('Checking your invitation…');
  void(async()=>{
   if(uid){const identity=await supabase.rpc('studioflow_android_referral');if(!active)return;if(identity.error){setStatus('Invitation could not be checked. Please retry.');setFailed(true);return}if(identity.data===code){clearCustomerReferral();setCode('');return}}
   const result=uid?await supabase.rpc('studioflow_customer_claim_ref',{p_code:code}):await supabase.rpc('studioflow_customer_validate_ref',{p_code:code});if(!active)return;
   if(result.error){setStatus(result.error.message||'Invitation could not be saved. Please retry.');setFailed(true);return}
   if(!result.data){setStatus('This invitation code is invalid or unavailable.');return}
   setStatus('Invitation ready. The sender’s code is already filled in your signup form.');if(uid){clearCustomerReferral();setCode('')}
  })();return()=>{active=false}
 },[code,uid,ready,retry,inviteEntry]);
 async function differentAccount(){
  if (!supabase) return;
  setBusy(true);
  const {error}=await supabase.auth.signOut({scope:'local'});
  if(error){setStatus(error.message);setBusy(false);return}
  location.assign(customerReferralLink(code))
 }
 if(inviteEntry||!code)return null;
 return <aside role="status" className="bg-pink-50 text-pink-950 border-b border-pink-200 px-4 py-3 text-sm flex flex-wrap items-center justify-center gap-3"><span>{status}</span>{!uid&&<a href={customerReferralLink(code)} className="underline font-semibold">Create your customer account</a>}{uid&&<button disabled={busy} className="underline font-semibold" onClick={()=>void differentAccount()}>Use another account</button>}{failed&&<button className="underline" onClick={()=>setRetry(n=>n+1)}>Retry</button>}<button aria-label="Dismiss referral message" onClick={()=>{clearCustomerReferral();setCode('')}}>×</button></aside>
}
