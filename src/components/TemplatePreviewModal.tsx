import '../app.css';
import {KeshKraftEditor} from './keshkraft/KeshKraftEditor';
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Rocket, Sliders, X } from 'lucide-react';
import { AppErrorBoundary } from './AppErrorBoundary';
import {
  PREVIEW_DEVICES,
  PreviewViewportControls,
  UnifiedTemplateActionButton,
  previewDialogClass,
  previewFrameClass,
  previewFrameWidth,
  previewStageClass,
  type PreviewDeviceId,
  type TemplateAction,
} from './template-preview/TemplatePreviewChrome';
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
export type TemplateChooseWorkspace = { profile: SalonProfile; services: SalonService[]; stylists: Stylist[]; loyaltyConfig?:import('../types').LoyaltyConfig };

/** srcdoc shell: a real viewport meta so media queries behave like a device. */
const PREVIEW_FRAME_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="template-root"></div></body></html>';

export function TemplatePreviewModal({templateId, onSelectPreview, onClose, onChoose, requireAuthToCustomize = false}: {templateId:BusinessTypeId; onSelectPreview:(id:BusinessTypeId)=>void; onClose:()=>void; onChoose:(config?:ArchFlutterCustomizerConfig, workspace?:TemplateChooseWorkspace)=>void; requireAuthToCustomize?:boolean}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [device, setDevice] = useState<PreviewDeviceId>('desktop');
  /**
   * Full-page preview mode. Shared by every template: the dialog itself grows
   * to 100% of the viewport (`previewDialogClass`) and the iframe stage drops
   * the dashboard padding/framing so the website can be tested full screen.
   */
  const [fullPage, setFullPage] = useState(false);
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
  const fullPageRef = useRef(fullPage);
  fullPageRef.current = fullPage;
  /** Escape always leaves full-page mode first; a second Escape closes the preview. */
  const handleEscape = useCallback(() => {
    if (fullPageRef.current) { setFullPage(false); return; }
    onClose();
  }, [onClose]);
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) { if(typeof el.showModal==='function') el.showModal(); else el.setAttribute('open',''); }
    if(typeof document==='undefined')return;const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event:KeyboardEvent) => {
      if(event.key === 'Escape') { event.preventDefault(); handleEscape(); return; }
      /* “F” toggles the full-page test view without hunting for the button. */
      if((event.key === 'f' || event.key === 'F') && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const typing = !!target && typeof target.closest === 'function' && !!target.closest('input, textarea, select, [contenteditable="true"]');
        if (typing) return;
        event.preventDefault();
        setFullPage(value => !value);
      }
    };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('keydown', escape); document.body.style.overflow = previousOverflow; if(el?.open){if(typeof el.close==='function')el.close();else el.removeAttribute('open');} };
  }, [handleEscape]);
  useEffect(() => {
    if (!frameDocument) return;
    const escape = (event:KeyboardEvent) => { if(event.key === 'Escape') {event.preventDefault(); handleEscape();} };
    frameDocument.addEventListener('keydown', escape);
    return () => frameDocument.removeEventListener('keydown', escape);
  }, [frameDocument, handleEscape]);
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
  /* Full-page desktop is fluid (100% of the viewport); tablet/mobile keep their
   * true device widths so their responsive layouts stay honest. */
  const frameWidth = previewFrameWidth({ fullPage, device, stageWidth: stageSize.width, desktopWidth: frame.width });
  /* A full-page desktop preview is genuinely fluid: the iframe is 100% of the
   * screen instead of a 1280px viewport scaled to fit. */
  const fluidDesktop = fullPage && device === 'desktop';
  const scale = !fluidDesktop && stageSize.width > 0 ? Math.min(1, stageSize.width / frameWidth) : 1;
  const frameHeight = !fluidDesktop && stageSize.height > 0 ? Math.round(stageSize.height / scale) : undefined;
  const baseExtras = {...DEFAULT_EXTRAS, gallery: [] as string[]};
  const profile:SalonProfile = {...INITIAL_SALON_PROFILE, businessType:t.id, businessName:t.title, tagline:t.tagline, about:t.about, ownerName:t.ownerName, ownerRole:t.ownerRole, ownerPhotoUrl:t.ownerPhotoUrl, phone:t.phone, whatsapp:t.whatsapp, coverImageUrl:t.coverImageUrl, themePreset:t.themePreset, themeAccentKey:DEFAULT_CATEGORY_ACCENTS[t.id], city:t.defaultCity, address:t.defaultAddress, postalCode:t.defaultPostalCode, instagramHandle:t.instagramHandle, subdomain:'', requireDeposit:false};
  const previewProfile: SalonProfile = vedaWorkspace ? vedaWorkspace.profile : customized ? customized.workspace.profile : profile;
  const previewServices: SalonService[] = vedaWorkspace ? vedaWorkspace.services : customized ? customized.workspace.services : (t.services as SalonService[]);
  const previewStylists: Stylist[] = vedaWorkspace ? vedaWorkspace.stylists : customized ? customized.workspace.stylists : (t.stylists as Stylist[]);
  /* Both original header buttons live inside this one merged action, so every
   * customizer drawer, auth gate and create-website hand-off still triggers —
   * it is simply organised instead of overlapping. */
  const customizeAction: TemplateAction = hasCustomizer && !requireAuthToCustomize
    ? { id: 'customize', label: 'Customize this template', description: 'Open this template’s design studio: brand, sections, services and media.', icon: Sliders, onSelect: () => setCustomizerOpen(true) }
    : { id: 'customize', label: 'Customize this template', description: requireAuthToCustomize ? 'The preview stays free — sign up when you are ready to customise.' : 'Start the guided setup and tailor this template to your studio.', icon: Sliders, onSelect: () => onChoose() };
  const buildAction: TemplateAction = {
    id: 'build',
    label: 'Create my website with this template',
    description: customized || vedaWorkspace
      ? 'Carry your saved customisations into your own salon website.'
      : 'Set up your own salon website on this template — nothing publishes until you say so.',
    icon: Rocket,
    onSelect: () => (hasCustomizer && !requireAuthToCustomize ? onChoose(customized?.config, vedaWorkspace ?? undefined) : onChoose()),
  };
  const templateActions = [customizeAction, buildAction];
  return <dialog ref={dialog} aria-labelledby="template-preview-title" data-preview-mode={fullPage ? 'full-page' : 'windowed'} onCancel={event => {event.preventDefault(); handleEscape();}} className={previewDialogClass(fullPage)}>
    <div className="h-full flex flex-col bg-slate-100 text-slate-900">
      <header className={`relative z-30 shrink-0 bg-white border-b border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-2 ${fullPage ? 'px-2.5 py-1.5' : 'px-3 sm:px-5 py-2'}`}>
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex items-center gap-2">
            <NexoraBrandMark size="sm" />
            <h2 id="template-preview-title" className="font-bold text-sm sm:text-base leading-tight truncate">{nexoraDisplayName(templateId, t.title)}</h2>
            {fullPage && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Full page</span>}
          </div>
          {!fullPage && <>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                <span className="font-mono text-[10px] text-slate-500">{nexoraTemplateMeta(templateId)?.templateNumber}</span>
                {nexoraTemplateMeta(templateId)?.categoryName || t.shortName}
              </span>
              <span className="truncate">{requireAuthToCustomize ? 'Explore freely — no account needed to preview. Sign up only when you customize.' : 'Live template demo with sample content; demo bookings are not submitted'}{!requireAuthToCustomize && hasCustomizer && (customized || vedaWorkspace) ? ' · Your customized demo — nothing is published until you create your website' : ''}</span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">Salon demo brand: {t.title}</p>
          </>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Preview template" value={templateId} onChange={event => onSelectPreview(event.target.value as BusinessTypeId)} className={`min-h-[44px] border border-slate-300 bg-white rounded-lg px-2 text-xs max-w-36 sm:max-w-60 ${fullPage ? 'hidden sm:block' : ''}`}>{sortTemplatesByPriority(Object.values(CATEGORY_TEMPLATES)).map(template => <option key={template.id} value={template.id}>{nexoraDisplayName(template.id, template.shortName)}</option>)}</select>
          <PreviewViewportControls device={device} onDeviceChange={setDevice} fullPage={fullPage} onToggleFullPage={() => setFullPage(value => !value)} />
          <UnifiedTemplateActionButton actions={templateActions} badge={customized || vedaWorkspace ? 'Customized' : undefined} />
          <button type="button" autoFocus onClick={onClose} aria-label={fullPage ? 'Exit full-page preview and close' : 'Close template preview'} title="Close template preview (Esc)" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-100"><X size={16} aria-hidden="true" /></button>
        </div>
      </header>
      <div className={previewStageClass(fullPage)}>
        <div ref={stageRef} className="h-full w-full flex justify-center overflow-hidden">
          <div style={{ width: fluidDesktop ? '100%' : Math.round(frameWidth * scale), height: '100%' }} className={previewFrameClass(fullPage)}>
            <iframe title={`${nexoraDisplayName(templateId, t.title)} live ${device} preview`} srcDoc={PREVIEW_FRAME_HTML} onLoad={event => {
              const doc = event.currentTarget.contentDocument;
              if (!doc) return;
              stopStyleSync.current?.();
              stopStyleSync.current = syncPreviewStyles(doc);
              doc.documentElement.style.fontFamily = 'Inter, sans-serif';
              doc.documentElement.style.background = '#fff';
              setFrameDocument(doc);
            }} style={{width:fluidDesktop ? '100%' : frameWidth,height:frameHeight ?? '100%',border:0,display:'block',transform:scale < 1 ? `scale(${scale})` : undefined,transformOrigin:'top left'}} className="bg-white"/>
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
