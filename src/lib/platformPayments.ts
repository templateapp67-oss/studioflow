import {supabase} from './supabase';
import type { Appointment } from '../types';
type Order={keyId:string;orderId:string;amount:number;currency:string;bookingId:string};
let sdk:Promise<void>|undefined;
function loadRazorpay(){
 if((globalThis as any).Razorpay)return Promise.resolve();
 if(sdk)return sdk;
 sdk=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;const timer=setTimeout(()=>{script.remove();sdk=undefined;reject(new Error('Payment checkout did not load. Check your connection and retry.'));},15000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();sdk=undefined;reject(new Error('Payment checkout is unavailable. Check your connection and retry.'));};document.head.appendChild(script);});return sdk;
}
export async function paymentRequest(action:string,data:Record<string,unknown>={}) {
 const {data:result,error}=await supabase.functions.invoke('studioflow-payments',{body:{action,...data}});
 if(error){let message=error.message;try{message=(await (error as any).context?.json())?.error||message;}catch{}throw new Error(message||'Payment service is unavailable');}
 if(result?.error)throw new Error(result.error);return result;
}
export type WebPaymentMethod = 'online' | 'venue';
export type WebCheckoutStatus = {
 online: boolean;
 venue: boolean;
 mode: string;
 onlineReason?: 'available' | 'credentials_missing' | 'mode_mismatch' | 'invalid_mode';
 onlineMessage?: string;
};
export const bookingEmailValid = (email: string) => email.length <= 254 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
export const bookingMobileValid = (phone: string) => /^(91)?[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));

export async function webCheckoutStatus(): Promise<WebCheckoutStatus> {
 const { data, error } = await supabase.functions.invoke('studioflow-payments', { method: 'GET' });
 if (error || !data?.webCheckout) throw new Error('Booking checkout is temporarily unavailable. Please retry.');
 return data.webCheckout as WebCheckoutStatus;
}

export async function prepareWebCheckout(bookingId: string, email: string, method: WebPaymentMethod, whatsapp: boolean): Promise<Appointment> {
 const result = await paymentRequest('prepareWebCheckout', { bookingId, email: email.trim(), method, whatsapp });
 return result.booking;
}

export function bookingReceipt(booking: Appointment) {
 const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
 const text = [
  'Nexora booking confirmed',
  `Booking ID: ${booking.id}`,
  `Service: ${booking.serviceName}`,
  `Appointment: ${booking.date} ${booking.time} IST`,
  `Paid: ${money(booking.amountPaid)}`,
  booking.paymentId ? `Transaction ID: ${booking.paymentId}` : `Pay at venue: ${money(booking.servicePrice - booking.amountPaid)}`,
 ].join('\n');
 const phone = booking.clientPhone.replace(/\D/g, '');
 return { text, whatsappUrl: bookingMobileValid(phone) ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}` : '' };
}

export function downloadBookingReceipt(booking: Appointment) {
 const receipt = bookingReceipt(booking);
 const url = URL.createObjectURL(new Blob([receipt.text], { type: 'text/plain;charset=utf-8' }));
 const download = document.createElement('a');
 download.href = url;
 download.download = `Nexora-Booking-${booking.id}.txt`;
 download.click();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function payBookingDeposit(booking:Appointment, full = false):Promise<Appointment> {
 const order:Order=await paymentRequest('create',{bookingId:booking.id});
 const publicKey = import.meta.env?.VITE_RAZORPAY_KEY_ID?.trim();
 if (full && publicKey && order.keyId !== publicKey) throw new Error('Razorpay checkout key does not match this environment.');
 await loadRazorpay();
 return new Promise((resolve,reject)=>{
  let verifying=false;
  const checkout=new (globalThis as any).Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,order_id:order.orderId,name:'Salon booking',description:full?'Full appointment payment':'Appointment advance',prefill:{name:booking.clientName,contact:booking.clientPhone,email:booking.clientEmail},
   handler:async(response:any)=>{verifying=true;try{const result=await paymentRequest('verify',{bookingId:booking.id,orderId:response.razorpay_order_id,paymentId:response.razorpay_payment_id,signature:response.razorpay_signature});if(result.booking?.refund_required||result.refund_required)throw new Error(result.refunded?'This reservation expired. The captured advance was refunded automatically to the original payment method.':'Payment received after the reservation expired. A refund has been requested; check your original payment method shortly.');resolve(result.booking);}catch(error){reject(error);}},
   modal:{ondismiss:()=>{if(!verifying)reject(new Error('Checkout closed. Your slot is held for up to 15 minutes. Retry payment or check payment status.'));}}
  });
  checkout.on('payment.failed',()=>{
   verifying=true;
   checkout.close?.();
   reject(new Error('Payment failed. Retry checkout or check payment status before paying again.'));
  });
  checkout.open();
 });
}
export async function reconcileBookingPayment(id:string):Promise<Appointment>{const result=await paymentRequest('reconcile',{bookingId:id});if(result.booking?.refund_required||result.refund_required)throw new Error(result.refunded?'This reservation expired. The captured advance was refunded automatically.':'Payment after expiry is being refunded to the original method. Do not pay again.');return result.booking;}
export async function refundBookingPayment(id:string){return paymentRequest('refundBooking',{bookingId:id});}
