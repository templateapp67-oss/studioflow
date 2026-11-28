import React from 'react';
import { ArrowRight, CalendarHeart, MessageCircle } from 'lucide-react';
import type { SalonService, Stylist } from '../../types';
import { vedaFormatDuration, vedaFormatInr, vedaShowsWhatsapp, vedaWhatsappLink } from '../../lib/vedaSanjeevani';
import { VedaBtn, VedaGlassCard, VedaPageHead, VedaSectionHead } from './VedaParts';
import type { VedaSectionProps } from './VedaSections';

/**
 * Select an actual catalogue item, then use the shared booking sheet for
 * specialist eligibility, live IST availability, guest details and checkout.
 * This page does not invent times or claim that an unsent request was received.
 */
export function VedaBookingPage({
  config,
  profile,
  services,
  stylists,
  navigate,
  onBook,
  bookingAvailable = true,
  initialServiceId,
  initialStylistId,
}: VedaSectionProps & { bookingAvailable?: boolean; initialServiceId?: string; initialStylistId?: string }) {
  const selected = services.find((item) => item.id === initialServiceId);
  const selectedStylist = stylists.find((person) => person.id === initialStylistId);
  const whatsappHref = vedaWhatsappLink(profile.whatsapp || profile.phone, `Hello ${profile.businessName || 'the studio'}, I would like to enquire about a ritual.`);
  const open = (service: SalonService, stylist?: Stylist) => {
    if (bookingAvailable) onBook(service, stylist);
  };

  return (
    <>
      <VedaPageHead
        crumb="Book"
        head={<VedaSectionHead eyebrow="Book a ritual" title={'Take an hour\nfor yourself.'} body={config.booking.note} />}
      >
        <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
      </VedaPageHead>
      <section className="vd-section vd-section--tight" aria-label="Booking">
        <div className="vd-container vd-booking">
          <VedaGlassCard className="vd-form" as="div">
            <h2>Choose a ritual</h2>
            <p className="vd-field__hint">Choose a service to check its specialist and available appointment times in the booking sheet. Times are shown in India Standard Time.</p>
            {!bookingAvailable && <p role="status">Online booking is unavailable. Please contact the studio.</p>}
            {services.length === 0 && <p role="status">The studio has not published a service menu yet.</p>}
            <div className="vd-grid" style={{ gap: 10 }}>
              {services.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="vd-offer"
                  disabled={!bookingAvailable}
                  onClick={() => open(item, selectedStylist)}
                  style={{ textAlign: 'left', cursor: bookingAvailable ? 'pointer' : 'not-allowed' }}
                >
                  <span className="vd-offer__body" style={{ padding: 18 }}>
                    <span className="vd-offer__badge">{item.category}</span>
                    <span style={{ fontFamily: 'var(--vd-font-heading)', fontSize: '1.08rem' }}>{item.name}</span>
                    <span className="vd-small vd-muted">{vedaFormatInr(item.price)} · {vedaFormatDuration(item.durationMinutes)}</span>
                    <span>Check available times <ArrowRight size={15} aria-hidden="true" /></span>
                  </span>
                </button>
              ))}
            </div>
          </VedaGlassCard>
          <VedaGlassCard className="vd-summary" as="aside" ariaLabel="Your booking summary" delay={0.08}>
            <p className="vd-eyebrow">Your ritual</p>
            <h3>{selected?.name || 'Choose a ritual'}</h3>
            {selected && <p className="vd-small vd-muted">{vedaFormatInr(selected.price)} · {vedaFormatDuration(selected.durationMinutes)}</p>}
            {selected && <VedaBtn disabled={!bookingAvailable} onClick={() => open(selected, selectedStylist)}>Check available times <CalendarHeart size={15} aria-hidden="true" /></VedaBtn>}
            <p className="vd-summary__note">No appointment or payment is created until you complete the booking sheet.</p>
            {vedaShowsWhatsapp(config) && whatsappHref && <VedaBtn size="sm" variant="ghost" href={whatsappHref} target="_blank"><MessageCircle size={15} aria-hidden="true" /> Ask the studio a question</VedaBtn>}
          </VedaGlassCard>
        </div>
      </section>
    </>
  );
}
