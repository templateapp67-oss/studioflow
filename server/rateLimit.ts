import type { NextFunction, Request, RequestHandler, Response } from 'express';

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
export function rateLimit(options: RateLimitOptions): RequestHandler {
  const anonymousStore = createRateLimitStore(options.windowMs, options.max, options.maxKeys, options.now);
  const userMax = Math.max(options.authenticatedMax ?? options.max, options.max);
  const userStore = createRateLimitStore(options.windowMs, userMax, options.maxKeys, options.now);

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (res.locals?.authUser ?? null) as { id?: string } | null;
    const store = user?.id ? userStore : anonymousStore;
    const key = user?.id ? `user:${user.id}` : `ip:${clientKey(req)}`;
    const result = store.hit(`${options.name}:${key}`);

    res.setHeader('RateLimit-Limit', String(result.limit));
    res.setHeader('RateLimit-Remaining', String(result.remaining));
    res.setHeader('RateLimit-Reset', String(result.resetAfterSeconds));

    if (!result.allowed) {
      respondLimited(res, options.name, result);
      return;
    }
    next();
  };
}
