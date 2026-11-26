/**
 * Template 14 — Veda Sanjeevani customizer engine.
 *
 * Everything the "Customize this template" dashboard needs, with no UI in it:
 *
 *  • the workspace bridge (platform records ⇄ one typed `VedaConfig`),
 *  • defaults / reset, validation with plain-language messages,
 *  • undo-redo history and an autosaved draft that survives a closed tab,
 *  • owner access check,
 *  • the 30-minute launch checklist with real progress,
 *  • image presets + a focal-point-aware crop helper used by the uploader,
 *  • the AI content request (secure server call) and an honest offline fallback.
 *
 * Nothing here writes to the database: the drawer hands a patch back to the
 * existing workspace save/publish flow, exactly like Templates 09–13.
 */
import {
  VEDA_ANNOUNCEMENT_FALLBACK,
  buildVedaFallbackContent,
  type VedaAiContent,
  type VedaAiDetails,
  type VedaAiMode,
} from './vedaSanjeevaniAi';
import {
  defaultVedaConfig,
  resolveVedaConfig,
  VEDA_BRAND_NAME,
  VEDA_FAQS,
  VEDA_FULL_NAME,
  VEDA_IMAGE_PROMPTS,
  VEDA_OFFERS,
  VEDA_PACKAGES,
  VEDA_SERVICES,
  VEDA_TAGLINE,
  VEDA_TESTIMONIALS,
  VEDA_THEMES,
  VEDA_THERAPISTS,
  type VedaConfig,
  type VedaFaq,
  type VedaGalleryImage,
  type VedaOffer,
  type VedaPackage,
  type VedaSectionId,
  type VedaSignatureExperience,
  type VedaTestimonial,
  type VedaService,
  type VedaWhyItem,
} from './vedaSanjeevani';
import type { SalonProfile, SalonService, Stylist } from '../types';
import { aiRequestHeaders } from './aiRequestAuth';

export const VEDA_TEMPLATE_ID = 'ayurvedic_spa';
const VEDA_REFS = new Set([
  'ayurvedic_spa',
  'ayurvedic-spa',
  'ayurvedicspa',
  'ayurveda',
  'veda',
  'veda-sanjeevani',
  'vedasanjeevani',
  'veda-sanjeevani-ayurvedic-wellness-spa',
  'wellness-spa',
  'panchakarma',
  '14',
  'template-14',
  'template14',
  'spa',
]);

export function isVedaTemplate(reference?: string | null): boolean {
  if (!reference) return false;
  return VEDA_REFS.has(String(reference).trim().toLowerCase());
}

/* ------------------------------------------------------------------ *
 * Config ⇄ workspace
 * ------------------------------------------------------------------ */

export type VedaWorkspace = {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
};

/** The stored template config for a profile (always resolved over defaults). */
export function vedaConfigFor(profile: SalonProfile): VedaConfig {
  return resolveVedaConfig((profile as SalonProfile & { veda?: Partial<VedaConfig> }).veda);
}

/** Template defaults for a brand-new Veda Sanjeevani workspace. */
export function vedaStarterContent() {
  return {
    config: defaultVedaConfig(),
    services: VEDA_SERVICES.map((service) => ({ ...service })) as SalonService[],
    stylists: VEDA_THERAPISTS.map((therapist) => ({ ...therapist })),
  };
}

/** Everything an owner can change, in one object (used for dirty checks). */
export function vedaWorkspaceSnapshot(workspace: VedaWorkspace, config: VedaConfig): string {
  return JSON.stringify({
    config: { ...config, ai: undefined },
    services: workspace.services.map((service) => [service.id, service.name, service.price, service.durationMinutes, service.description, service.category, service.imageUrl, service.popular]),
    stylists: workspace.stylists.map((stylist) => [stylist.id, stylist.name, stylist.role, stylist.avatarUrl, stylist.bio, stylist.specialties, stylist.experienceYears]),
    profile: {
      businessName: workspace.profile.businessName,
      phone: workspace.profile.phone,
      whatsapp: workspace.profile.whatsapp,
      address: workspace.profile.address,
      city: workspace.profile.city,
      logoUrl: workspace.profile.logoUrl,
      tagline: workspace.profile.tagline,
      about: workspace.profile.about,
    },
  });
}

/** The profile patch that stores a config — the only new field is `veda`. */
export function vedaConfigPatch(config: VedaConfig): Partial<SalonProfile> {
  return { veda: { ...config, schemaVersion: 1 } as SalonProfile['veda'] } as Partial<SalonProfile>;
}

/**
 * Apply AI (or reset) content to the live config + records. Unknown pieces are
 * left untouched, so "Regenerate this section" never wipes the rest of the site.
 */
export function applyVedaAiContent(
  config: VedaConfig,
  services: SalonService[],
  stylists: Stylist[],
  content: VedaAiContent,
  mode: VedaAiMode,
): { config: VedaConfig; services: SalonService[]; stylists: Stylist[] } {
  const next: VedaConfig = structuredCloneSafe(config);
  let nextServices = services;
  let nextStylists = stylists;
  const want = (key: string) => mode === 'all' || mode === key;

  if (want('announcement') && content.announcement?.text) {
    next.announcement = { ...next.announcement, enabled: true, text: content.announcement.text.slice(0, 200), linkLabel: content.announcement.linkLabel || next.announcement.linkLabel };
  }
  if (want('hero') && content.hero) {
    next.hero = {
      ...next.hero,
      eyebrow: content.hero.eyebrow || next.hero.eyebrow,
      headline: content.hero.headline || next.hero.headline,
      description: content.hero.description || next.hero.description,
      caption: content.hero.caption || next.hero.caption,
      primaryCta: content.hero.primaryCta || next.hero.primaryCta,
      secondaryCta: content.hero.secondaryCta || next.hero.secondaryCta,
    };
  }
  if (want('philosophy') && content.philosophy) {
    next.philosophy = {
      ...next.philosophy,
      eyebrow: content.philosophy.eyebrow || next.philosophy.eyebrow,
      title: content.philosophy.title || next.philosophy.title,
      body: content.philosophy.body || next.philosophy.body,
      quote: content.philosophy.quote || next.philosophy.quote,
      signature: content.philosophy.signature || next.philosophy.signature,
    };
  }
  for (const key of ['therapies', 'experts', 'gallery', 'packages', 'offers', 'testimonials', 'faq', 'contact'] as const) {
    const section = (content as any)[key];
    if (!want(key) || !section) continue;
    const target: any = next[key];
    for (const field of ['eyebrow', 'title', 'body'] as const) {
      if (typeof section[field] === 'string' && section[field].trim()) target[field] = section[field];
    }
  }
  // Gallery captions: the AI writes one line per photo; titles stay unless a
  // caption is supplied for that position.
  if ((mode === 'all' || mode === 'gallery') && content.gallery?.items?.length) {
    next.gallery = {
      ...next.gallery,
      images: next.gallery.images.map((image, index) => {
        const draft = content.gallery?.items?.[index];
        if (!draft) return image;
        return {
          ...image,
          title: draft.title?.trim() || image.title,
          caption: draft.caption?.trim() || image.caption,
        };
      }),
    };
  }
  if ((mode === 'all' || mode === 'why') && content.why) {
    next.why = {
      ...next.why,
      eyebrow: content.why.eyebrow || next.why.eyebrow,
      title: content.why.title || next.why.title,
      body: content.why.body || next.why.body,
      items: content.why.items?.length
        ? content.why.items.slice(0, 6).map((item, index) => ({
            id: `veda-w${index + 1}`,
            title: item.title || next.why.items[index]?.title || 'Why us',
            body: item.body || next.why.items[index]?.body || '',
            icon: next.why.items[index]?.icon || ['leaf', 'award', 'receipt', 'heart', 'home', 'stethoscope'][index % 6],
          }))
        : next.why.items,
    };
  }
  if ((mode === 'all' || mode === 'signature') && content.signature) {
    next.signature = {
      ...next.signature,
      eyebrow: content.signature.eyebrow || next.signature.eyebrow,
      title: content.signature.title || next.signature.title,
      body: content.signature.body || next.signature.body,
      items: content.signature.items?.length
        ? next.signature.items.slice(0, 4).map((item, index): VedaSignatureExperience => ({
            id: next.signature.items[index]?.id || `veda-sig-${index + 1}`,
            title: item.title || 'Signature experience',
            body: item.body || '',
            meta: item.meta || '',
            imageUrl: next.signature.items[index]?.imageUrl || next.signature.items[0]?.imageUrl || '',
          }))
        : next.signature.items,
    };
  }
  if (want('services') && content.services?.length) {
    const byId = new Map(nextServices.map((service) => [service.id, service]));
    nextServices = content.services.slice(0, 30).map((item, index) => {
      const existing = item.id ? byId.get(item.id) : nextServices[index];
      return {
        id: existing?.id || `veda-ai-${index + 1}`,
        name: (item.name || existing?.name || 'Ayurvedic ritual').slice(0, 90),
        category: (item.category || existing?.category || 'Ayurvedic Massage & Body Therapies').slice(0, 60),
        durationMinutes: Math.max(15, Math.round(Number(item.durationMinutes || existing?.durationMinutes || 60))),
        price: item.price === null || item.price === undefined ? existing?.price ?? null : Math.max(0, Math.round(Number(item.price) || 0)),
        description: (item.description || existing?.description || '').slice(0, 700),
        icon: existing?.icon || 'spa',
        imageUrl: existing?.imageUrl || VEDA_SERVICES[index % VEDA_SERVICES.length].imageUrl,
        popular: item.popular ?? existing?.popular ?? false,
        benefits: item.benefits?.slice(0, 4) || (existing as VedaService)?.benefits,
        origin: existing?.origin || 'template',
      } as SalonService;
    });
  }
  if ((mode === 'all' || mode === 'packages') && content.packages?.items?.length) {
    next.packages.items = content.packages.items.slice(0, 6).map((item, index): VedaPackage => ({
      id: next.packages.items[index]?.id || `veda-pkg-${index + 1}`,
      name: item.name || 'Wellness package',
      tagline: item.tagline || '',
      price: Math.max(0, Math.round(Number(item.price ?? next.packages.items[index]?.price ?? 0))),
      originalPrice: Math.max(0, Math.round(Number(item.originalPrice ?? next.packages.items[index]?.originalPrice ?? 0))),
      duration: item.duration || next.packages.items[index]?.duration || '',
      sessions: item.sessions || next.packages.items[index]?.sessions || 'One visit',
      includes: item.includes?.slice(0, 8) || next.packages.items[index]?.includes || [],
      imageUrl: next.packages.items[index]?.imageUrl || VEDA_PACKAGES[index % VEDA_PACKAGES.length].imageUrl,
      popular: index === 0,
    }));
  }
  if ((mode === 'all' || mode === 'offers') && content.offers?.items?.length) {
    next.offers.items = content.offers.items.slice(0, 4).map((item, index): VedaOffer => ({
      id: next.offers.items[index]?.id || `veda-offer-${index + 1}`,
      title: item.title || 'Offer',
      body: item.body || '',
      badge: item.badge || 'Offer',
      code: item.code || '',
      validTill: next.offers.items[index]?.validTill || '',
      imageUrl: next.offers.items[index]?.imageUrl || VEDA_OFFERS[index % VEDA_OFFERS.length].imageUrl,
      voucher: item.voucher ?? index === 1,
    }));
  }
  if ((mode === 'all' || mode === 'testimonials') && content.testimonials?.items?.length) {
    next.testimonials.items = content.testimonials.items.slice(0, 6).map((item, index): VedaTestimonial => ({
      id: next.testimonials.items[index]?.id || `veda-t${index + 1}`,
      name: item.name || 'Guest',
      location: item.location || '',
      rating: Math.min(5, Math.max(1, Math.round(Number(item.rating || 5)))),
      quote: item.quote || '',
      treatment: item.treatment || '',
      photoUrl: next.testimonials.items[index]?.photoUrl || VEDA_TESTIMONIALS[index % VEDA_TESTIMONIALS.length].photoUrl,
    }));
  }
  if ((mode === 'all' || mode === 'faq') && content.faq?.items?.length) {
    next.faq.items = content.faq.items.slice(0, 10).map((item, index): VedaFaq => ({
      id: next.faq.items[index]?.id || `veda-f${index + 1}`,
      question: item.question || '',
      answer: item.answer || '',
    }));
  }
  if ((mode === 'all' || mode === 'experts') && content.experts?.people?.length) {
    const people = content.experts.people.slice(0, 6);
    nextStylists = people.map((person, index) => {
      const existing = stylists[index];
      return {
        id: existing?.id || `veda-st-${index + 1}`,
        name: person.name || existing?.name || 'Ayurvedic therapist',
        role: person.role || existing?.role || 'Ayurvedic Therapist',
        avatarUrl: existing?.avatarUrl || VEDA_THERAPISTS[index % VEDA_THERAPISTS.length].avatarUrl,
        specialties: person.specialties?.slice(0, 4) || existing?.specialties || [],
        rating: existing?.rating ?? 4.9,
        experienceYears: Math.max(0, Math.round(Number(person.experienceYears ?? existing?.experienceYears ?? 5))),
        qualifications: person.qualifications?.slice(0, 3) || existing?.qualifications,
        bio: person.bio || existing?.bio,
        languages: existing?.languages,
        status: existing?.status || 'Active',
      } as Stylist;
    });
  }
  if ((mode === 'all' || mode === 'contact') && content.contact?.hours?.length) {
    next.contact.hours = content.contact.hours.slice(0, 4).map((item) => ({ label: item.label || '', value: item.value || '' })).filter((item) => item.label && item.value);
  }
  if ((mode === 'all' || mode === 'seo') && content.seo?.title) {
    next.seo = {
      title: (content.seo.title || next.seo.title).slice(0, 70),
      description: (content.seo.description || next.seo.description).slice(0, 200),
      keywords: (content.seo.keywords || next.seo.keywords).slice(0, 300),
    };
  }
  next.ai = {
    lastGeneratedAt: new Date().toISOString(),
    generated: [...new Set([...(next.ai?.generated || []), mode])].slice(-20),
  };
  return { config: resolveVedaConfig(next), services: nextServices, stylists: nextStylists };
}

function structuredCloneSafe<T>(value: T): T {
  try {
    return typeof structuredClone === 'function' ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

/* ------------------------------------------------------------------ *
 * Reset to template defaults
 * ------------------------------------------------------------------ */

export function vedaResetSection(config: VedaConfig, section: VedaSectionId | 'all' | 'design'): VedaConfig {
  const defaults = defaultVedaConfig();
  if (section === 'all') return defaults;
  if (section === 'design') return { ...config, theme: defaults.theme, fontPair: defaults.fontPair, buttonStyle: defaults.buttonStyle, layout: defaults.layout };
  const next = structuredCloneSafe(config);
  (next as any)[section] = (defaults as any)[section];
  return next;
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

export type VedaIssue = { field: string; message: string; level: 'error' | 'warn' };

export function validateVedaConfig(config: VedaConfig, profile: SalonProfile): VedaIssue[] {
  const issues: VedaIssue[] = [];
  if (!config.hero.headline.trim()) issues.push({ field: 'hero.headline', message: 'Add a hero headline so visitors know what this place is.', level: 'error' });
  if (config.hero.headline.length > 90) issues.push({ field: 'hero.headline', message: 'Hero headline is long — keep it under about 90 characters so it fits on a phone.', level: 'warn' });
  if (config.hero.description.length > 320) issues.push({ field: 'hero.description', message: 'Hero description is quite long. 2–3 sentences reads better.', level: 'warn' });
  if (!/^https:\/\//i.test(config.hero.image) && !config.hero.image.startsWith('/templates/')) issues.push({ field: 'hero.image', message: 'Upload the hero image (or use a bundled template image).', level: 'error' });
  if (!config.sections.hero) issues.push({ field: 'sections.hero', message: 'The hero section is hidden — visitors will land on the next section.', level: 'warn' });
  if (config.seo.title.length > 60) issues.push({ field: 'seo.title', message: 'SEO titles are truncated after about 60 characters in Google.', level: 'warn' });
  if (config.seo.description.length > 160) issues.push({ field: 'seo.description', message: 'SEO descriptions are truncated after about 160 characters.', level: 'warn' });
  if (!String(profile.phone || '').replace(/\D/g, '')) issues.push({ field: 'profile.phone', message: 'Add a contact phone number — it appears in the header and footer.', level: 'error' });
  if (!String(profile.whatsapp || '').replace(/\D/g, '')) issues.push({ field: 'profile.whatsapp', message: 'Add a WhatsApp number so guests can book in one tap.', level: 'error' });
  if (!String(profile.address || '').trim()) issues.push({ field: 'profile.address', message: 'Add the studio address for the Visit Us section and map.', level: 'error' });
  if (config.packages.items.some((item) => !item.includes.length)) issues.push({ field: 'packages.items', message: 'A package has no inclusions listed — say what is included.', level: 'warn' });
  if (config.testimonials.items.some((item) => item.quote.length < 20)) issues.push({ field: 'testimonials.items', message: 'A guest story is very short. Real quotes read better.', level: 'warn' });
  return issues;
}

export const VEDA_FIELD_LABELS: Record<string, string> = {
  'hero.headline': 'Hero',
  'hero.description': 'Hero',
  'hero.image': 'Hero',
  'sections.hero': 'Sections',
  'seo.title': 'SEO',
  'seo.description': 'SEO',
  'profile.phone': 'Business details',
  'profile.whatsapp': 'Business details',
  'profile.address': 'Business details',
  'packages.items': 'Packages',
  'testimonials.items': 'Guest stories',
};

export function vedaBlockingIssues(issues: VedaIssue[]): VedaIssue[] {
  return issues.filter((issue) => issue.level === 'error');
}

/* ------------------------------------------------------------------ *
 * Launch checklist (the 30-minute path)
 * ------------------------------------------------------------------ */

export type VedaLaunchStep = {
  id: 'details' | 'content' | 'design' | 'services' | 'media' | 'booking' | 'publish';
  label: string;
  hint: string;
  detail: string;
  done: boolean;
  tab: 'business' | 'content' | 'design' | 'therapies' | 'photos' | 'booking' | 'launch';
};

export function vedaLaunchSteps(input: {
  config: VedaConfig;
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  publishedSlug?: string | null;
}): VedaLaunchStep[] {
  const { config, profile, services, stylists, publishedSlug } = input;
  const phone = String(profile.phone || '').replace(/\D/g, '');
  const whatsapp = String(profile.whatsapp || '').replace(/\D/g, '');
  return [
    {
      id: 'details',
      label: 'Business details',
      hint: 'Name, phone, WhatsApp and address',
      detail: phone && whatsapp && String(profile.address || '').trim() ? 'Saved' : 'Still needed: phone, WhatsApp or address',
      done: Boolean(profile.businessName && phone && whatsapp && String(profile.address || '').trim()),
      tab: 'business',
    },
    {
      id: 'content',
      label: 'Website content',
      hint: 'Hero, story, packages and FAQs',
      detail: (config.ai?.generated?.length ? 'Generated once — review the copy' : 'Use Generate my website content'),
      done: Boolean(config.ai?.generated?.length),
      tab: 'content',
    },
    {
      id: 'design',
      label: 'Look and feel',
      hint: 'Colours, fonts and layout',
      detail: `${VEDA_THEMES.find((theme) => theme.id === config.theme)?.label || config.theme} · ${config.layout}`,
      done: config.theme !== defaultVedaConfig().theme || Boolean(config.ai?.generated?.length) || Boolean(profile.logoUrl),
      tab: 'design',
    },
    {
      id: 'services',
      label: 'Therapies & prices',
      hint: 'At least eight rituals with prices',
      detail: `${services.filter((service) => Number(service.price) > 0).length} priced rituals of ${services.length}`,
      done: services.filter((service) => Number(service.price) > 0).length >= 8,
      tab: 'therapies',
    },
    {
      id: 'media',
      label: 'Photos',
      hint: 'Hero image, therapists and gallery',
      detail: `${stylists.length} therapist${stylists.length === 1 ? '' : 's'} · ${config.gallery.images.length} gallery photos`,
      done: config.gallery.images.length >= 4 && stylists.length >= 1,
      tab: 'photos',
    },
    {
      id: 'booking',
      label: 'Booking handoff',
      hint: 'WhatsApp or on-site requests',
      detail: config.booking.mode === 'both' ? 'WhatsApp + on-site requests' : config.booking.mode === 'whatsapp' ? 'WhatsApp only' : 'On-site request form',
      done: Boolean(whatsapp) && config.booking.mode !== ('request' as typeof config.booking.mode),
      tab: 'booking',
    },
    {
      id: 'publish',
      label: 'Go live',
      hint: 'Publish the website link',
      detail: publishedSlug ? `Live at ?site=${publishedSlug}` : 'Not published yet',
      done: Boolean(publishedSlug),
      tab: 'launch',
    },
  ];
}

export function vedaLaunchProgress(steps: VedaLaunchStep[]): { done: number; total: number; percent: number } {
  const done = steps.filter((step) => step.done).length;
  const total = steps.length || 1;
  return { done, total: steps.length, percent: Math.round((done / total) * 100) };
}

/* ------------------------------------------------------------------ *
 * History + drafts
 * ------------------------------------------------------------------ */

export const VEDA_HISTORY_LIMIT = 40;
export type VedaHistory = { past: VedaConfig[]; present: VedaConfig; future: VedaConfig[] };

export function vedaHistory(config: VedaConfig): VedaHistory {
  return { past: [], present: config, future: [] };
}
export function vedaPushHistory(history: VedaHistory, present: VedaConfig): VedaHistory {
  const past = [...history.past, history.present].slice(-VEDA_HISTORY_LIMIT);
  return { past, present, future: [] };
}
export function vedaUndo(history: VedaHistory): VedaHistory {
  if (!history.past.length) return history;
  const past = history.past.slice(0, -1);
  const present = history.past[history.past.length - 1];
  return { past, present, future: [history.present, ...history.future].slice(0, VEDA_HISTORY_LIMIT) };
}
export function vedaRedo(history: VedaHistory): VedaHistory {
  if (!history.future.length) return history;
  const [present, ...future] = history.future;
  return { past: [...history.past, history.present].slice(-VEDA_HISTORY_LIMIT), present, future };
}

export function vedaDraftKey(siteId: string): string {
  return `veda_sanjeevani_draft_${siteId || 'new'}`;
}
export function saveVedaDraft(siteId: string, config: VedaConfig): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(vedaDraftKey(siteId), JSON.stringify({ savedAt: Date.now(), config }));
    return true;
  } catch {
    return false;
  }
}
export function loadVedaDraft(siteId: string): { savedAt: number; config: VedaConfig } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(vedaDraftKey(siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.config) return null;
    return { savedAt: Number(parsed.savedAt) || 0, config: resolveVedaConfig(parsed.config) };
  } catch {
    return null;
  }
}
export function clearVedaDraft(siteId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(vedaDraftKey(siteId));
  } catch {
    /* storage may be blocked; nothing to clear */
  }
}

/* ------------------------------------------------------------------ *
 * Owner access
 * ------------------------------------------------------------------ */

export type VedaAccess = { allowed: boolean; reason: string };
export function vedaCustomizerAccess(input: { templateId?: string | null; sessionUserId?: string | null; siteOwnerId?: string | null; demoMode?: boolean }): VedaAccess {
  if (input.demoMode) return { allowed: true, reason: '' };
  if (!isVedaTemplate(input.templateId)) return { allowed: false, reason: 'This customizer only edits the Veda Sanjeevani template.' };
  if (!input.sessionUserId) return { allowed: false, reason: 'Sign in with the owner account to customise this website.' };
  if (input.siteOwnerId && input.siteOwnerId !== input.sessionUserId) return { allowed: false, reason: 'Only the owner of this website can open the customizer.' };
  return { allowed: true, reason: '' };
}

export async function fetchVedaSiteOwner(slug: string): Promise<string | null> {
  if (!slug) return null;
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.from('studioflow_websites').select('owner_id').eq('slug', slug).maybeSingle();
    if (error || !data) return null;
    return (data as { owner_id?: string }).owner_id || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Image presets (used by the optimizer + cropper)
 * ------------------------------------------------------------------ */

export type VedaImagePreset = {
  id: string;
  label: string;
  ratio: number;
  ratioLabel: string;
  targetWidth: number;
  widths: number[];
  note: string;
};

export const VEDA_IMAGE_PRESETS: VedaImagePreset[] = [
  { id: 'hero', label: 'Hero banner', ratio: 16 / 9, ratioLabel: '16:9', targetWidth: 1920, widths: [800, 1200, 1600, 1920], note: 'Full-width, behind the headline. Keep the left third calm for text.' },
  { id: 'services', label: 'Therapy card', ratio: 4 / 3, ratioLabel: '4:3', targetWidth: 1200, widths: [480, 800, 1200], note: 'Shown in the therapy grid — warm, close-up detail works best.' },
  { id: 'therapists', label: 'Therapist portrait', ratio: 3 / 4, ratioLabel: '3:4', targetWidth: 900, widths: [400, 800, 900], note: 'Vertical portrait. Face in the upper third so the crop survives on mobile.' },
  { id: 'gallery', label: 'Gallery photo', ratio: 4 / 3, ratioLabel: '4:3', targetWidth: 1400, widths: [480, 800, 1400], note: 'Rooms, details and hands at work — no stocky poses.' },
  { id: 'banner', label: 'Promotional banner', ratio: 16 / 9, ratioLabel: '16:9', targetWidth: 1600, widths: [800, 1600], note: 'Offer card image. Leave space for the offer text.' },
  { id: 'testimonials', label: 'Guest photo', ratio: 1, ratioLabel: '1:1', targetWidth: 600, widths: [200, 400, 600], note: 'Square, cropped to the face.' },
  { id: 'logo', label: 'Logo', ratio: 1, ratioLabel: '1:1', targetWidth: 512, widths: [128, 256, 512], note: 'Transparent PNG preferred. Keep the monogram centred.' },
];

export function vedaPresetFor(slot: string): VedaImagePreset {
  const key = slot.toLowerCase();
  if (key.includes('logo')) return VEDA_IMAGE_PRESETS.find((preset) => preset.id === 'logo')!;
  if (key.includes('therapist') || key.includes('expert') || key.includes('team')) return VEDA_IMAGE_PRESETS.find((preset) => preset.id === 'therapists')!;
  if (key.includes('testimonial') || key.includes('guest')) return VEDA_IMAGE_PRESETS.find((preset) => preset.id === 'testimonials')!;
  if (key.includes('offer') || key.includes('banner') || key.includes('promo')) return VEDA_IMAGE_PRESETS.find((preset) => preset.id === 'banner')!;
  if (key.includes('hero')) return VEDA_IMAGE_PRESETS.find((preset) => preset.id === 'hero')!;
  if (key.includes('gallery')) return VEDA_IMAGE_PRESETS.find((preset) => preset.id === 'gallery')!;
  return VEDA_IMAGE_PRESETS.find((preset) => preset.id === 'services')!;
}

/* ------------------------------------------------------------------ *
 * AI content
 * ------------------------------------------------------------------ */

export const VEDA_AI_ENDPOINT = '/api/veda-website-content';

export const VEDA_AI_MODES: Array<{ id: VedaAiMode; label: string; hint: string }> = [
  { id: 'all', label: 'Generate my website content', hint: 'Hero, story, therapies, packages, offers, FAQs, reviews and SEO in one go.' },
  { id: 'hero', label: 'Generate hero section', hint: 'Headline, description and button labels.' },
  { id: 'philosophy', label: 'Generate About us', hint: 'The studio story and philosophy.' },
  { id: 'services', label: 'Generate service descriptions', hint: 'Rewrites each therapy description and benefits.' },
  { id: 'packages', label: 'Generate packages', hint: 'Wellness package names, inclusions and pricing note.' },
  { id: 'offers', label: 'Generate offers', hint: 'Seasonal offers and gift voucher copy.' },
  { id: 'experts', label: 'Generate therapist profiles', hint: 'Role, expertise and short bios for your team.' },
  { id: 'faq', label: 'Generate FAQs', hint: 'Answers guests ask before booking.' },
  { id: 'testimonials', label: 'Generate review placeholders', hint: 'Clearly marked sample quotes you must replace with real ones.' },
  { id: 'seo', label: 'Generate SEO content', hint: 'Title, meta description and keywords.' },
  { id: 'imagePrompts', label: 'Generate image prompts', hint: 'One photo prompt per section and therapy, ready to copy into an image tool.' },
];

export type VedaAiResult = { source: 'ai' | 'template'; content: VedaAiContent; notice: string };

export function vedaAiDetails(profile: SalonProfile, services: SalonService[]): VedaAiDetails {
  return {
    businessName: profile.businessName || VEDA_FULL_NAME,
    city: profile.city || '',
    address: profile.address || '',
    category: 'Ayurvedic wellness spa',
    tagline: profile.tagline || VEDA_TAGLINE,
    phone: profile.phone || '',
    about: profile.about || '',
    services: services.slice(0, 24).map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      price: service.price,
      durationMinutes: service.durationMinutes,
    })),
    tone: 'warm, calm, specific, no medical claims',
  };
}

/**
 * Ask the server for content. The server keeps the API key; this function never
 * sees a key. Anything that goes wrong (no key, offline, bad JSON) resolves with
 * an honest locally-drafted result marked `source: 'template'`.
 */
export async function requestVedaAiContent(mode: VedaAiMode, details: VedaAiDetails, signal?: AbortSignal): Promise<VedaAiResult> {
  try {
    const response = await fetch(VEDA_AI_ENDPOINT, {
      method: 'POST',
      headers: await aiRequestHeaders(),
      body: JSON.stringify({ mode, details }),
      signal,
    });
    if (!response.ok) throw new Error(`AI endpoint responded ${response.status}`);
    const payload = await response.json();
    if (!payload || typeof payload.content !== 'object' || !payload.content) throw new Error('The AI response had no content');
    const source = payload.source === 'ai' ? 'ai' : 'template';
    return {
      source,
      content: payload.content as VedaAiContent,
      notice:
        typeof payload.notice === 'string' && payload.notice
          ? payload.notice
          : source === 'ai'
            ? 'Content generated. Read it through, then edit anything that does not sound like you.'
            : 'Your workspace drafted this from the template. Edit everything before publishing.',
    };
  } catch (error) {
    return {
      source: 'template',
      content: buildVedaFallbackContent(mode, details),
      notice:
        (error instanceof Error && error.name === 'AbortError'
          ? 'Generation was cancelled. '
          : 'We could not reach the AI service, so we drafted this from the template instead. ') +
        'Every line is editable, so nothing here is final until you publish.',
    };
  }
}

export function vedaAiNoticeFor(source: 'ai' | 'template'): string {
  return source === 'ai'
    ? 'This content was written by AI from the details you gave. Read it and edit before publishing.'
    : 'No AI key is configured on this server, so the template drafted this content. It is editable and ready to refine.';
}

/* ------------------------------------------------------------------ *
 * Content exports (for the image studio + reusable defaults)
 * ------------------------------------------------------------------ */

export function vedaImagePromptList() {
  return VEDA_IMAGE_PROMPTS;
}

export function vedaDefaultContentSets() {
  return {
    packages: VEDA_PACKAGES,
    offers: VEDA_OFFERS,
    faqs: VEDA_FAQS,
    testimonials: VEDA_TESTIMONIALS,
    gallery: [] as VedaGalleryImage[],
    why: [] as VedaWhyItem[],
    announcement: VEDA_ANNOUNCEMENT_FALLBACK,
    brand: VEDA_BRAND_NAME,
  };
}

/* ------------------------------------------------------------------ *\
 * Image destinations (AI Image Studio → website)
 * ------------------------------------------------------------------ */

export type VedaImageTarget = {
  id: string;
  label: string;
  group: string;
  /** Bundled slot used as the fallback photo + alt text. */
  slot: string;
  /** Upload preset applied when the photo is stored. */
  preset: string;
};

/**
 * Every image on the public website, as a flat list the AI Image Studio can
 * present in a plain dropdown. Uploading or generating a photo for a target
 * writes it straight into the site configuration, so the studio is a real
 * editor rather than a prompt gallery.
 */
export function vedaImageTargets(config: VedaConfig, services: SalonService[] = []): VedaImageTarget[] {
  const list: VedaImageTarget[] = [
    { id: 'hero', label: 'Hero banner', group: 'Hero & story', slot: 'hero', preset: 'hero' },
    { id: 'philosophy', label: 'About & philosophy photo', group: 'Hero & story', slot: 'sanctuary', preset: 'hero' },
  ];
  for (const item of config.packages.items) {
    list.push({ id: `package:${item.id}`, label: `Package · ${item.name}`, group: 'Wellness packages', slot: 'ritual', preset: 'services' });
  }
  for (const item of config.offers.items) {
    list.push({
      id: `offer:${item.id}`,
      label: `Offer · ${item.title}`,
      group: 'Offers & vouchers',
      slot: item.voucher ? 'gift-voucher' : 'promo-banner',
      preset: item.voucher ? 'services' : 'banner',
    });
  }
  for (const item of config.gallery.images) {
    list.push({ id: `gallery:${item.id}`, label: `Gallery · ${item.title}`, group: 'Gallery', slot: 'treatment-room', preset: 'gallery' });
  }
  const seen = new Set<string>();
  for (const service of services.length ? services : VEDA_SERVICES) {
    if (!service?.id || seen.has(service.id)) continue;
    seen.add(service.id);
    list.push({
      id: `service:${service.id}`,
      label: `Therapy · ${service.name}`,
      group: 'Therapies',
      slot: 'abhyanga',
      preset: 'services',
    });
  }
  return list;
}

/** Applies a stored image URL to one target. Returns new state; never mutates. */
export function vedaApplyImageTarget(
  config: VedaConfig,
  services: SalonService[],
  targetId: string,
  url: string,
): { config: VedaConfig; services: SalonService[] } {
  const clean = (url || '').trim();
  const [kind, id] = targetId.split(':');
  if (!kind) return { config, services };
  if (kind === 'hero') return { config: { ...config, hero: { ...config.hero, image: clean } }, services };
  if (kind === 'philosophy') return { config: { ...config, philosophy: { ...config.philosophy, image: clean } }, services };
  if (kind === 'package') {
    return {
      config: {
        ...config,
        packages: {
          ...config.packages,
          items: config.packages.items.map((item) => (item.id === id ? { ...item, imageUrl: clean } : item)),
        },
      },
      services,
    };
  }
  if (kind === 'offer') {
    return {
      config: {
        ...config,
        offers: {
          ...config.offers,
          items: config.offers.items.map((item) => (item.id === id ? { ...item, imageUrl: clean } : item)),
        },
      },
      services,
    };
  }
  if (kind === 'gallery') {
    return {
      config: {
        ...config,
        gallery: {
          ...config.gallery,
          images: config.gallery.images.map((item) => (item.id === id ? { ...item, url: clean } : item)),
        },
      },
      services,
    };
  }
  if (kind === 'service') {
    return { config, services: services.map((item) => (item.id === id ? { ...item, imageUrl: clean } : item)) };
  }
  return { config, services };
}

/** The honest result of asking the server to paint a photo. */
export type VedaImageGenerationResult =
  | { ok: true; reason?: undefined; dataUrl: string; promptUsed: string }
  | { ok: false; reason: string; dataUrl?: undefined };

/**
 * Server-side AI image generation, reusing the existing
 * `/api/generate-promo-image` endpoint (Gemini) — no new provider, no key in the
 * browser. A missing key is reported as a clear reason, never as a fake image.
 */
export async function requestVedaAiImage(prompt: string, aspectRatio = '4:3'): Promise<VedaImageGenerationResult> {
  try {
    const response = await fetch('/api/generate-promo-image', {
      method: 'POST',
      headers: await aiRequestHeaders(),
      body: JSON.stringify({ prompt, aspectRatio }),
    });
    if (!response.ok) return { ok: false, reason: 'The image service could not be reached. Try again in a moment.' };
    const data = (await response.json()) as {
      success?: boolean;
      imageUrl?: string | null;
      promptUsed?: string;
      error?: string;
      fallbackNotice?: string;
      notice?: string;
    };
    if (data?.success && typeof data.imageUrl === 'string' && data.imageUrl) {
      return { ok: true, dataUrl: data.imageUrl, promptUsed: data.promptUsed || prompt };
    }
    return {
      ok: false,
      reason:
        data?.fallbackNotice ||
        data?.notice ||
        data?.error ||
        'AI image generation is not configured on this server. Copy the prompt and use an image tool, then upload the result.',
    };
  } catch {
    return { ok: false, reason: 'The image service could not be reached. Check your connection and try again.' };
  }
}

/** Turns a generated data URL into a File the optimiser accepts. */
export function vedaDataUrlFile(dataUrl: string, name = 'ai-image'): File {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
  if (!match) throw new Error('The generated image could not be read. Try generating it again.');
  const [, mime, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], `${name}.${mime.includes('png') ? 'png' : 'jpg'}`, { type: mime });
}

/**
 * True when the section a generation would touch already differs from the
 * template default — i.e. the owner has written something themselves. The
 * dashboard asks before replacing that copy.
 */
export function vedaSectionHasEdits(config: VedaConfig, mode: string): boolean {
  const base = defaultVedaConfig();
  const pick = (value: any) =>
    JSON.stringify({
      eyebrow: value?.eyebrow,
      title: value?.title,
      body: value?.body,
      quote: value?.quote,
      headline: value?.headline,
      description: value?.description,
      text: value?.text,
      items: Array.isArray(value?.items) ? value.items.map((item: any) => item.title || item.name || item.question || item.quote) : undefined,
    });
  if (mode === 'all') {
    return (['hero', 'philosophy', 'therapies', 'packages', 'offers', 'faq', 'gallery', 'announcement'] as const).some(
      (key) => pick((config as any)[key]) !== pick((base as any)[key]),
    );
  }
  if (mode === 'announcement') return config.announcement.text !== base.announcement.text;
  const key = mode === 'therapies' ? 'therapies' : mode;
  if (!(key in base)) return false;
  return pick((config as any)[key]) !== pick((base as any)[key]);
}
