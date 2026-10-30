import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
import {withTimeout} from '../../lib/asyncDeadline';
import {upgradeBeautyParlourTemplate} from '../../lib/roopMahalReference';
import {upgradeNailStudioTemplate} from '../../lib/pinkyNails';
import {upgradeLashBrowCustomerTemplate} from '../../lib/archFlutter';
import {CATEGORY_TEMPLATES} from '../../categoryTemplates';
import {isSalon,type Salon,type Service,type Stylist} from './model';
import type {Promotion} from '../../lib/promotionStatus';
import {withTemplateDemos} from './templateDemos';
export type CustomerTemplate={id:string;title:string;shortName:string;tagline:string;coverImageUrl:string;defaultCity?:string;themePreset?:string;subCategories?:string[];services?:Service[];stylists?:Stylist[];demoOffer?:Promotion};
export function useCustomerCatalog(revision:number){
 const [salons,setSalons]=useState<Salon[]>([]),[templates,setTemplates]=useState<CustomerTemplate[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true,ticket=0;
  const load=async(initial=false)=>{
   const request=++ticket;if(initial)setLoading(true);
   try{
    const {data,error}=await withTimeout(supabase.rpc('studioflow_customer_catalog'),15000,'Loading salons');
    if(!active||request!==ticket)return;
    if(error)throw error;
    if(!data||!Array.isArray(data.salons)||!Array.isArray(data.templates))throw new Error('Invalid catalog');
    const syncedTemplates=data.templates.filter((t:any)=>t&&typeof t.id==='string').map((t:CustomerTemplate)=>upgradeLashBrowCustomerTemplate(upgradeNailStudioTemplate(upgradeBeautyParlourTemplate(t)),CATEGORY_TEMPLATES.lash_brow));
    const validSalons=data.salons.filter(isSalon);
    setError(validSalons.length!==data.salons.length?'Some salon profiles are unavailable. Please refresh or contact the salon owner.':'');
    setSalons(withTemplateDemos(validSalons,syncedTemplates));setTemplates(syncedTemplates);
   }catch{if(active&&request===ticket)setError('Salons could not sync. Check your connection and refresh.');}
   finally{if(active&&request===ticket)setLoading(false);}
  };
  void load(true);const refresh=()=>{if(!document.hidden)void load()};
  const channel=supabase.channel('customer-live-catalog').on('postgres_changes',{event:'*',schema:'public',table:'studioflow_websites'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'studioflow_templates'},refresh).subscribe();
  const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;ticket++;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);void supabase.removeChannel(channel)};
 },[revision]);return{salons,templates,loading,error};
}
