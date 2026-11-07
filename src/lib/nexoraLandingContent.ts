import { NEXORA_TEMPLATE_META, nexoraTemplatePagePath } from './nexoraTemplateCatalogue';
import { FEATURE_CATEGORIES, PRICING_PLANS } from './nexoraPricing';

/** Factual, repository-backed overview numbers; deliberately no ROI or testimonial claims. */
export const NEXORA_OVERVIEW_FACTS = [
  { value: String(NEXORA_TEMPLATE_META.length), label: 'salon website templates' },
  { value: String(FEATURE_CATEGORIES.length), label: 'feature comparison areas' },
  { value: String(PRICING_PLANS.length), label: 'annual plans' },
] as const;

export const NEXORA_LANDING_AUDIENCES = [
  { title: 'Salon owners', body: 'Review salon website bookings and supported business workflows from an owner workspace.' },
  { title: 'Salon teams', body: 'Use the staff profiles and team-management tools enabled for your workspace.' },
  { title: 'Salon customers', body: 'Book through a published salon website where online booking is enabled.' },
  { title: 'Growing businesses', body: 'Compare plan terms and confirm feature availability before choosing a subscription.' },
] as const;

export const NEXORA_WORKFLOW_CARDS = [
  { title: 'Website bookings', body: 'Published salon sites can present services and accept appointment requests through the existing booking flow.' },
  { title: 'Salon operations', body: 'Owner workspaces include tools for supported staff, customer and day-to-day business workflows.' },
  { title: 'Plan clarity', body: 'Compare approved annual prices and see which plan inclusions are confirmed or still under review.' },
] as const;

export const NEXORA_LANDING_COPY = {
  heroEyebrow: 'NEXORA SALONOS',
  heroTitle: 'Salon workflows, brought into one workspace.',
  heroDescription: 'Explore salon website templates, booking tools and supported owner workflows. Review approved annual prices before you choose a plan.',
  audienceTitle: 'Built around the people who run and visit salons',
  overviewTitle: 'A platform overview you can verify',
  overviewNote: 'These are catalog counts, not customer results or ROI claims. Plan availability varies; unconfirmed inclusions are marked for review.',
  workflowsTitle: 'Bring everyday salon workflows into focus',
  featuresTitle: 'Explore the platform feature areas',
  termsTitle: 'Clear terms before you decide',
  terms: [
    'Displayed annual plan prices include GST. Monthly-billed prices are not configured.',
    'Subscription checkout is not active. Selecting a plan will not charge or activate an account.',
    'Only explicitly confirmed feature inclusions are marked; other plan assignments remain under review.',
    'No refund guarantee, response-time promise, migration commitment or ROI result is represented here.',
  ],
} as const;

export const NEXORA_TEMPLATE_CARDS = NEXORA_TEMPLATE_META.slice(0, 8).map(template => ({
  id: template.templateId,
  name: template.displayName,
  category: template.categoryName,
  path: nexoraTemplatePagePath(template.templateId),
}));

// The attached sample testimonials, partner names, ROI estimates and guarantee claims are intentionally excluded.
