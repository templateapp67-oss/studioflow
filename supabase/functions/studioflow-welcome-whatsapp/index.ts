// @ts-ignore Pinned Deno runtime import.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {sendWelcome,type WelcomeJob} from './core.ts';
const cors={'Access-Control-Allow-Origin':'https://nexora-one-white-label.templateapp67.chatgpt.site','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'POST required'},405);
 try{
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});let customer:string|null=null;
 const worker=req.headers.get('x-worker-token');if(worker){const {data,error}=await db.rpc('studioflow_welcome_verify_worker',{p_token:worker});if(error||!data)return json({error:'Unauthorized'},401)}else{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return json({error:'Sign in required'},401);const {data,error}=await db.auth.getUser(token);if(error||!data.user||!data.user.email_confirmed_at)return json({error:'Confirmed customer account required'},401);customer=data.user.id;
 }
 const token=Deno.env.get('NEXORA_WA_ACCESS_TOKEN'),phoneId=Deno.env.get('NEXORA_WA_PHONE_NUMBER_ID'),template=Deno.env.get('NEXORA_WA_WELCOME_TEMPLATE'),language=Deno.env.get('NEXORA_WA_TEMPLATE_LANGUAGE'),version=Deno.env.get('NEXORA_WA_GRAPH_VERSION');
 if(!token||!phoneId||!/^\d+$/.test(phoneId)||!template||!language||!version||!/^v\d+\.\d+$/.test(version))return json({status:'setup_required',error:'WhatsApp sender and approved welcome template are not configured'},503);
 const {error:activateError}=await db.rpc('studioflow_welcome_activate_worker');if(activateError)return json({error:'Worker unavailable'},503);
 const {data,error}=await db.rpc('studioflow_welcome_claim',{p_customer:customer,p_limit:customer?1:5});if(error)return json({error:'Welcome queue unavailable'},503);
 const results=[];for(const job of (data||[]) as WelcomeJob[]){const result=await sendWelcome(job,{token,phoneId,template,language,version});const saved=await db.rpc('studioflow_welcome_complete',{p_customer:job.customer_id,p_status:result.status,p_message:result.id,p_error:result.error});if(saved.error)return json({error:'Welcome acknowledgement could not be saved'},503);results.push({status:result.status})}
 return json({results});
 }catch{return json({error:'Welcome service temporarily unavailable'},503)}
});
