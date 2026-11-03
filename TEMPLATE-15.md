# Template 15 — KeshKraft Men's Hair Studio

- **Template ID:** `mens_hair_studio` (not `barber`, `hair_salon` or `unisex_salon`).
- **Category:** Men's Haircut & Hair Colour Studio. Adults / men only. Currency INR ₹.
- **Layout:** `mens_olive_editorial`: charcoal, deep olive, off-white, warm beige and matte bronze. Scoped `.kk-*` styles; no existing template design replaced.
- **Preview:** `/?template=15` or `/?template=mens_hair_studio`. Aliases `template-15`, `template15`, `keshkraft`, `mens-hair-studio`.
- **Publication:** no website is published by this implementation. Click **Customize** to edit; preview comes first. Publication remains the existing explicit owner action.

## Services & isolation

`src/lib/keshkraft.ts` contains 20 haircut and 10 hair-colour starters with INR prices, integer durations, descriptions and local male-only imagery. The categories are exactly `Men's Haircuts` and `Men's Hair Colour`. No package category is seeded, even if shared package helpers are called.

A service must carry `mensTemplateId: 'mens_hair_studio'`, belong to an approved category, pass the unrelated-service name/description filter and not be hidden. A barber must belong to the same business type and have explicit male-profile confirmation. Both public service selection and the common booking modal receive only the filtered records and reviewed image URLs. Existing records from another template are retained in the workspace, never overwritten or rendered here.

Shared generic demo reels, inherited customer photos and other-template service image presets are not used. Template 15 has its own reviewed image/video manifest; changed URLs lose approval. This is an explicit human review gate, **not automatic gender detection**.

## Customer booking

`KeshKraftWebsite` hands its filtered service, optional male barber and approved coupon into the existing `BookingModal`:

1. Service selection: only the two approved categories.
2. Specific barber or any available barber (the shared modal groups barber selection with service selection).
3. Date calendar.
4. Real server-returned slots, with salon hours / holidays, staff hours / status / breaks / leave, duration, existing active bookings and lead notice checked.
5. Existing customer sign-in, name, mobile and account email; existing payment review.
6. Existing confirmation, booking ID, price, payment and booking status; shared `studioflow_bookings`, customer account and dashboard history.

Demo previews never create an appointment or pretend to have available times. The website explains that a live approved studio is required. Real bookings use the existing provider-verified payment flow; no fake payment success is added. Branch-specific and multi-service bookings are intentionally not offered by this two-category single-studio template.

## Customizer & dashboard

- Direct demo route: **Customize**, edit locally, **Save to workspace**, **Close / preview**. **Create my website** carries the edited draft through session storage into the authenticated owner workspace.
- Template-picker modal: desktop / tablet / mobile preview first; **Customize this template** opens the dedicated editor; the chosen workspace is carried into setup.
- Owner preview: **Customize** uses the existing profile, services, staff and loyalty setters and the existing autosave / revision / RLS ownership system.
- Tabs: Brand, Services, Barbers, Gallery, Videos, Reviews, Offers, Rewards, Booking, Contact.
- Brand: logo / hero image uploads or URLs, heading, description, button labels, fonts, palette, footer and section visibility.
- Services: add/edit/delete/hide, exact categories, INR prices, durations, descriptions, photos.
- Barbers: add/edit/remove with confirmation, photo upload, male-profile confirmation, experience, haircut/colour skills, service assignments, status and weekly schedule.
- Booking: salon weekly hours, holidays, daily barber breaks and date-ranged leave. Lead notice stays in existing dashboard booking settings.
- Offers: CRUD, coupon, percent/flat discount, eligible service IDs, validity dates, activation and explicit approval. Demo offers are not redeemable until approved.
- Rewards: name, enable/disable, earning rate, reward thresholds and discounts.
- Gallery / video: add/edit/delete/show/hide; review the exact URL, all visible people, and matching thumbnails before approval.
- Reviews: labelled demo stories, hide/delete/add; existing salon reviews are read without customer photography and filtered to menu services.
- Contact: address, city, postcode, phone, WhatsApp, email and Instagram.

**Existing-app caveat:** the shared `save_workspace` RPC updates an already-published site's content when the owner saves. This existing behaviour was inspected, not changed globally. No publish RPC is called by this template's editor. Review a new unpublished workspace before approval if draft-only changes are required.

## Image & video assets

All new assets are local under `public/templates/15/`; no Ziya or other-template photographs are reused.

| Asset | Content |
| --- | --- |
| `hero.webp` | AI-generated editorial photo: adult Indian male client, adult male barber. Visually inspected. |
| `fade.webp` | AI-generated adult male fade reference, visually inspected. |
| `colour.webp` | AI-generated adult male brown/highlight reference, visually inspected. |
| `long.webp` | AI-generated adult male long-hair reference, visually inspected. |
| `barber-1.svg` … `barber-3.svg` | Clearly labelled male illustration placeholders, not real employee portraits. |
| `style-1.svg` … `style-17.svg` | Individual labelled male style placeholders, not claimed as haircut-result photographs. |
| `placeholder.svg` | Male-focused fallback for missing, broken or unreviewed images. |
| `{fade,colour,long}-preview.mp4` | Three silent 5-second animated AI-photo references, 540×720 H.264; not haircut-process footage. |

Photos are compressed WebP. References are reused for related menu cards and explicitly labelled as illustrative; they are not thirty distinct service-result photographs. The gallery uses three inspected photographic references and individual illustrations for the remaining style slots.

**Playable videos:** the video section now ships three bundled male-only MP4 style previews. They are honestly labelled **animated AI-photo references, not haircut-process footage**. The twelve real-process subjects remain hidden editor placeholders until the studio supplies and approves actual footage. Direct HTTPS MP4/WebM replacement videos require full-content and matching-thumbnail review. Real before/after salon results and real barber photos remain owner-supplied approval items. Rebuild the starter clips with `FFMPEG_PATH=/path/to/ffmpeg node scripts/build-template15-videos.mjs`; ffmpeg is not an application dependency.

## Chat, portfolios and waitlist

- **Live Chat:** fixed bottom-left launcher, accessible modal, local contextual support replies and quick prompts. Clearly simulated, no human agent and no message delivery/persistence.
- **View Portfolio:** every barber card opens its own gallery. Preview references are assigned individually and explicitly labelled demo. Live portfolios show consented, male-reviewed work or approved external gallery images explicitly assigned to that barber in the Gallery editor; starter references are not presented as real barber work.
- **Chat with Stylist:** selected-barber inquiry modal. Preview submission is explicitly simulated. A live site hands a composed inquiry to the barber’s configured phone, or studio WhatsApp as fallback. No delivery/response guarantee; no configured number means no send action. Messages are never silently stored in a second backend.
- **Book / Waitlist:** date/service/barber selector, live RPC availability, and **Join Waitlist** only after a successful unavailable result (not a network error). An optional preferred time narrows the alert. Available slots hand date/time/barber into the existing booking modal. The shared booking modal also gets the same men-only waitlist option when no times are available. Preview has an explicitly labelled fully-booked example and simulated opening button.
- **Device-only waitlist:** bounded to 30 requests, deduplicated, persisted in localStorage, removable from the page. No names, phone numbers or emails collected; no extra database tables. Live checks run while the site is open, every 60 seconds and on focus. Matching openings show an in-page alert; browser notifications require opt-in and browser permission. Alerts do **not** run after the site/browser closes, send SMS/email, reserve an appointment or guarantee a slot. Recheck availability before booking. Server-backed/offline notification delivery is not implemented.
- Dialogs support Escape, focus containment, focus return, scroll locking and mobile layouts. Availability responses are guarded against stale date/service/barber requests. No existing fourteen-template UI acquires these controls.


## Supabase inspection & connections

Existing project inspected via the connected Supabase app: `zilwgiuiygqqardzutxi` (NEW FINAL TEMLETE APP). Inspected the relevant public tables and foreign keys, RPC definitions, workspace/staff JSON model, reward claims, RLS, and storage bucket policies. No customer PII or secret key values were read.

Reused:

- `studioflow_templates`: one additive `mens_hair_studio` entry; other IDs untouched.
- `studioflow_accounts.draft`: profile / menu / staff / loyalty; `profile.mensStudio` stores scoped content, hours, breaks, leave, media review and offers.
- `studioflow_websites.content`: existing owner-to-salon publication relationship.
- `studioflow_bookings`: existing reservation/payment/status/history, advisory-lock booking engine and 15-minute pending holds.
- `studioflow_customer_reward_claims`: existing issued reward vouchers, holding and redemption system. No parallel loyalty or booking tables.
- `studioflow_reviews`: existing customer review system; Template 15 never displays customer photos.
- `studioflow-media`: existing owner-folder upload helper and storage policies. No new public-write bucket.

Migration: `supabase/migrations/202611030003_template15_keshkraft.sql`.

Additive RPCs:

- `studioflow_mens_slots`: calls existing private availability per eligible barber, then intersects it with Template 15 hours, holidays, breaks and leave.
- `studioflow_mens_book`: scoped service/staff validation, request idempotence, server re-quote and existing atomic booking engine. Existing issued loyalty coupons keep the shared coupon-book path.
- `studioflow_mens_coupon_quote`: approved template offers with validity, eligibility and one-use-per-customer checks; existing reward codes delegate to the shared coupon quote.
- `studioflow_mens_rewards`: authenticated own-balance view and redemption into existing claims.

Template-specific booking and reward triggers guard alternate legacy RPC entry points too. Points are snapshotted into the existing booking payload **only at eligible fully paid completion**. Each booking contributes once, and changing rules later does not recalculate its award. Cancelled/unpaid bookings contribute no points. Customer/owner permissions and existing RLS remain intact; private helper execution is revoked from browser roles. No service-role key is in the frontend.

## Testing

Run:

```sh
npm run lint
npm run lint:edge
npm run build
npm test
node scripts/verify-template15.mjs
node scripts/verify-template15-migration.mjs
node scripts/verify-template15-interactions.mjs
```

The all-verifications runner discovers the new `verify-template15*.mjs` suites automatically. `verify-template15-legacy.mjs` compares every original template config, service, price, staff record and image reference against the session base registry, proving the original fourteen remain unchanged. `build-template15-catalog.mjs` regenerates only the additive catalogue seed from the typed config.

New tests cover catalogue count/order, aliases, 20+10 services, no packages, contamination rejection, staff scoping, URL-bound media approval, no generic video references, demo-offer guard, reward defaults, persisted deletion, preservation of other-template records, service/staff editing, and preview-only booking protection.

PostgreSQL integration tests use PGlite and explicit existing-core fixtures: migration rerun, authentication, scoped slots, breaks/leave/holidays, coupon approval/eligibility, invalid codes, booking idempotence, occupied slots, paid-only points, no duplicate earning, reward redemption and cancelled bookings. They are **not a claim of a live payment or customer booking**.

Optional browser test (browser dependencies live outside app dependencies):

```sh
BROWSER_TOOLS_ROOT=/path/to/browser-tools \
LD_LIBRARY_PATH=/path/to/chromium-libraries \
node scripts/check-template15-browser.mjs
```

Checks real rendering at 320 / 390 / 768 / 1024 / 1440 px, overflow, service-category filtering, complete colour menu, demo booking notice, unverified-video absence, all three actual MP4 playbacks, distinct portfolios, simulated support/inquiry, waitlist save/reload/removal/demo alerts, customizer save/preview, add haircut, mobile navigation and broken images.

Shared-surface tests retain all fourteen original templates. Intentional Template 15 exceptions (no generic app poster, no packages, no unreviewed stock reels/avatars and its dedicated customizer) are exercised in its own suite instead of forcing women's/mixed content into it.

## Deployment status

The Supabase connection was inspected successfully. The additive SQL migration is **prepared and tested locally, but has not been executed on the live project**. Deploy it before using Template 15 with an authenticated live owner account (the template ID has a foreign-key relationship in the existing database). Until then this work is a preview implementation, not a certified live-booking launch. No existing live website or customer data was changed.

## Approval / live acceptance checklist

- Approve individual men's haircut/colour results, before/after photographs, actual male staff photos and all twelve complete video subjects.
- Set real contact details, working hours, leave and booking notice.
- Approve or replace demo reviews/offers; review reward terms.
- Confirm migration deployment and test on an authorised test salon/customer account: login, exact date/time selection, payment-provider confirmation, concurrent booking attempts, customer/dashboard history, coupon use and paid completed reward credit.
- Do not publish until the owner approves. No real customer booking, payment or website publication has been performed by these offline/preview tests.

## Verification results — 3 November 2026

- `npm run lint` — passed.
- `npm run lint:edge` — passed.
- `npm run build` — passed.
- `npm test` — **103 / 103 verification suites passed**.
- Dedicated real-browser preview/editor checks — passed at 320, 390, 768, 1024 and 1440 px, including no horizontal overflow and no broken rendered images.
- Base-registry comparison — all original fourteen complete configs unchanged.
- Live authenticated customer booking, live payment, live RLS mutation and cloud save/reload acceptance — **not performed**. The prepared migration remains unapplied on the live project; no real salon/customer records were created for testing.

## Follow-up verification — videos and engagement

Dedicated interaction checks cover storage denial/corruption, active-request deduplication, capacity bounds, valid dates/times, exact-time/barber opening matching, unknown/unavailable-slot rejection, demo-versus-live portfolio attribution, configured inquiry handoff, and stale/error availability responses. Real-browser checks exercise all three video playbacks, all three distinct portfolios, chat, simulated inquiry, persisted device waitlist and demo opening/removal. The migration seed was regenerated but **not applied**. No publication or live database mutation was performed.

Follow-up acceptance results (3 November 2026): `npm test` **104/104 suites passed**, including lint, edge lint, build, original-fourteen registry preservation, migration tests and the new interaction suite. A final build, TypeScript lint and targeted UI/interaction checks also passed after preserving the waitlist-request date in the booking handoff. Expanded real-browser smoke passed, including actual decoded playback of each bundled clip and chat responsiveness at 320/390/768/1024/1440 px. `git diff --check` passed. Live migration deployment and authenticated booking/payment acceptance remain outstanding.
