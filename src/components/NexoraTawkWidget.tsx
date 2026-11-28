import { useEffect } from 'react';

export const NEXORA_TAWK_WIDGET_URL =
  'https://embed.tawk.to/6af928650ca0f03c41f84ba9/1k7ekbjg3';
const NEXORA_TAWK_WIDGET_SCRIPT_ID = 'nexora-tawk-widget-script';
const SUPPORT_LOAD_DELAY_MS = 5000;

type TawkWidgetApi = {
  customStyle?: { visibility?: {
    desktop?: { position: 'bl'; xOffset: string; yOffset: string };
    mobile?: { position: 'bl'; xOffset: string; yOffset: string };
  }};
  onLoad?: () => void;
  showWidget?: () => void;
  hideWidget?: () => void;
};
type TawkWidgetWindow = Window & { Tawk_API?: TawkWidgetApi; Tawk_LoadStart?: Date };

/** Hosted Tawk.to support widget for NEXORA public marketing pages only. */
export function NexoraTawkWidget() {
  useEffect(() => {
    const tawkWindow = window as TawkWidgetWindow;
    const tawkApi = tawkWindow.Tawk_API ?? {};
    tawkWindow.Tawk_API = tawkApi;
    let pageIsActive = true;
    tawkApi.customStyle = { visibility: {
      desktop: { position: 'bl', xOffset: '16px', yOffset: '16px' },
      mobile: { position: 'bl', xOffset: '12px', yOffset: '12px' },
    }};
    tawkApi.onLoad = () => {
      if (pageIsActive) tawkApi.showWidget?.();
      else tawkApi.hideWidget?.();
    };
    const existingScript = document.getElementById(NEXORA_TAWK_WIDGET_SCRIPT_ID);
    let fallbackTimer: number | undefined;
    const removeLoadListeners = () => {
      window.removeEventListener('pointerdown', loadWidget);
      window.removeEventListener('keydown', loadWidget);
      window.removeEventListener('load', scheduleWidget);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };

    function loadWidget() {
      removeLoadListeners();
      if (document.getElementById(NEXORA_TAWK_WIDGET_SCRIPT_ID)) {
        tawkApi.showWidget?.();
        return;
      }

      tawkWindow.Tawk_LoadStart = tawkWindow.Tawk_LoadStart ?? new Date();
      const script = document.createElement('script');
      script.id = NEXORA_TAWK_WIDGET_SCRIPT_ID;
      script.async = true;
      script.src = NEXORA_TAWK_WIDGET_URL;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      script.onerror = () => script.remove();
      document.head.appendChild(script);
    }

    function scheduleWidget() {
      fallbackTimer = window.setTimeout(loadWidget, SUPPORT_LOAD_DELAY_MS);
    }

    if (existingScript) {
      tawkApi.showWidget?.();
    } else {
      // Keep the third-party widget out of initial hydration on marketing pages.
      window.addEventListener('pointerdown', loadWidget, { once: true, passive: true });
      window.addEventListener('keydown', loadWidget, { once: true });
      if (document.readyState === 'complete') scheduleWidget();
      else window.addEventListener('load', scheduleWidget, { once: true });
    }

    return () => {
      pageIsActive = false;
      removeLoadListeners();
      tawkApi.hideWidget?.();
    };
  }, []);
  return null;
}
