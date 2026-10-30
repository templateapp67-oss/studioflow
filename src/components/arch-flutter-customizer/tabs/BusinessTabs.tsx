import React from 'react';
import { ExternalLink, IndianRupee, RotateCcw } from 'lucide-react';

import { formatInr, isIndianPhone, normalizeIndianPhone, sanitizeText } from '../../../lib/archFlutterCustomizer';
import { Card, Field, ImageField, Notice, NumberField, TextArea, TextField, Toggle } from '../CustomizerFields';
import { IssueList, PanelHead, issueFor, issuesForTab, type TabProps } from './shared';

export interface BusinessTabProps extends TabProps {
  /** Opens the platform's Razorpay / payment settings panel. */
  onOpenPayments?: () => void;
}

/* ------------------------------------------------------------------ *
 * 11 · Contact & timings
 * ------------------------------------------------------------------ */

export function ContactTab({ config, update, issues }: TabProps) {
  const contact = config.contact;
  const set = (patch: Partial<typeof contact>) => update((draft) => ({ ...draft, contact: { ...draft.contact, ...patch } }));

  return (
    <div className="afc-panel">
      <PanelHead title="Contact & timings">
        Where clients find you, how they reach you and when you are open. The WhatsApp button and the “open now” pill on
        the website both read from here.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'contact')} />

      <Card title="Phone, WhatsApp & email">
        <div className="afc-grid">
          <TextField
            label="Phone number"
            value={contact.phone}
            onChange={(phone) => set({ phone })}
            error={issueFor(issues, 'contact', 'phone')}
            hint="Indian mobile number, for example +91 98290 55214."
            type="tel"
            maxLength={20}
          />
          <TextField
            label="WhatsApp number"
            value={contact.whatsapp}
            onChange={(whatsapp) => set({ whatsapp })}
            error={issueFor(issues, 'contact', 'whatsapp')}
            hint="Leave blank to use the phone number."
            type="tel"
            maxLength={20}
          />
          <TextField
            label="Email"
            value={contact.email}
            onChange={(email) => set({ email })}
            error={issueFor(issues, 'contact', 'email')}
            placeholder="hello@yoursalon.in"
            type="email"
            maxLength={120}
          />
        </div>
        <div className="afc-row-actions">
          <button
            type="button"
            className="afc-btn afc-btn-sm"
            disabled={!isIndianPhone(contact.phone)}
            onClick={() => set({ whatsapp: normalizeIndianPhone(contact.phone) })}
          >
            Use the phone number for WhatsApp too
          </button>
          {contact.whatsapp && isIndianPhone(contact.whatsapp) && (
            <a
              className="afc-btn afc-btn-sm afc-btn-ghost"
              href={`https://wa.me/${normalizeIndianPhone(contact.whatsapp).replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={13} aria-hidden="true" /> Test the WhatsApp link
            </a>
          )}
        </div>
      </Card>

      <Card title="Address & map">
        <TextArea label="Studio address" value={contact.address} onChange={(address) => set({ address })} rows={2} maxLength={240} wide />
        <div className="afc-grid">
          <TextField label="City" value={contact.city} onChange={(city) => set({ city: sanitizeText(city, 60) })} maxLength={60} />
          <TextField label="Landmark" value={contact.landmark} onChange={(landmark) => set({ landmark: sanitizeText(landmark, 80) })} hint="Example: Above Blue Bakery, 2nd floor" maxLength={80} />
          <TextField label="PIN code" value={contact.postalCode} onChange={(postalCode) => set({ postalCode: postalCode.replace(/\D/g, '').slice(0, 6) })} hint="6 digits" maxLength={6} />
          <TextField
            label="Google Maps link"
            value={contact.mapLink}
            onChange={(mapLink) => set({ mapLink })}
            error={issueFor(issues, 'contact', 'mapLink')}
            hint="Copy the share link from Google Maps."
            type="url"
          />
        </div>
      </Card>

      <Card title="Opening hours">
        <div className="afc-grid">
          <TextField label="Opens at" value={contact.openTime} onChange={(openTime) => set({ openTime })} error={issueFor(issues, 'contact', 'openTime')} type="time" hint="24-hour format, e.g. 10:00" />
          <TextField label="Closes at" value={contact.closeTime} onChange={(closeTime) => set({ closeTime })} type="time" hint="24-hour format, e.g. 20:00" />
        </div>
        <TextArea
          label="Hours shown on the website"
          value={contact.workingHoursDisplay}
          onChange={(workingHoursDisplay) => set({ workingHoursDisplay })}
          rows={2}
          maxLength={120}
          hint="Example: Mon–Sat 10:00–20:00 · Sunday by appointment"
          wide
        />
        <Notice>
          The website compares these times with the visitor's clock to show “Open now · till 8:00 pm” or “Closed · opens
          10:00 am”.
        </Notice>
      </Card>

      <Card title="Social links">
        <div className="afc-grid">
          <TextField label="Instagram" value={contact.instagramHandle} onChange={(instagramHandle) => set({ instagramHandle })} error={issueFor(issues, 'contact', 'instagramHandle')} placeholder="@yourstudio or https://instagram.com/yourstudio" />
          <TextField label="Facebook page" value={contact.facebookPage} onChange={(facebookPage) => set({ facebookPage })} error={issueFor(issues, 'contact', 'facebookPage')} type="url" placeholder="https://facebook.com/yourstudio" />
          <TextField label="YouTube channel" value={contact.youtubeChannel} onChange={(youtubeChannel) => set({ youtubeChannel })} error={issueFor(issues, 'contact', 'youtubeChannel')} type="url" placeholder="https://youtube.com/@yourstudio" />
          <TextField label="Google Business profile" value={contact.googleBusinessUrl} onChange={(googleBusinessUrl) => set({ googleBusinessUrl })} error={issueFor(issues, 'contact', 'googleBusinessUrl')} type="url" />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 12 · Booking & payments
 * ------------------------------------------------------------------ */

export function BookingTab({ config, update, issues, onOpenPayments }: BusinessTabProps) {
  const booking = config.booking;
  const set = (patch: Partial<typeof booking>) => update((draft) => ({ ...draft, booking: { ...draft.booking, ...patch } }));
  const depositExample = booking.depositPercentage > 0 ? formatInr(Math.round((1999 * booking.depositPercentage) / 100)) : '₹0';

  return (
    <div className="afc-panel">
      <PanelHead title="Booking & payments">
        How clients pay. This template bills in Indian Rupees only — {formatInr(2499)} style formatting is applied
        everywhere automatically.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'booking')} />

      <Card title="Currency">
        <Field label="Billing currency" hint="Template 13 is built for Indian salons, so the currency is fixed.">
          <span className="afc-input" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(43,27,23,0.06)' }}>
            <IndianRupee size={14} aria-hidden="true" /> INR — Indian Rupee (₹)
          </span>
        </Field>
        <Toggle
          label="Ask for an advance to confirm a booking"
          checked={booking.requireDeposit}
          onChange={(requireDeposit) => set({ requireDeposit })}
          hint="Clients see the advance amount before they confirm."
        />
        {booking.requireDeposit && (
          <div className="afc-grid">
            <NumberField
              label="Advance percentage"
              value={booking.depositPercentage}
              onChange={(depositPercentage) => set({ depositPercentage })}
              error={issueFor(issues, 'booking', 'depositPercentage')}
              min={1}
              max={100}
              prefix="%"
              hint={`On a ${formatInr(1999)} service that is ${depositExample}.`}
            />
          </div>
        )}
      </Card>

      <Card title="Paying at the salon & UPI">
        <Toggle
          label="Allow “pay at the salon”"
          checked={booking.payAtSalon}
          onChange={(payAtSalon) => set({ payAtSalon })}
          hint="When off, the website says online payment only."
        />
        <TextField
          label="UPI handle"
          value={booking.upiHandle}
          onChange={(upiHandle) => set({ upiHandle: sanitizeText(upiHandle, 60) })}
          placeholder="yourstudio@okhdfcbank"
          hint="Shown on the booking note and in the footer, for example “UPI: yourstudio@okhdfcbank”."
          maxLength={60}
          wide
        />
        <div className="afc-row-actions">
          {onOpenPayments && (
            <button type="button" className="afc-btn afc-btn-sm" onClick={onOpenPayments}>
              <ExternalLink size={13} aria-hidden="true" /> Open Razorpay & payment gateway settings
            </button>
          )}
        </div>
        <Notice>
          Razorpay checkout, UPI collect and payment webhooks are set up once for your workspace in Payments settings.
          This tab only controls what this website tells clients: the advance, “pay at the salon” and your UPI handle.
        </Notice>
      </Card>

      <Card title="Booking rules">
        <div className="afc-grid">
          <NumberField
            label="Minimum notice (hours before the appointment)"
            value={booking.leadHours}
            onChange={(leadHours) => set({ leadHours })}
            min={0}
            max={720}
            hint="Example: 2 means clients cannot book a slot starting in less than two hours."
          />
          <NumberField
            label="Free cancellation window (hours)"
            value={booking.cancellationWindow}
            onChange={(cancellationWindow) => set({ cancellationWindow })}
            min={0}
            max={720}
            hint="Example: 24 means free cancellation up to a day before."
          />
        </div>
      </Card>

      <Card title="GST">
        <Toggle
          label="Show the GST note"
          checked={booking.showGstNote}
          onChange={(showGstNote) => set({ showGstNote })}
          hint="Adds “GST included” to the booking note and footer."
        />
        <TextField
          label="GSTIN"
          value={booking.gstin}
          onChange={(gstin) => set({ gstin: gstin.toUpperCase().replace(/\s/g, '') })}
          error={issueFor(issues, 'booking', 'gstin')}
          placeholder="08ABCDE1234F1Z5"
          hint="15 characters. Shown in the footer for business clients."
          maxLength={15}
          wide
        />
        <Notice tone="success">
          Clients will see: <b>{booking.showGstNote ? 'GST included' : 'All prices in ₹'} · UPI accepted · {booking.payAtSalon ? 'pay at the salon' : 'online payment only'}</b>.
        </Notice>
        <button
          type="button"
          className="afc-btn afc-btn-sm afc-btn-ghost"
          onClick={() => set({ requireDeposit: false, depositPercentage: 30, payAtSalon: true, upiHandle: '', leadHours: 2, cancellationWindow: 24, showGstNote: true, gstin: '' })}
        >
          <RotateCcw size={13} aria-hidden="true" /> Reset booking & payments
        </button>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 13 · SEO
 * ------------------------------------------------------------------ */

export function SeoTab({ config, update, issues }: TabProps) {
  const seo = config.seo;
  const set = (patch: Partial<typeof seo>) => update((draft) => ({ ...draft, seo: { ...draft.seo, ...patch } }));
  const title = seo.metaTitle || `${config.brand.businessName} · ${config.brand.tagline}`;
  const description = seo.metaDescription || config.brand.shortBio || config.brand.tagline;

  return (
    <div className="afc-panel">
      <PanelHead title="SEO">
        What Google and WhatsApp show when your website link is shared. Keep the title under 70 characters and the
        description under 200.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'seo')} />

      <Card title="Search listing">
        <TextField
          label="Page title"
          value={seo.metaTitle}
          onChange={(metaTitle) => set({ metaTitle })}
          error={issueFor(issues, 'seo', 'metaTitle')}
          hint={`${seo.metaTitle.length}/70 characters. Example: Lash Lift & Brow Lamination in Jaipur | Arch & Flutter`}
          maxLength={120}
          wide
        />
        <TextArea
          label="Meta description"
          value={seo.metaDescription}
          onChange={(metaDescription) => set({ metaDescription })}
          error={issueFor(issues, 'seo', 'metaDescription')}
          rows={3}
          maxLength={320}
          hint={`${seo.metaDescription.length}/200 characters. Mention your service, your area and your price range.`}
          wide
        />
        <TextField
          label="Keywords"
          value={seo.keywords}
          onChange={(keywords) => set({ keywords })}
          hint="Comma separated. Example: lash lift Jaipur, brow lamination, hybrid lashes"
          maxLength={300}
          wide
        />
        <ImageField
          label="Share image"
          value={seo.shareImageUrl}
          onChange={(shareImageUrl) => set({ shareImageUrl })}
          sampleSlot="share"
          shape="wide"
          hint="Shown when the link is shared on WhatsApp, Instagram or Facebook. 1200×630 works best."
        />
      </Card>

      <Card title="How it looks in search">
        <div
          style={{
            display: 'grid',
            gap: 4,
            padding: 14,
            borderRadius: 14,
            border: '1px solid rgba(201,166,107,0.5)',
            background: '#fff',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#4d5156' }}>yoursalon.in › {config.brand.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'studio'}</span>
          <b style={{ fontSize: '1.05rem', color: '#1a0dab', fontFamily: 'Georgia, serif' }}>{title.slice(0, 70)}</b>
          <span style={{ fontSize: '0.82rem', color: '#4d5156' }}>{description.slice(0, 200)}</span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: 12,
            borderRadius: 14,
            border: '1px solid rgba(201,166,107,0.5)',
            background: '#fff',
            alignItems: 'center',
          }}
        >
          {seo.shareImageUrl ? (
            <img src={seo.shareImageUrl} alt="" style={{ width: 96, height: 60, objectFit: 'cover', borderRadius: 8 }} loading="lazy" decoding="async" />
          ) : (
            <span className="afc-thumb" aria-hidden="true" />
          )}
          <span style={{ display: 'grid', gap: 2 }}>
            <b style={{ fontSize: '0.86rem' }}>{config.brand.businessName}</b>
            <span style={{ fontSize: '0.78rem', color: '#4d5156' }}>{description.slice(0, 90)}</span>
          </span>
        </div>
        <p className="afc-hint" style={{ margin: 0 }}>
          Google preview on top, WhatsApp/Instagram share card below. The salon address, timings and ₹ price range are
          added to the structured data automatically.
        </p>
      </Card>
    </div>
  );
}
