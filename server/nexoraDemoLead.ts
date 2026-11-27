/**
 * Shared demo-lead handler for the legacy Express API and the Vercel Node
 * function (`api/nexora-demo-lead.ts`).
 *
 * Responsibilities:
 *   * validate and normalise every field on the server;
 *   * honour the honeypot without storing anything;
 *   * persist the enquiry in the configured NEXORA Supabase project through
 *     the `submit-landing-lead` Edge Function (the private `landing_leads`
 *     table is never written to directly);
 *   * claim a shared Postgres per-address budget before the trusted Edge call;
 *   * optionally forward to a CRM sink without ever losing a stored lead;
 *   * answer 2xx only after the request is safely stored — never a fake
 *     success;
 *   * log a request id and the outcome only, never the submitted personal
 *     data and never a credential.
 */

import { readServerEnvironment } from './nexoraEnv.js';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { parseLeadBudget, type LeadBudget } from '../supabase/functions/submit-landing-lead/landingLeadRateLimit.js';
import { assertSafeOutboundUrl, DEMO_LEAD_SCHEMA, safeOutboundFetch, validateBody } from './httpValidation.js';
import { safeLogger } from './safeLogger.js';

const PRIVACY_NOTICE_VERSION = '2026-11';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s.-]{7,20}$/;
/** Must match the Edge Function's honeypot field set so neither path can be bypassed. */
const HONEYPOT_FIELDS = ['website', 'company_website', 'fax_number'];
const RATE_LIMIT_WINDOW_SECONDS = 600;
const RATE_LIMIT_MAX = 5;

type JsonResponder = {
  status: (code: number) => JsonResponder;
  json: (body: unknown) => unknown;
  setHeader?: (name: string, value: string) => unknown;
};

export type DemoLeadRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
  ip?: string;
};

function env(name: string): string {
  return (process.env[name] || '').trim().replace(/^['"]|['"]$/g, '');
}

function cleanText(value: unknown, max = 200): string {
  return (typeof value === 'string' ? value : '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

function requestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}`;
  }
}

function fail(res: JsonResponder, code: number, message: string, id: string) {
  safeLogger.warn(`[nexora-demo-lead] id=${id} rejected status=${code}`);
  return res.status(code).json({ error: message, requestId: id });
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs = 8000,
): Promise<{ ok: boolean; status: number; body: any; retryAfter: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Outbound guard: HTTPS only, never a private/loopback/link-local host,
    // and redirects are never followed (see safeOutboundFetch).
    const response = await safeOutboundFetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    // Forward the upstream's actual Retry-After when present so a 429 from
    // the Edge Function reports the true remaining window, not the maximum.
    const retryAfterRaw = response.headers?.get?.('retry-after');
    const retryAfter = Number(retryAfterRaw);
    return {
      ok: response.ok,
      status: response.status,
      body,
      retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    };
  } catch {
    return { ok: false, status: 0, body: {}, retryAfter: null };
  } finally {
    clearTimeout(timer);
  }
}

// Express supplies req.ip according to its trust-proxy configuration. Vercel
// overwrites its own forwarding header; do not trust arbitrary forwarded headers
// outside that runtime. Missing/invalid identity shares one conservative bucket.
export function leadClientIp(req: DemoLeadRequest, vercel = process.env.VERCEL === '1'): string {
  const raw = vercel ? req.headers?.['x-vercel-forwarded-for'] : req.ip;
  const value = (Array.isArray(raw) ? raw[0] : raw || '').split(',')[0].trim();
  if (!isIP(value)) return 'unknown';
  return value.startsWith('::ffff:') && isIP(value.slice(7)) === 4 ? value.slice(7) : value;
}

async function claimLeadBudget(req: DemoLeadRequest): Promise<LeadBudget | null> {
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!serviceKey) return null;
  // REQUIRED, with no fallback: a public default salt would make bucket keys
  // predictable. A missing salt throws (fail-fast) instead of silently
  // degrading; the async route wrapper turns it into a 500 and logs it.
  const salt = (process.env.LANDING_LEAD_RATE_LIMIT_SALT || '').trim();
  if (!salt) throw new Error('LANDING_LEAD_RATE_LIMIT_SALT is not configured');
  const hash = createHash('sha256').update(`${salt}:${leadClientIp(req)}`).digest('hex');
  const url = readServerEnvironment(process.env, false).supabaseUrl;
  const result = await postJson(`${url.replace(/\/+$/, '')}/rest/v1/rpc/claim_landing_lead_rate_limit`,
    { 'Content-Type': 'application/json', Accept: 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    { p_bucket_key: hash, p_window_seconds: RATE_LIMIT_WINDOW_SECONDS, p_max_attempts: RATE_LIMIT_MAX });
  const budget = result.ok ? parseLeadBudget(result.body, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS) : null;
  if (!budget) return null;
  // Best effort; unlike an in-memory counter this remains effective when most
  // serverless instances are cold. A scheduled cleanup is still advisable.
  if (Math.random() < 0.04) await postJson(`${url.replace(/\/+$/, '')}/rest/v1/rpc/prune_landing_lead_rate_limits`,
    { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, {}, 2000);
  return budget;
}

// This client-supplied timing signal is a frictionless heuristic, not proof
// of human interaction; omitted elapsed times remain valid for older clients.
export function isTooFast(elapsed: unknown): boolean {
  return elapsed !== undefined && (typeof elapsed !== 'number' || !Number.isSafeInteger(elapsed) || elapsed < 2000);
}

/**
 * Persists the lead through the Supabase Edge Function. Returns the outcome
 * so the caller can map it to the right HTTP status.
 */
async function storeLead(payload: Record<string, unknown>) {
  const environment = readServerEnvironment(process.env, false);
  const url = environment.supabaseUrl;
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!serviceKey) return { configured: false as const, status: 0, ok: false };

  const result = await postJson(
    `${url.replace(/\/+$/, '')}/functions/v1/submit-landing-lead`,
    {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    payload,
  );
    return {
      configured: true as const,
      status: result.status,
      ok: result.ok && result.body?.ok === true,
      retryAfter: result.retryAfter,
      leadId: typeof result.body?.leadId === 'string' ? result.body.leadId : null,
      idempotent: result.body?.idempotent === true,
    };
}

/**
 * Records the outcome of the optional CRM forward on the stored lead.
 *
 * The lead is already durable at this point: a CRM failure only updates the
 * delivery state and never removes the enquiry.
 */
async function recordCrmDeliveryState(
  leadId: string | null,
  idempotencyKey: string | null,
  state: 'delivered' | 'failed' | 'skipped',
  errorCode: string | null,
): Promise<void> {
  if (!leadId && !idempotencyKey) return;
  const url = readServerEnvironment(process.env, false).supabaseUrl;
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!serviceKey) return;
  const filter = leadId ? `id=eq.${encodeURIComponent(leadId)}` : `idempotency_key=eq.${encodeURIComponent(idempotencyKey as string)}`;
  try {
    const response = await safeOutboundFetch(`${url.replace(/\/+$/, '')}/rest/v1/landing_leads?${filter}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        crm_delivery_state: state,
        crm_last_error_code: errorCode,
        crm_last_attempt_at: new Date().toISOString(),
        crm_attempts: 1,
      }),
    });
    if (!response.ok) {
      safeLogger.warn(`[nexora-demo-lead] CRM delivery state could not be recorded status=${response.status}`);
    }
  } catch {
    safeLogger.warn('[nexora-demo-lead] CRM delivery state could not be recorded');
  }
}

export async function nexoraDemoLeadHandler(req: DemoLeadRequest, res: JsonResponder) {
  const id = requestId();
  if (req.method && req.method !== 'POST') return fail(res, 405, 'POST method required.', id);

  const bodyResult = validateBody(req.body, DEMO_LEAD_SCHEMA, 64 * 1024);
  if (bodyResult.ok === false) {
    // The form never receives a partial success when its payload is not a
    // plain object of the declared fields.
    return fail(
      res,
      bodyResult.status,
      bodyResult.status === 413 ? 'The request is too large.' : 'Please check the form and try again.',
      id,
    );
  }
  const body: Record<string, unknown> = bodyResult.data;
  // Honeypot submissions are acknowledged without storing or forwarding them.
  // The field set matches the Edge Function so a bot cannot bypass the trap
  // by using an alternate field on the direct server route. The answer is a
  // plain success so the outcome is not distinguishable from a stored lead.
  if (HONEYPOT_FIELDS.some((field) => cleanText(body[field], 200))) {
    safeLogger.warn(`[nexora-demo-lead] id=${id} honeypot acknowledged`);
    return res.status(201).json({ ok: true, requestId: id });
  }

  // Check both the client (camelCase) and Edge (snake_case) field names so a
  // direct bot cannot skip the timing heuristic by reusing the Edge spelling.
  // Absent values still pass, keeping legacy callers compatible.
  if (isTooFast(body.formElapsedMs) || isTooFast(body.form_elapsed_ms)) return fail(res, 400, 'Please wait a moment, then try again.', id);

  const name = cleanText(body.name, 100);
  const email = cleanText(body.email, 254).toLowerCase();
  const salonName = cleanText(body.salonName, 120);
  const phone = cleanText(body.phone, 20);
  const city = cleanText(body.city, 80);
  // A retried submission carries the same key so the lead store can collapse
  // it onto the row that already exists.
  const idempotencyKey = /^[A-Za-z0-9_-]{8,64}$/.test(cleanText(body.idempotencyKey ?? body.idempotency_key, 64))
    ? cleanText(body.idempotencyKey ?? body.idempotency_key, 64)
    : null;
  // A Turnstile token from the browser, when the widget is deployed. It is
  // forwarded verbatim to the Edge Function, which is the only place that
  // verifies it — the server never trusts it on its own.
  const turnstileToken = cleanText(body.turnstileToken ?? body.turnstile_token, 2048);

  if (name.length < 2) return fail(res, 400, 'Enter your name.', id);
  if (!EMAIL.test(email)) return fail(res, 400, 'Enter a valid work email address.', id);
  if (!salonName) return fail(res, 400, 'Enter your salon or business name.', id);
  if (phone && (!PHONE.test(phone) || phone.replace(/\D/g, '').length < 6 || phone.replace(/\D/g, '').length > 15)) return fail(res, 400, 'Enter a valid phone number or leave it blank.', id);
  if (body.consent !== true) return fail(res, 400, 'Please confirm that Nexora may contact you.', id);

  const budget = await claimLeadBudget(req);
  if (budget && !budget.allowed) {
    res.setHeader?.('Retry-After', String(budget.retryAfterSeconds));
    return fail(res, 429, 'Too many demo requests. Please try again later.', id);
  }
  if (!budget) return fail(res, 503, 'Demo requests are temporarily unavailable. No request was sent; please try again later.', id);

  const stored = await storeLead({
    lead_type: 'demo_request',
    full_name: name,
    business_name: salonName,
    email,
    phone: phone || null,
    city: city || null,
    preferred_contact: phone ? 'phone' : 'email',
    page_path: cleanText(body.pagePath, 200) || '/pricing',
    consent_given: true,
    privacy_notice_version: PRIVACY_NOTICE_VERSION,
    idempotency_key: idempotencyKey,
    form_elapsed_ms: body.formElapsedMs,
    turnstile_token: turnstileToken || null,
  });

  if (!stored.configured) {
    // No Supabase credentials: the request cannot be stored, so it must not
    // be reported as accepted.
    safeLogger.error(`[nexora-demo-lead] id=${id} storage is not configured`);
    return fail(res, 503, 'Demo requests are not configured yet. No request was sent; please try again later.', id);
  }
  if (stored.status === 429) {
    // Report the Edge Function's actual remaining window; fall back to the
    // configured window only when the upstream did not send one.
    res.setHeader?.('Retry-After', String(stored.retryAfter ?? RATE_LIMIT_WINDOW_SECONDS));
    safeLogger.warn(`[nexora-demo-lead] id=${id} rate limited`);
    return fail(res, 429, 'Too many demo requests. Please try again later.', id);
  }
  if (stored.status === 400) {
    safeLogger.warn(`[nexora-demo-lead] id=${id} rejected by validation`);
    return fail(res, 400, 'Enter your name, a valid email, your business name, and consent to be contacted.', id);
  }
  if (stored.status === 403) {
    // The Edge Function rejected the bot verification; do not store or fake
    // success. The same 403 is relayed so the form can ask for a retry.
    safeLogger.warn(`[nexora-demo-lead] id=${id} rejected by bot verification`);
    return fail(res, 403, 'Please verify that you are a human and try again.', id);
  }
  if (!stored.ok) {
    safeLogger.error(`[nexora-demo-lead] id=${id} storage failed status=${stored.status}`);
    return fail(res, 502, 'The demo request service did not accept your request. No request was confirmed; please try again later.', id);
  }

  // The lead is stored. A CRM sink is optional and never affects the result.
  const crmEndpoint = env('NEXORA_CRM_LEAD_ENDPOINT');
  if (!crmEndpoint) {
    await recordCrmDeliveryState(stored.leadId, idempotencyKey, 'skipped', null);
  } else {
    let target: URL | null = null;
    try {
      // Full SSRF guard: HTTPS only, no credentials, and never a
      // private/loopback/link-local host (a CRM sink may live on a private
      // network — it must not be reachable through our server).
      target = assertSafeOutboundUrl(crmEndpoint);
    } catch {
      target = null;
    }
    if (target) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
      const token = env('NEXORA_CRM_LEAD_TOKEN');
      if (token) headers.Authorization = `Bearer ${token}`;
      const delivered = await postJson(target.toString(), headers, {
        name,
        email,
        salonName,
        phone: phone || null,
        city: city || null,
        consent: true,
        source: 'nexora-pricing-demo',
        requestId: id,
      });
      if (!delivered.ok) {
        // The lead is already stored in the Supabase lead register, so the
        // enquiry is not lost. The CRM delivery failure is logged for retry.
        safeLogger.warn(`[nexora-demo-lead] id=${id} stored; CRM delivery failed status=${delivered.status}`);
        await recordCrmDeliveryState(stored.leadId, idempotencyKey, 'failed', `crm_${delivered.status || 'error'}`);
      } else {
        await recordCrmDeliveryState(stored.leadId, idempotencyKey, 'delivered', null);
      }
    } else {
      // An insecure or malformed CRM endpoint is never contacted.
      await recordCrmDeliveryState(stored.leadId, idempotencyKey, 'failed', 'crm_endpoint_invalid');
    }
  }

  safeLogger.log(`[nexora-demo-lead] id=${id} stored`);
  return res.status(201).json({ ok: true, requestId: id });
}
