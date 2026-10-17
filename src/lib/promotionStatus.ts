import {useEffect,useState} from 'react';
export type Promotion={enabled?:boolean;selectedServiceId?:string;headline?:string;customOfferText?:string;subtext?:string;promoCode?:string;discountPercent?:number;imageUrl?:string;endsAt?:string;lastMinute?:boolean};
export function promotionActive(p:Promotion|undefined|null,now=Date.now()):boolean{
 if(!p?.enabled)return false;
 if(!p.endsAt)return true;
 const end=Date.parse(p.endsAt);return Number.isFinite(end)&&end>now;
}
export function usePromotionClock(){const [now,setNow]=useState(Date.now);useEffect(()=>{if(typeof window==='undefined')return;const update=()=>setNow(Date.now());const timer=setInterval(update,30000);window.addEventListener('focus',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update)}},[]);return now}
export function offerExpiry(endsAt:string,now:number){const minutes=Math.max(1,Math.ceil((Date.parse(endsAt)-now)/60000));return minutes<60?`Ends in ${minutes}m`:minutes<1440?`Ends in ${Math.floor(minutes/60)}h ${minutes%60}m`:new Date(endsAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})+' IST'}
