import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {paymentRequest} from '../lib/platformPayments';
import type {Appointment,SalonBranch,SalonService,Stylist} from '../types';

function istDate(offset=0){
  const now=new Date(Date.now()+offset*86400000);
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function message(error:unknown){return error instanceof Error?error.message:typeof (error as any)?.message==='string'?(error as any).message:'Please try again.';}
export function remainingDue(apt:Appointment){return Math.max(0,Math.round((Number(apt.servicePrice||0)-Number(apt.amountPaid||0))*100)/100);}

type Props={
  slug?:string;
  services:SalonService[];
  stylists:Stylist[];
  appointments:Appointment[];
  branches?:SalonBranch[];
  onChanged:()=>Promise<void>|void;
};

export function OwnerPosPanel({slug,services,stylists,appointments,branches=[],onChanged}:Props){
  const published=stylists.filter(s=>s.status!=='Inactive');
  const [serviceId,setServiceId]=useState(services[0]?.id||'');
  const [stylistId,setStylistId]=useState('any');
  const activeBranches=branches.filter(branch=>branch.isActive);
  const [branchId,setBranchId]=useState(activeBranches.length===1?activeBranches[0].id:'');
  const [date,setDate]=useState(istDate());
  const [time,setTime]=useState('');
  const [slots,setSlots]=useState<{time:string;label?:string;available?:boolean}[]>([]);
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const [collectMode,setCollectMode]=useState<'none'|'deposit'|'full'>('deposit');
  const [posMethod,setPosMethod]=useState<'cash'|'upi'|'card'>('cash');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [completeId,setCompleteId]=useState('');
  const [completeMethod,setCompleteMethod]=useState<'cash'|'upi'|'card'>('cash');
  const service=useMemo(()=>services.find(s=>s.id===serviceId),[services,serviceId]);
  const deposit=service?Math.ceil(Math.round(service.price*100)/4)/100:0;

  useEffect(()=>{if(!services.some(s=>s.id===serviceId))setServiceId(services[0]?.id||'');},[services,serviceId]);
  useEffect(()=>{if(activeBranches.length===1)setBranchId(activeBranches[0].id);else if(!activeBranches.some(branch=>branch.id===branchId))setBranchId('');},[branches,branchId]);
  useEffect(()=>{
    if(!slug||!serviceId||!date||(activeBranches.length>1&&!branchId)){setSlots([]);return;}
    let active=true;
    const request=branchId
      ? supabase.rpc('studioflow_branch_available_slots',{p_slug:slug,p_service_id:serviceId,p_date:date,p_stylist:stylistId||'any',p_branch:branchId})
      : supabase.rpc('studioflow_available_slots',{p_slug:slug,p_service_id:serviceId,p_date:date,p_stylist_id:stylistId||'any'});
    void request.then(({data,error})=>{if(!active)return;if(error)setError(error.message);else {setSlots((data||[]).filter((s:any)=>s.available));setError('');}});
    return()=>{active=false};
  },[slug,serviceId,date,stylistId,branchId,branches.length]);

  async function bookWalkIn(e:React.FormEvent){
    e.preventDefault();setBusy('walkin');setError('');setNotice('');
    try{
      if(!slug)throw new Error('Publish your salon website before accepting bookings.');
      const {data,error}=await supabase.rpc('studioflow_owner_walk_in',{p_request:{serviceId,stylistId,date,time,branchId:branchId||undefined,clientName:name.trim(),clientPhone:phone.trim(),collectMode,posMethod:collectMode==='none'?'none':posMethod}});
      if(error)throw error;
      setName('');setPhone('');setTime('');setNotice(`Walk-in booked${data?.clientName?` for ${data.clientName}`:''}.`);
      await onChanged();
    }catch(e){setError(message(e));}
    finally{setBusy('');}
  }

  async function collectAndComplete(apt:Appointment){
    setBusy(apt.id);setError('');setNotice('');
    try{
      const due=remainingDue(apt);
      const {data,error}=await supabase.rpc('studioflow_complete_visit',{p_id:apt.id,p_method:due>0?completeMethod:'cash',p_amount:due});
      if(error)throw error;
      setCompleteId('');setNotice(`Visit completed. Recorded ₹${Number(data?.amountPaid||apt.servicePrice).toLocaleString('en-IN')}.`);
      await onChanged();
    }catch(e){setError(message(e));}
    finally{setBusy('');}
  }

  async function cancelBooking(apt:Appointment){
    setBusy(apt.id);setError('');setNotice('');
    try{
      const {error}=await supabase.rpc('studioflow_update_booking',{p_id:apt.id,p_status:'cancelled'});
      if(error)throw error;
      await paymentRequest('refundBooking',{bookingId:apt.id}).catch(()=>{});
      setNotice('Appointment cancelled. Online advances are refunded automatically when captured.');
      await onChanged();
    }catch(e){setError(message(e));}
    finally{setBusy('');}
  }

  return <div className="stack space-y-4">
    <section className="workspace-card rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <p className="eyebrow">Front desk</p>
      <h2>Walk-in booking</h2>
      <p className="muted text-sm">Book a guest who is at the salon, assign a specialist, and record cash / UPI / card now. Online 25% checkout stays for app and website reservations.</p>
      {!slug&&<p role="alert" className="text-sm text-amber-800">Publish the website before walk-in bookings can reserve a live slot.</p>}
      <form onSubmit={bookWalkIn} className="form-grid space-y-3">
        {activeBranches.length>0&&<label>Location<select className="workspace-input" required value={branchId} onChange={e=>{setBranchId(e.target.value);setTime('');}}>{activeBranches.length>1&&<option value="">Choose a location</option>}{activeBranches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}{branch.city?` · ${branch.city}`:''}</option>)}</select></label>}
        <label>Service<select className="workspace-input" value={serviceId} onChange={e=>setServiceId(e.target.value)} required>{services.map(s=><option key={s.id} value={s.id}>{s.name} · ₹{s.price.toLocaleString('en-IN')}</option>)}</select></label>
        <label>Specialist<select className="workspace-input" value={stylistId} onChange={e=>setStylistId(e.target.value)}><option value="any">Any available</option>{published.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Date<input className="workspace-input" type="date" min={istDate()} max={istDate(90)} value={date} onChange={e=>setDate(e.target.value)} required/></label>
        <label>Time<select className="workspace-input" value={time} onChange={e=>setTime(e.target.value)} required><option value="">Choose an open slot</option>{slots.map(s=><option key={s.time} value={s.time}>{s.label||s.time}</option>)}</select></label>
        <label>Guest name<input className="workspace-input" required minLength={2} maxLength={150} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
        <label>Phone<input className="workspace-input" required inputMode="tel" minLength={10} maxLength={15} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label>
        <fieldset className="col-span-full"><legend className="field-label">Collect now</legend>
          <label className="workspace-toggle"><input type="radio" name="collect" checked={collectMode==='none'} onChange={()=>setCollectMode('none')}/> Pay remaining at salon (₹0 now)</label>
          <label className="workspace-toggle"><input type="radio" name="collect" checked={collectMode==='deposit'} onChange={()=>setCollectMode('deposit')}/> 25% advance (₹{deposit.toLocaleString('en-IN')})</label>
          <label className="workspace-toggle"><input type="radio" name="collect" checked={collectMode==='full'} onChange={()=>setCollectMode('full')}/> Full ticket (₹{(service?.price||0).toLocaleString('en-IN')})</label>
        </fieldset>
        {collectMode!=='none'&&<label>Method<select className="workspace-input" value={posMethod} onChange={e=>setPosMethod(e.target.value as 'cash'|'upi'|'card')}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option></select></label>}
        <button className="primary-action" disabled={!!busy||!slug||!time||(activeBranches.length>1&&!branchId)}>{busy==='walkin'?'Saving walk-in…':'Save walk-in booking'}</button>
      </form>
    </section>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <section className="workspace-card rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="font-bold mb-3">Collect balance & complete visit</h3>
      {!appointments.length&&<p className="muted text-sm">No appointments yet. Walk-in bookings appear here immediately.</p>}
      <div className="space-y-3">{appointments.map(apt=>{
        const due=remainingDue(apt);
        return <article key={apt.id} className="rounded-xl border border-gray-200 p-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3"><strong>{apt.clientName}</strong><span className={`status ${apt.status}`}>{apt.status}</span></div>
          <p>{apt.serviceName} · {apt.stylistName} · {apt.date} {apt.time}</p>
          <p>Ticket ₹{Number(apt.servicePrice||0).toLocaleString('en-IN')} · Collected ₹{Number(apt.amountPaid||0).toLocaleString('en-IN')}{due>0?` · Due ₹${due.toLocaleString('en-IN')}`:' · Paid in full'}{apt.walkIn?' · Walk-in':''}</p>
          {apt.status==='confirmed'&&<div className="flex flex-wrap gap-2 items-center">
            {completeId===apt.id?<>
              {due>0&&<select className="workspace-input" value={completeMethod} onChange={e=>setCompleteMethod(e.target.value as 'cash'|'upi'|'card')}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option></select>}
              <button className="primary-action" disabled={!!busy} onClick={()=>void collectAndComplete(apt)}>{busy===apt.id?'Saving…':due>0?`Collect ₹${due.toLocaleString('en-IN')} & complete`:'Mark visit complete'}</button>
              <button className="secondary-action" type="button" onClick={()=>setCompleteId('')}>Back</button>
            </>:<button className="primary-action" type="button" onClick={()=>setCompleteId(apt.id)}>Complete visit</button>}
            <button className="secondary-action" type="button" disabled={!!busy} onClick={()=>void cancelBooking(apt)}>Cancel</button>
          </div>}
        </article>;
      })}</div>
    </section>
  </div>;
}
