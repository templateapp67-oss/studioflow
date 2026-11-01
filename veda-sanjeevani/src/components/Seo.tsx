import { Helmet } from 'react-helmet-async';
import { safeExternalUrl } from '../lib/format';
import { useSite } from '../hooks/useSite';
import type { Service } from '../types';

export function Seo({ title, description, path = '/', noindex = false, service, image }: { title?: string; description?: string | undefined; path?: string; noindex?: boolean; service?: Service; image?: string | null | undefined }) {
  const { site, env } = useSite();
  const name = site.settings.business_name;
  const pageTitle = title ? `${title} | ${name}` : site.settings.seo.title ?? name;
  const desc = description ?? site.settings.seo.description ?? site.settings.tagline;
  const origin = env.VITE_SITE_URL.replace(/\/$/, '');
  const canonical = origin + (path === '/' ? '/' : path.replace(/\/$/, ''));
  const imageUrl = image?.startsWith('/') ? new URL(image, origin).href : safeExternalUrl(image) ?? new URL('/images/sanctuary-1600.webp', origin).href;
  const localBusiness = { '@context': 'https://schema.org', '@type': 'HealthAndBeautyBusiness', name, description: desc, url: origin, image: imageUrl, address: { '@type': 'PostalAddress', streetAddress: site.settings.address, addressLocality: site.settings.city, addressCountry: 'IN' }, ...(site.settings.email ? { email: site.settings.email } : {}), ...(site.settings.phone ? { telephone: site.settings.phone } : {}) };
  const serviceLd = service ? { '@context': 'https://schema.org', '@type': 'Service', name: service.name, description: service.short_desc, serviceType: 'Ayurvedic wellness spa', provider: { '@type': 'HealthAndBeautyBusiness', name, url: origin }, areaServed: site.settings.city, url: canonical, offers: { '@type': 'Offer', price: service.price, priceCurrency: 'INR' } } : null;
  return <Helmet><html lang="en" /><title>{pageTitle}</title><meta name="description" content={desc} /><link rel="canonical" href={canonical} /><meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} /><meta property="og:type" content={service ? 'service' : 'website'} /><meta property="og:title" content={pageTitle} /><meta property="og:description" content={desc} /><meta property="og:url" content={canonical} /><meta property="og:image" content={imageUrl} /><meta property="og:site_name" content={name} /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={pageTitle} /><meta name="twitter:description" content={desc} /><meta name="twitter:image" content={imageUrl} /><script type="application/ld+json">{JSON.stringify(serviceLd ?? localBusiness).replace(/</g, '\\u003c')}</script></Helmet>;
}
