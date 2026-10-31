/**
 * Services may arrive as a plain array, a wrapped API response
 * (`{data:[...]}`, `{services:[...]}`, `{content:{services:[...]}}`), or a JSON
 * string of any of those. These helpers unwrap all of those shapes and never
 * throw on malformed input — invalid input becomes `[]`.
 */

const WRAPPER_KEYS = ['services', 'data', 'content'] as const;

function unwrap(value: unknown, depth = 0): unknown[] | null {
  if (depth > 6) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return unwrap(JSON.parse(trimmed), depth + 1);
    } catch {
      return null;
    }
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of WRAPPER_KEYS) {
      if (key in record) {
        const found = unwrap(record[key], depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

/**
 * Returns the services array for any supported input shape. A valid array is
 * returned untouched (same reference). When `fallbackLabel` is a non-empty
 * string and the input is invalid, a single placeholder service is returned
 * instead of an empty menu.
 */
export function normalizeServices<T = any>(value: unknown, fallbackLabel?: string | false): T[] {
  const arr = unwrap(value);
  if (arr) return arr as T[];
  if (typeof fallbackLabel === 'string' && fallbackLabel.trim() !== '') {
    return [
      {
        id: 'fallback-service',
        name: fallbackLabel,
        category: 'General',
        price: 0,
        durationMinutes: 30,
        description: '',
      } as unknown as T,
    ];
  }
  return [];
}

/**
 * True only when the value unwraps to an array whose every entry is a service
 * object (no nulls / arrays / primitives). Used to detect corrupted saved
 * workspaces before they reach the save path.
 */
export function hasServicesArray(value: unknown): boolean {
  const arr = unwrap(value);
  if (!arr) return false;
  return arr.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item));
}
