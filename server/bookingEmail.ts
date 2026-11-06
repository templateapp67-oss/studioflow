/**
 * Shared booking-email handler for the legacy Express API and Vercel Node
 * functions. It keeps the existing request/response shape, but binds delivery
 * to an authenticated owner/customer of the stored booking instead of trusting
 * caller-supplied recipients or booking details.
 */

const DEFAULT_SUPABASE_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

type JsonResponder = {
  status: (code: number) => JsonResponder;
  json: (body: unknown) => unknown;
  setHeader?: (name: string, value: string) => unknown;
};

type BookingEmailRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
};

const windows = new Map<string, { count: number; resetAt: number }>();

function env(name: string): string {
  return (process.env[name] || '').trim().replace(/^['"]|['"]$/g, '');
}

function header(req: BookingEmailRequest, name: string): string {
  const direct = req.get?.(name);
  if (direct) return direct;
  const value = req.headers?.[name.toLowerCase()] ?? req.headers?.[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
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
  for (const [candidate, window] of windows) {
    if (window.resetAt <= now) windows.delete(candidate);
  }
  const current = windows.get(key);
  if (!current) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function supabaseConfig() {
  return {
    url: (env('SUPABASE_URL') || DEFAULT_SUPABASE_URL).replace(/\/+$/, ''),
    key: env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY') || DEFAULT_SUPABASE_ANON_KEY,
  };
}

async function supabaseFetch(path: string, token: string): Promise<Response> {
  const { url, key } = supabaseConfig();
  return fetch(`${url}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
}

async function authenticatedUser(token: string): Promise<{ id: string; email: string } | null> {
  try {
    const response = await supabaseFetch('/auth/v1/user', token);
    if (!response.ok) return null;
    const user = await response.json();
    if (typeof user?.id !== 'string' || typeof user?.email !== 'string') return null;
    return { id: user.id, email: user.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

async function storedBooking(token: string, bookingId: string): Promise<any | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/studioflow_bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,owner_id,customer_id,payload,status`,
      token,
    );
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  } catch {
    return null;
  }
}

function fail(res: JsonResponder, status: number, error: string, extra: Record<string, unknown> = {}) {
  res.setHeader?.('Cache-Control', 'no-store');
  return res.status(status).json({ success: false, delivered: false, error, ...extra });
}

export async function emailStatusHandler(_req: BookingEmailRequest, res: JsonResponder) {
  const resendApiKey = env('RESEND_API_KEY');
  const fromEmail = env('RESEND_FROM_EMAIL') || 'StudioFlow <onboarding@resend.dev>';
  res.setHeader?.('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    provider: 'resend',
    configured: Boolean(resendApiKey),
    from: fromEmail,
    mode: resendApiKey ? 'live' : 'unconfigured',
  });
}

export async function bookingEmailHandler(req: BookingEmailRequest, res: JsonResponder) {
  if (req.method && req.method !== 'POST') return fail(res, 405, 'POST method required.');
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(res, 400, 'Request body missing or invalid.');
    const type = body.type === 'reminder' ? 'reminder' : 'confirmation';
    const bookingRef = cleanText(body.bookingRef, 64);
    if (!UUID.test(bookingRef)) return fail(res, 400, 'A valid booking reference is required.');

    const authorization = header(req, 'authorization');
    const token = /^Bearer\s+\S+/i.test(authorization) ? authorization.replace(/^Bearer\s+/i, '').trim() : '';
    if (!token) return fail(res, 401, 'Sign in before sending booking email.');
    const user = await authenticatedUser(token);
    if (!user) return fail(res, 401, 'Your session expired. Sign in again.');

    // RLS returns the booking only for its owner or customer. No service-role
    // bypass is used, so tenant isolation stays in the database policy layer.
    const booking = await storedBooking(token, bookingRef);
    if (!booking) return fail(res, 404, 'Booking not found for this account.');
    if (booking.owner_id !== user.id && booking.customer_id !== user.id) {
      return fail(res, 403, 'Booking not found for this account.');
    }

    const payload = booking.payload && typeof booking.payload === 'object' ? booking.payload : {};
    const storedRecipient = cleanText(payload.clientEmail, 254).toLowerCase();
    const recipient = storedRecipient || (booking.customer_id === user.id ? user.email : '');
    if (!EMAIL.test(recipient)) return fail(res, 409, 'This booking has no verified recipient email address.');
    if (body.to !== undefined && cleanText(body.to, 254).toLowerCase() !== recipient) {
      return fail(res, 403, 'Booking email recipient must match the email saved on the booking.');
    }

    if (!consumeQuota(`${user.id}:${bookingRef}:${type}`)) {
      res.setHeader?.('Retry-After', String(WINDOW_MS / 1000));
      return fail(res, 429, 'Email send limit reached. Try again in a few minutes.');
    }

    const resendApiKey = env('RESEND_API_KEY');
    const fromEmail = env('RESEND_FROM_EMAIL') || 'StudioFlow <onboarding@resend.dev>';
    if (!resendApiKey) {
      return fail(res, 503, 'Email delivery is not configured. Set RESEND_API_KEY before sending customer emails.', {
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [recipient], subject, html, text }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof data?.message === 'string' ? data.message : typeof data?.error === 'string' ? data.error : 'Failed to send via Resend';
      return fail(res, 502, message);
    }
    if (typeof data?.id !== 'string') return fail(res, 502, 'Email provider returned an incomplete delivery response.');
    return res.status(200).json({ success: true, delivered: true, emailId: data.id, to: recipient, type, subject });
  } catch {
    return fail(res, 500, 'Failed to process booking email.');
  }
}
