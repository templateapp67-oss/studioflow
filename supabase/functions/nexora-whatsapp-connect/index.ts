// NEXORA WhatsApp owner connection — Embedded Signup v4.
// This endpoint is user-authenticated. Meta tokens are exchanged and encrypted
// here; no Meta app secret or WhatsApp access token is ever returned to a client.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const ALLOWED_ORIGINS = new Set([
  'https://nexorasalon.online',
  'https://www.nexorasalon.online',
  'http://localhost:5173',
]);
const CORS_BASE = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};
function corsHeaders(origin: string) {
  const allowed = !origin || ALLOWED_ORIGINS.has(origin)
    || /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/.test(origin)
    || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return allowed && origin
    ? { ...CORS_BASE, 'Access-Control-Allow-Origin': origin }
    : CORS_BASE;
}
const GRAPH_VERSION = (Deno.env.get('META_GRAPH_API_VERSION') || 'v27.0').trim();
const encoder = new TextEncoder();

function json(body: unknown, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
function env(name: string) { return (Deno.env.get(name) || '').trim(); }
function isMetaId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{5,40}$/.test(value);
}
function base64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function encryptToken(token: string, rawKey: string) {
  if (!rawKey) throw new Error('WhatsApp token encryption key is not configured in Supabase Vault.');
  let keyBytes: Uint8Array;
  try { keyBytes = fromBase64(rawKey); } catch { throw new Error('WhatsApp token encryption key must be base64-encoded 32-byte data.'); }
  if (keyBytes.length !== 32) throw new Error('WhatsApp token encryption key must decode to exactly 32 bytes.');
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(token));
  return { access_token_ciphertext: base64(new Uint8Array(ciphertext)), access_token_iv: base64(iv) };
}
function credentials() {
  const appId = env('META_APP_ID');
  const appSecret = env('META_APP_SECRET');
  const configId = env('META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID');
  return {
    appId, configId,
    configured: Boolean(appId && configId),
  };
}
async function graph(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = (payload as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
    throw new Error(typeof error?.message === 'string' ? error.message : 'Meta could not verify the WhatsApp Business account.');
  }
  return payload as Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const respond = (body: unknown, status = 200) => json(body, status, origin);
  const originAllowed = !origin || ALLOWED_ORIGINS.has(origin)
    || /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/.test(origin)
    || /^http:\/\/localhost(:\d+)?$/.test(origin);
  if (req.method === 'OPTIONS') return new Response('ok', {
    status: originAllowed ? 204 : 403,
    headers: corsHeaders(origin),
  });
  if (origin && !originAllowed) return respond({ error: 'Origin not allowed.' }, 403);
  if (req.method !== 'POST') return respond({ error: 'POST required.' }, 405);

  try {
    const supabaseUrl = env('SUPABASE_URL');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return respond({ error: 'WhatsApp service is missing server credentials.' }, 503);
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!bearer) return respond({ error: 'Sign in to your salon owner account first.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !authData.user || authData.user.is_anonymous) return respond({ error: 'Your owner login has expired. Sign in again.' }, 401);
    const ownerId = authData.user.id;
    const { data: account, error: accountError } = await admin
      .from('studioflow_accounts').select('user_id').eq('user_id', ownerId).maybeSingle();
    if (accountError || !account) return respond({ error: 'The signed-in account is not a salon owner workspace.' }, 403);

    const raw = await req.text();
    if (raw.length > 12000) return respond({ error: 'Request is too large.' }, 413);
    const body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const action = typeof body.action === 'string' ? body.action : '';
    const meta = credentials();

    if (action === 'config') {
      const [appSecretResult, encryptionKeyResult, verifyTokenResult] = await Promise.all([
        admin.rpc('nexora_whatsapp_meta_secret', { p_secret_name: 'nexora_whatsapp_meta_app_secret' }),
        admin.rpc('nexora_whatsapp_token_key'),
        admin.rpc('nexora_whatsapp_meta_secret', { p_secret_name: 'nexora_whatsapp_webhook_verify_token' }),
      ]);
      const secretsConfigured =
        typeof appSecretResult.data === 'string' && Boolean(appSecretResult.data) &&
        typeof encryptionKeyResult.data === 'string' && Boolean(encryptionKeyResult.data) &&
        typeof verifyTokenResult.data === 'string' && Boolean(verifyTokenResult.data);
      return respond({
        configured: meta.configured && secretsConfigured,
        appId: meta.configured && secretsConfigured ? meta.appId : null,
        configId: meta.configured && secretsConfigured ? meta.configId : null,
        graphVersion: GRAPH_VERSION,
        setupRequired: !(meta.configured && secretsConfigured),
      });
    }

    if (action === 'status') {
      const { data: connection, error } = await admin
        .from('salon_whatsapp_connections')
        .select('connection_status,display_phone_number,verified_name,webhook_subscribed,connected_at,disconnected_at,connection_mode,is_on_biz_app')
        .eq('owner_id', ownerId).maybeSingle();
      if (error) return respond({ error: 'Could not load WhatsApp connection status.' }, 503);

      const [bookingResult, messagesResult, paymentResult] = await Promise.all([
        admin.from('studioflow_bookings')
          .select('id,status,payload', { count: 'exact' })
          .eq('owner_id', ownerId).eq('booking_source', 'whatsapp').limit(1000),
        admin.from('salon_whatsapp_message_log')
          .select('direction,delivery_status,message_kind', { count: 'exact' })
          .eq('owner_id', ownerId).limit(1000),
        admin.from('studioflow_payment_orders')
          .select('booking_id,amount_paise,status,payment_link_id,payment_link_status,studioflow_bookings!inner(owner_id,booking_source)')
          .eq('studioflow_bookings.owner_id', ownerId)
          .eq('studioflow_bookings.booking_source', 'whatsapp').limit(1000),
      ]);
      const bookings = bookingResult.data || [];
      const messages = messagesResult.data || [];
      const payments = paymentResult.data || [];
      return respond({
        configured: meta.configured,
        connection: connection || null,
        metrics: {
          whatsappBookings: bookingResult.count ?? bookings.length,
          confirmedBookings: bookings.filter((row) => row.status === 'confirmed').length,
          bookingRequests: bookings.filter((row) => row.status === 'pending').length,
          cancellations: bookings.filter((row) => row.status === 'cancelled').length,
          inboundMessages: messages.filter((row) => row.direction === 'inbound').length,
          outboundMessages: messages.filter((row) => row.direction === 'outbound').length,
          deliveredMessages: messages.filter((row) => row.delivery_status === 'delivered' || row.delivery_status === 'read').length,
          paymentLinks: payments.filter((row) => Boolean(row.payment_link_id)).length,
          paidPayments: payments.filter((row) => row.status === 'captured').length,
          pendingPayments: payments.filter((row) => row.status === 'created').length,
          whatsappAdvanceCollectedINR: payments.filter((row) => row.status === 'captured').reduce((sum, row) => sum + Number(row.amount_paise || 0), 0) / 100,
        },
      });
    }

    if (action === 'begin') {
      if (!meta.configured) return respond({
        error: 'Add META_APP_ID and META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID to Supabase Function Secrets first.',
        setupRequired: true,
      }, 503);
      const { data: storedAppSecret } = await admin.rpc('nexora_whatsapp_meta_secret', { p_secret_name: 'nexora_whatsapp_meta_app_secret' });
      const { data: storedEncryptionKey } = await admin.rpc('nexora_whatsapp_token_key');
      const { data: storedVerifyToken } = await admin.rpc('nexora_whatsapp_meta_secret', { p_secret_name: 'nexora_whatsapp_webhook_verify_token' });
      if (typeof storedAppSecret !== 'string' || !storedAppSecret ||
          typeof storedEncryptionKey !== 'string' || !storedEncryptionKey ||
          typeof storedVerifyToken !== 'string' || !storedVerifyToken) {
        return respond({ error: 'Store nexora_whatsapp_meta_app_secret, nexora_whatsapp_webhook_verify_token and nexora_whatsapp_token_encryption_key in Supabase Vault before connecting a number.', setupRequired: true }, 503);
      }
      const stateBytes = crypto.getRandomValues(new Uint8Array(32));
      const state = base64(stateBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const stateHash = await sha256(state);
      const { error } = await admin.from('salon_whatsapp_oauth_states').insert({
        state_hash: stateHash,
        owner_id: ownerId,
        initiated_by: ownerId,
        salon_id: null,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (error) return respond({ error: 'Could not start a secure WhatsApp connection. Try again.' }, 503);
      return respond({
        state,
        appId: meta.appId,
        configId: meta.configId,
        graphVersion: GRAPH_VERSION,
      });
    }

    if (action === 'complete') {
      if (!meta.configured) return respond({ error: 'Meta WhatsApp setup is not configured.' }, 503);
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const state = typeof body.state === 'string' ? body.state : '';
      const wabaId = body.wabaId;
      const phoneNumberId = body.phoneNumberId;
      if (!code || code.length > 4096 || !state || state.length > 256 || !isMetaId(wabaId) || !isMetaId(phoneNumberId)) {
        return respond({ error: 'Meta did not return a valid WhatsApp account, phone number and login code.' }, 400);
      }

      const stateHash = await sha256(state);
      const { data: stateRow, error: stateError } = await admin
        .from('salon_whatsapp_oauth_states')
        .update({ consumed_at: new Date().toISOString() })
        .eq('state_hash', stateHash)
        .eq('owner_id', ownerId)
        .eq('initiated_by', ownerId)
        .is('consumed_at', null)
        .gt('expires_at', new Date().toISOString())
        .select('id').maybeSingle();
      if (stateError || !stateRow) return respond({ error: 'This WhatsApp connection session expired or was already used. Start again.' }, 409);

      const appSecretResult = await admin.rpc('nexora_whatsapp_meta_secret', { p_secret_name: 'nexora_whatsapp_meta_app_secret' });
      if (appSecretResult.error || typeof appSecretResult.data !== 'string' || !appSecretResult.data) {
        return respond({ error: 'Meta App Secret is missing from Supabase Vault.' }, 503);
      }
      const tokenResponse = await graph(
        `oauth/access_token?client_id=${encodeURIComponent(meta.appId)}&client_secret=${encodeURIComponent(appSecretResult.data)}&code=${encodeURIComponent(code)}`,
        '',
      );
      const accessToken = typeof tokenResponse.access_token === 'string' ? tokenResponse.access_token : '';
      if (!accessToken) return respond({ error: 'Meta did not issue a WhatsApp access token. Start the connection again.' }, 502);

      const phoneList = await graph(
        `${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name&limit=100`,
        accessToken,
      );
      const phoneRows = Array.isArray(phoneList.data) ? phoneList.data as Array<Record<string, unknown>> : [];
      const phone = phoneRows.find((row) => row.id === phoneNumberId);
      if (!phone || typeof phone.display_phone_number !== 'string') {
        return respond({ error: 'The phone number selected in Meta is not linked to the WhatsApp Business account returned by Meta.' }, 403);
      }

      const subscription = await graph(
        `${encodeURIComponent(wabaId)}/subscribed_apps`,
        accessToken,
        { method: 'POST', body: JSON.stringify({}) },
      );
      const subscribed = subscription.success === true || Array.isArray(subscription.data);
      if (!subscribed) return respond({ error: 'Meta did not subscribe this WhatsApp account to webhook events.' }, 502);

      const keyResult = await admin.rpc('nexora_whatsapp_token_key');
      if (keyResult.error || typeof keyResult.data !== 'string' || !keyResult.data) {
        return respond({ error: 'WhatsApp token encryption key is missing from Supabase Vault.' }, 503);
      }
      const encrypted = await encryptToken(accessToken, keyResult.data);
      const expiresIn = Number(tokenResponse.expires_in || 0);
      const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
      const { error: saveError } = await admin.from('salon_whatsapp_connections').upsert({
        owner_id: ownerId,
        salon_id: null,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        business_id: null,
        display_phone_number: phone.display_phone_number,
        verified_name: typeof phone.verified_name === 'string' ? phone.verified_name : null,
        connection_status: 'connected',
        ...encrypted,
        token_key_version: 1,
        token_expires_at: expiresAt,
        webhook_subscribed: true,
        connected_by: ownerId,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        connection_mode: 'standard',
        is_on_biz_app: false,
        platform_type: 'cloud_api',
        provider_metadata: {
          graph_version: GRAPH_VERSION,
          token_type: typeof tokenResponse.token_type === 'string' ? tokenResponse.token_type : 'bearer',
          expires_at: expiresAt,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
        },
      }, { onConflict: 'owner_id' });
      if (saveError) {
        if (saveError.code === '23505') return respond({ error: 'This WhatsApp phone number is already connected to another salon account.' }, 409);
        return respond({ error: 'Meta connected the number, but NEXORA could not safely save the connection. Contact support before trying to connect another salon.' }, 503);
      }
      return respond({
        ok: true,
        connection: {
          connection_status: 'connected',
          display_phone_number: phone.display_phone_number,
          verified_name: typeof phone.verified_name === 'string' ? phone.verified_name : null,
          webhook_subscribed: true,
          connected_at: new Date().toISOString(),
        },
      });
    }

    if (action === 'disconnect') {
      const { error } = await admin.from('salon_whatsapp_connections')
        .update({ connection_status: 'disconnected', disconnected_at: new Date().toISOString(), webhook_subscribed: false })
        .eq('owner_id', ownerId);
      if (error) return respond({ error: 'Could not disconnect this WhatsApp number.' }, 503);
      return respond({ ok: true, disconnected: true });
    }

    return respond({ error: 'Unknown WhatsApp connection action.' }, 400);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'WhatsApp connection could not be completed.' }, 400);
  }
});
