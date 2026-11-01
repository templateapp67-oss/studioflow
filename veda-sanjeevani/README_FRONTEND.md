# Veda Sanjeevani — Step 3 frontend

A mobile-first public website built with React 18, Vite, strict TypeScript, Tailwind CSS, Framer Motion, React Router, TanStack Query, React Hook Form, Zod, Supabase JS, React Helmet Async and DOMPurify. Work in this directory; the repository root contains an unrelated StudioFlow application.

## Start locally

```bash
npm install
cp .env.frontend.example .env.local
# Set your Supabase project URL, public anon/publishable key, and public site URL.
npm run dev
```

Only a public Supabase anon/publishable key belongs in `VITE_SUPABASE_ANON_KEY`. The app checks configuration at startup and presents an actionable setup screen if values are absent, invalid, or look like a service-role secret. The sample `.env.local` used during verification points at a deliberately unavailable project; it is ignored by Git. Replace it with the values from your Supabase project before testing bookings. No service-role key is used by the browser.

The frontend reads `get_public_site()` and validates the full payload with Zod. It falls back to `src/data/site.config.json` on RPC failure, malformed data, or an unpublished site. The saved preview includes all twelve seed services and launch-ready educational copy; contact details, practitioner biographies, qualifications, photography, testimonials and journal copy are explicitly illustrative and must be verified/replaced by the business before publishing. In saved-preview mode, live calendar and booking controls never pretend to reserve a slot.

## Backend contract

| Browser action | Existing contract |
| --- | --- |
| Public content | `supabase.rpc('get_public_site')` |
| Available appointments | `supabase.rpc('get_available_slots', { p_service_id, p_staff_id, p_date })` |
| Anonymous dosha result | `supabase.rpc('save_quiz_result', { p_vata, p_pitta, p_kapha, p_result })` |
| Public booking | `POST /functions/v1/create-booking-public` with `service_id`, `staff_id`, `start_at`, `name`, normalized Indian `phone`, optional `email`, `notes`, and blank `website` honeypot |
| Public review | `supabase.rpc('submit_review', { p_token, p_rating, p_comment })` |
| Bookable days | Read-only `working_hours` RLS policy and per-day available-slot results. `blocked_dates` is not directly exposed to anon. |

Slot availability is always taken from the RPC. Open-day dates are prechecked over the visible week; days with no available slots are disabled. The server revalidates the slot during booking. `SLOT_TAKEN` invalidates cached slots and retains form values with a friendly message. Times are displayed in `Asia/Kolkata`. Booking requests remain pending until the studio confirms. Package buttons prefill an enquiry note, not a fictitious bundled appointment.

## Design, content and consent

- “Living Ayurveda” palette, five user-selectable theme presets, CSS custom-property overrides, paper grain, jharokha arch masks, botanical line art, mandala, responsive editorial layout and glass booking card.
- Cormorant Garamond, Manrope and Tiro Devanagari Hindi subsets are self-hosted in `public/fonts`; primary fonts are preloaded. `npm run assets` creates local WebP 400/800/1600 variants from the compact originals in `assets/source/`.
- Each website image uses descriptive alternative text, fixed dimensions, lazy loading (except the hero), `srcset` for generated variants and an on-error placeholder. Images are local and do not depend on third-party image hosts.
- Dosha quiz scoring is traditional/educational and never a diagnosis. Copy makes no disease treatment, cure, guarantee, or invented-certification claims. Service pages display the requested medical disclaimer.
- Blog markup is sanitized with DOMPurify. Optional analytics remain off; the consent event is an integration hook only and no analytics provider script is bundled.
- The seeded or demo material is labelled in the UI and privacy/terms pages. Obtain business approval and verified contacts, location, practitioner qualifications, cancellation policy, media permissions and guest-review consent before launch.

## Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

`npm run build` creates responsive images, runs TypeScript project checks, compiles the Vite site, and writes `dist/sitemap.xml` and `dist/robots.txt`. `VITE_SITE_URL` supplies the canonical and sitemap origin. The sitemap contains configured service and article slugs and excludes admin/review routes. Client-side hosting should rewrite application paths (for example `/service/...`) to `index.html`.

Unit/component tests run under Vitest + jsdom. Optional Chromium smoke/a11y automation is `CHROMIUM_PATH=/path/to/chrome npm run test:browser`; it checks mobile/tablet/desktop overflow, fallback rendering, broken images, themes, mobile navigation, category filtering, lightbox, browser/console errors and axe WCAG 2.1 AA. Chromium must already be installed in the environment. The browser-binary download host was unreachable in the verification sandbox, and no system Chromium was installed; the browser automation and Lighthouse scores therefore remain unverified here. `lighthouse` is installed for a later browser-enabled audit.

## Step 3 acceptance checklist

- [x] React/Vite/strict TypeScript/Tailwind/Framer Motion/Router/Query/forms/Zod/Supabase stack
- [x] Eight homepage experience sections, twelve seed services and category filtering
- [x] Dosha scoring, balanced ties and recommended-service mapping
- [x] Public service, blog, review, privacy, terms, admin placeholder and not-found routes
- [x] Safe public-booking form, India-mobile validation, slots, pending confirmation and WhatsApp return path
- [x] Runtime-validated public content, saved-content fallback, image fallback and safe sanitized blog content
- [x] Five themes, local fonts, reduced-motion support, responsive/keyboard-operable controls
- [x] Consent-gated analytics hook, SEO metadata/structured data, sitemap and robots rules
- [x] Typecheck, lint, tests and production build
- [ ] Live Supabase/Auth/function/provider integration, hosted deployment and actual customer communications
- [ ] Chromium browser/a11y smoke suite, Lighthouse ≥90 scores and production screen-reader/device validation

**Verified in this sandbox:** `npm run typecheck`, `npm run lint`, `npm run test` (15 tests), and `npm run build`; native static preview HTTP responded with the Vite application shell. A browser rendering check was attempted but Chromium was unavailable, so do not treat HTTP shell delivery as browser-rendering, accessibility, or Lighthouse proof.
