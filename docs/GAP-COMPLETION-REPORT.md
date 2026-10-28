# End-to-end gap recheck and completion report

## Implemented in this pass

| Verified gap | Fix | Evidence |
|---|---|---|
| npm manifest and lockfile differed | Regenerated npm lockfile without installing or changing application dependencies | `verify-gap-completion` compares the root dependency maps |
| Reusable top announcement behavior incomplete | Added configurable `PromotionalBanner`; existing app announcement uses it | Text/action rendering, blank content, safe actions and dismiss/remount tests |
| Expired/disabled floating promotions remained visible | Campaign banner now checks enabled state/expiry and uses normal document flow rather than a fixed overlay | Expired campaign and disabled-state tests; shared clock rechecks expiration |
| Dismissal reset on ordinary rerenders | Dismissal keyed by campaign content, stored for the browser tab session; in-memory fallback if storage fails | Remount and changed-content tests |
| Mobile controls explicitly smaller than 44px | Added final customer-app CSS layer covering buttons, links, tabs, dots, selects and interactive entries; expanded actual dot target without enlarging its visual indicator | CSS/import-order tests; **rendered browser dimensions are not verified** |
| No sitemap delivery path | Added public-catalogue-only dynamic XML endpoint for Express and Vercel, canonical-domain validation, pagination, XML escaping, error responses and caching headers | Mock catalogue/canonical/security/error tests; server route and Vercel rewrite |
| Header/hero ignored section visibility | Template 07 honors both toggles while keeping Home anchor valid | Static rendering tests |
| Owner-disabled header links still appeared | Header settings now filter links and My Bookings | Static rendering tests |
| No action when contact and booking both unavailable | Booking CTA now gives a visible unavailable status rather than silently doing nothing | Source inspection |
| Mobile drawer lacked body scroll containment | Locks background scroll while open and restores it/focus on close | Source inspection; interaction suite remains passing |
| Reduced-motion incomplete in checkout/mobile exit | Removed entry/exit transforms and looping celebration animation when reduced motion is requested | Source/type checks; browser preference testing pending |
| Server ignored deployment port and documented .env loading | Server loads dotenv and honors CLI/environment port with validation | Type/build checks |

Existing Template 07 fixes remain: full consultation fields, live-slot checkout handoff, genuine reviews/ratings, saved clinic gallery, specialist profiles, equipment approval controls, self-hosted fonts and clinic legal documents.

## Verification actually performed

- `npm test`: **68/68 verification suites passed**.
- This includes app and edge type checks, production build, storefront regression tests, SQL migration fixture tests and the new gap-completion suite.
- No test suite was disabled.
- Build still warns about a large JavaScript bundle. React test renderer emits its existing deprecation/concurrent-renderer warnings.
- No live account, booking, payment, message or database mutation was performed in this pass.

## Deployment and unresolved verification gates

1. **Consultation-message persistence:** apply `backend/dermacure-consultation-message.sql` to the hosted database. The function is tested offline, not deployed. A nonempty message requires this RPC before checkout payment proceeds.
2. **Sitemap canonical domain:** configure `SITE_URL` to the actual public HTTPS origin. The endpoint deliberately returns 503 without it or if the public catalogue cannot be fetched; it does not advertise preview hosts or silently output incomplete results. Express and Vercel deployments are supported. A generic static-file-only host needs to route `/sitemap.xml` to this handler or provide its own generated artifact. No static sitemap file is claimed to exist.
3. **Live integrations:** database schema/RLS deployment, payment settlement/refunds, authentication email redirects/delivery, messaging providers and DNS require checks against the actual configured environment. Outbound access in this workspace does not include those provider hosts.
4. **Real-browser acceptance:** 320/375px rendered target sizes, overflow, keyboard/touch operation and motion preferences are not measured here; no browser executable is available. CSS minimum-target enforcement is not a substitute for that test.
5. **Staff role journey:** the previous audit's staff identity-to-workspace permissions concern remains **Needs Verification**. This pass did not add invitations, cross-account staff access or permission grants; doing so without verifying the intended authorization model would be unsafe. No claim that staff-role access is complete is made.
6. **Clinic content:** approved equipment details, real consented comparison photos, pricing and clinic privacy/terms must come from the clinic. Empty content is not replaced by invented endorsements or medical claims.

## Configuration reference

`SITE_URL`, `SUPABASE_URL` and `SUPABASE_ANON_KEY` are documented in `.env.example`. Sitemap reads only public published slugs; no service-role key is required, and owner dashboards, authentication, recovery and private booking URLs are not included.

Dismissal lasts for the browser tab session and exact campaign content. Changing the text/action/expiry creates a new announcement. Blocked storage falls back to the current component lifetime.
