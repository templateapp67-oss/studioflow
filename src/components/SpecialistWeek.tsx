import React,{useEffect,useState} from 'react';
import type {SalonProfile,SalonService,Stylist,SalonBranch} from '../types';
import {supabase} from '../lib/supabase';
import {useWebsiteLanguage} from './WebsiteLanguage';
export type DirectBookingSlot={date:string;time:string;stylistId:string;branchId?:string};
export function SpecialistWeek({profile,staff,services,onSlot}:{key?:React.Key;profile:SalonProfile;staff:Stylist;services:SalonService[];onSlot:(service:SalonService,slot:DirectBookingSlot)=>void}){
 const {t}=useWebsiteLanguage();
 const [serviceId,setServiceId]=useState(services[0]?.id||'');
 const [offset,setOffset]=useState(0);
 const [data,setData]=useState<{key:string;days:{date:string;slots:any[]}[]}|null>(null);
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 const [branches,setBranches]=useState<SalonBranch[]>(profile.branches||[]);
 const [branchId,setBranchId]=useState('');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const key=JSON.stringify([profile.subdomain,serviceId,staff.id,today,offset,retry,branchId]);
 useEffect(()=>{let active=true;void supabase.rpc('studioflow_public_branches',{p_slug:profile.subdomain}).then(({data,error})=>{if(!active)return;if(!error&&Array.isArray(data)&&data.some((branch:any)=>typeof branch?.id==='string'&&typeof branch?.name==='string')){setBranches(data.filter((branch:any)=>typeof branch?.id==='string'&&typeof branch?.name==='string').map((branch:any)=>({id:branch.id,name:branch.name,city:branch.city||'',address:branch.address||'',phone:branch.phone||'',isActive:branch.isActive!==false,operatingHours:branch.operatingHours||[]})));}});return()=>{active=false};},[profile.subdomain]);
 useEffect(()=>{if(branches.length===1)setBranchId(branches[0].id);else if(!branches.some(branch=>branch.id===branchId))setBranchId('');},[branches,branchId]);
 useEffect(()=>{let active=true;setError('');setData(null);if(!profile.subdomain||!serviceId||(branches.length>1&&!branchId))return;const dates=Array.from({length:7},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+(offset+i)*86400000).toISOString().slice(0,10));
 Promise.all(dates.map(async date=>{const r=branchId?await supabase.rpc('studioflow_branch_available_slots',{p_slug:profile.subdomain,p_service_id:serviceId,p_date:date,p_stylist_id:staff.id,p_branch:branchId}):await supabase.rpc('studioflow_available_slots',{p_slug:profile.subdomain,p_service_id:serviceId,p_date:date,p_stylist_id:staff.id});if(r.error)throw r.error;return {date,slots:(r.data||[]).filter((s:any)=>s.available)};})).then(days=>{if(active)setData({key,days})}).catch(()=>{if(active)setError('Availability could not load. Please retry.');});return()=>{active=false};},[key,branches.length,branchId]);
 return <section className="sf-specialist-week" aria-label={`Weekly slots for ${staff.name}`}><h3>{t('Weekly availability')} · {staff.name}</h3><p>India Standard Time · Slots rechecked before checkout.</p>
 {branches.length>0&&<label>{t('Choose location')}<select value={branchId} onChange={e=>setBranchId(e.target.value)}><option key="branch-placeholder" value="">Select location</option>{branches.filter(branch=>branch.isActive).map(branch=><option value={branch.id} key={branch.id}>{branch.name} · {branch.city}</option>)}</select></label>}
 <label>{t('Choose service')}<select value={serviceId} onChange={e=>setServiceId(e.target.value)}>{services.map(s=><option value={s.id} key={s.id}>{s.name} · ₹{s.price}</option>)}</select></label><div className="sf-week-controls"><button type="button" disabled={!offset} onClick={()=>setOffset(n=>Math.max(0,n-7))}>← Previous week</button><button type="button" disabled={offset>=77} onClick={()=>setOffset(n=>n+7)}>Next week →</button></div>
 {!profile.subdomain?<p>Publish this salon to show live availability.</p>:branches.length>1&&!branchId?<p role="status">Choose a location to view slots.</p>:error?<p role="alert">{error} <button type="button" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:data?.key!==key?<p role="status">Loading weekly slots…</p>:<div className="sf-week-grid">{data.days.map(day=><article key={day.date}><strong>{new Date(day.date+'T12:00:00Z').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</strong><div>{day.slots.length?day.slots.map(s=><button type="button" key={s.time} aria-label={`Book ${staff.name} ${day.date} ${s.label}`} onClick={()=>{const service=services.find(x=>x.id===serviceId);if(service)onSlot(service,{date:day.date,time:s.time,stylistId:staff.id,branchId:branchId||undefined})}}>{s.label}</button>):<small>No available slots</small>}</div></article>)}</div>}</section>;
}
