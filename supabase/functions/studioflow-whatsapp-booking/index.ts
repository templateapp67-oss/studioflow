// NEXORA WhatsApp booking API — TEST MODE ONLY.
// Reads availability from the live StudioFlow calendar RPCs, but writes only to
// studioflow_whatsapp_test_bookings. It never inserts into studioflow_bookings,
// creates a payment, holds a slot, or tells the customer a real booking exists.
//
// Required Edge Function secrets:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY (provided by Supabase Edge Functions)
//   NEXORA_TAWK_BOOKING_API_KEY (set manually in Supabase Function Secrets;
//     configure the same value in the Tawk custom API integration).

// @ts-ignore Supabase Edge runtime pinned npm import.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type JsonRecord = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
    : '';
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizePhone(value: unknown): string {
  const raw = cleanText(value, 32);
  const digits = raw.replace(/[^0-9]/g, '');
  if (/^\d{10}$/.test(digits)) return '+91' + digits;
  if (/^[1-9]\d{10,14}$/.test(digits)) return '+' + digits;
  return '';
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getServiceItems(content: JsonRecord, serviceIds: string[]) {
  const services = Array.isArray(content.services) ? content.services as JsonRecord[] : [];
  const selected = serviceIds.map((id) => services.find((item) => item?.id === id));
  if (selected.some((item) => !item)) return null;

  const rows = selected as JsonRecord[];
  const items = rows.map((item) => ({
    id: String(item.id),
    name: cleanText(item.name, 120),
    category: cleanText(item.category, 80),
    price: Number(item.price ?? 0),
    durationMinutes: Number(item.durationMinutes ?? 0),
  }));

  if (items.some((item) => !item.name || !Number.isFinite(item.price) || item.price < 0
    || !Number.isInteger(item.durationMinutes) || item.durationMinutes < 1 || item.durationMinutes > 720)) {
    return null;
  }
  const durationMinutes = items.reduce((sum, item) => sum + item.durationMinutes, 0);
  if (durationMinutes < 1 || durationMinutes > 720) return null;
  return {
    items,
    durationMinutes,
    totalPrice: items.reduce((sum, item) => sum + item.price, 0),
    serviceName: items.map((item) => item.name).join(' + '),
  };
}

async function getSalon(db: any, slug: string) {
  const { data, error } = await db
    .from('studioflow_websites')
    .select('slug, owner_id, content')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data?.owner_id || !data?.content || typeof data.content !== 'object') return null;
  return data as { slug: string; owner_id: string; content: JsonRecord };
}

async function getActiveBranches(db: any, ownerId: string) {
  const { data, error } = await db
    .from('branches')
    .select('id, name, city')
    .eq('site_id', ownerId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) return null;
  return data as Array<{ id: string; name: string; city: string }>;
}

async function getAvailableSlots(
  db: any,
  input: { slug: string; serviceIds: string[]; date: string; stylistId: string; branchId?: string },
) {
  const rpc = input.branchId ? 'studioflow_branch_android_slots' : 'studioflow_android_slots';
  const args = input.branchId
    ? {
        p_slug: input.slug,
        p_services: input.serviceIds,
        p_date: input.date,
        p_stylist: input.stylistId,
        p_branch: input.branchId,
      }
    : {
        p_slug: input.slug,
        p_services: input.serviceIds,
        p_date: input.date,
        p_stylist: input.stylistId,
      };
  const { data, error } = await db.rpc(rpc, args);
  if (error || !Array.isArray(data)) return null;
  return data.filter((slot: JsonRecord) =>
    slot && typeof slot.time === 'string' && typeof slot.stylistId === 'string'
    && (!('available' in slot) || slot.available === true)
  ) as Array<JsonRecord & { time: string; stylistId: string }>;
}

function validateBaseInput(body: JsonRecord) {
  const slug = cleanText(body.slug, 80).toLowerCase();
  const serviceIds = Array.isArray(body.serviceIds)
    ? body.serviceIds.map((id) => cleanText(id, 120))
    : [];
  const date = body.date;
  const stylistId = cleanText(body.stylistId || 'any', 120) || 'any';
  const branchId = body.branchId === undefined || body.branchId === null || body.branchId === ''
    ? ''
    : cleanText(body.branchId, 64);

  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) return { error: 'Choose a valid salon.' };
  if (serviceIds.length < 1 || serviceIds.length > 10
    || serviceIds.some((id) => !id)
    || new Set(serviceIds).size !== serviceIds.length) {
    return { error: 'Choose 1–10 different services.' };
  }
  if (!isDate(date)) return { error: 'Choose a valid appointment date.' };
  if (branchId && !isUuid(branchId)) return { error: 'Choose a valid salon location.' };
  return { slug, serviceIds, date, stylistId, branchId: branchId || undefined };
}

async function claimTestQuota(
  db: any,
  ownerId: string,
  phoneHash: string,
) {
  const { data, error } = await db.rpc('private_whatsapp_test_rate_limit', {
    p_owner_id: ownerId,
    p_phone_hash: phoneHash,
    p_max_attempts: 10,
  });
  if (error || !data || typeof data !== 'object') return { error: 'Test booking limit is temporarily unavailable.' };
  if ((data as JsonRecord).allowed !== true) return { error: 'Too many test bookings from this number. Try again later.' };
  return { ok: true };
}

async function handleCatalogue(db: any, body: JsonRecord) {
  const slug = cleanText(body.slug, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) return json({ ok: false, error: 'Choose a valid salon.' }, 400);

  const salon = await getSalon(db, slug);
  if (!salon) return json({ ok: false, error: 'Salon not found or not published.' }, 404);

  const services = Array.isArray(salon.content.services) ? salon.content.services as JsonRecord[] : [];
  const stylists = Array.isArray(salon.content.stylists) ? salon.content.stylists as JsonRecord[] : [];
  const branches = await getActiveBranches(db, salon.owner_id);
  if (!branches) return json({ ok: false, error: 'Salon locations could not be loaded.' }, 503);
  if (branches.length === 0) return json({ ok: false, error: 'This salon has no active booking location.' }, 409);

  return json({
    ok: true,
    mode: 'test_only',
    salon: {
      slug: salon.slug,
      name: cleanText((salon.content.profile as JsonRecord | undefined)?.businessName, 120),
      city: cleanText((salon.content.profile as JsonRecord | undefined)?.city, 80),
    },
    services: services.filter((service) => service && service.id && service.name).map((service) => ({
      id: String(service.id),
      name: cleanText(service.name, 120),
      category: cleanText(service.category, 80),
      priceINR: Number(service.price ?? 0),
      durationMinutes: Number(service.durationMinutes ?? 0),
    })),
    specialists: stylists.filter((person) => person && person.id && person.name
      && cleanText(person.status || 'Available', 30).toLowerCase() === 'available'
    ).map((person) => ({
      id: String(person.id),
      name: cleanText(person.name, 100),
      role: cleanText(person.role || person.roleTitle, 80),
      assignedServices: Array.isArray(person.assignedServices) ? person.assignedServices.map(String) : [],
    })),
    branches: branches.map((branch) => ({
      id: String(branch.id),
      name: cleanText(branch.name, 120),
      city: cleanText(branch.city, 80),
    })),
    notice: 'Testing mode only. No appointment is created by this catalogue lookup.',
  });
}

async function handleAvailability(db: any, body: JsonRecord) {
  const valid = validateBaseInput(body);
  if ('error' in valid) return json({ ok: false, error: valid.error }, 400);

  const salon = await getSalon(db, valid.slug);
  if (!salon) return json({ ok: false, error: 'Salon not found or not published.' }, 404);
  const branches = await getActiveBranches(db, salon.owner_id);
  if (!branches) return json({ ok: false, error: 'Salon locations could not be loaded.' }, 503);
  if (branches.length === 0) return json({ ok: false, error: 'This salon has no active booking location.' }, 409);
  if (branches.length > 1 && !valid.branchId) {
    return json({ ok: false, error: 'Choose a salon location before checking times.', requiresBranch: true }, 400);
  }
  const branchId = valid.branchId || (branches.length === 1 ? branches[0].id : undefined);
  const branch = branches.find((item) => item.id === branchId);
  if (branchId && !branch) return json({ ok: false, error: 'That salon location is not active.' }, 400);
  const selected = getServiceItems(salon.content, valid.serviceIds);
  if (!selected) return json({ ok: false, error: 'One of the selected services is no longer available.' }, 409);

  const slots = await getAvailableSlots(db, {
    slug: valid.slug,
    serviceIds: valid.serviceIds,
    date: valid.date,
    stylistId: valid.stylistId,
    branchId,
  });
  if (!slots) return json({ ok: false, error: 'Live availability could not be checked. Please try again.' }, 503);

  const specialists = Array.isArray(salon.content.stylists) ? salon.content.stylists as JsonRecord[] : [];
  return json({
    ok: true,
    mode: 'test_only',
    salon: cleanText((salon.content.profile as JsonRecord | undefined)?.businessName, 120),
    date: valid.date,
    durationMinutes: selected.durationMinutes,
    totalPriceINR: Math.round(selected.totalPrice * 100) / 100,
    slots: slots.map((slot) => ({
      time: slot.time,
      stylistId: slot.stylistId,
      stylistName: cleanText(specialists.find((person) => person?.id === slot.stylistId)?.name, 100),
      branchId: slot.branchId || branchId || null,
      branchName: cleanText(slot.branchName || branch?.name || '', 120),
    })),
    notice: 'These times were read from the live NEXORA calendar. Checking availability does not reserve a time.',
  });
}

async function handleTestBooking(
  db: any,
  body: JsonRecord,
  apiKey: string,
) {
  const valid = validateBaseInput(body);
  if ('error' in valid) return json({ ok: false, error: valid.error }, 400);

  const time = body.time;
  const requestedStylist = cleanText(body.stylistId, 120);
  const requestId = body.requestId;
  const customerName = cleanText(body.customerName, 100);
  const customerPhone = normalizePhone(body.customerPhone);
  const notes = cleanText(body.notes, 500);

  if (body.customerConfirmed !== true) {
    return json({ ok: false, error: 'Customer confirmation is required before saving a test request.' }, 400);
  }
  if (!isTime(time)) return json({ ok: false, error: 'Choose a valid available time.' }, 400);
  if (!requestedStylist) return json({ ok: false, error: 'Choose a specialist from the available times.' }, 400);
  if (!isUuid(requestId)) return json({ ok: false, error: 'A valid requestId is required.' }, 400);
  if (customerName.length < 2 || !customerPhone) return json({ ok: false, error: 'Enter a valid name and WhatsApp number.' }, 400);

  const salon = await getSalon(db, valid.slug);
  if (!salon) return json({ ok: false, error: 'Salon not found or not published.' }, 404);
  const branches = await getActiveBranches(db, salon.owner_id);
  if (!branches) return json({ ok: false, error: 'Salon locations could not be loaded.' }, 503);
  if (branches.length === 0) return json({ ok: false, error: 'This salon has no active booking location.' }, 409);
  if (branches.length > 1 && !valid.branchId) {
    return json({ ok: false, error: 'Choose a salon location before testing the booking.', requiresBranch: true }, 400);
  }
  const branchId = valid.branchId || (branches.length === 1 ? branches[0].id : undefined);
  const branch = branches.find((item) => item.id === branchId) || null;
  if (branchId && !branch) return json({ ok: false, error: 'That salon location is not active.' }, 400);

  const selected = getServiceItems(salon.content, valid.serviceIds);
  if (!selected) return json({ ok: false, error: 'One of the selected services is no longer available.' }, 409);

  // Re-check the live calendar immediately before writing the test record.
  const phoneHash = await hmacHex(apiKey, customerPhone);
  // Fingerprint the customer's requested choice (including "any"), not the
  // server-selected stylist, so a safe retry returns the original test record
  // even if the live slot is later taken by a real customer.
  const requestFingerprint = await hmacHex(apiKey, JSON.stringify({
    slug: valid.slug,
    serviceIds: valid.serviceIds,
    date: valid.date,
    time,
    requestedStylist,
    branchId: branchId || null,
    customerName,
    customerPhone,
    notes,
  }));

  const { data: prior, error: priorError } = await db
    .from('studioflow_whatsapp_test_bookings')
    .select('id, owner_id, request_id, request_fingerprint, status, starts_at, ends_at, payload, created_at')
    .eq('owner_id', salon.owner_id)
    .eq('request_id', requestId)
    .maybeSingle();
  if (priorError) return json({ ok: false, error: 'Could not check the previous test request. No booking was saved.' }, 503);
  if (prior) {
    if (prior.request_fingerprint !== requestFingerprint) {
      return json({ ok: false, error: 'This request ID was already used with different details. Start a new test request.' }, 409);
    }
    return json({
      ok: true,
      mode: 'test_only',
      idempotentRetry: true,
      testBooking: prior,
      calendarReserved: false,
      customerMessage: 'This was a test simulation only. No real appointment was booked and no slot was reserved.',
    });
  }

  // Re-check the real calendar only for a new request. Idempotent retries above
  // return the original response and do not create a second test record.
  const slots = await getAvailableSlots(db, {
    slug: valid.slug,
    serviceIds: valid.serviceIds,
    date: valid.date,
    stylistId: requestedStylist,
    branchId,
  });
  if (!slots) return json({ ok: false, error: 'Live availability could not be checked. No test record was saved.' }, 503);

  const chosen = slots.find((slot) => slot.time === time
    && (requestedStylist === 'any' || slot.stylistId === requestedStylist));
  if (!chosen) return json({ ok: false, error: 'That time is no longer available. Check the latest slots.', refreshAvailability: true }, 409);

  const stylistId = chosen.stylistId;
  const stylists = Array.isArray(salon.content.stylists) ? salon.content.stylists as JsonRecord[] : [];
  const stylist = stylists.find((person) => person?.id === stylistId);
  if (!stylist) return json({ ok: false, error: 'The selected specialist is no longer available.' }, 409);

  const quota = await claimTestQuota(db, salon.owner_id, phoneHash);
  if ('error' in quota) return json({ ok: false, error: quota.error }, 429);

  const startsAt = new Date(valid.date + 'T' + time + ':00+05:30');
  const endsAt = new Date(startsAt.getTime() + selected.durationMinutes * 60_000);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) {
    return json({ ok: false, error: 'Invalid appointment time.' }, 400);
  }

  const payload = {
    source: 'tawk_whatsapp_test',
    mode: 'test_only',
    salonSlug: valid.slug,
    salonName: cleanText((salon.content.profile as JsonRecord | undefined)?.businessName, 120),
    serviceIds: valid.serviceIds,
    services: selected.items,
    serviceName: selected.serviceName,
    servicePriceINR: Math.round(selected.totalPrice * 100) / 100,
    durationMinutes: selected.durationMinutes,
    date: valid.date,
    time,
    stylistId,
    stylistName: cleanText(stylist.name, 100),
    branchId: branch?.id || null,
    branchName: branch?.name || '',
    customerName,
    customerPhoneLast4: customerPhone.slice(-4),
    notes,
    calendarReserved: false,
  };

  const { data: saved, error: saveError } = await db
    .from('studioflow_whatsapp_test_bookings')
    .insert({
      owner_id: salon.owner_id,
      request_id: requestId,
      request_fingerprint: requestFingerprint,
      customer_name: customerName,
      customer_phone_hash: phoneHash,
      customer_phone_last4: customerPhone.slice(-4),
      service_ids: valid.serviceIds,
      stylist_id: stylistId,
      branch_id: branch?.id || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'test_only',
      payload,
    })
    .select('id, status, starts_at, ends_at, payload, created_at')
    .single();

  if (saveError) {
    // A concurrent retry can win the unique(owner_id, request_id) constraint.
    const { data: raced } = await db
      .from('studioflow_whatsapp_test_bookings')
      .select('id, request_fingerprint, status, starts_at, ends_at, payload, created_at')
      .eq('owner_id', salon.owner_id)
      .eq('request_id', requestId)
      .maybeSingle();
    if (raced?.request_fingerprint === requestFingerprint) {
      return json({
        ok: true,
        mode: 'test_only',
        idempotentRetry: true,
        testBooking: raced,
        calendarReserved: false,
        customerMessage: 'This was a test simulation only. No real appointment was booked and no slot was reserved.',
      });
    }
    return json({ ok: false, error: 'The test request could not be saved. Please try once more.' }, 503);
  }

  return json({
    ok: true,
    mode: 'test_only',
    idempotentRetry: false,
    testBooking: saved,
    calendarReserved: false,
    customerMessage: 'Test flow completed. This is not a real appointment: nothing was added to the live calendar and no time was reserved.',
  }, 201);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  if (req.method === 'GET' && path.endsWith('/health')) {
    const configured = Boolean(
      Deno.env.get('SUPABASE_URL')
      && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      && (Deno.env.get('NEXORA_TAWK_BOOKING_API_KEY') || '').length >= 32,
    );
    return json({ ok: true, service: 'studioflow-whatsapp-booking', mode: 'test_only', configured });
  }

  if (req.method !== 'POST') return json({ ok: false, error: 'POST required.' }, 405);

  const expectedKey = Deno.env.get('NEXORA_TAWK_BOOKING_API_KEY') || '';
  const authorization = req.headers.get('authorization') || '';
  const suppliedKey = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ ok: false, error: 'Unauthorized.' }, 401);
  if (expectedKey.length < 32) return json({ ok: false, error: 'WhatsApp booking integration is not configured yet.' }, 503);
  if (!constantTimeEqual(expectedKey, suppliedKey)) return json({ ok: false, error: 'Unauthorized.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Booking service is not configured.' }, 503);

  try {
    const raw = await req.text();
    if (!raw || raw.length > 24_000) return json({ ok: false, error: 'Request body missing or too large.' }, 400);
    let body: JsonRecord;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: 'Request body must be valid JSON.' }, 400);
    }
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      return json({ ok: false, error: 'Request body must be a JSON object.' }, 400);
    }

    const db = createClient<any>(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-NEXORA-Integration': 'tawk-whatsapp-test' } },
    });

    if (path.endsWith('/catalogue')) return await handleCatalogue(db, body);
    if (path.endsWith('/availability')) return await handleAvailability(db, body);
    if (path.endsWith('/test-booking')) return await handleTestBooking(db, body, expectedKey);
    return json({ ok: false, error: 'Unknown integration action.' }, 404);
  } catch {
    // Never log or echo raw customer messages, phone numbers, API keys or DB errors.
    return json({ ok: false, error: 'The booking test service had a temporary error. Please try again.' }, 500);
  }
});
