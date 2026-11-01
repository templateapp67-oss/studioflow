/** Consent-gated integration hook. No third-party script is included or loaded. */
export function initializeAnalytics(loader?: () => Promise<void>) {
  const allowed = () => { try { return localStorage.getItem('veda-consent') === 'accepted'; } catch { return false; } };
  let started = false;
  const start = () => { if (!loader || started || !allowed()) return; started = true; void loader().catch(() => { started = false; }); };
  const onConsent = (event: Event) => { if (event instanceof CustomEvent && event.detail === 'accepted') start(); };
  window.addEventListener('veda:consent', onConsent);
  start();
  return () => window.removeEventListener('veda:consent', onConsent);
}
