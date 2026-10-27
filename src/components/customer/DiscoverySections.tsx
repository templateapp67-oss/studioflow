import {useCustomerDialog} from './BookingFlow';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,Clock,Tag,X} from 'lucide-react';
import {offerExpiry,usePromotionClock} from '../../lib/promotionStatus';
import {roopMahalServiceImage} from '../../lib/roopMahalReference';
import {secureMediaUrl} from '../../lib/socialVideoSource';
import {discoveryFeed,type CustomerOffer} from './discoveryFeed';
import {rupees,type Salon} from './model';
import {CATEGORY_TEMPLATES} from '../../categoryTemplates';

export function DiscoveryPhoto({salon,src,alt}:{salon:Salon;src?:string;alt:string}){
 const resolveSrc=(raw?:string)=>secureMediaUrl(raw)||(salon.content.profile.businessType==='beauty_parlour'&&raw?.startsWith('/templates/roop-mahal/')?raw:'');
 const primary=resolveSrc(src)||resolveSrc(salon.content.profile.coverImageUrl);
 const fallback=CATEGORY_TEMPLATES[salon.content.profile.businessType]?.coverImageUrl||CATEGORY_TEMPLATES.hair_salon.coverImageUrl;
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[primary]);
 return <img src={failed?fallback:primary||fallback} alt={alt} loading="lazy" onError={()=>setFailed(true)}/>;
}

function DiscoveryRow({title,children,banner=false}:{title:string;children:React.ReactNode;banner?:boolean}){
 const row=useRef<HTMLDivElement>(null);
 const move=(direction:number)=>{const el=row.current;if(el)el.scrollBy({left:direction*el.clientWidth*.85,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})};
 return <div className="cr-discovery-slider"><div className="cr-discovery-arrows"><button className="cr-outline cr-icon" aria-label={`Previous ${title}`} onClick={()=>move(-1)}><ChevronLeft size={16}/></button><button className="cr-outline cr-icon" aria-label={`Next ${title}`} onClick={()=>move(1)}><ChevronRight size={16}/></button></div><div ref={row} className={'cr-discovery-row '+(banner?'cr-discount-row':'')} role="region" aria-label={title+' — swipe or use arrows'} tabIndex={0}>{children}</div></div>;
}
const offerBadge=(o:CustomerOffer)=>Number(o.campaign.discountPercent)>0&&Number(o.campaign.discountPercent)<=100?`${o.campaign.discountPercent}% OFF`:'SALON OFFER';
export function DiscoverySections({salons,open,book}:{salons:Salon[];open:(s:Salon)=>void;book:(s:Salon,ids?:string[])=>void}){
 const now=usePromotionClock(),{quick,offers,lastMinute}=discoveryFeed(salons,now);
 const [selected,setSelected]=useState<CustomerOffer|null>(null);
 // Refresh a selected offer from the current shared catalogue; deleted/disabled/expired offers close immediately.
 const current=selected?offers.find(o=>o.salon.slug===selected.salon.slug&&o.service.id===selected.service.id):undefined;
 useEffect(()=>{if(selected&&!current)setSelected(null)},[selected,!!current]);
 return <>
 <section className="cr-quick-services"><div className="cr-row"><div><h2>Quick Services</h2><p className="cr-muted">Services taking 30 minutes or less</p></div><span className="cr-label">≤30 MIN</span></div>{quick.length?<DiscoveryRow title="Quick Services">{quick.map(({salon,service})=><article className="cr-quick-card" key={salon.slug+service.id}><button className="cr-quick-photo" onClick={()=>open(salon)}><DiscoveryPhoto salon={salon} src={service.imageUrl||(salon.content.profile.businessType==='beauty_parlour'?roopMahalServiceImage(service):undefined)} alt={service.name}/>{salon.demoTemplateId&&<span>TEMPLATE DEMO</span>}</button><div><h3>{service.name}</h3><p className="cr-muted"><Clock size={11}/>{service.durationMinutes}m</p><small>{salon.content.profile.businessName}</small><strong>{rupees(service.price)}</strong><button className="cr-primary cr-wide" onClick={()=>salon.demoTemplateId?open(salon):book(salon,[service.id])}>{salon.demoTemplateId?'View Demo':'Book Slot'}</button></div></article>)}</DiscoveryRow>:<p className="cr-panel cr-muted">No services under 30 minutes match this category. Explore the salon’s full menu below.</p>}</section>
 <section className="cr-special-discounts"><h2>Special Discounts <Tag size={14}/></h2>{offers.length?<DiscoveryRow title="Special Discounts" banner>{offers.map(o=><button className="cr-discount-banner" key={o.salon.slug} onClick={()=>setSelected(o)}><DiscoveryPhoto salon={o.salon} src={o.campaign.imageUrl} alt=""/><span className="cr-discount-copy"><small>{o.demo?'TEMPLATE DEMO · SAMPLE OFFER':offerBadge(o)}</small><strong>{o.campaign.headline||o.campaign.customOfferText||'Salon special'}</strong><span>{o.service.name}</span><b>{o.salon.content.profile.businessName} <ArrowRight size={16}/></b></span></button>)}</DiscoveryRow>:<p className="cr-panel cr-muted">New discounts will appear here when salons publish an offer.</p>}</section>
 <section className="cr-last-minute"><h2>Last-Minute Deals</h2><p className="cr-muted">Explore limited-time salon offers</p>{lastMinute.length?<DiscoveryRow title="Last-Minute Deals">{lastMinute.map(o=><article className="cr-deal-card" key={o.salon.slug}><button className="cr-deal-photo" onClick={()=>setSelected(o)}><DiscoveryPhoto salon={o.salon} src={o.campaign.imageUrl} alt={o.salon.content.profile.businessName}/><span>{o.demo?'SAMPLE DEAL':offerBadge(o)}</span><small><Clock size={10}/>{o.demo?'Template demo':offerExpiry(o.campaign.endsAt!,now)}</small></button><div><h3>{o.salon.content.profile.businessName}</h3><p className="cr-muted">{o.demo?'Sample city · ':''}{o.salon.content.profile.city||'View salon details'}</p><p>{o.service.name}</p><div className="cr-row"><strong>{rupees(o.service.price)}<small>{o.demo?'Sample service price':'Published service price'}</small></strong><button className="cr-primary cr-tiny" onClick={()=>setSelected(o)}>View Offer</button></div></div></article>)}</DiscoveryRow>:<p className="cr-panel cr-muted">No offers ending in the next 24 hours right now. Check Special Discounts for other offers.</p>}</section>
 {current&&<OfferDetails key={current.salon.slug} current={current} now={now} close={()=>setSelected(null)} open={open}/>}
 </>;
}

function OfferDetails({current,now,close,open}:{key?:React.Key;current:CustomerOffer;now:number;close:()=>void;open:(s:Salon)=>void}){
 const dialog=useCustomerDialog(close);
 return <div className="cr-overlay"><section ref={dialog} className="cr-panel cr-offer-dialog" role="dialog" aria-modal="true" aria-label="Salon offer details"><button className="cr-icon" aria-label="Close offer details" onClick={close}><X size={18}/></button><span className="cr-label">{current.demo?'TEMPLATE DEMO · SAMPLE OFFER':offerBadge(current)}</span><h2>{current.campaign.headline||'Salon special'}</h2><h3>{current.salon.content.profile.businessName}</h3><p>{current.campaign.customOfferText}</p><p>{current.service.name} · {current.service.durationMinutes} mins</p>{current.campaign.promoCode&&<p>Offer code: <strong>{current.campaign.promoCode}</strong></p>}{!current.demo&&current.campaign.endsAt&&<p>{offerExpiry(current.campaign.endsAt,now)}</p>}<p className="cr-notice">{current.demo?'Sample promotion for this website template. No payment or appointment is created.':`Published service price: ${rupees(current.service.price)}. Confirm offer terms with the salon. The booking summary shows the amount payable; promotional codes are not applied automatically.`}</p><button className="cr-primary cr-wide" onClick={()=>{close();open(current.salon)}}>{current.demo?'Explore Template Demo':'View Salon & Services'}</button></section></div>;
}
