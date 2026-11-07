import { useEffect } from 'react';
import { DemoProvider } from '../nexora-pricing/DemoProvider';
import { NEXORA_PUBLIC_ORIGIN } from '../../lib/publicSeo';
import { nexoraSalonLandingSchema } from '../../lib/nexoraLandingContent';
import { LandingContentProvider, useLandingModel } from './LandingContentProvider';
import { SiteHeader } from './sections/SiteHeader';
import { HeroSection } from './sections/HeroSection';
import { BusinessTypesSection } from './sections/BusinessTypesSection';
import { ProblemSolutionSection } from './sections/ProblemSolutionSection';
import { FeatureSections } from './sections/FeatureSections';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { PricingSection } from './sections/PricingSection';
import { PricingDetailPointer } from './sections/PricingDetailPointer';
import { PromotionStudioSection } from './sections/PromotionStudioSection';
import { OperationsSection } from './sections/OperationsSection';
import { BenefitsSection } from './sections/BenefitsSection';
import { ProductPreviewSection } from './sections/ProductPreviewSection';
import { TestimonialSection } from './sections/TestimonialSection';
import { FaqSection } from './sections/FaqSection';
import { FinalCtaSection } from './sections/FinalCtaSection';
import { SiteFooter } from './sections/SiteFooter';
import { MobileActionBar } from './sections/MobileActionBar';
import './nexoraLanding.css';

/**
 * Page metadata.
 *
 * The prerendered document already carries the reviewed title, description,
 * canonical URL and Open Graph image, so the build never needs the network.
 * When the published `site_settings` row is available the same metadata is
 * refreshed in the browser from the database.
 */
function LandingDocument() {
  const model = useLandingModel();
  const { seo } = model;

  useEffect(() => {
    const pageTitle = seo.title;
    const pageDescription = seo.description;
    const canonicalUrl = `${NEXORA_PUBLIC_ORIGIN}${seo.canonicalPath}`;
    const ogImage = seo.ogImagePath.startsWith('http')
      ? seo.ogImagePath
      : `${NEXORA_PUBLIC_ORIGIN}${seo.ogImagePath}`;

    document.title = pageTitle;
    const upsertMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(selector);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute(attribute, key);
        document.head.appendChild(node);
      }
      node.content = content;
    };
    upsertMeta('meta[name="description"]', 'name', 'description', pageDescription);
    upsertMeta('meta[name="robots"]', 'name', 'robots', 'index,follow');
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'NEXORA SALONOS');
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', pageDescription);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'NEXORA SALONOS salon management software');
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDescription);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    let script = document.getElementById('nexora-salonos-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'nexora-salonos-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(
      nexoraSalonLandingSchema(NEXORA_PUBLIC_ORIGIN, {
        faqs: model.faqs,
        plans: model.plans.map((plan) => ({ annualTotal: plan.annualTotal })),
        description: pageDescription,
        canonicalPath: seo.canonicalPath,
      }),
    );
  }, [seo, model.faqs, model.plans]);

  return (
    <div className="sl-page">
      <a className="sl-skip" href="#sl-main">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="sl-main">
        <HeroSection />
        <BusinessTypesSection aliasId="salon-categories" />
        <ProblemSolutionSection />
        <FeatureSections aliasId="platform" />
        <HowItWorksSection />
        <PricingSection aliasId="plans" />
        <PricingDetailPointer />
        <PromotionStudioSection />
        <OperationsSection />
        <BenefitsSection />
        <ProductPreviewSection />
        <TestimonialSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
      <MobileActionBar />
    </div>
  );
}

export function NexoraSalonLandingPage() {
  return (
    <LandingContentProvider>
      <DemoProvider>
        <LandingDocument />
      </DemoProvider>
    </LandingContentProvider>
  );
}
