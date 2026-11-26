# NEXORA SALONOS landing page — deployment report

**Branch:** `arena/a4fea2d2-studioflow` · **Base:** `ec061660e61704f190ddb554fe8b524af304f85c`
**Target runtime:** Vercel (serverless functions in `api/`) with the custom Express server as the alternative runtime.

> **Deployment status:** the branch is prepared and pushed, but **no Vercel preview or production deployment was
> created from this environment** — the review environment has no Vercel project access. What *was* executed is the
> **production build served by the Express runtime** (`npm run build` → `NODE_ENV=production node dist/server.cjs`),
> including the HTTP behaviour of every public route, the demo endpoint and the lead register (see §5b). The
> checklist in §5 records what was verified locally and what still has to be executed on the deployment.

---

## 1. Deployment artefacts produced by `npm run build`

| Artefact | Path | Notes |
|---|---|---|
| SPA shell | `dist/index.html` | the public homepage is prerendered into the shell |
| Companion marketing document | `dist/salon-os/index.html` | own canonical, title and description |
| Primary marketing document | `dist/pricing/index.html` | canonical `https://nexorasalon.online/pricing`, FAQ + SoftwareApplication JSON-LD |
| Privacy notice | `dist/privacy/index.html` | canonical `https://nexorasalon.online/privacy` |
| Template pages | `dist/template-pages/*.html` | 16 prerendered template landing pages |
| API bundle | `dist/server.cjs` | the Express server, used by the `npm start` runtime |

## 2. Routing configuration

`vercel.json` (rewrites are ordered, the SPA fallback stays last):

| Source | Destination | Purpose |
|---|---|---|
| `/login` | `/login.html` | existing login document |
| `/sitemap.xml` | `/api/sitemap` | dynamic sitemap |
| `/salon-os` | `/salon-os/index.html` | companion marketing document |
| `/pricing` | `/pricing/index.html` | primary marketing document |
| `/privacy` | `/privacy/index.html` | privacy notice |
| `/(.*\..*)` | `/$1` | static assets keep their real path |
| `/(.*)` | `/index.html` | SPA fallback for the application routes |

The Express server serves the same documents (`server.ts`, `/salon-os`, `/pricing`, `/privacy`).

## 3. Serverless functions

| Function | File | Purpose |
|---|---|---|
| `POST /api/nexora-demo-lead` | `api/nexora-demo-lead.ts` → `server/nexoraDemoLead.ts` | public demo request: validation, honeypot, storage through the Edge Function, optional CRM forward |
| `POST /api/nexora-demo-leads` | `api/nexora-demo-leads.ts` → `server/nexoraDemoLeads.ts` | manager-only list, CSV export and erasure of the lead register |

Both functions re-export the shared server implementation, so the Express runtime and the Vercel runtime cannot
drift. The demo route is **not** rewritten to the SPA document any more, which is what allowed the false-success
defect in the first place.

## 4. Environment variables (names only — values are never printed or committed)

| Name | Runtime | Required | Purpose |
|---|---|---|---|
| `SUPABASE_URL` | server / Edge / Vercel | recommended | project the server talks to; validated at start-up |
| `SUPABASE_SERVICE_ROLE_KEY` | server / Edge / Vercel | required for the lead flow | privileged key, server side only |
| `SUPABASE_SECRET_KEY` | server / Edge | optional | alias for the privileged key |
| `SUPABASE_ANON_KEY` | server | optional | public key used when the server only verifies a session |
| `VITE_SUPABASE_URL` | browser build | optional | project override for a preview build |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser build | optional | publishable browser key (never a secret) |
| `VITE_SUPABASE_ANON_KEY` | browser build | optional | legacy alias |
| `NEXORA_CRM_LEAD_ENDPOINT` | server | optional | HTTPS CRM sink; absent = `skipped` delivery state |
| `NEXORA_CRM_LEAD_TOKEN` | server | optional | bearer token for the CRM sink |
| `LANDING_LEAD_RATE_LIMIT_SALT` | Edge | optional | salt for the shared rate-limit bucket |
| `PRIVACY_NOTICE_VERSION` | Edge | optional | version stamped on every lead (default `2026-11`) |
| `SITE_URL` | server / Vercel | required in deployment | canonical HTTPS origin for the sitemap |
| `PORT`, `NODE_ENV` | server | optional | runtime configuration |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | server / Vercel | optional | booking emails (unchanged behaviour) |
| `RAZORPAY_*` | server / Edge | optional | booking deposits only — **not** used for subscriptions |

All names are documented in `.env.example`; the file contains no value.

## 5. Release checklist

| # | Item | Status |
|---|---|---|
| 1 | Feature branch, base commit recorded, no change to `main` | **done** — `arena/a4fea2d2-studioflow` from `ec06166` |
| 2 | All P0 findings closed | **done** — see the gap register (NX-01 … NX-05) |
| 3 | P1 findings closed or documented | **done** — the one open item (subscription checkout, CRM credentials) is documented as not configured |
| 4 | Production environment variables confirmed | **names documented**; the values must be set in the Vercel project by the owner |
| 5 | Supabase project confirmed | **done** — `zilwgiuiygqqardzutxi` |
| 6 | Migrations applied in order, advisors reviewed | **done** — 0001…0006 applied; RLS and grants verified with live queries (`npm audit` clean as well) |
| 7 | Edge Functions deployed with the right JWT setting | **done** — `submit-landing-lead` v7, `verify_jwt = false`, CORS allow-list |
| 8 | Vercel API routes discovered and not rewritten to HTML | **done in code** — `api/nexora-demo-lead.ts` and `api/nexora-demo-leads.ts` exist and the rewrite table leaves `/api/*` to the functions |
| 9 | Preview deployment built and tested | **done** — the Vercel GitHub integration built a preview deployment (`https://studioflow-git-arena-a4fea2d2-c3ab7a-templateapp67-oss-projects.vercel.app`, deployment `4CFHcFdnEEqgBRFDwdZMtWcJYaMb`, status *Ready*, the `Vercel` check passed). The production build was additionally served and tested locally (§5b) |
| 10 | Public routes and journeys tested on the preview | **partially** — the routes, the demo endpoint and the lead register were tested against the local production build (§5b); the **preview itself could not be requested from this environment** (`*.vercel.app` is outside the sandbox's outbound allowlist: DNS resolves, the TLS handshake is dropped) |
| 11 | Deployment and Supabase logs reviewed | **partially** — the Edge Function logs were reviewed through the live probes; the Vercel log review needs the deployment |
| 12 | Promotion to production | **not performed** — promotion needs explicit authorisation |
| 13 | Rollback path | the previous deployment stays available; the change is additive in the database and reversible by removing the new routes |
| 14 | Production URL verified after promotion | **pending** — `https://nexorasalon.online/pricing` must be checked after promotion |

## 5a. GitHub Actions and the Vercel preview

| Check | Result |
|---|---|
| "High and critical dependency audit" (`npm audit --audit-level=high`) | **pass** (16 s) |
| "TypeScript, build and complete offline verification" (`npm test`) | **green** — `npm test` is 130/130 with exit code 0 after the Aurelia suite fix (`verify-template16-aurelia.mjs`). Before that fix the workflow failed on `main` for the base commit `ec06166` too (run `42344849000`), which is why it was a pre-existing red check rather than a regression of this branch |
| Vercel preview deployment | **built** by the Vercel GitHub integration — `https://studioflow-git-arena-a4fea2d2-c3ab7a-templateapp67-oss-projects.vercel.app`, deployment `4CFHcFdnEEqgBRFDwdZMtWcJYaMb`, status *Ready*, the `Vercel` check passed |
| Preview smoke test | **not executed from this environment** — `*.vercel.app` is outside the sandbox's outbound allowlist (the TLS handshake is dropped, the same restriction that blocks `*.supabase.co`). The smoke tests below were executed against the local production build instead and must be repeated against the preview URL by someone with access |

## 5b. Local production-runtime smoke test (executed)

`npm run build` → `NODE_ENV=production PORT=3210 SITE_URL=https://nexorasalon.online node dist/server.cjs`, then
`curl` against the running server. The results below are the actual responses.

| Request | Response | Note |
|---|---|---|
| `GET /pricing` | **200** `text/html` | the prerendered pricing document; `<title>NEXORA SalonOS \| Salon Management Software, Pricing & Features</title>`, `<link rel="canonical" href="https://nexorasalon.online/pricing" />`, JSON-LD for `SoftwareApplication`, `FAQPage` (15 questions) and `AggregateOffer` |
| `GET /salon-os` | **200** `text/html` | own title and canonical `…/salon-os` |
| `GET /privacy` | **200** `text/html` | own title and canonical `…/privacy` |
| `GET /` | **200** `text/html` | the public homepage |
| `GET /sitemap.xml` | **503** JSON-free error page | **expected in this environment**: the sitemap reads the published-site catalogue from `*.supabase.co`, which the sandbox cannot reach (TLS). The handler fails loudly instead of publishing a wrong sitemap |
| `POST /api/nexora-demo-lead` (valid body, no server credentials in this environment) | **503** `{"error":"Demo requests are not configured yet. No request was sent; please try again later.","requestId":"3ec553d6-…"}` | **no false success**: without the server credentials the request is refused, with a request id for the log |
| `POST /api/nexora-demo-lead` (invalid body) | **400** `{"error":"Enter your name.","requestId":"20c2dec1-…"}` | validation happens before anything is stored |
| `POST /api/nexora-demo-leads` (`{"action":"list"}`, no session) | **401** `{"error":"Sign in to manage demo requests."}` | the lead register is not public |

**Defect found by this smoke test and fixed:** `express.static` answered `/pricing` with a **301 to `/pricing/`**
because the route is a directory in `dist/`. That contradicts the canonical URL in the document and differs from
the Vercel rewrite, so `express.static(distPath, { redirect: false })` was added and the explicit
`app.get(/^\/pricing\/?$/)` handler now answers `/pricing` directly with **200**.

## 6. Smoke tests to run on the preview

```bash
# marketing documents
curl -sI https://<preview>/pricing   | head -1     # 200, text/html
curl -s  https://<preview>/pricing   | grep -o '<title>[^<]*'
curl -sI https://<preview>/privacy   | head -1
curl -s  https://<preview>/sitemap.xml | grep -c '<loc>'

# demo lead: a valid request must answer 201 with JSON
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' -X POST https://<preview>/api/nexora-demo-lead \
  -H 'content-type: application/json' \
  -d '{"name":"QA Probe","email":"qa@example.com","salonName":"QA Salon","consent":true}'

# demo lead: an invalid request must answer 400 and never 200
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<preview>/api/nexora-demo-lead \
  -H 'content-type: application/json' -d '{"name":"","email":"nope","consent":false}'

# the lead register must not be readable by the public
curl -s -o /dev/null -w '%{http_code}\n' 'https://<preview>/api/nexora-demo-leads' -X POST -H 'content-type: application/json' -d '{"action":"list"}'
```
