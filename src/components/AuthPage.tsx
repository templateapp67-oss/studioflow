import React, { useState } from 'react';
import { supabase, captureReferral } from '../lib/supabase';

export function AuthPage({ compact = false, recovery = false, onRecovered, customerMode, initialMode, returnSlug }: { key?:React.Key; compact?: boolean; recovery?: boolean; onRecovered?: () => void; customerMode?:boolean; initialMode?:'signin'|'signup'; returnSlug?:string }) {
  const customer = customerMode ?? new URLSearchParams(location.search).has('customer');
  const customerReturn=returnSlug||new URLSearchParams(location.search).get('return');
  const redirectPath=customer?`/?customer=1${customerReturn?'&return='+encodeURIComponent(customerReturn):''}`:'/';
  const [mode, setMode] = useState<'signin'|'signup'|'forgot'>(initialMode || (new URLSearchParams(location.search).get('auth')==='signup' || (!customer&&captureReferral()) ? 'signup' : 'signin'));
  const signup = mode === 'signup';
  const [name, setName] = useState(''); const [salon, setSalon] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(''); const [visible, setVisible] = useState(false);
  const [ref, setRef] = useState(captureReferral); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => new URLSearchParams(location.hash.slice(1)).get('error_description') || (new URLSearchParams(location.search).has('recovery') && !recovery ? 'Reset link expired or could not be verified. Request a new link using Forgot password.' : '')); const [confirmationPending, setConfirmationPending] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (recovery) {
        if (password !== confirm) throw new Error('Passwords do not match.');
        const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
        sessionStorage.removeItem('studioflow_recovery');
        history.replaceState(null, '', '/'); onRecovered?.(); return;
      }
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/?recovery=1` });
        if (error) throw error;
        setMessage('If an account exists for this email, a password reset link will be sent. Open that link to choose a new password.'); return;
      }
      if (signup && ref.trim()) {
        const { data, error } = await supabase.rpc('studioflow_validate_ref', { p_code: ref.trim().toUpperCase() });
        if (error) throw error; if (!data) throw new Error('Referral code is invalid or inactive. Check it or leave it empty.');
      }
      if (signup) {
        localStorage.removeItem('studioflow_pending_ref');
        const url = new URL(location.href); url.searchParams.delete('ref'); history.replaceState(null, '', url);
        if (ref.trim()) localStorage.setItem('studioflow_pending_ref', ref.trim().toUpperCase());
      }
      const result = signup ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${location.origin}${redirectPath}`, data: { full_name: name.trim(), salon_name: salon.trim(), referral_code: ref.trim().toUpperCase(), source: 'studioflow' } } }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (signup && !result.data.session) { setConfirmationPending(true); setMessage('Check your email to confirm your account, then sign in. If you already have an account, use Sign in or Forgot password.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not complete this request. Please try again.'); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${location.origin}${redirectPath}` } });
    setMessage(error ? error.message : 'Confirmation email requested. Check your inbox and spam folder.'); setBusy(false);
  };
  return <main className={compact ? '' : 'min-h-screen bg-[#f9f9ff] px-4 py-12 flex items-center justify-center'}>
    <section className="workspace-card w-full max-w-lg">
      <p className="eyebrow">StudioFlow · Salon OS</p><h1 className="text-3xl font-bold mb-2">{recovery ? 'Choose a new password' : mode === 'forgot' ? 'Reset your password' : signup ? customer ? 'Create your customer account' : 'Create your salon account' : 'Welcome back'}</h1>
      <p className="muted mb-5">{customer ? 'Sign in to book appointments and manage your bookings.' : 'Your website, team and business data stay with your account across devices.'}</p>
      {!recovery && <div className="flex gap-3 mb-5"><button disabled={busy} type="button" className={signup ? 'secondary-action' : 'primary-action'} onClick={() => { setMode('signin'); setMessage(''); }}>Sign in</button><button disabled={busy} type="button" className={signup ? 'primary-action' : 'secondary-action'} onClick={() => { setMode('signup'); setMessage(''); }}>Sign up</button></div>}
      <form onSubmit={submit} className="space-y-4">
        {signup && !recovery && <><label className="block">Full name<input className="workspace-input" autoComplete="name" maxLength={150} value={name} onChange={e => setName(e.target.value)} required /></label>{!customer && <label className="block">Salon name<input className="workspace-input" maxLength={150} value={salon} onChange={e => setSalon(e.target.value)} required /></label>}</>}
        {!recovery && <label className="block">Email<input className="workspace-input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {(recovery || mode !== 'forgot') && <><label className="block">{recovery ? 'New password' : 'Password'}<input className="workspace-input" type={visible ? 'text' : 'password'} minLength={6} autoComplete={signup || recovery ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} /></label><button type="button" className="text-sm underline" onClick={() => setVisible(v => !v)}>{visible ? 'Hide password' : 'Show password'}</button></>}
        {recovery && <label className="block">Confirm new password<input className="workspace-input" type={visible ? 'text' : 'password'} minLength={6} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>}
        {signup && !recovery && <label className="block">Referral code <span className="text-gray-400">(optional)</span><input className="workspace-input" maxLength={32} value={ref} onChange={e => setRef(e.target.value.toUpperCase())} /><small>Referral attribution is saved after you sign in.</small></label>}
        {message && <p role="status" className="text-sm p-3 rounded-lg bg-amber-50 text-amber-900">{message}</p>}
        <button disabled={busy} className="primary-action w-full justify-center">{busy ? 'Please wait…' : recovery ? 'Save new password' : mode === 'forgot' ? 'Send reset link' : signup ? 'Create account' : 'Sign in'}</button>
        {!recovery && mode === 'signin' && <button type="button" className="text-sm underline" onClick={() => { setMode('forgot'); setMessage(''); }}>Forgot password?</button>}
        {confirmationPending && signup && <button type="button" disabled={busy} className="secondary-action" onClick={() => void resend()}>Resend confirmation email</button>}
      </form>
    </section>
  </main>;
}
