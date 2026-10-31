// Secrets stay in Supabase Edge Function settings, never in the browser bundle.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {signatureMatches,depositPaise} from './payment-security.ts';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-razorpay-signature,x-worker-token',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS'
};

function env(name:string){
  const value=Deno.env.get(name);
  return value?value.trim().replace(/^['"]|['"]$/g,''):'';
}
function razorpayCredentials(){
  const key=env('RAZORPAY_KEY_ID')||env('RZP_KEY_ID')||env('RAZORPAY_KEY');
  const secret=env('RAZORPAY_KEY_SECRET')||env('RZP_KEY_SECRET')||env('RAZORPAY_SECRET');
  const webhookSecret=env('RAZORPAY_WEBHOOK_SECRET')||env('RZP_WEBHOOK_SECRET');
  return {key,secret,webhookSecret,configured:!!key&&!!secret,mode:key.startsWith('rzp_live_')?'live':'test'};
}

Deno.serve(async(req:Request)=>{
  const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const creds=razorpayCredentials();
  if(req.method==='GET')return respond({configured:creds.configured,webhookConfigured:!!creds.webhookSecret,mode:creds.mode});
  if(req.method!=='POST')return respond({error:'POST required'},405);
  try {
    const url=env('SUPABASE_URL')||Deno.env.get('SUPABASE_URL')||'';
    const serviceKey=env('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
    if(!url||!serviceKey)return respond({error:'Payment service is missing server credentials.'},500);
    const service=createClient(url,serviceKey,{auth:{persistSession:false}});
    const raw=await req.text();if(raw.length>20000)return respond({error:'Request too large'},413);
    const webhookSignature=req.headers.get('x-razorpay-signature');
    const body=raw?JSON.parse(raw):{};
    const provider=async(path:string,options:RequestInit={})=>{
      if(!creds.configured)throw new Error('Platform payment gateway is not configured. The platform owner must add Razorpay credentials.');
      const response=await fetch(`https://api.razorpay.com/v1/${path}`,{
        ...options,
        headers:{Authorization:`Basic ${btoa(`${creds.key}:${creds.secret}`)}`,'Content-Type':'application/json',...(options.headers||{})},
        signal:AbortSignal.timeout(15000)
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        const detail=typeof data?.error?.description==='string'?data.error.description:typeof data?.error==='string'?data.error:'';
        throw new Error(detail||'Razorpay request failed. Please try again or contact platform support.');
      }
      return data;
    };
    const refundPayment=async(orderId:string,paymentId:string,amount:number)=>{
      try{
        const refund=await provider(`payments/${encodeURIComponent(paymentId)}/refunds`,{method:'POST',body:JSON.stringify({amount,speed:'optimum',notes:{studioflow_order:orderId}})});
        await service.rpc('studioflow_complete_refund',{p_order:orderId,p_refund:refund.id||refund.entity?.id||paymentId,p_ok:true,p_error:null});
        return {refunded:true,refundId:refund.id};
      }catch(error){
        const message=error instanceof Error?error.message:'Refund failed';
        if(/already refunded|fully refunded/i.test(message)){
          await service.rpc('studioflow_complete_refund',{p_order:orderId,p_refund:paymentId,p_ok:true,p_error:null});
          return {refunded:true,refundId:paymentId};
        }
        await service.rpc('studioflow_complete_refund',{p_order:orderId,p_refund:null,p_ok:false,p_error:message});
        return {refunded:false,error:message};
      }
    };
    const processRefundQueue=async()=>{
      try{await service.rpc('studioflow_expire_unpaid_holds');}catch{/* hold expiry is best-effort before refunds */}
      const {data,error}=await service.rpc('studioflow_claim_refunds',{p_limit:10});
      if(error)throw new Error('Refund queue unavailable');
      const jobs=Array.isArray(data)?data:[];
      const results=[];
      for(const job of jobs){
        results.push(await refundPayment(job.order_id,job.payment_id,Number(job.amount_paise)));
      }
      return {processed:jobs.length,results};
    };
    const settle=async(orderId:string,paymentId:string)=>{
      const {data:order,error}=await service.from('studioflow_payment_orders').select('*').eq('order_id',orderId).single();
      if(error)throw new Error('Payment order not found');
      const payment=await provider(`payments/${encodeURIComponent(paymentId)}`);
      if(payment.order_id!==orderId||payment.currency!=='INR'||payment.amount!==order.amount_paise||payment.status!=='captured'){
        throw new Error('Payment capture is pending or does not match the booking. Recheck payment status shortly.');
      }
      const result=await service.rpc('studioflow_settle_payment',{p_order:orderId,p_payment:paymentId,p_amount:payment.amount});
      if(result.error)throw new Error('Could not finalize payment. Recheck payment status; do not pay again.');
      if(result.data?.refund_required){
        const refund=await refundPayment(orderId,paymentId,order.amount_paise);
        return {...result.data,...refund};
      }
      return result.data;
    };

    if(webhookSignature){
      if(!creds.configured||!creds.webhookSecret)return respond({error:'Webhook configuration missing'},503);
      if(!await signatureMatches(creds.webhookSecret,raw,webhookSignature))return respond({error:'Invalid webhook signature'},401);
      if(body.event==='payment.captured'){
        const p=body.payload?.payment?.entity;
        const {data:known}=await service.from('studioflow_payment_orders').select('booking_id').eq('order_id',p?.order_id||'').maybeSingle();
        if(known&&p?.id&&p?.order_id)await settle(p.order_id,p.id);
      }
      if(body.event==='refund.processed'||body.event==='refund.failed'){
        const refund=body.payload?.refund?.entity;
        const paymentId=refund?.payment_id;
        if(paymentId){
          const {data:order}=await service.from('studioflow_payment_orders').select('order_id').eq('payment_id',paymentId).maybeSingle();
          if(order)await service.rpc('studioflow_complete_refund',{p_order:order.order_id,p_refund:refund.id||null,p_ok:body.event==='refund.processed',p_error:body.event==='refund.failed'?'refund.failed':null});
        }
      }
      return respond({received:true});
    }

    const worker=req.headers.get('x-worker-token');
    const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
    if(body.action==='refunds'){
      if(worker){
        const verified=await service.rpc('studioflow_payments_verify_worker',{p_token:worker});
        if(verified.error||!verified.data)return respond({error:'Unauthorized'},401);
      }else if(token!==serviceKey){
        return respond({error:'Unauthorized'},401);
      }
      if(!creds.configured)return respond({error:'Platform payment gateway is not configured. The platform owner must add Razorpay credentials.'},503);
      return respond(await processRefundQueue());
    }

    if(!token)return respond({error:'Sign in before checkout'},401);
    const auth=await service.auth.getUser(token);if(auth.error||!auth.data.user)return respond({error:'Your session expired. Sign in again.'},401);
    if(body.action==='status')return respond({configured:creds.configured,webhookConfigured:!!creds.webhookSecret,mode:creds.mode});
    if(!creds.configured)return respond({error:'Platform payment gateway is not configured. The platform owner must add Razorpay credentials.'},503);

    if(body.action==='refundBooking'){
      if(typeof body.bookingId!=='string')return respond({error:'Booking reference required'},400);
      const {data:booking,error}=await service.from('studioflow_bookings').select('*').eq('id',body.bookingId).or(`customer_id.eq.${auth.data.user.id},owner_id.eq.${auth.data.user.id}`).maybeSingle();
      if(error||!booking)return respond({error:'Booking not found for this account'},404);
      const {data:order}=await service.from('studioflow_payment_orders').select('*').eq('booking_id',booking.id).maybeSingle();
      if(!order||!order.payment_id)return respond({error:'No captured online payment to refund'},404);
      if(order.status==='refunded')return respond({booking:booking.payload,refunded:true});
      if(booking.status!=='cancelled'&&order.status!=='refund_required'&&order.status!=='refunding'){
        return respond({error:'Refunds are issued for expired or cancelled online advances.'},409);
      }
      await service.from('studioflow_payment_orders').update({status:'refund_required'}).eq('booking_id',booking.id).in('status',['captured','refund_failed']);
      const refund=await refundPayment(order.order_id,order.payment_id,order.amount_paise);
      return respond({booking:booking.payload,...refund});
    }

    if(typeof body.bookingId!=='string')return respond({error:'Booking reference required'},400);
    const {data:booking,error}=await service.from('studioflow_bookings').select('*').eq('id',body.bookingId).eq('customer_id',auth.data.user.id).single();
    if(error||!booking)return respond({error:'Booking not found for this account'},404);
    if(body.action==='create'){
      if(booking.status!=='pending'||!booking.hold_expires_at||new Date(booking.hold_expires_at).getTime()<=Date.now())return respond({error:'Reservation expired. Choose another slot.'},409);
      const amount=depositPaise(booking.payload.servicePrice);
      if(amount<100)return respond({error:'Service price is too low for online payment'},400);
      let {data:order}=await service.from('studioflow_payment_orders').select('*').eq('booking_id',booking.id).maybeSingle();
      if(order&&['refund_required','refunding','refunded','refund_failed'].includes(order.status)){
        return respond({error:'This reservation can no longer accept a new payment. Choose another slot.'},409);
      }
      if(!order){
        const created=await provider('orders',{method:'POST',body:JSON.stringify({
          amount,currency:'INR',receipt:String(booking.id).replace(/-/g,'').slice(0,40),payment_capture:1,
          notes:{studioflow_booking:String(booking.id)}
        })});
        const result=await service.rpc('studioflow_register_payment',{p_booking:booking.id,p_order:created.id,p_amount:amount});
        if(result.error)throw new Error('Reservation changed. Choose another slot before paying.');
        order=result.data;
      }
      return respond({keyId:creds.key,orderId:order.order_id,amount:order.amount_paise,currency:'INR',bookingId:booking.id,mode:creds.mode});
    }
    const {data:order}=await service.from('studioflow_payment_orders').select('*').eq('booking_id',booking.id).single();if(!order)return respond({error:'Payment order not found'},404);
    if(body.action==='verify'){
      if(body.orderId!==order.order_id||typeof body.paymentId!=='string'||typeof body.signature!=='string'||!await signatureMatches(creds.secret,`${order.order_id}|${body.paymentId}`,body.signature))return respond({error:'Invalid payment signature'},400);
      return respond({booking:await settle(order.order_id,body.paymentId)});
    }
    if(body.action==='reconcile'){
      if(order.status==='captured')return respond({booking:booking.payload});
      if(order.status==='refunded'||booking.payload?.refund_required)return respond({booking:{...booking.payload,refund_required:true},refunded:order.status==='refunded'});
      const payments=await provider(`orders/${encodeURIComponent(order.order_id)}/payments`);
      const payment=payments.items?.find((p:any)=>p.status==='captured');
      if(!payment)return respond({error:'Payment has not been captured yet. Please retry shortly.'},409);
      return respond({booking:await settle(order.order_id,payment.id)});
    }
    return respond({error:'Unknown payment action'},400);
  }catch(error){return respond({error:error instanceof Error?error.message:'Payment service could not complete the request'},400);}
});
