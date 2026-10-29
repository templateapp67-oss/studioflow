import {useEffect,useRef,useState,type FormEvent} from 'react';
import {supabase} from '../../lib/supabase';
import {useDermacure} from './context';
import type {SalonService} from '../../types';

/** A real authenticated enquiry, never a fake booking or a client-only save. */
export function ClinicEnquiryDialog(){
 const {enquiryService,setEnquiryService,customerSignedIn,onAccount,profile}=useDermacure();
 const dialog=useRef<HTMLDialogElement>(null);
 const pendingSignIn=useRef<SalonService|null>(null);
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
 useEffect(()=>{setError('');setSent(false);if(enquiryService){pendingSignIn.current=null;setMessage('');if(dialog.current && !dialog.current.open)dialog.current.showModal();}},[enquiryService?.id]);
 useEffect(()=>{if(customerSignedIn && pendingSignIn.current){const service=pendingSignIn.current;pendingSignIn.current=null;setEnquiryService(service);}},[customerSignedIn,setEnquiryService]);
 async function submit(e:FormEvent){e.preventDefault();if(!enquiryService||busy)return;setBusy(true);setError('');try{
  const result=await supabase.rpc('studioflow_clinic_enquire',{p_slug:profile.subdomain,p_service_id:enquiryService.id,p_name:name.trim(),p_phone:phone,p_message:message.trim()});
  if(result.error)throw result.error;if(!result.data?.id)throw new Error('The clinic did not confirm that the enquiry was saved.');setSent(true);
 }catch(e){setError(e && typeof e==='object' && 'message' in e?String(e.message):'Enquiry could not be saved. Please try again or contact the clinic.');}finally{setBusy(false)}}
 return <dialog ref={dialog} className="dc-enquiry-dialog" onClose={()=>setEnquiryService(null)} aria-labelledby="dc-enquiry-title"><div className="dc-story-dialog-head"><h2 id="dc-enquiry-title">Treatment enquiry</h2><button type="button" onClick={()=>dialog.current?.close()} aria-label="Close enquiry">Close ×</button></div>{enquiryService&&<p>{enquiryService.name} · Contact clinic for pricing</p>}{sent?<p role="status">Your enquiry has been saved for the clinic. This is not an appointment confirmation.</p>:customerSignedIn?<form onSubmit={submit}><label>Full name<input required minLength={2} maxLength={150} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>Mobile number<input required type="tel" maxLength={18} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label><label>Message (optional)<textarea maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)}/></label><small>Please do not include medical records or sensitive health information.</small>{error&&<p role="alert">{error}</p>}<button className="dc-btn" disabled={busy}>{busy?'Sending…':'Send enquiry'}</button></form>:<><p>Sign in to send your enquiry, or contact the clinic directly.</p><button className="dc-btn" type="button" onClick={()=>{pendingSignIn.current=enquiryService;dialog.current?.close();onAccount();}}>Sign in</button></>}</dialog>;
}
