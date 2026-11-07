import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DemoProvider } from '../nexora-pricing/DemoProvider';
import {
  FEATURE_CATEGORIES,
  FEATURE_PLAN_ENTITLEMENTS,
  PRICING_FAQS,
  PRICING_PLANS,
  clearPendingPricingSelection,
  isBillingInterval,
  isPricingPlanId,
  pricingAuthPath,
  readPendingPricingSelection,
  savePendingPricingSelection,
  type BillingInterval,
  type PricingPlan,
} from '../../lib/nexoraPricing';
import { NEXORA_PUBLIC_ORIGIN } from '../../lib/publicSeo';
import { NEXORA_PRICING_SEO, nexoraPricingSchema } from '../../lib/nexoraPricingSeo';
import {
  NEXORA_LANDING_COMPARISON_GROUPS,
  NEXORA_LANDING_FEATURE_CATEGORIES,
  type LandingNavLink,
} from '../../lib/nexoraLandingContent';
import { LandingContentProvider, useLandingModel } from './LandingContentProvider';
import { SiteHeader } from './sections/SiteHeader';
import { HeroSection } from './sections/HeroSection';
import { BusinessTypesSection } from './sections/BusinessTypesSection';
import { ProblemSolutionSection } from './sections/ProblemSolutionSection';
import { PlatformOverviewSection } from './sections/PlatformOverviewSection';
import { FeatureSections } from './sections/FeatureSections';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { PricingPlansSection } from './sections/PricingPlansSection';
import { ComparisonSection } from './sections/ComparisonSection';
import { PromotionStudioSection } from './sections/PromotionStudioSection';
import { BenefitsSection } from './sections/BenefitsSection';
import { ProductPreviewSection } from './sections/ProductPreviewSection';
import { TestimonialSection } from './sections/TestimonialSection';
import { FaqSection } from './sections/FaqSection';
import { FinalCtaSection } from './sections/FinalCtaSection';
import { SiteFooter } from './sections/SiteFooter';
import { MobileActionBar } from './sections/MobileActionBar';
import { PlanSummaryDialog } from './sections/PlanSummaryDialog';
import './nexoraLanding.css';

/** Navigation for this route. Every entry resolves to a rendered section. */
const PRICING_NAV: LandingNavLink[] = [
  { label: 'Platform', href: '#platform' },
  { label: 'Features', href: '#features' },
  { label: 'Salon categories', href: '#salon-categories' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Salon Promotion Studio', href: '#salon-marketing' },
  { label: 'FAQs', href: '#faq' },
];

const PRICING_FOOTER_NAV = [
  {
    title: 'Product',
    links: [
      { label: 'Platform', href: '#platform' },
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Compare plans', href: '#comparison' },
    ] as LandingNavLink[],
  },
  {
    title: 'Salon marketing',
    links: [
      { label: 'Promotion studio', href: '#salon-marketing' },
      { label: 'Salon categories', href: '#salon-categories' },
    ] as LandingNavLink[],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Product preview', href: '#product-preview' },
      { label: 'Business benefits', href: '#benefits' },
      { label: 'FAQs', href: '#faq' },
    ] as LandingNavLink[],
  },
  {
    title: 'Account',
    links: [
      { label: 'Login', href: '/login', external: true },
      { label: 'Get started', href: '/login?auth=signup', external: true },
      { label: 'SalonOS landing page', href: '/salon-os', external: true },
    ] as LandingNavLink[],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy notice', href: '/privacy', external: true },
    ] as LandingNavLink[],
  },
];

/**
 * The approved commercial configuration stays authoritative for this route.
 * Published database rows may refresh the marketing copy, but prices,
 * entitlements and the feature catalogue come from `src/lib/nexoraPricing.ts`.
 */
const APPROVED_CATALOGUE = FEATURE_CATEGORIES.flatMap((category) => category.items);

const pricingOverrides = {
  plans: PRICING_PLANS.map((plan) => ({ ...plan })),
  entitlements: Object.fromEntries(
    Object.entries(FEATURE_PLAN_ENTITLEMENTS).map(([featureId, plans]) => [featureId, { ...plans }]),
  ),
  catalogue: APPROVED_CATALOGUE,
  featureItems: Object.fromEntries(APPROVED_CATALOGUE.map((item) => [item.id, { ...item }])),
  comparisonGroups: NEXORA_LANDING_COMPARISON_GROUPS.map((group) => ({ ...group, featureIds: [...group.featureIds] })),
  featureGroups: NEXORA_LANDING_FEATURE_CATEGORIES.map((group) => ({ ...group, featureIds: [...group.featureIds] })),
  faqs: PRICING_FAQS.map(([question, answer]) => ({ question, answer })),
  nav: PRICING_NAV,
  mobileNav: PRICING_NAV,
  footerNav: PRICING_FOOTER_NAV,
};

function PricingLandingDocument({
  interval,
  selected,
  setInterval,
  setSelected,
  selectPlan,
  selectionMessage,
}: {
  interval: BillingInterval;
  selected: PricingPlan | null;
  setInterval: (interval: BillingInterval) => void;
  setSelected: (plan: PricingPlan | null) => void;
  selectPlan: (plan: PricingPlan) => void;
  selectionMessage: string;
}) {
  const model = useLandingModel();
  const { seo } = model;

  useEffect(() => {
    const canonicalUrl = `${NEXORA_PUBLIC_ORIGIN}${NEXORA_PRICING_SEO.canonicalPath}`;
    const ogImage = `${NEXORA_PUBLIC_ORIGIN}${NEXORA_PRICING_SEO.ogImagePath}`;
    document.title = NEXORA_PRICING_SEO.title;

    const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute(attribute, key);
        document.head.appendChild(node);
      }
      node.setAttribute('content', content);
    };
    upsertMeta('name', 'description', NEXORA_PRICING_SEO.description);
    upsertMeta('name', 'robots', 'index,follow');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'NEXORA SALONOS');
    upsertMeta('property', 'og:title', NEXORA_PRICING_SEO.title);
    upsertMeta('property', 'og:description', NEXORA_PRICING_SEO.description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', 'NEXORA SALONOS salon management software');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', NEXORA_PRICING_SEO.title);
    upsertMeta('name', 'twitter:description', NEXORA_PRICING_SEO.description);
    upsertMeta('name', 'twitter:image', ogImage);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const schema = nexoraPricingSchema(NEXORA_PUBLIC_ORIGIN);
    let script = document.getElementById('nexora-pricing-faq-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'nexora-pricing-faq-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }, [seo]);

  return (
    <div className="sl-page">
      <a className="sl-skip" href="#sl-main">
        Skip to main content
      </a>
      <SiteHeader links={PRICING_NAV} mobileLinks={PRICING_NAV} demoLabel="Request a Demo" />
      <main id="sl-main">
        <HeroSection
          primaryLabel="Explore Plans"
          primaryHref="#pricing"
          secondaryLabel="Request a Demo"
          secondaryAction="demo"
        />
        <BusinessTypesSection id="salon-categories" />
        <ProblemSolutionSection />
        <PlatformOverviewSection id="platform" />
        <FeatureSections id="features" />
        <HowItWorksSection id="how-it-works" />
        <PricingPlansSection interval={interval} onIntervalChange={setInterval} onSelect={selectPlan} />
        {selectionMessage ? (
          <p className="sl-container sl-selection-message" role="status">
            {selectionMessage}
          </p>
        ) : null}
        <ComparisonSection id="comparison" />
        <PromotionStudioSection id="salon-marketing" />
        <BenefitsSection id="benefits" />
        <ProductPreviewSection id="product-preview" />
        <TestimonialSection id="testimonials" />
        <FaqSection id="faq" />
        <FinalCtaSection id="get-started" primaryLabel="Get Started With Nexora SalonOS" demoLabel="Request a Demo" />
      </main>
      <SiteFooter />
      <MobileActionBar />
      <PlanSummaryDialog plan={selected} interval={interval} onClose={() => setSelected(null)} />
    </div>
  );
}

/**
 * The complete NEXORA SALONOS landing page, published at `/pricing`.
 *
 * It reuses the reviewed landing sections (same design tokens, same honest
 * content rules) and keeps the pricing route's verified behaviour: pending
 * plan selection, the sign-up hand-off, the resume path and the plan summary
 * for signed-in visitors.
 */
export function NexoraPricingLandingPage() {
  const [interval, setInterval] = useState<BillingInterval>('annual');
  const [selected, setSelected] = useState<PricingPlan | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState('');

  // Restore a plan selection that was started before sign-in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = readPendingPricingSelection();
    const planId = params.get('resume_plan');
    const resolvedPlanId = isPricingPlanId(planId) ? planId : stored?.planId;
    if (!resolvedPlanId) return;
    const requestedInterval = params.get('billing_interval') || stored?.billingInterval;
    const resolvedInterval = isBillingInterval(requestedInterval) ? requestedInterval : 'annual';
    setInterval(resolvedInterval);
    setSelected(PRICING_PLANS.find((plan) => plan.id === resolvedPlanId) || null);
    clearPendingPricingSelection();
    if (params.has('resume_plan')) {
      params.delete('resume_plan');
      params.delete('billing_interval');
      const clean = `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState(window.history.state, '', clean);
    }
  }, []);

  const overrides = useMemo(() => pricingOverrides, []);

  /**
   * Plan selection hand-off.
   *
   * A visitor without a session keeps their choice and continues to sign-up
   * with the plan attached. A signed-in visitor gets the plan summary, which
   * repeats the approved figures and states that subscription checkout is not
   * configured. Nothing here charges a card or activates a subscription.
   */
  const selectPlan = async (plan: PricingPlan) => {
    setSelectionMessage('');
    setIsSelecting(true);
    const selection = { planId: plan.id, billingInterval: interval, savedAt: Date.now() };
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        savePendingPricingSelection(selection);
        window.location.assign(pricingAuthPath(selection));
        return;
      }
      setSelected(plan);
    } catch (error) {
      setSelectionMessage(
        error instanceof Error
          ? error.message
          : 'Could not check your sign-in status. Retry before continuing.',
      );
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <LandingContentProvider overrides={overrides}>
      <DemoProvider>
        <PricingLandingDocument
          interval={interval}
          setInterval={setInterval}
          selected={selected}
          setSelected={setSelected}
          selectPlan={(plan) => {
            if (isSelecting) return;
            void selectPlan(plan);
          }}
          selectionMessage={selectionMessage}
        />
      </DemoProvider>
    </LandingContentProvider>
  );
}
