import { Calendar, Check, Clock3, MapPin, Sparkles } from 'lucide-react';
import type { SalonService } from '../../types';
import { prismFormatInr } from '../../lib/prismChroma';

/**
 * Hero device mockup: a phone frame showing the Prism & Chroma booking app.
 * It reads live onboarding service data (never hard-coded prices) and the
 * "Book Now" button opens the real booking flow, so the website-to-customer-
 * app link works exactly like Templates 08 and 09.
 */
export function DeviceMockup({
  brandName,
  cityLabel,
  services,
  onBook,
}: {
  brandName: string;
  cityLabel: string;
  services: SalonService[];
  onBook: (service?: SalonService) => void;
}) {
  const featured = services.slice(0, 3);
  const selected = featured[0];
  const dayPills = (() => {
    const labels: Array<{ day: string; date: string }> = [];
    const now = new Date();
    for (let i = 0; i < 4; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      labels.push({
        day: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
        date: String(d.getDate()),
      });
    }
    return labels;
  })();

  return (
    <div className="pc-phone w-[280px] sm:w-[300px]" aria-label={`${brandName} booking app preview`}>
      <div className="pc-phone-screen flex flex-col text-left">
        <div className="flex items-center justify-between px-5 pt-4 text-[10px] font-semibold text-[#A9A6C2]" aria-hidden="true">
          <span>10:00</span>
          <span className="h-4 w-16 rounded-full bg-black" />
          <span>5G ▰</span>
        </div>

        <div className="flex items-center gap-2 px-5 pt-3">
          <span className="pc-logo-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
            <Sparkles size={15} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-[#F5F3FF]">{brandName}</p>
            <p className="flex items-center gap-1 text-[10px] text-[#A9A6C2]">
              <MapPin size={10} aria-hidden="true" /> {cityLabel}
            </p>
          </div>
        </div>

        <p className="px-5 pt-4 text-lg font-bold text-[#F5F3FF]">Book your colour</p>
        <p className="px-5 text-[11px] text-[#A9A6C2]">Pick a service and a time that suits you.</p>

        <div className="space-y-2 px-5 pt-3">
          {(featured.length ? featured : [undefined]).map((service, idx) =>
            service ? (
              <div
                key={service.id}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 ${
                  idx === 0 ? 'pc-phone-card-active' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#F5F3FF]">{service.name}</p>
                  {service.showDuration !== false && service.durationMinutes > 0 && (
                    <p className="flex items-center gap-1 text-[10px] text-[#A9A6C2]">
                      <Clock3 size={10} aria-hidden="true" /> {service.durationMinutes} min
                    </p>
                  )}
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-[#F5F3FF]">{prismFormatInr(service.price)}</span>
                  {idx === 0 && (
                    <span className="pc-check flex h-4 w-4 items-center justify-center rounded-full text-white">
                      <Check size={10} aria-hidden="true" />
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div key="empty" className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] text-[#A9A6C2]">
                Colour menu coming soon
              </div>
            ),
          )}
        </div>

        <div className="px-5 pt-3" aria-hidden="true">
          <div className="flex gap-1.5">
            {dayPills.map((pill, idx) => (
              <span
                key={`${pill.day}-${pill.date}`}
                className={`flex-1 rounded-xl border py-1.5 text-center ${
                  idx === 0 ? 'pc-phone-day-active' : 'border-white/10 bg-white/5 text-[#F5F3FF]'
                }`}
              >
                <span className="block text-[9px] font-semibold uppercase tracking-wide opacity-80">{pill.day}</span>
                <span className="block text-[12px] font-bold leading-tight">{pill.date}</span>
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['10:00 AM', '12:30 PM', '4:00 PM', '6:30 PM'].map((time, idx) => (
              <span
                key={time}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  idx === 2 ? 'pc-phone-time-active' : 'border-white/10 bg-white/5 text-[#A9A6C2]'
                }`}
              >
                {time}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto px-5 pb-5 pt-4">
          <button type="button" onClick={() => onBook(selected)} className="pc-btn pc-btn-gradient w-full px-4 py-3 text-sm">
            <Calendar size={16} aria-hidden="true" /> Book Now
          </button>
          <p className="pt-2 text-center text-[10px] text-[#A9A6C2]">Pay at the studio · UPI, card or cash (₹)</p>
        </div>
      </div>
    </div>
  );
}
