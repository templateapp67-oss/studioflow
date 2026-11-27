// Booking email delivery for static hosting / Edge fallback.
// POST requires a valid Supabase JWT and a booking visible to that user through
// RLS. The recipient is taken from the stored booking, never from an arbitrary
// caller-supplied address. Deploy with verify_jwt=false only because this
// function performs its own JWT + booking authorization checks (GET status and
// OPTIONS must remain reachable); do not expose a service-role bypass here.

import { browserCorsHeaders, isAllowedBrowserOrigin } from '../_shared/browserCors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { bookingEmailTemplate, sendTransactionalEmail } from '../_shared/resendEmail.ts';
const BOOKING_EMAIL_CORS = 'authorization, apikey, content-type, x-client-info';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_SECONDS = 10 * 60;
const MAX_PER_WINDOW = 5;
// The quota is claimed in Postgres, not in module state: Edge Functions run on
// several isolates, so a per-process Map made the real ceiling
// `MAX_PER_WINDOW × live isolates` and reset on every cold start (gap G-06).
// See supabase/migrations/202611120001_studioflow_edge_rate_limits.sql.

function getEnv(name: string): string {
  const val = Deno.env.get(name);
  return val ? val.trim().replace(/^['"]|['"]$/g, '') : '';
}

function cleanText(value: unknown, max = 200): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function escapeHtml(value: unknown, max = 200): string {
  return cleanText(value, max).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]!));
}

function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

type QuotaDecision = { allowed: boolean; retryAfterSeconds: number };

// Claim one send from the shared, transactional counter. A failure here is
// treated as "not allowed" rather than fail-open: the whole point of the limit
// is to stop repeat sends, so an unreachable counter must not silently disable
// it. The caller gets an explicit 503, never a false success.
async function claimQuota(
  url: string,
  serviceKey: string,
  key: string,
): Promise<QuotaDecision> {
  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/rpc/studioflow_edge_rate_limit_claim`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_bucket_key: key,
        p_window_seconds: WINDOW_SECONDS,
        p_max_attempts: MAX_PER_WINDOW,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`rate limit status ${response.status}`);
    const decision = await response.json();
    return {
      allowed: decision?.allowed === true,
      retryAfterSeconds: Number.isFinite(Number(decision?.retryAfterSeconds))
        ? Math.max(Math.trunc(Number(decision.retryAfterSeconds)), 1)
        : WINDOW_SECONDS,
    };
  } catch {
    // Distinguish "limiter unavailable" from "limit reached" for the caller.
    throw new Error('rate_limit_unavailable');
  }
}

function jsonResponse(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...browserCorsHeaders(origin, BOOKING_EMAIL_CORS, 'GET, POST, OPTIONS'), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function fail(status: number, error: string, extra: Record<string, unknown> = {}, origin: string | null = null) {
  return jsonResponse({ success: false, delivered: false, error, ...extra }, status, origin);
}

async function supabaseFetch(path: string, token: string): Promise<Response> {
  const url = getEnv('SUPABASE_URL').replace(/\/+$/, '');
  const key = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) throw new Error('Supabase email authorization is not configured.');
  return fetch(`${url}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (origin && !isAllowedBrowserOrigin(origin)) return jsonResponse({ success: false, delivered: false, error: 'Origin not allowed' }, 403, origin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: browserCorsHeaders(origin, BOOKING_EMAIL_CORS, 'GET, POST, OPTIONS') });
  }

  const resendApiKey = getEnv('RESEND_API_KEY');
  const fromEmail = getEnv('RESEND_FROM_EMAIL');

  if (req.method === 'GET') {
    return jsonResponse({
      status: 'ok',
      service: 'studioflow-booking-emails',
      configured: Boolean(resendApiKey && fromEmail),
      provider: 'resend',
      from: fromEmail,
      mode: resendApiKey && fromEmail ? 'live' : 'unconfigured',
    }, 200, origin);
  }
  if (req.method !== 'POST') return fail(405, 'POST method required', {}, origin);

  try {
    const raw = await req.text();
    if (!raw || raw.length > 50000) return fail(400, 'Request body missing or too large', {}, origin);
    let body: any;
    try { body = JSON.parse(raw); } catch { return fail(400, 'Request body must be valid JSON.', {}, origin); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'Request body missing or invalid.', {}, origin);

    const type = body.type === 'reminder' ? 'reminder' : 'confirmation';
    const bookingRef = cleanText(body.bookingRef, 64);
    if (!UUID.test(bookingRef)) return fail(400, 'A valid booking reference is required.', {}, origin);

    const authorization = req.headers.get('authorization') || '';
    const token = /^Bearer\s+\S+/i.test(authorization) ? authorization.replace(/^Bearer\s+/i, '').trim() : '';
    if (!token) return fail(401, 'Sign in before sending booking email.', {}, origin);

    let user: { id: string; email: string };
    try {
      const response = await supabaseFetch('/auth/v1/user', token);
      if (!response.ok) return fail(401, 'Your session expired. Sign in again.', {}, origin);
      const parsed = await response.json();
      if (typeof parsed?.id !== 'string' || typeof parsed?.email !== 'string') return fail(401, 'Your session expired. Sign in again.', {}, origin);
      user = { id: parsed.id, email: parsed.email.trim().toLowerCase() };
    } catch {
      return fail(503, 'Email authorization is temporarily unavailable.', {}, origin);
    }

    let booking: any;
    try {
      const response = await supabaseFetch(`/rest/v1/studioflow_bookings?id=eq.${encodeURIComponent(bookingRef)}&select=id,owner_id,customer_id,payload,status`, token);
      if (!response.ok) return fail(404, 'Booking not found for this account.', {}, origin);
      const rows = await response.json();
      booking = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    } catch {
      return fail(503, 'Booking verification is temporarily unavailable.', {}, origin);
    }
    if (!booking) return fail(404, 'Booking not found for this account.', {}, origin);
    if (booking.owner_id !== user.id && booking.customer_id !== user.id) return fail(403, 'Booking not found for this account.', {}, origin);

    const payload = booking.payload && typeof booking.payload === 'object' ? booking.payload : {};
    const storedRecipient = cleanText(payload.clientEmail, 254).toLowerCase();
    const recipient = storedRecipient || (booking.customer_id === user.id ? user.email : '');
    if (!EMAIL.test(recipient)) return fail(409, 'This booking has no verified recipient email address.', {}, origin);
    if (body.to !== undefined && cleanText(body.to, 254).toLowerCase() !== recipient) {
      return fail(403, 'Booking email recipient must match the email saved on the booking.', {}, origin);
    }

    const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return fail(503, 'Email send limit cannot be enforced because the server credential is missing.', {
        notice: 'No email was sent.',
      }, origin);
    }
    let quota: QuotaDecision;
    try {
      quota = await claimQuota(getEnv('SUPABASE_URL'), serviceKey, `${user.id}:${bookingRef}:${type}`);
    } catch {
      return fail(503, 'Email send limit is temporarily unavailable. Try again shortly.', {
        notice: 'No email was sent.',
      }, origin);
    }
    if (!quota.allowed) {
      return new Response(JSON.stringify({ success: false, delivered: false, error: 'Email send limit reached. Try again in a few minutes.' }), {
        status: 429,
        headers: { ...browserCorsHeaders(origin, BOOKING_EMAIL_CORS, 'GET, POST, OPTIONS'), 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': String(quota.retryAfterSeconds) },
      });
    }
    if (!resendApiKey) {
      return fail(503, 'Email delivery is not configured. Set RESEND_API_KEY before sending customer emails.', {
        notice: 'Email delivery is not configured; no message was sent.',
      }, origin);
    }

    if (!resendApiKey || !fromEmail) {
      return fail(503, 'Transactional email sender is not configured.', {
        notice: 'No email was sent. Verify the sender domain and configure RESEND_FROM_EMAIL.',
      }, origin);
    }
    if (recipient.endsWith('@guest.in')) {
      return fail(409, 'This booking has no customer email address. Add a valid email before sending.', {}, origin);
    }

    // The stored booking is authoritative. Client-supplied fields are only a
    // legacy fallback for values not persisted by older booking records.
    const salonName = cleanText(payload.salonName || body.salonName || 'NEXORA Salon', 120);
    const clientName = cleanText(payload.clientName || 'Guest', 120);
    const serviceName = cleanText(payload.serviceName || 'Salon Service', 160);
    const stylistName = cleanText(payload.stylistName || '', 120);
    const date = cleanText(payload.date || '', 80);
    const time = cleanText(payload.time || '', 40);
    const totalAmount = money(payload.servicePrice ?? 0);
    const amountPaid = money(payload.amountPaid ?? 0);
    const serviceType = cleanText(
      payload.serviceType || payload.service_mode || payload.bookingType || payload.serviceMode || '',
      40,
    );
    const homeAddress = cleanText(
      payload.homeServiceAddress || payload.home_service_address ||
      payload.customerAddress || payload.serviceAddress || '',
      350,
    );
    const homeInstructions = cleanText(
      payload.homeServiceInstructions || payload.home_service_instructions || '',
      500,
    );
    const salonAddress = cleanText(
      [payload.salonAddress || payload.branchAddress || body.salonAddress,
       payload.salonCity || body.salonCity].filter(Boolean).join(', '),
      350,
    );
    const salonPhone = cleanText(payload.salonPhone || body.salonPhone || '', 40);

    const template = bookingEmailTemplate({
      bookingId: bookingRef,
      bookingReference: cleanText(payload.bookingReference || bookingRef, 80),
      recipientEmail: recipient,
      customerName: clientName,
      salonName,
      serviceName,
      stylistName,
      date,
      time,
      timeZone: cleanText(payload.timeZone || payload.time_zone || 'Asia/Kolkata', 60),
      totalAmount,
      amountPaid,
      salonAddress,
      salonPhone,
      serviceType,
      homeServiceAddress: homeAddress,
      homeServiceInstructions: homeInstructions,
    }, type === 'reminder');

    const service = createClient(getEnv('SUPABASE_URL'), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const eventKey = `booking-${type}:${bookingRef}`;
    const result = await sendTransactionalEmail(service, {
      eventKey,
      kind: type === 'reminder' ? 'booking_reminder' : 'booking_confirmation',
      recipientEmail: recipient,
      bookingId: bookingRef,
      content: template,
    });

    if (!result.success) {
      return fail(result.suppressed ? 409 : 502, result.error || 'Email could not be accepted by the provider.', {
        suppressed: Boolean(result.suppressed),
      }, origin);
    }

    return jsonResponse({
      success: true,
      delivered: false,
      accepted: Boolean(result.accepted),
      duplicate: Boolean(result.duplicate),
      emailId: result.emailId,
      to: recipient,
      type,
      subject: template.subject,
      notice: result.notice || 'Email accepted by Resend; delivery will be confirmed by webhook.',
    }, 200, origin);
  } catch {
    return fail(500, 'Internal email service error', {}, origin);
  }
});
