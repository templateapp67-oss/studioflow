import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthSession } from '../../lib/useAuthSession';
import {
  loadMyStaffContext,
  safeStaffRedirect,
  STAFF_WORKSPACE_PATH,
  type StaffContext,
} from '../../lib/staffInvites';
import { ROLE_SHORT_LABELS, normalizeAccessRole } from '../../lib/staffPermissions';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#900c3f] focus:ring-2 focus:ring-[#900c3f]/15 disabled:bg-slate-100';

/**
 * Separate staff sign-in.
 *
 * Deliberately not the owner AuthPage: a staff session that lands here goes
 * straight to `/staff`, and an account with no staff membership is told so
 * plainly instead of being dropped into someone else's workspace.
 */
export function StaffLoginPage() {
  const { session, ready } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [context, setContext] = useState<StaffContext | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session) { setContext(null); return; }
    let active = true;
    setChecking(true);
    void loadMyStaffContext()
      .then((row) => { if (active) setContext(row); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [ready, session]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim() || !password) return setError('Enter your work email and password.');
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error(signInError.message);
      const row = await loadMyStaffContext();
      if (!row) {
        await supabase.auth.signOut();
        throw new Error('This email does not have an active staff login. Ask the salon owner to invite you, or use your invite link.');
      }
      location.replace(safeStaffRedirect(STAFF_WORKSPACE_PATH));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    setError(''); setNotice('');
    if (!email.trim()) return setError('Enter your work email first, then tap “Forgot password”.');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/login?recovery=1`,
    });
    if (resetError) setError(resetError.message);
    else setNotice('Password reset link sent. Check your inbox (and spam folder).');
  };

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><p role="status" className="text-sm font-semibold text-slate-600">Checking your session…</p></main>;
  }

  // Signed in with an active staff membership: no form, just the way in.
  if (session && context) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#900c3f]">NEXORA SalonOS</p>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900">You're signed in</h1>
          <p className="mt-2 text-sm text-slate-600">
            {context.staffName ? `${context.staffName} · ` : ''}{context.salonName || 'Your salon'}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Role: {ROLE_SHORT_LABELS[normalizeAccessRole(context.role)]}
            {context.branchIds.length ? ` · ${context.branchIds.length} branch${context.branchIds.length === 1 ? '' : 'es'}` : ' · all branches'}
          </p>
          <a className="mt-5 block rounded-xl bg-[#900c3f] px-4 py-3 text-center text-sm font-bold text-white" href={STAFF_WORKSPACE_PATH}>
            Open my workspace
          </a>
          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
            onClick={async () => { await supabase.auth.signOut(); setContext(null); }}
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-5 flex items-center justify-between">
          <a href="/" className="text-lg font-extrabold tracking-tight text-[#900c3f]">NEXORA</a>
          <a href="/login" className="text-xs font-semibold text-slate-600 underline">Salon owner login</a>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-xl font-extrabold text-slate-900">Staff sign-in</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            For managers, receptionists and service providers invited by a salon. Use the email your invite went to.
          </p>

          {checking ? <p role="status" className="mt-3 text-xs font-semibold text-slate-500">Checking your staff access…</p> : null}

          {session && !context && !checking ? (
            <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              You are signed in, but this account has no active staff membership for any salon. Ask the owner for an invite, or sign out and use the invite link.
            </p>
          ) : null}

          <form className="mt-5 space-y-3" onSubmit={submit} noValidate>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">Work email</span>
              <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">Password</span>
              <input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} required />
            </label>

            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900">{error}</p> : null}
            {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">{notice}</p> : null}

            <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#900c3f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7a0a36] disabled:opacity-60">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button type="button" onClick={sendReset} className="font-semibold text-slate-700 underline">Forgot password?</button>
            <a href={STAFF_WORKSPACE_PATH} className="font-semibold text-slate-700 underline">My workspace</a>
          </div>

          <p className="mt-5 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
            No login yet? Open the invite link from your email or WhatsApp message. Invites are sent by the salon owner from Team → Invite.
          </p>
        </section>
      </div>
    </main>
  );
}
