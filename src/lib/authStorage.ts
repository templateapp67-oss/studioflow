/**
 * Browser auth-token storage.
 *
 * A session token must never live in `localStorage`: anything there is
 * readable by every script on the origin and survives every restart, so a
 * single XSS or a stale bundle exfiltrates a long-lived session. The Supabase
 * session is therefore stored in `sessionStorage` — per tab, cleared when the
 * tab closes — with an in-memory fallback for privacy-restricted environments.
 * The token is still refreshed automatically while the tab is open.
 *
 * Migrating out of localStorage
 * -----------------------------
 * Earlier builds persisted the session in `localStorage` under the application
 * storage key (`studioflow_supabase_session`) and, before that, under
 * supabase-js's default `sb-<ref>-auth-token` keys. `createSessionAuthStorage`
 * migrates a legacy copy into `sessionStorage` exactly once (on first read) and
 * `removeLegacyAuthTokens` sweeps `localStorage` on module load, so existing
 * visitors stay signed in while no token remains in `localStorage`.
 * `removeItem` always deletes the key from both stores, so sign-out purges
 * every copy.
 */

export const AUTH_STORAGE_KEY = 'studioflow_supabase_session';

/** Key shapes that historically held an auth token in localStorage. */
const LEGACY_AUTH_KEY_PATTERNS = [
  /^studioflow_supabase_session$/,
  /^sb-[a-z0-9]+-auth-token(\.\d+)?$/,
  /^sb-[a-z0-9]+-auth-token-code-verifier$/,
];

export function isLegacyAuthStorageKey(key: string): boolean {
  return LEGACY_AUTH_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/** In-memory fallback for environments where Web Storage is unavailable or throws. */
const memoryStore = new Map<string, string>();

type WebStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Resolves a Web Storage object from whichever global the host exposes.
 * Tests stub `globalThis.sessionStorage`/`localStorage` directly; browsers
 * expose them on `window` as well. Returns null when storage is missing or
 * throws (for example when the user blocks cookies/storage).
 */
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

/**
 * supabase-js `storage` adapter. Drop-in replacement for the default
 * (localStorage) backend: reads sessionStorage first, migrates a legacy
 * localStorage copy once, and keeps localStorage free of tokens on every write.
 */
export function createSessionAuthStorage() {
  return {
    getItem(key: string): string | null {
      const session = webStorage('sessionStorage');
      const fromSession = tryGet(session, key);
      if (fromSession !== null) return fromSession;
      // One-time legacy migration: move the localStorage copy into sessionStorage and delete it there.
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
      // Never leave a token copy behind in localStorage.
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
 * Best-effort sweep run at module load: migrates any known legacy auth keys it
 * finds in localStorage into sessionStorage and deletes the localStorage
 * copies. Enumerates keys when the environment exposes `length`/`key()`;
 * otherwise falls back to removing the known application storage key.
 * Returns the number of localStorage keys removed. Never throws.
 */
export function removeLegacyAuthTokens(currentKey: string = AUTH_STORAGE_KEY): number {
  const legacy = webStorage('localStorage');
  if (!legacy) return 0;
  const session = webStorage('sessionStorage');
  let removed = 0;
  const migrateAndDelete = (key: string) => {
    const value = tryGet(legacy, key);
    if (value !== null) {
      if (tryGet(session, key) === null) trySet(session, key, value);
      tryRemove(legacy, key);
      removed += 1;
    }
  };
  try {
    const raw = (legacy as Partial<Storage>).length;
    const count = typeof raw === 'number' ? raw : NaN;
    if (Number.isFinite(count) && typeof (legacy as Partial<Storage>).key === 'function') {
      const keys: string[] = [];
      for (let index = 0; index < count; index += 1) {
        try {
          const key = (legacy as Partial<Storage>).key!(index);
          if (key && isLegacyAuthStorageKey(key)) keys.push(key);
        } catch { /* key() may throw in restricted environments */ }
      }
      for (const key of keys) migrateAndDelete(key);
      return removed;
    }
  } catch { /* fall through to the known-key sweep */ }
  // Keys cannot be enumerated (restricted mock/storage): still migrate and
  // delete the application's known legacy key rather than dropping it silently.
  migrateAndDelete(currentKey);
  return removed;
}

/**
 * True when a (possibly legacy) persisted session exists. Used by the router to
 * decide whether browser entry points see the signed-in shell. Reads through the
 * migration path so a legacy visitor is recognised, and never throws.
 */
export function hasPersistedAuthSession(storageKey: string = AUTH_STORAGE_KEY): boolean {
  try {
    return createSessionAuthStorage().getItem(storageKey) !== null;
  } catch {
    return false;
  }
}
