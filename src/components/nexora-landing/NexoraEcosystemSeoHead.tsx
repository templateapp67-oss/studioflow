import { useEffect } from 'react';
import { NEXORA_PUBLIC_ORIGIN } from '../../lib/publicSeo';
import {
  NEXORA_ECOSYSTEM_SEO,
  nexoraEcosystemSchema,
  type NexoraEcosystemPath,
} from '../../lib/nexoraEcosystemSeo';

/**
 * Applies the owning route's public metadata after client boot.
 *
 * The build-time prerenderer writes exactly these values into the document head
 * of `dist/<route>/index.html`, so crawlers already receive them. This component
 * keeps the same route ownership in the development server (which does not
 * prerender) and on any client-side entry, so a shared link and a fresh load can
 * never disagree about the title, description or canonical.
 *
 * It renders nothing and is intentionally side-effect only.
 */
export function NexoraEcosystemSeoHead({ path }: { path: NexoraEcosystemPath }) {
  useEffect(() => {
    const seo = NEXORA_ECOSYSTEM_SEO[path];
    if (!seo) return;
    const canonicalUrl = `${NEXORA_PUBLIC_ORIGIN}${seo.path}`;
    const ogImage = `${NEXORA_PUBLIC_ORIGIN}${seo.ogImagePath}`;

    document.title = seo.title;

    const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute(attribute, key);
        document.head.appendChild(node);
      }
      node.setAttribute('content', content);
    };

    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', 'index,follow');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'NEXORA SALONOS');
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', seo.ogImageAlt);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', ogImage);
    upsertMeta('name', 'twitter:image:alt', seo.ogImageAlt);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const schemaId = 'nexora-ecosystem-jsonld';
    let schema = document.getElementById(schemaId) as HTMLScriptElement | null;
    if (!schema) {
      schema = document.createElement('script');
      schema.id = schemaId;
      schema.type = 'application/ld+json';
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify(nexoraEcosystemSchema(path));
  }, [path]);

  return null;
}
