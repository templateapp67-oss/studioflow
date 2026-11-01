import { z } from 'zod';

const text = z.string().max(20000);
const nullableText = text.nullable().default(null);
const uuid = z.string().uuid();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const sortOrder = z.number().int().default(0);
export const themePresetSchema = z.enum(['neem', 'saffron', 'rose_clay', 'midnight_herb', 'sandal']);
export const categorySchema = z.enum(['relax', 'detox', 'pain_relief', 'beauty', 'mind']);
export const sectionKeySchema = z.enum(['hero', 'about', 'quiz', 'services', 'team', 'packages', 'gallery', 'testimonials', 'blog', 'booking', 'faq', 'contact']);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const colorsSchema = z.object({
  sandalwood: colorSchema.optional(), neem: colorSchema.optional(), turmeric: colorSchema.optional(),
  terracotta: colorSchema.optional(), ink: colorSchema.optional(),
}).catch({});
const hourSchema = z.object({ open: z.string().regex(/^\d{2}:\d{2}$/).optional(), close: z.string().regex(/^\d{2}:\d{2}$/).optional(), closed: z.boolean().optional() });
export const settingsSchema = z.object({
  business_name: z.string().min(1).max(200), tagline: text.default(''), logo_url: nullableText,
  phone: z.string().max(30).default(''), whatsapp: z.string().max(30).default(''),
  email: z.string().max(254).default(''), address: text.default(''), city: z.string().max(120).default(''),
  map_url: nullableText, timings: z.record(z.string(), hourSchema).catch({}),
  theme_preset: themePresetSchema.catch('neem'), colors: colorsSchema,
  fonts: z.record(z.string(), z.string()).catch({}),
  seo: z.object({ title: z.string().max(200).optional(), description: z.string().max(500).optional(), og_image: z.string().url().optional() }).catch({}),
  social: z.record(z.string(), z.string()).catch({}),
  section_order: z.array(sectionKeySchema).catch(['hero', 'quiz', 'services', 'about', 'team', 'packages', 'gallery', 'testimonials', 'blog', 'booking', 'faq', 'contact']),
});
export const sectionSchema = z.object({
  key: sectionKeySchema, title: text.default(''), subtitle: text.default(''), body: text.default(''),
  image_url: nullableText, sort_order: sortOrder, visible: z.boolean().default(true),
});
export const serviceSchema = z.object({
  id: uuid, slug, name: z.string().min(1).max(200), category: categorySchema,
  short_desc: text.default(''), long_desc: text.default(''), benefits: z.array(z.string().max(500)).max(20).default([]),
  duration_min: z.number().int().positive().max(480), price: z.coerce.number().finite().nonnegative(),
  image_url: nullableText, image_alt: text.default(''), dosha_tags: z.array(z.enum(['vata', 'pitta', 'kapha'])).default([]), sort_order: sortOrder,
});
export const packageSchema = z.object({
  id: uuid, name: z.string().min(1).max(200), description: text.default(''), price: z.coerce.number().finite().nonnegative(),
  includes: z.array(z.string().max(500)).max(30).default([]), is_featured: z.boolean().default(false),
  image_url: nullableText, image_alt: text.default(''), sort_order: sortOrder,
});
export const staffGallerySchema = z.object({ id: uuid, image_url: text, caption: text.default(''), sort_order: sortOrder });
export const staffSchema = z.object({
  id: uuid, name: z.string().min(1).max(200), role: text.default(''), qualification: text.default(''),
  specialty: z.array(z.string().max(200)).max(20).default([]), bio: text.default(''), photo_url: nullableText,
  photo_alt: text.default(''), sort_order: sortOrder, service_ids: z.array(uuid).default([]), gallery: z.array(staffGallerySchema).max(30).default([]),
});
export const gallerySchema = z.object({ id: uuid, image_url: text, image_alt: text.default(''), caption: text.default(''), category: z.string().max(100).default('general'), sort_order: sortOrder });
export const testimonialSchema = z.object({ id: uuid, name: z.string().max(200), rating: z.number().int().min(1).max(5), text, photo_url: nullableText, sort_order: sortOrder });
export const faqSchema = z.object({ id: uuid, question: text, answer: text, sort_order: sortOrder });
export const blogSchema = z.object({
  id: uuid, title: z.string().max(300), slug, excerpt: text.default(''), body: text.default(''),
  cover_url: nullableText, cover_alt: text.default(''), published_at: z.string().datetime({ offset: true }).nullable().default(null),
});
export const siteSchema = z.object({
  published: z.boolean().default(true), settings: settingsSchema,
  sections: z.array(sectionSchema).max(12), services: z.array(serviceSchema).max(500),
  packages: z.array(packageSchema).max(100), staff: z.array(staffSchema).max(100),
  gallery: z.array(gallerySchema).max(200), testimonials: z.array(testimonialSchema).max(100),
  faqs: z.array(faqSchema).max(100), blog_posts: z.array(blogSchema).max(100),
});
export const slotSchema = z.object({ slot_start: z.string().datetime({ offset: true }), slot_end: z.string().datetime({ offset: true }), staff_id: uuid });
export const slotsSchema = z.array(slotSchema).max(3000);
export const bookingResultSchema = z.object({
  booking_id: uuid, start_at: z.string().datetime({ offset: true }), end_at: z.string().datetime({ offset: true }),
  service_name: z.string(), staff_name: z.string(), whatsapp_url: z.string().url().nullable(),
});
export const reviewInputSchema = z.object({ rating: z.number().int().min(1, 'Please choose a rating.').max(5), comment: z.string().trim().min(1, 'Please share a few words.').max(1000, 'Please keep your review under 1,000 characters.') });
export const quizResultSchema = z.object({ ok: z.boolean(), result_id: uuid.optional(), error_code: z.string().optional() });
export const reviewResultSchema = z.object({ ok: z.boolean(), review_id: uuid.optional(), error_code: z.string().optional() });
export const blockedDatesSchema = z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
export const workingHoursSchema = z.array(z.object({ weekday: z.number().int().min(0).max(6), is_closed: z.boolean() }));
