/**
 * Staff invite email delivery (Resend).
 *
 * Same contract as the booking-email handler: the caller must be a signed-in
 * salon owner, the invite is re-read from Postgres through the caller's own
 * token, and the recipient/role/branches come from the stored invite — never
 * from the request body. A browser cannot use this endpoint to mail an
 * arbitrary address or to mail on behalf of another salon.
 *
 * The server never *creates* invites: it only delivers one that Postgres
 * already produced, so the token that lands in an inbox is the token the
 * database hashed.
 */

const DEFAULT_SUPABASE_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-f0-9]{64}$/i;
const WINDOW_SECONDS = 600;

type JsonResponder = {
  status: (code: number) => JsonResponder;
  json: (body: unknown) => unknown;
  setHeader?: (name: string, value: string) => unknown;
};

type InviteRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
};

function env(name: string): string {
  return (process.env[name] || '').trim().replace(/^['"]|['"]$/g, '');
}

function header(req: InviteRequest, name: string): string {
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

async function claimInviteQuota(key: string, maxAttempts: number) {
  const { url } = supabaseBase();
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!serviceKey) throw new Error('Invite rate limiting is unavailable.');
  const response = await fetch(`${url}/rest/v1/rpc/studioflow_edge_rate_limit_claim`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_bucket_key: key, p_window_seconds: WINDOW_SECONDS, p_max_attempts: maxAttempts }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Invite rate limiting is unavailable.');
  const decision = await response.json();
  if (typeof decision?.allowed !== 'boolean') throw new Error('Invite quota returned an invalid response.');
  return decision.allowed ? 0 : Math.max(1, Number(decision.retryAfterSeconds) || WINDOW_SECONDS);
}

function json(res: JsonResponder, status: number, body: unknown) {
  res.status(status);
  if (res.setHeader) res.setHeader('Cache-Control', 'no-store');
  return res.json(body);
}

/**
 * Only same-origin paths are accepted as the invite base URL, so a caller
 * cannot turn the mailer into an open redirect that harvests tokens.
 */
export function safeInviteOrigin(value: unknown): string | null {
  const raw = cleanText(value, 300);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const allowed = new Set([
      'https://nexorasalon.online', 'https://www.nexorasalon.online',
      'https://studioflow-ashen-pi.vercel.app',
      'https://nexora-one-white-label.templateapp67.chatgpt.site',
      ...env('STUDIOFLOW_STAFF_INVITE_ORIGINS').split(',').map(origin => origin.trim()),
    ]);
    if (url.protocol === 'https:' && allowed.has(url.origin)) return url.origin;
    if (process.env.NODE_ENV !== 'production' && ['http:', 'https:'].includes(url.protocol)
      && ['localhost', '127.0.0.1'].includes(url.hostname)) return url.origin;
    return null;
  } catch {
    return null;
  }
}

export function buildInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/staff/accept?token=${encodeURIComponent(token)}`;
}

const ROLE_SUMMARY: Record<string, string> = {
  'Manager (Full Access)': 'Manager — full access to reports, revenue, team, pricing and settings.',
  'Receptionist (Frontdesk)': 'Receptionist — bookings for all staff, POS payments, check-ins and client contacts.',
  'Service Provider (Assigned)': 'Service Provider — your own calendar, service completion and tips/commission view.',
};

export function inviteEmailHtml(input: {
  salonName: string;
  staffName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
  ownerEmail?: string;
}): string {
  const salon = escapeHtml(input.salonName || 'your salon', 120);
  const person = escapeHtml(input.staffName || 'there', 120);
  const roleLine = escapeHtml(ROLE_SUMMARY[input.role] || ROLE_SUMMARY['Service Provider (Assigned)'], 300);
  const expiry = escapeHtml(input.expiresAt, 60);
  const url = escapeHtml(input.inviteUrl, 600);
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
    <tr><td style="padding:28px 28px 8px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#900c3f">NEXORA SalonOS</p>
      <h1 style="margin:0;font-size:22px;line-height:1.3">You're invited to join ${salon} on Nexora</h1>
    </td></tr>
    <tr><td style="padding:8px 28px 0">
      <p style="margin:12px 0;font-size:15px;line-height:1.6">Hi ${person},</p>
      <p style="margin:12px 0;font-size:15px;line-height:1.6">${escapeHtml(input.ownerEmail || 'The salon owner', 160)} has invited you to the ${salon} team workspace. Your access level:</p>
      <p style="margin:12px 0;padding:12px 14px;background:#fdf2f8;border:1px solid #fbcfe8;border-radius:12px;font-size:14px;line-height:1.6"><strong>${escapeHtml(input.role, 80)}</strong><br/>${roleLine}</p>
      <p style="margin:20px 0;text-align:center">
        <a href="${url}" style="display:inline-block;background:#900c3f;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:12px">Accept invite &amp; set password</a>
      </p>
      <p style="margin:12px 0;font-size:13px;line-height:1.6;color:#475569">This link expires on <strong>${expiry}</strong> and can be used once. If the button does not work, copy this link:<br/><span style="word-break:break-all;color:#1d4ed8">${url}</span></p>
      <p style="margin:12px 0;font-size:13px;line-height:1.6;color:#475569">Didn't expect this email? You can ignore it — no account is created until the link is opened.</p>
    </td></tr>
    <tr><td style="padding:16px 28px 26px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#64748b">Nexora SalonOS · Staff access invite</p>
    </td></tr>
  </table>
</body></html>`;
}

function supabaseBase(): { url: string; key: string } {
  return {
    url: (env('SUPABASE_URL') || DEFAULT_SUPABASE_URL).replace(/\/+$/, ''),
    key: env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY') || DEFAULT_SUPABASE_ANON_KEY,
  };
}

/** Calls one of the owner's own RPCs; a failure here is logged, not fatal. */
async function supabaseRpc(name: string, token: string, args: Record<string, unknown>): Promise<boolean> {
  try {
    const { url, key } = supabaseBase();
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** GET: report whether invite email delivery is configured (no secrets leaked). */
export async function staffInviteStatus(_req: InviteRequest, res: JsonResponder) {
  const configured = Boolean(env('RESEND_API_KEY'));
  return json(res, 200, {
    status: 'ok',
    service: 'studioflow-staff-invites',
    provider: 'resend',
    configured,
    mode: configured ? 'live' : 'unconfigured',
    from: env('RESEND_FROM_EMAIL') || 'Nexora SalonOS <onboarding@resend.dev>',
  });
}

export async function staffInviteEmailHandler(req: InviteRequest, res: JsonResponder) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'POST method required' });

  const auth = header(req, 'authorization');
  const token = /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim() || '';
  if (!token) return json(res, 401, { success: false, error: 'Sign in to send a staff invite.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const inviteId = cleanText(body.inviteId, 40);
  const inviteToken = cleanText(body.token, 80);
  if (!UUID.test(inviteId)) return json(res, 400, { success: false, error: 'Invite id is missing or invalid.' });
  if (!TOKEN.test(inviteToken)) return json(res, 400, { success: false, error: 'Invite token is missing or invalid.' });

  const { url, key } = supabaseBase();
  let invite;
  try {
    const response = await fetch(`${url}/rest/v1/rpc/studioflow_staff_invite_delivery`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_invite_id: inviteId, p_token: inviteToken }),
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401) return json(res, 401, { success: false, error: 'Your session expired. Sign in again.' });
    if (response.status === 403) return json(res, 403, { success: false, error: 'Verify your session before sending an invite.' });
    if (!response.ok) throw new Error('Invite lookup failed.');
    invite = await response.json();
  } catch {
    return json(res, 503, { success: false, error: 'Invite could not be verified. Try again shortly.' });
  }

  if (!invite?.owner_id) return json(res, 404, { success: false, error: 'Invite or token not found for this salon.' });
  if (invite.status !== 'pending') return json(res, 409, { success: false, error: 'Only a pending invite can be emailed.' });
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return json(res, 409, { success: false, error: 'This invite has expired. Resend it to create a fresh link.' });
  }
  const to = cleanText(invite.email, 200);
  if (!to) return json(res, 400, { success: false, error: 'Add an email address to this team member, then resend the invite.' });

  const origin = safeInviteOrigin(body.origin);
  if (!origin) return json(res, 400, { success: false, error: 'A valid site origin is required to build the invite link.' });

  try {
    const retryAfter = await claimInviteQuota(`staff-invite-owner:${invite.owner_id}`, 20)
      || await claimInviteQuota(`staff-invite-object:${inviteId.toLowerCase()}`, 5);
    if (retryAfter) {
      res.setHeader?.('Retry-After', String(retryAfter));
      return json(res, 429, { success: false, error: 'Invite email limit reached. Try again shortly.' });
    }
  } catch {
    return json(res, 503, { success: false, error: 'Invite email is temporarily unavailable.' });
  }

  const salonName = cleanText(invite.salon_name, 120);
  const ownerEmail = cleanText(invite.owner_email, 160);
  const inviteUrl = buildInviteUrl(origin, inviteToken);

  const apiKey = env('RESEND_API_KEY');
  const from = env('RESEND_FROM_EMAIL') || 'Nexora SalonOS <onboarding@resend.dev>';
  if (!apiKey) {
    // Honest unconfigured state: the owner still gets the copyable link.
    return json(res, 503, {
      success: false,
      configured: false,
      error: 'Email delivery is not configured on this server yet.',
      notice: 'Copy the invite link and send it on WhatsApp instead.',
      inviteUrl,
    });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `${salonName || 'Nexora'} invited you to the team workspace`,
        html: inviteEmailHtml({
          salonName,
          staffName: cleanText(invite.staff_name, 120),
          role: cleanText(invite.role, 80),
          inviteUrl,
          expiresAt: new Date(invite.expires_at).toUTCString(),
          ownerEmail,
        }),
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok) {
      return json(res, 502, { success: false, error: cleanText(data?.message, 200) || `Email provider returned ${response.status}.`, inviteUrl });
    }
    // Record the delivery against the invite through the owner's own RPC.
    // A failed bookkeeping write must not fail the send that already happened.
    await supabaseRpc('studioflow_staff_invite_mark_sent', token, { p_invite_id: inviteId, p_channel: 'email' });
    return json(res, 200, { success: true, delivered: true, emailId: cleanText(data?.id, 100), inviteUrl });
  } catch {
    return json(res, 502, {
      success: false,
      error: 'Email provider could not be reached. The invite link still works — send it on WhatsApp.',
      inviteUrl,
    });
  }
}
