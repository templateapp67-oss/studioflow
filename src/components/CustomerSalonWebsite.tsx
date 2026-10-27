import {SpecialistCard} from './SpecialistCard';
import {WebsiteLanguageProvider,useWebsiteLanguage} from './WebsiteLanguage';
import {SpecialistWeek,type DirectBookingSlot} from './SpecialistWeek';
import {BeforeAfter} from './BeforeAfter';
import {ExternalReviewFeed} from './ExternalReviewFeed';
import {StylistProfile} from './StylistProfile';
import {photoGallery,type PhotoCategory} from '../lib/photoGallery';
import {GalleryPhotoImage} from './GalleryPhotoImage';
import {AppAnnouncementStrip,CustomerAppPromotion} from './CustomerAppPromotion';
import {SalonBookingsDialog} from './SalonBookingsDialog';
import {CustomerWebsiteHeader} from './CustomerWebsiteHeader';
import {BarberReferenceHero} from './BarberReferenceHero';
import {
 RoopMahalAboutSection,
 RoopMahalBookingBanner,
 RoopMahalBridalHighlight,
 RoopMahalContactSection,
 RoopMahalFooter,
 RoopMahalHero,
 RoopMahalTeamCard,
} from './RoopMahalSections';
import {
 hasValidRoopDuration,
 hasValidRoopPrice,
 isValidRoopService,
 isValidRoopStaff,
 roopMahalBridalServices,
 roopMahalContactSummary,
} from '../lib/roopMahalReference';
import {ServicePhoto} from './ServicePhoto';
import {BARBER_REFERENCE_IMAGES} from '../lib/barberReference';
import {CustomerReviewPanel} from './CustomerReviewPanel';
import {clientExperiences} from '../lib/demoWebsiteContent';
import React,{useEffect,useState} from 'react';
import {CalendarCheck,MapPin,MessageCircle,ShieldCheck,Clock,ArrowUpRight,Check,ChevronLeft,ChevronRight,X} from 'lucide-react';
import type {SalonWebsitePreviewProps} from './SalonWebsitePreview';
import type {SalonService,Stylist} from '../types';
import {CATEGORY_TEMPLATES} from '../categoryTemplates';
import {ACCENT_PALETTES,DEFAULT_CATEGORY_ACCENTS,AccentPaletteKey,getContrastTextColor} from '../themeAccents';
import {websiteSections} from '../lib/websiteContent';
import {WebsiteSections} from './WebsiteSections';
import {BookingModal} from './BookingModal';

const money=(value:number)=>`₹${Number(value||0).toLocaleString('en-IN')}`;
function CustomerSalonWebsiteContent({profile,services,stylists,gallery:inputGallery=[],policies,branding,loyaltyConfig,onCustomerAccount,customerSignedIn,customerName,customerPhotoUrl,onAddAppointment}:SalonWebsitePreviewProps){
 const {t}=useWebsiteLanguage();
 const [directSlot,setDirectSlot]=useState<DirectBookingSlot|undefined>();
 const [myBookings,setMyBookings]=useState(false);
 const [viewStaff,setViewStaff]=useState(()=>new URLSearchParams(typeof location==='undefined'?'':location.search).get('stylist')||'');
 const visible=websiteSections(profile),template=CATEGORY_TEMPLATES[profile.businessType]||CATEGORY_TEMPLATES.hair_salon;
 const palette=ACCENT_PALETTES[(profile.themeAccentKey||DEFAULT_CATEGORY_ACCENTS[profile.businessType]) as AccentPaletteKey]||ACCENT_PALETTES.slate;
 const barber=profile.businessType==='barber';
 const roopMahal=profile.businessType==='beauty_parlour';
 const accent=profile.customAccentColor||(barber?'#c49a6c':roopMahal?'#6D2638':palette.primaryHex);
 const [category,setCategory]=useState('All'),[chosen,setChosen]=useState<Stylist|undefined>(),[service,setService]=useState<SalonService|undefined>(),[booking,setBooking]=useState(false),[photo,setPhoto]=useState<number|null>(null);
 const [brokenGalleryIds,setBrokenGalleryIds]=useState<string[]>([]);
 useEffect(()=>{setCategory('All');setChosen(undefined);setService(undefined);setBooking(false);setBrokenGalleryIds([]);},[profile.businessType]);
 useEffect(()=>{
  if(photo===null||typeof document==='undefined')return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setPhoto(null);};
  document.addEventListener('keydown',onKey);
  return()=>document.removeEventListener('keydown',onKey);
 },[photo]);

 const roopExt=profile as typeof profile&{
  bookingEnabled?:boolean;
  disableImageFallbacks?:boolean;
  bridalHighlightImageUrl?:string|null;
  keepContactSectionVisible?:boolean;
 };

 const roopServices=roopMahal?services.filter(isValidRoopService):services;
 const packages=(roopMahal?roopServices:services).filter(item=>/package|combo|bundle/i.test(`${item.category} ${item.name}`));
 const categories=roopMahal
  ?Array.from(new Set(roopServices.map(s=>(s.category||'').trim()).filter(Boolean)))
  :Array.from(new Set(services.map(s=>s.category||'Signature services')));
 const activeCategory=categories.includes(category)?category:'All';
 const team=roopMahal?stylists.filter(isValidRoopStaff):stylists.filter(s=>s.status!=='Inactive');
 const reviews=clientExperiences(profile);
 const roopReviews=Array.isArray(profile.websiteTestimonials)?profile.websiteTestimonials:reviews;
 const galleryEntries=photoGallery(profile,inputGallery);
 const roopGalleryEntries=roopMahal
  ?galleryEntries.filter(entry=>Boolean(entry?.url?.trim())&&!brokenGalleryIds.includes(entry.id)&&(!roopExt.disableImageFallbacks||!entry.isDemo))
  :galleryEntries;
 const gallery=(roopMahal?roopGalleryEntries:galleryEntries).map(item=>item.url);
 const [galleryCategory,setGalleryCategory]=useState<PhotoCategory|'All'>('All');
 useEffect(()=>{setGalleryCategory('All');setPhoto(null);},[profile.businessType]);
 const roopGalleryCategories=Array.from(new Set(roopGalleryEntries.map(p=>p.category)));
 const activeGalleryCategory=roopMahal
  ?(roopGalleryCategories.includes(galleryCategory as PhotoCategory)?galleryCategory:'All')
  :galleryCategory;

 const whatsapp=profile.whatsapp?.replace(/[^0-9]/g,'');
 const wa=whatsapp?`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello ${profile.businessName}, I would like to enquire about an appointment.`)}`:'';
 const roopBookingFlowAvailable=Boolean(
  typeof onAddAppointment==='function'&&
  roopExt.bookingEnabled!==false&&
  roopServices.length>0
 );
 const book=(selected?:SalonService,specialist?:Stylist)=>{
  if(roopMahal&&!roopBookingFlowAvailable)return;
  const pool=roopMahal?roopServices:services;
  setDirectSlot(undefined);setService(selected||pool[0]);setChosen(current=>specialist||current);setBooking(true);
 };
 const customer=(mode:'signin'|'signup')=>onCustomerAccount?onCustomerAccount(mode):location.assign(`/?customer=1&auth=${mode}&return=${encodeURIComponent(profile.subdomain||'')}`);
 const mapUrl=Number.isFinite(profile.latitude)&&Number.isFinite(profile.longitude)?`https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([profile.address,profile.city,profile.postalCode].filter(Boolean).join(', '))}`;

 const roopContact=roopMahal?roopMahalContactSummary(profile,mapUrl,wa):null;
 const roopShowLocation=roopMahal?Boolean(visible.location&&(roopContact?.hasAnyContactDetail||roopExt.keepContactSectionVisible)):visible.location;
 const roopBridalItems=roopMahal?roopMahalBridalServices(roopServices):[];
 const roopHasBridalImage=roopExt.bridalHighlightImageUrl!==undefined?Boolean(String(roopExt.bridalHighlightImageUrl||'').trim()):!roopExt.disableImageFallbacks;
 const roopShowBridal=Boolean(roopMahal&&visible.services&&(profile.websiteSections as Record<string,boolean>|undefined)?.bridalHighlight!==false&&(roopBridalItems.length>0||roopHasBridalImage));
 const roopShowBookingBanner=Boolean(roopMahal&&visible.bookings&&roopBookingFlowAvailable);
 const roopShowFooter=(profile.websiteSections as Record<string,boolean>|undefined)?.footer!==false;
 const roopHasPolicies=Boolean(visible.policies&&policies&&Object.values(policies).some(v=>Boolean(v?.trim())));
 const roopHasServicesDestination=Boolean(visible.services&&roopServices.length>0);

 const roopAvailableTargets=new Set<string>(['salon-home']);
 if(visible.promo)roopAvailableTargets.add('salon-promo');
 if(visible.services)roopAvailableTargets.add('services-section');
 if(visible.packages)roopAvailableTargets.add('salon-packages');
 if(visible.about)roopAvailableTargets.add('salon-about');
 if(visible.stylists)roopAvailableTargets.add('salon-team');
 if(visible.gallery)roopAvailableTargets.add('salon-lookbook');
 if(visible.testimonials)roopAvailableTargets.add('salon-testimonials');
 if(roopShowLocation)roopAvailableTargets.add('salon-location');
 if(visible.bookings)roopAvailableTargets.add('salon-bookings');
 if(roopHasPolicies)roopAvailableTargets.add('salon-policies');
 if(visible.videos)roopAvailableTargets.add('salon-videos');
 if(visible.loyalty)roopAvailableTargets.add('salon-loyalty');
 if(visible.social)roopAvailableTargets.add('salon-social');
 if(visible.share)roopAvailableTargets.add('salon-share');

 const roopKnowMoreHref=roopAvailableTargets.has('salon-location')
  ?'#salon-location'
  :roopHasServicesDestination
   ?'#services-section'
   :visible.stylists&&team.length>0
    ?'#salon-team'
    :'';

 const dock=[['promo','Offers','salon-promo'],['services','Services','services-section'],['stylists','Our Team','salon-team'],['gallery','Lookbook','salon-lookbook'],['testimonials','Reviews','salon-testimonials'],['location','Location','salon-location']].filter(([key,,id])=>visible[key]&&(!roopMahal||roopAvailableTargets.has(id)));
 const heading=(key:string,fallback:string)=>profile.sectionHeadings?.[key]||fallback;
 const shared={profile,services:roopMahal?roopServices:services,onBook:(selected?:SalonService)=>book(selected),readOnly:true,policies,onMyBookings:()=>setMyBookings(true),loyaltyConfig,customerSignedIn,onCustomerAccount:()=>customer('signin')};

 const gallerySection=visible.gallery&&(
  roopMahal?(
   <section id="salon-lookbook" className="sf-section sf-rm-gallery-section">
    <div className="sf-container">
     <div className="sf-section-heading">
      <div>
       <p className="sf-eyebrow">Beauty &amp; Makeover Portfolio</p>
       <h2>{heading('galleryTitle','Our Beauty Work')}</h2>
       <p className="sf-rm-section-desc">Take a look at our makeup, hair styling and beauty work.</p>
       {roopGalleryEntries.length>0&&(
        <p className="sf-demo-label">{roopGalleryEntries.some(item=>item.isDemo)?'Demo lookbook · Sample styling imagery. Salon photos are labelled separately.':'Studio work & transformations'}</p>
       )}
      </div>
     </div>
     {(profile.comparisonPhotos||[]).length>0&&(
      <div className="sf-comparison-grid">{(profile.comparisonPhotos||[]).map(item=><BeforeAfter item={item} key={item.id}/>)}</div>
     )}
     {roopGalleryEntries.length>0&&roopGalleryCategories.length>0&&(
      <div className="sf-gallery-categories" aria-label="Photo gallery categories">
       {(['All',...roopGalleryCategories] as const).map(cat=><button key={cat} type="button" aria-pressed={activeGalleryCategory===cat} onClick={()=>setGalleryCategory(cat)}>{cat} ({roopGalleryEntries.filter(item=>cat==='All'||item.category===cat).length})</button>)}
      </div>
     )}
     {roopGalleryEntries.length>0?(
      <div className="sf-lookbook-grid sf-rm-lookbook-grid" tabIndex={0} aria-label="Studio lookbook. Swipe or scroll horizontally to explore.">
       {roopGalleryEntries.map((entry,index)=>({entry,index})).filter(({entry})=>activeGalleryCategory==='All'||entry.category===activeGalleryCategory).map(({entry,index},filteredIdx)=>(
        <button key={entry.id} type="button" className={filteredIdx===0?'sf-rm-gallery-featured':undefined} onClick={()=>setPhoto(index)} aria-label={`View salon look ${index+1}`}>
         <img src={entry.url} alt={entry.title} loading="lazy" onError={()=>{setPhoto(cur=>cur===index?null:cur);setBrokenGalleryIds(prev=>prev.includes(entry.id)?prev:[...prev,entry.id]);}}/>
         <span>{entry.category} · {entry.isDemo?'Demo / sample':'Salon photo'}<ArrowUpRight size={16}/></span>
        </button>
       ))}
      </div>
     ):(
      <p className="sf-empty">No gallery photos have been added yet.</p>
     )}
    </div>
   </section>
  ):(
   <section id="salon-lookbook" className="sf-section">
    <div className="sf-container">
     <div className="sf-section-heading">
      <div>
       <p className="sf-eyebrow">Signature looks</p>
       <h2>{heading('galleryTitle',t('Studio Lookbook'))}</h2>
       <p className="sf-demo-label">{galleryEntries.some(item=>item.isDemo)?'Demo lookbook · Sample styling imagery. Salon photos are labelled separately.':'Studio work & transformations'}</p>
      </div>
     </div>
     <div className="sf-comparison-grid">{(profile.comparisonPhotos||[]).map(item=><BeforeAfter item={item} key={item.id}/>)}</div>
     <div className="sf-gallery-categories" aria-label="Photo gallery categories">
      {(['All',...Array.from(new Set(galleryEntries.map(p=>p.category)))] as const).map(cat=><button key={cat} type="button" aria-pressed={galleryCategory===cat} onClick={()=>setGalleryCategory(cat)}>{cat} ({galleryEntries.filter(item=>cat==='All'||item.category===cat).length})</button>)}
     </div>
     <div className="sf-lookbook-grid" tabIndex={0} aria-label="Studio lookbook. Swipe or scroll horizontally to explore.">
      {galleryEntries.map((entry,index)=>({entry,index})).filter(({entry})=>galleryCategory==='All'||entry.category===galleryCategory).map(({entry,index})=>(
       <button key={entry.id} type="button" onClick={()=>setPhoto(index)} aria-label={`View salon look ${index+1}`}>
        <GalleryPhotoImage key={entry.url} photo={entry}/>
        <span>{entry.category} · {entry.isDemo?'Demo / sample':'Salon photo'}<ArrowUpRight size={16}/></span>
       </button>
      ))}
     </div>
     {!galleryEntries.some(entry=>galleryCategory==='All'||entry.category===galleryCategory)&&<p className="sf-empty">No photos in this category.</p>}
    </div>
   </section>
  )
 );

 const testimonialsSection=visible.testimonials&&(
  <section id="salon-testimonials" className={`sf-section${roopMahal?' sf-rm-reviews-section':''}`}>
   <div className="sf-container">
    <div className="sf-section-heading">
     <div>
      <p className="sf-eyebrow">{roopMahal?'Customer Reviews':'The studio, through your eyes'}</p>
      <h2>{heading('testimonialsTitle',roopMahal?'Happy Clients, Happy Smiles':t('Client Experiences'))}</h2>
      <p>{roopMahal?'See what our customers have shared about their experience.':'Client stories and reviews from our studio.'}</p>
     </div>
    </div>
    <ExternalReviewFeed profile={profile}/>
    <CustomerReviewPanel businessType={profile.businessType} slug={profile.subdomain} fallbackReviews={profile.reviewSource&&profile.reviewSource.mode!=='off'?[]:(roopMahal?roopReviews:reviews)} signedIn={customerSignedIn} services={(roopMahal?roopServices:services).map(s=>s.name)} onLogin={()=>customer('signin')}/>
   </div>
  </section>
 );

 return <div className={`sf-page${barber?' sf-barber':''}${roopMahal?' sf-roop-mahal':''}`} data-template={profile.businessType} style={{'--sf-header-height':visible.header?'72px':'0px','--sf-accent':accent,'--sf-accent-text':getContrastTextColor(accent)} as React.CSSProperties}>
  {visible.header&&<CustomerWebsiteHeader profile={profile} signedIn={customerSignedIn} customerName={customerName} customerPhotoUrl={customerPhotoUrl} onAccount={customer} onMyBookings={()=>setMyBookings(true)} onBook={roopMahal?(roopBookingFlowAvailable?()=>book():undefined):()=>book()} bookingAvailable={roopMahal?roopBookingFlowAvailable:true} availableTargets={roopMahal?roopAvailableTargets:undefined} hasTeam={Boolean(visible.stylists&&team.length)}/>}
  <div data-layout="hero" id="salon-home">
   {visible.hero&&(barber?<BarberReferenceHero profile={profile} services={services} team={team} showMetrics={visible.metrics} onBook={book} whatsapp={wa}/>:roopMahal?<RoopMahalHero profile={profile} onBook={roopBookingFlowAvailable?book:undefined} bookingAvailable={roopBookingFlowAvailable} hasServicesTarget={roopHasServicesDestination}/>:<section className="sf-hero"><img className="sf-hero-image" src={profile.coverImageUrl||template.coverImageUrl} alt="Salon studio interior"/><div className="sf-hero-overlay"/><div className="sf-container sf-hero-content"><div className="sf-badges"><span><ShieldCheck size={14}/>Verified checkout</span>{profile.city&&<span><MapPin size={14}/>{profile.city}</span>}<span className="sf-mood"><i/>Rich warm mood</span></div><p className="sf-eyebrow">{template.shortName}</p><h1>{profile.businessName||'Your next look starts here.'}</h1><p className="sf-hero-intro">{profile.tagline||'Thoughtful care. Expert technique. A little time for you.'}</p><div className="sf-hero-actions"><button className="sf-button" onClick={()=>book()}><CalendarCheck size={18}/>{t('Book Appointment')}<ArrowUpRight size={18}/></button>{wa?<a className="sf-button sf-button-whatsapp" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={18}/>WhatsApp Inquiry</a>:profile.phone&&<a className="sf-button sf-button-outline" href={`tel:${profile.phone}`}>Call the studio</a>}</div><p className="sf-hero-note">Secure 25% advance · Balance payable at the salon</p>{visible.metrics&&<div className="sf-hero-facts"><span><Clock size={16}/>{profile.workingHoursMonFri||'View studio hours below'}</span>{services.length>0&&<span>{services.length} services · From {money(Math.min(...services.map(s=>s.price)))}</span>}</div>}</div></section>)}
  </div>
  {dock.length>0&&<nav data-layout="dock" aria-label="Salon quick actions" className="sf-dock"><div className="sf-container sf-dock-scroll">{dock.map(([,label,id])=><a key={id} href={`#${id}`}>{t(label)}<ArrowUpRight size={13}/></a>)}</div></nav>}
  <AppAnnouncementStrip/>
  {visible.promo&&<section className="sf-section sf-offers-section"><div className="sf-container"><WebsiteSections {...shared} sections={['promo']}/></div></section>}
  {visible.services&&(
   roopMahal?(
    <section data-layout="services" id="services-section" className="sf-section sf-rm-services-section">
     <div className="sf-container">
      <div className="sf-section-heading">
       <div>
        <p className="sf-eyebrow">Signature Parlour Menu</p>
        <h2>{heading('servicesTitle','Beauty & Makeover Services')}</h2>
        <p>{heading('servicesSubtitle','Personal skin, hair, beauty and festive makeover services at transparent parlour prices.')}</p>
       </div>
       {roopServices.length>0&&<span className="sf-section-count">{roopServices.length} services</span>}
      </div>
      {roopServices.length>0&&categories.length>0&&(
       <div className="sf-category-tabs" role="group" aria-label="Service categories">
        {['All',...categories].map(item=><button key={item} aria-pressed={activeCategory===item} onClick={()=>setCategory(item)}>{item}</button>)}
       </div>
      )}
      {roopServices.length>0?(
       <div className="sf-service-row" tabIndex={0} aria-label="Service menu. Swipe or scroll horizontally to explore treatments.">
        {roopServices.filter(s=>activeCategory==='All'||(s.category||'').trim()===activeCategory).map(s=>{
         const validPrice=hasValidRoopPrice(s.price);
         const validDuration=hasValidRoopDuration(s);
         const showBottom=validPrice||validDuration||roopBookingFlowAvailable;
         const catLabel=s.category?.trim()||'';
         return (
          <article className="sf-service-card" key={s.id}>
           <ServicePhoto service={s} type={profile.businessType}/>
           {(catLabel||s.popular)&&(
            <div className="sf-card-top">
             {catLabel&&<span className="sf-category-label">{catLabel}</span>}
             {s.popular&&<span className="sf-popular">Popular</span>}
            </div>
           )}
           <h3 tabIndex={0}>{s.name.trim()}</h3>
           {Boolean(s.description?.trim())&&<p tabIndex={0} aria-label={`Description of ${s.name}`}>{s.description.trim()}</p>}
           {showBottom&&(
            <div className="sf-service-bottom">
             {(validPrice||validDuration)&&(
              <div>
               {validPrice&&<strong>{money(s.price)}</strong>}
               {validDuration&&<span><Clock size={13}/>{s.durationMinutes} min</span>}
              </div>
             )}
             {roopBookingFlowAvailable&&<button className="sf-button sf-button-small" onClick={()=>book(s)}>{t('Book Now')}</button>}
            </div>
           )}
          </article>
         );
        })}
       </div>
      ):(
       <p className="sf-empty">The studio is updating its service menu. Contact us for treatment details.</p>
      )}
     </div>
    </section>
   ):(
    <section data-layout="services" id="services-section" className="sf-section"><div className="sf-container"><div className="sf-section-heading"><div><p className="sf-eyebrow">The service edit</p><h2>{heading('servicesTitle',t('Curated Services & Treatments'))}</h2><p>{heading('servicesSubtitle','Expert care, transparent prices. Find the treatment that feels right for you.')}</p></div><span className="sf-section-count">{services.length} services</span></div><div className="sf-category-tabs" role="group" aria-label="Service categories">{['All',...categories].map(item=><button key={item} aria-pressed={activeCategory===item} onClick={()=>setCategory(item)}>{item}</button>)}</div><div className="sf-service-row" tabIndex={0} aria-label="Service menu. Swipe or scroll horizontally to explore treatments.">{services.filter(s=>activeCategory==='All'||(s.category||'Signature services')===activeCategory).map(s=><article className="sf-service-card" key={s.id}><ServicePhoto service={s} type={profile.businessType}/><div className="sf-card-top"><span className="sf-category-label">{s.category||'Signature services'}</span>{s.popular&&<span className="sf-popular">Popular</span>}</div><h3 tabIndex={0}>{s.name}</h3><p tabIndex={0} aria-label={`Description of ${s.name}`}>{s.description}</p><div className="sf-service-bottom"><div><strong>{money(s.price)}</strong>{s.showDuration!==false&&<span><Clock size={13}/>{s.durationMinutes} min</span>}</div><button className="sf-button sf-button-small" onClick={()=>book(s)}>{t('Book')}<ArrowUpRight size={14}/></button></div></article>)}</div>{!services.length&&<p className="sf-empty">The studio is updating its service menu. Contact us for treatment details.</p>}</div></section>
   )
  )}
  {visible.packages&&(
   roopMahal?(
    <section id="salon-packages" className="sf-section sf-packages">
     <div className="sf-container">
      <div className="sf-section-heading">
       <div>
        <p className="sf-eyebrow">A little more time for you</p>
        <h2>{heading('packagesTitle',t('Packages & Signature Rituals'))}</h2>
        <p>Curated combinations from our service catalogue.</p>
       </div>
      </div>
      {packages.length>0?(
       <div className="sf-service-row">
        {packages.map(item=>{
         const validPrice=hasValidRoopPrice(item.price);
         const validDuration=hasValidRoopDuration(item);
         const showBottom=validPrice||validDuration||roopBookingFlowAvailable;
         return (
          <article className="sf-service-card" key={item.id}>
           <ServicePhoto service={item} type={profile.businessType}/>
           {Boolean(item.category?.trim())&&<span className="sf-category-label">{item.category.trim()}</span>}
           <h3 tabIndex={0}>{item.name.trim()}</h3>
           {Boolean(item.description?.trim())&&<p tabIndex={0} aria-label={`Description of ${item.name}`}>{item.description.trim()}</p>}
           {showBottom&&(
            <div className="sf-service-bottom">
             {(validPrice||validDuration)&&(
              <div>
               {validPrice&&<strong>{money(item.price)}</strong>}
               {validDuration&&<span>{item.durationMinutes} min</span>}
              </div>
             )}
             {roopBookingFlowAvailable&&<button className="sf-button sf-button-small" onClick={()=>book(item)}>{t('Book Now')}</button>}
            </div>
           )}
          </article>
         );
        })}
       </div>
      ):(
       <p className="sf-empty">Ask the studio about tailored packages and combinations.</p>
      )}
     </div>
    </section>
   ):(
    <section id="salon-packages" className="sf-section sf-packages"><div className="sf-container"><div className="sf-section-heading"><div><p className="sf-eyebrow">A little more time for you</p><h2>{heading('packagesTitle',t('Packages & Signature Rituals'))}</h2><p>Curated combinations from our service catalogue.</p></div></div>{packages.length?<div className="sf-service-row">{packages.map(item=><article className="sf-service-card" key={item.id}><ServicePhoto service={item} type={profile.businessType}/><span className="sf-category-label">{item.category}</span><h3 tabIndex={0}>{item.name}</h3><p tabIndex={0} aria-label={`Description of ${item.name}`}>{item.description}</p><div className="sf-service-bottom"><div><strong>{money(item.price)}</strong>{item.showDuration!==false&&<span>{item.durationMinutes} min</span>}</div><button className="sf-button sf-button-small" onClick={()=>book(item)}>{t('Book')}<ArrowUpRight size={14}/></button></div></article>)}</div>:<p className="sf-empty">Ask the studio about tailored packages and combinations.</p>}</div></section>
   )
  )}
  {roopMahal&&visible.about&&<RoopMahalAboutSection profile={profile} knowMoreHref={roopKnowMoreHref}/>}
  {roopShowBridal&&<RoopMahalBridalHighlight profile={profile} services={roopServices} hasServicesTarget={roopHasServicesDestination}/>}
  {visible.stylists&&<section data-layout="team" id="salon-team" className={`sf-section sf-section-tint${roopMahal?' sf-rm-team-section':''}`}><div className="sf-container"><div className="sf-section-heading"><div><p className="sf-eyebrow">{roopMahal?'Our Team':'People behind the craft'}</p><h2>{heading('stylistsTitle',roopMahal?'Meet Our Beauty Experts':t('Meet Our Specialists'))}</h2><p>{heading('stylistsSubtitle',roopMahal?'Our team is here to help you look your best for every special moment.':'Find your specialist. Choose them for your next appointment.')}</p></div></div>{(!roopMahal||team.length>0)&&<div className={`sf-team-grid${roopMahal?' sf-rm-team-grid':''}`} tabIndex={0} aria-label="Our specialists. Swipe or scroll horizontally to explore.">{team.map(st=>roopMahal?<RoopMahalTeamCard key={st.id} staff={st} profile={profile} selected={chosen?.id===st.id} bookingAvailable={roopBookingFlowAvailable} onView={()=>setViewStaff(st.id)} onToggle={()=>setChosen(current=>current?.id===st.id?undefined:st)} onBook={()=>{setChosen(st);book(undefined,st)}}/>:<SpecialistCard key={st.id} staff={st} profile={profile} selected={chosen?.id===st.id} onView={()=>setViewStaff(st.id)} onGallery={()=>setViewStaff(st.id)} onToggle={()=>setChosen(current=>current?.id===st.id?undefined:st)} onBook={()=>{setChosen(st);book(undefined,st)}}/>)}</div>}{chosen&&(!roopMahal||roopBookingFlowAvailable)&&<SpecialistWeek key={chosen.id} profile={profile} staff={chosen} services={roopMahal?roopServices:services} onSlot={(selected,slot)=>{setService(selected);setDirectSlot(slot);setBooking(true)}}/>}{!team.length&&<p className="sf-empty">Meet our specialists at your next studio visit.</p>}</div></section>}
  <div data-layout="experiences">
   {roopMahal?<>{gallerySection}{testimonialsSection}</>:<>{testimonialsSection}{gallerySection}</>}
   {['videos','loyalty'].filter(section=>visible[section]).map(section=><section className="sf-section sf-standalone-panel" key={section}><div className="sf-container"><WebsiteSections {...shared} sections={[section]}/></div></section>)}
  </div>
  {!roopMahal&&visible.about&&<section id="salon-about" className="sf-section sf-about-section"><div className={`sf-container sf-about-grid${barber||profile.ownerPhotoUrl?' sf-about-with-photo':''}`}>{(barber||profile.ownerPhotoUrl)&&<div className={`sf-about-photo${barber?' sf-barber-about-photo':''}`}><img src={profile.ownerPhotoUrl||BARBER_REFERENCE_IMAGES.aboutPrimary} alt={profile.ownerPhotoUrl?`${profile.ownerName||'Our specialist'} at the studio`:'Barbershop interior'} loading="lazy"/></div>}<div><p className="sf-eyebrow">{barber?'The craft':'Our studio'}</p><h2>{barber?<>Old-world craftsmanship,<br/><em>modern</em> standards.</>:'About our studio'}</h2><p>{profile.about||`Welcome to ${profile.businessName||'our studio'}. Explore our services and meet the team behind your next visit.`}</p>{barber&&<div className="sf-barber-pillars">{[['Precision','Care shaped around your preferences.'],['Tradition','Timeless grooming rituals and expert technique.'],['Atmosphere','A comfortable studio and time for yourself.']].map(([title,text])=><article key={title}><Check size={17}/><h3>{title}</h3><p>{text}</p></article>)}</div>}</div></div></section>}
  {roopShowBookingBanner&&<RoopMahalBookingBanner profile={profile} bookingAvailable={roopBookingFlowAvailable} onBook={()=>book()}/>}
  {roopMahal?(
   roopShowLocation&&(
    <section data-layout="location" id="salon-location" className="sf-section sf-location sf-rm-location-section">
     <div className="sf-container">
      <RoopMahalContactSection profile={profile} mapUrl={mapUrl} whatsappUrl={wa} headingText={heading('locationTitle','Visit Roop Mahal')}/>
     </div>
    </section>
   )
  ):(
   <section data-layout="location" id="salon-location" className="sf-section sf-location"><div className="sf-container">{visible.location&&<><div className="sf-section-heading"><div><p className="sf-eyebrow">Make time for yourself</p><h2>{heading('locationTitle',t('Location & Studio Hours'))}</h2></div><a className="sf-button sf-button-outline" href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={17}/>{t('Get directions')}<ArrowUpRight size={15}/></a></div><div className="sf-location-grid"><article><h3>Find our studio</h3><address>{[profile.address,profile.city,profile.postalCode].filter(Boolean).join(', ')||'Contact the studio for its address.'}</address>{profile.landmark&&<p>Near {profile.landmark}</p>}{profile.phone&&<a href={`tel:${profile.phone}`}>{profile.phone}</a>}{wa&&<a href={wa} target="_blank" rel="noreferrer">WhatsApp the studio<ArrowUpRight size={14}/></a>}</article><article><h3>Operating hours</h3><dl>{[['Monday – Friday (except Tuesday)',profile.workingHoursMonFri],['Tuesday',profile.workingHoursTue],['Sunday',profile.workingHoursSun]].map(([day,hours])=><div key={day}><dt>{day}</dt><dd>{hours||'Contact studio for hours'}</dd></div>)}</dl><p className="sf-hours-note">All appointments are scheduled in India Standard Time.</p></article></div></>}</div></section>
  )}
  {['bookings','policies'].filter(section=>visible[section]).map(section=><section className="sf-section sf-standalone-panel" key={section}><div className="sf-container"><WebsiteSections {...shared} sections={[section]}/></div></section>)}
  {(visible.social||visible.share)&&<section className="sf-section sf-connections-section"><div className="sf-container"><WebsiteSections {...shared} sections={['social','share']}/></div></section>}
  <CustomerAppPromotion/>
  {roopMahal?(roopShowFooter&&<RoopMahalFooter profile={profile} services={roopServices} branding={branding} mapUrl={mapUrl} whatsappUrl={wa} hasTeam={Boolean(visible.stylists&&team.length)} availableTargets={roopAvailableTargets} bookingAvailable={roopBookingFlowAvailable} onBook={roopBookingFlowAvailable?book:undefined}/>):<footer data-layout="footer" className="sf-footer"><div className="sf-container"><strong>{profile.businessName}</strong><p>{profile.city} · Crafted care, every visit.</p>{branding?.poweredBy&&<small>Powered by {branding.platformName||'StudioFlow'}</small>}<a href="#">Back to top ↑</a></div></footer>}
  {myBookings&&<SalonBookingsDialog profile={profile} onClose={()=>setMyBookings(false)}/>}
  {team.some(st=>st.id===viewStaff)&&<StylistProfile services={roopMahal?roopServices:services} onSlot={(selected,slot)=>{setChosen(team.find(st=>st.id===slot.stylistId));setService(selected);setDirectSlot(slot);setViewStaff('');setBooking(true)}} staff={team.find(st=>st.id===viewStaff)!} profile={profile} slug={profile.subdomain} signedIn={customerSignedIn} demo={!profile.subdomain} onLogin={()=>{setViewStaff('');customer('signin')}} onClose={()=>setViewStaff('')} onBook={()=>{const specialist=team.find(st=>st.id===viewStaff);setViewStaff('');book(undefined,specialist)}}/>}
  {(!roopMahal||roopBookingFlowAvailable)&&<BookingModal isOpen={booking} onClose={()=>setBooking(false)} profile={profile} services={roopMahal?roopServices:services} stylists={team} initialService={service} initialStylist={chosen} initialSlot={directSlot} onAddAppointment={onAddAppointment} themeAccentHex={accent}/>}
  {photo!==null&&gallery.length>0&&photo<gallery.length&&<div className="sf-lightbox" role="dialog" aria-modal="true" aria-label="Studio lookbook" onClick={()=>setPhoto(null)}><button aria-label="Close lookbook" onClick={()=>setPhoto(null)}><X/></button><img src={gallery[photo]} alt={`Studio look ${photo+1}`} onClick={e=>e.stopPropagation()}/><div><button aria-label="Previous photo" onClick={e=>{e.stopPropagation();setPhoto((photo-1+gallery.length)%gallery.length);}}><ChevronLeft/></button><span>{photo+1} / {gallery.length}</span><button aria-label="Next photo" onClick={e=>{e.stopPropagation();setPhoto((photo+1)%gallery.length);}}><ChevronRight/></button></div></div>}
 </div>;
}

export function CustomerSalonWebsite(props:SalonWebsitePreviewProps){return <WebsiteLanguageProvider key={props.profile.subdomain||props.profile.businessType} defaultLanguage={props.profile.defaultWebsiteLanguage}><CustomerSalonWebsiteContent {...props}/></WebsiteLanguageProvider>;}
