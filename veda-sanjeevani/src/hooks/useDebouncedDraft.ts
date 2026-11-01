import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminToast } from './useAdminToast';

export function useDebouncedDraft<T>(initial: T, save: (value: T) => Promise<T>, label: string, delay = 800) {
  const [value, setValue] = useState(initial); const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false); const [dirty, setDirty] = useState(false); const [error, setError] = useState<string | null>(null);
  const history = useRef<T[]>([]); const timer = useRef<number | null>(null); const alive = useRef(true); const notify = useAdminToast();
  const cancel = useCallback(() => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } }, []);
  const commit = useCallback(async (next: T) => {
    cancel(); setSaving(true); setError(null);
    try { const persisted = await save(next); if (!alive.current) return; setSaved(persisted); setValue(persisted); setDirty(false); notify('success', `${label} saved.`); }
    catch { if (!alive.current) return; setValue(saved); setDirty(false); setError(`${label} could not be saved. Your draft was restored to the last saved version.`); notify('error', `${label} could not be saved. Your previous version was restored.`); }
    finally { if (alive.current) setSaving(false); }
  }, [cancel, label, notify, save, saved]);
  const update = useCallback((next: T) => {
    history.current = [...history.current.slice(-9), value]; setValue(next); setDirty(true); setError(null); cancel();
    timer.current = window.setTimeout(() => void commit(next), delay);
  }, [cancel, commit, delay, value]);
  const undo = useCallback(() => { const previous = history.current.pop(); if (previous === undefined) return; update(previous); }, [update]);
  const reset = useCallback((next: T) => { cancel(); setValue(next); setSaved(next); setDirty(false); setError(null); history.current = []; }, [cancel]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancel(); }; }, [cancel]);
  return { value, setValue: update, saved, saving, dirty, error, undo, canUndo: history.current.length > 0, reset, saveNow: () => void commit(value) };
}
