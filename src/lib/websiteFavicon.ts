const FALLBACK_ICON = '/customer-icon-192.png';
function imageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  const url = value.trim();
  if (/^https:\/\//i.test(url) || /^\/(?:template-assets|templates|assets)\//.test(url)) return url;
}

export function websiteFavicon(branding?: {faviconUrl?: string}, profile?: {logoUrl?: string; businessType?: string}) {
  return imageUrl(branding?.faviconUrl) || imageUrl(profile?.logoUrl) || (profile?.businessType === 'makeup_studio' ? '/templates/vogue-noir/favicon.svg' : profile?.businessType === 'massage_wellness' ? '/templates/bodhi-tree/favicon.svg' : profile?.businessType === 'hair_coloring' ? '/templates/10/favicon.svg' : FALLBACK_ICON);
}

/** Restore the previous tab icon when leaving a salon, so brands cannot leak across routes. */
export function applyWebsiteFavicon(doc: Document, url: string) {
  let icon = doc.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const previous = icon?.getAttribute('href');
  const previousType = icon?.getAttribute('type');
  const created = !icon;
  if (!icon) { icon = doc.createElement('link'); icon.rel = 'icon'; doc.head.appendChild(icon); }
  icon.removeAttribute('type'); // Let the response identify PNG, WebP, JPEG or ICO.
  icon.href = url;
  const activeIcon = icon;
  const failed = () => { if (activeIcon.getAttribute('href') !== FALLBACK_ICON) activeIcon.href = FALLBACK_ICON; };
  activeIcon.addEventListener('error', failed);
  return () => {
    activeIcon.removeEventListener('error', failed);
    if (created) activeIcon.remove();
    else {
      if (previous == null) activeIcon.removeAttribute('href'); else activeIcon.setAttribute('href', previous);
      if (previousType == null) activeIcon.removeAttribute('type'); else activeIcon.setAttribute('type', previousType);
    }
  };
}
