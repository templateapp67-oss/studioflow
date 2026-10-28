import {WebsiteLanguageSwitcher,useWebsiteLanguage} from './WebsiteLanguage';
import React,{useEffect,useRef,useState} from 'react';
import {Menu,X,Scissors,Home,Images,CalendarCheck,ArrowRight} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';
import {CustomerAvatar} from './customer/Parts';
import type {SalonProfile} from '../types';
import {headerLinks} from '../lib/headerNavigation';
import {PinkyNailsMark} from './PinkyNailsSections';
import {KeshPrakritiLogoMark} from './KeshPrakritiSections';
export function CustomerWebsiteHeader({profile,onAccount,signedIn=false,customerName,customerPhotoUrl,onMyBookings,onBook,hasTeam=false,bookingAvailable,availableTargets}:{profile:SalonProfile;onAccount:(mode:'signin'|'signup')=>void;signedIn?:boolean;customerName?:string;customerPhotoUrl?:string;onMyBookings?:()=>void;onBook?:()=>void;hasTeam?:boolean;bookingAvailable?:boolean;availableTargets?:ReadonlySet<string>}){
 const {t}=useWebsiteLanguage();
 const isRoopMahal=profile.businessType==='beauty_parlour';
 const isPinkyNails=profile.businessType==='nail_studio';
 const isKeshPrakriti=profile.businessType==='hair_spa';
 const [isScrolled,setIsScrolled]=useState(false);
 useEffect(()=>{
  const handleScroll=()=>{
   setIsScrolled((typeof window!=='undefined'?window.scrollY:0)>20);
  };
  window.addEventListener('scroll',handleScroll,{passive:true});
  return()=>window.removeEventListener('scroll',handleScroll);
 },[]);
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
 const pinkyLinks=(()=>{
  if(!isPinkyNails)return links;
  const validBase=links.filter(l=>targetExists(l.href));
  const byId=new Map<string,{id:string;label:string;href:string}>(validBase.map(l=>[l.id,l]));
  const labelOf=(id:string,fallback:string)=>id==='gallery'?'Nail Gallery':id==='home'?fallback:fallback;
  const ordered:{id:string;label:string;href:string}[]=[];
  const teamItem=hasTeam&&targetExists('#salon-team')?[{id:'team',label:'Our Team',href:'#salon-team'}]:[];
  if(profile.headerNavigation?.length){
   for(const item of validBase){ordered.push({...item,label:labelOf(item.id,item.label)});if(item.id==='about')ordered.push(...teamItem);}
   return ordered;
  }
  const primary=[byId.get('home'),byId.get('services'),byId.get('about')].filter(Boolean) as {id:string;label:string;href:string}[];
  ordered.push(...primary.map(item=>({...item,label:labelOf(item.id,item.label)})));
  const galleryItem=byId.get('gallery');
  const contactItem=byId.get('contact');
  if(galleryItem)ordered.push({...galleryItem,label:'Nail Gallery'});
  ordered.push(...teamItem);
  if(contactItem)ordered.push({...contactItem,label:'Contact'});
  for(const item of validBase){if(!ordered.some(x=>x.id===item.id))ordered.push({...item,label:labelOf(item.id,item.label)});}
  return ordered;
 })();

 const keshLinks=[
  {id:'home',label:'Home',href:'#salon-home'},
  {id:'philosophy',label:'Our Philosophy',href:'#salon-philosophy'},
  {id:'services',label:'Treatments',href:'#services-section'},
  {id:'journey',label:'Scalp Care',href:'#salon-journey'},
  {id:'botanicals',label:'The Sanctuary',href:'#salon-botanicals'},
  {id:'gallery',label:'Gallery',href:'#salon-lookbook'},
  {id:'contact',label:'Contact',href:'#salon-location'},
 ];

 const navLinks=isKeshPrakriti?keshLinks:isPinkyNails?pinkyLinks:roopLinks;
 const linkKey=navLinks.map(link=>link.id).join(',');
 useEffect(()=>{
  const doc=header.current?.ownerDocument,Observer=doc?.defaultView?.IntersectionObserver;if(!Observer||!doc)return;
  const observer=new Observer(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible){const item=navLinks.find(link=>link.href===`#${visible.target.id}`);if(item)setActive(item.id);}},{rootMargin:'-15% 0px -50% 0px',threshold:[0,0.2,0.5]});
  for(const link of navLinks)if(link.href.startsWith('#')){const node=doc.getElementById(link.href.slice(1));if(node)observer.observe(node);}
  return()=>observer.disconnect();
 },[linkKey]);
 const renderLinks=()=>links.map(link=><a key={link.id} href={link.href} aria-current={active===link.id?'location':undefined} onClick={event=>{close();select(event,link);}}>{t(link.label)}</a>);
 const mobileTabs=links.filter(link=>['home','services','gallery','bookings'].includes(link.id));
 const tabIcons={home:Home,services:Scissors,gallery:Images,bookings:CalendarCheck};

 if(isKeshPrakriti){
  const canBook=(bookingAvailable??Boolean(onBook))&&typeof onBook==='function';
  const salonTitle=profile.businessName?.trim()||'Kesh Prakriti';
  const homeHref=targetExists('#salon-home')?'#salon-home':'#';
  return (
   <header className={`sf-kp-header ${isScrolled?'is-scrolled':'is-transparent'}`} ref={header}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
     <a className="flex items-center gap-3 no-underline group cursor-pointer" href={homeHref} onClick={event=>select(event,{id:'home',label:'Home',href:homeHref})}>
      {profile.logoUrl&&!logoFailed?<img src={profile.logoUrl} alt={salonTitle} className="w-10 h-10 rounded-full object-cover border border-[#C5A46D]/40" onError={()=>setLogoFailed(true)}/>:<KeshPrakritiLogoMark/>}
      <div className="flex flex-col">
       <span className="font-serif text-xl sm:text-2xl text-[#183D32] font-semibold tracking-tight leading-tight group-hover:text-[#102B24] transition-colors">{salonTitle}</span>
       <span className="text-[10px] font-mono tracking-widest uppercase text-[#B96F50] font-medium">Hair Spa &amp; Scalp Sanctuary</span>
      </div>
     </a>
     <nav className="sf-header-links" aria-label="Website navigation">
      {links.map(link=>(
       <a key={link.id} href={link.href} className={`sf-kp-nav-link ${active===link.id?'text-[#102B24] font-semibold':''}`} aria-current={active===link.id?'location':undefined} onClick={event=>{close();select(event,link);}}>{t(link.label)}</a>
      ))}
     </nav>
     <div className="flex items-center gap-3">
      <nav className="hidden sm:flex items-center gap-2 text-xs" aria-label="Customer account">
       {signedIn?<button className="sf-customer-account" aria-label="Manage your customer account" onClick={()=>onAccount('signin')}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>{customerName||'My account'}</span></button>:<><button className="text-xs text-[#183D32] hover:text-[#102B24] font-medium px-2 py-1 cursor-pointer" onClick={()=>onAccount('signin')}>{t('Customer Login')}</button><button className="text-xs bg-[#E4EBDD] hover:bg-[#DEE4D8] text-[#183D32] px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors" onClick={()=>onAccount('signup')}>{t('Sign up')}</button></>}
       {onMyBookings&&<button className="text-xs text-[#183D32] hover:text-[#102B24] font-medium px-2 py-1 cursor-pointer" onClick={()=>onMyBookings()}>My Bookings</button>}
      </nav>
      {canBook&&(
       <button type="button" className="sf-kp-btn-primary hidden sm:inline-flex" onClick={()=>onBook?.()}>
        <CalendarCheck className="w-3.5 h-3.5 text-[#C5A46D]"/>
        <span>Book Your Ritual</span>
       </button>
      )}
      <button ref={trigger} className="lg:hidden p-2 rounded-xl text-[#183D32] hover:bg-[#E4EBDD] transition-colors cursor-pointer" aria-label="Open website menu" aria-expanded={open} aria-controls="kesh-mobile-menu" onClick={()=>setOpen(true)}>
       <Menu size={24}/>
      </button>
     </div>
    </div>
    <AnimatePresence>
     {open&&(
      <div className="sf-kp-mobile-backdrop" onClick={e=>{if(e.currentTarget===e.target)close();}}>
       <motion.div ref={dialog} initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:26,stiffness:260}} className="sf-kp-mobile-drawer" id="salon-mobile-menu" role="dialog" aria-modal="true" aria-label="Website menu">
        <div className="p-5 border-b border-[#DEE4D8] flex items-center justify-between">
         <div className="flex items-center gap-2.5">
          <KeshPrakritiLogoMark className="w-7 h-7"/>
          <div><span className="font-serif text-lg text-[#183D32] font-semibold block leading-tight">{salonTitle}</span><span className="text-[9px] font-mono tracking-widest uppercase text-[#B96F50]">Scalp Sanctuary</span></div>
         </div>
         <button aria-label="Close menu" onClick={close} className="p-1.5 rounded-lg hover:bg-[#E4EBDD] text-[#183D32] transition-colors cursor-pointer"><X size={20}/></button>
        </div>
        <nav className="p-5 flex-1 flex flex-col gap-3 overflow-y-auto" aria-label="Mobile website navigation">
         {links.map(link=>(
          <a key={link.id} href={link.href} className="text-base font-serif text-[#183D32] hover:text-[#B96F50] py-2 border-b border-[#DEE4D8]/50 flex items-center justify-between transition-colors" aria-current={active===link.id?'location':undefined} onClick={event=>{close();select(event,link);}}><span>{t(link.label)}</span><ArrowRight size={14} className="text-[#C5A46D]"/></a>
         ))}
         <a href="/?app=1&install=1" onClick={close} className="text-xs text-[#565D53] hover:text-[#183D32] py-2 mt-2 font-mono">Install Nexora Customer App</a>
        </nav>
        <div className="p-5 border-t border-[#DEE4D8] bg-[#F1F5EC] flex flex-col gap-3">
         {canBook&&<button type="button" className="sf-kp-btn-primary w-full justify-center" onClick={()=>{close();onBook?.();}}><CalendarCheck className="w-4 h-4 text-[#C5A46D]"/><span>Book Your Ritual</span></button>}
         <div className="pt-2 flex flex-col gap-2">
          {signedIn?<button className="sf-button sf-customer-account w-full" onClick={()=>{close();onAccount('signin');}}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>My profile &amp; settings</span></button>:<div className="flex gap-2"><button className="flex-1 py-2 text-xs rounded-full border border-[#183D32] text-[#183D32] font-semibold hover:bg-[#E4EBDD] cursor-pointer" onClick={()=>{close();onAccount('signin');}}>{t('Customer Login')}</button><button className="flex-1 py-2 text-xs rounded-full bg-[#183D32] text-white font-semibold hover:bg-[#102B24] cursor-pointer" onClick={()=>{close();onAccount('signup');}}>{t('Sign up')}</button></div>}
         </div>
        </div>
       </motion.div>
      </div>
     )}
    </AnimatePresence>
     {mobileTabs.length>0&&(
      <nav className="sf-mobile-tabs" aria-label="Mobile quick navigation">
       {mobileTabs.map(link=>{const Icon=tabIcons[link.id as keyof typeof tabIcons];return <a key={link.id} href={link.href} aria-label={t(link.label)} aria-current={active===link.id?'location':undefined} onClick={event=>select(event,link)}><Icon size={19}/><span>{t(link.id==='bookings'?'Bookings':link.label)}</span></a>;})}
      </nav>
     )}
   </header>
  );
 }

 if(isPinkyNails){
  const canBook=(bookingAvailable??Boolean(onBook))&&typeof onBook==='function';
  const logoSrc=profile.logoUrl?.trim()||'';
  const showLogoImg=Boolean(logoSrc)&&!logoFailed;
  const salonTitle=profile.businessName?.trim()||'Pinky Nails Studio';
  const homeHref=targetExists('#salon-home')?'#salon-home':'#';
  return (
   <header className="sf-header sf-website-header sf-pn-header" ref={header}>
    <div className="sf-container sf-pn-header-row">
     <a className="sf-pn-brand" href={homeHref} onClick={event=>select(event,{id:'home',label:'Home',href:homeHref})}>
      {showLogoImg?<img src={logoSrc} alt={salonTitle} onError={()=>setLogoFailed(true)}/>:<PinkyNailsMark/>}
      <span className="sf-pn-brand-text">
       <strong>{salonTitle}</strong>
       <small>Nail Art Studio</small>
      </span>
     </a>
     {pinkyLinks.length>0&&(
      <nav className="sf-header-links" aria-label="Website navigation">
       {pinkyLinks.map(link=>(
        <a key={link.id} href={link.href} aria-current={active===link.id?'location':undefined} onClick={event=>{close();select(event,link);}}>{t(link.label)}</a>
       ))}
      </nav>
     )}
     <div className="sf-pn-header-actions">
      <nav className="sf-pn-account" aria-label="Customer account">
       {signedIn
        ?<button className="sf-customer-account" aria-label="Manage your customer account" onClick={()=>onAccount('signin')}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>{customerName||'My account'}</span></button>
        :<><button onClick={()=>onAccount('signin')}>{t('Customer Login')}</button><button onClick={()=>onAccount('signup')}>{t('Sign up')}</button></>}
       {onMyBookings&&<button className="sf-pn-my-bookings" onClick={()=>onMyBookings()}>My Bookings</button>}
      </nav>
      {canBook&&(
       <button type="button" className="sf-button sf-pn-header-cta" onClick={()=>onBook()}>
        <CalendarCheck size={16}/>
        <span>{t('Book Appointment')}</span>
       </button>
      )}
      <button ref={trigger} className="sf-pn-menu-toggle" aria-label="Open website menu" aria-expanded={open} aria-controls="salon-mobile-menu" onClick={()=>setOpen(true)}>
       <Menu size={22}/>
      </button>
     </div>
    </div>
    {open&&(
     <div className="sf-pn-menu-backdrop" onClick={event=>{if(event.currentTarget===event.target)close();}}>
      <div ref={dialog} className="sf-pn-mobile-menu" id="salon-mobile-menu" role="dialog" aria-modal="true" aria-label="Website menu">
       <div className="sf-pn-mobile-head">
        <strong>{salonTitle}</strong>
        <button aria-label="Close website menu" onClick={close}><X size={22}/></button>
       </div>
       <nav className="sf-pn-mobile-nav" aria-label="Mobile website navigation">
        {pinkyLinks.map(link=><a key={link.id} href={link.href} aria-current={active===link.id?'location':undefined} onClick={event=>{close();select(event,link);}}>{t(link.label)}</a>)}
        <a href="/?app=1&install=1" onClick={close}>Install Nexora Customer App</a>
       </nav>
       {canBook&&(
        <div className="sf-pn-mobile-cta">
         <button type="button" className="sf-button sf-pn-btn-primary" onClick={()=>{close();onBook();}}>
          <CalendarCheck size={17}/>
          {t('Book Appointment')}
         </button>
        </div>
       )}
       <div className="sf-pn-mobile-account">
        {signedIn
         ?<button className="sf-button sf-customer-account" onClick={()=>{close();onAccount('signin');}}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>My profile &amp; settings</span></button>
         :<><button className="sf-button" onClick={()=>{close();onAccount('signin');}}>{t('Customer Login')}</button><button className="sf-button" onClick={()=>{close();onAccount('signup');}}>{t('Sign up')}</button></>}
       </div>
      </div>
     </div>
    )}
   </header>
  );
 }
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
         onClick={event=>{close();select(event,link);}}
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
        {roopLinks.map(link=><a key={link.id} href={link.href} aria-current={active===link.id?'location':undefined} onClick={event=>{close();select(event,link);}}>{t(link.label)}</a>)}
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
      {roopMobileTabs.map(link=>{const Icon=tabIcons[link.id as keyof typeof tabIcons];return <a key={link.id} href={link.href} aria-label={t(link.label)} aria-current={active===link.id?'location':undefined} onClick={event=>{close();select(event,link);}}><Icon size={19}/><span>{t(link.id==='bookings'?'Bookings':link.label)}</span></a>;})}
     </nav>
    )}
   </header>
  );
 }
 return <header className="sf-header sf-website-header" ref={header}><div className="sf-container sf-header-row"><a className="sf-brand" href="#salon-home" onClick={event=>select(event,{id:'home',label:'Home',href:'#salon-home'})}>{profile.logoUrl?<img src={profile.logoUrl} alt=""/>:<span className="sf-brand-mark">{profile.businessType==='barber'?<Scissors size={23}/>:profile.businessName?.slice(0,1)||'S'}</span>}<span>{profile.businessName||'Salon Studio'}<small>{profile.city||'Your local studio'}</small></span></a><nav className="sf-header-links" aria-label="Website navigation">{renderLinks()}</nav><div className="sf-header-actions"><WebsiteLanguageSwitcher/><nav className="sf-account" aria-label="Customer account">{signedIn?<button className="sf-customer-account" aria-label="Manage your customer account" onClick={()=>onAccount('signin')}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>{customerName||'My account'}</span></button>:<><button onClick={()=>onAccount('signin')}>{t('Customer Login')}</button><button className="sf-button sf-button-small" onClick={()=>onAccount('signup')}>{t('Sign up')}</button></>}</nav><button ref={trigger} className="sf-menu-toggle" aria-label="Open website menu" aria-expanded={open} aria-controls="salon-mobile-menu" onClick={()=>setOpen(true)}><Menu size={23}/></button></div></div>{open&&<div className="sf-menu-backdrop" onClick={event=>{if(event.currentTarget===event.target)close();}}><div ref={dialog} className="sf-mobile-menu" id="salon-mobile-menu" role="dialog" aria-modal="true" aria-label="Website menu"><div className="sf-mobile-menu-heading"><strong>{profile.businessName||'Salon Studio'}</strong><button aria-label="Close website menu" onClick={close}><X size={23}/></button></div><nav aria-label="Mobile website navigation">{renderLinks()}<a href="/?app=1&install=1" onClick={close}>Install Nexora Customer App</a></nav><div className="sf-mobile-account">{signedIn?<button className="sf-button sf-customer-account" onClick={()=>{close();onAccount('signin');}}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>My profile & settings</span></button>:<><button className="sf-button" onClick={()=>{close();onAccount('signin');}}>{t('Customer Login')}</button><button className="sf-button sf-button-outline" onClick={()=>{close();onAccount('signup');}}>{t('Sign up')}</button></>}</div></div></div>}{mobileTabs.length>0&&<nav className="sf-mobile-tabs" aria-label="Mobile quick navigation">{mobileTabs.map(link=>{const Icon=tabIcons[link.id as keyof typeof tabIcons];return <a key={link.id} href={link.href} aria-label={t(link.label)} aria-current={active===link.id?'location':undefined} onClick={event=>{close();select(event,link);}}><Icon size={19}/><span>{t(link.id==='bookings'?'Bookings':link.label)}</span></a>;})}</nav>}</header>;
}
