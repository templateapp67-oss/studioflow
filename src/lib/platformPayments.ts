import {supabase} from './supabase';
import type {Appointment} from '../types';
type Order={keyId:string;orderId:string;amount:number;currency:string;bookingId:string};
let sdk:Promise<void>|undefined;
function loadRazorpay(){
 if((window as any).Razorpay)return Promise.resolve();
 if(sdk)return sdk;
 sdk=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;const timer=setTimeout(()=>{script.remove();sdk=undefined;reject(new Error('Payment checkout did not load. Check your connection and retry.'));},15000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();sdk=undefined;reject(new Error('Payment checkout is unavailable. Check your connection and retry.'));};document.head.appendChild(script);});return sdk;
}
export async function paymentRequest(action:string,data:Record<string,unknown>={}) {
 const {data:result,error}=await supabase.functions.invoke('studioflow-payments',{body:{action,...data}});
 if(error){let message=error.message;try{message=(await (error as any).context?.json())?.error||message;}catch{}throw new Error(message||'Payment service is unavailable');}
 if(result?.error)throw new Error(result.error);return result;
}
export async function payBookingDeposit(booking:Appointment):Promise<Appointment> {
 const order:Order=await paymentRequest('create',{bookingId:booking.id});
 await loadRazorpay();
 return new Promise((resolve,reject)=>{
  let verifying=false;
  const checkout=new (window as any).Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,order_id:order.orderId,name:'Salon booking',description:'Mandatory 25% advance',prefill:{name:booking.clientName,contact:booking.clientPhone,email:booking.clientEmail},
   handler:async(response:any)=>{verifying=true;try{const result=await paymentRequest('verify',{bookingId:booking.id,orderId:response.razorpay_order_id,paymentId:response.razorpay_payment_id,signature:response.razorpay_signature});if(result.booking?.refund_required)throw new Error('Payment received after the reservation expired. Contact platform support with your booking reference for a refund.');resolve(result.booking);}catch(error){reject(error);}},
   modal:{ondismiss:()=>{if(!verifying)reject(new Error('Checkout closed. Your slot is held for up to 15 minutes. Retry payment or check payment status.'));}}
  });
  checkout.on('payment.failed',()=>reject(new Error('Payment failed. Retry checkout or check payment status before paying again.')));
  checkout.open();
 });
}
export async function reconcileBookingPayment(id:string):Promise<Appointment>{const result=await paymentRequest('reconcile',{bookingId:id});if(result.booking?.refund_required)throw new Error('Payment needs a refund after the slot expired. Contact platform support with your booking reference.');return result.booking;}
