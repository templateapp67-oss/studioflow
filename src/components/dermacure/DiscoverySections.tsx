import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Play } from 'lucide-react';
import { reelSource } from '../../lib/socialVideoSource';
import { isPackage } from '../../lib/packageCatalogue';
import { clinicPriceIsVerified, clinicPriceLabel, dermacureFeatured, clinicPhone } from '../../lib/dermacureContent';
import { promotionActive, usePromotionClock } from '../../lib/promotionStatus';
import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from './EditorialImage';
import { treatmentImage, fade, stagger } from './animation';
import { useDermacure } from './context';
import type { SocialVideo } from '../../types';

export function PopularTreatments() {
  const {services,profile,visible,bookingAvailable,onBook,enquire,reduced}=useDermacure();
  if(!visible.services) return null;
  const featured=dermacureFeatured(profile,services);
  const others=services.filter(s=>!isPackage(s) && !featured.some(f=>f.id===s.id)).slice(0,4);
  const reveal=typeof window!=='undefined' && 'IntersectionObserver' in window && !reduced;
  return <section className="dc-section dc-popular" id="popular-treatments"><div className="dc-container"><p className="dc-eyebrow"><span/>EXPLORE THE MENU</p><h2>Popular <em>Treatments</em></h2><p>More treatments from the clinic’s current menu.</p>{others.length ? <motion.div className="dc-popular-grid" variants={stagger} initial={reveal?'hidden':false} whileInView={reveal?'show':undefined} viewport={{once:true,amount:0.1}}>{others.map(s=><motion.article variants={fade} className="dc-popular-card" key={s.id}><EditorialImage src={s.imageUrl||treatmentImage(s)} fallback={treatmentImage(s)} alt={s.clinicDemoData ? `${s.name} — illustrative demo image` : s.imageUrl ? s.name : `${s.name} — illustrative treatment image`} width="600" height="400" loading="lazy"/><div><p className="dc-card-category">{s.category}</p><h3>{s.name}</h3><p>{s.description}</p><small>{clinicPriceLabel(s,profile.currency||'₹')}{s.showDuration!==false&&s.durationMinutes>0?` · ${s.durationMinutes} min`:''}</small><button className="dc-text-link" onClick={()=>bookingAvailable&&clinicPriceIsVerified(s)?onBook(s):enquire(s)}>{bookingAvailable&&clinicPriceIsVerified(s)?'Book treatment':'Enquire'} <ArrowUpRight size={16}/></button></div></motion.article>)}</motion.div> : <p>Explore the signature treatments and complete menu for current services.</p>}</div></section>;
}

export { ClinicTreatmentStories as TreatmentStories } from './ClinicTreatmentStories';

export { CurrentOffers } from './ClinicOffers';

const defaultFaq = [
  {id:'suitability',question:'How do I know which treatment is suitable?',answer:'Discuss your concerns and expectations with the clinic before choosing a treatment.',published:true},
  {id:'fee',question:'What is the consultation fee?',answer:'Please contact the clinic for consultation fees, or check the consultation service if a fee is listed in the menu.',published:true},
  {id:'booking',question:'How do I book an appointment?',answer:'Choose an available service and appointment time, then complete the booking steps. Your appointment is not confirmed until checkout confirms it.',published:true},
  {id:'hair',question:'Can I ask about hair or scalp concerns?',answer:'Contact the clinic to discuss your concern and whether an appropriate consultation is available.',published:true},
  {id:'laser',question:'Can I discuss whether a laser treatment is right for me?',answer:'Ask the clinic about suitability, preparation and any questions before booking a listed treatment.',published:true},
  {id:'aftercare',question:'How should I prepare and what about aftercare?',answer:'Ask the clinic for instructions specific to your chosen treatment and follow the advice provided by your care team.',published:true},
];
export function ClinicFAQ() {
  const {profile}=useDermacure(); const custom=(profile.clinicFaq||[]).filter(x=>x.published && x.question?.trim() && x.answer?.trim()); const items=custom.length ? custom : defaultFaq;
  return <section id="clinic-faq" className="dc-section dc-clinic-faq"><div className="dc-container"><p className="dc-eyebrow"><span/>GOOD TO KNOW</p><h2>Frequently asked <em>questions.</em></h2>{items.length ? items.map(item=><details key={item.id}><summary>{item.question}</summary><p>{item.answer}</p></details>) : <p className="dc-empty">Contact the clinic with your questions.</p>}</div></section>;
}

export function ClinicBlog() {
  const {profile,search}=useDermacure(); const query=(search||'').trim().toLowerCase();
  const articles=(profile.clinicArticles||[]).filter(a=>a.published && a.title?.trim() && a.body?.trim() && (!query || `${a.title} ${a.category} ${a.excerpt} ${a.body}`.toLowerCase().includes(query)));
  const [expanded,setExpanded]=useState(''); const [limit,setLimit]=useState(6);
  useEffect(()=>{if(typeof window === 'undefined' || !window.location || typeof window.addEventListener !== 'function') return; const openFromHash=()=>{const hash=window.location?.hash || ''; if(hash.startsWith('#clinic-article-')) { try { const id=decodeURIComponent(hash.slice('#clinic-article-'.length)); setExpanded(id); const index=articles.findIndex(a=>a.id===id); if(index>=0) setLimit(n=>Math.max(n,index+1)); } catch { setExpanded(''); } }}; openFromHash(); window.addEventListener('hashchange',openFromHash); return ()=>window.removeEventListener('hashchange',openFromHash);},[profile.clinicArticles,search]);
  return <section id="clinic-blog" className="dc-section dc-blog"><div className="dc-container"><p className="dc-eyebrow"><span/>LEARN MORE</p><h2>Skin &amp; hair <em>journal.</em></h2><p>Information and updates published by the clinic.</p>{articles.length ? <div className="dc-blog-grid">{articles.slice(0,limit).map(a=><article key={a.id} id={`clinic-article-${a.id}`}><EditorialImage src={a.imageUrl} fallback="/templates/dermacure/clinic.webp" alt={a.imageUrl ? `Image for ${a.title}` : `Illustrative clinic image for ${a.title}`} width="600" height="400" loading="lazy"/><div><p className="dc-card-category">{a.category}</p><h3>{a.title}</h3>{a.publishedAt && !Number.isNaN(Date.parse(a.publishedAt)) && <small>{new Date(a.publishedAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})}</small>}<p>{a.excerpt}</p><a href={`#clinic-article-${a.id}`} className="dc-text-link" aria-expanded={expanded===a.id} onClick={()=>setExpanded(a.id)}>Read more <ArrowUpRight size={16}/></a>{expanded===a.id && <button className="dc-text-link" type="button" onClick={()=>setExpanded('')}>Close article</button>}{expanded===a.id && <div className="dc-article-body">{a.body}</div>}</div></article>)}</div> : <p className="dc-empty">{query?'No published articles match your search.':'No educational articles have been published yet.'}</p>}{limit < articles.length && <button type="button" className="dc-btn dc-load-more" onClick={()=>setLimit(n=>n+6)}>Load more articles</button>}</div></section>;
}
