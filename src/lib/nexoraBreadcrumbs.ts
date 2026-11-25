export interface NexoraBreadcrumbItem {
  label: string;
  /** Omitted only for the current page. */
  href?: string;
}

const HOME_LINK = { label: 'Home', href: '/' } as const;
const SALON_OS_LINK = { label: 'Salon OS', href: '/salon-os' } as const;

/**
 * Public marketing ancestry is explicit and stable; it never depends on the
 * visitor's referrer or browser history. Every trail ends with the current
 * page, which deliberately has no href.
 */
export const NEXORA_BREADCRUMB_TRAILS = {
  '/': [{ label: 'Home' }],
  '/about': [HOME_LINK, { label: 'About NEXORA' }],
  '/salon-os': [HOME_LINK, { label: 'Salon OS' }],
  '/pricing': [HOME_LINK, SALON_OS_LINK, { label: 'Pricing' }],
  '/privacy': [HOME_LINK, { label: 'Privacy notice' }],
  '/salon-onboarding': [HOME_LINK, SALON_OS_LINK, { label: 'Salon Onboarding' }],
  '/salon-growth': [HOME_LINK, SALON_OS_LINK, { label: 'Salon Growth' }],
  '/growth-partner-rewards': [HOME_LINK, SALON_OS_LINK, { label: 'Growth Partner Rewards' }],
  '/partner-rewards': [HOME_LINK, { label: 'Partner Rewards & Recognition' }],
} as const satisfies Record<string, readonly NexoraBreadcrumbItem[]>;

/** Return the reviewed hierarchy for a NEXORA public route, if one exists. */
export function nexoraBreadcrumbsForPath(pathname: string): readonly NexoraBreadcrumbItem[] | undefined {
  const route = (pathname.split(/[?#]/, 1)[0] || '/').replace(/\/+$/, '') || '/';
  return NEXORA_BREADCRUMB_TRAILS[route as keyof typeof NEXORA_BREADCRUMB_TRAILS];
}

/**
 * Public template previews sit below the template library and its catalogue
 * category. Both ancestors link to the corresponding section of the homepage.
 */
export function nexoraTemplateBreadcrumbs(categoryName: string, pageName: string): NexoraBreadcrumbItem[] {
  return [
    HOME_LINK,
    { label: 'Salon templates', href: '/#nexora-template-library' },
    { label: categoryName, href: '/#salon-categories' },
    { label: pageName },
  ];
}

/** Schema.org BreadcrumbList for routes that already publish JSON-LD. */
export function nexoraBreadcrumbListSchema(
  origin: string,
  path: string,
  breadcrumbs: readonly NexoraBreadcrumbItem[],
) {
  const siteOrigin = origin.replace(/\/+$/, '');
  const pagePath = path.startsWith('/') ? path : `/${path}`;
  const pageUrl = new URL(pagePath, `${siteOrigin}/`).toString();

  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: crumb.href ? new URL(crumb.href, `${siteOrigin}/`).toString() : pageUrl,
    })),
  };
}
