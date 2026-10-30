import React, { useState } from 'react';
import { ArrowUpRight, BadgePercent, Check, Copy, Tag } from 'lucide-react';
import type { SalonService } from '../../types';
import {
  prismOfferValueLabel,
  prismOfferWindowLabel,
  type PrismOffer,
} from '../../lib/prismSite';
import { PrismEmptyState, PrismSectionError, PrismSectionSkeleton } from './LiveStates';

export function PrismOffersLive({
  offers,
  loading,
  error,
  retrying = false,
  onRetry,
  services,
  onBookService,
}: {
  offers: PrismOffer[];
  loading?: boolean;
  error?: string;
  retrying?: boolean;
  onRetry?: () => void;
  services: SalonService[];
  onBookService: (serviceId?: string) => void;
}) {
  const [copied, setCopied] = useState('');
  const copy = async (code: string) => {
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((current) => (current === code ? '' : current)), 2200);
    } catch {
      setCopied('');
    }
  };

  return (
    <>
      {loading && <div className="mt-6"><PrismSectionSkeleton label="Current offers" lines={2} /></div>}
      {!loading && error && <div className="mt-6"><PrismSectionError message={error} onRetry={onRetry} retrying={retrying} /></div>}
      {!loading && !error && offers.length === 0 && (
        <div className="mt-6">
          <PrismEmptyState title="No colour offers running right now">
            New seasonal offers are published here the moment the studio activates them. Join the colour list below to hear first.
          </PrismEmptyState>
        </div>
      )}
      {!loading && !error && offers.length > 0 && (
        <div className="pc-offer-grid mt-7">
          {offers.map((offer) => {
            const service = offer.serviceId ? services.find((item) => item.id === offer.serviceId) : undefined;
            return (
              <article key={offer.id} className="pc-offer-card pc-glass pc-glass-hover">
                <div className="pc-offer-head">
                  <span className="pc-offer-value">
                    <BadgePercent size={14} aria-hidden="true" /> {prismOfferValueLabel(offer)}
                  </span>
                  <span className="pc-chip">{prismOfferWindowLabel(offer)}</span>
                </div>
                <h3 className="text-lg font-bold leading-snug">{offer.title}</h3>
                {offer.description && <p className="pc-muted text-sm leading-relaxed">{offer.description}</p>}
                {offer.code && (
                  <button
                    type="button"
                    className="pc-offer-code"
                    onClick={() => void copy(offer.code)}
                    aria-label={`Copy offer code ${offer.code}`}
                  >
                    <Tag size={13} aria-hidden="true" />
                    <span>{offer.code}</span>
                    {copied === offer.code ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    <small>{copied === offer.code ? 'Copied' : 'Copy code'}</small>
                  </button>
                )}
                <div className="pc-offer-actions">
                  {service ? (
                    <button type="button" className="pc-btn pc-btn-gradient px-4 py-2.5 text-sm" onClick={() => onBookService(service.id)}>
                      Book {service.name} <ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  ) : (
                    <a href="#pc-contact" className="pc-btn pc-btn-gradient px-4 py-2.5 text-sm">
                      Ask about this offer <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  )}
                  <span className="pc-muted text-[11px] font-semibold">Mention the code at booking. Cannot be clubbed with another offer.</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
