import { NEXORA_PUBLIC_ORIGIN } from './publicSeo.js';
import { NEXORA_BREADCRUMB_TRAILS, nexoraBreadcrumbListSchema } from './nexoraBreadcrumbs.js';
import { nexoraOrganizationSchema, nexoraEditorialTeamSchema } from './nexoraOrganization.js';

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
  | '/about'
  | '/salon-onboarding'
  | '/salon-growth'
  | '/growth-partner-rewards'
  | '/partner-rewards';

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
   *
   * The hero headline is rendered word by word (each word sits in its own mask
   * span for the title-demote motion), so it is no longer a contiguous string
   * in the document. Each of these markers is taken from the lead sentence,
   * which is plain text in the same hero and still unique to its route.
   */
  contentMarker: string;
}

export const NEXORA_ECOSYSTEM_SEO: Readonly<Record<NexoraEcosystemPath, NexoraEcosystemSeo>> = {
  '/about': {
    path: '/about', label: 'About NEXORA', title: 'About NEXORA Salon OS',
    description: 'Learn about NEXORA Salon OS, its salon website and business tools, the team behind its product guidance, and verified support contacts.',
    ogImagePath: '/nexora-homepage-og.jpg', ogImageAlt: 'NEXORA Salon OS platform and salon website templates',
    themeColor: '#312347', contentMarker: 'NEXORA Editorial Team',
  },
  '/salon-onboarding': {
    path: '/salon-onboarding',
    label: 'Salon Onboarding',
    title: 'Salon Website Onboarding | NEXORA SalonOS',
    description:
      'Choose a salon template, add branding, services, staff and contact details, then preview and publish your website with NEXORA SalonOS.',
    ogImagePath: '/nexora-homepage-og.jpg',
    ogImageAlt: 'NEXORA SalonOS salon website templates and branding options',
    themeColor: '#312347',
    contentMarker: 'Choose a website design, add your own salon branding',
  },
  '/salon-growth': {
    path: '/salon-growth',
    label: 'Salon Growth',
    title: 'Salon Growth & Retention | NEXORA SalonOS',
    description:
      'Organise salon customer records, booking, recall and reporting with NEXORA SalonOS. Features depend on setup and customer consent.',
    ogImagePath: '/nexora-homepage-og.jpg',
    ogImageAlt: 'NEXORA SalonOS salon customer and booking tools',
    themeColor: '#312347',
    contentMarker: 'Nexora helps salons organise customer relationships',
  },
  '/growth-partner-rewards': {
    path: '/growth-partner-rewards',
    label: 'Growth Partner Rewards',
    title: 'NEXORA Growth Partner Programme',
    description:
      'Explore NEXORA Growth Partner milestones, with qualifying-shop verification, approval and reward fulfilment subject to programme terms.',
    ogImagePath: '/nexora-homepage-og.jpg',
    ogImageAlt: 'NEXORA Growth Partner reward programme',
    themeColor: '#312347',
    contentMarker: 'Salon Onboarding Se',
  },
  '/partner-rewards': {
    path: '/partner-rewards',
    label: 'Partner Rewards & Recognition',
    title: 'NEXORA Partner Rewards | Top Salon Jaipur',
    description: 'Explore NEXORA salon partner rewards, a fixed 90-day Top Salon Jaipur competition, approved participant report cards and owner-controlled public salon profiles.',
    ogImagePath: '/nexora-jaipur-awards/top-salon-jaipur-awards.svg',
    ogImageAlt: 'NEXORA Top Salon Jaipur Awards and Partner Rewards',
    themeColor: '#24172d',
    contentMarker: 'Your Growth Deserves',
  },
};

/** Stable render order, shared by the prerenderer, the sitemap and the tests. */
export const NEXORA_ECOSYSTEM_ROUTES: readonly NexoraEcosystemPath[] = [
  '/about',
  '/salon-onboarding',
  '/salon-growth',
  '/growth-partner-rewards',
  '/partner-rewards',
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
  const about = path === '/about';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      nexoraOrganizationSchema(NEXORA_PUBLIC_ORIGIN),
      ...(about ? [nexoraEditorialTeamSchema(NEXORA_PUBLIC_ORIGIN)] : []),
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
        publisher: { '@id': `${NEXORA_PUBLIC_ORIGIN}/#organization` },
        ...(about ? { author: { '@id': `${NEXORA_PUBLIC_ORIGIN}/about#editorial-team` } } : {}),
      },
      nexoraBreadcrumbListSchema(NEXORA_PUBLIC_ORIGIN, path, NEXORA_BREADCRUMB_TRAILS[path]),
    ],
  };
}
