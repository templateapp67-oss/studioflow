/**
 * Query keys that must keep loading the existing auth/application bundle after
 * the public homepage was split into a lightweight prerendered route.
 *
 * Keep this list shared by the router and the application so a Supabase
 * callback/error never lands on the marketing homepage instead of AuthPage.
 */
export const AUTH_CALLBACK_QUERY_KEYS = [
  'auth',
  'recovery',
  'invite',
  'code',
  'access_token',
  'error',
  'error_description',
  'error_code',
  'passwordUpdated',
] as const;

export function hasAuthCallbackQuery(search: string): boolean {
  const query = new URLSearchParams(search);
  return AUTH_CALLBACK_QUERY_KEYS.some((key) => query.has(key));
}

/** Supabase implicit-grant callbacks and redirect errors arrive in the fragment. */
export const AUTH_CALLBACK_FRAGMENT_KEYS = [
  'type',
  'access_token',
  'refresh_token',
  'code',
  'error',
  'error_description',
  'error_code',
] as const;

export function hasAuthCallbackFragment(hash: string): boolean {
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return AUTH_CALLBACK_FRAGMENT_KEYS.some((key) => fragment.has(key));
}
