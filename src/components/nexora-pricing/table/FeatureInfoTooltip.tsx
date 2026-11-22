import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import './hoverCard.css';

const OPEN_DELAY_MS = 350;
const CLOSE_GRACE_MS = 240;
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type HoverCardProps = {
  /** A single native button or link; its existing handlers and attributes are preserved. */
  trigger: ReactElement;
  /** Accessible name for the preview group. */
  label: string;
  children: ReactNode;
  /** Optional stable id, useful when a caller already owns a unique identifier. */
  id?: string;
  /** Extra class for the inline trigger wrapper. */
  className?: string;
  /** Horizontal alignment before the panel is shifted to fit the viewport. */
  align?: 'start' | 'center' | 'end';
  /** Allow an explicit click/tap to toggle the card (used by the info-button compatibility wrapper). */
  tapToToggle?: boolean;
  /** `auto` follows the closest app `data-appearance="dark"` theme marker. */
  appearance?: 'auto' | 'light' | 'dark';
};

/**
 * A delay-based hover/focus preview anchored to a native link or button.
 *
 * The card is portalled to the document body so page overflow and stacking
 * contexts cannot clip it. Hover is ignored for touch pointers; keyboard focus
 * opens immediately. Escape and page scrolling dismiss it, and ArrowDown moves
 * focus into the card when it contains interactive content.
 */
export function HoverCard({
  trigger,
  label,
  children,
  id,
  className,
  align = 'start',
  tapToToggle = false,
  appearance = 'auto',
}: HoverCardProps) {
  if (!isValidElement(trigger)) throw new Error('HoverCard requires one native button or link as its trigger.');

  const generatedId = useId();
  const panelId = id ? `${id}-hover-card` : `nx-hover-card-${generatedId}`;
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; side: 'top' | 'bottom' } | null>(null);
  const [resolvedAppearance, setResolvedAppearance] = useState<'light' | 'dark'>(appearance === 'dark' ? 'dark' : 'light');
  const openRef = useRef(false);
  const triggerWrapperRef = useRef<HTMLSpanElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pointerOnTriggerRef = useRef(false);
  const pointerOnPanelRef = useRef(false);
  const focusInsideRef = useRef(false);
  const dismissedUntilLeaveRef = useRef(false);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }, []);
  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);
  const setOpenState = useCallback((next: boolean) => {
    if (openRef.current === next) return;
    openRef.current = next;
    if (next) setPosition(null);
    setOpen(next);
  }, []);
  const triggerNode = useCallback(() => (
    triggerWrapperRef.current?.querySelector<HTMLElement>('[data-nx-hover-card-trigger]') ?? null
  ), []);
  const clearDismissalWhenOutside = useCallback(() => {
    if (!pointerOnTriggerRef.current && !pointerOnPanelRef.current && !focusInsideRef.current) {
      dismissedUntilLeaveRef.current = false;
    }
  }, []);
  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (pointerOnTriggerRef.current || pointerOnPanelRef.current || focusInsideRef.current) return;
      setOpenState(false);
    }, CLOSE_GRACE_MS);
  }, [clearCloseTimer, clearOpenTimer, setOpenState]);
  const openImmediately = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    if (!dismissedUntilLeaveRef.current) setOpenState(true);
  }, [clearCloseTimer, clearOpenTimer, setOpenState]);
  const dismiss = useCallback((restoreFocusFromPanel: boolean) => {
    clearOpenTimer();
    clearCloseTimer();
    dismissedUntilLeaveRef.current = true;
    pointerOnPanelRef.current = false;
    if (restoreFocusFromPanel && panelRef.current?.contains(document.activeElement)) {
      triggerNode()?.focus();
    }
    setOpenState(false);
    clearDismissalWhenOutside();
  }, [clearCloseTimer, clearDismissalWhenOutside, clearOpenTimer, setOpenState, triggerNode]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (appearance !== 'auto') {
      setResolvedAppearance(appearance);
      return;
    }
    const themeRoot = triggerWrapperRef.current?.closest('[data-appearance], [data-theme="dark"], .dark');
    setResolvedAppearance(
      themeRoot?.getAttribute('data-appearance') === 'dark'
        || themeRoot?.getAttribute('data-theme') === 'dark'
        || themeRoot?.classList.contains('dark')
        ? 'dark'
        : 'light',
    );
  }, [appearance, open, portalReady]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const anchor = triggerWrapperRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const margin = 12;
      const gap = 8;
      const panelWidth = panel.getBoundingClientRect().width;
      const panelHeight = panel.getBoundingClientRect().height;
      const availableBelow = viewportHeight - anchor.bottom - gap - margin;
      const availableAbove = anchor.top - gap - margin;
      const side = availableBelow >= panelHeight || availableBelow >= availableAbove ? 'bottom' : 'top';
      const desiredLeft = align === 'center'
        ? anchor.left + (anchor.width - panelWidth) / 2
        : align === 'end'
          ? anchor.right - panelWidth
          : anchor.left;
      const left = Math.max(margin, Math.min(desiredLeft, viewportWidth - panelWidth - margin));
      const desiredTop = side === 'bottom' ? anchor.bottom + gap : anchor.top - panelHeight - gap;
      const top = Math.max(margin, Math.min(desiredTop, viewportHeight - panelHeight - margin));
      setPosition({ top, left, side });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('resize', updatePosition);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    if (triggerWrapperRef.current) resizeObserver?.observe(triggerWrapperRef.current);
    if (panelRef.current) resizeObserver?.observe(panelRef.current);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      resizeObserver?.disconnect();
    };
  }, [align, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismiss(true);
    };
    const onScroll = (event: Event) => {
      if (floatingRef.current?.contains(event.target as Node)) return;
      dismiss(true);
    };
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [dismiss, open]);

  useEffect(() => () => {
    clearOpenTimer();
    clearCloseTimer();
  }, [clearCloseTimer, clearOpenTimer]);

  const canHover = (pointerType: string) => {
    if (pointerType === 'touch') return false;
    return typeof window.matchMedia !== 'function' || window.matchMedia('(hover: hover)').matches;
  };
  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (!canHover(event.pointerType)) return;
    if (event.currentTarget === triggerWrapperRef.current) pointerOnTriggerRef.current = true;
    else pointerOnPanelRef.current = true;
    clearCloseTimer();
    if (dismissedUntilLeaveRef.current || openRef.current) return;
    clearOpenTimer();
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      if (!dismissedUntilLeaveRef.current) setOpenState(true);
    }, OPEN_DELAY_MS);
  };
  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (!canHover(event.pointerType)) return;
    if (event.currentTarget === triggerWrapperRef.current) pointerOnTriggerRef.current = false;
    else pointerOnPanelRef.current = false;
    const related = event.relatedTarget;
    if (related instanceof Node && (triggerWrapperRef.current?.contains(related) || floatingRef.current?.contains(related))) {
      clearCloseTimer();
      return;
    }
    scheduleClose();
    clearDismissalWhenOutside();
  };
  const onTriggerFocus = (event: FocusEvent<HTMLElement>) => {
    focusInsideRef.current = true;
    if (event.currentTarget.matches(':focus-visible')) openImmediately();
  };
  const onTriggerBlur = (event: FocusEvent<HTMLElement>) => {
    const related = event.relatedTarget;
    if (related instanceof Node && (triggerWrapperRef.current?.contains(related) || floatingRef.current?.contains(related))) return;
    focusInsideRef.current = false;
    scheduleClose();
    clearDismissalWhenOutside();
  };
  const onPanelFocus = () => {
    focusInsideRef.current = true;
    clearOpenTimer();
    clearCloseTimer();
  };
  const onPanelBlur = (event: FocusEvent<HTMLDivElement>) => {
    const related = event.relatedTarget;
    if (related instanceof Node && (triggerWrapperRef.current?.contains(related) || floatingRef.current?.contains(related))) return;
    focusInsideRef.current = false;
    scheduleClose();
    clearDismissalWhenOutside();
  };
  const getFocusableElements = () => [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])]
    .filter((element) => element.getClientRects().length > 0 && !element.hasAttribute('disabled'));
  const onTriggerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowDown' || !openRef.current) return;
    event.preventDefault();
    const firstFocusable = getFocusableElements()[0];
    if (firstFocusable) firstFocusable.focus();
    else panelRef.current?.focus();
  };
  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    const first = focusable[0];
    const last = focusable.at(-1);
    const active = document.activeElement;
    if (!focusable.length && active === panelRef.current) {
      event.preventDefault();
      triggerNode()?.focus();
    } else if (event.shiftKey && first && active === first) {
      event.preventDefault();
      triggerNode()?.focus();
    } else if (!event.shiftKey && last && active === last) {
      event.preventDefault();
      triggerNode()?.focus();
    }
  };

  const originalTriggerProps = trigger.props as {
    onFocus?: (event: FocusEvent<HTMLElement>) => void;
    onBlur?: (event: FocusEvent<HTMLElement>) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
  };
  const triggerWithCardState = cloneElement(trigger as ReactElement<any>, {
    'aria-expanded': open,
    'aria-controls': portalReady ? panelId : undefined,
    'aria-keyshortcuts': 'ArrowDown',
    'data-nx-hover-card-trigger': '',
    onFocus: (event: FocusEvent<HTMLElement>) => {
      originalTriggerProps.onFocus?.(event);
      if (!event.defaultPrevented) onTriggerFocus(event);
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      originalTriggerProps.onBlur?.(event);
      if (!event.defaultPrevented) onTriggerBlur(event);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      originalTriggerProps.onKeyDown?.(event);
      if (!event.defaultPrevented) onTriggerKeyDown(event);
    },
    onClick: (event: MouseEvent<HTMLElement>) => {
      originalTriggerProps.onClick?.(event);
      if (!tapToToggle || event.defaultPrevented || event.detail === 0) return;
      if (openRef.current) dismiss(false);
      else {
        dismissedUntilLeaveRef.current = false;
        openImmediately();
      }
    },
  });

  return (
    <>
      <span
        className={['nx-hover-card', className].filter(Boolean).join(' ')}
        ref={triggerWrapperRef}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {triggerWithCardState}
      </span>
      {portalReady && typeof document !== 'undefined' && createPortal(
        <div
          ref={floatingRef}
          className="nx-hover-card__floating"
          hidden={!open}
          data-placement={position?.side ?? 'bottom'}
          data-positioned={position ? 'true' : 'false'}
          data-appearance={resolvedAppearance}
          style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
        >
          <span
            className="nx-hover-card__safe-area"
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            id={panelId}
            className="nx-hover-card__panel"
            role="group"
            aria-label={label}
            tabIndex={-1}
            onFocusCapture={onPanelFocus}
            onBlurCapture={onPanelBlur}
            onKeyDown={onPanelKeyDown}
          >
            {children}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Backward-compatible plain-text feature description, implemented by HoverCard. */
export function FeatureInfoTooltip({
  label,
  description,
  id,
}: {
  label: string;
  description: string;
  id?: string;
}) {
  return (
    <HoverCard
      label={`${label} details`}
      id={id}
      className="nx-info"
      tapToToggle
      trigger={(
        <button
          type="button"
          className="nx-info__trigger"
          aria-label={`What ${label} includes`}
        >
          <Info size={13} strokeWidth={2.1} aria-hidden="true" focusable="false" />
        </button>
      )}
    >
      <p className="nx-hover-card__description">{description}</p>
    </HoverCard>
  );
}
