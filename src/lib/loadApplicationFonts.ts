const APPLICATION_FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Great+Vibes&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Syne:wght@600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';

/** The owner/editor font catalogue is deferred until the full application opens. */
export function loadApplicationFonts(): void {
  if (typeof document === 'undefined' || document.querySelector('link[data-nexora-app-fonts]')) return;

  for (const href of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = href;
    if (href.includes('gstatic')) preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);
  }

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = APPLICATION_FONT_STYLESHEET;
  stylesheet.dataset.nexoraAppFonts = 'true';
  document.head.appendChild(stylesheet);
}
