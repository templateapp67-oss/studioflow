/**
 * Google sign-up profile completion.
 *
 * A Google account can return from OAuth before the visitor has entered the
 * details NEXORA needs (customer: name + date of birth + WhatsApp number;
 * owner: name + salon name). Previously that dead-ended in a thrown error and
 * forced a sign-out. `ProfileCompletionGate` now collects just the missing
 * fields after the session exists, so the new account is never stranded.
 *
 * The checks here are pure and shared by the gate and `App.tsx`, which keeps
 * the same mandatory fields as email sign-up (`AuthPage`) and the customer
 * "One last step" sheet in `CustomerApp`.
 */

import type { GoogleOAuthIntent } from './googleOAuth';
import { customerWhatsApp, validCustomerWhatsApp, whatsappNational } from './customerWhatsApp';
import { customerToday, validCustomerBirthDate } from './customerBirthDate';

export type GoogleSignupRole = 'owner' | 'customer';

export type GoogleSignupValues = {
  fullName: string;
  salonName: string;
  dateOfBirth: string;
  whatsappNumber: string;
};

export type GoogleSignupField = keyof GoogleSignupValues;

/** Fields that OAuth sign-up must have before the profile is written. */
export function googleSignupFields(role: GoogleSignupRole): GoogleSignupField[] {
  return role === 'customer'
    ? ['fullName', 'dateOfBirth', 'whatsappNumber']
    : ['fullName', 'salonName'];
}

export function cleanGoogleSignupValues(values: Partial<GoogleSignupValues> | null | undefined): GoogleSignupValues {
  return {
    fullName: String(values?.fullName || '').trim().slice(0, 150),
    salonName: String(values?.salonName || '').trim().slice(0, 150),
    dateOfBirth: String(values?.dateOfBirth || '').trim(),
    whatsappNumber: whatsappNational(String(values?.whatsappNumber || '')).slice(0, 15),
  };
}

/** Values a returning OAuth intent already carries. */
export function googleSignupValuesFromIntent(intent: GoogleOAuthIntent | null | undefined): GoogleSignupValues {
  return cleanGoogleSignupValues({
    fullName: intent?.fullName || '',
    salonName: intent?.salonName || '',
    dateOfBirth: intent?.dateOfBirth || '',
    whatsappNumber: intent?.whatsappNumber || '',
  });
}

function isMissing(field: GoogleSignupField, values: GoogleSignupValues, today: string): boolean {
  if (field === 'fullName') return values.fullName.length === 0;
  if (field === 'salonName') return values.salonName.length === 0;
  if (field === 'dateOfBirth') return !values.dateOfBirth || !validCustomerBirthDate(values.dateOfBirth, today);
  return !values.whatsappNumber || !validCustomerWhatsApp(values.whatsappNumber);
}

/** Missing or invalid mandatory fields for this role, in form order. */
export function missingGoogleSignupFields(
  role: GoogleSignupRole,
  values: Partial<GoogleSignupValues> | null | undefined,
  today: string = customerToday(),
): GoogleSignupField[] {
  const clean = cleanGoogleSignupValues(values);
  return googleSignupFields(role).filter((field) => isMissing(field, clean, today));
}

/** Human labels used by the gate, the error copy and the verification suite. */
export const GOOGLE_SIGNUP_FIELD_LABELS: Record<GoogleSignupField, string> = {
  fullName: 'Full name',
  salonName: 'Salon name',
  dateOfBirth: 'Date of birth',
  whatsappNumber: 'WhatsApp number',
};

/** Stored metadata value for the WhatsApp number (E.164-ish `+91…`, or empty). */
export function googleSignupWhatsApp(value: GoogleSignupValues): string {
  return customerWhatsApp(value.whatsappNumber) || '';
}
