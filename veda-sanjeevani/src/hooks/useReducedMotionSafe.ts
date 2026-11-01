import { useSyncExternalStore } from 'react';
const query = '(prefers-reduced-motion: reduce)';
function subscribe(callback: () => void) {
  const media = window.matchMedia?.(query);
  media?.addEventListener('change', callback);
  return () => media?.removeEventListener('change', callback);
}
const snapshot = () => window.matchMedia?.(query)?.matches ?? false;
const serverSnapshot = () => false;
/** Reactive OS preference; all motion consumers use this single safe hook. */
export function useReducedMotionSafe() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
