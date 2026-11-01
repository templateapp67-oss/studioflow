import { z } from 'zod';
import { getSupabase } from './api';
import { envResult } from './env';
import { ApiError } from './api';
import {
  adminServiceSchema, aiAllSchema, aiSummarySchema, blockedDateRowSchema, bookingRowSchema, blogRowSchema,
  faqRowSchema, firstOwnerSchema, galleryRowSchema, mediaResultSchema, packageRowSchema,
  reviewRowSchema, sectionRowSchema, settingsRowSchema, staffGalleryRowSchema, staffRowSchema,
  workingHourRowSchema,
} from './adminSchemas';
import { slotsSchema } from './schemas';

export const ADMIN_QUERY_KEY = ['admin'] as const;
export type AdminTable = 'sections' | 'services' | 'packages' | 'staff' | 'faqs' | 'gallery' | 'blog_posts' | 'reviews' | 'bookings' | 'working_hours' | 'blocked_dates' | 'staff_gallery';
const schemas = {
  sections: sectionRowSchema, services: adminServiceSchema, packages: packageRowSchema, staff: staffRowSchema,
  faqs: faqRowSchema, gallery: galleryRowSchema, blog_posts: blogRowSchema, reviews: reviewRowSchema,
  bookings: bookingRowSchema, working_hours: workingHourRowSchema, blocked_dates: blockedDateRowSchema,
  staff_gallery: staffGalleryRowSchema,
} as const;
type RowFor<T extends AdminTable> = z.infer<(typeof schemas)[T]>;
function getClient() { if (!envResult.ok) throw new ApiError('CONFIGURATION', 'Add your Supabase project URL and public anon key first.'); return getSupabase(envResult.value); }
function friendlyBackendMessage(code: string) {
  const messages: Record<string, string> = {
    AI_UNAVAILABLE: 'AI is busy right now. Please try again.', RATE_LIMITED: 'Please wait a minute and try again.',
    UNAUTHENTICATED: 'Your session expired. Please sign in again.', FORBIDDEN: 'Your account does not have permission for that action.',
    NOT_ENOUGH_DATA: 'At least three recent reviews are needed for a summary.', INVALID_INPUT: 'Please check the fields and try again.',
  };
  return messages[code] ?? 'We could not complete that request. Please try again.';
}
export async function firstOwnerSetupAvailable() {
  const { data, error } = await getClient().rpc('first_owner_setup_available');
  if (error) throw new ApiError('UNAVAILABLE', 'Could not check first-time owner setup. Please retry.');
  return firstOwnerSchema.parse(data);
}
export async function createFirstOwner(email: string, password: string, fullName: string, redirectTo: string) {
  const client = getClient();
  const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() }, emailRedirectTo: redirectTo } });
  if (error) throw new ApiError('AUTH', friendlyAuthMessage(error.message));
  if (data.session) return { requiresEmail: false };
  return { requiresEmail: true };
}
function friendlyAuthMessage(message: string) {
  const value = message.toLowerCase();
  if (value.includes('rate limit') || value.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (value.includes('already registered')) return 'An account with this email already exists. Try signing in instead.';
  if (value.includes('password')) return 'Choose a password with at least eight characters.';
  if (value.includes('network') || value.includes('fetch')) return 'We could not reach Supabase. Check your connection and try again.';
  return 'We could not create this account. Check the details and try again.';
}
export async function resetPassword(email: string, redirectTo: string) {
  const { error } = await getClient().auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw new ApiError('AUTH', friendlyAuthMessage(error.message));
}
export async function loadAdminSettings() {
  const { data, error } = await getClient().from('site_settings').select('*').limit(1).maybeSingle();
  if (error) throw new ApiError('READ_FAILED', 'We could not load studio settings. Please retry.');
  return data ? settingsRowSchema.parse(data) : null;
}
export async function saveAdminSettings(id: string, patch: Record<string, unknown>) {
  const parsedPatch = z.record(z.string(), z.unknown()).parse(patch);
  const { data, error } = await getClient().from('site_settings').update(parsedPatch).eq('id', id).select('*').single();
  if (error) throw new ApiError('SAVE_FAILED', 'We could not save studio settings. Your changes are still on this screen.');
  return settingsRowSchema.parse(data);
}
export async function loadAdminCollection<T extends AdminTable>(table: T): Promise<RowFor<T>[]> {
  const sort = table === 'bookings' ? 'start_at' : 'sort_order';
  let query = getClient().from(table).select('*').order(sort, { ascending: table !== 'bookings' });
  if (table === 'bookings') query = query.order('id', { ascending: true });
  if (table === 'reviews') query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw new ApiError('READ_FAILED', `We could not load ${table.replace('_', ' ')}. Please retry.`);
  return z.array(schemas[table]).parse(data) as RowFor<T>[];
}
export async function loadBookings() {
  const { data, error } = await getClient().from('bookings')
    .select('id,start_at,end_at,status,price,created_at,service:services(name,duration_min),staff:staff(name),customer:customers(name,phone,email)')
    .order('start_at', { ascending: true }).limit(500);
  if (error) throw new ApiError('READ_FAILED', 'We could not load bookings. Please retry.');
  return z.array(bookingRowSchema).parse(data);
}
export async function mutateRow<T extends AdminTable>(table: T, id: string, patch: Record<string, unknown>): Promise<RowFor<T>> {
  const safePatch = z.record(z.string(), z.unknown()).parse(patch);
  const { data, error } = await getClient().from(table).update(safePatch).eq('id', id).select('*').single();
  if (error) throw new ApiError('SAVE_FAILED', `We could not save this ${table.replace('_', ' ').replace(/s$/, '')}. Your changes have been restored.`);
  return schemas[table].parse(data) as RowFor<T>;
}
export async function insertRow<T extends AdminTable>(table: T, row: Record<string, unknown>): Promise<RowFor<T>> {
  const safeRow = z.record(z.string(), z.unknown()).parse(row);
  const { data, error } = await getClient().from(table).insert(safeRow).select('*').single();
  if (error) throw new ApiError('SAVE_FAILED', `We could not add this ${table.replace('_', ' ').replace(/s$/, '')}.`);
  return schemas[table].parse(data) as RowFor<T>;
}
export async function deleteRow(table: AdminTable, id: string) {
  const { error } = await getClient().from(table).delete().eq('id', id);
  if (error) throw new ApiError('DELETE_FAILED', 'We could not remove this item. Refresh and try again.');
}
export async function setStaffService(staffId: string, serviceId: string, enabled: boolean) {
  const client = getClient();
  const response = enabled
    ? await client.from('staff_services').upsert({ staff_id: staffId, service_id: serviceId }, { onConflict: 'staff_id,service_id' })
    : await client.from('staff_services').delete().eq('staff_id', staffId).eq('service_id', serviceId);
  if (response.error) throw new ApiError('SAVE_FAILED', 'We could not update this practitioner’s service assignment.');
}
export async function updateBookingStatus(id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show') {
  const { data, error } = await getClient().from('bookings').update({ status }).eq('id', id).select('id,start_at,end_at,status,price,created_at,service:services(name,duration_min),staff:staff(name),customer:customers(name,phone,email)').single();
  if (error) throw new ApiError('SAVE_FAILED', 'We could not update this appointment. Refresh and try again.');
  return bookingRowSchema.parse(data);
}
export async function rescheduleBooking(id: string, serviceId: string, staffId: string | null, startAt: string) {
  const client = getClient();
  const { data: raw, error: slotError } = await client.rpc('get_available_slots', { p_service_id: serviceId, p_staff_id: staffId, p_date: startAt.slice(0, 10) });
  if (slotError || !slotsSchema.parse(raw).some((slot) => slot.slot_start === startAt && (!staffId || slot.staff_id === staffId))) throw new ApiError('SLOT_TAKEN', 'That time is no longer available. Pick another slot.');
  const { data, error } = await client.from('bookings').update({ start_at: startAt }).eq('id', id).select('id,start_at,end_at,status,price,created_at,service:services(name,duration_min),staff:staff(name),customer:customers(name,phone,email)').single();
  if (error) throw new ApiError('SLOT_TAKEN', 'That time was just taken. Refresh availability and choose another.');
  return bookingRowSchema.parse(data);
}
const functionEnvelope = z.object({ ok: z.boolean(), data: z.unknown().optional(), error: z.object({ code: z.string(), message: z.string().max(1000) }).optional() }).strict();
async function invoke<T extends z.ZodType>(name: string, payload: unknown, schema: T): Promise<z.infer<T>> {
  const client = getClient();
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new ApiError('UNAUTHENTICATED', friendlyBackendMessage('UNAUTHENTICATED'));
  const response = await fetch(`${envResult.ok ? envResult.value.VITE_SUPABASE_URL.replace(/\/$/, '') : ''}/functions/v1/${name}`, {
    method: 'POST', headers: { apikey: envResult.ok ? envResult.value.VITE_SUPABASE_ANON_KEY : '', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(120000),
  });
  let parsedJson: unknown;
  try { parsedJson = await response.json(); } catch { throw new ApiError('UPSTREAM', 'The backend returned an invalid response. Please retry.'); }
  const envelope = functionEnvelope.safeParse(parsedJson);
  if (!envelope.success) throw new ApiError('UPSTREAM', 'The backend response did not match the expected format.');
  if (!envelope.data.ok) {
    const code = envelope.data.error?.code ?? 'UPSTREAM';
    throw new ApiError(code, friendlyBackendMessage(code));
  }
  return schema.parse(envelope.data.data);
}
export interface AiAllInput { business_name: string; city: string; keywords: [string, string, string]; tone: 'calm' | 'premium' | 'traditional'; language: 'en' | 'hi' | 'hinglish'; only?: string[] }
export async function generateAll(input: AiAllInput) { return invoke('ai-generate-all', input, aiAllSchema); }
export interface AiContentInput { type: 'service_description' | 'about' | 'blog' | 'faq' | 'seo' | 'review_reply' | 'alt_text'; context: Record<string, unknown>; tone: AiAllInput['tone']; language: AiAllInput['language'] }
export async function generateContent(input: AiContentInput) { return invoke('ai-generate-content', input, z.record(z.string(), z.unknown())); }
export async function summarizeReviews(save: boolean, language: 'en' | 'hi' | 'hinglish' = 'en') { return invoke('summarize-reviews', { save, language }, aiSummarySchema); }
export interface RegisterMediaInput { original_url: string; url_400: string; url_800: string; url_1600: string; alt_text: string; bytes: number }
export async function registerMedia(input: RegisterMediaInput) { return invoke('register-media', input, mediaResultSchema); }
export async function saveMediaAlt(id: string, altText: string) {
  const { error } = await getClient().from('media').update({ alt_text: altText }).eq('id', id);
  if (error) throw new ApiError('SAVE_FAILED', 'The image is uploaded, but we could not save its alternative text. Edit and retry.');
}
export function adminRealtime() { return getClient(); }
export function isAdminApiError(error: unknown): error is ApiError { return error instanceof ApiError; }
