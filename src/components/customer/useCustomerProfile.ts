import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from '../../lib/supabase';
import {message} from './model';
import {isRecord} from '../../lib/normalizeWorkspace';
import {withTimeout} from '../../lib/asyncDeadline';
export type CustomerProfile={customer_id?:string;full_name:string;phone:string;photo_path?:string;referral_code?:string;whatsapp_number?:string;date_of_birth?:string};
export type CustomerPreferences={theme:'light'|'dark';language:'en'|'hi';notifications_enabled?:boolean};
const EMPTY:CustomerProfile={full_name:'',phone:''};
export const CUSTOMER_BUCKET='nexora-customer-private';
export async function readCustomerProfile(){
 const {data,error}=await withTimeout(supabase.rpc('studioflow_android_profile'),15000,'Loading your customer profile');
 if(error)throw error;
 if(data!=null&&!isRecord(data))throw new Error('Your customer profile returned invalid data. Please retry.');
 const missing=data==null;
 // Blank fields represent a genuinely missing record, never a fabricated identity.
 const profile:CustomerProfile={...(data||{}),full_name:typeof data?.full_name==='string'?data.full_name:'',phone:typeof data?.phone==='string'?data.phone:''};
 let photoUrl='',photoError='';
 if(typeof profile.photo_path==='string'&&profile.photo_path){
  try{const result=await withTimeout(supabase.storage.from(CUSTOMER_BUCKET).createSignedUrl(profile.photo_path,3600),12000,'Loading your profile photo');if(result.error||!result.data?.signedUrl)throw result.error||new Error('No photo link');photoUrl=result.data.signedUrl;}
  catch{photoError='Profile photo could not load. Retry to refresh its private link.';}
 }
 return{profile,photoUrl,photoError,missing};
}
export async function prepareAvatar(file:File):Promise<Blob>{if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP photograph.');if(file.size>10*1024*1024)throw new Error('Choose a photograph smaller than 10 MB.');const image=await createImageBitmap(file);try{const size=Math.min(640,image.width,image.height);if(size<1)throw new Error('This image could not be opened.');const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const context=canvas.getContext('2d');if(!context)throw new Error('Photo processing is unavailable. Try another image.');const crop=Math.min(image.width,image.height);context.fillStyle='#ffffff';context.fillRect(0,0,size,size);context.drawImage(image,(image.width-crop)/2,(image.height-crop)/2,crop,crop,0,0,size,size);return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Photo could not be prepared.')),'image/jpeg',.88));}finally{image.close();}}
export async function uploadCustomerAvatar(uid:string,blob:Blob){if(!uid)throw new Error('Sign in before uploading your profile photograph.');if(blob.type!=='image/jpeg'||blob.size>5*1024*1024)throw new Error('Choose a valid profile photograph smaller than 5 MB.');const path=`${uid}/photos/${crypto.randomUUID()}.jpg`;const bucket=supabase.storage.from(CUSTOMER_BUCKET);const result=await bucket.upload(path,blob,{contentType:'image/jpeg',upsert:false});if(result.error)throw result.error;const record=await supabase.rpc('studioflow_android_record_upload',{p_path:path,p_document:false});if(record.error){await bucket.remove([path]).catch(()=>{});throw record.error;}return path;}
export function useCustomerProfile(session:Session|null,revision:number){
 const uid=session?.user?.id||'',current=useRef(uid),ticket=useRef(0);current.current=uid;
 const [state,setState]=useState<{uid:string;profile:CustomerProfile;photoUrl:string;preferences:CustomerPreferences;loaded:boolean;missing?:boolean;failed?:boolean}>({uid:'',profile:EMPTY,photoUrl:'',preferences:{theme:'light',language:'en'},loaded:false}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const reload=useCallback(async()=>{const id=++ticket.current;setError('');if(!uid){let preferences:CustomerPreferences={theme:'light',language:'en'};try{const local=JSON.parse(localStorage.getItem('nexora_customer_preferences_v1')||'{}');preferences={theme:local.theme==='dark'?'dark':'light',language:local.language==='hi'?'hi':'en'}}catch{}setState({uid:'',profile:EMPTY,photoUrl:'',preferences,loaded:true});return;}
 try{const [result,prefs]=await Promise.all([readCustomerProfile(),withTimeout(supabase.from('studioflow_customer_preferences').select('theme,language,notifications_enabled').eq('customer_id',uid).maybeSingle(),15000,'Loading your preferences')]);if(id!==ticket.current||current.current!==uid)return;if(prefs.error)throw prefs.error;setError(result.photoError);setState({uid,...result,preferences:prefs.data||{theme:'light',language:'en'},loaded:true,failed:false});}catch(e){if(id===ticket.current&&current.current===uid){setError(message(e));setState(s=>s.uid===uid?{...s,loaded:true,failed:true}:{uid,profile:EMPTY,photoUrl:'',preferences:{theme:'light',language:'en'},loaded:true,failed:true})}}},[uid]);
 useEffect(()=>{void reload();return()=>{ticket.current++}},[reload,revision]);
 useEffect(()=>{if(!uid)return;const visible=()=>{if(!document.hidden)void reload()};window.addEventListener('focus',visible);window.addEventListener('nexora-customer-profile-updated',visible);const timer=setInterval(visible,25*60*1000);document.addEventListener('visibilitychange',visible);return()=>{clearInterval(timer);window.removeEventListener('focus',visible);window.removeEventListener('nexora-customer-profile-updated',visible);document.removeEventListener('visibilitychange',visible)}},[uid,reload]);
 async function saveProfile(full_name:string,phone:string){if(!uid)throw new Error('Sign in to edit your profile.');setBusy(true);setError('');try{const {error}=await supabase.rpc('studioflow_android_save_profile',{p_name:full_name.trim(),p_phone:phone.trim()});if(error)throw error;if(current.current===uid)setState(s=>s.uid===uid?{...s,profile:{...s.profile,full_name:full_name.trim(),phone:phone.trim()}}:s);}finally{setBusy(false)}}
 async function saveDetails(full_name:string,phone:string,whatsapp:string,birthDate:string){if(!uid)throw new Error('Sign in to edit your profile.');setBusy(true);setError('');try{const {error}=await supabase.rpc('studioflow_customer_update_details',{p_name:full_name.trim(),p_phone:phone.trim(),p_whatsapp:whatsapp,p_birth_date:birthDate});if(error)throw error;if(current.current===uid){await reload();window.dispatchEvent(new Event('nexora-customer-profile-updated'));}}finally{setBusy(false)}}
 async function uploadPhoto(file:File){if(!uid)throw new Error('Sign in to upload a photo.');setBusy(true);setError('');try{const blob=await prepareAvatar(file);if(current.current!==uid)throw new Error('Your account changed. Please try again.');await uploadCustomerAvatar(uid,blob);if(current.current===uid){await reload();window.dispatchEvent(new Event('nexora-customer-profile-updated'));}}finally{setBusy(false)}}
 async function savePreferences(preferences:CustomerPreferences){setBusy(true);try{if(uid){const {error}=await supabase.from('studioflow_customer_preferences').upsert({customer_id:uid,...preferences,updated_at:new Date().toISOString()},{onConflict:'customer_id'});if(error)throw error;}else{try{localStorage.setItem('nexora_customer_preferences_v1',JSON.stringify(preferences))}catch{}}if(current.current===uid)setState(s=>s.uid===uid?{...s,preferences}:s);}finally{setBusy(false)}}
 const mine=state.uid===uid?state:{uid,profile:EMPTY,photoUrl:'',preferences:{theme:'light',language:'en'} as CustomerPreferences,loaded:false};
 return {...mine,error:state.uid===uid?error:'',busy,reload,saveProfile,saveDetails,uploadPhoto,savePreferences};
}
