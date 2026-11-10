import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Async route safety for the Express 4 server.
 *
 * Express 4 does not understand promises: a rejected `async` handler becomes an
 * unhandled rejection, and Node 22 turns that into a process exit. A remote
 * caller could therefore stop the whole server by sending a body shape the
 * handler never validated.
 *
 * `asyncHandler` forwards both synchronous throws and rejected promises to the
 * error middleware, and `sendJson` refuses to write after the response has
 * already started. The validation helpers exist so a handler never has to call
 * `.slice()`, `.map()` or `.toUpperCase()` on a value that arrived over HTTP
 * without proving it is the expected shape first.
 */

export type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route so a rejection reaches the error middleware instead of
 * the process.
 *
 * The handler is invoked inside the promise chain rather than before it, so a
 * synchronous throw is converted into a rejection too — `Promise.resolve(route())`
 * would let a sync throw escape the wrapper.
 */
export function asyncHandler(route: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => route(req, res, next))
      .catch(next);
  };
}

/** True once headers are sent and the socket is committed. */
export function isResponseOpen(res: Response): boolean {
  return !res.headersSent && !res.writableEnded;
}

/**
 * Sends JSON only when the response is still open, and returns whether it was
 * written. A fallback path can call this after a partial failure without
 * throwing "Cannot set headers after they are sent".
 */
export function sendJson(res: Response, status: number, payload: unknown): boolean {
  if (!isResponseOpen(res)) return false;
  res.status(status).json(payload);
  return true;
}

/** A plain JSON object body, or an empty object. Never null/undefined/array. */
export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Returns `value` when it is an array, otherwise `[]`, capped at `max` entries.
 * This is the single guard used wherever client-supplied arrays are iterated.
 */
export function asArray<T = unknown>(value: unknown, max = 50): T[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, Math.max(0, max)) as T[];
}

/** A trimmed string capped at `max` characters, or `''` for any other type. */
export function asString(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * A finite number within bounds, otherwise `fallback`.
 *
 * Only real numbers and non-empty numeric strings are accepted: `Number(null)`
 * and `Number(true)` are `0`/`1`, which would silently turn a missing price into
 * a zero-rupee price.
 */
export function asNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** A required string, or a 400 with a stable machine-readable code. */
export function requireString(
  res: Response,
  value: unknown,
  field: string,
  max = 200,
): { ok: true; value: string } | { ok: false } {
  const parsed = asString(value, max);
  if (!parsed) {
    sendJson(res, 400, { error: `Missing or invalid ${field}.`, code: 'invalid_request', field });
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

/**
 * A client-error status carried by the thrown value, or 500.
 *
 * Body parsing, size limits and aborts arrive as errors with a `status`; they
 * are the caller's fault and must not be reported as a server failure.
 */
function clientErrorStatus(error: unknown): number {
  const carrier = error as { status?: unknown; statusCode?: unknown } | null;
  const candidate = carrier?.status ?? carrier?.statusCode;
  const numeric = typeof candidate === 'number' ? candidate : Number.NaN;
  return Number.isInteger(numeric) && numeric >= 400 && numeric <= 499 ? numeric : 500;
}

/** A fixed, non-reflecting message for a 4xx raised outside a route handler. */
function clientErrorMessage(status: number): { error: string; code: string } {
  if (status === 413) return { error: 'Request body is too large.', code: 'body_too_large' };
  if (status === 415) return { error: 'Unsupported request content type.', code: 'unsupported_media_type' };
  if (status === 400) return { error: 'The request body is not valid JSON.', code: 'invalid_request' };
  return { error: 'The request could not be processed.', code: 'invalid_request' };
}

/**
 * Terminal error middleware. It never leaks a stack or an environment value to
 * the caller, and it never throws itself — that is what turned a handled failure
 * into a crash before.
 *
 * A 4xx (malformed JSON, oversized body) keeps its own status and gets a fixed
 * message: the parser's own text can quote the request body, so it is never
 * reflected to the caller or copied into the log.
 */
export function apiErrorHandler() {
  return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    const route = `${req.method} ${req.path}`;
    const status = clientErrorStatus(error);

    if (status >= 400 && status < 500) {
      console.warn(`[api] rejected ${route}: ${status}`);
      if (isResponseOpen(res)) {
        res.status(status).json(clientErrorMessage(status));
        return;
      }
      next(error);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[api] unhandled route error on ${route}: ${message}`);
    if (isResponseOpen(res)) {
      res.status(500).json({ error: 'The request could not be completed.', code: 'internal_error' });
      return;
    }
    // The response was already committed: close the connection instead of
    // writing a second set of headers.
    next(error);
  };
}

/**
 * Installs process-level guards as defence in depth behind `asyncHandler`.
 *
 * `unhandledRejection` is logged and the process keeps serving: a rejected
 * request must not take the API down. `uncaughtException` leaves the process in
 * an unknown state, so it is logged and the process exits non-zero to be
 * restarted, instead of continuing to serve corrupt state.
 */
export function installProcessGuards(log: Pick<Console, 'error'> = console): void {
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
    log.error(`[process] unhandled rejection (server kept running): ${message}`);
  });
  process.on('uncaughtException', (error) => {
    log.error(`[process] uncaught exception (exiting): ${error?.name}: ${error?.message}`);
    process.exitCode = 1;
    // Give the log a tick to flush before the runtime tears the process down.
    setTimeout(() => process.exit(1), 20).unref?.();
  });
}
