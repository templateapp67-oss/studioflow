/**
 * Landing-page content model.
 *
 * The model is the single shape every landing section consumes. It starts from
 * the reviewed, bundled content (so the prerendered page and the offline
 * fallback always work) and is then overridden by the published rows that the
 * Supabase data service returns.
 *
 * Nothing in this file invents data: a missing database row simply keeps the
 * bundled value, and an unverified database value is never rendered.
 */

import {
  FEATURE_CATEGORIES,
  FEATURE_PLAN_ENTITLEMENTS,
  PRICING_PLANS,
  type EntitlementState,
  type FeatureItem,
  type PricingPlan,
  type PricingPlanId,
} from './nexoraPricing';
import {
  NEXORA_BUSINESS_BENEFITS,
  NEXORA_BUSINESS_TYPES,
  NEXORA_BEFORE_POINTS,
  NEXORA_FOOTER_NAV,
  NEXORA_HOW_IT_WORKS,
  NEXORA_LANDING_COMPARISON_GROUPS,
  NEXORA_LANDING_COPY,
  NEXORA_LANDING_DISCLOSURES,
  NEXORA_LANDING_FAQS,
  NEXORA_LANDING_FEATURE_CATEGORIES,
  NEXORA_LANDING_NAV,
  NEXORA_LANDING_SEO,
  NEXORA_LANDING_TESTIMONIALS,
  NEXORA_LOGIN_PATH,
  NEXORA_OVERVIEW_FACTS,
  NEXORA_PROMOTION_CHANNELS,
  NEXORA_PROMOTION_CREATIVES,
  NEXORA_PROMOTION_WORKFLOW,
  NEXORA_PROMO_STUDIO_PATH,
  NEXORA_SIGNUP_PATH,
  NEXORA_WITH_POINTS,
  type BusinessType,
  type ComparisonPoint,
  type LandingBenefit,
  type LandingComparisonGroup,
  type LandingFaq,
  type LandingFeatureCategory,
  type LandingNavLink,
  type LandingStep,
  type LandingTestimonial,
  type PromotionChannel,
  type PromotionCreative,
} from './nexoraLandingContent';
import {
  publicAssetUrl,
  type LandingDbContent,
  type PromotionalCreativeRow,
} from './nexoraLandingData';

/** Mutable copy bag so a database row can replace the bundled string. */
export type LandingCopy = { -readonly [Key in keyof typeof NEXORA_LANDING_COPY]: string };

export type LandingSeo = {
  title: string;
  description: string;
  canonicalPath: string;
  ogImagePath: string;
  themeColor: string;
};

export type LandingCreative = PromotionCreative & {
  /** Present when the creative is published as a stored image. */
  imageUrl?: string;
  imageAlt?: string;
};

export type LandingNavGroup = { title: string; links: LandingNavLink[] };

export interface LandingModel {
  copy: LandingCopy;
  seo: LandingSeo;
  nav: LandingNavLink[];
  mobileNav: LandingNavLink[];
  footerNav: LandingNavGroup[];
  cta: { signup: string; login: string; promoStudio: string };
  businessTypes: BusinessType[];
  facts: { value: string; label: string }[];
  beforePoints: ComparisonPoint[];
  withPoints: ComparisonPoint[];
  featureGroups: LandingFeatureCategory[];
  catalogue: FeatureItem[];
  featureItems: Record<string, FeatureItem>;
  comparisonGroups: LandingComparisonGroup[];
  howItWorks: LandingStep[];
  plans: PricingPlan[];
  entitlements: Record<string, Record<PricingPlanId, EntitlementState>>;
  creatives: LandingCreative[];
  promoWorkflow: LandingStep[];
  promoChannels: PromotionChannel[];
  benefits: LandingBenefit[];
  testimonials: LandingTestimonial[];
  faqs: LandingFaq[];
  disclosures: string[];
  footerDescription: string;
  footerCopyright: string;
  /** True when the published database rows replaced the bundled copy. */
  fromDatabase: boolean;
}

/**
 * Anchors whose section has been removed from the page layout. Published
 * navigation rows can predate a layout change, so a link that points at a
 * retired anchor is dropped instead of being rendered as a dead end.
 */
const RETIRED_ANCHORS = new Set(['#salon-marketing', '#product-preview']);

const keepLiveLinks = <T extends { href: string }>(links: T[]): T[] =>
  links.filter((link) => !RETIRED_ANCHORS.has(link.href));

/** Drops retired anchors and any group left without a destination. */
const keepLiveFooterNav = (groups: LandingNavGroup[]): LandingNavGroup[] =>
  groups
    .map((group) => ({ title: group.title, links: keepLiveLinks(group.links) }))
    .filter((group) => group.links.length > 0);

const FEATURE_ITEMS: Record<string, FeatureItem> = Object.fromEntries(
  FEATURE_CATEGORIES.flatMap((category) => category.items).map((item) => [item.id, item]),
);

/** The reviewed content the page ships with. */
export const STATIC_LANDING_MODEL: LandingModel = {
  copy: { ...NEXORA_LANDING_COPY },
  seo: { ...NEXORA_LANDING_SEO },
  nav: keepLiveLinks(NEXORA_LANDING_NAV.map((link) => ({ ...link }))),
  mobileNav: keepLiveLinks(NEXORA_LANDING_NAV.map((link) => ({ ...link }))),
  footerNav: keepLiveFooterNav(
    NEXORA_FOOTER_NAV.map((group) => ({ title: group.title, links: group.links.map((link) => ({ ...link })) })),
  ),
  cta: { signup: NEXORA_SIGNUP_PATH, login: NEXORA_LOGIN_PATH, promoStudio: NEXORA_PROMO_STUDIO_PATH },
  businessTypes: NEXORA_BUSINESS_TYPES.map((item) => ({ ...item })),
  facts: NEXORA_OVERVIEW_FACTS.map((fact) => ({ ...fact })),
  beforePoints: NEXORA_BEFORE_POINTS.map((point) => ({ ...point })),
  withPoints: NEXORA_WITH_POINTS.map((point) => ({ ...point })),
  featureGroups: NEXORA_LANDING_FEATURE_CATEGORIES.map((group) => ({ ...group, featureIds: [...group.featureIds] })),
  catalogue: FEATURE_CATEGORIES.flatMap((category) => category.items),
  featureItems: { ...FEATURE_ITEMS },
  comparisonGroups: NEXORA_LANDING_COMPARISON_GROUPS.map((group) => ({ ...group, featureIds: [...group.featureIds] })),
  howItWorks: NEXORA_HOW_IT_WORKS.map((step) => ({ ...step })),
  plans: PRICING_PLANS.map((plan) => ({ ...plan })),
  entitlements: Object.fromEntries(
    Object.entries(FEATURE_PLAN_ENTITLEMENTS).map(([featureId, plans]) => [featureId, { ...plans }]),
  ),
  creatives: NEXORA_PROMOTION_CREATIVES.map((creative) => ({ ...creative })),
  promoWorkflow: NEXORA_PROMOTION_WORKFLOW.map((step) => ({ ...step })),
  promoChannels: NEXORA_PROMOTION_CHANNELS.map((channel) => ({ ...channel })),
  benefits: NEXORA_BUSINESS_BENEFITS.map((benefit) => ({ ...benefit })),
  testimonials: NEXORA_LANDING_TESTIMONIALS.map((testimonial) => ({ ...testimonial })),
  faqs: NEXORA_LANDING_FAQS.map((faq) => ({ ...faq })),
  disclosures: [...NEXORA_LANDING_DISCLOSURES],
  footerDescription:
    'NEXORA SALONOS brings appointments, customers, staff, billing, marketing and reporting into one connected workspace for beauty and wellness businesses.',
  footerCopyright: '© NEXORA SALONOS. All rights reserved.',
  fromDatabase: false,
};

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */
const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

/** Only internal, non-empty paths are accepted as CTA destinations. */
const safePath = (value: unknown, fallback: string): string => {
  const candidate = text(value);
  if (!candidate) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  if (candidate.toLowerCase().startsWith('/javascript:')) return fallback;
  return candidate;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const sectionContent = (sections: LandingDbContent['sections'], key: string): Record<string, unknown> => {
  const section = sections.find((entry) => entry.section_key === key);
  return asRecord(section?.content);
};

const sectionRow = (sections: LandingDbContent['sections'], key: string) =>
  sections.find((entry) => entry.section_key === key);

const parsePlanKey = (value: string): PricingPlanId | null =>
  (['lite', 'grow', 'standard', 'premium'] as const).find((key) => key === value) ?? null;

/* ---------------------------------------------------------------------------
 * Database → model
 * ------------------------------------------------------------------------ */
export function buildModelFromDatabase(db: LandingDbContent): LandingModel {
  const model: LandingModel = {
    ...STATIC_LANDING_MODEL,
    copy: { ...STATIC_LANDING_MODEL.copy },
    seo: { ...STATIC_LANDING_MODEL.seo },
    nav: [...STATIC_LANDING_MODEL.nav],
    mobileNav: [...STATIC_LANDING_MODEL.mobileNav],
    footerNav: STATIC_LANDING_MODEL.footerNav.map((group) => ({ title: group.title, links: [...group.links] })),
    cta: { ...STATIC_LANDING_MODEL.cta },
    businessTypes: [...STATIC_LANDING_MODEL.businessTypes],
    facts: [...STATIC_LANDING_MODEL.facts],
    beforePoints: [...STATIC_LANDING_MODEL.beforePoints],
    withPoints: [...STATIC_LANDING_MODEL.withPoints],
    featureGroups: STATIC_LANDING_MODEL.featureGroups.map((group) => ({ ...group, featureIds: [...group.featureIds] })),
    catalogue: [...STATIC_LANDING_MODEL.catalogue],
    featureItems: { ...STATIC_LANDING_MODEL.featureItems },
    comparisonGroups: STATIC_LANDING_MODEL.comparisonGroups.map((group) => ({ ...group, featureIds: [...group.featureIds] })),
    howItWorks: [...STATIC_LANDING_MODEL.howItWorks],
    plans: [...STATIC_LANDING_MODEL.plans],
    entitlements: Object.fromEntries(
      Object.entries(STATIC_LANDING_MODEL.entitlements).map(([featureId, plans]) => [featureId, { ...plans }]),
    ),
    creatives: [...STATIC_LANDING_MODEL.creatives],
    promoWorkflow: [...STATIC_LANDING_MODEL.promoWorkflow],
    promoChannels: [...STATIC_LANDING_MODEL.promoChannels],
    benefits: [...STATIC_LANDING_MODEL.benefits],
    testimonials: [...STATIC_LANDING_MODEL.testimonials],
    faqs: [...STATIC_LANDING_MODEL.faqs],
    disclosures: [...STATIC_LANDING_MODEL.disclosures],
    fromDatabase: true,
  };

  /* ---- site settings ---- */
  const settings = db.settings;
  if (settings) {
    model.copy.heroEyebrow = text(settings.brand_tagline) ?? model.copy.heroEyebrow;
    model.copy.heroPrimary = text(settings.primary_cta_label) ?? model.copy.heroPrimary;
    model.copy.heroSecondary = text(settings.secondary_cta_label) ?? model.copy.heroSecondary;
    model.copy.heroTitle = text(settings.hero_headline) ?? model.copy.heroTitle;
    model.copy.heroDescription = text(settings.hero_subheadline) ?? model.copy.heroDescription;
    model.footerDescription = text(settings.footer_description) ?? model.footerDescription;
    model.footerCopyright = text(settings.footer_copyright) ?? model.footerCopyright;
    model.seo.title = text(settings.meta_title) ?? model.seo.title;
    model.seo.description = text(settings.meta_description) ?? model.seo.description;
    const ogPath = text(settings.og_image_path);
    if (ogPath) model.seo.ogImagePath = ogPath;
    const canonical = text(settings.canonical_url);
    if (canonical) {
      try {
        model.seo.canonicalPath = new URL(canonical).pathname || model.seo.canonicalPath;
      } catch {
        /* Keep the bundled canonical path when the stored URL is not a URL. */
      }
    }
  }

  /* ---- landing sections ---- */
  const hero = sectionRow(db.sections, 'hero');
  if (hero) {
    model.copy.heroEyebrow = text(hero.eyebrow) ?? model.copy.heroEyebrow;
    model.copy.heroTitle = text(hero.title) ?? model.copy.heroTitle;
    model.copy.heroDescription = text(hero.subtitle) ?? model.copy.heroDescription;
    model.copy.heroNote = text(hero.body) ?? model.copy.heroNote;
    model.copy.heroPrimary = text(hero.primary_cta_label) ?? model.copy.heroPrimary;
    model.copy.heroSecondary = text(hero.secondary_cta_label) ?? model.copy.heroSecondary;
    model.cta.signup = safePath(hero.primary_cta_href, model.cta.signup);
  }
  const finalCta = sectionRow(db.sections, 'final_cta');
  if (finalCta) {
    model.copy.finalTitle = text(finalCta.title) ?? model.copy.finalTitle;
    model.copy.finalDescription = text(finalCta.subtitle) ?? model.copy.finalDescription;
  }

  const copyFromSection = (key: string): { title: string | null; subtitle: string | null } => {
    const row = sectionRow(db.sections, key);
    return { title: text(row?.title), subtitle: text(row?.subtitle) };
  };

  const businessCopy = copyFromSection('business_categories');
  model.copy.businessTypesTitle = businessCopy.title ?? model.copy.businessTypesTitle;
  model.copy.businessTypesDescription = businessCopy.subtitle ?? model.copy.businessTypesDescription;

  const problemCopy = copyFromSection('problem_solution');
  model.copy.problemTitle = problemCopy.title ?? model.copy.problemTitle;
  model.copy.problemDescription = problemCopy.subtitle ?? model.copy.problemDescription;

  const featureCopy = copyFromSection('core_features');
  model.copy.featuresTitle = featureCopy.title ?? model.copy.featuresTitle;
  model.copy.featuresDescription = featureCopy.subtitle ?? model.copy.featuresDescription;

  const howCopy = copyFromSection('how_it_works');
  model.copy.howTitle = howCopy.title ?? model.copy.howTitle;
  model.copy.howDescription = howCopy.subtitle ?? model.copy.howDescription;

  const pricingCopy = copyFromSection('pricing');
  model.copy.pricingTitle = pricingCopy.title ?? model.copy.pricingTitle;
  model.copy.pricingDescription = pricingCopy.subtitle ?? model.copy.pricingDescription;

  const promotionCopy = copyFromSection('salon_promotion_studio');
  model.copy.promotionTitle = promotionCopy.title ?? model.copy.promotionTitle;
  model.copy.promotionDescription = promotionCopy.subtitle ?? model.copy.promotionDescription;

  const benefitsCopy = copyFromSection('business_benefits');
  model.copy.benefitsTitle = benefitsCopy.title ?? model.copy.benefitsTitle;
  model.copy.operationsSubtitle = benefitsCopy.subtitle ?? model.copy.operationsSubtitle;

  const testimonialCopy = copyFromSection('testimonials');
  model.copy.testimonialsTitle = testimonialCopy.title ?? model.copy.testimonialsTitle;

  const faqCopy = copyFromSection('faq');
  model.copy.faqTitle = faqCopy.title ?? model.copy.faqTitle;

  /* ---- section JSON content ---- */
  const problemContent = sectionContent(db.sections, 'problem_solution');
  const before = asRecord(problemContent.before);
  const withNexora = asRecord(problemContent.with_nexora);
  if (Object.keys(before).length) {
    model.beforePoints = Object.entries(before).map(([id, value]) => ({
      id,
      title: text(asRecord(value).title) ?? id,
      description: text(asRecord(value).description) ?? '',
    }));
  }
  if (Object.keys(withNexora).length) {
    model.withPoints = Object.entries(withNexora).map(([id, value]) => ({
      id,
      title: text(asRecord(value).title) ?? id,
      description: text(asRecord(value).description) ?? '',
    }));
  }

  const howContent = sectionContent(db.sections, 'how_it_works');
  if (Array.isArray(howContent.steps) && howContent.steps.length) {
    model.howItWorks = howContent.steps.map((step, index) => ({
      id: text(asRecord(step).id) ?? `step-${index + 1}`,
      title: text(asRecord(step).title) ?? '',
      description: text(asRecord(step).description) ?? '',
      icon: text(asRecord(step).icon_key) ?? 'store',
    }));
  }

  const featureContent = sectionContent(db.sections, 'core_features');
  if (Array.isArray(featureContent.groups) && featureContent.groups.length) {
    model.featureGroups = featureContent.groups.map((group, index) => {
      const record = asRecord(group);
      return {
        id: text(record.id) ?? `group-${index + 1}`,
        title: text(record.title) ?? '',
        benefit: text(record.benefit) ?? '',
        icon: text(record.icon_key) ?? 'calendar',
        featureIds: asStringArray(record.feature_ids),
      };
    });
  }

  const benefitsContent = sectionContent(db.sections, 'business_benefits');
  if (Array.isArray(benefitsContent.benefits) && benefitsContent.benefits.length) {
    model.benefits = benefitsContent.benefits.map((benefit, index) => {
      const record = asRecord(benefit);
      return {
        id: text(record.id) ?? `benefit-${index + 1}`,
        title: text(record.title) ?? '',
        description: text(record.description) ?? '',
        icon: text(record.icon_key) ?? 'chart',
      };
    });
  }

  const promoContent = sectionContent(db.sections, 'salon_promotion_studio');
  if (Array.isArray(promoContent.workflow) && promoContent.workflow.length) {
    model.promoWorkflow = promoContent.workflow.map((step, index) => ({
      id: text(asRecord(step).id) ?? `workflow-${index + 1}`,
      title: text(asRecord(step).title) ?? '',
      description: text(asRecord(step).description) ?? '',
      icon: text(asRecord(step).icon_key) ?? 'palette',
    }));
  }
  if (Array.isArray(promoContent.channels) && promoContent.channels.length) {
    model.promoChannels = promoContent.channels.map((channel, index) => {
      const record = asRecord(channel);
      const status = text(record.status);
      return {
        id: text(record.id) ?? `channel-${index + 1}`,
        label: text(record.label) ?? '',
        status: status === 'available' ? 'available' : 'planned',
        note: text(record.note) ?? '',
      };
    });
  }

  const finalContent = sectionContent(db.sections, 'final_cta');
  if (Array.isArray(finalContent.disclosures) && finalContent.disclosures.length) {
    model.disclosures = finalContent.disclosures.filter((entry): entry is string => typeof entry === 'string');
  }

  const trustContent = sectionContent(db.sections, 'trust_strip');
  if (Array.isArray(trustContent.facts) && trustContent.facts.length) {
    model.facts = trustContent.facts.map((fact, index) => {
      const record = asRecord(fact);
      return {
        value: text(record.value) ?? String(index + 1),
        label: text(record.label) ?? '',
      };
    });
  }

  /* ---- navigation ---- */
  const toLink = (row: { label: string; href: string; open_new_tab: boolean }): LandingNavLink => ({
    label: row.label,
    href: safePath(row.href, '#'),
    external: Boolean(row.open_new_tab),
  });
  const liveRows = db.navigation.filter((row) => !RETIRED_ANCHORS.has(row.href));
  const headerRows = liveRows.filter((row) => row.location === 'header');
  const mobileRows = liveRows.filter((row) => row.location === 'mobile');
  if (headerRows.length) model.nav = headerRows.map(toLink);
  if (mobileRows.length) model.mobileNav = mobileRows.map(toLink);

  const footerRows = liveRows.filter((row) => row.location === 'footer');
  if (footerRows.length) {
    const used = new Set<string>();
    const groups: LandingNavGroup[] = model.footerNav.map((group) => ({
      title: group.title,
      links: group.links
        .map((link) => {
          const match = footerRows.find((row) => row.label === link.label);
          if (!match) return link;
          used.add(match.label);
          return toLink(match);
        })
        .filter(Boolean),
    }));
    const leftovers = footerRows.filter((row) => !used.has(row.label)).map(toLink);
    if (leftovers.length) groups.push({ title: 'More', links: leftovers });
    model.footerNav = keepLiveFooterNav(groups);
  }

  /* ---- business categories ---- */
  if (db.businessCategories.length) {
    model.businessTypes = db.businessCategories.map((row) => ({
      id: row.slug,
      title: row.name,
      description: row.description ?? '',
      icon: row.icon_key ?? 'store',
    }));
  }

  /* ---- features and comparison groups ---- */
  if (db.features.length) {
    const items: Record<string, FeatureItem> = { ...STATIC_LANDING_MODEL.featureItems };
    db.features.forEach((row) => {
      items[row.slug] = {
        id: row.slug,
        label: row.name,
        description: row.description ?? '',
      };
    });
    model.featureItems = items;
    model.catalogue = db.features.map((row) => items[row.slug]);
  }
  if (db.featureCategories.length) {
    const groups: LandingComparisonGroup[] = db.featureCategories.map((category) => ({
      id: category.slug,
      label: category.name,
      featureIds: db.features.filter((feature) => feature.category_id === category.id).map((feature) => feature.slug),
    }));
    model.comparisonGroups = groups.filter((group) => group.featureIds.length > 0);
  }

  /* ---- pricing plans ---- */
  if (db.plans.length) {
    const plans: PricingPlan[] = [];
    db.plans.forEach((row) => {
      const planKey = parsePlanKey(row.plan_key);
      const annualTotal = row.price_yearly === null ? null : Number(row.price_yearly);
      if (!planKey || annualTotal === null || !Number.isFinite(annualTotal) || annualTotal <= 0) return;
      const monthly = row.price_monthly === null ? null : Number(row.price_monthly);
      plans.push({
        id: planKey,
        name: row.name,
        annualMonthlyEquivalent: Math.round(annualTotal / 12),
        annualTotal,
        monthlyPrice: monthly !== null && Number.isFinite(monthly) ? monthly : null,
        description: row.description ?? '',
        positioning: row.tagline ?? '',
        cta: row.cta_label,
        popular: row.is_recommended,
      });
    });
    if (plans.length) model.plans = plans;
  }

  /* ---- plan entitlements (only verified rows) ---- */
  if (db.planFeatures.length) {
    const entitlements = Object.fromEntries(
      Object.entries(STATIC_LANDING_MODEL.entitlements).map(([featureId, plans]) => [featureId, { ...plans }]),
    );
    const featureById = new Map(db.features.map((row) => [row.id, row.slug]));
    const planById = new Map(db.plans.map((row) => [row.id, row.plan_key]));
    db.planFeatures.forEach((row) => {
      const featureSlug = featureById.get(row.feature_id);
      const planKey = planById.get(row.plan_id);
      if (!featureSlug || !planKey) return;
      const parsed = parsePlanKey(planKey);
      if (!parsed) return;
      const state: EntitlementState =
        row.availability === 'included' ? 'included' : row.availability === 'not_included' ? 'excluded' : 'review';
      const current = entitlements[featureSlug] ?? ({} as Record<PricingPlanId, EntitlementState>);
      entitlements[featureSlug] = { ...current, [parsed]: state };
    });
    model.entitlements = entitlements;
  }

  /* ---- promotional creatives ---- */
  if (db.creatives.length) {
    model.creatives = db.creatives.map((row: PromotionalCreativeRow) => ({
      id: row.id,
      category: row.category ?? 'Salon promotion',
      offer: row.title,
      headline: row.title,
      detail: row.description ?? '',
      palette: 'ink',
      format: '1:1',
      imageUrl: publicAssetUrl(row.image_path),
      imageAlt: row.image_alt,
    }));
  }

  /* ---- testimonials (only permission-confirmed, approved, published) ---- */
  if (db.testimonials.length) {
    model.testimonials = db.testimonials.map((row) => ({
      id: row.id,
      quote: row.quote,
      name: row.person_name,
      role: row.role_label ?? row.business_type ?? 'Customer',
      business: row.business_name ?? '',
    }));
  }

  /* ---- FAQs ---- */
  if (db.faqs.length) {
    model.faqs = db.faqs.map((row) => ({ question: row.question, answer: row.answer }));
  }

  return model;
}
