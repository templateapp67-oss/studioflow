import { supabase } from './supabase';

/**
 * Request headers for the server AI routes.
 *
 * Those routes are rate limited per caller and, for the owner-workspace
 * generators, require a signed-in session (see `server/supabaseAuth.ts`). This
 * helper attaches the current Supabase access token so an owner's own requests
 * are attributed to their user id instead of a shared network address.
 *
 * When no session exists the token is omitted; each route decides whether to
 * reject the request. Onboarding copy fails closed and shows a generic error;
 * it does not silently replace AI output with template text.
 */
export async function aiRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // Anonymous request: the server decides what an anonymous caller may do.
  }
  return headers;
}
