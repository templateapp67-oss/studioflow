// @ts-ignore Pinned Deno npm import; resolved by the Edge Function runtime.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import { browserCorsHeaders, isAllowedBrowserOrigin } from '../_shared/browserCors.ts';
const publicKey='sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH';
const MAP_CORS='authorization, x-client-info, apikey, content-type';
const json=(data:unknown,status=200,origin:string|null=null)=>new Response(JSON.stringify(data),{status,headers:{...browserCorsHeaders(origin,MAP_CORS,'POST, OPTIONS'),'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 const origin=req.headers.get('origin');
 if(origin&&!isAllowedBrowserOrigin(origin))return json({error:'Origin not allowed'},403,origin);
 const cors=browserCorsHeaders(origin,MAP_CORS,'POST, OPTIONS');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'POST required'},405,origin);
 // Public map endpoint: validate this project's public API key; no user credentials are forwarded.
 if(![publicKey,Deno.env.get('SUPABASE_ANON_KEY')].filter(Boolean).includes(req.headers.get('apikey')||''))return json({error:'Invalid API key'},401,origin);
 try{
  const body=await req.json();const kind=body.kind,key=body.key;
  if(!['salon','template'].includes(kind)||typeof key!=='string'||!/^[a-z0-9_-]{2,100}$/.test(key))return json({error:'Invalid map source'},400,origin);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:claim,error}=await db.rpc('studioflow_map_claim',{p_kind:kind,p_key:key});if(error)throw error;
  if(claim.status!=='lookup')return json(claim,200,origin);
  let item:any=null;
  try{
   const endpoint=Deno.env.get('STUDIOFLOW_GEOCODER_URL')||'https://nominatim.openstreetmap.org/search';
   const url=new URL(endpoint);url.search=new URLSearchParams({format:'jsonv2',limit:'1',countrycodes:'in',q:claim.query}).toString();
   const response=await fetch(url,{headers:{'User-Agent':'StudioFlowMaps/1.0 (https://nexorasalon.online)','Accept-Language':'en','Referer':'https://nexorasalon.online/'},signal:AbortSignal.timeout(10000)});
   if(!response.ok){console.warn('Map provider HTTP status',response.status);throw new Error('Geocoder temporarily unavailable')}const data=await response.json();if(Array.isArray(data))item=data[0]
  }catch(error){console.warn('Map lookup failed',error instanceof Error?error.name:'upstream');return json({error:'Address lookup temporarily unavailable. Retry shortly.'},503,origin)}
  const lat=Number(item?.lat),lon=Number(item?.lon),valid=Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85&&Math.abs(lon)<=180;
  const {data:saved,error:saveError}=await db.rpc('studioflow_map_complete',{p_kind:kind,p_key:key,p_token:claim.token,p_lat:valid?lat:null,p_lon:valid?lon:null,p_display:valid?String(item.display_name||''):''});if(saveError)throw saveError;
  if(!saved)return json({status:'busy',retryAfterMs:1500},200,origin);
  return json(valid?{status:'ready',latitude:lat,longitude:lon,displayName:item.display_name,accuracy:claim.accuracy}:{status:'unavailable'},200,origin);
 }catch{return json({error:'Map location lookup is temporarily unavailable.'},500,origin)}
});
