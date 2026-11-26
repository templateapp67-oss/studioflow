import React, { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export function AuthMfaChallenge({ error, retry }: { error: string; retry: () => void }) {
  const [code, setCode] = useState('');
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
      if (!factor) throw new Error('No verified authenticator is available. Contact support to recover access.');
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

  return (
    <main className="grid min-h-screen place-items-center bg-[#f9f9ff] p-5">
      <section className="workspace-card w-full max-w-md">
        <h1 className="mb-3 text-2xl font-bold">Two-step verification</h1>
        {error ? (
          <><p role="alert">{error}</p><button type="button" className="primary-action my-3" onClick={retry}>Retry</button></>
        ) : (
          <form onSubmit={verify} className="grid gap-3">
            <label htmlFor="mfa-code">Six-digit code from your authenticator app</label>
            <input id="mfa-code" className="workspace-input" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} required />
            {feedback && <p role="alert">{feedback}</p>}
            <button className="primary-action" disabled={busy}>{busy ? 'Verifying…' : 'Verify and continue'}</button>
          </form>
        )}
        <button type="button" className="secondary-action mt-3" onClick={() => void supabase.auth.signOut({ scope: 'local' })}>Sign out</button>
      </section>
    </main>
  );
}
