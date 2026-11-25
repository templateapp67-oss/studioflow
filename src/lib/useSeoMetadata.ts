import { buildStorefrontBusinessSchema, buildStorefrontCanonicalUrl } from './storefrontSeo.js';
import { useEffect, useState } from 'react';
import type { SalonProfile } from '../types';
import {
  applyNoIndexMetadata,
  clearRouteJsonLd,
  hasNoIndexPathPrefix,
  hasNoIndexQueryParams,
  setCanonicalLink,
  setRobotsMeta,
} from './publicSeo';

export function generateSeoDefaults(profile: Partial<SalonProfile>) {
  const rawName = String(profile.businessName || '').trim();
  const isZiyaTemplate = profile.businessType === 'hair_salon';
  const businessName =
    isZiyaTemplate && (!rawName || /miraki|luxury editorial salon/i.test(rawName))
      ? 'Ziya Women’s Hair Studio'
      : rawName || 'Salon & Wellness Studio';
  const city = profile.city || '';
  const typeLabel = isZiyaTemplate
    ? 'Women’s Haircut Specialist Salon'
    : (profile.businessType || 'salon').replace(/_/g, ' ');
  const tagline = profile.tagline || profile.about || 'Book your appointment online for premium beauty, hair, and grooming services.';
  const citySuffix = city ? ` in ${city}` : '';

  const metaTitle = `${businessName} – ${isZiyaTemplate ? typeLabel : `Premium ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`}${citySuffix}`;
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
  const search = browserLocation?.search || '';

  const prevTitle = document.title;
  document.title = metaTitle;

  // When an app/session query key (?app=, ?owner=, ?panel=, ?create=, ...)
  // accompanies ?site=<slug>, or on a private path prefix, noindex always takes
  // precedence over storefront SEO.
  if (hasNoIndexPathPrefix(pagePath) || hasNoIndexQueryParams(search)) {
    applyNoIndexMetadata(metaTitle);
    return () => {
      document.title = prevTitle;
    };
  }

  let siteSlug = '';
  try {
    const params = new URLSearchParams(search);
    siteSlug = (params.get('site') || params.get('s') || params.get('subdomain') || '').trim().toLowerCase();
  } catch {
    // A malformed query string falls back to the current public pathname.
  }
  const canonicalProfile = {
    ...profile,
    seo: {
      ...seo,
      canonicalUrl: seo.canonicalUrl || canonicalUrlOverride,
    },
  };
  const canonicalUrl = buildStorefrontCanonicalUrl({
    profile: canonicalProfile,
    origin: hostOrigin,
    pathname: pagePath || '/',
    slug: siteSlug,
    viaQuery: Boolean(siteSlug),
  });

  const setMeta = (nameAttr: 'name' | 'property', nameValue: string, contentValue: string) => {
    let el = document.querySelector(`meta[${nameAttr}="${nameValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(nameAttr, nameValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', contentValue);
  };

  // Standard Meta Tags — always restore single index,follow & canonical after SPA navigation.
  setRobotsMeta('index,follow');
  setMeta('name', 'description', metaDescription);
  if (keywords) {
    setMeta('name', 'keywords', keywords);
  }
  setCanonicalLink(canonicalUrl);

  // OpenGraph Social Share Meta
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:title', ogTitle);
  setMeta('property', 'og:description', ogDescription);
  if (ogImageUrl) {
    setMeta('property', 'og:image', ogImageUrl);
    setMeta('property', 'og:image:alt', `${profile.businessName || 'Salon'} website preview`);
  }
  setMeta('property', 'og:site_name', profile.businessName || 'NEXORA');
  setMeta('property', 'og:url', canonicalUrl);

  // Twitter / X Cards
  setMeta('name', 'twitter:card', twitterCard);
  setMeta('name', 'twitter:title', ogTitle);
  setMeta('name', 'twitter:description', ogDescription);
  if (ogImageUrl) {
    setMeta('name', 'twitter:image', ogImageUrl);
    setMeta('name', 'twitter:image:alt', `${profile.businessName || 'Salon'} website preview`);
  }

  // Schema.org Structured Data (JSON-LD)
  clearRouteJsonLd('studioflow-seo-jsonld');
  let scriptEl = document.getElementById('studioflow-seo-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'studioflow-seo-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  let existingSchema: Record<string, any> = {};
  try {
    const parsed = JSON.parse(scriptEl.textContent || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      existingSchema = parsed as Record<string, any>;
    }
  } catch {
    // A malformed previous value is replaced by the safe generic schema below.
  }
  const jsonLdData = {
    ...existingSchema,
    // Share the exact server-side business schema rules with client navigation.
    ...buildStorefrontBusinessSchema(profile, canonicalUrl, metaDescription, ogImageUrl),
    // Keep verified service offers rendered by the server when hydration runs.
    ...(existingSchema.hasOfferCatalog ? { hasOfferCatalog: existingSchema.hasOfferCatalog } : {}),
  };

  scriptEl.textContent = JSON.stringify(jsonLdData, null, 2);

  return () => {
    document.title = prevTitle;
  };
}

export function useSeoMetadata(profile: SalonProfile, canonicalUrlOverride?: string, enabled = true) {
  const [locationKey, setLocationKey] = useState(() =>
    typeof window !== 'undefined' && window.location
      ? `${window.location.pathname || ''}|${window.location.search || ''}`
      : '',
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const syncLocation = () => {
      setLocationKey(`${window.location.pathname || ''}|${window.location.search || ''}`);
    };
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const cleanup = applySeoMetadata(profile, canonicalUrlOverride);
    return cleanup;
  }, [profile, canonicalUrlOverride, enabled, locationKey]);
}
