import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchVedaSiteOwner, vedaConfigFor, vedaCustomizerAccess, type VedaAccess } from '../../lib/vedaSanjeevaniCustomizer';
import { VedaCustomizer, type VedaCustomizerProps } from './VedaCustomizer';

export type VedaCustomizerGateProps = Omit<VedaCustomizerProps, 'access'> & {
  /** Template-gallery demo: nothing is written to a site record. */
  demoMode?: boolean;
};

/**
 * Owner check for the Template 14 customizer.
 *
 * Opens only when the site is a Veda Sanjeevani template and the signed-in user
 * owns that website record (or when previewing the template from the gallery).
 * Anyone else gets a plain explanation instead of an editor that cannot save.
 */
export function VedaCustomizerGate({ demoMode = false, ...props }: VedaCustomizerGateProps) {
  const [access, setAccess] = useState<VedaAccess | null>(demoMode ? { allowed: true, reason: '' } : null);

  useEffect(() => {
    if (demoMode) {
      setAccess({ allowed: true, reason: '' });
      return;
    }
    let active = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const owner = props.siteId ? await fetchVedaSiteOwner(props.siteId) : null;
        const decision = vedaCustomizerAccess({
          templateId: props.profile?.businessType || null,
          sessionUserId: data?.session?.user?.id || null,
          siteOwnerId: owner,
        });
        if (active) setAccess(decision);
      } catch {
        if (active) setAccess({ allowed: false, reason: 'We could not check who owns this website. Please refresh and try again.' });
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, props.siteId, props.profile?.businessType]);

  if (!access) {
    return (
      <div className="vdc-backdrop" role="status" aria-live="polite">
        <section className="vdc-denied">
          <h2>Checking access…</h2>
          <p>Only the owner of this website can open the Veda Sanjeevani customizer.</p>
          <button type="button" className="vdc-btn" onClick={props.onClose}>Cancel</button>
        </section>
      </div>
    );
  }

  return <VedaCustomizer {...props} access={access} />;
}

/** Convenience: the stored config for a profile (used by the preview editor). */
export function vedaStoredConfig(profile: Parameters<typeof vedaConfigFor>[0]) {
  return vedaConfigFor(profile);
}

export default VedaCustomizerGate;
