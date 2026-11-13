import { NEXORA_PUBLIC_ORIGIN } from './publicSeo';

/**
 * Public metadata for NEXORA SALONOS marketing routes. This is the single
 * source of truth for build-time prerendering and client-side metadata.
 */
export type NexoraEcosystemPath =
  | '/salon-onboarding'
  | '/salon-growth'
  | '/growth-partner-rewards'
  | '/partner-rewards';

export interface NexoraEcosystemSeo {
  path: NexoraEcosystemPath;
  label: string;
  title: string;
  description: string;
  ogImagePath: string;
  ogImageAlt: string;
  themeColor: string;
  contentMarker: string;
}

export const NEXORA_ECOSYSTEM_SEO: Readonly<Record<NexoraEcosystemPath, NexoraEcosystemSeo>> = {
  '/salon-onboarding': {
    path: '/salon-onboarding',
    label: 'Salon Onboarding',
    title: 'Salon Website Builder & Onboarding for India | NEXORA SalonOS',
    description:
      'Create a salon website with NEXORA SalonOS. Explore salon website templates for hair salons, barber shops, beauty parlours and nail studios. Add your brand, services, team and booking details, then preview and publish.',
    ogImagePath: '/nexora-homepage-og.jpg',
    ogImageAlt: 'NEXORA SalonOS salon website builder, salon templates and brand setup',
    themeColor: '#312347',
    contentMarker: 'Your Salon Deserves a',
  },
  '/salon-growth': {
    path: '/salon-growth',
    label: 'Salon Growth',
    title: 'Salon Customer Growth & Retention | NEXORA SalonOS',
    description:
      'How NEXORA SalonOS supports organised customer records, booking workflows, recall and reporting for salons, with limits, consent and configuration dependencies stated plainly.',
    ogImagePath: '/nexora-homepage-og.jpg',
    ogImageAlt: 'NEXORA SalonOS salon customer and booking tools',
    themeColor: '#312347',
    contentMarker: 'Build lasting customer relationships.',
  },
  '/growth-partner-rewards': {
    path: '/growth-partner-rewards',
    label: 'Growth Partner Rewards',
    title: 'NEXORA Growth Partner Programme — Reward Journey & Eligibility',
    description:
      'NEXORA Growth Partner milestones from 25 to 1000+ eligible shops, with the verification, approval and fulfilment terms that apply. Eligibility follows the current programme policy.',
    ogImagePath: '/nexora-homepage-og.jpg',
    ogImageAlt: 'NEXORA Growth Partner reward programme',
    themeColor: '#312347',
    contentMarker: 'Salon Onboarding Se',
  },
  '/partner-rewards': {
    path: '/partner-rewards',
    label: 'Partner Rewards & Recognition',
    title: 'NEXORA Partner Rewards & Recognition | Top Salon Jaipur Awards',
    description: 'Explore NEXORA salon partner rewards, a fixed 90-day Top Salon Jaipur competition, approved participant report cards and owner-controlled public salon profiles.',
    ogImagePath: '/nexora-jaipur-awards/top-salon-jaipur-awards.svg',
    ogImageAlt: 'NEXORA Top Salon Jaipur Awards and Partner Rewards',
    themeColor: '#24172d',
    contentMarker: 'Your Growth Deserves',
  },
};

export const NEXORA_ECOSYSTEM_ROUTES: readonly NexoraEcosystemPath[] = [
  '/salon-onboarding',
  '/salon-growth',
  '/growth-partner-rewards',
  '/partner-rewards',
];

export function nexoraEcosystemCanonicalUrl(path: NexoraEcosystemPath): string {
  return `${NEXORA_PUBLIC_ORIGIN}${NEXORA_ECOSYSTEM_SEO[path].path}`;
}

/** Structured data for the public page and its breadcrumb. */
export function nexoraEcosystemSchema(path: NexoraEcosystemPath) {
  const seo = NEXORA_ECOSYSTEM_SEO[path];
  const url = nexoraEcosystemCanonicalUrl(path);
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: seo.title,
      description: seo.description,
      isPartOf: { '@type': 'WebSite', name: 'NEXORA SalonOS', url: `${NEXORA_PUBLIC_ORIGIN}/` },
      about: { '@type': 'SoftwareApplication', name: 'NEXORA SalonOS', applicationCategory: 'BusinessApplication', operatingSystem: 'Web' },
      primaryImageOfPage: { '@type': 'ImageObject', contentUrl: `${NEXORA_PUBLIC_ORIGIN}${seo.ogImagePath}` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'NEXORA SalonOS', item: `${NEXORA_PUBLIC_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: seo.label, item: url },
      ],
    },
  ];
  if (path === '/salon-onboarding') {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: [
        { '@type': 'Question', name: 'Can I create a website for my beauty parlour or salon?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Choose a salon category and a suitable NEXORA website template, then add your salon details, services, images and contact information.' } },
        { '@type': 'Question', name: 'Can I use this for a barber shop or nail studio?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. NEXORA includes different salon business categories and website templates, including hair salons, barber shops, beauty parlours, nail studios and other supported salon types.' } },
        { '@type': 'Question', name: 'Can I preview my website before it goes live?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Review your website design and content, check the desktop and mobile layouts, and make changes before you publish and share it.' } },
      ],
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
