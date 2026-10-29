import { Calendar, Check, Clock3, Leaf, MapPin } from 'lucide-react';
import type { SalonService } from '../../types';
import { bodhiFormatInr } from '../../lib/bodhiTree';

/**
 * Hero device mockup: a phone frame showing the Bodhi Tree booking screen.
 * It reads live service data (never hard-coded prices) and the "Book Now"
 * button opens the real booking flow for the highlighted treatment.
 */
export function DeviceMockup({
  brandName,
  branchName,
  services,
  onBook,
}: {
  brandName: string;
  branchName: string;
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
    <div className="bt-phone w-[280px] sm:w-[300px]" aria-label={`${brandName} booking screen preview`}>
      <div className="bt-phone-screen flex flex-col text-left">
        {/* Mock status bar */}
        <div className="flex items-center justify-between px-5 pt-4 text-[10px] font-semibold text-[#54655A]" aria-hidden="true">
          <span>9:00</span>
          <span className="h-4 w-16 rounded-full bg-[#10221a]" />
          <span>5G ▰</span>
        </div>

        <div className="flex items-center gap-2 px-5 pt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A2F] text-[#EAF0E2]">
            <Leaf size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="bt-serif truncate text-[15px] font-semibold leading-tight text-[#1E3A2F]">{brandName}</p>
            <p className="flex items-center gap-1 text-[10px] text-[#54655A]">
              <MapPin size={10} aria-hidden="true" /> {branchName}, Jaipur
            </p>
          </div>
        </div>

        <p className="bt-serif px-5 pt-4 text-lg font-semibold text-[#1E3A2F]">Book your visit</p>
        <p className="px-5 text-[11px] text-[#54655A]">Pick a treatment and a time that suits you.</p>

        <div className="space-y-2 px-5 pt-3">
          {(featured.length ? featured : [undefined]).map((service, idx) =>
            service ? (
              <div
                key={service.id}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 ${
                  idx === 0 ? 'border-[#4E6E58] bg-[#EAF0E2]' : 'border-[#E3DCCB] bg-white'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#1E3A2F]">{service.name}</p>
                  {service.showDuration !== false && service.durationMinutes > 0 && (
                    <p className="flex items-center gap-1 text-[10px] text-[#54655A]">
                      <Clock3 size={10} aria-hidden="true" /> {service.durationMinutes} min
                    </p>
                  )}
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-[#1E3A2F]">{bodhiFormatInr(service.price)}</span>
                  {idx === 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4E6E58] text-white">
                      <Check size={10} aria-hidden="true" />
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div key="empty" className="rounded-2xl border border-[#E3DCCB] bg-white px-3 py-2.5 text-[12px] text-[#54655A]">
                Massage menu coming soon
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
                  idx === 0 ? 'border-[#1E3A2F] bg-[#1E3A2F] text-[#FAF6EE]' : 'border-[#E3DCCB] bg-white text-[#1E3A2F]'
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
                  idx === 2 ? 'border-[#C5A46D] bg-[#C5A46D] text-[#231a08]' : 'border-[#E3DCCB] bg-white text-[#54655A]'
                }`}
              >
                {time}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto px-5 pb-5 pt-4">
          <button
            type="button"
            onClick={() => onBook(selected)}
            className="bt-btn bt-btn-primary w-full px-4 py-3 text-sm"
          >
            <Calendar size={16} aria-hidden="true" /> Book Now
          </button>
          <p className="pt-2 text-center text-[10px] text-[#54655A]">Pay at the centre · UPI, card or cash (₹)</p>
        </div>
      </div>
    </div>
  );
}
