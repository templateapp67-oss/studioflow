import { PRICING_FAQS, PRICING_PLANS } from './nexoraPricing';

/**
 * Public metadata for the complete NEXORA SALONOS landing page published at
 * `/pricing`. It is shared by the client renderer and the prerenderer so the
 * two never drift apart. Only verifiable facts are described.
 */
export const NEXORA_PRICING_SEO = {
  title: 'NEXORA SalonOS | Salon Management Software, Pricing & Features',
  description:
    'Explore NEXORA SalonOS: salon appointment, customer, billing, staff, inventory and marketing tools, with clear annual pricing for Lite, Grow, Standard and Premium plans.',
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
    ],
  };
}
