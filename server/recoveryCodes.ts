/**
 * MFA recovery-code endpoints — the one path that must work at AAL1 for an
 * account whose authenticator is lost.
 *
 * Why this exists instead of direct browser RPCs: every authenticated Data
 * API request passes the PostgREST pre-request hook
 * (`studioflow_check_rest_session`), which rejects AAL1 sessions with
 * enrolled factors. A lost-authenticator user could never reach the RPCs
 * that free them. These two endpoints run on the Node/Vercel side with the
 * service role, after the caller's bearer token has been verified.
 *
 *   consume  POST /api/account/recovery-codes/consume
 *   active   GET  /api/account/recovery-codes/active
 *
 * Security properties:
 *  - Base authentication is mandatory (401 otherwise); AAL2 is deliberately
 *    NOT required here — that is the whole point of a recovery code.
 *  - The user id comes from the verified token, never from the body.
 *  - Consumption is single-use, throttled per account (10 attempts /
 *    10 minutes) inside the database function itself.
 *  - Codes are stored only as SHA-256(salt || ':' || normalized code) — the
 *    database never sees a plaintext code.
 *  - No endpoint reveals whether a code exists beyond the consume result.
 */

import { RECOVERY_CONSUME_SCHEMA, safeOutboundFetch, validateBody } from './httpValidation.js';
import { resolveAuthConfiguration, verifyAccessToken } from './supabaseAuth.js';
import { resolveServiceRoleConfiguration } from './distributedRateLimit.js';

type JsonResponder = {
  status: (code: number) => JsonResponder;
  json: (body: unknown) => unknown;
  setHeader?: (name: string, value: string) => unknown;
};

type RecoveryRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | undefined;
};

function json(res: JsonResponder, status: number, body: unknown, retryAfter?: number) {
  res.status(status);
  if (res.setHeader) {
    res.setHeader('Cache-Control', 'no-store');
    if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
  }
  return res.json(body);
}

function bearer(req: RecoveryRequest): string {
  const direct = req.get?.('authorization');
  const raw = direct ?? req.headers?.authorization ?? req.headers?.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const match = typeof value === 'string' ? value.match(/^Bearer\s+(\S+)$/i) : null;
  return match ? match[1] : '';
}

/** Strips separators and upper-cases — the same normalization the DB applies. */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function verifyBaseSession(req: RecoveryRequest) {
  const config = resolveAuthConfiguration();
  if (!config.configured) return { error: 'unavailable' as const };
  const token = bearer(req);
  if (!token) return { error: 'unauthenticated' as const };
  const user = await verifyAccessToken(token, config);
  if (user === undefined) return { error: 'unavailable' as const };
  if (user === null) return { error: 'unauthenticated' as const };
  return { user, token };
}

export async function recoveryActiveHandler(req: RecoveryRequest, res: JsonResponder) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader?.('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  const session = await verifyBaseSession(req);
  if ('error' in session) {
    if (session.error === 'unauthenticated') {
      return json(res, 401, { active: false, error: 'Sign in to continue.', code: 'auth_required' });
    }
    return json(res, 503, { active: false, error: 'Sign-in verification is temporarily unavailable.', code: 'auth_unavailable' });
  }
  // The base verification already accounts for the recovery window: at AAL1
  // with an enrolled factor, `mfaRequired === false` can only mean the window
  // is active. Fail closed on anything else.
  return json(res, 200, { active: session.user.mfaRequired === false });
}

export async function recoveryConsumeHandler(req: RecoveryRequest, res: JsonResponder) {
  if (req.method && req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  const session = await verifyBaseSession(req);
  if ('error' in session) {
    if (session.error === 'unauthenticated') {
      return json(res, 401, { consumed: false, error: 'Your session expired. Sign in again.', code: 'invalid_session' });
    }
    return json(res, 503, { consumed: false, error: 'Sign-in verification is temporarily unavailable.', code: 'auth_unavailable' });
  }
  const bodyResult = validateBody(req.body, RECOVERY_CONSUME_SCHEMA, 4 * 1024);
  if (bodyResult.ok === false) {
    return json(res, bodyResult.status, {
      consumed: false,
      error: 'That recovery code is not valid, or it was already used.',
      code: 'invalid_recovery_code',
    });
  }
  const code = normalizeRecoveryCode(String(bodyResult.data.code ?? ''));
  if (code.length < 16 || code.length > 32) {
    return json(res, 400, {
      consumed: false,
      error: 'That recovery code is not valid, or it was already used.',
      code: 'invalid_recovery_code',
    });
  }
  const service = resolveServiceRoleConfiguration();
  if (!service.configured) {
    return json(res, 503, {
      consumed: false,
      error: 'Recovery codes are not configured on this server yet. Contact support.',
      code: 'recovery_unavailable',
    });
  }
  try {
    const response = await safeOutboundFetch(`${service.url}/rest/v1/rpc/studioflow_mfa_recovery_codes_consume`, {
      method: 'POST',
      headers: {
        apikey: service.serviceKey,
        Authorization: `Bearer ${service.serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: session.user.id, p_code: code }),
      signal: AbortSignal.timeout(5_000),
    });
    const body = (await response.json().catch(() => null)) as {
      consumed?: boolean;
      reason?: string;
      retryAfterSeconds?: number;
    } | null;
    if (!response.ok || !body || typeof body.consumed !== 'boolean') {
      return json(res, 503, {
        consumed: false,
        error: 'Recovery is temporarily unavailable. Try again shortly.',
        code: 'recovery_unavailable',
      });
    }
    if (body.consumed === true) {
      return json(res, 200, { consumed: true, recoveryWindowSeconds: 600 });
    }
    if (body.reason === 'throttled') {
      const retryAfter = Math.max(1, Number(body.retryAfterSeconds) || 600);
      return json(res, 429, {
        consumed: false,
        error: `Too many recovery attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        code: 'rate_limited',
        retryAfterSeconds: retryAfter,
      }, retryAfter);
    }
    return json(res, 400, {
      consumed: false,
      error: 'That recovery code is not valid, or it was already used.',
      code: 'invalid_recovery_code',
    });
  } catch {
    return json(res, 503, {
      consumed: false,
      error: 'Recovery is temporarily unavailable. Try again shortly.',
      code: 'recovery_unavailable',
    });
  }
}
