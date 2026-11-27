// Secrets stay in Supabase Edge Function settings, never in the browser bundle.
import { protectSession, protectedResponse } from '../_shared/sessionProtection.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {signatureMatches,depositPaise,sameSecret} from './payment-security.ts';
import {paymentLinkOrderKey,verifiedLinkPaymentId,verifyLinkPayment} from './payment-link-security.ts';
import { browserCorsHeaders, isAllowedBrowserOrigin } from '../_shared/browserCors.ts';
import { claimWebhookEvent, finishWebhookEvent, resolveWebhookEventId, safeWebhookEventType, webhookReplayToleranceSeconds } from '../_shared/webhookSecurity.ts';
import { sendBookingReceipts } from './booking-receipts.ts';
const PAYMENT_CORS_HEADERS = 'authorization,apikey,content-type,x-client-info,x-razorpay-signature,x-razorpay-event-id,x-worker-token';

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
  const origin=req.headers.get('origin');
  if(origin&&!isAllowedBrowserOrigin(origin))return new Response(JSON.stringify({error:'Origin not allowed'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const cors=browserCorsHeaders(origin,PAYMENT_CORS_HEADERS,'GET,POST,OPTIONS');
  const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const creds=razorpayCredentials();
  const expectedWebMode=env('BOOKING_RAZORPAY_MODE')||'test';
  const webOnline=creds.configured&&creds.key.startsWith(`rzp_${expectedWebMode}_`)&&['test','live'].includes(expectedWebMode);
  const webVenue=env('BOOKING_PAY_AT_VENUE_ENABLED')==='true';
  if(req.method==='GET')return respond({configured:creds.configured,webhookConfigured:!!creds.webhookSecret,mode:creds.mode,
    webCheckout:{online:webOnline,venue:webVenue,mode:expectedWebMode}});
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
    const dispatchReceipts=async(bookingId:string)=>{
      try{await sendBookingReceipts(service,env,bookingId);}
      catch{console.error('Booking receipt dispatch failed; queued receipts remain available to the worker.');}
    };
    const settle=async(orderId:string,paymentId:string)=>{
      const {data:order,error}=await service.from('studioflow_payment_orders').select('*').eq('order_id',orderId).single();
      if(error)throw new Error('Payment order not found');
      const payment=await provider(`payments/${encodeURIComponent(paymentId)}`);
      // Payment Links must pass membership checks on every settlement path,
      // including generic payment.captured events and authenticated polling.
      if(order.payment_link_id){
        const liveLink=await provider('payment_links/'+encodeURIComponent(order.payment_link_id));
        verifiedLinkPaymentId(liveLink,order,paymentId);
        verifyLinkPayment(payment,liveLink,order,paymentId);
      }
      if((!order.payment_link_id&&payment.order_id!==orderId)||payment.currency!=='INR'||payment.amount!==order.amount_paise||payment.status!=='captured'){
        throw new Error('Payment capture is pending or does not match the booking. Recheck payment status shortly.');
      }
      const result=await service.rpc('studioflow_settle_payment',{p_order:orderId,p_payment:paymentId,p_amount:payment.amount});
      if(result.error)throw new Error('Could not finalize payment. Recheck payment status; do not pay again.');
      if(result.data?.refund_required){
        const refund=await refundPayment(orderId,paymentId,order.amount_paise);
        return {...result.data,...refund};
      }
      if(result.data?.status==='confirmed'&&order.order_id.startsWith('order_'))await dispatchReceipts(order.booking_id);
      return result.data;
    };

    if(webhookSignature){
      if(!creds.configured||!creds.webhookSecret)return respond({error:'Webhook configuration missing'},503);
      if(!await signatureMatches(creds.webhookSecret,raw,webhookSignature))return respond({error:'Invalid webhook signature'},401);
      // Replay protection: the signature proves Razorpay sent the bytes, not that
      // they are fresh. `created_at` is signed inside the body, so it cannot be
      // refreshed by a replayer. Deliveries older than the tolerance are recorded
      // as 'stale' and refused; identical redeliveries resolve to the same event id
      // (x-razorpay-event-id, else sha256 of the raw body) and are never processed twice.
      const tolerance = webhookReplayToleranceSeconds(env('WEBHOOK_REPLAY_TOLERANCE_SECONDS'));
      const createdAtSeconds = Number(body?.created_at);
      if(!Number.isSafeInteger(createdAtSeconds) || createdAtSeconds <= 0){
        return respond({error:'Missing or invalid webhook timestamp (created_at).'},400);
      }
      const eventId = await resolveWebhookEventId(req.headers.get('x-razorpay-event-id'), raw);
      let claim;
      try {
        claim = await claimWebhookEvent(service, { provider:'razorpay', eventId, eventType: safeWebhookEventType(body?.event), eventCreatedAtSeconds: createdAtSeconds, toleranceSeconds: tolerance });
      } catch {
        return respond({error:'Webhook idempotency ledger unavailable'},503);
      }
      if(!claim.claimed){
        if(claim.reason==='duplicate')return respond({received:true,duplicate:true});
        return respond({error:'Stale webhook event.',reason:claim.reason??'stale'},400);
      }
      try {
      if(body.event==='payment_link.paid'){
        const eventLink=body.payload?.payment_link?.entity;
        if(eventLink?.id&&eventLink.status==='paid'){
          const {data:known}=await service.from('studioflow_payment_orders')
            .select('booking_id,order_id,payment_link_id,amount_paise')
            .eq('payment_link_id',eventLink.id).maybeSingle();
          if(known&&Number(known.amount_paise)>0){
            // Fetch the authoritative Payment Link, then prove the event payment
            // is a captured member of that exact link and matches the INR advance.
            const liveLink=await provider('payment_links/'+encodeURIComponent(eventLink.id));
            const eventPaymentId=typeof body.payload?.payment?.entity?.id==='string'
              ? body.payload.payment.entity.id : undefined;
            const paymentId=verifiedLinkPaymentId(liveLink,known,eventPaymentId);
            const payment=await provider('payments/'+encodeURIComponent(paymentId));
            verifyLinkPayment(payment,liveLink,known,paymentId);
            const settled=await service.rpc('studioflow_settle_payment',{
              p_order:known.order_id,p_payment:paymentId,p_amount:Number(payment.amount)
            });
            if(settled.error)throw new Error('Could not settle the verified WhatsApp payment link.');
            if(settled.data?.refund_required){
              await refundPayment(known.order_id,paymentId,Number(known.amount_paise));
            }else{
              await service.from('studioflow_payment_orders')
                .update({payment_link_status:'paid'}).eq('booking_id',known.booking_id);
              // Receipt endpoint rechecks the captured ledger, confirmed booking,
              // sender ownership and customer opt-out before sending anything.
              const receipt=await fetch(url+'/functions/v1/nexora-whatsapp-webhook',{
                method:'POST',
                headers:{Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},
                body:JSON.stringify({action:'paymentReceipt',bookingId:known.booking_id,paymentId}),
                signal:AbortSignal.timeout(15000)
              });
              if(!receipt.ok)throw new Error('Payment is recorded but WhatsApp receipt delivery must be retried.');
            }
          }
        }
      }
      if(body.event==='payment_link.expired'||body.event==='payment_link.cancelled'){
        const link=body.payload?.payment_link?.entity;
        if(link?.id){
          await service.from('studioflow_payment_orders')
            .update({payment_link_status:body.event==='payment_link.expired'?'expired':'cancelled'})
            .eq('payment_link_id',link.id).eq('status','created');
        }
      }

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
      await finishWebhookEvent(service,'razorpay',eventId,'processed').catch(()=>{});
      return respond({received:true});
      } catch (processingError) {
        await finishWebhookEvent(service,'razorpay',eventId,'failed').catch(()=>{});
        // 5xx, never 4xx: a transient settle/receipt/provider failure must be
        // retried by Razorpay. The ledger row stays 'failed' so the redelivery
        // reclaims it. Internal/provider error text is never echoed.
        return respond({error:'Webhook processing failed. The provider will retry.'},500);
      }
    }

    const worker=req.headers.get('x-worker-token');
    const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
    if(body.action==='whatsappCancelPaymentLink'){
      if(!sameSecret(token,serviceKey))return respond({error:'Unauthorized'},401);
      if(typeof body.bookingId!=='string')return respond({error:'Booking reference required'},400);
      const {data:booking,error:bookingError}=await service.from('studioflow_bookings')
        .select('id,booking_source,status').eq('id',body.bookingId).eq('booking_source','whatsapp').maybeSingle();
      if(bookingError||!booking)return respond({error:'WhatsApp booking not found'},404);
      if(booking.status!=='cancelled')return respond({error:'Cancel the unpaid booking hold before cancelling its payment link.'},409);
      const {data:order,error:orderError}=await service.from('studioflow_payment_orders')
        .select('*').eq('booking_id',booking.id).maybeSingle();
      if(orderError)return respond({error:'Payment record could not be loaded.'},503);
      if(!order?.payment_link_id)return respond({cancelled:true,linkCancelled:false});
      if(order.status==='captured'||order.payment_id)return respond({error:'This payment is already captured. It cannot be cancelled as an unpaid link.'},409);
      if(order.payment_link_status==='cancelled'||order.payment_link_status==='expired'){
        return respond({cancelled:true,linkCancelled:true,reused:true});
      }
      try{
        await provider('payment_links/'+encodeURIComponent(order.payment_link_id)+'/cancel',{method:'POST',body:'{}'});
      }catch(error){
        const {data:latest}=await service.from('studioflow_payment_orders')
          .select('status,payment_link_status').eq('booking_id',booking.id).maybeSingle();
        if(latest?.status==='captured')return respond({error:'Payment was captured before cancellation completed. Contact the salon for a refund.'},409);
        if(latest?.payment_link_status!=='cancelled'&&latest?.payment_link_status!=='expired'){
          return respond({error:error instanceof Error?error.message:'Razorpay could not cancel the payment link.'},502);
        }
      }
      const {error:updateError}=await service.from('studioflow_payment_orders')
        .update({payment_link_status:'cancelled'})
        .eq('booking_id',booking.id).eq('status','created');
      if(updateError)return respond({error:'Payment link cancellation could not be saved. Contact support.'},503);
      return respond({cancelled:true,linkCancelled:true});
    }

    if(body.action==='whatsappPaymentLink'){
      if(!sameSecret(token,serviceKey))return respond({error:'Unauthorized'},401);
      if(!creds.configured)return respond({error:'Razorpay is not configured for payment links.'},503);
      if(typeof body.bookingId!=='string')return respond({error:'Booking reference required'},400);
      const {data:booking,error:bookingError}=await service.from('studioflow_bookings')
        .select('*').eq('id',body.bookingId).eq('booking_source','whatsapp').maybeSingle();
      if(bookingError||!booking)return respond({error:'WhatsApp booking not found'},404);
      if(booking.status!=='pending'||!booking.hold_expires_at||new Date(booking.hold_expires_at).getTime()<=Date.now()){
        return respond({error:'The appointment hold expired. Please choose another slot.'},409);
      }
      const amount=depositPaise(Number(booking.payload?.servicePrice||0));
      if(!Number.isSafeInteger(amount)||amount<100)return respond({error:'Service price is too low for an online advance'},400);
      const {data:existingOrder,error:existingError}=await service.from('studioflow_payment_orders')
        .select('*').eq('booking_id',booking.id).maybeSingle();
      if(existingError)return respond({error:'Payment record could not be loaded.'},503);
      if(existingOrder?.status==='captured')return respond({
        paid:true,amountPaise:existingOrder.amount_paise,paymentId:existingOrder.payment_id
      });
      if(existingOrder?.payment_link_id&&existingOrder?.payment_link_url&&existingOrder.payment_link_status==='created'){
        return respond({
          paymentLinkId:existingOrder.payment_link_id,
          paymentLinkUrl:existingOrder.payment_link_url,
          amountPaise:existingOrder.amount_paise,
          orderId:existingOrder.order_id,
          reused:true
        });
      }
      if(existingOrder&&Number(existingOrder.amount_paise)!==amount){
        return respond({error:'The registered payment amount does not match this booking.'},409);
      }
      const contact=String(booking.payload?.clientPhone||'').replace(/[^0-9]/g,'');
      const created=await provider('payment_links',{method:'POST',body:JSON.stringify({
        amount,currency:'INR',accept_partial:false,
        reference_id:(crypto.randomUUID().replace(/-/g,'')+'-'+String(booking.id).slice(0,7)).slice(0,40),
        expire_by:Math.floor(Date.now()/1000)+16*60,
        description:'25% booking advance - '+String(booking.payload?.serviceName||'Salon appointment').slice(0,150),
        customer:{
          name:String(booking.payload?.clientName||'Salon customer').slice(0,100),
          contact:contact ? '+'+contact.slice(-15) : undefined
        },
        notify:{sms:false,email:false},reminder_enable:false,
        notes:{studioflow_booking:String(booking.id),studioflow_owner:String(booking.owner_id),booking_source:'whatsapp'}
      })});
      if(!created?.id||!created?.short_url||!/^https:\/\/rzp\.io\//.test(created.short_url)||
         Number(created.amount)!==amount||created.currency!=='INR'){
        return respond({error:'Razorpay did not return a valid payment link for this booking.'},502);
      }
      const {data:freshBooking}=await service.from('studioflow_bookings')
        .select('status,hold_expires_at').eq('id',booking.id).maybeSingle();
      if(!freshBooking||freshBooking.status!=='pending'||!freshBooking.hold_expires_at||
        new Date(freshBooking.hold_expires_at).getTime()<=Date.now()){
        try{await provider('payment_links/'+encodeURIComponent(created.id)+'/cancel',{method:'POST',body:'{}'});}catch{/* best effort */}
        return respond({error:'The appointment hold expired before the payment link could be saved.'},409);
      }
      const registered=await service.rpc('studioflow_whatsapp_register_payment_link',{
        p_owner:booking.owner_id,p_booking:booking.id,
        p_order:typeof created.order_id==='string'&&created.order_id?created.order_id:paymentLinkOrderKey(created.id),
        p_amount:amount,p_payment_link_id:created.id,p_payment_link_url:created.short_url,
        p_expire_by:Number(created.expire_by||0)
      });
      if(registered.error){
        try{await provider('payment_links/'+encodeURIComponent(created.id)+'/cancel',{method:'POST',body:'{}'});}catch{/* best effort */}
        throw new Error('Could not securely register the Razorpay payment link against this salon booking.');
      }
      if(registered.data?.already_paid){
        try{await provider('payment_links/'+encodeURIComponent(created.id)+'/cancel',{method:'POST',body:'{}'});}catch{/* best effort */}
        return respond({paid:true,amountPaise:registered.data.amount_paise||amount,paymentId:registered.data.payment_id||null});
      }
      if(registered.data?.payment_link_id!==created.id){
        try{await provider('payment_links/'+encodeURIComponent(created.id)+'/cancel',{method:'POST',body:'{}'});}catch{/* best effort */}
        if(!registered.data?.payment_link_id||!registered.data?.payment_link_url){
          throw new Error('Registered payment link could not be loaded.');
        }
        return respond({paymentLinkId:registered.data.payment_link_id,paymentLinkUrl:registered.data.payment_link_url,
          amountPaise:registered.data.amount_paise,orderId:registered.data.order_id,reused:true});
      }
      return respond({paymentLinkId:created.id,paymentLinkUrl:created.short_url,
        amountPaise:amount,orderId:registered.data?.order_id,reused:false},201);
    }

    if(body.action==='refunds'||body.action==='bookingReceipts'){
      if(worker){
        const verified=await service.rpc('studioflow_payments_verify_worker',{p_token:worker});
        if(verified.error||!verified.data)return respond({error:'Unauthorized'},401);
      }else if(!sameSecret(token,serviceKey)){
        return respond({error:'Unauthorized'},401);
      }
      if(body.action==='bookingReceipts')return respond({processed:await sendBookingReceipts(service,env)});
      const receipts=await sendBookingReceipts(service,env).catch(()=>0);
      if(!creds.configured)return respond({refundsConfigured:false,receipts});
      return respond({...await processRefundQueue(),receipts});
    }

    if(!token)return respond({error:'Sign in before checkout'},401);
    const auth=await service.auth.getUser(token);if(auth.error||!auth.data.user)return respond({error:'Your session expired. Sign in again.'},401);
    const protection = await protectSession(service, token, auth.data.user, 'studioflow-payments', 100);
    if (protection) return protectedResponse(respond({ error: protection.error }, protection.status), protection);
    if(body.action==='prepareWebCheckout'){
      if(typeof body.bookingId!=='string'||!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(body.bookingId)||
        typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)||
        !['online','venue'].includes(body.method))return respond({error:'Enter a valid email and payment method.'},400);
      if(body.method==='online'&&!webOnline)return respond({error:'Online checkout is unavailable in the configured payment mode.'},503);
      if(body.method==='venue'&&!webVenue)return respond({error:'Pay at Venue is unavailable.'},409);
      const {data,error}=await service.rpc('studioflow_prepare_web_checkout',{
        p_booking:body.bookingId,p_customer:auth.data.user.id,p_email:body.email,p_method:body.method,
        p_whatsapp:body.whatsapp===true
      });
      if(error)return respond({error:'Could not prepare checkout. Check your contact details and slot, or reopen the reservation.'},409);
      if(data?.status==='confirmed')await dispatchReceipts(data.id);
      return respond({booking:data});
    }
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
      const full=booking.web_checkout_method==='online';
      if(full&&!webOnline)return respond({error:'Online checkout is unavailable in the configured payment mode.'},503);
      const amount=full?Math.round(Number(booking.payload.servicePrice)*100):depositPaise(booking.payload.servicePrice);
      if(!Number.isSafeInteger(amount)||amount<100)return respond({error:'Service price is too low for online payment'},400);
      let {data:order}=await service.from('studioflow_payment_orders').select('*').eq('booking_id',booking.id).maybeSingle();
      if(order&&['refund_required','refunding','refunded','refund_failed'].includes(order.status)){
        return respond({error:'This reservation can no longer accept a new payment. Choose another slot.'},409);
      }
      if(!order){
        const created=await provider('orders',{method:'POST',body:JSON.stringify({
          amount,currency:'INR',receipt:String(booking.id).replace(/-/g,'').slice(0,40),payment_capture:1,
          notes:{studioflow_booking:String(booking.id)}
        })});
        const result=await service.rpc(full?'studioflow_register_full_web_payment':'studioflow_register_payment',{p_booking:booking.id,p_order:created.id,p_amount:amount});
        if(result.error)throw new Error('Reservation changed. Choose another slot before paying.');
        order=result.data;
      }
      if(!order||!/^order_[a-zA-Z0-9]+$/.test(order.order_id)||order.amount_paise!==amount)
        return respond({error:'A different payment already exists for this booking. Recheck its payment status.'},409);
      return respond({keyId:creds.key,orderId:order.order_id,amount:order.amount_paise,currency:'INR',bookingId:booking.id,mode:creds.mode});
    }
    const {data:order}=await service.from('studioflow_payment_orders').select('*').eq('booking_id',booking.id).single();if(!order)return respond({error:'Payment order not found'},404);
    if(body.action==='verify'){
      if(body.orderId!==order.order_id||typeof body.paymentId!=='string'||typeof body.signature!=='string'||!await signatureMatches(creds.secret,`${order.order_id}|${body.paymentId}`,body.signature))return respond({error:'Invalid payment signature'},400);
      return respond({booking:await settle(order.order_id,body.paymentId)});
    }
    if(body.action==='reconcile'){
      if(order.status==='captured'){if(booking.web_checkout_method==='online')await dispatchReceipts(booking.id);return respond({booking:booking.payload});}
      if(order.status==='refunded'||booking.payload?.refund_required)return respond({booking:{...booking.payload,refund_required:true},refunded:order.status==='refunded'});
      const payments=await provider(`orders/${encodeURIComponent(order.order_id)}/payments`);
      const payment=payments.items?.find((p:any)=>p.status==='captured');
      if(!payment)return respond({error:'Payment has not been captured yet. Please retry shortly.'},409);
      return respond({booking:await settle(order.order_id,payment.id)});
    }
    return respond({error:'Unknown payment action'},400);
  }catch(error){return respond({error:error instanceof Error?error.message:'Payment service could not complete the request'},400);}
});
