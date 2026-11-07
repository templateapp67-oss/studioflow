# NEXORA SALONOS landing page — fix report

**Branch:** `arena/a4fea2d2-studioflow` · **Base:** `ec061660e61704f190ddb554fe8b524af304f85c`

This report lists the code, database and deployment changes that were made while executing
`NEXORA_STUDIOFLOW_REPLACEMENT_EXECUTION.md` and `STUDIOFLOW_END_TO_END_COMPLETE_FIX.md`.

---

## 1. Public page (`/pricing`)

| Change | Files |
|---|---|
| Complete 16-section landing page published at `/pricing` | `src/components/nexora-landing/NexoraPricingLandingPage.tsx`, `sections/PlatformOverviewSection.tsx`, `sections/AddOnsSection.tsx`, `sections/PlanSummaryDialog.tsx` |
| Route-owned content overrides so the prerendered document already contains the pricing copy | `src/components/nexora-landing/LandingContentProvider.tsx` |
| Shared SEO constants for title, description, canonical, Open Graph and JSON-LD | `src/lib/nexoraPricingSeo.ts` |
| Design tokens and components for the new sections | `src/components/nexora-landing/nexoraLanding.css`, `nexoraTokens.css` |
| Local, self-hosted Poppins (OFL) | `public/fonts/poppins/*`, `src/styles/nexoraFonts.css` |

The pricing values, entitlements and plan catalogue remain the single source of truth in
`src/lib/nexoraPricing.ts`. No monthly price, discount, trial, guarantee, rating, testimonial or ROI claim was
added; add-ons stay “price not configured”; only the three approved Standard inclusions are marked *Included*.

## 2. Demo-request flow (P0)

```
browser ──POST /api/nexora-demo-lead──▶ shared handler (server/nexoraDemoLead.ts)
                                            │ validation · honeypot · field limits
                                            ▼
                                     submit-landing-lead (Edge Function, v7)
                                            │ DB-backed rate limit (5 / 10 min, salted IP hash)
                                            ▼
                                     public.landing_leads (private, RLS, service_role only)
                                            │
                                            └──▶ optional CRM forward (failure only changes the recorded state)
```

| Change | Files |
|---|---|
| Shared handler used by Express **and** Vercel | `server/nexoraDemoLead.ts`, `api/nexora-demo-lead.ts` |
| Strict client contract (JSON only, `ok === true`, timeout, idempotency key) | `src/lib/nexoraLeadSubmission.ts`, `src/components/nexora-pricing/DemoProvider.tsx` |
| Idempotent submissions | `supabase/migrations/202611070004_…sql`, `supabase/functions/submit-landing-lead/index.ts` |
| CRM delivery state recorded on the stored lead | `server/nexoraDemoLead.ts`, `…0004` migration |
| Retention window (180 days) and purge function | `…0004`, `…0005` migrations |
| Environment validation with host-only diagnostics | `src/lib/nexoraEnv.ts`, `server/nexoraEnv.ts`, `src/lib/supabase.ts` |

## 3. Lead administration (P1)

| Change | Files |
|---|---|
| Manager view (list, filter, detail, notes, status, audit trail, CSV export, erasure) | `src/components/nexora-landing/admin/NexoraDemoLeadsAdmin.tsx`, route `/admin/demo-leads` |
| Privileged list / export / erase with JWT + `app_metadata.site_role` authorisation | `server/nexoraDemoLeads.ts`, `api/nexora-demo-leads.ts`, `server.ts` |
| Audit trail written by a trigger in the private `nexora_private` schema | `supabase/migrations/202611070004_nexora_demo_lead_operations.sql` |

## 4. Route and SEO work

| Change | Files |
|---|---|
| `/pricing` prerendered document | `scripts/prerender-public.tsx`, `vercel.json`, `server.ts` |
| `/privacy` notice (new, prerendered, in the sitemap once) | `src/components/nexora-landing/NexoraPrivacyNoticePage.tsx`, `server/sitemap.ts` |
| Canonical strategy: `/pricing` primary, `/salon-os` companion with alias anchors | `src/components/nexora-landing/NexoraSalonLandingPage.tsx`, `sections/PricingDetailPointer.tsx`, `sections/BusinessTypesSection.tsx`, `sections/FeatureSections.tsx` |
| Brand theme colour | `index.html` |

## 5. Database changes (additive only)

| Migration | Purpose | Applied |
|---|---|---|
| `202611070001_nexora_salon_landing_database.sql` | 12 tables, 4 enums, RLS, grants, policies | live |
| `202611070002_nexora_salon_landing_seed.sql` | Published marketing content | live |
| `202611070003_nexora_salon_landing_rate_limits.sql` | Shared rate-limit counters | live |
| `202611070004_nexora_demo_lead_operations.sql` | Idempotency, CRM state, retention, audit trail, private schema | live |
| `202611070005_nexora_demo_lead_retention_default.sql` | Default retention window for new leads | live |
| `202611070006_nexora_landing_privacy_link.sql` | Footer link to the privacy notice | live |

No table, column or policy of an existing application table was dropped or rewritten; every change is additive and
re-appliable. `public.landing_leads` keeps its `anon`-free grants and its manager policies.

## 6. Edge Function

`submit-landing-lead` — id `a718636b-c5b8-45bb-9ae9-f9737dcec4ff`, **version 7**, `ACTIVE`, `verify_jwt = false`.
v6 added idempotency and the trusted-server lead id; v7 restored the `ALLOWED_PAGE_PREFIXES` constant that was
dropped in the v6 upload (the mistake was found by a live probe that answered `500 Internal Server Error`, the
source was corrected and the probe was repeated successfully).

## 7. Tests added

| Suite | Covers |
|---|---|
| `scripts/verify-nexora-pricing-landing.mjs` | The `/pricing` page: section order and ids, approved prices, comparison matrix, add-ons, FAQ, CTA destinations, prerendered metadata, demo endpoint wiring. |
| `scripts/verify-nexora-demo-lead.mjs` | The shared handler: stored lead, invalid input, missing consent, honeypot, method guard, 429, storage outage, unconfigured store, CRM failure without losing the lead, idempotency forwarding, redacted logs. |
| `scripts/verify-nexora-lead-submission-client.mjs` | The client contract: SPA HTML 200, empty body, malformed JSON, `ok:false`, 429, 5xx, transport failure, timeout, network error. |
| `scripts/verify-nexora-link-integrity.mjs` | 74 internal links and 79 in-page anchors across four prerendered documents. |
| `scripts/verify-nexora-env.mjs` | Environment validation: malformed URL, privileged key in a browser variable, project override warning. |
| `scripts/verify-nexora-admin-leads.mjs` | Manager authorisation model, private-schema functions, admin route wiring, erasure/export actions. |
