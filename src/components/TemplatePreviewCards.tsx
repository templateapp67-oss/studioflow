import {KeshKraftEditor} from './keshkraft/KeshKraftEditor';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, Tablet, X } from 'lucide-react';
import { AppErrorBoundary } from './AppErrorBoundary';
import { loadScreen } from '../lib/loadScreen';
import { createPortal } from 'react-dom';
import { BusinessTypeId, CategoryTemplateConfig, SalonProfile, SalonService, Stylist } from '../types';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../mockData';
import { ACCENT_PALETTES, DEFAULT_CATEGORY_ACCENTS, getContrastTextColor } from '../themeAccents';
import { isArchFlutterTemplate, type ArchFlutterCustomizerConfig, type CustomizerWorkspace } from '../lib/archFlutterCustomizer';
import { isVedaTemplate } from '../lib/vedaSanjeevaniCustomizer';
import { DEFAULT_EXTRAS } from '../lib/workspaceDefaults';
import { syncPreviewStyles } from '../lib/previewStyleSync';
import { nexoraDisplayName, nexoraTemplateMeta, sortTemplatesByPriority } from '../lib/nexoraTemplateCatalogue';
import { NexoraBrandMark } from './nexora/NexoraBrand';

const LiveWebsite = lazy(() => loadScreen(() => import('./SalonWebsitePreview').then(m => ({ default: m.SalonWebsitePreview }))));
/** Template 13 only: the dedicated customizer drawer, loaded on demand. */
const ArchFlutterCustomizerGate = lazy(() => loadScreen(() => import('./arch-flutter-customizer/ArchFlutterCustomizerGate').then(m => ({ default: m.ArchFlutterCustomizerGate }))));
/** Template 14 only: the Veda Sanjeevani customizer drawer, loaded on demand. */
const VedaCustomizerGate = lazy(() => loadScreen(() => import('./veda-sanjeevani/VedaCustomizerGate').then(m => ({ default: m.VedaCustomizerGate }))));

export function TemplateThumbnail({ template: t }: { template: CategoryTemplateConfig }) {
  const isRoopMahal = t.id === 'beauty_parlour';
  const isKeshPrakriti = t.id === 'hair_spa';
  const isVogueNoir = t.id === 'makeup_studio';
  const isBodhiTree = t.id === 'massage_wellness';
  const isPrismChroma = t.id === 'hair_coloring';
  const isShringaar = t.id === 'bridal_lounge';
  const isIronInk = t.id === 'tattoo_studio';
  const isArchFlutter = t.id === 'lash_brow';
  const isLuxuryEditorial = t.id === 'hair_salon';
  const accent = ACCENT_PALETTES[DEFAULT_CATEGORY_ACCENTS[t.id]];
  const accentHex = isLuxuryEditorial ? '#31251F' : isArchFlutter ? '#9A6B73' : isIronInk ? '#E11D48' : isShringaar ? '#5A0F1E' : isVogueNoir ? '#C9A96E' : isBodhiTree ? '#4E6E58' : isPrismChroma ? '#FF4FD8' : isKeshPrakriti ? '#183D32' : isRoopMahal ? '#6D2638' : accent.primaryHex;
  const split = isLuxuryEditorial || (!isVogueNoir && (isRoopMahal || isShringaar || isArchFlutter || ['modern_minimalist', 'clinical_clean', 'contemporary_balanced', 'urban_monochrome'].includes(t.layoutStyle)));
  const rounded = isLuxuryEditorial ? false : isArchFlutter || ['curved_elegant', 'chic_nude', 'zen_emerald', 'earth_bamboo', 'palace_heritage'].includes(t.layoutStyle);
  return <div aria-hidden="true" className="p-4 pb-0 bg-slate-100">
    <div className={`rounded-t-xl border shadow-sm overflow-hidden ${isIronInk ? 'border-[#E11D48]/50 bg-[#0A0A0B]' : isVogueNoir ? 'border-[#2A2A2D] bg-[#0B0B0C]' : isPrismChroma ? 'border-white/20 bg-[#0B0B14]' : isShringaar ? 'border-[#C9A24B]/60 bg-[#FBF4E6]' : isArchFlutter ? 'border-[#C9A66B]/60 bg-[#FBF6F1]' : isLuxuryEditorial ? 'border-[#D8C5A3] bg-[#F7F3EC]' : 'border-slate-300 bg-white'}`}>
      <div className={`h-6 flex items-center gap-1 px-2 border-b ${isIronInk ? 'bg-[#141417] border-white/10' : isVogueNoir ? 'bg-[#151517] border-[#2A2A2D]' : isPrismChroma ? 'bg-[#12121F] border-white/10' : isArchFlutter ? 'bg-[#FFFDFB] border-[#E0CBA6]' : isLuxuryEditorial ? 'bg-[#FBF8F2] border-[#E9E0D4]' : 'bg-white border-slate-200'}`}><i className="w-1.5 h-1.5 rounded-full bg-rose-300"/><i className="w-1.5 h-1.5 rounded-full bg-amber-300"/><i className="w-1.5 h-1.5 rounded-full bg-emerald-300"/><span data-nexora-card-mark className="ml-1.5 inline-flex items-center gap-1 rounded-sm bg-[#2A1E4A] px-1 py-[1px] text-[6px] font-black uppercase tracking-[0.12em] text-[#F5E9D6]">NEXORA</span><span className={`ml-auto text-[7px] ${isVogueNoir ? 'text-[#C9A96E] font-semibold tracking-wider' : isPrismChroma ? 'text-[#35E0F0] font-semibold tracking-wider' : isShringaar ? 'text-[#5A0F1E] font-semibold tracking-[0.18em] uppercase' : isArchFlutter ? 'text-[#7A4F57] font-semibold tracking-[0.18em] uppercase' : isLuxuryEditorial ? 'text-[#6F5B4D] font-semibold tracking-[0.2em] uppercase' : 'text-slate-400'}`}>{isIronInk ? 'IRON & INK · 12' : isShringaar ? 'Shringaar Royal · 11' : isArchFlutter ? 'Arch & Flutter · 13' : t.shortName}</span></div>
      <div className={`relative h-40 overflow-hidden ${t.themeStyle.heroBackground} ${t.themeStyle.heroTextColor} ${split ? 'flex' : ''}`}>
        <img src={t.coverImageUrl} alt="" loading="lazy" decoding="async" style={isShringaar ? { borderTopLeftRadius: '999px', borderTopRightRadius: '999px' } : isArchFlutter ? { borderRadius: '999px 999px 18px 18px' } : undefined} className={`${split ? 'w-1/2 order-2' : 'absolute inset-0 w-full'} h-full object-cover object-top motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105`} />
        {!split && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10"/>}
        <div className={`relative z-10 p-3 flex flex-col justify-end h-full ${split ? 'w-1/2' : 'text-white w-4/5'} ${rounded || isVogueNoir || isLuxuryEditorial ? 'font-serif' : ''}`}>
          <span className={`text-[7px] uppercase tracking-widest mb-2 ${isVogueNoir ? 'text-[#C9A96E]' : isArchFlutter ? 'text-[#8A6A2F]' : 'opacity-80'}`}>{t.defaultCity.split(',')[0]} · {t.shortName}</span>
          <span className={`text-sm font-bold leading-tight ${isVogueNoir ? 'text-[#F5EFE6]' : isArchFlutter ? 'text-[#2B1B17]' : ''}`}>{nexoraDisplayName(t.id, t.title)}</span>
          <span className="text-[8px] leading-relaxed mt-1 line-clamp-2 opacity-80">{t.tagline}</span>
          <span style={{backgroundColor:accentHex, color:getContrastTextColor(accentHex)}} className={`text-[7px] font-sans font-semibold w-fit px-2.5 py-1.5 mt-2 ${rounded ? 'rounded-full' : 'rounded-sm'}`}>Explore services →</span>
        </div>
      </div>
      <div className={`grid grid-cols-3 gap-1.5 p-2 ${isIronInk ? 'bg-[#141417]' : isVogueNoir ? 'bg-[#151517]' : isPrismChroma ? 'bg-[#12121F]' : isArchFlutter ? 'bg-[#FFFDFB]' : isLuxuryEditorial ? 'bg-[#F7F3EC]' : 'bg-white'}`}>{t.services.slice(0,3).map(s => <div key={s.id} className={`border px-1.5 py-2 ${isIronInk ? 'border-[#E11D48]/50 bg-[#0A0A0B]' : isVogueNoir ? 'border-[#2A2A2D] bg-[#0B0B0C]' : isPrismChroma ? 'border-white/10 bg-white/5' : isArchFlutter ? 'border-[#C9A66B]/40 bg-[#F4D7D3]/25' : isLuxuryEditorial ? 'border-[#E9E0D4] bg-[#FBF8F2]' : 'border-slate-100'} ${rounded ? 'rounded-lg' : ''}`}><span className={`block text-[7px] truncate ${isIronInk || isVogueNoir || isPrismChroma ? 'text-[#F5F3FF]' : isArchFlutter ? 'text-[#2B1B17]' : isLuxuryEditorial ? 'text-[#31251F]' : 'text-slate-700'}`}>{s.name}</span><span style={{color:accentHex}} className="text-[8px] font-bold">₹{s.price.toLocaleString('en-IN')}</span></div>)}</div>
    </div>
  </div>;
}

export type TemplateChooseWorkspace = { profile: SalonProfile; services: SalonService[]; stylists: Stylist[]; loyaltyConfig?:import('../types').LoyaltyConfig };

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

/**
 * Real viewport widths per device so the website's own responsive breakpoints
 * genuinely engage — mobile renders the template's mobile layout at a phone
 * width instead of a shrunken desktop page.
 */
const PREVIEW_DEVICES: Array<{ id: PreviewDevice; label: string; width: number; Icon: typeof Monitor }> = [
  { id: 'desktop', label: 'Desktop', width: 1280, Icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: 834, Icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: 390, Icon: Smartphone },
];

/** srcdoc shell: a real viewport meta so media queries behave like a device. */
const PREVIEW_FRAME_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="template-root"></div></body></html>';

export function TemplatePreviewModal({templateId, onSelectPreview, onClose, onChoose, requireAuthToCustomize = false}: {templateId:BusinessTypeId; onSelectPreview:(id:BusinessTypeId)=>void; onClose:()=>void; onChoose:(config?:ArchFlutterCustomizerConfig, workspace?:TemplateChooseWorkspace)=>void; requireAuthToCustomize?:boolean}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);
  const t = CATEGORY_TEMPLATES[templateId];
  /** Templates 13 (Arch & Flutter) and 14 (Veda Sanjeevani) ship their own customizer. */
  const isVeda = isVedaTemplate(templateId);
  const isMens = templateId==='mens_hair_studio';
  const hasCustomizer = isArchFlutterTemplate(templateId) || isVeda || isMens;
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [customized, setCustomized] = useState<{ workspace: CustomizerWorkspace; config: ArchFlutterCustomizerConfig } | null>(null);
  const [vedaWorkspace, setVedaWorkspace] = useState<TemplateChooseWorkspace | null>(null);
  useEffect(() => { setCustomized(null); setVedaWorkspace(null); setCustomizerOpen(false); }, [templateId]);
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
  /* Live stylesheet mirroring into the iframe. Template websites are
   * code-split, so their CSS reaches the host <head> only after the lazy
   * chunk loads — a one-time copy at iframe load misses it and the template
   * renders as unstyled text. The sync keeps the frame's styles current. */
  const stopStyleSync = useRef<(() => void) | null>(null);
  useEffect(() => () => { stopStyleSync.current?.(); stopStyleSync.current = null; }, []);
  /* Fit-to-stage scaling: the preview keeps its true device viewport width
   * and is scaled down visually when the stage is narrower, so there is
   * never a nested horizontal scrollbar and the frame is never clipped. */
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setStageSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const frame = PREVIEW_DEVICES.find(preset => preset.id === device) ?? PREVIEW_DEVICES[0];
  const scale = stageSize.width > 0 ? Math.min(1, stageSize.width / frame.width) : 1;
  const frameHeight = stageSize.height > 0 ? Math.round(stageSize.height / scale) : undefined;
  const baseExtras = {...DEFAULT_EXTRAS, gallery: [] as string[]};
  const profile:SalonProfile = {...INITIAL_SALON_PROFILE, businessType:t.id, businessName:t.title, tagline:t.tagline, about:t.about, ownerName:t.ownerName, ownerRole:t.ownerRole, ownerPhotoUrl:t.ownerPhotoUrl, phone:t.phone, whatsapp:t.whatsapp, coverImageUrl:t.coverImageUrl, themePreset:t.themePreset, themeAccentKey:DEFAULT_CATEGORY_ACCENTS[t.id], city:t.defaultCity, address:t.defaultAddress, postalCode:t.defaultPostalCode, instagramHandle:t.instagramHandle, subdomain:'', requireDeposit:false};
  const previewProfile: SalonProfile = vedaWorkspace ? vedaWorkspace.profile : customized ? customized.workspace.profile : profile;
  const previewServices: SalonService[] = vedaWorkspace ? vedaWorkspace.services : customized ? customized.workspace.services : (t.services as SalonService[]);
  const previewStylists: Stylist[] = vedaWorkspace ? vedaWorkspace.stylists : customized ? customized.workspace.stylists : (t.stylists as Stylist[]);
  return <dialog ref={dialog} aria-labelledby="template-preview-title" onCancel={event => {event.preventDefault(); onClose();}} className="m-auto w-[95vw] max-w-[1520px] h-[92dvh] max-h-[92dvh] p-0 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden backdrop:bg-slate-950/70">
    <div className="h-full flex flex-col bg-slate-100 text-slate-900">
      <header className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-5 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex items-center gap-2">
            <NexoraBrandMark size="sm" />
            <h2 id="template-preview-title" className="font-bold text-sm sm:text-base leading-tight truncate">{nexoraDisplayName(templateId, t.title)}</h2>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
              <span className="font-mono text-[10px] text-slate-500">{nexoraTemplateMeta(templateId)?.templateNumber}</span>
              {nexoraTemplateMeta(templateId)?.categoryName || t.shortName}
            </span>
            <span className="truncate">{requireAuthToCustomize ? 'Explore freely — no account needed to preview. Sign up only when you customize.' : 'Live template demo with sample content; demo bookings are not submitted'}{!requireAuthToCustomize && hasCustomizer && (customized || vedaWorkspace) ? ' · Your customized demo — nothing is published until you create your website' : ''}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Salon demo brand: {t.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Preview template" value={templateId} onChange={event => onSelectPreview(event.target.value as BusinessTypeId)} className="min-h-[44px] border border-slate-300 bg-white rounded-lg px-2 text-xs max-w-36 sm:max-w-60">{sortTemplatesByPriority(Object.values(CATEGORY_TEMPLATES)).map(template => <option key={template.id} value={template.id}>{nexoraDisplayName(template.id, template.shortName)}</option>)}</select>
          <div role="group" aria-label="Preview device" className="flex border border-slate-300 rounded-lg overflow-hidden bg-white">
            {PREVIEW_DEVICES.map(({ id, label, Icon }) => (
              <button key={id} type="button" aria-pressed={device===id} title={`${label} preview`} onClick={() => setDevice(id)} className={`inline-flex items-center justify-center gap-1.5 text-xs min-h-[44px] min-w-[44px] px-2.5 sm:px-3 transition-colors ${device===id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}>
                <Icon size={15} aria-hidden="true" /><span className="hidden lg:inline">{label}</span><span className="sr-only lg:hidden">{label}</span>
              </button>
            ))}
          </div>
          {hasCustomizer && !requireAuthToCustomize
            ? <button type="button" onClick={() => setCustomizerOpen(true)} className="min-h-[44px] rounded-lg border border-[#C9A66B] bg-[#2B1B17] text-[#FBF6F1] font-bold text-xs px-4">Customize this template</button>
            : <button type="button" onClick={() => onChoose()} className="min-h-[44px] rounded-lg border border-slate-300 bg-white font-bold text-xs px-4 hover:bg-slate-50">Customize this template</button>}
          <button type="button" onClick={() => !requireAuthToCustomize && hasCustomizer ? onChoose(customized?.config, vedaWorkspace ?? undefined) : onChoose()} className="min-h-[44px] rounded-lg bg-slate-900 text-white font-bold text-xs px-4 hover:bg-slate-800">Create my website with this template</button>
          <button type="button" autoFocus onClick={onClose} aria-label="Close template preview" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-100"><X size={16} aria-hidden="true" /></button>
        </div>
      </header>
      <div className="flex-1 min-h-0 bg-slate-200/70 px-2 pb-2 pt-2 sm:px-6 sm:pb-5 sm:pt-4">
        <div ref={stageRef} className="h-full w-full flex justify-center overflow-hidden">
          <div style={{ width: Math.round(frame.width * scale), height: '100%' }} className="relative overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-900/10 transition-[width] duration-200 motion-reduce:transition-none">
            <iframe title={`${nexoraDisplayName(templateId, t.title)} live ${device} preview`} srcDoc={PREVIEW_FRAME_HTML} onLoad={event => {
              const doc = event.currentTarget.contentDocument;
              if (!doc) return;
              stopStyleSync.current?.();
              stopStyleSync.current = syncPreviewStyles(doc);
              doc.documentElement.style.fontFamily = 'Inter, sans-serif';
              doc.documentElement.style.background = '#fff';
              setFrameDocument(doc);
            }} style={{width:frame.width,height:frameHeight ?? '100%',border:0,display:'block',transform:scale < 1 ? `scale(${scale})` : undefined,transformOrigin:'top left'}} className="bg-white"/>
          </div>
        </div>
        {frameDocument?.getElementById('template-root') && createPortal(<AppErrorBoundary resetKey={templateId} onRecover={onClose}><Suspense fallback={<p className="p-8 text-center">Loading live template…</p>}><LiveWebsite key={`${templateId}-${customized ? 'custom' : 'demo'}`} readOnly previewDocument={frameDocument} profile={previewProfile} services={previewServices} stylists={previewStylists} loyaltyConfig={vedaWorkspace?.loyaltyConfig} onAddAppointment={async () => {throw new Error('This is a template demo. Customize and publish your salon to accept bookings.');}}/></Suspense></AppErrorBoundary>,frameDocument.getElementById('template-root')!)}
      </div>
      {customizerOpen && isMens && createPortal(<div className="fixed inset-0 z-[120] overflow-y-auto bg-[#f3eee5]" role="dialog" aria-modal="true" aria-label="Customize Template 15"><KeshKraftEditor workspace={{profile:previewProfile,services:previewServices,stylists:previewStylists,loyaltyConfig:vedaWorkspace?.loyaltyConfig}} onSave={next=>setVedaWorkspace(next)} onClose={()=>setCustomizerOpen(false)}/></div>,dialog.current!)}
      {customizerOpen && isVeda && createPortal(
        <AppErrorBoundary resetKey="veda-customizer" onRecover={() => setCustomizerOpen(false)}>
          <Suspense fallback={<p className="p-8 text-center" role="status">Loading the Template 14 customizer…</p>}>
            <VedaCustomizerGate
              demoMode
              siteId=""
              profile={vedaWorkspace ? vedaWorkspace.profile : profile}
              services={previewServices}
              stylists={previewStylists}
              initialTab="launch"
              onApply={(next) => setVedaWorkspace({ profile: next.profile, services: next.services, stylists: next.stylists })}
              onPublish={async () => undefined}
              onClose={() => setCustomizerOpen(false)}
            />
          </Suspense>
        </AppErrorBoundary>,
        document.body,
      )}
      {customizerOpen && !isVeda && !isMens && hasCustomizer && createPortal(
        <AppErrorBoundary resetKey="arch-flutter-customizer" onRecover={() => setCustomizerOpen(false)}>
          <Suspense fallback={<p className="p-8 text-center" role="status">Loading the Template 13 customizer…</p>}>
            <ArchFlutterCustomizerGate
              demoMode
              siteId=""
              profile={profile}
              services={previewServices}
              stylists={previewStylists}
              extras={customized ? customized.workspace.extras : baseExtras}
              initialTab="brand"
              onApply={(workspace, config) => { setCustomized({ workspace, config }); }}
              onClose={() => setCustomizerOpen(false)}
            />
          </Suspense>
        </AppErrorBoundary>,
        document.body,
      )}
    </div>
  </dialog>;
}
