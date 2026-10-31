import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'POST required'},405);
 try {
  const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'Sign in required'},401);
  const {data:auth,error:authError}=await service.auth.getUser(token);
  if(authError||!auth.user)return json({error:'Session expired'},401);
  const text=await req.text();if(text.length>5000)return json({error:'Request too large'},413);
  const body=JSON.parse(text);if(!['create','reconcile','mode'].includes(body.action)||typeof body.bookingId!=='string')return json({error:'Invalid payment request'},400);
  const {data:booking,error}=await service.from('studioflow_bookings').select('*').eq('id',body.bookingId).eq('customer_id',auth.user.id).single();
  if(error||!booking)return json({error:'Booking not found'},404);
  let {data:order}=await service.from('studioflow_payment_orders').select('*').eq('booking_id',booking.id).maybeSingle();
  if(body.action==='mode')return json({mode:order?.order_id?.startsWith('qr_')?'qr':'checkout'});
  const key=Deno.env.get('RAZORPAY_KEY_ID'),secret=Deno.env.get('RAZORPAY_KEY_SECRET');
  if(!key||!secret)return json({error:'Payment provider is not configured. Ask the platform owner to enable payments.'},503);
  const provider=async(path:string,method='GET',payload?:unknown)=>{
   const response=await fetch(`https://api.razorpay.com/v1/${path}`,{method,headers:{Authorization:`Basic ${btoa(`${key}:${secret}`)}`,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok)throw new Error('QR payment is unavailable. The merchant must enable Razorpay QR payments.');return result;
  };
  if(order&&!order.order_id.startsWith('qr_'))return json({error:'Secure checkout was already started. Use UPI/card checkout or recheck that payment.'},409);
  if(body.action==='create'){
   const expires=Math.floor(new Date(booking.hold_expires_at).getTime()/1000);
   if(booking.status!=='pending'||!Number.isFinite(expires)||expires<=Date.now()/1000+60)return json({error:'Reservation is expiring. Choose a new slot.'},409);
   if(!order){
    // Parse INR as decimal text; avoid floating-point deposit rounding errors.
    const rupees=String(booking.payload.servicePrice);if(!/^\d+(\.\d{1,2})?$/.test(rupees))throw new Error('Invalid booking price');
    const [whole,fraction='']=rupees.split('.');const paise=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));const amount=Number((paise+3n)/4n);
    if(!Number.isSafeInteger(amount)||amount<100)throw new Error('Price is too low for online payment');
    const created=await provider('payments/qr_codes','POST',{type:'upi_qr',name:'Nexora booking',usage:'single_use',fixed_amount:true,payment_amount:amount,close_by:expires,notes:{studioflow_booking:booking.id}});
    const result=await service.rpc('studioflow_register_payment',{p_booking:booking.id,p_order:created.id,p_amount:amount});
    if(result.error||result.data?.order_id!==created.id){
     await provider(`payments/qr_codes/${encodeURIComponent(created.id)}/close`,'POST',{}).catch(()=>{});
     if(result.error)throw new Error('Reservation changed. Choose a slot again.');
    }
    order=result.data;
   }
   const qr=await provider(`payments/qr_codes/${encodeURIComponent(order.order_id)}`);
   if(!qr.image_url?.startsWith('https://')||qr.payment_amount!==order.amount_paise)throw new Error('QR does not match the reserved amount');
   return json({imageUrl:qr.image_url,amount:order.amount_paise,expires});
  }
  if(!order)return json({error:'Start a QR payment first'},404);
  if(order.status==='captured')return json(booking.payload);
  const payments=await provider(`payments/qr_codes/${encodeURIComponent(order.order_id)}/payments?count=100`);
  const paid=payments.items?.find((p:{status:string;currency:string;amount:number})=>p.status==='captured'&&p.currency==='INR'&&p.amount===order.amount_paise);
  if(!paid)return json({error:'No captured payment yet. Check your UPI app and retry shortly.'},409);
  const settled=await service.rpc('studioflow_settle_payment',{p_order:order.order_id,p_payment:paid.id,p_amount:paid.amount});
  if(settled.error)throw new Error('Could not verify payment. Retry verification before paying again.');
  return json(settled.data);
 }catch(_error){return json({error:_error instanceof Error?_error.message:'Payment could not be verified'},400);}
});
