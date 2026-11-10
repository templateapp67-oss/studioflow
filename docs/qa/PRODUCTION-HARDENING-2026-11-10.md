# Production hardening — 10 November 2026

Scope: the four findings from the code review (P0 server crash, P1 AI rate limit/auth,
P1 Clinic Journal XSS, Supabase RPC mismatches).

Method: every claim was checked against the code **before** a patch was written. Two of the
four reproduced exactly as described, one was a real but different bug than described, and one
(a missing `apply_referral` / `reschedule_booking` migration) is not a gap in this schema —
shipping the requested migration would have created a second implementation of operations that
already exist. Details and evidence for each are below.

| # | Review item | Verified? | Outcome |
|---|---|---|---|
| 1 | P0 — async Express endpoints crash the server | **Reproduced.** One `POST` killed the process | Fixed + regression gate |
| 2 | P1 — no JWT check / no rate limit on AI generation | **Confirmed** (no limiter, no session check anywhere in `server.ts`) | Fixed + regression gate |
| 3 | P1 — XSS in `ClinicJournal.tsx` | **Confirmed** (`dangerouslySetInnerHTML` on owner-editable body) | Fixed + regression gate |
| 4 | RPCs `apply_referral`, `reschedule_booking` missing | **Not reproduced.** Both flows exist under different names; CI already checks existence | No migration; added ACL/signature contract test |

---

## 1. P0 — remote crash of the API server

### Reproduction (before the fix)

```console
$ node dist/server.cjs --port 4599 &
$ curl -s -w '%{http_code}\n' -X POST -H 'content-type: application/json' \
    --data '{"availableServices":"x"}' http://127.0.0.1:4599/api/ai-recommendations
000                      # no response — the process is gone

$ curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4599/api/health
000                      # server never comes back
```

```
TypeError: (req.body.availableServices || []).slice(...).map is not a function
    at dist/server.cjs:1885:73
Node.js v22.22.3         # process exited
```

### Root cause — two independent defects

1. **A `catch` block that throws.** The fallback re-read the same unvalidated value
   (`req.body.availableServices.slice(0, 4)`), so the failure path failed the same way as the
   happy path. `/api/generate-promo-copy` had the same shape: `req.body.offer.toUpperCase()`
   throws when `offer` is a truthy non-string.
2. **Express 4 never sees a rejected promise.** A bare `async` handler that rejects becomes an
   unhandled rejection, and Node 22 exits on that by default.

### Fix

New `server/httpSafety.ts`:

```ts
/** Wraps an async route so a rejection reaches the error middleware, not the process. */
export function asyncHandler(route: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => route(req, res, next))   // sync throws become rejections too
      .catch(next);
  };
}

export function asArray<T = unknown>(value: unknown, max = 50): T[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, Math.max(0, max)) as T[];
}
export function asString(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
export function asNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity) {
  const parsed = typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value)
    : Number.NaN;                                    // null/true/'' are NOT 0/1
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
export function sendJson(res: Response, status: number, payload: unknown): boolean {
  if (!isResponseOpen(res)) return false;            // never write twice
  res.status(status).json(payload);
  return true;
}
```

Every route is now registered through the wrapper, and the terminal handler respects 4xx:

```ts
app.use(express.json({ limit: '256kb' }));
installProcessGuards();                              // logs unhandled rejections, exits on uncaught
app.post("/api/ai-recommendations", identifyCustomer, aiLimiters.recommendations,
  asyncHandler(async (req, res) => {
    const body = asObject(req.body);
    const availableServices = asArray<Record<string, unknown>>(body.availableServices, 30);
    const fallback = (reason: string) => ({ source: 'template', recommendations: /* built from validated values only */ });
    ...
  }));
app.use(apiErrorHandler());                          // 400/413 keep their status; 500 is generic
```

`apiErrorHandler()` deliberately does **not** reflect `error.message` for 4xx: the JSON parser's
message quotes the request body, which must not be echoed back or logged.

---

## 2. P1 — AI endpoints had no session check and no ceiling

`server.ts` forwarded every AI request to Gemini for any caller. Three additions:

**`server/supabaseAuth.ts`** — verifies the bearer token against Supabase Auth with the
*publishable* key (never the service-role key, which is detected and refused):

```ts
export function requireVerifiedUser(options: RequireUserOptions = {}): RequestHandler {
  const config = options.config ?? resolveAuthConfiguration();
  return async (req, res, next) => {
    if (!config.configured) { next(); return; }                 // no key: strict anonymous budget
    const token = readBearerToken(req.headers);
    if (!token) return void res.status(401).json({ error: 'Sign in to use this AI feature.', code: 'auth_required' });
    const user = await verifyAccessToken(token, config, options.fetchImpl ?? fetch);
    if (user === undefined) { next(); return; }                 // provider outage: do not deny
    if (user === null) return void res.status(401).json({ error: 'Your session has expired. …', code: 'invalid_session' });
    res.locals.authUser = user;                                 // lets the limiter key per user
    next();
  };
}
```

The verification cache is keyed by the token's SHA-256 digest (raw tokens are never stored),
TTL 60 s, bounded at 500 entries.

**`server/rateLimit.ts`** — dependency-free fixed-window limiter, bounded in memory:

```ts
app.post("/api/generate-promo-image", requireSignedIn, aiLimiters.promoImage, asyncHandler(…));
// 429: { error, code: 'rate_limited', retryAfterSeconds } + Retry-After / RateLimit-* headers
```

| Route | Session | Budget per caller / 10 min |
|---|---|---|
| `/api/generate-bio` | required | 20 |
| `/api/generate-promo-image` | required | 10 |
| `/api/generate-promo-copy` | required | 30 |
| `/api/veda-website-content` | required | 15 |
| `/api/ai-recommendations` | optional (customer browsing) | 30 anonymous, 120 signed in |

**Client** — `src/lib/aiRequestAuth.ts` attaches the session token; all six call sites
(`AIBioModal`, `PromoStudio` ×2, `vedaSanjeevaniCustomizer` ×2, `AIRecommendations`) now use it.
Every caller already had a template fallback for a non-2xx response, so a missing session
degrades the draft instead of breaking the page.

---

## 3. P1 — stored XSS in Clinic Journal articles

**Before** (`src/components/dermacure/ClinicJournal.tsx`): the article body only had `**bold**` →
HTML applied to it and was then injected verbatim, so any markup in an owner-editable article ran
in every visitor's browser:

```tsx
<span dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
```

**After** — `src/lib/journalRichText.ts` returns plain segments and React escapes them:

```ts
const INLINE_PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
export function parseJournalInline(value: unknown): JournalInlineSegment[] {
  /* returns [{ text }, { text, bold: true }, { text, italic: true }, …] — never HTML */
}
```

```tsx
// src/components/dermacure/JournalInlineText.tsx
export function JournalInlineText({ value }: { value: string }) {
  return <>{parseJournalInline(value).map((s, i) =>
    s.bold ? <strong key={i}>{s.text}</strong>
    : s.italic ? <em key={i}>{s.text}</em>
    : <React.Fragment key={i}>{s.text}</React.Fragment>)}</>;
}
```

`<script>`, `<img onerror>`, `<iframe>`, `<svg onload>`, `<style>` and attribute-escape payloads
now render as literal text. Formatting output is byte-identical to the previous renderer for the
shipped articles (including the old pairing of ambiguous `*` markers). `escapeHtml()` is also
exported and tested for any future HTML string context (email, share card).

---

## 4. RPC audit — no missing functions, so no migration

Client calls in `src/` were compared with every `create or replace function` in
`backend/*.sql` + `supabase/migrations/*.sql`, and then with the **live catalog** produced by
applying the whole chain (`scripts/verify-sql-migrations.mjs`, which already fails when a
`.rpc('name')` in the client has no function):

```
distinct client RPCs: 80   SQL definitions: 135   missing: none
PASS: live catalog serves all 89 client RPCs, 42 RLS tables, …
```

| Name in the review | What actually implements it | Where |
|---|---|---|
| `apply_referral` | `studioflow_customer_validate_ref(text)` (pre-signup check) → `studioflow_customer_claim_ref(text)` (claim after signup, advisory-locked, self-referral rejection) | `backend/customer-referrals.sql` |
| `reschedule_booking` | `studioflow_android_reschedule(p_booking uuid, p_date date, p_time text, p_stylist text)` (branch-aware, `security invoker`) | `supabase/migrations/202610300004_multibranch_support.sql` |

Adding the requested names would have created a second, competing code path for the same
operations — including a bypass of the advisory lock and the self-referral guard. What was
genuinely missing was **privilege coverage**, so `scripts/fixtures/rpc-contract.mjs` (run by
`verify-sql-migrations.mjs`) now asserts for all four referral/reschedule functions: exact
signature, pinned `search_path`, `authenticated` may execute, `anon` only where documented
(`validate_ref`), and never `PUBLIC`.

---

## Verification

| Command | Result |
|---|---|
| `npm run lint` / `npm run lint:edge` | pass |
| `npm run build` | pass (3 prerendered marketing docs unchanged, 16 template pages) |
| `npm run test:ai-hardening` | pass — unit + end-to-end against the built bundle |
| `npm run test:journal-richtext` | pass — 10 XSS payloads rendered through the real component |
| `npm test` | **136/136 verification suites, exit 0** |

New gates:

- `scripts/verify-ai-endpoint-hardening.mjs` — hostile bodies answered with JSON while the
  server stays up, 401 `auth_required` / `invalid_session`, 429 + `Retry-After`, bounded limiter,
  token parsing, and a static check that no route is registered as a bare `async` handler.
- `scripts/verify-journal-richtext.mjs` — renders `JournalInlineText` (the real component) against
  XSS payloads; also asserts no `dangerouslySetInnerHTML={{` remains.
- `scripts/fixtures/rpc-contract.mjs` — signature + ACL contract for the referral/reschedule RPCs.

**Mutation-checked.** Re-introducing the old unvalidated `availableServices` read makes the
hardening suite fail (`hostile body {"availableServices":"x"} gets a JSON answer`); restoring the
old `dangerouslySetInnerHTML` line makes the journal suite fail (`ClinicJournal must not inject
HTML`).

## Residual risks (not fixed here)

- **Rate limiting is per process.** On multi-instance hosting the table above is a floor per
  instance, not a global cap. A global cap needs a shared store (the Postgres limiter pattern
  already used by `submit-landing-lead`, or Redis).
- **`trust proxy` must be configured** behind a proxy (`TRUST_PROXY`, automatic on Vercel);
  otherwise all callers share one budget. Documented in `.env.example`.
- **Auth outage policy is allow-with-budget**, not fail-closed: an unreachable Auth server must
  not lock owners out of drafting copy. The state is reported in the `X-AI-Auth` response header.
- **No browser-based XSS execution test.** The payloads are proven inert by server rendering and
  by the removal of the injection path; a real browser (axe/DOM) run is still outstanding, as with
  the existing landing-page QA.
