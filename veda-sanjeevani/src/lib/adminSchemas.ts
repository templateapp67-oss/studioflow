import { z } from 'zod';
import { categorySchema, themePresetSchema } from './schemas';

const uuid = z.string().uuid();
const nullableUrl = z.string().url().nullable().optional();
const jsonObject = z.record(z.string(), z.unknown());
export const roleSchema = z.enum(['owner', 'staff']);
export const profileSchema = z.object({ id: uuid, role: roleSchema, full_name: z.string().max(200) }).strict();
export const settingsRowSchema = z.object({
  id: uuid, business_name: z.string().min(1).max(200), tagline: z.string().max(1000), logo_url: nullableUrl,
  phone: z.string().max(30), whatsapp: z.string().max(30), email: z.string().max(254), address: z.string().max(2000),
  city: z.string().max(120), map_url: nullableUrl, timings: jsonObject, theme_preset: themePresetSchema,
  colors: jsonObject, fonts: jsonObject, seo: jsonObject, social: jsonObject, section_order: z.array(z.string()),
  published: z.boolean(), setup_step: z.number().int().min(1).max(7), singleton: z.literal(true),
}).passthrough();
export const sectionRowSchema = z.object({ id: uuid, key: z.string(), title: z.string(), subtitle: z.string(), body: z.string(), image_url: nullableUrl, visible: z.boolean(), sort_order: z.number().int() }).passthrough();
export const adminServiceSchema = z.object({
  id: uuid, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: z.string().min(1).max(200), category: categorySchema,
  short_desc: z.string().max(3000), long_desc: z.string().max(20000), benefits: z.array(z.string().max(500)), duration_min: z.number().int().positive().max(480),
  price: z.coerce.number().finite().nonnegative(), image_url: nullableUrl, image_alt: z.string().max(1000), dosha_tags: z.array(z.enum(['vata', 'pitta', 'kapha'])), active: z.boolean(), sort_order: z.number().int(),
}).passthrough();
export const packageRowSchema = z.object({ id: uuid, name: z.string().min(1).max(200), description: z.string().max(5000), price: z.coerce.number().finite().nonnegative(), includes: z.array(z.string()), is_featured: z.boolean(), image_url: nullableUrl, image_alt: z.string().max(1000), active: z.boolean(), sort_order: z.number().int() }).passthrough();
export const staffRowSchema = z.object({ id: uuid, name: z.string().min(1).max(200), role: z.string(), qualification: z.string(), specialty: z.array(z.string()), bio: z.string(), photo_url: nullableUrl, photo_alt: z.string(), active: z.boolean(), sort_order: z.number().int() }).passthrough();
export const faqRowSchema = z.object({ id: uuid, question: z.string(), answer: z.string(), sort_order: z.number().int(), active: z.boolean() }).passthrough();
export const galleryRowSchema = z.object({ id: uuid, image_url: z.string().url(), image_alt: z.string(), caption: z.string(), category: z.string(), sort_order: z.number().int(), active: z.boolean() }).passthrough();
export const blogRowSchema = z.object({ id: uuid, title: z.string(), slug: z.string(), excerpt: z.string(), body: z.string(), cover_url: nullableUrl, cover_alt: z.string(), published: z.boolean(), published_at: z.string().nullable() }).passthrough();
export const bookingRowSchema = z.object({
  id: uuid, start_at: z.string().datetime({ offset: true }), end_at: z.string().datetime({ offset: true }), status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']), price: z.coerce.number().nonnegative(), created_at: z.string().datetime({ offset: true }),
  service: z.object({ name: z.string(), duration_min: z.number().int().positive() }).nullable(), staff: z.object({ name: z.string() }).nullable(), customer: z.object({ name: z.string(), phone: z.string(), email: z.string().nullable() }).nullable(),
}).passthrough();
export const reviewRowSchema = z.object({ id: uuid, booking_id: uuid, rating: z.number().int().min(1).max(5), comment: z.string().max(1000), approved: z.boolean(), ai_summary: z.string().nullable(), created_at: z.string().datetime({ offset: true }) }).passthrough();
export const workingHourRowSchema = z.object({ id: uuid, weekday: z.number().int().min(0).max(6), open_time: z.string(), close_time: z.string(), is_closed: z.boolean() }).passthrough();
export const blockedDateRowSchema = z.object({ id: uuid, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string() }).passthrough();
export const staffServiceSchema = z.object({ id: uuid, staff_id: uuid, service_id: uuid }).passthrough();
export const staffGalleryRowSchema = z.object({ id: uuid, staff_id: uuid, image_url: z.string().url(), caption: z.string(), sort_order: z.number().int() }).passthrough();
export const mediaResultSchema = z.object({ media: z.object({ id: uuid, original_url: z.string().url(), url_400: z.string().url(), url_800: z.string().url(), url_1600: z.string().url(), alt_text: z.string(), bytes: z.number().int().positive(), uploaded_by: uuid, created_at: z.string() }) });
export const aiAllSchema = z.object({ items: z.array(z.object({ key: z.string(), status: z.enum(['ok', 'failed']), value: z.unknown().optional(), error: z.object({ code: z.string(), message: z.string() }).optional() })), retry_keys: z.array(z.string()) });
export const aiSummarySchema = z.object({ summary: z.string(), strengths: z.array(z.string()).length(3), improvements: z.array(z.string()).length(3), replies: z.array(z.object({ review_id: uuid, reply: z.string() })), saved: z.boolean(), review_count: z.number().int().nonnegative() });
export const firstOwnerSchema = z.boolean();
export const emptyOkSchema = z.object({ ok: z.literal(true) });
export type Role = z.infer<typeof roleSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type SettingsRow = z.infer<typeof settingsRowSchema>;
export type ServiceRow = z.infer<typeof adminServiceSchema>;
export type SectionRow = z.infer<typeof sectionRowSchema>;
export type BookingRow = z.infer<typeof bookingRowSchema>;
export type ReviewRow = z.infer<typeof reviewRowSchema>;
export type AdminAiItem = z.infer<typeof aiAllSchema>['items'][number];
