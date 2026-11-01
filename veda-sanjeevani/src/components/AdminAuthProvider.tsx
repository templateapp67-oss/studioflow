import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AdminAuthContext } from '../hooks/adminAuthContext';
import { getSupabase } from '../lib/api';
import { envResult } from '../lib/env';
import { profileSchema, type Profile } from '../lib/adminSchemas';

function friendlyAuthMessage(message: string) {
  const text = message.toLowerCase();
  if (text.includes('invalid login') || text.includes('invalid credentials')) return 'That email and password do not match. Please try again.';
  if (text.includes('rate limit') || text.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (text.includes('email not confirmed')) return 'Please verify your email using the confirmation link, then sign in.';
  if (text.includes('already registered') || text.includes('already been registered')) return 'An account with this email already exists. Try signing in instead.';
  if (text.includes('password should') || text.includes('password is')) return 'Choose a password with at least eight characters.';
  if (text.includes('network') || text.includes('fetch')) return 'We could not reach Supabase. Check your connection and try again.';
  return 'We could not complete that request. Please check your details and try again.';
}
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hadSession = useRef(false);
  const manualSignOut = useRef(false);
  const user = session?.user ?? null;
  const supabase = useMemo(() => envResult.ok ? getSupabase(envResult.value) : null, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let live = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (!live) return;
      if (next) hadSession.current = true;
      if (event === 'SIGNED_OUT') { const wasManual = manualSignOut.current; if (hadSession.current && !wasManual) setExpired(true); hadSession.current = false; if (wasManual) setProfile(null); manualSignOut.current = false; }
      setSession(next);
      if (!next && event !== 'SIGNED_OUT') setProfile(null);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') setError(null);
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!live) return;
      if (sessionError) setError('Your session could not be restored. Please sign in again.');
      setSession(data.session);
      setLoading(false);
    }).catch(() => { if (live) { setSession(null); setLoading(false); setError('We could not check your session. Please retry.'); } });
    return () => { live = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) { setProfile(null); setProfileLoading(false); return; }
    setProfileLoading(true);
    const { data, error: profileError } = await supabase.from('profiles').select('id,role,full_name').eq('id', user.id).maybeSingle();
    if (profileError || !data) { setProfile(null); setProfileLoading(false); setError('Your account profile is not ready. Contact the studio owner.'); return; }
    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) { setProfile(null); setProfileLoading(false); setError('Your account role could not be verified. Please contact support.'); return; }
    setProfile(parsed.data); setProfileLoading(false); setError(null);
  }, [supabase, user]);
  useEffect(() => { if (user) void refreshProfile(); else setProfile(null); }, [user, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) throw new Error(friendlyAuthMessage(signInError.message));
    setExpired(false);
  }, [supabase]);
  const signOut = useCallback(async () => {
    if (!supabase) return;
    manualSignOut.current = true;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) { manualSignOut.current = false; throw new Error(friendlyAuthMessage(signOutError.message)); }
  }, [supabase]);
  const reauthenticate = useCallback(async (email: string, password: string) => {
    await signIn(email, password); setExpired(false);
  }, [signIn]);
  const clearExpired = useCallback(() => setExpired(false), []);
  const value = useMemo(() => ({ session, user, profile, loading, profileLoading, expired, error, signIn, signOut, clearExpired, reauthenticate, refreshProfile }), [session, user, profile, loading, profileLoading, expired, error, signIn, signOut, clearExpired, reauthenticate, refreshProfile]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
