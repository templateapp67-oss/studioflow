import React, { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabase';
import { customizerAccess, fetchSiteOwner, type CustomizerAccess } from '../../lib/archFlutterCustomizer';
import { ArchFlutterCustomizer, type ArchFlutterCustomizerProps } from './ArchFlutterCustomizer';

export type ArchFlutterCustomizerGateProps = Omit<ArchFlutterCustomizerProps, 'access'> & {
  /**
   * True only inside the template gallery, where the drawer edits a throw-away
   * demo of Template 13 and nothing is written to a site record. A saved site
   * always goes through the owner check below.
   */
  demoMode?: boolean;
};

/**
 * Owner check for the Template 13 customizer.
 *
 * The drawer only opens when (a) the site is the Arch & Flutter template and
 * (b) the signed-in user owns that site record. Everyone else gets a plain
 * explanation in Indian English — never the editor.
 */
export function ArchFlutterCustomizerGate({ demoMode = false, ...props }: ArchFlutterCustomizerGateProps) {
  const [access, setAccess] = useState<CustomizerAccess | null>(demoMode ? { allowed: true, reason: '' } : null);

  useEffect(() => {
    if (demoMode) {
      setAccess({ allowed: true, reason: '' });
      return;
    }
    let active = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const owner = props.siteId ? await fetchSiteOwner(props.siteId) : null;
        const decision = customizerAccess({
          templateId: props.profile?.businessType || null,
          sessionUserId: data?.session?.user?.id || null,
          siteOwnerId: owner,
        });
        if (active) setAccess(decision);
      } catch {
        if (active) {
          setAccess({ allowed: false, reason: 'We could not check who owns this website. Please refresh and try again.' });
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, props.siteId, props.profile?.businessType]);

  if (!access) {
    return (
      <div className="afc-backdrop" role="status" aria-live="polite">
        <section className="afc-confirm">
          <div className="afc-confirm-panel">
            <h3>Checking access…</h3>
            <p>Only the owner of this salon website can open the Arch &amp; Flutter customizer.</p>
            <div className="afc-row-actions">
              <button type="button" className="afc-btn afc-btn-ghost" onClick={props.onClose}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return <ArchFlutterCustomizer {...props} access={access} />;
}

export default ArchFlutterCustomizerGate;
