/**
 * Central data service for the NEXORA SALONOS landing page.
 *
 * Every public Supabase read for the landing page lives here so no section
 * component talks to the database on its own. The service:
 *   * uses the publishable browser key only (RLS is the security boundary);
 *   * applies the publication filter on every query as well, so application
 *     correctness never depends on a policy alone;
 *   * reads every collection in one parallel batch instead of one request per
 *     section;
 *   * never touches `public.landing_leads` — leads are submitted through the
 *     `submit-landing-lead` Edge Function.
 *
 * Target project: https://zilwgiuiygqqardzutxi.supabase.co
 */

import { supabase } from './supabase';
import { NEXORA_PRIVACY_NOTICE_VERSION } from './nexoraPrivacyNotice';

export { NEXORA_PRIVACY_NOTICE_VERSION };

/** Public marketing asset bucket. Only non-sensitive landing imagery belongs here. */
export const NEXORA_PUBLIC_ASSET_BUCKET = 'nexora-public-assets';

/* ---------------------------------------------------------------------------
 * Row shapes (mirrors SUPABASE_DATABASE.md)
 * ------------------------------------------------------------------------ */
export interface SiteSettingsRow {
  singleton_id: number;
  brand_name: string;
  brand_tagline: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  primary_cta_label: string | null;
  secondary_cta_label: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_url: string | null;
  support_url: string | null;
  logo_path: string | null;
  hero_image_path: string | null;
  footer_description: string | null;
  footer_copyright: string | null;
  canonical_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_path: string | null;
  social_links: Record<string, unknown> | null;
  is_published: boolean;
}

export interface LandingSectionRow {
  id: string;
  section_key: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  primary_cta_label: string | null;
  primary_cta_href: string | null;
  secondary_cta_label: string | null;
  secondary_cta_href: string | null;
  content: Record<string, unknown>;
  sort_order: number;
  is_published: boolean;
}

export interface NavigationItemRow {
  id: string;
  location: 'header' | 'footer' | 'mobile';
  label: string;
  href: string;
  open_new_tab: boolean;
  sort_order: number;
  is_visible: boolean;
}

export interface BusinessCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_key: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface FeatureCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface FeatureRow {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface PricingPlanRow {
  id: string;
  plan_key: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_monthly: string | null;
  price_yearly: string | null;
  currency: string;
  monthly_billing_label: string | null;
  yearly_billing_label: string | null;
  yearly_discount_label: string | null;
  cta_label: string;
  cta_href: string | null;
  is_recommended: boolean;
  display_order: number;
  is_active: boolean;
  is_published: boolean;
}

export interface PlanFeatureRow {
  id: string;
  plan_id: string;
  feature_id: string;
  availability: 'included' | 'not_included' | 'add_on' | 'custom';
  quantity_limit: string | null;
  limit_unit: string | null;
  display_value: string | null;
  notes: string | null;
  sort_order: number;
}

export interface PromotionalCreativeRow {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  image_path: string;
  image_alt: string;
  cta_label: string | null;
  cta_href: string | null;
  share_targets: string[];
  display_order: number;
  is_published: boolean;
}

export interface TestimonialRow {
  id: string;
  quote: string;
  person_name: string;
  business_name: string | null;
  business_type: string | null;
  role_label: string | null;
  avatar_path: string | null;
  rating: string | null;
  source_label: string | null;
  source_url: string | null;
  permission_confirmed: boolean;
  is_verified: boolean;
  is_approved: boolean;
  is_published: boolean;
  display_order: number;
}

export interface FaqRow {
  id: string;
  category: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

export interface LandingDbContent {
  settings: SiteSettingsRow | null;
  sections: LandingSectionRow[];
  navigation: NavigationItemRow[];
  businessCategories: BusinessCategoryRow[];
  featureCategories: FeatureCategoryRow[];
  features: FeatureRow[];
  plans: PricingPlanRow[];
  planFeatures: PlanFeatureRow[];
  creatives: PromotionalCreativeRow[];
  testimonials: TestimonialRow[];
  faqs: FaqRow[];
}

/* ---------------------------------------------------------------------------
 * Loader
 * ------------------------------------------------------------------------ */
const emptyContent: LandingDbContent = {
  settings: null,
  sections: [],
  navigation: [],
  businessCategories: [],
  featureCategories: [],
  features: [],
  plans: [],
  planFeatures: [],
  creatives: [],
  testimonials: [],
  faqs: [],
};

/**
 * Loads every public landing collection in one parallel batch.
 * Returns `null` when the database cannot be reached so the page can keep
 * serving its bundled, reviewed content instead of rendering an error.
 */
export async function loadLandingDbContent(): Promise<LandingDbContent | null> {
  try {
    const [settings, sections, navigation, businessCategories, featureCategories, features, plans, creatives, testimonials, faqs] =
      await Promise.all([
        supabase.from('site_settings').select('*').eq('singleton_id', 1).eq('is_published', true).maybeSingle(),
        supabase.from('landing_sections').select('*').eq('is_published', true).order('sort_order'),
        supabase.from('navigation_items').select('*').eq('is_visible', true).order('sort_order'),
        supabase.from('business_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('feature_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('features').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('pricing_plans').select('*').eq('is_active', true).eq('is_published', true).order('display_order'),
        supabase.from('promotional_creatives').select('*').eq('is_published', true).order('display_order'),
        supabase.from('testimonials').select('*')
          .eq('is_approved', true).eq('is_published', true).eq('permission_confirmed', true).order('display_order'),
        supabase.from('faqs').select('*').eq('is_published', true).order('sort_order'),
      ]);

    const failure = [settings, sections, navigation, businessCategories, featureCategories, features, plans, creatives, testimonials, faqs]
      .find((result) => result.error);
    if (failure?.error) {
      // Redacted diagnostic only — never log record contents.
      console.warn('[nexora-landing] public content could not be loaded:', failure.error.code ?? 'error');
      return null;
    }

    const publishedPlans = (plans.data ?? []) as PricingPlanRow[];
    const planIds = publishedPlans.map((plan) => plan.id);
    const planFeaturesResult = planIds.length
      ? await supabase.from('plan_features').select('*').in('plan_id', planIds).order('sort_order')
      : { data: [], error: null };
    if (planFeaturesResult.error) {
      console.warn('[nexora-landing] plan entitlements could not be loaded:', planFeaturesResult.error.code ?? 'error');
      return null;
    }

    return {
      settings: (settings.data as SiteSettingsRow | null) ?? null,
      sections: (sections.data ?? []) as LandingSectionRow[],
      navigation: (navigation.data ?? []) as NavigationItemRow[],
      businessCategories: (businessCategories.data ?? []) as BusinessCategoryRow[],
      featureCategories: (featureCategories.data ?? []) as FeatureCategoryRow[],
      features: (features.data ?? []) as FeatureRow[],
      plans: publishedPlans,
      planFeatures: (planFeaturesResult.data ?? []) as PlanFeatureRow[],
      creatives: (creatives.data ?? []) as PromotionalCreativeRow[],
      testimonials: (testimonials.data ?? []) as TestimonialRow[],
      faqs: (faqs.data ?? []) as FaqRow[],
    };
  } catch {
    console.warn('[nexora-landing] public content request failed; using the bundled copy.');
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * Storage helpers
 * ------------------------------------------------------------------------ */

/**
 * Converts a stored object path into a public URL.
 * Site-relative paths (for example the OG image served by the app itself) are
 * returned unchanged; bucket paths resolve against `nexora-public-assets`.
 */
export function publicAssetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('/')) return path;
  const { data } = supabase.storage.from(NEXORA_PUBLIC_ASSET_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? '';
}

/* ---------------------------------------------------------------------------
 * Lead submission
 * ------------------------------------------------------------------------ */
export type LandingLeadType = 'demo_request' | 'contact_request' | 'pricing_question' | 'get_started';
export type LandingContactPreference = 'phone' | 'email' | 'whatsapp' | 'no_preference';

export interface LandingLeadInput {
  lead_type: LandingLeadType;
  full_name: string;
  business_name?: string;
  business_type?: string;
  email?: string;
  phone?: string;
  city?: string;
  preferred_contact?: LandingContactPreference;
  interested_plan_key?: string;
  message?: string;
  page_path?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  consent_given: true;
  privacy_notice_version: string;
  /** Honeypot field. It must stay empty for a genuine enquiry. */
  website?: string;
  /**
   * Per-submission key. The lead store uses it to collapse a retried request
   * onto the same row, so a double click or a network retry can never create
   * two leads for one enquiry.
   */
  idempotency_key?: string;
}

export interface LandingLeadResponse {
  ok: boolean;
  message?: string;
}

/**
 * Submits a landing-page enquiry through the `submit-landing-lead` Edge
 * Function. The browser never writes to `public.landing_leads` directly.
 */
export async function submitLandingLead(input: LandingLeadInput): Promise<LandingLeadResponse> {
  const { data, error } = await supabase.functions.invoke('submit-landing-lead', { body: input });
  if (error) {
    throw new Error(error.message || 'We could not send your request. Please try again later.');
  }
  const result = (data ?? {}) as LandingLeadResponse;
  if (!result.ok) {
    throw new Error(result.message || 'We could not send your request. Please try again later.');
  }
  return result;
}

export { emptyContent };
