import React, { useId, useState } from 'react';
import {
  GOOGLE_SIGNUP_FIELD_LABELS,
  cleanGoogleSignupValues,
  googleSignupFields,
  missingGoogleSignupFields,
  type GoogleSignupRole,
  type GoogleSignupValues,
} from '../lib/googleProfileCompletion';
import { customerToday } from '../lib/customerBirthDate';
import { whatsappNational } from '../lib/customerWhatsApp';

/**
 * Blocks the workspace until a new Google account has the details NEXORA
 * requires. It replaces the old dead-end error ("Google sign-up is missing
 * required customer details… sign out and try again"): the session is already
 * valid, so the missing fields are collected here and written once.
 *
 * Scope is deliberately narrow — this is not onboarding. Owners still get
 * `OnboardingWizard` and customers still get the "One last step" sheet; this
 * gate only covers what OAuth could not carry back.
 */
export function ProfileCompletionGate({
  role,
  initial,
  busy = false,
  error = '',
  onSubmit,
  onSignOut,
}: {
  role: GoogleSignupRole;
  initial?: Partial<GoogleSignupValues>;
  busy?: boolean;
  error?: string;
  onSubmit: (values: GoogleSignupValues) => void | Promise<void>;
  onSignOut?: () => void | Promise<void>;
}) {
  const nameId = useId();
  const salonId = useId();
  const birthId = useId();
  const whatsappId = useId();
  const [values, setValues] = useState<GoogleSignupValues>(() => cleanGoogleSignupValues(initial));
  const [message, setMessage] = useState('');

  const fields = googleSignupFields(role);
  const needs = (field: keyof GoogleSignupValues) => fields.includes(field);
  const set = (field: keyof GoogleSignupValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setValues((current) => ({
      ...current,
      [field]: field === 'whatsappNumber' ? whatsappNational(raw) : raw,
    }));
    setMessage('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = cleanGoogleSignupValues(values);
    const missing = missingGoogleSignupFields(role, clean);
    if (missing.length) {
      setMessage(`Enter your ${GOOGLE_SIGNUP_FIELD_LABELS[missing[0]].toLowerCase()} to continue.`);
      return;
    }
    setMessage('');
    try {
      await onSubmit(clean);
    } catch (caught) {
      const text = caught instanceof Error
        ? caught.message
        : (typeof (caught as { message?: unknown })?.message === 'string' ? (caught as { message: string }).message : '');
      setMessage(text || 'Your details could not be saved. Please retry.');
    }
  };

  const shownError = message || error;

  return (
    <main className="min-h-screen bg-[#f9f9ff] px-4 py-12 flex items-center justify-center">
      <section className="workspace-card w-full max-w-lg">
        <p className="eyebrow">NEXORA · Google sign-up</p>
        <h1 className="text-3xl font-bold mb-2">Finish setting up your account</h1>
        <p className="muted mb-5">
          {role === 'customer'
            ? 'Google shared your email. Add these details once so salons can confirm your appointments.'
            : 'Google shared your email. Add your name and salon name so we can open your workspace.'}
        </p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {needs('fullName') && (
            <label className="block" htmlFor={nameId}>
              Full name
              <input
                id={nameId}
                className="workspace-input"
                autoComplete="name"
                maxLength={150}
                value={values.fullName}
                onChange={set('fullName')}
              />
            </label>
          )}
          {needs('salonName') && (
            <label className="block" htmlFor={salonId}>
              Salon name
              <input
                id={salonId}
                className="workspace-input"
                maxLength={150}
                value={values.salonName}
                onChange={set('salonName')}
              />
            </label>
          )}
          {needs('dateOfBirth') && (
            <label className="block" htmlFor={birthId}>
              Date of birth
              <input
                id={birthId}
                className="workspace-input"
                type="date"
                autoComplete="bday"
                min="1900-01-01"
                max={customerToday()}
                value={values.dateOfBirth}
                onChange={set('dateOfBirth')}
              />
            </label>
          )}
          {needs('whatsappNumber') && (
            <label className="block" htmlFor={whatsappId}>
              WhatsApp number
              <div className="flex items-center gap-2">
                <span aria-label="India country code" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-semibold">+91</span>
                <input
                  id={whatsappId}
                  aria-label="WhatsApp number"
                  className="workspace-input flex-1 min-w-0"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10-digit WhatsApp number"
                  maxLength={16}
                  value={values.whatsappNumber}
                  onChange={set('whatsappNumber')}
                />
              </div>
              <small>Your number stays private and is not shared with your inviter.</small>
            </label>
          )}
          {shownError && <p role="alert" className="text-sm p-3 rounded-lg bg-amber-50 text-amber-900">{shownError}</p>}
          <button className="primary-action w-full justify-center disabled:opacity-60" disabled={busy}>
            {busy ? 'Saving your details…' : 'Continue'}
          </button>
          {onSignOut && (
            <button type="button" className="secondary-action w-full justify-center" disabled={busy} onClick={() => void onSignOut()}>
              Use a different account
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

export default ProfileCompletionGate;
