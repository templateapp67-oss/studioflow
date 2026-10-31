import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || "https://zilwgiuiygqqardzutxi.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppbHdnaXVpeWdxcWFyZHp1dHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODYyNjcsImV4cCI6MjEwMjg2MjI2N30.-0Ict1PxLvVhD0gl0lYMBifJAe6IRksKme-E_Sf97ok";

export const isSupabaseConfigured =
  !SUPABASE_URL.includes("placeholder") && SUPABASE_ANON_KEY.length > 40;

export const supabaseHost = new URL(SUPABASE_URL).hostname;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function websiteLink(slug?: string): string {
  if (!slug) return '/';
  return `${typeof location === 'undefined' ? '' : location.origin}/?site=${encodeURIComponent(slug)}`;
}

export async function uploadSalonImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Use JPG, PNG or WebP images smaller than 5 MB.');
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in before uploading photos.');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
  const result = await supabase.storage.from('studioflow-media').upload(path, file, {contentType:file.type, upsert:false});
  if (result.error) throw result.error;
  return supabase.storage.from('studioflow-media').getPublicUrl(path).data.publicUrl;
}

export function captureReferral(code?: string): string {
  try {
    const referral = code || new URLSearchParams(typeof location === 'undefined' ? '' : location.search).get('ref') || '';
    if (referral) localStorage.setItem('studioflow_pending_ref', referral);
    return referral || localStorage.getItem('studioflow_pending_ref') || '';
  } catch { return ''; }
}
