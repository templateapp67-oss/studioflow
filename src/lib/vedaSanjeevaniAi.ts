/**
 * Template 14 — AI content contract + offline drafting.
 *
 * Shared by the browser (`requestVedaAiContent`) and the Node server
 * (`/api/veda-website-content`), so the shape of generated content can never
 * drift between the two. Contains no React and no browser APIs.
 *
 * The fallback drafts real, on-brand copy from the owner's business details —
 * never `lorem ipsum` — and every response is labelled with its source so the
 * dashboard can say honestly whether Gemini wrote it or the template did.
 */

export type VedaAiMode =
  | 'all'
  | 'announcement'
  | 'hero'
  | 'philosophy'
  | 'therapies'
  | 'services'
  | 'signature'
  | 'why'
  | 'experts'
  | 'gallery'
  | 'packages'
  | 'offers'
  | 'testimonials'
  | 'faq'
  | 'contact'
  | 'seo';

export interface VedaAiServiceInput {
  id?: string;
  name: string;
  category?: string;
  price?: number | null;
  durationMinutes?: number;
}

/** Every mode the endpoint accepts (shared by the server + dashboard). */
export const VEDA_AI_MODE_IDS: VedaAiMode[] = [
  'all',
  'announcement',
  'hero',
  'philosophy',
  'therapies',
  'services',
  'signature',
  'why',
  'experts',
  'gallery',
  'packages',
  'offers',
  'testimonials',
  'faq',
  'contact',
  'seo',
];

export interface VedaAiDetails {
  businessName: string;
  city?: string;
  address?: string;
  category?: string;
  tagline?: string;
  phone?: string;
  about?: string;
  services?: VedaAiServiceInput[];
  tone?: string;
}

type Heading = { eyebrow?: string; title?: string; body?: string };

export interface VedaAiContent {
  announcement?: { text?: string; linkLabel?: string };
  hero?: { eyebrow?: string; headline?: string; description?: string; caption?: string; primaryCta?: string; secondaryCta?: string };
  philosophy?: Heading & { quote?: string; signature?: string };
  therapies?: Heading;
  signature?: Heading & { items?: Array<{ title?: string; body?: string; meta?: string }> };
  why?: Heading & { items?: Array<{ title?: string; body?: string }> };
  experts?: Heading & {
    people?: Array<{ name?: string; role?: string; bio?: string; specialties?: string[]; experienceYears?: number; qualifications?: string[] }>;
  };
  gallery?: Heading;
  packages?: Heading & { items?: Array<{ name?: string; tagline?: string; duration?: string; sessions?: string; includes?: string[]; price?: number; originalPrice?: number }> };
  offers?: Heading & { items?: Array<{ title?: string; body?: string; badge?: string; code?: string; voucher?: boolean }> };
  testimonials?: Heading & { items?: Array<{ name?: string; location?: string; quote?: string; treatment?: string; rating?: number }> };
  faq?: Heading & { items?: Array<{ question?: string; answer?: string }> };
  contact?: Heading & { hours?: Array<{ label?: string; value?: string }> };
  seo?: { title?: string; description?: string; keywords?: string };
  services?: Array<{
    id?: string;
    name?: string;
    category?: string;
    description?: string;
    benefits?: string[];
    durationMinutes?: number;
    price?: number | null;
    popular?: boolean;
  }>;
  imagePrompts?: Array<{ id?: string; label?: string; prompt?: string }>;
}

export const VEDA_ANNOUNCEMENT_FALLBACK = 'First visit? Take 15% off any single ritual with code VEDA15.';

const city = (details: VedaAiDetails) => (details.city || '').trim() || 'your city';
const name = (details: VedaAiDetails) => (details.businessName || '').trim() || 'Veda Sanjeevani';
const shortCity = (details: VedaAiDetails) => city(details).split(',')[0];

const splitHeadline = (line: string) => line;

/**
 * Deterministic, brand-safe draft used when no AI key is configured (or the
 * provider is unreachable). Copy is written for an Ayurvedic wellness spa and
 * uses the owner's own name, city and service list, so it still reads specific.
 */
export function buildVedaFallbackContent(mode: VedaAiMode, details: VedaAiDetails): VedaAiContent {
  const brand = name(details);
  const place = shortCity(details);
  const services = details.services?.length ? details.services : undefined;
  const pick = (index: number) => services?.[index]?.name;

  const hero: VedaAiContent['hero'] = {
    eyebrow: `Ayurvedic wellness & spa · ${place}`,
    headline: splitHeadline('Return to your\nnatural rhythm.'),
    description: `${brand} is a small Ayurvedic sanctuary in ${place}: warm oils, unhurried hands and rooms that stay quiet. Every ritual begins with a conversation about your week, not a menu.`,
    caption: 'The Shirodhara room, early morning',
    primaryCta: 'Book a ritual',
    secondaryCta: 'Explore therapies',
  };

  const philosophy: VedaAiContent['philosophy'] = {
    eyebrow: 'Our philosophy',
    title: 'Ayurveda as care,\nnot as a checklist.',
    body: `We keep ${brand} deliberately small: a handful of treatment rooms, a physician who reads the pulse before recommending anything, and therapists who ask how much pressure you actually want. The traditions we follow are centuries old; the way we explain them is plain.`,
    quote: '“The first ten minutes are a conversation. Everything after that is yours.”',
    signature: 'The Vaidya at ' + brand,
  };

  const therapies: VedaAiContent['therapies'] = {
    eyebrow: 'Featured therapies',
    title: 'Rituals for your\nkind of balance.',
    body: services?.length
      ? `${services.length} therapist-led rituals, from ${pick(0) || 'Abhyanga'} to ${pick(services.length - 1) || 'a herbal steam'}. Prices and durations are published, and every session can be adjusted on the day.`
      : 'Twenty therapist-led rituals across body, head and mind, with published prices and honest durations.',
  };

  const packages: VedaAiContent['packages'] = {
    eyebrow: 'Wellness packages',
    title: 'Plans, not\nupsells.',
    body: 'Each package states exactly what is included and how long it takes. Nothing is added at the desk.',
    items: [
      { name: 'First Visit Ritual', tagline: 'A gentle introduction, planned with you.', duration: '90 minutes', sessions: 'One visit', includes: ['Dosha discovery session', 'Abhyanga full-body massage', 'Herbal tea and rest'], price: 3600, originalPrice: 4200 },
      { name: 'Shirodhara Sanctuary', tagline: 'For the weeks that will not slow down.', duration: '3 × 60 minutes', sessions: 'Three sittings', includes: ['Shirodhara warm oil stream', 'Shiro abhyanga', 'Home routine notes'], price: 7200, originalPrice: 8400 },
      { name: 'Couple’s Slow Sunday', tagline: 'One suite, two therapists, no clocks.', duration: '2.5 hours', sessions: 'One visit for two', includes: ['Private couple suite', 'Synchronised Abhyanga', 'Tea and fruit afterwards'], price: 9600, originalPrice: 11000 },
    ],
  };

  const offers: VedaAiContent['offers'] = {
    eyebrow: 'Offers & gift vouchers',
    title: 'A little something\nfor the first visit.',
    body: 'Offers change with the season. Vouchers stay valid until their printed date and can be used against any ritual.',
    items: [
      { title: 'First Ritual, 15% Off', body: '15% off any single therapy on weekdays before 4 pm. One per guest.', badge: 'New guest', code: 'VEDA15', voucher: false },
      { title: 'Gift an Ayurvedic Ritual', body: 'A hand-written voucher for any therapy or package, valid for a year and couriered within ' + place + '.', badge: 'Gift voucher', code: '', voucher: true },
      { title: 'Bring a Companion', body: 'Book a two-hour ritual and your companion joins the couple suite at 20% off on weekdays.', badge: 'Together', code: 'TOGETHER20', voucher: false },
    ],
  };

  const testimonials: VedaAiContent['testimonials'] = {
    eyebrow: 'Guest stories',
    title: 'What guests tell us\nafterwards.',
    body: 'Sample stories shown while you collect your first real reviews. Replace these with quotes from your own guests before you publish.',
    items: [
      { name: 'Sample guest', location: place, quote: 'I booked after a difficult work month and slept properly for the first time in weeks. Nothing was rushed.', treatment: pick(1) || 'Shirodhara', rating: 5 },
      { name: 'Sample guest', location: place, quote: 'The consultation was honest — I was told what would help and what would not be claimed. That built trust immediately.', treatment: pick(0) || 'Abhyanga', rating: 5 },
      { name: 'Sample guest', location: place, quote: 'Quiet rooms, warm oil and a proper cup of tea at the end. I have already rebooked.', treatment: pick(2) || 'Abhyanga', rating: 5 },
    ],
  };

  const faq: VedaAiContent['faq'] = {
    eyebrow: 'Good to know',
    title: 'Questions guests\nask us most.',
    body: `If your question is not here, message ${brand} on WhatsApp — a person replies, usually within the hour.`,
    items: [
      { question: 'What should I expect on a first visit?', answer: 'Arrive ten minutes early for a short conversation about your routine, sleep and any tightness. Your therapist explains the ritual and the oil before you begin.' },
      { question: 'Do I need to book in advance?', answer: 'Weekday mornings are usually available at a day’s notice. Evenings, weekends and the couple suite book first — three to four days ahead is comfortable.' },
      { question: 'Do you treat medical conditions?', answer: 'No. We offer traditional wellness rituals and lifestyle guidance. We do not diagnose, cure or replace medical care.' },
      { question: 'What is your cancellation policy?', answer: 'Reschedule or cancel at least six hours before your slot at no charge. Later cancellations are charged at 50%.' },
    ],
  };

  const seo: VedaAiContent['seo'] = {
    title: `${brand} | Ayurvedic Wellness & Spa in ${place}`.slice(0, 70),
    description: `Abhyanga, Shirodhara and Ayurvedic wellness rituals in ${place}. Physician-led consultations, published prices and unhurried treatment rooms. Book on WhatsApp.`.slice(0, 200),
    keywords: `ayurvedic spa ${place}, abhyanga ${place}, shirodhara ${place}, ayurvedic massage ${place}, wellness spa ${place}`,
  };

  const servicesContent: VedaAiContent['services'] = services?.map((service, index) => ({
    id: service.id,
    name: service.name,
    category: service.category,
    durationMinutes: service.durationMinutes,
    price: service.price ?? null,
    description: describeService(service.name, service.category || '', place, brand),
    benefits: benefitsFor(service.name, service.category || ''),
    popular: index < 3,
  }));

  const experts: VedaAiContent['experts'] = {
    eyebrow: 'Our Ayurvedic experts',
    title: 'The people who\nwill look after you.',
    body: 'A physician, a senior therapist and a therapy specialist. You can ask for any of them when you book.',
    people: [
      { name: 'Vaidya (your physician)', role: 'BAMS Ayurvedic Physician', bio: `Leads consultations at ${brand}, taking the pulse first and explaining every suggestion in plain language before a therapy is booked.`, specialties: ['Nadi Pariksha', 'Panchakarma planning', 'Dosha balancing'], experienceYears: 12, qualifications: ['BAMS'] },
      { name: 'Senior therapist', role: 'Senior Ayurvedic Therapist', bio: 'Trained in Kerala. Guests ask for her by name for the four-hand Abhyanga and Shirodhara.', specialties: ['Abhyanga', 'Shirodhara', 'Herbal potli'], experienceYears: 9, qualifications: ['Ayurvedic Panchakarma Therapist'] },
      { name: 'Therapy specialist', role: 'Panchakarma Specialist', bio: 'Looks after the ritual rooms and the steam suite, and advises on oil choices for sensitive skin.', specialties: ['Pizhichil', 'Udvartana', 'Swedana'], experienceYears: 7, qualifications: ['Certified Panchakarma Technician'] },
    ],
  };

  const why: VedaAiContent['why'] = {
    eyebrow: 'Why ' + brand,
    title: 'Small on purpose.',
    body: 'No queues in the corridor and no hard sell at the desk. Just a quiet house of practice that takes its time.',
    items: [
      { title: 'Physician-led planning', body: 'Consultations are taken by a qualified Ayurvedic physician, and plans are written down.' },
      { title: 'Experienced therapists', body: 'Traditional oil sequences, taught properly and practised daily.' },
      { title: 'Honest pricing', body: 'Prices are published, quoted before the ritual and never changed at the desk.' },
      { title: 'Fresh herbs, warmed oils', body: 'Pastes and poultices are prepared in small batches the morning they are used.' },
    ],
  };

  const signature: VedaAiContent['signature'] = {
    eyebrow: 'Signature experiences',
    title: 'Three things we do\nbetter than anyone in ' + place + '.',
    body: 'Not a longer menu — a deeper one.',
    items: [
      { title: 'The Four-Hand Abhyanga', body: 'Two therapists, one rhythm, warm oil worked from shoulders to feet on a carved wood droni.', meta: '75 minutes · two therapists' },
      { title: 'The Shirodhara Hour', body: 'A brass vessel, a thread of warm oil and a room kept deliberately quiet.', meta: '60 minutes · silent rest after' },
      { title: 'The Garden Rest', body: 'Every ritual ends with tea in the courtyard and no one hurrying you out of the chair.', meta: 'Included with every visit' },
    ],
  };

  const gallery: VedaAiContent['gallery'] = {
    eyebrow: 'The sanctuary',
    title: 'A look inside\nthe house.',
    body: 'Treatment rooms, the preparation kitchen and the courtyard where every ritual ends.',
  };

  const contact: VedaAiContent['contact'] = {
    eyebrow: 'Visit us',
    title: details.address ? `${details.address.split(',')[0]}` : `Find us in ${place}`,
    body: `Please arrive ten minutes before your ritual so the first conversation is not rushed. Parking is available on site.`,
    hours: [
      { label: 'Monday – Friday', value: '9:30 am – 8:00 pm' },
      { label: 'Saturday', value: '9:00 am – 8:30 pm' },
      { label: 'Sunday', value: '10:00 am – 6:00 pm' },
    ],
  };

  const announcement = {
    text: 'Now taking bookings — first ritual 15% off with code VEDA15.',
    linkLabel: 'Reserve a ritual',
  };

  const all: VedaAiContent = {
    announcement,
    hero,
    philosophy,
    therapies,
    services: servicesContent,
    signature,
    why,
    experts,
    gallery,
    packages,
    offers,
    testimonials,
    faq,
    contact,
    seo,
  };

  if (mode === 'all') return all;
  const key = mode as keyof VedaAiContent;
  if (mode === 'services') return { services: servicesContent, therapies };
  if (mode === 'packages') return { packages };
  if (mode === 'offers') return { offers };
  if (mode === 'experts') return { experts };
  if (mode === 'faq') return { faq };
  if (mode === 'testimonials') return { testimonials };
  if (mode === 'seo') return { seo };
  if (mode === 'announcement') return { announcement };
  if (mode === 'contact') return { contact };
  if (key in all) return { [key]: (all as any)[key] } as VedaAiContent;
  return all;
}

function describeService(serviceName: string, category: string, place: string, brand: string): string {
  const lower = `${serviceName} ${category}`.toLowerCase();
  if (/shirodhara/.test(lower)) return 'A continuous thread of warm herbal oil is poured across the forehead while you rest. Guests most often describe it as the deepest quiet of the whole visit.';
  if (/abhyanga|massage|pizhichil/.test(lower)) return `A slow, rhythmical ${serviceName.toLowerCase()} with warm medicated oil worked along the body’s natural lines. Pressure is checked at the start and adjusted midway.`;
  if (/scrub|udvartana/.test(lower)) return 'A herbal powder or paste worked in firm, even strokes, followed by a warm shower and a light oil finish.';
  if (/potli|kizhi|poultice/.test(lower)) return 'Warm linen boluses of medicinal leaves and rice are pressed and rolled over tired shoulders, back and knees.';
  if (/reflex|foot/.test(lower)) return 'Warm oil, a brass bowl and firm thumb work along the soles — a quiet close to a long day.';
  if (/steam|swedana/.test(lower)) return 'A short, warm herbal steam with eucalyptus and tulsi, best paired with an oil therapy.';
  if (/consult|dosha|panchakarma/.test(lower)) return `A one-to-one session with the physician at ${brand}: pulse reading, routine review and a written plan. Therapy sessions are quoted separately and only suggested where appropriate.`;
  if (/face|lepam|mukha/.test(lower)) return 'A gentle exfoliation followed by a cool herbal paste, left to settle while you rest.';
  return `A therapist-led Ayurvedic ritual at ${brand} in ${place}, adjusted to your comfort on the day and finished with herbal tea.`;
}

function benefitsFor(serviceName: string, category: string): string[] {
  const lower = `${serviceName} ${category}`.toLowerCase();
  if (/shirodhara/.test(lower)) return ['Continuous warm oil stream', 'Head, neck and shoulder comfort work', 'Silent rest afterwards'];
  if (/abhyanga|massage/.test(lower)) return ['Warm oil chosen for your dosha', 'Pressure checked midway', 'Warm towel and herbal tea after'];
  if (/scrub|udvartana/.test(lower)) return ['Herbal blend mixed fresh', 'Firm, even strokes', 'Warm shower finish'];
  if (/potli|kizhi/.test(lower)) return ['Poultices warmed to order', 'Focused on shoulders and back', 'Dry towel warmth after'];
  if (/consult|panchakarma|dosha/.test(lower)) return ['Pulse reading and routine review', 'Written notes to take home', 'Clear pricing before any therapy'];
  return ['Traditional sequence', 'Comfort checked midway', 'Herbal tea afterwards'];
}

/* ------------------------------------------------------------------ *
 * Prompt for the model (kept server-side, but exported for tests)
 * ------------------------------------------------------------------ */

export const VEDA_AI_SYSTEM_PROMPT =
  'You are a senior copywriter for luxury Ayurvedic wellness brands in India. You write warm, specific, quietly confident English with no hype. You never claim to cure, treat or diagnose a medical condition, never promise a health outcome, and never invent prices, awards, certifications or reviews that were not supplied. Return ONLY valid JSON that matches the requested schema — no markdown, no commentary.';

export function buildVedaAiPrompt(mode: VedaAiMode, details: VedaAiDetails): string {
  const serviceList = (details.services || [])
    .map((service) => `- ${service.name} (${service.category || 'therapy'}, ${service.price ?? 'price on request'} INR, ${service.durationMinutes ?? 60} min)`)
    .join('\n');
  return [
    `Business: ${details.businessName}`,
    details.city ? `City: ${details.city}` : '',
    details.address ? `Address: ${details.address}` : '',
    details.category ? `Category: ${details.category}` : 'Category: Ayurvedic wellness spa',
    details.tagline ? `Existing tagline: ${details.tagline}` : '',
    details.about ? `Owner notes: ${details.about}` : '',
    serviceList ? `Current service menu:\n${serviceList}` : '',
    `Task: ${mode === 'all' ? 'write every section of the website' : `write only the ${mode} section`}.`,
    'Rules:',
    '1. Indian English, ₹ prices, no emoji, no exclamation marks.',
    '2. Headlines may contain a single \\n line break. Keep headlines under 70 characters.',
    '3. Descriptions: 2–3 sentences, concrete details (oils, rooms, pressure, timing), no medical claims.',
    '4. Testimonials must be clearly marked as samples in the copy (e.g. "Sample guest") unless real quotes were provided.',
    '5. JSON schema keys allowed: announcement, hero, philosophy, therapies, services, signature, why, experts, gallery, packages, offers, testimonials, faq, contact, seo, imagePrompts.',
    '6. Only include the keys needed for the requested task.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Normalise whatever the model returned into the contract above. */
export function sanitizeVedaAiContent(input: unknown): VedaAiContent {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, any>;
  const text = (value: unknown, max = 800) => (typeof value === 'string' ? value.replace(/\r/g, '').trim().slice(0, max) : undefined);
  const head = (value: any): Heading => ({
    eyebrow: text(value?.eyebrow, 120),
    title: text(value?.title, 200),
    body: text(value?.body, 1200),
  });
  const out: VedaAiContent = {};
  if (raw.announcement) out.announcement = { text: text(raw.announcement.text, 200), linkLabel: text(raw.announcement.linkLabel, 60) };
  if (raw.hero) out.hero = { eyebrow: text(raw.hero.eyebrow, 120), headline: text(raw.hero.headline, 120), description: text(raw.hero.description, 500), caption: text(raw.hero.caption, 120), primaryCta: text(raw.hero.primaryCta, 40), secondaryCta: text(raw.hero.secondaryCta, 40) };
  if (raw.philosophy) out.philosophy = { ...head(raw.philosophy), quote: text(raw.philosophy.quote, 300), signature: text(raw.philosophy.signature, 80) };
  if (raw.therapies) out.therapies = head(raw.therapies);
  if (raw.signature) out.signature = { ...head(raw.signature), items: Array.isArray(raw.signature.items) ? raw.signature.items.slice(0, 4).map((item: any) => ({ title: text(item?.title, 80), body: text(item?.body, 400), meta: text(item?.meta, 120) })) : undefined };
  if (raw.why) out.why = { ...head(raw.why), items: Array.isArray(raw.why.items) ? raw.why.items.slice(0, 6).map((item: any) => ({ title: text(item?.title, 80), body: text(item?.body, 300) })) : undefined };
  if (raw.experts) out.experts = { ...head(raw.experts), people: Array.isArray(raw.experts.people) ? raw.experts.people.slice(0, 6).map((person: any) => ({ name: text(person?.name, 60), role: text(person?.role, 80), bio: text(person?.bio, 500), specialties: Array.isArray(person?.specialties) ? person.specialties.slice(0, 5).map((entry: unknown) => text(entry, 40)).filter(Boolean) as string[] : undefined, experienceYears: Number.isFinite(Number(person?.experienceYears)) ? Math.max(0, Math.round(Number(person.experienceYears))) : undefined, qualifications: Array.isArray(person?.qualifications) ? person.qualifications.slice(0, 3).map((entry: unknown) => text(entry, 60)).filter(Boolean) as string[] : undefined })) : undefined };
  if (raw.gallery) out.gallery = head(raw.gallery);
  if (raw.packages) out.packages = { ...head(raw.packages), items: Array.isArray(raw.packages.items) ? raw.packages.items.slice(0, 6).map((item: any) => ({ name: text(item?.name, 80), tagline: text(item?.tagline, 160), duration: text(item?.duration, 60), sessions: text(item?.sessions, 60), includes: Array.isArray(item?.includes) ? item.includes.slice(0, 8).map((entry: unknown) => text(entry, 120)).filter(Boolean) as string[] : undefined, price: Number.isFinite(Number(item?.price)) ? Math.max(0, Math.round(Number(item.price))) : undefined, originalPrice: Number.isFinite(Number(item?.originalPrice)) ? Math.max(0, Math.round(Number(item.originalPrice))) : undefined })) : undefined };
  if (raw.offers) out.offers = { ...head(raw.offers), items: Array.isArray(raw.offers.items) ? raw.offers.items.slice(0, 4).map((item: any) => ({ title: text(item?.title, 80), body: text(item?.body, 400), badge: text(item?.badge, 40), code: text(item?.code, 24), voucher: item?.voucher === true })) : undefined };
  if (raw.testimonials) out.testimonials = { ...head(raw.testimonials), items: Array.isArray(raw.testimonials.items) ? raw.testimonials.items.slice(0, 6).map((item: any) => ({ name: text(item?.name, 60), location: text(item?.location, 60), quote: text(item?.quote, 500), treatment: text(item?.treatment, 80), rating: Math.min(5, Math.max(1, Math.round(Number(item?.rating || 5)))) })) : undefined };
  if (raw.faq) out.faq = { ...head(raw.faq), items: Array.isArray(raw.faq.items) ? raw.faq.items.slice(0, 10).map((item: any) => ({ question: text(item?.question, 160), answer: text(item?.answer, 900) })) : undefined };
  if (raw.contact) out.contact = { ...head(raw.contact), hours: Array.isArray(raw.contact.hours) ? raw.contact.hours.slice(0, 4).map((item: any) => ({ label: text(item?.label, 40), value: text(item?.value, 60) })) : undefined };
  if (raw.seo) out.seo = { title: text(raw.seo.title, 70), description: text(raw.seo.description, 200), keywords: text(raw.seo.keywords, 300) };
  if (Array.isArray(raw.services)) out.services = raw.services.slice(0, 30).map((item: any) => ({ id: text(item?.id, 60), name: text(item?.name, 90), category: text(item?.category, 60), description: text(item?.description, 700), benefits: Array.isArray(item?.benefits) ? item.benefits.slice(0, 4).map((entry: unknown) => text(entry, 120)).filter(Boolean) as string[] : undefined, durationMinutes: Number.isFinite(Number(item?.durationMinutes)) ? Math.max(15, Math.round(Number(item.durationMinutes))) : undefined, price: item?.price === null ? null : Number.isFinite(Number(item?.price)) ? Math.max(0, Math.round(Number(item.price))) : undefined, popular: item?.popular === true }));
  if (Array.isArray(raw.imagePrompts)) out.imagePrompts = raw.imagePrompts.slice(0, 12).map((item: any) => ({ id: text(item?.id, 40), label: text(item?.label, 60), prompt: text(item?.prompt, 900) }));
  return out;
}
