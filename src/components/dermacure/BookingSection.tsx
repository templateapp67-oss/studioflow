import { clinicPriceIsVerified } from "../../lib/dermacureContent";
import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from "./EditorialImage";
import { BookingFAQ } from "./BookingFAQ";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useDermacure } from "./context";
import { consultationPhone } from "./consultation";

type Slot = { time: string; stylistId: string; available?: boolean };
export function BookingSection() {
  const {
    visible,
    bookingAvailable,
    selectedService,
    setSelectedService,
    services,
    onBook,
    booking,
    profile,
  } = useDermacure();
  const bookableServices = services.filter(clinicPriceIsVerified);
  const validSelection = bookableServices.some(s => s.id === selectedService);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const maxDate = new Date(Date.parse(`${today}T12:00:00Z`) + 90 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [date, setDate] = useState(today),
    [time, setTime] = useState(""),
    [message, setMessage] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setTime("");
    setSlots([]);
    setError("");
    setNotice("");
    if (
      !bookingAvailable ||
      !selectedService ||
      !validSelection ||
      !date ||
      date < today ||
      date > maxDate
    ) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const result = await supabase.rpc("studioflow_android_slots", {
          p_slug: profile.subdomain,
          p_services: [selectedService],
          p_date: date,
          p_stylist: "any",
        });
        if (result.error) throw result.error;
        if (active)
          setSlots(
            (Array.isArray(result.data) ? result.data : []).filter(
              (slot: Slot) =>
                slot.available !== false && slot.time && slot.stylistId,
            ),
          );
      } catch {
        if (active) setError("Availability could not load. Please retry.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    bookingAvailable,
    validSelection,
    profile.subdomain,
    selectedService,
    date,
    retry,
    today,
    maxDate,
  ]);
  if (!visible.bookings) return null;
  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice("");
    const cleanPhone = consultationPhone(phone),
      slot = slots.find((s) => s.time === time),
      service = bookableServices.find((s) => s.id === selectedService);
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!service || !slot || date < today || date > maxDate) {
      setError("Choose a treatment, date and an available time.");
      return;
    }
    setError("");
    onBook(service, {
      name: name.trim(),
      phone: cleanPhone,
      date,
      time,
      stylistId: slot.stylistId,
      message: message.trim(),
    });
    setNotice(
      "Details transferred to secure booking. Your appointment is not confirmed until checkout is completed.",
    );
  }
  return (
    <section className="dc-booking" id="booking">
      <div className="dc-booking-image">
        <EditorialImage
          fallback={NEUTRAL_CLINIC_IMAGE}
          src="/templates/dermacure/reference-interior.webp"
          alt="Illustrative aesthetic clinic interior"
          loading="lazy"
        />
      </div>
      <div className="dc-booking-copy">
        <p className="dc-eyebrow">
          <span /> GET IN TOUCH
        </p>
        <h2>
          Book Your <em>Consultation</em>
        </h2>
        <p>
          Choose your treatment and a live appointment time. We’ll securely
          carry your details into the existing booking checkout.
        </p>
        {bookingAvailable ? (
          <form className="dc-booking-form" onSubmit={submit}>
            <div className="dc-form-grid">
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Mobile number
                <input
                  name="tel"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  maxLength={18}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </div>
            <label htmlFor="dc-service">Preferred treatment</label>
            <select
              id="dc-service"
              required
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="">Choose a treatment</option>
              {bookableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {selectedService && bookableServices.find(s => s.id === selectedService) && <p role="status">{(() => { const s = bookableServices.find(item => item.id === selectedService)!; return `${s.name} · ${profile.currency || "₹"}${s.price.toLocaleString("en-IN")}${s.showDuration !== false && s.durationMinutes > 0 ? ` · ${s.durationMinutes} min` : ""}`; })()}</p>}
            <div className="dc-form-grid">
              <label>
                Preferred date
                <input
                  type="date"
                  required
                  min={today}
                  max={maxDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Preferred time (IST)
                <select
                  required
                  value={time}
                  disabled={loading || !slots.length}
                  onChange={(e) => setTime(e.target.value)}
                >
                  <option value="">
                    {loading
                      ? "Checking availability…"
                      : "Choose an available time"}
                  </option>
                  {[...new Set(slots.map((s) => s.time))].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {loading && (
              <p role="status">Checking the clinic’s live availability…</p>
            )}
            {!loading && selectedService && !slots.length && !error && (
              <p role="status">
                No available appointments for this date. Please choose another
                date.
              </p>
            )}
            <label>
              Optional message
              <textarea
                maxLength={1000}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-describedby="dc-message-help"
              />
            </label>
            <small id="dc-message-help">
              Up to 1,000 characters. Please do not include sensitive medical
              records.
            </small>
            {error && (
              <div role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className="dc-text-link"
                  onClick={() => setRetry((v) => v + 1)}
                >
                  Retry availability
                </button>
              </div>
            )}
            <button
              className="dc-btn"
              type="submit"
              disabled={loading || !time}
            >
              Continue to booking <ArrowUpRight size={16} />
            </button>
            <small>
              Availability is rechecked at checkout. Sign-in and any required
              advance payment are completed securely there.
            </small>
            {notice && <p role="status">{notice}</p>}
          </form>
        ) : (
          <>
            <button className="dc-btn" onClick={booking}>
              Contact the Clinic <ArrowUpRight size={16} />
            </button>
            <small>
              Online booking is not currently available. Please contact the
              clinic for enquiries.
            </small>
          </>
        )}
        {bookingAvailable && <BookingFAQ />}
      </div>
    </section>
  );
}
