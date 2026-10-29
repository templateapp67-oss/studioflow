import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
type Enquiry={id:string;service_name:string;customer_name:string;customer_phone:string;message:string;created_at:string};
/** Read through owner-only RLS; failure never looks like an empty inbox. */
export function ClinicEnquiries(){
 const [items,setItems]=useState<Enquiry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');void (async()=>{try{
  const user=await supabase.auth.getUser();if(user.error||!user.data.user)throw new Error('Sign in to view clinic enquiries.');
  const result=await supabase.from('studioflow_clinic_enquiries').select('id,service_name,customer_name,customer_phone,message,created_at').eq('owner_id',user.data.user.id).order('created_at',{ascending:false}).limit(100);
  if(result.error)throw result.error;if(active)setItems(result.data||[]);
 }catch(e){if(active)setError(e && typeof e==='object' && 'message' in e?String(e.message):'Enquiries could not load.');}finally{if(active)setLoading(false)}})();return()=>{active=false}},[retry]);
 return <section className="workspace-card"><h2>Treatment enquiries</h2><p className="muted">Enquiries are not confirmed appointments. Contact the customer to respond.</p><button type="button" className="secondary-action" onClick={()=>setRetry(n=>n+1)}>Refresh enquiries</button>{loading&&<p role="status">Loading enquiries…</p>}{error&&<p role="alert">Could not load enquiries: {error}</p>}{!loading&&!error&&!items.length&&<p>No enquiries yet.</p>}{!loading&&!error&&items.map(item=><article key={item.id} className="border rounded-xl p-3 mt-3"><strong>{item.service_name}</strong><p>{item.customer_name} · <a href={`tel:${item.customer_phone}`}>{item.customer_phone}</a></p>{item.message&&<p>{item.message}</p>}<small>{new Date(item.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</small></article>)}</section>;
}
