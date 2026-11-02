import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Redo2,
  Rocket,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../../types';
import {
  VEDA_BUTTON_STYLES,
  VEDA_FONT_PAIRS,
  VEDA_LAYOUTS,
  VEDA_SECTION_LABELS,
  VEDA_SERVICE_CATEGORIES,
  VEDA_THEMES,
  resolveVedaConfig,
  vedaFormatInr,
  type VedaConfig,
  type VedaFaq,
  type VedaGalleryImage,
  type VedaOffer,
  type VedaPackage,
  type VedaSectionId,
  type VedaTestimonial,
} from '../../lib/vedaSanjeevani';
import {
  VEDA_AI_MODES,
  applyVedaAiContent,
  clearVedaDraft,
  loadVedaDraft,
  saveVedaDraft,
  requestVedaAiContent,
  vedaAiDetails,
  vedaApplyImageTarget,
  vedaBlockingIssues,
  vedaConfigPatch,
  vedaCustomizerAccess,
  vedaHistory,
  vedaImageTargets,
  vedaSectionHasEdits,
  vedaLaunchProgress,
  vedaLaunchSteps,
  vedaPushHistory,
  vedaRedo,
  vedaResetSection,
  vedaUndo,
  validateVedaConfig,
  type VedaLaunchStep,
} from '../../lib/vedaSanjeevaniCustomizer';
import { VedaImageField } from './VedaImageField';
import { VedaImageStudio } from './VedaImageStudio';
import { VedaSanjeevaniWebsite } from './VedaSanjeevaniWebsite';
import './vedaCustomizer.css';

export type VedaCustomizerTab = 'launch' | 'business' | 'content' | 'design' | 'therapies' | 'photos' | 'studio' | 'booking' | 'seo';

const TABS: Array<{ id: VedaCustomizerTab; label: string }> = [
  { id: 'launch', label: 'Launch' },
  { id: 'business', label: 'Business' },
  { id: 'content', label: 'Content & AI' },
  { id: 'design', label: 'Design' },
  { id: 'therapies', label: 'Therapies' },
  { id: 'photos', label: 'Photos' },
  { id: 'studio', label: 'Image studio' },
  { id: 'booking', label: 'Booking' },
  { id: 'seo', label: 'SEO' },
];

export type VedaCustomizerProps = {
  siteId: string;
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  publishedSlug?: string | null;
  access?: { allowed: boolean; reason: string };
  initialTab?: VedaCustomizerTab;
  onApply: (next: { profile: SalonProfile; services: SalonService[]; stylists: Stylist[] }) => void;
  onPublish?: () => Promise<void>;
  onClose: () => void;
};

type BusinessDraft = Pick<
  SalonProfile,
  'businessName' | 'tagline' | 'phone' | 'whatsapp' | 'email' | 'address' | 'city' | 'instagramHandle' | 'about' | 'logoUrl'
> & { facebookPage?: string; youtubeChannel?: string; openTime?: string; closeTime?: string; workingHoursMonFri?: string; workingHoursSat?: string; workingHoursSun?: string };

const readBusiness = (profile: SalonProfile): BusinessDraft => ({
  businessName: profile.businessName || '',
  tagline: profile.tagline || '',
  phone: profile.phone || '',
  whatsapp: profile.whatsapp || '',
  email: profile.email || '',
  address: profile.address || '',
  city: profile.city || '',
  instagramHandle: profile.instagramHandle || '',
  about: profile.about || '',
  logoUrl: profile.logoUrl || '',
  facebookPage: (profile as any).facebookPage || '',
  youtubeChannel: (profile as any).youtubeChannel || '',
  openTime: (profile as any).openTime || '09:30',
  closeTime: (profile as any).closeTime || '20:00',
  workingHoursMonFri: (profile as any).workingHoursMonFri || '9:30 am – 8:00 pm',
  workingHoursSat: (profile as any).workingHoursSat || '9:00 am – 8:30 pm',
  workingHoursSun: (profile as any).workingHoursSun || '10:00 am – 6:00 pm',
});

/**
 * Template 14 — "Customize this template" drawer.
 *
 * One simple, tabbed surface for a non-technical owner: business details, AI
 * content generation, design presets, the therapy menu with prices, photos with
 * automatic optimisation, the AI Image Studio, booking handoff and SEO. Every
 * change is kept in a draft with undo/redo and an autosave, then applied through
 * the workspace's normal save when the owner presses Save.
 */
export function VedaCustomizer({ siteId, profile, services, stylists, publishedSlug, access, initialTab = 'launch', onApply, onPublish, onClose }: VedaCustomizerProps) {
  const [tab, setTab] = useState<VedaCustomizerTab>(initialTab);
  const [config, setConfig] = useState<VedaConfig>(() => resolveVedaConfig((profile as any).veda));
  const [history, setHistory] = useState(() => vedaHistory(config));
  const [business, setBusiness] = useState<BusinessDraft>(() => readBusiness(profile));
  const [serviceList, setServiceList] = useState<SalonService[]>(() => services.map((service) => ({ ...service })));
  const [team, setTeam] = useState<Stylist[]>(() => stylists.map((person) => ({ ...person })));
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [aiBusy, setAiBusy] = useState<string>('');
  /** Set when a generation would replace the owner's own copy. */
  const [confirmAi, setConfirmAi] = useState<string>('');
  const [aiNotice, setAiNotice] = useState('');
  const [busyUpload, setBusyUpload] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewPage, setPreviewPage] = useState<'home' | 'therapies' | 'packages' | 'contact'>('home');
  const [draftPrompt, setDraftPrompt] = useState<{ savedAt: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const allowed = access ? access.allowed : vedaCustomizerAccess({ templateId: profile.businessType }).allowed;
  const denial = access?.reason || 'Only the owner of this website can open the customizer.';

  /* ---------- draft persistence ---------- */
  useEffect(() => {
    const saved = loadVedaDraft(siteId);
    if (saved && JSON.stringify(saved.config) !== JSON.stringify(resolveVedaConfig((profile as any).veda))) {
      setDraftPrompt({ savedAt: saved.savedAt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      if (saveVedaDraft(siteId, config)) setDraftPrompt(null);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [config, dirty, siteId]);

  const restoreDraft = () => {
    const saved = loadVedaDraft(siteId);
    if (!saved) return;
    setConfig(saved.config);
    setHistory(vedaHistory(saved.config));
    setDirty(true);
    setDraftPrompt(null);
    setNotice('Unsaved draft restored. Review it before saving.');
  };
  const discardDraft = () => {
    clearVedaDraft(siteId);
    setDraftPrompt(null);
    setNotice('Saved draft discarded.');
  };

  /* ---------- editing helpers ---------- */
  const commit = useCallback((updater: (previous: VedaConfig) => VedaConfig) => {
    setConfig((previous) => {
      const next = updater(previous);
      setHistory((old) => vedaPushHistory(old, previous));
      return next;
    });
    setDirty(true);
    setNotice('');
  }, []);

  const patch = useCallback(
    <K extends keyof VedaConfig>(key: K, value: Partial<VedaConfig[K]>) => {
      commit((previous) => ({ ...previous, [key]: { ...(previous[key] as object), ...(value as object) } } as VedaConfig));
    },
    [commit],
  );

  const undo = () => {
    const next = vedaUndo(history);
    setHistory(next);
    setConfig(next.present);
    setDirty(true);
  };
  const redo = () => {
    const next = vedaRedo(history);
    setHistory(next);
    setConfig(next.present);
    setDirty(true);
  };

  /* ---------- AI image studio destinations ---------- */
  const imageTargets = useMemo(() => vedaImageTargets(config, serviceList), [config, serviceList]);
  const applyImage = useCallback(
    (url: string, targetId: string) => {
      const applied = vedaApplyImageTarget(config, serviceList, targetId, url);
      commit(() => applied.config);
      if (applied.services !== serviceList) {
        setServiceList(applied.services);
        setDirty(true);
      }
    },
    [commit, config, serviceList],
  );

  /* ---------- validation, save, publish ---------- */
  const issues = useMemo(
    () => validateVedaConfig(config, { ...profile, ...business } as SalonProfile),
    [config, profile, business],
  );
  const blocking = vedaBlockingIssues(issues);

  const save = async (thenPublish = false) => {
    setError('');
    setNotice('');
    if (thenPublish && blocking.length) {
      setError('Fix these first, then publish: ' + blocking.map((issue) => issue.message).join(' '));
      setTab('seo');
      return;
    }
    setSaving(true);
    try {
      const nextProfile = {
        ...profile,
        ...business,
        businessName: business.businessName.trim() || profile.businessName,
        veda: vedaConfigPatch(config).veda,
      } as SalonProfile;
      onApply({ profile: nextProfile, services: serviceList, stylists: team });
      clearVedaDraft(siteId);
      setDirty(false);
      setNotice('Saved to your workspace. Publish when you are ready to make it live.');
      if (thenPublish && onPublish) {
        setPublishing(true);
        await onPublish();
        setNotice('Published. Your website is live.');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  /* ---------- AI ---------- */
  /**
   * Regeneration never silently overwrites the owner's own words: if the
   * section already differs from the template default we ask first.
   */
  const generate = async (mode: (typeof VEDA_AI_MODES)[number]['id']) => {
    if (vedaSectionHasEdits(config, mode)) {
      setConfirmAi(mode);
      return;
    }
    await runGenerate(mode);
  };

  const runGenerate = async (mode: (typeof VEDA_AI_MODES)[number]['id']) => {
    setConfirmAi(null);
    setAiBusy(mode);
    setError('');
    setAiNotice('');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const details = vedaAiDetails({ ...profile, ...business } as SalonProfile, serviceList);
      const result = await requestVedaAiContent(mode, details, controller.signal);
      const applied = applyVedaAiContent(config, serviceList, team, result.content, mode);
      commit(() => applied.config);
      setServiceList(applied.services);
      setTeam(applied.stylists);
      setAiNotice(result.notice);
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : 'Content generation failed. You can still write it yourself.');
    } finally {
      setAiBusy('');
    }
  };

  const launchSteps = useMemo(
    () => vedaLaunchSteps({ config, profile: { ...profile, ...business } as SalonProfile, services: serviceList, stylists: team, publishedSlug }),
    [config, profile, business, serviceList, team, publishedSlug],
  );
  const progress = vedaLaunchProgress(launchSteps);

  const previewProfile = useMemo(
    () => ({ ...profile, ...business, veda: vedaConfigPatch(config).veda } as SalonProfile),
    [profile, business, config],
  );

  if (!allowed) {
    return (
      <div className="vdc-backdrop" role="dialog" aria-modal="true" aria-label="Template 14 customizer">
        <section className="vdc-denied">
          <h2>Customizer locked</h2>
          <p>{denial}</p>
          <button type="button" className="vdc-btn" onClick={onClose}>Close</button>
        </section>
      </div>
    );
  }

  return (
    <div className="vdc-backdrop" role="dialog" aria-modal="true" aria-label="Template 14 customizer">
      <div className="vdc-shell">
        <header className="vdc-topbar">
          <div className="vdc-topbar__title">
            <span className="vdc-eyebrow">Template 14 · Veda Sanjeevani</span>
            <h2>Customize this template</h2>
            <p className="vdc-hint">
              {progress.done} of {progress.total} launch steps done
              <span className="vdc-meter" aria-hidden="true"><span style={{ width: `${progress.percent}%` }} /></span>
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </p>
          </div>
          <div className="vdc-topbar__actions">
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={undo} disabled={!history.past.length} aria-label="Undo">
              <Undo2 size={15} aria-hidden="true" />
            </button>
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={redo} disabled={!history.future.length} aria-label="Redo">
              <Redo2 size={15} aria-hidden="true" />
            </button>
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => setPreviewOpen((open) => !open)} aria-pressed={previewOpen}>
              {previewOpen ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />} Preview
            </button>
            <button type="button" className="vdc-btn" onClick={() => void save(false)} disabled={saving || busyUpload}>
              {saving ? <Loader2 size={15} className="vdc-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />} Save
            </button>
            <button type="button" className="vdc-btn vdc-btn--primary" onClick={() => void save(true)} disabled={saving || publishing || busyUpload || !onPublish}>
              {publishing ? <Loader2 size={15} className="vdc-spin" aria-hidden="true" /> : <Rocket size={15} aria-hidden="true" />} Save &amp; publish
            </button>
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={onClose} aria-label="Close customizer">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        {draftPrompt ? (
          <div className="vdc-banner" role="status">
            <span>You have unsaved changes from an earlier session.</span>
            <button type="button" className="vdc-btn vdc-btn--primary" onClick={restoreDraft}>Restore</button>
            <button type="button" className="vdc-btn" onClick={discardDraft}>Discard</button>
          </div>
        ) : null}
        {notice ? <p className="vdc-banner vdc-banner--ok" role="status">{notice}</p> : null}
        {error ? <p className="vdc-banner vdc-banner--error" role="alert">{error}</p> : null}
        {aiNotice ? <p className="vdc-banner vdc-banner--ai" role="status">{aiNotice}</p> : null}

        <div className={`vdc-body${previewOpen ? ' vdc-body--split' : ''}`}>
          <div className="vdc-main">
            <nav className="vdc-tabs" aria-label="Customizer sections">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={tab === item.id ? 'is-active' : ''}
                  aria-pressed={tab === item.id}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="vdc-scroll">
              {confirmAi ? (
                <div className="vdc-banner vdc-banner--warn" role="alert">
                  <strong>Keep your writing?</strong>{' '}
                  This section already has text you or your team wrote. Generating again will replace it. Nothing is
                  replaced until you choose.
                  <div className="vdc-row vdc-row--wrap" style={{ marginTop: 8 }}>
                    <button type="button" className="vdc-btn vdc-btn--primary" onClick={() => void runGenerate(confirmAi as any)}>
                      Replace with new AI text
                    </button>
                    <button type="button" className="vdc-btn" onClick={() => setConfirmAi('')}>Keep my text</button>
                  </div>
                </div>
              ) : null}
              {tab === 'launch' ? (
                <LaunchTab
                  steps={launchSteps}
                  progress={progress}
                  config={config}
                  profile={{ ...profile, ...business } as SalonProfile}
                  publishedSlug={publishedSlug}
                  issues={issues}
                  onJump={(next) => setTab(next)}
                  onPublish={() => void save(true)}
                  onGenerateAll={() => void generate('all')}
                  generating={aiBusy === 'all'}
                  onOpenSite={publishedSlug ? () => window.open(`/?site=${encodeURIComponent(publishedSlug)}`, '_blank', 'noopener') : undefined}
                />
              ) : null}

              {tab === 'business' ? (
                <BusinessTab
                  business={business}
                  setBusiness={(next) => { setBusiness(next); setDirty(true); }}
                  logoSlot={
                    <VedaImageField
                      label="Logo"
                      slot="logo"
                      presetId="logo"
                      value={business.logoUrl || ''}
                      onChange={(url) => { setBusiness({ ...business, logoUrl: url }); setDirty(true); }}
                      onBusyChange={setBusyUpload}
                      hint="Square PNG with a transparent background looks best in the header."
                    />
                  }
                />
              ) : null}

              {tab === 'content' ? (
                <ContentTab
                  config={config}
                  patch={patch}
                  commit={commit}
                  generate={generate}
                  aiBusy={aiBusy}
                  team={team}
                  setTeam={(next) => { setTeam(next); setDirty(true); }}
                  serviceList={serviceList}
                />
              ) : null}

              {tab === 'design' ? (
                <DesignTab
                  config={config}
                  patch={patch}
                  commit={commit}
                  styleOptions={{ setTab }}
                  onGenerate={(mode) => void generate(mode)}
                  aiBusy={aiBusy}
                />
              ) : null}

              {tab === 'therapies' ? (
                <TherapiesTab
                  services={serviceList}
                  setServices={(next) => { setServiceList(next); setDirty(true); }}
                  config={config}
                  onGenerate={() => void generate('services')}
                  generating={aiBusy === 'services'}
                  onBusyChange={setBusyUpload}
                />
              ) : null}

              {tab === 'photos' ? (
                <PhotosTab
                  config={config}
                  patch={patch}
                  commit={commit}
                  team={team}
                  setTeam={(next) => { setTeam(next); setDirty(true); }}
                  onBusyChange={setBusyUpload}
                  onOpenStudio={() => setTab('studio')}
                />
              ) : null}

              {tab === 'studio' ? (
                <VedaImageStudio
                  onUsePhoto={() => setTab('photos')}
                  targets={imageTargets}
                  onApplyImage={applyImage}
                  onBusyChange={setBusyUpload}
                  aiDetails={vedaAiDetails({ ...profile, ...business } as SalonProfile, serviceList)}
                />
              ) : null}

              {tab === 'booking' ? <BookingTab config={config} patch={patch} business={business} setBusiness={(next) => { setBusiness(next); setDirty(true); }} /> : null}

              {tab === 'seo' ? (
                <SeoTab
                  config={config}
                  patch={patch}
                  issues={issues}
                  generate={(mode) => void generate(mode)}
                  aiBusy={aiBusy}
                  publishedSlug={publishedSlug}
                  onPublish={() => void save(true)}
                  publishing={publishing}
                  profile={{ ...profile, ...business } as SalonProfile}
                  services={serviceList}
                />
              ) : null}
            </div>

            <footer className="vdc-savebar">
              <span className="vdc-hint">
                {dirty ? 'Draft saved on this device — press Save to store it in your workspace.' : 'No unsaved changes.'}
              </span>
              <div className="vdc-row">
                <button type="button" className="vdc-btn" onClick={() => setConfig(vedaResetSection(config, 'all'))} disabled={saving}>
                  Reset to template defaults
                </button>
                <button type="button" className="vdc-btn vdc-btn--primary" onClick={() => void save(false)} disabled={saving || busyUpload}>
                  Save changes
                </button>
              </div>
            </footer>
          </div>

          {previewOpen ? (
            <aside className="vdc-preview" aria-label="Live preview">
              <div className="vdc-preview__head">
                <span>Live preview</span>
                <div className="vdc-row">
                  {(['home', 'therapies', 'packages', 'contact'] as const).map((page) => (
                    <button key={page} type="button" className={previewPage === page ? 'is-active' : ''} onClick={() => setPreviewPage(page)}>
                      {page}
                    </button>
                  ))}
                </div>
              </div>
              <div className="vdc-preview__frame">
                <div className="vdc-preview__viewport" key={`${config.theme}-${config.fontPair}-${config.layout}-${previewPage}`}>
                  <VedaSanjeevaniWebsite
                    profile={previewProfile}
                    services={serviceList}
                    stylists={team}
                    galleryPhotos={[]}
                    onBook={() => {}}
                    onAccount={() => {}}
                    onMyBookings={() => {}}
                    onViewSpecialist={() => {}}
                    bookingAvailable={false}
                    page={previewPage}
                  />
                </div>
              </div>
              <p className="vdc-hint">The preview is a real render of your website. Everything you change appears here immediately.</p>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 * Tabs
 * ================================================================== */

function Label({ children }: { children: React.ReactNode }) {
  return <span className="vdc-label">{children}</span>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  hint?: string;
}) {
  const id = React.useId();
  return (
    <label className="vdc-field" htmlFor={id}>
      <Label>{label}</Label>
      <input id={id} className="vdc-input" type={type} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
      {hint ? <span className="vdc-hint">{hint}</span> : null}
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 3,
  maxLength = 1200,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <label className="vdc-field">
      <Label>{label}</Label>
      <textarea className="vdc-input" rows={rows} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
      <span className="vdc-hint">{hint || `${value.length}/${maxLength} characters`}</span>
    </label>
  );
}

function LaunchTab({
  steps,
  progress,
  config,
  profile,
  publishedSlug,
  issues,
  onJump,
  onPublish,
  onGenerateAll,
  generating,
  onOpenSite,
}: {
  steps: VedaLaunchStep[];
  progress: { done: number; total: number; percent: number };
  config: VedaConfig;
  profile: SalonProfile;
  publishedSlug?: string | null;
  issues: ReturnType<typeof validateVedaConfig>;
  onJump: (tab: VedaCustomizerTab) => void;
  onPublish: () => void;
  onGenerateAll: () => void;
  generating: boolean;
  onOpenSite?: () => void;
}) {
  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>Launch in about 30 minutes</h3>
        <p>
          Work down this list once and your website is ready. Nothing here needs code, and you can stop at any point — your
          progress is kept on this device until you save.
        </p>
      </header>

      <div className="vdc-progress-big" role="img" aria-label={`${progress.percent}% of launch steps complete`}>
        <span style={{ width: `${progress.percent}%` }} />
        <b>{progress.percent}%</b>
      </div>

      <ol className="vdc-checklist">
        {steps.map((step) => (
          <li key={step.id} data-done={step.done}>
            <span className="vdc-checklist__mark" aria-hidden="true">{step.done ? <Check size={14} /> : null}</span>
            <div>
              <strong>{step.label}</strong>
              <p className="vdc-hint">{step.hint} · {step.detail}</p>
            </div>
            <button type="button" className="vdc-btn" onClick={() => onJump(step.tab)}>
              {step.done ? 'Review' : 'Do this'}
            </button>
          </li>
        ))}
      </ol>

      <section className="vdc-card">
        <h4><Sparkles size={15} aria-hidden="true" /> Fastest route</h4>
        <ol className="vdc-hint vdc-numbered">
          <li>Fill in Business details (name, phone, WhatsApp, address).</li>
          <li>Press <b>Generate my website content</b> — it writes the hero, story, therapies, packages, offers, FAQs and SEO.</li>
          <li>Pick a colour theme, upload your hero photo (it is cropped and compressed automatically).</li>
          <li>Check the therapies and prices, then choose how bookings should reach you.</li>
          <li>Press <b>Save &amp; publish</b>.</li>
        </ol>
        <div className="vdc-row vdc-row--wrap">
          <button type="button" className="vdc-btn vdc-btn--primary" onClick={onGenerateAll} disabled={generating}>
            {generating ? <Loader2 size={15} className="vdc-spin" aria-hidden="true" /> : <Wand2 size={15} aria-hidden="true" />}
            {config.ai?.lastGeneratedAt ? 'Regenerate everything' : 'Generate my website content'}
          </button>
          <button type="button" className="vdc-btn" onClick={onPublish}>
            <Rocket size={15} aria-hidden="true" /> Save &amp; publish
          </button>
          {onOpenSite ? (
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={onOpenSite}>
              Open live website
            </button>
          ) : null}
        </div>
        {config.ai?.lastGeneratedAt ? (
          <p className="vdc-hint">Last generated {new Date(config.ai.lastGeneratedAt).toLocaleString('en-IN')} · sections: {(config.ai.generated || []).join(', ')}</p>
        ) : null}
      </section>

      {issues.length ? (
        <section className="vdc-card vdc-card--warn">
          <h4><AlertTriangle size={15} aria-hidden="true" /> Before you publish</h4>
          <ul className="vdc-issues">
            {issues.map((issue) => (
              <li key={issue.field + issue.message} data-level={issue.level}>
                <b>{issue.level === 'error' ? 'Must fix' : 'Worth fixing'}</b> {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="vdc-hint vdc-hint--ok">
          <Check size={13} aria-hidden="true" /> Nothing is blocking your website: {profile.businessName || 'Veda Sanjeevani'} looks ready to publish.
        </p>
      )}
    </div>
  );
}

function BusinessTab({
  business,
  setBusiness,
  logoSlot,
}: {
  business: BusinessDraft;
  setBusiness: (next: BusinessDraft) => void;
  logoSlot: React.ReactNode;
}) {
  const set = (key: keyof BusinessDraft, value: string) => setBusiness({ ...business, [key]: value });
  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>Business details</h3>
        <p>These appear across the whole website — header, contact section, footer, WhatsApp links and search results.</p>
      </header>
      <div className="vdc-grid2">
        <Field label="Business name" value={business.businessName} onChange={(value) => set('businessName', value)} maxLength={80} />
        <Field label="One-line tagline" value={business.tagline} onChange={(value) => set('tagline', value)} maxLength={120} />
        <Field label="Phone number" value={business.phone} onChange={(value) => set('phone', value)} placeholder="+91 98290 44117" />
        <Field label="WhatsApp number" value={business.whatsapp} onChange={(value) => set('whatsapp', value)} placeholder="+91 98290 44117" hint="Used for every booking button. Include the country code if the guest may be abroad." />
        <Field label="Email" value={business.email} onChange={(value) => set('email', value)} type="email" />
        <Field label="City" value={business.city} onChange={(value) => set('city', value)} placeholder="Kota, Rajasthan" />
        <Field label="Instagram handle" value={business.instagramHandle} onChange={(value) => set('instagramHandle', value)} placeholder="@vedasanjeevani.kota" />
        <Field label="Facebook page link" value={business.facebookPage || ''} onChange={(value) => set('facebookPage', value)} placeholder="https://facebook.com/…" />
      </div>
      <Area label="Street address" value={business.address} onChange={(value) => set('address', value)} rows={2} maxLength={220} />
      <Area label="About your studio (used in About and SEO fallbacks)" value={business.about} onChange={(value) => set('about', value)} rows={4} maxLength={900} />
      <div className="vdc-card">
        <h4>Opening hours</h4>
        <div className="vdc-grid2">
          <Field label="Opens at" value={business.openTime || ''} onChange={(value) => set('openTime', value)} placeholder="09:30" hint="24-hour clock, e.g. 09:30" />
          <Field label="Closes at" value={business.closeTime || ''} onChange={(value) => set('closeTime', value)} placeholder="20:00" />
          <Field label="Monday – Friday" value={business.workingHoursMonFri || ''} onChange={(value) => set('workingHoursMonFri', value)} />
          <Field label="Saturday" value={business.workingHoursSat || ''} onChange={(value) => set('workingHoursSat', value)} />
          <Field label="Sunday" value={business.workingHoursSun || ''} onChange={(value) => set('workingHoursSun', value)} hint="Type “Closed” if you do not open." />
        </div>
      </div>
      <div className="vdc-card">{logoSlot}</div>
    </div>
  );
}

function patchSignature(
  commit: (updater: (previous: VedaConfig) => VedaConfig) => void,
  index: number,
  patch: { title?: string; body?: string; meta?: string },
) {
  commit((previous) => ({
    ...previous,
    signature: {
      ...previous.signature,
      items: previous.signature.items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)),
    },
  }));
}

const HEADING_SECTIONS: Array<{ key: 'therapies' | 'experts' | 'gallery' | 'packages' | 'offers' | 'testimonials' | 'faq' | 'contact'; label: string }> = [
  { key: 'therapies', label: 'Featured therapies' },
  { key: 'experts', label: 'Our experts' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'packages', label: 'Wellness packages' },
  { key: 'offers', label: 'Offers & vouchers' },
  { key: 'testimonials', label: 'Guest stories' },
  { key: 'faq', label: 'Questions' },
  { key: 'contact', label: 'Visit us' },
];

function ContentTab({
  config,
  patch,
  commit,
  generate,
  aiBusy,
  team,
  setTeam,
  serviceList,
}: {
  config: VedaConfig;
  patch: <K extends keyof VedaConfig>(key: K, value: Partial<VedaConfig[K]>) => void;
  commit: (updater: (previous: VedaConfig) => VedaConfig) => void;
  generate: (mode: (typeof VEDA_AI_MODES)[number]['id']) => void;
  aiBusy: string;
  team: Stylist[];
  setTeam: (next: Stylist[]) => void;
  serviceList: SalonService[];
}) {
  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>Content &amp; AI</h3>
        <p>Generate a full draft from your business details, then edit any line. AI never publishes on its own.</p>
      </header>

      <section className="vdc-card vdc-card--ai">
        <h4><Wand2 size={15} aria-hidden="true" /> Generate with AI</h4>
        <div className="vdc-ai-grid">
          {VEDA_AI_MODES.map((mode) => (
            <button key={mode.id} type="button" className="vdc-ai-btn" onClick={() => generate(mode.id)} disabled={Boolean(aiBusy)}>
              {aiBusy === mode.id ? <Loader2 size={14} className="vdc-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
              <span>
                <strong>{mode.label}</strong>
                <small>{mode.hint}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="vdc-hint">
          AI content is a starting draft written from the details you entered and your therapy menu. It is labelled as AI
          content in your workspace notes and stays fully editable. Review it before publishing.
        </p>
      </section>

      <section className="vdc-card">
        <h4>Hero</h4>
        <div className="vdc-grid2">
          <Field label="Eyebrow line" value={config.hero.eyebrow} onChange={(value) => patch('hero', { eyebrow: value })} maxLength={80} />
          <Field label="Photo caption" value={config.hero.caption} onChange={(value) => patch('hero', { caption: value })} maxLength={80} />
          <Field label="Primary button" value={config.hero.primaryCta} onChange={(value) => patch('hero', { primaryCta: value })} maxLength={30} />
          <Field label="Secondary button" value={config.hero.secondaryCta} onChange={(value) => patch('hero', { secondaryCta: value })} maxLength={30} />
        </div>
        <Area label="Headline (use a line break for two lines)" value={config.hero.headline} onChange={(value) => patch('hero', { headline: value })} rows={2} maxLength={120} />
        <Area label="Description" value={config.hero.description} onChange={(value) => patch('hero', { description: value })} rows={3} maxLength={420} />
        <button type="button" className="vdc-btn" onClick={() => generate('hero')} disabled={Boolean(aiBusy)}>Regenerate this section</button>
      </section>

      <section className="vdc-card">
        <h4>Our philosophy</h4>
        <div className="vdc-grid2">
          <Field label="Eyebrow" value={config.philosophy.eyebrow} onChange={(value) => patch('philosophy', { eyebrow: value })} maxLength={60} />
          <Field label="Signature line" value={config.philosophy.signature} onChange={(value) => patch('philosophy', { signature: value })} maxLength={80} />
        </div>
        <Area label="Heading" value={config.philosophy.title} onChange={(value) => patch('philosophy', { title: value })} rows={2} />
        <Area label="Body" value={config.philosophy.body} onChange={(value) => patch('philosophy', { body: value })} rows={4} />
        <Area label="Pull quote" value={config.philosophy.quote} onChange={(value) => patch('philosophy', { quote: value })} rows={2} maxLength={300} />
        <button type="button" className="vdc-btn" onClick={() => generate('philosophy')} disabled={Boolean(aiBusy)}>Regenerate this section</button>
      </section>

      <section className="vdc-card">
        <h4>Section headings</h4>
        <p className="vdc-hint">Keep these short — they render at large sizes on phones.</p>
        {HEADING_SECTIONS.map((section) => (
          <details key={section.key} className="vdc-details">
            <summary>{section.label}</summary>
            <Field label="Eyebrow" value={config[section.key].eyebrow} onChange={(value) => patch(section.key, { eyebrow: value } as any)} maxLength={60} />
            <Area label="Heading" value={config[section.key].title} onChange={(value) => patch(section.key, { title: value } as any)} rows={2} />
            <Area label="Intro" value={config[section.key].body} onChange={(value) => patch(section.key, { body: value } as any)} rows={3} />
            <button type="button" className="vdc-btn" onClick={() => generate(section.key as any)} disabled={Boolean(aiBusy)}>Regenerate {section.label.toLowerCase()}</button>
          </details>
        ))}
      </section>

      <section className="vdc-card">
        <h4>Why choose us</h4>
        {config.why.items.map((item, index) => (
          <div className="vdc-repeat" key={item.id}>
            <Field
              label={`Point ${index + 1} title`}
              value={item.title}
              onChange={(value) => commit((previous) => ({ ...previous, why: { ...previous.why, items: previous.why.items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, title: value } : entry)) } }))}
            />
            <Area
              label="Detail"
              value={item.body}
              rows={2}
              onChange={(value) => commit((previous) => ({ ...previous, why: { ...previous.why, items: previous.why.items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, body: value } : entry)) } }))}
            />
          </div>
        ))}
        <button type="button" className="vdc-btn" onClick={() => generate('why')} disabled={Boolean(aiBusy)}>Regenerate this section</button>
      </section>

      <section className="vdc-card">
        <h4>Signature experiences</h4>
        <p className="vdc-hint">The three rituals that make the sanctuary different. Keep each one short enough to read on a phone.</p>
        {config.signature.items.map((item, index) => (
          <details className="vdc-details" key={item.id}>
            <summary>{item.title}</summary>
            <Field label="Title" value={item.title} onChange={(value) => patchSignature(commit, index, { title: value })} maxLength={70} />
            <Field label="Meta line" value={item.meta} onChange={(value) => patchSignature(commit, index, { meta: value })} maxLength={60} />
            <Area label="Description" value={item.body} rows={3} onChange={(value) => patchSignature(commit, index, { body: value })} maxLength={400} />
          </details>
        ))}
        <button type="button" className="vdc-btn" onClick={() => generate('signature')} disabled={Boolean(aiBusy)}>Regenerate this section</button>
      </section>

      <section className="vdc-card">
        <h4>Wellness packages</h4>
        {config.packages.items.map((item, index) => (
          <details className="vdc-details" key={item.id}>
            <summary>{item.name} · {vedaFormatInr(item.price)}</summary>
            <div className="vdc-grid2">
              <Field label="Package name" value={item.name} onChange={(value) => patchPackage(commit, index, { name: value })} />
              <Field label="Price (₹)" value={String(item.price)} onChange={(value) => patchPackage(commit, index, { price: Number(value.replace(/[^\d]/g, '')) || 0 })} />
              <Field label="Was price (₹, optional)" value={String(item.originalPrice)} onChange={(value) => patchPackage(commit, index, { originalPrice: Number(value.replace(/[^\d]/g, '')) || 0 })} />
              <Field label="Duration" value={item.duration} onChange={(value) => patchPackage(commit, index, { duration: value })} />
            </div>
            <Area label="Tagline" value={item.tagline} onChange={(value) => patchPackage(commit, index, { tagline: value })} rows={2} />
            <Area label="What is included (one per line)" value={item.includes.join('\n')} onChange={(value) => patchPackage(commit, index, { includes: value.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 8) })} rows={4} />
            <VedaImageField
              label="Package photo"
              slot="ritual"
              value={item.imageUrl}
              onChange={(url) => patchPackage(commit, index, { imageUrl: url })}
              compact
            />
          </details>
        ))}
        <button type="button" className="vdc-btn" onClick={() => generate('packages')} disabled={Boolean(aiBusy)}>Regenerate packages</button>
      </section>

      <section className="vdc-card">
        <h4>Offers &amp; gift vouchers</h4>
        {config.offers.items.map((offer, index) => (
          <details className="vdc-details" key={offer.id}>
            <summary>{offer.title} {offer.code ? `· ${offer.code}` : '· voucher'}</summary>
            <div className="vdc-grid2">
              <Field label="Title" value={offer.title} onChange={(value) => patchOffer(commit, index, { title: value })} />
              <Field label="Badge" value={offer.badge} onChange={(value) => patchOffer(commit, index, { badge: value })} />
              <Field label="Code" value={offer.code} onChange={(value) => patchOffer(commit, index, { code: value.toUpperCase() })} />
              <Field label="Valid till (optional)" value={offer.validTill} onChange={(value) => patchOffer(commit, index, { validTill: value })} />
            </div>
            <Area label="Description" value={offer.body} onChange={(value) => patchOffer(commit, index, { body: value })} rows={3} />
            <label className="vdc-check">
              <input type="checkbox" checked={offer.voucher} onChange={(event) => patchOffer(commit, index, { voucher: event.target.checked })} />
              This is a gift voucher (shown in the voucher card)
            </label>
            <VedaImageField label="Offer photo" slot="oil-ritual" presetId="banner" value={offer.imageUrl} onChange={(url) => patchOffer(commit, index, { imageUrl: url })} compact />
          </details>
        ))}
        <button type="button" className="vdc-btn" onClick={() => generate('offers')} disabled={Boolean(aiBusy)}>Regenerate offers</button>
      </section>

      <section className="vdc-card">
        <h4>Guest stories</h4>
        <p className="vdc-hint">Replace sample stories with real guest quotes before you publish. Only publish reviews you have permission to use.</p>
        {config.testimonials.items.map((quote, index) => (
          <details className="vdc-details" key={quote.id}>
            <summary>{quote.name} · {quote.rating}★</summary>
            <div className="vdc-grid2">
              <Field label="Guest name" value={quote.name} onChange={(value) => patchQuote(commit, index, { name: value })} />
              <Field label="Location" value={quote.location} onChange={(value) => patchQuote(commit, index, { location: value })} />
              <Field label="Treatment" value={quote.treatment} onChange={(value) => patchQuote(commit, index, { treatment: value })} />
              <Field label="Rating (1–5)" value={String(quote.rating)} onChange={(value) => patchQuote(commit, index, { rating: Math.min(5, Math.max(1, Number(value) || 5)) })} />
            </div>
            <Area label="Quote" value={quote.quote} onChange={(value) => patchQuote(commit, index, { quote: value })} rows={3} maxLength={400} />
          </details>
        ))}
        <button type="button" className="vdc-btn" onClick={() => generate('testimonials')} disabled={Boolean(aiBusy)}>Generate review placeholders</button>
      </section>

      <section className="vdc-card">
        <h4>Questions (FAQ)</h4>
        {config.faq.items.map((item, index) => (
          <details className="vdc-details" key={item.id}>
            <summary>{item.question}</summary>
            <Field label="Question" value={item.question} onChange={(value) => patchFaq(commit, index, { question: value })} />
            <Area label="Answer" value={item.answer} onChange={(value) => patchFaq(commit, index, { answer: value })} rows={4} />
          </details>
        ))}
        <button type="button" className="vdc-btn" onClick={() => generate('faq')} disabled={Boolean(aiBusy)}>Regenerate FAQs</button>
      </section>

      <section className="vdc-card">
        <h4>Our experts</h4>
        {team.map((person, index) => (
          <details className="vdc-details" key={person.id}>
            <summary>{person.name} · {person.role}</summary>
            <div className="vdc-grid2">
              <Field label="Name" value={person.name} onChange={(value) => setTeam(team.map((entry, entryIndex) => (entryIndex === index ? { ...entry, name: value } : entry)))} />
              <Field label="Role / qualification" value={person.role} onChange={(value) => setTeam(team.map((entry, entryIndex) => (entryIndex === index ? { ...entry, role: value } : entry)))} />
              <Field label="Years of practice" value={String(person.experienceYears || 0)} onChange={(value) => setTeam(team.map((entry, entryIndex) => (entryIndex === index ? { ...entry, experienceYears: Number(value.replace(/[^\d]/g, '')) || 0 } : entry)))} />
              <Field label="Languages" value={(person.languages || []).join(', ')} onChange={(value) => setTeam(team.map((entry, entryIndex) => (entryIndex === index ? { ...entry, languages: value.split(',').map((line) => line.trim()).filter(Boolean) } : entry)))} />
            </div>
            <Area label="Short bio" value={person.bio || ''} onChange={(value) => setTeam(team.map((entry, entryIndex) => (entryIndex === index ? { ...entry, bio: value } : entry)))} rows={3} maxLength={400} />
            <Field label="Specialties (comma separated)" value={person.specialties.join(', ')} onChange={(value) => setTeam(team.map((entry, entryIndex) => (entryIndex === index ? { ...entry, specialties: value.split(',').map((line) => line.trim()).filter(Boolean).slice(0, 4) } : entry)))} />
            <VedaImageField label="Portrait" slot="therapist-ananya" presetId="therapists" value={person.avatarUrl} onChange={(url) => setTeam(team.map((entry, entryIndex) => (entryIndex === index ? { ...entry, avatarUrl: url } : entry)))} compact />
          </details>
        ))}
        <button type="button" className="vdc-btn" onClick={() => generate('experts')} disabled={Boolean(aiBusy)}>Regenerate profiles</button>
      </section>
      <p className="vdc-hint vdc-hint--muted">
        {serviceList.length} therapies are listed. Edit names, prices and durations on the Therapies tab.
      </p>
    </div>
  );
}

function patchPackage(commit: (updater: (previous: VedaConfig) => VedaConfig) => void, index: number, value: Partial<VedaPackage>) {
  commit((previous) => ({
    ...previous,
    packages: { ...previous.packages, items: previous.packages.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)) },
  }));
}
function patchOffer(commit: (updater: (previous: VedaConfig) => VedaConfig) => void, index: number, value: Partial<VedaOffer>) {
  commit((previous) => ({
    ...previous,
    offers: { ...previous.offers, items: previous.offers.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)) },
  }));
}
function patchQuote(commit: (updater: (previous: VedaConfig) => VedaConfig) => void, index: number, value: Partial<VedaTestimonial>) {
  commit((previous) => ({
    ...previous,
    testimonials: { ...previous.testimonials, items: previous.testimonials.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)) },
  }));
}
function patchFaq(commit: (updater: (previous: VedaConfig) => VedaConfig) => void, index: number, value: Partial<VedaFaq>) {
  commit((previous) => ({
    ...previous,
    faq: { ...previous.faq, items: previous.faq.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)) },
  }));
}

function DesignTab({
  config,
  patch,
  commit,
  styleOptions,
  onGenerate,
  aiBusy,
}: {
  config: VedaConfig;
  patch: <K extends keyof VedaConfig>(key: K, value: Partial<VedaConfig[K]>) => void;
  commit: (updater: (previous: VedaConfig) => VedaConfig) => void;
  styleOptions: { setTab: (tab: VedaCustomizerTab) => void };
  onGenerate: (mode: (typeof VEDA_AI_MODES)[number]['id']) => void;
  aiBusy: string;
}) {
  const moveSection = (id: VedaSectionId, direction: -1 | 1) => {
    commit((previous) => {
      const order = [...previous.order];
      const index = order.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= order.length) return previous;
      [order[index], order[target]] = [order[target], order[index]];
      return { ...previous, order };
    });
  };
  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>Design</h3>
        <p>Four curated palettes and four type pairings — every combination is checked for readability. No colour pickers to get wrong.</p>
      </header>

      <section className="vdc-card">
        <h4>Colour theme</h4>
        <div className="vdc-themes">
          {VEDA_THEMES.map((theme) => (
            <button key={theme.id} type="button" className={`vdc-theme${config.theme === theme.id ? ' is-active' : ''}`} onClick={() => commit((previous) => ({ ...previous, theme: theme.id }))}>
              <span className="vdc-theme__swatch" aria-hidden="true">
                <i style={{ background: theme.forest }} />
                <i style={{ background: theme.ivory }} />
                <i style={{ background: theme.sand }} />
                <i style={{ background: theme.sage }} />
                <i style={{ background: theme.gold }} />
              </span>
              <strong>{theme.label}</strong>
              <small>{theme.description}</small>
              {config.theme === theme.id ? <span className="vdc-theme__check"><Check size={13} aria-hidden="true" /></span> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="vdc-card">
        <h4>Typography</h4>
        <div className="vdc-themes vdc-themes--stack">
          {VEDA_FONT_PAIRS.map((pair) => (
            <button key={pair.id} type="button" className={`vdc-theme${config.fontPair === pair.id ? ' is-active' : ''}`} onClick={() => commit((previous) => ({ ...previous, fontPair: pair.id }))}>
              <strong style={{ fontFamily: pair.headingStack, fontSize: '1.4rem' }}>{pair.heading}</strong>
              <small style={{ fontFamily: pair.bodyStack }}>{pair.body} — {pair.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="vdc-card">
        <h4>Layout &amp; buttons</h4>
        <div className="vdc-grid2">
          <label className="vdc-field">
            <Label>Hero layout</Label>
            <select className="vdc-input" value={config.layout} onChange={(event) => commit((previous) => ({ ...previous, layout: event.target.value as VedaConfig['layout'] }))}>
              {VEDA_LAYOUTS.map((layout) => <option key={layout.id} value={layout.id}>{layout.label} — {layout.hint}</option>)}
            </select>
          </label>
          <label className="vdc-field">
            <Label>Button style</Label>
            <select className="vdc-input" value={config.buttonStyle} onChange={(event) => commit((previous) => ({ ...previous, buttonStyle: event.target.value as VedaConfig['buttonStyle'] }))}>
              {VEDA_BUTTON_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label} — {style.hint}</option>)}
            </select>
          </label>
        </div>
        <Field label="Announcement bar text" value={config.announcement.text} onChange={(value) => patch('announcement', { text: value })} maxLength={160} hint="Keep offers short and specific. Turn it off below." />
        <button type="button" className="vdc-btn" onClick={() => onGenerate('announcement')} disabled={Boolean(aiBusy)}>Write an offer line for me</button>
      </section>

      <section className="vdc-card">
        <h4>Sections</h4>
        <p className="vdc-hint">Hide anything you do not want on the website, and move sections up or down to change the order.</p>
        <ul className="vdc-sections">
          {config.order.map((id, index) => (
            <li key={id} data-hidden={!config.sections[id]}>
              <span className="vdc-sections__name">{VEDA_SECTION_LABELS[id]}</span>
              <div className="vdc-row">
                <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => moveSection(id, -1)} disabled={index === 0} aria-label={`Move ${VEDA_SECTION_LABELS[id]} up`}><ArrowUp size={13} aria-hidden="true" /></button>
                <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => moveSection(id, 1)} disabled={index === config.order.length - 1} aria-label={`Move ${VEDA_SECTION_LABELS[id]} down`}><ArrowDown size={13} aria-hidden="true" /></button>
                <button
                  type="button"
                  className="vdc-btn"
                  aria-pressed={config.sections[id]}
                  onClick={() => patch('sections', { [id]: !config.sections[id] } as any)}
                >
                  {config.sections[id] ? <><Eye size={13} aria-hidden="true" /> Shown</> : <><EyeOff size={13} aria-hidden="true" /> Hidden</>}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="vdc-card">
        <h4>Start over</h4>
        <div className="vdc-row vdc-row--wrap">
          <button type="button" className="vdc-btn" onClick={() => commit((previous) => vedaResetSection(previous, 'design'))}>Reset colours, fonts and layout</button>
          <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => styleOptions.setTab('photos')}>Change photos</button>
        </div>
      </section>
    </div>
  );
}

function TherapiesTab({
  services,
  setServices,
  config,
  onGenerate,
  generating,
  onBusyChange,
}: {
  services: SalonService[];
  setServices: (next: SalonService[]) => void;
  config: VedaConfig;
  onGenerate: () => void;
  generating: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [filter, setFilter] = useState('All');
  const categories = useMemo(() => ['All', ...new Set(services.map((service) => service.category || 'Uncategorised'))], [services]);
  const filtered = services.filter((service) => filter === 'All' || service.category === filter);
  const update = (id: string, value: Partial<SalonService>) => setServices(services.map((service) => (service.id === id ? { ...service, ...value } : service)));
  const move = (id: string, direction: -1 | 1) => {
    const index = services.findIndex((service) => service.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= services.length) return;
    const next = [...services];
    [next[index], next[target]] = [next[target], next[index]];
    setServices(next);
  };
  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>Therapies, prices and durations</h3>
        <p>{services.length} rituals. Guests see the name, description, benefits, duration and ₹ price. Nothing is hidden behind a phone call.</p>
      </header>
      <div className="vdc-row vdc-row--wrap">
        <select className="vdc-input" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter therapies">
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <button type="button" className="vdc-btn" onClick={onGenerate} disabled={generating}>
          {generating ? <Loader2 size={14} className="vdc-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />} Generate descriptions
        </button>
        <button
          type="button"
          className="vdc-btn vdc-btn--primary"
          onClick={() =>
            setServices([
              ...services,
              {
                id: `veda-new-${Date.now().toString(36)}`,
                name: 'New Ayurvedic ritual',
                category: VEDA_SERVICE_CATEGORIES[0],
                durationMinutes: 60,
                price: 2000,
                description: 'Describe the ritual, the oil, the pressure and how long it takes.',
                icon: 'spa',
                imageUrl: '/templates/14/abhyanga-800.webp',
                origin: 'custom',
              },
            ])
          }
        >
          <Plus size={14} aria-hidden="true" /> Add therapy
        </button>
      </div>

      {filtered.map((service) => (
        <details className="vdc-details vdc-service" key={service.id}>
          <summary>
            <span>{service.name}</span>
            <span className="vdc-hint">{vedaFormatInr(service.price)} · {service.durationMinutes} min</span>
          </summary>
          <div className="vdc-grid2">
            <Field label="Name" value={service.name} onChange={(value) => update(service.id, { name: value })} maxLength={90} />
            <label className="vdc-field">
              <Label>Category</Label>
              <input className="vdc-input" list="vdc-categories" value={service.category} onChange={(event) => update(service.id, { category: event.target.value })} />
            </label>
            <Field label="Price (₹)" value={service.price === null ? '' : String(service.price)} onChange={(value) => update(service.id, { price: value.trim() ? Number(value.replace(/[^\d]/g, '')) || 0 : null })} hint="Leave blank for “On request”." />
            <Field label="Duration (minutes)" value={String(service.durationMinutes)} onChange={(value) => update(service.id, { durationMinutes: Math.max(15, Number(value.replace(/[^\d]/g, '')) || 60) })} />
          </div>
          <Area label="Description" value={service.description} onChange={(value) => update(service.id, { description: value })} rows={3} maxLength={600} />
          <label className="vdc-check">
            <input type="checkbox" checked={Boolean(service.popular)} onChange={(event) => update(service.id, { popular: event.target.checked })} />
            Show as a featured ritual on the home page
          </label>
          <VedaImageField label="Therapy photo" slot="abhyanga" value={service.imageUrl || ''} onChange={(url) => update(service.id, { imageUrl: url })} onBusyChange={onBusyChange} compact />
          <div className="vdc-row">
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => move(service.id, -1)} aria-label="Move up"><ArrowUp size={13} aria-hidden="true" /></button>
            <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => move(service.id, 1)} aria-label="Move down"><ArrowDown size={13} aria-hidden="true" /></button>
            <button
              type="button"
              className="vdc-btn vdc-btn--danger"
              onClick={() => {
                if (services.length <= 1) return;
                setServices(services.filter((entry) => entry.id !== service.id));
                } }
            >
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          </div>
        </details>
      ))}
      <datalist id="vdc-categories">
        {VEDA_SERVICE_CATEGORIES.map((category) => <option key={category} value={category} />)}
      </datalist>
      <p className="vdc-hint vdc-hint--muted">
        Therapy names, claims and prices are yours to confirm. Do not present a medical cure or a guaranteed outcome. {config.contact.disclaimer.slice(0, 120)}…
      </p>
    </div>
  );
}

function PhotosTab({
  config,
  patch,
  commit,
  team,
  setTeam,
  onBusyChange,
  onOpenStudio,
}: {
  config: VedaConfig;
  patch: <K extends keyof VedaConfig>(key: K, value: Partial<VedaConfig[K]>) => void;
  commit: (updater: (previous: VedaConfig) => VedaConfig) => void;
  team: Stylist[];
  setTeam: (next: Stylist[]) => void;
  onBusyChange: (busy: boolean) => void;
  onOpenStudio: () => void;
}) {
  const addGallery = () => {
    const image: VedaGalleryImage = {
      id: `veda-g-${Date.now().toString(36)}`,
      url: '/templates/14/treatment-room-800.webp',
      title: `The sanctuary ${config.gallery.images.length + 1}`,
      caption: '',
      category: 'The sanctuary',
      visible: true,
    };
    commit((previous) => ({ ...previous, gallery: { ...previous.gallery, images: [...previous.gallery.images, image] } }));
  };
  const patchGallery = (id: string, value: Partial<VedaGalleryImage>) =>
    commit((previous) => ({
      ...previous,
      gallery: { ...previous.gallery, images: previous.gallery.images.map((entry) => (entry.id === id ? { ...entry, ...value } : entry)) },
    }));
  const moveGallery = (index: number, direction: -1 | 1) =>
    commit((previous) => {
      const images = [...previous.gallery.images];
      const target = index + direction;
      if (target < 0 || target >= images.length) return previous;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...previous, gallery: { ...previous.gallery, images } };
    });
  const patchPackageImage = (id: string, url: string) =>
    commit((previous) => ({
      ...previous,
      packages: { ...previous.packages, items: previous.packages.items.map((entry) => (entry.id === id ? { ...entry, imageUrl: url } : entry)) },
    }));
  const patchOfferImage = (id: string, url: string) =>
    commit((previous) => ({
      ...previous,
      offers: { ...previous.offers, items: previous.offers.items.map((entry) => (entry.id === id ? { ...entry, imageUrl: url } : entry)) },
    }));
  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>Photos</h3>
        <p>Upload a photo once. It is cropped to the right shape, resized, compressed and stored in your workspace — no stretching, no blurry banners.</p>
        <button type="button" className="vdc-btn" onClick={onOpenStudio}><Sparkles size={14} aria-hidden="true" /> Need an image? Open the AI Image Studio</button>
      </header>

      <section className="vdc-card">
        <VedaImageField label="Hero banner" slot="hero" presetId="hero" value={config.hero.image} onChange={(url) => patch('hero', { image: url })} onBusyChange={onBusyChange} hint="Keep the left side calm so the headline stays readable." />
      </section>

      <section className="vdc-card">
        <VedaImageField label="Philosophy photo" slot="sanctuary" value={config.philosophy.image} onChange={(url) => patch('philosophy', { image: url })} onBusyChange={onBusyChange} />
      </section>

      <section className="vdc-card">
        <h4>Signature experiences</h4>
        {config.signature.items.map((item, index) => (
          <VedaImageField
            key={item.id}
            label={item.title}
            slot="ritual"
            value={item.imageUrl}
            onChange={(url) => commit((previous) => ({ ...previous, signature: { ...previous.signature, items: previous.signature.items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, imageUrl: url } : entry)) } }))}
            onBusyChange={onBusyChange}
            compact
          />
        ))}
      </section>

      <section className="vdc-card">
        <h4>Therapist portraits</h4>
        {team.map((person, index) => (
          <VedaImageField
            key={person.id}
            label={`${person.name} — ${person.role}`}
            slot="therapist-ananya"
            presetId="therapists"
            value={person.avatarUrl}
            onChange={(url) => setTeam(team.map((entry, entryIndex) => (entryIndex === index ? { ...entry, avatarUrl: url } : entry)))}
            onBusyChange={onBusyChange}
            compact
          />
        ))}
      </section>

      <section className="vdc-card">
        <h4>Package photos</h4>
        {config.packages.items.map((item) => (
          <VedaImageField
            key={item.id}
            label={item.name}
            slot="ritual"
            value={item.imageUrl}
            onChange={(url) => patchPackageImage(item.id, url)}
            onBusyChange={onBusyChange}
            compact
          />
        ))}
      </section>

      <section className="vdc-card">
        <h4>Offer &amp; voucher photos</h4>
        {config.offers.items.map((item) => (
          <VedaImageField
            key={item.id}
            label={item.title}
            slot={item.voucher ? 'gift-voucher' : 'promo-banner'}
            presetId={item.voucher ? 'services' : 'banner'}
            value={item.imageUrl}
            onChange={(url) => patchOfferImage(item.id, url)}
            onBusyChange={onBusyChange}
            compact
          />
        ))}
      </section>

      <section className="vdc-card">
        <div className="vdc-row vdc-row--wrap">
          <h4>Gallery ({config.gallery.images.filter((image) => image.visible !== false).length} shown)</h4>
          <button type="button" className="vdc-btn vdc-btn--primary" onClick={addGallery}><Plus size={14} aria-hidden="true" /> Add photo</button>
        </div>
        <p className="vdc-hint">Photos appear in this order. Hide one to keep it saved without publishing it.</p>
        {config.gallery.images.map((image, index) => (
          <div className={`vdc-repeat${image.visible === false ? ' is-hidden' : ''}`} key={image.id}>
            <div className="vdc-row vdc-row--wrap" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '0.82rem' }}>{index + 1}. {image.title || 'Untitled photo'}</strong>
              <div className="vdc-row">
                <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => moveGallery(index, -1)} disabled={index === 0} aria-label={`Move ${image.title} up`}><ArrowUp size={13} aria-hidden="true" /></button>
                <button type="button" className="vdc-btn vdc-btn--quiet" onClick={() => moveGallery(index, 1)} disabled={index === config.gallery.images.length - 1} aria-label={`Move ${image.title} down`}><ArrowDown size={13} aria-hidden="true" /></button>
                <label className="vdc-check">
                  <input
                    type="checkbox"
                    checked={image.visible !== false}
                    onChange={(event) => patchGallery(image.id, { visible: event.target.checked })}
                  />
                  Show on website
                </label>
              </div>
            </div>
            <div className="vdc-grid2">
              <Field label="Caption title" value={image.title} onChange={(value) => patchGallery(image.id, { title: value })} />
              <Field label="Category" value={image.category || ''} onChange={(value) => patchGallery(image.id, { category: value })} />
              <Field label="Small note (optional)" value={image.caption} onChange={(value) => patchGallery(image.id, { caption: value })} />
              <Field label="Alt text (screen readers)" value={image.alt || ''} onChange={(value) => patchGallery(image.id, { alt: value })} />
            </div>
            <VedaImageField label="Gallery photo" slot="gallery" presetId="gallery" value={image.url} onChange={(url) => patchGallery(image.id, { url })} onBusyChange={onBusyChange} compact />
            <button type="button" className="vdc-btn vdc-btn--danger" onClick={() => commit((previous) => ({ ...previous, gallery: { ...previous.gallery, images: previous.gallery.images.filter((entry) => entry.id !== image.id) } }))}>
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

function BookingTab({
  config,
  patch,
  business,
  setBusiness,
}: {
  config: VedaConfig;
  patch: <K extends keyof VedaConfig>(key: K, value: Partial<VedaConfig[K]>) => void;
  business: BusinessDraft;
  setBusiness: (next: BusinessDraft) => void;
}) {
  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>Booking handoff</h3>
        <p>
          Guests can request a ritual on the website and confirm on WhatsApp, or use your booking sheet if it is switched
          on. Nothing is marked booked until you or the booking system confirms it.
        </p>
      </header>
      <section className="vdc-card">
        <label className="vdc-field">
          <Label>How should bookings reach you?</Label>
          <select className="vdc-input" value={config.booking.mode} onChange={(event) => patch('booking', { mode: event.target.value as VedaConfig['booking']['mode'] })}>
            <option value="both">WhatsApp and on-site requests (recommended)</option>
            <option value="whatsapp">WhatsApp only</option>
            <option value="request">On-site requests only</option>
          </select>
        </label>
        <Area label="Booking note (shown on the booking page)" value={config.booking.note} onChange={(value) => patch('booking', { note: value })} rows={3} maxLength={400} />
        <Area label="Advance payment note" value={config.booking.depositNote} onChange={(value) => patch('booking', { depositNote: value })} rows={2} maxLength={300} />
        <div className="vdc-grid2">
          <Field label="WhatsApp number" value={business.whatsapp} onChange={(value) => setBusiness({ ...business, whatsapp: value })} hint="Used for every “Book” and “Confirm on WhatsApp” button." />
          <Field label="Phone number" value={business.phone} onChange={(value) => setBusiness({ ...business, phone: value })} />
        </div>
        <p className="vdc-hint">
          Advance payments and UPI collection are handled in your workspace payment settings. This website never collects
          card details itself.
        </p>
      </section>
    </div>
  );
}

function SeoTab({
  config,
  patch,
  issues,
  publishedSlug,
  onPublish,
  publishing,
  profile,
  services,
  generate,
  aiBusy,
}: {
  config: VedaConfig;
  patch: <K extends keyof VedaConfig>(key: K, value: Partial<VedaConfig[K]>) => void;
  issues: ReturnType<typeof validateVedaConfig>;
  publishedSlug?: string | null;
  onPublish: () => void;
  publishing: boolean;
  profile: SalonProfile;
  services: SalonService[];
  generate: (mode: (typeof VEDA_AI_MODES)[number]['id']) => void;
  aiBusy: string;
}) {
  return (
    <div className="vdc-panel">
      <header className="vdc-panel__head">
        <h3>SEO &amp; launch</h3>
        <p>What Google and WhatsApp show when someone shares your website.</p>
      </header>
      <section className="vdc-card">
        <Field label="Page title" value={config.seo.title} onChange={(value) => patch('seo', { title: value })} maxLength={70} hint={`${config.seo.title.length}/60 recommended characters`} />
        <Area label="Meta description" value={config.seo.description} onChange={(value) => patch('seo', { description: value })} rows={3} maxLength={200} hint={`${config.seo.description.length}/160 recommended characters`} />
        <Field label="Keywords (comma separated)" value={config.seo.keywords} onChange={(value) => patch('seo', { keywords: value })} maxLength={300} />
        <div className="vdc-serp" aria-label="Search result preview">
          <span>vedasanjeevani.in</span>
          <strong>{config.seo.title}</strong>
          <p>{config.seo.description}</p>
        </div>
        <button type="button" className="vdc-btn" onClick={() => generate('seo')} disabled={Boolean(aiBusy)}>
          {aiBusy === 'seo' ? <Loader2 size={14} className="vdc-spin" aria-hidden="true" /> : <Wand2 size={14} aria-hidden="true" />}
          Generate SEO content
        </button>
        <p className="vdc-hint">Generated titles and descriptions are drafts — keep the city name in the title so people nearby recognise you.</p>
      </section>

      <section className="vdc-card">
        <h4>What is on your website</h4>
        <ul className="vdc-summary">
          <li><b>{services.length}</b> therapies with prices</li>
          <li><b>{config.packages.items.length}</b> wellness packages</li>
          <li><b>{config.gallery.images.length}</b> gallery photos · <b>{config.testimonials.items.length}</b> guest stories</li>
          <li><b>{config.faq.items.length}</b> FAQs · <b>{config.offers.items.length}</b> offers</li>
          <li>Business: <b>{profile.businessName}</b> · {profile.city}</li>
        </ul>
      </section>

      <section className="vdc-card">
        <h4>Publishing</h4>
        <p className="vdc-hint">
          {publishedSlug
            ? `Your website address is /?site=${publishedSlug}. Publishing again updates the live page within a few seconds.`
            : 'Not published yet. Publishing creates your public website address; you can keep editing afterwards.'}
        </p>
        <div className="vdc-row vdc-row--wrap">
          <button type="button" className="vdc-btn vdc-btn--primary" onClick={onPublish} disabled={publishing}>
            {publishing ? <Loader2 size={15} className="vdc-spin" aria-hidden="true" /> : <Rocket size={15} aria-hidden="true" />}
            {publishedSlug ? 'Publish updates' : 'Go live'}
          </button>
          {publishedSlug ? (
            <a className="vdc-btn" href={`/?site=${encodeURIComponent(publishedSlug)}`} target="_blank" rel="noopener noreferrer">Open live website</a>
          ) : null}
        </div>
        {issues.length ? (
          <ul className="vdc-issues">
            {issues.map((issue) => (
              <li key={issue.field + issue.message} data-level={issue.level}>
                <b>{issue.level === 'error' ? 'Must fix' : 'Worth fixing'}</b> {issue.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="vdc-hint vdc-hint--ok"><Check size={13} aria-hidden="true" /> No issues found.</p>
        )}
      </section>
    </div>
  );
}

export default VedaCustomizer;
