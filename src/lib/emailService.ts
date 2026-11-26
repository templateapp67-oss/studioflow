import { supabase } from './supabase';

export interface BookingEmailParams {
  type?: 'confirmation' | 'reminder';
  to: string;
  clientName: string;
  clientPhone?: string;
  bookingRef: string;
  serviceName: string;
  servicePrice: number;
  amountPaid?: number;
  stylistName?: string;
  date: string;
  time: string;
  salonName: string;
  salonAddress?: string;
  salonCity?: string;
  salonPhone?: string;
  salonWhatsapp?: string;
  salonSlug?: string;
}

export interface EmailServiceStatus {
  status: string;
  configured: boolean;
  provider: string;
  from?: string;
  mode?: string;
}

export interface EmailSendResult {
  success: boolean;
  delivered?: boolean;
  simulated?: boolean;
  emailId?: string;
  error?: string;
  notice?: string;
  subject?: string;
}

function normalizeResult(data: any): EmailSendResult {
  return {
    success: Boolean(data?.success),
    delivered: Boolean(data?.delivered),
    simulated: Boolean(data?.simulated),
    emailId: typeof data?.emailId === 'string' ? data.emailId : undefined,
    error: typeof data?.error === 'string' ? data.error : undefined,
    notice: typeof data?.notice === 'string' ? data.notice : undefined,
    subject: typeof data?.subject === 'string' ? data.subject : undefined,
  };
}

async function jsonOrNull(response: Response): Promise<any | null> {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) return null;
  return response.json().catch(() => null);
}

/** Check the legacy proxy first, then the Edge fallback. Never claim preview delivery. */
export async function checkEmailServiceStatus(): Promise<EmailServiceStatus> {
  try {
    const res = await fetch('/api/email-service-status', { signal: AbortSignal.timeout(5000) });
    const data = await jsonOrNull(res);
    if (res.ok && data && typeof data.configured === 'boolean') return data as EmailServiceStatus;
  } catch {
    // Fall back to the Edge function.
  }

  try {
    const { data, error } = await supabase.functions.invoke('studioflow-booking-emails', { method: 'GET' });
    if (!error && data && typeof (data as any).configured === 'boolean') return data as EmailServiceStatus;
  } catch {
    // Honest unconfigured default below.
  }

  return { status: 'ok', configured: false, provider: 'resend', mode: 'unconfigured' };
}

/**
 * Send a booking confirmation/reminder through the legacy API path, falling
 * back to the Supabase Edge Function on static hosts. Both paths require the
 * signed-in owner/customer of the stored booking and bind the recipient server-side.
 */
export async function sendBookingEmail(params: BookingEmailParams): Promise<EmailSendResult> {
  if (!params.to || !params.to.includes('@')) {
    return { success: false, error: 'Please provide a valid recipient email address.' };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) {
    return { success: false, error: 'Sign in before sending booking email.' };
  }

  try {
    const response = await fetch('/api/send-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(12000),
    });
    const data = await jsonOrNull(response);
    if (response.ok && data?.success) return normalizeResult(data);
    // Authorization/validation/rate-limit failures are authoritative; do not
    // bypass them through the fallback. Missing/static/unconfigured proxies may
    // still fall back to a configured Edge Function.
    if ([400, 401, 403, 409, 429].includes(response.status)) {
      return { success: false, delivered: false, error: data?.error || 'Booking email request was rejected.' };
    }
  } catch {
    // Network/static hosting fallback below.
  }

  try {
    const { data, error } = await supabase.functions.invoke('studioflow-booking-emails', { body: params });
    if (error) {
      let message = error.message || 'Email delivery failed';
      const context = (error as any).context;
      if (context && typeof context.json === 'function') {
        const body = await context.json().catch(() => null);
        if (typeof body?.error === 'string') message = body.error;
      }
      return { success: false, delivered: false, error: message };
    }
    const result = normalizeResult(data);
    if (!result.success) return { ...result, error: result.error || result.notice || 'Email delivery failed' };
    return result;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send automated email' };
  }
}

export async function sendBookingConfirmationEmail(params: Omit<BookingEmailParams, 'type'>): Promise<EmailSendResult> {
  return sendBookingEmail({ ...params, type: 'confirmation' });
}

export async function sendBookingReminderEmail(params: Omit<BookingEmailParams, 'type'>): Promise<EmailSendResult> {
  return sendBookingEmail({ ...params, type: 'reminder' });
}
