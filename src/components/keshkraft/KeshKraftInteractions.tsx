import React, { useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, Send, X } from "lucide-react";
import type { SalonProfile, SalonService, Stylist } from "../../types";
import type { DirectBookingSlot } from "../SpecialistWeek";
import { mensConfig, mensImage, mensMediaVisible } from "../../lib/keshkraft";
import { supabase } from "../../lib/supabase";
import {
  addMensWaitlist,
  matchingWaitlistSlot,
  mensSupportReply,
  readMensWaitlist,
  writeMensWaitlist,
  MENS_WAITLIST_EVENT,
  type MensWaitlistEntry,
} from "../../lib/mensWaitlist";

/** Shared accessible dialog, including when the preview lives in an iframe. */
export function MensDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current,
      doc = el?.ownerDocument;
    if (!doc) return;
    const before = doc.activeElement as HTMLElement;
    const previous = doc.body.style.overflow;
    doc.body.style.overflow = "hidden";
    el.querySelector<HTMLElement>("button,input,textarea")?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          el.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],select",
          ),
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && doc.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && doc.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    doc.addEventListener("keydown", keys);
    return () => {
      doc.removeEventListener("keydown", keys);
      doc.body.style.overflow = previous;
      before?.focus?.();
    };
  }, []);
  return (
    <div className="kk-dialog-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="kk-interaction-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function MensLiveChat() {
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState(""),
    [messages, setMessages] = useState([
      {
        role: "assistant",
        text: "Welcome to KeshKraft. I’m a simulated support assistant. Ask about services, prices, barbers or the waitlist.",
      },
    ]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages]);
  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m.slice(-37),
      { role: "customer", text: text.trim() },
      { role: "assistant", text: mensSupportReply(text) },
    ]);
    setMessage("");
  };
  return (
    <>
      <button
        className="kk-live-chat"
        aria-label="Live Chat"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MessageCircle size={23} />
        <span>Live Chat</span>
      </button>
      {open && (
        <MensDialog title="KeshKraft Live Chat" onClose={() => setOpen(false)}>
          <p className="kk-dialog-note">
            Simulated customer support · No live agent · Messages are not sent
            or saved.
          </p>
          <div
            className="kk-chat-messages"
            role="log"
            aria-live="polite"
            aria-label="Support conversation"
          >
            {messages.map((m, i) => (
              <p key={i} className={`kk-chat-${m.role}`}>
                <small>
                  {m.role === "assistant" ? "Style assistant · Demo" : "You"}
                </small>
                {m.text}
              </p>
            ))}
            <div ref={end} />
          </div>
          <div className="kk-chat-prompts">
            {[
              "Haircut prices",
              "Hair colour advice",
              "How does the waitlist work?",
            ].map((q) => (
              <button key={q} onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(message);
            }}
          >
            <label>
              Your support question
              <input
                value={message}
                maxLength={500}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
              />
            </label>
            <button className="kk-btn" disabled={!message.trim()} type="submit">
              Send message <Send size={16} />
            </button>
          </form>
        </MensDialog>
      )}
    </>
  );
}
export function MensPortfolio({
  person,
  profile,
  live,
  onClose,
  onBook,
}: {
  person: Stylist;
  profile: SalonProfile;
  live: boolean;
  onClose: () => void;
  onBook: () => void;
}) {
  const c = mensConfig(profile);
  const owned = (person.workGallery || [])
    .filter((p) => p.consented && mensImage(p.imageUrl, c) === p.imageUrl)
    .map((p) => ({
      id: p.id,
      url: p.imageUrl,
      title: p.caption || "Men’s haircut / colour work",
    }));
  const demo = c.gallery
    .filter((g) => g.stylistId === person.id && mensMediaVisible(g))
    .map((g) => ({ id: g.id, url: mensImage(g.url, c), title: g.title }));
  const assigned = live
    ? demo.filter(
        (g) =>
          !g.url.startsWith("/templates/15/") && g.url === mensImage(g.url, c),
      )
    : demo;
  const entries = owned.length ? owned : assigned;
  return (
    <MensDialog title={`${person.name} — Portfolio`} onClose={onClose}>
      <p className="kk-dialog-note">
        {owned.length
          ? "Approved work supplied by this barber."
          : !live
            ? "Demo portfolio · Assigned AI style references and illustrations, not claims of this barber’s actual work."
            : entries.length
              ? "Reviewed men’s gallery assigned to this barber."
              : "This barber has not added approved work yet."}
      </p>
      <div className="kk-portfolio-grid">
        {entries.map((g) => (
          <figure key={g.id}>
            <img
              loading="lazy"
              src={g.url}
              alt={`${person.name}: ${g.title}`}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/templates/15/placeholder.svg";
              }}
            />
            <figcaption>{g.title}</figcaption>
          </figure>
        ))}
      </div>
      {!entries.length && (
        <p>
          No approved portfolio images yet. Ask the barber about your preferred
          haircut or colour.
        </p>
      )}
      <button className="kk-btn" onClick={onBook}>
        Book with {person.name}
      </button>
    </MensDialog>
  );
}
export function MensStylistChat({
  person,
  profile,
  live,
  onClose,
}: {
  person: Stylist;
  profile: SalonProfile;
  live: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(""),
    [sent, setSent] = useState(false);
  const number = (person.phone || profile.whatsapp || "").replace(/\D/g, "");
  const phone = number.length === 10 ? `91${number}` : number;
  const canSend = live && /^\d{10,15}$/.test(phone);
  return (
    <MensDialog title={`Chat with ${person.name}`} onClose={onClose}>
      <p className="kk-dialog-note">
        {live
          ? "Quick inquiry before booking. Messages are handed off to WhatsApp; this site cannot confirm delivery or a reply."
          : "Demo inquiry · No message will be sent to a real barber."}
      </p>
      <p>
        Ask {person.name} about a haircut, colour shade or your preferred style.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!live) setSent(true);
        }}
      >
        <label>
          Message to {person.name}
          <textarea
            required
            minLength={5}
            maxLength={1000}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSent(false);
            }}
            placeholder="Hi, would a textured crop suit my hair?"
          />
        </label>
        {canSend ? (
          <a
            className="kk-btn"
            aria-disabled={message.trim().length < 5}
            href={
              message.trim().length >= 5
                ? `https://wa.me/${phone}?text=${encodeURIComponent(`Inquiry for ${person.name} at ${profile.businessName}: ${message.trim()}`)}`
                : undefined
            }
            target="_blank"
            rel="noreferrer"
          >
            Send via WhatsApp <Send size={16} />
          </a>
        ) : !live ? (
          <button
            className="kk-btn"
            type="submit"
            disabled={message.trim().length < 5}
          >
            Send demo inquiry <Send size={16} />
          </button>
        ) : (
          <p role="status">
            The studio has not configured a messaging number. Please use its
            published contact details; your message has not been sent.
          </p>
        )}
      </form>
      {sent && (
        <div className="kk-chat-assistant" role="status">
          Demo inquiry prepared for {person.name}. No real message was sent.
          “Thanks for your question—bring your inspiration to the consultation
          before we start.”
        </div>
      )}
    </MensDialog>
  );
}
export function MensJoinWaitlist({
  profile,
  service,
  stylistId,
  date,
  time = "",
  demo = false,
}: {
  profile: SalonProfile;
  service: SalonService;
  stylistId: string;
  date: string;
  time?: string;
  demo?: boolean;
}) {
  const [joined, setJoined] = useState(false),
    [error, setError] = useState(""),
    [alerts, setAlerts] = useState(false),
    [preferredTime, setPreferredTime] = useState(time);
  useEffect(() => {
    setJoined(false);
    setError("");
    setPreferredTime(time);
  }, [service.id, stylistId, date, time]);
  const join = async () => {
    setError("");
    try {
      addMensWaitlist({
        slug: demo ? "demo" : profile.subdomain,
        serviceId: service.id,
        serviceName: service.name,
        stylistId,
        date,
        time: preferredTime,
        browserAlerts: alerts,
      });
      window.dispatchEvent(new Event(MENS_WAITLIST_EVENT));
      setJoined(true);
      if (
        alerts &&
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      )
        try {
          await Notification.requestPermission();
        } catch {
          setError(
            "Saved on this device. Browser notifications are unavailable; in-page alerts still work.",
          );
        }
    } catch {
      setError(
        "Could not save the waitlist on this device. Enable browser storage and try again.",
      );
    }
  };
  return (
    <div className="kk-waitlist">
      <p>
        <Bell size={16} />{" "}
        {time
          ? `${time} unavailable? Request this opening.`
          : "No appointment available? Join the waitlist."}
      </p>
      <p className="kk-dialog-note">
        {demo ? "Demo device waitlist. " : "Device-only alerts. "}We check for
        openings while this website is open. No SMS/email is sent, and no
        appointment is reserved.
      </p>
      {!time && (
        <label>
          Preferred time (optional; leave empty for any opening)
          <input
            type="time"
            aria-label="Preferred waitlist time"
            value={preferredTime}
            onChange={(e) => {
              setPreferredTime(e.target.value);
              setJoined(false);
            }}
          />
        </label>
      )}
      <label>
        <input
          type="checkbox"
          checked={alerts}
          onChange={(e) => setAlerts(e.target.checked)}
        />{" "}
        Allow browser notifications (optional)
      </label>
      <button
        type="button"
        className="kk-btn"
        disabled={joined}
        onClick={() => void join()}
      >
        {joined ? "On waitlist" : "Join Waitlist"}
      </button>
      {joined && (
        <p role="status">
          Saved on this device for {service.name} · {date}
          {preferredTime ? ` · ${preferredTime}` : ""}. Keep the website open
          for availability checks.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function MensWaitlistMonitor({
  live,
  slug,
  onOpening,
}: {
  live: boolean;
  slug: string;
  onOpening: (entry: MensWaitlistEntry, slot: DirectBookingSlot) => void;
}) {
  const [entries, setEntries] = useState<MensWaitlistEntry[]>([]),
    [error, setError] = useState("");
  const callback = useRef(onOpening);
  callback.current = onOpening;
  useEffect(() => {
    const load = () =>
      setEntries(
        readMensWaitlist().filter((e) => e.slug === (live ? slug : "demo")),
      );
    load();
    window.addEventListener(MENS_WAITLIST_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(MENS_WAITLIST_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [live, slug]);
  useEffect(() => {
    if (!live) return;
    let active = true,
      running = false;
    const check = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        for (const entry of readMensWaitlist().filter(
          (e) => e.slug === slug && !e.notified,
        )) {
          const { data, error } = await supabase.rpc("studioflow_mens_slots", {
            p_slug: slug,
            p_service_id: entry.serviceId,
            p_date: entry.date,
            p_stylist_id: entry.stylistId,
          });
          if (!active) return;
          if (error) {
            setError(
              "Availability checks are temporarily unavailable. Requests remain saved; retry by refreshing the page.",
            );
            continue;
          }
          setError("");
          const slot = matchingWaitlistSlot(entry, data || []);
          if (slot) {
            const all = readMensWaitlist();
            if (!all.some((x) => x.id === entry.id && !x.notified)) continue;
            writeMensWaitlist(
              all.map((x) =>
                x.id === entry.id ? { ...x, notified: true } : x,
              ),
            );
            setEntries(
              all
                .filter((x) => x.slug === slug)
                .map((x) => (x.id === entry.id ? { ...x, notified: true } : x)),
            );
            if (
              entry.browserAlerts &&
              typeof Notification !== "undefined" &&
              Notification.permission === "granted"
            )
              try {
                new Notification("KeshKraft: an opening is available", {
                  body: `${entry.serviceName} · ${entry.date} · ${slot.time}. Availability must be rechecked before booking.`,
                });
              } catch {
                /* In-page alert remains available. */
              }
          }
        }
      } catch {
        if (active)
          setError(
            "Waitlist checks paused. Check your connection and refresh.",
          );
      } finally {
        running = false;
      }
    };
    void check();
    const timer = setInterval(() => void check(), 60000);
    window.addEventListener("focus", check);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [live, slug]);
  const remove = (id: string) => {
    try {
      writeMensWaitlist(readMensWaitlist().filter((e) => e.id !== id));
      window.dispatchEvent(new Event(MENS_WAITLIST_EVENT));
    } catch {
      setError("Could not remove this device request. Check browser storage.");
    }
  };
  if (!entries.length && !error) return null;
  return (
    <aside className="kk-waitlist-summary" aria-label="Your device waitlist">
      <h3>Your {live ? "" : "demo "}waitlist</h3>
      {entries.map((e) => (
        <article key={e.id}>
          <p role={e.notified ? "status" : undefined}>
            {e.notified
              ? "Opening detected — recheck availability before booking: "
              : ""}
            {e.serviceName} · {e.date} {e.time}
          </p>
          {!live && !e.notified && (
            <button
              type="button"
              onClick={() => {
                try {
                  writeMensWaitlist(
                    readMensWaitlist().map((x) =>
                      x.id === e.id ? { ...x, notified: true } : x,
                    ),
                  );
                  window.dispatchEvent(new Event(MENS_WAITLIST_EVENT));
                } catch {
                  setError("Could not update demo request.");
                }
              }}
            >
              Simulate opening (demo)
            </button>
          )}
          {e.notified && (
            <button
              type="button"
              onClick={() =>
                callback.current(e, {
                  date: e.date,
                  time: e.time,
                  stylistId: e.stylistId,
                })
              }
            >
              Recheck & book
            </button>
          )}
          <button type="button" onClick={() => remove(e.id)}>
            Remove request
          </button>
        </article>
      ))}
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
export function MensBookingSection({
  profile,
  services,
  team,
  live,
  onBook,
}: {
  profile: SalonProfile;
  services: SalonService[];
  team: Stylist[];
  live: boolean;
  onBook: (
    service: SalonService,
    stylist?: Stylist,
    slot?: DirectBookingSlot,
  ) => void;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [serviceId, setServiceId] = useState(services[0]?.id || ""),
    [staffId, setStaffId] = useState("any_available"),
    [date, setDate] = useState(today),
    [slots, setSlots] = useState<
      | {
          time: string;
          label?: string;
          stylistId: string;
          available?: boolean;
        }[]
      | null
    >(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const selected = services.find((s) => s.id === serviceId) || services[0];
  const selectionKey = `${profile.subdomain}|${selected?.id}|${staffId}|${date}`;
  const currentSelection = useRef(selectionKey);
  currentSelection.current = selectionKey;
  const request = useRef(0);
  useEffect(() => {
    setSlots(null);
    setError("");
    setBusy(false);
  }, [serviceId, staffId, date]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const check = async () => {
    if (!selected || !date || date < today) return;
    const key = currentSelection.current,
      id = ++request.current;
    const current = () =>
      currentSelection.current === key && request.current === id;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("studioflow_mens_slots", {
        p_slug: profile.subdomain,
        p_service_id: selected.id,
        p_date: date,
        p_stylist_id: staffId,
      });
      if (!current()) return;
      if (error) throw error;
      setSlots(data || []);
    } catch {
      if (!current()) return;
      setError(
        "Availability could not load. Retry before joining the waitlist.",
      );
      setSlots(null);
    } finally {
      if (current()) setBusy(false);
    }
  };
  return (
    <section id="kk-booking" className="kk-section kk-booking-section">
      <p className="kk-eyebrow">YOUR NEXT VISIT</p>
      <h2>
        A chair for <em>your next look.</em>
      </h2>
      <p>
        Check live availability, or request an alert when an unavailable
        appointment opens.
      </p>
      {!live && (
        <p className="kk-dialog-note">
          Demo booking section · The waitlist example below does not represent a
          real fully booked day.
        </p>
      )}
      {selected ? (
        <>
          <div className="kk-booking-fields">
            <label>
              Booking service
              <select
                value={selected.id}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Booking barber
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              >
                <option value="any_available">Any Available Barber</option>
                {team.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Appointment date
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          {live ? (
            <button
              className="kk-btn"
              disabled={busy || !date || date < today}
              onClick={() => void check()}
            >
              {busy ? "Checking…" : "Check available slots"}
            </button>
          ) : (
            <button className="kk-outline" onClick={() => setSlots([])}>
              Preview fully booked example
            </button>
          )}
          {error && <p role="alert">{error}</p>}
          {slots !== null && !busy && (
            <>
              <div className="kk-slot-list">
                {slots
                  .filter((s) => s.available !== false)
                  .map((s) => (
                    <button
                      className="kk-outline"
                      key={`${s.time}-${s.stylistId}`}
                      onClick={() =>
                        onBook(
                          selected,
                          team.find((t) => t.id === s.stylistId),
                          { date, time: s.time, stylistId: s.stylistId },
                        )
                      }
                    >
                      {s.label || s.time} · Book
                    </button>
                  ))}
              </div>
              {!slots.some((s) => s.available !== false) && (
                <MensJoinWaitlist
                  key={`${selected.id}-${staffId}-${date}`}
                  profile={profile}
                  service={selected}
                  stylistId={staffId}
                  date={date}
                  demo={!live}
                />
              )}
            </>
          )}
        </>
      ) : (
        <p>The studio is updating its bookable menu.</p>
      )}
    </section>
  );
}
