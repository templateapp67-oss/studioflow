import React from 'react';
import type {SalonService} from '../types';
import {
  SERVICE_OFFER_TYPE_SHORT,
  serviceBadgesForDisplay,
  serviceOfferForDisplay,
  serviceOfferTypeForDisplay,
  serviceTermsForDisplay,
} from '../lib/serviceTemplateSetup';

/**
 * Public, template-neutral service merchandising.
 *
 * Every component renders **nothing** when the owner has not saved the matching
 * value, so a template's layout, spacing and visual identity stay exactly as
 * they are until the owner confirms template badges, an offer or terms.
 * Styling lives in `index.css` (`.sf-merch-*`) and inherits the template accent.
 */
type ServicePick = Pick<SalonService, 'merchandising'>;

export function ServiceBadges({service, className = ''}: {service: ServicePick; className?: string}) {
  const badges = serviceBadgesForDisplay(service);
  if (!badges.length) return null;
  return (
    <div className={`sf-merch-badges${className ? ` ${className}` : ''}`} role="group" aria-label="Service highlights">
      {badges.map((badge) => (
        <span className="sf-merch-badge" key={badge}>{badge}</span>
      ))}
    </div>
  );
}

export function ServiceOfferNote({service, className = ''}: {service: ServicePick; className?: string}) {
  const offer = serviceOfferForDisplay(service);
  if (!offer) return null;
  return (
    <p className={`sf-merch-offer${className ? ` ${className}` : ''}`}>
      <span className="sf-merch-offer-label">{SERVICE_OFFER_TYPE_SHORT[serviceOfferTypeForDisplay(service)]}</span>
      <span>{offer.label}</span>
    </p>
  );
}

export function ServiceTerms({service, className = '', label = 'Terms & Conditions'}: {service: ServicePick; className?: string; label?: string}) {
  const terms = serviceTermsForDisplay(service);
  if (!terms) return null;
  return (
    <details className={`sf-merch-terms${className ? ` ${className}` : ''}`}>
      <summary>{label}</summary>
      <p>{terms}</p>
    </details>
  );
}

/** Badges + offer line in one block (renders nothing when both are empty). */
export function ServiceMerchTags({service, className = '', inline = false}: {service: ServicePick; className?: string; inline?: boolean}) {
  const badges = serviceBadgesForDisplay(service);
  const offer = serviceOfferForDisplay(service);
  if (!badges.length && !offer) return null;
  if (inline) {
    // Compact phrasing-only variant for cards whose root element is a button.
    return (
      <span className={`sf-merch sf-merch-inline-tags${className ? ` ${className}` : ''}`}>
        {badges.map((badge) => <span className="sf-merch-badge" key={badge}>{badge}</span>)}
        {offer && <span className="sf-merch-offer"><span className="sf-merch-offer-label">{SERVICE_OFFER_TYPE_SHORT[serviceOfferTypeForDisplay(service)]}</span>{offer.label}</span>}
      </span>
    );
  }
  return (
    <div className={`sf-merch${className ? ` ${className}` : ''}`}>
      {badges.length > 0 && (
        <div className="sf-merch-badges" role="group" aria-label="Service highlights">
          {badges.map((badge) => (
            <span className="sf-merch-badge" key={badge}>{badge}</span>
          ))}
        </div>
      )}
      {offer && (
        <p className="sf-merch-offer">
          <span className="sf-merch-offer-label">{SERVICE_OFFER_TYPE_SHORT[serviceOfferTypeForDisplay(service)]}</span>
          <span>{offer.label}</span>
        </p>
      )}
    </div>
  );
}

/** Badges, offer and terms together — used by the service detail views. */
export function ServiceMerchandising({service, showTerms = true}: {service: ServicePick; showTerms?: boolean}) {
  const hasTags = serviceBadgesForDisplay(service).length > 0 || !!serviceOfferForDisplay(service);
  if (!hasTags && !(showTerms && serviceTermsForDisplay(service))) return null;
  return (
    <div className="sf-merch-block">
      <ServiceMerchTags service={service} />
      {showTerms && <ServiceTerms service={service} />}
    </div>
  );
}
