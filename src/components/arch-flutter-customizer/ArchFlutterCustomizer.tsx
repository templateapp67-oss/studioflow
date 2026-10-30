import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Monitor,
  Redo2,
  RotateCcw,
  Smartphone,
  Tablet,
  Undo2,
  X,
} from 'lucide-react';

import {
  ARCH_FLUTTER_TEMPLATE_ALIAS,
  CUSTOMIZER_TABS,
  applyCustomizerConfig,
  blockingIssues,
  buildCustomizerConfig,
  clearCustomizerDraft,
  createHistory,
  defaultCustomizerConfig,
  loadCustomizerDraft,
  pushHistory,
  redoHistory,
  saveCustomizerDraft,
  undoHistory,
  validateCustomizerConfig,
  type ArchFlutterCustomizerConfig,
  type ConfigHistory,
  type CustomizerAccess,
  type CustomizerTabId,
  type CustomizerWorkspace,
} from '../../lib/archFlutterCustomizer';
import type { LoyaltyConfig, SalonProfile, SalonService, Stylist } from '../../types';
import { WebsiteDeviceFrame } from '../WebsiteDeviceFrame';
import { Notice } from './CustomizerFields';
import { BrandTab, HeroTab, ThemeTab } from './tabs/BrandTabs';
import { SectionsTab } from './tabs/SectionsTab';
import { MenuTab, OffersTab } from './tabs/MenuTabs';
import { GalleryTab, ReelsTab, TeamTab } from './tabs/MediaTabs';
import { VoicesTab } from './tabs/VoiceTabs';
import { BookingTab, ContactTab, SeoTab } from './tabs/BusinessTabs';
import './customizer.css';

const SalonWebsitePreview = React.lazy(() =>
  import('../SalonWebsitePreview').then((module) => ({ default: module.SalonWebsitePreview })),
);

type Device = 'desktop' | 'tablet' | 'mobile';

export interface ArchFlutterCustomizerProps {
  /** Site slug from `?site=`; empty until the salon is saved. */
  siteId: string;
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  extras: CustomizerWorkspace['extras'];
  loyaltyConfig?: LoyaltyConfig;
  /** Result of the owner check — the drawer refuses to open for anyone else. */
  access: CustomizerAccess;
  initialTab?: CustomizerTabId;
  publishedSlug?: string | null;
  /** Applies the saved config to the owner workspace (optimistic) and persists it. */
  onApply: (workspace: CustomizerWorkspace, config: ArchFlutterCustomizerConfig) => Promise<void> | void;
  onPublish?: () => Promise<void> | void;
  onOpenPayments?: () => void;
  onClose: () => void;
}

const DEVICE_BUTTONS: Array<{ id: Device; label: string; icon: React.ReactNode }> = [
  { id: 'mobile', label: 'Mobile', icon: <Smartphone size={14} aria-hidden="true" /> },
  { id: 'tablet', label: 'Tablet', icon: <Tablet size={14} aria-hidden="true" /> },
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={14} aria-hidden="true" /> },
];

/**
 * The Template 13 (Arch & Flutter) customizer drawer.
 *
 * It only ever mounts for `lash_brow` / `arch-flutter`, edits a single typed
 * config object and writes back through the salon's own workspace record — no
 * global CSS and no shared component is touched, so every other template keeps
 * its existing look and behaviour.
 */
export function ArchFlutterCustomizer({
  siteId,
  profile,
  services,
  stylists,
  extras,
  loyaltyConfig,
  access,
  initialTab = 'brand',
  publishedSlug,
  onApply,
  onPublish,
  onOpenPayments,
  onClose,
}: ArchFlutterCustomizerProps) {
  const reducedMotion = useReducedMotion();
  const workspace = useMemo<CustomizerWorkspace>(
    () => ({ profile, services, stylists, extras }),
    [profile, services, stylists, extras],
  );

  const [history, setHistory] = useState<ConfigHistory>(() => createHistory(buildCustomizerConfig(workspace, siteId)));
  const [baseline, setBaseline] = useState(() => JSON.stringify(history.present));
  const [tab, setTab] = useState<CustomizerTabId>(initialTab);
  const [device, setDevice] = useState<Device>('desktop');
  const [previewOpen, setPreviewOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1180px)').matches,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; body: string; actionLabel: string; run: () => void } | null>(null);
  const [draftFound, setDraftFound] = useState<{ savedAt: number; config: ArchFlutterCustomizerConfig } | null>(null);

  const config = history.present;
  const dirty = JSON.stringify(config) !== baseline;
  const issues = useMemo(() => validateCustomizerConfig(config), [config]);
  const errors = useMemo(() => blockingIssues(issues), [issues]);

  const drawerRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<Element | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  /* ---------------- draft recovery (once, on open) ---------------- */
  useEffect(() => {
    const draft = loadCustomizerDraft(siteId);
    if (draft && JSON.stringify(draft.config) !== JSON.stringify(buildCustomizerConfig(workspace, siteId))) {
      setDraftFound(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- focus, scroll lock, escape ---------------- */
  useEffect(() => {
    restoreFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => drawerRef.current?.focus?.(), 40);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      if (typeof HTMLElement !== 'undefined' && restoreFocus.current instanceof HTMLElement) restoreFocus.current.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- autosave the draft while dirty ---------------- */
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => saveCustomizerDraft(siteId, config), 800);
    return () => clearTimeout(timer);
  }, [dirty, config, siteId]);

  /* ---------------- warn before leaving with unsaved changes ---------------- */
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes on this template.';
      return event.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const update = useCallback(
    (updater: (current: ArchFlutterCustomizerConfig) => ArchFlutterCustomizerConfig) => {
      setHistory((current) => pushHistory(current, updater(current.present)));
      setMessage(null);
    },
    [],
  );

  const undo = useCallback(() => setHistory((current) => undoHistory(current)), []);
  const redo = useCallback(() => setHistory((current) => redoHistory(current)), []);

  const requestClose = useCallback(() => {
    if (!dirty) {
      onClose();
      return;
    }
    setConfirmState({
      title: 'Discard unsaved changes?',
      body: 'You have changes on this template that are not saved yet. Your draft is kept on this device, so you can come back to it later.',
      actionLabel: 'Close anyway',
      run: () => {
        setConfirmState(null);
        onClose();
      },
    });
  }, [dirty, onClose]);

  const save = useCallback(async () => {
    if (saving) return;
    if (errors.length > 0) {
      setTab(errors[0].tab);
      setMessage({
        tone: 'error',
        text: `Please fix ${errors.length} ${errors.length === 1 ? 'item' : 'items'} before saving. We have opened that tab for you.`,
      });
      return;
    }
    setSaving(true);
    try {
      const next = applyCustomizerConfig(config, workspace);
      await onApply(next, config);
      clearCustomizerDraft(siteId);
      setDraftFound(null);
      setBaseline(JSON.stringify(config));
      setMessage({ tone: 'success', text: 'Saved. This template’s website now uses your changes.' });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? `Could not save: ${error.message}` : 'Could not save right now. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }, [config, errors.length, onApply, saving, siteId, workspace]);

  /* ---------------- keyboard: undo / redo / save / escape / focus trap ---------------- */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const meta = event.metaKey || event.ctrlKey;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (confirmState) {
        setConfirmState(null);
        return;
      }
      if (previewOpen && window.matchMedia('(max-width: 1179px)').matches) {
        setPreviewOpen(false);
        return;
      }
      requestClose();
      return;
    }
    if (meta && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
      return;
    }
    if (meta && !event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
      return;
    }
    if ((meta && event.shiftKey && event.key.toLowerCase() === 'z') || (meta && event.key.toLowerCase() === 'y')) {
      event.preventDefault();
      redo();
      return;
    }
    if (event.key !== 'Tab') return;
    // Keep focus inside the top-most surface (the preview sheet on mobile, else the drawer).
    const container =
      previewOpen && window.matchMedia('(max-width: 1179px)').matches ? previewRef.current : drawerRef.current;
    if (!container) return;
    const focusable = (
      Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), summary',
        ),
      ) as HTMLElement[]
    ).filter((element) => element.offsetParent !== null || element === document.activeElement);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!container.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  };

  /* ---------------- debounced preview workspace ---------------- */
  const [previewWorkspace, setPreviewWorkspace] = useState<CustomizerWorkspace>(() => applyCustomizerConfig(config, workspace));
  useEffect(() => {
    const timer = setTimeout(() => setPreviewWorkspace(applyCustomizerConfig(config, workspace)), 260);
    return () => clearTimeout(timer);
  }, [config, workspace]);

  const tabProps = { config, update, issues };

  const activeTab = CUSTOMIZER_TABS.find((entry) => entry.id === tab) || CUSTOMIZER_TABS[0];

  const panel = (() => {
    switch (tab) {
      case 'brand':
        return <BrandTab {...tabProps} />;
      case 'theme':
        return <ThemeTab {...tabProps} />;
      case 'hero':
        return <HeroTab {...tabProps} />;
      case 'sections':
        return <SectionsTab {...tabProps} />;
      case 'menu':
        return <MenuTab {...tabProps} />;
      case 'offers':
        return <OffersTab {...tabProps} />;
      case 'reels':
        return <ReelsTab {...tabProps} />;
      case 'gallery':
        return <GalleryTab {...tabProps} />;
      case 'team':
        return <TeamTab {...tabProps} />;
      case 'voices':
        return <VoicesTab {...tabProps} />;
      case 'contact':
        return <ContactTab {...tabProps} />;
      case 'booking':
        return <BookingTab {...tabProps} onOpenPayments={onOpenPayments} />;
      case 'seo':
        return <SeoTab {...tabProps} />;
      default:
        return null;
    }
  })();

  if (!access.allowed) {
    return createPortal(
      <div className="afc-backdrop" role="presentation">
        <section className="afc-confirm" role="alertdialog" aria-modal="true" aria-label="Customizer locked">
          <div className="afc-confirm-panel">
            <h3>This customizer is locked</h3>
            <p>{access.reason || 'Only the owner of this salon website can change its design.'}</p>
            <div className="afc-row-actions">
              <button type="button" className="afc-btn afc-btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </section>
      </div>,
      document.body,
    );
  }

  const motionProps = reducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: { type: 'tween' as const, duration: 0.28, ease: 'easeOut' as const } };

  return createPortal(
    <>
      <motion.div
        className="afc-backdrop"
        onClick={requestClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
        aria-hidden="true"
      />

      <AnimatePresence>
        {previewOpen && (
          <motion.div
            key="afc-preview"
            className="afc-preview"
            ref={previewRef}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reducedMotion ? 1 : 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            aria-label="Live website preview"
          >
            <div className="afc-preview-bar">
              <strong>Live preview</strong>
              <span className="afc-chip">{config.brand.businessName || 'Your salon'}</span>
              <span className="afc-spacer" style={{ marginLeft: 'auto' }} />
              {DEVICE_BUTTONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="afc-btn afc-btn-sm"
                  aria-pressed={device === entry.id}
                  onClick={() => setDevice(entry.id)}
                >
                  {entry.icon} {entry.label}
                </button>
              ))}
              <button type="button" className="afc-btn afc-btn-sm afc-btn-ghost" onClick={() => setPreviewOpen(false)}>
                <X size={13} aria-hidden="true" /> Hide preview
              </button>
            </div>
            <div className="afc-preview-frame">
              <WebsiteDeviceFrame mode={device} title="Template 13 live preview">
                {(doc) => (
                  <Suspense fallback={<p role="status" style={{ padding: 16 }}>Loading the preview…</p>}>
                    <SalonWebsitePreview
                      previewDocument={doc}
                      readOnly
                      profile={{ ...previewWorkspace.profile, subdomain: publishedSlug || '' }}
                      services={previewWorkspace.services}
                      stylists={previewWorkspace.stylists}
                      gallery={previewWorkspace.extras.gallery}
                      policies={previewWorkspace.extras.policies as Record<string, string> | undefined}
                      branding={previewWorkspace.extras.whiteLabel as { platformName: string; poweredBy: boolean; supportEmail: string } | undefined}
                      loyaltyConfig={loyaltyConfig}
                      onAddAppointment={async (appointment) => appointment}
                    />
                  </Suspense>
                )}
              </WebsiteDeviceFrame>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside
        {...motionProps}
        className="afc-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Arch & Flutter template customizer"
        tabIndex={-1}
        ref={drawerRef}
        onKeyDown={onKeyDown}
        data-preview={previewOpen ? 'open' : 'closed'}
      >
        <header className="afc-topbar">
          <div>
            <h2 className="afc-title">Template customizer</h2>
            <p className="afc-subtitle">
              Arch &amp; Flutter · {siteId ? `site ${siteId}` : 'new site'} ·{' '}
              <span
                className="afc-status"
                data-state={message?.tone === 'error' ? 'error' : dirty ? 'dirty' : 'clean'}
                role="status"
              >
                {message ? message.text : dirty ? 'Unsaved changes' : 'All changes saved'}
              </span>
            </p>
          </div>
          <div className="afc-actions">
            <span className="afc-crop-strip" role="group" aria-label="Preview device">
              {DEVICE_BUTTONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="afc-btn afc-btn-sm afc-icon-btn"
                  aria-pressed={device === entry.id && previewOpen}
                  aria-label={`Preview on ${entry.label}`}
                  title={`Preview on ${entry.label}`}
                  onClick={() => {
                    setDevice(entry.id);
                    setPreviewOpen(true);
                  }}
                >
                  {entry.icon}
                </button>
              ))}
            </span>
            <button type="button" className="afc-btn afc-btn-sm afc-icon-btn" onClick={undo} disabled={history.past.length === 0} aria-label="Undo last change" title="Undo (Ctrl+Z)">
              <Undo2 size={14} aria-hidden="true" />
            </button>
            <button type="button" className="afc-btn afc-btn-sm afc-icon-btn" onClick={redo} disabled={history.future.length === 0} aria-label="Redo change" title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="afc-btn afc-btn-sm"
              onClick={() =>
                setConfirmState({
                  title: 'Reset to template defaults?',
                  body: 'This puts back the Arch & Flutter sample content — brand, colours, fonts, sections, menu, offers, videos, gallery, team, testimonials, FAQ, contact, booking and SEO — for this salon only. Other templates are not touched. You can undo this with Ctrl+Z until you save.',
                  actionLabel: 'Reset to defaults',
                  run: () => {
                    setConfirmState(null);
                    update(() => defaultCustomizerConfig(siteId));
                    setMessage({ tone: 'info', text: 'Template defaults restored. Save when you are happy with them.' });
                  },
                })
              }
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset to template defaults
            </button>
            <button
              type="button"
              className="afc-btn afc-btn-sm"
              disabled={!dirty}
              onClick={() =>
                setConfirmState({
                  title: 'Discard your changes?',
                  body: 'This drops every unsaved change and reloads what is already saved for this salon.',
                  actionLabel: 'Discard changes',
                  run: () => {
                    setConfirmState(null);
                    const saved = buildCustomizerConfig(workspace, siteId);
                    setHistory((current) => pushHistory(current, saved));
                    setBaseline(JSON.stringify(saved));
                    clearCustomizerDraft(siteId);
                    setDraftFound(null);
                    setMessage({ tone: 'info', text: 'Changes discarded.' });
                  },
                })
              }
            >
              Discard
            </button>
            <button type="button" className="afc-btn afc-btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="afc-btn afc-btn-sm afc-icon-btn" onClick={requestClose} aria-label="Close the customizer" title="Close (Esc)">
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="afc-tabs" role="tablist" aria-label="Customizer sections" ref={tabListRef} onKeyDown={onTabListKeyDown}>
          {CUSTOMIZER_TABS.map((entry, index) => {
            const count = issues.filter((issue) => issue.tab === entry.id).length;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`afc-tab-${entry.id}`}
                aria-selected={tab === entry.id}
                aria-controls={`afc-panel-${entry.id}`}
                tabIndex={tab === entry.id ? 0 : -1}
                className="afc-tab"
                title={entry.hint}
                data-index={index}
                onClick={() => setTab(entry.id)}
              >
                {entry.label}
                {count > 0 && (
                  <span className="afc-tab-badge" aria-label={`${count} items need attention`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="afc-body">
          {draftFound && (
            <Notice
              actions={
                <>
                  <button
                    type="button"
                    className="afc-btn afc-btn-sm"
                    onClick={() => {
                      setHistory((current) => pushHistory(current, draftFound.config));
                      setDraftFound(null);
                      setMessage({ tone: 'info', text: 'Draft restored. Save to keep it.' });
                    }}
                  >
                    Restore my draft
                  </button>
                  <button
                    type="button"
                    className="afc-btn afc-btn-sm afc-btn-ghost"
                    onClick={() => {
                      clearCustomizerDraft(siteId);
                      setDraftFound(null);
                    }}
                  >
                    Discard draft
                  </button>
                </>
              }
            >
              You left an unsaved draft on this device at{' '}
              <b>
                {new Date(draftFound.savedAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </b>
              .
            </Notice>
          )}

          {message && !draftFound && (
            <Notice tone={message.tone}>
              {message.text}
              {message.tone === 'success' && onPublish && (
                <span className="afc-notice-actions">
                  <button type="button" className="afc-btn afc-btn-sm" onClick={() => void onPublish()}>
                    Publish my website
                  </button>
                </span>
              )}
            </Notice>
          )}

          {errors.length > 0 && (
            <Notice tone="error">
              <b>{errors.length}</b> {errors.length === 1 ? 'item needs' : 'items need'} fixing before you can save. Tabs
              with a red number show where they are.
            </Notice>
          )}

          <div role="tabpanel" id={`afc-panel-${activeTab.id}`} aria-labelledby={`afc-tab-${activeTab.id}`} tabIndex={-1}>
            {panel}
          </div>

          <p className="afc-hint" style={{ margin: '4px 0 12px' }}>
            Template {ARCH_FLUTTER_TEMPLATE_ALIAS} · config version {config.version} · changes are stored with this
            salon's own record, so no other template is affected.
          </p>
        </div>
      </motion.aside>

      {/* No exit animation here: a confirmation dialog must disappear the moment the owner answers. */}
      {confirmState && (
          <motion.section
            key="afc-confirm"
            className="afc-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label={confirmState.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          >
            <div className="afc-confirm-panel">
              <h3>{confirmState.title}</h3>
              <p>{confirmState.body}</p>
              <div className="afc-row-actions">
                <button type="button" className="afc-btn afc-btn-primary" onClick={confirmState.run}>
                  {confirmState.actionLabel}
                </button>
                <button type="button" className="afc-btn afc-btn-ghost" onClick={() => setConfirmState(null)}>
                  Keep editing
                </button>
              </div>
            </div>
          </motion.section>
        )}
    </>,
    document.body,
  );
}

/** Arrow-key navigation for the tab strip (WAI-ARIA tabs pattern). */
function onTabListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
  const current = buttons.findIndex((button) => button.getAttribute('aria-selected') === 'true');
  if (current < 0) return;
  event.preventDefault();
  let next = current;
  if (event.key === 'ArrowRight') next = (current + 1) % buttons.length;
  if (event.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = buttons.length - 1;
  buttons[next].focus();
  buttons[next].click();
}
