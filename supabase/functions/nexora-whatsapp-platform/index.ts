// NEXORA multi-tenant WhatsApp Business Platform.
// Meta Embedded Signup v5, signed webhooks, tenant routing, customer booking flow
// and Razorpay Payment Link settlement. Secrets remain in Supabase Function settings.

import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

type Row = Record<string, any>;
type Json = Record<string, any>;

const API_VERSION = (Deno.env.get('META_GRAPH_API_VERSION') || 'v27.0').trim();
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-hub-signature-256, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function env(name: string): string {
  return (Deno.env.get(name) || '').trim();
}
function clean(value: unknown, max = 300): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
    : '';
}
function digits(value: unknown): string {
  return clean(value, 40).replace(/[^0-9]/g, '');
}
function phoneE164(value: unknown): string {
  const d = digits(value);
  if (d.length === 10) return '+91' + d;
  if (d.length >= 11 && d.length <= 15 && d[0] !== '0') return '+' + d;
  return '';
}
function constantTimeEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
function base64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
async function sha256(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}
async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))));
}
async function verifySignature(secret: string, raw: string, received: string, prefix: string): Promise<boolean> {
  if (!secret || !received.startsWith(prefix)) return false;
  const expected = await hmacHex(secret, raw);
  return constantTimeEqual(expected, received.slice(prefix.length).toLowerCase());
}
function adminClient() {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('WhatsApp server is missing Supabase credentials');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function ownerFromRequest(req: Request, db: any): Promise<Row> {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!bearer) throw new Error('Sign in to manage this salon WhatsApp number');
  const { data, error } = await db.auth.getUser(bearer);
  if (error || !data?.user?.id) throw new Error('Your owner session has expired. Sign in again.');
  const ownerId = data.user.id as string;
  const { data: account, error: accountError } = await db
    .from('studioflow_accounts').select('user_id').eq('user_id', ownerId).maybeSingle();
  if (accountError || !account) throw new Error('This account does not have a NEXORA salon workspace');
  return data.user as Row;
}
async function encryptionKey(db: any): Promise<CryptoKey> {
  const { data, error } = await db.rpc('nexora_whatsapp_token_key');
  if (error || typeof data !== 'string' || !data) {
    throw new Error('Vault-held WhatsApp token-encryption key could not be loaded by the trusted server');
  }
  const encoded = data;
  const raw = fromBase64(encoded);
  if (raw.length !== 32) throw new Error('WhatsApp token-encryption key is not a valid 32-byte AES key');
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encryptToken(db: any, token: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await encryptionKey(db);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
  return { ciphertext: base64(new Uint8Array(cipher)), iv: base64(iv) };
}
async function decryptToken(db: any, row: Row): Promise<string> {
  const key = await encryptionKey(db);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(row.access_token_iv) },
    key,
    fromBase64(row.access_token_ciphertext),
  );
  return new TextDecoder().decode(plain);
}
async function metaRequest(path: string, token: string, init: RequestInit = {}): Promise<Row> {
  const response = await fetch('https://graph.facebook.com/' + API_VERSION + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = clean(result?.error?.message, 300) || 'Meta WhatsApp request failed';
    throw new Error(message);
  }
  return result as Row;
}
function razorpayCredentials() {
  const key = env('RAZORPAY_KEY_ID') || env('RZP_KEY_ID') || env('RAZORPAY_KEY');
  const secret = env('RAZORPAY_KEY_SECRET') || env('RZP_KEY_SECRET') || env('RAZORPAY_SECRET');
  return { key, secret, configured: Boolean(key && secret), mode: key.startsWith('rzp_live_') ? 'live' : 'test' };
}
async function razorpayRequest(path: string, method = 'GET', body?: Row): Promise<Row> {
  const credentials = razorpayCredentials();
  if (!credentials.configured) throw new Error('Razorpay server credentials are not configured');
  const response = await fetch('https://api.razorpay.com/v1/' + path, {
    method,
    headers: {
      Authorization: 'Basic ' + btoa(credentials.key + ':' + credentials.secret),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(clean(data?.error?.description, 300) || 'Razorpay request failed');
  }
  return data as Row;
}
async function getConnection(db: any, ownerId: string): Promise<Row | null> {
  const { data } = await db
    .from('salon_whatsapp_connections')
    .select('id,owner_id,waba_id,phone_number_id,display_phone_number,verified_name,connection_status,webhook_subscribed,is_on_biz_app,platform_type,connection_mode,access_token_ciphertext,access_token_iv,token_key_version')
    .eq('owner_id', ownerId)
    .maybeSingle();
  return data || null;
}
async function addMessageLog(db: any, row: Row): Promise<void> {
  const { error } = await db.from('salon_whatsapp_message_log').insert(row);
  if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
    throw new Error('Could not save WhatsApp message log');
  }
}
async function sendWhatsAppText(
  db: any,
  connection: Row,
  to: string,
  text: string,
  kind = 'conversation',
  bookingId?: string,
  allowOptOut = false,
): Promise<{ sent: boolean; reason?: string; messageId?: string }> {
  const recipient = digits(to);
  if (!recipient || text.length < 1 || text.length > 4096) {
    throw new Error('WhatsApp recipient or message is invalid');
  }
  const { data: conversation } = await db
    .from('salon_whatsapp_conversations')
    .select('last_inbound_at,conversation_status,flow_state')
    .eq('owner_id', connection.owner_id)
    .eq('customer_wa_id', recipient)
    .maybeSingle();
  const lastInbound = conversation?.last_inbound_at ? new Date(conversation.last_inbound_at).getTime() : 0;
  const optedOut = conversation?.conversation_status === 'closed' || Boolean(conversation?.flow_state?.optedOutAt);
  if (optedOut && !allowOptOut) {
    await addMessageLog(db, {
      owner_id: connection.owner_id,
      recipient_wa_id: recipient,
      direction: 'outbound',
      message_kind: kind,
      delivery_status: 'queued',
      booking_id: bookingId || null,
      metadata: { reason: 'customer_opted_out' },
    });
    return { sent: false, reason: 'customer_opted_out' };
  }
  if (!lastInbound || Date.now() - lastInbound > 24 * 60 * 60 * 1000) {
    await addMessageLog(db, {
      owner_id: connection.owner_id,
      recipient_wa_id: recipient,
      direction: 'outbound',
      message_kind: kind,
      delivery_status: 'queued',
      booking_id: bookingId || null,
      metadata: { reason: 'customer_service_window_closed', message_preview: text.slice(0, 400) },
    });
    return { sent: false, reason: 'customer_service_window_closed' };
  }
  const token = await decryptToken(db, connection);
  const response = await metaRequest('/' + connection.phone_number_id + '/messages', token, {
    method: 'POST',
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { preview_url: false, body: text },
    }),
  });
  const messageId = clean(response?.messages?.[0]?.id, 200);
  await addMessageLog(db, {
    owner_id: connection.owner_id,
    recipient_wa_id: recipient,
    provider_message_id: messageId || null,
    direction: 'outbound',
    message_kind: kind,
    delivery_status: 'sent',
    booking_id: bookingId || null,
    metadata: { message_preview: text.slice(0, 400) },
  });
  await db.from('salon_whatsapp_conversations')
    .update({ last_outbound_at: new Date().toISOString() })
    .eq('owner_id', connection.owner_id)
    .eq('customer_wa_id', recipient);
  return { sent: true, messageId };
}
function serviceList(content: Row): Row[] {
  const rows = Array.isArray(content?.services) ? content.services : [];
  return rows.filter((s: Row) =>
    s && typeof s.id === 'string' && clean(s.name, 120)
    && s.isActive !== false && s.isAvailable !== false
    && Number(s.price) >= 0 && Number.isInteger(Number(s.durationMinutes))
    && Number(s.durationMinutes) > 0,
  ).slice(0, 30);
}
function parseDate(value: string): string {
  const input = clean(value, 40);
  let candidate = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) candidate = input;
  else {
    const match = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) candidate = match[3] + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0');
  }
  if (!candidate) return '';
  const date = new Date(candidate + 'T00:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== candidate) return '';
  return candidate;
}
function selectByNumber<T>(value: string, items: T[]): T | null {
  const match = value.trim().match(/^(\d{1,2})$/);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return index >= 0 && index < items.length ? items[index] : null;
}
function formatMoney(value: unknown): string {
  const amount = Number(value || 0);
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
async function resolveCustomerUser(db: any, waPhone: string, displayName: string): Promise<string> {
  const e164 = phoneE164(waPhone);
  const d = digits(e164);
  if (!e164 || d.length < 10) throw new Error('Customer phone number could not be verified');
  const forms = Array.from(new Set([e164, d, d.slice(-10), '+91' + d.slice(-10)]));
  const fields = ['phone_number', 'whatsapp', 'phone'];
  const filters: string[] = [];
  for (const field of fields) for (const form of forms) filters.push(field + '.eq.' + form);
  const { data: profiles } = await db.from('profiles').select('id').or(filters.join(',')).limit(5);
  if (profiles?.length) return profiles[0].id as string;
  const { data, error } = await db.auth.admin.createUser({
    phone: e164,
    phone_confirm: true,
    user_metadata: { full_name: clean(displayName, 150), signup_source: 'whatsapp' },
  });
  if (!error && data?.user?.id) return data.user.id as string;
  const { data: fallback } = await db.from('profiles').select('id').or(filters.join(',')).limit(1);
  if (fallback?.[0]?.id) return fallback[0].id as string;
  throw new Error('Customer account could not be created for this WhatsApp number. Salon staff must help this customer.');
}
async function sendServiceMenu(db: any, connection: Row, recipient: string, services: Row[], state: Row) {
  if (!services.length) {
    await sendWhatsAppText(db, connection, recipient, 'Abhi is salon ki online booking services available nahi hain. Kripya salon se directly contact karein.');
    return state;
  }
  const lines = services.map((s, i) =>
    (i + 1) + '. ' + clean(s.name, 90) + ' — ' + formatMoney(s.price) + ' (' + Number(s.durationMinutes) + ' min)',
  );
  await sendWhatsAppText(
    db, connection, recipient,
    'Namaste! ' + clean(services[0]?.businessName || 'salon', 60) + ' mein aapka swagat hai.\n\nBooking ke liye service number bhejein:\n' +
    lines.join('\n') + '\n\nCancel karne ke liye STOP bhejein.',
  );
  return { step: 'service', services: services.map((s) => ({ id: s.id, name: s.name, price: s.price, durationMinutes: s.durationMinutes })) };
}
async function createDepositPaymentLink(db: any, ownerId: string, booking: Row, phone: string): Promise<Row> {
  const credentials = razorpayCredentials();
  if (!credentials.configured) throw new Error('Salon booking ke liye 25% advance payment gateway abhi configured nahi hai');
  const { data: existing } = await db.from('studioflow_payment_orders')
    .select('booking_id,amount_paise,payment_link_id,payment_link_url,payment_link_status,status')
    .eq('booking_id', booking.id).maybeSingle();
  if (existing?.payment_link_id && existing?.payment_link_url && existing.status !== 'refund_required') {
    return existing;
  }
  const price = Number(booking.servicePrice);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Salon service price is not valid for online advance payment');
  const amount = Number((BigInt(Math.ceil(price * 100)) * 25n + 99n) / 100n);
  if (amount < 100) throw new Error('Online advance payment is below Razorpay minimum');
  const e164 = phoneE164(phone);
  if (!e164) throw new Error('Customer WhatsApp phone number is invalid');
  const link = await razorpayRequest('payment_links', 'POST', {
    amount,
    currency: 'INR',
    accept_partial: false,
    reference_id: String(booking.id),
    description: '25% booking advance — ' + clean(booking.serviceName, 100),
    customer: { name: clean(booking.clientName, 100), contact: e164 },
    notify: { sms: false, email: false },
    reminder_enable: false,
    expire_by: Math.floor(Date.now() / 1000) + 20 * 60,
    notes: { booking_id: String(booking.id), salon_owner_id: ownerId, channel: 'whatsapp' },
  });
  const paymentLinkId = clean(link.id, 100);
  const paymentLinkUrl = clean(link.short_url, 500);
  if (!paymentLinkId || !/^https:\/\/rzp\.io\//.test(paymentLinkUrl)) {
    throw new Error('Razorpay did not return a valid hosted payment link');
  }
  const registered = await db.rpc('studioflow_register_payment', {
    p_booking: booking.id,
    p_order: 'wa_link_' + paymentLinkId,
    p_amount: amount,
  });
  if (registered.error) {
    await razorpayRequest('payment_links/' + encodeURIComponent(paymentLinkId) + '/cancel', 'POST', {});
    throw new Error(clean(registered.error.message, 240) || 'Could not attach payment link to the booking');
  }
  const { error: updateError } = await db.from('studioflow_payment_orders').update({
    payment_link_id: paymentLinkId,
    payment_link_url: paymentLinkUrl,
    payment_link_status: 'created',
  }).eq('booking_id', booking.id);
  if (updateError) throw new Error('Payment link was created but could not be saved to the booking ledger');
  return { booking_id: booking.id, amount_paise: amount, payment_link_id: paymentLinkId, payment_link_url: paymentLinkUrl, status: 'created' };
}
async function processConversationMessage(db: any, connection: Row, message: Row): Promise<void> {
  const customerWaId = digits(message.from);
  const text = clean(message.text?.body, 1000);
  if (!customerWaId || !text) {
    await sendWhatsAppText(db, connection, customerWaId, 'Kripya apna message text mein bhejein. Booking ke liye HI likhein.');
    return;
  }
  const { data: website, error: websiteError } = await db
    .from('studioflow_websites').select('slug,content').eq('owner_id', connection.owner_id).maybeSingle();
  if (websiteError || !website) {
    await sendWhatsAppText(db, connection, customerWaId, 'Salon ki booking website abhi publish nahi hai. Kripya salon se contact karein.');
    return;
  }
  const services = serviceList(website.content || {});
  const { data: oldConversation } = await db.from('salon_whatsapp_conversations')
    .select('*').eq('owner_id', connection.owner_id).eq('customer_wa_id', customerWaId).maybeSingle();
  const state: Row = oldConversation?.flow_state && typeof oldConversation.flow_state === 'object' ? oldConversation.flow_state : {};
  const upper = text.trim().toUpperCase();
  if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'RESET', 'HI', 'HELLO', 'NAMASTE', 'START'].includes(upper)
      && (upper === 'RESET' || upper === 'CANCEL' || upper === 'HI' || upper === 'HELLO' || upper === 'NAMASTE' || upper === 'START')) {
    const next = await sendServiceMenu(db, connection, customerWaId, services, {});
    await db.from('salon_whatsapp_conversations').upsert({
      owner_id: connection.owner_id, customer_wa_id: customerWaId,
      customer_name: clean(message.profile?.name, 120) || oldConversation?.customer_name || null,
      conversation_status: 'active', flow_state: next,
      last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id,customer_wa_id' });
    return;
  }
  if (['STOP', 'UNSUBSCRIBE'].includes(upper)) {
    await db.from('salon_whatsapp_conversations').upsert({
      owner_id: connection.owner_id, customer_wa_id: customerWaId,
      customer_name: oldConversation?.customer_name || null,
      conversation_status: 'closed', flow_state: { step: 'opted_out', optedOutAt: new Date().toISOString() },
      last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id,customer_wa_id' });
    await sendWhatsAppText(db, connection, customerWaId, 'Aapke WhatsApp booking messages band kar diye gaye hain. Dobara shuru karne ke liye START bhejein.', 'conversation', undefined, true);
    return;
  }
  if (state.step === 'opted_out') {
    await sendWhatsAppText(db, connection, customerWaId, 'Booking messages band hain. Dobara shuru karne ke liye START bhejein.');
    return;
  }

  let nextState: Row = state;
  let reply = '';
  if (!state.step || state.step === 'service') {
    const chosen = selectByNumber(text, services) ||
      services.find((s) => String(s.id) === text || clean(s.name, 120).toLowerCase() === text.toLowerCase());
    if (!chosen) {
      nextState = await sendServiceMenu(db, connection, customerWaId, services, state);
      await db.from('salon_whatsapp_conversations').upsert({
        owner_id: connection.owner_id, customer_wa_id: customerWaId,
        customer_name: clean(message.profile?.name, 120) || oldConversation?.customer_name || null,
        conversation_status: 'active', flow_state: nextState,
        last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'owner_id,customer_wa_id' });
      return;
    }
    nextState = { step: 'date', serviceId: chosen.id, serviceName: chosen.name, servicePrice: chosen.price, durationMinutes: chosen.durationMinutes };
    reply = 'Aapne ' + clean(chosen.name, 100) + ' chuna hai. Kripya booking ki date bhejein.\nFormat: YYYY-MM-DD (jaise 2026-11-20).';
  } else if (state.step === 'date') {
    const date = parseDate(text);
    if (!date) {
      reply = 'Date samajh nahi aayi. Kripya YYYY-MM-DD format mein bhejein, jaise 2026-11-20.';
    } else {
      const { data: slots, error } = await db.rpc('studioflow_available_slots', {
        p_slug: website.slug, p_service_id: state.serviceId, p_date: date, p_stylist_id: 'any',
      });
      const available = !error && Array.isArray(slots)
        ? slots.filter((s: Row) => s.available === true && typeof s.time === 'string' && typeof s.stylistId === 'string').slice(0, 18)
        : [];
      if (!available.length) {
        reply = 'Is date par koi slot available nahi hai. Kripya doosri date bhejein.';
      } else {
        nextState = { ...state, step: 'slot', date, slots: available.map((s: Row) => ({ time: s.time, label: s.label, stylistId: s.stylistId })) };
        reply = 'Available time slots:\n' + available.map((s: Row, i: number) =>
          (i + 1) + '. ' + clean(s.label || s.time, 40),
        ).join('\n') + '\n\nApna time slot number bhejein.';
      }
    }
  } else if (state.step === 'slot') {
    const picked = selectByNumber(text, state.slots || []) ||
      (state.slots || []).find((s: Row) => s.time === text || s.label?.toLowerCase() === text.toLowerCase());
    if (!picked) {
      reply = 'Slot select nahi hua. List mein se time ka number bhejein.';
    } else {
      nextState = { ...state, step: 'name', time: picked.time, stylistId: picked.stylistId };
      reply = 'Aapka naam kya hai?';
    }
  } else if (state.step === 'name') {
    const name = clean(text, 150);
    if (name.length < 2) reply = 'Kripya apna poora naam bhejein.';
    else {
      nextState = { ...state, step: 'confirm', clientName: name };
      reply = 'Booking details:\n' +
        'Service: ' + clean(state.serviceName, 100) + '\n' +
        'Date: ' + state.date + '\n' +
        'Time: ' + state.time + '\n' +
        'Specialist: ' + clean(state.stylistId, 80) + '\n' +
        'Price: ' + formatMoney(state.servicePrice) + '\n' +
        'Name: ' + name + '\n\n' +
        'Confirm karne ke liye YES bhejein. Badalne ke liye RESET bhejein.';
    }
  } else if (state.step === 'confirm') {
    if (!['YES', 'Y', 'CONFIRM', 'HAAN', 'JI'].includes(upper)) {
      reply = 'Booking tabhi save hogi jab aap YES bhejenge. Badalne ke liye RESET bhejein.';
    } else {
      const customerId = await resolveCustomerUser(db, customerWaId, state.clientName);
      const idempotencyKey = 'wa:' + connection.owner_id + ':' + customerWaId + ':' + clean(state.date, 10) + ':' + clean(state.time, 5) + ':' + clean(state.serviceId, 80);
      const bookingResult = await db.rpc('studioflow_whatsapp_book', {
        p_owner: connection.owner_id,
        p_customer: customerId,
        p_slug: website.slug,
        p_request: {
          serviceId: state.serviceId,
          stylistId: state.stylistId,
          date: state.date,
          time: state.time,
          clientName: state.clientName,
          clientPhone: phoneE164(customerWaId),
          idempotencyKey,
        },
      });
      if (bookingResult.error || !bookingResult.data?.id) {
        reply = clean(bookingResult.error?.message, 260) ||
          'Is slot par booking save nahi ho paayi. Kripya RESET bhejkar naya slot chunein.';
      } else {
        const booking = bookingResult.data as Row;
        const paymentLink = await createDepositPaymentLink(db, connection.owner_id, booking, customerWaId);
        nextState = { step: 'awaiting_payment', bookingId: booking.id, paymentLinkId: paymentLink.payment_link_id };
        reply = 'Aapki booking request save ho gayi hai.\n' +
          'Booking ID: ' + booking.id + '\n' +
          'Service: ' + clean(booking.serviceName, 100) + '\n' +
          'Date & Time: ' + booking.date + ' ' + booking.time + '\n' +
          '25% advance: ' + formatMoney(Number(paymentLink.amount_paise) / 100) + '\n\n' +
          'Payment link: ' + paymentLink.payment_link_url + '\n\n' +
          'Payment verify hote hi booking confirmed message aayega. Sirf is message se booking confirmed nahi hai.';
        await sendWhatsAppText(db, connection, customerWaId, reply, 'payment_link', booking.id);
        await db.from('salon_whatsapp_conversations').upsert({
          owner_id: connection.owner_id, customer_wa_id: customerWaId,
          customer_name: state.clientName, conversation_status: 'awaiting_confirmation',
          flow_state: nextState, last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'owner_id,customer_wa_id' });
        return;
      }
    }
  } else if (state.step === 'awaiting_payment') {
    reply = 'Aapki booking ka advance payment pending hai. Payment link par payment complete karein. Naya slot chahiye to RESET bhejein.';
  } else {
    nextState = await sendServiceMenu(db, connection, customerWaId, services, {});
    await db.from('salon_whatsapp_conversations').upsert({
      owner_id: connection.owner_id, customer_wa_id: customerWaId,
      conversation_status: 'active', flow_state: nextState,
      last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id,customer_wa_id' });
    return;
  }

  await db.from('salon_whatsapp_conversations').upsert({
    owner_id: connection.owner_id,
    customer_wa_id: customerWaId,
    customer_name: state.clientName || clean(message.profile?.name, 120) || oldConversation?.customer_name || null,
    conversation_status: state.step === 'confirm' ? 'awaiting_confirmation' : 'active',
    flow_state: nextState,
    last_inbound_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id,customer_wa_id' });
  if (reply) await sendWhatsAppText(db, connection, customerWaId, reply);
}
async function processMetaWebhook(db: any, body: Row): Promise<void> {
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change.value || {};
      const field = clean(change.field, 80);
      const phoneNumberId = clean(value.metadata?.phone_number_id, 100);
      if (field === 'account_update') {
        const accountId = clean(entry.id, 100);
        const eventName = clean(value.event, 100).toUpperCase();
        if (['PARTNER_REMOVED', 'ACCOUNT_DISABLED', 'ACCOUNT_OFFBOARDED'].includes(eventName)) {
          await db.from('salon_whatsapp_connections')
            .update({ connection_status: 'suspended', webhook_subscribed: false, updated_at: new Date().toISOString() })
            .eq('waba_id', accountId);
        }
        continue;
      }
      if (field === 'messages' && Array.isArray(value.statuses)) {
        for (const status of value.statuses) {
          const statusName = clean(status.status, 30);
          if (!status.id || !['sent', 'delivered', 'read', 'failed'].includes(statusName)) continue;
          await db.from('salon_whatsapp_message_log')
            .update({
              delivery_status: statusName,
              error_code: status.errors?.[0]?.code ? String(status.errors[0].code) : null,
              updated_at: new Date().toISOString(),
            })
            .eq('provider_message_id', status.id);
        }
      }
      if (field !== 'messages' || !phoneNumberId) continue;
      const { data: connection } = await db.from('salon_whatsapp_connections')
        .select('*').eq('phone_number_id', phoneNumberId).eq('connection_status', 'connected').maybeSingle();
      if (!connection) continue;
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const message of messages) {
        const messageId = clean(message.id, 200);
        if (!messageId) continue;
        const eventId = await sha256('meta:' + messageId);
        const inserted = await db.from('salon_whatsapp_webhook_events').insert({
          provider_event_id: eventId,
          phone_number_id: phoneNumberId,
          owner_id: connection.owner_id,
          event_type: 'message',
          payload: { message_id: messageId, message_type: clean(message.type, 30) },
          processing_status: 'received',
        }).select('id').maybeSingle();
        if (inserted.error) continue;
        const customerWaId = digits(message.from);
        if (!customerWaId) continue;
        const inbound = await db.from('salon_whatsapp_message_log').insert({
          owner_id: connection.owner_id,
          provider_message_id: messageId,
          direction: 'inbound',
          recipient_wa_id: customerWaId,
          message_kind: 'conversation',
          delivery_status: 'received',
          metadata: { message_type: clean(message.type, 30), timestamp: clean(message.timestamp, 30) },
        });
        if (inbound.error) {
          await db.from('salon_whatsapp_webhook_events').update({ processing_status: 'ignored', processed_at: new Date().toISOString() }).eq('id', inserted.data.id);
          continue;
        }
        try {
          await processConversationMessage(db, connection, { ...message, profile: value.contacts?.[0]?.profile || {} });
          await db.from('salon_whatsapp_webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('id', inserted.data.id);
        } catch (error) {
          await db.from('salon_whatsapp_webhook_events').update({
            processing_status: 'failed', error_code: clean(error instanceof Error ? error.message : 'message_processing_failed', 100),
            processed_at: new Date().toISOString(),
          }).eq('id', inserted.data.id);
          try {
            await sendWhatsAppText(db, connection, customerWaId, 'Booking process abhi complete nahi ho paaya. Hamari salon team aapse contact karegi.', 'human_handoff');
          } catch { /* delivery error is retained in the webhook event */ }
        }
      }
    }
  }
}
async function processRazorpayWebhook(db: any, body: Row): Promise<void> {
  const event = clean(body.event, 80);
  const link = body.payload?.payment_link?.entity;
  if (!link?.id) return;
  const { data: order } = await db.from('studioflow_payment_orders')
    .select('booking_id,order_id,amount_paise,payment_link_id,payment_link_status,status')
    .eq('payment_link_id', link.id).maybeSingle();
  if (!order) return;
  const eventId = await sha256('razorpay:' + event + ':' + link.id + ':' + String(link.updated_at || link.status || ''));
  const stored = await db.from('salon_whatsapp_webhook_events').insert({
    provider_event_id: eventId,
    owner_id: null,
    event_type: event,
    payload: { payment_link_id: link.id, reference_id: clean(link.reference_id, 100) },
    processing_status: 'received',
  });
  if (stored.error) return;

  if (event === 'payment_link.paid') {
    // Verify the link and the underlying payment independently with Razorpay.
    const verifiedLink = await razorpayRequest('payment_links/' + encodeURIComponent(link.id));
    if (verifiedLink.status !== 'paid' || Number(verifiedLink.amount_paid) !== Number(order.amount_paise)
        || String(verifiedLink.reference_id) !== String(order.booking_id)) {
      await db.from('salon_whatsapp_webhook_events').update({
        processing_status: 'failed', error_code: 'payment_link_verification_mismatch', processed_at: new Date().toISOString(),
      }).eq('provider_event_id', eventId);
      return;
    }
    const payments = Array.isArray(verifiedLink.payments) ? verifiedLink.payments : [];
    const paymentId = clean(payments[0]?.payment_id || payments[0]?.id, 100);
    if (!paymentId) throw new Error('Razorpay paid link did not include a captured payment reference');
    const payment = await razorpayRequest('payments/' + encodeURIComponent(paymentId));
    if (payment.status !== 'captured' || payment.currency !== 'INR'
        || Number(payment.amount) !== Number(order.amount_paise)) {
      throw new Error('Razorpay payment is not captured for the exact INR advance amount');
    }
    const wasCaptured = order.status === 'captured';
    const settled = await db.rpc('studioflow_settle_payment_link', {
      p_booking: order.booking_id,
      p_payment_link: link.id,
      p_payment: paymentId,
      p_amount: Number(payment.amount),
    });
    if (settled.error) throw new Error('Canonical booking payment settlement failed');
    if (settled.data?.refund_required) {
      const refund = await razorpayRequest('payments/' + encodeURIComponent(paymentId) + '/refunds', 'POST', {
        amount: Number(payment.amount),
        notes: { studioflow_booking: String(order.booking_id), reason: 'booking_hold_expired_or_slot_taken' },
      });
      await db.rpc('studioflow_complete_refund', {
        p_order: order.order_id, p_refund: refund.id || paymentId, p_ok: true, p_error: null,
      });
      await db.from('salon_whatsapp_webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('provider_event_id', eventId);
      return;
    }
    if (!wasCaptured) {
      const { data: booking } = await db.from('studioflow_bookings').select('owner_id,payload').eq('id', order.booking_id).maybeSingle();
      const connection = booking ? await getConnection(db, booking.owner_id) : null;
      const customerPhone = clean(booking?.payload?.clientPhone, 30);
      if (connection && customerPhone) {
        try {
          await sendWhatsAppText(
            db, connection, customerPhone,
            'Payment mil gaya hai. Aapki booking ab CONFIRMED hai.\n' +
            'Booking ID: ' + order.booking_id + '\n' +
            'Service: ' + clean(booking.payload.serviceName, 100) + '\n' +
            'Date & Time: ' + clean(booking.payload.date, 20) + ' ' + clean(booking.payload.time, 10) + '\n' +
            'Advance paid: ' + formatMoney(Number(payment.amount) / 100) + '\n\n' +
            'Dhanyavaad — ' + clean(connection.verified_name || 'salon team', 100),
            'payment_success', order.booking_id,
          );
        } catch { /* booking/payment remain confirmed; message can be retried by the owner */ }
      }
      await db.from('salon_whatsapp_conversations').update({
        conversation_status: 'booked',
        flow_state: { step: 'completed', bookingId: order.booking_id, paymentLinkId: link.id },
        updated_at: new Date().toISOString(),
      }).eq('owner_id', booking?.owner_id || '').eq('customer_wa_id', digits(customerPhone));
    }
    await db.from('salon_whatsapp_webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('provider_event_id', eventId);
    return;
  }

  if (event === 'payment_link.expired' || event === 'payment_link.cancelled') {
    await db.from('studioflow_payment_orders').update({ payment_link_status: link.status || event.split('.')[1] })
      .eq('booking_id', order.booking_id);
    await db.from('salon_whatsapp_webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('provider_event_id', eventId);
    return;
  }
  await db.from('salon_whatsapp_webhook_events').update({ processing_status: 'ignored', processed_at: new Date().toISOString() }).eq('provider_event_id', eventId);
}
async function statusForOwner(db: any, ownerId: string): Promise<Row> {
  const connection = await getConnection(db, ownerId);
  const { data: site } = await db.from('studioflow_websites')
    .select('slug,content').eq('owner_id', ownerId).maybeSingle();
  const { count: bookingsTotal } = await db.from('studioflow_bookings')
    .select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('booking_source', 'whatsapp');
  const { data: bookings } = await db.from('studioflow_bookings')
    .select('id,status,payload,created_at').eq('owner_id', ownerId).eq('booking_source', 'whatsapp')
    .order('created_at', { ascending: false }).limit(500);
  const bookingIds = (bookings || []).map((b: Row) => b.id);
  let paymentRows: Row[] = [];
  if (bookingIds.length) {
    const { data } = await db.from('studioflow_payment_orders')
      .select('booking_id,amount_paise,status,payment_link_status,payment_link_url')
      .in('booking_id', bookingIds);
    paymentRows = data || [];
  }
  const { count: messagesTotal } = await db.from('salon_whatsapp_message_log')
    .select('id', { count: 'exact', head: true }).eq('owner_id', ownerId);
  const { data: messages } = await db.from('salon_whatsapp_message_log')
    .select('direction,delivery_status,message_kind,created_at')
    .eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(300);
  const confirmed = (bookings || []).filter((b: Row) => b.status === 'confirmed').length;
  const pending = (bookings || []).filter((b: Row) => b.status === 'pending').length;
  const captured = paymentRows.filter((p) => p.status === 'captured');
  const paidPaise = captured.reduce((sum, p) => sum + Number(p.amount_paise || 0), 0);
  return {
    connection: connection ? {
      connection_status: connection.connection_status,
      display_phone_number: connection.display_phone_number,
      verified_name: connection.verified_name,
      connection_mode: connection.connection_mode,
      is_on_biz_app: connection.is_on_biz_app,
      platform_type: connection.platform_type,
      webhook_subscribed: connection.webhook_subscribed,
      connected_at: connection.connected_at,
      phone_number_id: connection.phone_number_id,
    } : null,
    salon: {
      slug: site?.slug || null,
      name: clean(site?.content?.profile?.businessName, 120),
    },
    metrics: {
      bookings_total: bookingsTotal || 0,
      bookings_confirmed: confirmed,
      bookings_pending: pending,
      payment_links_sent: paymentRows.filter((p) => Boolean(p.payment_link_id)).length,
      payments_paid: captured.length,
      payments_pending: paymentRows.filter((p) => p.status === 'created').length,
      revenue_paise: paidPaise,
      messages_total: messagesTotal || 0,
      messages_failed: (messages || []).filter((m: Row) => m.delivery_status === 'failed').length,
      messages_inbound: (messages || []).filter((m: Row) => m.direction === 'inbound').length,
      messages_outbound: (messages || []).filter((m: Row) => m.direction === 'outbound').length,
    },
    recent_messages: (messages || []).slice(0, 10),
  };
}
async function handleOwnerAction(db: any, user: Row, body: Row): Promise<Row> {
  const ownerId = user.id as string;
  const action = clean(body.action, 60);
  if (action === 'status') return await statusForOwner(db, ownerId);

  if (action === 'start_signup') {
    const appId = env('META_APP_ID');
    const configId = env('META_EMBEDDED_SIGNUP_CONFIG_ID');
    if (!appId || !configId || !env('META_APP_SECRET')) {
      throw new Error('Meta app ID, Embedded Signup v5 configuration aur app secret abhi configure nahi hain');
    }
    await encryptionKey(db);
    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    const state = base64(stateBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const stateHash = await sha256(state);
    const { error } = await db.from('salon_whatsapp_oauth_states').insert({
      state_hash: stateHash,
      owner_id: ownerId,
      initiated_by: ownerId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error('WhatsApp signup could not be started. Please retry.');
    return { app_id: appId, config_id: configId, state, graph_version: API_VERSION, embedded_signup_version: 'v5' };
  }

  if (action === 'complete_signup') {
    const state = clean(body.state, 150);
    const code = clean(body.code, 4000);
    const sessionInfo = body.sessionInfo && typeof body.sessionInfo === 'object' ? body.sessionInfo as Row : {};
    if (!state || !code) throw new Error('Meta signup code or one-time state is missing');
    if (!env('META_APP_SECRET')) {
      throw new Error('Meta app secret abhi configure nahi hai');
    }
    await encryptionKey(db);
    const { data: stateRow, error: stateError } = await db.from('salon_whatsapp_oauth_states')
      .update({ consumed_at: new Date().toISOString() })
      .eq('state_hash', await sha256(state))
      .eq('owner_id', ownerId)
      .eq('initiated_by', ownerId)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('id').maybeSingle();
    if (stateError || !stateRow) throw new Error('WhatsApp connect session expired or was already used. Start again.');

    const appId = env('META_APP_ID');
    const appSecret = env('META_APP_SECRET');
    const exchangeUrl = new URL('https://graph.facebook.com/' + API_VERSION + '/oauth/access_token');
    exchangeUrl.searchParams.set('client_id', appId);
    exchangeUrl.searchParams.set('client_secret', appSecret);
    exchangeUrl.searchParams.set('code', code);
    const exchangeResponse = await fetch(exchangeUrl, { signal: AbortSignal.timeout(15000) });
    const exchanged = await exchangeResponse.json().catch(() => ({}));
    if (!exchangeResponse.ok || !exchanged.access_token) {
      throw new Error(clean(exchanged?.error?.message, 260) || 'Meta authorization code could not be exchanged');
    }
    const accessToken = String(exchanged.access_token);
    const messagingAccountId = clean(
      sessionInfo.waba_id || sessionInfo.messaging_account_ids?.[0] || sessionInfo.messaging_account_id,
      100,
    );
    if (!messagingAccountId) throw new Error('Meta did not return the WhatsApp Messaging Account ID');

    const numberList = await metaRequest(
      '/' + messagingAccountId + '/phone_numbers?fields=id,display_phone_number,verified_name,platform_type,is_on_biz_app',
      accessToken,
    );
    const phoneNumbers = Array.isArray(numberList.data) ? numberList.data : [];
    const requestedPhoneId = clean(sessionInfo.phone_number_id, 100);
    const phone = requestedPhoneId
      ? phoneNumbers.find((p: Row) => String(p.id) === requestedPhoneId)
      : (phoneNumbers.length === 1 ? phoneNumbers[0] : null);
    if (!phone?.id || !phone?.display_phone_number) {
      throw new Error('Meta account mein ek se zyada numbers hain ya phone ID missing hai. Meta signup dobara karein aur correct business number choose karein.');
    }
    const phoneDetails = await metaRequest(
      '/' + phone.id + '?fields=id,display_phone_number,verified_name,platform_type,is_on_biz_app',
      accessToken,
    );
    const subscription = await metaRequest(
      '/' + messagingAccountId + '/subscribed_apps',
      accessToken,
      { method: 'POST', body: JSON.stringify({}) },
    );
    const encrypted = await encryptToken(db, accessToken);
    const isOnBizApp = Boolean(
      sessionInfo.is_on_biz_app ?? phoneDetails.is_on_biz_app ?? phone.is_on_biz_app ?? false,
    );
    const platformType = clean(phoneDetails.platform_type || phone.platform_type, 40) || null;
    const primaryWaacIds = Array.isArray(sessionInfo.primary_waac_ids) ? sessionInfo.primary_waac_ids : [];
    const { error: saveError } = await db.from('salon_whatsapp_connections').upsert({
      owner_id: ownerId,
      waba_id: messagingAccountId,
      phone_number_id: String(phone.id),
      business_id: clean(sessionInfo.business_id || sessionInfo.businessId, 100) || null,
      display_phone_number: clean(phoneDetails.display_phone_number || phone.display_phone_number, 50),
      verified_name: clean(phoneDetails.verified_name || phone.verified_name, 120) || null,
      connection_status: 'connected',
      access_token_ciphertext: encrypted.ciphertext,
      access_token_iv: encrypted.iv,
      token_key_version: 1,
      token_expires_at: exchanged.expires_in
        ? new Date(Date.now() + Number(exchanged.expires_in) * 1000).toISOString()
        : null,
      webhook_subscribed: Boolean(subscription.success !== false),
      connected_by: ownerId,
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      is_on_biz_app: isOnBizApp,
      platform_type: platformType,
      primary_waac_ids: primaryWaacIds,
      connection_mode: isOnBizApp ? 'coexistence' : 'standard',
      provider_metadata: {
        embedded_signup_version: 'v5',
        finish_event: clean(sessionInfo.event, 80),
        messaging_account_ids: Array.isArray(sessionInfo.messaging_account_ids) ? sessionInfo.messaging_account_ids : [messagingAccountId],
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'owner_id' });
    if (saveError) {
      throw new Error('WhatsApp number could not be linked. This phone number may already be connected to another salon.');
    }
    return {
      connected: true,
      display_phone_number: clean(phoneDetails.display_phone_number || phone.display_phone_number, 50),
      verified_name: clean(phoneDetails.verified_name || phone.verified_name, 120),
      connection_mode: isOnBizApp ? 'coexistence' : 'standard',
      webhook_subscribed: Boolean(subscription.success !== false),
    };
  }

  if (action === 'disconnect') {
    const { error } = await db.from('salon_whatsapp_connections').update({
      connection_status: 'disconnected',
      webhook_subscribed: false,
      disconnected_at: new Date().toISOString(),
      access_token_ciphertext: '',
      access_token_iv: '',
      updated_at: new Date().toISOString(),
    }).eq('owner_id', ownerId);
    if (error) throw new Error('WhatsApp connection could not be disconnected');
    return { disconnected: true };
  }

  if (action === 'send_message') {
    const connection = await getConnection(db, ownerId);
    if (!connection || connection.connection_status !== 'connected') throw new Error('Salon WhatsApp number is not connected');
    const to = digits(body.to);
    const text = clean(body.text, 1000);
    const result = await sendWhatsAppText(db, connection, to, text, 'human_handoff');
    return result;
  }
  throw new Error('Unknown WhatsApp action');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const db = adminClient();
  const requestUrl = new URL(req.url);

  if (req.method === 'GET') {
    const mode = requestUrl.searchParams.get('hub.mode') || requestUrl.searchParams.get('hub_mode');
    const token = requestUrl.searchParams.get('hub.verify_token') || requestUrl.searchParams.get('hub_verify_token');
    const challenge = requestUrl.searchParams.get('hub.challenge') || requestUrl.searchParams.get('hub_challenge');
    if (mode === 'subscribe' && challenge && constantTimeEqual(token || '', env('META_WEBHOOK_VERIFY_TOKEN'))) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return json({ error: 'GET is only available for Meta webhook verification' }, 404);
  }

  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  const raw = await req.text();
  if (raw.length > 150000) return json({ error: 'Request too large' }, 413);

  const metaSignature = req.headers.get('x-hub-signature-256') || '';
  const razorpaySignature = req.headers.get('x-razorpay-signature') || '';
  try {
    if (metaSignature) {
      if (!await verifySignature(env('META_APP_SECRET'), raw, metaSignature, 'sha256=')) {
        return json({ error: 'Invalid Meta webhook signature' }, 401);
      }
      const body = raw ? JSON.parse(raw) : {};
      if (body.object !== 'whatsapp_business_account') return json({ received: true, ignored: true });
      await processMetaWebhook(db, body);
      return json({ received: true });
    }

    if (razorpaySignature) {
      if (!await verifySignature(env('RAZORPAY_WEBHOOK_SECRET') || env('RZP_WEBHOOK_SECRET'), raw, razorpaySignature, '')) {
        return json({ error: 'Invalid Razorpay webhook signature' }, 401);
      }
      const body = raw ? JSON.parse(raw) : {};
      await processRazorpayWebhook(db, body);
      return json({ received: true });
    }

    const body = raw ? JSON.parse(raw) : {};
    const internalKey = req.headers.get('x-internal-key') || '';
    if (constantTimeEqual(internalKey, env('SUPABASE_SERVICE_ROLE_KEY'))) {
      if (body.action === 'internal_payment_success') {
        const bookingId = clean(body.bookingId, 80);
        if (!bookingId) return json({ error: 'Booking reference required' }, 400);
        const { data: booking } = await db.from('studioflow_bookings')
          .select('id,owner_id,status,payload').eq('id', bookingId).maybeSingle();
        if (!booking || booking.status !== 'confirmed' || booking.payload?.paymentStatus !== 'paid_deposit') {
          return json({ error: 'Verified paid booking was not found' }, 409);
        }
        const connection = await getConnection(db, booking.owner_id);
        const customerPhone = clean(booking.payload.clientPhone, 30);
        if (!connection || !customerPhone) return json({ sent: false, reason: 'no_active_salon_sender' });
        const { data: sentAlready } = await db.from('salon_whatsapp_message_log')
          .select('id').eq('owner_id', booking.owner_id).eq('booking_id', booking.id)
          .eq('message_kind', 'payment_success').eq('delivery_status', 'sent').limit(1);
        if (sentAlready?.length) return json({ ok: true, sent: true, deduplicated: true });
        const result = await sendWhatsAppText(
          db, connection, customerPhone,
          'Payment mil gaya hai. Aapki booking CONFIRMED hai.\n' +
          'Booking ID: ' + booking.id + '\n' +
          'Service: ' + clean(booking.payload.serviceName, 100) + '\n' +
          'Date & Time: ' + clean(booking.payload.date, 20) + ' ' + clean(booking.payload.time, 10) + '\n' +
          'Advance paid: ' + formatMoney(Number(booking.payload.amountPaid || 0)) + '\n' +
          'Dhanyavaad — ' + clean(connection.verified_name || 'salon team', 100),
          'payment_success', booking.id,
        );
        await db.from('salon_whatsapp_conversations').update({
          conversation_status: 'booked',
          flow_state: { step: 'completed', bookingId: booking.id },
          updated_at: new Date().toISOString(),
        }).eq('owner_id', booking.owner_id).eq('customer_wa_id', digits(customerPhone));
        return json({ ok: true, ...result });
      }
      return json({ error: 'Unknown internal action' }, 400);
    }
    const user = await ownerFromRequest(req, db);
    const result = await handleOwnerAction(db, user, body);
    return json({ ok: true, ...result });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : 'WhatsApp service could not complete the request', 360);
    const code = /sign in|session|unauthor|owner/i.test(message) ? 401
      : /not configured|credentials/i.test(message) ? 503
      : 400;
    return json({ ok: false, error: message }, code);
  }
});
