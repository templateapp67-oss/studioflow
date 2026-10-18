import {WebsiteLanguageSwitcher,useWebsiteLanguage} from './WebsiteLanguage';
import React,{useEffect,useRef,useState} from 'react';
import {Menu,X,Scissors,Home,Images,CalendarCheck} from 'lucide-react';
import {CustomerAvatar} from './customer/Parts';
import type {SalonProfile} from '../types';
import {headerLinks} from '../lib/headerNavigation';
export function CustomerWebsiteHeader({profile,onAccount,signedIn=false,customerName,customerPhotoUrl,onMyBookings}:{profile:SalonProfile;onAccount:(mode:'signin'|'signup')=>void;signedIn?:boolean;customerName?:string;customerPhotoUrl?:string;onMyBookings?:()=>void}){
 const {t}=useWebsiteLanguage();
 const links=headerLinks(profile),[open,setOpen]=useState(false),[active,setActive]=useState('home');
 const header=useRef<HTMLElement>(null),dialog=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const close=()=>setOpen(false);
 const select=(event:React.MouseEvent<HTMLAnchorElement>,link:typeof links[number])=>{
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
   if(event.key==='Tab'){const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('a,button')||[]) as HTMLElement[],first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}
  };
  doc.addEventListener('keydown',key);return()=>{doc.body.style.overflow=previous;doc.removeEventListener('keydown',key);trigger.current?.focus({preventScroll:true});};
 },[open]);
 useEffect(()=>{
  const node=header.current,view=node?.ownerDocument.defaultView;if(!node)return;
  const measure=()=>node.closest<HTMLElement>('.sf-page')?.style.setProperty('--sf-header-height',`${node.getBoundingClientRect().height}px`);measure();
  const observer=view?.ResizeObserver?new view.ResizeObserver(measure):null;observer?.observe(node);return()=>observer?.disconnect();
 },[]);
 const linkKey=links.map(link=>link.id).join(',');
 useEffect(()=>{
  const doc=header.current?.ownerDocument,Observer=doc?.defaultView?.IntersectionObserver;if(!Observer||!doc)return;
  const observer=new Observer(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible){const item=links.find(link=>link.href===`#${visible.target.id}`);if(item)setActive(item.id);}},{rootMargin:'-15% 0px -50% 0px',threshold:[0,0.2,0.5]});
  for(const link of links)if(link.href.startsWith('#')){const node=doc.getElementById(link.href.slice(1));if(node)observer.observe(node);}
  return()=>observer.disconnect();
 },[linkKey]);
 const renderLinks=()=>links.map(link=><a key={link.id} href={link.href} aria-current={active===link.id?'location':undefined} onClick={event=>select(event,link)}>{t(link.label)}</a>);
 const mobileTabs=links.filter(link=>['home','services','gallery','bookings'].includes(link.id));
 const tabIcons={home:Home,services:Scissors,gallery:Images,bookings:CalendarCheck};
 return <header className="sf-header sf-website-header" ref={header}><div className="sf-container sf-header-row"><a className="sf-brand" href="#salon-home" onClick={event=>select(event,{id:'home',label:'Home',href:'#salon-home'})}>{profile.logoUrl?<img src={profile.logoUrl} alt=""/>:<span className="sf-brand-mark">{profile.businessType==='barber'?<Scissors size={23}/>:profile.businessName?.slice(0,1)||'S'}</span>}<span>{profile.businessName||'Salon Studio'}<small>{profile.city||'Your local studio'}</small></span></a><nav className="sf-header-links" aria-label="Website navigation">{renderLinks()}</nav><div className="sf-header-actions"><WebsiteLanguageSwitcher/><nav className="sf-account" aria-label="Customer account">{signedIn?<button className="sf-customer-account" aria-label="Manage your customer account" onClick={()=>onAccount('signin')}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>{customerName||'My account'}</span></button>:<><button onClick={()=>onAccount('signin')}>{t('Customer Login')}</button><button className="sf-button sf-button-small" onClick={()=>onAccount('signup')}>{t('Sign up')}</button></>}</nav><button ref={trigger} className="sf-menu-toggle" aria-label="Open website menu" aria-expanded={open} aria-controls="salon-mobile-menu" onClick={()=>setOpen(true)}><Menu size={23}/></button></div></div>{open&&<div className="sf-menu-backdrop" onClick={event=>{if(event.currentTarget===event.target)close();}}><div ref={dialog} className="sf-mobile-menu" id="salon-mobile-menu" role="dialog" aria-modal="true" aria-label="Website menu"><div className="sf-mobile-menu-heading"><strong>{profile.businessName||'Salon Studio'}</strong><button aria-label="Close website menu" onClick={close}><X size={23}/></button></div><nav aria-label="Mobile website navigation">{renderLinks()}<a href="/?app=1&install=1" onClick={close}>Install Nexora Customer App</a></nav><div className="sf-mobile-account">{signedIn?<button className="sf-button sf-customer-account" onClick={()=>{close();onAccount('signin');}}><CustomerAvatar src={customerPhotoUrl} name={customerName||'Customer'}/><span>My profile & settings</span></button>:<><button className="sf-button" onClick={()=>{close();onAccount('signin');}}>{t('Customer Login')}</button><button className="sf-button sf-button-outline" onClick={()=>{close();onAccount('signup');}}>{t('Sign up')}</button></>}</div></div></div>}{mobileTabs.length>0&&<nav className="sf-mobile-tabs" aria-label="Mobile quick navigation">{mobileTabs.map(link=>{const Icon=tabIcons[link.id as keyof typeof tabIcons];return <a key={link.id} href={link.href} aria-label={t(link.label)} aria-current={active===link.id?'location':undefined} onClick={event=>select(event,link)}><Icon size={19}/><span>{t(link.id==='bookings'?'Bookings':link.label)}</span></a>;})}</nav>}</header>;
}
