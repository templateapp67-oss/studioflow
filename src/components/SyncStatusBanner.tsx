import React from 'react';
import { AlertCircle, CheckCircle2, Cloud, LoaderCircle, WifiOff } from 'lucide-react';
import type { Template12SyncStatus } from '../lib/template12Sync';

interface SyncStatusBannerProps {
  status: Template12SyncStatus;
  error?: string;
  draftAt?: number | null;
  onRetry: () => void;
}

function formatDraftTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function SyncStatusBanner({ status, error = '', draftAt, onRetry }: SyncStatusBannerProps) {
  if (status === 'idle') return null;
  const isProblem = status === 'error' || status === 'draft';
  const classes = isProblem
    ? 'border-amber-300 bg-amber-50 text-amber-950'
    : status === 'synced'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
      : 'border-sky-200 bg-sky-50 text-sky-950';
  const Icon = status === 'syncing' ? LoaderCircle : status === 'synced' ? CheckCircle2 : status === 'draft' ? WifiOff : status === 'error' ? AlertCircle : Cloud;
  const title = status === 'syncing' ? 'Syncing Template 12…' : status === 'synced' ? 'Template 12 is synced' : status === 'draft' ? 'Template 12 draft saved on this device' : 'Template 12 sync needs attention';
  return (
    <section role={isProblem ? 'alert' : 'status'} aria-live="polite" className={`mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm sm:mx-6 ${classes}`}>
      <Icon size={18} className={status === 'syncing' ? 'animate-spin' : 'shrink-0'} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {error && <p className="mt-0.5 text-xs leading-relaxed">{error}</p>}
        {draftAt && (isProblem || status === 'syncing') && <p className="mt-0.5 text-xs opacity-80">Local draft saved {formatDraftTime(draftAt)}. It will be kept until the complete sync succeeds.</p>}
      </div>
      {isProblem && <button type="button" onClick={onRetry} className="rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2">Retry Sync</button>}
    </section>
  );
}
