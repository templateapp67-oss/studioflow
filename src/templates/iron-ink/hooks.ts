import {useCallback,useEffect,useState} from 'react';
import {createInkBooking,getInkAvailableSlots,getTemplate12SiteBySlug,submitInkEnquiry,type InkBookingInput,type InkEnquiryInput} from './api';
import type {InkAvailableSlot,InkSitePayload} from './database.types';

type Result<T>={data:T|null;loading:boolean;error:string;refetch:()=>void};
export function useInkSite(slug?:string):Result<InkSitePayload>{
 const [data,setData]=useState<InkSitePayload|null>(null);const [loading,setLoading]=useState(Boolean(slug));const [error,setError]=useState('');const [refresh,setRefresh]=useState(0);
 useEffect(()=>{if(!slug){setData(null);setLoading(false);return;}let active=true;setLoading(true);getTemplate12SiteBySlug(slug).then(value=>{if(active){setData(value);setError('');}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Studio content could not load. Showing the starter content.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[slug,refresh]);
 return{data,loading,error,refetch:()=>setRefresh(value=>value+1)};
}
export function useInkSettings(slug?:string){const result=useInkSite(slug);return{...result,data:result.data?.settings||null};}
export function useInkCategories(slug?:string){const result=useInkSite(slug);return{...result,data:result.data?.categories||[]};}
export function useInkArtists(slug?:string){const result=useInkSite(slug);return{...result,data:result.data?.artists||[]};}
export function useInkPortfolio(slug?:string){const result=useInkSite(slug);return{...result,data:result.data?.portfolio||[]};}
export function useInkPricing(slug?:string){const result=useInkSite(slug);return{...result,data:result.data?.pricing||[]};}
export function useInkTestimonials(slug?:string){const result=useInkSite(slug);return{...result,data:result.data?.testimonials||[]};}
export function useInkFaqs(slug?:string){const result=useInkSite(slug);return{...result,data:result.data?.faqs||[]};}
export function useInkAftercare(slug?:string){const result=useInkSite(slug);return{...result,data:result.data?.aftercare||[]};}
export function useInkAvailability(siteId?:string,artistId?:string,date?:string,durationMin=60,branchId?:string){
 const [data,setData]=useState<InkAvailableSlot[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [refresh,setRefresh]=useState(0);
 useEffect(()=>{if(!siteId||!artistId||!date){setData([]);setLoading(false);return;}let active=true;setLoading(true);getInkAvailableSlots(siteId,artistId,date,durationMin,branchId).then(slots=>{if(active){setData(slots);setError('');}}).catch(reason=>{if(active){setData([]);setError(reason instanceof Error?reason.message:'Available times could not load.');}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[siteId,artistId,date,durationMin,branchId,refresh]);
 return{data,loading,error,refetch:()=>setRefresh(value=>value+1)};
}
export function useCreateInkBooking(){const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [data,setData]=useState<unknown>(null);const mutate=useCallback(async(input:InkBookingInput)=>{setLoading(true);setError('');try{const result=await createInkBooking(input);setData(result);return result;}catch(reason){const message=reason instanceof Error?reason.message:'Could not request this session. Please try again.';setError(message);throw reason;}finally{setLoading(false);}},[]);return{mutate,loading,error,data};}
export function useInkEnquiry(){const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [success,setSuccess]=useState(false);const mutate=useCallback(async(input:InkEnquiryInput)=>{setLoading(true);setError('');setSuccess(false);try{await submitInkEnquiry(input);setSuccess(true);}catch(reason){setError(reason instanceof Error?reason.message:'Could not send your enquiry. Please try again.');throw reason;}finally{setLoading(false);}},[]);return{mutate,loading,error,success};}
