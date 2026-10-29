import { useMemo, useState } from 'react';
import { CalendarCheck, Check, Clock3, MapPin } from 'lucide-react';
import type { SalonService } from '../../types';
import { SHRINGAAR_IMAGES, shringaarFormatInr } from '../../lib/shringaarRoyal';
import { SafeImage } from './SafeImage';

/**
 * Hero device mockup — a phone showing the Shringaar bridal booking app.
 * It reads the live onboarding service catalogue (never hard-coded prices) and
 * its Book button opens the same booking flow as every other template, so the
 * GlowSlot / Nexora customer app wiring stays intact.
 */
export function DeviceMockup({
  brandName,
  cityLabel,
  logoUrl,
  services,
  onBook,
}: {
  brandName: string;
  cityLabel: string;
  logoUrl?: string;
  services: SalonService[];
  onBook: (service?: SalonService) => void;
}) {
  const featured = useMemo(() => services.filter((s) => !/package|combo|bundle/i.test(`${s.category} ${s.name}`)).slice(0, 3), [services]);
  const [selectedId, setSelectedId] = useState('');
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState('4:00 PM');
  const selected = featured.find((s) => s.id === selectedId) || featured[0];
  const timeSlots = ['10:00 AM', '12:30 PM', '4:00 PM', '6:30 PM'];

  const dayPills = useMemo(() => {
    const labels: Array<{ day: string; date: string }> = [];
    const now = new Date();
    for (let i = 0; i < 4; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      labels.push({ day: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }), date: String(d.getDate()) });
    }
    return labels;
  }, []);

  return (
    <div className="sr-phone" aria-label={`${brandName} bridal booking app preview`} role="img">
      <div className="sr-phone-screen">
        <div className="sr-phone-status" aria-hidden="true">
          <span>10:00</span>
          <span className="sr-phone-notch" />
          <span>5G ▰</span>
        </div>

        <div className="sr-phone-head">
          {logoUrl ? (
            <SafeImage
              src={logoUrl}
              fallback={SHRINGAAR_IMAGES.owner}
              alt=""
              width={30}
              height={30}
              loading="lazy"
              style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 34% 28%, #f6e2ae, #c9a24b 60%, #a07c2c)',
                color: '#3b1017',
                fontFamily: 'var(--sr-serif)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {(brandName || 'S').trim().charAt(0)}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <p>{brandName}</p>
            <span>
              <MapPin size={9} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> {cityLabel}
            </span>
          </div>
        </div>

        <p className="sr-phone-title">Book your bridal look</p>
        <p className="sr-phone-sub">Choose a ritual and a date that suits you.</p>

        <div className="sr-phone-list">
          {(featured.length ? featured : [undefined]).map((service) =>
            service ? (
              <button
                type="button"
                key={service.id}
                onClick={() => setSelectedId(service.id)}
                aria-pressed={selected?.id === service.id}
                aria-label={`Choose ${service.name}, ${shringaarFormatInr(service.price)}`}
                className={selected?.id === service.id ? 'sr-phone-item is-active' : 'sr-phone-item'}
              >
                <span style={{ minWidth: 0 }}>
                  <b>{service.name}</b>
                  {service.showDuration !== false && service.durationMinutes > 0 && (
                    <i>
                      <Clock3 size={9} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> {service.durationMinutes} min
                    </i>
                  )}
                </span>
                <span>
                  {shringaarFormatInr(service.price)}
                  {selected?.id === service.id && (
                    <Check size={11} aria-hidden="true" style={{ display: 'inline', marginLeft: 4, verticalAlign: '-1px' }} />
                  )}
                </span>
              </button>
            ) : (
              <div key="empty" className="sr-phone-item">
                <span>
                  <b>Bridal menu coming soon</b>
                  <i>Call us and we will help you right away.</i>
                </span>
              </div>
            ),
          )}
        </div>

        <div className="sr-phone-days" role="group" aria-label="Pick a day">
          {dayPills.map((pill, idx) => (
            <button
              type="button"
              key={`${pill.day}-${pill.date}`}
              onClick={() => setDayIdx(idx)}
              aria-pressed={dayIdx === idx}
              aria-label={`${pill.day} ${pill.date}`}
              className={dayIdx === idx ? 'sr-phone-day is-active' : 'sr-phone-day'}
            >
              {pill.day}
              <b>{pill.date}</b>
            </button>
          ))}
        </div>

        <div className="sr-phone-slots" role="group" aria-label="Pick a time">
          {timeSlots.map((slot) => (
            <button
              type="button"
              key={slot}
              onClick={() => setTime(slot)}
              aria-pressed={time === slot}
              className={time === slot ? 'sr-phone-slot is-active' : 'sr-phone-slot'}
            >
              {slot}
            </button>
          ))}
        </div>

        <div className="sr-phone-foot">
          {selected && (
            <p className="sr-phone-sub" aria-live="polite" style={{ padding: '0 0 8px' }}>
              {selected.name.length > 34 ? `${selected.name.slice(0, 33)}…` : selected.name} · {dayPills[dayIdx]?.day} at {time}
            </p>
          )}
          <button type="button" onClick={() => onBook(selected)} className="sr-phone-cta">
            <CalendarCheck size={14} aria-hidden="true" /> Book now
          </button>
          <p className="sr-phone-note">Pay at the lounge · UPI, card or cash (₹)</p>
        </div>
      </div>
    </div>
  );
}
