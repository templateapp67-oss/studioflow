export const errorStatuses = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  SLOT_TAKEN: 409,
  CLOSED: 400,
  PAST_TIME: 400,
  SERVICE_NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  AI_UNAVAILABLE: 502,
  UPSTREAM_ERROR: 502,
  NOT_ENOUGH_DATA: 400,
} as const;
export type ErrorCode = keyof typeof errorStatuses;
export type Envelope<T> = { ok: true; data: T } | {
  ok: false;
  error: { code: ErrorCode; message: string };
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "AppError";
    this.status = errorStatuses[code];
  }
}

const baseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export function json<T>(body: Envelope<T>, status = 200, headers?: Headers): Response {
  const result = new Headers(baseHeaders);
  headers?.forEach((value, key) => result.set(key, value));
  return new Response(JSON.stringify(body), { status, headers: result });
}
export function ok<T>(data: T, status = 200, headers?: Headers): Response {
  return json({ ok: true, data }, status, headers);
}
export function fail(code: ErrorCode, message: string, headers?: Headers): Response {
  return json({ ok: false, error: { code, message } }, errorStatuses[code], headers);
}
export function errorResponse(error: unknown, headers?: Headers): Response {
  if (error instanceof AppError) {
    const extra = new Headers(headers);
    if (error.retryAfter !== undefined) extra.set("Retry-After", String(error.retryAfter));
    return fail(error.code, error.message, extra);
  }
  // Raw database, Auth, Gemini and Resend errors can contain private data.
  return fail("INTERNAL", "Something went wrong. Please try again.", headers);
}

/** Operational logs contain event names and controlled codes, never payloads. */
export function logWarning(event: string, code: ErrorCode | "CONFIGURATION" | "TIMEOUT"): void {
  console.warn(JSON.stringify({ event, code }));
}
