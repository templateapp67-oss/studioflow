import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readTemplate12Draft,
  syncTemplate12,
  Template12SyncError,
  writeTemplate12Draft,
  type Template12Draft,
  type Template12SyncStatus,
} from '../lib/template12Sync';

interface SaveRequest<T> { payload: T; upsert: () => Promise<unknown>; draft: Template12Draft<T>; }
interface UseTemplate12SyncOptions<T> { onRestore?: (payload: T, draft: Template12Draft<T>) => void; enabled?: boolean; }

export function useTemplate12Sync<T>(siteId: string, options: UseTemplate12SyncOptions<T> = {}) {
  const [status, setStatus] = useState<Template12SyncStatus>('idle');
  const [error, setError] = useState('');
  const [draftAt, setDraftAt] = useState<number | null>(null);
  const [restoredDraft, setRestoredDraft] = useState<Template12Draft<T> | null>(null);
  const latest = useRef<SaveRequest<T> | null>(null);
  const pending = useRef<SaveRequest<T> | null>(null);
  const running = useRef(false);
  const promise = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const restoreCallback = useRef(options.onRestore);
  restoreCallback.current = options.onRestore;

  useEffect(() => {
    mounted.current = true;
    if (options.enabled === false) return () => { mounted.current = false; };
    const draft = readTemplate12Draft<T>(siteId);
    if (draft) {
      setRestoredDraft(draft);
      setDraftAt(draft.savedAt);
      setStatus('draft');
      restoreCallback.current?.(draft.payload, draft);
    }
    return () => { mounted.current = false; };
  }, [siteId, options.enabled]);

  const execute = useCallback((): Promise<void> => {
    if (running.current) return promise.current || Promise.resolve();
    const request = pending.current || latest.current;
    if (!request || !siteId) return Promise.resolve();
    pending.current = null;
    running.current = true;
    promise.current = (async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (mounted.current) { setDraftAt(request.draft.savedAt); setStatus('draft'); setError(''); }
        return;
      }
      if (mounted.current) { setStatus('syncing'); setError(''); setDraftAt(request.draft.savedAt); }
      try {
        await syncTemplate12(siteId, request.payload, request.upsert, { draft: request.draft });
        if (mounted.current) {
          setStatus('synced');
          setError('');
          setDraftAt(null);
          setRestoredDraft(null);
        }
      } catch (cause) {
        const message = cause instanceof Template12SyncError ? cause.userMessage : cause instanceof Error ? cause.message : 'Template 12 could not sync. Your local draft is kept; retry the save.';
        const draft = readTemplate12Draft<T>(siteId);
        if (mounted.current) {
          setStatus('error');
          setError(message);
          setDraftAt(draft?.savedAt ?? Date.now());
          setRestoredDraft(draft);
        }
      }
    })().finally(() => {
      running.current = false;
      promise.current = null;
      if (pending.current && !(typeof navigator !== 'undefined' && navigator.onLine === false)) void execute();
    });
    return promise.current;
  }, [siteId]);

  const save = useCallback((payload: T, upsert: () => Promise<unknown>): Promise<void> => {
    let draft: Template12Draft<T>;
    try {
      draft = writeTemplate12Draft(siteId, payload);
    } catch (cause) {
      const message = cause instanceof Template12SyncError ? cause.userMessage : 'This browser could not save a local Template 12 backup.';
      setError(message);
      setStatus('error');
      return Promise.resolve();
    }
    const request = { payload, upsert, draft };
    latest.current = request;
    pending.current = request;
    setDraftAt(draft.savedAt);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('draft');
      setError('');
      return Promise.resolve();
    }
    if (running.current) return promise.current || Promise.resolve();
    return execute();
  }, [execute, siteId]);

  const retry = useCallback((): Promise<void> => {
    const request = pending.current || latest.current;
    if (!request) return Promise.resolve();
    pending.current = request;
    return execute();
  }, [execute]);

  useEffect(() => {
    const onOnline = () => {
      if (latest.current && (status === 'draft' || status === 'error')) void retry();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [retry, status]);

  return { status, error, draftAt, restoredDraft, save, retry };
}
