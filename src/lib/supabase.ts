import { createClient } from '@supabase/supabase-js';
import { NEXORA_PROJECT_HOST, resolveSupabaseConfig } from './nexoraEnv';

// The existing StudioFlow Supabase project. The URL and the publishable (anon)
// browser key are safe to ship to the browser: all access is restricted by
// database policies and RPCs. VITE_SUPABASE_* build variables may override them
// (for example for a staging project), but the defaults keep the live project
// working when no build variables are supplied. Never put service-role keys here.
//
// NEXORA SALONOS landing wiring (SUPABASE_WIRING_NEXORA_SALONOS.md):
//   VITE_SUPABASE_URL                 – project URL of the landing project
//   VITE_SUPABASE_PUBLISHABLE_KEY     – publishable browser key (never the secret)
//   VITE_SUPABASE_ANON_KEY            – legacy alias kept for older deployments
const PROJECT_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH';

const env = (import.meta as any).env || {};
// The configuration is validated before the client is created: a malformed URL
// or a privileged key in a browser variable fails fast instead of silently
// pointing the application at the wrong project.
const resolved = resolveSupabaseConfig(env, PROJECT_URL, PUBLISHABLE_KEY);
const supabaseUrl: string = resolved.url;
const supabasePublishableKey: string = resolved.publishableKey;

/** The single browser Supabase client used by the whole application. */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'studioflow_supabase_session' },
});

/** Project URL the browser client is pointed at. */
export const SUPABASE_PROJECT_URL = supabaseUrl;

/** Host of the configured project (public information, never a credential). */
export const SUPABASE_PROJECT_HOST = NEXORA_PROJECT_HOST;

/** Project reference (the `zilwgiuiygqqardzutxi` part of the project URL). */
export const SUPABASE_PROJECT_REF = (() => {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] ?? '';
  } catch {
    return '';
  }
})();

/** True when a Supabase project URL and publishable key are configured. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);


export function captureReferral() {
  const params = new URLSearchParams(location.search);
  if (params.has('app') || params.has('customer') || params.has('customer_ref')) return '';
  const code = params.get('ref')?.trim().toUpperCase();
  try {
    if (code && /^[A-Z0-9-]{6,32}$/.test(code)) localStorage.setItem('studioflow_pending_ref', code);
    return code || localStorage.getItem('studioflow_pending_ref') || '';
  } catch {
    return code || '';
  }
}

const browserOrigin = () => (typeof location === 'undefined' ? '' : location.origin);
export const websiteLink = (slug: string) => `${browserOrigin()}/?site=${encodeURIComponent(slug)}`;

export async function uploadSalonImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Use JPG, PNG or WebP images smaller than 5 MB.');
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in before uploading photos.');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
  const result = await supabase.storage.from('studioflow-media').upload(path, file, { contentType: file.type, upsert: false });
  if (result.error) throw result.error;
  return supabase.storage.from('studioflow-media').getPublicUrl(path).data.publicUrl;
}
