import React, { useState } from 'react';
import { subscribePrismNewsletter, validatePrismNewsletterEmail } from '../../lib/prismSite';
import { PrismInlineNotice } from './LiveStates';

export function PrismNewsletterSignup({ slug, live }: { slug: string; live: boolean }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    const problem = validatePrismNewsletterEmail(email);
    if (problem) {
      setError(problem);
      return;
    }
    if (!live || !slug) {
      setError('Newsletter sign-up opens when the salon publishes its website.');
      return;
    }
    setBusy(true);
    try {
      await subscribePrismNewsletter({ slug, email });
      setDone(true);
      setEmail('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not add you to the list. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <PrismInlineNotice tone="success">
        You are on the colour list. Watch your inbox for offers and care tips.
      </PrismInlineNotice>
    );
  }

  return (
    <>
      <form className="pc-newsletter" onSubmit={submit} noValidate>
        <label className="pc-sr-only" htmlFor="pc-newsletter-email">Email for colour offers</label>
        <input
          id="pc-newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
          }}
          placeholder="you@example.com"
          className="pc-newsletter-input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'pc-newsletter-error' : undefined}
        />
        <button type="submit" className="pc-btn pc-btn-gradient px-4 py-2.5 text-sm" disabled={busy}>
          {busy ? 'Joining…' : 'Join'}
        </button>
      </form>
      {error && <p id="pc-newsletter-error" role="alert" className="pc-form-error">{error}</p>}
    </>
  );
}
