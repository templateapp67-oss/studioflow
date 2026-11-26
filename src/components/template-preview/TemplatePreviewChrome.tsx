import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Maximize2, Minimize2, Monitor, Sliders, Smartphone, Tablet } from 'lucide-react';

/**
 * Shared chrome for every NEXORA template viewer.
 *
 * All 16 template previews are rendered through the same wrapper
 * (`TemplatePreviewModal`) and every template viewer header uses the pieces
 * below, so the unified action button and the full-page viewport toggle can
 * never drift apart between templates:
 *
 *  - `UnifiedTemplateActionButton` merges “Customize this template” and
 *    “Create my website with this template” into one primary action with a
 *    dropdown that still exposes both flows (customizer drawers, auth gates
 *    and the create-website hand-off) unchanged.
 *  - `PreviewViewportControls` groups the Desktop / Tablet / Mobile viewport
 *    switches and adds the full-page toggle next to them.
 *  - `previewDialogClass` / `previewStageClass` / `previewFrameClass` describe
 *    the two preview layouts: the framed dashboard window and the 100%
 *    viewport full-page mode that covers dashboard padding and framing.
 */

/* ------------------------------------------------------------------ *
 * 1 · Unified primary action (split button + organised dropdown)
 * ------------------------------------------------------------------ */

export type TemplateActionId = 'customize' | 'build';

export type TemplateAction = {
  id: TemplateActionId;
  /** Menu label — deliberately keeps the original button wording. */
  label: string;
  /** One-line explanation shown under the label in the dropdown. */
  description?: string;
  icon?: React.ComponentType<{ size?: number; 'aria-hidden'?: React.AriaAttributes['aria-hidden'] }>;
  onSelect: () => void;
  disabled?: boolean;
};

export const TEMPLATE_ACTION_PRIMARY_LABEL = 'Customize & Build Website';

export function UnifiedTemplateActionButton({
  actions,
  label = TEMPLATE_ACTION_PRIMARY_LABEL,
  defaultActionId = 'customize',
  menuLabel = 'More template actions',
  badge,
  className = '',
}: {
  actions: TemplateAction[];
  /** Label of the merged primary button. */
  label?: string;
  /** Which action the primary segment runs. */
  defaultActionId?: TemplateActionId;
  menuLabel?: string;
  /** Small status pill (e.g. “Customized”) shown on the primary button. */
  badge?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const usable = actions.filter(action => !action.disabled);
  const hasMenu = actions.length > 1;
  const primary = actions.find(action => action.id === defaultActionId) ?? actions[0];

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) trigger.current?.focus();
  };

  /* Dismiss the dropdown on an outside pointer press (never inside the group). */
  useEffect(() => {
    if (!open) return;
    const doc = typeof document === 'undefined' ? null : document;
    if (!doc || typeof doc.addEventListener !== 'function') return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    doc.addEventListener('pointerdown', onPointerDown);
    return () => doc.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  /* Move focus into the menu when it opens, keeping keyboard order natural. */
  useEffect(() => {
    if (!open) return;
    const target = activeIndex >= 0 ? activeIndex : 0;
    items.current[target]?.focus?.();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!primary) return null;

  const runAction = (action: TemplateAction) => {
    if (action.disabled) return;
    closeMenu();
    action.onSelect();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      // Keep Escape scoped to the menu: the viewer closes on Escape otherwise.
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (!open || !usable.length) return;
    const current = usable.findIndex(action => actions[activeIndex]?.id === action.id);
    const move = (next: number) => {
      event.preventDefault();
      const index = (next + usable.length) % usable.length;
      setActiveIndex(actions.findIndex(action => action.id === usable[index].id));
      items.current[actions.findIndex(action => action.id === usable[index].id)]?.focus?.();
    };
    if (event.key === 'ArrowDown') move(current + 1);
    else if (event.key === 'ArrowUp') move(current - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(usable.length - 1);
  };

  return (
    <div
      ref={wrapper}
      role="group"
      aria-label="Template actions"
      data-template-actions
      data-template-primary-action={primary.id}
      className={`relative inline-flex flex-wrap items-stretch ${className}`}
      onKeyDown={onMenuKeyDown}
    >
      <button
        type="button"
        onClick={() => runAction(primary)}
        disabled={primary.disabled}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${hasMenu ? 'rounded-r-none' : ''}`}
      >
        <Sliders size={15} aria-hidden="true" />
        <span>{label}</span>
        {badge ? (
          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">{badge}</span>
        ) : null}
      </button>
      {hasMenu && (
        <button
          ref={trigger}
          type="button"
          aria-label={menuLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          title={menuLabel}
          onClick={() => setOpen(value => !value)}
          className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-r-xl border-l border-white/25 bg-slate-900 text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {open && hasMenu && (
        <div
          id={menuId}
          role="menu"
          aria-label="Template actions menu"
          data-template-action-menu
          className="absolute right-0 top-full z-[140] mt-2 w-[min(92vw,21rem)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-2xl"
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                ref={node => { items.current[index] = node; }}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                aria-label={action.label}
                onClick={() => runAction(action)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${action.id === primary.id ? 'bg-slate-50' : ''}`}
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900/5 text-slate-700">
                  {Icon ? <Icon size={14} aria-hidden="true" /> : <Sliders size={14} aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-4">{action.label}</span>
                  {action.description ? <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{action.description}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2 · Viewport device switches + full-page toggle
 * ------------------------------------------------------------------ */

export type PreviewDeviceId = 'desktop' | 'tablet' | 'mobile';

/**
 * Real viewport widths per device so the website's own responsive breakpoints
 * genuinely engage — mobile renders the template's mobile layout at a phone
 * width instead of a shrunken desktop page.
 */
export const PREVIEW_DEVICES: Array<{ id: PreviewDeviceId; label: string; width: number; Icon: typeof Monitor }> = [
  { id: 'desktop', label: 'Desktop', width: 1280, Icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: 834, Icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: 390, Icon: Smartphone },
];

export function PreviewViewportControls({
  device,
  onDeviceChange,
  fullPage,
  onToggleFullPage,
  className = '',
}: {
  device: PreviewDeviceId;
  onDeviceChange: (device: PreviewDeviceId) => void;
  fullPage: boolean;
  onToggleFullPage: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div role="group" aria-label="Preview device" className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
        {PREVIEW_DEVICES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={device === id}
            aria-label={`${label} preview viewport`}
            title={`${label} preview`}
            onClick={() => onDeviceChange(id)}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 px-2.5 text-xs transition-colors sm:px-3 ${device === id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            <Icon size={15} aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
            <span className="sr-only lg:hidden">{label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={fullPage}
        aria-label={fullPage ? 'Exit full-page preview' : 'Full-page preview'}
        aria-keyshortcuts="F"
        title={fullPage ? 'Exit full-page preview (Esc)' : 'Open full-page preview — 100% screen width and height'}
        onClick={onToggleFullPage}
        data-preview-fullpage-toggle
        className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors sm:px-3 ${fullPage ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
      >
        {fullPage ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
        <span className={fullPage ? 'inline' : 'hidden xl:inline'}>{fullPage ? 'Exit full page' : 'Full page'}</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 3 · Windowed vs full-page preview layout
 * ------------------------------------------------------------------ */

/** Framed dashboard preview (the default, rounded window over the dashboard). */
export const PREVIEW_WINDOW_DIALOG_CLASS =
  'm-auto w-[95vw] max-w-[1520px] h-[92dvh] max-h-[92dvh] p-0 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden backdrop:bg-slate-950/70';

/**
 * Full-page preview: the dialog itself takes the whole viewport, so the
 * preview escapes the dashboard padding, framing and rounded corners and the
 * stage can render the iframe at 100% screen width and height.
 */
export const PREVIEW_FULL_PAGE_DIALOG_CLASS =
  'm-0 h-dvh w-screen max-w-none max-h-none rounded-none border-0 p-0 shadow-none overflow-hidden backdrop:bg-slate-950/80';

export const previewDialogClass = (fullPage: boolean) =>
  fullPage ? PREVIEW_FULL_PAGE_DIALOG_CLASS : PREVIEW_WINDOW_DIALOG_CLASS;

export const previewStageClass = (fullPage: boolean) =>
  fullPage
    ? 'flex-1 min-h-0 bg-slate-200 p-0'
    : 'flex-1 min-h-0 bg-slate-200/70 px-2 pb-2 pt-2 sm:px-6 sm:pb-5 sm:pt-4';

export const previewFrameClass = (fullPage: boolean) =>
  fullPage
    ? 'relative overflow-hidden bg-white'
    : 'relative overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-900/10 transition-[width] duration-200 motion-reduce:transition-none';

/**
 * The rendered iframe width. In full-page mode the desktop viewport is fluid
 * (it fills the whole screen), while tablet and mobile keep their true device
 * widths so their responsive layouts stay honest.
 */
export const previewFrameWidth = ({
  fullPage,
  device,
  stageWidth,
  desktopWidth,
}: {
  fullPage: boolean;
  device: PreviewDeviceId;
  stageWidth: number;
  desktopWidth: number;
}) => (fullPage && device === 'desktop' ? Math.max(stageWidth || desktopWidth, 320) : desktopWidth);
