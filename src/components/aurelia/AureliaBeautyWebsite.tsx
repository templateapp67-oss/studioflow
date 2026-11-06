import React, {useMemo, useState} from 'react';
import {ArrowDown, ArrowRight, ChevronRight, Clock, MapPin, Menu, MessageCircle, Sparkles, Star, X} from 'lucide-react';
import {BookingModal} from '../BookingModal';
import {SalonBookingsDialog} from '../SalonBookingsDialog';
import {CustomerReviewPanel} from '../CustomerReviewPanel';
import {AppAnnouncementStrip, AppInstallSection} from '../AppInstallSection';
import {StylistProfile} from '../StylistProfile';
import {WebsiteSections} from '../WebsiteSections';
import {ServicePhoto} from '../ServicePhoto';
import {GalleryPhotoImage} from '../GalleryPhotoImage';
import {CATEGORY_TEMPLATES} from '../../categoryTemplates';
import {CATEGORY_STANDARDIZED_DATA} from '../../templateData';
import {AURELIA_DEFAULT_OFFERS, AURELIA_DEFAULT_STAFF, AURELIA_IMAGES, aureliaConfigFor} from '../../lib/aureliaBeauty';
import {isPackage} from '../../lib/packageCatalogue';
import {photoGallery} from '../../lib/photoGallery';
import {reelSource, secureMediaUrl} from '../../lib/socialVideoSource';
import type {SalonService, Stylist, SalonOffer} from '../../types';
import type {SalonWebsitePreviewProps} from '../SalonWebsitePreview';
import './aureliaBeauty.css';
import { ServiceMerchTags, ServiceTerms } from '../ServiceMerchandising';

const money=(value:number)=>'₹'+Number(value||0).toLocaleString('en-IN');

export function AureliaBeautyWebsite(props:SalonWebsitePreviewProps){
 const {profile}=props;
 const config=aureliaConfigFor(profile);
 const services=useMemo(()=>props.services.length?props.services:(!profile.subdomain&&!profile.serviceCatalogueInitialized?CATEGORY_TEMPLATES.aurelia_beauty_parlour.services:[]),[props.services,profile.subdomain,profile.serviceCatalogueInitialized]);
 const stylists=useMemo(()=>props.stylists.length?props.stylists:(!profile.subdomain?AURELIA_DEFAULT_STAFF:[]),[props.stylists,profile.subdomain]);
 const offers=(profile.promoOffers===undefined?AURELIA_DEFAULT_OFFERS:profile.promoOffers).filter((offer:SalonOffer)=>offer.isActive && (!offer.validTo || offer.validTo>=new Date().toISOString().slice(0,10)));
 const galleryEntries=useMemo(()=>photoGallery(profile,props.gallery||[]),[profile,props.gallery]);
 const videos=(profile.socialVideos||[]).filter(item=>Boolean(secureMediaUrl(item.previewVideoUrl)||reelSource(item)));
 const packages=services.filter(isPackage);
 const [booking,setBooking]=useState(false);
 const [myBookings,setMyBookings]=useState(false);
 const [mobileNav,setMobileNav]=useState(false);
 const [selectedService,setSelectedService]=useState<SalonService|undefined>();
 const [selectedStylist,setSelectedStylist]=useState<Stylist|undefined>();
 const [profileStylist,setProfileStylist]=useState<Stylist|undefined>();
 const [activePhoto,setActivePhoto]=useState<string|null>(null);
 const [galleryCategory,setGalleryCategory]=useState('All');
 const bookingAvailable=Boolean(props.onAddAppointment && profile.subdomain && (profile as typeof profile & {bookingEnabled?:boolean}).bookingEnabled!==false && services.length>0);
 const wa=profile.whatsapp?.replace(/\D/g,'')||'';
 const waUrl=wa?'https://wa.me/'+wa+'?text='+encodeURIComponent('Hello '+profile.businessName+', I would like to book an appointment.'):'';
 const book=(service?:SalonService,stylist?:Stylist)=>{
   if(!bookingAvailable)return;
   setSelectedService(service);
   setSelectedStylist(stylist);
   setBooking(true);
 };
 const nav=[['services','Services'],['packages','Packages'],['story','Our story'],['team','Our artists'],['gallery','Gallery'],['offers','Offers'],['contact','Visit us']];
 const show=(key:string)=> (profile.websiteSections as Record<string,boolean>|undefined)?.[key]!==false;
 const homeServices=config.homeServices||[];
 const orderedKeys=['hero','services','packages','story','team','menu','gallery','videos','offers','homeServices','reviews','contact'];
 const sectionOrder=config.sectionOrder?.length?config.sectionOrder:orderedKeys;
 const sectionStyle=(key:string)=>({order:(sectionOrder.indexOf(key)>=0?sectionOrder.indexOf(key):orderedKeys.length+orderedKeys.indexOf(key))});
 const galleryCategories=['All',...Array.from(new Set(galleryEntries.map(item=>item.category)))];
 const sharedSections=['promo','videos','loyalty','policies','bookings','social','share'] as const;
 const sharedProfile={...profile,sectionHeadings:{...profile.sectionHeadings,videosTitle:profile.sectionHeadings?.videosTitle||config.videosHeading}};
 const fallbackReviews=CATEGORY_STANDARDIZED_DATA.aurelia_beauty_parlour.reviews;
 return <div className="aurelia-site" style={{'--au-bg':config.backgroundColor||'#f6f1ea','--au-ink':config.inkColor||'#1d1612','--au-gold':config.accentColor||'#d9b98f','--au-line':config.lineColor||'#d8c8b4','--font-aurelia-display':config.displayFont||'Georgia, serif','--font-aurelia-sans':config.bodyFont||'Arial, sans-serif'} as unknown as React.CSSProperties}>
  {show('announcement')&&<div className="aurelia-announcement">{config.announcementText||'A little more time for yourself. Discover the Aurelia experience.'}</div>}
  {show('header')&&<header className="aurelia-header">
   <a className="aurelia-wordmark" href="#aurelia-home" aria-label="Aurelia home">{profile.logoUrl?<img src={profile.logoUrl} alt={profile.businessName}/>:<><span>{profile.businessName||'AURELIA'}</span><small>BEAUTY · HAIR · WELLNESS</small></>}</a>
   <nav id="aurelia-main-nav" className={mobileNav?'aurelia-nav is-open':'aurelia-nav'} aria-label="Main navigation">{nav.map(([id,label])=><a key={id} href={id==='packages'?'#salon-packages':'#aurelia-'+id} onClick={()=>setMobileNav(false)}>{label}</a>)}
    {props.customerSignedIn?<><button type="button" className="aurelia-mobile-account" aria-label="Manage your customer account" onClick={()=>{setMobileNav(false);props.onCustomerAccount?.('signin');}}>{props.customerName||'My profile & settings'}</button><button type="button" className="aurelia-mobile-account" onClick={()=>{setMobileNav(false);setMyBookings(true);}}>My Bookings</button></>:<div className="aurelia-mobile-account-group"><button type="button" className="aurelia-mobile-account" onClick={()=>{setMobileNav(false);props.onCustomerAccount?.('signin');}}>Customer Login</button><button type="button" className="aurelia-mobile-account" onClick={()=>{setMobileNav(false);props.onCustomerAccount?.('signup');}}>Sign up</button></div>}
   </nav>
   <div className="aurelia-header-actions" role="group" aria-label="Customer account">
    {props.customerSignedIn?<>
     <button type="button" className="aurelia-account aurelia-profile-account" aria-label="Manage your customer account" onClick={()=>props.onCustomerAccount?.('signin')}>
      {props.customerPhotoUrl&&<img src={props.customerPhotoUrl} alt="" loading="lazy"/>}
      <span>{props.customerName||'My profile & settings'}</span><span className="sr-only">My profile &amp; settings</span>
     </button>
     <button type="button" className="aurelia-account aurelia-bookings-account" onClick={()=>setMyBookings(true)}>My Bookings</button>
    </>:<div className="aurelia-account-group"><button type="button" className="aurelia-account" onClick={()=>props.onCustomerAccount?.('signin')}>Customer Login</button><button type="button" className="aurelia-account" onClick={()=>props.onCustomerAccount?.('signup')}>Sign up</button></div>}
    <button className="aurelia-book-link" disabled={!bookingAvailable} onClick={()=>book()}>{bookingAvailable?'Book a visit':'Booking after publish'}</button>
   </div>
   <button className="aurelia-menu-toggle" aria-label="Open navigation" aria-expanded={mobileNav} aria-controls="aurelia-main-nav" onClick={()=>setMobileNav(v=>!v)}>{mobileNav?<X/>:<Menu/>}</button>
  </header>}
  <AppAnnouncementStrip/>
  <main className="aurelia-main">
   {show('hero')&&<section style={sectionStyle('hero')} className="aurelia-hero" id="aurelia-home">
    <div className="aurelia-hero-copy">
     <p className="aurelia-eyebrow">{config.heroEyebrow||'AURELIA · BANDRA WEST, MUMBAI'}</p>
     <h1>{config.heroHeading||'Beauty, considered.'}</h1>
     <p className="aurelia-hero-lead">{config.heroSubtext||profile.tagline}</p>
     <div className="aurelia-hero-actions"><button onClick={()=>book()} disabled={!bookingAvailable}>Book your visit <ArrowRight size={15}/></button><a href="#aurelia-services">Explore services <ArrowDown size={14}/></a></div>
     <div className="aurelia-rating"><span><Star size={13} fill="currentColor"/> 4.9</span><span>Thoughtful beauty, every visit</span></div>
    </div>
    <div className="aurelia-hero-visual"><img src={config.heroImageUrl||profile.coverImageUrl||AURELIA_IMAGES.hero} alt="Aurelia luxury beauty studio" onError={e=>{e.currentTarget.src=AURELIA_IMAGES.hero;}}/><div className="aurelia-hero-note"><Sparkles size={14}/><span>{config.heroBadge||'A quiet kind of luxury'}</span></div><div className="aurelia-hero-index">01 / 06</div></div>
   </section>}
   {show('services')&&<section style={sectionStyle('services')} className="aurelia-section aurelia-services" id="aurelia-services">
    <div className="aurelia-section-heading"><div><p className="aurelia-eyebrow">THE AURELIA EDIT</p><h2>{config.servicesHeading||'A little time, just for you.'}</h2></div><p>From a fresh cut to a restorative skin ritual, every service begins with a conversation.</p></div>
    <div className="aurelia-service-grid">{services.map((service,index)=><article className="aurelia-service-card" key={service.id}><button type="button" className="aurelia-service-image" onClick={()=>book(service)} aria-label={'Book '+service.name}><ServicePhoto service={service} type="aurelia_beauty_parlour"/><span>{String(index+1).padStart(2,'0')}</span></button><div className="aurelia-service-info"><p>{service.category}</p><h3>{service.name}</h3>{service.description&&<p className="aurelia-service-description">{service.description}</p>}<ServiceMerchTags service={service} className="sf-merch-inline" /><ServiceTerms service={service} className="sf-merch-inline" /><div><span>{service.price==null?'On request':money(Number(service.price))}</span>{service.showDuration!==false&&<small><Clock size={12}/>{service.durationMinutes} min</small>}</div><button type="button" onClick={()=>book(service)} disabled={!bookingAvailable}>View &amp; book <ArrowRight size={14}/></button></div></article>)}</div>
   </section>}
   {show('packages')&&<section style={sectionStyle('packages')} className="aurelia-section aurelia-packages" id="salon-packages"><div className="aurelia-section-heading"><div><p className="aurelia-eyebrow">THE AURELIA COLLECTION</p><h2>{profile.sectionHeadings?.packagesTitle||'Packages & Signature Rituals'}</h2></div><p>Thoughtfully paired services with transparent starting prices. Confirm inclusions with the studio before booking.</p></div>{packages.length?<div className="aurelia-package-grid">{packages.map(item=><article className="sf-service-card aurelia-package-card" key={item.id}><ServicePhoto service={item} type="aurelia_beauty_parlour"/><div className="aurelia-package-copy"><span>{item.category}</span><h3>{item.name}</h3><p>{item.description}</p><div className="aurelia-package-meta"><strong>{money(Number(item.price||0))}</strong><small>{item.durationMinutes} min</small></div><button type="button" onClick={()=>book(item)} disabled={!bookingAvailable}>Book package <ArrowRight size={14}/></button></div></article>)}</div>:<p className="aurelia-empty">Ask the studio about tailored packages and combinations.</p>}</section>}
   {show('about')&&<section style={sectionStyle('story')} className="aurelia-story aurelia-section" id="aurelia-story"><div className="aurelia-story-image"><img src={config.storyImageUrl||AURELIA_IMAGES.story} alt="Aurelia beauty artist at work"/></div><div className="aurelia-story-copy"><p className="aurelia-eyebrow">{config.storyEyebrow||'THE AURELIA STORY'}</p><h2>{config.storyHeading||'A softer way to feel your best.'}</h2><p>{config.storyText||profile.about}</p><div className="aurelia-story-signature"><span>{profile.ownerName||'The Aurelia team'}</span><small>{profile.ownerRole||'Creative beauty team'}</small></div><a href="#aurelia-team">Meet the artists <ArrowRight size={14}/></a></div></section>}
   {show('stylists')&&<section style={sectionStyle('team')} className="aurelia-section aurelia-team" id="aurelia-team"><div className="aurelia-section-heading"><div><p className="aurelia-eyebrow">THE ARTISTS</p><h2>{config.teamHeading||'Your beauty. Expert hands.'}</h2></div><p>Choose your artist, or let us match you with the right specialist.</p></div><div className="aurelia-team-grid">{stylists.filter(person=>person.status!=='Inactive').map(person=><article className="aurelia-team-card h-80 w-full aspect-[3/4] overflow-hidden" key={person.id}><img src={person.avatarUrl||AURELIA_IMAGES.ananya} alt={person.name} className="w-full h-full object-cover"/><div><p>{person.role}</p><h3>{person.name}</h3><small>{(person.specialties||[]).slice(0,2).join(' · ')}</small>{person.experienceYears!==undefined&&<small className="aurelia-team-experience">{person.experienceYears} years of experience</small>}<button type="button" onClick={()=>setProfileStylist(person)}>View profile &amp; reviews</button><button type="button" onClick={()=>book(undefined,person)} disabled={!bookingAvailable}>Book with {person.name.split(' ')[0]} <ArrowRight size={14}/></button></div></article>)}</div></section>}
   {show('packages')&&<section style={sectionStyle('menu')} className="aurelia-menu-section" id="aurelia-menu"><div className="aurelia-section aurelia-menu-inner"><div><p className="aurelia-eyebrow">THE SERVICE MENU</p><h2>{config.menuHeading||'Simple choices. Beautifully done.'}</h2><p>All prices are starting prices in INR. Your artist will confirm the final service after consultation.</p></div><div className="aurelia-menu-list">{services.map(service=><button key={service.id} onClick={()=>book(service)} disabled={!bookingAvailable}><span><b>{service.name}</b><small>{service.category}{service.showDuration!==false?` · ${service.durationMinutes} min`:''}</small></span><strong>{service.price==null?'On request':money(Number(service.price))}</strong><ChevronRight size={16}/></button>)}</div></div></section>}
   {show('gallery')&&<section style={sectionStyle('gallery')} className="aurelia-section" id="aurelia-gallery"><div className="aurelia-section-heading"><div><p className="aurelia-eyebrow">THE LOOKBOOK</p><h2>{config.galleryHeading||'A glimpse of Aurelia.'}</h2></div><p>{galleryEntries.some(item=>item.isDemo)&&<strong>Demo lookbook · Sample imagery. </strong>}Small details, thoughtful spaces and work we love.</p></div><div className="aurelia-gallery-filters" role="group" aria-label="Photo gallery categories">{galleryCategories.map(category=><button type="button" key={category} aria-pressed={galleryCategory===category} onClick={()=>setGalleryCategory(category)}>{category} ({galleryEntries.filter(item=>category==='All'||item.category===category).length})</button>)}</div><div className="aurelia-gallery-grid">{galleryEntries.map((entry,index)=>({entry,index})).filter(({entry})=>galleryCategory==='All'||entry.category===galleryCategory).map(({entry,index})=><button type="button" key={entry.id} aria-label={`View salon look ${index+1}: ${entry.title}`} onClick={()=>setActivePhoto(entry.url)}><GalleryPhotoImage photo={entry}/><span>{entry.title}</span></button>)}</div>{!galleryEntries.some(entry=>galleryCategory==='All'||entry.category===galleryCategory)&&<p className="aurelia-empty">No photos in this category.</p>}</section>}
   {show('videos')&&<section data-section="videos" style={sectionStyle('videos')} className="aurelia-video-section" id="aurelia-videos"><div className="aurelia-section aurelia-video-inner"><div className="aurelia-section-heading"><div><p className="aurelia-eyebrow">IN MOTION</p><h2>{profile.sectionHeadings?.videosTitle||config.videosHeading||'The moments in between.'}</h2></div><p>{profile.sectionHeadings?.videosSubtitle||'Short films and studio stories selected by your team.'}</p></div>{videos.length?<div className="aurelia-video-grid">{videos.slice(0,4).map(video=>{const preview=secureMediaUrl(video.previewVideoUrl),source=reelSource(video);return <article key={video.id}><img src={secureMediaUrl(video.thumbnailUrl)||AURELIA_IMAGES.galleryStudio} alt={video.title} loading="lazy" decoding="async"/><div><span>{video.categoryTag||'STUDIO STORY'}</span><h3>{video.title}</h3>{preview?<video src={preview} controls preload="metadata"/>:source&&<a href={source.url} target="_blank" rel="noopener noreferrer">Watch video <ArrowRight size={13}/></a>}</div></article>})}</div>:<div className="aurelia-video-empty"><p>No studio videos have been added yet. The salon owner can add approved videos from the website content editor.</p></div>}</div></section>}
   {show('promo')&&<section style={sectionStyle('offers')} className="aurelia-section" id="aurelia-offers"><div className="aurelia-section-heading"><div><p className="aurelia-eyebrow">AURELIA PRIVILEGES</p><h2>{config.offersHeading||'A little something extra.'}</h2></div><p>Special studio offers. Ask us to confirm details before booking.</p></div><div className="aurelia-offer-grid">{offers.map(offer=><article className="aurelia-offer-card" key={offer.id}><img src={offer.image} alt={offer.title}/><div><span>{offer.isDemo?'SAMPLE OFFER':offer.badge||'STUDIO OFFER'}</span><h3>{offer.title}</h3><p>{offer.description}</p><strong>{offer.offerType==='percent'?offer.discountValue+'% off':money(offer.offerPriceINR)}</strong><button onClick={()=>book(services.find(s=>offer.applicableServices.includes(s.id)))} disabled={!bookingAvailable}>Ask about this offer <ArrowRight size={14}/></button></div></article>)}</div></section>}
   {show('homeServices')&&homeServices.length>0&&<section style={sectionStyle('homeServices')} className="aurelia-section aurelia-home-services"><div className="aurelia-section-heading"><div><p className="aurelia-eyebrow">AT YOUR DOORSTEP</p><h2>Beauty, brought to you.</h2></div><p>Selected services that can be arranged at home. Availability is confirmed by the studio.</p></div><div className="aurelia-home-grid">{homeServices.map(item=><article key={item.title}><img src={item.imageUrl} alt={item.title}/><div><h3>{item.title}</h3><p>{item.description}</p><small>{money(item.price)} · {item.duration}</small><button onClick={()=>{const match=services.find(s=>s.name===item.serviceName)||services.find(s=>s.category===item.category);book(match);}} disabled={!bookingAvailable}>Enquire <ArrowRight size={13}/></button></div></article>)}</div></section>}
   {show('testimonials')&&<section style={sectionStyle('reviews')} className="aurelia-reviews" id="aurelia-reviews"><div className="aurelia-section"><div className="aurelia-section-heading"><div><p className="aurelia-eyebrow">KIND WORDS</p><h2>{config.reviewsHeading||'Kind words, honestly shared.'}</h2></div><p>Real experiences make the best recommendation.</p></div><div className="aurelia-review-grid">{(profile.websiteTestimonials?.length?profile.websiteTestimonials.map((item,index)=>({id:String(item.id||index),name:item.name||'Guest',rating:item.rating||5,quote:item.comment||''})).filter(item=>item.quote):fallbackReviews).slice(0,3).map(review=><article key={review.id}><div>{[1,2,3,4,5].map(i=><Star key={i} size={13} fill="currentColor"/>)}</div><blockquote>“{review.quote}”</blockquote><span>{review.name}</span></article>)}</div><CustomerReviewPanel businessType={profile.businessType} slug={profile.subdomain} fallbackReviews={[]} signedIn={props.customerSignedIn} services={services.map(s=>s.name)} onLogin={()=>props.onCustomerAccount?.('signin')}/></div></section>}
   {sharedSections.filter(section=>section!=='videos'&&show(section)&&(section!=='promo'||Boolean(profile.promoCampaign))).map(section=><section key={section} style={sectionStyle(section)} className={`aurelia-shared-section aurelia-shared-section--${section}`}><WebsiteSections profile={profile} services={services} onBook={book} policies={props.policies} loyaltyConfig={props.loyaltyConfig} readOnly sections={[section]} onCustomerAccount={()=>props.onCustomerAccount?.('signin')} customerSignedIn={props.customerSignedIn} onMyBookings={()=>setMyBookings(true)}/></section>)}
   {show('location')&&<section style={sectionStyle('contact')} className="aurelia-contact aurelia-section" id="aurelia-contact"><div><p className="aurelia-eyebrow">FIND YOUR WAY</p><h2>{config.contactHeading||'Your time at Aurelia.'}</h2><p>{[profile.address,profile.areaLocality,profile.city,profile.postalCode].filter(Boolean).join(', ')}</p><p>{profile.phone||profile.whatsapp}</p><p>{config.workingHoursDisplay||profile.workingHoursMonFri||'Monday – Saturday · 10:00 AM – 8:00 PM'}</p><div><button onClick={()=>book()} disabled={!bookingAvailable}>Book an appointment <ArrowRight size={14}/></button>{waUrl&&<a href={waUrl} target="_blank" rel="noreferrer"><MessageCircle size={14}/> WhatsApp</a>}</div></div><div className="aurelia-contact-mark"><span>A</span><small>BEAUTY · HAIR · WELLNESS</small><MapPin size={16}/></div></section>}
  </main>
  <AppInstallSection/>
  {show('footer')&&<footer className="aurelia-footer"><div className="aurelia-footer-brand"><span>{profile.businessName||'AURELIA'}</span><small>Beauty · Hair · Wellness</small></div><p>{profile.city} · {profile.phone}</p>{props.branding?.poweredBy&&<small>Powered by {props.branding.platformName||'NEXORA'}</small>}<a href="#aurelia-home">Back to top ↑</a></footer>}
  {waUrl&&<a className="aurelia-whatsapp" href={waUrl} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><MessageCircle/></a>}
  {myBookings&&<SalonBookingsDialog profile={profile} onClose={()=>setMyBookings(false)}/>}
  {profileStylist&&<StylistProfile staff={profileStylist} profile={profile} slug={profile.subdomain} signedIn={props.customerSignedIn} demo={!profile.subdomain} services={services} onLogin={()=>props.onCustomerAccount?.('signin')} onClose={()=>setProfileStylist(undefined)} onBook={()=>{const staff=profileStylist;setProfileStylist(undefined);book(undefined,staff);}}/>}
  {activePhoto&&<div className="aurelia-overlay" role="dialog" aria-modal="true" aria-label="Aurelia gallery photo" onClick={()=>setActivePhoto(null)}><button onClick={()=>setActivePhoto(null)} aria-label="Close gallery"><X/></button><img src={activePhoto} alt="Aurelia gallery" onClick={e=>e.stopPropagation()}/></div>}
  <BookingModal isOpen={booking} onClose={()=>setBooking(false)} profile={profile} services={services} stylists={stylists} initialService={selectedService} initialStylist={selectedStylist} onAddAppointment={props.onAddAppointment} themeAccentHex={profile.customAccentColor||'#D9B98F'}/>
 </div>;
}
