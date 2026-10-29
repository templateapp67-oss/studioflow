import { useEffect } from 'react';
import type { SalonProfile } from '../types';

export function generateSeoDefaults(profile: Partial<SalonProfile>) {
  const businessName = profile.businessName || 'Salon & Wellness Studio';
  const city = profile.city || '';
  const typeLabel = (profile.businessType || 'salon').replace(/_/g, ' ');
  const tagline = profile.tagline || profile.about || 'Book your appointment online for premium beauty, hair, and grooming services.';
  const citySuffix = city ? ` in ${city}` : '';

  const metaTitle = `${businessName} – Premium ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}${citySuffix}`;
  const metaDescription = `${tagline.slice(0, 120)}. Book online instantly at ${businessName}${citySuffix} with top expert stylists and therapists.`;
  const ogTitle = `${businessName}${citySuffix} | Official Website`;
  const ogDescription = tagline.length > 150 ? `${tagline.slice(0, 147)}...` : tagline;
  const ogImageUrl = profile.coverImageUrl || profile.logoUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80';
  const keywords = [
    businessName.toLowerCase(),
    `${typeLabel} near me`,
    `${typeLabel} ${city}`.trim(),
    'salon booking',
    'beauty treatment',
    'hair stylist',
    'appointment booking',
  ].filter(Boolean).join(', ');

  return {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
    ogImageUrl,
    keywords,
    twitterCard: 'summary_large_image' as const,
  };
}

export function applySeoMetadata(profile: SalonProfile, canonicalUrlOverride?: string) {
  // Non-DOM environments (SSR, unit harnesses) have nothing to update.
  if (
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function' ||
    typeof document.getElementById !== 'function' ||
    typeof document.querySelector !== 'function' ||
    !document.head
  )
    return () => {};

  const seo = profile.seo || {};
  const defaults = generateSeoDefaults(profile);

  const metaTitle = seo.metaTitle || defaults.metaTitle;
  const metaDescription = seo.metaDescription || defaults.metaDescription;
  const ogTitle = seo.ogTitle || seo.metaTitle || defaults.ogTitle;
  const ogDescription = seo.ogDescription || seo.metaDescription || defaults.ogDescription;
  const ogImageUrl = seo.ogImageUrl || profile.coverImageUrl || profile.logoUrl || defaults.ogImageUrl;
  const keywords = seo.keywords || defaults.keywords;
  const twitterCard = seo.twitterCard || 'summary_large_image';

  const browserLocation =
    typeof window !== 'undefined' && window.location && typeof window.location === 'object' ? window.location : null;
  const hostOrigin = browserLocation?.origin || 'https://studioflow.app';
  const pagePath = browserLocation?.pathname || '';
  const canonicalUrl = canonicalUrlOverride || seo.canonicalUrl || `${hostOrigin}${pagePath}`;

  const prevTitle = document.title;
  document.title = metaTitle;

  const setMeta = (nameAttr: 'name' | 'property', nameValue: string, contentValue: string) => {
    let el = document.querySelector(`meta[${nameAttr}="${nameValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(nameAttr, nameValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', contentValue);
  };

  const setLink = (rel: string, href: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  // Standard Meta Tags
  setMeta('name', 'description', metaDescription);
  if (keywords) {
    setMeta('name', 'keywords', keywords);
  }
  setLink('canonical', canonicalUrl);

  // OpenGraph Social Share Meta
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:title', ogTitle);
  setMeta('property', 'og:description', ogDescription);
  if (ogImageUrl) {
    setMeta('property', 'og:image', ogImageUrl);
  }
  setMeta('property', 'og:site_name', profile.businessName || 'StudioFlow');
  setMeta('property', 'og:url', canonicalUrl);

  // Twitter / X Cards
  setMeta('name', 'twitter:card', twitterCard);
  setMeta('name', 'twitter:title', ogTitle);
  setMeta('name', 'twitter:description', ogDescription);
  if (ogImageUrl) {
    setMeta('name', 'twitter:image', ogImageUrl);
  }

  // Schema.org Structured Data (JSON-LD)
  let scriptEl = document.getElementById('studioflow-seo-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'studioflow-seo-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: profile.businessName || 'Salon Website',
    description: metaDescription,
    url: canonicalUrl,
    telephone: profile.phone || '',
    image: ogImageUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: profile.address || '',
      addressLocality: profile.city || '',
      postalCode: profile.postalCode || '',
      addressCountry: 'IN',
    },
    priceRange: '₹₹',
  };

  scriptEl.textContent = JSON.stringify(jsonLdData, null, 2);

  return () => {
    document.title = prevTitle;
  };
}

export function useSeoMetadata(profile: SalonProfile, canonicalUrlOverride?: string) {
  useEffect(() => {
    const cleanup = applySeoMetadata(profile, canonicalUrlOverride);
    return cleanup;
  }, [profile, canonicalUrlOverride]);
}
