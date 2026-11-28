import {BookingCoupon,useBookingCoupon} from '../BookingCoupon';
import React,{useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {X,ArrowLeft,CalendarDays,Clock,User,Phone,Mail,Scissors,MapPin,Pencil} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {parseBookingSlots,type BookingSlot} from '../../lib/bookingSlots';
import {indiaDate} from '../../lib/bookingDates';
import {bookingEmailValid,bookingMobileValid,payBookingDeposit,prepareWebCheckout,reconcileBookingPayment,webCheckoutStatus,type WebPaymentMethod} from '../../lib/platformPayments';
import type {Appointment} from '../../types';
import {BookingPaymentOptions,BookingReceiptActions} from './BookingReceiptActions';
import {clearPendingBookingFlow,savePendingBookingFlow} from '../../lib/authEntry';
import {AuthPage} from '../AuthPage';
import {Salon,Slot,Booking,menu,staff,rupees,istDate,dateLabel,advance,message} from './model';
import {Photo,ServiceCard,Notice} from './Parts';

function readAppointmentSlots(slug:string,ids:string[],date:string,stylist:string,branchId:string){
 const args={p_slug:slug,p_services:ids,p_date:date,p_stylist:stylist};
 return branchId?supabase.rpc('studioflow_branch_android_slots',{...args,p_branch:branchId}):supabase.rpc('studioflow_android_slots',args);
}

function eligibleAppointmentSlots(data:unknown[],ids:string[],stylist:string,branchId:string){
 return parseBookingSlots(data).filter((s):s is BookingSlot&{stylistId:string}=>
  s.available&&typeof s.stylistId==='string'&&ids.includes(s.stylistId)
  &&(stylist==='any'||s.stylistId===stylist)&&(!s.branchId||s.branchId===branchId));
}
export function useCustomerDialog(close:()=>void){const ref=useRef<HTMLElement>(null);const closeRef=useRef(close);closeRef.current=close;useEffect(()=>{if(typeof document==='undefined')return;const previous=document.activeElement as HTMLElement|null;const old=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.querySelector<HTMLElement>('button,input')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();closeRef.current();}if(e.key==='Tab'){const controls=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')||[]) as HTMLElement[];const visible=controls.filter(x=>x.getClientRects().length);if(!visible.length)return;if(e.shiftKey&&document.activeElement===visible[0]){e.preventDefault();visible.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===visible.at(-1)){e.preventDefault();visible[0]?.focus()}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);previous?.focus()};},[]);return ref;}
async function qrRequest(action:string,id:string){const {data,error}=await supabase.functions.invoke('nexora-mobile-qr',{body:{action,bookingId:id}});if(error){let text=error.message;try{text=(await (error as any).context?.json())?.error||text}catch{}throw new Error(text)}if(data?.error)throw new Error(data.error);return data;}
export function CustomerBookingFlow({salon,initialIds=[],initialStylist='any',initialDate,initialSlot,initialBranchId='',initialNotes='',initialStage,session,customerProfile,close,onCreated,onConfirmed,existing,demo=false}:{key?:React.Key;salon:Salon;initialIds?:string[];initialStylist?:string;initialDate?:string;initialSlot?:Slot;initialBranchId?:string;initialNotes?:string;initialStage?:'select'|'summary';session:Session|null;demo?:boolean;customerProfile?:{full_name:string;phone:string};close:()=>void;onCreated:()=>void;onConfirmed:()=>void;existing?:Booking}){
 const services=menu(salon),stylists=staff(salon);const valid=initialIds.filter(id=>services.some(s=>s.id===id));
 const [ids,setIds]=useState(initialIds.length?valid:services.slice(0,1).map(s=>s.id)),[stylist,setStylist]=useState(initialStylist),[date,setDate]=useState(initialDate||istDate()),[slots,setSlots]=useState<Slot[]>([]),[slot,setSlot]=useState<Slot|null>(initialSlot||null),[slotLoading,setSlotLoading]=useState(false),[retry,setRetry]=useState(0),[slotError,setSlotError]=useState(''),[name,setName]=useState(customerProfile?.full_name||(typeof session?.user.user_metadata?.full_name==='string'?session.user.user_metadata.full_name:'')),[phone,setPhone]=useState(customerProfile?.phone||''),[notes,setNotes]=useState(initialNotes||''),[stage,setStage]=useState<'select'|'summary'|'payment'|'confirmed'>(existing?'payment':initialStage==='summary'&&initialSlot?'summary':'select'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[auth,setAuth]=useState(false),[reserved,setReserved]=useState<Booking|null>(existing||null),[qr,setQr]=useState<any>(null),[now,setNow]=useState(Date.now());
 const [email,setEmail]=useState(existing?.payload?.clientEmail||session?.user.email||'');
 const [method,setMethod]=useState<WebPaymentMethod>('online');
 const [whatsappConsent,setWhatsappConsent]=useState(true);
 const [checkout,setCheckout]=useState<{online:boolean;venue:boolean;mode:string;onlineReason?:string;onlineMessage?:string}|null>(null);
 const [confirmation,setConfirmation]=useState<Appointment|null>(null);
 const inFlight=useRef(false);
 const p=salon.content.profile,chosen=services.filter(s=>ids.includes(s.id)),originalTotal=chosen.reduce((n,s)=>n+Number(s.price),0),minutes=chosen.reduce((n,s)=>n+Number(s.durationMinutes),0),actual=stylists.find(s=>s.id===slot?.stylistId)||stylists.find(s=>s.id===stylist);
 // Template 03 uses its own server-side coupon validation RPC.
 const isAuraCheckout=p.businessType==='unisex_salon';
 const coupon=useBookingCoupon(salon.slug,ids,isAuraCheckout?'studioflow_aura_coupon_quote':'studioflow_coupon_quote'),total=Number(reserved?.payload?.servicePrice??coupon.quote?.finalPrice??originalTotal);
 const validCheckoutAmount=Number.isFinite(total)&&total>0;
 const [branchChoices,setBranchChoices]=useState<any[]>(salon.content.profile.branches||[]),[branchId,setBranchId]=useState(initialBranchId||((salon.content.profile.branches||[]).filter((b:any)=>b.isActive!==false).length===1?(salon.content.profile.branches||[]).find((b:any)=>b.isActive!==false)?.id||'':''));const branch=branchChoices.find((b:any)=>b.id===branchId);const [selectStep,setSelectStep]=useState(initialSlot&&(!initialSlot.branchId||initialSlot.branchId===branchId)?2:1),[serviceCategory,setServiceCategory]=useState('all');const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{content.current?.scrollTo({top:0,behavior:'auto'})},[stage,selectStep]);
 const initialSlotApplied=useRef(false);
 const request=useRef({finger:'',id:''});const ref=useCustomerDialog(()=>{if(!busy)close()});const serviceKey=JSON.stringify(ids);
 const [locationCheck,setLocationCheck]=useState<{slug:string;error?:string}|null>(null);
 const [eligibleStaff,setEligibleStaff]=useState<{key:string;ids:string[];servicesWithStaff?:string[];error?:string}|null>(null);
 const activeBranches=branchChoices.filter((b:any)=>b.isActive!==false);
 const locationReady=locationCheck?.slug===salon.slug&&!locationCheck.error
  &&(!activeBranches.length||activeBranches.some((b:any)=>b.id===branchId));
 const staffQueryKey=JSON.stringify([salon.slug,serviceKey,branchId]);
 const currentStaff=eligibleStaff?.key===staffQueryKey?eligibleStaff:null;
 const selectableStaff=locationReady&&currentStaff&&!currentStaff.error
  ?stylists.filter(s=>currentStaff.ids.includes(s.id)):[];
 const canCheckSlots=locationReady&&currentStaff&&!currentStaff.error&&currentStaff.ids.length>0
  &&(stylist==='any'||currentStaff.ids.includes(stylist));
 const availabilityError=locationCheck?.error||currentStaff?.error||slotError;
 const slotQueryKey=JSON.stringify([salon.slug,serviceKey,stylist,date,branchId,demo]);
 const nextDateRequest=useRef(0);
 const [nextDate,setNextDate]=useState<{checking?:boolean;date?:string;message?:string}>({});
 useEffect(()=>{
  setNextDate({});
  return()=>{nextDateRequest.current++;};
 },[slotQueryKey,retry]);
 const lastSlotQueryKey=useRef(slotQueryKey);
 const [validatedSlotQueryKey,setValidatedSlotQueryKey]=useState('');
 // A restored summary can render before its availability request completes.
 // Only enable the handoff after this exact selection has been revalidated.
 const slotVerified=canCheckSlots&&!!slot&&!slotLoading&&validatedSlotQueryKey===slotQueryKey
  &&!(branchChoices.some((b:any)=>b.isActive!==false)&&!branchId)
  &&slots.some(s=>s.time===slot.time&&s.stylistId===slot.stylistId);
 useEffect(()=>{if(auth&&!session&&!existing)savePendingBookingFlow({salonSlug:salon.slug,ids,stylist,date,slot,branchId,notes,demo});},[auth,session?.user.id,existing,salon.slug,serviceKey,stylist,date,slot,branchId,notes,demo]);
 useEffect(()=>{
  if(!salon.slug||reserved)return;
  let active=true;
  setLocationCheck(null);
  void Promise.resolve(supabase.rpc('studioflow_public_branches',{p_slug:salon.slug})).then(({data,error})=>{
   if(error||!Array.isArray(data)||!data.every(b=>typeof b?.id==='string'&&typeof b?.name==='string')){
    throw new Error('Could not verify the salon location. Please retry.');
   }
   if(!active)return;
   const locations=data.filter(b=>b.isActive!==false);
   setBranchChoices(locations);
   setBranchId(current=>locations.some(b=>b.id===current)?current:locations.length===1?locations[0].id:'');
   setLocationCheck({slug:salon.slug});
  }).catch(()=>{
   if(active)setLocationCheck({slug:salon.slug,error:'Could not verify the salon location. Please retry.'});
  });
  return()=>{active=false;};
 },[salon.slug,retry,reserved?.id]);
 useEffect(()=>{
  if(!locationReady||!ids.length||reserved)return;
  let active=true;
  setEligibleStaff(null);
  void Promise.all(ids.map(id=>branchId
   ?supabase.rpc('studioflow_branch_specialists',{p_slug:salon.slug,p_service_id:id,p_branch:branchId})
   :supabase.rpc('studioflow_booking_specialists',{p_slug:salon.slug,p_service_id:id})))
   .then(results=>{
    if(!active)return;
    if(results.some(({data,error})=>error||data?.published!==true||!Array.isArray(data.specialistIds))){
     throw new Error('Could not verify the professionals for this service. Please retry.');
    }
    const matching=(results[0].data.specialistIds as unknown[]).filter(
     (id):id is string=>typeof id==='string'&&results.every(({data})=>data.specialistIds.includes(id))
    );
    const servicesWithStaff=ids.filter((_,index)=>results[index].data.specialistIds.some((id:unknown)=>typeof id==='string'));
    setEligibleStaff({key:staffQueryKey,ids:matching,servicesWithStaff});
    setStylist(current=>current==='any'||matching.includes(current)?current:'any');
   }).catch(()=>{
    if(active)setEligibleStaff({key:staffQueryKey,ids:[],error:'Could not verify the professionals for this service. Please retry.'});
   });
  return()=>{active=false;};
 },[staffQueryKey,locationReady,retry,reserved?.id]);
 useEffect(()=>{
  let active=true;
  if(reserved||!ids.length){setSlots([]);setValidatedSlotQueryKey('');setSlotLoading(false);return;}
  if(!canCheckSlots||!/^\d{4}-\d{2}-\d{2}$/.test(date)){setSlots([]);setValidatedSlotQueryKey('');setSlotLoading(false);setSlotError('');return;}
  const queryChanged=lastSlotQueryKey.current!==slotQueryKey;lastSlotQueryKey.current=slotQueryKey;
  if(queryChanged)setSlot(null);
  setSlotLoading(true);setSlotError('');setValidatedSlotQueryKey('');
  const request=readAppointmentSlots(salon.slug,ids,date,stylist,branchId);
  void request.then(({data,error})=>{
   if(!active)return;
   setSlotLoading(false);
   if(error||!Array.isArray(data)){setSlots([]);setSlot(null);setSlotError(error?message(error):'Could not load availability. Please retry.')}
   else {
    const rows=eligibleAppointmentSlots(data,currentStaff!.ids,stylist,branchId);
    setSlots(rows);setValidatedSlotQueryKey(slotQueryKey);
    if(!initialSlotApplied.current){
     initialSlotApplied.current=true;
     const matched=initialSlot&&date===initialDate&&(!initialSlot.branchId||initialSlot.branchId===branchId)?rows.find((s:Slot)=>s.time===initialSlot.time&&s.stylistId===initialSlot.stylistId)||null:null;
     setSlot(matched);
     if(!matched&&initialStage==='summary'&&initialSlot){setStage('select');setSelectStep(2);setError('Your selected slot is no longer available. Please choose another slot.');}
    }else if(!queryChanged){setSlot(prev=>prev?rows.find((s:Slot)=>s.time===prev.time&&s.stylistId===prev.stylistId)||null:null);}
   }
  },error=>{if(active){setSlotLoading(false);setSlots([]);setSlot(null);setSlotError(message(error));}});
  return()=>{active=false}
 },[salon.slug,serviceKey,stylist,date,retry,reserved?.id,branchId,demo,slotQueryKey,canCheckSlots,currentStaff]);
 async function findNextAvailableDate(){
  if(!canCheckSlots||!currentStaff||nextDate.checking)return;
  const selectedDay=new Date(`${date}T12:00:00+05:30`);
  if(!Number.isFinite(selectedDay.getTime()))return;
  const ticket=++nextDateRequest.current;
  setNextDate({checking:true});
  try{
   const latest=istDate(90);
   for(let offset=1;offset<=7;offset++){
    const candidate=indiaDate(offset,selectedDay);
    if(candidate>latest)break;
    if(candidate<istDate())continue;
    const {data,error}=await readAppointmentSlots(salon.slug,ids,candidate,stylist,branchId);
    if(ticket!==nextDateRequest.current)return;
    if(error||!Array.isArray(data))throw new Error('Could not check the next dates.');
    if(eligibleAppointmentSlots(data,currentStaff.ids,stylist,branchId).length){
     setNextDate({date:candidate});return;
    }
   }
   setNextDate({message:'No availability found in the next 7 days for this selection.'});
  }catch{
   if(ticket===nextDateRequest.current)setNextDate({message:'Could not check the next dates. Please retry.'});
  }
 }
 useEffect(()=>{if(session){setAuth(false);setName(n=>n||customerProfile?.full_name||(typeof session.user.user_metadata?.full_name==='string'?session.user.user_metadata.full_name:''));setPhone(n=>n||customerProfile?.phone||'');}},[session?.user.id,customerProfile?.full_name,customerProfile?.phone]);
 useEffect(()=>{
  if(demo||existing)return;
  let active=true;
  void webCheckoutStatus().then(status=>{
   if(!active)return;
   setCheckout(status);
   if(!status.online&&status.venue)setMethod('venue');
   if(!status.online)setError(status.onlineMessage||'Online payment is currently unavailable. Please contact the salon.');
  }).catch(error=>{
   if(!active)return;
   const detail=message(error);
   setCheckout({online:false,venue:false,mode:'unavailable',onlineMessage:detail});
   setError(detail);
  });
  return()=>{active=false};
 },[demo,existing]);
 useEffect(()=>{if(session)setEmail(current=>current||session.user.email||'');},[session?.user.email]);
 useEffect(()=>{if(stage!=='payment')return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[stage]);
 function summary(){setError('');if(branchChoices.filter((b:any)=>b.isActive!==false).length>1&&!branchId){setError('Choose a location before selecting your specialist and time.');return;}if(!ids.length){setError('Choose at least one service.');return;}if(!slotVerified){setError('Choose an available appointment slot.');return;}setStage('summary');}
 function showConfirmation(booking:Appointment){
  if(booking.status!=='confirmed')throw new Error('Payment is being verified. Recheck its status shortly.');
  setConfirmation(booking);
  setStage('confirmed');
  onCreated();
 }

 async function pay(){
  if(inFlight.current)return;
  if(!reserved&&!slotVerified){setError('Please wait for availability or choose another slot.');return;}
  if(!demo&&method==='online'&&!validCheckoutAmount){setError('Razorpay checkout requires a payable amount above ₹0. Check the selected service prices and try again.');return;}
  if(!session){setAuth(true);return;}
  if(!reserved&&branchChoices.some(b=>b.isActive!==false)&&!branchId){setError('Choose a location first.');return;}
  if(!reserved&&(!slot||name.trim().length<2||!bookingMobileValid(phone)||(!demo&&!bookingEmailValid(email.trim())))){
   setError('Enter your full name, valid WhatsApp number and email, and choose an available slot.');return;
  }
  inFlight.current=true;
  setBusy(true);
  setError('');
  try{
   if(demo){
    const finger=JSON.stringify([salon.slug,branchId,ids,date,slot,name.trim(),phone.trim()]);
    if(request.current.finger!==finger)request.current={finger,id:crypto.randomUUID()};
    const demoRequest={p_slug:salon.slug,p_services:ids,p_date:date,p_time:slot!.time,p_stylist:slot!.stylistId,p_name:name.trim(),p_phone:phone.trim(),p_request:request.current.id};
    const {error}=await (branchId?supabase.rpc('studioflow_branch_demo_book',{...demoRequest,p_branch:branchId}):supabase.rpc('studioflow_demo_book',demoRequest));
    if(error)throw error;
    onCreated();onConfirmed();return;
   }

   let booking=reserved;
   if(!booking){
    const activeCheckout=checkout??await webCheckoutStatus();
    if(!checkout)setCheckout(activeCheckout);
    if(method==='online'?!activeCheckout.online:!activeCheckout.venue)throw new Error(activeCheckout.onlineMessage||'This payment option is unavailable.');
    const finger=JSON.stringify([salon.slug,branchId,ids,date,slot,name.trim(),phone.trim(),notes,coupon.quote?.code]);
    if(request.current.finger!==finger)request.current={finger,id:crypto.randomUUID()};
    const fields={p_slug:salon.slug,p_services:ids,p_date:date,p_time:slot!.time,p_stylist:slot!.stylistId,
      p_name:name.trim(),p_phone:phone.trim(),p_instructions:notes,p_request:request.current.id};
    const {data,error}=await (coupon.quote
      ?supabase.rpc(branchId?'studioflow_branch_coupon_book':isAuraCheckout?'studioflow_aura_coupon_book':'studioflow_coupon_book',{
        p_slug:salon.slug,p_request:{serviceIds:ids,stylistId:slot!.stylistId,date,time:slot!.time,
          clientName:name.trim(),clientPhone:phone.trim(),instructions:notes,requestId:request.current.id,
          couponCode:coupon.quote.code,couponExpectedTotal:coupon.quote.finalPrice,branchId:branchId||undefined}})
      :branchId?supabase.rpc('studioflow_branch_android_book',{...fields,p_branch:branchId})
        :supabase.rpc('studioflow_android_book',fields));
    if(error)throw error;
    booking=data as Booking;
    if(!booking?.id)throw new Error('Reservation could not be created. Please retry.');
    setReserved(booking);
    onCreated();
    if(Number(booking.payload?.servicePrice)!==total)throw new Error('The salon updated the payable amount. Review it before continuing.');
   }

   if(existing&&!existing.web_checkout_method){
    const mode=await qrRequest('mode',booking.id);
    if(mode.mode==='qr'){
     const result=await qrRequest('create',booking.id);
     if(!result.imageUrl?.startsWith('https://'))throw new Error('Payment QR is unavailable.');
     setQr(result);return;
    }
    showConfirmation(await payBookingDeposit({...booking.payload,id:booking.id}));
    return;
   }
   const prepared=existing?.web_checkout_method==='online'?{...booking.payload,id:booking.id} as Appointment
     :await prepareWebCheckout(booking.id,email,method,whatsappConsent);
   if(prepared.status==='confirmed'){showConfirmation(prepared);return;}
   setStage('payment');
   showConfirmation(await payBookingDeposit(prepared,true));
  }catch(e){setError(message(e))}
  finally{inFlight.current=false;setBusy(false);}
 }

 async function reconcile(){
  if(!reserved||inFlight.current)return;
  inFlight.current=true;
  setBusy(true);setError('');
  try{
   if(existing&&!existing.web_checkout_method){
    const mode=await qrRequest('mode',reserved.id);
    if(mode.mode==='qr'){
     const result=await qrRequest('reconcile',reserved.id);
     if(result.refund_required)throw new Error('Payment received after the reservation expired. Contact support for a refund.');
     showConfirmation(result.booking||result);return;
    }
   }
   showConfirmation(await reconcileBookingPayment(reserved.id));
  }catch(e){setError(message(e))}
  finally{inFlight.current=false;setBusy(false);}
 }
 const reservedTotal=Number(reserved?.payload?.servicePrice??total);
 const payAmount=qr?Number(qr.amount)/100:existing&&!existing.web_checkout_method?advance(reservedTotal):reservedTotal;
 const expires=reserved?.hold_expires_at?new Date(reserved.hold_expires_at).getTime():0;
 const left=Math.max(0,Math.floor((expires-now)/1000));
 const timeout=expires>0&&left===0;
 const edit=()=>{if(reserved){setError('This reservation is already created. Close this screen to manage it in My Bookings.');return;}setSelectStep(2);setStage('select')};
 return <div className="cr-overlay"><section ref={ref as React.RefObject<HTMLDivElement>} className={'cr-booking-dialog '+(stage==='payment'?'cr-payment-dialog':'')} role="dialog" aria-modal="true" aria-label={stage==='summary'?'Booking summary':stage==='payment'?'Payment':'Book appointment'}><header className="cr-dialog-header">{stage==='summary'?<><button className="cr-icon" onClick={edit} aria-label="Back to booking"><ArrowLeft size={18}/></button><div><strong>BOOKING SUMMARY</strong><small>Review & Lock Slot</small></div></>:<h2>{stage==='confirmed'?'Booking confirmed':stage==='payment'?'Complete your payment':'Book Appointment'}</h2>}<button className="cr-icon" onClick={close} disabled={busy} aria-label="Close booking"><X size={17}/></button></header>
 <div className="cr-zip-booking-progress cr-reference-booking-progress" aria-label="Booking progress">{['Services','Specialist & Slot','Summary',demo?'₹0 Demo':'Payment'].map((label,index)=><span key={label} aria-current={(stage==='select'?selectStep:stage==='summary'?3:4)===index+1?'step':undefined}>{index+1} · {label}</span>)}</div><div className="cr-dialog-content" ref={content}>{demo&&<Notice>₹0 DEMO — no payment, no real appointment, no staff slot blocked.</Notice>}{error&&<Notice>{error}</Notice>}{auth&&!session?<><AuthPage compact customerMode/><button className="cr-outline" onClick={()=>{clearPendingBookingFlow();setAuth(false);}}>Back to booking</button></>:stage==='select'?<><section className="cr-selection-panel" hidden={selectStep!==1}><div className="cr-booking-salon"><strong>{p.businessName}</strong><small><MapPin size={10}/>{[branch?.address||p.address,branch?.city||p.city].filter(Boolean).join(' · ')}</small></div>{branchChoices.filter((b:any)=>b.isActive!==false).length>0&&<label className="cr-branch-select"><MapPin size={14}/> Choose location<select value={branchId} onChange={e=>{setBranchId(e.target.value);setStylist('any');setSlot(null);setError('');setSelectStep(1)}}>{branchChoices.filter((b:any)=>b.isActive!==false).length>1&&<option key="branch-placeholder" value="">Select a location first</option>}{branchChoices.filter((b:any)=>b.isActive!==false).map((b:any)=><option value={b.id} key={b.id}>{b.name}{b.city?` · ${b.city}`:''}</option>)}</select>{branch&&<small>{branch.address}{branch.city?` · ${branch.city}`:''}{branch.phone?` · ${branch.phone}`:''}</small>}</label>}<div className="cr-step-title"><h3><span>1</span> Select Services</h3><small>Multiple selection enabled</small></div><div className="cr-pills" aria-label="Booking service categories"><button className={serviceCategory==='all'?'active':''} onClick={()=>setServiceCategory('all')}>All Menu</button>{[...new Set(services.map(s=>s.category).filter(Boolean))].map(category=><button key={category} className={serviceCategory===category?'active':''} onClick={()=>setServiceCategory(category!)}>{category}</button>)}</div>{services.filter(s=>serviceCategory==='all'||s.category===serviceCategory).map(s=><ServiceCard key={s.id} service={s} selected={ids.includes(s.id)} onSelect={()=>{setError('');setIds(list=>list.includes(s.id)?list.filter(id=>id!==s.id):list.length<10?[...list,s.id]:list)}}/>)}{services.length===0&&<Notice>This salon has not published its services yet.</Notice>}
 </section><section className="cr-selection-panel" hidden={selectStep!==2}><div className="cr-step-title"><h3><span>2</span> Choose Professional</h3></div><div className="cr-stylist-select"><button className={stylist==='any'?'active':''} onClick={()=>setStylist('any')}><span className="cr-avatar-placeholder"><User size={19}/></span><strong>Any Available</strong><small>First available professional</small></button>{stylists.map(s=><button className={s.id===stylist?'active':''} key={s.id} onClick={()=>setStylist(s.id)}><Photo src={s.avatarUrl} alt="" className="cr-avatar-photo"/><strong>{s.name}</strong><small>{s.role}</small></button>)}</div>
 <div className="cr-step-title"><h3><span>3</span> Select Date & Slot</h3><small>Live salon availability</small></div><div className="cr-day-select"><button className={date===istDate()?'active':''} onClick={()=>setDate(istDate())}>Today<small>{dateLabel(istDate())}</small></button><button className={date===istDate(1)?'active':''} onClick={()=>setDate(istDate(1))}>Tomorrow<small>{dateLabel(istDate(1))}</small></button><label><CalendarDays size={12}/> Calendar<input aria-label="Appointment date" type="date" min={istDate()} max={istDate(90)} value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="cr-row cr-slot-heading"><span><Clock size={12}/> Available Time Slots</span><small>{slots.length} slots available</small></div>{slotLoading?<p role="status" className="cr-muted">Checking salon availability…</p>:slotError?<><Notice>{slotError}</Notice><button className="cr-outline" onClick={()=>setRetry(x=>x+1)}>Retry slots</button></>:slots.length?<div className="cr-slot-grid">{slots.map(s=><button className={slot?.time===s.time&&slot?.stylistId===s.stylistId?'active':''} key={s.time+s.stylistId} onClick={()=>setSlot(s)} aria-pressed={slot?.time===s.time&&slot?.stylistId===s.stylistId}><strong>{s.label||s.time}</strong><small>{rupees(total)}</small></button>)}</div>:<Notice>{ids.length?'No slots are available for this selection. Try another date or professional.':'Choose your services to see available slots.'}</Notice>}</section></>:
 stage==='summary'?<>{!reserved&&slotLoading&&<Notice>Checking salon availability…</Notice>}{!reserved&&slotError&&<><Notice>{slotError}</Notice><button className="cr-outline" onClick={()=>setRetry(x=>x+1)}>Retry slots</button></>}{!demo&&<BookingCoupon coupon={coupon} disabled={!!reserved||busy}/>}{!reserved&&services.some(s=>(p.bookingAddOnServiceIds||[]).includes(s.id))&&<section className="sf-booking-addons"><h3>Add-on services / customization</h3><p>Optional extras add their price and duration. Changing extras requires a new slot selection.</p>{services.filter(s=>(p.bookingAddOnServiceIds||[]).includes(s.id)).map(extra=><label key={extra.id}><input type="checkbox" checked={ids.includes(extra.id)} disabled={busy||(!ids.includes(extra.id)&&ids.length>=10)} onChange={e=>{const checked=e.target.checked;setIds(old=>checked?[...old,extra.id]:old.filter(id=>id!==extra.id));setSlot(null);setSelectStep(2);setStage('select');}}/>{extra.name} · ₹{extra.price} · {extra.durationMinutes} min</label>)}</section>}<SummaryBox n="1" title="SALON & VENUE" action={edit}><div className="cr-summary-venue"><Photo src={p.coverImageUrl} alt=""/><div><h3>{p.businessName}</h3><p><MapPin size={11}/>{[branch?.address||p.address,branch?.city||p.city].filter(Boolean).join(', ')}</p></div></div></SummaryBox><SummaryBox n="2" title={`SELECTED SERVICES (${chosen.length})`} action={edit}>{chosen.map(s=><div className="cr-summary-service" key={s.id}><div><b><Scissors size={12}/>{s.name}</b><small><Clock size={10}/>{s.durationMinutes} mins</small></div><strong>{rupees(s.price)}</strong></div>)}</SummaryBox><SummaryBox n="3" title="ASSIGNED PROFESSIONAL" action={edit}><div className="cr-row cr-start"><Photo src={actual?.avatarUrl} alt="" className="cr-avatar-photo"/><div><h3>{actual?.name||'Available professional'}</h3><p>{actual?.role||'Assigned from live availability'}</p></div></div></SummaryBox><SummaryBox n="4" title="DATE & APPOINTMENT WINDOW" action={edit}><div className="cr-window"><span className="cr-calendar-icon"><CalendarDays size={19}/></span><div><b>{date}</b><small>Slot: {slot?.label||slot?.time} IST</small></div><div><small>Duration</small><strong>{minutes} mins total</strong></div></div></SummaryBox><SummaryBox n="5" title="CONTACT FOR THIS APPOINTMENT"><div className="cr-form"><label><User size={12}/> Full name<input value={name} required minLength={2} maxLength={150} disabled={!!reserved} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label><Phone size={12}/> WhatsApp mobile number<input value={phone} required inputMode="tel" maxLength={20} disabled={!!reserved} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label><label><Mail size={12}/> Email address<input type="email" required maxLength={254} disabled={!!reserved} value={email} autoComplete="email" onChange={event=>setEmail(event.target.value)} /></label></div></SummaryBox><SummaryBox n="6" title="SPECIAL INSTRUCTIONS"><textarea className="cr-notes" aria-label="Special instructions" placeholder="No special instructions added…" value={notes} disabled={!!reserved} maxLength={1000} onChange={e=>setNotes(e.target.value)}/></SummaryBox>{demo?<SummaryBox n="7" title="DEMO — NO PAYMENT"><p>Service list price: {rupees(total)}</p><div className="cr-total-row"><b>Demo amount payable</b><b>₹0</b></div><p>No advance or balance is due. This is a practice booking only.</p></SummaryBox>:<SummaryBox n="7" title="PAYMENT">
 <BookingPaymentOptions
  method={method}
  onChange={setMethod}
  venue={!!checkout?.venue}
  locked={busy||!!reserved}
  onlineAvailable={Boolean(checkout?.online)&&validCheckoutAmount}
  onlineMessage={!validCheckoutAmount ? 'Razorpay requires a payable amount above ₹0.' : checkout?.online ? undefined : checkout?.onlineMessage || (checkout ? 'Razorpay is unavailable for this salon right now.' : 'Checking Razorpay availability…')}
 />
 {method==='online'&&checkout?.online&&checkout.mode==='test'&&<p>Razorpay Test Mode</p>}
 {!demo&&!validCheckoutAmount&&<Notice>The booking total must be greater than ₹0 for online checkout.</Notice>}
 {!demo&&!reserved&&!!coupon.code.trim()&&!coupon.quote&&<Notice>Apply or clear your coupon code before continuing.</Notice>}
 </section><section className="cr-selection-panel" hidden={selectStep!==2}><div className="cr-step-title"><h3><span>2</span> Choose Professional</h3></div><div className="cr-stylist-select"><button className={stylist==='any'?'active':''} disabled={!canCheckSlots} onClick={()=>setStylist('any')}><span className="cr-avatar-placeholder"><User size={19}/></span><strong>Any Available</strong><small>First available professional</small></button>{selectableStaff.map(s=><button className={s.id===stylist?'active':''} key={s.id} onClick={()=>setStylist(s.id)}><Photo src={s.avatarUrl} alt="" className="cr-avatar-photo"/><strong>{s.name}</strong><small>{s.role}</small></button>)}</div>
 <div className="cr-step-title"><h3><span>3</span> Select Date & Slot</h3><small>Live salon availability</small></div><div className="cr-day-select"><button className={date===istDate()?'active':''} onClick={()=>setDate(istDate())}>Today<small>{dateLabel(istDate())}</small></button><button className={date===istDate(1)?'active':''} onClick={()=>setDate(istDate(1))}>Tomorrow<small>{dateLabel(istDate(1))}</small></button><label><CalendarDays size={12}/> Calendar<input aria-label="Appointment date" type="date" min={istDate()} max={istDate(90)} value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="cr-row cr-slot-heading"><span><Clock size={12}/> Available Time Slots</span><small>{slots.length} slots available</small></div>{availabilityError?<><Notice>{availabilityError}</Notice><button className="cr-outline" onClick={()=>setRetry(x=>x+1)}>Retry availability</button></>:(!locationReady||!currentStaff||slotLoading)?<p role="status" className="cr-muted">Checking salon availability…</p>:!currentStaff.ids.length?<><Notice>{ids.length>1?'No scheduled professional can perform this combination at this location.':'No professional with a booking schedule is available for this service at this location. Contact the salon to check its staff schedule.'}</Notice>
 {ids.length>1&&chosen.filter(service=>currentStaff.servicesWithStaff?.includes(service.id)).map(service=><button key={service.id} type="button" className="cr-outline" onClick={()=>{setIds([service.id]);setSlot(null);setStylist('any');setError('');}}>Continue with {service.name} only</button>)}</>:slots.length?<div className="cr-slot-grid">{slots.map(s=><button className={slot?.time===s.time&&slot?.stylistId===s.stylistId?'active':''} key={s.time+s.stylistId} onClick={()=>setSlot(s)} aria-pressed={slot?.time===s.time&&slot?.stylistId===s.stylistId}><strong>{s.label||s.time}</strong><small>{rupees(total)}</small></button>)}</div>:<><Notice>{ids.length?'No slots are available on this date for this selection.':'Choose your services to see available slots.'}</Notice>
 {canCheckSlots&&<>{nextDate.date
  ?<button type="button" className="cr-outline" onClick={()=>{setSlot(null);setDate(nextDate.date!);}}>Show slots for {dateLabel(nextDate.date)}</button>
  :<button type="button" className="cr-outline" disabled={nextDate.checking} onClick={()=>void findNextAvailableDate()}>{nextDate.checking?'Checking next dates…':'Find next available date'}</button>}
 {nextDate.message&&<Notice>{nextDate.message}</Notice>}</>}</>}</section></>:
 stage==='summary'?<>{!reserved&&slotLoading&&<Notice>Checking salon availability…</Notice>}{!reserved&&availabilityError&&<><Notice>{availabilityError}</Notice><button className="cr-outline" onClick={()=>setRetry(x=>x+1)}>Retry slots</button></>}{!demo&&<BookingCoupon coupon={coupon} disabled={!!reserved||busy}/>}{!reserved&&services.some(s=>(p.bookingAddOnServiceIds||[]).includes(s.id))&&<section className="sf-booking-addons"><h3>Add-on services / customization</h3><p>Optional extras add their price and duration. Changing extras requires a new slot selection.</p>{services.filter(s=>(p.bookingAddOnServiceIds||[]).includes(s.id)).map(extra=><label key={extra.id}><input type="checkbox" checked={ids.includes(extra.id)} disabled={busy||(!ids.includes(extra.id)&&ids.length>=10)} onChange={e=>{const checked=e.target.checked;setIds(old=>checked?[...old,extra.id]:old.filter(id=>id!==extra.id));setSlot(null);setSelectStep(2);setStage('select');}}/>{extra.name} · ₹{extra.price} · {extra.durationMinutes} min</label>)}</section>}<SummaryBox n="1" title="SALON & VENUE" action={edit}><div className="cr-summary-venue"><Photo src={p.coverImageUrl} alt=""/><div><h3>{p.businessName}</h3><p><MapPin size={11}/>{[branch?.address||p.address,branch?.city||p.city].filter(Boolean).join(', ')}</p></div></div></SummaryBox><SummaryBox n="2" title={`SELECTED SERVICES (${chosen.length})`} action={edit}>{chosen.map(s=><div className="cr-summary-service" key={s.id}><div><b><Scissors size={12}/>{s.name}</b><small><Clock size={10}/>{s.durationMinutes} mins</small></div><strong>{rupees(s.price)}</strong></div>)}</SummaryBox><SummaryBox n="3" title="ASSIGNED PROFESSIONAL" action={edit}><div className="cr-row cr-start"><Photo src={actual?.avatarUrl} alt="" className="cr-avatar-photo"/><div><h3>{actual?.name||'Available professional'}</h3><p>{actual?.role||'Assigned from live availability'}</p></div></div></SummaryBox><SummaryBox n="4" title="DATE & APPOINTMENT WINDOW" action={edit}><div className="cr-window"><span className="cr-calendar-icon"><CalendarDays size={19}/></span><div><b>{date}</b><small>Slot: {slot?.label||slot?.time} IST</small></div><div><small>Duration</small><strong>{minutes} mins total</strong></div></div></SummaryBox><SummaryBox n="5" title="CONTACT FOR THIS APPOINTMENT"><div className="cr-form"><label><User size={12}/> Full name<input value={name} required minLength={2} maxLength={150} disabled={!!reserved} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label><Phone size={12}/> WhatsApp mobile number<input value={phone} required inputMode="tel" maxLength={20} disabled={!!reserved} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label><label><Mail size={12}/> Email address<input type="email" required maxLength={254} disabled={!!reserved} value={email} autoComplete="email" onChange={event=>setEmail(event.target.value)} /></label></div></SummaryBox><SummaryBox n="6" title="SPECIAL INSTRUCTIONS"><textarea className="cr-notes" aria-label="Special instructions" placeholder="No special instructions added…" value={notes} disabled={!!reserved} maxLength={1000} onChange={e=>setNotes(e.target.value)}/></SummaryBox>{demo?<SummaryBox n="7" title="DEMO — NO PAYMENT"><p>Service list price: {rupees(total)}</p><div className="cr-total-row"><b>Demo amount payable</b><b>₹0</b></div><p>No advance or balance is due. This is a practice booking only.</p></SummaryBox>:<SummaryBox n="7" title="PAYMENT">
 <BookingPaymentOptions method={method} onChange={setMethod} venue={!!checkout?.venue} locked={busy||!!reserved} />
 {method==='online'&&checkout?.mode==='test'&&<p>Razorpay Test Mode</p>}
 <label className="flex items-center gap-2"><input type="checkbox" checked={whatsappConsent} disabled={busy||!!reserved} onChange={event=>setWhatsappConsent(event.target.checked)} /> Send my receipt on WhatsApp</label>
 </SummaryBox>}{!session&&<Notice>Sign in to confirm this appointment. Your selections stay here.</Notice>}</>:
 stage==='confirmed'&&confirmation?<><BookingReceiptActions booking={confirmation}/><button className="cr-primary cr-wide" onClick={onConfirmed}>View My Bookings</button></>:
 <div className="cr-qr-wrap"><section className="cr-qr-card"><h2>{qr?'Nexora QR Payment':'Razorpay Checkout'}</h2>{qr&&<div className="cr-qr-image"><img src={qr.imageUrl} alt="Secure payment QR code generated for this booking"/></div>}<p>Amount payable</p><strong className="cr-pay-amount">{rupees(payAmount)}</strong>{expires>0&&<div className="cr-hold-timer"><Clock size={12}/>{timeout?'Slot reservation expired':'Slot reserved for'}<b>{timeout?'Choose a new slot':`${Math.floor(left/60).toString().padStart(2,'0')}:${(left%60).toString().padStart(2,'0')}`}</b></div>}{!qr&&<button className="cr-outline cr-wide" disabled={busy||timeout} onClick={()=>void pay()}>{busy?'Please wait…':'Retry payment'}</button>}<button className="cr-primary cr-wide" disabled={busy||!reserved} onClick={()=>void reconcile()}>{busy?'Please wait…':'Recheck payment status'}</button></section></div>}
 </div>{!auth&&stage==='select'&&selectStep===1&&<footer className="cr-dialog-footer"><div className="cr-row"><div><strong>{chosen.length} selected · {minutes} mins</strong><small>{rupees(total)}</small></div><button className="cr-primary" disabled={!ids.length||(branchChoices.filter((b:any)=>b.isActive!==false).length>1&&!branchId)} onClick={()=>setSelectStep(2)}>Continue to Specialist & Slot</button></div></footer>}{!auth&&stage==='select'&&selectStep===2&&<footer className="cr-dialog-footer"><div className="cr-row"><div><strong>{chosen.length} Service{chosen.length===1?'':'s'} • {minutes} min</strong><small>{chosen.map(s=>s.name).join(', ')}</small></div><div><small>Total Amount</small><b>{rupees(total)}</b></div></div><div className="cr-row"><button className="cr-outline" disabled={busy} onClick={()=>setSelectStep(1)}>Back to Services</button><button className="cr-primary" disabled={!slotVerified||busy} onClick={summary}>Confirm Booking</button></div></footer>}{!auth&&stage==='summary'&&<footer className="cr-dialog-footer"><div className="cr-row"><span className="cr-muted">{demo?'Demo booking — no payment':'Final payable amount'}</span><b className="cr-purple">{demo?'₹0':rupees(total)}</b></div><button className="cr-primary cr-wide" disabled={busy||!chosen.length||(!reserved&&!slotVerified)||(!demo&&method==='online'&&!validCheckoutAmount)||(!demo&&(coupon.busy||(!reserved&&!!coupon.code.trim()&&!coupon.quote)))} onClick={()=>void pay()}>{busy?'Please wait…':!session?'Sign in to continue':demo?'Confirm Demo Booking — ₹0':method==='venue'?'Confirm & Pay at Venue':`Pay ${rupees(total)} with Razorpay`}</button></footer>}
 </section></div>
}
function SummaryBox({n,title,children,action}:{n:string;title:string;children:React.ReactNode;action?:()=>void}){return <section className="cr-summary-box"><header><h3>{n}. {title}</h3>{action&&<button onClick={action}><Pencil size={10}/> Change</button>}</header>{children}</section>}
