/**
 * Environment validation for the public browser client.
 *
 * The rules are deliberately strict and deliberately quiet: a diagnostic may
 * name the project host, reference, or structural validation metadata, but
 * never a raw variable value or key. The module fails fast when the
 * configuration cannot work, so a broken build is reported instead of silently
 * pointing at the wrong project.
 */

/** The Nexora Supabase project this site is built for. */
export const NEXORA_PROJECT_REF = 'zilwgiuiygqqardzutxi';
export const NEXORA_PROJECT_HOST = 'zilwgiuiygqqardzutxi.supabase.co';

const CANONICAL_PROJECT_URL = `https://${NEXORA_PROJECT_HOST}`;
const SUPABASE_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.(?:co|in|red)$/i;
const ESCAPED_CONTROL_EDGE_PATTERN = /^(?:\\[rnt])+|(?:\\[rnt])+$/g;
const ESCAPED_CONTROL_ANY_PATTERN = /\\[rnt]/;
const VERCEL_SENSITIVE_PLACEHOLDER = '[SENSITIVE]';

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

export type SupabaseUrlValidationReason =
  | 'contains-whitespace'
  | 'invalid-url-syntax'
  | 'non-https-scheme'
  | 'credentials-in-url'
  | 'unexpected-port'
  | 'unexpected-path-or-query'
  | 'untrusted-host';

export type SupabaseKeyRejectionKind = 'secret-prefix' | 'jwt-service-role' | 'jwt-supabase-non-anon';

export interface SupabaseUrlDiagnostic {
  reason: SupabaseUrlValidationReason;
  rawLength: number;
  cleanedLength: number;
  hasScheme: boolean;
  scheme: 'https' | 'http' | 'other' | 'none';
  hasHost: boolean;
  hostMatchesExpected: boolean;
  hostLooksLikeSupabase: boolean;
  hadQuotes: boolean;
  hadEscapedNewline: boolean;
  hadWhitespace: boolean;
  isBracketPlaceholder: boolean;
}

export interface SupabaseKeyDiagnostic {
  reason: 'privileged-key';
  source: 'VITE_SUPABASE_PUBLISHABLE_KEY' | 'VITE_SUPABASE_ANON_KEY';
  keyLength: number;
  keyKind: SupabaseKeyRejectionKind;
}

export type SupabaseConfigDiagnostic = SupabaseUrlDiagnostic | SupabaseKeyDiagnostic;

interface CleanedBrowserEnv {
  value: string;
  rawLength: number;
  cleanedLength: number;
  hadWhitespace: boolean;
  hadQuotes: boolean;
  hadEscapedNewline: boolean;
  wasSensitivePlaceholder: boolean;
}

export const isTrustedSupabaseHost = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  return normalized === NEXORA_PROJECT_HOST || SUPABASE_HOST_PATTERN.test(normalized);
};

const inspectBrowserEnvCleanup = (raw?: string): CleanedBrowserEnv => {
  const input = typeof raw === 'string' ? raw : '';
  const rawLength = input.length;
  let current = input;
  let hadWhitespace = false;
  let hadQuotes = false;
  let hadEscapedNewline = false;

  for (let pass = 0; pass < 8; pass += 1) {
    const before = current;

    const trimmed = current.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
    if (trimmed !== current) {
      hadWhitespace = true;
      current = trimmed;
    }

    const withoutEscapedEdges = current.replace(ESCAPED_CONTROL_EDGE_PATTERN, '');
    if (withoutEscapedEdges !== current) {
      hadEscapedNewline = true;
      current = withoutEscapedEdges;
    }

    if (
      current.length >= 4 &&
      ((current.startsWith('\\"') && current.endsWith('\\"')) ||
        (current.startsWith("\\'") && current.endsWith("\\'")))
    ) {
      hadQuotes = true;
      current = current.slice(2, -2);
    } else if (
      current.length >= 2 &&
      ((current.startsWith('"') && current.endsWith('"')) || (current.startsWith("'") && current.endsWith("'")))
    ) {
      hadQuotes = true;
      current = current.slice(1, -1);
    }

    if (current === before) break;
  }

  // `vercel pull` writes the literal placeholder "[SENSITIVE]" for Vercel
  // Sensitive environment variables during prebuilt CI builds; treat it as
  // unset so browser builds fall back to the bundled public project config
  // instead of crashing prerendering or shipping "[SENSITIVE]" to browsers.
  const wasSensitivePlaceholder = current.toUpperCase() === VERCEL_SENSITIVE_PLACEHOLDER;
  const value = wasSensitivePlaceholder ? '' : current;

  return {
    value,
    rawLength,
    cleanedLength: value.length,
    hadWhitespace,
    hadQuotes,
    hadEscapedNewline,
    wasSensitivePlaceholder,
  };
};

export const cleanBrowserEnv = (value?: string): string => inspectBrowserEnvCleanup(value).value;

const classifyPrivilegedKey = (key: string): SupabaseKeyRejectionKind | null => {
  const value = cleanBrowserEnv(key);
  if (!value) return null;
  if (value.startsWith('sb_secret_')) return 'secret-prefix';
  if (!value.startsWith('eyJ')) return null;
  try {
    const segment = (value.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = segment.padEnd(Math.ceil(segment.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    const role = payload?.role;
    if (role === 'service_role') return 'jwt-service-role';
    if (payload?.iss === 'supabase' && role !== 'anon') return 'jwt-supabase-non-anon';
    return null;
  } catch {
    return null;
  }
};

/**
 * Rejects privileged credentials that were placed in a browser variable.
 * A service-role/secret key in `VITE_*` would be shipped to every visitor.
 */
export const looksPrivileged = (key: string): boolean => classifyPrivilegedKey(key) !== null;

export class SupabaseConfigError extends Error {
  readonly diagnostic?: SupabaseConfigDiagnostic;

  constructor(message: string, diagnostic?: SupabaseConfigDiagnostic) {
    super(message);
    this.name = 'SupabaseConfigError';
    this.diagnostic = diagnostic;
  }
}

const detectRawScheme = (value: string): { hasScheme: boolean; scheme: 'https' | 'http' | 'other' | 'none' } => {
  if (/^https:/i.test(value)) return { hasScheme: true, scheme: 'https' };
  if (/^http:/i.test(value)) return { hasScheme: true, scheme: 'http' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return { hasScheme: true, scheme: 'other' };
  return { hasScheme: false, scheme: 'none' };
};

const formatUrlDiagnostic = (diagnostic: SupabaseUrlDiagnostic): string =>
  [
    `reason=${diagnostic.reason}`,
    `rawLength=${diagnostic.rawLength}`,
    `cleanedLength=${diagnostic.cleanedLength}`,
    `hasScheme=${diagnostic.hasScheme}`,
    `scheme=${diagnostic.scheme}`,
    `hasHost=${diagnostic.hasHost}`,
    `hostMatchesExpected=${diagnostic.hostMatchesExpected}`,
    `hostLooksLikeSupabase=${diagnostic.hostLooksLikeSupabase}`,
    `hadQuotes=${diagnostic.hadQuotes}`,
    `hadEscapedNewline=${diagnostic.hadEscapedNewline}`,
    `hadWhitespace=${diagnostic.hadWhitespace}`,
    ...(diagnostic.isBracketPlaceholder ? ['isBracketPlaceholder=true'] : []),
  ].join(', ');

type UrlValidationResult =
  | { ok: true; url: string; diagnostic?: undefined }
  | { ok: false; url?: undefined; diagnostic: SupabaseUrlDiagnostic };

const validateAndNormalizeSupabaseUrl = (
  cleaned: CleanedBrowserEnv,
  allowBareCanonical: boolean,
): UrlValidationResult => {
  const candidate = cleaned.value;
  const isBracketPlaceholder = candidate.startsWith('[') && candidate.endsWith(']');

  const makeFailure = (
    reason: SupabaseUrlValidationReason,
    overrides: Partial<
      Pick<SupabaseUrlDiagnostic, 'hasScheme' | 'scheme' | 'hasHost' | 'hostMatchesExpected' | 'hostLooksLikeSupabase'>
    > = {},
  ): UrlValidationResult => {
    const rawScheme = detectRawScheme(candidate);
    return {
      ok: false,
      diagnostic: {
        reason,
        rawLength: cleaned.rawLength,
        cleanedLength: cleaned.cleanedLength,
        hasScheme: overrides.hasScheme ?? rawScheme.hasScheme,
        scheme: overrides.scheme ?? rawScheme.scheme,
        hasHost: overrides.hasHost ?? false,
        hostMatchesExpected: overrides.hostMatchesExpected ?? false,
        hostLooksLikeSupabase: overrides.hostLooksLikeSupabase ?? false,
        hadQuotes: cleaned.hadQuotes,
        hadEscapedNewline: cleaned.hadEscapedNewline,
        hadWhitespace: cleaned.hadWhitespace,
        isBracketPlaceholder,
      },
    };
  };

  if (allowBareCanonical && !candidate.includes('://')) {
    const bareCanonical = candidate.replace(/\/+$/, '').toLowerCase();
    if (bareCanonical === NEXORA_PROJECT_HOST) {
      console.warn(
        `[nexora-env] VITE_SUPABASE_URL was supplied as bare canonical host without "https://"; normalized to "${CANONICAL_PROJECT_URL}".`,
      );
      return { ok: true, url: CANONICAL_PROJECT_URL };
    }
    if (bareCanonical === NEXORA_PROJECT_REF) {
      console.warn(
        `[nexora-env] VITE_SUPABASE_URL was supplied as bare project ref; normalized to "${CANONICAL_PROJECT_URL}".`,
      );
      return { ok: true, url: CANONICAL_PROJECT_URL };
    }
  }

  if (/\s/.test(candidate) || ESCAPED_CONTROL_ANY_PATTERN.test(candidate) || candidate.includes('\\')) {
    return makeFailure('contains-whitespace');
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return makeFailure('invalid-url-syntax');
  }

  const scheme: 'https' | 'http' | 'other' =
    parsed.protocol === 'https:' ? 'https' : parsed.protocol === 'http:' ? 'http' : 'other';
  const hostname = parsed.hostname.toLowerCase();
  const parsedMeta = {
    hasScheme: true,
    scheme,
    hasHost: Boolean(hostname),
    hostMatchesExpected: hostname === NEXORA_PROJECT_HOST,
    hostLooksLikeSupabase: isTrustedSupabaseHost(hostname),
  };

  if (parsed.protocol !== 'https:') {
    return makeFailure('non-https-scheme', parsedMeta);
  }

  if (parsed.username || parsed.password) {
    return makeFailure('credentials-in-url', parsedMeta);
  }

  if (parsed.port) {
    return makeFailure('unexpected-port', parsedMeta);
  }

  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    return makeFailure('unexpected-path-or-query', parsedMeta);
  }

  if (!parsedMeta.hostLooksLikeSupabase) {
    return makeFailure('untrusted-host', parsedMeta);
  }

  return { ok: true, url: parsed.origin };
};

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
  const urlCleanup = inspectBrowserEnvCleanup(env.VITE_SUPABASE_URL);
  const publishableCleanup = inspectBrowserEnvCleanup(env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const anonCleanup = inspectBrowserEnvCleanup(env.VITE_SUPABASE_ANON_KEY);

  const keyChecks: Array<{
    source: 'VITE_SUPABASE_PUBLISHABLE_KEY' | 'VITE_SUPABASE_ANON_KEY';
    value: string;
  }> = [
    { source: 'VITE_SUPABASE_PUBLISHABLE_KEY', value: publishableCleanup.value },
    { source: 'VITE_SUPABASE_ANON_KEY', value: anonCleanup.value },
  ];

  for (const check of keyChecks) {
    const keyKind = classifyPrivilegedKey(check.value);
    if (keyKind) {
      const diagnostic: SupabaseKeyDiagnostic = {
        reason: 'privileged-key',
        source: check.source,
        keyLength: check.value.length,
        keyKind,
      };
      throw new SupabaseConfigError(
        `A privileged Supabase key was supplied in a browser variable. Remove it and use the publishable key only (diagnostic: reason=${diagnostic.reason}, source=${diagnostic.source}, keyLength=${diagnostic.keyLength}, keyKind=${diagnostic.keyKind}).`,
        diagnostic,
      );
    }
  }

  const rawKey = publishableCleanup.value || anonCleanup.value;

  const urlResult = urlCleanup.value
    ? validateAndNormalizeSupabaseUrl(urlCleanup, true)
    : validateAndNormalizeSupabaseUrl(inspectBrowserEnvCleanup(fallbackUrl), false);

  if (!urlResult.ok || !urlResult.url) {
    const diagnostic = urlResult.diagnostic;
    throw new SupabaseConfigError(
      `The configured Supabase URL is not a valid HTTPS project URL. Check VITE_SUPABASE_URL (expected host: ${NEXORA_PROJECT_HOST}${diagnostic ? `; diagnostic: ${formatUrlDiagnostic(diagnostic)}` : ''}).`,
      diagnostic,
    );
  }

  const url = urlResult.url;
  const hostname = new URL(url).hostname.toLowerCase();
  const ref = hostname.split('.')[0] ?? '';
  const usesProjectOverride = Boolean(urlCleanup.value) && hostname !== NEXORA_PROJECT_HOST;
  if (usesProjectOverride) {
    // The host is public information; the key never is.
    console.warn(
      `[nexora-env] this build points at the Supabase project "${ref}" instead of the default project "${NEXORA_PROJECT_REF}".`,
    );
  }

  const publishableKey = rawKey || cleanBrowserEnv(fallbackKey);
  if (!publishableKey) {
    throw new SupabaseConfigError(
      'No publishable Supabase key is configured. Set VITE_SUPABASE_PUBLISHABLE_KEY for this build.',
    );
  }

  return { url, publishableKey, ref, usesProjectOverride };
}
