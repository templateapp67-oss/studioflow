import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/** Loads only the public widget IDs for the currently published salon slug. */
export const TawkPublicWidget: React.FC<{ slug: string }> = ({ slug }) => {
  useEffect(() => {
    let active = true;
    let script: HTMLScriptElement | null = null;
    void supabase.rpc('studioflow_tawk_public_config', { p_slug: slug }).then(({ data, error }) => {
      if (!active || error || !data || typeof data.propertyId !== 'string' || typeof data.widgetId !== 'string') return;
      // Avoid duplicate injection if the published page re-renders for live content updates.
      const scriptId = 'nexora-salon-tawk-' + slug;
      if (document.getElementById(scriptId)) return;
      const api = ((window as any).Tawk_API = (window as any).Tawk_API || {});
      (window as any).Tawk_LoadStart = new Date();
      script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = 'https://embed.tawk.to/' + encodeURIComponent(data.propertyId) + '/' + encodeURIComponent(data.widgetId);
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      document.body.appendChild(script);
      return api;
    }).catch(() => { /* Chat is optional; never block the salon website. */ });
    return () => {
      active = false;
      if (script?.parentNode) script.parentNode.removeChild(script);
    };
  }, [slug]);
  return null;
};
