import {BookingCoupon,useBookingCoupon} from './BookingCoupon';
import {useWebsiteLanguage} from './WebsiteLanguage';
import type {DirectBookingSlot} from './SpecialistWeek';
import { paymentRequest, payBookingDeposit, reconcileBookingPayment } from '../lib/platformPayments';
import { supabase } from '../lib/supabase';
import { sendBookingConfirmationEmail, sendBookingReminderEmail } from '../lib/emailService';
import {getContrastTextColor} from '../themeAccents';
import React, { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CalendarCheck,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  MapPin,
  CreditCard,
  Wallet,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Lock
} from 'lucide-react';
import { SalonProfile, SalonService, Stylist, Appointment } from '../types';
import { INITIAL_SALON_PROFILE, INITIAL_SERVICES, INITIAL_STYLISTS } from '../mockData';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: SalonProfile;
  services?: SalonService[];
  stylists?: Stylist[];
  initialService?: SalonService;
  initialStylist?: Stylist;
  initialSlot?: DirectBookingSlot;
  onAddAppointment?: (appointment: Appointment) => void | Promise<Appointment>;
  themeAccentHex?: string;
  onShowToast?: (toast: {
    id: string;
    title: string;
    clientName: string;
    serviceName: string;
    stylistName: string;
    dateTime: string;
    refCode: string;
    price: number;
  }) => void;
  // Backward compatibility alias props
  service?: SalonService;
  stylist?: Stylist;
  servicesList?: SalonService[];
  stylistsList?: Stylist[];
  salonName?: string;
  currency?: string;
  onConfirmBooking?: (bookingData: any) => void;
}

type BookingStep = 'service' | 'datetime' | 'guest' | 'payment' | 'confirmed';

const ANY_SPECIALIST: Stylist = {
  id: 'any_available',
  name: 'Any Available Specialist',
  role: 'First available professional',
  avatarUrl: '',
  specialties: ['General', 'Quick Allocation'],
  rating: 4.95,
};

// Availability is never hard-coded: every time slot comes from the
// studioflow_available_slots / studioflow_android_slots RPC for the selected
// service, specialist and date.
const LOCAL_STORAGE_GUEST_KEY = 'salon_guest_booking_info';

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  profile: inputProfile,
  services: inputServices,
  stylists: inputStylists,
  initialService: inputInitialService,
  initialStylist: inputInitialStylist,
  initialSlot,
  onAddAppointment: inputOnAddAppointment,
  themeAccentHex = '#0f172a',
  onShowToast,
  // Alias props
  service: aliasService,
  stylist: aliasStylist,
  servicesList: aliasServicesList,
  stylistsList: aliasStylistsList,
  salonName: aliasSalonName,
  currency: aliasCurrency,
  onConfirmBooking: aliasOnConfirmBooking
}) => {
  const {t}=useWebsiteLanguage();
  const [addOnIds,setAddOnIds]=useState<string[]>([]);
  const [serverTotal,setServerTotal]=useState<number|null>(null);
  const bookingRequest=useRef(crypto.randomUUID());
  const bookingAccent=/^#[0-9a-f]{6}$/i.test(themeAccentHex)?themeAccentHex:'#0f172a';
  const bookingAccentText=getContrastTextColor(bookingAccent);
  const actionStyle={backgroundColor:bookingAccent,color:bookingAccentText,border:'1px solid #94a3b8'};
  // Safe resolved values
  const profile = inputProfile || {
    ...INITIAL_SALON_PROFILE,
    businessName: aliasSalonName || INITIAL_SALON_PROFILE.businessName,
    currency: aliasCurrency || INITIAL_SALON_PROFILE.currency || '₹',
  };
  const services = inputServices || aliasServicesList || INITIAL_SERVICES;
  const stylists = inputStylists || aliasStylistsList || INITIAL_STYLISTS;
  const initialService = inputInitialService || aliasService;
  const initialStylist = inputInitialStylist || aliasStylist;
  const onAddAppointment = inputOnAddAppointment || (aliasOnConfirmBooking ? (apt: Appointment) => {
    aliasOnConfirmBooking({
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      clientEmail: apt.clientEmail,
      service: { id: apt.serviceId, name: apt.serviceName, price: apt.servicePrice },
      stylist: { id: apt.stylistId, name: apt.stylistName },
      date: apt.date,
      time: apt.time,
      paymentMethod: apt.paymentStatus === 'paid_full' ? 'online' : 'pay_salon'
    });
  } : () => {});

  const guestFormId=useId();
  const dialogRef=useRef<HTMLDivElement>(null),overlayRef=useRef<HTMLDivElement>(null),scrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!isOpen)return;const dialog=dialogRef.current;if(!dialog)return;const doc=dialog.ownerDocument;const win=doc.defaultView;const previous=doc.activeElement as HTMLElement|null;const old=doc.body.style.overflow;doc.body.style.overflow='hidden';dialog?.querySelector<HTMLButtonElement>('[aria-label="Close booking dialog"]')?.focus();
    const fit=()=>{const viewport=win?.visualViewport;overlayRef.current?.style.setProperty('--booking-viewport-height',`${viewport?.height||win?.innerHeight||800}px`)};fit();win?.visualViewport?.addEventListener('resize',fit);win?.addEventListener('resize',fit);
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();onClose()}if(event.key==='Tab'&&dialog){const items=(Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')) as HTMLElement[]).filter(el=>el.getClientRects().length);if(event.shiftKey&&doc.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus()}else if(!event.shiftKey&&doc.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus()}}};doc.addEventListener('keydown',key);
    return()=>{doc.body.style.overflow=old;doc.removeEventListener('keydown',key);win?.visualViewport?.removeEventListener('resize',fit);win?.removeEventListener('resize',fit);previous?.focus()};
  },[isOpen]);
  // Navigation Steps: 'service' -> 'datetime' -> 'guest' -> 'payment' -> 'confirmed'
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=0;},[currentStep]);

  // Step 1: Branch, Service & Specialist

  const [selectedService, setSelectedService] = useState<SalonService>(
    initialService || (services && services[0]) || {
      id: 'default',
      name: 'Signature Service',
      category: 'Hair',
      durationMinutes: 45,
      price: 1200,
      description: 'Standard treatment',
      icon: 'sparkles'
    }
  );
  const [selectedStylist, setSelectedStylist] = useState<Stylist>(
    initialStylist || (stylists && stylists[0]) || ANY_SPECIALIST
  );

  const [specialistCheck,setSpecialistCheck]=useState<{key:string;ids:string[];published:boolean;error:string}|null>(null);
  const [specialistRetry,setSpecialistRetry]=useState(0);
  const specialistKey=JSON.stringify([profile.subdomain,selectedService.id]);
  const specialistsReady=specialistCheck?.key===specialistKey&&!specialistCheck.error;
  const eligibleStylists=specialistsReady?stylists.filter(st=>specialistCheck!.ids.includes(st.id)):[];
  useEffect(()=>{
    if(!isOpen)return;let active=true;
    void supabase.rpc('studioflow_booking_specialists',{p_slug:profile.subdomain,p_service_id:selectedService.id}).then(({data,error})=>{
      if(!active)return;
      if(error||!data||!Array.isArray(data.specialistIds)){setSpecialistCheck({key:specialistKey,ids:[],published:false,error:error?.message||'Could not check specialists. Please retry.'});return;}
      setSpecialistCheck({key:specialistKey,ids:data.specialistIds,published:data.published,error:''});
      setSelectedStylist(current=>current.id===ANY_SPECIALIST.id||data.specialistIds.includes(current.id)?current:ANY_SPECIALIST);
    });return()=>{active=false;};
  },[isOpen,specialistKey,specialistRetry]);
  const chooseService=(service:SalonService)=>{setAddOnIds([]);setServerTotal(null);setSelectedService(service);if(service.id!==selectedService.id)setSelectedStylist(ANY_SPECIALIST);};

  const extras=services.filter(s=>(profile.bookingAddOnServiceIds||[]).includes(s.id)&&s.id!==selectedService.id);
  const selectedExtras=extras.filter(s=>addOnIds.includes(s.id));
  const bookingServiceIds=[selectedService.id,...selectedExtras.map(s=>s.id)];
  const bundleKey=JSON.stringify(bookingServiceIds);
  const coupon=useBookingCoupon(profile.subdomain,bookingServiceIds);
  const totalPrice=serverTotal??coupon.quote?.finalPrice??Math.round((selectedService.price+selectedExtras.reduce((sum,s)=>sum+s.price,0))*100)/100;
  // Step 2: Date & Time Slot
  const todayStr = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const tomorrowStr=new Date(Date.parse(`${todayStr}T12:00:00Z`)+86400000).toISOString().slice(0,10);
  const maxDateStr=new Date(Date.parse(`${todayStr}T12:00:00Z`)+90*86400000).toISOString().slice(0,10);
  const [bookingDate, setBookingDate] = useState<string>(todayStr);
  const [bookingTime, setBookingTime] = useState<string>('');
  const [availableSlots,setAvailableSlots]=useState<any[]>([]);
  const [slotsLoading,setSlotsLoading]=useState(false);
  const [slotsError,setSlotsError]=useState('');
  const [slotRetry,setSlotRetry]=useState(0);
  useEffect(()=>{
    if(!isOpen)return;let active=true;setSlotsLoading(true);setSlotsError('');setBookingTime('');
    const slotsRequest=selectedExtras.length?supabase.rpc('studioflow_android_slots',{p_slug:profile.subdomain,p_services:bookingServiceIds,p_date:bookingDate,p_stylist:selectedStylist.id===ANY_SPECIALIST.id?'any':selectedStylist.id}):supabase.rpc('studioflow_available_slots',{p_slug:profile.subdomain,p_service_id:selectedService.id,p_date:bookingDate,p_stylist_id:selectedStylist.id});
    slotsRequest.then(({data,error})=>{if(!active)return;setSlotsLoading(false);if(error){setSlotsError(error.message);setAvailableSlots([]);setBookingTime('');}else{setAvailableSlots((data||[]).map((s:any)=>({...s,available:s.available!==false})));if(initialSlot&&selectedService.id===initialService?.id&&bookingDate===initialSlot.date&&selectedStylist.id===initialSlot.stylistId&&(data||[]).some((s:any)=>s.time===initialSlot.time&&s.available!==false))setBookingTime(initialSlot.time);}});
    return()=>{active=false;};
  },[isOpen,profile.subdomain,selectedService.id,selectedStylist.id,bookingDate,slotRetry,bundleKey]);


  // Step 3: Guest Information
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [guestPhoneError, setGuestPhoneError] = useState<string>('');
  const [guestNameError, setGuestNameError] = useState<string>('');
  const [rememberGuest, setRememberGuest] = useState<boolean>(true);
  const [isPrefilled, setIsPrefilled] = useState<boolean>(false);

  // Step 5: Payment Method
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paidAmount,setPaidAmount]=useState(0);
  const [gatewayError,setGatewayError]=useState('');
  const [gatewayReady,setGatewayReady]=useState(false);
  const reservedBooking=useRef<Appointment|null>(null);
  const reservedRequest=useRef('');
  useEffect(()=>{if(!isOpen)return;let active=true;setGatewayReady(false);setGatewayError('');paymentRequest('status').then(status=>{if(!active)return;setGatewayReady(status.configured);if(!status.configured)setGatewayError('Online payments need platform Razorpay configuration. Contact platform support.');}).catch(error=>{if(active)setGatewayError(error.message);});return()=>{active=false;};},[isOpen]);
  const [serverStatus, setServerStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_salon' | 'pay_advance_token'>('pay_advance_token');


  // Step 6: Confirmation State
  const [bookingRef, setBookingRef] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [recipientEmailInput, setRecipientEmailInput] = useState<string>('');

  // Load persistent guest details from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_GUEST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setGuestName(parsed.name);
        if (parsed.phone) setGuestPhone(parsed.phone);
        if (parsed.email) setGuestEmail(parsed.email);
        setIsPrefilled(true);
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Initialize the chosen service only when opening or when the parent launches
  // a different service. Never undo the customer's own dropdown selection.
  useEffect(()=>{if(isOpen&&initialService)setSelectedService(initialService);},[isOpen,initialService?.id]);
  useEffect(()=>{if(isOpen&&initialStylist)setSelectedStylist(initialStylist);},[isOpen,initialStylist?.id]);

  useEffect(()=>{if(isOpen){coupon.remove();setAddOnIds([]);setServerTotal(null);reservedBooking.current=null;reservedRequest.current='';bookingRequest.current=crypto.randomUUID();if(initialSlot){setBookingDate(initialSlot.date);setCurrentStep('datetime');}else setCurrentStep('service');}},[isOpen,initialSlot?.date,initialSlot?.time]);
  // Clean and validate Indian 10-digit mobile number
  const sanitizeIndianPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
  };

  const validatePhone = (num: string): boolean => {
    const clean = sanitizeIndianPhone(num);
    if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) {
      setGuestPhoneError('');
      return true;
    }
    setGuestPhoneError('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)');
    return false;
  };

  // Handle Proceed from Guest Info to OTP Step
  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim().length < 2) {
      setGuestNameError('Please enter your full name');
      return;
    }
    setGuestNameError('');
    if (!validatePhone(guestPhone)) {
      return;
    }

    // Save to localStorage if rememberGuest is selected
    if (rememberGuest) {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_GUEST_KEY,
          JSON.stringify({
            name: guestName.trim(),
            phone: sanitizeIndianPhone(guestPhone),
            email: guestEmail.trim()
          })
        );
      } catch {
        // localStorage not available
      }
    }

    // Customer identity is checked by the Supabase session when saving.
    setCurrentStep('payment');
  };

  // Platform deposit: 25%, rounded up to the nearest paisa
  const advanceTokenAmount = Math.ceil(totalPrice * 100 * 0.25) / 100;
  const remainingAmount = totalPrice - (paymentMethod === 'pay_advance_token' ? advanceTokenAmount : 0);

  // Confirm booking & generate reference
  const handleFinalSubmitBooking = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true); setSubmitError('');
    try {
    const cleanPhone = sanitizeIndianPhone(guestPhone);
    const cityCode = profile.city?.toUpperCase().includes('BENGALURU') ? 'BLR'
      : profile.city?.toUpperCase().includes('MUMBAI') ? 'BOM'
      : profile.city?.toUpperCase().includes('DELHI') ? 'DEL'
      : profile.city?.toUpperCase().includes('HYDERABAD') ? 'HYD'
      : profile.city?.toUpperCase().includes('JAIPUR') ? 'JPR'
      : profile.city?.toUpperCase().includes('CHENNAI') ? 'MAA'
      : profile.city?.toUpperCase().includes('PUNE') ? 'PNQ'
      : 'IND';

    const refNum = `NX-${cityCode}-${Math.floor(10000 + Math.random() * 90000)}`;
    setBookingRef(refNum);

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      clientName: guestName.trim() || 'Guest Client',
      clientPhone: `+91 ${cleanPhone}`,
      clientEmail: guestEmail.trim() || `${cleanPhone}@guest.in`,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePrice: totalPrice,
      couponCode:coupon.quote?.code,couponExpectedTotal:coupon.quote?.finalPrice,
      addOnIds:selectedExtras.map(s=>s.id),requestId:bookingRequest.current,
      stylistId: selectedStylist.id,
      stylistName: selectedStylist.name,
      date: bookingDate,
      time: bookingTime,
      status: 'pending',
      paymentStatus: 'pay_at_salon',
      amountPaid: 0,
      createdAt: new Date().toISOString()
    };

    if (!gatewayReady) throw new Error(gatewayError || 'Payment gateway is loading. Please try again.');
    const requestKey=JSON.stringify([bundleKey,selectedStylist.id,bookingDate,bookingTime,guestName.trim(),cleanPhone,coupon.quote?.code]);
    if(reservedBooking.current&&reservedRequest.current!==requestKey)throw new Error('A booking is already reserved. Finish its payment or close this form and choose a new slot.');
    if(!reservedBooking.current){const reservation=await onAddAppointment(newApt);if(!reservation)throw new Error('Booking was not saved. Please retry.');reservedBooking.current=reservation;reservedRequest.current=requestKey;setServerTotal(reservation.servicePrice);setBookingRef(reservation.id);}
    const saved=await payBookingDeposit(reservedBooking.current);
    setBookingRef(saved.id);setServerStatus(saved.status);setPaidAmount(saved.amountPaid);setServerTotal(saved.servicePrice??totalPrice);setSelectedStylist(prev=>({...prev,name:saved.stylistName||prev.name}));
    setCurrentStep('confirmed');

    // Trigger automated booking confirmation email if guest provided email address
    const targetEmail = (guestEmail || '').trim();
    if (targetEmail && targetEmail.includes('@')) {
      setRecipientEmailInput(targetEmail);
      setIsSendingEmail(true);
      setEmailStatusMessage(`Sending confirmation email to ${targetEmail}…`);
      void sendBookingConfirmationEmail({
        to: targetEmail,
        clientName: guestName.trim() || 'Valued Guest',
        clientPhone: `+91 ${cleanPhone}`,
        bookingRef: saved.id || refNum,
        serviceName: selectedService.name,
        servicePrice: totalPrice,
        amountPaid: saved.amountPaid || paidAmount,
        stylistName: saved.stylistName || selectedStylist.name,
        date: bookingDate,
        time: bookingTime,
        salonName: profile.businessName || 'StudioFlow Salon',
        salonAddress: profile.address,
        salonCity: profile.city,
        salonPhone: profile.phone,
        salonWhatsapp: profile.whatsapp,
        salonSlug: profile.subdomain,
      }).then(res => {
        setIsSendingEmail(false);
        if (res.success) {
          setEmailStatusMessage(res.delivered ? `Confirmation email delivered to ${targetEmail}!` : `Confirmation email prepared for ${targetEmail}`);
        } else {
          setEmailStatusMessage(res.error || 'Automated confirmation email queued.');
        }
      }).catch(err => {
        setIsSendingEmail(false);
        setEmailStatusMessage(err instanceof Error ? err.message : 'Email delivery failed');
      });
    }

    if (onShowToast) {
      onShowToast({
        id: String(Date.now()),
        title: 'Appointment saved to Supabase',
        clientName: newApt.clientName,
        serviceName: newApt.serviceName,
        stylistName: newApt.stylistName,
        dateTime: `${bookingDate} at ${bookingTime}`,
        refCode: refNum,
        price: totalPrice
      });
    }
    } catch (error) { setSubmitError(error instanceof Error ? error.message : 'Booking could not be saved. Try another slot.'); }
    finally { setIsSubmitting(false); }
  };

  const handleSendManualConfirmationEmail = async (overrideEmail?: string) => {
    const to = (overrideEmail || recipientEmailInput || guestEmail).trim();
    if (!to || !to.includes('@')) {
      setEmailStatusMessage('Please enter a valid email address.');
      return;
    }
    setIsSendingEmail(true);
    setEmailStatusMessage(`Sending confirmation email to ${to}…`);
    try {
      const res = await sendBookingConfirmationEmail({
        to,
        clientName: guestName.trim() || 'Valued Guest',
        clientPhone: guestPhone,
        bookingRef: bookingRef || 'NX-BOOKING',
        serviceName: selectedService.name,
        servicePrice: totalPrice,
        amountPaid: paidAmount,
        stylistName: selectedStylist.name,
        date: bookingDate,
        time: bookingTime,
        salonName: profile.businessName || 'StudioFlow Salon',
        salonAddress: profile.address,
        salonCity: profile.city,
        salonPhone: profile.phone,
        salonWhatsapp: profile.whatsapp,
        salonSlug: profile.subdomain,
      });
      if (res.success) {
        setEmailStatusMessage(res.delivered ? `Confirmation email delivered to ${to}!` : `Confirmation email sent to ${to}`);
      } else {
        setEmailStatusMessage(res.error || 'Failed to dispatch email');
      }
    } catch (err: any) {
      setEmailStatusMessage(err?.message || 'Email delivery failed');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendManualReminderEmail = async () => {
    const to = (recipientEmailInput || guestEmail).trim();
    if (!to || !to.includes('@')) {
      setEmailStatusMessage('Please enter a valid email address.');
      return;
    }
    setIsSendingEmail(true);
    setEmailStatusMessage(`Sending 24h reminder email to ${to}…`);
    try {
      const res = await sendBookingReminderEmail({
        to,
        clientName: guestName.trim() || 'Valued Guest',
        clientPhone: guestPhone,
        bookingRef: bookingRef || 'NX-BOOKING',
        serviceName: selectedService.name,
        servicePrice: totalPrice,
        amountPaid: paidAmount,
        stylistName: selectedStylist.name,
        date: bookingDate,
        time: bookingTime,
        salonName: profile.businessName || 'StudioFlow Salon',
        salonAddress: profile.address,
        salonCity: profile.city,
        salonPhone: profile.phone,
        salonWhatsapp: profile.whatsapp,
        salonSlug: profile.subdomain,
      });
      if (res.success) {
        setEmailStatusMessage(res.delivered ? `Reminder email delivered to ${to}!` : `Reminder email prepared for ${to}`);
      } else {
        setEmailStatusMessage(res.error || 'Failed to dispatch reminder');
      }
    } catch (err: any) {
      setEmailStatusMessage(err?.message || 'Reminder delivery failed');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Copy booking reference
  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Open WhatsApp prefilled confirmation
  const handleSendWhatsAppConfirmation = () => {
    const cleanPhone = sanitizeIndianPhone(guestPhone);
    const msg = `Namaste ${guestName}! Your booking request with ${profile.businessName} is ${serverStatus || 'saved'}!\n\n` +
      `📅 Date: ${bookingDate}\n` +
      `⏰ Time: ${bookingTime} IST\n` +
      `💇 Service: ${selectedService.name} (₹${totalPrice})\n` +
      `👤 Specialist: ${selectedStylist.name}\n` +
      `📍 Branch: ${profile.businessName}, ${profile.address}, ${profile.city}\n` +
      `🔖 Reference: ${bookingRef}\n` +
      `💳 Payment: ${`Paid ₹${paidAmount.toLocaleString('en-IN')} · Balance ₹${(totalPrice-paidAmount).toLocaleString('en-IN')}`}\n\n` +
      `Thank you for booking with us!`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Open WhatsApp with pre-filled service, date, time shortcut
  const handleQuickWhatsAppBooking = () => {
    const formattedPhone = (profile.whatsapp || '').replace(/\D/g, '');
    const msg = `Namaste ${profile.businessName}! 🌟\n\n` +
      `I would like to book a quick appointment with these details:\n` +
      `💇‍♂️ Service: ${selectedService.name} (₹${totalPrice.toLocaleString('en-IN')})\n` +
      `📅 Date: ${bookingDate}\n` +
      `⏰ Time: ${bookingTime} IST\n` +
      `👤 Specialist: ${selectedStylist.name}\n\n` +
      `Please let me know if this slot is available to confirm! Thank you.`;
    
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Reset modal state to start fresh
  const handleReset = () => {
    coupon.remove();
    setAddOnIds([]);setServerTotal(null);reservedBooking.current=null;reservedRequest.current='';setPaidAmount(0);setSubmitError('');
    setCurrentStep('service');

    setBookingRef('');

  };

  // Keep hooks mounted, but remove the overlay as soon as the parent closes it.
  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className="sf-booking-overlay font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="Book an appointment" className="sf-booking-dialog bg-white text-slate-800"
      >
        {/* MODAL HEADER */}
        <div className="sf-booking-header border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={actionStyle}
            >
              <CalendarCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {currentStep === 'confirmed' ? 'Appointment Saved' : t('Book an Appointment')}
                </h3>
                {currentStep !== 'confirmed' && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    Step {currentStep === 'service' ? '1/4' : currentStep === 'datetime' ? '2/4' : currentStep === 'guest' ? '3/4' : '4/4'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[260px] sm:max-w-md">
                {profile.businessName} • {profile.city}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROGRESS STEPPER BAR (Non-confirmed steps) */}
        {currentStep !== 'confirmed' && (
          <div className="sf-booking-steps bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className={`px-2 py-0.5 rounded-md font-bold ${currentStep === 'service' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-white border border-slate-200'}`}>
                1. Service
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded-md font-bold ${currentStep === 'datetime' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-white border border-slate-200'}`}>
                2. Slot
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded-md font-bold ${currentStep === 'guest' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-white border border-slate-200'}`}>
                3. Info
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded-md font-bold ${currentStep === 'payment' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-white border border-slate-200'}`}>
                4. Review
              </span>
            </div>

            {/* Slot Lock Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Availability checked on save</span>
            </div>
          </div>
        )}

        {/* MODAL BODY (SCROLLABLE) */}
        <div ref={scrollRef} className="sf-booking-body">

          {/* ========================================================= */}
          {/* STEP 1: SELECT LOCATION, SERVICE & SPECIALIST */}
          {/* ========================================================= */}
          {currentStep === 'service' && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col gap-4"
            >
              <div className="p-3 rounded-xl border bg-slate-50"><strong className="text-sm">{profile.businessName}</strong><p className="text-xs text-slate-500">{profile.address} · {profile.city}</p></div>

              {/* Service Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold font-mono-caps text-slate-700">
                    2. Select Treatment / Service
                  </label>
                  <span className="text-[11px] text-emerald-700 font-mono font-bold">
                    All prices in ₹ INR
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(services || []).map((srv) => {
                    const isSelected = selectedService.id === srv.id;
                    return (
                      <button
                        type="button" aria-pressed={isSelected}
                        key={srv.id}
                        onClick={() => chooseService(srv)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">{srv.name}</span>
                            {srv.popular && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-extrabold">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[10px]">{srv.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono text-slate-700">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {srv.durationMinutes} mins
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-sm text-slate-900 font-mono">
                            ₹{srv.price.toLocaleString('en-IN')}
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-end gap-0.5">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specialist Selection ("Any Available" by default) */}
              <div>
                <label className="text-xs font-bold font-mono-caps text-slate-700 block mb-1.5">
                  3. Select Specialist
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Option 1: Any Available (Default) */}
                  <button
                    type="button" aria-pressed={selectedStylist.id===ANY_SPECIALIST.id} aria-label="Select Any Specialist"
                    onClick={() => setSelectedStylist(ANY_SPECIALIST)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-1.5 ${
                      selectedStylist.id === ANY_SPECIALIST.id
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 w-full">
                      <div className="font-bold text-[11px] text-slate-900 truncate">Any Specialist</div>
                      <div className="text-[10px] text-emerald-700 font-medium">Fastest Slot</div>
                    </div>
                  </button>

                  {/* Individual Specialists */}
                  {eligibleStylists.map((st) => {
                    const isSelected = selectedStylist.id === st.id;
                    return (
                      <button
                        type="button" aria-pressed={isSelected} aria-label={`Select specialist ${st.name}`}
                        key={st.id}
                        onClick={() => setSelectedStylist(st)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-1.5 ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <img
                          src={st.avatarUrl}
                          alt={st.name}
                          className="w-9 h-9 rounded-full object-cover shadow-xs"
                        />
                        <div className="min-w-0 w-full">
                          <div className="font-bold text-[11px] text-slate-900 truncate">{st.name.split(' ')[0]}</div>
                          <div className="text-[10px] text-slate-500 truncate">★ {st.rating}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!specialistsReady&&<p role="status" className="text-xs text-slate-700 mt-3">{specialistCheck?.key===specialistKey&&specialistCheck.error?'Could not check specialists.':'Checking specialists for this service…'}</p>}
                {specialistCheck?.key===specialistKey&&specialistCheck.error&&<button type="button" className="text-xs underline" onClick={()=>setSpecialistRetry(n=>n+1)}>Retry specialist check</button>}
                {specialistsReady&&!eligibleStylists.length&&<p role="status" className="text-xs text-amber-800 mt-3">{specialistCheck!.published?'No specialists are assigned to this service. Choose another service or contact the salon.':'This salon is not published yet. The owner needs to publish it before online booking.'}</p>}
                <p className="text-xs text-slate-700 mt-3">Only specialists assigned to this service are listed. Changing service selects Any Specialist.</p>
                <p role="status" className="text-xs text-slate-700 mt-3">Selected specialist: <strong>{selectedStylist.name}</strong>. Use Continue to Date &amp; Slot below.</p>
              </div>

              </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: SELECT DATE & TIME SLOT (WITH 5-MIN LOCK TIMER) */}
          {/* ========================================================= */}
          {currentStep === 'datetime' && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col gap-4"
            >
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Choose a time below. The server checks availability again when you save your booking.</p>
              {/* Date Selection */}
              <div>
                <label className="text-xs font-bold font-mono-caps text-slate-700 block mb-1.5">
                  Select Appointment Date
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setBookingDate(todayStr)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                      bookingDate === todayStr ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingDate(tomorrowStr);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                      bookingDate === tomorrowStr ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <div className="flex-1">
                    <input
                      type="date" aria-label="Appointment date"
                      value={bookingDate}
                      min={todayStr}
                      max={maxDateStr}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full p-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Time Slot Availability Grid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold font-mono-caps text-slate-700">
                    Available appointment times (IST)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Supabase availability
                  </span>
                </div>

                {slotsLoading && <p role="status">Loading slots…</p>}
                {slotsError && <p role="alert" className="text-red-700">{slotsError}</p>}
                {!slotsLoading && !availableSlots.some(slot=>slot.available) && <p className="text-sm text-gray-500">No available slots for this service, specialist and date. Choose another date or check Any Specialist.</p>}
                {!slotsLoading&&selectedStylist.id!==ANY_SPECIALIST.id&&!availableSlots.some(slot=>slot.available)&&<button type="button" className="secondary-action mb-3" onClick={()=>setSelectedStylist(ANY_SPECIALIST)}>Check Any Specialist</button>}
                <button className="text-xs underline mb-2" onClick={()=>setSlotRetry(n=>n+1)}>Retry availability</button>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected = bookingTime === slot.time;
                    return (
                      <button
                        type="button"
                        key={slot.time}
                        onClick={() => setBookingTime(slot.time)}
                        disabled={!slot.available || slotsLoading}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono font-bold text-xs">{slot.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <span className={`text-[10px] font-mono mt-1 ${
                          isSelected
                            ? 'text-emerald-300 font-bold'
                            : slot.status === 'filling_fast'
                            ? 'text-amber-600 font-bold'
                            : 'text-emerald-600'
                        }`}>
                          {slot.available ? 'Available' : 'Unavailable'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Selection Pill */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>{bookingDate} at {bookingTime} IST</span>
                </div>
                <span className="text-slate-600">{selectedService.name} ({selectedStylist.name})</span>
              </div>

              {/* Quick WhatsApp Booking Shortcut */}
              <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-extrabold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>⚡ Quick WhatsApp Booking Shortcut</span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 dark:text-neutral-400 mt-1 leading-relaxed">
                    Send an enquiry directly to the salon. Tap to instantly send a pre-filled booking request for <strong>{selectedService.name}</strong> on WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleQuickWhatsAppBooking}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-white" />
                  <span>Book on WhatsApp</span>
                </button>
              </div>

              </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: ENTER GUEST INFO (NAME, WHATSAPP, EMAIL) */}
          {/* ========================================================= */}
          {currentStep === 'guest' && (
            <motion.form id={guestFormId}
              onSubmit={handleProceedToOtp}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Guest Contact Information</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    We will send booking pass and instant WhatsApp reminders to this number.
                  </p>
                </div>
                {isPrefilled && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Auto-filled
                  </span>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold font-mono-caps text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => {setGuestName(e.target.value);if (guestNameError) setGuestNameError('');}}
                    placeholder="e.g. Aarti Sharma"
                    className={"w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border bg-white focus:ring-2 outline-none "+(guestNameError ? "border-rose-400 focus:ring-rose-400" : "border-slate-300 focus:ring-slate-900")}
                  />
                </div>
                {guestNameError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{guestNameError}</span>
                  </p>
                )}
              </div>

              {/* WhatsApp Mobile Number (Strict 10-Digit Indian Mobile) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold font-mono-caps text-slate-700">
                    WhatsApp Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">10-Digit Mobile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      maxLength={14}
                      value={guestPhone}
                      onChange={(e) => {
                        setGuestPhone(e.target.value);
                        if (guestPhoneError) setGuestPhoneError('');
                      }}
                      placeholder="98765 43210"
                      className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border font-mono bg-white outline-none focus:ring-2 ${
                        guestPhoneError ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300 focus:ring-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {guestPhoneError ? (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{guestPhoneError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Use your WhatsApp number for booking contact details. Sign in or create a customer account when saving your booking.
                  </p>
                )}
              </div>

              {/* Email Address (Optional) */}
              <div>
                <label className="text-xs font-bold font-mono-caps text-slate-700 block mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional for calendar invite)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="name@example.in"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Persistent Guest Remember Checkbox */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="rememberGuestCheck"
                  checked={rememberGuest}
                  onChange={(e) => setRememberGuest(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="rememberGuestCheck" className="text-xs text-slate-600 cursor-pointer select-none">
                  Save my name and WhatsApp number for 1-click future bookings on this browser
                </label>
              </div>

              </motion.form>
          )}

          {currentStep === 'payment' && <BookingCoupon coupon={coupon} disabled={!!reservedBooking.current||isSubmitting}/>}
          {currentStep === 'payment' && extras.length>0&&<section className="sf-booking-addons"><h3>{t('Add-on services')}</h3><p>Optional extras · Prices and time are added to your booking. Adding/removing an extra returns you to slot selection.</p>{extras.map(extra=><label key={extra.id}><input type="checkbox" checked={addOnIds.includes(extra.id)} disabled={!!reservedBooking.current||isSubmitting} onChange={e=>{const checked=e.target.checked;setAddOnIds(ids=>checked?[...ids,extra.id].slice(0,9):ids.filter(id=>id!==extra.id));setServerTotal(null);setCurrentStep('datetime');}}/>{extra.name} · +₹{extra.price} · {extra.durationMinutes} min</label>)}<strong>Payable total: ₹{totalPrice.toLocaleString('en-IN')} · {selectedService.durationMinutes+selectedExtras.reduce((sum,s)=>sum+s.durationMinutes,0)} min</strong></section>}
          {currentStep === 'payment' && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col gap-4"
            >
              {/* WhatsApp Verified Ribbon */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Contact: <strong>+91 {sanitizeIndianPhone(guestPhone)}</strong></span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                  DETAILS ENTERED
                </span>
              </div>

              {/* Comprehensive Booking Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between items-start pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-slate-400 font-mono text-[10px] uppercase">Service & Specialist</span>
                    <div className="font-bold text-sm text-slate-900">{selectedService.name}</div>
                    <div className="text-[11px] text-slate-500">With {selectedStylist.name} ({selectedService.durationMinutes} mins)</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-mono text-[10px] uppercase">Total Fee</span>
                    <div className="font-bold text-base text-slate-900 font-mono">
                      ₹{totalPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-mono text-[10px]">Date & Time</span>
                    <strong className="text-slate-800">{bookingDate} @ {bookingTime} IST</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono text-[10px]">Guest Name</span>
                    <strong className="text-slate-800">{guestName}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm"><strong>Secure platform checkout · 25% advance</strong><p className="mt-2">Pay ₹{advanceTokenAmount.toLocaleString('en-IN')} now via Razorpay. Balance ₹{(totalPrice-advanceTokenAmount).toLocaleString('en-IN')} is due at the salon.</p><p className="mt-2 text-xs">Your appointment confirms after the platform verifies payment. Unpaid reservations expire after 15 minutes.</p></div>
              {gatewayError&&<p role="alert" className="p-3 rounded-xl bg-amber-50 text-amber-900 text-sm">{gatewayError}</p>}

              {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700 text-sm">{submitError}</p>}
              {reservedBooking.current&&<button type="button" disabled={isSubmitting} className="text-sm underline" onClick={async()=>{setIsSubmitting(true);setSubmitError('');try{const saved=await reconcileBookingPayment(reservedBooking.current!.id);setServerStatus(saved.status);setPaidAmount(saved.amountPaid);setBookingRef(saved.id);setCurrentStep('confirmed');}catch(error){setSubmitError(error instanceof Error?error.message:'Could not verify payment');}finally{setIsSubmitting(false);}}}>Recheck payment status</button>}
              </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 6 / POST-SUBMIT CONFIRMATION SCREEN */}
          {/* ========================================================= */}
          {currentStep === 'confirmed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center gap-4 py-3"
            >
              <p className="p-3 bg-amber-50 text-amber-900 rounded-xl text-sm">{serverStatus === 'confirmed' ? `Booking confirmed. Verified advance: ₹${paidAmount.toLocaleString('en-IN')}. Balance due at salon: ₹${(totalPrice-paidAmount).toLocaleString('en-IN')}.` : 'Payment verification is pending. Check payment status before retrying.'}</p>
              {/* Animated Celebratory Checkmark */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: [0.8, 1.35, 1.2], opacity: [0.6, 0.2, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-20 h-20 rounded-full bg-emerald-400 -z-10"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 relative"
                >
                  <CheckCircle2 className="w-9 h-9" />
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.25, 1] }}
                    transition={{ delay: 0.25 }}
                    className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 p-1 rounded-full shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  </motion.span>
                </motion.div>
              </div>

              <div>
                <h4 className="font-bold text-2xl text-slate-900">You're All Set!</h4>
                <p className="text-xs text-slate-600 max-w-sm mt-1">
                  Appointment saved for <strong className="text-slate-900">{guestName}</strong> at <strong className="text-slate-900">{profile.businessName}</strong>.
                </p>
              </div>

              {/* Reference Card with Copy Action */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs w-full text-left font-mono flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">Booking Reference:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-sm tracking-wider">
                      {bookingRef}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(bookingRef)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="Copy Reference Code"
                    >
                      {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-700 font-sans">
                  <span>Treatment:</span>
                  <strong>{selectedService.name} ({selectedStylist.name})</strong>
                </div>

                <div className="flex justify-between items-center text-slate-700 font-sans">
                  <span>Schedule:</span>
                  <strong>{bookingDate} at {bookingTime} IST</strong>
                </div>

                <div className="flex justify-between items-center text-slate-700 font-sans">
                  <span>Payment Mode:</span>
                  <strong className="text-emerald-700">
                    {`Paid ₹${paidAmount.toLocaleString('en-IN')} · Balance ₹${(totalPrice-paidAmount).toLocaleString('en-IN')}`}
                  </strong>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-emerald-700 flex items-center gap-1.5 font-sans font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Payment verified by platform · Booking saved in Supabase</span>
                </div>
              </div>

              {/* Automated Email Confirmation & Reminder Card */}
              <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Email Confirmation & 24h Reminder</div>
                      <div className="text-[10px] text-slate-500">Supabase Edge Function · Resend Integration</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
                    Automated
                  </span>
                </div>

                {emailStatusMessage && (
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span className="flex-1 text-[11px] font-medium leading-relaxed">{emailStatusMessage}</span>
                  </div>
                )}

                {/* Email address input if missing or to override */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={recipientEmailInput || guestEmail}
                      onChange={(e) => setRecipientEmailInput(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSendingEmail || !(recipientEmailInput || guestEmail)}
                    onClick={handleSendManualConfirmationEmail}
                    className="py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isSendingEmail ? 'Sending…' : 'Resend Receipt'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSendingEmail || !(recipientEmailInput || guestEmail)}
                    onClick={handleSendManualReminderEmail}
                    className="py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isSendingEmail ? 'Sending…' : 'Send 24h Reminder'}</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Trigger Button */}
              <button
                type="button"
                onClick={handleSendWhatsAppConfirmation}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Confirmation on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Bottom Actions */}
              <div className="flex gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Done / Close
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:opacity-90"
                  style={actionStyle}
                >
                  Book Another Service
                </button>
              </div>
            </motion.div>
          )}

        </div>
        {currentStep!=='confirmed'&&<footer className="sf-booking-actions">{currentStep === 'service' && (<>{/* Step Navigation Action */}
              <button
                type="button"
                onClick={() => setCurrentStep('datetime')}
                disabled={!specialistsReady||!eligibleStylists.length}
                className="w-full py-3 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-95 active:scale-[0.99] mt-2"
                style={actionStyle}
              >
                <span>Continue to Date & Slot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>)}{currentStep === 'datetime' && (<>{/* Step Navigation Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('service')}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('guest')}
                  disabled={!bookingTime || slotsLoading}
                  className="flex-1 py-3 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-95"
                  style={actionStyle}
                >
                  <span>Continue to Guest Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>)}{currentStep === 'guest' && (<>{/* Navigation Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('datetime')}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit" form={guestFormId}
                  className="flex-1 py-3 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-95"
                  style={actionStyle}
                >
                  <span>Review & Pay 25% Advance</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>)}{currentStep === 'payment' && (<>{/* Final Step Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('guest')}
                  disabled={!bookingTime || slotsLoading}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmitBooking}
                  disabled={isSubmitting || !gatewayReady || coupon.busy || (!reservedBooking.current && !!coupon.code.trim() && !coupon.quote)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-95"
                  style={actionStyle}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Opening secure payment…' : `Pay ₹${advanceTokenAmount.toLocaleString('en-IN')} & Book`}</span>
                </button>
              </div>
            </>)}</footer>}
      </motion.div>
    </div>
  );
};
