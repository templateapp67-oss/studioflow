// @ts-ignore Supabase Edge runtime pinned npm import.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {sendCampaign,type CampaignJob} from './core.ts';
const cors={'Access-Control-Allow-Origin':'https://nexora-one-white-label.templateapp67.chatgpt.site','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'POST required'},405);
 try{
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const bearer=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';const {data:auth,error}=await db.auth.getUser(bearer);if(error||!auth.user)return json({error:'Sign in required'},401);
 const owner=auth.user.id;const exists=await db.from('studioflow_accounts').select('user_id').eq('user_id',owner).maybeSingle();if(exists.error||!exists.data)return json({error:'Salon owner access required'},403);
 const provider={token:Deno.env.get('STUDIOFLOW_MARKETING_WHATSAPP_TOKEN')||'',phoneId:Deno.env.get('STUDIOFLOW_MARKETING_WHATSAPP_PHONE_ID')||'',template:Deno.env.get('STUDIOFLOW_MARKETING_WHATSAPP_TEMPLATE')||'',language:Deno.env.get('STUDIOFLOW_MARKETING_WHATSAPP_LANGUAGE')||'en_US',version:Deno.env.get('STUDIOFLOW_MARKETING_GRAPH_VERSION')||''};
 const ready=!!provider.token&&/^\d+$/.test(provider.phoneId)&&/^[a-z0-9_]+$/.test(provider.template)&&/^v\d+\.0$/.test(provider.version)&&Deno.env.get('STUDIOFLOW_MARKETING_OWNER_ID')===owner;
 const body=await req.json();if(body.action==='status')return json({ready,reason:ready?'Connected':'Connect your WhatsApp Business sender and approved image marketing template to enable automatic bulk send.'});
 if(body.action!=='send_batch'||typeof body.campaign!=='string'||!/^[a-f0-9-]{36}$/i.test(body.campaign))return json({error:'Invalid campaign request'},400);
 if(!ready)return json({error:'WhatsApp Business API is not configured for this salon.'},409);
 const claimed=await db.rpc('studioflow_campaign_claim',{p_owner:owner,p_campaign:body.campaign});if(claimed.error)return json({error:claimed.error.message},400);
 const jobs=(claimed.data||[]) as CampaignJob[];let accepted=0,failed=0,unknown=0,skipped=0;
 for(const job of jobs){const allowed=await db.rpc('studioflow_campaign_allowed',{p_owner:owner,p_recipient:job.id,p_claim:job.claim});if(allowed.error)return json({error:'Permission could not be checked. Refresh status before retrying.'},500);const result=allowed.data?await sendCampaign(job,provider):{status:'skipped',message:'',error:'Customer opted out before sending'};const finish=await db.rpc('studioflow_campaign_finish',{p_owner:owner,p_recipient:job.id,p_claim:job.claim,p_status:result.status,p_message:result.message,p_error:result.error});if(finish.error)return json({error:'Delivery status could not be saved. Refresh campaign status before continuing.'},500);if(result.status==='accepted')accepted++;else if(result.status==='failed')failed++;else if(result.status==='unknown')unknown++;else skipped++;}
 const remaining=await db.from('studioflow_owner_campaign_recipients').select('id',{count:'exact',head:true}).eq('campaign_id',body.campaign).eq('delivery_status','ready');if(remaining.error)return json({error:'Refresh campaign status before continuing.'},500);return json({processed:jobs.length,accepted,failed,unknown,skipped,pending:remaining.count||0});
 }catch{return json({error:'Campaign request failed. Refresh status before retrying.'},500);}
});
