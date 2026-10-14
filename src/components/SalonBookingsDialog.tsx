import React,{useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import type {SalonProfile} from '../types';
import {X} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {CustomerBookings} from './CustomerBookings';
import {AuthPage} from './AuthPage';
import {ACCENT_PALETTES,DEFAULT_CATEGORY_ACCENTS,getContrastTextColor,AccentPaletteKey} from '../themeAccents';
export function SalonBookingsDialog({profile,onClose}:{profile:SalonProfile;onClose:()=>void}){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('');
 const dialog=useRef<HTMLElement>(null);
 const palette=ACCENT_PALETTES[(profile.themeAccentKey||DEFAULT_CATEGORY_ACCENTS[profile.businessType]) as AccentPaletteKey];
 const accent=profile.customAccentColor||(profile.businessType==='barber'?'#c49a6c':palette?.primaryHex||'#0f172a');
 useEffect(()=>{let active=true;let authChanged=false;
  supabase.auth.getSession().then(({data,error})=>{if(!active||authChanged)return;setSession(data.session);setReady(true);if(error)setError('Could not check your account. Close this panel and try again.');}).catch(()=>{if(active&&!authChanged){setReady(true);setError('Could not check your account. Close this panel and try again.');}});
  const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(active){authChanged=true;setSession(next);setReady(true);setError('');}});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  const node=dialog.current,doc=node?.ownerDocument;if(!node||!doc)return;
  const previous=doc.activeElement as HTMLElement|null,overflow=doc.body.style.overflow;doc.body.style.overflow='hidden';node.querySelector<HTMLElement>('button')?.focus();
  const keys=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose();}if(event.key==='Tab'){const nodes=Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)')) as HTMLElement[],first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}};
  doc.addEventListener('keydown',keys);return()=>{doc.body.style.overflow=overflow;doc.removeEventListener('keydown',keys);previous?.focus({preventScroll:true});};
 },[]);
 return <div className={`sf-page sf-bookings-root${profile.businessType==='barber'?' sf-barber':''}`} style={{'--sf-accent':accent,'--sf-accent-text':getContrastTextColor(accent)} as React.CSSProperties} onClick={event=>{if(event.currentTarget===event.target)onClose();}}><section ref={dialog} className="sf-bookings-dialog" role="dialog" aria-modal="true" aria-labelledby="salon-my-bookings-title"><header><div><small>{profile.businessName}</small><h2 id="salon-my-bookings-title">My Bookings</h2></div><button className="sf-bookings-close" aria-label="Close my bookings" onClick={onClose}><X size={22}/></button></header>{error?<p role="alert">{error}</p>:!ready?<p role="status">Loading your account…</p>:session?<CustomerBookings key={session.user.id} session={session} embedded onClose={onClose}/>:<><p className="sf-bookings-login-note">Sign in with the customer account you used to book. Only your own appointments will appear here.</p><AuthPage compact customerMode returnSlug={profile.subdomain}/></>}</section></div>;
}
