import type { SupabaseClient, User } from 'npm:@supabase/supabase-js@2.117.3';

// Use only after Auth getUser(token) authenticated this exact bearer token.
export function needsSecondFactor(token: string, user: User): boolean {
  if (!user.factors?.some(factor => factor.status === 'verified')) return false;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).aal !== 'aal2';
  } catch {
    return true;
  }
}

export async function protectSession(
  db: SupabaseClient,
  token: string,
  user: User,
  scope: string,
  maxAttempts: number,
): Promise<{ error: string; status: number; retryAfter?: number } | null> {
  if (needsSecondFactor(token, user)) return { error: 'Verify your authenticator before continuing.', status: 403 };
  try {
    const { data, error } = await db.rpc('studioflow_edge_rate_limit_claim', {
      p_bucket_key: `${scope}:${user.id}`,
      p_window_seconds: 600,
      p_max_attempts: maxAttempts,
    });
    if (error || typeof data?.allowed !== 'boolean') throw new Error('Quota unavailable');
    if (!data.allowed) {
      return {
        error: 'Too many requests. Try again shortly.',
        status: 429,
        retryAfter: Math.max(1, Number(data.retryAfterSeconds) || 600),
      };
    }
    return null;
  } catch {
    return { error: 'This service is temporarily unavailable. Try again shortly.', status: 503 };
  }
}

export function protectedResponse(
  response: Response,
  protection: { retryAfter?: number },
): Response {
  if (protection.retryAfter) response.headers.set('Retry-After', String(protection.retryAfter));
  return response;
}
