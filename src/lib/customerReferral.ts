/**
 * Referral management for the Nexora customer network.
 * Stores referral codes in local storage and manages URL parameter capture.
 */

const STORAGE_KEY = 'nexora_customer_referral';
const INVITE_PATH = '/invite/';

export const isCustomerInviteEntry =
  typeof window !== 'undefined' &&
  typeof window.location !== 'undefined' &&
  typeof window.location.pathname === 'string' &&
  window.location.pathname.startsWith(INVITE_PATH);

export function captureCustomerReferral(): string {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') return '';
  
  // 1. Check URL path for /invite/CODE
  if (isCustomerInviteEntry) {
    const code = window.location.pathname.slice(INVITE_PATH.length).split('/')[0];
    if (code) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, code);
      }
      return code;
    }
  }

  // 2. Check URL search params for ?ref=CODE
  const urlParams = new URLSearchParams(window.location.search || '');
  const refCode = urlParams.get('ref') || urlParams.get('referral');
  if (refCode) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, refCode);
    }
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('nexora-referral-changed'));
    }
    return refCode;
  }

  // 3. Fallback to local storage
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) || '';
  }
  return '';
}

export function rememberCustomerReferral(code?: string): void {
  if (!code || typeof window === 'undefined') return;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
  }
  if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('nexora-referral-changed'));
  }
}

export function clearCustomerReferral(): void {
  if (typeof window === 'undefined') return;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('nexora-referral-changed'));
  }
}

export function customerReferralLink(code: string): string {
  if (!code) return '/?app=1';
  const base = typeof window !== 'undefined' && typeof window.location !== 'undefined' ? window.location.origin : '';
  return `${base}${INVITE_PATH}${encodeURIComponent(code)}`;
}
