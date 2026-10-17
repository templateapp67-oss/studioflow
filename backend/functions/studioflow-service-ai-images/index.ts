// @ts-ignore pinned Deno dependency
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {imageInput,imageRequest,providerError} from './core.ts';
const cors={'Access-Control-Allow-Origin':'https://nexora-one-white-label.templateapp67.chatgpt.site','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'POST required'},405);
 if(Number(req.headers.get('content-length'))>16000)return json({error:'Request too large'},413);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 let owner='',job='';const paths:string[]=[];
 try{
  const bearer=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  const auth=await db.auth.getUser(bearer);if(auth.error||!auth.data.user)return json({error:'Sign in required'},401);owner=auth.data.user.id;
  const raw=await req.text();if(raw.length>16000)return json({error:'Request too large'},413);const body=JSON.parse(raw),input=imageInput(body.input);
  if(!input||typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.requestId))return json({error:'Select a service, category and description first'},400);
  const claim=await db.rpc('studioflow_service_ai_images_claim',{p_owner:owner,p_request:body.requestId});if(claim.error)return json({error:claim.error.message},429);
  if(!claim.data.proceed)return json({status:claim.data.status,images:claim.data.images,error:claim.data.error});job=claim.data.id;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),115000);
  let response:Response;try{response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${claim.data.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(imageRequest(input)),signal:controller.signal});}finally{clearTimeout(timer);}
  const data=await response.json();if(!response.ok)throw new Error(providerError(data?.error?.code||''));
  if(!Array.isArray(data.data)||data.data.length!==3)throw new Error('AI did not return three complete images. Please try again later.');
  const images=[];
  for(const item of data.data){
   if(typeof item.b64_json!=='string'||item.b64_json.length>7*1024*1024)throw new Error('Generated image exceeds the storage limit.');
   const bytes=Uint8Array.from(atob(item.b64_json),(c:string)=>c.charCodeAt(0));if(bytes.length>5*1024*1024||bytes[0]!==255||bytes[1]!==216)throw new Error('AI returned an invalid image.');
   const imagePath=`${owner}/services/${crypto.randomUUID()}.jpg`;const uploaded=await db.storage.from('studioflow-media').upload(imagePath,bytes,{contentType:'image/jpeg',upsert:false});if(uploaded.error)throw new Error('Could not save the generated images. Please try again later.');paths.push(imagePath);
   images.push({imagePath,imageUrl:db.storage.from('studioflow-media').getPublicUrl(imagePath).data.publicUrl});
  }
  paths.length=0; // Keep completed files if the ledger acknowledgement is uncertain.
  const finished=await db.rpc('studioflow_service_ai_images_finish',{p_owner:owner,p_job:job,p_images:images,p_error:''});if(finished.error||!finished.data)throw new Error('Could not confirm the image set. Check the result before generating again.');
  return json({status:'complete',images});
 }catch(error){
  const message=error instanceof Error&&['AI generation is unavailable','The AI account needs','AI image generation failed','AI did not return','Generated image exceeds','AI returned an invalid','Could not save','Could not confirm'].some(prefix=>error.message.startsWith(prefix))?error.message:'Image generation could not finish. Check the result before starting another set.';
  if(job){if(paths.length)await db.storage.from('studioflow-media').remove(paths);await db.rpc('studioflow_service_ai_images_finish',{p_owner:owner,p_job:job,p_images:[],p_error:message});}
  return json({status:'failed',error:message});
 }
});
