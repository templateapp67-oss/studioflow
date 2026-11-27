/** Booking dates are calendar dates in India, not the browser's local timezone. */
const IST = 'Asia/Kolkata';

export function indiaDate(offset = 0, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || '';
  const base = Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day')));
  return new Date(base + offset * 86_400_000).toISOString().slice(0, 10);
}

export function indiaDateLabel(date: string, options: Intl.DateTimeFormatOptions = {day:'numeric', month:'short', weekday:'short'}): string {
  return new Intl.DateTimeFormat('en-IN', {...options, timeZone: IST}).format(new Date(`${date}T12:00:00+05:30`));
}

/** Calendar cutoff for an age check, independent of the browser timezone. */
export function indiaDateYearsAgo(years: number, now = new Date()): string {
  const [year, month, day] = indiaDate(0, now).split('-').map(Number);
  return new Date(Date.UTC(year - years, month - 1, day)).toISOString().slice(0, 10);
}
