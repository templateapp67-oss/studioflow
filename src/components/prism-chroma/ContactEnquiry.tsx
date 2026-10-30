import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Calendar, CheckCircle2, Clock3, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Send, Youtube } from 'lucide-react';
import type { SalonService } from '../../types';
import {
  submitPrismEnquiry,
  validatePrismEnquiry,
  type PrismEnquiryErrors,
  type PrismSalonBusiness,
} from '../../lib/prismSite';
import { PrismInlineNotice } from './LiveStates';

type EnquiryFields = {
  name: string;
  phone: string;
  email: string;
  serviceId: string;
  preferredDate: string;
  message: string;
};

const EMPTY: EnquiryFields = { name: '', phone: '', email: '', serviceId: '', preferredDate: '', message: '' };

export function PrismContactEnquiry({
  slug,
  brandName,
  business,
  services,
  instagramUrl,
  facebookUrl,
  youtubeUrl,
  mapUrl,
  live,
}: {
  slug: string;
  brandName: string;
  business: PrismSalonBusiness;
  services: SalonService[];
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  mapUrl: string;
  live: boolean;
}) {
  const [fields, setFields] = useState<EnquiryFields>(EMPTY);
  const [errors, setErrors] = useState<PrismEnquiryErrors>({});
  const [busy, setBusy] = useState(false);
  const [sentId, setSentId] = useState('');
  const [formError, setFormError] = useState('');

  const serviceOptions = useMemo(
    () => services.filter((service) => service.price != null || service.price === null),
    [services],
  );
  const addressLine = [business.address, business.city, business.postalCode].filter(Boolean).join(', ');
  const whatsappDigits = (business.whatsapp || business.phone || '').replace(/[^0-9]/g, '');
  const waUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Hello ${brandName}, I have an enquiry about hair colour.`)}`
    : '';

  const update = (key: keyof EnquiryFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFormError('');
    if (!live || !slug) {
      setFormError('This enquiry form goes live once the salon publishes its website.');
      return;
    }
    const selected = fields.serviceId ? services.find((service) => service.id === fields.serviceId) : undefined;
    const payload = {
      slug,
      name: fields.name,
      phone: fields.phone,
      email: fields.email,
      serviceId: selected?.id || '',
      serviceName: selected?.name || '',
      message: fields.message,
      preferredDate: fields.preferredDate || null,
    };
    const found = validatePrismEnquiry(payload);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setBusy(true);
    try {
      const result = await submitPrismEnquiry(payload);
      setSentId(result.id);
      setFields(EMPTY);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Your enquiry could not be sent. Please call the salon.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="pc-contact" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="pc-contact-heading">
      <span className="pc-blob pc-blob-violet" style={{ width: 280, height: 280, top: -40, right: -110 }} aria-hidden="true" />
      <div className="relative">
        <p className="pc-eyebrow">Visit or Ask</p>
        <h2 id="pc-contact-heading" className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold">
          Talk to a <span className="pc-grad-text">colour expert</span>
        </h2>
        <p className="pc-muted mt-3 max-w-2xl">
          Send your shade idea or question. We reply during studio hours with a clear plan and the full price in ₹.
        </p>

        <div className="pc-contact-grid mt-8">
          <div className="pc-glass pc-business">
            <h3 className="pc-display text-lg font-extrabold">Studio information</h3>
            <p className="pc-muted mt-2 flex items-start gap-2 text-sm">
              <MapPin size={15} aria-hidden="true" style={{ marginTop: 3, flex: 'none' }} />
              <span>{addressLine || 'Address is shared at booking.'}</span>
            </p>
            {business.workingHoursDisplay && (
              <p className="pc-muted mt-2 flex items-start gap-2 text-sm">
                <Clock3 size={15} aria-hidden="true" style={{ marginTop: 3, flex: 'none' }} />
                <span>{business.workingHoursDisplay}</span>
              </p>
            )}
            {business.phone && (
              <a className="mt-3 flex items-center gap-2 text-sm font-bold" href={`tel:${business.phone.replace(/[^+\d]/g, '')}`}>
                <Phone size={15} aria-hidden="true" /> {business.phone}
              </a>
            )}
            {business.email && (
              <a className="pc-muted mt-2 flex items-center gap-2 text-sm" href={`mailto:${business.email}`}>
                <Mail size={15} aria-hidden="true" /> {business.email}
              </a>
            )}
            {waUrl && (
              <a className="pc-muted mt-2 flex items-center gap-2 text-sm" href={waUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={15} aria-hidden="true" /> WhatsApp the studio
              </a>
            )}
            <div className="mt-4 flex gap-2">
              {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on Instagram`} className="pc-btn pc-btn-ghost p-2.5"><Instagram size={16} aria-hidden="true" /></a>}
              {facebookUrl && <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on Facebook`} className="pc-btn pc-btn-ghost p-2.5"><Facebook size={16} aria-hidden="true" /></a>}
              {youtubeUrl && <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label={`${brandName} on YouTube`} className="pc-btn pc-btn-ghost p-2.5"><Youtube size={16} aria-hidden="true" /></a>}
            </div>
            <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-bold">
              Open in Google Maps <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            {business.mapEmbedUrl && (
              <iframe
                title={`Map — ${brandName}`}
                src={business.mapEmbedUrl}
                loading="lazy"
                className="mt-4 h-40 w-full rounded-2xl border border-white/15"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>

          <div className="pc-glass pc-enquiry">
            <h3 className="pc-display text-lg font-extrabold">Send an enquiry</h3>
            {sentId ? (
              <div className="mt-3">
                <PrismInlineNotice tone="success">
                  Enquiry sent. Reference <strong>{sentId.slice(0, 8).toUpperCase()}</strong>. The studio replies during opening hours.
                </PrismInlineNotice>
                <button type="button" className="pc-btn pc-btn-ghost mt-4 px-4 py-2.5 text-sm" onClick={() => setSentId('')}>
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form className="pc-form mt-3" onSubmit={submit} noValidate>
                <div className="pc-form-row">
                  <label>
                    <span>Your name *</span>
                    <input required minLength={2} maxLength={120} value={fields.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" aria-invalid={Boolean(errors.name)} />
                    {errors.name && <small role="alert">{errors.name}</small>}
                  </label>
                  <label>
                    <span>Phone *</span>
                    <input required inputMode="tel" value={fields.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" aria-invalid={Boolean(errors.phone)} placeholder="+91 98200 10010" />
                    {errors.phone && <small role="alert">{errors.phone}</small>}
                  </label>
                </div>
                <div className="pc-form-row">
                  <label>
                    <span>Email (optional)</span>
                    <input type="email" value={fields.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" aria-invalid={Boolean(errors.email)} />
                    {errors.email && <small role="alert">{errors.email}</small>}
                  </label>
                  <label>
                    <span>Preferred date (optional)</span>
                    <input type="date" value={fields.preferredDate} onChange={(event) => update('preferredDate', event.target.value)} min={new Date().toISOString().slice(0, 10)} />
                    {errors.preferredDate && <small role="alert">{errors.preferredDate}</small>}
                  </label>
                </div>
                <label>
                  <span>Service you are asking about</span>
                  <select value={fields.serviceId} onChange={(event) => update('serviceId', event.target.value)}>
                    <option value="">Not sure yet — help me choose</option>
                    {serviceOptions.map((service) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Your message</span>
                  <textarea rows={4} maxLength={1000} value={fields.message} onChange={(event) => update('message', event.target.value)} placeholder="Current hair colour, the shade you want, or a question about pricing." />
                  <small>{fields.message.length} / 1000</small>
                </label>
                {formError && <p role="alert" className="pc-form-error">{formError}</p>}
                <button type="submit" className="pc-btn pc-btn-gradient px-5 py-3 text-sm" disabled={busy}>
                  {busy ? 'Sending…' : <>Send enquiry <Send size={15} aria-hidden="true" /></>}
                </button>
                <p className="pc-muted flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 size={12} aria-hidden="true" /> Your name and phone are shared only with this salon.
                </p>
              </form>
            )}
            <div className="pc-enquiry-actions mt-4">
              <a href="#pc-book" className="pc-btn pc-btn-ghost px-4 py-2.5 text-sm"><Calendar size={14} aria-hidden="true" /> Book a slot instead</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
