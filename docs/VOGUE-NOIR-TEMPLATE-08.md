# Template 08 — Vogue Noir Makeup Studio & Academy (`makeup_studio`)

## Upgrade status (current branch)

This is a partial upgrade of the pre-existing `makeup_studio` template, not a new catalogue key. The local defaults now include the requested Indian bridal copy, twelve services, three Dulhan tiers, updated course fees, an inspiration section for eight bridal traditions, a preview link in onboarding, a mobile call link and IST-based batch date labels. Package cards display the linked booking service's price; if the link is missing, they direct the visitor to contact instead of booking an unrelated service. Saved tenant services are not rewritten. Remote catalogue entries that already contain a Vogue Noir catalogue are still respected, so a deployed remote catalogue may require a separately reviewed update before new tenants receive these new local prices.

**Not production-complete against the new brief:** true multi-branch storage and branch-aware booking/availability, branch-aware batch availability, GST/SAC invoice calculation and receipt controls, the full image set and regional image cards, and a complete wizard for all requested fields are not implemented. Existing academy enquiries require customer sign-in. The included asset pack contains Pexels photos as well as synthetic images and therefore does not satisfy a synthetic-only requirement. The existing platform Razorpay flow has not been verified in test mode in this environment. Do not treat the demo addresses, testimonials, claims or prices as verified business information; replace/review them before publishing. No Lighthouse or mobile device audit has been performed.

The additive city migration is `supabase/migrations/202610290001_vogue_noir_academy_city.sql`. It requires the existing academy migration `backend/vogue-noir-template-08.sql` and its schema prerequisites to have already been applied. Apply the city migration before deploying this frontend; the old seven-argument enquiry RPC remains available for older clients. City and city-specific preferred dates are editable in the Vogue Noir editor and the owner list displays the selected city. These dates are preferences, not verified branch availability. GSTIN, SAC and GST-inclusion fields are disclosures only: checkout and receipts do not calculate GST. Do not apply migrations without checking the target database and following the staging deployment process. Keep Razorpay credentials in the existing server-side environment/secrets store, never in the client or repository. Test published tenant routing, RLS and payment verification against a staging Supabase project before deploying. The requested branch name cannot be used in this Arena session; changes remain on the session branch.

## Overview
Template 08 upgrades the 8th StudioFlow catalog slot (`makeup_studio`) into a dark-luxury editorial storefront and onboarding workflow for **Vogue Noir Makeup Studio & Academy**.

- **UI Display Name:** `Vogue Noir (08)`
- **URL Preview Aliases:** `?template=08`, `?template=template-08`, `?template=vogue-noir`, `?template=makeup_studio`
- **Tenant Storefront Routing:** `?site=<slug>` and `<slug>.salon-platform.com`
- **Palette (Editable CSS Variables):**
  - `--bg-primary`: `#0B0B0C`
  - `--bg-secondary`: `#151517`
  - `--border-subtle`: `#2A2A2D`
  - `--accent-gold`: `#C9A96E`
  - `--text-primary`: `#F5EFE6`
  - `--text-muted`: `#A8A29A`
  - `--highlight-blush`: `#E8C4C4`

## Storefront Sections (Current implementation)
1. **Sticky Header** (`src/components/VogueNoirWebsite.tsx`) — Logo, `Home, Services, Academy, Portfolio, Artists, Reviews, Contact`, `My Bookings`, customer account controls, and `"Book Now"` CTA; transitions to solid noir on scroll.
2. **Hero** — `"Luxury Makeup, Made For Every Indian Bride"`, responsive `<picture>` (`1920×1080` desktop / `900×1400` mobile), `"Book Appointment"` & `"Join Academy"` CTAs.
3. **About Studio + Milestone Strip** — Brand story, 3 studio hygiene/lighting pillars, and 4 stat counters (`8+ Years Experience`, `5,000+ Happy Brides`, `1,200+ Students Trained`, `11 Cities`).
4. **Services Grid** — 12 core makeup & styling services with category tabs, INR starting prices, duration chips, and direct `BookingModal` handoff.
5. **Bridal Looks** — Eight text-only inspiration links to contact; they do not represent branch-specific bookable services.
6. **Bridal Packages** — 3 editorial tier cards (`Classic Dulhan` ₹35,000, `Signature Dulhan` Most Popular ₹60,000, `Royal Dulhan` ₹1,25,000) plus the studio package catalogue (`#salon-packages`).
6. **Makeup Academy (`src/components/vogue-noir/AcademySection.tsx`)** — Optional ON/OFF module (`vogueNoir.academyEnabled`), 4 courses, auto-calculated next 1st/15th batch start dates, 4–6 module syllabus accordions, certificate/EMI highlights, and authenticated city-aware enquiry form backed by `studioflow_academy_enquire_with_city`.
7. **Portfolio / Lookbook (`src/components/vogue-noir/PortfolioSection.tsx`)** — Category filter (`Bridal`×6, `Party`×4, `Editorial`×3, `Academy Work`×3 + owner uploads), keyboard-accessible lightbox, and 2 interactive `<input type="range">` before/after sliders.
8. **Artists / Team** — 4 specialist cards (`Riya Kapoor`, `Simran Sethi`, `Aarav Mehta`, `Neha Joshi`) with experience, specialties, `"View profile & reviews"`, and `"Book <Artist>"`.
9. **Testimonials** — sample stories are identified as samples and merged with real published reviews.
10. **FAQ Accordion** — 7 bridal, hygiene, travel, kit, certification, and EMI FAQs.
11. **Booking Concierge** — Service + artist selector wired directly into StudioFlow's `BookingModal`.
12. **Location & Contact** — Address, phone, public studio email, studio hours, optional Google Maps embed / directions link, and floating WhatsApp CTA.
13. **Footer + SEO** — Quick links, social profiles, copyright, dynamic document metadata, and `LocalBusiness` (`BeautySalon`) + `Course` JSON-LD.

## Database Migration & RLS (`backend/vogue-noir-template-08.sql`)
- Creates `public.studioflow_academy_enquiries` with Row Level Security enabled and scoped strictly to `owner_id = auth.uid() OR customer_id = auth.uid()`.
- Exposes `public.studioflow_academy_enquire(...)` for signed-in customers with phone/email validation and hourly rate limiting.
- Exposes `public.studioflow_academy_enquiry_set_status(p_enquiry_id, p_status)` for the studio owner (`new | contacted | enrolled`).
- Idempotently updates `public.studioflow_templates` (`id = 'makeup_studio'`) to `Vogue Noir (08)`.
