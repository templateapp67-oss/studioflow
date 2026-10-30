export function resolveSiteSlug(pathname: string): string {
  if (!pathname) return '';
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  const parts = clean.split('/');
  return parts[0] || '';
}
