import React, { useMemo, useState } from 'react';
import { ChevronDown, Plus, Star } from 'lucide-react';

import { formatInr, formatDateIN, newId, sanitizeText } from '../../../lib/archFlutterCustomizer';
import { formatOfferWindow, offerDiscountLabel } from '../../../lib/salonOffers';
import type { ArchFlutterCategory, ArchFlutterPackage, SalonOffer, SalonOfferType, SalonService } from '../../../types';
import {
  AddButton,
  Card,
  DeleteButton,
  EmptyNote,
  Field,
  ImageField,
  MoveButtons,
  Notice,
  NumberField,
  SelectField,
  TextArea,
  TextField,
  Toggle,
} from '../CustomizerFields';
import { IssueList, PanelHead, issueFor, issuesForTab, type TabProps } from './shared';

const SERVICE_ICONS = ['auto_awesome', 'visibility', 'face_retouching_natural', 'brush', 'spa', 'healing', 'stars', 'content_cut'];

/* ------------------------------------------------------------------ *
 * 5 · Categories & services
 * ------------------------------------------------------------------ */

export function MenuTab({ config, update, issues }: TabProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const services = config.services || [];
  const categories = config.categories || [];

  const setCategories = (next: ArchFlutterCategory[]) => update((draft) => ({ ...draft, categories: next }));
  const setServices = (next: SalonService[]) => update((draft) => ({ ...draft, services: next }));
  const setPackages = (next: ArchFlutterPackage[]) => update((draft) => ({ ...draft, packages: next }));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return services.filter((service) => {
      if (categoryFilter !== 'all' && service.category !== categoryFilter) return false;
      if (!needle) return true;
      return `${service.name} ${service.description}`.toLowerCase().includes(needle);
    });
  }, [services, query, categoryFilter]);

  const categoryOptions = useMemo(
    () => [{ value: 'all', label: `All categories (${services.length} services)` }, ...categories.map((category) => ({ value: category.name, label: category.name }))],
    [categories, services.length],
  );

  return (
    <div className="afc-panel">
      <PanelHead title="Categories & services">
        Your bento categories and the full ₹ menu. Prices show in Indian Rupees with Indian formatting, for example{' '}
        {formatInr(1499)}.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'menu')} />

      <Card
        title={`Categories (${categories.length})`}
        chips={<span className="afc-chip" data-tone="gold">Bento grid</span>}
        actions={
          <AddButton
            label="Add category"
            onClick={() =>
              setCategories([
                ...categories,
                { id: newId('af-cat'), name: 'New category', blurb: 'Describe what you do here.', imageUrl: '', featured: false },
              ])
            }
          />
        }
      >
        <p className="afc-hint" style={{ margin: 0 }}>
          The category name must match the category chosen on each service, otherwise the service will not show on the
          website.
        </p>
        <div className="afc-list">
          {categories.map((category, index) => {
            const count = services.filter((service) => service.category === category.name).length;
            return (
              <details className="afc-list-item" key={category.id}>
                <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <ChevronDown size={15} aria-hidden="true" />
                  <b>{category.name || 'Untitled category'}</b>
                  <span className="afc-chip">{count} services</span>
                  {category.featured && <span className="afc-chip" data-tone="gold">Large tile</span>}
                </summary>
                <div className="afc-grid">
                  <TextField
                    label="Category name"
                    value={category.name}
                    onChange={(name) =>
                      setCategories(categories.map((entry, i) => (i === index ? { ...entry, name: sanitizeText(name, 40) } : entry)))
                    }
                    error={issueFor(issues, 'menu', 'categories')}
                    maxLength={40}
                  />
                  <TextArea
                    label="Short blurb"
                    value={category.blurb}
                    onChange={(blurb) => setCategories(categories.map((entry, i) => (i === index ? { ...entry, blurb } : entry)))}
                    rows={2}
                    maxLength={160}
                  />
                </div>
                <ImageField
                  label="Category photo"
                  value={category.imageUrl}
                  onChange={(imageUrl) => setCategories(categories.map((entry, i) => (i === index ? { ...entry, imageUrl } : entry)))}
                  sampleSlot="categories"
                  shape="arch"
                />
                <div className="afc-row-actions">
                  <Toggle
                    label="Show as a large tile"
                    checked={Boolean(category.featured)}
                    onChange={(featured) => setCategories(categories.map((entry, i) => (i === index ? { ...entry, featured } : entry)))}
                    hint="Large tiles get more space on the home bento grid."
                  />
                  <MoveButtons index={index} total={categories.length} label={category.name} onMove={(to) => setCategories(moveInList(categories, index, to))} />
                  <DeleteButton
                    label={`category ${category.name}`}
                    onDelete={() => setCategories(categories.filter((_, i) => i !== index))}
                  />
                </div>
              </details>
            );
          })}
        </div>
      </Card>

      <Card
        title={`Services (${services.length})`}
        chips={<span className="afc-chip">{filtered.length} shown</span>}
        actions={
          <AddButton
            label="Add service"
            onClick={() =>
              setServices([
                ...services,
                {
                  id: newId('af-svc'),
                  name: 'New service',
                  category: categories[0]?.name || 'Lash Extensions',
                  durationMinutes: 60,
                  price: 999,
                  description: 'Describe what the client gets.',
                  icon: 'auto_awesome',
                  origin: 'custom',
                  popular: false,
                },
              ])
            }
          />
        }
      >
        <div className="afc-grid">
          <TextField label="Search services" value={query} onChange={setQuery} placeholder="Try “lash lift”" wide={false} />
          <SelectField label="Filter by category" value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
        </div>
        {filtered.length === 0 ? (
          <EmptyNote>No services match that search. Try another word, or add a new service.</EmptyNote>
        ) : (
          <div className="afc-list">
            {filtered.map((service) => {
              const index = services.findIndex((entry) => entry.id === service.id);
              const patch = (changes: Partial<SalonService>) =>
                setServices(services.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <details className="afc-list-item" key={service.id}>
                  <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ChevronDown size={15} aria-hidden="true" />
                    <b>{service.name || 'Untitled service'}</b>
                    <span className="afc-chip" data-tone="gold">{formatInr(service.price ?? 0)}</span>
                    <span className="afc-chip">{service.durationMinutes} min</span>
                    <span className="afc-chip">{service.category}</span>
                    {service.popular && (
                      <span className="afc-chip" data-tone="gold">
                        <Star size={11} aria-hidden="true" /> Popular
                      </span>
                    )}
                  </summary>
                  <div className="afc-grid">
                    <TextField label="Service name" value={service.name} onChange={(name) => patch({ name: sanitizeText(name, 80) })} maxLength={80} />
                    <SelectField
                      label="Category"
                      value={service.category}
                      options={categories.map((category) => ({ value: category.name, label: category.name }))}
                      onChange={(category) => patch({ category })}
                    />
                    <NumberField label="Price (₹)" value={service.price ?? 0} onChange={(price) => patch({ price })} prefix="₹" min={0} max={10_000_000} />
                    <NumberField label="Duration (minutes)" value={service.durationMinutes} onChange={(durationMinutes) => patch({ durationMinutes })} min={1} max={720} />
                    <SelectField
                      label="Icon"
                      value={service.icon}
                      options={SERVICE_ICONS.map((icon) => ({ value: icon, label: icon }))}
                      onChange={(icon) => patch({ icon })}
                    />
                  </div>
                  <TextArea label="Description" value={service.description} onChange={(description) => patch({ description })} rows={2} maxLength={300} wide />
                  <ImageField
                    label="Service photo"
                    value={service.imageUrl || ''}
                    onChange={(imageUrl) => patch({ imageUrl })}
                    sampleSlot="categories"
                    shape="arch"
                    hint="Optional — the template artwork is used when this is empty."
                  />
                  <div className="afc-row-actions">
                    <Toggle label="Mark as popular" checked={Boolean(service.popular)} onChange={(popular) => patch({ popular })} hint="Popular services get a gold badge on the menu." />
                    <Toggle label="Show duration on the website" checked={service.showDuration !== false} onChange={(showDuration) => patch({ showDuration })} />
                    <MoveButtons index={index} total={services.length} label={service.name} onMove={(to) => setServices(moveInList(services, index, to))} />
                    <DeleteButton label={`service ${service.name}`} onDelete={() => setServices(services.filter((_, i) => i !== index))} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        title={`Signature packages (${(config.packages || []).length})`}
        actions={
          <AddButton
            label="Add package"
            onClick={() =>
              setPackages([
                ...(config.packages || []),
                { id: newId('af-pkg'), tier: 'Signature', name: 'New package', price: 2999, durationMinutes: 120, includes: ['Add what is included'], note: '' },
              ])
            }
          />
        }
      >
        {(config.packages || []).length === 0 ? (
          <EmptyNote>No packages yet. Packages are bundles like “Bridal brow & lash ritual”.</EmptyNote>
        ) : (
          <div className="afc-list">
            {(config.packages || []).map((pkg, index) => {
              const patch = (changes: Partial<ArchFlutterPackage>) =>
                setPackages((config.packages || []).map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <details className="afc-list-item" key={pkg.id}>
                  <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ChevronDown size={15} aria-hidden="true" />
                    <b>{pkg.name}</b>
                    <span className="afc-chip" data-tone="gold">{formatInr(pkg.price)}</span>
                    <span className="afc-chip">{pkg.tier}</span>
                  </summary>
                  <div className="afc-grid">
                    <TextField label="Package name" value={pkg.name} onChange={(name) => patch({ name: sanitizeText(name, 60) })} maxLength={60} />
                    <TextField label="Tier label" value={pkg.tier} onChange={(tier) => patch({ tier: sanitizeText(tier, 30) })} hint="Example: Signature, Bridal, Everyday" maxLength={30} />
                    <NumberField label="Package price (₹)" value={pkg.price} onChange={(price) => patch({ price })} prefix="₹" min={0} />
                    <NumberField label="Duration (minutes)" value={pkg.durationMinutes} onChange={(durationMinutes) => patch({ durationMinutes })} min={1} max={720} />
                  </div>
                  <TextArea
                    label="What is included (one line each)"
                    value={(pkg.includes || []).join('\n')}
                    onChange={(value) => patch({ includes: value.split('\n').map((line) => line.trim()).filter(Boolean) })}
                    rows={4}
                    wide
                  />
                  <TextField label="Small note" value={pkg.note || ''} onChange={(note) => patch({ note })} hint="Example: Best booked 2 weeks before the wedding." maxLength={160} wide />
                  <ImageField label="Package photo" value={pkg.imageUrl || ''} onChange={(imageUrl) => patch({ imageUrl })} sampleSlot="offers" shape="arch" />
                  <div className="afc-row-actions">
                    <Toggle label="Highlight this package" checked={Boolean(pkg.highlight)} onChange={(highlight) => patch({ highlight })} />
                    <MoveButtons index={index} total={(config.packages || []).length} label={pkg.name} onMove={(to) => setPackages(moveInList(config.packages || [], index, to))} />
                    <DeleteButton label={`package ${pkg.name}`} onDelete={() => setPackages((config.packages || []).filter((_, i) => i !== index))} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 6 · Promotions & offers
 * ------------------------------------------------------------------ */

const OFFER_TYPES: Array<{ value: SalonOfferType; label: string }> = [
  { value: 'percent', label: 'Percentage off (e.g. 20% off)' },
  { value: 'flat', label: 'Flat ₹ off (e.g. ₹500 off)' },
  { value: 'combo', label: 'Combo price (save a fixed ₹ amount)' },
  { value: 'free_addon', label: 'Free add-on worth ₹' },
];

export function OffersTab({ config, update, issues }: TabProps) {
  const offers = config.offers || [];
  const services = config.services || [];
  const [serviceQuery, setServiceQuery] = useState<Record<string, string>>({});
  const setOffers = (next: SalonOffer[]) => update((draft) => ({ ...draft, offers: next }));

  return (
    <div className="afc-panel">
      <PanelHead title="Promotions & offers">
        Six sample offers come with the template. Edit them, hide them, or add your own — expired offers are hidden from
        the public website automatically but stay here for you.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'offers')} />

      <Card
        title={`Offers (${offers.length})`}
        chips={<span className="afc-chip">{offers.filter((offer) => offer.isActive).length} live</span>}
        actions={
          <AddButton
            label="Add offer"
            onClick={() =>
              setOffers([
                ...offers,
                {
                  id: newId('af-offer'),
                  title: 'New offer',
                  description: 'Tell clients what they get.',
                  image: '',
                  badge: 'New',
                  offerType: 'percent',
                  discountValue: 10,
                  originalPriceINR: 1999,
                  offerPriceINR: 1799,
                  applicableServices: [],
                  couponCode: '',
                  validFrom: '',
                  validTo: '',
                  terms: 'One offer per client. Cannot be combined with other offers.',
                  isActive: false,
                  isDemo: false,
                },
              ])
            }
          />
        }
      >
        {offers.length === 0 ? (
          <EmptyNote>No offers yet. Add one, or use “Reset to sample offers” to bring back the template's six examples.</EmptyNote>
        ) : (
          <div className="afc-list">
            {offers.map((offer, index) => {
              const patch = (changes: Partial<SalonOffer>) => setOffers(offers.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              const matched = services.filter((service) =>
                (serviceQuery[offer.id] || '').trim()
                  ? service.name.toLowerCase().includes((serviceQuery[offer.id] || '').trim().toLowerCase())
                  : false,
              );
              return (
                <details className="afc-list-item" key={offer.id} open={index === 0}>
                  <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ChevronDown size={15} aria-hidden="true" />
                    <b>{offer.title}</b>
                    <span className="afc-chip" data-tone="gold">{offerDiscountLabel(offer)}</span>
                    {offer.isActive ? <span className="afc-chip">Live on website</span> : <span className="afc-chip" data-tone="warn">Hidden</span>}
                    {offer.isDemo && <span className="afc-chip">Sample offer</span>}
                  </summary>

                  <div className="afc-grid">
                    <TextField label="Offer title" value={offer.title} onChange={(title) => patch({ title: sanitizeText(title, 80) })} error={issueFor(issues, 'offers', 'offers')} maxLength={80} />
                    <TextField
                      label="Badge"
                      value={offer.badge}
                      onChange={(badge) => patch({ badge: sanitizeText(badge, 24) })}
                      hint="Short label on the card, e.g. Festive"
                      maxLength={24}
                    />
                    <SelectField label="Offer type" value={offer.offerType} options={OFFER_TYPES} onChange={(offerType) => patch({ offerType })} />
                    <NumberField
                      label={offer.offerType === 'percent' ? 'Discount (%)' : offer.offerType === 'combo' ? 'Saving (₹)' : 'Worth (₹)'}
                      value={offer.discountValue}
                      onChange={(discountValue) => patch({ discountValue })}
                      prefix={offer.offerType === 'percent' ? '%' : '₹'}
                      min={0}
                      max={offer.offerType === 'percent' ? 100 : 10_000_000}
                    />
                    <NumberField label="Original price (₹)" value={offer.originalPriceINR} onChange={(originalPriceINR) => patch({ originalPriceINR })} prefix="₹" min={0} />
                    <NumberField label="Offer price (₹)" value={offer.offerPriceINR} onChange={(offerPriceINR) => patch({ offerPriceINR })} prefix="₹" min={0} />
                    <TextField
                      label="Coupon code"
                      value={offer.couponCode}
                      onChange={(couponCode) => patch({ couponCode: couponCode.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                      hint="3–32 capital letters, numbers or hyphens. Leave blank for no code."
                      maxLength={32}
                    />
                    <TextField label="Valid from" value={offer.validFrom} onChange={(validFrom) => patch({ validFrom })} type="date" />
                    <TextField label="Valid till" value={offer.validTo} onChange={(validTo) => patch({ validTo })} type="date" hint="Blank means the offer keeps running." />
                  </div>

                  <TextArea label="Description" value={offer.description} onChange={(description) => patch({ description })} rows={2} maxLength={300} wide />
                  <TextArea label="Terms & conditions" value={offer.terms} onChange={(terms) => patch({ terms })} rows={2} maxLength={400} wide />
                  <ImageField label="Offer image" value={offer.image} onChange={(image) => patch({ image })} sampleSlot="offers" shape="arch" hint="Leave blank to use the template artwork." />

                  <Field label="Applies to" hint="No services selected means the offer works on any service.">
                    <div className="afc-crop-strip">
                      {offer.applicableServices.length === 0 && <span className="afc-chip">Any service</span>}
                      {offer.applicableServices.map((id) => {
                        const service = services.find((entry) => entry.id === id);
                        return (
                          <button key={id} type="button" className="afc-btn afc-btn-sm" onClick={() => patch({ applicableServices: offer.applicableServices.filter((entry) => entry !== id) })}>
                            {service?.name || id} ✕
                          </button>
                        );
                      })}
                    </div>
                    <input
                      className="afc-input"
                      value={serviceQuery[offer.id] || ''}
                      placeholder="Search your services to add…"
                      aria-label={`Search services for ${offer.title}`}
                      onChange={(event) => setServiceQuery((current) => ({ ...current, [offer.id]: event.target.value }))}
                    />
                    {matched.length > 0 && (
                      <div className="afc-crop-strip">
                        {matched.slice(0, 12).map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            className="afc-btn afc-btn-sm afc-btn-ghost"
                            disabled={offer.applicableServices.includes(service.id)}
                            onClick={() => patch({ applicableServices: [...offer.applicableServices, service.id] })}
                          >
                            <Plus size={12} aria-hidden="true" /> {service.name} · {formatInr(service.price ?? 0)}
                          </button>
                        ))}
                      </div>
                    )}
                  </Field>

                  <Notice>
                    Clients will see <b>{offerDiscountLabel(offer)}</b>
                    {offer.validFrom || offer.validTo ? <> · {formatOfferWindow(offer)}</> : null}
                    {offer.validTo ? <> (ends {formatDateIN(offer.validTo)})</> : null}. “Book this offer” prefills the
                    first applicable service at {formatInr(offer.offerPriceINR)}.
                  </Notice>

                  <div className="afc-row-actions">
                    <Toggle label="Show on the website" checked={offer.isActive} onChange={(isActive) => patch({ isActive })} />
                    {offer.isDemo && (
                      <button type="button" className="afc-btn afc-btn-sm" onClick={() => patch({ isDemo: false })}>
                        Make this my own offer
                      </button>
                    )}
                    <MoveButtons index={index} total={offers.length} label={offer.title} onMove={(to) => setOffers(moveInList(offers, index, to))} />
                    <DeleteButton label={`offer ${offer.title}`} onDelete={() => setOffers(offers.filter((_, i) => i !== index))} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shared list helper
 * ------------------------------------------------------------------ */

export function moveInList<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
