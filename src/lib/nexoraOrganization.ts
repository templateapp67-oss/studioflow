import { NEXORA_OFFICIAL_WHATSAPP_URL, NEXORA_OFFICIAL_WHATSAPP_NUMBER } from './whatsappContact.js';

/** Verified public identity details only; no unverified address or social profiles. */
export function nexoraOrganizationSchema(origin: string) {
  return {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: 'NEXORA Salon OS',
    url: `${origin}/`,
    description: 'A salon website builder and business-management platform for salons, spas and beauty businesses.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: NEXORA_OFFICIAL_WHATSAPP_NUMBER,
      url: NEXORA_OFFICIAL_WHATSAPP_URL,
    },
  };
}

/** Editorial identity is a team, not an invented individual author or credential. */
export function nexoraEditorialTeamSchema(origin: string) {
  return {
    '@type': 'Organization',
    '@id': `${origin}/about#editorial-team`,
    name: 'NEXORA Editorial Team',
    url: `${origin}/about`,
    description: 'The NEXORA team responsible for reviewing product information, salon setup guidance and published platform documentation.',
  };
}
