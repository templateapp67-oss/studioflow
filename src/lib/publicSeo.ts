/** Canonical public production origin already used by NEXORA account and customer links. */
export const NEXORA_PUBLIC_ORIGIN = 'https://nexora-one-white-label.templateapp67.chatgpt.site';
export const NEXORA_HOME_OG_IMAGE = `${NEXORA_PUBLIC_ORIGIN}/nexora-homepage-og.jpg`;

export const NEXORA_HOME_SEO = {
  title: 'NEXORA Salon OS – Launch Your Salon Website in 30 Minutes',
  description: 'Create your salon website in 30 minutes with NEXORA Salon OS. Choose from 16 salon templates, customise your design and launch your professional salon website easily.',
  ogTitle: 'NEXORA Salon OS – Launch Your Salon Website in 30 Minutes',
  ogDescription: 'Create your salon website in 30 minutes with NEXORA Salon OS. Choose from 16 salon templates, customise your design and launch your professional salon website easily.',
  twitterTitle: 'NEXORA Salon OS – Launch Your Salon Website in 30 Minutes',
  twitterDescription: 'Create your salon website with 16 ready-made templates. Customise and launch easily with NEXORA Salon OS.',
  canonicalUrl: `${NEXORA_PUBLIC_ORIGIN}/`,
} as const;

export const NEXORA_LOGIN_SEO = {
  title: 'NEXORA Salon OS — Sign in',
  description: 'Sign in to NEXORA to keep your website, team and business data with your account across devices.',
  ogTitle: 'NEXORA Salon OS — Sign in',
  ogDescription: 'Sign in to NEXORA to keep your website, team and business data with your account across devices.',
  twitterTitle: 'NEXORA Salon OS — Sign in',
  twitterDescription: 'Sign in to NEXORA to keep your website, team and business data with your account across devices.',
  canonicalUrl: `${NEXORA_PUBLIC_ORIGIN}/login`,
} as const;

export type PublicSeoPage = typeof NEXORA_HOME_SEO | typeof NEXORA_LOGIN_SEO;

/** Applies route-owned public metadata without deriving canonical URLs from preview hosts. */
export function applyPublicSeoMetadata(page: PublicSeoPage) {
  if (typeof document === 'undefined' || !document.head) return;
  document.title = page.title;

  const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
    let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', page.canonicalUrl);

  setMeta('name', 'description', page.description);
  setMeta('name', 'robots', 'index,follow');
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', 'NEXORA Salon OS');
  setMeta('property', 'og:title', page.ogTitle);
  setMeta('property', 'og:description', page.ogDescription);
  setMeta('property', 'og:url', page.canonicalUrl);
  setMeta('property', 'og:image', NEXORA_HOME_OG_IMAGE);
  setMeta('property', 'og:image:width', '1200');
  setMeta('property', 'og:image:height', '630');
  setMeta('property', 'og:image:alt', 'NEXORA Salon OS salon website template preview');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', page.twitterTitle);
  setMeta('name', 'twitter:description', page.twitterDescription);
  setMeta('name', 'twitter:image', NEXORA_HOME_OG_IMAGE);
  setMeta('name', 'twitter:image:alt', 'NEXORA Salon OS salon website template preview');

  // Published salon pages own this schema. It must not leak back into owner routes.
  document.getElementById('studioflow-seo-jsonld')?.remove();
}
