// NEXORA per-salon WhatsApp connection service.
// The browser submits Meta's short-lived code and session identifiers.
// The code exchange, business access token and app secret stay server-side.
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
const SIGNUP_VERSION = 'v5';
const encoder = new TextEncoder();

function json(body: unknown, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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
function customerWhatsAppId(value: unknown) {
  // Allow ordinary phone formatting without turning malformed input into a recipient.
  if (typeof value !== 'string' || !/^\+?[0-9]+(?:[ -][0-9]+)*$/.test(value)) return '';
  const digits = value.replace(/[+ -]/g, '');
  return /^\d{10,15}$/.test(digits) ? digits : '';
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function tokenEncryptionKey(admin: any) {
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
  const configId = env('META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID');
  return { appId, configId, configured: Boolean(appId && configId) };
}
async function vaultMetaSecret(admin: any, name: string) {
  const { data, error } = await admin.rpc('nexora_whatsapp_meta_secret', { p_secret_name: name });
  if (error || typeof data !== 'string' || !data) return '';
  return data;
}
async function signupConfigurationReady(admin: any, meta: ReturnType<typeof metaConfig>) {
  if (!meta.configured) return false;
  const [appSecret, verifyToken] = await Promise.all([
    vaultMetaSecret(admin, 'nexora_whatsapp_meta_app_secret'),
    vaultMetaSecret(admin, 'nexora_whatsapp_webhook_verify_token'),
  ]);
  try {
    await tokenEncryptionKey(admin);
  } catch {
    return false;
  }
  return Boolean(appSecret && verifyToken);
}
async function graph(path: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', 'Bearer ' + token);
  const response = await fetch('https://graph.facebook.com/' + GRAPH_VERSION + '/' + path, {
    ...init, headers, signal: AbortSignal.timeout(15000),
  }).catch(() => {
    // Fetch errors can include the OAuth URL (and its app secret or token).
    throw new Error('Could not reach the Meta Graph API. Start the connection again.');
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as Record<string, unknown> | undefined;
    const code = typeof error?.code === 'number' && Number.isInteger(error.code) ? ', code ' + error.code : '';
    const subcode = typeof error?.error_subcode === 'number' && Number.isInteger(error.error_subcode)
      ? ', subcode ' + error.error_subcode : '';
    throw new Error('Meta Graph API rejected setup (HTTP ' + response.status + code + subcode + '). Start the connection again.');
  }
  return payload;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const respond = (body: unknown, status = 200) => json(body, status, origin);
  const originAllowed = !origin || ALLOWED_ORIGINS.has(origin)
    || /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/.test(origin)
    || /^http:\/\/localhost(:\d+)?$/.test(origin);
  if (req.method === 'OPTIONS') return new Response(null, {
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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !authData.user || authData.user.is_anonymous) {
      return respond({ error: 'Your owner login has expired. Sign in again.' }, 401);
    }
    const ownerId = authData.user.id;
    const { data: account, error: accountError } = await admin
      .from('studioflow_accounts').select('user_id').eq('user_id', ownerId).maybeSingle();
    if (accountError || !account) return respond({ error: 'The signed-in account is not a salon owner workspace.' }, 403);

    const raw = await req.text();
    if (raw.length > 12000) return respond({ error: 'Request is too large.' }, 413);
    let body: Record<string, unknown>;
    try {
      body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    } catch {
      return respond({ error: 'Invalid WhatsApp setup request.' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return respond({ error: 'Invalid WhatsApp setup request.' }, 400);
    const action = typeof body.action === 'string' ? body.action : '';
    const meta = metaConfig();

    if (action === 'config') {
      return respond({
        configured: await signupConfigurationReady(admin, meta),
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
      if (error) return respond({ error: 'Could not load WhatsApp connection status.' }, 503);

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
        return respond({ error: 'WhatsApp dashboard metrics could not be loaded.' }, 503);
      }
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
          outboundMessages: messages.filter((row) => row.direction === 'outbound' && ['sent', 'delivered', 'read'].includes(row.delivery_status)).length,
          deliveredMessages: messages.filter((row) => row.delivery_status === 'delivered' || row.delivery_status === 'read').length,
          paymentLinks: payments.filter((row) => Boolean(row.payment_link_id)).length,
          paidPayments: payments.filter((row) => row.status === 'captured').length,
          pendingPayments: payments.filter((row) => row.status === 'created').length,
          whatsappAdvanceCollectedINR: payments.filter((row) => row.status === 'captured')
            .reduce((sum, row) => sum + Number(row.amount_paise || 0), 0) / 100,
        },
      });
    }

    if (action === 'inbox') {
      const [conversationResult, messageResult] = await Promise.all([
        admin.from('salon_whatsapp_conversations')
          .select('customer_wa_id,customer_name,conversation_status,flow_state,last_inbound_at,last_outbound_at,updated_at')
          .eq('owner_id', ownerId)
          .order('updated_at', { ascending: false })
          .limit(50),
        admin.from('salon_whatsapp_message_log')
          .select('recipient_wa_id,direction,message_kind,delivery_status,metadata,created_at')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);
      if (conversationResult.error || messageResult.error) {
        return respond({ error: 'Could not load WhatsApp conversations.' }, 503);
      }
      const messagesByRecipient = new Map<string, Array<Record<string, unknown>>>();
      for (const message of messageResult.data || []) {
        const recipient = String(message.recipient_wa_id || '');
        if (!recipient) continue;
        const rows = messagesByRecipient.get(recipient) || [];
        if (rows.length < 30) rows.push(message as Record<string, unknown>);
        messagesByRecipient.set(recipient, rows);
      }
      return respond({
        conversations: (conversationResult.data || []).map((conversation) => {
          const messages = messagesByRecipient.get(String(conversation.customer_wa_id)) || [];
          return {
            ...conversation,
            messages: messages.slice(0, 3),
            lastMessage: messages[0] || null,
            optedOut: conversation.flow_state?.optOut === true,
            needsReply: conversation.conversation_status === 'handed_off',
          };
        }),
      });
    }

    if (action === 'conversation') {
      const customerWaId = customerWhatsAppId(body.customerWaId);
      if (!customerWaId) {
        return respond({ error: 'Valid customer WhatsApp number required.' }, 400);
      }
      const [conversationResult, messagesResult] = await Promise.all([
        admin.from('salon_whatsapp_conversations')
          .select('customer_wa_id,customer_name,conversation_status,flow_state,last_inbound_at,last_outbound_at,updated_at')
          .eq('owner_id', ownerId).eq('customer_wa_id', customerWaId).maybeSingle(),
        admin.from('salon_whatsapp_message_log')
          .select('direction,message_kind,delivery_status,metadata,created_at')
          .eq('owner_id', ownerId).eq('recipient_wa_id', customerWaId)
          .order('created_at', { ascending: false }).limit(50),
      ]);
      if (conversationResult.error || messagesResult.error) {
        return respond({ error: 'Could not load this WhatsApp conversation.' }, 503);
      }
      if (!conversationResult.data) return respond({ error: 'WhatsApp conversation not found.' }, 404);
      return respond({
        conversation: {
          ...conversationResult.data,
          optedOut: conversationResult.data.flow_state?.optOut === true,
          needsReply: conversationResult.data.conversation_status === 'handed_off',
        },
        messages: (messagesResult.data || []).reverse(),
      });
    }

    if (action === 'sendReply') {
      const customerWaId = customerWhatsAppId(body.customerWaId);
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 3500) : '';
      if (!customerWaId || !message) {
        return respond({ error: 'Choose a conversation and enter a message.' }, 400);
      }
      const sent = await fetch(supabaseUrl + '/functions/v1/nexora-whatsapp-webhook', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + serviceKey,
          apikey: serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'ownerReply', ownerId, customerWaId, message }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await sent.json().catch(() => ({})) as Record<string, unknown>;
      if (!sent.ok || result.sent !== true) {
        return respond({ error: result.error || result.reason || 'WhatsApp reply could not be sent.' }, 409);
      }
      return respond({ sent: true, messageId: result.messageId || null });
    }

    if (action === 'begin') {
      if (!await signupConfigurationReady(admin, meta)) return respond({
        error: 'Meta setup is incomplete. Add META_APP_ID and META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID in Supabase Function Secrets, and add nexora_whatsapp_meta_app_secret plus nexora_whatsapp_webhook_verify_token to Supabase Vault.',
        setupRequired: true,
      }, 503);

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
      if (error) return respond({ error: 'Could not start a secure WhatsApp connection. Try again.' }, 503);
      return respond({
        state,
        appId: meta.appId,
        configId: meta.configId,
        graphVersion: GRAPH_VERSION,
        embeddedSignupVersion: SIGNUP_VERSION,
      });
    }

    if (action === 'complete') {
      if (!await signupConfigurationReady(admin, meta)) return respond({ error: 'Meta WhatsApp setup is incomplete. Check the Meta app settings and Vault secrets.' }, 503);
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const state = typeof body.state === 'string' ? body.state : '';
      const phoneNumberId = isMetaId(body.phoneNumberId) ? body.phoneNumberId : '';
      const registrationPin = body.registrationPin ?? '';
      const messagingAccountIds = Array.isArray(body.messagingAccountIds)
        ? body.messagingAccountIds.filter(isMetaId).slice(0, 20)
        : [];
      const isOnBizApp = body.isOnBizApp === true;
      const primaryWaacIds = Array.isArray(body.primaryWaacIds)
        ? body.primaryWaacIds.filter(isMetaId).slice(0, 10)
        : [];
      if (!code || code.length > 4096 || !state || state.length > 256 || !phoneNumberId) {
        return respond({ error: 'Meta did not return a valid phone number and login code.' }, 400);
      }
      if (typeof registrationPin !== 'string' || (registrationPin && !/^\d{6}$/.test(registrationPin))) {
        return respond({ error: 'The Cloud API registration PIN must have exactly six digits.' }, 400);
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
        return respond({ error: 'This WhatsApp connection session expired or was already used. Start again.' }, 409);
      }

      // Embedded Signup returns a short-lived exchangeable code in FB.login().
      // This OAuth endpoint is a GET and does not use a Bearer access token.
      const appSecret = await vaultMetaSecret(admin, 'nexora_whatsapp_meta_app_secret');
      if (!appSecret) return respond({ error: 'Meta App Secret is missing from Supabase Vault.' }, 503);
      const tokenQuery = new URLSearchParams({
        client_id: meta.appId,
        client_secret: appSecret,
        code,
      });
      const tokenResponse = await graph('oauth/access_token?' + tokenQuery.toString());
      const accessToken = typeof tokenResponse.access_token === 'string' ? tokenResponse.access_token : '';
      if (!accessToken) return respond({ error: 'Meta did not issue a WhatsApp access token. Start the connection again.' }, 502);

      // In Embedded Signup v5 the finish event can return messaging_account_ids
      // rather than a WABA ID. Resolve the actual shared WABA from Meta's
      // verified token scopes, then prove the chosen phone_number_id belongs
      // to that WABA before storing or subscribing anything.
      const debugToken = await graph(
        'debug_token?input_token=' + encodeURIComponent(accessToken),
        meta.appId + '|' + appSecret,
      );
      const debugData = debugToken.data as Record<string, unknown> | undefined;
      if (!debugData || debugData.is_valid !== true || String(debugData.app_id || '') !== meta.appId) {
        return respond({ error: 'Meta did not validate the WhatsApp signup token for this NEXORA app.' }, 403);
      }
      const granularScopes = Array.isArray(debugData.granular_scopes)
        ? debugData.granular_scopes as Array<Record<string, unknown>>
        : [];
      const permissions = new Set([
        ...(Array.isArray(debugData.scopes) ? debugData.scopes : []),
        ...granularScopes.map((scope) => scope?.scope),
      ]);
      if (!permissions.has('whatsapp_business_management') || !permissions.has('whatsapp_business_messaging')) {
        return respond({ error: 'Meta did not grant WhatsApp Business Management and Messaging. Check the Embedded Signup permissions and reconnect.' }, 403);
      }
      const targetsFor = (permission: string) => granularScopes
        .filter((scope) => scope?.scope === permission)
        .flatMap((scope) => Array.isArray(scope.target_ids) ? scope.target_ids : [])
        .filter(isMetaId);
      const managedWabaIds = targetsFor('whatsapp_business_management');
      const messagingWabaIds = targetsFor('whatsapp_business_messaging');
      const sessionWabaIds = [
        ...messagingAccountIds,
        ...(isMetaId(body.wabaId) ? [body.wabaId] : []),
      ];
      // Prefer the accounts from this signup, not an unrelated account the
      // token can also see. Check both grants when Meta supplies target IDs.
      const candidateWabaIds = Array.from(new Set(sessionWabaIds.length ? sessionWabaIds : managedWabaIds))
        .filter((id) => (!managedWabaIds.length || managedWabaIds.includes(id))
          && (!messagingWabaIds.length || messagingWabaIds.includes(id)));
      if (candidateWabaIds.length === 0) {
        return respond({ error: 'Meta did not return an accessible WhatsApp Business Account for this number.' }, 403);
      }

      let wabaId = '';
      let phone: Record<string, unknown> | null = null;
      for (const candidateWabaId of candidateWabaIds) {
        const phoneList = await graph(
          encodeURIComponent(candidateWabaId) + '/phone_numbers?fields=id,display_phone_number,verified_name&limit=100',
          accessToken,
        );
        const phoneRows = Array.isArray(phoneList.data)
          ? phoneList.data as Array<Record<string, unknown>>
          : [];
        const match = phoneRows.find((row) => row.id === phoneNumberId);
        if (match && typeof match.display_phone_number === 'string') {
          if (wabaId) return respond({ error: 'Meta returned more than one Messaging account for this number. Select a single WhatsApp account and reconnect.' }, 409);
          wabaId = candidateWabaId;
          phone = match;
        }
      }
      if (!wabaId || !phone) {
        return respond({ error: 'The selected phone number could not be verified under an accessible WhatsApp Business Account.' }, 403);
      }

      const { data: assigned, error: assignmentError } = await admin.from('salon_whatsapp_connections')
        .select('owner_id').eq('phone_number_id', phoneNumberId).maybeSingle();
      if (assignmentError) return respond({ error: 'Could not check the existing WhatsApp number assignment.' }, 503);
      if (assigned && assigned.owner_id !== ownerId) {
        return respond({ error: 'This WhatsApp phone number is already connected to another salon account.' }, 409);
      }

      const keyBytes = await tokenEncryptionKey(admin);
      const encrypted = await encryptToken(accessToken, keyBytes);
      if (!isOnBizApp) {
        const registration = await graph(encodeURIComponent(phoneNumberId) + '?fields=status,code_verification_status,platform_type', accessToken);
        if (registration.platform_type === 'ON_PREMISE') {
          return respond({ error: 'This number is not a Cloud API sender. Select a separate Cloud API number; this setup does not migrate existing numbers.' }, 409);
        }
        if (registration.status !== 'CONNECTED' || registration.platform_type !== 'CLOUD_API') {
          // Verification alone is not enough; never attempt registration on an
          // already assigned platform, an unknown state, or a migration.
          if (registration.status !== 'PENDING' || registration.code_verification_status !== 'VERIFIED'
            || registration.platform_type !== 'NOT_APPLICABLE') {
            return respond({ error: 'Meta has not marked this number ready for new Cloud API registration. Check its status in WhatsApp Manager; do not migrate an existing provider number here.' }, 409);
          }
          if (!registrationPin) {
            return respond({ error: 'This number needs Cloud API registration. Start setup again and enter its six-digit two-step PIN before continuing in Meta.' }, 409);
          }
          const registered = await graph(encodeURIComponent(phoneNumberId) + '/register', accessToken, {
            method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', pin: registrationPin }),
          });
          if (registered.success !== true) return respond({ error: 'Meta did not confirm Cloud API phone registration.' }, 502);
        }
      }

      const subscription = await graph(
        encodeURIComponent(wabaId) + '/subscribed_apps',
        accessToken,
        { method: 'POST', body: JSON.stringify({}) },
      );
      if (subscription.success !== true) return respond({ error: 'Meta did not subscribe this WhatsApp account to webhook events.' }, 502);

      const expiresIn = Number(tokenResponse.expires_in || 0);
      const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
      const connectionMode = isOnBizApp ? 'coexistence' : 'standard';
      const { error: saveError } = await admin.from('salon_whatsapp_connections').upsert({
        owner_id: ownerId,
        salon_id: null,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        business_id: isMetaId(body.businessId) ? body.businessId : null,
        display_phone_number: phone.display_phone_number,
        verified_name: typeof phone.verified_name === 'string' ? phone.verified_name : null,
        connection_status: 'pending',
        ...encrypted,
        token_key_version: 1,
        token_expires_at: expiresAt,
        webhook_subscribed: true,
        connected_by: ownerId,
        connected_at: null,
        disconnected_at: null,
        connection_mode: connectionMode,
        is_on_biz_app: isOnBizApp,
        platform_type: 'cloud_api',
        primary_waac_ids: primaryWaacIds,
        provider_metadata: {
          graph_version: GRAPH_VERSION,
          embedded_signup_version: 'v5',
          token_type: typeof tokenResponse.token_type === 'string' ? tokenResponse.token_type : 'bearer',
          expires_at: expiresAt,
          waba_id: wabaId,
          messaging_account_ids: messagingAccountIds.length ? messagingAccountIds : [wabaId],
          phone_number_id: phoneNumberId,
          is_on_biz_app: isOnBizApp,
          primary_waac_ids: primaryWaacIds,
        },
      }, { onConflict: 'owner_id' });
      if (saveError) {
        if (saveError.code === '23505') return respond({ error: 'This WhatsApp phone number is already connected to another salon account.' }, 409);
        return respond({ error: 'Meta connected the number, but NEXORA could not safely save the connection. Contact support before connecting another number.' }, 503);
      }
      return respond({
        ok: true,
        connection: {
          connection_status: 'pending',
          display_phone_number: phone.display_phone_number,
          verified_name: typeof phone.verified_name === 'string' ? phone.verified_name : null,
          webhook_subscribed: true,
          connected_at: null,
          connection_mode: connectionMode,
          is_on_biz_app: isOnBizApp,
        },
      });
    }

    if (action === 'disconnect') {
      const { error } = await admin.from('salon_whatsapp_connections')
        .update({ connection_status: 'disconnected', disconnected_at: new Date().toISOString(), webhook_subscribed: false, access_token_ciphertext: '', access_token_iv: '' })
        .eq('owner_id', ownerId);
      if (error) return respond({ error: 'Could not disconnect this WhatsApp number.' }, 503);
      return respond({ ok: true, disconnected: true });
    }

    return respond({ error: 'Unknown WhatsApp connection action.' }, 400);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'WhatsApp connection could not be completed.' }, 400);
  }
});
