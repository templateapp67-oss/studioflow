import type { z } from 'zod';
import type { siteSchema, settingsSchema, serviceSchema, packageSchema, staffSchema, gallerySchema, testimonialSchema, faqSchema, blogSchema, sectionSchema, slotSchema, bookingResultSchema, themePresetSchema, categorySchema, sectionKeySchema } from '../lib/schemas';

export type Site = z.infer<typeof siteSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Package = z.infer<typeof packageSchema>;
export type Staff = z.infer<typeof staffSchema>;
export type GalleryImage = z.infer<typeof gallerySchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type Faq = z.infer<typeof faqSchema>;
export type BlogPost = z.infer<typeof blogSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type BookingResult = z.infer<typeof bookingResultSchema>;
export type ThemePreset = z.infer<typeof themePresetSchema>;
export type Category = z.infer<typeof categorySchema>;
export type SectionKey = z.infer<typeof sectionKeySchema>;
export type Dosha = 'vata' | 'pitta' | 'kapha';
export type SiteSource = 'live' | 'saved';
export interface SiteState { site: Site; source: SiteSource }
export interface ImageSource { url: string | null; url_400?: string | null; url_800?: string | null; url_1600?: string | null }
