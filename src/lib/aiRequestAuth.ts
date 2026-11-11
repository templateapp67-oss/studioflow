import { supabase } from './supabase';

/**
 * Request headers for the server AI routes.
 *
 * Those routes are rate limited per caller and, for the owner-workspace
 * generators, require a signed-in session (see `server/supabaseAuth.ts`). This
 * helper attaches the current Supabase access token so an owner's own requests
 * are attributed to their user id instead of a shared network address.
 *
 * When no session exists the token is simply omitted: the request then travels
 * anonymously and the server applies its strict anonymous budget. Every caller
 * already has a template fallback for a non-2xx response, so a missing session
 * degrades the feature instead of breaking the page.
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
