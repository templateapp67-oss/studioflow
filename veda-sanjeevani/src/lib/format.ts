export const MEDICAL_DISCLAIMER = 'Ayurvedic therapies support general wellness and do not replace medical treatment. Consult your doctor, especially if pregnant or under treatment.';
export const inr = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const timeIST = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value));
export const dateIST = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value.length === 10 ? `${value}T12:00:00+05:30` : value));
export function todayIST(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function addDays(date: string, days: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export function normalizePhone(value: string) { return value.replace(/\s+/g, '').replace(/^(\+91|0091|0)/, ''); }
export const isIndianPhone = (value: string) => /^[6-9]\d{9}$/.test(normalizePhone(value));
export function phoneHref(value: string) { const digits = value.replace(/\D/g, ''); return digits.length >= 10 ? `tel:+${digits.length === 10 ? '91' : ''}${digits}` : null; }
export function whatsappHref(value: string) { const digits = value.replace(/\D/g, ''); return digits.length >= 10 ? `https://wa.me/${digits.length === 10 ? '91' : ''}${digits}` : null; }
export function safeExternalUrl(value: string | null | undefined) { if (!value) return null; try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
export function sectionContent(body: string) { try { const parsed: unknown = JSON.parse(body); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>; } catch { /* Plain text is the normal database format. */ } return { text: body }; }
export function textFrom(value: unknown, fallback = '') { return typeof value === 'string' ? value : fallback; }
