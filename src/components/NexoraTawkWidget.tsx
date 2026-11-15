import { useEffect } from 'react';

export const NEXORA_TAWK_WIDGET_URL =
  'https://embed.tawk.to/6af928650ca0f03c41f84ba9/1k7ekbjg3';
const NEXORA_TAWK_WIDGET_SCRIPT_ID = 'nexora-tawk-widget-script';

export interface NexoraTawkSalonContext {
  /** The published salon website slug used by the multi-tenant booking API. */
  slug: string;
  name: string;
  businessType: string;
  city?: string;
  whatsapp?: string;
}

type TawkWidgetApi = {
  customStyle?: { visibility?: {
    desktop?: { position: 'bl'; xOffset: string; yOffset: string };
    mobile?: { position: 'bl'; xOffset: string; yOffset: string };
  }};
  onLoad?: () => void;
  showWidget?: () => void;
  hideWidget?: () => void;
  setAttributes?: (
    attributes: Record<string, string>,
    callback?: (error?: unknown) => void,
  ) => void;
};
type TawkWidgetWindow = Window & { Tawk_API?: TawkWidgetApi; Tawk_LoadStart?: Date };

function getVisitorAttributes(
  salon: NexoraTawkSalonContext | undefined,
): Record<string, string> {
  if (!salon?.slug?.trim()) {
    return {
      'nexora-platform': 'NEXORA',
      'salon-context': 'nexora-public-site',
      'salon-slug': 'not-applicable',
    };
  }

  const attributes: Record<string, string> = {
    'nexora-platform': 'NEXORA',
    'salon-context': 'published-salon-site',
    'salon-slug': salon.slug.trim().slice(0, 80),
    'salon-name': (salon.name || 'Salon').trim().slice(0, 120),
    'salon-category': (salon.businessType || 'salon').trim().slice(0, 80),
    'salon-website': `${window.location.origin}${window.location.pathname}`.slice(0, 240),
  };
  const city = salon.city?.trim();
  if (city) attributes['salon-city'] = city.slice(0, 80);
  const whatsappDigits = (salon.whatsapp || '').replace(/\D/g, '');
  if (whatsappDigits.length >= 8 && whatsappDigits.length <= 15) {
    attributes['salon-whatsapp'] = `+${whatsappDigits}`;
  }
  return attributes;
}

/**
 * Shared NEXORA Tawk property widget.
 * On published salon sites it tags each visitor chat with the tenant slug and
 * public business details so the AI agent can call the multi-tenant API for
 * the correct salon. On NEXORA marketing pages it explicitly clears the
 * tenant context by marking the visit as a NEXORA public-site conversation.
 */
export function NexoraTawkWidget({
  salonContext,
}: {
  salonContext?: NexoraTawkSalonContext;
} = {}) {
  const salonSlug = salonContext?.slug?.trim() || '';
  const salonName = salonContext?.name || '';
  const businessType = salonContext?.businessType || '';
  const city = salonContext?.city || '';
  const whatsapp = salonContext?.whatsapp || '';

  useEffect(() => {
    const tawkWindow = window as TawkWidgetWindow;
    const tawkApi = tawkWindow.Tawk_API ?? {};
    tawkWindow.Tawk_API = tawkApi;
    let pageIsActive = true;

    const applyVisitorContext = () => {
      if (!pageIsActive) return;
      tawkApi.setAttributes?.(
        getVisitorAttributes(salonSlug
          ? { slug: salonSlug, name: salonName, businessType, city, whatsapp }
          : undefined),
        () => undefined,
      );
    };

    tawkApi.customStyle = { visibility: {
      desktop: { position: 'bl', xOffset: '16px', yOffset: '16px' },
      mobile: { position: 'bl', xOffset: '12px', yOffset: '12px' },
    }};
    tawkApi.onLoad = () => {
      applyVisitorContext();
      if (pageIsActive) tawkApi.showWidget?.();
      else tawkApi.hideWidget?.();
    };

    const existingScript = document.getElementById(NEXORA_TAWK_WIDGET_SCRIPT_ID);
    if (existingScript) {
      applyVisitorContext();
      tawkApi.showWidget?.();
    } else {
      tawkWindow.Tawk_LoadStart = tawkWindow.Tawk_LoadStart ?? new Date();
      const script = document.createElement('script');
      script.id = NEXORA_TAWK_WIDGET_SCRIPT_ID;
      script.async = true;
      script.src = NEXORA_TAWK_WIDGET_URL;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      script.onerror = () => script.remove();
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
      else document.head.appendChild(script);
    }

    return () => {
      pageIsActive = false;
      tawkApi.hideWidget?.();
    };
  }, [salonSlug, salonName, businessType, city, whatsapp]);

  return null;
}
