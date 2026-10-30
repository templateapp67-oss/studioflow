import { useMemo, useState } from 'react';
import { CalendarCheck, Check, Clock3, MapPin } from 'lucide-react';
import type { SalonService } from '../../types';
import { ARCH_FLUTTER_ART, archFlutterFormatInr } from '../../lib/archFlutter';
import { SafeImage } from './SafeImage';

/**
 * Hero device mockup — a phone showing the Arch & Flutter booking app.
 *
 * It reads the live onboarding service catalogue (never hard-coded prices) and
 * its Book button opens exactly the same booking flow as every other template,
 * so the GlowSlot / Nexora customer-app wiring stays intact.
 */
export function ArchFlutterDeviceMockup({
  brandName,
  cityLabel,
  logoUrl,
  screenshotUrl,
  services,
  onBook,
}: {
  brandName: string;
  cityLabel: string;
  logoUrl?: string;
  /** Owner's own app screenshot. When set it covers the generated preview. */
  screenshotUrl?: string;
  services: SalonService[];
  onBook: (service?: SalonService) => void;
}) {
  const featured = useMemo(
    () => services.filter((service) => !/package|combo|bundle|membership/i.test(`${service.category} ${service.name}`)).slice(0, 3),
    [services],
  );
  const [selectedId, setSelectedId] = useState('');
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState('4:00 PM');
  const selected = featured.find((service) => service.id === selectedId) || featured[0];
  const timeSlots = ['11:00 AM', '1:30 PM', '4:00 PM', '6:30 PM'];

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
    <div className="af-phone" aria-label={`${brandName} lash & brow booking app preview`} role="img">
      <div className="af-phone-screen">
        {(screenshotUrl || '').trim() ? (
          <SafeImage
            src={(screenshotUrl || '').trim()}
            fallback={ARCH_FLUTTER_ART.reel}
            alt={`${brandName} booking app screenshot`}
            width={296}
            height={600}
            loading="lazy"
            style={{ position: 'absolute', inset: 0, zIndex: 4, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 26 }}
          />
        ) : null}
        <div className="af-phone-status" aria-hidden="true">
          <span>10:00</span>
          <span>5G ▰</span>
        </div>

        <div className="af-phone-head">
          {logoUrl ? (
            <SafeImage src={logoUrl} fallback={ARCH_FLUTTER_ART.team} alt="" width={34} height={34} loading="lazy" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 34% 28%, #f6e2c0, #c9a66b 62%, #a9853f)',
                color: '#241610',
                fontFamily: 'var(--af-serif)',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {(brandName || 'A').trim().charAt(0)}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <p>{brandName}</p>
            <span>
              <MapPin size={9} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px' }} /> {cityLabel}
            </span>
          </div>
        </div>

        <p className="af-phone-title">Book your lash or brow slot</p>
        <p className="af-phone-sub">Pick a service and a time that suits you.</p>

        <div className="af-phone-list">
          {(featured.length ? featured : [undefined]).map((service) =>
            service ? (
              <button
                type="button"
                key={service.id}
                onClick={() => setSelectedId(service.id)}
                aria-pressed={selected?.id === service.id}
                aria-label={`Choose ${service.name}, ${archFlutterFormatInr(service.price)}`}
                className={selected?.id === service.id ? 'af-phone-item is-active' : 'af-phone-item'}
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
                  {archFlutterFormatInr(service.price)}
                  {selected?.id === service.id && <Check size={11} aria-hidden="true" style={{ display: 'inline', marginLeft: 4, verticalAlign: '-1px' }} />}
                </span>
              </button>
            ) : (
              <div key="empty" className="af-phone-item">
                <span>
                  <b>Menu coming soon</b>
                  <i>WhatsApp us and we will help you right away.</i>
                </span>
              </div>
            ),
          )}
        </div>

        <div className="af-phone-days" role="group" aria-label="Pick a day">
          {dayPills.map((pill, idx) => (
            <button
              type="button"
              key={`${pill.day}-${pill.date}`}
              onClick={() => setDayIdx(idx)}
              aria-pressed={dayIdx === idx}
              aria-label={`${pill.day} ${pill.date}`}
              className={dayIdx === idx ? 'af-phone-day is-active' : 'af-phone-day'}
            >
              {pill.day}
              <b>{pill.date}</b>
            </button>
          ))}
        </div>

        <div className="af-phone-slots" role="group" aria-label="Pick a time">
          {timeSlots.map((slot) => (
            <button type="button" key={slot} onClick={() => setTime(slot)} aria-pressed={time === slot} className={time === slot ? 'af-phone-slot is-active' : 'af-phone-slot'}>
              {slot}
            </button>
          ))}
        </div>

        <div>
          {selected && (
            <p className="af-phone-sub" aria-live="polite" style={{ padding: '0 0 8px' }}>
              {selected.name.length > 34 ? `${selected.name.slice(0, 33)}…` : selected.name} · {dayPills[dayIdx]?.day} at {time}
            </p>
          )}
          <button type="button" onClick={() => onBook(selected)} className="af-phone-cta">
            <CalendarCheck size={14} aria-hidden="true" /> Book now
          </button>
          <p className="af-phone-note">Pay at the bar · UPI, card or cash (₹, GST included)</p>
        </div>
      </div>
    </div>
  );
}
