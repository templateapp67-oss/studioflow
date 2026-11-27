import { createHash } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { readServerEnvironment } from './nexoraEnv.js';
import { resolveServiceRoleConfiguration } from './distributedRateLimit.js';
import { safeLogger } from './safeLogger.js';

/**
 * Supabase access-token verification for the AI routes.
 *
 * Every AI route forwards to a paid provider, so an anonymous caller must not be
 * able to invoke it indefinitely. The token is verified against the Supabase
 * Auth server with the project's publishable key — the same key that is already
 * public in the browser bundle — and the privileged service-role key is never
 * needed or sent.
 *
 * Design notes:
 *  - The token itself is never stored: the cache is keyed by its SHA-256 digest.
 *  - A positive result is cached for 60 s to avoid an Auth round trip on every
 *    generation, and the cache is bounded.
 *  - A missing or malformed token is rejected (401) as soon as the project is
 *    configured, so an expired session fails visibly instead of silently
 *    consuming quota.
 *  - Routes requiring authentication fail closed when Auth is unavailable.
 */

/** Public publishable key already shipped to browsers by `src/lib/supabase.ts`. */
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH';

export interface AuthUser {
  id: string;
  email?: string;
  /** Supabase role from the token, e.g. `authenticated`. */
  role?: string;
  mfaRequired: boolean;
}

export interface AuthConfiguration {
  url: string;
  publishableKey: string;
  configured: boolean;
}

const readValue = (source: NodeJS.ProcessEnv, name: string): string =>
  (source[name] || '').trim().replace(/^['"]|['"]$/g, '');

/**
 * Resolves the Auth endpoint and the publishable key that verifies tokens.
 * Server variables win, then the browser `VITE_*` names that may already be set
 * on the deployment, then the public default key.
 */
export function resolveAuthConfiguration(source: NodeJS.ProcessEnv = process.env): AuthConfiguration {
  const env = readServerEnvironment(source, false);
  const publishableKey =
    readValue(source, 'SUPABASE_PUBLISHABLE_KEY') ||
    readValue(source, 'SUPABASE_ANON_KEY') ||
    readValue(source, 'VITE_SUPABASE_PUBLISHABLE_KEY') ||
    readValue(source, 'VITE_SUPABASE_ANON_KEY') ||
    DEFAULT_PUBLISHABLE_KEY;
  // A secret key in a browser-style variable must never be used for verification.
  const looksPrivileged = /^sb_secret_|service_role/.test(publishableKey);
  return {
    url: env.supabaseUrl,
    publishableKey: looksPrivileged ? '' : publishableKey,
    configured: Boolean(env.supabaseUrl && publishableKey && !looksPrivileged),
  };
}

/** Extracts a bearer token from the Authorization header, rejecting odd shapes. */
export function readBearerToken(headers: Request['headers']): string | null {
  const raw = headers?.authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const match = value.match(/^Bearer\s+([A-Za-z0-9\-._~+/]+=*)$/i);
  return match ? match[1] : null;
}

export interface TokenClaims {
  aal?: string;
  exp?: number;
}

/** Safely decodes the JWT payload. The token was already verified by Auth. */
export function tokenClaims(token: string): TokenClaims {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as Record<string, unknown>;
    return {
      aal: typeof parsed?.aal === 'string' ? parsed.aal : undefined,
      exp: Number.isFinite(Number(parsed?.exp)) ? Number(parsed.exp) : undefined,
    };
  } catch {
    return {};
  }
}

export function hasVerifiedFactor(factors?: { status?: string }[] | null): boolean {
  return Array.isArray(factors) && factors.some((factor) => factor && factor.status === 'verified');
}

/**
 * The second-factor rule shared by every gate: an account with a verified
 * authenticator factor must present an AAL2 session; an account without one
 * is governed by the base password check alone. This mirrors the database
 * pre-request hook (`studioflow_private.mfa_session_allowed`).
 */
export function secondFactorSatisfied(
  claims: TokenClaims | null,
  factors?: { status?: string }[] | null,
): boolean {
  if (!hasVerifiedFactor(factors)) return true;
  return claims?.aal === 'aal2';
}

interface CacheEntry {
  user: AuthUser;
  expiresAt: number;
}

const userCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 500;

const digest = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * Verifies one access token against Supabase Auth.
 *
 * @returns the user for a valid token, `null` for an invalid/expired token, and
 * `undefined` when verification could not be performed (network/configuration),
 * so the caller can distinguish "deny" from "cannot check".
 */
export async function verifyAccessToken(
  token: string,
  config: AuthConfiguration,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthUser | null | undefined> {
  if (!config.configured) return undefined;
  const key = digest(`${config.url}:${token}`);
  const cached = userCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  try {
    const response = await fetchImpl(`${config.url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) return undefined;

    const body = (await response.json()) as {
      id?: unknown; email?: unknown; role?: unknown; factors?: { status?: string }[]; is_anonymous?: boolean;
    };
    if (typeof body?.id !== 'string' || !body.id || body.is_anonymous) return null;
    // Auth validated this exact token before any claims are read.
    const claims = tokenClaims(token);
    const factors = Array.isArray(body.factors) ? body.factors : [];
    let mfaRequired = !secondFactorSatisfied(claims, factors);
    if (mfaRequired) {
      // A recently consumed recovery code lets the owner back in for a short
      // re-enrolment window instead of locking every screen.
      mfaRequired = !(await recoveryWindowActive(body.id, fetchImpl));
    }
    const user: AuthUser = {
      id: body.id,
      email: typeof body.email === 'string' ? body.email : undefined,
      role: typeof body.role === 'string' ? body.role : undefined,
      mfaRequired,
    };
    if (userCache.size >= CACHE_MAX_ENTRIES) userCache.clear();
    // Cache only AAL2. Verification of an AAL1 token must see newly enrolled factors.
    if (claims.aal === 'aal2' && Number.isFinite(claims.exp)) {
      userCache.set(key, { user, expiresAt: Math.min(Date.now() + CACHE_TTL_MS, claims.exp! * 1000) });
    }
    return user;
  } catch {
    // Timeout, DNS failure or provider outage: cannot decide, do not deny.
    return undefined;
  }
}

const recoveryCache = new Map<string, number>();
const RECOVERY_CACHE_MAX = 500;
const RECOVERY_CACHE_TTL_MS = 60_000;

/**
 * A freshly consumed recovery code opens a short (10 minute) re-enrolment
 * window — this is the one supported way back into an account whose second
 * factor is lost. The check calls a service-role-only RPC: nothing
 * user-scoped is readable at AAL1 (the Data API pre-request hook blocks it),
 * so this check runs after the bearer token already verified and only ever
 * grants the AAL2-equivalent path briefly, never new privileges. Fails
 * closed to `false` on any error, missing key or timeout.
 */
export async function recoveryWindowActive(
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const key = digest(`recovery:${userId}`);
  const cached = recoveryCache.get(key);
  if (cached && cached > Date.now()) return true;
  try {
    const service = resolveServiceRoleConfiguration();
    const auth = resolveAuthConfiguration();
    if (!auth.url) return false;
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (service.configured) {
      headers.apikey = service.serviceKey;
      headers.authorization = `Bearer ${service.serviceKey}`;
    }
    const response = await fetchImpl(`${auth.url}/rest/v1/rpc/studioflow_mfa_recovery_active`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_user_id: userId }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const body = await response.json().catch(() => null);
    if (body === true) {
      if (recoveryCache.size >= RECOVERY_CACHE_MAX) recoveryCache.clear();
      recoveryCache.set(key, Date.now() + RECOVERY_CACHE_TTL_MS);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

let warnedUnconfigured = false;

function warnUnconfiguredOnce(): void {
  if (warnedUnconfigured) return;
  warnedUnconfigured = true;
  safeLogger.warn(
    '[ai-auth] Supabase Auth verification is unavailable (no publishable key resolved). ' +
      'Set SUPABASE_PUBLISHABLE_KEY to restore authentication on protected routes.',
  );
}

export interface RequireUserOptions {
  fetchImpl?: typeof fetch;
  /** Configures the unverifiable-token policy; tests use it to prove both paths. */
  config?: AuthConfiguration;
  onWarning?: () => void;
}

/**
 * Rejects a request that has no valid Supabase session.
 *
 * Attaches the verified user to `res.locals.authUser` so `rateLimit` can key the
 * budget per user instead of per address.
 */
export function requireVerifiedUser(options: RequireUserOptions = {}): RequestHandler {
  const config = options.config ?? resolveAuthConfiguration();
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.configured) {
        warnUnconfiguredOnce();
        options.onWarning?.();
        res.setHeader('X-AI-Auth', 'unconfigured');
        res.status(503).json({ error: 'Sign-in verification is temporarily unavailable.', code: 'auth_unavailable' });
        return;
      }
      const token = readBearerToken(req.headers);
      if (!token) {
        res.status(401).json({
          error: 'Sign in to use this AI feature.',
          code: 'auth_required',
        });
        return;
      }
      const user = await verifyAccessToken(token, config, options.fetchImpl ?? fetch);
      if (user === undefined) {
        res.setHeader('X-AI-Auth', 'unverified');
        res.status(503).json({ error: 'Sign-in verification is temporarily unavailable.', code: 'auth_unavailable' });
        return;
      }
      if (user === null) {
        res.status(401).json({
          error: 'Your session has expired. Sign in again to use this AI feature.',
          code: 'invalid_session',
        });
        return;
      }
      if (user.mfaRequired) {
        res.status(403).json({ error: 'Verify your authenticator before continuing.', code: 'mfa_required' });
        return;
      }
      res.locals.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Verifies a session when one is present, but never rejects.
 *
 * Used by the customer-facing recommendation route, where browsing is allowed
 * without an account: a signed-in customer gets the higher budget, an anonymous
 * visitor gets the strict one.
 */
export function optionalVerifiedUser(options: RequireUserOptions = {}): RequestHandler {
  const config = options.config ?? resolveAuthConfiguration();
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = readBearerToken(req.headers);
      if (!token || !config.configured) {
        if (!config.configured) warnUnconfiguredOnce();
        next();
        return;
      }
      const user = await verifyAccessToken(token, config, options.fetchImpl ?? fetch);
      if (user && !user.mfaRequired) res.locals.authUser = user;
      next();
    } catch {
      // Anonymous is a valid outcome for this route.
      next();
    }
  };
}

/** Test hook: clears the verification cache between cases. */
export function clearAuthCache(): void {
  userCache.clear();
  recoveryCache.clear();
  warnedUnconfigured = false;
}

/**
 * The one gate that may run at AAL1 with an enrolled authenticator: recovery
 * code consumption and the recovery-window probe. Everything else must stay
 * behind `requireVerifiedUser` — do not widen this for convenience.
 *
 * Verifies the bearer token exactly like `requireVerifiedUser`, but never
 * rejects on the second factor; it only attaches the verified user.
 */
export function requireAuthenticatedUser(options: RequireUserOptions = {}): RequestHandler {
  const config = options.config ?? resolveAuthConfiguration();
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.configured) {
        warnUnconfiguredOnce();
        options.onWarning?.();
        res.setHeader('X-AI-Auth', 'unconfigured');
        res.status(503).json({ error: 'Sign-in verification is temporarily unavailable.', code: 'auth_unavailable' });
        return;
      }
      const token = readBearerToken(req.headers);
      if (!token) {
        res.status(401).json({ error: 'Sign in to continue.', code: 'auth_required' });
        return;
      }
      const user = await verifyAccessToken(token, config, options.fetchImpl ?? fetch);
      if (user === undefined) {
        res.setHeader('X-AI-Auth', 'unverified');
        res.status(503).json({ error: 'Sign-in verification is temporarily unavailable.', code: 'auth_unavailable' });
        return;
      }
      if (user === null) {
        res.status(401).json({ error: 'Your session has expired. Sign in again.', code: 'invalid_session' });
        return;
      }
      res.locals.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
