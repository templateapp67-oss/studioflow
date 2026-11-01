# Veda Sanjeevani — Wellness & Spa Website

React + Vite website and admin area for an Ayurvedic wellness studio. TypeScript strict mode, React Router, TanStack Query, Zod, Supabase, and Vitest. The `supabase/` folder contains the database migrations and Edge Functions.

## Run locally

```sh
npm ci
cp .env.frontend.example .env.local
# Set the public Supabase URL/key and public site URL in .env.local.
npm run dev
```

Only a public Supabase anon/publishable key may be placed in `VITE_SUPABASE_ANON_KEY`. Never put a service-role key, Gemini key, Resend key, or cron secret in a `VITE_` variable. Backend `.env.example` is for local Supabase functions and remains separate from frontend config.

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser/build | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser/build | Public anon/publishable key only |
| `VITE_SITE_URL` | Browser/build | Canonical website origin and email redirect base |
| `SUPABASE_URL` | Edge Functions | Supabase project URL |
| `SUPABASE_ANON_KEY` | Edge Functions | Public key used by server-side auth checks |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | Privileged server-side operations; keep secret |
| `SITE_URL` | Edge Functions | Allowed website origin for CORS and redirects |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI Edge Functions | Optional content generation provider configuration |
| `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL` | Email Edge Functions | Transactional mail sender and studio recipient |
| `CRON_SECRET` | Internal Edge Functions | Secret header for scheduled/internal actions |

See `.env.frontend.example` and `.env.example`. Never copy backend secrets into a Vercel browser variable.

## Architecture

```text
Guest browser ── React/Vite public routes ──┬── Supabase public RPCs (validated with Zod)
                                             ├── create-booking-public Edge Function
                                             └── local saved-content fallback
Owner/staff ─── /admin routes + Auth guard ──┬── Supabase Auth + profiles/RLS
                                             ├── bookings Realtime and CRUD helpers
                                             └── JWT-protected AI/media Edge Functions
Supabase project ── migrations + RLS + storage + scheduled jobs
Vercel ── static dist assets + SPA rewrite + security headers (vercel.json)
```

Public content is fetched from `get_public_site()` and falls back to the local validated JSON preview. Booking availability is read from `get_available_slots`; booking creation is server validated and pending until confirmed. Admin code uses the browser anon key and authenticated RLS; Edge Functions require the user's JWT for AI/media operations. See `README_FRONTEND.md`, `README_BACKEND.md`, `README_DB.md`, `README_ADMIN.md`, and `MEDIA_ASSETS.md` for contract-specific details and generated-image provenance.

## Commands and checks

```sh
npm run typecheck
npm run lint
npm run test                 # Vitest unit/component suite
npm run build
npm run preview
npm run test:e2e             # Playwright browser suite; requires Chromium and a prior build
npm audit --omit=dev

deno test --allow-all supabase/functions/tests
supabase start
supabase db reset
supabase test db
# Lighthouse CI is enforced by the GitHub Actions workflow using lighthouserc.json
```

The deterministic Playwright booking/race scenarios mock the HTTP contract; they exercise UI behavior but do not prove database concurrency. SQL database tests are the authoritative exclusion/RLS checks. Browser workflows requiring live email, Auth and AI credentials need a configured Supabase project and are listed in `QA_REPORT.md` as unverified. The workflow scaffold covers the frontend, Deno, Supabase DB, Playwright and Lighthouse stages. Because this repository task is isolated to `veda-sanjeevani/`, its workflow is nested there; GitHub will not discover it until a maintainer integrates it at the repository-root `.github/workflows/` and makes the status required in branch protection.

## Deploy

See [`DEPLOY.md`](DEPLOY.md) for Supabase migrations, Edge Function deploy flags, Auth setup, Resend sender verification, Vercel environment configuration, custom domain/SSL, Search Console, backups and rollback steps. `vercel.json` contains the SPA rewrite and baseline CSP/security headers.

## Troubleshooting: ten common issues

1. **Setup screen says environment is incomplete:** ensure the three `VITE_` variables exist in `.env.local` (or deployment environment), use a valid HTTPS project URL/key, and restart Vite after edits.
2. **A secret-key warning appears:** replace the browser key with the project anon/publishable key. Do not expose or rename the service-role key to `VITE_*`.
3. **Website uses sample content:** check project URL/key, `get_public_site()` permissions, publication state and browser network errors; the local fallback is expected when live content cannot be validated.
4. **Booking slots do not load:** verify `working_hours`, service/staff eligibility, the `get_available_slots` RPC and Supabase connectivity. The UI intentionally does not fabricate slots.
5. **Booking says the slot was just taken:** refresh availability and choose another time; the server is authoritative and rejects overlaps.
6. **Booking email is missing:** check deployed `create-booking-public`/notification functions, Resend API key, verified sender, recipient restrictions and function logs. Check SMS/WhatsApp separately; browser confirmation does not prove email delivery.
7. **Admin sign-in or reset link fails:** check Auth email confirmation, Site URL/redirect allowlist, first-owner state and profile creation. Staff should be invited through the Supabase dashboard after public signup is disabled.
8. **Admin cannot save or sees a permission error:** check the signed-in profile role and RLS policies. Never fix this by putting a service-role key in the frontend.
9. **A deep link returns a 404 on hosting:** confirm Vercel is using the project root/build output and that `vercel.json` SPA rewrite is applied. Confirm static files are served before rewrites.
10. **Map, images, or fonts are blocked:** inspect CSP console messages and the Content-Security-Policy header. Add only the exact trusted host needed; do not broadly allow `*`. Check public `site-images` bucket rules for studio images.

## Project status

`QA_REPORT.md` is the current test/security/deployment record and contains the explicit go-live checklist and gap report. A green local build is not equivalent to live Supabase, email, deployment, browser-accessibility, or Lighthouse verification.
