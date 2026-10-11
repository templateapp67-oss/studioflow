// Secrets stay in Supabase Edge Function settings, never in the browser bundle.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {signatureMatches,depositPaise} from './payment-security.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-razorpay-signature','Access-Control-Allow-Methods':'POST,OPTIONS'};
Deno.serve(async(req:Request)=>{
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method==='GET')return respond({configured:!!Deno.env.get('RAZORPAY_KEY_ID')&&!!Deno.env.get('RAZORPAY_KEY_SECRET'),webhookConfigured:!!Deno.env.get('RAZORPAY_WEBHOOK_SECRET'),mode:Deno.env.get('RAZORPAY_KEY_ID')?.startsWith('rzp_live_')?'live':'test'});
 if(req.method!=='POST')return respond({error:'POST required'},405);
 try {
  const url=Deno.env.get('SUPABASE_URL')!;
  const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const key=Deno.env.get('RAZORPAY_KEY_ID'),secret=Deno.env.get('RAZORPAY_KEY_SECRET'),webhookSecret=Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  const raw=await req.text();if(raw.length>20000)return respond({error:'Request too large'},413);
  const webhookSignature=req.headers.get('x-razorpay-signature');
  const body=JSON.parse(raw);
  const provider=async(path:string,options:RequestInit={})=>{
   const response=await fetch(`https://api.razorpay.com/v1/${path}`,{...options,headers:{Authorization:`Basic ${btoa(`${key}:${secret}`)}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});
   const data=await response.json();if(!response.ok)throw new Error('Razorpay request failed. Please try again or contact platform support.');return data;
  };
  const settle=async(orderId:string,paymentId:string)=>{
   const {data:order,error}=await service.from('studioflow_payment_orders').select('*').eq('order_id',orderId).single();if(error)throw new Error('Payment order not found');
   const payment=await provider(`payments/${encodeURIComponent(paymentId)}`);
   if(payment.order_id!==orderId||payment.currency!=='INR'||payment.amount!==order.amount_paise||payment.status!=='captured')throw new Error('Payment capture is pending or does not match the booking. Recheck payment status shortly.');
   const result=await service.rpc('studioflow_settle_payment',{p_order:orderId,p_payment:paymentId,p_amount:payment.amount});if(result.error)throw new Error('Could not finalize payment. Recheck payment status; do not pay again.');return result.data;
  };
  if(webhookSignature){
   if(!key||!secret||!webhookSecret)return respond({error:'Webhook configuration missing'},503);
   if(!await signatureMatches(webhookSecret,raw,webhookSignature))return respond({error:'Invalid webhook signature'},401);
   if(body.event==='payment.captured'){
    const p=body.payload?.payment?.entity;
    const {data:known}=await service.from('studioflow_payment_orders').select('booking_id').eq('order_id',p?.order_id||'').maybeSingle();
    if(known)await settle(p.order_id,p.id);
   }
   return respond({received:true});
  }
  // verify_jwt is disabled at the gateway for ES256/publishable-key support;
  // every non-webhook request is authenticated against Supabase Auth here.
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return respond({error:'Sign in before checkout'},401);
  const auth=await service.auth.getUser(token);if(auth.error||!auth.data.user)return respond({error:'Your session expired. Sign in again.'},401);
  if(body.action==='status')return respond({configured:!!key&&!!secret,webhookConfigured:!!webhookSecret,mode:key?.startsWith('rzp_live_')?'live':'test'});
  if(!key||!secret)return respond({error:'Platform payment gateway is not configured. The platform owner must add Razorpay credentials.'},503);
  if(typeof body.bookingId!=='string')return respond({error:'Booking reference required'},400);
  const {data:booking,error}=await service.from('studioflow_bookings').select('*').eq('id',body.bookingId).eq('customer_id',auth.data.user.id).single();
  if(error||!booking)return respond({error:'Booking not found for this account'},404);
  if(body.action==='create'){
   if(booking.status!=='pending'||!booking.hold_expires_at||new Date(booking.hold_expires_at).getTime()<=Date.now())return respond({error:'Reservation expired. Choose another slot.'},409);
   const amount=depositPaise(booking.payload.servicePrice);
   if(amount<100)return respond({error:'Service price is too low for online payment'},400);
   let {data:order}=await service.from('studioflow_payment_orders').select('*').eq('booking_id',booking.id).maybeSingle();
   if(!order){
    const created=await provider('orders',{method:'POST',body:JSON.stringify({amount,currency:'INR',receipt:booking.id,notes:{studioflow_booking:booking.id}})});
    const result=await service.rpc('studioflow_register_payment',{p_booking:booking.id,p_order:created.id,p_amount:amount});if(result.error)throw new Error('Reservation changed. Choose another slot before paying.');order=result.data;
   }
   return respond({keyId:key,orderId:order.order_id,amount:order.amount_paise,currency:'INR',bookingId:booking.id});
  }
  const {data:order}=await service.from('studioflow_payment_orders').select('*').eq('booking_id',booking.id).single();if(!order)return respond({error:'Payment order not found'},404);
  if(body.action==='verify'){
   if(body.orderId!==order.order_id||typeof body.paymentId!=='string'||typeof body.signature!=='string'||!await signatureMatches(secret,`${order.order_id}|${body.paymentId}`,body.signature))return respond({error:'Invalid payment signature'},400);
   return respond({booking:await settle(order.order_id,body.paymentId)});
  }
  if(body.action==='reconcile'){
   if(order.status==='captured')return respond({booking:booking.payload});
   const payments=await provider(`orders/${encodeURIComponent(order.order_id)}/payments`);
   const payment=payments.items?.find((p:any)=>p.status==='captured');
   if(!payment)return respond({error:'Payment has not been captured yet. Please retry shortly.'},409);
   return respond({booking:await settle(order.order_id,payment.id)});
  }
  return respond({error:'Unknown payment action'},400);
 }catch(error){return respond({error:error instanceof Error?error.message:'Payment service could not complete the request'},400);}
});
