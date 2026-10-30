export function applyWebsiteFavicon(iconUrl?: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'shortcut icon';
    document.head.appendChild(link);
  }
  if (iconUrl) {
    link.href = iconUrl;
  }
}

export function websiteFavicon(iconUrl?: string): string {
  return iconUrl || '/favicon.ico';
}
