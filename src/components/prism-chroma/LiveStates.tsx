import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

/** Shared loading / empty / error states for Template 10's database sections. */

export function PrismSectionSkeleton({ label, lines = 2 }: { label: string; lines?: number }) {
  return (
    <div className="pc-skeleton" role="status" aria-live="polite">
      <span className="pc-skeleton-title">{label}</span>
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className="pc-skeleton-line" style={{ width: `${100 - index * 14}%` }} />
      ))}
      <span className="pc-sr-only">Loading {label.toLowerCase()}…</span>
    </div>
  );
}

export function PrismSectionError({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="pc-state pc-state-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        <p className="pc-state-title">Could not load this section</p>
        <p className="pc-state-text">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="pc-btn pc-btn-ghost px-3 py-2 text-xs" onClick={onRetry} disabled={retrying}>
          <RefreshCw size={13} aria-hidden="true" className={retrying ? 'pc-spin' : undefined} />
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  );
}

export function PrismEmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="pc-state pc-state-empty">
      <div>
        <p className="pc-state-title">{title}</p>
        {children && <p className="pc-state-text">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrismInlineNotice({ tone = 'success', children }: { tone?: 'success' | 'error' | 'info'; children: React.ReactNode }) {
  return (
    <p className={`pc-notice is-${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      {tone === 'success' && <CheckCircle2 size={14} aria-hidden="true" />}
      {tone === 'error' && <AlertCircle size={14} aria-hidden="true" />}
      {tone === 'info' && <Loader2 size={14} aria-hidden="true" className="pc-spin" />}
      <span>{children}</span>
    </p>
  );
}
