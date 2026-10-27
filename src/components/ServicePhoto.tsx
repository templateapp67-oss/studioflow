import React,{useState} from 'react';
import type {BusinessTypeId,SalonService} from '../types';
import {servicePhotoUrl,defaultServiceImage} from '../lib/serviceImages';
import {SALON_IMAGES} from '../assets/images';
export function ServicePhoto({service,type,className='sf-service-image'}:{service:SalonService;type?:BusinessTypeId;className?:string}){
 const [failed,setFailed]=useState<string[]>([]);
 if(type==='beauty_parlour'){
  const ownerUrl=servicePhotoUrl(service,type);
  const disableFallback=Boolean((service as SalonService&{disableFallbackImage?:boolean}).disableFallbackImage);
  const roopChoices=Array.from(new Set([ownerUrl,disableFallback?'':defaultServiceImage(service,type)].filter(Boolean)));
  const roopSrc=roopChoices.find(url=>!failed.includes(url));
  if(!roopSrc)return null;
  return <div className={className}><img src={roopSrc} alt={service.name} width={600} height={400} loading="lazy" decoding="async" onError={()=>setFailed(previous=>previous.includes(roopSrc)?previous:[...previous,roopSrc])}/></div>;
 }
 const choices=[servicePhotoUrl(service,type),defaultServiceImage(service,type),SALON_IMAGES.hero];
 const src=choices.find(url=>!failed.includes(url))||SALON_IMAGES.hero;
 return <div className={className}><img src={src} alt={service.name} width={600} height={400} loading="lazy" decoding="async" onError={()=>setFailed(previous=>previous.includes(src)?previous:[...previous,src])}/></div>;
}
