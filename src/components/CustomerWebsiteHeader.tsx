import {WebsiteLanguageSwitcher,useWebsiteLanguage} from './WebsiteLanguage';
import React,{useEffect,useRef,useState} from 'react';
import {Menu,X,Scissors,Home,Images,CalendarCheck} from 'lucide-react';
import {CustomerAvatar} from './customer/Parts';
import type {SalonProfile} from '../types';
import {headerLinks} from '../lib/headerNavigation';
export function CustomerWebsiteHeader({profile,onAccount,signedIn=false,customerName,customerPhotoUrl,onMyBookings,onBook,hasTeam=false,bookingAvailable,availableTargets}:{profile:SalonProfile;onAccount:(mode:'signin'|'signup')=>void;signedIn?:boolean;customerName?:string;customerPhotoUrl?:string;onMyBookings?:()=>void;onBook?:()=>void;hasTeam?:boolean;bookingAvailable?:boolean;availableTargets?:ReadonlySet<string>}){
 const {t}=useWebsiteLanguage();
 const isRoopMahal=profile.businessType==='beauty_parlour';
 const links=headerLinks(profile),[open,setOpen]=useState(false),[active,setActive]=useState('home');
 const [logoFailed,setLogoFailed]=useState(false);
 useEffect(()=>{setLogoFailed(false);},[profile.logoUrl]);
 const header=useRef<HTMLElement>(null),dialog=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const close=()=>setOpen(false);
 const select=(event:React.MouseEvent<HTMLAnchorElement>,link:{id:string;label:string;href:string})=>{
  close();setActive(link.id);
  if(link.id==='bookings'&&onMyBookings){event.preventDefault();onMyBookings();return;}
  if(!link.href.startsWith('#'))return;
  const target=header.current?.ownerDocument.getElementById(link.href.slice(1));
  if(!target)return;
  event.preventDefault();const reduced=header.current?.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView?.({behavior:reduced?'auto':'smooth',block:'start'});
 };
 useEffect(()=>{
  const doc=header.current?.ownerDocument;if(!doc||!open)return;
  const previous=doc.body.style.overflow;doc.body.style.overflow='hidden';dialog.current?.querySelector<HTMLElement>('button,a')?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('a,button')||[]) as HTMLElement[],first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  };
  doc.addEventListener('keydown',key);return()=>{doc.body.style.overflow=previous;doc.removeEventListener('keydown',key);trigger.current?.focus({preventScroll:true});};
 },[open]);
 useEffect(()=>{
  const node=header.current,view=node?.ownerDocument.defaultView;if(!node)return;
  const measure=()=>node.closest<HTMLElement>('.sf-page')?.style.setProperty('--sf-header-height',`${node.getBoundingClientRect().height}px`);measure();
  const observer=view?.ResizeObserver?new view.ResizeObserver(measure):null;observer?.observe(node);return()=>observer?.disconnect();
 },[]);
 const targetExists=(href:string)=>!href.startsWith('#')||!availableTargets||availableTargets.has(href.slice(1));
 const roopLinks=(()=>{
  if(!isRoopMahal)return links;
  const validBase=links.filter(l=>targetExists(l.href));
  const byId=new Map<string,{id:string;label:string;href:string}>(validBase.map(l=>[l.id,l]));
  const teamItem=hasTeam&&targetExists('#salon-team')?[{id:'team',label:'Our Team',href:'#salon-team'}]:[];
  if(profile.headerNavigation?.length){
   const custom:{id:string;label:string;href:string}[]=[];
   for(const item of validBase){
    custom.push(item);
    if(item.id==='gallery'&&teamItem.length)custom.push(...teamItem);
   }
   return custom;
  }
  const primaryOrder=['home','about','services','gallery'];
  const ordered:{id:string;label:string;href:string}[]=[];
  for(const id of primaryOrder){const found=byId.get(id);if(found)ordered.push(found);}
  ordered.push(...teamItem);
  const contactItem=byId.get('contact');if(contactItem)ordered.push(contactItem);
  for(const item of validBase){if(!ordered.some(x=>x.id===item.id))ordered.push(item);}
  return ordered;
 })();
 const linkKey=roopLinks.map(link=>link.id).join(',');
 useEffect(()=>{
  const doc=header.current?.ownerDocument,Observer=doc?.defaultView?.IntersectionObserver;if(!Observer||!doc)return;
  const observer=new Observer(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible){const item=roopLinks.find(link=>link.href===`#${visible.target.id}`);if(item)setActive(item.id);}},{rootMargin:'-15% 0px -50% 0px',threshold:[0,0.2,0.5]});
  for(const link of roopLinks)if(link.href.startsWith('#')){const node=doc.getElementById(link.href.slice(1));if(node)observer.observe(node);}
  return()=>observer.disconnect();
 },[linkKey]);
 const renderLinks=()=>links.map(link=><a key={link.id} href={link.href} aria-current={active===link.id?'location':undefined} onClick={event=>select(event,link)}>{t(link.label)}</a>);
 const mobileTabs=links.filter(link=>['home','services','gallery','bookings'].includes(link.id));
 const tabIcons={home:Home,services:Scissors,gallery:Images,bookings:CalendarCheck};
 if(isRoopMahal){
  const centerIds=new Set(['home','about','services','gallery','team','contact']);
  const bookingsLink=roopLinks.find(l=>l.id==='bookings');
  const roopMobileTabs=mobileTabs.filter(link=>targetExists(link.href)&&(link.id!=='bookings'||Boolean(bookingsLink)));
  const canBook=(bookingAvailable??Boolean(onBook))&&typeof onBook==='function';
  const logoSrc=profile.logoUrl?.trim()||'';
  const showLogoImg=Boolean(logoSrc)&&!logoFailed;
  const salonTitle=profile.businessName?.trim()||'Roop Mahal';
  const salonCity=profile.city?.trim()||'';
  const homeHref=targetExists('#salon-home')?'#salon-home':'#';
  return (
   <header className="sf-header sf-website-header sf-rm-header" ref={header}>
    <div className="sf-rm-topbar">
     <div className="sf-container sf-rm-topbar-inner">
      <span className="sf-rm-topbar-note">
       {salonCity?`${salonCity} · `:''}Bridal Makeover, Hair Styling &amp; Personal Beauty Care
      </span>
      <div className="sf-rm-topbar-utilities">
       {bookingsLink&&<a className="sf-rm-utility-link" href={bookingsLink.href} onClick={event=>select(event,bookingsLink)}>{t(bookingsLink.label)}</a>}
       <WebsiteLanguageSwitcher/>
       <nav className="sf-account" aria-label="Customer account">
        {signedIn
         ?<button className="sf-customer-account" aria-label="Manage your customer account" onClick={()=>onAccount('signin')}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>{customerName||'My account'}</span></button>
         :<><button onClick={()=>onAccount('signin')}>{t('Customer Login')}</button><button className="sf-rm-signup-pill" onClick={()=>onAccount('signup')}>{t('Sign up')}</button></>}
       </nav>
      </div>
     </div>
    </div>
    <div className="sf-container sf-header-row sf-rm-header-row">
     <a className={`sf-brand sf-rm-brand${showLogoImg?'':' is-text-brand'}`} href={homeHref} onClick={event=>select(event,{id:'home',label:'Home',href:homeHref})}>
      {showLogoImg&&<img src={logoSrc} alt={salonTitle} onError={()=>setLogoFailed(true)}/>}
      <span className="sf-rm-brand-wordmark">
       <strong>{salonTitle}</strong>
       {salonCity&&<small>{salonCity}</small>}
      </span>
     </a>
     {roopLinks.length>0&&(
      <nav className="sf-header-links" aria-label="Website navigation">
       {roopLinks.map(link=>(
        <a
         key={link.id}
         href={link.href}
         className={!profile.headerNavigation?.length&&!centerIds.has(link.id)?'sf-rm-sr-nav':undefined}
         aria-current={active===link.id?'location':undefined}
         onClick={event=>select(event,link)}
        >
         {t(link.label)}
        </a>
       ))}
      </nav>
     )}
     <div className="sf-header-actions sf-rm-header-actions">
      {canBook&&(
       <button type="button" className="sf-button sf-rm-header-cta" onClick={()=>onBook()}>
        <CalendarCheck size={16}/>
        <span>{t('Book Appointment')}</span>
       </button>
      )}
      <button ref={trigger} className="sf-menu-toggle sf-rm-menu-toggle" aria-label="Open website menu" aria-expanded={open} aria-controls="salon-mobile-menu" onClick={()=>setOpen(true)}>
       <Menu size={22}/>
      </button>
     </div>
    </div>
    {open&&(
     <div className="sf-menu-backdrop" onClick={event=>{if(event.currentTarget===event.target)close();}}>
      <div ref={dialog} className="sf-mobile-menu sf-rm-mobile-menu" id="salon-mobile-menu" role="dialog" aria-modal="true" aria-label="Website menu">
       <div className="sf-mobile-menu-heading">
        <strong>{salonTitle}</strong>
        <button aria-label="Close website menu" onClick={close}><X size={22}/></button>
       </div>
       <nav aria-label="Mobile website navigation">
        {roopLinks.map(link=><a key={link.id} href={link.href} aria-current={active===link.id?'location':undefined} onClick={event=>select(event,link)}>{t(link.label)}</a>)}
        <a href="/?app=1&install=1" onClick={close}>Install Nexora Customer App</a>
       </nav>
       {canBook&&(
        <div className="sf-rm-mobile-cta">
         <button type="button" className="sf-button sf-rm-btn-primary" onClick={()=>{close();onBook();}}>
          <CalendarCheck size={17}/>
          {t('Book Appointment')}
         </button>
        </div>
       )}
       <div className="sf-rm-mobile-lang"><WebsiteLanguageSwitcher/></div>
       <div className="sf-mobile-account">
        {signedIn
         ?<button className="sf-button sf-customer-account" onClick={()=>{close();onAccount('signin');}}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>My profile &amp; settings</span></button>
         :<><button className="sf-button sf-rm-btn-secondary" onClick={()=>{close();onAccount('signin');}}>{t('Customer Login')}</button><button className="sf-button sf-button-outline" onClick={()=>{close();onAccount('signup');}}>{t('Sign up')}</button></>}
       </div>
      </div>
     </div>
    )}
    {roopMobileTabs.length>0&&(
     <nav className="sf-mobile-tabs sf-rm-mobile-tabs" aria-label="Mobile quick navigation">
      {roopMobileTabs.map(link=>{const Icon=tabIcons[link.id as keyof typeof tabIcons];return <a key={link.id} href={link.href} aria-label={t(link.label)} aria-current={active===link.id?'location':undefined} onClick={event=>select(event,link)}><Icon size={19}/><span>{t(link.id==='bookings'?'Bookings':link.label)}</span></a>;})}
     </nav>
    )}
   </header>
  );
 }
 return <header className="sf-header sf-website-header" ref={header}><div className="sf-container sf-header-row"><a className="sf-brand" href="#salon-home" onClick={event=>select(event,{id:'home',label:'Home',href:'#salon-home'})}>{profile.logoUrl?<img src={profile.logoUrl} alt=""/>:<span className="sf-brand-mark">{profile.businessType==='barber'?<Scissors size={23}/>:profile.businessName?.slice(0,1)||'S'}</span>}<span>{profile.businessName||'Salon Studio'}<small>{profile.city||'Your local studio'}</small></span></a><nav className="sf-header-links" aria-label="Website navigation">{renderLinks()}</nav><div className="sf-header-actions"><WebsiteLanguageSwitcher/><nav className="sf-account" aria-label="Customer account">{signedIn?<button className="sf-customer-account" aria-label="Manage your customer account" onClick={()=>onAccount('signin')}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>{customerName||'My account'}</span></button>:<><button onClick={()=>onAccount('signin')}>{t('Customer Login')}</button><button className="sf-button sf-button-small" onClick={()=>onAccount('signup')}>{t('Sign up')}</button></>}</nav><button ref={trigger} className="sf-menu-toggle" aria-label="Open website menu" aria-expanded={open} aria-controls="salon-mobile-menu" onClick={()=>setOpen(true)}><Menu size={23}/></button></div></div>{open&&<div className="sf-menu-backdrop" onClick={event=>{if(event.currentTarget===event.target)close();}}><div ref={dialog} className="sf-mobile-menu" id="salon-mobile-menu" role="dialog" aria-modal="true" aria-label="Website menu"><div className="sf-mobile-menu-heading"><strong>{profile.businessName||'Salon Studio'}</strong><button aria-label="Close website menu" onClick={close}><X size={23}/></button></div><nav aria-label="Mobile website navigation">{renderLinks()}<a href="/?app=1&install=1" onClick={close}>Install Nexora Customer App</a></nav><div className="sf-mobile-account">{signedIn?<button className="sf-button sf-customer-account" onClick={()=>{close();onAccount('signin');}}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>My profile & settings</span></button>:<><button className="sf-button" onClick={()=>{close();onAccount('signin');}}>{t('Customer Login')}</button><button className="sf-button sf-button-outline" onClick={()=>{close();onAccount('signup');}}>{t('Sign up')}</button></>}</div></div></div>}{mobileTabs.length>0&&<nav className="sf-mobile-tabs" aria-label="Mobile quick navigation">{mobileTabs.map(link=>{const Icon=tabIcons[link.id as keyof typeof tabIcons];return <a key={link.id} href={link.href} aria-label={t(link.label)} aria-current={active===link.id?'location':undefined} onClick={event=>select(event,link)}><Icon size={19}/><span>{t(link.id==='bookings'?'Bookings':link.label)}</span></a>;})}</nav>}</header>;
}
