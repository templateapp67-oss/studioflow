# Template 08 — Vogue Noir Makeup Studio & Academy (`makeup_studio`)

## Overview
Template 08 upgrades the 8th StudioFlow catalog slot (`makeup_studio`) into a complete dark-luxury editorial storefront and onboarding workflow for **Vogue Noir Makeup Studio & Academy**.

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

## 13 Storefront Sections (Exact Order)
1. **Sticky Header** (`src/components/VogueNoirWebsite.tsx`) — Logo, `Home, Services, Academy, Portfolio, Artists, Reviews, Contact`, `My Bookings`, customer account controls, and `"Book Now"` CTA; transitions to solid noir on scroll.
2. **Hero** — `"Luxury Makeup. Timeless Beauty."`, responsive `<picture>` (`1920×1080` desktop / `900×1400` mobile), `"Book Appointment"` & `"Join Academy"` CTAs.
3. **About Studio + Milestone Strip** — Brand story, 3 studio hygiene/lighting pillars, and 4 stat counters (`8+ Years Experience`, `2,500+ Brides & Clients`, `600+ Students Trained`, `15+ Awards & Features`).
4. **Services Grid** — 9 core makeup & styling services with category tabs, INR starting prices, duration chips, and direct `BookingModal` handoff.
5. **Bridal Packages** — 3 editorial tier cards (`Classic Bride` ₹18,000, `Signature Bride` Most Popular ₹32,000, `Royal Bride` ₹55,000) plus the studio package catalogue (`#salon-packages`).
6. **Makeup Academy (`src/components/vogue-noir/AcademySection.tsx`)** — Optional ON/OFF module (`vogueNoir.academyEnabled`), 4 courses, auto-calculated next 1st/15th batch start dates, 4–6 module syllabus accordions, certificate/EMI highlights, and authenticated `studioflow_academy_enquire` form.
7. **Portfolio / Lookbook (`src/components/vogue-noir/PortfolioSection.tsx`)** — Category filter (`Bridal`×6, `Party`×4, `Editorial`×3, `Academy Work`×3 + owner uploads), keyboard-accessible lightbox, and 2 interactive `<input type="range">` before/after sliders.
8. **Artists / Team** — 4 specialist cards (`Riya Kapoor`, `Simran Sethi`, `Aarav Mehta`, `Neha Joshi`) with experience, specialties, `"View profile & reviews"`, and `"Book <Artist>"`.
9. **Testimonials** — 4 5-star bride & graduate stories merged with real published reviews.
10. **FAQ Accordion** — 7 bridal, hygiene, travel, kit, certification, and EMI FAQs.
11. **Booking Concierge** — Service + artist selector wired directly into StudioFlow's `BookingModal`.
12. **Location & Contact** — Address, phone, public studio email, studio hours, optional Google Maps embed / directions link, and floating WhatsApp CTA.
13. **Footer + SEO** — Quick links, social profiles, copyright, dynamic document metadata, and `LocalBusiness` (`BeautySalon`) + `Course` JSON-LD.

## Database Migration & RLS (`backend/vogue-noir-template-08.sql`)
- Creates `public.studioflow_academy_enquiries` with Row Level Security enabled and scoped strictly to `owner_id = auth.uid() OR customer_id = auth.uid()`.
- Exposes `public.studioflow_academy_enquire(...)` for signed-in customers with phone/email validation and hourly rate limiting.
- Exposes `public.studioflow_academy_enquiry_set_status(p_enquiry_id, p_status)` for the studio owner (`new | contacted | enrolled`).
- Idempotently updates `public.studioflow_templates` (`id = 'makeup_studio'`) to `Vogue Noir (08)`.
