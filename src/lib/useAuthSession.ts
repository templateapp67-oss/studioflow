import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { messageOf, withTimeout } from './asyncDeadline';

/** Auth callbacks stay synchronous; profile/database work runs in separate effects. */
export function useAuthSession(onRecovery?: () => void) {
  const [state, setState] = useState<{session: Session | null; ready: boolean; error: string}>({session: null, ready: false, error: ''});
  useEffect(() => {
    let active = true, authChanged = false;
    const accept = (session: Session | null | undefined, error = '') => {
      if (active) setState({session: session?.user?.id ? session : null, ready: true, error});
    };
    const {data} = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      authChanged = true;
      if (event === 'PASSWORD_RECOVERY') onRecovery?.();
      accept(session);
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
  return state;
}
