import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3';

type Receipt = {
  booking_id: string;
  channel: 'customer_email' | 'admin_email' | 'whatsapp';
  attempts: number;
  details: {
    method: 'online' | 'venue'; email: string; phone: string; service: string;
    date: string; time: string; paid: number; total: number; transaction: string | null;
  };
};
type Env = (key: string) => string;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);

export async function sendBookingReceipts(service: SupabaseClient, env: Env, bookingId?: string) {
  const { data, error } = await service.rpc('studioflow_claim_booking_receipts', { p_booking: bookingId ?? null });
  if (error) throw new Error('Booking receipt queue unavailable');
  const jobs = (data ?? []) as Receipt[];
  await Promise.all(jobs.map(async (job) => {
    const update = async (status: string, providerId?: string) => {
      const { error: writeError } = await service.from('studioflow_booking_receipts').update({
        status, provider_message_id: providerId ?? null,
        next_attempt_at: new Date(Date.now() + Math.min(60, 2 ** job.attempts) * 60_000).toISOString(),
      }).eq('booking_id', job.booking_id).eq('channel', job.channel).eq('status', 'sending').eq('attempts', job.attempts);
      if (writeError) throw new Error('Could not update booking receipt status');
    };
    const retry = () => update(job.attempts < 8 ? 'pending' : 'review');
    const details = job.details;
    const values = [
      job.booking_id, details.service.replace(/\s+/g, ' ').slice(0, 350),
      `${details.date} ${details.time.slice(0, 5)} IST`,
      `INR ${Number(details.paid).toFixed(2)}`,
      details.method === 'venue' ? `Pay INR ${Number(details.total).toFixed(2)} at venue` : details.transaction ?? '',
    ];
    const whatsapp = job.channel === 'whatsapp';
    const recipient = whatsapp ? details.phone.replace(/\D/g, '') :
      job.channel === 'admin_email' ? env('BOOKING_ADMIN_EMAIL') : details.email;
    if (!recipient) return retry();

    const mode = env('BOOKING_RAZORPAY_MODE') || 'test';
    if (mode !== 'live') {
      const allowlist = env(whatsapp ? 'BOOKING_TEST_WHATSAPP_RECIPIENTS' : 'BOOKING_TEST_EMAIL_RECIPIENTS')
        .toLowerCase().split(',').map(value => value.trim());
      if (!allowlist.includes(recipient.toLowerCase())) return retry();
    }
    const request = whatsapp
      ? whatsappRequest(env, recipient, values)
      : emailRequest(env, recipient, values, job);
    if (!request) return retry();

    let response: Response;
    try {
      response = await fetch(request.url, {
        method: 'POST', headers: request.headers, body: JSON.stringify(request.body),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // Meta has no client-supplied send idempotency key. A timeout can hide an accepted send.
      return whatsapp ? update('review') : retry();
    }
    if (!response.ok) return whatsapp && response.status >= 500 ? update('review') : retry();
    const result = await response.json().catch(() => null);
    const providerId = whatsapp ? result?.messages?.[0]?.id : result?.id;
    if (typeof providerId !== 'string' || !providerId) return whatsapp ? update('review') : retry();
    return update('accepted', providerId);
  }));
  return jobs.length;
}

function emailRequest(env: Env, to: string, values: string[], job: Receipt) {
  const token = env('EMAIL_API_KEY') || env('RESEND_API_KEY');
  const from = env('RESEND_FROM_EMAIL');
  if (!token || !from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return null;
  const labels = ['Booking ID', 'Service', 'Appointment', 'Paid amount', 'Transaction / payment method'];
  const rows = values.map((value, i) =>
    `<tr><th scope="row" align="left" style="padding:8px">${labels[i]}</th><td style="padding:8px">${escapeHtml(value)}</td></tr>`).join('');
  return {
    url: 'https://api.resend.com/emails',
    headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
      'Idempotency-Key': `studioflow-receipt/${job.booking_id}/${job.channel}`,
    },
    body: { from, to, subject: 'Nexora booking confirmed',
      html: `<div style="font:16px Arial,sans-serif;color:#20182e"><h1>Booking confirmed</h1><table>${rows}</table></div>` },
  };
}

function whatsappRequest(env: Env, to: string, values: string[]) {
  const token = env('WHATSAPP_API_TOKEN');
  const phoneId = env('BOOKING_WHATSAPP_PHONE_NUMBER_ID');
  const version = env('BOOKING_WHATSAPP_GRAPH_VERSION');
  const template = env('BOOKING_WHATSAPP_TEMPLATE');
  if (!token || !/^91[6-9]\d{9}$/.test(to) || !/^\d+$/.test(phoneId) ||
      !/^v\d+\.\d+$/.test(version) || !template) return null;
  return {
    url: `https://graph.facebook.com/${version}/${phoneId}/messages`,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: {
      messaging_product: 'whatsapp', to, type: 'template',
      template: {
        name: template, language: { code: env('BOOKING_WHATSAPP_TEMPLATE_LANGUAGE') || 'en' },
        components: [{ type: 'body', parameters: values.map(text => ({ type: 'text', text })) }],
      },
    },
  };
}
