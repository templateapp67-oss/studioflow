/** Contract for the privileged JSONB RPC; malformed results fail closed. */
export type LeadBudget = { allowed: boolean; retryAfterSeconds: number };

export function parseLeadBudget(value: unknown, limit: number, windowSeconds: number): LeadBudget | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const count = row.count, remaining = row.remaining, retry = row.retry_after_seconds;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 1 ||
      row.limit !== limit || typeof row.allowed !== 'boolean' || row.allowed !== (count <= limit) ||
      typeof remaining !== 'number' || remaining !== Math.max(limit - count, 0) ||
      typeof retry !== 'number' || !Number.isSafeInteger(retry) ||
      (row.allowed ? retry !== 0 : retry < 1 || retry > windowSeconds)) return null;
  return { allowed: row.allowed, retryAfterSeconds: retry };
}
