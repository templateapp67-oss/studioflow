export type GoogleOAuthIntent = {
  version: 1;
  role: 'owner' | 'customer';
  mode: 'signin' | 'signup';
  fullName: string;
  salonName: string;
  dateOfBirth: string;
  whatsappNumber: string;
  referralCode: string;
  welcomeWhatsApp: boolean;
  createdAt: number;
};

const STORAGE_KEY = 'nexora_google_oauth_intent_v1';
const MAX_AGE_MS = 15 * 60 * 1000;

/** Keep only the minimum onboarding data needed while Google redirects away and back. */
export function saveGoogleOAuthIntent(
  value: Omit<GoogleOAuthIntent, 'version' | 'createdAt'>,
): void {
  try {
    const intent: GoogleOAuthIntent = { ...value, version: 1, createdAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    throw new Error('Your browser could not save the Google sign-in details. Allow session storage and try again.');
  }
}

export function readGoogleOAuthIntent(): GoogleOAuthIntent | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<GoogleOAuthIntent>;
    const valid =
      value.version === 1 &&
      (value.role === 'owner' || value.role === 'customer') &&
      (value.mode === 'signin' || value.mode === 'signup') &&
      typeof value.createdAt === 'number' &&
      Date.now() - value.createdAt <= MAX_AGE_MS;
    if (!valid) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      version: 1,
      role: value.role!,
      mode: value.mode!,
      fullName: typeof value.fullName === 'string' ? value.fullName : '',
      salonName: typeof value.salonName === 'string' ? value.salonName : '',
      dateOfBirth: typeof value.dateOfBirth === 'string' ? value.dateOfBirth : '',
      whatsappNumber: typeof value.whatsappNumber === 'string' ? value.whatsappNumber : '',
      referralCode: typeof value.referralCode === 'string' ? value.referralCode : '',
      welcomeWhatsApp: value.welcomeWhatsApp === true,
      createdAt: value.createdAt,
    };
  } catch {
    return null;
  }
}

export function clearGoogleOAuthIntent(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browsing modes.
  }
}
