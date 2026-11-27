// =============================================================================
// NEXORA SALONOS — public landing-page lead capture
// =============================================================================
// Public, unauthenticated submission endpoint for the landing-page demo and
// contact forms. The browser never receives permission to read or write
// `public.landing_leads`: it posts here, and this function inserts the row with
// a server-side privileged client.
//
// Rules implemented (SUPABASE_DATABASE.md §10):
//   1. POST only, JSON content type only, small request-size limit.
//   2. `lead_type` and `preferred_contact` are validated against the database
//      enum values.
//   3. `full_name` plus at least one of email/phone is required.
//   4. Email format is checked and normalised to lowercase.
//   5. Phone numbers are normalised without assuming the visitor is in India.
//   6. Every field is length-limited before the insert.
//   7. Explicit `consent_given: true` is required and `consent_at` is stamped
//      on the server.
//   8. Only allow-listed fields are accepted; unknown properties are discarded.
//   9. Visitor text is stored as plain text (never rendered as HTML).
//  10. Rate limiting + honeypot + fail-closed Turnstile verification provide anti-spam.
//  11. Responses are generic and never expose database ids or internal errors.
//  12. Operational logs never contain names, emails, phone numbers or messages.
//  13. No marketing message is sent: only the enquiry itself is recorded.
//
// The Supabase Edge runtime provides SUPABASE_URL and a privileged server key
// automatically. No credential is ever shipped to the browser.
// =============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { parseLeadBudget, type LeadBudget } from './landingLeadRateLimit.ts';
import { safeLogger } from '../_shared/safeLogger.ts';

const ALLOWED_ORIGINS = new Set([
  'https://nexorasalon.online',
  'https://www.nexorasalon.online',
  'http://localhost:5173',
  'http://localhost:3000',
]);

const LEAD_TYPES = ['demo_request', 'contact_request', 'pricing_question', 'get_started'] as const;
const CONTACT_PREFERENCES = ['phone', 'email', 'whatsapp', 'no_preference'] as const;
const PLAN_KEYS = ['lite', 'grow', 'standard', 'premium'];
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const HONEYPOT_FIELDS = ['website', 'company_website', 'fax_number'];
/** Per-submission key: a retried request collapses onto the same lead row. */
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,64}$/;
const ALLOWED_PAGE_PREFIXES = ['/salon-os', '/pricing', '/login'];

const MAX_BODY_BYTES = 16_384;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 600;
/**
 * Salt for the rate-limit bucket key. It must be STABLE across function
 * instances (the counter is shared in Postgres) but is never stored: only
 * the salted hash reaches the database.
 *
 * `LANDING_LEAD_RATE_LIMIT_SALT` is REQUIRED. There is deliberately no
 * default: a public, predictable salt would let anyone compute bucket keys,
 * and silently accepting one would mask a broken deployment. A missing salt
 * throws at module load, so a misconfigured deployment cannot serve requests
 * or store leads at all (fail-fast).
 */
const resolveRateLimitSalt = (): string => {
  const value = (Deno.env.get('LANDING_LEAD_RATE_LIMIT_SALT') || '').trim();
  if (!value) throw new Error('LANDING_LEAD_RATE_LIMIT_SALT is not configured');
  return value;
};
const RATE_LIMIT_SALT = resolveRateLimitSalt();

const privacyNoticeVersion = (Deno.env.get('PRIVACY_NOTICE_VERSION') || '2026-11').trim();

const corsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'Retry-After',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // The response carries a per-request origin, so a shared cache must never
    // reuse it for another origin.
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
};

const json = (payload: unknown, status: number, origin: string | null, retryAfterSeconds?: number) =>
  new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders(origin), ...(retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : {}) } });

const SUCCESS = { ok: true, message: 'Your request has been received.' };
const INVALID = { ok: false, message: 'Please check the required fields and try again.' };
/** Generic rejection for a failed bot check: never reveals why it failed. */
const VERIFICATION_FAILED = { ok: false, message: 'Please verify that you are a human and try again.' };

/* --------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */
const asString = (value: unknown, max: number): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;

/** Keeps digits and common separators; never assumes a country code. */
const normalisePhone = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!/^[+()\d\s.\-]{6,32}$/.test(trimmed)) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) return '';
  return trimmed;
};

const isAllowedPagePath = (value: string): boolean => {
  if (!value.startsWith('/')) return false;
  if (value.length > 200) return false;
  if (value.startsWith('//')) return false; // protocol-relative URL
  if (value === '/') return true;
  return ALLOWED_PAGE_PREFIXES.some((prefix) => value === prefix || value.startsWith(`${prefix}/`) || value.startsWith(`${prefix}?`));
};

const isAllowedReferrer = (value: string): boolean => {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return url.hostname === 'nexorasalon.online' || url.hostname === 'www.nexorasalon.online' || url.hostname === 'localhost';
  } catch {
    return false;
  }
};

const sanitiseUtm = (value: string): string => value.replace(/[^\w.\-: ]/g, '').slice(0, 100);

/* --------------------------------------------------------------------------
 * Trusted server-to-server calls
 * ------------------------------------------------------------------------
 * The first-party Nexora server uses a server-side credential, so those calls
 * skip the Edge public per-IP bucket; the first-party server claims the same
 * shared database budget before forwarding. See release QA notes for rollout.
 * Only the function itself uses the privileged client to insert a lead.
 * ------------------------------------------------------------------------ */
const isTrustedServerCall = async (request: Request): Promise<boolean> => {
  const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < token.length; index += 1) {
    difference |= token.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
};

/* --------------------------------------------------------------------------
 * Rate limiting
 * ------------------------------------------------------------------------
 * The counter lives in `public.landing_lead_rate_limits` so it is shared by
 * every Edge Function instance. Only a salted SHA-256 hash of the client IP
 * is stored, the window is 10 minutes, and expired rows are pruned — the raw
 * IP is never persisted.
 * ------------------------------------------------------------------------ */
const hashKey = async (ip: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${RATE_LIMIT_SALT}:${ip}`));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const clientKey = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
};

let pruneCounter = 0;

/** Minimal shape of the privileged client used by this function. */
interface LeadService {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => PromiseLike<{
          data: { id?: string } | null;
          error: { code?: string; message?: string } | null;
        }>;
      };
    };
  };
}

const checkRateLimit = async (service: LeadService, bucketKey: string): Promise<LeadBudget | null> => {
  let budget: LeadBudget | null;
  try {
    const result = await service.rpc('claim_landing_lead_rate_limit', {
      p_bucket_key: bucketKey,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_attempts: RATE_LIMIT_MAX,
    });
    budget = result.error ? null : parseLeadBudget(result.data, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
    if (!budget) throw new Error('limiter unavailable');
  } catch {
    // Upstream errors can contain PII or credentials; emit only a static event.
    safeLogger.error('submit-landing-lead: rate limiter unavailable');
    return null;
  }
  pruneCounter = (pruneCounter + 1) % 25;
  if (pruneCounter === 0) {
    try {
      await service.rpc('prune_landing_lead_rate_limits');
    } catch {
      // Housekeeping only — a failure here must never fail the request.
    }
  }
  return budget;
};

/* --------------------------------------------------------------------------
 * Turnstile verification — fail closed, always
 * ------------------------------------------------------------------------
 * Bot verification must NEVER be silently skipped. Any failure — the secret
 * not being configured, a missing token, a network error, a non-200 response,
 * or Cloudflare answering success !== true — rejects the request. Callers
 * cannot distinguish the cases, and no lead is ever stored on a failure.
 * ------------------------------------------------------------------------ */
const verifyTurnstile = async (token: string, ip: string): Promise<boolean> => {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    safeLogger.error('submit-landing-lead: TURNSTILE_SECRET_KEY is not configured');
    return false;
  }
  if (!token) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result?.success === true;
  } catch {
    return false;
  }
};

/* --------------------------------------------------------------------------
 * Handler
 * ------------------------------------------------------------------------ */
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST') {
    return json({ ok: false, message: 'Please check the required fields and try again.' }, 405, origin);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json(INVALID, 415, origin);
  }

  const declaredLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ ok: false, message: 'Please check the required fields and try again.' }, 413, origin);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(INVALID, 400, origin);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, message: 'Please check the required fields and try again.' }, 413, origin);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid body');
    body = parsed as Record<string, unknown>;
  } catch {
    return json(INVALID, 400, origin);
  }

  // Honeypot: acknowledge silently, store nothing.
  if (HONEYPOT_FIELDS.some((field) => asString(body[field], 200))) {
    return json(SUCCESS, 200, origin);
  }

  // Untrusted client time is only a low-friction heuristic; legacy callers
  // without an elapsed value remain compatible during rollout.
  const elapsed = body.form_elapsed_ms;
  if (elapsed !== undefined && (typeof elapsed !== 'number' || !Number.isSafeInteger(elapsed) || elapsed < 2000)) return json({ ok: false, message: 'Please wait a moment, then try again.' }, 400, origin);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (!url || !serviceKey) {
    safeLogger.error('submit-landing-lead: server credentials are not configured');
    return json({ ok: false, message: 'We could not record your request. Please try again later.' }, 503, origin);
  }
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as LeadService;

  const trustedServerCall = await isTrustedServerCall(request);
  if (!trustedServerCall) {
    const bucketKey = await hashKey(clientKey(request));
    const budget = await checkRateLimit(service, bucketKey);
    if (budget && !budget.allowed) return json({ ok: false, message: 'Too many requests. Please try again later.' }, 429, origin, budget.retryAfterSeconds);
    if (!budget) return json({ ok: false, message: 'The request service is temporarily unavailable. Please try again later.' }, 503, origin);
  }

  const turnstileToken = asString(body.turnstile_token, 2048);
  if (!(await verifyTurnstile(turnstileToken, clientKey(request)))) {
    // Fail closed: a missing token or a verification error rejects the lead.
    return json(VERIFICATION_FAILED, 403, origin);
  }

  /* ---- validation (allow-listed fields only) ---- */
  const leadType = asString(body.lead_type, 40);
  if (!(LEAD_TYPES as readonly string[]).includes(leadType)) return json(INVALID, 400, origin);

  const preferredContact = asString(body.preferred_contact, 20) || 'no_preference';
  if (!(CONTACT_PREFERENCES as readonly string[]).includes(preferredContact)) return json(INVALID, 400, origin);

  const fullName = asString(body.full_name, 120);
  if (fullName.length < 2) return json(INVALID, 400, origin);

  const email = asString(body.email, 254).toLowerCase();
  const rawPhone = asString(body.phone, 32);
  const phone = normalisePhone(rawPhone);
  if (rawPhone && !phone) return json(INVALID, 400, origin);
  if (!email && !phone) return json(INVALID, 400, origin);
  if (email && !isEmail(email)) return json(INVALID, 400, origin);
  if (asString(body.email, 254) && !email) return json(INVALID, 400, origin);

  if (body.consent_given !== true) return json(INVALID, 400, origin);

  const businessName = asString(body.business_name, 160);
  const businessType = asString(body.business_type, 80);
  const city = asString(body.city, 120);
  const message = asString(body.message, 5000);
  const planKey = asString(body.interested_plan_key, 40);
  const pagePath = asString(body.page_path, 200);
  const referrer = asString(body.referrer, 500);

  const idempotencyKey = IDEMPOTENCY_KEY.test(asString(body.idempotency_key, 64))
    ? asString(body.idempotency_key, 64)
    : null;

  const row = {
    lead_type: leadType,
    full_name: fullName,
    business_name: businessName || null,
    business_type: businessType || null,
    email: email || null,
    phone: phone || null,
    city: city || null,
    preferred_contact: preferredContact,
    interested_plan_key: PLAN_KEYS.includes(planKey) ? planKey : null,
    message: message || null,
    page_path: isAllowedPagePath(pagePath) ? pagePath : null,
    referrer: isAllowedReferrer(referrer) ? referrer : null,
    // Only the allow-listed UTM fields are accepted; anything else is dropped.
    ...Object.fromEntries(UTM_FIELDS.map((field) => [field, sanitiseUtm(asString(body[field], 100)) || null])),
    consent_given: true,
    consent_at: new Date().toISOString(),
    privacy_notice_version: privacyNoticeVersion,
    idempotency_key: idempotencyKey,
  };

  try {
    const { data, error } = await service.from('landing_leads').insert(row).select('id').single();
    if (error) {
      // A retried submission that carries the same idempotency key must not
      // create a second lead: the first one is already stored.
      if (error.code === '23505' && idempotencyKey) {
        safeLogger.log('submit-landing-lead: duplicate submission collapsed onto the stored lead');
        return json(trustedServerCall ? { ...SUCCESS, idempotent: true } : SUCCESS, 200, origin);
      }
      // Operational log only — never log the submitted personal data.
      safeLogger.error('submit-landing-lead: insert failed');
      return json({ ok: false, message: 'We could not record your request. Please try again later.' }, 500, origin);
    }
    // The lead id is only handed to a trusted first-party server call so it can
    // record the CRM delivery state. Public callers never receive identifiers.
    return json(trustedServerCall && data?.id ? { ...SUCCESS, leadId: data.id } : SUCCESS, 200, origin);
  } catch {
    safeLogger.error('submit-landing-lead: unexpected failure');
    return json({ ok: false, message: 'We could not record your request. Please try again later.' }, 500, origin);
  }
});
