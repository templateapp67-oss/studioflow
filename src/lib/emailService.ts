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
  accepted?: boolean;
  duplicate?: boolean;
  simulated?: boolean;
  emailId?: string;
  error?: string;
  notice?: string;
  subject?: string;
}

function normalizeResult(data: any): EmailSendResult {
  return {
    success: Boolean(data?.success),
    // Resend acceptance is not delivery; only the signed webhook confirms delivery.
    delivered: data?.delivered === true,
    accepted: data?.accepted === true,
    duplicate: data?.duplicate === true,
    simulated: Boolean(data?.simulated),
    emailId: typeof data?.emailId === 'string' ? data.emailId : undefined,
    error: typeof data?.error === 'string' ? data.error : undefined,
    notice: typeof data?.notice === 'string' ? data.notice : undefined,
    subject: typeof data?.subject === 'string' ? data.subject : undefined,
  };
}

async function invokeErrorMessage(error: any): Promise<string> {
  const context = error?.context;
  if (context && typeof context.json === 'function') {
    const body = await context.json().catch(() => null);
    if (typeof body?.error === 'string') return body.error;
  }
  return typeof error?.message === 'string' ? error.message : 'Email delivery failed';
}

/** Single send path: never fall back after an uncertain Resend request. */
export async function checkEmailServiceStatus(): Promise<EmailServiceStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('studioflow-booking-emails', { method: 'GET' });
    if (!error && data && typeof (data as any).configured === 'boolean') {
      return data as EmailServiceStatus;
    }
  } catch {
    // Honest unconfigured response below.
  }
  return { status: 'unavailable', configured: false, provider: 'resend', mode: 'unconfigured' };
}

/**
 * The Edge Function validates booking ownership and binds the recipient to
 * stored booking data. Durable event-key claiming prevents repeat sends.
 */
export async function sendBookingEmail(params: BookingEmailParams): Promise<EmailSendResult> {
  if (!params.to || !params.to.includes('@')) {
    return { success: false, error: 'Please provide a valid recipient email address.' };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    return { success: false, delivered: false, error: 'Sign in before sending booking email.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('studioflow-booking-emails', {
      body: params,
    });
    if (error) {
      return { success: false, delivered: false, error: await invokeErrorMessage(error) };
    }
    const result = normalizeResult(data);
    if (!result.success) {
      return { ...result, error: result.error || result.notice || 'Email delivery failed' };
    }
    return result;
  } catch (err) {
    return {
      success: false,
      delivered: false,
      error: err instanceof Error ? err.message : 'Failed to send automated email',
    };
  }
}

export async function sendBookingConfirmationEmail(
  params: Omit<BookingEmailParams, 'type'>,
): Promise<EmailSendResult> {
  return sendBookingEmail({ ...params, type: 'confirmation' });
}

export async function sendBookingReminderEmail(
  params: Omit<BookingEmailParams, 'type'>,
): Promise<EmailSendResult> {
  return sendBookingEmail({ ...params, type: 'reminder' });
}
