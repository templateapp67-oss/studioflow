import type { SalonService } from '../types';

/** Read response envelopes and cached JSON without modifying the saved catalogue. */
function unwrapServices(value: unknown): unknown {
  const visited = new Set<object>();
  const unwrap = (input: unknown): unknown => {
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
      try { return unwrap(JSON.parse(input)); } catch { return undefined; }
    }
    if (!input || typeof input !== 'object' || visited.has(input)) return undefined;
    visited.add(input);
    const record = input as Record<string, unknown>;
    for (const key of ['services', 'data', 'content', 'items', 'rows']) {
      if (key in record) {
        const result = unwrap(record[key]);
        if (Array.isArray(result)) return result;
      }
    }
    return undefined;
  };
  return unwrap(value);
}
const validRow = (item: unknown) => !!item && typeof item === 'object' && !Array.isArray(item);
export function hasServicesArray(value: unknown): boolean {
  const rows = unwrapServices(value);
  return Array.isArray(rows) && rows.every(validRow);
}
export function normalizeServices<T = SalonService>(value: unknown, diagnose: boolean | string = true): T[] {
  const current = unwrapServices(value);
  if (Array.isArray(current)) return (current.every(validRow) ? current : current.filter(validRow)) as T[];
  if (diagnose && value != null && import.meta.env?.DEV) console.warn('Invalid or missing services data; displaying an empty menu without changing saved services.', value);
  return [];
}
