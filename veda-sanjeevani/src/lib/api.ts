import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import fallbackJson from '../data/site.config.json';
import { siteSchema, slotsSchema, bookingResultSchema, quizResultSchema, reviewResultSchema, blogSchema, workingHoursSchema } from './schemas';
import type { Env } from './env';
import type { Site, SiteState, BookingResult } from '../types';
import { normalizePhone } from './format';

export const fallbackSite: Site = siteSchema.parse(fallbackJson);
let client: SupabaseClient | null = null;
export function getSupabase(env: Env) { return client ??= createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) } }); }
async function rpc(env: Env, name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await getSupabase(env).rpc(name, args);
  if (error) throw new Error('The live service is temporarily unavailable. Please try again.');
  return data as unknown;
}
export async function loadSite(env: Env): Promise<SiteState> {
  try { const parsed = siteSchema.parse(await rpc(env, 'get_public_site')); if (!parsed.published || !parsed.settings.business_name) throw new Error('Not published'); return { site: parsed, source: 'live' }; }
  catch { return { site: fallbackSite, source: 'saved' }; }
}
export async function loadBlog(env: Env, slug: string, source: SiteState['source']) {
  const saved = fallbackSite.blog_posts.find((post) => post.slug === slug);
  if (source === 'saved') { if (saved) return saved; throw new Error('This article is not in the saved collection.'); }
  try { const { data, error } = await getSupabase(env).from('blog_posts').select('id,title,slug,excerpt,body,cover_url,cover_alt,published_at').eq('slug', slug).eq('published', true).maybeSingle(); if (error) throw new Error('Could not load article'); if (!data) return null; return blogSchema.parse(data); }
  catch { if (saved) return saved; throw new Error('We could not load this article. Please retry.'); }
}
export async function loadSlots(env: Env, serviceId: string, staffId: string | null, date: string) { return slotsSchema.parse(await rpc(env, 'get_available_slots', { p_service_id: serviceId, p_staff_id: staffId || null, p_date: date })); }
export async function loadCalendar(env: Env) {
  const supabase = getSupabase(env);
  const hours = await supabase.from('working_hours').select('weekday,is_closed');
  if (hours.error) throw new Error('Calendar unavailable. You can still check a date.');
  return { blocked: [] as string[], closed: workingHoursSchema.parse(hours.data).filter((row) => row.is_closed).map((row) => row.weekday) };
}
export class ApiError extends Error { constructor(public code: string, message: string) { super(message); this.name = 'ApiError'; } }
const envelope = <T extends z.ZodTypeAny>(schema: T) => z.discriminatedUnion('ok', [z.object({ ok: z.literal(true), data: schema }), z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string().max(1000) }) })]);
export interface BookingInput { service_id: string; staff_id: string | null; start_at: string; name: string; phone: string; email: string; notes: string; website: string }
export async function createBooking(env: Env, input: BookingInput): Promise<BookingResult> {
  const response = await fetch(`${env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/create-booking-public`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: env.VITE_SUPABASE_ANON_KEY }, body: JSON.stringify({ ...input, phone: normalizePhone(input.phone) }), signal: AbortSignal.timeout(15000) });
  const json: unknown = await response.json();
  const result = envelope(bookingResultSchema).parse(json);
  if (!result.ok) throw new ApiError(result.error.code, result.error.message);
  return result.data;
}
export async function saveQuiz(env: Env, scores: { vata: number; pitta: number; kapha: number }, result: string) { return quizResultSchema.parse(await rpc(env, 'save_quiz_result', { p_vata: scores.vata, p_pitta: scores.pitta, p_kapha: scores.kapha, p_result: result })); }
export async function submitReview(env: Env, token: string, rating: number, comment: string) { return reviewResultSchema.parse(await rpc(env, 'submit_review', { p_token: token, p_rating: rating, p_comment: comment })); }
