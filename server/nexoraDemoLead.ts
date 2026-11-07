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
 *   * rely on the Edge Function's shared, database-backed rate limiter so the
 *     limit holds across serverless instances;
 *   * optionally forward to a CRM sink without ever losing a stored lead;
 *   * answer 2xx only after the request is safely stored — never a fake
 *     success;
 *   * log a request id and the outcome only, never the submitted personal
 *     data and never a credential.
 */

import { readServerEnvironment } from './nexoraEnv';

const PRIVACY_NOTICE_VERSION = '2026-11';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s.-]{7,20}$/;

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
  return String(value ?? '')
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
  console.warn(`[nexora-demo-lead] id=${id} rejected status=${code}`);
  return res.status(code).json({ error: message, requestId: id });
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs = 8000,
): Promise<{ ok: boolean; status: number; body: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: {} };
  } finally {
    clearTimeout(timer);
  }
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
    const response = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/landing_leads?${filter}`, {
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
      console.warn(`[nexora-demo-lead] CRM delivery state could not be recorded status=${response.status}`);
    }
  } catch {
    console.warn('[nexora-demo-lead] CRM delivery state could not be recorded');
  }
}

export async function nexoraDemoLeadHandler(req: DemoLeadRequest, res: JsonResponder) {
  const id = requestId();
  if (req.method && req.method !== 'POST') return fail(res, 405, 'POST method required.', id);

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  // Honeypot submissions are acknowledged without storing or forwarding them.
  if (cleanText(body.website, 200)) {
    console.warn(`[nexora-demo-lead] id=${id} honeypot acknowledged`);
    return res.status(202).json({ ok: true, requestId: id });
  }

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

  if (name.length < 2) return fail(res, 400, 'Enter your name.', id);
  if (!EMAIL.test(email)) return fail(res, 400, 'Enter a valid work email address.', id);
  if (!salonName) return fail(res, 400, 'Enter your salon or business name.', id);
  if (phone && !PHONE.test(phone)) return fail(res, 400, 'Enter a valid phone number or leave it blank.', id);
  if (body.consent !== true) return fail(res, 400, 'Please confirm that Nexora may contact you.', id);

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
  });

  if (!stored.configured) {
    // No Supabase credentials: the request cannot be stored, so it must not
    // be reported as accepted.
    console.error(`[nexora-demo-lead] id=${id} storage is not configured`);
    return fail(res, 503, 'Demo requests are not configured yet. No request was sent; please try again later.', id);
  }
  if (stored.status === 429) {
    console.warn(`[nexora-demo-lead] id=${id} rate limited`);
    return fail(res, 429, 'Too many demo requests. Please try again later.', id);
  }
  if (stored.status === 400) {
    console.warn(`[nexora-demo-lead] id=${id} rejected by validation`);
    return fail(res, 400, 'Enter your name, a valid email, your business name, and consent to be contacted.', id);
  }
  if (!stored.ok) {
    console.error(`[nexora-demo-lead] id=${id} storage failed status=${stored.status}`);
    return fail(res, 502, 'The demo request service did not accept your request. No request was confirmed; please try again later.', id);
  }

  // The lead is stored. A CRM sink is optional and never affects the result.
  const crmEndpoint = env('NEXORA_CRM_LEAD_ENDPOINT');
  if (!crmEndpoint) {
    await recordCrmDeliveryState(stored.leadId, idempotencyKey, 'skipped', null);
  } else {
    let target: URL | null = null;
    try {
      const parsed = new URL(crmEndpoint);
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) target = parsed;
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
        console.warn(`[nexora-demo-lead] id=${id} stored; CRM delivery failed status=${delivered.status}`);
        await recordCrmDeliveryState(stored.leadId, idempotencyKey, 'failed', `crm_${delivered.status || 'error'}`);
      } else {
        await recordCrmDeliveryState(stored.leadId, idempotencyKey, 'delivered', null);
      }
    } else {
      // An insecure or malformed CRM endpoint is never contacted.
      await recordCrmDeliveryState(stored.leadId, idempotencyKey, 'failed', 'crm_endpoint_invalid');
    }
  }

  console.log(`[nexora-demo-lead] id=${id} stored`);
  return res.status(201).json({ ok: true, requestId: id });
}
