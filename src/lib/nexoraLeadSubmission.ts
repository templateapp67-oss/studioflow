/**
 * Strict client-side contract for demo-lead submissions.
 *
 * The demo form must never report success unless the request was accepted by
 * a lead service that confirmed a durable write. This module is deliberately
 * free of browser/Vite imports so it can be unit-tested directly:
 *
 *   * only `application/json` responses are considered;
 *   * a response body must parse as JSON;
 *   * the body must contain `ok: true` (an HTTP 200 alone is not enough);
 *   * every failure keeps the visitor's input and explains what happened.
 *
 * The same rules are used by the landing-page demo dialog and by any future
 * surface that submits a Nexora lead, so the behaviour cannot drift.
 */

/** Hard limit for one submission attempt. */
export const LEAD_SUBMISSION_TIMEOUT_MS = 15_000;

export interface LeadSubmissionSuccess {
  ok: true;
  /** Server-side request id, when the service returns one. */
  requestId?: string;
}

export interface LeadSubmissionFailure {
  ok: false;
  /** Safe, visitor-facing message. Never contains personal data. */
  error: string;
  /** HTTP status, or 0 when the request never produced a response. */
  status: number;
  /** Stable machine-readable reason for tests and diagnostics. */
  code:
    | 'not_json'
    | 'malformed_json'
    | 'not_ok'
    | 'http_error'
    | 'rate_limited'
    | 'server_error'
    | 'timeout'
    | 'network_error';
}

export type LeadSubmissionOutcome = LeadSubmissionSuccess | LeadSubmissionFailure;

/** Narrowing helper — the project compiles with `strict: false`. */
export function isLeadSubmissionSuccess(
  outcome: LeadSubmissionOutcome,
): outcome is LeadSubmissionSuccess {
  return outcome.ok === true;
}

const DEFAULT_ERROR = 'We could not send your request. No request was confirmed. Please try again later.';

const contentTypeOf = (response: { headers?: { get?: (name: string) => string | null } }): string => {
  try {
    return (response.headers?.get?.('content-type') || '').toLowerCase();
  } catch {
    return '';
  }
};

/** True when the response advertises a JSON body. */
export function isJsonContentType(response: { headers?: { get?: (name: string) => string | null } }): boolean {
  const contentType = contentTypeOf(response);
  if (!contentType) return false;
  return contentType.includes('application/json') || contentType.includes('+json');
}

/**
 * Reads a lead-service response and decides whether the request was really
 * accepted. Any HTML body, malformed JSON, `ok: false` payload or non-2xx
 * status is a failure — never a success.
 */
export async function readLeadSubmissionResponse(response: {
  ok?: boolean;
  status?: number;
  headers?: { get?: (name: string) => string | null };
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}): Promise<LeadSubmissionOutcome> {
  const status = typeof response.status === 'number' ? response.status : 0;

  if (!isJsonContentType(response)) {
    return { ok: false, error: DEFAULT_ERROR, status, code: 'not_json' };
  }

  let payload: unknown = null;
  try {
    payload = typeof response.json === 'function' ? await response.json() : null;
  } catch {
    return { ok: false, error: DEFAULT_ERROR, status, code: 'malformed_json' };
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: DEFAULT_ERROR, status, code: 'malformed_json' };
  }

  const body = payload as { ok?: unknown; message?: unknown; error?: unknown; requestId?: unknown };
  if (body.ok !== true) {
    const message = typeof body.message === 'string' ? body.message : typeof body.error === 'string' ? body.error : '';
    if (status === 429) {
      return { ok: false, error: message || 'Too many demo requests. Please try again later.', status, code: 'rate_limited' };
    }
    if (status >= 500) {
      return { ok: false, error: message || DEFAULT_ERROR, status, code: 'server_error' };
    }
    return { ok: false, error: message || DEFAULT_ERROR, status, code: 'not_ok' };
  }

  if (response.ok === false) {
    // A body that claims success while the transport failed is not a success.
    return { ok: false, error: DEFAULT_ERROR, status, code: 'http_error' };
  }

  return {
    ok: true,
    requestId: typeof body.requestId === 'string' ? body.requestId : undefined,
  };
}

/** Creates a per-submission key so a retry cannot create a second lead. */
export function createLeadIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Posts a lead to the same-origin server route.
 *
 * The request is aborted after `LEAD_SUBMISSION_TIMEOUT_MS`, so a hung
 * upstream can never leave the visitor waiting forever, and the response is
 * validated with `readLeadSubmissionResponse`.
 */
export async function postLeadToServerRoute(
  endpoint: string,
  payload: Record<string, unknown>,
  options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<LeadSubmissionOutcome> {
  const doFetch = options.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) {
    return { ok: false, error: DEFAULT_ERROR, status: 0, code: 'network_error' };
  }
  const timeoutMs = options.timeoutMs ?? LEAD_SUBMISSION_TIMEOUT_MS;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
    return await readLeadSubmissionResponse(response as any);
  } catch (error) {
    const aborted = controller?.signal.aborted === true;
    return {
      ok: false,
      error: aborted
        ? 'The request took too long. No request was confirmed. Please try again.'
        : DEFAULT_ERROR,
      status: 0,
      code: aborted ? 'timeout' : 'network_error',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
