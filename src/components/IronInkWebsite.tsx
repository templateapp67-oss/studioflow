import React, { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Facebook,
  Instagram,
  Youtube,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import type { SalonProfile, SalonService, Stylist, LoyaltyConfig } from "../types";
import { WebsiteSections } from "./WebsiteSections";
import { AppAnnouncementStrip, CustomerAppPromotion } from "./CustomerAppPromotion";
import { defaultGalleryCategory, standardGallery } from "../lib/photoGallery";
import { createIronInkServices, IRON_INK_CATEGORIES, ironInkDefaults } from "../lib/ironInk";
import { ironInkOwnerVideos } from "../lib/ironInkMedia";
import { ironInkSocialLinks } from "../lib/ironInkSocial";
import { IronInkSocial } from "./iron-ink/IronInkSocial";
import { IronInkReels } from "./iron-ink/IronInkReels";
import { IronInkLoyalty } from "./iron-ink/IronInkLoyalty";
import { IronInkPromotions } from "./iron-ink/IronInkPromotions";
import { IronInkShorts } from "./iron-ink/IronInkShorts";
import { IronInkShare } from "./iron-ink/IronInkShare";
import type { PromotionOffer } from "../lib/promotionsMock";
import { useCreateInkBooking, useInkAvailability, useInkEnquiry, useInkSite } from "../templates/iron-ink/hooks";
import { uploadInkReference } from "../templates/iron-ink/api";
import type { InkBookingRow } from "../templates/iron-ink/database.types";
import "./ironInk.css";
import { fadeUp as initialVariants, stagger } from "./iron-ink/motion";

type Page =
  | "HOME"
  | "ABOUT"
  | "SERVICES"
  | "PORTFOLIO"
  | "ARTISTS"
  | "PRICING"
  | "AFTERCARE"
  | "BOOKING"
  | "GALLERY"
  | "JOURNAL"
  | "CONTACT";
const NAV: Page[] = [
  "HOME",
  "ABOUT",
  "SERVICES",
  "PORTFOLIO",
  "ARTISTS",
  "PRICING",
  "AFTERCARE",
  "BOOKING",
  "GALLERY",
  "JOURNAL",
  "CONTACT",
];
const fallback =
  "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=1000&q=80";
const image = (url?: string) => url?.trim() || fallback;
const safeString = (value: unknown): string => typeof value === "string" ? value.toLowerCase() : "";
const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const localDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function IronInkWebsite({
  profile: inputProfile,
  services: inputServices,
  stylists: inputStylists,
  galleryPhotos: inputGalleryPhotos,
  siteSlug,
  policies,
  loyaltyConfig,
  onCustomerAccount,
  customerSignedIn=false,
  customerName,
  customerPhotoUrl,
  onMyBookings,
  bookingAvailable,
  onBook,
  onManageDashboard,
}: {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  galleryPhotos: string[];
  siteSlug?: string;
  policies?:Record<string,string>;
  loyaltyConfig?:LoyaltyConfig;
  onCustomerAccount?:()=>void;
  customerSignedIn?:boolean;
  customerName?:string;
  customerPhotoUrl?:string;
  onMyBookings?:()=>void;
  bookingAvailable: boolean;
  /** Present only in the owner's preview; opens the existing workspace editor. */
  onManageDashboard?: (section: string) => void;
  onBook: (
    service?: SalonService,
    artist?: Stylist,
    details?: {
      date?: string;
      time?: string;
      placement?: string;
      size?: string;
      reference?: string;
    },
  ) => void;
}) {
  const profile = inputProfile && typeof inputProfile === "object" ? inputProfile : ({} as SalonProfile);
  const galleryPhotos = Array.isArray(inputGalleryPhotos) ? inputGalleryPhotos : [];
  const services = Array.isArray(inputServices) ? inputServices.filter(Boolean) : [];
  const stylists = Array.isArray(inputStylists) ? inputStylists.filter(Boolean) : [];
  const [page, setPage] = useState<Page>("HOME");
  const [mobileNav, setMobileNav] = useState(false);
  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [artistView, setArtistView] = useState<Stylist | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [review, setReview] = useState(0);
  const [comparison, setComparison] = useState(52);
  const [bookingStep, setBookingStep] = useState(0);
  const [pickedCategory, setPickedCategory] = useState("");
  const [pickedBranch, setPickedBranch] = useState("");
  const [pickedArtist, setPickedArtist] = useState("");
  const [pickedDate, setPickedDate] = useState("");
  const [pickedTime, setPickedTime] = useState("");
  const [placement, setPlacement] = useState("");
  const [size, setSize] = useState("");
  const [reference, setReference] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceError, setReferenceError] = useState("");
  const [referenceUploading,setReferenceUploading]=useState(false);
  const [referenceName,setReferenceName]=useState("");
  const [bookingCustomerName,setBookingCustomerName]=useState("");
  const [customerPhone,setCustomerPhone]=useState("");
  const [customerEmail,setCustomerEmail]=useState("");
  const [birthDate,setBirthDate]=useState("");
  const [bookingResult,setBookingResult]=useState<InkBookingRow|null>(null);
  const [enquirySent,setEnquirySent]=useState(false);
  const [depositAcknowledged,setDepositAcknowledged]=useState(false);
  const [bookingError,setBookingError]=useState("");
  /** Offer chosen from the Promotions section; carried into the booking request. */
  const [activeOffer,setActiveOffer]=useState<PromotionOffer|null>(null);
  const reduced = useReducedMotion();
  const remote=useInkSite(siteSlug);
  const remoteSettings=remote.data?.settings;
  const minimumAge=remoteSettings?.min_age??18;
  const siteProfile={...profile,...(remoteSettings?{businessName:remoteSettings.studio_name,tagline:remoteSettings.tagline,logoUrl:remoteSettings.logo_url||profile.logoUrl,customAccentColor:remoteSettings.brand_color,phone:remoteSettings.phone,whatsapp:remoteSettings.whatsapp,email:remoteSettings.email,address:remoteSettings.address,instagramHandle:remoteSettings.socials?.instagram||profile.instagramHandle,facebookPage:remoteSettings.socials?.facebook||profile.facebookPage,youtubeChannel:remoteSettings.socials?.youtube||profile.youtubeChannel,workingHoursMonFri:remoteSettings.timings?.mon||profile.workingHoursMonFri,workingHoursSat:remoteSettings.timings?.sat||profile.workingHoursSat,workingHoursSun:remoteSettings.timings?.sun||profile.workingHoursSun,coverImageUrl:remoteSettings.hero_images?.[0]||profile.coverImageUrl,ironInk:{...profile.ironInk,bookingDeposit:remoteSettings.deposit_amount,heroImage:remoteSettings.hero_images?.[0]||profile.ironInk?.heroImage}}:{} )};
  const createInk=useCreateInkBooking();
  const enquiry=useInkEnquiry();
  const accent = remote.data?.settings?.brand_color||siteProfile.customAccentColor || "#E11D48";
  // Older template catalogues contain category names rather than category records.
  const defaults = IRON_INK_CATEGORIES.map((category: any) => {
    if (typeof category !== 'string') return category;
    const service = services.find(item => safeString(item.category) === safeString(category));
    return {slug: safeString(category).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), name:category, image:service?.imageUrl || fallback, description:service?.description || '', price:service?.price || 0, duration:`${service?.durationMinutes || 60} min`, enabled:true};
  });
  const remoteCategories = Array.isArray(remote.data?.categories) ? remote.data.categories : [];
  const saved = Array.isArray(siteProfile.ironInk?.categories) ? siteProfile.ironInk.categories.filter(Boolean) : [];
  const base = [...defaults.map(category => saved.find(item => item.slug === category.slug) || category), ...saved.filter(item => !defaults.some(category => category.slug === item.slug))];
  const configured = remoteCategories.length ? remoteCategories.map(item => ({slug:item.slug,name:item.name,image:item.image_url,description:item.description || defaults.find(category => category.slug === item.slug)?.description || '',price:Number(item.starting_price),duration:item.duration_label || `${item.duration_min} min`,enabled:item.is_active,dbId:item.id})) : (() => {
    const custom = services.filter(service => typeof service.category === 'string' && service.category && service.category !== 'Signature Packages' && !base.some(category => safeString(category?.name) === safeString(service.category))).map(service => ({slug:safeString(service.category).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),name:service.category,image:service.imageUrl||fallback,description:service.description||'',price:service.price,duration:`${service.durationMinutes} min`,enabled:true}));
    return [...custom, ...base];
  })();
  const enabledCategories = configured
    .filter((item) => item.enabled)
    .map((item) => {
      const service = services.find(
        (entry) =>
          entry.id === `ii-${item.slug}` || entry.category === item.name,
      );
      if(remote.data?.categories?.length)return item;
      return service
        ? {
            ...item,
            price: service.price,
            description: service.description || item.description,
            image: service.imageUrl || item.image,
          }
        : item;
    });
  const actualServices = remote.data?.categories?.length?[]:services.filter((item) =>
    enabledCategories.some(
      (category) =>
        category.slug === (typeof item.id === "string" ? item.id.replace(/^ii-/, "") : "") ||
        safeString(category.name) === safeString(item.category),
    ),
  );
  const displayServices = actualServices.length
    ? actualServices
    : enabledCategories.map(
        (category) =>
          ({
            id: `ii-${category.slug}`,
            name: category.name,
            category: category.name,
            price: category.price,
            durationMinutes: 60,
            description: category.description,
            icon: "brush",
            imageUrl: category.image,
          }) as SalonService,
      );
  const selectedCategory =
    enabledCategories.find((item) => item.slug === pickedCategory) ||
    enabledCategories[0];
  const activeService =
    displayServices.find((item) => item.category === selectedCategory?.name) ||
    displayServices[0];
  const categoryRecord=remote.data?.categories?.find(item=>item.slug===selectedCategory?.slug);
  const artistList:Stylist[]=remote.data?(remote.data.artists||[]).filter(item=>item.is_active).map(item=>({id:item.id,name:item.name,role:item.bio||'Tattoo Artist',avatarUrl:item.photo_url,specialties:item.specialties,rating:5,bio:item.bio,experienceYears:item.experience_years,status:'Available'})):stylists.filter(item=>item.status!=='Inactive');
  const inkBranches=(remote.data?.branches||[]).filter(item=>item.is_active);
  useEffect(()=>{if(inkBranches.length===1)setPickedBranch(inkBranches[0].id);else if(inkBranches.length>1&&!inkBranches.some(item=>item.id===pickedBranch))setPickedBranch('');},[remote.data?.branches,pickedBranch]);
  useEffect(()=>{if(!artistList.some(item=>item.id===pickedArtist))setPickedArtist(artistList[0]?.id||'');},[artistList,pickedArtist]);
  const chosenArtistId=pickedArtist||artistList[0]?.id||'';
  const selectedArtistName=artistList.find(item=>item.id===chosenArtistId)?.name||'Artist to be confirmed';
  const bookingDeposit=Math.max(0,Number(siteProfile.ironInk?.bookingDeposit??ironInkDefaults.bookingDeposit)||0);
  const depositDescription=bookingDeposit>0?`${money(bookingDeposit)} booking deposit`:'any booking deposit';
  const whatsappLink=(message:string)=>{const digits=(siteProfile.whatsapp||'').replace(/\D/g,'');return digits?`https://wa.me/${digits}?text=${encodeURIComponent(message)}`:undefined;};
  const availability=useInkAvailability(inkBranches.length>1&&!pickedBranch?undefined:remote.data?.site_id,chosenArtistId,pickedDate,categoryRecord?.duration_min||activeService?.durationMinutes||60,pickedBranch||undefined);
  const pageTitle = page === "HOME" ? "" : page;
  const photos = useMemo(() => {
    const localGallery=galleryPhotos.length?galleryPhotos:standardGallery(siteProfile.businessType).map(item=>item.url);
    const uploaded = (remote.data?.portfolio?.length?remote.data.portfolio.map(item=>item.image_url):localGallery).filter(Boolean);
    const categoryFallbacks = enabledCategories.map((item) => item.image);
    return uploaded.length
      ? [...uploaded, ...categoryFallbacks.slice(uploaded.length)]
      : categoryFallbacks;
  }, [galleryPhotos, enabledCategories,remote.data?.portfolio,siteProfile.businessType]);
  const galleryCount=remote.data?.portfolio?.length||galleryPhotos.length||standardGallery(siteProfile.businessType).length;
  useEffect(()=>{
    if(!lightbox)return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setLightbox(null);};
    window.addEventListener('keydown',closeOnEscape);
    return()=>window.removeEventListener('keydown',closeOnEscape);
  },[lightbox]);
  const go = (next: Page) => {
    setPage(next);
    setMobileNav(false);
    setArtistView(null);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };
  const beginBooking = (category?: string, offer?: PromotionOffer | null) => {
    setActiveOffer(offer || null);
    setPickedCategory(category || enabledCategories[0]?.slug || "");
    setPickedBranch(inkBranches.length===1?inkBranches[0].id:'');
    setPickedArtist(artistView?.id||artistList[0]?.id||"");
    setPickedDate("");
    setPickedTime("");
    setPlacement("");
    setSize("");
    setReference("");
    setReferenceFile(null);
    setReferenceName("");
    setReferenceUploading(false);
    setReferenceError("");
    setDepositAcknowledged(false);
    setBookingError("");
    setBookingStep(0);
    go("BOOKING");
  };
  const shareReferenceImage = async () => {
    if (!referenceFile) return;
    const shareData = {
      files: [referenceFile],
      title: `${siteName} tattoo reference`,
      text: `Reference image for a ${selectedCategory?.name || "custom tattoo"} enquiry.`,
    };
    if (navigator.share && navigator.canShare?.({ files: [referenceFile] })) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Keep the booking available if the visitor dismisses the share sheet.
      }
    }
    const digits = (siteProfile.whatsapp || "").replace(/\D/g, "");
    if (digits) {
      window.open(
        `https://wa.me/${digits}?text=${encodeURIComponent(`${shareData.text} Please attach ${referenceFile.name} in this WhatsApp chat.`)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };
  const completeBooking = async () => {
    setBookingError("");
    if (!bookingAvailable && !remote.data?.site_id) return;
    if (!depositAcknowledged) {
      setBookingError("Please confirm that this is a booking request and no deposit is collected online.");
      return;
    }
    if(remote.data?.site_id){
      if(!categoryRecord?.id){setBookingError("This category is not available for online requests. Please contact the studio on WhatsApp.");return;}
      if(!chosenArtistId){setBookingError("No artist is available for online booking. Please contact the studio on WhatsApp.");return;}
      try{const numericSize=Number.parseFloat(size.match(/[0-9]+(?:\.[0-9]+)?/)?.[0]||'');const result=await createInk.mutate({siteId:remote.data.site_id,customerName:bookingCustomerName,phone:customerPhone,email:customerEmail,categoryId:categoryRecord.id,artistId:chosenArtistId,branchId:pickedBranch||undefined,bookingDate:pickedDate,startTime:pickedTime,birthDate,sizeCm:Number.isFinite(numericSize)?numericSize:null,placement,description:`${selectedCategory?.name||'Tattoo'} request${size?` · ${size}`:''}${activeOffer?` · Offer: ${activeOffer.title}${activeOffer.couponCode?` (${activeOffer.couponCode})`:''}`:''}`,referenceImages:reference?[reference]:[]});setBookingResult(result as InkBookingRow);return;}catch{return;}
    }
    onBook(activeService,stylists.find((item)=>item.id===chosenArtistId)||undefined,{date:pickedDate,time:pickedTime,placement,size,reference});
  };
  const reveal = typeof Element === "undefined" ? {} : {
    initial: "hidden",
    whileInView: "show",
    viewport: { once: true, margin: "-80px" },
    variants: initialVariants,
  };
  const section = (
    title: string,
    eyebrow: string,
    description: string,
    children: React.ReactNode,
    id?: string,
  ) => (
    <section className="ii-section" id={id}>
      <motion.div className="ii-section-head" {...reveal}>
        <span className="ii-kicker">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </motion.div>
      {children}
    </section>
  );
  const img = (url: string, alt: string, className = "") => (
    <img
      src={image(url)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
  const faq = remote.data?.faqs?.length?remote.data.faqs.map(item=>({question:item.question,answer:item.answer})):siteProfile.ironInk?.faq || (ironInkDefaults as any).faq || [];
  const reviewData: Array<{
    name: string;
    comment: string;
    rating?: number;
    avatarUrl?: string;
    reviewImageUrl?: string;
    location?: string;
  }> = remote.data?.testimonials?.length
    ? remote.data.testimonials.map(item=>({name:item.client_name,comment:item.review,rating:item.rating,avatarUrl:item.photo_url,reviewImageUrl:item.photo_url}))
    : (Array.isArray(siteProfile.websiteTestimonials)?siteProfile.websiteTestimonials:[])
        .filter(item=>!item.isDemo&&Boolean(item.name?.trim()&&item.comment?.trim()));
  const currentReview = reviewData.length ? reviewData[review % reviewData.length] : undefined;
  const siteName = siteProfile.businessName || "Iron & Ink";
  const socialLinks = ironInkSocialLinks(siteProfile);
  const instagramLink = socialLinks.find((link) => link.platform === "instagram");
  const template12Videos = ironInkOwnerVideos(siteProfile);
  const showSection = (key: string) => siteProfile.websiteSections?.[key] !== false;
  const manageSection = (section: string) =>
    onManageDashboard ? () => onManageDashboard(section) : undefined;
  const localPackageServices=services.filter(item=>item.category==='Signature Packages');
  const packageServices=(localPackageServices.length?localPackageServices:createIronInkServices().filter(item=>item.category==='Signature Packages'));
  const pricingPlans=remote.data?.pricing?.length?remote.data.pricing.map((item,index)=>({name:item.name,detail:`${item.duration_min} min · ${item.type}`,price:Number(item.price),copy:item.description||'Final quote confirmed with your artist.',imageUrl:enabledCategories[index]?.image})):packageServices.map(item=>({name:item.name,detail:`${item.durationMinutes} min · signature package`,price:item.price,copy:item.description,imageUrl:item.imageUrl}));
  const aftercareSteps=remote.data?.aftercare?.length?remote.data.aftercare.map((item,index)=>[String(index+1).padStart(2,'0'),item.title,item.body,item.image_url||'photo-1598371839696-5c5bb00bdc28']):[['01','Leave the dressing on','Follow the timing your artist gives you. Wash your hands before touching the tattoo.','photo-1598371839696-5c5bb00bdc28'],['02','Wash gently','Use clean, lukewarm water and fragrance-free soap. Pat dry with a clean towel.','photo-1565058379802-bbe93b2f703a'],['03','Moisturize lightly','Apply a thin layer of artist-recommended, fragrance-free moisturizer.','photo-1611843467160-25afb8df1074'],['04','Let it heal','Avoid soaking, direct sun and picking. Contact your artist if you have concerns.','photo-1562962230-16e4623d36e6']];
  const journalItems=remote.data?.blog?.length?remote.data.blog.map(item=>[item.title,item.content.slice(0,140),item.cover_url||fallback]):[['How to choose a first tattoo','A little preparation helps turn a good idea into work you love.','photo-1598371839696-5c5bb00bdc28'],['The art of healing well','What to expect in the first few weeks with fresh ink.','photo-1565058379802-bbe93b2f703a'],['Finding the right placement','Scale, movement and how a design lives on the body.','photo-1611843467160-25afb8df1074']];
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="iron-ink"
        style={
          {
            "--ii-accent": accent,
            "--ii-surface": "#141417",
            "--ii-bg": "#0A0A0B",
            "--ii-text": "#F5F5F4",
            "--ii-muted": "#A1A1AA",
          } as React.CSSProperties
        }
      >
        <AppAnnouncementStrip />
        <header className="ii-header">
          <button
            className="ii-logo"
            onClick={() => go("HOME")}
            aria-label={`${siteName}, home`}
          >
            {siteProfile.logoUrl ? (
              <img src={siteProfile.logoUrl} alt={`${siteName} logo`} />
            ) : (
              <span className="ii-logo-mark">
                I<span>&</span>I
              </span>
            )}
            <span>
              {siteName}
              <small>URBAN TATTOO · BODY ART</small>
            </span>
          </button>
          <nav
            className={mobileNav ? "ii-nav is-open" : "ii-nav"}
            aria-label="Main navigation"
          >
            {NAV.map((item) => (
              <button
                key={item}
                onClick={() => go(item)}
                className={page === item ? "active" : ""}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="ii-account-actions" aria-label="Customer account">{customerSignedIn&&customerPhotoUrl&&<img className="ii-customer-avatar" src={customerPhotoUrl} alt=""/>}<button aria-label={customerSignedIn?'Manage your customer account':'Customer account'} onClick={onCustomerAccount}>{customerSignedIn?`Manage your customer account${customerName?` for ${customerName}`:''}`:'Customer account'}</button>{customerSignedIn&&<button onClick={onCustomerAccount}>My profile & settings</button>}<button onClick={onMyBookings}>My Bookings</button>{!customerSignedIn&&<button onClick={onCustomerAccount}>Customer Login</button>}{!customerSignedIn&&<button onClick={onCustomerAccount}>Sign up</button>}</div>
          <button className="ii-book-head" onClick={() => beginBooking()}>
            BOOK A SESSION <ArrowUpRight size={15} />
          </button>
          <button
            className="ii-menu"
            aria-label={mobileNav ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNav}
            onClick={() => setMobileNav(!mobileNav)}
          >
            {mobileNav ? <X /> : <Menu />}
          </button>
        </header>
        {remote.loading&&<div className="ii-data-status" role="status">Loading the latest studio details…</div>}
        {remote.error&&!remote.data&&<div className="ii-data-status" role="status">Studio details are temporarily unavailable. Showing the available starter information.</div>}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: reduced ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -6 }}
              transition={{ duration: 0.35 }}
            >
              {page === "HOME" && (
                <>
                  <section
                    className="ii-hero"
                    style={{
                      backgroundImage: `linear-gradient(90deg,rgba(5,5,6,.94) 2%,rgba(5,5,6,.66) 51%,rgba(5,5,6,.22)),linear-gradient(0deg,#0A0A0B,transparent 32%),url("${image(siteProfile.ironInk?.heroImage || siteProfile.coverImageUrl)}")`,
                    }}
                  >
                    <div className="ii-hero-copy">
                      <span className="ii-kicker">
                        <i /> INKED WITH INTENTION ·{" "}
                        {siteProfile.city || "NEW DELHI"}
                      </span>
                      <motion.h1
                        initial="hidden"
                        animate="show"
                        variants={stagger}
                      >
                        <motion.span variants={initialVariants}>
                          Your Story.
                        </motion.span>
                        <motion.span variants={initialVariants}>
                          Our <em>Ink.</em>
                        </motion.span>
                      </motion.h1>
                      <motion.p {...reveal}>
                        {siteProfile.tagline ||
                          "Custom tattoos and body art for people who wear their stories."}
                      </motion.p>
                      <div className="ii-hero-actions">
                        <button
                          className="ii-primary"
                          onClick={() => beginBooking()}
                        >
                          BOOK SESSION <ArrowUpRight size={16} />
                        </button>
                        <button
                          className="ii-outline"
                          onClick={() => go("PORTFOLIO")}
                        >
                          VIEW PORTFOLIO <ArrowRight size={16} />
                        </button>
                      </div>
                      <div className="ii-hero-note">
                        <span>01 / 04</span>
                        <span>
                          SCROLL TO EXPLORE <ArrowDown size={13} />
                        </span>
                      </div>
                    </div>
                    <motion.div
                      className="ii-device"
                      initial={{
                        opacity: 0,
                        scale: reduced ? 1 : 0.9,
                        y: reduced ? 0 : 18,
                      }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.7 }}
                      aria-label="Phone mockup showing the booking flow"
                    >
                      <div className="ii-phone">
                        <div className="ii-phone-top">
                          <i /> <b>NEW SESSION</b>
                          <span>•••</span>
                        </div>
                        <small>IRON & INK / BOOKING</small>
                        <strong>
                          Make it
                          <br />
                          personal.
                        </strong>
                        <div className="ii-phone-image">
                          {img(
                            enabledCategories[0]?.image || fallback,
                            "Tattoo detail preview",
                          )}
                        </div>
                        <span className="ii-phone-label">
                          CHOOSE YOUR ARTIST
                        </span>
                        <div className="ii-phone-artist">
                          {img(
                            artistList[0]?.avatarUrl || siteProfile.ownerPhotoUrl,
                            "Artist portrait",
                          )}
                          <span>
                            {artistList[0]?.name ||
                              siteProfile.ownerName ||
                              "Your artist"}
                            <small>Available for consult</small>
                          </span>
                          <ArrowRight size={14} />
                        </div>
                        <button onClick={() => beginBooking()}>
                          START BOOKING <ArrowUpRight size={13} />
                        </button>
                      </div>
                    </motion.div>
                    <svg
                      className="ii-ink-splatter"
                      aria-hidden="true"
                      viewBox="0 0 180 180"
                    >
                      <path
                        d="M70 81c-8-18 12-34 24-21 8 8 0 22 11 27 13 6 24-13 32-3 10 13-12 22-7 34 4 10 23 7 20 20-3 12-20 4-27 14-7 10 9 24-1 31-11 8-19-9-30-8-13 2-16 21-29 16-13-5-1-21-10-30-8-8-26 1-30-11-5-13 15-17 17-29 2-12-15-20-7-31 9-11 22 4 34 0 8-2 10-7 3-9Z"
                        fill="currentColor"
                      />
                      <circle cx="29" cy="48" r="3" />
                      <circle cx="143" cy="35" r="2" />
                      <circle cx="40" cy="142" r="2" />
                      <circle cx="155" cy="127" r="4" />
                    </svg>
                    <div className="ii-hero-stamp">
                      CUSTOM WORK
                      <br />
                      EST. MMXVI
                    </div>
                  </section>
                  <div className="ii-marquee" aria-label="Tattoo styles">
                    <div>
                      {[
                        "REALISM",
                        "BLACKWORK",
                        "FINE LINE",
                        "TRADITIONAL",
                        "JAPANESE",
                        "DOTWORK",
                        "CUSTOM INK",
                      ].map((word, i) => (
                        <span key={word}>
                          {word}
                          <b>✳</b>
                        </span>
                      ))}
                    </div>
                  </div>
                  {section(
                    "Art that stays with you.",
                    "THE STUDIO",
                    "A considered space for fearless ideas, meticulous craft and one-of-one body art.",
                    <div className="ii-about-grid">
                      <div className="ii-about-image">
                        {img(
                          siteProfile.ironInk?.interiorImage || fallback,
                          "Warm, carefully equipped tattoo studio interior",
                        )}
                        <span className="ii-image-index">01 — THE ATELIER</span>
                      </div>
                      <div className="ii-about-copy">
                        {img(
                          siteProfile.ownerPhotoUrl ||
                            siteProfile.ironInk?.artistImage ||
                            fallback,
                          `${siteProfile.ownerName || "Studio artist"} at work`,
                          "ii-about-portrait",
                        )}
                        <span className="ii-kicker">
                          {siteProfile.ownerName || "INDEPENDENT ARTISTS"} ·{" "}
                          {siteProfile.ownerRole || "ARTISTS & MAKERS"}
                        </span>
                        <h3>
                          Good ink begins
                          <br />
                          with a good story.
                        </h3>
                        <p>
                          {siteProfile.about ||
                            "We are an independent tattoo and body-art studio built around artistry, care and the idea that every mark should mean something."}
                        </p>
                        <button
                          className="ii-text-link"
                          onClick={() => go("ABOUT")}
                        >
                          MEET THE STUDIO <ArrowRight size={14} />
                        </button>
                        {/* Live counts only — no invented years, piece counts or ratings. */}
                        <div className="ii-stats">
                          <div>
                            <strong>{enabledCategories.length}</strong>
                            <small>STYLES OFFERED</small>
                          </div>
                          <div>
                            <strong>{displayServices.length}</strong>
                            <small>STUDIO SERVICES</small>
                          </div>
                          <div>
                            <strong>{artistList.length}</strong>
                            <small>RESIDENT ARTISTS</small>
                          </div>
                          <div>
                            <strong>{inkBranches.length || 1}</strong>
                            <small>STUDIO LOCATIONS</small>
                          </div>
                        </div>
                      </div>
                    </div>,
                    "about",
                  )}
                  {section(
                    "Find your style.",
                    "THE FLASH INDEX",
                    "From a single needle whisper to a full-body narrative — explore the art forms we live for.",
                    <div className="ii-category-grid">
                      {enabledCategories.slice(0, 8).map((item, index) => (
                        <motion.button
                          className="ii-category-card"
                          key={item.slug}
                          onClick={() => beginBooking(item.slug)}
                          whileHover={reduced ? undefined : { y: -5 }}
                          whileTap={reduced ? undefined : { scale: 0.985 }}
                        >
                          <div>
                            {img(item.image, item.name + " tattoo artwork")}
                            <span className="ii-card-num">0{index + 1}</span>
                            <span className="ii-card-arrow">
                              <ArrowUpRight />
                            </span>
                          </div>
                          <h3>{item.name}</h3>
                          {actualServices.find(service=>safeString(service.category)===safeString(item.name))?.name!==item.name&&<small>{actualServices.find(service=>safeString(service.category)===safeString(item.name))?.name}</small>}
                          <p>{item.description}</p>
                          <span className="ii-price">
                            FROM {money(item.price)}
                          </span>
                        </motion.button>
                      ))}
                    </div>,
                    "styles",
                  )}
                  {section(
                    "Selected works.",
                    "INK ON SKIN",
                    "A small window into the work our artists make with and for the people who sit in our chairs.",
                    <>
                    <div className="ii-filter-row"><span>{defaultGalleryCategory(siteProfile.businessType)} ({galleryCount})</span>{!remote.data?.portfolio?.length&&!siteProfile.photoGalleryInitialized&&<small className="ii-kicker">Demo lookbook</small>}</div>
                    <div className="ii-masonry">
                      {photos.slice(0, 5).map((url, index) => (
                        <button
                          aria-label={`View salon look ${index+1}`}
                          key={`${url}-${index}`}
                          onClick={() => setLightbox(url)}
                          className={`ii-work work-${index + 1}`}
                        >
                          {img(url, `Tattoo portfolio piece ${index + 1}`)}
                          <span>0{index + 1} / CUSTOM WORK</span>
                        </button>
                      ))}
                    </div></>,
                    "portfolio",
                  )}
                  {section(
                    "The hands behind the work.",
                    "OUR ARTISTS",
                    "Independent voices. Shared standards. Find the artist who speaks your visual language.",
                    <div className="ii-artist-grid">
                      {artistList.slice(0, 4).map((artist, index) => (
                        <button
                          className="ii-artist-card"
                          key={artist.id}
                          onClick={() => {
                            setArtistView(artist);
                            go("ARTISTS");
                          }}
                        >
                          {img(
                            artist.avatarUrl ||
                              siteProfile.ownerPhotoUrl ||
                              fallback,
                            `${artist.name}, tattoo artist`,
                          )}
                          <span className="ii-artist-no">
                            View artist profile ↗ · ARTIST 0{index + 1}
                          </span>
                          <h3>{artist.name}</h3>
                          <p>
                            {artist.role ||
                              artist.specialties?.[0] ||
                              "Tattoo Artist"}
                          </p>
                          {artist.experienceYears!==undefined&&artist.experienceYears>0&&<p>{artist.experienceYears} years of experience</p>}
                          <div>
                            {(artist.specialties || ["Custom ink"])
                              .slice(0, 2)
                              .map((tag) => (
                                <span key={tag}>{tag}</span>
                              ))}
                          </div>
                        </button>
                      ))}
                    </div>,
                    "artists",
                  )}
                  {section(
                    "A good session has a rhythm.",
                    "THE PROCESS",
                    "No rush. No guesswork. A clear, collaborative path from first idea to healed art.",
                    <div className="ii-process">
                      {[
                        [
                          "01",
                          "CONSULT",
                          "We talk through your idea, placement, references and budget.",
                          "photo-1562962230-16e4623d36e6",
                        ],
                        [
                          "02",
                          "DESIGN",
                          "Your artist develops a custom concept, made just for you.",
                          "photo-1611843467160-25afb8df1074",
                        ],
                        [
                          "03",
                          "TATTOO",
                          "A focused studio session with sterile, single-use supplies.",
                          "photo-1598371839696-5c5bb00bdc28",
                        ],
                        [
                          "04",
                          "AFTERCARE",
                          "Leave with clear guidance and support while it heals.",
                          "photo-1565058379802-bbe93b2f703a",
                        ],
                      ].map(([no, title, copy, photoId]) => (
                        <article key={no}>
                          <div className="ii-process-image">
                            {img(
                              `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=700&q=80`,
                              `${safeString(title)} stage`,
                            )}
                            <b>{no}</b>
                          </div>
                          <h3>{title}</h3>
                          <p>{copy}</p>
                        </article>
                      ))}
                    </div>,
                    "process",
                  )}
                  {section(
                    "Transparent by design.",
                    "SESSION GUIDE",
                    "Every piece is unique. Here is a starting point — final quotes follow a personal consultation.",
                    <div className="ii-pricing-grid">
                      {pricingPlans.map((plan,index) => (
                        <article className="sf-service-card" key={plan.name}>
                          {img(
                            plan.imageUrl||enabledCategories[index]?.image||fallback,
                            `${plan.name} tattoo package`,
                            "sf-service-image",
                          )}
                          <span className="ii-kicker">
                            0{index + 1} / SESSION
                          </span>
                          <h3>{plan.name}</h3>
                          <p>{plan.detail}</p>
                          <strong>From {money(plan.price)}</strong>
                          <small>{plan.copy}</small>
                          <button
                            className="ii-text-link"
                            onClick={() => beginBooking()}
                          >
                            DISCUSS YOUR IDEA <ArrowRight size={14} />
                          </button>
                        </article>
                      ))}
                    </div>,
                    "salon-packages",
                  )}
                  {section(
                    "Fresh today. Healed for life.",
                    "THE HEALING",
                    "Real skin changes as it heals. Follow your artist’s instructions and give your work time.",
                    <div className="ii-before-after">
                      <div className="ii-comparison-slider">
                        {img(
                          photos[0] || fallback,
                          "Freshly completed tattoo artwork",
                        )}
                        <div
                          className="ii-comparison-after"
                          style={{ clipPath: `inset(0 0 0 ${comparison}%)` }}
                        >
                          {img(
                            photos[1] ||
                              enabledCategories[1]?.image ||
                              fallback,
                            "Healed tattoo artwork",
                          )}
                        </div>
                        <span className="ii-comparison-label fresh">
                          FRESH INK · DAY 01
                        </span>
                        <span className="ii-comparison-label healed">
                          HEALED WORK
                        </span>
                        <input
                          type="range"
                          min="8"
                          max="92"
                          value={comparison}
                          aria-label="Compare fresh and healed tattoo appearance"
                          onChange={(event) =>
                            setComparison(Number(event.target.value))
                          }
                        />
                        <span
                          className="ii-comparison-handle"
                          style={{ left: `${comparison}%` }}
                        >
                          ↔
                        </span>
                      </div>
                      <div className="ii-ba-copy">
                        <span className="ii-kicker">
                          CARE IS PART OF THE ART
                        </span>
                        <h3>Protect your new piece.</h3>
                        <p>
                          Gentle care preserves the details. Get the full
                          aftercare guide from your artist.
                        </p>
                        <button
                          className="ii-text-link"
                          onClick={() => go("AFTERCARE")}
                        >
                          READ AFTERCARE <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>,
                    "healed",
                  )}
                  {reviewData.length>0&&section(
                    "Words that stay.",
                    "CLIENT NOTES",
                    "Stories from people who trusted us with a little piece of themselves.",
                    <div className="ii-testimonial">
                      <div className="ii-testimonial-photo">
                        {img(
                          reviewData[review % reviewData.length]
                            ?.reviewImageUrl ||
                            reviewData[review % reviewData.length]?.avatarUrl ||
                            artistList[review % Math.max(artistList.length, 1)]
                              ?.avatarUrl ||
                            fallback,
                          "Client portrait",
                        )}
                      </div>
                      <div>
                        <span className="ii-kicker">
                          CLIENT STORY · 0{review + 1}
                        </span>
                        {Number.isFinite(currentReview?.rating) && Number(currentReview?.rating) > 0 && (
                          <div
                            className="ii-stars"
                            aria-label={`Rated ${Number(currentReview?.rating).toFixed(1)} out of 5`}
                          >
                            {"★".repeat(Math.max(0, Math.min(5, Math.round(Number(currentReview?.rating)))))}
                            {"☆".repeat(Math.max(0, 5 - Math.round(Number(currentReview?.rating))))}
                          </div>
                        )}
                        <blockquote>
                          “
                          {reviewData[review % reviewData.length]?.comment ||
                            ""}
                          ”
                        </blockquote>
                        <strong>
                          {reviewData[review % reviewData.length]?.name ||
                            ""}
                        </strong>
                        <div className="ii-carousel-controls">
                          <button
                            aria-label="Previous review"
                            onClick={() =>
                              setReview(
                                (review + reviewData.length - 1) %
                                  reviewData.length,
                              )
                            }
                          >
                            <ArrowLeft />
                          </button>
                          <span>
                            0{review + 1} / 0{reviewData.length}
                          </span>
                          <button
                            aria-label="Next review"
                            onClick={() =>
                              setReview((review + 1) % reviewData.length)
                            }
                          >
                            <ArrowRight />
                          </button>
                        </div>
                      </div>
                    </div>,
                    "testimonials",
                  )}
                  {section(
                    "From the studio floor.",
                    instagramLink?.handle || "STUDIO JOURNAL",
                    "Fresh work, healed pieces and snapshots from our artists’ world.",
                    <div className="ii-instagram">
                      {photos.slice(0, 5).map((url, index) => (
                        <button
                          key={`${url}-ig-${index}`}
                          onClick={() => setLightbox(url)}
                        >
                          {img(url, `Studio gallery image ${index + 1}`)}
                          <span>
                            <Instagram size={16} />
                          </span>
                        </button>
                      ))}
                    </div>,
                    "instagram",
                  )}
                  {section(
                    "A few things worth knowing.",
                    "BEFORE YOU BOOK",
                    "Good questions make for better sessions. Still curious? Talk directly with the studio.",
                    <div className="ii-faq">
                      {faq.map((item, index) => (
                        <details
                          key={index}
                          open={faqOpen === index}
                          onToggle={(event) => {
                            if (
                              (event.currentTarget as HTMLDetailsElement).open
                            )
                              setFaqOpen(index);
                          }}
                        >
                          <summary>
                            {item.question}
                            <ChevronDown size={17} />
                          </summary>
                          <p>{item.answer}</p>
                        </details>
                      ))}
                    </div>,
                    "faq",
                  )}
                  <section
                    className="ii-cta"
                    style={{
                      backgroundImage: `linear-gradient(90deg,rgba(5,5,6,.91),rgba(5,5,6,.35)),url("${image(enabledCategories[2]?.image)}")`,
                    }}
                  >
                    <span className="ii-kicker">MAKE YOUR MARK</span>
                    <h2>
                      Bring the idea.
                      <br />
                      <em>We’ll bring the ink.</em>
                    </h2>
                    <button
                      className="ii-primary"
                      onClick={() => beginBooking()}
                    >
                      BOOK YOUR CONSULTATION <ArrowUpRight size={16} />
                    </button>
                  </section>
                </>
              )}

              {page !== "HOME" && (
                <div className="ii-inner-page">
                  <div className="ii-page-heading">
                    <span className="ii-kicker">IRON & INK / {pageTitle}</span>
                    <h1>
                      {pageTitle === "ABOUT"
                        ? "An independent studio."
                        : pageTitle === "SERVICES"
                          ? "The full art index."
                          : pageTitle === "PORTFOLIO"
                            ? "Made to be seen."
                            : pageTitle === "ARTISTS"
                              ? "Meet the makers."
                              : pageTitle === "PRICING"
                                ? "The session guide."
                                : pageTitle === "AFTERCARE"
                                  ? "Care is part of the art."
                                  : pageTitle === "BOOKING"
                                    ? "Let’s make it personal."
                                    : pageTitle === "GALLERY"
                                      ? "A living archive."
                                      : pageTitle === "JOURNAL"
                                        ? "Notes from the studio."
                                        : "Come say hello."}
                    </h1>
                    <p>
                      {page === "BOOKING"
                        ? "Tell us the first details. We’ll take it from there."
                        : siteProfile.tagline ||
                          "Custom body art, made with care and intention."}
                    </p>
                  </div>
                  {page === "ABOUT" && (
                    <>
                      {section(
                        "A space made for the work.",
                        "OUR STORY",
                        siteProfile.about ||
                          "Built around independent artists, bold ideas and exceptionally considered craft.",
                        <div className="ii-about-grid">
                          {img(
                            siteProfile.ironInk?.interiorImage || fallback,
                            "Studio workstations and tattoo equipment",
                            "ii-about-image",
                          )}
                          <div className="ii-about-copy">
                            <span className="ii-kicker">OUR STANDARDS</span>
                            <h3>Artistry without compromise.</h3>
                            <p>
                              Every session begins with a conversation. Every
                              station is prepared with sterile, single-use
                              supplies. Our licensed artists make room for your
                              questions, your references and your own pace.
                            </p>
                            <ul className="ii-standards">
                              <li>
                                <ShieldCheck /> Single-use needles & sealed
                                supplies
                              </li>
                              <li>
                                <ShieldCheck /> Licensed, experienced artists
                              </li>
                              <li>
                                <ShieldCheck /> Clear aftercare & follow-up
                              </li>
                              <li>
                                <ShieldCheck /> Consent-first consultations
                              </li>
                            </ul>
                          </div>
                        </div>,
                        "story",
                      )}
                      <div className="ii-timeline">
                        {[
                          ["01", "Listen closely and shape a personal idea."],
                          ["02", "Design with care, then create with intention."],
                          ["03", "Support every piece through thoughtful aftercare."],
                        ].map(([year, text]) => (
                          <article key={year}>
                            <b>{year}</b>
                            <p>{text}</p>
                            {img(
                              siteProfile.ironInk?.interiorImage || fallback,
                              `Studio milestone ${year}`,
                            )}
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                  {page === "SERVICES" && (
                    <div className="ii-services-list">
                      {enabledCategories.map((item) => (
                        <article key={item.slug}>
                          {img(item.image, item.name + " artwork")}
                          <div>
                            <span className="ii-kicker">
                              {item.slug.replaceAll("-", " ").toUpperCase()}
                            </span>
                            <h2>{item.name}</h2>
                            <p>{item.description}</p>
                            <small>
                              <Clock size={14} />
                              {item.duration}
                            </small>
                          </div>
                          <div>
                            <strong>FROM {money(item.price)}</strong>
                            <button
                              className="ii-outline"
                              onClick={() => beginBooking(item.slug)}
                            >
                              ENQUIRE <ArrowUpRight size={15} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  {(page === "PORTFOLIO" || page === "GALLERY") && (
                    <>
                      <div className="ii-filter-row">
                        {[
                          "All",
                          ...enabledCategories.map((item) => item.name),
                        ].map((name) => (
                          <button
                            className={filter === name ? "selected" : ""}
                            key={name}
                            onClick={() => setFilter(name)}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                      <div className="ii-gallery-grid">
                        {photos.map((url, index) => {
                          const item =
                            enabledCategories[index % enabledCategories.length];
                          if (filter !== "All" && item?.name !== filter)
                            return null;
                          return (
                            <button
                              key={`${url}-grid-${index}`}
                              onClick={() => setLightbox(url)}
                            >
                              {img(
                                url,
                                `${item?.name || "Tattoo"} portfolio image`,
                              )}
                              <span>
                                {item?.name || "CUSTOM TATTOO"}{" "}
                                <ArrowUpRight size={14} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {page === "ARTISTS" &&
                    (artistView ? (
                      <div className="ii-artist-detail">
                        <button
                          className="ii-text-link"
                          onClick={() => setArtistView(null)}
                        >
                          <ArrowLeft size={14} /> ALL ARTISTS
                        </button>
                        {img(
                          artistView.avatarUrl || fallback,
                          `${artistView.name} portrait`,
                        )}
                        <div>
                          <span className="ii-kicker">ARTIST PROFILE</span>
                          <h2>{artistView.name}</h2>
                          <p>{artistView.role || "Resident Tattoo Artist"}</p>
                          <div className="ii-tags">
                            {(artistView.specialties || []).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                          <p>
                            Each piece starts with a conversation and is
                            designed to fit your story, placement and style.
                          </p>
                          <button
                            className="ii-primary"
                            onClick={() => beginBooking()}
                          >
                            BOOK WITH{" "}
                            {artistView.name.split(" ")[0].toUpperCase()}{" "}
                            <ArrowUpRight />
                          </button>
                          <div className="ii-gallery-grid">
                            {photos.slice(0, 3).map((url, index) => (
                              <button
                                key={url + index}
                                onClick={() => setLightbox(url)}
                              >
                                {img(url, `${artistView.name} tattoo work`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="ii-artist-grid">
                        {artistList.map((artist) => (
                          <button
                            className="ii-artist-card"
                            key={artist.id}
                            onClick={() => setArtistView(artist)}
                          >
                            {img(
                              artist.avatarUrl || fallback,
                              `${artist.name}, tattoo artist`,
                            )}
                            <span className="ii-artist-no">
                              View artist profile ↗
                            </span>
                            <h3>{artist.name}</h3>
                            <p>{artist.role || "Tattoo Artist"}</p>
                            {artist.experienceYears!==undefined&&artist.experienceYears>0&&<p>{artist.experienceYears} years of experience</p>}
                            <div>
                              {(artist.specialties || ["Custom ink"]).map(
                                (tag) => (
                                  <span key={tag}>{tag}</span>
                                ),
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  {page === "PRICING" && (
                    <>
                      <div className="ii-pricing-grid">
                        {pricingPlans.map((plan,index) => (
                          <article className="sf-service-card" key={plan.name}>
                            {img(
                              plan.imageUrl||enabledCategories[index]?.image||fallback,
                              `${plan.name} session`,
                              "sf-service-image",
                            )}
                            <span className="ii-kicker">
                              SESSION 0{index + 1}
                            </span>
                            <h3>{plan.name}</h3>
                            <p>{plan.detail}</p>
                            <strong>From {money(plan.price)}</strong>
                            <small>{plan.copy} Final quote confirmed with your artist after consultation; prices vary by size, placement and detail.</small>
                          </article>
                        ))}
                      </div>
                      <div className="ii-deposit">
                        <span className="ii-kicker">BOOKING DEPOSIT</span>
                        <h2>
                          {money(
                            siteProfile.ironInk?.bookingDeposit ??
                              ironInkDefaults.bookingDeposit,
                          )}{" "}
                          secures your date.
                        </h2>
                        <p>
                          Deposit details are confirmed before booking and
                          applied to your final session total. Large projects
                          may be scheduled over multiple sessions.
                        </p>
                        <button
                          className="ii-primary"
                          onClick={() => beginBooking()}
                        >
                          START A BOOKING <ArrowUpRight />
                        </button>
                      </div>
                    </>
                  )}
                  {page === "AFTERCARE" && (
                    <div className="ii-aftercare">
                      {aftercareSteps.map(([number, title, text, photoId]) => (
                        <article key={number}>
                          {img(
                            `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=80`,
                            `${title} aftercare guide`,
                          )}
                          <span className="ii-kicker">STEP {number}</span>
                          <h2>{title}</h2>
                          <p>{text}</p>
                        </article>
                      ))}
                      <div className="ii-deposit">
                        <h2>Do</h2>
                        <p>
                          Keep it clean · follow your artist’s instructions ·
                          stay hydrated · reach out if something concerns you.
                        </p>
                        <h2>Don’t</h2>
                        <p>
                          Pick or scratch · soak in pools · expose fresh ink to
                          direct sun · use unapproved products.
                        </p>
                      </div>
                    </div>
                  )}
                  {page === "BOOKING"&&bookingResult?<div className="ii-booking-success"><span className="ii-kicker">REQUEST RECEIVED · NOT YET CONFIRMED</span><h2>Your idea is in safe hands.</h2><p>Reference {bookingResult.id.slice(0,8).toUpperCase()} · {inkBranches.find(item=>item.id===bookingResult.branch_id)?.name||'Studio'} · {selectedCategory?.name} · {pickedDate} at {pickedTime}{activeOffer?` · Offer: ${activeOffer.title}`:''}</p><p>We have received your request. The studio will confirm availability and the final quote{bookingDeposit>0?` and how to arrange the ${money(bookingDeposit)} deposit`:' and whether a deposit is required'}. No payment has been taken and your appointment is not yet confirmed.</p>{whatsappLink(`Hi, I just submitted booking request ${bookingResult.id.slice(0,8).toUpperCase()} for ${selectedCategory?.name||'a tattoo'} with ${selectedArtistName} on ${pickedDate} at ${pickedTime}. Please let me know how to confirm the appointment and arrange ${depositDescription}.`)?<a className="ii-primary" target="_blank" rel="noopener noreferrer" href={whatsappLink(`Hi, I just submitted booking request ${bookingResult.id.slice(0,8).toUpperCase()} for ${selectedCategory?.name||'a tattoo'} with ${selectedArtistName} on ${pickedDate} at ${pickedTime}. Please let me know how to confirm the appointment and arrange ${depositDescription}.`)}>CONFIRM DETAILS ON WHATSAPP <ArrowUpRight/></a>:<button className="ii-outline" onClick={()=>go("CONTACT")}>CONTACT THE STUDIO</button>}{referenceFile&&<button className="ii-outline" onClick={shareReferenceImage}>SHARE REFERENCE IMAGE <ArrowUpRight/></button>}<button className="ii-outline" onClick={()=>{setBookingResult(null);beginBooking()}}>REQUEST ANOTHER SESSION</button></div>:page === "BOOKING" && (
                    <div className="ii-booking-layout">
                      <div className="ii-booking-photo">
                        {img(
                          selectedCategory?.image || fallback,
                          "Tattoo artwork while you plan a session",
                        )}
                        <span>YOUR IDEA, YOUR WAY.</span>
                      </div>
                      <div className="ii-booking-card">
                        {activeOffer && (
                          <div className="ii-offer-chip" role="status">
                            <span>
                              <strong>{activeOffer.title}</strong>
                              {activeOffer.couponCode ? ` · ${activeOffer.couponCode}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveOffer(null)}
                              aria-label={`Remove the offer ${activeOffer.title} from this booking`}
                            >
                              REMOVE
                            </button>
                          </div>
                        )}
                        <div className="ii-step-progress">
                          {["STYLE", "ARTIST", "TIME", "DETAILS"].map(
                            (step, index) => (
                              <span
                                className={bookingStep >= index ? "done" : ""}
                                key={step}
                              >
                                {index + 1} <small>{step}</small>
                              </span>
                            ),
                          )}
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={bookingStep}
                            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            {bookingStep === 0 && (
                              <>
                                <span className="ii-kicker">
                                  STEP 01 / FIND THE ART
                                </span>
                                <h2>What are you thinking?</h2>
                                {inkBranches.length>0&&<label className="ii-branch-picker"><MapPin size={15}/> Choose your studio location<select value={pickedBranch} onChange={event=>{setPickedBranch(event.target.value);setPickedArtist(artistList[0]?.id||'');setPickedDate('');setPickedTime('');}}>{inkBranches.length>1&&<option value="">Select a location first</option>}{inkBranches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}{branch.city?` · ${branch.city}`:''}</option>)}</select>{pickedBranch&&<small>{inkBranches.find(item=>item.id===pickedBranch)?.address}{inkBranches.find(item=>item.id===pickedBranch)?.city?` · ${inkBranches.find(item=>item.id===pickedBranch)?.city}`:''}</small>}</label>}
                                <div className="ii-choice-grid">
                                  {enabledCategories.map((item) => (
                                    <button
                                      className={
                                        pickedCategory === item.slug
                                          ? "picked"
                                          : ""
                                      }
                                      key={item.slug}
                                      onClick={() =>
                                        setPickedCategory(item.slug)
                                      }
                                    >
                                      {img(item.image, item.name + " example")}
                                      <span className="ii-category-choice-copy">
                                        <strong>{item.name}</strong>
                                        <small>FROM {money(item.price)} · {item.duration}</small>
                                        <em>{item.description}</em>
                                      </span>
                                      {pickedCategory === item.slug && (
                                        <Check size={17} />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                            {bookingStep === 1 && (
                              <>
                                <span className="ii-kicker">
                                  STEP 02 / YOUR ARTIST
                                </span>
                                <h2>Who would you like to meet?</h2>
                                {pickedBranch&&<p className="ii-branch-note"><MapPin size={13}/>{inkBranches.find(item=>item.id===pickedBranch)?.name}</p>}
                                <div className="ii-choice-grid ii-artist-choices">
                                  {artistList.length ? (
                                    artistList.map((item) => (
                                      <button
                                        className={
                                          pickedArtist === item.id
                                            ? "picked"
                                            : ""
                                        }
                                        key={item.id}
                                        onClick={() => setPickedArtist(item.id)}
                                      >
                                        {img(
                                          item.avatarUrl || fallback,
                                          item.name + " portrait",
                                        )}
                                        <span>
                                          {item.name}
                                          <small>
                                            {item.specialties?.[0] || item.role}
                                          </small>
                                        </span>
                                      </button>
                                    ))
                                  ) : (
                                    <>
                                      <p className="ii-form-note">
                                        {remote.data?"No active artist is configured for online booking. Contact the studio to arrange your request.":"Your studio will match you with the right artist."}
                                      </p>
                                      {remote.data&&whatsappLink(`Hi, I would like help booking a ${selectedCategory?.name||'tattoo'} session. Please help me choose an artist.`)&&<a className="ii-text-link" target="_blank" rel="noopener noreferrer" href={whatsappLink(`Hi, I would like help booking a ${selectedCategory?.name||'tattoo'} session. Please help me choose an artist.`)}>CONTACT THE STUDIO ON WHATSAPP <ArrowUpRight size={14}/></a>}
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                            {bookingStep === 2 && (
                              <>
                                <span className="ii-kicker">
                                  STEP 03 / FIND A TIME
                                </span>
                                <h2>When works for you?</h2>
                                <label className="ii-field">
                                  PREFERRED DATE
                                  <input
                                    type="date"
                                    value={pickedDate}
                                    onChange={(e) =>
                                      setPickedDate(e.target.value)
                                    }
                                    min={localDateInput(new Date())}
                                  />
                                </label>
                                <label className="ii-field">
                                  LIVE AVAILABLE TIMES
                                  <select value={pickedTime} onChange={(e)=>setPickedTime(e.target.value)} disabled={!pickedDate||availability.loading}>
                                    <option value="">{availability.loading?'Loading live slots…':pickedDate?'Choose an available time':'Choose a date first'}</option>
                                    {(remote.data?availability.data:[{start_time:'10:00',end_time:'11:00'},{start_time:'11:30',end_time:'12:30'},{start_time:'13:00',end_time:'14:00'},{start_time:'14:30',end_time:'15:30'},{start_time:'16:00',end_time:'17:00'},{start_time:'17:30',end_time:'18:30'}]).map(slot=><option key={slot.start_time} value={slot.start_time.slice(0,5)}>{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}</option>)}
                                  </select>
                                </label>
                                {availability.error&&<p className="ii-form-note" role="alert">Live availability is temporarily unavailable. Please contact the studio to confirm a time.</p>}
                                {pickedDate&&!availability.loading&&!availability.error&&remote.data&&availability.data.length===0&&<p className="ii-form-note">No live times are open for this date. Choose another date or ask the studio about an alternative.</p>}
                                {(availability.error||(pickedDate&&!availability.loading&&remote.data&&availability.data.length===0))&&whatsappLink(`Hi, I would like to ask about ${selectedCategory?.name||'a tattoo'} with ${selectedArtistName} on ${pickedDate||'a future date'}${pickedBranch?` at ${inkBranches.find(item=>item.id===pickedBranch)?.name||'the selected studio'}`:''}.` )&&<a className="ii-text-link" target="_blank" rel="noopener noreferrer" href={whatsappLink(`Hi, I would like to ask about ${selectedCategory?.name||'a tattoo'} with ${selectedArtistName} on ${pickedDate||'a future date'}${pickedBranch?` at ${inkBranches.find(item=>item.id===pickedBranch)?.name||'the selected studio'}`:''}.` )}>ASK ABOUT AVAILABILITY ON WHATSAPP <ArrowUpRight size={14}/></a>}
                                <p className="ii-form-note">Slots are checked live against this artist’s studio schedule and current bookings.</p>
                              </>
                            )}
                            {bookingStep === 3 && (
                              <>
                                <span className="ii-kicker">
                                  STEP 04 / THE DETAILS
                                </span>
                                <h2>Tell us a little more.</h2>
                                <label className="ii-field">YOUR NAME<input autoComplete="name" maxLength={120} value={bookingCustomerName} onChange={e=>setBookingCustomerName(e.target.value)} required placeholder="Full name"/></label>
                                <label className="ii-field">PHONE<input autoComplete="tel" inputMode="tel" maxLength={30} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} required placeholder="Phone number"/></label>
                                <label className="ii-field">EMAIL (OPTIONAL)<input autoComplete="email" type="email" maxLength={254} value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="you@example.com"/></label>
                                <label className="ii-field">DATE OF BIRTH<input type="date" max={localDateInput(new Date(new Date().setFullYear(new Date().getFullYear()-minimumAge)))} value={birthDate} onChange={e=>setBirthDate(e.target.value)} required/></label>
                                <p className="ii-form-note">Tattoo bookings are available to adults aged {minimumAge} and over. Please bring valid ID to your appointment.</p>
                                <label className="ii-field">
                                  SIZE
                                  <select
                                    value={size}
                                    onChange={(e) => setSize(e.target.value)}
                                    required={Boolean(remote.data)}
                                  >
                                    <option value="">
                                      Choose approximate size
                                    </option>
                                    <option>Small · under 5 cm</option>
                                    <option>Medium · 5–15 cm</option>
                                    <option>Large · over 15 cm</option>
                                    <option>Not sure yet</option>
                                  </select>
                                </label>
                                <label className="ii-field">
                                  PLACEMENT
                                  <input
                                    value={placement}
                                    onChange={(e) =>
                                      setPlacement(e.target.value)
                                    }
                                    placeholder="e.g. outer forearm, or not sure yet"
                                    required={Boolean(remote.data)}
                                  />
                                </label>
                                <label className="ii-field">
                                  REFERENCE IMAGE (OPTIONAL)
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={referenceUploading}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      if (
                                        file &&
                                        (!['image/jpeg','image/png','image/webp'].includes(file.type) ||
                                          file.size > 5 * 1024 * 1024)
                                      ) {
                                        setReferenceFile(null);
                                        setReference("");
                                        setReferenceError(
                                          "Choose an image smaller than 5 MB.",
                                        );
                                        return;
                                      }
                                      setReferenceError("");
                                      setReferenceFile(file);
                                      setReferenceName(file?.name||'');
                                      setReference(file?.name||'');
                                      if(file&&remote.data?.site_id){setReferenceUploading(true);uploadInkReference(remote.data.site_id,file).then(path=>setReference(path)).catch(error=>{setReference("");setReferenceError(error instanceof Error?error.message:'Could not upload reference image. You can continue without it or share it on WhatsApp.');}).finally(()=>setReferenceUploading(false));}
                                    }}
                                  />
                                  {referenceName&&<small>{referenceUploading?'Uploading securely…':referenceName}</small>}
                                  {referenceError && (
                                    <small role="alert">{referenceError} The booking can continue without the image.</small>
                                  )}
                                  {referenceFile && (
                                    <button
                                      className="ii-text-link"
                                      type="button"
                                      onClick={shareReferenceImage}
                                    >
                                      SHARE IMAGE WITH THE STUDIO
                                      <ArrowUpRight size={14} />
                                    </button>
                                  )}
                                </label>
                                <div className="ii-confirm-summary">
                                  <span>{selectedCategory?.name}</span>
                                  {activeOffer&&<span>Offer · {activeOffer.title}{activeOffer.couponCode?` (${activeOffer.couponCode})`:''}</span>}
                                  <span>
                                    {pickedDate || "Date to be discussed"} ·{" "}
                                    {pickedTime || "Time to be discussed"}
                                  </span>
                                  {pickedBranch&&<span>Studio · {inkBranches.find(item=>item.id===pickedBranch)?.name}</span>}
                                  <span>Artist · {selectedArtistName}</span>
                                  {size&&<span>Approximate size · {size}</span>}
                                  {placement&&<span>Placement · {placement}</span>}
                                  <b>{bookingDeposit>0?`Booking deposit · ${money(bookingDeposit)}`:'No booking deposit configured'}</b>
                                  <span className="ii-form-note">This is an unpaid request. The studio will confirm the final quote and {bookingDeposit>0?`how to arrange the ${money(bookingDeposit)} deposit`:'whether a deposit is required'} directly; no online payment is taken.</span>
                                </div>
                                <label className="ii-deposit-ack">
                                  <input type="checkbox" checked={depositAcknowledged} onChange={event=>setDepositAcknowledged(event.target.checked)}/>
                                  <span>I understand this submits a booking request only. No payment is collected online; the studio will confirm {bookingDeposit>0?`how to arrange the ${money(bookingDeposit)} deposit`:'whether a deposit is required'} after confirming the appointment.</span>
                                </label>
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>
                        <div className="ii-booking-actions">
                          {bookingStep > 0 && (
                            <button
                              className="ii-outline"
                              onClick={() => setBookingStep(bookingStep - 1)}
                            >
                              <ArrowLeft /> BACK
                            </button>
                          )}
                          {bookingStep < 3 ? (
                            <button
                              className="ii-primary"
                              onClick={() => setBookingStep(bookingStep + 1)}
                              disabled={(bookingStep===0&&(!pickedCategory||(inkBranches.length>1&&!pickedBranch)))||(bookingStep===1&&Boolean(remote.data)&&!chosenArtistId)||(bookingStep===2&&(!pickedDate||!pickedTime||(Boolean(remote.data)&&!availability.data.some(slot=>slot.start_time.slice(0,5)===pickedTime))))}
                            >
                              CONTINUE <ArrowRight />
                            </button>
                          ) : (
                            <button
                              className="ii-primary"
                              disabled={(!bookingAvailable&&!remote.data?.site_id)||createInk.loading||referenceUploading||!depositAcknowledged||(Boolean(remote.data)&&(!bookingCustomerName.trim()||customerPhone.replace(/\D/g,'').length<10||!birthDate||new Date(birthDate)>new Date(new Date().setFullYear(new Date().getFullYear()-minimumAge))||!pickedDate||!pickedTime||!chosenArtistId||!categoryRecord?.id||!size||!placement.trim()))}
                              onClick={completeBooking}
                            >
                              {createInk.loading?'SENDING REQUEST…':bookingAvailable||remote.data?.site_id?'REQUEST THIS SESSION':'ONLINE BOOKING UNAVAILABLE'}{" "}
                              <ArrowUpRight />
                            </button>
                          )}
                        </div>
                        {(bookingError||createInk.error)&&<p className="ii-form-note" role="alert">{bookingError||createInk.error}</p>}
                        <p className="ii-form-note">No payment is taken here. Your booking remains a request until the studio confirms your session and deposit arrangements.</p>
                        {whatsappLink(`Hi, I need help with a ${selectedCategory?.name||'tattoo'} booking request${pickedDate?` for ${pickedDate} at ${pickedTime||'a time to be confirmed'}`:''}.`)&&<a className="ii-text-link" target="_blank" rel="noopener noreferrer" href={whatsappLink(`Hi, I need help with a ${selectedCategory?.name||'tattoo'} booking request${pickedDate?` for ${pickedDate} at ${pickedTime||'a time to be confirmed'}`:''}.`)}>NEED HELP? WHATSAPP THE STUDIO <ArrowUpRight size={14}/></a>}
                      </div>
                    </div>
                  )}
                  {page === "JOURNAL" && (
                    <div className="ii-journal-grid">
                      {journalItems.map(([title, copy, photoId], index) => (
                        <article key={title}>
                          {img(
                            `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=80`,
                            title,
                          )}
                          <span className="ii-kicker">
                            STUDIO NOTES · 0{index + 1}
                          </span>
                          <h2>{title}</h2>
                          <p>{copy}</p>
                          <button
                            className="ii-text-link"
                            onClick={() => go("AFTERCARE")}
                          >
                            READ MORE <ArrowRight />
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                  {page === "CONTACT" && (
                    <div className="ii-contact-grid">
                      <div>
                        <span className="ii-kicker">
                          THE STUDIO DOOR IS OPEN
                        </span>
                        <h2>
                          Come as you are.
                          <br />
                          <em>Leave with a story.</em>
                        </h2>
                        <p>
                          {siteProfile.address}
                          {siteProfile.city ? `, ${siteProfile.city}` : ""}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([siteProfile.address, siteProfile.city].filter(Boolean).join(", "))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ii-map"
                        >
                          <MapPin /> OPEN DIRECTIONS <ArrowUpRight />
                        </a>
                        <a
                          className="ii-contact-line"
                          href={`tel:${siteProfile.phone || ""}`}
                        >
                          <Phone />
                          {siteProfile.phone || "Call the studio"}
                        </a>
                        <p>
                          <Clock /> MON–SAT ·{" "}
                          {siteProfile.workingHoursMonFri || "11:00 AM – 8:00 PM"}
                          <br />
                          SUNDAY · {siteProfile.workingHoursSun || "By appointment"}
                        </p>
                        {siteProfile.whatsapp && (
                          <a
                            className="ii-primary"
                            href={`https://wa.me/${siteProfile.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            MESSAGE ON WHATSAPP <ArrowUpRight />
                          </a>
                        )}
                      </div>
                      <form
                        className="ii-contact-form"
                        onSubmit={async(event) => {
                          event.preventDefault();
                          const values = new FormData(event.currentTarget);
                          const name=String(values.get("name")||'');const email=String(values.get("email")||'');const message=String(values.get("message")||'');
                          const note = `Name: ${name}\nEmail: ${email}\n\n${message}`;
                          if(remote.data?.site_id){try{await enquiry.mutate({siteId:remote.data.site_id,name,email,phone:'',message});setEnquirySent(true);return;}catch{return;}}
                          const digits = (siteProfile.whatsapp || "").replace(/\D/g, "");
                          if (digits)window.open(`https://wa.me/${digits}?text=${encodeURIComponent(note)}`,"_blank","noopener,noreferrer");
                          else if (siteProfile.email)window.location.href = `mailto:${siteProfile.email}?subject=${encodeURIComponent("Studio enquiry")}&body=${encodeURIComponent(note)}`;
                          else beginBooking();
                        }}
                      >
                        <span className="ii-kicker">SEND A NOTE</span>
                        <h2>Let’s talk about it.</h2>
                        {enquirySent&&<p role="status" className="ii-form-note">Your enquiry was sent. The studio will be in touch.</p>}
                        {enquiry.error&&<p role="alert" className="ii-form-note">{enquiry.error}</p>}
                        <label className="ii-field">
                          YOUR NAME
                          <input name="name" required placeholder="Name" />
                        </label>
                        <label className="ii-field">
                          EMAIL ADDRESS
                          <input
                            name="email"
                            type="email"
                            required
                            placeholder="you@example.com"
                          />
                        </label>
                        <label className="ii-field">
                          WHAT’S ON YOUR MIND?
                          <textarea
                            name="message"
                            required
                            rows={4}
                            placeholder="Tell us about your idea..."
                          />
                        </label>
                        <button className="ii-primary" disabled={enquiry.loading||enquirySent}>
                          {enquiry.loading?'SENDING…':enquirySent?'ENQUIRY SENT':'START A CONVERSATION'} <ArrowUpRight />
                        </button>
                      </form>
                      <div className="ii-map-card">
                        <iframe
                          title={`Map to ${siteName}`}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent([siteProfile.address, siteProfile.city].filter(Boolean).join(", ") || "tattoo studio India")}&output=embed`}
                        />
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([siteProfile.address, siteProfile.city].filter(Boolean).join(", "))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPin size={18} />
                          {siteProfile.address || "Visit the studio"} ·{" "}
                          {siteProfile.city || "India"} <ArrowUpRight size={14} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        {page==='HOME'&&<div className="ii-standard-sections"><WebsiteSections profile={siteProfile} services={displayServices} onBook={item=>{const match=enabledCategories.find(category=>category.name===item?.category);beginBooking(match?.slug);}} policies={policies} loyaltyConfig={loyaltyConfig} readOnly sections={['policies']} onCustomerAccount={onCustomerAccount} customerSignedIn={customerSignedIn} onMyBookings={onMyBookings}/></div>}
        {page==='HOME'&&showSection('promo')&&<IronInkPromotions profile={siteProfile} onBookOffer={offer=>beginBooking(offer.category,offer)} onManage={manageSection('marketing')}/>}
        {page==='HOME'&&showSection('videos')&&<IronInkShorts profile={siteProfile} siteSlug={siteSlug} onManage={manageSection('social_connectivity')}/>}
        {page==='HOME'&&showSection('social')&&<IronInkSocial profile={siteProfile} onManage={manageSection('social_connectivity')}/>}
        {page==='HOME'&&showSection('videos')&&<IronInkReels profile={siteProfile} videos={template12Videos} onManage={manageSection('social_connectivity')}/>}
        {page==='HOME'&&showSection('loyalty')&&<IronInkLoyalty profile={siteProfile} loyaltyConfig={loyaltyConfig} siteSlug={siteSlug} customerSignedIn={customerSignedIn} customerName={customerName} onCustomerAccount={onCustomerAccount} onMyBookings={onMyBookings} onManage={manageSection('loyalty')}/>}
        {page==='HOME'&&showSection('share')&&<IronInkShare profile={siteProfile} siteSlug={siteSlug} onManage={manageSection('referral')}/>}
        <footer className="ii-footer">
          <div className="ii-footer-top">
            <div>
              <span className="ii-kicker">LEAVE A MARK.</span>
              <h2>
                Good stories
                <br />
                start with ink.
              </h2>
            </div>
            <button className="ii-primary" onClick={() => beginBooking()}>
              BOOK YOUR SESSION <ArrowUpRight />
            </button>
          </div>
          <div className="ii-footer-main">
            <div className="ii-footer-brand">
              {siteProfile.logoUrl ? (
                <img src={siteProfile.logoUrl} alt={`${siteName} logo`} />
              ) : (
                <span className="ii-logo-mark">
                  I<span>&</span>I
                </span>
              )}
              <p>
                {siteName}
                <small>URBAN TATTOO · BODY ART</small>
              </p>
            </div>
            <div>
              <span className="ii-kicker">FIND US</span>
              <p>
                {siteProfile.address || "Studio address"}
                <br />
                {siteProfile.city || "India"}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([siteProfile.address, siteProfile.city].filter(Boolean).join(", "))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                GET DIRECTIONS ↗
              </a>
            </div>
            <div>
              <span className="ii-kicker">STUDIO HOURS</span>
              <p>
                MON–SAT
                <br />
                {siteProfile.workingHoursMonFri || "11:00 AM – 8:00 PM"}
                <br />
                SUNDAY · BY APPOINTMENT
              </p>
            </div>
            <div>
              <span className="ii-kicker">STAY IN THE LOOP</span>
              {socialLinks.map((link) => {
                const Icon =
                  link.platform === "instagram"
                    ? Instagram
                    : link.platform === "facebook"
                      ? Facebook
                      : Youtube;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Follow ${siteName} on ${link.label} at ${link.handle} (opens in a new tab)`}
                  >
                    <Icon size={16} aria-hidden="true" /> {link.label}
                    {link.handle.startsWith("@") ? ` · ${link.handle}` : ""} ↗
                  </a>
                );
              })}
              {!socialLinks.length && (
                <p className="ii-footer-note">
                  Social profiles are not linked yet.
                </p>
              )}
              {siteProfile.phone && (
                <a href={`tel:${siteProfile.phone.replace(/[^+\d]/g, "")}`}>
                  <Phone size={16} aria-hidden="true" /> {siteProfile.phone}
                </a>
              )}
              {siteProfile.email && (
                <form
                  className="ii-newsletter"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    window.location.href = `mailto:${siteProfile.email}?subject=${encodeURIComponent("Newsletter signup")}&body=${encodeURIComponent(String(data.get("newsletter") || ""))}`;
                  }}
                >
                  <label htmlFor="ii-newsletter-email">
                    STUDIO NOTES BY EMAIL
                  </label>
                  <div>
                    <input
                      id="ii-newsletter-email"
                      name="newsletter"
                      type="email"
                      required
                      placeholder="Your email"
                    />
                    <button
                      type="submit"
                      aria-label="Subscribe to studio newsletter"
                    >
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          <div className="ii-footer-bottom">
            <span>
              © {new Date().getFullYear()} {siteName}. MADE WITH INTENTION.
            </span>
            <button onClick={() => go("AFTERCARE")}>AFTERCARE</button>
            <span>INK WITH CARE. ALWAYS.</span>
          </div>
        </footer>
        <CustomerAppPromotion />
        {lightbox && (
          <div
            className="ii-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Portfolio image"
            onClick={() => setLightbox(null)}
          >
            <button aria-label="Close image" onClick={() => setLightbox(null)}>
              <X />
            </button>
            <img src={lightbox} alt="Tattoo portfolio enlarged" onClick={event=>event.stopPropagation()} />
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
