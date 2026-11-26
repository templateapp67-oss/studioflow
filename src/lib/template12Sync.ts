import { supabase } from './supabase';

export type Template12SyncStatus = 'idle' | 'syncing' | 'synced' | 'draft' | 'error';
export interface Template12Draft<T> { version: 1; id: string; siteId: string; savedAt: number; payload: T; }
export const TEMPLATE12_DRAFT_KEY_PREFIX = 'studioflow_template12_sync_draft_';
export const TEMPLATE12_MAX_ATTEMPTS = 3;

export class Template12SyncError extends Error {
  code: string;
  status: number | null;
  details: string;
  hint: string;
  retryable: boolean;
  original: unknown;
  userMessage: string;
  constructor(error: unknown) {
    const fields = getTemplate12ErrorFields(error);
    const userMessage = template12UserMessage(fields);
    super(userMessage);
    this.name = 'Template12SyncError';
    this.code = fields.code;
    this.status = fields.status;
    this.details = fields.details;
    this.hint = fields.hint;
    this.retryable = isTemplate12Retryable(fields);
    this.original = error;
    this.userMessage = userMessage;
  }
}

export interface Template12ErrorFields {
  code: string;
  status: number | null;
  message: string;
  details: string;
  hint: string;
  name: string;
}

export function getTemplate12ErrorFields(error: unknown): Template12ErrorFields {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const rawStatus = value.status ?? value.statusCode ?? (/^\d{3}$/.test(String(value.code ?? '')) ? value.code : null);
  const status = Number.isFinite(Number(rawStatus)) ? Number(rawStatus) : null;
  return {
    code: String(value.code ?? ''),
    status,
    message: String(value.message ?? error ?? 'Unknown Template 12 sync error'),
    details: String(value.details ?? ''),
    hint: String(value.hint ?? ''),
    name: String(value.name ?? ''),
  };
}

export function isTemplate12ExpiredJwt(fields: Template12ErrorFields): boolean {
  const text = `${fields.code} ${fields.message}`.toLowerCase();
  return /pgrst301|jwt[^\n]*(expired|expiry)|token[^\n]*expired/.test(text);
}

export function isTemplate12NetworkError(fields: Template12ErrorFields): boolean {
  const text = `${fields.name} ${fields.code} ${fields.message}`.toLowerCase();
  return fields.name === 'AbortError' ||
    /failed to fetch|fetch failed|load failed|network request failed|networkerror|network error|connection reset|connection refused|econnreset|econnrefused|etimedout|enetwork|eai_again/.test(text);
}

export function isTemplate12Retryable(fields: Template12ErrorFields): boolean {
  if (isTemplate12ExpiredJwt(fields) || isTemplate12NetworkError(fields)) return true;
  return fields.status === 408 || fields.status === 429 || (fields.status !== null && fields.status >= 500 && fields.status <= 599);
}

export function template12UserMessage(fields: Template12ErrorFields): string {
  const code = fields.code.toUpperCase();
  if (code === '42501') return 'Permission denied by Supabase (RLS). Sign in to the salon-owner account and verify that the Template 12 owner policies allow these records.';
  if (code === '23503') return 'Some Template 12 data refers to a category or artist that is not present. Retry the save so the related records can sync first.';
  if (code === '23505') return 'Template 12 contains a duplicate record. Review duplicate categories, artist names or portfolio entries, then retry.';
  if (code === '23502') return 'A required Template 12 field is missing. Check the salon, category, artist and portfolio details, then retry.';
  if (code === '42P10') return 'Supabase could not find the unique key required for this Template 12 upsert. Check the deployed Template 12 migration and conflict columns.';
  if (code === '42703' || code === 'PGRST204') return 'The deployed Template 12 table is missing a column expected by this app. Apply or verify the matching migration.';
  if (isTemplate12ExpiredJwt(fields)) return 'Your sign-in expired before Template 12 could sync. Sign in again, then retry; your local draft is kept.';
  if (fields.status === 429) return 'Supabase is temporarily rate-limiting Template 12 saves. Your local draft is kept; retry shortly.';
  if (fields.status === 408 || isTemplate12NetworkError(fields)) return 'Template 12 could not reach Supabase. Check your connection; your local draft is kept and will retry when you are online.';
  if (fields.status !== null && fields.status >= 500) return 'Supabase is temporarily unavailable. Your local draft is kept; retry in a moment.';
  return fields.message && fields.message !== 'Unknown Template 12 sync error'
    ? `Template 12 could not sync: ${fields.message}`
    : 'Template 12 could not sync. Your local draft is kept; retry the save.';
}

export function template12DraftKey(siteId: string): string {
  return `${TEMPLATE12_DRAFT_KEY_PREFIX}${siteId}`;
}

function makeDraftId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function writeTemplate12Draft<T>(siteId: string, payload: T): Template12Draft<T> {
  if (!siteId) throw new Template12SyncError({ code: 'LOCAL_DRAFT_UNAVAILABLE', message: 'A salon account is required before saving Template 12.' });
  const draft: Template12Draft<T> = { version: 1, id: makeDraftId(), siteId, savedAt: Date.now(), payload };
  try {
    if (typeof localStorage === 'undefined') throw new Error('Browser local storage is unavailable.');
    localStorage.setItem(template12DraftKey(siteId), JSON.stringify(draft));
  } catch (error) {
    const fields = getTemplate12ErrorFields(error);
    const wrapped = new Template12SyncError({ ...fields, code: 'LOCAL_DRAFT_UNAVAILABLE', message: 'This browser could not save a local Template 12 backup. Enable local storage and retry; no Supabase sync was started.' });
    wrapped.retryable = false;
    wrapped.userMessage = 'This browser could not save a local Template 12 backup. Enable local storage and retry; no Supabase sync was started.';
    wrapped.message = wrapped.userMessage;
    throw wrapped;
  }
  return draft;
}

export function readTemplate12Draft<T>(siteId: string): Template12Draft<T> | null {
  if (!siteId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(template12DraftKey(siteId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<Template12Draft<T>>;
    if (draft.version !== 1 || draft.siteId !== siteId || typeof draft.id !== 'string' || !Number.isFinite(draft.savedAt) || !('payload' in draft)) return null;
    return draft as Template12Draft<T>;
  } catch { return null; }
}

export function clearTemplate12Draft(siteId: string, expectedDraftId?: string): boolean {
  if (!siteId || typeof localStorage === 'undefined') return false;
  try {
    if (expectedDraftId) {
      const raw = localStorage.getItem(template12DraftKey(siteId));
      if (!raw) return false;
      const current = JSON.parse(raw) as Partial<Template12Draft<unknown>>;
      if (current.id !== expectedDraftId) return false;
    }
    localStorage.removeItem(template12DraftKey(siteId));
    return true;
  } catch { return false; }
}

const wait = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

export interface Template12SyncDependencies {
  refreshSession?: () => Promise<{ error?: unknown }>;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  draft?: Template12Draft<unknown>;
}

/** Write-ahead draft + retry-safe wrapper for the idempotent Template 12 upsert sequence. */
export async function syncTemplate12<T, R>(siteId: string, payload: T, upsert: () => Promise<R>, deps: Template12SyncDependencies = {}): Promise<R> {
  const draft = deps.draft?.siteId === siteId ? deps.draft as Template12Draft<T> : writeTemplate12Draft(siteId, payload);
  const sleep = deps.sleep || wait;
  const random = deps.random || Math.random;
  const refreshSession = deps.refreshSession || (async () => {
    const { error } = await supabase.auth.refreshSession();
    return { error };
  });
  let refreshedJwt = false;
  let failedAttempts = 0;

  while (failedAttempts < TEMPLATE12_MAX_ATTEMPTS) {
    try {
      const result = await upsert();
      clearTemplate12Draft(siteId, draft.id);
      return result;
    } catch (rawError) {
      failedAttempts += 1;
      const fields = getTemplate12ErrorFields(rawError);
      console.error('[Template 12 sync] Supabase write failed', {
        attempt: failedAttempts,
        maxAttempts: TEMPLATE12_MAX_ATTEMPTS,
        code: fields.code,
        status: fields.status,
        message: fields.message,
        details: fields.details,
        hint: fields.hint,
        name: fields.name,
        error: rawError,
      });

      if (isTemplate12ExpiredJwt(fields) && !refreshedJwt) {
        refreshedJwt = true;
        let refreshSucceeded = false;
        try {
          const refresh = await refreshSession();
          if (!refresh.error) refreshSucceeded = true;
          else console.error('[Template 12 sync] Session refresh failed', { ...getTemplate12ErrorFields(refresh.error), error: refresh.error });
        } catch (refreshError) {
          console.error('[Template 12 sync] Session refresh threw', { ...getTemplate12ErrorFields(refreshError), error: refreshError });
        }
        if (refreshSucceeded && failedAttempts < TEMPLATE12_MAX_ATTEMPTS) continue;
        throw new Template12SyncError(rawError);
      }

      const wrapped = new Template12SyncError(rawError);
      if (!wrapped.retryable || failedAttempts >= TEMPLATE12_MAX_ATTEMPTS) throw wrapped;
      const exponential = 350 * (2 ** (failedAttempts - 1));
      const jitter = Math.floor(random() * 220);
      await sleep(exponential + jitter);
    }
  }

  throw new Template12SyncError({ message: 'Template 12 sync attempts were exhausted.' });
}
