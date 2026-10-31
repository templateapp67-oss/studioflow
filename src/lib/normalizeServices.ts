export function normalizeServices<T = any>(input: any, logFallback?: boolean): T[] {
  if (Array.isArray(input)) {
    return input as T[];
  }
  if (!input) {
    return [];
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return normalizeServices(parsed, logFallback);
    } catch {
      return [];
    }
  }
  if (typeof input === 'object') {
    if (Array.isArray(input.data?.services)) return input.data.services as T[];
    if (Array.isArray(input.content?.services)) return input.content.services as T[];
    if (Array.isArray(input.data)) return input.data as T[];
    if (Array.isArray(input.services)) return input.services as T[];
  }
  return [];
}

export function hasServicesArray(input: any): boolean {
  let target = input;
  if (target === null || target === undefined) return false;
  if (typeof target === 'string') {
    try {
      target = JSON.parse(target);
    } catch {
      return false;
    }
  }
  if (typeof target === 'object' && !Array.isArray(target)) {
    if (target.data?.services !== undefined) target = target.data.services;
    else if (target.content?.services !== undefined) target = target.content.services;
    else if (target.data !== undefined) target = target.data;
    else if (target.services !== undefined) target = target.services;
  }
  if (!Array.isArray(target)) return false;
  return target.every(item => item !== null && item !== undefined && typeof item === 'object');
}
