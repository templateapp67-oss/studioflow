import { PRICING_FAQS, PRICING_PLANS } from './nexoraPricing';
import { NEXORA_BREADCRUMB_TRAILS, nexoraBreadcrumbListSchema } from './nexoraBreadcrumbs';
import { nexoraOrganizationSchema } from './nexoraOrganization';

/**
 * Public metadata for the complete NEXORA SALONOS landing page published at
 * `/pricing`. It is shared by the client renderer and the prerenderer so the
 * two never drift apart. Only verifiable facts are described.
 */
export const NEXORA_PRICING_SEO = {
  title: 'NEXORA SalonOS | Pricing & Features',
  description:
    'Explore NEXORA SalonOS plans and tools for salon appointments, customers, billing, staff, inventory and marketing, with annual pricing in INR.',
  canonicalPath: '/pricing',
  ogImagePath: '/nexora-homepage-og.jpg',
  themeColor: '#FF2323',
} as const;

/**
 * Structured data for the landing page. The price range comes from the
 * approved annual totals, and the FAQ entries mirror the visible questions.
 * No rating, review count or address is published.
 */
export function nexoraPricingSchema(origin: string) {
  const totals = PRICING_PLANS.map((plan) => plan.annualTotal);
  const canonicalUrl = `${origin}${NEXORA_PRICING_SEO.canonicalPath}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      nexoraOrganizationSchema(origin),
      {
        '@type': 'SoftwareApplication',
        name: 'NEXORA SALONOS',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: canonicalUrl,
        description: NEXORA_PRICING_SEO.description,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'INR',
          lowPrice: String(Math.min(...totals)),
          highPrice: String(Math.max(...totals)),
          offerCount: totals.length,
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: PRICING_FAQS.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
      nexoraBreadcrumbListSchema(
        origin,
        NEXORA_PRICING_SEO.canonicalPath,
        NEXORA_BREADCRUMB_TRAILS[NEXORA_PRICING_SEO.canonicalPath],
      ),
    ],
  };
}
