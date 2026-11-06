const PENDING_REFERRAL_KEY = 'studioflow_pending_ref';
const VALID_REFERRAL_CODE = /^[A-Z0-9-]{6,32}$/;

/** Persist the public signup referral without loading the Supabase app bundle. */
export function capturePublicReferral(search: string): string {
  const params = new URLSearchParams(search);
  // Customer invitations have their own flow and storage key.
  if (params.has('app') || params.has('customer') || params.has('customer_ref')) return '';

  const code = (params.get('ref') || '').trim().toUpperCase();
  try {
    if (code && VALID_REFERRAL_CODE.test(code)) {
      window.localStorage.setItem(PENDING_REFERRAL_KEY, code);
      return code;
    }
    return window.localStorage.getItem(PENDING_REFERRAL_KEY) || '';
  } catch {
    return code && VALID_REFERRAL_CODE.test(code) ? code : '';
  }
}
