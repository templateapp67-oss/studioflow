import {payBookingDeposit,reconcileBookingPayment} from '../lib/platformPayments';
import React, { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, websiteLink } from '../lib/supabase';

export function CustomerBookings({ session }: { session: Session }) {
  const [bookings, setBookings] = useState<any[]>([]); const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState('');
  const returnSlug = new URLSearchParams(location.search).get('return');
  const refresh = useCallback(async () => {
    setError(''); setLoading(true);
    const { data, error } = await supabase.from('studioflow_bookings').select('id,status,payload,owner_id,hold_expires_at').eq('customer_id', session.user.id).order('starts_at', { ascending: false });
    if (error) setError(error.message); else setBookings(data || []); setLoading(false);
  }, [session.user.id]);
  useEffect(() => { const channel=supabase.channel(`studioflow-customer-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'studioflow_bookings',filter:`customer_id=eq.${session.user.id}`},()=>void refresh()).subscribe();void refresh(); const focus = () => void refresh(); window.addEventListener('focus', focus); return () => {window.removeEventListener('focus', focus);void supabase.removeChannel(channel);}; }, [refresh]);
  const payment=async(id:string,payload:any,recheck=false)=>{setBusy(id);setError('');try{if(recheck)await reconcileBookingPayment(id);else await payBookingDeposit({...payload,id});await refresh();}catch(error){setError(error instanceof Error?error.message:'Payment could not complete');}finally{setBusy('');}};
  const cancel = async (id: string) => {
    setBusy(id); setError('');
    const { error } = await supabase.rpc('studioflow_update_booking', { p_id: id, p_status: 'cancelled' });
    if (error) setError(error.message); else await refresh(); setBusy('');
  };
  return <main className="min-h-screen bg-[#f9f9ff] p-4 sm:p-8"><section className="workspace-card max-w-4xl mx-auto">
    <p className="eyebrow">StudioFlow · Customer account</p><h1 className="text-3xl font-bold">My bookings</h1><p className="muted my-3">{session.user.email}</p>
    <div className="flex gap-3 flex-wrap mb-6">{returnSlug && <a className="primary-action" href={websiteLink(returnSlug)}>Return to salon / Book appointment</a>}<button className="secondary-action" onClick={() => void refresh()}>Refresh</button><a className="secondary-action" href="/">Salon owner workspace</a><button className="secondary-action" onClick={() => void supabase.auth.signOut()}>Sign out</button></div>
    {error && <p role="alert" className="text-red-700 my-4">{error}</p>}
    {loading ? <p role="status">Loading bookings…</p> : !bookings.length ? <p>No appointments yet. Return to your salon website to choose a service and time.</p> : <div className="space-y-4">{bookings.map(({ id, status, payload: b,hold_expires_at }) => <article key={id} className="border rounded-xl p-4">
      <div className="flex justify-between gap-3"><h2 className="font-bold">{b.serviceName}</h2><span className="capitalize">{status}</span></div><p>{b.date} · {b.time} IST · {b.stylistName}</p><p>₹{b.servicePrice} · Paid ₹{b.amountPaid || 0}</p>{status === 'pending' && <div className="mt-3"><p className="text-amber-800 text-sm">{hold_expires_at&&new Date(hold_expires_at).getTime()>Date.now()?'Reserved for payment. A verified 25% advance confirms your appointment.':'Payment reservation expired. Choose a new slot if you have not paid.'}</p>{hold_expires_at&&new Date(hold_expires_at).getTime()>Date.now()&&<button disabled={!!busy} className="primary-action mt-2 mr-2" onClick={()=>void payment(id,b)}>Pay 25% deposit</button>}<button disabled={!!busy} className="secondary-action mt-2" onClick={()=>void payment(id,b,true)}>Recheck payment status</button></div>}
      {['pending', 'confirmed'].includes(status) && <button disabled={!!busy} className="secondary-action mt-3" onClick={() => void cancel(id)}>{busy === id ? 'Cancelling…' : 'Cancel appointment'}</button>}
    </article>)}</div>}
  </section></main>;
}
