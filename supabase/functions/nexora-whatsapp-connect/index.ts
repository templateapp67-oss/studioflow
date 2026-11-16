// NEXORA per-salon WhatsApp connection service.
// Meta Embedded Signup v5 session identifiers are supplied by the browser,
// while the exchangeable code and all Meta secrets stay server-side.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};
const GRAPH_VERSION = (Deno.env.get('META_GRAPH_API_VERSION') || 'v27.0').trim();
const SIGNUP_VERSION = (Deno.env.get('META_WHATSAPP_EMBEDDED_SIGNUP_VERSION') || 'v5').trim();
const encoder = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
function env(name: string) { return (Deno.env.get(name) || '').trim(); }
function base64ToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function isMetaId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{5,40}$/.test(value);
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function tokenEncryptionKey(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.rpc('nexora_whatsapp_token_key');
  if (error || typeof data !== 'string' || !data) {
    throw new Error('NEXORA WhatsApp encryption key is not available in Supabase Vault.');
  }
  const key = base64ToBytes(data);
  if (key.length !== 32) throw new Error('NEXORA WhatsApp Vault key is not a valid AES-256 key.');
  return key;
}
async function encryptToken(token: string, keyBytes: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(token));
  return {
    access_token_ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    access_token_iv: bytesToBase64(iv),
  };
}
function metaConfig() {
  const appId = env('META_APP_ID');
  const appSecret = env('META_APP_SECRET');
  const configId = env('META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID');
  const webhookVerifyToken = env('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN');
  return {
    appId, appSecret, configId, webhookVerifyToken,
    configured: Boolean(appId && appSecret && configId && webhookVerifyToken),
  };
}
async function graph(path: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', 'Bearer ' + token);
  const response = await fetch('https://graph.facebook.com/' + GRAPH_VERSION + '/' + path, {
    ...init, headers, signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as Record<string, unknown> | undefined;
    throw new Error(typeof error?.message === 'string'
      ? error.message
      : 'Meta could not verify the WhatsApp Business account.');
  }
  return payload;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required.' }, 405);

  try {
    const supabaseUrl = env('SUPABASE_URL');
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json({ error: 'WhatsApp service is missing server credentials.' }, 503);

    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!bearer) return json({ error: 'Sign in to your salon owner account first.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !authData.user || authData.user.is_anonymous) {
      return json({ error: 'Your owner login has expired. Sign in again.' }, 401);
    }
    const ownerId = authData.user.id;
    const { data: account, error: accountError } = await admin
      .from('studioflow_accounts').select('user_id').eq('user_id', ownerId).maybeSingle();
    if (accountError || !account) return json({ error: 'The signed-in account is not a salon owner workspace.' }, 403);

    const raw = await req.text();
    if (raw.length > 12000) return json({ error: 'Request is too large.' }, 413);
    const body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const action = typeof body.action === 'string' ? body.action : '';
    const meta = metaConfig();

    if (action === 'config') {
      let vaultKeyReady = false;
      try { await tokenEncryptionKey(admin); vaultKeyReady = true; } catch { /* report setup as incomplete */ }
      return json({
        configured: meta.configured && vaultKeyReady,
        appId: meta.configured ? meta.appId : null,
        configId: meta.configured ? meta.configId : null,
        graphVersion: GRAPH_VERSION,
        embeddedSignupVersion: SIGNUP_VERSION,
      });
    }

    if (action === 'status') {
      const { data: connection, error } = await admin
        .from('salon_whatsapp_connections')
        .select('connection_status,display_phone_number,verified_name,webhook_subscribed,connected_at,disconnected_at,connection_mode,is_on_biz_app,platform_type')
        .eq('owner_id', ownerId).maybeSingle();
      if (error) return json({ error: 'Could not load WhatsApp connection status.' }, 503);

      const [bookingResult, messagesResult, paymentResult] = await Promise.all([
        admin.from('studioflow_bookings')
          .select('id,status', { count: 'exact' })
          .eq('owner_id', ownerId).eq('booking_source', 'whatsapp').limit(1000),
        admin.from('salon_whatsapp_message_log')
          .select('direction,delivery_status,message_kind', { count: 'exact' })
          .eq('owner_id', ownerId).limit(1000),
        admin.from('studioflow_payment_orders')
          .select('booking_id,amount_paise,status,payment_link_id,payment_link_url,studioflow_bookings!inner(owner_id,booking_source)')
          .eq('studioflow_bookings.owner_id', ownerId)
          .eq('studioflow_bookings.booking_source', 'whatsapp').limit(1000),
      ]);
      if (bookingResult.error || messagesResult.error || paymentResult.error) {
        return json({ error: 'WhatsApp dashboard metrics could not be loaded.' }, 503);
      }
      const bookings = bookingResult.data || [];
      const messages = messagesResult.data || [];
      const payments = paymentResult.data || [];
      return json({
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
          whatsappAdvanceCollectedINR: payments.filter((row) => row.status === 'captured')
            .reduce((sum, row) => sum + Number(row.amount_paise || 0), 0) / 100,
        },
      });
    }

    if (action === 'begin') {
      if (!meta.configured) return json({
        error: 'Meta setup is incomplete. Add META_APP_ID, META_APP_SECRET, META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID and META_WHATSAPP_WEBHOOK_VERIFY_TOKEN in Supabase Function Secrets.',
        setupRequired: true,
      }, 503);
      let keyReady = false;
      try { await tokenEncryptionKey(admin); keyReady = true; } catch { /* explicit error below */ }
      if (!keyReady) return json({ error: 'NEXORA WhatsApp token-encryption key is missing from Supabase Vault.' }, 503);

      const stateBytes = crypto.getRandomValues(new Uint8Array(32));
      const state = bytesToBase64(stateBytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const stateHash = await sha256(state);
      const { error } = await admin.from('salon_whatsapp_oauth_states').insert({
        state_hash: stateHash,
        owner_id: ownerId,
        initiated_by: ownerId,
        salon_id: null,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (error) return json({ error: 'Could not start a secure WhatsApp connection. Try again.' }, 503);
      return json({
        state,
        appId: meta.appId,
        configId: meta.configId,
        graphVersion: GRAPH_VERSION,
        embeddedSignupVersion: SIGNUP_VERSION,
      });
    }

    if (action === 'complete') {
      if (!meta.configured) return json({ error: 'Meta WhatsApp setup is not configured.' }, 503);
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const state = typeof body.state === 'string' ? body.state : '';
      const wabaId = isMetaId(body.wabaId) ? body.wabaId : '';
      const phoneNumberId = isMetaId(body.phoneNumberId) ? body.phoneNumberId : '';
      const isOnBizApp = body.isOnBizApp === true;
      const primaryWaacIds = Array.isArray(body.primaryWaacIds)
        ? body.primaryWaacIds.filter(isMetaId).slice(0, 10)
        : [];
      if (!code || code.length > 4096 || !state || state.length > 256 || !wabaId || !phoneNumberId) {
        return json({ error: 'Meta did not return a valid WhatsApp account, phone number and login code.' }, 400);
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
      if (stateError || !stateRow) {
        return json({ error: 'This WhatsApp connection session expired or was already used. Start again.' }, 409);
      }

      // Embedded Signup returns a short-lived exchangeable code in FB.login().
      // This OAuth endpoint is a GET and does not use a Bearer access token.
      const tokenQuery = new URLSearchParams({
        client_id: meta.appId,
        client_secret: meta.appSecret,
        code,
      });
      const tokenResponse = await graph('oauth/access_token?' + tokenQuery.toString());
      const accessToken = typeof tokenResponse.access_token === 'string' ? tokenResponse.access_token : '';
      if (!accessToken) return json({ error: 'Meta did not issue a WhatsApp access token. Start the connection again.' }, 502);

      const phoneList = await graph(
        encodeURIComponent(wabaId) + '/phone_numbers?fields=id,display_phone_number,verified_name&limit=100',
        accessToken,
      );
      const phoneRows = Array.isArray(phoneList.data) ? phoneList.data as Array<Record<string, unknown>> : [];
      const phone = phoneRows.find((row) => row.id === phoneNumberId);
      if (!phone || typeof phone.display_phone_number !== 'string') {
        return json({ error: 'The selected phone number is not linked to the WhatsApp Business account returned by Meta.' }, 403);
      }

      const subscription = await graph(
        encodeURIComponent(wabaId) + '/subscribed_apps',
        accessToken,
        { method: 'POST', body: JSON.stringify({}) },
      );
      const subscribed = subscription.success === true || Array.isArray(subscription.data);
      if (!subscribed) return json({ error: 'Meta did not subscribe this WhatsApp account to webhook events.' }, 502);

      const keyBytes = await tokenEncryptionKey(admin);
      const encrypted = await encryptToken(accessToken, keyBytes);
      const expiresIn = Number(tokenResponse.expires_in || 0);
      const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
      const connectionMode = isOnBizApp ? 'coexistence' : 'standard';
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
        connection_mode: connectionMode,
        is_on_biz_app: isOnBizApp,
        platform_type: 'cloud_api',
        primary_waac_ids: primaryWaacIds,
        provider_metadata: {
          graph_version: GRAPH_VERSION,
          embedded_signup_version: SIGNUP_VERSION,
          token_type: typeof tokenResponse.token_type === 'string' ? tokenResponse.token_type : 'bearer',
          expires_at: expiresAt,
          waba_id: wabaId,
          messaging_account_ids: Array.isArray(body.messagingAccountIds) ? body.messagingAccountIds.filter(isMetaId).slice(0, 10) : [wabaId],
          phone_number_id: phoneNumberId,
          is_on_biz_app: isOnBizApp,
          primary_waac_ids: primaryWaacIds,
        },
      }, { onConflict: 'owner_id' });
      if (saveError) {
        if (saveError.code === '23505') return json({ error: 'This WhatsApp phone number is already connected to another salon account.' }, 409);
        return json({ error: 'Meta connected the number, but NEXORA could not safely save the connection. Contact support before connecting another number.' }, 503);
      }
      return json({
        ok: true,
        connection: {
          connection_status: 'connected',
          display_phone_number: phone.display_phone_number,
          verified_name: typeof phone.verified_name === 'string' ? phone.verified_name : null,
          webhook_subscribed: true,
          connected_at: new Date().toISOString(),
          connection_mode: connectionMode,
          is_on_biz_app: isOnBizApp,
        },
      });
    }

    if (action === 'disconnect') {
      const { error } = await admin.from('salon_whatsapp_connections')
        .update({ connection_status: 'disconnected', disconnected_at: new Date().toISOString(), webhook_subscribed: false })
        .eq('owner_id', ownerId);
      if (error) return json({ error: 'Could not disconnect this WhatsApp number.' }, 503);
      return json({ ok: true, disconnected: true });
    }

    return json({ error: 'Unknown WhatsApp connection action.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'WhatsApp connection could not be completed.' }, 400);
  }
});
