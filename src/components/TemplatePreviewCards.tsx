import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AppErrorBoundary } from './AppErrorBoundary';
import { loadScreen } from '../lib/loadScreen';
import { createPortal } from 'react-dom';
import { BusinessTypeId, CategoryTemplateConfig, SalonProfile } from '../types';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../mockData';
import { ACCENT_PALETTES, DEFAULT_CATEGORY_ACCENTS, getContrastTextColor } from '../themeAccents';

const LiveWebsite = lazy(() => loadScreen(() => import('./SalonWebsitePreview').then(m => ({ default: m.SalonWebsitePreview }))));

export function TemplateThumbnail({ template: t }: { template: CategoryTemplateConfig }) {
  const isRoopMahal = t.id === 'beauty_parlour';
  const isKeshPrakriti = t.id === 'hair_spa';
  const accent = ACCENT_PALETTES[DEFAULT_CATEGORY_ACCENTS[t.id]];
  const accentHex = isKeshPrakriti ? '#183D32' : isRoopMahal ? '#6D2638' : accent.primaryHex;
  const split = isRoopMahal || ['modern_minimalist', 'clinical_clean', 'contemporary_balanced', 'urban_monochrome'].includes(t.layoutStyle);
  const rounded = ['curved_elegant', 'chic_nude', 'zen_emerald', 'earth_bamboo'].includes(t.layoutStyle);
  return <div aria-hidden="true" className="p-4 pb-0 bg-slate-100">
    <div className="rounded-t-xl border border-slate-300 shadow-sm overflow-hidden bg-white">
      <div className="h-6 bg-white flex items-center gap-1 px-2 border-b border-slate-200"><i className="w-1.5 h-1.5 rounded-full bg-rose-300"/><i className="w-1.5 h-1.5 rounded-full bg-amber-300"/><i className="w-1.5 h-1.5 rounded-full bg-emerald-300"/><span className="ml-auto text-[7px] text-slate-400">{t.shortName}</span></div>
      <div className={`relative h-40 overflow-hidden ${t.themeStyle.heroBackground} ${t.themeStyle.heroTextColor} ${split ? 'flex' : ''}`}>
        <img src={t.coverImageUrl} alt="" loading="lazy" decoding="async" className={`${split ? 'w-1/2 order-2' : 'absolute inset-0 w-full'} h-full object-cover object-top motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105`} />
        {!split && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10"/>}
        <div className={`relative z-10 p-3 flex flex-col justify-end h-full ${split ? 'w-1/2' : 'text-white w-4/5'} ${rounded ? 'font-serif' : ''}`}>
          <span className="text-[7px] uppercase tracking-widest mb-2 opacity-80">{t.defaultCity.split(',')[0]} · {t.shortName}</span>
          <span className="text-sm font-bold leading-tight">{t.title}</span>
          <span className="text-[8px] leading-relaxed mt-1 line-clamp-2 opacity-80">{t.tagline}</span>
          <span style={{backgroundColor:accentHex, color:getContrastTextColor(accentHex)}} className={`text-[7px] font-sans font-semibold w-fit px-2.5 py-1.5 mt-2 ${rounded ? 'rounded-full' : 'rounded-sm'}`}>Explore services →</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-2 bg-white">{t.services.slice(0,3).map(s => <div key={s.id} className={`border border-slate-100 px-1.5 py-2 ${rounded ? 'rounded-lg' : ''}`}><span className="block text-[7px] text-slate-700 truncate">{s.name}</span><span style={{color:accentHex}} className="text-[8px] font-bold">₹{s.price.toLocaleString('en-IN')}</span></div>)}</div>
    </div>
  </div>;
}

export function TemplatePreviewModal({templateId, onSelectPreview, onClose, onChoose}: {templateId:BusinessTypeId; onSelectPreview:(id:BusinessTypeId)=>void; onClose:()=>void; onChoose:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [device, setDevice] = useState<'desktop'|'tablet'|'mobile'>('desktop');
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);
  const t = CATEGORY_TEMPLATES[templateId];
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) { if(typeof el.showModal==='function') el.showModal(); else el.setAttribute('open',''); }
    if(typeof document==='undefined')return;const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event:KeyboardEvent) => { if(event.key === 'Escape') { event.preventDefault(); onClose(); } };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('keydown', escape); document.body.style.overflow = previousOverflow; if(el?.open){if(typeof el.close==='function')el.close();else el.removeAttribute('open');} };
  }, [onClose]);
  useEffect(() => {
    if (!frameDocument) return;
    const escape = (event:KeyboardEvent) => { if(event.key === 'Escape') {event.preventDefault(); onClose();} };
    frameDocument.addEventListener('keydown', escape);
    return () => frameDocument.removeEventListener('keydown', escape);
  }, [frameDocument, onClose]);
  const profile:SalonProfile = {...INITIAL_SALON_PROFILE, businessType:t.id, businessName:t.title, tagline:t.tagline, about:t.about, ownerName:t.ownerName, ownerRole:t.ownerRole, ownerPhotoUrl:t.ownerPhotoUrl, phone:t.phone, whatsapp:t.whatsapp, coverImageUrl:t.coverImageUrl, themePreset:t.themePreset, themeAccentKey:DEFAULT_CATEGORY_ACCENTS[t.id], city:t.defaultCity, address:t.defaultAddress, postalCode:t.defaultPostalCode, instagramHandle:t.instagramHandle, subdomain:'', requireDeposit:false};
  return <dialog ref={dialog} aria-labelledby="template-preview-title" onCancel={event => {event.preventDefault(); onClose();}} className="m-auto w-[calc(100%-16px)] max-w-[1440px] h-[92dvh] max-h-[92dvh] p-0 rounded-2xl border border-slate-200 shadow-2xl backdrop:bg-slate-950/70">
    <div className="h-full flex flex-col bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200 p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0"><h2 id="template-preview-title" className="font-bold text-sm sm:text-lg truncate">{t.title}</h2><p className="text-xs text-slate-500">Live template demo · {t.paletteLabel}</p></div>
        <button type="button" autoFocus onClick={onClose} aria-label="Close template preview" className="rounded-lg border px-3 py-2 hover:bg-slate-100">✕</button>
        <div className="w-full flex flex-wrap items-center gap-2">
          <select aria-label="Preview template" value={templateId} onChange={event => onSelectPreview(event.target.value as BusinessTypeId)} className="border rounded-lg p-2 text-xs max-w-full sm:max-w-64">{Object.values(CATEGORY_TEMPLATES).map(template => <option key={template.id} value={template.id}>{template.shortName}</option>)}</select>
          <div className="flex border rounded-lg overflow-hidden">{(['desktop','tablet','mobile'] as const).map(mode => <button key={mode} type="button" aria-pressed={device===mode} onClick={() => setDevice(mode)} className={`capitalize text-xs px-2 sm:px-3 py-2 ${device===mode ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}>{mode}</button>)}</div>
          <button type="button" onClick={onChoose} className="sm:ml-auto rounded-lg bg-slate-900 text-white font-bold text-xs px-4 py-2.5">Customize this template</button>
        </div>
        <p className="text-[11px] text-slate-500">Sample content. Explore the pages and booking form; demo bookings are not submitted.</p>
      </header>
      <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4">
        <iframe title={`${t.title} live ${device} preview`} srcDoc={'<!doctype html><html><head></head><body style="margin:0"><div id="template-root"></div></body></html>'} onLoad={event => {
          const doc = event.currentTarget.contentDocument;
          if (!doc) return;
          document.querySelectorAll('link[rel="stylesheet"], style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
          doc.documentElement.style.fontFamily = 'Inter, sans-serif';
          setFrameDocument(doc);
        }} style={{width:device==='mobile'?390:device==='tablet'?768:1280,maxWidth:device==='mobile'?'100%':undefined,height:'100%'}} className="block mx-auto bg-white border border-slate-300 rounded-xl shadow-lg"/>
        {frameDocument?.getElementById('template-root') && createPortal(<AppErrorBoundary resetKey={templateId} onRecover={onClose}><Suspense fallback={<p className="p-8 text-center">Loading live template…</p>}><LiveWebsite key={templateId} readOnly previewDocument={frameDocument} profile={profile} services={t.services} stylists={t.stylists} onAddAppointment={async () => {throw new Error('This is a template demo. Customize and publish your salon to accept bookings.');}}/></Suspense></AppErrorBoundary>,frameDocument.getElementById('template-root')!)}
      </div>
    </div>
  </dialog>;
}
