// NEXORA Staff Attendance API
// Owner actions are authorized with a real Supabase user JWT.
// Biometric punches require a verified WebAuthn assertion.
// External attendance machines may push signed-by-device-key events to this endpoint.
import { createClient } from '@supabase/supabase-js';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RP_NAME = 'NEXORA SalonOS';
const encoder = new TextEncoder();

const BASE_CORS = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

function allowedOrigin(origin: string) {
  if (!origin) return true;
  return origin === 'https://nexorasalon.online'
    || origin === 'https://www.nexorasalon.online'
    || /^https:\/\/[a-z0-9-]+\.nexorasalon\.online$/.test(origin)
    || origin === 'http://localhost:5173'
    || /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/.test(origin);
}

function corsHeaders(origin: string) {
  return allowedOrigin(origin) && origin
    ? { ...BASE_CORS, 'Access-Control-Allow-Origin': origin }
    : BASE_CORS;
}

function json(body: unknown, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function base64url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlToBase64(value: string) {
  const base = value.replace(/-/g, '+').replace(/_/g, '/');
  return base + '='.repeat((4 - base.length % 4) % 4);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

function cleanText(value: unknown, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function webAuthnOrigin(origin: string) {
  if (!origin || !allowedOrigin(origin)) throw new Error('This website origin is not allowed for biometric attendance.');
  const url = new URL(origin);
  const host = url.hostname.toLowerCase();
  const rpID = host === 'www.nexorasalon.online' ? 'nexorasalon.online'
    : host === 'nexorasalon.online' ? 'nexorasalon.online'
    : host.endsWith('.nexorasalon.online') ? 'nexorasalon.online'
    : host === 'localhost' ? 'localhost'
    : host.endsWith('.vercel.app') ? host
    : '';
  if (!rpID) throw new Error('Biometric verification is not enabled for this website domain.');
  return { origin, rpID };
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ownerFromRequest(req: Request) {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token || !SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Salon owner sign-in is required.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous) throw new Error('Your salon owner session has expired. Sign in again.');
  const ownerId = data.user.id;
  const { data: account, error: accountError } = await admin
    .from('studioflow_accounts').select('user_id').eq('user_id', ownerId).maybeSingle();
  if (accountError || !account) throw new Error('This signed-in account is not a salon owner workspace.');
  return ownerId;
}

async function getStaff(ownerId: string, staffKey: string) {
  const { data, error } = await admin
    .from('salon_staff_attendance_profiles')
    .select('staff_key,staff_name,staff_role,staff_code,active')
    .eq('owner_id', ownerId)
    .eq('staff_key', staffKey)
    .eq('active', true)
    .maybeSingle();
  if (error || !data) throw new Error('Active staff member not found. Refresh the attendance roster.');
  return data;
}

async function saveChallenge(args: {
  ownerId: string; staffKey: string; purpose: 'registration' | 'authentication';
  challenge: string; rpID: string; origin: string;
}) {
  const { data, error } = await admin.from('salon_staff_attendance_webauthn_challenges')
    .insert({
      owner_id: args.ownerId,
      staff_key: args.staffKey,
      purpose: args.purpose,
      challenge: args.challenge,
      rp_id: args.rpID,
      origin: args.origin,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error('Could not save the biometric verification challenge.');
  return data.id as string;
}

async function claimChallenge(ownerId: string, staffKey: string, challengeId: string, purpose: 'registration' | 'authentication') {
  const { data: challenge, error } = await admin.from('salon_staff_attendance_webauthn_challenges')
    .select('id,challenge,rp_id,origin,expires_at,used_at')
    .eq('id', challengeId)
    .eq('owner_id', ownerId)
    .eq('staff_key', staffKey)
    .eq('purpose', purpose)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !challenge) throw new Error('Biometric session expired or has already been used. Start again.');
  const { data: claimed, error: claimError } = await admin
    .from('salon_staff_attendance_webauthn_challenges')
    .update({ used_at: new Date().toISOString() })
    .eq('id', challenge.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle();
  if (claimError || !claimed) throw new Error('Biometric challenge was already used. Start again.');
  return challenge;
}

async function servicePunch(ownerId: string, staffKey: string, action: string, method: 'manual' | 'biometric' | 'device', body: Record<string, unknown>, deviceId?: string, providerEventId?: string) {
  const eventAt = typeof body.occurredAt === 'string' ? new Date(body.occurredAt) : new Date();
  if (Number.isNaN(eventAt.getTime())) throw new Error('Attendance time is invalid.');
  const { data, error } = await admin.rpc('salon_staff_attendance_service_punch', {
    p_owner_id: ownerId,
    p_staff_key: staffKey,
    p_action: action,
    p_method: method,
    p_notes: cleanText(body.notes, 1000),
    p_lat: typeof body.latitude === 'number' ? body.latitude : null,
    p_lng: typeof body.longitude === 'number' ? body.longitude : null,
    p_accuracy_m: typeof body.accuracyM === 'number' ? body.accuracyM : null,
    p_device_id: deviceId || null,
    p_provider_event_id: providerEventId || null,
    p_event_at: eventAt.toISOString(),
  });
  if (error) throw new Error(error.message || 'Attendance punch could not be saved.');
  return data;
}

async function ownerAction(ownerId: string, body: Record<string, unknown>, origin: string) {
  const action = cleanText(body.action, 60);
  const staffKey = cleanText(body.staffKey, 120);

  if (action === 'manualPunch') {
    await getStaff(ownerId, staffKey);
    const punchAction = cleanText(body.punchAction, 30);
    return { result: await servicePunch(ownerId, staffKey, punchAction, 'manual', body) };
  }

  if (action === 'manualStatus') {
    await getStaff(ownerId, staffKey);
    const attendanceDate = cleanText(body.attendanceDate, 10);
    const status = cleanText(body.status, 30);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) throw new Error('Choose a valid attendance date.');
    const { data, error } = await admin.rpc('salon_staff_attendance_service_mark_status', {
      p_owner_id: ownerId, p_staff_key: staffKey, p_attendance_date: attendanceDate,
      p_status: status, p_notes: cleanText(body.notes, 1000),
    });
    if (error) throw new Error(error.message || 'Attendance status could not be saved.');
    return { result: data };
  }

  if (action === 'deactivateStaff') {
    const staff = await getStaff(ownerId, staffKey);
    const { data: openShift, error: openShiftError } = await admin
      .from('salon_staff_attendance_records')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('staff_key', staffKey)
      .not('check_in', 'is', null)
      .is('check_out', null)
      .limit(1)
      .maybeSingle();
    if (openShiftError) throw new Error('Could not verify the staff member’s open shift.');
    if (openShift) throw new Error('Complete this staff member’s check-out before deactivating the profile.');

    const { data: deactivated, error: deactivateError } = await admin
      .from('salon_staff_attendance_profiles')
      .update({ active: false, manually_deactivated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('owner_id', ownerId)
      .eq('staff_key', staffKey)
      .eq('active', true)
      .select('staff_key')
      .maybeSingle();
    if (deactivateError || !deactivated) throw new Error('Staff profile could not be deactivated.');

    const { error: auditError } = await admin.from('salon_staff_attendance_events').insert({
      owner_id: ownerId,
      staff_key: staffKey,
      event_type: 'staff_deactivated',
      method: 'system',
      actor_id: ownerId,
      notes: 'Staff attendance profile deactivated by salon owner',
    });
    if (auditError) {
      await admin.from('salon_staff_attendance_profiles')
        .update({ active: true, manually_deactivated_at: null, updated_at: new Date().toISOString() })
        .eq('owner_id', ownerId).eq('staff_key', staffKey);
      throw new Error('Deactivation was rolled back because its audit event could not be saved.');
    }
    return { deactivated: true, staffName: staff.staff_name };
  }

  if (action === 'reactivateStaff') {
    const { data: staff, error: staffError } = await admin.from('salon_staff_attendance_profiles')
      .select('staff_key,staff_name,active')
      .eq('owner_id', ownerId)
      .eq('staff_key', staffKey)
      .eq('active', false)
      .not('manually_deactivated_at', 'is', null)
      .maybeSingle();
    if (staffError || !staff) throw new Error('Inactive staff profile not found.');
    const { data: reactivated, error: reactivateError } = await admin
      .from('salon_staff_attendance_profiles')
      .update({ active: true, manually_deactivated_at: null, updated_at: new Date().toISOString() })
      .eq('owner_id', ownerId)
      .eq('staff_key', staffKey)
      .eq('active', false)
      .select('staff_key')
      .maybeSingle();
    if (reactivateError || !reactivated) throw new Error('Staff profile could not be reactivated.');

    const { error: auditError } = await admin.from('salon_staff_attendance_events').insert({
      owner_id: ownerId,
      staff_key: staffKey,
      event_type: 'staff_reactivated',
      method: 'system',
      actor_id: ownerId,
      notes: 'Staff attendance profile reactivated by salon owner',
    });
    if (auditError) {
      await admin.from('salon_staff_attendance_profiles')
        .update({ active: false, manually_deactivated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('owner_id', ownerId).eq('staff_key', staffKey);
      throw new Error('Reactivation was rolled back because its audit event could not be saved.');
    }
    return { reactivated: true, staffName: staff.staff_name };
  }

  if (action === 'listBiometrics') {
    if (staffKey) await getStaff(ownerId, staffKey);
    let query = admin.from('salon_staff_attendance_biometrics')
      .select('id,staff_key,friendly_name,device_type,backed_up,last_used_at,created_at')
      .eq('owner_id', ownerId).is('revoked_at', null).order('created_at', { ascending: false });
    if (staffKey) query = query.eq('staff_key', staffKey);
    const { data, error } = await query;
    if (error) throw new Error('Could not load biometric enrolments.');
    return { credentials: data || [] };
  }

  if (action === 'registerOptions') {
    const staff = await getStaff(ownerId, staffKey);
    const { origin: expectedOrigin, rpID } = webAuthnOrigin(origin);
    const { data: existing, error } = await admin.from('salon_staff_attendance_biometrics')
      .select('credential_id,transports').eq('owner_id', ownerId).eq('staff_key', staffKey).is('revoked_at', null);
    if (error) throw new Error('Could not load existing biometric registrations.');
    const webAuthnUserIdDigest = await crypto.subtle.digest('SHA-256', encoder.encode(ownerId + ':' + staffKey));
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: new Uint8Array(webAuthnUserIdDigest),
      userName: staff.staff_code || staff.staff_key,
      userDisplayName: staff.staff_name,
      attestationType: 'none',
      supportedAlgorithmIDs: [-7, -257],
      excludeCredentials: (existing || []).map((item) => ({
        id: item.credential_id,
        transports: item.transports,
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
    });
    const challengeId = await saveChallenge({
      ownerId, staffKey, purpose: 'registration', challenge: options.challenge, rpID, origin: expectedOrigin,
    });
    return { options, challengeId };
  }

  if (action === 'registerVerify') {
    await getStaff(ownerId, staffKey);
    const challengeId = cleanText(body.challengeId, 80);
    const response = body.credential as Record<string, unknown> | undefined;
    if (!challengeId || !response || typeof response !== 'object') throw new Error('Biometric registration response is incomplete.');
    const challenge = await claimChallenge(ownerId, staffKey, challengeId, 'registration');
    const verification = await verifyRegistrationResponse({
      response: response as never,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rp_id,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) throw new Error('The phone or device did not verify the staff biometric.');
    const info = verification.registrationInfo;
    const credential = info.credential;
    const friendlyName = cleanText(body.friendlyName, 120) || 'Staff biometric device';
    const { data: saved, error } = await admin.from('salon_staff_attendance_biometrics').insert({
      owner_id: ownerId,
      staff_key: staffKey,
      credential_id: credential.id,
      public_key_b64: base64url(credential.publicKey),
      sign_count: credential.counter,
      transports: credential.transports || [],
      device_type: info.credentialDeviceType,
      backed_up: info.credentialBackedUp,
      friendly_name: friendlyName,
    }).select('id').single();
    if (error || !saved) throw new Error('Biometric credential could not be saved. It may already be enrolled.');
    const { error: auditError } = await admin.from('salon_staff_attendance_events').insert({
      owner_id: ownerId,
      staff_key: staffKey,
      event_type: 'biometric_enrolled',
      method: 'biometric',
      actor_id: ownerId,
      notes: 'Staff biometric credential enrolled',
      metadata: { credentialRecordId: saved.id, friendlyName, credentialDeviceType: info.credentialDeviceType, credentialBackedUp: info.credentialBackedUp },
    });
    if (auditError) {
      await admin.from('salon_staff_attendance_biometrics')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', saved.id).eq('owner_id', ownerId);
      throw new Error('The biometric credential was not activated because its audit event could not be saved.');
    }
    return { verified: true, staffKey, friendlyName };
  }

  if (action === 'authenticationOptions') {
    await getStaff(ownerId, staffKey);
    const { origin: expectedOrigin, rpID } = webAuthnOrigin(origin);
    const { data: credentials, error } = await admin.from('salon_staff_attendance_biometrics')
      .select('credential_id,transports').eq('owner_id', ownerId).eq('staff_key', staffKey).is('revoked_at', null);
    if (error || !credentials?.length) throw new Error('No biometric device is enrolled for this staff member.');
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((item) => ({
        id: item.credential_id,
        transports: item.transports,
      })),
      userVerification: 'required',
    });
    const challengeId = await saveChallenge({
      ownerId, staffKey, purpose: 'authentication', challenge: options.challenge, rpID, origin: expectedOrigin,
    });
    return { options, challengeId };
  }

  if (action === 'authenticationVerify') {
    await getStaff(ownerId, staffKey);
    const challengeId = cleanText(body.challengeId, 80);
    const response = body.credential as Record<string, unknown> | undefined;
    if (!challengeId || !response || typeof response !== 'object') throw new Error('Biometric response is incomplete.');
    const challenge = await claimChallenge(ownerId, staffKey, challengeId, 'authentication');
    const credentialId = cleanText(response.id, 1200);
    const { data: stored, error } = await admin.from('salon_staff_attendance_biometrics')
      .select('id,credential_id,public_key_b64,sign_count,transports')
      .eq('owner_id', ownerId).eq('staff_key', staffKey).eq('credential_id', credentialId)
      .is('revoked_at', null).maybeSingle();
    if (error || !stored) throw new Error('This biometric device is not registered to the selected staff member.');
    const verification = await verifyAuthenticationResponse({
      response: response as never,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rp_id,
      credential: {
        id: stored.credential_id,
        publicKey: base64ToBytes(base64urlToBase64(stored.public_key_b64)),
        counter: Number(stored.sign_count),
        transports: stored.transports,
      },
      requireUserVerification: true,
    });
    if (!verification.verified) throw new Error('Biometric verification failed.');
    const { data: updatedCredential, error: updateError } = await admin.from('salon_staff_attendance_biometrics')
      .update({
        sign_count: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      }).eq('id', stored.id).eq('owner_id', ownerId).eq('sign_count', Number(stored.sign_count))
      .select('id').maybeSingle();
    if (updateError || !updatedCredential) throw new Error('This biometric credential was used by another request. Retry attendance verification.');
    const punchAction = cleanText(body.punchAction, 30);
    const result = await servicePunch(ownerId, staffKey, punchAction, 'biometric', body);
    return { verified: true, result };
  }

  if (action === 'revokeBiometric') {
    const credentialId = cleanText(body.credentialId, 1200);
    if (!credentialId) throw new Error('Select a biometric registration to revoke.');
    const { data, error } = await admin.from('salon_staff_attendance_biometrics')
      .update({ revoked_at: new Date().toISOString() })
      .eq('owner_id', ownerId).eq('staff_key', staffKey).eq('id', credentialId).is('revoked_at', null)
      .select('id').maybeSingle();
    if (error || !data) throw new Error('Biometric registration could not be revoked.');
    const { error: auditError } = await admin.from('salon_staff_attendance_events').insert({
      owner_id: ownerId,
      staff_key: staffKey,
      event_type: 'biometric_revoked',
      method: 'biometric',
      actor_id: ownerId,
      notes: 'Staff biometric credential revoked',
      metadata: { credentialRecordId: data.id },
    });
    if (auditError) {
      await admin.from('salon_staff_attendance_biometrics')
        .update({ revoked_at: null })
        .eq('id', data.id).eq('owner_id', ownerId);
      throw new Error('Biometric revocation was rolled back because its audit event could not be saved.');
    }
    return { revoked: true };
  }

  if (action === 'listDevices') {
    const { data, error } = await admin.from('salon_staff_attendance_devices')
      .select('id,device_name,vendor,model,protocol,active,last_seen_at,created_at')
      .eq('owner_id', ownerId).order('created_at', { ascending: false });
    if (error) throw new Error('Could not load attendance devices.');
    return { devices: data || [] };
  }

  if (action === 'listDeviceEvents') {
    const { data, error } = await admin.from('salon_staff_attendance_device_events')
      .select('id,device_id,provider_event_id,staff_key,event_type,occurred_at,processing_status,received_at')
      .eq('owner_id', ownerId)
      .order('received_at', { ascending: false })
      .limit(100);
    if (error) throw new Error('Could not load attendance device history.');
    return { events: data || [] };
  }

  if (action === 'createDevice') {
    const name = cleanText(body.deviceName, 100);
    if (name.length < 2) throw new Error('Enter a device name.');
    const token = randomToken();
    const { data, error } = await admin.from('salon_staff_attendance_devices').insert({
      owner_id: ownerId,
      device_name: name,
      vendor: cleanText(body.vendor, 80) || 'Generic',
      model: cleanText(body.model, 100),
      protocol: 'http_push',
      api_key_hash: await sha256(token),
    }).select('id,device_name,vendor,model,protocol,created_at').single();
    if (error || !data) throw new Error('Attendance device could not be registered.');
    return { device: data, apiKey: token, endpoint: SUPABASE_URL + '/functions/v1/staff-attendance-biometric' };
  }

  if (action === 'revokeDevice') {
    const deviceId = cleanText(body.deviceId, 80);
    const { data, error } = await admin.from('salon_staff_attendance_devices')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('owner_id', ownerId).eq('id', deviceId).eq('active', true).select('id').maybeSingle();
    if (error || !data) throw new Error('Device could not be revoked.');
    return { revoked: true };
  }

  throw new Error('Unknown staff attendance action.');
}

async function devicePunch(req: Request, body: Record<string, unknown>) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Device API key required.');
  const { data: device, error } = await admin.from('salon_staff_attendance_devices')
    .select('id,owner_id,active').eq('api_key_hash', await sha256(token)).maybeSingle();
  if (error || !device || !device.active) throw new Error('Device API key is invalid or revoked.');
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount, error: rateError } = await admin
    .from('salon_staff_attendance_device_events')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', device.id)
    .gte('received_at', since);
  if (rateError) throw new Error('Attendance device rate limit could not be checked.');
  if ((recentCount || 0) >= 60) throw new Error('Attendance device rate limit exceeded. Retry after one minute.');

  const employeeCode = cleanText(body.employeeCode, 40).toUpperCase();
  const eventType = cleanText(body.eventType, 30);
  const providerEventId = cleanText(body.eventId, 120);
  if (!/^[A-Z0-9][A-Z0-9._/-]{0,39}$/.test(employeeCode) || !providerEventId || !['check_in','check_out'].includes(eventType)) {
    throw new Error('Device event needs employeeCode, eventId and check_in/check_out eventType.');
  }
  const eventAt = typeof body.occurredAt === 'string' ? new Date(body.occurredAt) : new Date();
  if (Number.isNaN(eventAt.getTime())) throw new Error('Device event time is invalid.');
  const { data: profile, error: profileError } = await admin.from('salon_staff_attendance_profiles')
    .select('staff_key,staff_name').eq('owner_id', device.owner_id).eq('staff_code', employeeCode).eq('active', true).maybeSingle();
  if (profileError || !profile) throw new Error('Employee code is not mapped to an active staff member.');
  const deviceNotes = cleanText(body.notes, 500);
  const digest = await sha256(JSON.stringify({ employeeCode, eventType, providerEventId, occurredAt: eventAt.toISOString(), notes: deviceNotes }));
  const { data: result, error: punchError } = await admin.rpc('salon_staff_attendance_service_device_punch', {
    p_owner_id: device.owner_id,
    p_device_id: device.id,
    p_staff_key: profile.staff_key,
    p_provider_event_id: providerEventId,
    p_event_type: eventType,
    p_event_at: eventAt.toISOString(),
    p_notes: deviceNotes,
    p_payload_digest: digest,
  });
  if (punchError || !result?.accepted) {
    throw new Error(punchError?.message || 'Attendance device event was not accepted.');
  }
  return { ...result, staffName: result.staffName || profile.staff_name };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  if (req.method === 'OPTIONS') return new Response(null, { status: allowedOrigin(origin) ? 204 : 403, headers: corsHeaders(origin) });
  if (origin && !allowedOrigin(origin)) return json({ error: 'Origin not allowed.' }, 403, origin);
  if (req.method !== 'POST') return json({ error: 'POST required.' }, 405, origin);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'Attendance service is not configured.' }, 503, origin);

  try {
    const raw = await req.text();
    if (!raw || raw.length > 24000) return json({ error: 'Request body is missing or too large.' }, 400, origin);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw) as Record<string, unknown>; }
    catch { return json({ error: 'Request body must be valid JSON.' }, 400, origin); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Request body must be a JSON object.' }, 400, origin);

    if (body.action === 'devicePunch') {
      const result = await devicePunch(req, body);
      return json(result, 200, origin);
    }

    const ownerId = await ownerFromRequest(req);
    const result = await ownerAction(ownerId, body, origin);
    return json(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Attendance request failed.';
    const lower = message.toLowerCase();
    const status = lower.includes('rate limit') ? 429
      : lower.includes('not a salon owner workspace') || lower.includes('owner access required') || lower.includes('origin is not allowed') ? 403
      : lower.includes('sign-in is required') || lower.includes('session has expired') || lower.includes('device api key required') || lower.includes('device api key is invalid') ? 401
      : 400;
    return json({ error: message }, status, origin);
  }
});
