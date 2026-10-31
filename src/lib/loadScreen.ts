const KEY = 'sf_screen_reloaded';

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error as Error).message || '';
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Importing a module script failed')
  );
}

export function recoverScreen(force = false): void {
  try {
    if (typeof window === 'undefined') return;
    if (!force) {
      const already = window.sessionStorage?.getItem(KEY);
      if (already) return;
      window.sessionStorage?.setItem(KEY, '1');
    }
    window.location.reload();
  } catch {
    // Ignore storage issues
  }
}

export async function loadScreen<T>(loader: () => Promise<T>): Promise<T> {
  try {
    const component = await loader();
    try {
      window.sessionStorage?.removeItem(KEY);
    } catch {}
    return component;
  } catch (err) {
    if (isChunkLoadError(err)) {
      recoverScreen();
    }
    throw err;
  }
}

export function installScreenRecovery(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.error || event.message)) {
      recoverScreen();
    }
  });
}
