import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { messageOf, withTimeout } from './asyncDeadline';

// Keep an already-checked UI mounted during a routine token refresh. The
// server independently validates the signed token and current factor state.
function assuranceKey(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.session_id === 'string' ? `${payload.session_id}:${payload.aal}` : token;
  } catch {
    return token;
  }
}

/** Auth callbacks stay synchronous; profile/database work runs in separate effects. */
export function useAuthSession(onRecovery?: () => void) {
  const [state, setState] = useState<{session: Session | null; ready: boolean; error: string}>({session: null, ready: false, error: ''});
  const [assurance, setAssurance] = useState<{ key: string; required: boolean; error: string }>();
  const [attempt, setAttempt] = useState(0);
  const token = state.session?.access_token;
  const key = token ? assuranceKey(token) : '';
  useEffect(() => {
    if (!token) return;
    let active = true;
    void withTimeout(Promise.resolve().then(async (): Promise<{ required: boolean; error: string | null }> => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(token);
      if (error) return { required: true, error: 'Could not check two-step verification. Try again.' };
      let required = data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
      if (required) {
        // A recently consumed recovery code opens a short re-enrolment window;
        // ask the server (it reads service-role-only state at AAL1) whether it
        // is open before insisting on the authenticator.
        try {
          const response = await fetch('/api/account/recovery-codes/active', { headers: { authorization: `Bearer ${token}` } });
          const body = await response.json().catch(() => null);
          if (body && body.active === true) required = false;
        } catch { /* recovery probe unavailable → keep the MFA requirement */ }
      }
      return { required, error: null };
    }), 10000, 'Checking two-step verification')
      .then(({ required, error }) => {
        if (!active) return;
        setAssurance({ key, required, error: error ?? '' });
      })
      .catch(() => {
        if (active) setAssurance({ key, required: true, error: 'Could not check two-step verification. Try again.' });
      });
    return () => { active = false; };
  }, [token, key, attempt]);
  useEffect(() => {
    let active = true, authChanged = false;
    const accept = (session: Session | null | undefined, error = '') => {
      if (active) setState({session: session?.user?.id ? session : null, ready: true, error});
    };
    const {data} = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') onRecovery?.();
      // Only treat real auth transitions or an authenticated INITIAL_SESSION as
      // authoritative; an unauthenticated INITIAL_SESSION must not mask a URL
      // exchange / OAuth callback error returned by getSession().
      if (event !== 'INITIAL_SESSION' || session?.user?.id) {
        authChanged = true;
        accept(session);
      }
    });
    // Never let a delayed cached session resurrect an account after SIGNED_OUT.
    void withTimeout(Promise.resolve().then(() => supabase.auth.getSession()), 15000, 'Checking your session')
      .then(({data, error}) => {
        if (!authChanged) accept(error ? null : data?.session, error?.message || '');
      }).catch(error => {
        if (!authChanged) accept(null, messageOf(error, 'Your session could not be checked. Please sign in again.'));
      });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [onRecovery]);
  const checked = !token || assurance?.key === key;
  const mfa = token && checked && assurance?.required ? { error: assurance.error } : null;
  return {
    ...state,
    session: checked && !mfa ? state.session : null,
    ready: state.ready && checked && !mfa,
    mfa,
    retryMfa: () => { setAssurance(undefined); setAttempt(value => value + 1); },
  };
}
