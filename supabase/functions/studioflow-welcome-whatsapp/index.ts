// @ts-ignore Pinned Deno runtime import.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {sendWelcome,type WelcomeJob} from './core.ts';
// Browser CORS: exact-origin only, same allowlist model as the campaign sender
// and the AI image function. The canonical deployment is
// https://nexorasalon.online (index.html canonical tag); pinning the legacy
// branded origin alone silently blocked the live domain, so the customer's
// welcome message could never be triggered from the real site. The pg_cron
// worker and other server-to-server callers send no Origin and still work.
const ALLOWED_ORIGINS = new Set([
  'https://nexorasalon.online',
  'https://studioflow-ashen-pi.vercel.app',
  'https://nexora-one-white-label.templateapp67.chatgpt.site',
]);
const baseHeaders={
 'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Vary':'Origin',
};
const corsFor=(origin:string|null):Record<string,string>=>origin!==null&&ALLOWED_ORIGINS.has(origin)
 ?{...baseHeaders,'Access-Control-Allow-Origin':origin}
 :{...baseHeaders};
const json=(body:unknown,status=200,origin:string|null=null)=>new Response(JSON.stringify(body),{status,headers:{...corsFor(origin),'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 if(req.method==='OPTIONS'){
  if(origin!==null&&!ALLOWED_ORIGINS.has(origin))return new Response('Origin not allowed',{status:403,headers:{...corsFor(null),'Cache-Control':'no-store'}});
  return new Response(null,{status:204,headers:{...corsFor(origin),'Cache-Control':'no-store'}});
 }
 if(origin!==null&&!ALLOWED_ORIGINS.has(origin))return json({error:'Origin not allowed'},403,origin);
 if(req.method!=='POST')return json({error:'POST required'},405,origin);
 try{
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});let customer:string|null=null;
 const worker=req.headers.get('x-worker-token');if(worker){const {data,error}=await db.rpc('studioflow_welcome_verify_worker',{p_token:worker});if(error||!data)return json({error:'Unauthorized'},401,origin)}else{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return json({error:'Sign in required'},401,origin);const {data,error}=await db.auth.getUser(token);if(error||!data.user||!data.user.email_confirmed_at)return json({error:'Confirmed customer account required'},401,origin);customer=data.user.id;
 }
 const token=Deno.env.get('NEXORA_WA_ACCESS_TOKEN'),phoneId=Deno.env.get('NEXORA_WA_PHONE_NUMBER_ID'),template=Deno.env.get('NEXORA_WA_WELCOME_TEMPLATE'),language=Deno.env.get('NEXORA_WA_TEMPLATE_LANGUAGE'),version=Deno.env.get('NEXORA_WA_GRAPH_VERSION');
 if(!token||!phoneId||!/^\d+$/.test(phoneId)||!template||!language||!version||!/^v\d+\.\d+$/.test(version))return json({status:'setup_required',error:'WhatsApp sender and approved welcome template are not configured'},503,origin);
 const {error:activateError}=await db.rpc('studioflow_welcome_activate_worker');if(activateError)return json({error:'Worker unavailable'},503,origin);
 const {data,error}=await db.rpc('studioflow_welcome_claim',{p_customer:customer,p_limit:customer?1:5});if(error)return json({error:'Welcome queue unavailable'},503,origin);
 const results=[];for(const job of (data||[]) as WelcomeJob[]){const result=await sendWelcome(job,{token,phoneId,template,language,version});const saved=await db.rpc('studioflow_welcome_complete',{p_customer:job.customer_id,p_status:result.status,p_message:result.id,p_error:result.error});if(saved.error)return json({error:'Welcome acknowledgement could not be saved'},503,origin);results.push({status:result.status})}
 return json({results});
 }catch{return json({error:'Welcome service temporarily unavailable'},503,origin)}
});
