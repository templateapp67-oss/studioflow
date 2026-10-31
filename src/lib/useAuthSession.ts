import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export function useAuthSession(onRecovery?: () => void) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Check for recovery type in hash or search
    const isRecovery = 
      new URLSearchParams(window.location.search).has('recovery') || 
      new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';

    if (isRecovery && onRecovery) {
      onRecovery();
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error: initialError }) => {
      if (!active) return;
      if (initialError) {
        setError(initialError.message);
      } else {
        setSession(initialSession);
      }
      setReady(true);
    }).catch(err => {
      if (!active) return;
      setError(err instanceof Error ? err.message : 'Failed to check session');
      setReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!active) return;
      
      if (event === 'PASSWORD_RECOVERY' && onRecovery) {
        onRecovery();
      }

      setSession(currentSession);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [onRecovery]);

  return { session, ready, error };
}
