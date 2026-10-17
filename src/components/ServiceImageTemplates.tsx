import {ServiceImagePrompt} from './ServiceImagePrompt';
import React,{useEffect,useRef,useState} from 'react';
import type {BusinessTypeId} from '../types';
import {supabase} from '../lib/supabase';
export type GeneratedServiceImage={imageUrl:string;imagePath:string};
export function ServiceImageTemplates({name,category,description,type,enabled,disabled,selected,onChoose,onBusyChange}:{key?:React.Key;name:string;category:string;description:string;type:BusinessTypeId;enabled:boolean;disabled:boolean;selected:string;onChoose:(photo:GeneratedServiceImage)=>void;onBusyChange:(busy:boolean)=>void}){
 const [images,setImages]=useState<GeneratedServiceImage[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const requestId=useRef(''),alive=useRef(true),running=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;onBusyChange(false);}},[onBusyChange]);
 const generate=async()=>{
  if(!enabled||disabled||running.current)return;running.current=true;setBusy(true);onBusyChange(true);setError('');
  if(!requestId.current)requestId.current=crypto.randomUUID();
  try{
   const result=await supabase.functions.invoke('studioflow-service-ai-images',{body:{requestId:requestId.current,input:{name,category,description,businessType:type}}});
   if(!alive.current)return;
   if(result.error){let message='Could not connect to AI image generation. Check the result before trying a new set.';try{const details=await result.error.context?.json();if(typeof details?.error==='string')message=details.error;}catch{}setError(message);setPending(true);return;}
   const data=result.data;
   if(data?.status==='complete'&&Array.isArray(data.images)&&data.images.length===3){setImages(data.images);setPending(false);requestId.current='';}
   else if(data?.status==='pending'){setPending(true);setError('Your images are still generating. Check the result in a moment.');}
   else{setPending(false);requestId.current='';setError(data?.error||'AI generation failed. No website photos were substituted.');}
  }catch{if(alive.current){setPending(true);setError('Connection interrupted. Check the existing result before generating again.');}}
  finally{running.current=false;if(alive.current){setBusy(false);onBusyChange(false);}}
 };
 if(!enabled)return <ServiceImagePrompt name={name} category={category} description={description} enabled={false}/>;
 return <div className="service-image-template-picker"><ServiceImagePrompt name={name} category={category} description={description} enabled={enabled}/><details className="service-api-images"><summary>Generate inside this app (API credits required)</summary><strong>Generate new images with AI</strong><small>Creates three original images for your selected service. AI-generated illustrations are not photographs of your actual salon. API credits are required; each new set uses credits.</small>
  <button type="button" className="secondary-action" disabled={disabled||busy} onClick={()=>void generate()}>{busy?'Generating 3 AI images…':pending?'Check generation result':images.length?'Generate 3 new AI images':'Generate 3 AI images'}</button>
  {busy&&<p role="status">Creating original images. This can take up to two minutes. Keep this editor open.</p>}
  {error&&<p role="alert" className="service-editor-error">{error}</p>}
  {images.length>0&&<div className="service-image-template-grid" role="group" aria-label="AI generated service images">{images.map((photo,index)=><button type="button" className="service-image-choice" key={photo.imagePath} aria-label={`Select AI image ${index+1}`} aria-pressed={selected===photo.imageUrl} disabled={disabled||busy} onClick={()=>onChoose(photo)}><img src={photo.imageUrl} alt={`${name}, AI image ${index+1}`} width={360} height={240}/><span>{selected===photo.imageUrl?'✓ Selected':`AI image ${index+1}`}</span></button>)}</div>}
 </details></div>;
}
