/**
 * Deadline helpers for network reads that must never leave the UI spinning.
 *
 * `withTimeout` rejects instead of pending forever and always clears its timer,
 * so a settled promise cannot keep a Node test process alive.
 */

export class TimeoutError extends Error {
  readonly code = "STUDIOFLOW_TIMEOUT";
  constructor(label: string, ms: number) {
    super(
      `${label} did not respond within ${Math.max(1, Math.round(ms / 1000))}s.`,
    );
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label = "The request",
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve(promise);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([Promise.resolve(promise), deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/** Normalise an unknown error into a short, human sentence. */
export function messageOf(error: unknown, fallback: string): string {
  const raw = typeof error === "string" ? error : (error as any)?.message;
  const text = String(raw || "").trim();
  return text || fallback;
}

/**
 * A promise that settles to `fallback` when the deadline passes instead of
 * throwing: used for decorative reads (templates, profile details).
 */
export async function settleWithin<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
  fallback: T,
): Promise<T> {
  try {
    return await withTimeout(promise, ms, label);
  } catch {
    return fallback;
  }
}
