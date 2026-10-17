import React from 'react';
import {ArrowLeft,ArrowUpRight,Share2,Clock} from 'lucide-react';
import {Photo,Notice} from './Parts';
import {menu,staff,rupees,shareLink,salonLink,type Salon} from './model';
import {templateDemoWebsite} from './templateDemos';

export function TemplateDemoSalon({salon,back}:{key?:React.Key;salon:Salon;back:()=>void}){
 const [notice,setNotice]=React.useState('');
 const p=salon.content.profile;
 return <><header className="cr-salon-header"><button className="cr-icon" onClick={back} aria-label="Back to all salons"><ArrowLeft size={19}/></button><strong>Website Template Demo</strong><button className="cr-icon" aria-label="Share template demo" onClick={()=>void shareLink(salonLink(salon.slug),p.businessName+' — template demo').then(text=>{if(text)setNotice(text)}).catch(()=>setNotice('Copy this page’s link to share this demo.'))}><Share2 size={17}/></button></header>
 <div className="cr-salon-hero"><Photo src={p.coverImageUrl} alt={p.businessName+' template inspiration'}/></div>
 <main className="cr-salon-content cr-template-demo-detail">
 <Notice><strong>DEMO WEBSITE · SAMPLE CONTENT</strong><br/>यह आपके website template का demo है। इस category में original salon publish होते ही उसकी listing यहाँ अपने आप दिखाई देगी।</Notice>
 {notice&&<Notice>{notice}</Notice>}
 <section className="cr-panel cr-venue"><span className="cr-label">TEMPLATE DEMO</span><h1>{p.businessName}</h1><p>{p.tagline}</p><p className="cr-muted">{p.city} · Sample city, services, prices and team</p><a className="cr-primary" href={templateDemoWebsite(salon)} target="_blank" rel="noreferrer">View full website demo <ArrowUpRight size={14}/></a></section>
 <section className="cr-panel"><h2>Explore sample services</h2><p className="cr-muted">Reference prices from this template. Actual salons publish their own prices and availability.</p>{menu(salon).map(s=><article className="cr-demo-service" key={s.id}><div className="cr-row"><h3>{s.name}</h3><strong>{rupees(s.price)}</strong></div><p>{s.description||s.category}</p><small><Clock size={11}/> {s.durationMinutes} mins · {s.category}</small></article>)}</section>
 {staff(salon).length>0&&<section className="cr-panel"><h2>Sample team</h2><div className="cr-stylists">{staff(salon).map(s=><article className="cr-stylist" key={s.id}><Photo src={s.avatarUrl} alt={s.name+' — sample team member'}/><div><h3>{s.name}</h3><p>{s.role}</p><small>{(s.specialties||[]).join(' · ')}</small></div></article>)}</div></section>}
 <Notice>यह preview real appointment नहीं बनाता और payment नहीं लेता। Published salons पर booking और ₹0 practice booking पहले की तरह उपलब्ध हैं।</Notice>
 <button className="cr-outline" onClick={back}>Browse all categories</button>
 </main></>;
}
