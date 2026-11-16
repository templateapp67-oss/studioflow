// NEXORA salon-owned WhatsApp webhook and booking assistant.
// Meta's signature is checked over the exact raw body before parsing.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

type Json = Record<string, any>;
const GRAPH_VERSION = (Deno.env.get('META_GRAPH_API_VERSION') || 'v27.0').trim();
const encoder = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
function env(name: string) { return (Deno.env.get(name) || '').trim(); }
function safeText(value: unknown, max = 500) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';
}
function digits(value: unknown) { return safeText(value, 32).replace(/[^0-9]/g, ''); }
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function validTime(value: string) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function vaultSecret(db: any, name: string) {
  const result = await db.rpc('nexora_whatsapp_meta_secret', { p_secret_name: name });
  if (result.error || typeof result.data !== 'string' || !result.data) throw new Error('WhatsApp Meta secret is missing from Supabase Vault.');
  return result.data;
}
async function decryptConnectionToken(db: any, connection: Json) {
  const keyResult = await db.rpc('nexora_whatsapp_token_key');
  if (keyResult.error || typeof keyResult.data !== 'string' || !keyResult.data) throw new Error('WhatsApp token encryption key is unavailable.');
  const keyBytes = decodeBase64(keyResult.data);
  if (keyBytes.length !== 32) throw new Error('WhatsApp token encryption key must decode to 32 bytes.');
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(connection.access_token_iv) },
    key,
    decodeBase64(connection.access_token_ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}
async function graphSend(phoneNumberId: string, token: string, recipient: string, text: string) {
  const response = await fetch('https://graph.facebook.com/' + GRAPH_VERSION + '/' + phoneNumberId + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { preview_url: true, body: text.slice(0, 4000) },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(safeText(payload?.error?.message, 300) || 'WhatsApp message could not be sent.');
  return payload as Json;
}
async function getConnection(db: any, phoneNumberId: string) {
  const result = await db.from('salon_whatsapp_connections').select('*')
    .eq('phone_number_id', phoneNumberId).eq('connection_status', 'connected')
    .eq('webhook_subscribed', true).maybeSingle();
  return result.error || !result.data ? null : result.data as Json;
}
async function getWebsite(db: any, ownerId: string) {
  const result = await db.from('studioflow_websites').select('owner_id,slug,content,published_at')
    .eq('owner_id', ownerId).order('published_at', { ascending: false }).limit(1).maybeSingle();
  return result.error || !result.data ? null : result.data as Json;
}
async function logMessage(db: any, row: Json) {
  const result = await db.from('salon_whatsapp_message_log').insert(row);
  if (result.error && result.error.code !== '23505') throw new Error('WhatsApp message could not be recorded.');
}
async function saveConversation(db: any, conversation: Json, flow: Json, status = 'active') {
  const result = await db.from('salon_whatsapp_conversations').upsert({
    owner_id: conversation.owner_id,
    salon_id: null,
    customer_wa_id: conversation.customer_wa_id,
    customer_name: conversation.customer_name || null,
    conversation_status: status,
    flow_state: flow,
    last_inbound_at: conversation.last_inbound_at || new Date().toISOString(),
    last_outbound_at: conversation.last_outbound_at || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id,customer_wa_id' });
  if (result.error) throw new Error('WhatsApp conversation could not be saved.');
}
async function sendSalonText(db: any, connection: Json, ownerId: string, recipient: string, text: string, kind = 'conversation', bookingId: string | null = null) {
  const session = await db.from('salon_whatsapp_conversations').select('last_inbound_at')
    .eq('owner_id', ownerId).eq('customer_wa_id', recipient).maybeSingle();
  const lastInbound = session.data?.last_inbound_at ? new Date(session.data.last_inbound_at).getTime() : 0;
  if (!lastInbound || Date.now() - lastInbound > 24 * 60 * 60 * 1000) {
    await logMessage(db, {
      owner_id: ownerId, booking_id: bookingId, direction: 'outbound',
      recipient_wa_id: recipient, message_kind: kind, delivery_status: 'failed',
      error_code: 'customer_service_window_closed',
      metadata: { reason: 'A Meta-approved template is required outside the 24-hour customer service window.' },
    });
    return { sent: false, reason: 'customer_service_window_closed' };
  }
  const token = await decryptConnectionToken(db, connection);
  const result = await graphSend(connection.phone_number_id, token, recipient, text);
  const messageId = result.messages?.[0]?.id;
  await logMessage(db, {
    owner_id: ownerId,
    booking_id: bookingId,
    provider_message_id: typeof messageId === 'string' ? messageId : null,
    direction: 'outbound',
    recipient_wa_id: recipient,
    message_kind: kind,
    delivery_status: 'sent',
    metadata: { message: text.slice(0, 4000) },
  });
  await db.from('salon_whatsapp_conversations').update({
    last_outbound_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('owner_id', ownerId).eq('customer_wa_id', recipient);
  return { sent: true, messageId };
}
function extractText(message: Json) {
  if (message.type === 'text') return safeText(message.text?.body, 1000);
  if (message.type === 'button') return safeText(message.button?.text || message.button?.payload, 300);
  if (message.type === 'interactive') {
    return safeText(
      message.interactive?.button_reply?.id || message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.id || message.interactive?.list_reply?.title, 300,
    );
  }
  return safeText(message.caption, 500);
}
function getServices(content: Json) {
  const items = Array.isArray(content.services) ? content.services : [];
  return items.filter((item: Json) =>
    item && item.id && item.name && item.isActive !== false && item.isAvailable !== false &&
    Number.isFinite(Number(item.price)) && Number(item.price) >= 0 &&
    Number.isFinite(Number(item.durationMinutes)) && Number(item.durationMinutes) > 0
  ).slice(0, 30) as Json[];
}
function formatServices(services: Json[]) {
  return services.map((item, index) =>
    String(index + 1) + '. ' + safeText(item.name, 100) + ' – ₹' +
    Number(item.price).toLocaleString('en-IN') + ' (' + Number(item.durationMinutes) + ' min)'
  ).join('\n');
}
function menuText(salonName: string, services: Json[]) {
  return 'Namaste! Welcome to ' + salonName + '. 😊\n\nReply:\n1 – View services and prices\n2 – Book an appointment\n3 – Talk to the salon team\n\n' +
    'Services:\n' + formatServices(services) + '\n\nReply STOP any time to stop WhatsApp messages.';
}
async function createWhatsAppPaymentLink(bookingId: string) {
  const base = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !serviceKey) return { ok: false, reason: 'payment_service_not_configured' };
  const response = await fetch(base + '/functions/v1/studioflow-payments', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + serviceKey,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'whatsappPaymentLink', bookingId }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.paymentLinkUrl) {
    return { ok: false, reason: safeText(result.error, 300) || 'payment_link_not_created' };
  }
  return { ok: true, ...result };
}
async function processBooking(db: any, connection: Json, conversation: Json, flow: Json, website: Json, sender: string) {
  const lookup = await db.rpc('nexora_whatsapp_find_customer', { p_phone: '+' + sender });
  const customerId = typeof lookup.data === 'string' ? lookup.data : null;
  if (lookup.error || !customerId) {
    const siteUrl = 'https://nexorasalon.online/?site=' + encodeURIComponent(website.slug);
    await saveConversation(db, conversation, {
      step: 'needs_customer_verification',
      serviceId: flow.serviceId, date: flow.date, time: flow.time,
      stylistId: flow.stylistId, stylistName: flow.stylistName,
      clientName: flow.clientName, requestKey: flow.requestKey,
    });
    await sendSalonText(
      db, connection, conversation.owner_id, sender,
      'For a safe booking, first sign in on this salon website with this same WhatsApp number: ' + siteUrl +
      '\n\nAfter you verify your number, return here and reply YES. This links your WhatsApp booking to your customer account.',
      'conversation',
    );
    return;
  }

  const requestKey = typeof flow.requestKey === 'string' ? flow.requestKey : crypto.randomUUID();
  const bookingRequest = {
    idempotencyKey: ('whatsapp:' + conversation.owner_id + ':' + sender + ':' + requestKey).slice(0, 120),
    serviceId: flow.serviceId,
    stylistId: flow.stylistId,
    clientName: safeText(flow.clientName, 150),
    clientPhone: '+' + sender,
    date: flow.date,
    time: flow.time,
  };
  const result = await db.rpc('studioflow_whatsapp_book', {
    p_owner: conversation.owner_id,
    p_customer: customerId,
    p_slug: website.slug,
    p_request: bookingRequest,
  });
  const booking = result.data;
  if (result.error || !booking?.id) {
    const reason = safeText(result.error?.message, 250) || 'The appointment could not be reserved.';
    await saveConversation(db, conversation, { step: 'menu' });
    await sendSalonText(
      db, connection, conversation.owner_id, sender,
      'I could not reserve that time: ' + reason + '\n\nReply 1 to see services, or 3 to talk to the salon team.',
      'conversation',
    );
    return;
  }

  await saveConversation(db, conversation, { step: 'payment_pending', bookingId: booking.id }, 'awaiting_confirmation');
  const payment = await createWhatsAppPaymentLink(booking.id);
  if (payment.ok) {
    const total = Number(booking.servicePrice || 0);
    const advance = Number(payment.amountPaise || 0) / 100;
    await sendSalonText(
      db, connection, conversation.owner_id, sender,
      'Your appointment request is on hold for 15 minutes.\n\nService: ' + safeText(booking.serviceName, 120) +
      '\nDate: ' + flow.date + '\nTime: ' + flow.time +
      '\nSpecialist: ' + (safeText(flow.stylistName, 100) || 'Available specialist') +
      '\nTotal: ₹' + total.toLocaleString('en-IN') +
      '\nAdvance to confirm: ₹' + advance.toLocaleString('en-IN') +
      '\n\nPay securely here: ' + payment.paymentLinkUrl +
      '\n\nYour appointment becomes confirmed only after Razorpay verifies the payment. Reply NO to cancel this request.',
      'payment_link', booking.id,
    );
  } else {
    await sendSalonText(
      db, connection, conversation.owner_id, sender,
      'Your appointment request was created, but the secure advance payment link could not be created. The time is held for 15 minutes only and is not confirmed yet. Please contact the salon or try again shortly. Request: ' + booking.id,
      'conversation', booking.id,
    );
  }
}
async function handleInbound(db: any, connection: Json, message: Json, contact: Json | null) {
  const sender = digits(message.from);
  const messageId = safeText(message.id, 200);
  if (!sender || !messageId) return;
  const providerEventId = 'message:' + messageId;
  const event = await db.from('salon_whatsapp_webhook_events').insert({
    provider_event_id: providerEventId,
    phone_number_id: connection.phone_number_id,
    owner_id: connection.owner_id,
    salon_id: null,
    event_type: 'message',
    payload: message,
    processing_status: 'received',
  }).select('id').maybeSingle();
  if (event.error?.code === '23505') return;
  if (event.error) throw new Error('Could not save inbound WhatsApp event.');

  const receivedAt = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const contactName = safeText(contact?.profile?.name, 100);
  const previous = await db.from('salon_whatsapp_conversations').select('*')
    .eq('owner_id', connection.owner_id).eq('customer_wa_id', sender).maybeSingle();
  const conversation: Json = previous.data || {
    owner_id: connection.owner_id, customer_wa_id: sender, customer_name: null,
    flow_state: {}, last_inbound_at: null, last_outbound_at: null,
  };
  conversation.customer_name = conversation.customer_name || contactName || null;
  conversation.last_inbound_at = receivedAt;
  const text = extractText(message);
  await logMessage(db, {
    owner_id: connection.owner_id,
    provider_message_id: messageId,
    direction: 'inbound',
    recipient_wa_id: sender,
    message_kind: 'conversation',
    delivery_status: 'received',
    metadata: { type: message.type || 'unknown', text: text || null, timestamp: message.timestamp || null },
  });

  const website = await getWebsite(db, connection.owner_id);
  const salonName = safeText(website?.content?.profile?.businessName, 120) || 'the salon';
  let flow = conversation.flow_state && typeof conversation.flow_state === 'object' ? { ...conversation.flow_state } : {};
  const upper = text.trim().toUpperCase();

  if (['STOP', 'UNSUBSCRIBE', 'END', 'QUIT'].includes(upper)) {
    flow = { step: 'opted_out', optOut: true };
    await saveConversation(db, conversation, flow, 'closed');
    await sendSalonText(db, connection, connection.owner_id, sender,
      'You are opted out of ' + salonName + ' WhatsApp messages. We will not send further messages here.',
      'conversation');
    await db.from('salon_whatsapp_webhook_events').update({
      processing_status: 'processed', processed_at: new Date().toISOString(),
    }).eq('id', event.data.id);
    return;
  }
  if (flow.optOut && upper !== 'START') {
    await saveConversation(db, conversation, flow, 'closed');
    await db.from('salon_whatsapp_webhook_events').update({
      processing_status: 'processed', processed_at: new Date().toISOString(),
    }).eq('id', event.data.id);
    return;
  }
  if (!website) {
    await saveConversation(db, conversation, { step: 'handoff' }, 'handed_off');
    await sendSalonText(db, connection, connection.owner_id, sender,
      'The salon website is not published yet. Please contact the salon team directly.', 'conversation');
    return;
  }
  const services = getServices(website.content || {});
  const showMenu = async () => {
    await saveConversation(db, conversation, { step: 'menu', optOut: false });
    await sendSalonText(db, connection, connection.owner_id, sender, menuText(salonName, services), 'conversation');
  };

  if (!text) {
    await sendSalonText(db, connection, connection.owner_id, sender,
      'Please send a text reply. Type MENU to see services or 3 to speak to the salon team.', 'conversation');
    return;
  }
  if (upper === 'START') flow = { step: 'menu', optOut: false };
  if (upper === '3') {
    await saveConversation(db, conversation, { step: 'handoff' }, 'handed_off');
    await sendSalonText(db, connection, connection.owner_id, sender,
      'I have passed your message to ' + salonName + '. The salon team will reply here.', 'human_handoff');
    return;
  }
  if (upper === 'NO' || upper === 'CANCEL') {
    await saveConversation(db, conversation, { step: 'menu' });
    await sendSalonText(db, connection, connection.owner_id, sender,
      'Okay, I have not confirmed this appointment. Reply MENU to start again.', 'conversation');
    return;
  }
  if (['HI', 'HELLO', 'HEY', 'MENU', 'START'].includes(upper)) {
    await showMenu();
    return;
  }
  if (flow.step === 'menu' && upper === '1') {
    await sendSalonText(db, connection, connection.owner_id, sender,
      'Services and prices:\n' + formatServices(services) + '\n\nReply 2 to book or 3 to talk to the salon team.', 'conversation');
    return;
  }
  if ((flow.step === 'menu' || !flow.step) && upper === '2') {
    await saveConversation(db, conversation, { step: 'choose_service' });
    await sendSalonText(db, connection, connection.owner_id, sender,
      'Which service would you like to book?\n\n' + formatServices(services) + '\n\nReply with the service number.', 'conversation');
    return;
  }
  if (flow.step === 'choose_service') {
    const index = Number.parseInt(text, 10) - 1;
    const service = Number.isInteger(index) ? services[index] : null;
    if (!service) {
      await sendSalonText(db, connection, connection.owner_id, sender,
        'Please reply with a service number from 1 to ' + services.length + '.', 'conversation');
      return;
    }
    flow = {
      step: 'choose_date',
      serviceId: String(service.id),
      serviceName: safeText(service.name, 120),
      servicePrice: Number(service.price),
    };
    await saveConversation(db, conversation, flow);
    await sendSalonText(db, connection, connection.owner_id, sender,
      'You chose ' + safeText(service.name, 100) + ' (₹' + Number(service.price).toLocaleString('en-IN') +
      ').\n\nSend the appointment date as YYYY-MM-DD.', 'conversation');
    return;
  }
  if (flow.step === 'choose_date') {
    const date = text.trim();
    if (!validDate(date) || new Date(date + 'T23:59:59+05:30').getTime() <= Date.now()) {
      await sendSalonText(db, connection, connection.owner_id, sender,
        'Please enter a future date in YYYY-MM-DD format.', 'conversation');
      return;
    }
    const slotsResult = await db.rpc('studioflow_available_slots', {
      p_slug: website.slug,
      p_service_id: flow.serviceId,
      p_date: date,
      p_stylist_id: 'any',
    });
    const available = Array.isArray(slotsResult.data)
      ? slotsResult.data.filter((slot: Json) => slot && slot.available === true && validTime(String(slot.time || '')))
      : [];
    if (slotsResult.error || available.length === 0) {
      await sendSalonText(db, connection, connection.owner_id, sender,
        'There are no available times for that date. Please send another date as YYYY-MM-DD.', 'conversation');
      return;
    }
    flow = {
      ...flow,
      step: 'choose_time',
      date,
      slots: available.slice(0, 12).map((slot: Json) => ({
        time: slot.time, stylistId: slot.stylistId, stylistName: slot.stylistName,
      })),
    };
    await saveConversation(db, conversation, flow);
    const options = flow.slots.map((slot: Json, index: number) =>
      String(index + 1) + '. ' + slot.time + (slot.stylistName ? ' – ' + safeText(slot.stylistName, 70) : '')
    ).join('\n');
    await sendSalonText(db, connection, connection.owner_id, sender,
      'Available times on ' + date + ':\n' + options + '\n\nReply with a number or exact time (HH:MM).', 'conversation');
    return;
  }
  if (flow.step === 'choose_time') {
    const slots = Array.isArray(flow.slots) ? flow.slots as Json[] : [];
    const index = Number.parseInt(text, 10) - 1;
    const selected = Number.isInteger(index) && slots[index] ? slots[index] : slots.find((slot) => slot.time === text.trim());
    if (!selected) {
      await sendSalonText(db, connection, connection.owner_id, sender,
        'Choose one of the listed times, for example 10:30 or reply with its number.', 'conversation');
      return;
    }
    flow = {
      ...flow, step: 'choose_name',
      time: selected.time,
      stylistId: selected.stylistId,
      stylistName: selected.stylistName,
    };
    await saveConversation(db, conversation, flow);
    await sendSalonText(db, connection, connection.owner_id, sender, 'Please send the name for this booking.', 'conversation');
    return;
  }
  if (flow.step === 'choose_name') {
    const name = safeText(text, 150);
    if (name.length < 2) {
      await sendSalonText(db, connection, connection.owner_id, sender,
        'Please send your name (at least 2 characters).', 'conversation');
      return;
    }
    flow = { ...flow, step: 'confirm_booking', clientName: name, requestKey: crypto.randomUUID() };
    await saveConversation(db, conversation, flow, 'awaiting_confirmation');
    await sendSalonText(db, connection, connection.owner_id, sender,
      'Please check your appointment details:\n\n' + safeText(flow.serviceName, 120) +
      '\n' + flow.date + ' at ' + flow.time +
      '\nSpecialist: ' + (safeText(flow.stylistName, 100) || 'Available specialist') +
      '\nCustomer: ' + name +
      '\nService price: ₹' + Number(flow.servicePrice).toLocaleString('en-IN') +
      '\n\nReply YES to confirm this booking request, or NO to cancel.', 'conversation');
    return;
  }
  if ((flow.step === 'confirm_booking' || flow.step === 'needs_customer_verification') && upper === 'YES') {
    await processBooking(db, connection, conversation, flow, website, sender);
    return;
  }
  if (flow.step === 'payment_pending') {
    if (upper === 'PAY' || upper === 'PAYMENT') {
      const payment = flow.bookingId ? await createWhatsAppPaymentLink(flow.bookingId) : { ok: false };
      if (payment.ok) {
        await sendSalonText(db, connection, connection.owner_id, sender,
          'Complete your secure advance payment here: ' + payment.paymentLinkUrl,
          'payment_link', flow.bookingId);
      } else {
        await sendSalonText(db, connection, connection.owner_id, sender,
          'The payment link is not available right now. Please contact the salon team before the hold expires.',
          'conversation', flow.bookingId || null);
      }
      return;
    }
    await sendSalonText(db, connection, connection.owner_id, sender,
      'Your booking request is waiting for the advance payment. Reply PAY to resend the link, or NO to cancel.',
      'conversation', flow.bookingId || null);
    return;
  }
  if (flow.step === 'handoff') {
    await sendSalonText(db, connection, connection.owner_id, sender,
      'Your message is with ' + salonName + '. Reply MENU to return to booking options.', 'human_handoff');
    return;
  }
  await showMenu();
  await db.from('salon_whatsapp_webhook_events').update({
    processing_status: 'processed', processed_at: new Date().toISOString(),
  }).eq('id', event.data.id);
}
async function updateStatuses(db: any, connection: Json, statuses: Json[]) {
  for (const status of statuses) {
    const messageId = safeText(status.id, 200);
    const delivery = safeText(status.status, 20);
    if (!messageId || !['sent', 'delivered', 'read', 'failed'].includes(delivery)) continue;
    const timestamp = safeText(status.timestamp, 40);
    const eventId = 'status:' + messageId + ':' + delivery + ':' + timestamp;
    const inserted = await db.from('salon_whatsapp_webhook_events').insert({
      provider_event_id: eventId,
      phone_number_id: connection.phone_number_id,
      owner_id: connection.owner_id,
      event_type: 'message_status',
      payload: status,
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
    });
    if (inserted.error?.code === '23505') continue;
    if (inserted.error) throw new Error('Could not record WhatsApp delivery status.');
    await db.from('salon_whatsapp_message_log').update({
      delivery_status: delivery,
      error_code: delivery === 'failed' ? safeText(status.errors?.[0]?.code, 50) : null,
      updated_at: new Date().toISOString(),
    }).eq('provider_message_id', messageId).eq('owner_id', connection.owner_id);
  }
}
async function notifyPayment(db: any, bookingId: string, paymentId: string) {
  const bookingResult = await db.from('studioflow_bookings')
    .select('id,owner_id,payload,booking_source,status')
    .eq('id', bookingId).eq('booking_source', 'whatsapp').maybeSingle();
  const booking = bookingResult.data;
  if (bookingResult.error || !booking) return { sent: false, reason: 'booking_not_found' };
  const connectionResult = await db.from('salon_whatsapp_connections').select('*')
    .eq('owner_id', booking.owner_id).eq('connection_status', 'connected')
    .eq('webhook_subscribed', true).maybeSingle();
  const connection = connectionResult.data;
  if (!connection) return { sent: false, reason: 'salon_sender_not_connected' };
  const recipient = digits(booking.payload?.clientPhone);
  if (!recipient) return { sent: false, reason: 'customer_phone_missing' };
  const amount = Number(booking.payload?.amountPaid || 0);
  const website = await getWebsite(db, booking.owner_id);
  const salonName = safeText(website?.content?.profile?.businessName, 100) || 'our salon';
  const text = 'Payment received successfully. ✅\n\nYour appointment is confirmed:\n' +
    safeText(booking.payload?.serviceName, 120) + '\n' +
    safeText(booking.payload?.date, 20) + ' at ' + safeText(booking.payload?.time, 10) +
    '\nAdvance received: ₹' + amount.toLocaleString('en-IN') +
    '\nPayment reference: ' + safeText(paymentId, 40) + '\n\nThank you for booking with ' + salonName + '!';
  return await sendSalonText(db, connection, booking.owner_id, recipient, text, 'payment_success', booking.id);
}

Deno.serve(async (req: Request) => {
  const requestUrl = new URL(req.url);
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-hub-signature-256',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
  const supabaseUrl = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'WhatsApp webhook is missing server credentials.' }, 503);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  if (req.method === 'GET') {
    const mode = requestUrl.searchParams.get('hub.mode') || '';
    const token = requestUrl.searchParams.get('hub.verify_token') || '';
    const challenge = requestUrl.searchParams.get('hub.challenge') || '';
    if (mode !== 'subscribe' || !challenge) return json({ error: 'Invalid webhook verification request.' }, 400);
    const expected = await vaultSecret(db, 'nexora_whatsapp_webhook_verify_token');
    if (!constantTimeEqual(token, expected)) return json({ error: 'Webhook verification token did not match.' }, 403);
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  if (req.method !== 'POST') return json({ error: 'POST required.' }, 405);

  try {
    const raw = await req.text();
    if (raw.length > 1024 * 1024) return json({ error: 'Webhook payload too large.' }, 413);
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (constantTimeEqual(bearer, serviceKey)) {
      const body = raw ? JSON.parse(raw) as Json : {};
      if (body.action === 'paymentReceipt' && typeof body.bookingId === 'string' && typeof body.paymentId === 'string') {
        return json(await notifyPayment(db, body.bookingId, body.paymentId));
      }
      return json({ error: 'Unknown internal WhatsApp action.' }, 400);
    }

    const supplied = req.headers.get('x-hub-signature-256') || '';
    const appSecret = await vaultSecret(db, 'nexora_whatsapp_meta_app_secret');
    const expected = 'sha256=' + await hmacHex(appSecret, raw);
    if (!constantTimeEqual(supplied.toLowerCase(), expected.toLowerCase())) {
      return json({ error: 'Invalid Meta webhook signature.' }, 401);
    }
    const payload = raw ? JSON.parse(raw) as Json : {};
    if (payload.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) {
      return json({ received: true, ignored: true });
    }

    let processed = 0;
    for (const entry of payload.entry as Json[]) {
      for (const change of (Array.isArray(entry.changes) ? entry.changes : []) as Json[]) {
        if (change.field !== 'messages') continue;
        const value = change.value || {};
        const phoneNumberId = safeText(value.metadata?.phone_number_id, 80);
        if (!phoneNumberId) continue;
        const connection = await getConnection(db, phoneNumberId);
        if (!connection) continue;
        const contacts = Array.isArray(value.contacts) ? value.contacts as Json[] : [];
        const messages = Array.isArray(value.messages) ? value.messages as Json[] : [];
        const statuses = Array.isArray(value.statuses) ? value.statuses as Json[] : [];
        await updateStatuses(db, connection, statuses);
        for (const message of messages) {
          const sender = digits(message.from);
          const contact = contacts.find((item) => digits(item.wa_id) === sender) || null;
          await handleInbound(db, connection, message, contact);
          processed++;
        }
      }
    }
    return json({ received: true, processed });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'WhatsApp webhook processing failed.' }, 500);
  }
});
