// Booking email delivery for static hosting / Edge fallback.
// POST requires a valid Supabase JWT and a booking visible to that user through
// RLS. The recipient is taken from the stored booking, never from an arbitrary
// caller-supplied address. Deploy with verify_jwt=false only because this
// function performs its own JWT + booking authorization checks (GET status and
// OPTIONS must remain reachable); do not expose a service-role bypass here.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const windows = new Map<string, { count: number; resetAt: number }>();

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

function consumeQuota(key: string): boolean {
  const now = Date.now();
  for (const [candidate, window] of windows) if (window.resetAt <= now) windows.delete(candidate);
  const current = windows.get(key);
  if (!current) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return jsonResponse({ success: false, delivered: false, error, ...extra }, status);
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const resendApiKey = getEnv('RESEND_API_KEY');
  const fromEmail = getEnv('RESEND_FROM_EMAIL') || 'StudioFlow <onboarding@resend.dev>';

  if (req.method === 'GET') {
    return jsonResponse({
      status: 'ok',
      service: 'studioflow-booking-emails',
      configured: Boolean(resendApiKey),
      provider: 'resend',
      from: fromEmail,
      mode: resendApiKey ? 'live' : 'unconfigured',
    });
  }
  if (req.method !== 'POST') return fail(405, 'POST method required');

  try {
    const raw = await req.text();
    if (!raw || raw.length > 50000) return fail(400, 'Request body missing or too large');
    let body: any;
    try { body = JSON.parse(raw); } catch { return fail(400, 'Request body must be valid JSON.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'Request body missing or invalid.');

    const type = body.type === 'reminder' ? 'reminder' : 'confirmation';
    const bookingRef = cleanText(body.bookingRef, 64);
    if (!UUID.test(bookingRef)) return fail(400, 'A valid booking reference is required.');

    const authorization = req.headers.get('authorization') || '';
    const token = /^Bearer\s+\S+/i.test(authorization) ? authorization.replace(/^Bearer\s+/i, '').trim() : '';
    if (!token) return fail(401, 'Sign in before sending booking email.');

    let user: { id: string; email: string };
    try {
      const response = await supabaseFetch('/auth/v1/user', token);
      if (!response.ok) return fail(401, 'Your session expired. Sign in again.');
      const parsed = await response.json();
      if (typeof parsed?.id !== 'string' || typeof parsed?.email !== 'string') return fail(401, 'Your session expired. Sign in again.');
      user = { id: parsed.id, email: parsed.email.trim().toLowerCase() };
    } catch {
      return fail(503, 'Email authorization is temporarily unavailable.');
    }

    let booking: any;
    try {
      const response = await supabaseFetch(`/rest/v1/studioflow_bookings?id=eq.${encodeURIComponent(bookingRef)}&select=id,owner_id,customer_id,payload,status`, token);
      if (!response.ok) return fail(404, 'Booking not found for this account.');
      const rows = await response.json();
      booking = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    } catch {
      return fail(503, 'Booking verification is temporarily unavailable.');
    }
    if (!booking) return fail(404, 'Booking not found for this account.');
    if (booking.owner_id !== user.id && booking.customer_id !== user.id) return fail(403, 'Booking not found for this account.');

    const payload = booking.payload && typeof booking.payload === 'object' ? booking.payload : {};
    const storedRecipient = cleanText(payload.clientEmail, 254).toLowerCase();
    const recipient = storedRecipient || (booking.customer_id === user.id ? user.email : '');
    if (!EMAIL.test(recipient)) return fail(409, 'This booking has no verified recipient email address.');
    if (body.to !== undefined && cleanText(body.to, 254).toLowerCase() !== recipient) {
      return fail(403, 'Booking email recipient must match the email saved on the booking.');
    }

    if (!consumeQuota(`${user.id}:${bookingRef}:${type}`)) {
      return new Response(JSON.stringify({ success: false, delivered: false, error: 'Email send limit reached. Try again in a few minutes.' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': String(WINDOW_MS / 1000) },
      });
    }
    if (!resendApiKey) {
      return fail(503, 'Email delivery is not configured. Set RESEND_API_KEY before sending customer emails.', {
        notice: 'Email delivery is not configured; no message was sent.',
      });
    }

    const salonName = cleanText(body.salonName || payload.salonName || 'StudioFlow Salon', 120);
    const clientName = cleanText(payload.clientName || body.clientName || 'Guest', 120);
    const serviceName = cleanText(payload.serviceName || body.serviceName || 'Salon Service', 160);
    const stylistName = cleanText(payload.stylistName || body.stylistName || 'Specialist', 120);
    const date = cleanText(payload.date || body.date || '', 40);
    const time = cleanText(payload.time || body.time || '', 40);
    const price = money(payload.servicePrice ?? body.servicePrice);
    const paid = money(payload.amountPaid ?? body.amountPaid);
    const balance = Math.max(0, price - paid);
    const address = cleanText([body.salonAddress || payload.salonAddress, body.salonCity || payload.salonCity].filter(Boolean).join(', ') || 'Salon Studio', 240);
    const phone = cleanText(body.salonPhone || payload.salonPhone || '', 32);
    const phoneHref = phone.replace(/[^\d+]/g, '').slice(0, 24);
    const ref = escapeHtml(bookingRef, 64);
    const subject = type === 'reminder'
      ? `Reminder: Your appointment tomorrow at ${salonName}`
      : `Booking Confirmed: ${serviceName} at ${salonName} (${bookingRef})`;

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="background:#0f172a;color:#ffffff;padding:28px 24px;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:800;">${type === 'reminder' ? `See You Tomorrow at ${escapeHtml(salonName)}!` : 'Booking Confirmed!'}</h1>
          <p style="margin:8px 0 0;font-size:14px;">${escapeHtml(salonName)}</p>
        </div>
        <div style="padding:24px;font-size:14px;line-height:1.6;">
          <p>Namaste <strong>${escapeHtml(clientName)}</strong>, ${type === 'reminder' ? 'your salon visit is scheduled for tomorrow' : 'your booking is confirmed'}.</p>
          <p><strong>Reference:</strong> ${ref}<br/><strong>Service:</strong> ${escapeHtml(serviceName)}<br/><strong>Specialist:</strong> ${escapeHtml(stylistName)}<br/><strong>Date &amp; Time:</strong> ${escapeHtml(date)} @ ${escapeHtml(time)} IST<br/><strong>Address:</strong> ${escapeHtml(address)}</p>
          <p>Total: ₹${price.toLocaleString('en-IN')} | Paid: ₹${paid.toLocaleString('en-IN')} | Balance Due: ₹${balance.toLocaleString('en-IN')}</p>
          ${phone ? `<p>Questions? Contact the salon at <a href="tel:${escapeHtml(phoneHref, 24)}">${escapeHtml(phone)}</a></p>` : ''}
          <p>Please arrive 10 minutes before your slot and show reference ${ref} at reception.</p>
        </div>
      </div>
    </body></html>`;
    const text = `${salonName} - ${type === 'reminder' ? 'Appointment Reminder' : 'Booking Confirmation'}\n\n`
      + `Client: ${clientName}\nReference: ${bookingRef}\nService: ${serviceName}\nSpecialist: ${stylistName}\n`
      + `Date & Time: ${date} at ${time} IST\nAddress: ${address}\n`
      + `Total: Rs. ${price} | Paid: Rs. ${paid} | Balance Due: Rs. ${balance}\n\n`
      + `Please arrive 10 minutes prior to your appointment.\n${phone ? `Phone: ${phone}\n` : ''}`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [recipient], subject, html, text }),
      signal: AbortSignal.timeout(15000),
    });
    const resendData = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      const message = typeof resendData?.message === 'string' ? resendData.message : typeof resendData?.error === 'string' ? resendData.error : 'Failed to send email via Resend API.';
      return fail(502, message);
    }
    if (typeof resendData?.id !== 'string') return fail(502, 'Email provider returned an incomplete delivery response.');
    return jsonResponse({ success: true, delivered: true, emailId: resendData.id, to: recipient, type, subject });
  } catch {
    return fail(500, 'Internal email service error');
  }
});
