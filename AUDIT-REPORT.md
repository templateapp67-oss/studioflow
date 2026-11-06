# StudioFlow Complete Technical Autopsy

**Audit date:** 2026-11-06  
**Repository:** templateapp67-oss/studioflow  
**Baseline:** main @ `dfd03cb92dee14a2f2fccae5938cdd4fb7d02630`  
**Live URL supplied:** https://studioflow-ashen-pi.vercel.app/  
**Status:** Initial repository, CI, Supabase and deployment-control-plane inspection completed. This is not a declaration of production readiness.

## Executive summary

StudioFlow is a React 19 + TypeScript + Vite application with an Express server, Supabase Auth/Postgres/Storage/Edge Functions, and Vercel deployment configuration. The repository has substantial existing functionality and automated verification; the highest risk is not an absence of modules but accumulated integration drift, broad legacy database policies, and unverified deployment/configuration state.

The default branch contains 16 template catalogue records in the connected Supabase project. Production data was inspected read-only; no database rows, migrations, secrets or deployments were changed during the audit.

## Severity register

| ID | Severity | Finding | Evidence / root cause | Action |
|---|---|---|---|---|
| SF-001 | P1 | Owner-only demo seeding callable anonymously | Supabase reports `af_seed_demo(uuid)` executable by anon; routine permits anonymous caller because the guard only rejects non-owners when `auth.uid()` is non-null. | Migration removes anon execution; authenticated owner path retained. |
| SF-002 | P1 | Public staff visibility policy ignores `is_public` | Two permissive SELECT policies include a legacy `is_active=true` condition. | Migration replaces them with explicit active + public + active/non-deleted salon predicate. |
| SF-003 | P1 | Public salon policy can include soft-deleted rows | Legacy public SELECT policy checks active but not `deleted_at`. | Migration requires active and `deleted_at is null`. |
| SF-004 | P1 | Public services policy does not consistently require a live salon | Legacy `services_public_read` only checks `is_active`; separate policy has stricter predicate, but permissive policies combine with OR. | Migration consolidates into one strict public-read policy. |
| SF-005 | P1 | Canonical domain mismatch requires owner confirmation / DNS check | main's `index.html`, `publicSeo.ts`, `robots.txt` and sitemap default currently use the Vercel host. User's prior project instructions name nexorasalon.online, but Vercel domain access and DNS could not be verified in this run. | Do not guess; verify attached production domain and SSL before changing canonical origin. |
| SF-006 | P1 | Release status blocked by Vercel deployment rate limit | main commit status reports deployment rate limited; Vercel connector cannot list deployment records due permission denial. | Keep release blocked; restore Vercel quota/permissions then verify a preview. |
| SF-007 | P1 | PR #80 is not merge-ready | PR head is 3 commits behind main, diverged/dirty, and latest status reports Vercel rate limit. | Do not merge; use fresh main-based repair branch. |
| SF-008 | P1 | PR #69/#68/#64/#62/#60/#59 are stale/diverged | Compare API reports each branch behind current main (31–52 commits depending on PR). | Reconcile only after fresh diff and tests; avoid merging stale branches. |
| SF-009 | P2 | Full offline verification suite has 5 failures | PR #80 prior completed test run: 113/118 suites passed. Failures cover install contrast, customer template count, homepage copy, service photos, and video wiring. | Reproduce on current main and fix product/test mismatch rather than suppress tests. |
| SF-010 | P2 | Initial JavaScript payload is large | Prior PR build output: main chunk ~1,453.54 KB; preview chunk ~1,094.50 KB (uncompressed). | Profile route imports and split heavy template/editor modules. |
| SF-011 | P2 | Supabase function search paths are mutable | Security advisor flags seven functions overall, including StudioFlow-adjacent trigger helpers. | Pin trusted search_path per function after reviewing each definition. |
| SF-012 | P2 | Supabase multiple permissive policies / duplicate indexes | Performance advisor reports 113 policy findings and 5 duplicate-index findings across a shared multi-product database. | Scope fixes to StudioFlow tables only; do not alter other product schemas. |
| SF-013 | P2 | Missing/leaked-password protection disabled | Supabase Auth advisor explicitly reports leaked-password protection disabled. | Enable after checking Auth configuration and rollout impact. |
| SF-014 | P2 | Security-definer RPC grants need allowlist review | Advisor flags 14 anon and 58 authenticated functions overall. Many are intentionally public booking/availability or role-checked operations. | Audit each routine; do not blanket revoke. |
| SF-015 | P2 | Public homepage prerender and application route split needs regression coverage | main introduced `AppRouter` and prerendered homepage/template pages; older branches modify the same entry points. | Preserve current main implementation and test auth/customer/owner deep links. |

## Repository architecture inspected

- React 19, TypeScript, Vite 6, Tailwind CSS.
- Express server and Vercel route/rewrite configuration.
- Supabase Auth, PostgreSQL, Storage and Edge Functions.
- Booking, customer, staff, service, loyalty, reviews, gift packages, notifications, payment and template modules.
- 16 catalogue templates in the live Supabase catalogue.
- Build and verification scripts under `scripts/`; Supabase SQL migrations under `supabase/migrations/`.

## Production database snapshot

Connected project: `zilwgiuiygqqardzutxi` (active/healthy). The database has 138 applied migrations and 220 public tables; no public table was found with RLS disabled. Relevant counts at inspection time: 16 templates, 18 StudioFlow accounts, 6 published websites, 14 StudioFlow bookings, 126 StudioFlow services, 1 review, 4 salons, 30 services and 2 staff rows. These counts are observations only and may change.

## Important limitations

- Vercel API project discovery succeeded, but deployment listing and project detail access were denied/not found for the discovered team scope. The deployment rate-limit failure is independently confirmed by GitHub commit status.
- Browser extension could list tabs, but could not read the live site or scanner pages because host permissions were not granted.
- The BrowserStack accessibility report email was found, but its temporary download link was not accessible through the available retrieval channel. The historical 3.77:1 contrast finding therefore remains a prior audit lead, not a newly measured result.
- No production browser journey, Lighthouse/Core Web Vitals run, authenticated API probe or live payment was executed.
- No production migration has been applied by this audit branch.

## Next audit gates

1. Run CI against this fresh branch and current main.
2. Review/apply the included non-destructive RLS and RPC-grant migration after preview validation.
3. Verify the real Vercel production domain and set one canonical origin consistently.
4. Run browser E2E with a dedicated test account and isolated test salon.
5. Obtain Vercel deployment visibility and re-run production verification.
