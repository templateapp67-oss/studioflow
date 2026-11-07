import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Feature description tooltip.
 *
 * Behaviour required by the brief and implemented here:
 *   hover      → open (pointer devices);
 *   focus      → open (keyboard);
 *   click/tap  → toggle (touch devices, where hover does not exist);
 *   Escape     → close and return nothing to the page;
 *   blur / pointer leave / outside tap → close.
 *
 * The panel is a positioned popover (not a `title` attribute) so the description
 * is available to screen readers and keyboard users, and it is rendered directly
 * under the feature label so it can never cover the adjacent plan-status cells.
 */
export function FeatureInfoTooltip({
  label,
  description,
  id,
}: {
  label: string;
  description: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const generatedId = useId();
  const panelId = id ? `${id}-tip` : `nx-tip-${generatedId}`;

  // Escape closes the tooltip wherever focus currently is.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        (wrapperRef.current?.querySelector('[data-nx-tip-trigger]') as HTMLElement | null)?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // A tap outside the tooltip closes it on touch devices.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  return (
    <span
      className="nx-info"
      ref={wrapperRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="nx-info__trigger"
        data-nx-tip-trigger
        aria-label={`What ${label} includes`}
        aria-describedby={open ? panelId : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
        onClick={() => setOpen((value) => !value)}
      >
        <Info size={13} strokeWidth={2.1} aria-hidden="true" focusable="false" />
      </button>
      <span className="nx-info__panel" id={panelId} role="tooltip" hidden={!open}>
        {description}
      </span>
    </span>
  );
}
