/**
 * Shared SEO text and canonical URL guards for owner-edited salon metadata.
 * Search engines choose their own snippet display; these are safe content limits.
 */
export const SEO_TITLE_MAX_LENGTH = 60;
export const SEO_DESCRIPTION_MAX_LENGTH = 160;

export function clampSeoText(value: unknown, maxLength: number): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text || text.length <= maxLength) return text;
  const limit = Math.max(1, maxLength - 1);
  const boundary = text.lastIndexOf(' ', limit);
  const end = boundary >= Math.floor(maxLength * 0.65) ? boundary : limit;
  return text.slice(0, end).replace(/[\s,;:–—-]+$/g, '').trimEnd() + '…';
}

export function normalizeSeoTitle(value: unknown, fallback = 'NEXORA Salon OS'): string {
  return clampSeoText(value || fallback, SEO_TITLE_MAX_LENGTH);
}

export function normalizeSeoDescription(value: unknown, fallback = ''): string {
  return clampSeoText(value || fallback, SEO_DESCRIPTION_MAX_LENGTH);
}

function hostFromConfiguredDomain(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    return new URL(candidate.includes('://') ? candidate : `https://${candidate}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Only accepts HTTPS canonicals on the current site or the salon's explicitly
 * configured custom domain. Private/session query keys and fragments are rejected.
 */
export function normalizeCanonicalUrl(
  candidate: string | undefined,
  fallback: string,
  allowedDomains: string[] = [],
): string {
  let base: URL;
  try {
    base = new URL(fallback);
  } catch {
    return fallback;
  }
  if (!candidate?.trim()) return base.href;

  const allowedHosts = new Set([
    base.hostname.toLowerCase(),
    ...allowedDomains.map(hostFromConfiguredDomain).filter((host): host is string => Boolean(host)),
  ]);
  try {
    const url = new URL(candidate.trim(), base);
    const isLocalDevelopment = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (
      (!isLocalDevelopment && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.hash ||
      !allowedHosts.has(url.hostname.toLowerCase())
    ) return base.href;

    for (const key of url.searchParams.keys()) {
      if (!['site', 's', 'subdomain'].includes(key.toLowerCase())) return base.href;
      if (url.searchParams.get(key) !== base.searchParams.get(key)) return base.href;
    }
    return url.href;
  } catch {
    return base.href;
  }
}
