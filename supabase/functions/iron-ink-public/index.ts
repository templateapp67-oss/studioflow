// Public, serverless Template 12 API for StudioFlow and external consumers such as
// GlowSlot. Uses only the project's anon key: RLS, validated RPCs and table
// triggers remain the authorization boundary. Never add a service-role key here.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
const cors={
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Content-Type':'application/json; charset=utf-8',
};
const json=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:cors});
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return json({error:'POST required'},405);
 const url=Deno.env.get('SUPABASE_URL');const anon=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!anon)return json({error:'Template 12 API is not configured'},503);
 let body:Record<string,unknown>;try{body=await request.json();}catch{return json({error:'Invalid JSON body'},400);}
 const action=String(body.action||'');
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:request.headers.get('Authorization')||`Bearer ${anon}`}}});
 try{
  if(action==='site'){
   const slug=String(body.slug||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9-]{2,62}$/.test(slug))return json({error:'A valid published site slug is required'},400);
   const {data,error}=await client.rpc('get_template12_site_by_slug',{p_slug:slug});if(error)throw error;return json({data});
  }
  if(action==='availability'){
   const siteId=String(body.siteId||'');const artistId=String(body.artistId||'');const date=String(body.date||'');const duration=Number(body.durationMin||60);
   if(!/^[0-9a-f-]{36}$/i.test(siteId)||!/^[0-9a-f-]{36}$/i.test(artistId)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(duration)||duration<1||duration>1440)return json({error:'Invalid availability request'},400);
   const {data,error}=await client.rpc('get_available_slots',{p_site_id:siteId,p_artist_id:artistId,p_date:date,p_duration_min:duration});if(error)throw error;return json({data:data||[]});
  }
  if(action==='create_booking'){
   const args=body.booking as Record<string,unknown>|undefined;if(!args||typeof args!=='object')return json({error:'Booking payload is required'},400);
   const {data,error}=await client.rpc('create_booking',{
    p_site_id:args.siteId,p_customer_name:args.customerName,p_phone:args.phone,p_email:args.email||'',p_category_id:args.categoryId,p_artist_id:args.artistId,
    p_booking_date:args.bookingDate,p_start_time:args.startTime,p_customer_birth_date:args.birthDate,p_size_cm:args.sizeCm??null,p_placement:args.placement||'',p_description:args.description||'',p_reference_images:args.referenceImages||[],
   });if(error)throw error;return json({data},201);
  }
  if(action==='enquiry'){
   const e=body.enquiry as Record<string,unknown>|undefined;if(!e||typeof e!=='object')return json({error:'Enquiry payload is required'},400);
   const {data,error}=await client.rpc('submit_ink_enquiry',{p_site_id:e.siteId,p_name:e.name,p_phone:e.phone||'',p_email:e.email||'',p_message:e.message});if(error)throw error;return json({id:data},201);
  }
  return json({error:'Unknown action'},400);
 }catch(error){
  const message=error instanceof Error?error.message:'Request failed';
  const status=/available|age|phone|email|valid|required|too many|unknown site|artist|category/i.test(message)?422:500;
  return json({error:message},status);
 }
});
