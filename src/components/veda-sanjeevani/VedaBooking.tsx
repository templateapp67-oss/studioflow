import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, MessageCircle, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import type { SalonService, Stylist } from '../../types';
import { vedaFormatDuration, vedaFormatInr, vedaWhatsappLink, type VedaConfig } from '../../lib/vedaSanjeevani';
import { VedaBtn, VedaGlassCard, VedaImage, VedaPageHead, VedaReveal, VedaSectionHead } from './VedaParts';
import type { VedaSectionProps } from './VedaSections';

type Step = 1 | 2 | 3 | 4;

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 1, label: 'Ritual' },
  { id: 2, label: 'Therapist' },
  { id: 3, label: 'Day & time' },
  { id: 4, label: 'Your details' },
];

/** 14 bookable days starting today, formatted for an Indian audience. */
export function vedaNextDays(count = 14): Array<{ iso: string; day: string; date: string; month: string; closed: boolean }> {
  const out: Array<{ iso: string; day: string; date: string; month: string; closed: boolean }> = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let index = 0; index < count; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    out.push({
      iso: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
      day: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: String(day.getDate()).padStart(2, '0'),
      month: day.toLocaleDateString('en-IN', { month: 'short' }),
      closed: false,
    });
  }
  return out;
}

/** Indicative slots. Availability is confirmed by the studio, never invented. */
export function vedaTimeSlots(openMinutes = 9 * 60 + 30, closeMinutes = 19 * 60 + 30, stepMinutes = 60): string[] {
  const out: string[] = [];
  for (let minutes = openMinutes; minutes + stepMinutes <= closeMinutes; minutes += stepMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? 'pm' : 'am';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    out.push(`${display}:${String(minute).padStart(2, '0')} ${suffix}`);
  }
  return out;
}

function formatDayLabel(iso: string): string {
  if (!iso) return 'Not chosen';
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

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
  const [step, setStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState(initialServiceId || '');
  const [stylistId, setStylistId] = useState(initialStylistId || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [advance, setAdvance] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<null | { reference: string; service: SalonService | undefined; stylist: Stylist | undefined; date: string; time: string; name: string; phone: string }>(null);
  const [appNotice, setAppNotice] = useState('');

  const bookable = useMemo(() => services.filter((service) => service.name), [services]);
  const service = bookable.find((item) => item.id === serviceId);
  const stylist = stylists.find((person) => person.id === stylistId);
  const days = useMemo(() => vedaNextDays(14), []);
  const slots = useMemo(() => {
    const open = String((profile as any).openTime || '09:30');
    const close = String((profile as any).closeTime || '20:00');
    const toMinutes = (value: string) => {
      const [hour, minute] = value.split(':').map(Number);
      return (Number.isFinite(hour) ? hour : 9) * 60 + (Number.isFinite(minute) ? minute : 30);
    };
    const step = (service?.durationMinutes || 60) >= 90 ? 90 : 60;
    return vedaTimeSlots(toMinutes(open), toMinutes(close), step);
  }, [profile, service]);

  const message = useMemo(() => {
    const lines = [
      `Hello ${profile.businessName || 'Veda Sanjeevani'}, I would like to book a ritual.`,
      service ? `Ritual: ${service.name} (${vedaFormatDuration(service.durationMinutes)}, ${vedaFormatInr(service.price)})` : '',
      stylist ? `Therapist: ${stylist.name}` : 'Therapist: no preference',
      date ? `Preferred day: ${formatDayLabel(date)}` : '',
      time ? `Preferred time: ${time}` : '',
      name ? `Name: ${name}` : '',
      phone ? `Phone: ${phone}` : '',
      email ? `Email: ${email}` : '',
      note ? `Notes: ${note}` : '',
      advance ? 'I am happy to pay the advance to hold the slot.' : '',
    ].filter(Boolean);
    return lines.join('\n');
  }, [profile.businessName, service, stylist, date, time, name, phone, email, note, advance]);

  const whatsappHref = vedaWhatsappLink(profile.whatsapp || profile.phone, message);
  const telHref = `tel:${String(profile.phone || '').replace(/[^\d+]/g, '')}`;

  const validateDetails = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Add the name we should write on the booking.';
    if (!/^[0-9+\s-]{10,15}$/.test(phone.trim())) next.phone = 'Add a mobile number so we can confirm.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'Check the email address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const confirm = (channel: 'app' | 'whatsapp') => {
    if (!service) {
      setErrors({ service: 'Choose a ritual first.' });
      setStep(1);
      return;
    }
    if (!date || !time) {
      setErrors({ date: 'Pick a day and a time.' });
      setStep(3);
      return;
    }
    if (!validateDetails()) {
      setStep(4);
      return;
    }
    const reference = `VD-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    setConfirmed({ reference, service, stylist, date, time, name: name.trim(), phone: phone.trim() });
    if (channel === 'app' && bookingAvailable) {
      try {
        onBook(service, stylist);
        setAppNotice('Our booking sheet is open in front of you — finish there to lock the slot. The studio also has your request details.');
      } catch {
        setAppNotice('The booking sheet could not open, so please confirm on WhatsApp (below) — that always works.');
      }
    }
    if (channel === 'whatsapp' && typeof window !== 'undefined') {
      window.open(whatsappHref, '_blank', 'noopener,noreferrer');
    }
  };

  if (confirmed) {
    return (
      <section className="vd-section vd-section--tight">
        <div className="vd-container">
          <VedaReveal className="vd-confirm">
            <span className="vd-confirm__seal"><Check size={24} aria-hidden="true" /></span>
            <div>
              <p className="vd-eyebrow">Request received</p>
              <h1 className="vd-h2" style={{ marginTop: 8 }}>Thank you, {confirmed.name.split(' ')[0]}.</h1>
              <p className="vd-lead" style={{ marginTop: 10 }}>
                Your reference is <b>{confirmed.reference}</b>. The studio confirms every slot personally — usually within the hour
                during opening times. Nothing is charged on this page.
              </p>
            </div>
            <div className="vd-confirm__rows">
              <span><b>Ritual:</b> {confirmed.service?.name}</span>
              <span><b>Duration:</b> {vedaFormatDuration(confirmed.service?.durationMinutes)} · {vedaFormatInr(confirmed.service?.price)}</span>
              <span><b>Therapist:</b> {confirmed.stylist?.name || 'No preference — we will assign the right therapist'}</span>
              <span><b>Requested:</b> {formatDayLabel(confirmed.date)} at {confirmed.time}</span>
              <span><b>Contact:</b> {confirmed.phone}</span>
            </div>
            {appNotice ? <p className="vd-form__notice">{appNotice}</p> : null}
            <div className="vd-form__actions">
              <VedaBtn variant="gold" href={whatsappHref} target="_blank">
                <MessageCircle size={16} aria-hidden="true" /> Confirm on WhatsApp
              </VedaBtn>
              <VedaBtn variant="quiet" href={telHref}>
                <Phone size={16} aria-hidden="true" /> Call the studio
              </VedaBtn>
              <VedaBtn variant="quiet" onClick={() => { setConfirmed(null); setStep(1); setServiceId(''); setTime(''); setDate(''); }}>
                Book another ritual
              </VedaBtn>
            </div>
            <p className="vd-disclaimer">{config.booking.depositNote}</p>
          </VedaReveal>
        </div>
      </section>
    );
  }

  return (
    <>
      <VedaPageHead
        crumb="Book"
        head={
          <VedaSectionHead
            eyebrow="Book a ritual"
            title={'Take an hour\nfor yourself.'}
            body={config.booking.note}
          />
        }
      >
        <button type="button" onClick={() => navigate('home')}>Home</button> <span aria-hidden="true">/</span>
      </VedaPageHead>

      <section className="vd-section vd-section--tight">
        <div className="vd-container">
          <ol className="vd-therapy-tabs" style={{ listStyle: 'none', margin: '0 0 22px', padding: 0 }} aria-label="Booking steps">
            {STEPS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={step === item.id}
                  onClick={() => setStep(item.id)}
                  style={step > item.id ? { borderColor: 'var(--vd-gold)' } : undefined}
                >
                  {step > item.id ? <Check size={13} aria-hidden="true" style={{ marginRight: 6, verticalAlign: -2 }} /> : null}
                  {item.id}. {item.label}
                </button>
              </li>
            ))}
          </ol>

          <div className="vd-booking">
            <VedaGlassCard className="vd-form" as="div">
              {step === 1 ? (
                <>
                  <fieldset className="vd-fieldset">
                    <legend>Choose a ritual</legend>
                    {errors.service ? <p className="vd-field__error" role="alert">{errors.service}</p> : null}
                    <div className="vd-grid" style={{ gap: 10 }}>
                      {bookable.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="vd-offer"
                          onClick={() => { setServiceId(item.id); setErrors({}); setStep(2); }}
                          aria-pressed={serviceId === item.id}
                          style={{ textAlign: 'left', cursor: 'pointer', borderColor: serviceId === item.id ? 'var(--vd-gold)' : undefined }}
                        >
                          <div className="vd-offer__media" style={{ width: 118 }}>
                            <VedaImage slot="abhyanga" src={item.imageUrl} alt="" ratio="1 / 1" sizes="118px" />
                          </div>
                          <span className="vd-offer__body">
                            <span className="vd-offer__badge">{item.category}</span>
                            <span style={{ fontFamily: 'var(--vd-font-heading)', fontSize: '1.08rem', lineHeight: 1.2 }}>{item.name}</span>
                            <span className="vd-small vd-muted">
                              {vedaFormatInr(item.price)} · {vedaFormatDuration(item.durationMinutes)}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <fieldset className="vd-fieldset">
                    <legend>Choose a therapist</legend>
                    <p className="vd-field__hint">Every therapist is trained for every ritual on the menu. Requesting someone is a preference, not a requirement.</p>
                    <div className="vd-grid vd-grid--2" style={{ gap: 10 }}>
                      <button
                        type="button"
                        className="vd-offer"
                        onClick={() => { setStylistId(''); setStep(3); }}
                        style={{ gridTemplateColumns: '1fr', textAlign: 'left', cursor: 'pointer', borderColor: stylistId === '' ? 'var(--vd-gold)' : undefined }}
                      >
                        <span className="vd-offer__body" style={{ padding: 18 }}>
                          <span className="vd-offer__badge">No preference</span>
                          <span style={{ fontFamily: 'var(--vd-font-heading)', fontSize: '1.14rem' }}>Whoever is best suited that day</span>
                        </span>
                      </button>
                      {stylists.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          className="vd-offer"
                          onClick={() => { setStylistId(person.id); setStep(3); }}
                          style={{ gridTemplateColumns: '86px 1fr', textAlign: 'left', cursor: 'pointer', borderColor: stylistId === person.id ? 'var(--vd-gold)' : undefined }}
                        >
                          <div className="vd-offer__media h-80 w-full aspect-[3/4] overflow-hidden">
                            <VedaImage slot="therapist-ananya" src={person.avatarUrl} alt="" ratio="3 / 4" sizes="86px" className="w-full h-full object-cover" />
                          </div>
                          <span className="vd-offer__body" style={{ padding: '14px 16px 14px 0' }}>
                            <span className="vd-offer__badge">{person.role}</span>
                            <span style={{ fontFamily: 'var(--vd-font-heading)', fontSize: '1.12rem' }}>{person.name}</span>
                            {person.specialties?.length ? <span className="vd-small vd-muted">{person.specialties.slice(0, 2).join(' · ')}</span> : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="vd-form__actions">
                    <VedaBtn variant="quiet" onClick={() => setStep(1)}><ArrowLeft size={15} aria-hidden="true" /> Back</VedaBtn>
                    <VedaBtn onClick={() => setStep(3)}>Continue <ArrowRight size={15} aria-hidden="true" /></VedaBtn>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <fieldset className="vd-fieldset">
                    <legend>Pick a day</legend>
                    <div className="vd-therapy-tabs" style={{ margin: 0 }}>
                      {days.map((day) => (
                        <button key={day.iso} type="button" aria-pressed={date === day.iso} onClick={() => { setDate(day.iso); setErrors({}); }}>
                          {day.day} {day.date} {day.month}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="vd-fieldset">
                    <legend>Pick a time</legend>
                    <div className="vd-slots">
                      {slots.map((slot) => (
                        <button key={slot} type="button" className="vd-slot" aria-pressed={time === slot} onClick={() => { setTime(slot); setErrors({}); }}>
                          {slot}
                        </button>
                      ))}
                    </div>
                    <p className="vd-field__hint">Times are indicative. We confirm the exact slot on WhatsApp before you travel.</p>
                    {errors.date ? <p className="vd-field__error" role="alert">{errors.date}</p> : null}
                  </fieldset>
                  <div className="vd-form__actions">
                    <VedaBtn variant="quiet" onClick={() => setStep(2)}><ArrowLeft size={15} aria-hidden="true" /> Back</VedaBtn>
                    <VedaBtn onClick={() => { if (!date || !time) { setErrors({ date: 'Pick a day and a time to continue.' }); return; } setStep(4); }}>
                      Continue <ArrowRight size={15} aria-hidden="true" />
                    </VedaBtn>
                  </div>
                </>
              ) : null}

              {step === 4 ? (
                <>
                  <div className="vd-form__row">
                    <div className="vd-field">
                      <label htmlFor="vd-book-name">Your name</label>
                      <input id="vd-book-name" value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'vd-book-name-error' : undefined} />
                      {errors.name ? <p className="vd-field__error" id="vd-book-name-error" role="alert">{errors.name}</p> : null}
                    </div>
                    <div className="vd-field">
                      <label htmlFor="vd-book-phone">Mobile number</label>
                      <input id="vd-book-phone" value={phone} inputMode="tel" autoComplete="tel" placeholder="+91" onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'vd-book-phone-error' : undefined} />
                      {errors.phone ? <p className="vd-field__error" id="vd-book-phone-error" role="alert">{errors.phone}</p> : null}
                    </div>
                  </div>
                  <div className="vd-field">
                    <label htmlFor="vd-book-email">Email (optional)</label>
                    <input id="vd-book-email" type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} />
                    {errors.email ? <p className="vd-field__error" role="alert">{errors.email}</p> : null}
                  </div>
                  <div className="vd-field">
                    <label htmlFor="vd-book-note">Anything we should know? (optional)</label>
                    <textarea id="vd-book-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Sensitive skin, pregnancy, an injury, or the pressure you prefer." />
                  </div>
                  <label className="vd-field" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textTransform: 'none', letterSpacing: 0 }}>
                    <input type="checkbox" checked={advance} onChange={(event) => setAdvance(event.target.checked)} style={{ width: 18, height: 18, marginTop: 3 }} />
                    <span className="vd-small vd-muted">{config.booking.depositNote}</span>
                  </label>
                  <div className="vd-form__actions">
                    <VedaBtn variant="quiet" onClick={() => setStep(3)}><ArrowLeft size={15} aria-hidden="true" /> Back</VedaBtn>
                    <VedaBtn variant="gold" onClick={() => confirm('whatsapp')}>
                      <MessageCircle size={16} aria-hidden="true" /> Send request on WhatsApp
                    </VedaBtn>
                    {bookingAvailable ? <VedaBtn variant="quiet" onClick={() => confirm('app')}>Use the booking sheet</VedaBtn> : null}
                  </div>
                  <p className="vd-small vd-muted">
                    We only use these details to confirm your appointment. No card details are collected on this website.
                  </p>
                </>
              ) : null}
            </VedaGlassCard>

            <VedaGlassCard className="vd-summary" as="aside" ariaLabel="Your booking summary" delay={0.08}>
              <p className="vd-eyebrow">Your ritual</p>
              <h3>{service ? service.name : 'No ritual chosen yet'}</h3>
              {service ? <p className="vd-small vd-muted">{service.category}</p> : null}
              <div className="vd-summary__rows">
                <div className="vd-summary__row"><span>Day</span><span>{formatDayLabel(date)}</span></div>
                <div className="vd-summary__row"><span>Time</span><span>{time || 'Not chosen'}</span></div>
                <div className="vd-summary__row"><span>Therapist</span><span>{stylist?.name || 'No preference'}</span></div>
                <div className="vd-summary__row"><span>Duration</span><span>{service ? vedaFormatDuration(service.durationMinutes) : '—'}</span></div>
                <div className="vd-summary__row"><span>Studio</span><span>{profile.city || 'Kota'}</span></div>
              </div>
              <div className="vd-summary__total">
                <span>Estimated total</span>
                <b>{service ? vedaFormatInr(service.price) : '—'}</b>
              </div>
              <p className="vd-summary__note">Payable at the studio after your ritual. Advance only for packages and the retreat day.</p>
              <div className="vd-pay">
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 650 }}>
                  <ShieldCheck size={15} aria-hidden="true" /> Confirmed by a person
                </span>
                <span>Every request is checked against therapist availability before it is final. {config.booking.note}</span>
              </div>
              <VedaBtn size="sm" variant="ghost" href={whatsappHref} target="_blank">
                <MessageCircle size={15} aria-hidden="true" /> Ask a question first
              </VedaBtn>
              <p className="vd-small vd-muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Clock3 size={13} aria-hidden="true" /> Reschedule free up to 6 hours before.
              </p>
            </VedaGlassCard>
          </div>

          <div className="vd-small vd-muted" style={{ marginTop: 24, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Sparkles size={14} aria-hidden="true" /> Prefer to talk? Call {profile.phone || 'the studio'} — a person answers during opening hours.
            <VedaBtn size="sm" variant="quiet" href={telHref}><Phone size={14} aria-hidden="true" /> Call</VedaBtn>
          </div>
        </div>
      </section>
    </>
  );
}

