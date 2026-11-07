/**
 * Environment validation for the public browser client.
 *
 * The rules are deliberately strict and deliberately quiet: a diagnostic may
 * name the project host or reference, but never a key. The module fails fast
 * when the configuration cannot work, so a broken build is reported instead of
 * silently pointing at the wrong project.
 */

/** The Nexora Supabase project this site is built for. */
export const NEXORA_PROJECT_REF = 'zilwgiuiygqqardzutxi';
export const NEXORA_PROJECT_HOST = 'zilwgiuiygqqardzutxi.supabase.co';

export interface SupabaseEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export interface ResolvedSupabaseConfig {
  url: string;
  publishableKey: string;
  /** Project reference parsed from the URL. */
  ref: string;
  /** True when the configured URL points at a project other than the default. */
  usesProjectOverride: boolean;
}

const isHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

/**
 * Rejects privileged credentials that were placed in a browser variable.
 * A service-role/secret key in `VITE_*` would be shipped to every visitor.
 */
export const looksPrivileged = (key: string): boolean => {
  const value = key.trim();
  if (!value) return false;
  if (value.startsWith('sb_secret_')) return true;
  if (!value.startsWith('eyJ')) return false;
  try {
    const payload = JSON.parse(atob(value.split('.')[1] ?? ''));
    const role = payload?.role;
    return role === 'service_role' || payload?.iss === 'supabase';
  } catch {
    return false;
  }
};

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

/**
 * Resolves and validates the browser configuration.
 *
 * @param env the Vite environment (or any object with the same keys)
 * @param fallbackUrl the bundled default project URL
 * @param fallbackKey the bundled publishable key
 */
export function resolveSupabaseConfig(
  env: SupabaseEnv,
  fallbackUrl: string,
  fallbackKey: string,
): ResolvedSupabaseConfig {
  const rawUrl = (env.VITE_SUPABASE_URL || '').trim();
  const rawKey =
    (env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim() || (env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (rawKey && looksPrivileged(rawKey)) {
    throw new SupabaseConfigError(
      'A privileged Supabase key was supplied in a browser variable. Remove it and use the publishable key only.',
    );
  }

  const url = rawUrl || fallbackUrl;
  if (!isHttpsUrl(url)) {
    throw new SupabaseConfigError(
      `The configured Supabase URL is not a valid HTTPS project URL. Check VITE_SUPABASE_URL (expected host: ${NEXORA_PROJECT_HOST}).`,
    );
  }

  const ref = new URL(url).hostname.split('.')[0] ?? '';
  const usesProjectOverride = Boolean(rawUrl) && new URL(url).hostname !== NEXORA_PROJECT_HOST;
  if (usesProjectOverride) {
    // The host is public information; the key never is.
    console.warn(
      `[nexora-env] this build points at the Supabase project "${ref}" instead of the default project "${NEXORA_PROJECT_REF}".`,
    );
  }

  const publishableKey = rawKey || fallbackKey;
  if (!publishableKey) {
    throw new SupabaseConfigError(
      'No publishable Supabase key is configured. Set VITE_SUPABASE_PUBLISHABLE_KEY for this build.',
    );
  }

  return { url, publishableKey, ref, usesProjectOverride };
}
