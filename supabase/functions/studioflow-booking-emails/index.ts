

function getEnv(name: string): string {
  const val = Deno.env.get(name);
  return val ? val.trim().replace(/^['"]|['"]$/g, '') : '';
}
function allowedOrigins(): Set<string> {
  const configured = getEnv('ALLOWED_ORIGINS').split(',').map(value => value.trim()).filter(Boolean);
  return new Set(configured.length ? configured : [
    'https://nexorasalon.online',
    'https://studioflow-ashen-pi.vercel.app',
  ]);
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (origin && allowedOrigins().has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

async function getAuthenticatedUser(req: Request): Promise<{ id: string; email: string } | null> {
  const authorization = req.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;
  const supabaseUrl = getEnv('SUPABASE_URL');
  const publicKey = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY');
  if (!supabaseUrl || !publicKey) return null;
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: { apikey: publicKey, Authorization: authorization },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (typeof user?.id !== 'string' || typeof user?.email !== 'string') return null;
    return { id: user.id, email: user.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

const emailSendWindows = new Map<string, { count: number; resetAt: number }>();

function consumeEmailQuota(userId: string): boolean {
  const now = Date.now();
  const current = emailSendWindows.get(userId);
  if (!current || current.resetAt <= now) {
    emailSendWindows.set(userId, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

function cleanSubjectPart(value: unknown, max = 100): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}


interface BookingEmailRequest {
  type?: 'confirmation' | 'reminder';
  to: string;
  clientName?: string;
  clientPhone?: string;
  bookingRef?: string;
  serviceName?: string;
  servicePrice?: number;
  amountPaid?: number;
  stylistName?: string;
  date?: string;
  time?: string;
  salonName?: string;
  salonAddress?: string;
  salonCity?: string;
  salonPhone?: string;
  salonWhatsapp?: string;
  salonSlug?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateConfirmationHtml(data: BookingEmailRequest): string {
  const salon = escapeHtml(data.salonName || 'StudioFlow Salon');
  const client = escapeHtml(data.clientName || 'Valued Guest');
  const service = escapeHtml(data.serviceName || 'Signature Service');
  const stylist = escapeHtml(data.stylistName || 'Specialist');
  const date = escapeHtml(data.date || 'Upcoming Date');
  const time = escapeHtml(data.time || 'Scheduled Time');
  const ref = escapeHtml(data.bookingRef || 'NX-BOOKING');
  const price = Number(data.servicePrice || 0);
  const paid = Number(data.amountPaid || 0);
  const balance = Math.max(0, price - paid);
  const address = escapeHtml([data.salonAddress, data.salonCity].filter(Boolean).join(', ') || 'Salon Studio');
  const phone = escapeHtml(data.salonPhone || '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - ${salon}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background:#ffffff;border-radius:18px;border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#702d4b 0%,#9f1239 50%,#be185d 100%);padding:36px 32px;text-align:center;color:#ffffff;">
              <div style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:999px;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px;">
                Verified Booking
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">Your Appointment is Confirmed!</h1>
              <p style="margin:8px 0 0;font-size:14px;opacity:0.92;">Thank you for booking with ${salon}</p>
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">
                Namaste <strong>${client}</strong>, your salon appointment is saved in our system. Here are your reservation details:
              </p>

              <!-- REFERENCE BADGE -->
              <table role="presentation" width="100%" style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Booking Reference</div>
                    <div style="font-size:18px;font-family:monospace;font-weight:800;color:#0f172a;margin-top:2px;">${ref}</div>
                  </td>
                  <td align="right" style="padding:14px 18px;">
                    <span style="display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:700;">Confirmed</span>
                  </td>
                </tr>
              </table>

              <!-- DETAILS TABLE -->
              <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;font-size:13px;color:#64748b;width:38%;">Service</td>
                  <td style="padding:12px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${service}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;font-size:13px;color:#64748b;">Specialist</td>
                  <td style="padding:12px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${stylist}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;font-size:13px;color:#64748b;">Date & Time</td>
                  <td style="padding:12px 0;font-size:14px;color:#be185d;font-weight:800;font-family:monospace;text-align:right;">${date} at ${time} IST</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 0;font-size:13px;color:#64748b;">Salon Location</td>
                  <td style="padding:12px 0;font-size:13px;color:#334155;text-align:right;">${address}</td>
                </tr>
              </table>

              <!-- PAYMENT BREAKDOWN -->
              <div style="background:#fff5f9;border:1px solid #fbcfe8;border-radius:14px;padding:18px;margin-bottom:24px;">
                <div style="font-size:12px;font-weight:700;color:#9f1239;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Payment Breakdown</div>
                <table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px;">
                  <tr>
                    <td style="padding:4px 0;color:#64748b;">Service Total</td>
                    <td style="padding:4px 0;text-align:right;font-weight:700;color:#0f172a;">₹${price.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#047857;">Advance Paid Online</td>
                    <td style="padding:4px 0;text-align:right;font-weight:700;color:#047857;">- ₹${paid.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style="border-top:1px solid #f472b6;">
                    <td style="padding:8px 0 0;font-size:14px;font-weight:800;color:#9f1239;">Balance Due at Salon</td>
                    <td style="padding:8px 0 0;text-align:right;font-size:15px;font-weight:800;color:#9f1239;">₹${balance.toLocaleString('en-IN')}</td>
                  </tr>
                </table>
              </div>

              <!-- PREPARATION NOTES -->
              <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#475569;">
                <strong style="color:#0f172a;display:block;margin-bottom:4px;">Visiting Checklist:</strong>
                • Please arrive 10 minutes prior to your appointment time.<br>
                • Present your booking reference <strong>${ref}</strong> at reception.<br>
                • Balance payment can be completed via Cash, UPI, or Card at the salon.<br>
                • To reschedule or cancel, please notify the salon at least 4 hours in advance.
              </div>

              ${phone ? `<p style="margin:0;font-size:13px;color:#64748b;text-align:center;">Have questions? Call us directly at <a href="tel:${phone}" style="color:#9f1239;font-weight:700;text-decoration:none;">${phone}</a></p>` : ''}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0f172a;padding:24px 32px;text-align:center;color:#94a3b8;font-size:11px;line-height:1.6;">
              <p style="margin:0 0 6px;color:#ffffff;font-weight:700;font-size:12px;">${salon}</p>
              <p style="margin:0;">Powered by StudioFlow White-label Salon OS • Automated notification</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateReminderHtml(data: BookingEmailRequest): string {
  const salon = escapeHtml(data.salonName || 'StudioFlow Salon');
  const client = escapeHtml(data.clientName || 'Valued Guest');
  const service = escapeHtml(data.serviceName || 'Signature Service');
  const stylist = escapeHtml(data.stylistName || 'Specialist');
  const date = escapeHtml(data.date || 'Tomorrow');
  const time = escapeHtml(data.time || 'Scheduled Time');
  const ref = escapeHtml(data.bookingRef || 'NX-BOOKING');
  const address = escapeHtml([data.salonAddress, data.salonCity].filter(Boolean).join(', ') || 'Salon Studio');
  const phone = escapeHtml(data.salonPhone || '');
  const whatsapp = data.salonWhatsapp ? `https://wa.me/${data.salonWhatsapp.replace(/\D/g, '')}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder - ${salon}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background:#ffffff;border-radius:18px;border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:34px 32px;text-align:center;color:#ffffff;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:999px;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px;color:#fcd34d;">
                Upcoming Visit Reminder
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;">See You Soon at ${salon}!</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#cbd5e1;">Your pampering session is scheduled</p>
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${client}</strong>, this is a friendly reminder of your upcoming appointment with us:
              </p>

              <!-- HIGHLIGHT CARD -->
              <div style="background:linear-gradient(145deg,#fff8fb 0%,#fdf2f8 100%);border:1px solid #f9a8d4;border-radius:16px;padding:22px;margin-bottom:24px;text-align:center;">
                <div style="font-size:13px;color:#9d174d;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Appointment Time</div>
                <div style="font-size:28px;font-weight:900;color:#831843;margin:6px 0;font-family:monospace;">${date} @ ${time} IST</div>
                <div style="font-size:14px;color:#475569;font-weight:600;">${service} with ${stylist}</div>
                <div style="font-size:11px;color:#64748b;margin-top:6px;font-family:monospace;">Ref: ${ref}</div>
              </div>

              <!-- LOCATION & DIRECTIONS -->
              <table role="presentation" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px;">Studio Address</div>
                    <div style="font-size:13px;color:#475569;line-height:1.5;">${address}</div>
                  </td>
                </tr>
              </table>

              <!-- ACTIONS -->
              <table role="presentation" width="100%" style="margin-bottom:20px;">
                <tr>
                  ${whatsapp ? `<td align="center" style="padding:0 6px;">
                    <a href="${whatsapp}" target="_blank" style="display:block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px;box-shadow:0 4px 12px rgba(22,163,74,0.25);">Chat on WhatsApp</a>
                  </td>` : ''}
                  ${phone ? `<td align="center" style="padding:0 6px;">
                    <a href="tel:${phone}" style="display:block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 18px;border-radius:12px;">Call Salon: ${phone}</a>
                  </td>` : ''}
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#64748b;text-align:center;line-height:1.5;">
                Need to reschedule? Please let us know as early as possible so we can adjust our specialist schedule.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0f172a;padding:22px 32px;text-align:center;color:#94a3b8;font-size:11px;line-height:1.6;">
              <p style="margin:0 0 4px;color:#ffffff;font-weight:700;">${salon}</p>
              <p style="margin:0;">StudioFlow automated appointment reminder</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generatePlainText(data: BookingEmailRequest, type: 'confirmation' | 'reminder'): string {
  const salon = data.salonName || 'StudioFlow Salon';
  const client = data.clientName || 'Valued Guest';
  const service = data.serviceName || 'Signature Service';
  const stylist = data.stylistName || 'Specialist';
  const date = data.date || '';
  const time = data.time || '';
  const ref = data.bookingRef || 'NX-BOOKING';
  const price = data.servicePrice || 0;
  const paid = data.amountPaid || 0;
  const balance = Math.max(0, price - paid);
  const address = [data.salonAddress, data.salonCity].filter(Boolean).join(', ');

  if (type === 'reminder') {
    return `Hello ${client},

This is a reminder for your upcoming appointment at ${salon}:
Service: ${service}
Specialist: ${stylist}
Date & Time: ${date} at ${time} IST
Booking Reference: ${ref}
Location: ${address}

Please arrive 10 minutes prior to your slot. If you need to reschedule, please contact the salon.
Phone: ${data.salonPhone || 'N/A'}

Warm regards,
${salon}`;
  }

  return `Namaste ${client},

Your booking at ${salon} is confirmed!

Booking Reference: ${ref}
Service: ${service}
Specialist: ${stylist}
Date & Time: ${date} at ${time} IST
Location: ${address}

Payment Details:
- Total Service Fee: Rs. ${price.toLocaleString('en-IN')}
- Advance Paid: Rs. ${paid.toLocaleString('en-IN')}
- Balance Due at Salon: Rs. ${balance.toLocaleString('en-IN')}

Check-in instructions:
- Please arrive 10 minutes prior to your appointment.
- Present your reference code (${ref}) at the front desk.

Warm regards,
${salon}`;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  const origin = req.headers.get('Origin');
  const originAllowed = !origin || cors['Access-Control-Allow-Origin'] === origin;
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    if (!originAllowed) return new Response('Forbidden', { status: 403, headers: { Vary: 'Origin' } });
    return new Response('ok', { headers: cors });
  }
  if (!originAllowed) return jsonResponse({ error: 'Origin not allowed.' }, 403);

  const resendApiKey = getEnv('RESEND_API_KEY');
  const fromEmail = getEnv('RESEND_FROM_EMAIL') || 'StudioFlow <onboarding@resend.dev>';

  if (req.method === 'GET') {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
    return jsonResponse({
      status: 'ok',
      service: 'studioflow-booking-emails',
      configured: Boolean(resendApiKey),
      provider: 'resend',
      from: fromEmail,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST method required' }, 405);
  }

  try {
    const raw = await req.text();
    if (!raw || raw.length > 50000) {
      return jsonResponse({ error: 'Request body missing or too large' }, 400);
    }

    const payload: BookingEmailRequest = JSON.parse(raw);

    if (!payload.to || typeof payload.to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.to.trim())) {
      return jsonResponse({ error: 'Valid recipient email address (to) is required.' }, 400);
    }

    const recipient = payload.to.trim();
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
    if (user.email !== recipient.toLowerCase()) {
      return jsonResponse({ error: 'Booking email recipient must match the signed-in account.' }, 403);
    }
    if (!consumeEmailQuota(user.id)) {
      return jsonResponse({ error: 'Email send limit reached. Try again in a few minutes.' }, 429);
    }

    const clip = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
    payload.clientName = clip(payload.clientName, 100);
    payload.bookingRef = clip(payload.bookingRef, 64);
    payload.serviceName = clip(payload.serviceName, 120);
    payload.stylistName = clip(payload.stylistName, 100);
    payload.date = clip(payload.date, 40);
    payload.time = clip(payload.time, 40);
    payload.salonName = clip(payload.salonName, 100);
    payload.salonAddress = clip(payload.salonAddress, 160);
    payload.salonCity = clip(payload.salonCity, 100);
    payload.salonPhone = clip(payload.salonPhone, 32);
    payload.salonWhatsapp = clip(payload.salonWhatsapp, 32);
    const priceValue = Number(payload.servicePrice);
    const paidValue = Number(payload.amountPaid);
    payload.servicePrice = Number.isFinite(priceValue) ? Math.max(0, priceValue) : 0;
    payload.amountPaid = Number.isFinite(paidValue) ? Math.max(0, paidValue) : 0;
    const type = payload.type === 'reminder' ? 'reminder' : 'confirmation';
    const salonName = payload.salonName || 'StudioFlow Salon';
    const serviceName = payload.serviceName || 'Salon Service';

    const subject =
      type === 'reminder'
        ? `Reminder: Your appointment tomorrow at ${cleanSubjectPart(salonName)}`
        : `Booking Confirmed: ${cleanSubjectPart(serviceName)} at ${cleanSubjectPart(salonName)} (${cleanSubjectPart(payload.bookingRef || 'Ref', 64)})`;

    const html = type === 'reminder' ? generateReminderHtml(payload) : generateConfirmationHtml(payload);
    const text = generatePlainText(payload, type);

    if (!resendApiKey) {
      return jsonResponse({
        success: false,
        delivered: false,
        error: 'Email delivery is not configured. Set RESEND_API_KEY before sending customer emails.',
      }, 503);
    }

    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient],
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      const errorMessage =
        typeof resendData?.message === 'string'
          ? resendData.message
          : typeof resendData?.error === 'string'
          ? resendData.error
          : 'Failed to send email via Resend API.';

      console.error('Resend delivery error:', errorMessage);
      return jsonResponse(
        {
          success: false,
          delivered: false,
          error: errorMessage,
          to: recipient,
        },
        502
      );
    }

    return jsonResponse({
      success: true,
      delivered: true,
      emailId: resendData.id,
      to: recipient,
      type,
      subject,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal email service error';
    console.error('studioflow-booking-emails error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
