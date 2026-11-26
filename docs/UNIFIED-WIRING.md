# Unified wiring patch

Five pieces of wiring that were specified separately but ship together, because
each one changes how the previous one is reached:

1. `/sign-in` and `/sign-up` auth route aliases.
2. `ProfileCompletionGate` for Google sign-ups that return without every
   mandatory detail.
3. `nexorasalon.online` canonical-host **308** redirects.
4. Server-side 25% payment deposit safety guard.
5. Full template checks (all 14 storefronts) re-run as part of the same suite.

Run the whole thing with:

```bash
npm run lint            # tsc --noEmit (app + server + api)
npm run lint:edge       # edge-function TypeScript project
npm run test:unified    # this patch: aliases, gate, redirects, deposit guard
npm run test:wiring     # every template: rendering, editor persistence, booking
```

`npm test` runs the typecheck, the production build and every
`scripts/verify-*.mjs` suite (including `verify-unified-wiring.mjs`, plus
`verify-google-oauth.mjs` and `verify-website-wiring.mjs`).

## 1. Auth route aliases

| Path        | Serves                | Mode                        |
| ----------- | --------------------- | --------------------------- |
| `/login`    | `login.html`          | `?auth=signin\|signup\|forgot`, else detected |
| `/sign-in`  | `login.html` (alias)  | sign-in                     |
| `/sign-up`  | `login.html` (alias)  | sign-up                     |

- `src/lib/authRoutes.ts` is the single source of truth (`authModeForPath`,
  `isAuthEntryPath`, `authCallbackPath`, `AUTH_DOCUMENT_PATHS`).
- `vercel.json` rewrites `/sign-in` and `/sign-up` to `/login.html`.
- `server.ts` serves `login.html` for `/^\/(?:login|sign-in|sign-up)\/?$/` in
  both the Vite middleware and the production static branch.
- `src/AppRouter.tsx` boots the application bundle for every auth path, and
  `src/App.tsx` passes the alias mode into `AuthPage` while `AuthPage` also
  derives it from the pathname.
- **Google OAuth, email confirmation and password-recovery links always return
  to the canonical `/login?auth=…` URL**, so only one document owns the
  canonical link, `noindex` metadata and prerendering. `/login` entries keep
  their exact path and query (no churn for existing links).

## 2. `ProfileCompletionGate`

Google can return an existing/new Google identity before NEXORA has the fields
the sign-up needs (customer: name, date of birth, WhatsApp number; owner: name,
salon name). The old behaviour threw
`Google sign-up is missing required customer details… Please sign out…`, which
stranded a brand-new account.

Now `App.tsx` detects the gap with `missingGoogleSignupFields()` and renders
`src/components/ProfileCompletionGate.tsx`. The session already exists, so the
gate collects just the missing fields and saves through the **same** writer the
OAuth return path uses (`applyGoogleSignupProfile`):

- customer: `auth.updateUser` metadata → `studioflow_customer_update_details`
  → optional `studioflow_customer_claim_ref`;
- owner: `auth.updateUser` metadata → `profiles` row update.

Existing identities are still excluded from signup attribution by
`isNewGoogleAccount(intent, session.user.created_at)`. The customer app keeps
its own "One last step" sheet (`CustomerApp`) — the gate is only the OAuth
return path.

## 3. Canonical host 308 redirects

`https://nexorasalon.online` is the only indexable origin (matching
`index.html`, `login.html`, `src/lib/publicSeo.ts` and `server/sitemap.ts`).

- `server/canonicalHost.ts` (`canonicalHostRedirect()`, installed in
  `server.ts`) answers `www.nexorasalon.online` and plain-http requests with
  **308** to the apex origin, preserving path and query.
- `vercel.json` declares the same rule:
  `{"source": "/(.*)", "has": [{"type":"host","value":"www.nexorasalon.online"}],
  "destination": "https://nexorasalon.online/$1", "permanent": true}`.
- **Preview hosts are never redirected**: `.vercel.app`, `.e2b.app`,
  `localhost`, IPs and any host not in the alias list are served unchanged, so
  previews keep working. `/api/*`, `/.well-known/*` and `favicon.ico` are exempt,
  and only `GET`/`HEAD` navigate.

Environment overrides (all optional):

| Variable                        | Effect                                              |
| ------------------------------- | --------------------------------------------------- |
| `NEXORA_CANONICAL_ORIGIN`       | Use another canonical origin (must be `https`).     |
| `NEXORA_CANONICAL_REDIRECT_HOSTS` | Comma-separated extra alias hosts to 308.         |
| `NEXORA_CANONICAL_REDIRECTS=off`  | Disable the middleware (previews/staging).         |

## 4. Server-side 25% deposit guard

Money authority stays where it already was: `studioflow_private.register_payment`
(`expected = ceil(service_price * 100 * 0.25)`, rejects `expected < 100`),
`studioflow_settle_payment`, and the provider verification in
`supabase/functions/studioflow-payments`. The Node layer previously had **no**
check, so an under-paid booking could be forwarded without one.

- `server/depositGuard.ts` — `depositPaiseFromRupees` (BigInt decimal ceiling,
  parity-tested against the edge function's `depositPaise`),
  `depositPaiseFromTotal`, `quoteDeposit`, `assertDepositSatisfied`,
  `DepositGuardError`.
- `server/bookingDeposit.ts` + `api/booking-deposit.ts` — `GET|POST
  /api/booking-deposit`, registered in `server.ts` behind a rate limit.

```
GET /api/booking-deposit?total=999
→ 200 { requiredDepositPaise: 24975, requiredDepositRupees: 249.75,
        chargePaise: 24975, balancePaise: 99900, satisfied: false }

POST /api/booking-deposit  {"totalPaise": 99900, "paidPaise": 10000}
→ 422 { code: "deposit_required", requiredDepositPaise: 24975,
        shortfallPaise: 14975 }
```

The response never exposes a client-chosen deposit: `chargePaise` is always the
25% ceiling. A total whose 25% is below ₹1 is refused
(`deposit_below_minimum`), mirroring `register_payment`. Read-only previews may
pass `enforce=false` to get a quote without enforcement.

## 5. Full template checks

`npm run test:wiring` renders and exercises **all 14 templates** (saved promo
copy, social links, policies, toggles, empty services, dashboard dedupe, storefront
bookings, reels, shorts, app install). It is part of `npm test` and is asserted by
`scripts/verify-unified-wiring.mjs`, which also fails if the wiring suite stops
enumerating `CATEGORY_TEMPLATES`.

## Deployment notes

- No SQL migration is required by this patch: the 25% rule is already enforced
  in the database and edge function; this adds the Node-side guard.
- Vercel: `git.deploymentEnabled` stays `false` in `vercel.json` (this repo
  deploys from the existing pipeline), so the `redirects` rule above applies to
  whichever deployment serves `nexorasalon.online` and `www`.
- Google OAuth redirect URLs must include the canonical host
  (`https://nexorasalon.online/login`) in Supabase Auth → URL configuration;
  the aliases redirect through it rather than being added separately.
