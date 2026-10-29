import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { fade, stagger, treatmentImage } from "./animation";
import { clinicServiceGroup, clinicPriceIsVerified, clinicPriceLabel, clinicPublicEmail, clinicPhone, type ClinicGroup } from "../../lib/dermacureContent";

const GROUPS: {id:ClinicGroup;title:string;description:string}[] = [
  {id:'skin',title:'Skin Treatments',description:'Explore the skin concerns and treatments listed by the clinic.'},
  {id:'hair',title:'Hair Treatments',description:'Explore the clinic’s available hair and scalp services.'},
  {id:'cosmetology',title:'Cosmetology Treatments',description:'Explore the clinic’s aesthetic and skin-care treatments.'},
];
export function ServicesSection() {
  const {visible,services,reduced,profile,bookingAvailable,onBook,enquire,search,setSearch,serviceCategory,setServiceCategory} = useDermacure();
  const publicEmail=clinicPublicEmail(profile.clinicPublicEmail);
  const phone=clinicPhone(profile.phone);
  const category = serviceCategory || 'All';
  const categories = Array.from(new Set(services.map(s=>s.category?.trim()).filter(Boolean)));
  const active = category === 'All' || categories.includes(category) ? category : 'All';
  const query = (search || '').trim().toLowerCase();
  const canReveal = typeof window !== 'undefined' && 'IntersectionObserver' in window && !reduced;
  if (!visible.services) return null;
  return <section className="dc-directory dc-section" id="directory"><div className="dc-container">
    {!profile.subdomain && services.some(s=>!s.clinicServiceApproved) && <p className="dc-empty">Template preview: unconfirmed treatment examples are drafts, not the clinic’s published menu.</p>}<div className="dc-section-top"><div><p className="dc-eyebrow"><span />OUR TREATMENTS</p><h2>{profile.sectionHeadings?.servicesTitle || <>Explore our treatment <em>catalogue.</em></>}</h2></div><p>{profile.sectionHeadings?.servicesSubtitle || 'Search the available menu or explore by category. A consultation can help you discuss suitable options.'}</p></div>
    <form className="dc-directory-search" role="search" onSubmit={e=>e.preventDefault()}><label htmlFor="dc-directory-search">Search the treatment menu</label><input id="dc-directory-search" type="search" value={search || ''} onChange={e=>{setSearch(e.target.value);setServiceCategory("All");}} placeholder="Search by treatment, concern or category" />{query && <button type="button" onClick={()=>setSearch('')}>Clear search</button>}</form>
    {!services.some(s => /consult/i.test(s.name)) && <div className="dc-consultation-note"><EditorialImage src="/templates/dermacure/reference-consultation.webp" fallback="/templates/dermacure/care-neutral.svg" alt="Illustrative doctor consultation" loading="lazy" width="240" height="160" /><div><h3>Doctor Consultation</h3><p>Discuss your concerns and options with the clinic.</p><strong>Contact clinic for consultation fees</strong></div>{phone ? <a className="dc-btn" href={`tel:${phone}`}>Enquire about an appointment</a> : publicEmail ? <a className="dc-btn" href={`mailto:${publicEmail}`}>Email the clinic</a> : visible.location ? <a className="dc-btn" href="#contact">Contact the clinic</a> : <span>Contact details are not configured yet.</span>}</div>}
    {categories.length > 1 && <div className="dc-filters" aria-label="Filter treatments by category">{['All',...categories].map(item=><button key={item} type="button" aria-pressed={active===item} onClick={()=>setServiceCategory(item)}>{item}</button>)}</div>}
    {query && (profile.clinicArticles||[]).some(a=>a.published && a.title?.trim() && a.body?.trim() && `${a.title} ${a.category} ${a.excerpt} ${a.body}`.toLowerCase().includes(query)) && <p><a className="dc-text-link" href="#clinic-blog">See matching clinic articles <ArrowUpRight size={16}/></a></p>}
    {GROUPS.map(group=>{const filtered=services.filter(s=>clinicServiceGroup(profile,s)===group.id && (active==='All'||s.category?.trim()===active) && (!query || `${s.name} ${s.category} ${s.description}`.toLowerCase().includes(query)));return <section className="dc-service-group" id={`${group.id}-treatments`} key={group.id}><h3>{group.title}</h3><p>{group.description}</p>{filtered.length ? <motion.div className="dc-directory-grid" variants={stagger} initial={canReveal ? 'hidden' : false} whileInView={canReveal ? 'show' : undefined} viewport={{once:true,amount:0.1}}>{filtered.map((s,i)=><motion.article variants={fade} className="dc-directory-item" key={s.id}><div className="dc-directory-image"><EditorialImage fallback={treatmentImage(s)} src={s.imageUrl || treatmentImage(s)} alt={s.imageUrl ? s.name : `${s.name} — illustrative treatment image`} loading="lazy" width="600" height="400"/><span className="dc-directory-num">{String(i+1).padStart(2,'0')}</span></div><div><p className="dc-card-category">{s.category}</p><h3>{s.name}</h3><p>{s.description}</p><small>{clinicPriceLabel(s,profile.currency || '₹')}{s.showDuration!==false && s.durationMinutes>0 ? ` · ${s.durationMinutes} min` : ''}</small></div><button type="button" onClick={()=>bookingAvailable&&clinicPriceIsVerified(s)?onBook(s):enquire(s)} aria-label={`Explore ${s.name}`}><ArrowUpRight size={20}/></button></motion.article>)}</motion.div> : <p className="dc-empty">{query || active!=='All' ? 'No matching services in this category.' : `No ${group.title.toLowerCase()} are currently listed. Contact the clinic for enquiries.`}</p>}</section>})}
  </div></section>;
}
