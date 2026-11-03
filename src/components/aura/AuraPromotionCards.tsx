/**
 * TEMPLATE 03 — customer-side Promotions & Offers cards.
 *
 * Every field comes from a Supabase `salon_promotions` row (or its offline
 * preview mirror). Seeded sample offers keep a clear "Demo Offer" label until
 * the salon admin approves them in the dashboard.
 */
import React from 'react';
import { Copy, CalendarDays, Check, Tag, Ticket } from 'lucide-react';
import type { SalonService } from '../../types';
import {
  auraDiscountLabel,
  auraFormatDate,
  auraMoney,
  auraSafeImageUrl,
  type AuraPromotion,
} from '../../lib/auraPromotions';
import './auraPromotions.css';

export interface AuraPromotionCardsProps {
  offers: AuraPromotion[];
  services: SalonService[];
  copiedCode?: string | null;
  onCopy?: (code: string) => void;
  onBook?: (offer: AuraPromotion, service?: SalonService) => void;
  /** Preview mode disables actions (used by the admin preview dialog). */
  readOnly?: boolean;
}

export const AuraPromotionCards: React.FC<AuraPromotionCardsProps> = ({
  offers,
  services,
  copiedCode,
  onCopy,
  onBook,
  readOnly = false,
}) => {
  const resolveService = (offer: AuraPromotion): SalonService | undefined => {
    const ids = new Set(offer.applicableServiceIds || []);
    return services.find((service) => ids.has(service.id)) || services[0];
  };

  return (
    <div className="aura-promo-grid">
      {offers.map((offer) => {
        const image = auraSafeImageUrl(offer.bannerImageUrl);
        const service = resolveService(offer);
        return (
          <article
            className="au-offer-voucher"
            key={offer.id}
            data-aura-offer={offer.couponCode}
            data-aura-demo={offer.isDemo ? 'true' : 'false'}
          >
            {image && (
              <div className="aura-promo-media">
                <img src={image} alt={`${offer.title} offer`} loading="lazy" />
              </div>
            )}
            <div className="au-offer-top">
              <span className="au-offer-badge">{auraDiscountLabel(offer)}</span>
              <span className="au-offer-audience">{offer.isDemo ? 'Sample offer' : 'Salon offer'}</span>
            </div>
            {offer.isDemo && (
              <p className="aura-promo-demo-label" data-demo-offer="true">
                <Tag size={12} aria-hidden="true" /> Demo Offer
              </p>
            )}
            <h3>{offer.title}</h3>
            <p className="aura-promo-description">{offer.description}</p>
            <p className="aura-promo-discount">
              <strong>{auraDiscountLabel(offer)}</strong>
              <span>with code {offer.couponCode}</span>
            </p>
            <dl className="aura-promo-dates">
              <div>
                <dt><CalendarDays size={13} aria-hidden="true" /> Starts</dt>
                <dd>{auraFormatDate(offer.startsAt)}</dd>
              </div>
              <div>
                <dt><CalendarDays size={13} aria-hidden="true" /> Expires</dt>
                <dd>{auraFormatDate(offer.endsAt)}</dd>
              </div>
            </dl>
            {offer.minBookingAmount > 0 && (
              <p className="aura-promo-minimum">Minimum booking {auraMoney(offer.minBookingAmount)}</p>
            )}
            {offer.termsConditions && (
              <details className="aura-promo-terms">
                <summary>Terms and conditions</summary>
                <p>{offer.termsConditions}</p>
              </details>
            )}
            <div className="au-offer-perforation" aria-hidden="true" />
            <div className="au-offer-bottom">
              <div className="au-offer-code-wrap">
                <button
                  type="button"
                  className="au-code-chip"
                  aria-label={`Copy Coupon ${offer.couponCode}`}
                  data-action="copy-coupon"
                  disabled={readOnly}
                  onClick={() => onCopy?.(offer.couponCode)}
                >
                  {copiedCode === offer.couponCode ? <Check size={13} aria-hidden="true" /> : <Ticket size={13} aria-hidden="true" />}
                  <span>{copiedCode === offer.couponCode ? `Copied ${offer.couponCode}` : offer.couponCode}</span>
                  <Copy size={13} aria-hidden="true" />
                </button>
                <small className="au-offer-validity">Use this code at booking checkout</small>
              </div>
              <button
                type="button"
                className="au-btn au-btn-primary au-btn-sm"
                data-action="book-now"
                disabled={readOnly}
                onClick={() => onBook?.(offer, service)}
              >
                Book Now
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default AuraPromotionCards;
