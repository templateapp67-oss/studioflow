export type WelcomeJob={customer_id:string;phone:string;name:string;referral_code:string};
export function welcomeTemplate(job:WelcomeJob,name:string,language:string){const base='https://nexora-one-white-label.templateapp67.chatgpt.site/';return {messaging_product:'whatsapp',to:job.phone.replace(/\D/g,''),type:'template',template:{name,language:{code:language},components:[{type:'body',parameters:[job.name,job.customer_id,base+'?app=1&auth=signin',base+'?app=1&auth=signup&customer_ref='+encodeURIComponent(job.referral_code)].map(text=>({type:'text',text}))}]}}}
export async function sendWelcome(job:WelcomeJob,config:{token:string;phoneId:string;version:string;template:string;language:string},http:typeof fetch=fetch){
 try{const response=await http(`https://graph.facebook.com/${config.version}/${config.phoneId}/messages`,{method:'POST',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},body:JSON.stringify(welcomeTemplate(job,config.template,config.language)),signal:AbortSignal.timeout(12000)});const data=await response.json().catch(()=>null);const id=data?.messages?.[0]?.id;
 if(response.ok&&typeof id==='string')return {status:'accepted',id,error:null};
 if(response.ok)return {status:'unknown',id:null,error:'provider_ack_missing'};
 // Explicit throttling is safe to retry; ambiguous transport failures never retry automatically.
 return {status:response.status===429?'retry':'failed',id:null,error:'provider_http_'+response.status+'_code_'+String(data?.error?.code||'unknown').replace(/[^\dA-Za-z_]/g,'').slice(0,20)};
 }catch{return {status:'unknown',id:null,error:'ambiguous_transport_failure'}}
}
