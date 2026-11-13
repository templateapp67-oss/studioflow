import { NEXORA_PUBLIC_ORIGIN } from './publicSeo';

/**
 * Public metadata for the three NEXORA SALONOS marketing routes that share the
 * `NexoraEcosystemPage` component (`/salon-onboarding`, `/salon-growth` and
 * `/growth-partner-rewards`).
 *
 * Route separation was added without giving each route its own document, so all
 * three served the homepage shell to crawlers: one title, one description and
 * one canonical for three different pages. This module is the single source of
 * truth for the head of each document. The build-time prerenderer and the
 * client renderer both read it, so the two can never drift apart.
 *
 * Only verifiable facts are described. No ranking, revenue, customer-count or
 * reward-fulfilment promise is made here; the reward milestones stay on the
 * page, which states the programme conditions itself.
 */
export type NexoraEcosystemPath =
  | '/salon-onboarding'
  | '/salon-growth'
  | '/growth-partner-rewards'
  | '/top-salon-jaipur-awards';

export interface NexoraEcosystemSeo {
  path: NexoraEcosystemPath;
  /** Short human label used by the breadcrumb structured data and the nav. */
  label: string;
  title: string;
  description: string;
  /** Absolute path of the shared 1200x630 social card. */
  ogImagePath: string;
  ogImageAlt: string;
  /** Brand surface of the page header, mirrored in the document head. */
  themeColor: string;
  /**
   * Sentence that must be present in the rendered copy of this route and absent
   * from its siblings. The prerenderer fails the build when a document is
   * produced from the wrong route, and the verification suite asserts the same
   * thing against the emitted files.
   */
  contentMarker: string;
}

export const NEXORA_ECOSYSTEM_SEO: Readonly<Record<NexoraEcosystemPath, NexoraEcosystemSeo>> = {
  '/salon-onboarding': {
    path: '/salon-onboarding',
    label: 'Salon Onboarding',
    title: 'Salon Website Onboarding | Build Your Salon Brand with NEXORA SalonOS',
    description:
      'Choose a salon website template, add your own branding, services, staff and contact details, then preview, publish and share your salon website with NEXORA SalonOS.',
    ogImagePath: '/nexora-homepage-og.jpg',
    ogImageAlt: 'NEXORA SalonOS salon website templates and branding options',
    themeColor: '#312347',
    contentMarker: 'Aapke Salon Ki Apni Digital Pehchaan.',
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
  '/top-salon-jaipur-awards': {
    path: '/top-salon-jaipur-awards',
    label: 'Top Salon Jaipur Awards',
    title: 'NEXORA Top Salon Jaipur Awards — 90-Day Salon Competition',
    description: 'Register for NEXORA Top Salon Jaipur Awards, a fixed 90-day salon competition with verified payment performance, participant report cards, public salon profiles by consent and quarterly recognition.',
    ogImagePath: '/nexora-social-preview.png',
    ogImageAlt: 'NEXORA Top Salon Jaipur Awards 90-day competition',
    themeColor: '#28172F',
    contentMarker: 'NEXORA Top Salon Jaipur Awards',
  },
};

/** Stable render order, shared by the prerenderer, the sitemap and the tests. */
export const NEXORA_ECOSYSTEM_ROUTES: readonly NexoraEcosystemPath[] = [
  '/salon-onboarding',
  '/salon-growth',
  '/growth-partner-rewards',
  '/top-salon-jaipur-awards',
];

/** Absolute canonical URL for one of the shared marketing routes. */
export function nexoraEcosystemCanonicalUrl(path: NexoraEcosystemPath): string {
  return `${NEXORA_PUBLIC_ORIGIN}${NEXORA_ECOSYSTEM_SEO[path].path}`;
}

/**
 * Structured data for one marketing route: the page itself plus the breadcrumb
 * every one of these pages renders. No rating, review, address or offer is
 * published, because none of it is verified on these routes.
 */
export function nexoraEcosystemSchema(path: NexoraEcosystemPath) {
  const seo = NEXORA_ECOSYSTEM_SEO[path];
  const url = nexoraEcosystemCanonicalUrl(path);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: seo.title,
        description: seo.description,
        isPartOf: {
          '@type': 'WebSite',
          name: 'NEXORA SalonOS',
          url: `${NEXORA_PUBLIC_ORIGIN}/`,
        },
        about: {
          '@type': 'SoftwareApplication',
          name: 'NEXORA SalonOS',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
        },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          contentUrl: `${NEXORA_PUBLIC_ORIGIN}${seo.ogImagePath}`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'NEXORA SalonOS',
            item: `${NEXORA_PUBLIC_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: seo.label,
            item: url,
          },
        ],
      },
    ],
  };
}
