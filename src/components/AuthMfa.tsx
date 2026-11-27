import React, { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export function AuthMfaChallenge({ error, retry }: { error: string; retry: () => void }) {
  const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const factor = data.totp.find(item => item.status === 'verified');
      if (!factor) throw new Error('No verified authenticator is available. Use a recovery code instead.');
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (verifyError) throw verifyError;
      retry();
    } catch (caught) {
      setCode('');
      setFeedback(caught instanceof Error ? caught.message : 'Could not verify your code. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function consumeRecovery(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error('Your session expired. Sign in again.');
      const response = await fetch('/api/account/recovery-codes/consume', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: recoveryCode }),
      });
      const body = await response.json().catch(() => ({})) as {
        consumed?: boolean; code?: string; retryAfterSeconds?: number; error?: string;
      };
      if (response.status === 429) {
        throw new Error(`Too many recovery attempts. Try again in ${Math.max(1, Math.ceil((body.retryAfterSeconds ?? 600) / 60))} minutes.`);
      }
      if (response.status === 401) throw new Error('Your session expired. Sign in again.');
      if (response.status === 503) throw new Error('Recovery is temporarily unavailable. Try again shortly.');
      if (!response.ok || body.consumed !== true) {
        throw new Error('That recovery code is not valid, or it was already used.');
      }
      setRecoveryDone(true);
    } catch (caught) {
      setRecoveryCode('');
      setFeedback(caught instanceof Error ? caught.message : 'Could not use that recovery code. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (recoveryDone) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f9f9ff] p-5">
        <section className="workspace-card w-full max-w-md">
          <h1 className="mb-3 text-2xl font-bold">Recovery code accepted</h1>
          <p role="status">You have <strong>10 minutes</strong> to set up your authenticator again. Open <strong>Account security</strong> after continuing, enrol a new authenticator, then remove the lost one.</p>
          <button type="button" className="primary-action mt-4" onClick={retry}>Continue</button>
          <button type="button" className="secondary-action mt-3" onClick={() => void supabase.auth.signOut({ scope: 'local' })}>Sign out</button>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f9f9ff] p-5">
      <section className="workspace-card w-full max-w-md">
        <h1 className="mb-3 text-2xl font-bold">Two-step verification</h1>
        {error ? (
          <><p role="alert">{error}</p><button type="button" className="primary-action my-3" onClick={retry}>Retry</button></>
        ) : mode === 'totp' ? (
          <form onSubmit={verify} className="grid gap-3">
            <label htmlFor="mfa-code">Six-digit code from your authenticator app</label>
            <input id="mfa-code" className="workspace-input" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} required />
            {feedback && <p role="alert">{feedback}</p>}
            <button className="primary-action" disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue'}</button>
            <button type="button" className="secondary-action" onClick={() => { setMode('recovery'); setFeedback(''); }}>Lost your authenticator? Use a recovery code</button>
          </form>
        ) : (
          <form onSubmit={consumeRecovery} className="grid gap-3">
            <p>Enter one of your backup recovery codes (for example, <code>XXXX-XXXX-XXXX-XXXX</code>). Each code works once.</p>
            <label htmlFor="mfa-recovery-code">Recovery code</label>
            <input id="mfa-recovery-code" className="workspace-input" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} maxLength={48} value={recoveryCode} onChange={event => setRecoveryCode(event.target.value.toUpperCase())} required />
            {feedback && <p role="alert">{feedback}</p>}
            <button className="primary-action" disabled={busy}>{busy ? 'Checking…' : 'Use recovery code'}</button>
            <button type="button" className="secondary-action" onClick={() => { setMode('totp'); setFeedback(''); }}>Back to authenticator code</button>
          </form>
        )}
        <button type="button" className="secondary-action mt-3" onClick={() => void supabase.auth.signOut({ scope: 'local' })}>Sign out</button>
      </section>
    </main>
  );
}
