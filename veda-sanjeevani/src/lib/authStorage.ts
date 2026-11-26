/**
 * Browser auth-token storage for the Veda Sanjeevani admin app.
 *
 * A session token must never live in `localStorage`: anything there is
 * readable by every script on the origin and survives restarts. The Supabase
 * session is stored in `sessionStorage` (per tab, cleared on tab close) with an
 * in-memory fallback for privacy-restricted environments.
 *
 * supabase-js persists the session under `sb-<ref>-auth-token` by default in
 * localStorage. `createSessionAuthStorage` migrates that legacy copy into
 * sessionStorage exactly once (on first read) and `removeLegacyAuthTokens`
 * sweeps localStorage on module load, so existing visitors stay signed in
 * while no token remains in localStorage. `removeItem` deletes the key from
 * both stores, so sign-out purges every copy.
 */

const LEGACY_AUTH_KEY_PATTERNS = [
  /^sb-[a-z0-9]+-auth-token(\.\d+)?$/,
  /^sb-[a-z0-9]+-auth-token-code-verifier$/,
  /^vedaanjeevani_supabase_session$/,
  /^veda_supabase_session$/,
];

export function isLegacyAuthStorageKey(key: string): boolean {
  return LEGACY_AUTH_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

const memoryStore = new Map<string, string>();

type WebStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function webStorage(kind: 'sessionStorage' | 'localStorage'): WebStorage | null {
  try {
    const direct = (globalThis as Record<string, unknown>)[kind] as WebStorage | undefined;
    if (direct && typeof direct.getItem === 'function') return direct;
    const fromWindow = (globalThis as unknown as { window?: Record<string, unknown> }).window?.[kind] as WebStorage | undefined;
    if (fromWindow && typeof fromWindow.getItem === 'function') return fromWindow;
    return null;
  } catch {
    return null;
  }
}

const tryGet = (storage: WebStorage | null, key: string): string | null => {
  if (!storage) return null;
  try { const value = storage.getItem(key); return typeof value === 'string' ? value : null; } catch { return null; }
};
const trySet = (storage: WebStorage | null, key: string, value: string): boolean => {
  if (!storage) return false;
  try { storage.setItem(key, value); return true; } catch { return false; }
};
const tryRemove = (storage: WebStorage | null, key: string): void => {
  if (!storage) return;
  try { storage.removeItem(key); } catch { /* storage may be restricted */ }
};

/** supabase-js `storage` adapter: sessionStorage-backed, migrates legacy copies. */
export function createSessionAuthStorage() {
  return {
    getItem(key: string): string | null {
      const session = webStorage('sessionStorage');
      const fromSession = tryGet(session, key);
      if (fromSession !== null) return fromSession;
      const legacy = webStorage('localStorage');
      const fromLegacy = tryGet(legacy, key);
      if (fromLegacy !== null) {
        trySet(session, key, fromLegacy);
        tryRemove(legacy, key);
        return fromLegacy;
      }
      return memoryStore.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      const session = webStorage('sessionStorage');
      if (trySet(session, key, value)) {
        memoryStore.delete(key);
      } else {
        memoryStore.set(key, value);
      }
      tryRemove(webStorage('localStorage'), key);
    },
    removeItem(key: string): void {
      memoryStore.delete(key);
      tryRemove(webStorage('sessionStorage'), key);
      tryRemove(webStorage('localStorage'), key);
    },
  };
}

/**
 * Best-effort sweep of localStorage for legacy token keys. Enumerates keys
 * when the environment exposes `length`/`key()`; otherwise removes nothing.
 * Returns the number of localStorage keys removed. Never throws.
 */
export function removeLegacyAuthTokens(): number {
  const legacy = webStorage('localStorage');
  if (!legacy) return 0;
  const session = webStorage('sessionStorage');
  let removed = 0;
  try {
    const length = (legacy as Partial<Storage>).length;
    const count = typeof length === 'number' ? length : NaN;
    if (!Number.isFinite(count) || typeof (legacy as Partial<Storage>).key !== 'function') return 0;
    const keys: string[] = [];
    for (let index = 0; index < count; index += 1) {
      try {
        const key = (legacy as Partial<Storage>).key!(index);
        if (key && isLegacyAuthStorageKey(key)) keys.push(key);
      } catch { /* key() may throw in restricted environments */ }
    }
    for (const key of keys) {
      const value = tryGet(legacy, key);
      if (value !== null) {
        if (tryGet(session, key) === null) trySet(session, key, value);
        tryRemove(legacy, key);
        removed += 1;
      }
    }
  } catch { /* storage unavailable */ }
  return removed;
}
