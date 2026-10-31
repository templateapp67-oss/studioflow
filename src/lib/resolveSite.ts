export function trimSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, "");
}

export function resolveSiteSlug(pathname: string): string {
  if (!pathname) return '';
  const clean = trimSlashes(pathname);
  if (!clean) return '';
  const parts = clean.split('/');
  return parts[0] || '';
}
