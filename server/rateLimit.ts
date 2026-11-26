import { createHash } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { DEFAULT_SUPABASE_URL } from './nexoraEnv.js';

/**
 * In-process rate limiting for the cost-bearing AI routes.
 *
 * No provider call is free and every AI route here forwards to Gemini, so an
 * unauthenticated client could burn the project's quota or bill. This module
 * bounds that per caller with a fixed window counter.
 *
 * Deliberate limits, stated honestly:
 *  - State is per process. On a multi-instance deployment (Vercel functions,
 *    several Node workers) each instance keeps its own counters, so the limits
 *    below are a floor per instance, not a global cap. A global cap needs a
 *    shared store (the `landing_leads`-style Postgres limiter already used by
 *    the demo-lead Edge Function, or Redis).
 *  - Memory is bounded: expired windows are swept, and once `maxKeys` distinct
 *    callers exist the limiter rejects new keys instead of growing without
 *    limit, so it can never become the reason the process runs out of memory.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets. */
  resetAfterSeconds: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  /** Increments the counter for `key` and reports the decision. */
  hit(key: string): RateLimitResult;
  /** Number of tracked windows, for tests and diagnostics. */
  size(): number;
}

/**
 * Creates a bounded fixed-window counter.
 *
 * @param windowMs length of the window
 * @param max allowed requests per key per window
 * @param maxKeys hard cap on distinct windows kept in memory
 * @param now injectable clock, so tests do not wait for real time
 */
export function createRateLimitStore(
  windowMs: number,
  max: number,
  maxKeys = 10_000,
  now: () => number = Date.now,
): RateLimitStore {
  const windows = new Map<string, WindowEntry>();

  const sweep = (currentTime: number) => {
    for (const [key, entry] of windows) {
      if (entry.resetAt <= currentTime) windows.delete(key);
    }
    // Still full of live windows: drop the oldest instead of growing past the
    // cap. `>=` (not `>`) guarantees room for the entry about to be inserted.
    const capacity = Math.max(1, maxKeys);
    while (windows.size >= capacity) {
      const oldest = windows.keys().next();
      if (oldest.done) break;
      windows.delete(oldest.value);
    }
  };

  return {
    hit(key: string): RateLimitResult {
      const currentTime = now();
      const current = windows.get(key);
      if (!current || current.resetAt <= currentTime) {
        if (windows.size >= maxKeys) sweep(currentTime);
        const resetAt = currentTime + windowMs;
        windows.set(key, { count: 1, resetAt });
        return {
          allowed: true,
          limit: max,
          remaining: Math.max(0, max - 1),
          resetAfterSeconds: Math.ceil(windowMs / 1000),
        };
      }
      const resetAfterSeconds = Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000));
      if (current.count >= max) {
        return { allowed: false, limit: max, remaining: 0, resetAfterSeconds };
      }
      current.count += 1;
      return {
        allowed: true,
        limit: max,
        remaining: Math.max(0, max - current.count),
        resetAfterSeconds,
      };
    },
    size: () => windows.size,
  };
}

/**
 * The caller's network identity.
 *
 * `req.ip` honours Express `trust proxy`, which `server.ts` enables only when it
 * is actually behind a proxy (`TRUST_PROXY` or a Vercel build). Reading
 * `x-forwarded-for` directly would let a caller spoof the header and reset their
 * own budget, so it is never used here.
 */
export function clientKey(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export interface RateLimitOptions {
  /** Stable name, used in the key and in logs. */
  name: string;
  windowMs: number;
  max: number;
  /** Ceiling for a verified user; falls back to `max` when unauthenticated. */
  authenticatedMax?: number;
  maxKeys?: number;
  now?: () => number;
}

/** Writes the standard rate-limit headers and the 429 body. */
function respondLimited(res: Response, name: string, result: RateLimitResult): void {
  res.setHeader('RateLimit-Limit', String(result.limit));
  res.setHeader('RateLimit-Remaining', '0');
  res.setHeader('RateLimit-Reset', String(result.resetAfterSeconds));
  res.setHeader('Retry-After', String(result.resetAfterSeconds));
  res.status(429).json({
    error: `Too many ${name} requests. Please wait ${result.resetAfterSeconds}s and try again.`,
    code: 'rate_limited',
    retryAfterSeconds: result.resetAfterSeconds,
  });
}

/**
 * Express middleware wrapping one limiter.
 *
 * The key is the verified user id when `res.locals.authUser` was set by the auth
 * middleware, otherwise the caller's address. Verified users get the higher
 * ceiling so one shared IP (office, campus, mobile carrier NAT) does not starve
 * a signed-in owner.
 */
export interface SharedRateLimitOptions {
  key: string;
  windowMs: number;
  max: number;
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
}

/**
 * Atomically claims a shared Postgres counter using the service-role-only RPC
 * already used by Edge Functions. The raw user/IP identity is never persisted;
 * only a SHA-256 bucket digest reaches Postgres.
 */
export async function claimSharedRateLimit(options: SharedRateLimitOptions): Promise<RateLimitResult> {
  const bucketKey = `server:${createHash('sha256').update(options.key).digest('hex')}`;
  const endpoint = `${options.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/studioflow_edge_rate_limit_claim`;
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      apikey: options.serviceRoleKey,
      Authorization: `Bearer ${options.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_bucket_key: bucketKey,
      p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
      p_max_attempts: Math.max(1, Math.floor(options.max)),
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Shared rate-limit RPC returned HTTP ${response.status}`);
  const payload = (await response.json()) as {
    allowed?: unknown;
    limit?: unknown;
    remaining?: unknown;
    retryAfterSeconds?: unknown;
  };
  if (typeof payload?.allowed !== 'boolean') throw new Error('Shared rate-limit RPC returned an invalid decision');
  const limit = Math.max(1, Math.floor(options.max));
  const retryAfterSeconds = Math.max(1, Number(payload.retryAfterSeconds) || Math.ceil(options.windowMs / 1000));
  const remaining = Math.max(0, Math.min(limit, Number(payload.remaining) || 0));
  return {
    allowed: payload.allowed,
    limit,
    remaining: payload.allowed ? remaining : 0,
    resetAfterSeconds: retryAfterSeconds,
  };
}

let warnedLocalRateLimit = false;

/**
 * Express middleware. In Vercel production, counters are shared through the
 * existing service-role RPC; a missing credential or RPC outage fails closed
 * with 503. Non-Vercel local development retains the bounded in-memory store.
 */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  const anonymousStore = createRateLimitStore(options.windowMs, options.max, options.maxKeys, options.now);
  const userMax = Math.max(options.authenticatedMax ?? options.max, options.max);
  const userStore = createRateLimitStore(options.windowMs, userMax, options.maxKeys, options.now);

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (res.locals?.authUser ?? null) as { id?: string } | null;
    const identity = user?.id ? `user:${user.id}` : `ip:${clientKey(req)}`;
    const bucket = `${options.name}:${identity}`;
    const max = user?.id ? userMax : options.max;
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim().replace(/^['"]|['"]$/g, '');
    const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim().replace(/^['"]|['"]$/g, '');
    const vercelProduction = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

    const applyDecision = (result: RateLimitResult) => {
      res.setHeader('RateLimit-Limit', String(result.limit));
      res.setHeader('RateLimit-Remaining', String(result.remaining));
      res.setHeader('RateLimit-Reset', String(result.resetAfterSeconds));
      if (!result.allowed) {
        respondLimited(res, options.name, result);
        return;
      }
      next();
    };

    if (serviceRoleKey && /^https:\/\//i.test(supabaseUrl)) {
      void claimSharedRateLimit({
        key: bucket,
        windowMs: options.windowMs,
        max,
        supabaseUrl,
        serviceRoleKey,
      }).then(applyDecision).catch(() => {
        res.status(503).json({
          error: 'Rate limiting is temporarily unavailable. Please try again later.',
          code: 'rate_limit_unavailable',
        });
      });
      return;
    }

    // The deployed Vercel app must not silently downgrade to a per-instance
    // limiter: each serverless instance would otherwise have a separate quota.
    if (vercelProduction) {
      res.status(503).json({
        error: 'Shared rate limiting is not configured. Please try again later.',
        code: 'rate_limit_unavailable',
      });
      return;
    }

    if (!warnedLocalRateLimit) {
      warnedLocalRateLimit = true;
      console.warn('[rate-limit] Using bounded in-process counters outside Vercel; configure SUPABASE_SERVICE_ROLE_KEY for a shared counter.');
    }
    const store = user?.id ? userStore : anonymousStore;
    applyDecision(store.hit(bucket));
  };
}
