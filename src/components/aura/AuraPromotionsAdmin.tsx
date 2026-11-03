/**
 * TEMPLATE 03 — Aura Unisex Salon & Wellness Lounge
 * Dashboard · Promotions & Offers management.
 *
 * Add, edit, save, cancel, delete (with confirmation), activate, deactivate,
 * preview and approve every offer. All records live in Supabase
 * (`public.salon_promotions`), so the salon admin never edits source code.
 * After each mutation the customer website refetches the latest rows.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  Copy,
  Eye,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { SalonProfile, SalonService } from '../../types';
import {
  AURA_DEMO_COUPONS,
  auraDateStamp,
  auraDiscountLabel,
  auraFormatDate,
  auraMoney,
  auraOfferStatus,
  auraSafeImageUrl,
  deleteAuraOffer,
  emptyAuraOffer,
  fetchAuraAdminOffers,
  restoreAuraDemoOffers,
  saveAuraOffer,
  toggleAuraOffer,
  approveAuraDemoOffer,
  validateAuraOffer,
  type AuraAdminOffers,
  type AuraPromotion,
  type AuraServiceOption,
} from '../../lib/auraPromotions';
import { uploadSalonImage } from '../../lib/supabase';
import { AuraPromotionCards } from './AuraPromotionCards';
import './auraPromotions.css';

export interface AuraPromotionsAdminProps {
  profile: SalonProfile;
  services: SalonService[];
  /** Test seam; production uses the configured browser client. */
  client?: any;
  onChanged?: () => void;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const asServices = (services: SalonService[]): AuraServiceOption[] =>
  services.map((service) => ({
    id: service.id,
    name: service.name,
    price: Number(service.price || 0),
    category: service.category,
  }));

export const AuraPromotionsAdmin: React.FC<AuraPromotionsAdminProps> = ({ profile, services, client, onChanged }) => {
  const [state, setState] = useState<AuraAdminOffers>({ offers: [], services: asServices(services), redemptions: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AuraPromotion | null>(null);
  const [validation, setValidation] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewOffer, setPreviewOffer] = useState<AuraPromotion | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuraAdminOffers(client);
      setState({
        ...data,
        services: data.services.length ? data.services : asServices(services),
      });
      setError('');
    } catch (cause) {
      // Keep the dashboard usable with a local, unsaved view if Supabase is unreachable.
      setState({ offers: [], services: asServices(services), redemptions: [] });
      setError((cause as Error)?.message || 'Offers could not be loaded. Check the Supabase connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [client, services]);

  useEffect(() => { void load(); }, [load]);

  const afterMutation = useCallback(async (message: string) => {
    setNotice(message);
    setError('');
    await load(); // Data comes back from Supabase: saved after refresh.
    onChanged?.();
  }, [load, onChanged]);

  const patch = (key: keyof AuraPromotion, value: unknown) =>
    setDraft((previous) => (previous ? { ...previous, [key]: value } as AuraPromotion : previous));

  const openCreate = () => {
    setValidation([]);
    setNotice('');
    setDraft(emptyAuraOffer(Date.now(), state.offers.length));
    setEditingId('new');
  };

  const openEdit = (offer: AuraPromotion) => {
    setValidation([]);
    setNotice('');
    setDraft(clone(offer));
    setEditingId(offer.id);
  };

  const cancel = () => {
    setDraft(null);
    setEditingId(null);
    setValidation([]);
  };

  const save = async () => {
    if (!draft) return;
    const issues = validateAuraOffer(draft);
    setValidation(issues);
    if (issues.length) return;
    setBusy(true);
    try {
      await saveAuraOffer(draft, client);
      cancel();
      await afterMutation('Offer saved to Supabase. The customer website now uses the latest data.');
    } catch (cause) {
      setError((cause as Error)?.message || 'Offer could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const runToggle = async (offer: AuraPromotion, next: boolean) => {
    setBusy(true);
    try {
      await toggleAuraOffer(offer.id, next, client);
      await afterMutation(next ? 'Offer activated on the customer website.' : 'Offer deactivated on the customer website.');
    } catch (cause) {
      setError((cause as Error)?.message || 'Offer status could not be changed.');
    } finally {
      setBusy(false);
    }
  };

  const runApprove = async (offer: AuraPromotion) => {
    setBusy(true);
    try {
      await approveAuraDemoOffer(offer.id, client);
      await afterMutation('Demo offer approved. The Demo Offer label is removed.');
    } catch (cause) {
      setError((cause as Error)?.message || 'Demo offer could not be approved.');
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    if (!confirmDeleteId) return;
    setBusy(true);
    try {
      await deleteAuraOffer(confirmDeleteId, client);
      setConfirmDeleteId(null);
      if (editingId === confirmDeleteId) cancel();
      await afterMutation('Offer deleted. Redemption history is kept for your records.');
    } catch (cause) {
      setError((cause as Error)?.message || 'Offer could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async () => {
    setBusy(true);
    try {
      await restoreAuraDemoOffers(client);
      await afterMutation('Sample demo offers restored. Existing edited offers were not overwritten.');
    } catch (cause) {
      setError((cause as Error)?.message || 'Sample offers could not be restored.');
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (file: File) => {
    try {
      const url = await uploadSalonImage(file);
      patch('bannerImageUrl', url);
      setNotice('Offer image uploaded. Save the offer to publish it.');
    } catch (cause) {
      setError((cause as Error)?.message || 'Image upload failed.');
    }
  };

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); } catch { /* Clipboard can be blocked; the code stays visible. */ }
    setCopiedCode(code);
    setNotice(`Coupon ${code} copied.`);
    if (typeof window !== 'undefined') window.setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 2600);
  };

  const serviceOptions = state.services.length ? state.services : asServices(services);
  const activeCount = useMemo(() => state.offers.filter((offer) => auraOfferStatus(offer) === 'active').length, [state.offers]);
  const demoCount = useMemo(() => state.offers.filter((offer) => offer.isDemo).length, [state.offers]);
  const deleteTarget = state.offers.find((offer) => offer.id === confirmDeleteId) || null;

  const form = draft && (
    <div className="aura-adm-form" data-aura-form={editingId === 'new' ? 'new' : 'edit'}>
      <h4>{editingId === 'new' ? 'Add New Offer' : `Edit offer · ${draft.title || draft.couponCode}`}</h4>
      <div className="aura-adm-grid">
        <label className="aura-adm-field">
          <span>Offer title *</span>
          <input aria-label="Offer title" value={draft.title} onChange={(event) => patch('title', event.target.value)} placeholder="e.g. Weekend Glow Offer" maxLength={140} />
        </label>
        <label className="aura-adm-field">
          <span>Coupon code *</span>
          <input aria-label="Coupon code" value={draft.couponCode} onChange={(event) => patch('couponCode', event.target.value.toUpperCase())} placeholder="AURA10" maxLength={32} />
        </label>
        <label className="aura-adm-field wide">
          <span>Short description</span>
          <textarea aria-label="Offer description" value={draft.description} onChange={(event) => patch('description', event.target.value)} placeholder="Tell guests what this offer includes." maxLength={600} />
        </label>
        <label className="aura-adm-field">
          <span>Discount type *</span>
          <select aria-label="Discount type" value={draft.discountType} onChange={(event) => patch('discountType', event.target.value)}>
            <option value="percentage">Percentage (%)</option>
            <option value="flat">Flat amount (₹)</option>
          </select>
        </label>
        <label className="aura-adm-field">
          <span>Discount value *</span>
          <input aria-label="Discount value" type="number" min="0" step="0.01" value={draft.discountValue} onChange={(event) => patch('discountValue', event.target.value)} />
        </label>
        <label className="aura-adm-field">
          <span>Minimum booking amount (₹)</span>
          <input aria-label="Minimum booking amount" type="number" min="0" step="1" value={draft.minBookingAmount} onChange={(event) => patch('minBookingAmount', event.target.value)} />
        </label>
        <label className="aura-adm-field">
          <span>Start date</span>
          <input aria-label="Start date" type="date" value={draft.startsAt} onChange={(event) => patch('startsAt', event.target.value)} />
        </label>
        <label className="aura-adm-field">
          <span>Expiry date</span>
          <input aria-label="Expiry date" type="date" value={draft.endsAt} onChange={(event) => patch('endsAt', event.target.value)} />
        </label>
        <label className="aura-adm-field">
          <span>Usage limit (blank = unlimited)</span>
          <input aria-label="Usage limit" type="number" min="1" step="1" value={draft.maxTotalUses ?? ''} onChange={(event) => patch('maxTotalUses', event.target.value === '' ? null : Number(event.target.value))} />
        </label>
        <label className="aura-adm-field">
          <span>Per-customer usage limit</span>
          <input aria-label="Per-customer usage limit" type="number" min="1" step="1" value={draft.maxUsesPerCustomer} onChange={(event) => patch('maxUsesPerCustomer', event.target.value)} />
        </label>
        <label className="aura-adm-field">
          <span>Display order</span>
          <input aria-label="Display order" type="number" step="1" value={draft.displayOrder} onChange={(event) => patch('displayOrder', event.target.value)} />
        </label>
        <label className="aura-adm-field wide">
          <span>Offer image</span>
          <input aria-label="Offer image URL" value={draft.bannerImageUrl} onChange={(event) => patch('bannerImageUrl', event.target.value)} placeholder="https://… or /templates/aura-unisex/…" />
          <small><ImageIcon size={12} aria-hidden="true" /> Paste an https URL / site path, or upload a JPG, PNG or WebP (max 5 MB).</small>
          <input aria-label="Upload offer image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ''; }} />
          {auraSafeImageUrl(draft.bannerImageUrl) && <img className="aura-adm-image-preview" src={auraSafeImageUrl(draft.bannerImageUrl)} alt="Offer preview" />}
        </label>
        <label className="aura-adm-field wide">
          <span>Terms and conditions</span>
          <textarea aria-label="Terms and conditions" value={draft.termsConditions} onChange={(event) => patch('termsConditions', event.target.value)} maxLength={1000} />
        </label>
        <div className="aura-adm-field wide">
          <span>Applicable existing services <small>(leave all unchecked to allow every existing service)</small></span>
          <div className="aura-adm-services" aria-label="Applicable existing services">
            {serviceOptions.map((service) => (
              <label className="aura-adm-check" key={service.id}>
                <input
                  type="checkbox"
                  aria-label={`Apply to ${service.name}`}
                  checked={draft.applicableServiceIds.includes(service.id)}
                  onChange={(event) => {
                    const ids = new Set(draft.applicableServiceIds);
                    if (event.target.checked) ids.add(service.id); else ids.delete(service.id);
                    patch('applicableServiceIds', Array.from(ids));
                  }}
                />
                <span>{service.name} · {auraMoney(service.price)}</span>
              </label>
            ))}
            {!serviceOptions.length && <small>No services found. Add services in the Services step first.</small>}
          </div>
        </div>
        <div className="aura-adm-field wide">
          <label className="aura-adm-check">
            <input aria-label="Active status" type="checkbox" checked={draft.isActive} onChange={(event) => patch('isActive', event.target.checked)} />
            <span>Active — show this offer on the customer website within its valid dates</span>
          </label>
          {draft.isDemo && (
            <label className="aura-adm-check">
              <input aria-label="Approve demo offer" type="checkbox" checked={Boolean(draft.demoApproved)} onChange={(event) => patch('demoApproved', event.target.checked)} />
              <span>Approve this sample offer (removes the Demo Offer label)</span>
            </label>
          )}
        </div>
      </div>
      {validation.length > 0 && (
        <div className="aura-adm-notice error" role="alert">
          <strong>Please fix these fields:</strong>
          <ul>{validation.map((issue) => <li key={issue}>{issue}</li>)}</ul>
        </div>
      )}
      <div className="aura-adm-form-actions">
        <button type="button" className="aura-adm-btn primary" data-action="save-offer" disabled={busy} onClick={() => void save()}>
          <Save size={14} aria-hidden="true" /> Save Offer
        </button>
        <button type="button" className="aura-adm-btn" data-action="cancel-edit" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <section className="aura-offers-admin" aria-label="Aura promotions and offers management" data-template-id="unisex_salon">
      <div className="aura-adm-head">
        <div>
          <p className="aura-adm-eyebrow">Template 03 · {profile.businessName || 'Aura Unisex Salon & Wellness Lounge'}</p>
          <h2>Promotions &amp; Offers</h2>
          <p>
            Add or edit offers here — they are saved to Supabase and appear on the customer website without any source-code change.
            Sample offers keep a <strong>Demo Offer</strong> label until you approve them. Coupon discounts are always calculated on the server at booking checkout.
          </p>
        </div>
        <div className="aura-adm-head-actions">
          <button type="button" className="aura-adm-btn primary" data-action="add-new-offer" onClick={openCreate}>
            <Plus size={15} aria-hidden="true" /> Add New Offer
          </button>
          <button type="button" className="aura-adm-btn" data-action="refresh-offers" disabled={loading} onClick={() => void load()}>
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
          <button type="button" className="aura-adm-btn" data-action="restore-demos" disabled={busy} onClick={() => void runRestore()}>
            <RotateCcw size={14} aria-hidden="true" /> Restore sample offers
          </button>
        </div>
      </div>

      <div className="aura-adm-body">
        {loading && <p className="aura-adm-notice info" role="status">Loading offers from Supabase…</p>}
        {!loading && notice && <p className="aura-adm-notice ok" role="status">{notice}</p>}
        {error && <p className="aura-adm-notice error" role="alert">{error}</p>}
        <div className="aura-adm-summary">
          <span className="aura-adm-chip">{state.offers.length} offers saved</span>
          <span className="aura-adm-chip">{activeCount} active now</span>
          <span className="aura-adm-chip">{demoCount} demo offers</span>
          <span className="aura-adm-chip">{state.redemptions.length} confirmed redemptions</span>
        </div>

        {editingId === 'new' && form}

        {state.offers.length === 0 && !loading && (
          <p className="aura-adm-notice info">No offers yet. Use “Add New Offer” or “Restore sample offers” to get started.</p>
        )}

        <div className="aura-adm-list">
          {state.offers.map((offer) => {
            const status = auraOfferStatus(offer);
            const isEditing = editingId === offer.id;
            const serviceNames = serviceOptions
              .filter((service) => offer.applicableServiceIds.includes(service.id))
              .map((service) => service.name);
            return (
              <article
                className={`aura-adm-card${offer.isActive ? '' : ' is-inactive'}`}
                key={offer.id}
                data-aura-offer-id={offer.id}
                data-aura-offer-code={offer.couponCode}
              >
                <div className="aura-adm-card-top">
                  <div>
                    <h3>{offer.title}</h3>
                    <p>{offer.description || 'No short description yet.'}</p>
                    <div className="aura-adm-pills">
                      <span className="aura-adm-pill">{auraDiscountLabel(offer)}</span>
                      <span className="aura-adm-pill">{offer.couponCode}</span>
                      {offer.isDemo && <span className="aura-adm-pill demo">Demo Offer</span>}
                      <span className={`aura-adm-pill${offer.isActive ? '' : ' off'}`}>{status}</span>
                    </div>
                  </div>
                  <button type="button" className="aura-adm-btn small" data-action="copy-code" onClick={() => void copyCode(offer.couponCode)}>
                    {copiedCode === offer.couponCode ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    {copiedCode === offer.couponCode ? 'Copied' : 'Copy code'}
                  </button>
                </div>

                <dl className="aura-adm-facts">
                  <div><dt>Starts</dt><dd><CalendarDays size={12} aria-hidden="true" /> {auraFormatDate(offer.startsAt)}</dd></div>
                  <div><dt>Expires</dt><dd><CalendarDays size={12} aria-hidden="true" /> {auraFormatDate(offer.endsAt)}</dd></div>
                  <div><dt>Minimum booking</dt><dd>{auraMoney(offer.minBookingAmount)}</dd></div>
                  <div><dt>Usage limit</dt><dd>{offer.maxTotalUses ? `${offer.usedCount || 0} / ${offer.maxTotalUses}` : `${offer.usedCount || 0} / unlimited`}</dd></div>
                  <div><dt>Per customer</dt><dd>{offer.maxUsesPerCustomer}</dd></div>
                  <div><dt>Display order</dt><dd>{offer.displayOrder}</dd></div>
                  <div><dt>Existing services</dt><dd>{serviceNames.length ? serviceNames.slice(0, 3).join(', ') + (serviceNames.length > 3 ? ` +${serviceNames.length - 3}` : '') : 'All existing services'}</dd></div>
                  <div><dt>Offer image</dt><dd>{offer.bannerImageUrl ? 'Set' : 'Not set'}</dd></div>
                </dl>
                {offer.termsConditions && <p><strong>Terms:</strong> {offer.termsConditions}</p>}

                <div className="aura-adm-actions">
                  <button type="button" className="aura-adm-btn small" data-action="edit-offer" disabled={busy || Boolean(editingId)} onClick={() => openEdit(offer)}>
                    <Pencil size={13} aria-hidden="true" /> Edit
                  </button>
                  <button type="button" className="aura-adm-btn small primary" data-action="save-offer" disabled={busy || !isEditing} onClick={() => void save()}>
                    <Save size={13} aria-hidden="true" /> Save
                  </button>
                  <button type="button" className="aura-adm-btn small" data-action="cancel-edit" disabled={!isEditing} onClick={cancel}>
                    <X size={13} aria-hidden="true" /> Cancel
                  </button>
                  <button type="button" className="aura-adm-btn small" data-action="activate-offer" disabled={busy || offer.isActive} onClick={() => void runToggle(offer, true)}>
                    <Check size={13} aria-hidden="true" /> Activate
                  </button>
                  <button type="button" className="aura-adm-btn small" data-action="deactivate-offer" disabled={busy || !offer.isActive} onClick={() => void runToggle(offer, false)}>
                    <X size={13} aria-hidden="true" /> Deactivate
                  </button>
                  <button type="button" className="aura-adm-btn small" data-action="preview-offer" onClick={() => setPreviewOffer(offer)}>
                    <Eye size={13} aria-hidden="true" /> Preview
                  </button>
                  {offer.isDemo && (
                    <button type="button" className="aura-adm-btn small" data-action="approve-demo" disabled={busy} onClick={() => void runApprove(offer)}>
                      <Check size={13} aria-hidden="true" /> Approve Demo
                    </button>
                  )}
                  <button type="button" className="aura-adm-btn small danger" data-action="delete-offer" disabled={busy} onClick={() => setConfirmDeleteId(offer.id)}>
                    <Trash2 size={13} aria-hidden="true" /> Delete
                  </button>
                </div>

                {isEditing && form}
              </article>
            );
          })}
        </div>

        {state.redemptions.length > 0 && (
          <div className="aura-adm-redemptions">
            <h3>Confirmed coupon redemptions</h3>
            <table className="aura-adm-table">
              <thead><tr><th>Coupon</th><th>Booking</th><th>Original</th><th>Discount</th><th>Final payable</th><th>Status</th></tr></thead>
              <tbody>
                {state.redemptions.map((row: any) => (
                  <tr key={String(row.id)}>
                    <td>{String(row.couponCode)}</td>
                    <td>{String(row.bookingId || '').slice(0, 8)}</td>
                    <td>{auraMoney(Number(row.originalAmount))}</td>
                    <td>−{auraMoney(Number(row.discountAmount))}</td>
                    <td>{auraMoney(Number(row.finalAmount))}</td>
                    <td>{String(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="aura-adm-modal-backdrop" role="presentation">
          <div className="aura-adm-modal aura-adm-confirm" role="dialog" aria-modal="true" aria-label="Confirm offer deletion" data-confirm-delete="true">
            <div className="aura-adm-modal-head"><h3>Delete this offer?</h3></div>
            <p>
              “{deleteTarget?.title || 'This offer'}” ({deleteTarget?.couponCode || 'coupon'}) will be removed from the customer website.
              Past confirmed redemptions are kept for your records. This action cannot be undone.
            </p>
            <div className="aura-adm-form-actions">
              <button type="button" className="aura-adm-btn danger" data-action="confirm-delete" disabled={busy} onClick={() => void runDelete()}>
                <Trash2 size={14} aria-hidden="true" /> Yes, delete offer
              </button>
              <button type="button" className="aura-adm-btn" data-action="keep-offer" onClick={() => setConfirmDeleteId(null)}>Keep offer</button>
            </div>
          </div>
        </div>
      )}

      {previewOffer && (
        <div className="aura-adm-modal-backdrop" role="presentation">
          <div className="aura-adm-modal" role="dialog" aria-modal="true" aria-label="Customer website offer preview" data-preview-offer="true">
            <div className="aura-adm-modal-head">
              <h3>Customer website preview · {previewOffer.title}</h3>
              <button type="button" className="aura-adm-btn small" data-action="close-preview" onClick={() => setPreviewOffer(null)}>
                <X size={13} aria-hidden="true" /> Close
              </button>
            </div>
            <div className="au-site">
              <AuraPromotionCards
                offers={[previewOffer]}
                services={services}
                readOnly
              />
            </div>
            <p className="aura-adm-notice info" style={{ marginTop: 14 }}>
              This is exactly how the card looks on the Aura website. Copy Coupon and Book Now are disabled in preview.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default AuraPromotionsAdmin;
