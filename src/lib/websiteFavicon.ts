export function isValidFaviconUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('javascript:')) return false;
  return true;
}

export function websiteFavicon(
  settings?: { faviconUrl?: string } | null,
  profile?: { logoUrl?: string; businessType?: string } | null
): string {
  const faviconUrl = settings?.faviconUrl;
  if (isValidFaviconUrl(faviconUrl)) {
    return faviconUrl!.trim();
  }

  const logoUrl = profile?.logoUrl;
  if (isValidFaviconUrl(logoUrl)) {
    return logoUrl!.trim();
  }

  const bType = profile?.businessType;
  if (bType === 'massage_wellness') {
    return '/templates/bodhi-tree/favicon.svg';
  }
  if (bType === 'makeup_studio') {
    return '/templates/vogue-noir/favicon.svg';
  }

  return '/customer-icon-192.png';
}

export function applyWebsiteFavicon(
  docOrUrl?: any,
  urlArg?: string
): () => void {
  let doc = typeof document !== 'undefined' ? document : null;
  let iconUrl = '';

  if (docOrUrl && typeof docOrUrl === 'object' && docOrUrl.querySelector) {
    doc = docOrUrl;
    iconUrl = urlArg || '';
  } else if (typeof docOrUrl === 'string') {
    iconUrl = docOrUrl;
  }

  if (!doc) return () => {};

  const existingLink = doc.querySelector<HTMLLinkElement>("link[rel*='icon']");
  const previousHref = existingLink ? existingLink.href : null;
  const previousType = existingLink ? existingLink.getAttribute('type') : null;

  let linkNode: HTMLLinkElement | null = existingLink;
  let createdNew = false;

  if (!linkNode) {
    linkNode = doc.createElement('link') as HTMLLinkElement;
    linkNode.rel = 'shortcut icon';
    if (doc.head && typeof doc.head.appendChild === 'function') {
      doc.head.appendChild(linkNode);
    }
    createdNew = true;
  }

  if (linkNode) {
    linkNode.removeAttribute('type');
    linkNode.href = iconUrl;

    if (typeof linkNode.addEventListener === 'function') {
      const handleError = () => {
        if (linkNode) {
          linkNode.href = '/customer-icon-192.png';
        }
      };
      linkNode.addEventListener('error', handleError);
    }
  }

  return () => {
    if (!doc) return;
    if (createdNew) {
      if (linkNode && typeof linkNode.remove === 'function') {
        linkNode.remove();
      }
    } else if (linkNode) {
      if (previousHref !== null) {
        linkNode.href = previousHref;
      }
      if (previousType !== null) {
        linkNode.setAttribute('type', previousType);
      }
    }
  };
}
