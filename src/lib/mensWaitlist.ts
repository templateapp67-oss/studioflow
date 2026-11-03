export interface MensWaitlistEntry {
  id: string;
  slug: string;
  serviceId: string;
  serviceName: string;
  stylistId: string;
  date: string;
  time: string;
  notified: boolean;
  browserAlerts?: boolean;
}
export const MENS_WAITLIST_KEY = "studioflow_mens_waitlist_v1";
export const MENS_WAITLIST_EVENT = "keshkraft-waitlist-change";
export function readMensWaitlist(
  storage?: Pick<Storage, "getItem">,
): MensWaitlistEntry[] {
  try {
    const data = JSON.parse(
      (storage || globalThis.localStorage).getItem(MENS_WAITLIST_KEY) || "[]",
    );
    return Array.isArray(data)
      ? data
          .filter(
            (x) =>
              x &&
              typeof x.id === "string" &&
              typeof x.slug === "string" &&
              typeof x.serviceId === "string" &&
              typeof x.serviceName === "string" &&
              typeof x.stylistId === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
              /^(|\d{2}:\d{2})$/.test(x.time),
          )
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
export function writeMensWaitlist(
  entries: MensWaitlistEntry[],
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  storage.setItem(MENS_WAITLIST_KEY, JSON.stringify(entries));
}
export function addMensWaitlist(
  entry: Omit<MensWaitlistEntry, "id" | "notified">,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
) {
  if (
    !entry.slug ||
    !entry.serviceId ||
    !entry.stylistId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
    Number.isNaN(Date.parse(entry.date)) ||
    new Date(entry.date).toISOString().slice(0, 10) !== entry.date ||
    !/^(|(?:[01]\d|2[0-3]):[0-5]\d)$/.test(entry.time)
  )
    throw new Error("Choose a valid appointment date and time.");
  const entries = readMensWaitlist(storage);
  const existing = entries.find(
    (x) =>
      x.slug === entry.slug &&
      x.serviceId === entry.serviceId &&
      x.stylistId === entry.stylistId &&
      x.date === entry.date &&
      x.time === entry.time &&
      !x.notified,
  );
  if (existing) return existing;
  if (entries.length >= 30)
    throw new Error(
      "Your device waitlist is full. Remove an old request first.",
    );
  const next = { ...entry, id: crypto.randomUUID(), notified: false };
  writeMensWaitlist([...entries, next], storage);
  return next;
}
export function matchingWaitlistSlot(
  entry: MensWaitlistEntry,
  slots: { available?: boolean; time: string; stylistId?: string }[],
) {
  return slots.find(
    (s) =>
      s.available === true &&
      (!entry.time || entry.time === s.time) &&
      (["any", "any_available", "any-specialist"].includes(entry.stylistId) ||
        entry.stylistId === s.stylistId),
  );
}
export function mensSupportReply(message: string) {
  const q = message.toLowerCase();
  if (/price|cost|rate|₹/.test(q))
    return "Haircut and colour prices are shown in the service menu in INR. Pick a service to see its duration and price; preview prices are examples until the studio confirms them.";
  if (/colour|color|grey|highlight/.test(q))
    return "Our men’s colour menu includes grey coverage, brown shades and highlights. Ask your chosen barber about shade suitability and sensitivity checks before booking.";
  if (/wait|full|slot|cancel/.test(q))
    return "If no appointment is available, choose Join Waitlist in the booking section. Device alerts check for openings while this website stays open. Joining does not reserve a chair.";
  if (/hour|open|address|where/.test(q))
    return "Opening hours and the studio address are in Visit us. Preview contact details must be confirmed by the studio.";
  if (/barber|stylist|artist|portfolio/.test(q))
    return "Open Our barbers, then View Portfolio to explore an individual barber’s approved work. Chat with Stylist lets you prepare a quick inquiry before booking.";
  return "I can help with men’s haircuts, hair colour, prices, barbers and waitlist questions. This is a simulated assistant, not a live human agent. For personal advice, use Chat with Stylist or the studio contact details.";
}
