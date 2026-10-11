import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
export function ReferralPanel() {
 const [code,setCode]=useState(''); const [data,setData]=useState<any>(null); const [message,setMessage]=useState('');
 const load=async()=>{setMessage(''); const [a,b]=await Promise.all([supabase.rpc('get_my_referral_code'),supabase.rpc('get_my_partner_referrals_filtered',{p_limit:100,p_offset:0})]); if(a.error||b.error){setMessage(a.error?.message||b.error?.message||'Could not load referrals');return;}setCode(a.data||'');setData(b.data);};
 useEffect(()=>{void load();},[]);
 const link=`${location.origin}/?ref=${encodeURIComponent(code)}`;
 return <section className="workspace-card"><p className="eyebrow">Growth partner</p><h2>Share & referral</h2><p className="muted">Share your account’s referral link with another salon owner. Signup and website progress are tracked in Supabase. Rewards require the platform’s eligibility rules.</p>
 {message&&<p role="alert">{message}</p>}
 {code&&<div className="referral-box"><code className="break-all">{link}</code><button onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage('Referral link copied');}catch{setMessage('Select and copy the link above.');}}}>Copy link</button></div>}
 <div className="metric-grid"><article className="metric-card"><small>Joined</small><strong>{data?.total||0}</strong></article><article className="metric-card"><small>Published</small><strong>{data?.status_counts?.converted||0}</strong></article></div>
 <div className="table-wrap"><table><thead><tr><th>Account</th><th>Joined</th><th>Progress</th></tr></thead><tbody>{(data?.rows||[]).map((r:any)=><tr key={r.referral_id}><td>{r.ref}</td><td>{new Date(r.joined_at).toLocaleDateString()}</td><td>{r.referral_status}</td></tr>)}</tbody></table>{data&&!data.rows?.length&&<p className="muted py-4">No referred accounts yet.</p>}</div><button className="secondary-action mt-4" onClick={()=>void load()}>Refresh referrals</button></section>;
}
