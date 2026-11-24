import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthSession } from '../../lib/useAuthSession';
import { saveOAuthIntent } from '../../lib/authEntry';
import {
  acceptStaffInvite,
  detectSessionConflict,
  isValidInviteToken,
  lookupStaffInvite,
  safeStaffRedirect,
  signOutLocal,
  STAFF_LOGIN_PATH,
  STAFF_WORKSPACE_PATH,
  staffAcceptUrl,
  type InviteLookup,
  type SessionConflict,
} from '../../lib/staffInvites';
import { ROLE_SHORT_LABELS, normalizeAccessRole, PERMISSION_LABELS, type StaffPermission } from '../../lib/staffPermissions';
import { applyNoIndexMetadata } from '../../lib/publicSeo';

type Mode = 'signup' | 'signin';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#900c3f] focus:ring-2 focus:ring-[#900c3f]/15 disabled:bg-slate-100';

function Shell({ children, salonName }: { children: React.ReactNode; salonName?: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-5 flex items-center justify-between gap-3">
          <a href="/" className="text-lg font-extrabold tracking-tight text-[#900c3f]">NEXORA</a>
          <span className="text-xs font-semibold text-slate-500">SalonOS · Staff access</span>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{children}</section>
        {salonName ? (
          <p className="mt-4 text-center text-xs text-slate-500">
            Invited by <strong className="font-semibold text-slate-700">{salonName}</strong>
          </p>
        ) : null}
      </div>
    </main>
  );
}

function RoleCard({ lookup }: { lookup: InviteLookup }) {
  const role = normalizeAccessRole(lookup.role);
  return (
    <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50/70 p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#900c3f]">Your access level</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{ROLE_SHORT_LABELS[role]}</p>
      <ul className="mt-2 space-y-1">
        {lookup.permissions.slice(0, 6).map((permission) => (
          <li key={permission} className="flex items-start gap-1.5 text-xs text-slate-700">
            <span aria-hidden="true" className="mt-px text-emerald-600">✓</span>
            <span>{PERMISSION_LABELS[permission as StaffPermission] || permission}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StaffInviteAcceptPage({ token }: { token: string }) {
  const { session, ready } = useAuthSession();
  const [lookup, setLookup] = useState<InviteLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [conflict, setConflict] = useState<SessionConflict | null>(null);
  const acceptLock = useRef(false);

  const valid = isValidInviteToken(token);

  useEffect(() => {
    applyNoIndexMetadata('Accept staff invitation — NEXORA SalonOS');
  }, []);

  useEffect(() => {
    let active = true;
    if (!valid) {
      setLoading(false);
      setLookup({
        status: 'invalid',
        salonName: '',
        staffName: '',
        role: 'Service Provider (Assigned)',
        permissions: [],
        branchIds: [],
        allBranches: false,
        branchMissing: false,
        email: null,
        expiresAt: null,
      });
      return;
    }
    void lookupStaffInvite(token)
      .then((result) => {
        if (!active) return;
        setLookup(result);
        setEmail(result.email || '');
        setFullName(result.staffName || '');
        // An existing account uses "sign in"; a fresh invite defaults to signup.
        setMode('signup');
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'The invite could not be checked.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, valid]);

  const canAccept = lookup?.status === 'pending';
  const branchMissing = lookup?.branchMissing === true;

  // A signed-in visitor is accepted straight away — no extra click, no
  // re-entering details. Fails closed: role/branches come from the invite row.
  //
  // Owner sessions are the one exception. An owner who opens this link while
  // signed in must never have their `auth.uid()` bound to a staff record, so
  // we detect it first and hand the decision back to them.
  useEffect(() => {
    if (!ready || !session || !canAccept || branchMissing || acceptLock.current || done) return;
    acceptLock.current = true;
    setBusy(true);
    void detectSessionConflict()
      .then(async (found) => {
        if (found.isSalonOwner) {
          acceptLock.current = false;
          setConflict(found);
          return;
        }
        const result = await acceptStaffInvite(token);
        setDone(true);
        location.replace(safeStaffRedirect(result.redirectTo));
      })
      .catch((caught) => {
        acceptLock.current = false;
        setError(caught instanceof Error ? caught.message : 'This invite could not be accepted.');
      })
      .finally(() => setBusy(false));
  }, [ready, session, canAccept, branchMissing, token, done]);

  const continueAsStaff = async () => {
    setBusy(true);
    setError('');
    await signOutLocal();
    setConflict(null);
    acceptLock.current = false;
  };

  const continueUrl = useMemo(() => staffAcceptUrl(token, location.origin), [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!valid) return setError('This invite link is incomplete. Copy the full link from the email or WhatsApp message.');
    if (!canAccept) return setError('This invite is no longer active. Ask the salon owner to resend it.');
    if (mode === 'signup') {
      if (fullName.trim().length < 2) return setError('Enter your full name.');
      if (password.length < 8) return setError('Use at least 8 characters for your password.');
      if (password !== confirm) return setError('Both passwords must match.');
    } else if (!email.trim() || !password) {
      return setError('Enter the email and password of your existing staff account.');
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        // Always sign out first: an owner session on this device must not be
        // silently converted into the staff account.
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: continueUrl,
            data: { full_name: fullName.trim(), source: 'studioflow_staff_invite' },
          },
        });
        if (signUpError) throw new Error(signUpError.message);
        if (!data.session) {
          // Email confirmation is enabled on the project: the invite is not
          // consumed yet, and the link in the inbox returns to this page.
          setError('');
          setDone(false);
          setMode('signin');
          throw new Error('Check your inbox to confirm your email, then open the invite link again to finish.');
        }
        const result = await acceptStaffInvite(token);
        location.replace(safeStaffRedirect(result.redirectTo));
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error(signInError.message);
      const result = await acceptStaffInvite(token);
      location.replace(safeStaffRedirect(result.redirectTo));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const startGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      saveOAuthIntent({ path: staffAcceptUrl(token, location.origin).replace(location.origin, ''), flow: 'invite' });
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: continueUrl, queryParams: { prompt: 'select_account' } },
      });
      if (oauthError) throw new Error(oauthError.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in could not start.');
      setBusy(false);
    }
  };

  if (loading) {
    return <Shell><p role="status" className="py-10 text-center text-sm font-semibold text-slate-600">Checking your invite…</p></Shell>;
  }

  if (!lookup || lookup.status === 'invalid') {
    return (
      <Shell>
        <h1 className="text-xl font-extrabold text-slate-900">This invite link is not valid</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The link may be incomplete (WhatsApp sometimes cuts long links) or it has been replaced by a newer invite.
          Ask the salon owner to resend it from Team → Invite.
        </p>
        <a className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white" href={STAFF_LOGIN_PATH}>
          Go to staff sign-in
        </a>
      </Shell>
    );
  }

  if (branchMissing) {
    // Every branch on the invite was deleted or deactivated after it was sent.
    // Accepting would grant a login with no data reach, so we stop here.
    return (
      <Shell salonName={lookup.salonName}>
        <h1 className="text-xl font-extrabold text-slate-900">This invite points to a closed branch</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {lookup.salonName || 'The salon'} removed the branch this invite was created for. For safety your login is
          not created with empty access — ask the owner to send a fresh invite with a current branch.
        </p>
        <a className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white" href={STAFF_LOGIN_PATH}>
          Go to staff sign-in
        </a>
      </Shell>
    );
  }

  if (conflict?.isSalonOwner) {
    return (
      <Shell salonName={lookup.salonName}>
        <h1 className="text-xl font-extrabold text-slate-900">Aap abhi Owner account se logged in hain</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This browser is signed in as <strong className="font-semibold text-slate-800">{conflict.email || 'an owner account'}</strong>.
          Staff access must use the invited person's own login, so we have not accepted this invite.
        </p>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold leading-relaxed text-amber-900">
          Owner account se staff invite accept nahi hota. Pehle sign out karein — ya staff account se continue karein.
          Aapka salon data safe rahega.
        </div>
        <button
          type="button"
          onClick={continueAsStaff}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-[#900c3f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7a0a36] disabled:opacity-60"
        >
          {busy ? 'Signing out…' : 'Sign out & continue as staff'}
        </button>
        <a className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-slate-800" href="/owner">
          Back to my salon workspace
        </a>
        {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p> : null}
      </Shell>
    );
  }

  if (!canAccept) {
    const expired = lookup.status === 'expired';
    return (
      <Shell salonName={lookup.salonName}>
        <h1 className="text-xl font-extrabold text-slate-900">
          {expired ? 'This invite has expired' : lookup.status === 'revoked' ? 'This invite was cancelled' : 'This invite was already used'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {expired
            ? 'Invite links stay valid for a limited time for safety. Ask the salon owner to resend the invite — it takes a few seconds.'
            : lookup.status === 'revoked'
              ? 'The salon owner cancelled this invite. Ask them for a fresh one if you still need access.'
              : 'Your staff account already exists. Sign in with it to open your workspace.'}
        </p>
        <a className="mt-5 inline-block rounded-xl bg-[#900c3f] px-4 py-2.5 text-sm font-bold text-white" href={STAFF_LOGIN_PATH}>
          Sign in to your staff account
        </a>
      </Shell>
    );
  }

  return (
    <Shell salonName={lookup.salonName}>
      <h1 className="text-xl font-extrabold leading-snug text-slate-900">
        {lookup.staffName ? `${lookup.staffName}, you're invited` : "You're invited"} to {lookup.salonName || 'the salon'} team
      </h1>
      <p className="mt-1.5 text-sm text-slate-600">
        Create your own login — you will only see the screens your role allows.
      </p>
      <RoleCard lookup={lookup} />
      {lookup.allBranches ? (
        <p className="mt-2 text-[11px] font-semibold text-slate-600">Branch access: All branches</p>
      ) : null}

      <div className="mt-5 flex gap-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Invite action">
        {(['signup', 'signin'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            onClick={() => { setMode(option); setError(''); }}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${mode === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {option === 'signup' ? 'New staff account' : 'I already have an account'}
          </button>
        ))}
      </div>

      <form className="mt-4 space-y-3" onSubmit={submit} noValidate>
        {mode === 'signup' ? (
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">Full name</span>
            <input className={inputClass} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" disabled={busy} required />
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-700">Email address</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled={busy || Boolean(lookup.email)}
            required
          />
          {lookup.email ? <span className="mt-1 block text-[11px] text-slate-500">This invite is locked to {lookup.email}.</span> : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-700">Password</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={mode === 'signup' ? 8 : undefined}
            disabled={busy}
            required
          />
        </label>
        {mode === 'signup' ? (
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">Confirm password</span>
            <input className={inputClass} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" disabled={busy} required />
          </label>
        ) : null}

        {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#900c3f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7a0a36] disabled:opacity-60"
        >
          {busy ? 'Please wait…' : mode === 'signup' ? 'Accept invite & create login' : 'Sign in & accept invite'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={startGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
      >
        <span aria-hidden="true" className="text-base font-black text-[#4285f4]">G</span>
        Continue with Google
      </button>
      {lookup.email ? (
        <p className="mt-1.5 text-[11px] font-semibold text-amber-800">
          Use {lookup.email} for Google too. A different Google account is refused — the invite is bound to this email.
        </p>
      ) : null}

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Invite expires {lookup.expiresAt ? new Date(lookup.expiresAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'soon'} and works once.
        By continuing you agree to the salon's working rules; your access can be changed or removed by the owner at any time.
      </p>
      <p className="mt-2 text-[11px] text-slate-500">
        Already activated? <a className="font-semibold text-[#900c3f] underline" href={STAFF_LOGIN_PATH}>Open staff sign-in</a> · <a className="font-semibold text-[#900c3f] underline" href={STAFF_WORKSPACE_PATH}>My workspace</a>
      </p>
    </Shell>
  );
}
