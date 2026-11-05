import React, { useId, useState } from 'react';
import type { ServiceMerchandising, ServiceOfferType } from '../types';
import {
  SERVICE_OFFER_TYPE_LABELS,
  templateBadgeOptions,
  templateDisplayName,
  templateOfferTypeOptions,
} from '../lib/serviceTemplateSetup';

/**
 * Owner-facing template-wise service setup fields.
 *
 * Renders in the order the product team asked for: badges, offer type, offer
 * details (only when an offer is selected), the description slot supplied by the
 * caller and finally Terms & Conditions. All controls are manual-edit friendly;
 * nothing here overwrites a value by itself.
 */
export interface ServiceSetupValues {
  badges: string[];
  offerType: ServiceOfferType;
  offerDetails: string;
  terms: string;
  tags: string[];
}

export interface ServiceSetupFieldsProps {
  templateId?: string;
  values: ServiceSetupValues;
  /** Automatic values prepared for this service; never rendered publicly. */
  suggestedBadges: string[];
  suggestedOfferType: ServiceOfferType;
  suggestedTerms: string;
  suggestedDescription: string;
  needsConfirmation: string[];
  edited: ServiceMerchandising['edited'];
  disabled?: boolean;
  /** Existing description editor (radios or textarea) rendered between offer and terms. */
  descriptionField: React.ReactNode;
  onToggleBadge: (badge: string) => void;
  onOfferType: (type: ServiceOfferType) => void;
  onOfferDetails: (value: string) => void;
  onTerms: (value: string) => void;
  onUseSuggestedTerms: () => void;
  onUseSuggestedDescription: () => void;
  onRegenerate: () => void;
}

const MAX_BADGES = 6;

export function ServiceSetupFields({
  templateId,
  values,
  suggestedBadges,
  suggestedOfferType,
  suggestedTerms,
  suggestedDescription,
  needsConfirmation,
  edited,
  disabled,
  descriptionField,
  onToggleBadge,
  onOfferType,
  onOfferDetails,
  onTerms,
  onUseSuggestedTerms,
  onUseSuggestedDescription,
  onRegenerate,
}: ServiceSetupFieldsProps) {
  const template = templateDisplayName(templateId);
  const badgeOptions = templateBadgeOptions(templateId);
  const offerOptions = templateOfferTypeOptions(templateId);
  const [addingBadge, setAddingBadge] = useState(false);
  const [draftBadge, setDraftBadge] = useState('');
  const badgeId = useId();
  const offerId = useId();

  // Badges saved earlier (or typed by the owner) stay visible even when a
  // template change means they are no longer part of the library.
  const extraBadges = values.badges.filter((badge) => !badgeOptions.includes(badge));
  const missingSuggestions = suggestedBadges.filter((badge) => !values.badges.includes(badge));

  const commitBadge = () => {
    const clean = draftBadge.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (clean && !values.badges.includes(clean) && values.badges.length < MAX_BADGES) onToggleBadge(clean);
    setDraftBadge('');
    setAddingBadge(false);
  };

  return (
    <div className="service-setup" data-template={templateId || ''}>
      <fieldset className="service-setup-badges">
        <legend>Badges</legend>
        <p className="service-setup-note">
          {template} badges only. Nothing is assigned automatically — pick the badges this service really earns.
        </p>
        <div className="service-setup-chips" role="group" aria-label="Service badges">
          {[...badgeOptions, ...extraBadges].map((badge) => {
            const active = values.badges.includes(badge);
            return (
              <button
                key={badge}
                type="button"
                className="service-setup-chip"
                aria-pressed={active}
                disabled={disabled || (!active && values.badges.length >= MAX_BADGES)}
                onClick={() => onToggleBadge(badge)}
              >
                {active ? '✓ ' : '+ '}
                {badge}
              </button>
            );
          })}
        </div>
        {missingSuggestions.length > 0 && (
          <p className="service-setup-suggestion">
            Suggested from this service’s data: {missingSuggestions.join(', ')}.
            {' '}
            <button
              type="button"
              className="service-setup-link"
              disabled={disabled || values.badges.length + missingSuggestions.length > MAX_BADGES}
              onClick={() => missingSuggestions.forEach((badge) => onToggleBadge(badge))}
            >
              Use suggestion
            </button>
          </p>
        )}
        <div className="service-setup-add">
          {addingBadge ? (
            <>
              <label htmlFor={badgeId} className="sr-only">Custom badge</label>
              <input
                id={badgeId}
                type="text"
                maxLength={40}
                value={draftBadge}
                disabled={disabled}
                placeholder="Custom badge (e.g. Studio Pick)"
                onChange={(event) => setDraftBadge(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitBadge();
                  }
                }}
              />
              <button type="button" className="secondary-action" disabled={disabled || !draftBadge.trim()} onClick={commitBadge}>
                Add badge
              </button>
              <button type="button" className="secondary-action" onClick={() => { setAddingBadge(false); setDraftBadge(''); }}>
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="secondary-action"
              disabled={disabled || values.badges.length >= MAX_BADGES}
              onClick={() => setAddingBadge(true)}
            >
              Add custom badge
            </button>
          )}
        </div>
        <small>{values.badges.length}/{MAX_BADGES} badges selected. Select a badge again to remove it.</small>
        {edited.badges && <small className="service-setup-edited">Badges were set by you, so regeneration keeps them.</small>}
      </fieldset>

      <fieldset className="service-setup-offer">
        <legend>Offer type</legend>
        <label htmlFor={offerId}>Offer type
          <select
            id={offerId}
            aria-label="Offer type"
            value={values.offerType}
            disabled={disabled}
            onChange={(event) => onOfferType(event.target.value as ServiceOfferType)}
          >
            {offerOptions.map((type) => (
              <option key={type} value={type}>{SERVICE_OFFER_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </label>
        <small>
          {template} offers only these offer types. Leave it on “No offer” when this service has no live offer — prices are never changed here.
        </small>
        {suggestedOfferType !== 'none' && values.offerType === 'none' && (
          <p className="service-setup-suggestion">
            Suggested from this service’s data: {SERVICE_OFFER_TYPE_LABELS[suggestedOfferType]}.
            {' '}
            <button type="button" className="service-setup-link" disabled={disabled} onClick={() => onOfferType(suggestedOfferType)}>
              Use suggestion
            </button>
          </p>
        )}
        {values.offerType !== 'none' && (
          <label>Offer details
            <textarea
              aria-label="Offer details"
              rows={2}
              maxLength={300}
              value={values.offerDetails}
              disabled={disabled}
              placeholder="e.g. ₹200 off on weekday bookings · valid till 30 Nov"
              onChange={(event) => onOfferDetails(event.target.value)}
            />
            <small>Only write a discount the salon has actually agreed to. Leave blank to show the offer type only.</small>
          </label>
        )}
      </fieldset>

      <div className="service-setup-description">
        <p className="service-setup-note">
          Service description · prepared for {template}.
          {suggestedDescription && (
            <>
              {' '}
              <button type="button" className="service-setup-link" disabled={disabled} onClick={onUseSuggestedDescription}>
                Use template description
              </button>
            </>
          )}
        </p>
        {descriptionField}
      </div>

      <fieldset className="service-setup-terms">
        <legend>Terms &amp; Conditions</legend>
        <label>Terms &amp; Conditions
          <textarea
            aria-label="Terms and conditions"
            rows={6}
            maxLength={4000}
            value={values.terms}
            disabled={disabled}
            placeholder="Booking, cancellation, offer and package conditions for this service."
            onChange={(event) => onTerms(event.target.value)}
          />
        </label>
        <div className="service-setup-actions">
          <button type="button" className="secondary-action" disabled={disabled || !suggestedTerms} onClick={onUseSuggestedTerms}>
            Use template terms
          </button>
          <button type="button" className="secondary-action" disabled={disabled} onClick={onRegenerate}>
            Regenerate suggestions
          </button>
        </div>
        <small>These terms appear on the service card and in the booking summary.</small>
        <small>{values.terms.length}/4000 characters</small>
        {needsConfirmation.length > 0 && (
          <p className="service-setup-warning" role="status">
            Suggested wording — confirm before publishing: {needsConfirmation.join(', ')}. Your salon policies are reused when saved, otherwise this text is a suggestion, not a confirmed policy.
          </p>
        )}
        {needsConfirmation.length === 0 && values.terms && (
          <small className="service-setup-edited">Built from your saved salon policies.</small>
        )}
      </fieldset>
    </div>
  );
}
