import React, { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthSession } from '../lib/useAuthSession';
import { AuthPage } from './AuthPage';
import { AuthMfaChallenge } from './AuthMfa';
import { generateRecoveryCodes, issuePayload, type RecoveryCodeEntry } from '../lib/recoveryCodes';

type Enrollment = { id: string; qr: string; secret: string };


function RecoveryCodesPanel() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codes, setCodes] = useState<RecoveryCodeEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.rpc('studioflow_mfa_recovery_codes_count').then(({ data, error }) => {
      if (!active) return;
      if (error) setFeedback('Could not load recovery codes. Reload to try again.');
      else setRemaining(typeof data === 'number' ? data : 0);
    });
    return () => { active = false; };
  }, []);

  async function issue() {
    setBusy(true);
    setFeedback('');
    setCopied(false);
    try {
      const entries = await generateRecoveryCodes(8);
      const { data, error } = await supabase.rpc('studioflow_mfa_recovery_codes_issue', { p_codes: issuePayload(entries) });
      if (error) throw error;
      setCodes(entries);
      setRemaining(typeof data === 'number' ? data : entries.length);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      setFeedback(message.includes('authenticator')
        ? 'Verify your authenticator before generating recovery codes.'
        : 'Could not generate recovery codes. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.map((entry) => entry.code).join('\n'));
      setCopied(true);
    } catch {
      setFeedback('Copy failed — select the codes and copy them manually.');
    }
  }

  return (
    <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
      <h2 className="text-lg font-semibold">Backup recovery codes</h2>
      {codes ? (
        <>
          <p role="alert" className="font-semibold">Save these now — they are shown only once and each works a single time.</p>
          <ul className="grid gap-1 font-mono text-sm">{codes.map((entry) => <li key={entry.hash}>{entry.code}</li>)}</ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-action" onClick={() => void copyAll()}>{copied ? 'Copied ✓' : 'Copy codes'}</button>
            <button type="button" className="primary-action" onClick={() => setCodes(null)}>I have saved them</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">Use a recovery code to sign in if you lose your authenticator. Each code is single-use; generating a new batch replaces every unused code you already have.</p>
          <p className="text-sm" role="status">{remaining === null ? 'Checking…' : `${remaining} unused ${remaining === 1 ? 'code' : 'codes'} remaining.`}</p>
          <button type="button" className="secondary-action" disabled={busy} onClick={() => void issue()}>{busy ? 'Generating…' : remaining ? 'Generate new recovery codes' : 'Generate recovery codes'}</button>
        </>
      )}
      {feedback && <p role="alert">{feedback}</p>}
    </div>
  );
}

function AuthenticatorSettings() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      if (error) setFeedback(error.message);
      else setEnabled(data.totp.some(item => item.status === 'verified'));
    }).catch(() => { if (active) setFeedback('Could not load authenticator settings. Reload and try again.'); });
    return () => { active = false; };
  }, []);

  async function startEnrollment() {
    setBusy(true);
    setFeedback('');
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      for (const factor of factors.all.filter(item => item.factor_type === 'totp' && item.status === 'unverified')) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Nexora SalonOS', friendlyName: 'Nexora Authenticator' });
      if (error) throw error;
      setEnrollment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (caught) {
      setFeedback(caught instanceof Error ? caught.message : 'Could not start setup.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment(event: FormEvent) {
    event.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setFeedback('');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.id, code });
      if (error) throw error;
      setEnrollment(null);
      setEnabled(true);
    } catch (caught) {
      setFeedback(caught instanceof Error ? caught.message : 'Could not verify your code.');
    } finally {
      setCode('');
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f9f9ff] p-5">
      <section className="workspace-card w-full max-w-md">
        <h1 className="mb-3 text-2xl font-bold">Account security</h1>
        {enabled && <p role="status">Two-step verification is enabled for your account.</p>}
        {enabled && <RecoveryCodesPanel />}
        {enabled === null && !feedback && <p role="status">Checking your authenticator…</p>}
        {enabled === false && !enrollment && (
          <button type="button" className="primary-action" disabled={busy} onClick={() => void startEnrollment()}>Set up an authenticator app</button>
        )}
        {enrollment && (
          <form onSubmit={confirmEnrollment} className="grid gap-3">
            <p>Scan the QR code in your authenticator app or enter this setup key manually.</p>
            <img className="w-48" src={enrollment.qr} alt="Authenticator enrollment QR code" />
            <code className="break-all select-all">{enrollment.secret}</code>
            <label htmlFor="mfa-enrollment-code">Six-digit authenticator code</label>
            <input id="mfa-enrollment-code" className="workspace-input" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} required />
            <button className="primary-action" disabled={busy}>{busy ? 'Verifying…' : 'Enable two-step verification'}</button>
          </form>
        )}
        {feedback && <p role="alert" className="mt-3">{feedback}</p>}
        <a className="secondary-action mt-3" href={securityReturnPath()}>Back to workspace</a>
      </section>
    </main>
  );
}

function securityReturnPath() {
  const source = new URLSearchParams(location.search).get('from');
  if (source === 'staff') return '/staff';
  if (source === 'customer') return '/?app=1&tab=profile';
  return '/login';
}

export function AccountSecurityPage() {
  const { session, ready, mfa, retryMfa } = useAuthSession();
  if (mfa) return <AuthMfaChallenge error={mfa.error} retry={retryMfa} />;
  if (!ready) return <p role="status" className="p-6">Checking your session…</p>;
  if (!session) return <AuthPage redirectPathOverride={location.pathname + location.search} />;
  return <AuthenticatorSettings key={session.user.id} />;
}
