import { useEffect } from 'react';
import { DemoProvider } from '../nexora-pricing/DemoProvider';
import { LandingHeader } from './sections/LandingHeader';
import { LandingHero } from './sections/LandingHero';
import { TemplateShowcase } from './sections/TemplateShowcase';
import { AudienceSection } from './sections/AudienceSection';
import { VerifiedOverview } from './sections/VerifiedOverview';
import { FeatureMatrix } from '../nexora-pricing/sections/FeatureMatrix';
import { WorkflowSection } from './sections/WorkflowSection';
import { ModuleGrid } from './sections/ModuleGrid';
import { ResultsDisclosure } from './sections/ResultsDisclosure';
import { TrustAndDemo } from './sections/TrustAndDemo';
import { FAQ } from '../nexora-pricing/sections/FAQ';
import { PricingFooter } from '../nexora-pricing/sections/PricingFooter';
import { StickyFooterBar } from './sections/StickyFooterBar';
import { NEXORA_PUBLIC_ORIGIN } from '../../lib/publicSeo';
import '../pricingPage.css';
import './nexoraLanding.css';

export function NexoraSalonLandingPage() {
  useEffect(() => {
    const title = 'Nexora SalonOS | Salon Websites, Bookings & Workspace';
    const description = 'Explore Nexora salon website templates, booking tools, workspace features and GST-inclusive annual plan prices. Monthly rates and subscription checkout are not configured.';
    document.title = title;
    const upsertMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(selector);
      if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, key); document.head.appendChild(node); }
      node.content = content;
    };
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', `${NEXORA_PUBLIC_ORIGIN}/salon-os`);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `${NEXORA_PUBLIC_ORIGIN}/salon-os`;
  }, []);

  return <DemoProvider><div className="nl-page"><LandingHeader/><main>
    <LandingHero/>
    <TemplateShowcase/>
    <AudienceSection/>
    <VerifiedOverview/>
    <FeatureMatrix/>
    <WorkflowSection/>
    <ModuleGrid/>
    <ResultsDisclosure/>
    <TrustAndDemo/>
    <FAQ/>
  </main><PricingFooter/><StickyFooterBar/></div></DemoProvider>;
}
