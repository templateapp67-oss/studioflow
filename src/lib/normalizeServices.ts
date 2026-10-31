import type { SalonService } from '../types';

/** Read known response envelopes without modifying the source or saved catalogue. */
function unwrapServices(value: unknown): unknown {
  let current = value;
  const visited = new Set<object>();
  while (current && typeof current === 'object' && !Array.isArray(current)) {
    if (visited.has(current)) break;
    visited.add(current);
    const record = current as Record<string, unknown>;
    if ('services' in record) current = record.services;
    else if ('data' in record) current = record.data;
    else if ('content' in record) current = record.content;
    else break;
  }
  return current;
}
export function hasServicesArray(value: unknown): boolean { const rows = unwrapServices(value); return Array.isArray(rows) && rows.every(item => !!item && typeof item === "object" && !Array.isArray(item)); }
export function normalizeServices(value: unknown, diagnose = true): SalonService[] {
  const current = unwrapServices(value);
  if (Array.isArray(current)) return current.filter((item): item is SalonService => !!item && typeof item === 'object' && !Array.isArray(item));
  if (diagnose && import.meta.env?.DEV) console.warn('Invalid or missing services data; displaying an empty menu without changing saved services.', value);
  return [];
}
