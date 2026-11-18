import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/** Loads only the public widget IDs for the currently published salon slug. */
export const TawkPublicWidget: React.FC<{ slug: string }> = ({ slug }) => {
  useEffect(() => {
    let active = true;
    let script: HTMLScriptElement | null = null;

    const loadWidget = async () => {
      try {
        const { data, error } = await supabase.rpc('studioflow_tawk_public_config', { p_slug: slug });
        if (!active || error || !data
          || typeof data.propertyId !== 'string' || typeof data.widgetId !== 'string') return;

        // Avoid duplicate injection if the published page re-renders for live content updates.
        const scriptId = 'nexora-salon-tawk-' + slug;
        if (document.getElementById(scriptId)) return;

        (window as any).Tawk_API = (window as any).Tawk_API || {};
        (window as any).Tawk_LoadStart = (window as any).Tawk_LoadStart || new Date();

        script = document.createElement('script');
        script.id = scriptId;
        script.async = true;
        script.src = 'https://embed.tawk.to/' + encodeURIComponent(data.propertyId) + '/' + encodeURIComponent(data.widgetId);
        script.charset = 'UTF-8';
        script.setAttribute('crossorigin', '*');
        script.onerror = () => {
          script?.remove();
          script = null;
        };
        document.body.appendChild(script);
      } catch {
        // Chat is optional; never block or break the published salon website.
      }
    };

    void loadWidget();
    return () => {
      active = false;
      if (script?.parentNode) script.parentNode.removeChild(script);
    };
  }, [slug]);
  return null;
};
