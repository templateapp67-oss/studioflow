import { createHash } from 'node:crypto';

import { safeOutboundFetch } from './httpValidation.js';

/**
 * Postgres-backed distributed rate limiting for the Node/Vercel API routes.
 *
 * `studioflow_edge_rate_limit_claim` already provides the shared counter for
 * the Edge Functions; this module gives the Express/Vercel handlers the same
 * store, so an owner's budget survives serverless cold starts and parallel
 * instances — an in-memory `Map` (reset on every cold start, per instance) is
 * only the local-development fallback now.
 *
 * Privacy: bucket keys handed to Postgres are opaque SHA-256 digests of
 * `name:identity`. No IP address, e-mail or raw user id is ever stored.
 *
 * Failure policy (fail closed): when the store is configured and the claim
 * fails, callers must treat the request as NOT allowed (503) rather than let
 * a paid/cost-bearing endpoint run unlimited. When the store is not
 * configured at all (local dev, CI), callers fall back to their bounded
 * per-process budget and say so in the logs.
 */

export const DEFAULT_SUPABASE_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';

export interface ServiceRoleConfiguration {
  url: string;
  serviceKey: string;
  configured: boolean;
}

/**
 * Resolves the project URL and the privileged key used for the service-role
 * RPC. The URL must be https; a malformed configured URL is treated as
 * unconfigured (fail closed) rather than falling back to another host.
 */
export function resolveServiceRoleConfiguration(
  source: NodeJS.ProcessEnv = process.env,
): ServiceRoleConfiguration {
  const urlRaw = (source.SUPABASE_URL || source.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL)
    .trim()
    .replace(/\/+$/, '');
  const serviceKey = (source.SUPABASE_SERVICE_ROLE_KEY || source.SUPABASE_SECRET_KEY || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  let urlOk = false;
  try {
    const parsed = new URL(urlRaw);
    urlOk = parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    urlOk = false;
  }
  return { url: urlRaw, serviceKey, configured: urlOk && serviceKey.length > 0 };
}

/** Opaque, fixed-length bucket key. Identifiers never reach the database. */
export function hashBucketKey(name: string, identity: string): string {
  return createHash('sha256').update(`studioflow-rate-limit:${name}:${identity}`).digest('hex');
}

/** Test/escape hatch: force the per-process fallback even when configured. */
export function distributedRateLimitEnabled(source: NodeJS.ProcessEnv = process.env): boolean {
  return (source.STUDIOFLOW_DISABLE_DISTRIBUTED_RATE_LIMIT || '').trim() !== '1';
}

export interface DistributedClaim {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window resets. Always >= 1. */
  retryAfterSeconds: number;
}

/**
 * Atomically claims one attempt in the caller's window.
 *
 * @returns the decision, or `'unconfigured'` when the service-role store is
 *          not available (caller falls back to the per-process budget).
 * @throws  when the store IS configured but the claim failed — callers fail
 *          closed (503), never open.
 */
export async function claimDistributedRateLimit(
  bucketKey: string,
  options: { windowSeconds: number; maxAttempts: number },
  fetchImpl: typeof fetch = fetch,
  config: ServiceRoleConfiguration = resolveServiceRoleConfiguration(),
): Promise<DistributedClaim | 'unconfigured'> {
  if (!config.configured || !distributedRateLimitEnabled()) return 'unconfigured';
  const windowSeconds = Math.max(1, Math.floor(options.windowSeconds));
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts));
  const response = await safeOutboundFetch(`${config.url}/rest/v1/rpc/studioflow_edge_rate_limit_claim`, {
    method: 'POST',
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_bucket_key: bucketKey,
      p_window_seconds: windowSeconds,
      p_max_attempts: maxAttempts,
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`rate-limit claim failed with HTTP ${response.status}`);
  }
  const body = (await response.json().catch(() => null)) as {
    allowed?: unknown;
    remaining?: unknown;
    retryAfterSeconds?: unknown;
  } | null;
  if (!body || typeof body.allowed !== 'boolean') {
    throw new Error('rate-limit claim returned an invalid response');
  }
  const remaining = Number.isFinite(Number(body.remaining)) ? Math.max(0, Number(body.remaining)) : 0;
  const retryAfterSeconds = Math.max(1, Math.ceil(Number(body.retryAfterSeconds) || windowSeconds));
  return { allowed: body.allowed, remaining, retryAfterSeconds };
}
