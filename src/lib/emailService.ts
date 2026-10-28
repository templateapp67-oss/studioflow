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

/**
 * Check if the email service (Resend / Edge function) is configured and active.
 */
export async function checkEmailServiceStatus(): Promise<EmailServiceStatus> {
  // Try server proxy first
  try {
    const res = await fetch('/api/email-service-status', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fall back to checking Edge function
  }

  // Fallback check on Supabase edge function
  try {
    const { data, error } = await supabase.functions.invoke('studioflow-booking-emails', {
      method: 'GET',
    });
    if (!error && data) {
      return data as EmailServiceStatus;
    }
  } catch {
    // Fallback default
  }

  return {
    status: 'ok',
    configured: false,
    provider: 'resend',
    mode: 'preview',
  };
}

/**
 * Send an automated booking confirmation or reminder email.
 * Tries the server-side proxy route first, then falls back to invoking the Supabase Edge Function.
 */
export async function sendBookingEmail(params: BookingEmailParams): Promise<EmailSendResult> {
  if (!params.to || !params.to.includes('@')) {
    return {
      success: false,
      error: 'Please provide a valid recipient email address.',
    };
  }

  // 1. Try server API endpoint
  try {
    const response = await fetch('/api/send-booking-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(12000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        delivered: data.delivered,
        simulated: data.simulated,
        emailId: data.emailId,
        subject: data.subject,
        notice: data.notice,
      };
    }
  } catch (err) {
    console.warn('Server proxy email endpoint unreachable; attempting Supabase Edge Function...', err);
  }

  // 2. Fallback to Supabase Edge Function directly
  try {
    const { data, error } = await supabase.functions.invoke('studioflow-booking-emails', {
      body: params,
    });

    if (error) {
      const msg = error.message || 'Email delivery failed';
      return {
        success: false,
        error: msg,
      };
    }

    return {
      success: true,
      delivered: data?.delivered,
      simulated: data?.simulated,
      emailId: data?.emailId,
      notice: data?.notice,
      subject: data?.subject,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send automated email';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Helper to dispatch automated booking confirmation email.
 */
export async function sendBookingConfirmationEmail(params: Omit<BookingEmailParams, 'type'>): Promise<EmailSendResult> {
  return sendBookingEmail({
    ...params,
    type: 'confirmation',
  });
}

/**
 * Helper to dispatch automated booking reminder email.
 */
export async function sendBookingReminderEmail(params: Omit<BookingEmailParams, 'type'>): Promise<EmailSendResult> {
  return sendBookingEmail({
    ...params,
    type: 'reminder',
  });
}
