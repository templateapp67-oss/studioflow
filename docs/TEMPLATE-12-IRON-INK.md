# Template 12 — Iron & Ink data integration

Template 12 uses StudioFlow's existing Supabase project, browser client, owner identity and `studioflow_websites` tenant. Its database tenant key is `site_id = studioflow_accounts.user_id = studioflow_websites.owner_id`; the `template_key` is constrained to `iron-ink`. It does not create another tenant table or use a service-role key in browser code.

## Apply and seed

1. Take the normal Supabase backup and apply `supabase/migrations/202610300003_template12_iron_ink.sql` after the current StudioFlow schema and `202610300002_prism_chroma_template_10.sql` baseline. The migration is transactional and written to be rerunnable.
2. The owner completes Template 12 onboarding. StudioFlow calls `studioflow_ensure_account`, `seed_template12(site_id)`, then syncs settings, categories, artists and the existing gallery into the normalized `ink_` tables. The seed is tenant-scoped and idempotent; it does not overwrite existing seeded records on conflict. It intentionally creates no portfolio photos or customer testimonials: the storefront labels its stock-image fallback as a demo lookbook and hides reviews until real, non-demo client-approved text is supplied. The four initial artist records are sample roster entries and must be confirmed or replaced before publishing.
3. Publish the website through the existing StudioFlow publish flow. The public site resolves the slug through `get_template12_site_by_slug`; if the migration or payload is unavailable, the existing starter/demo content remains as a fallback.
4. The owner dashboard exposes **Iron & Ink Studio** for tattoo-studio accounts. Booking inserts create an `ink_notifications` row; the admin panel has a live booking subscription and a notification inbox.

The browser continues to use `src/lib/supabase.ts`. For the optional Edge Function, deploy `supabase/functions/iron-ink-public` to the same Supabase project and provide that project's `SUPABASE_URL` and `SUPABASE_ANON_KEY` as function environment variables. It needs no service-role secret. The current frontend calls the project RPCs directly; the Edge Function is a public integration surface for trusted consumers.

## Tables and public exposure

Template-owned tables: `ink_studio_settings`, `ink_categories`, `ink_artists`, `ink_portfolio`, `ink_pricing_plans`, `ink_bookings`, `ink_availability`, `ink_blocked_dates`, `ink_testimonials`, `ink_faqs`, `ink_aftercare`, `ink_blog_posts`, `ink_enquiries`, `ink_onboarding`, and `ink_notifications`. They have timestamps, update triggers, tenant-scoped indexes and constraints; active bookings have a partial unique index on artist/date/start time excluding cancelled bookings.

All tables have RLS enabled. Owner `ALL` policies compare `site_id` with `auth.uid()`. Public select is limited to public studio settings and content tables, with active/published filters for categories, artists, portfolio, pricing, testimonials and blog posts. FAQs and aftercare are intended public content. Anonymous inserts are granted only for pending/unpaid bookings and unread enquiries, with owner-site existence checks, SQL validation and rate-limit triggers. Customers with an authenticated `customer_id = auth.uid()` may read their own bookings and may update only to `cancelled`; phone/email claims are not used as a booking lookup or authorization key. No write policy uses `USING (true)`.

Booking creation validates age 18+, phone/email, active category and artist, future date, configured availability, blocked dates, rate limits and overlapping appointments under a transaction-level advisory lock. The slot lookup returns only schedule-compatible, unblocked, unbooked slots. The 30 default tattoo and body-art categories are seeded active with non-negative starting prices, numeric slot durations, human-readable duration labels, and full service descriptions. The owner editor preserves the complete default set, exposes enable/price/duration/description/image controls, and syncs those values to the public category payload.

Booking submissions are requests, not confirmed appointments: they are pending and unpaid, and this integration does not charge deposits. The customer explicitly acknowledges that the displayed deposit has not been paid; the success state says so, and provides a WhatsApp deep link with the request reference, artist, date/time and deposit arrangement. Live-slot errors or dates with no open times also offer the WhatsApp path. No payment provider or payment confirmation is implemented.

## Social profiles, featured media and loyalty (storefront)

Template 12 renders its own dark-luxury **Promotions & Offers**, **Watch our work – Reels & Shorts**, **Follow our studio**, **Featured Videos & Reels**, **Loyalty & Rewards** and **Share & referral** sections inside `IronInkWebsite`; the shared `WebsiteSections` component now only supplies the policy cards for this template. This keeps the Template 12 treatment isolated from the other salon templates.

- **Social profiles** read `profile.instagramHandle`, `profile.facebookPage` and `profile.youtubeChannel` (the same fields the existing Social & Videos flow and `ink_studio_settings.socials` already use). `src/lib/ironInkSocial.ts` accepts either a bare handle or a full http(s) profile URL, upgrades it to https, rejects schemes/credentials/ports and unrelated hosts, and extracts the configured display handle. Empty or invalid platforms are omitted entirely — no placeholder card implies a studio has a profile it has not configured. Every rendered link has `target="_blank"`, `rel="noopener noreferrer"` and a descriptive `aria-label`. The owner editor shows an inline validity/setup message for each platform.
- **Featured media** uses `profile.socialVideos` for owner reels (title, caption, poster, link) and `profile.ironInk.media` for the six Template 12 studio guides. The starter guides are illustrative AI-generated posters bundled at `/public/templates/12/media/`, explicitly labelled **DEMO POSTER · NOT CLIENT WORK**; they are not reviews, portfolio work or client results. Owners can edit every title, caption, poster and optional YouTube/Instagram link in the Template 12 editor, remove or add cards, or reset to the starter examples. Existing reels can also be managed through **Social & videos**. Posters lazy-load with reserved 4:3 dimensions; video previews use `preload="none"`, `muted` and `playsInline`, only mount after the visitor presses the play control, and never autoplay with sound. A missing poster falls back to a labelled placeholder, and `prefers-reduced-motion` disables hover movement and the autoplay-on-open preview.
- **Loyalty** reads the signed-in customer's own wallet from the existing authorized `studioflow_customer_rewards_dashboard` RPC (`src/components/iron-ink/useIronInkLoyalty.ts`). It filters by this studio's slug and displays only server-returned points, earned/redeemed totals, tier and tier thresholds. Guests are never queried and see a sign-in/join action with an em dash instead of a balance. A signed-in customer without a wallet sees an honest "no balance yet" state. The **View perks** drawer lists only the studio's saved, enabled perks, traps focus, closes on Escape/backdrop, restores focus, locks background scroll and adapts to a mobile bottom sheet. Perk examples such as “10% off after 3 visits” and a free aftercare kit are inactive suggestions until the owner adds, edits, enables and saves them in the Owner Workspace Template 12 editor or the existing Loyalty & Rewards hub. Settings persist through the existing `setLoyaltyConfig` → `studioflow_save_workspace` flow; no balance, tier, visit count or earned reward is invented in the browser.

The storefront's hero counters are derived from the saved category, service, artist and branch counts instead of invented years, piece totals or satisfaction percentages; artist cards open the artist profile, and review stars appear only when an owner-supplied testimonial has a real saved rating.

The storefront respects the existing `websiteSections.social`, `websiteSections.videos` and `websiteSections.loyalty` toggles and the saved `sectionHeadings` copy. The owner-only "Edit" actions appear only when `onManageDashboard` is supplied by the preview, never on a public published site.

## Promotions, share & referral, Reels & Shorts

These three storefront sections are Template 12 only. They reuse the existing dark glass/card tokens (`--ii-gold`, `--ii-accent`, `--ii-line`, the glass gradients in `src/components/ironInk.css`) and the shared Framer Motion variants in `src/components/iron-ink/motion.ts`.

### Promotions & offers

`src/components/iron-ink/IronInkPromotions.tsx` renders the offer grid (1 / 2 / 3 columns). Each card shows a title, a short description, an accent discount badge, a “Valid till” date, a coupon chip with a copy button (“Copied!” feedback) and **Book this offer**, which opens the existing booking flow with the offer's category pre-selected and an offer chip carried into the booking request.

Offer resolution lives in `src/lib/promotionsMock.ts`:

1. `offers` prop (database rows) — preferred, used when non-empty.
2. Otherwise the salon's existing `profile.promoCampaign` (Marketing → promo banner), while it is enabled and not expired.
3. Otherwise `promotionsMock` — five tattoo-studio demo offers in ₹ with codes (IRON15, FLASHFRIDAY, COUPLE2, AFTERCARE, COVERUP), labelled **SAMPLE OFFER**.

The old empty state (“No active offers right now”) is kept and renders only when no live offer exists from the real source *and* the mock list is empty/expired.

**Replacing the mock with database data:**

```tsx
// src/components/IronInkWebsite.tsx
<IronInkPromotions profile={siteProfile} offers={salonOffers} onBookOffer={offer => beginBooking(offer.category, offer)} />
```

where `salonOffers: PromotionOffer[]` comes from a Supabase query (or RPC) in the shape
`{ id, title, description, badge, validTill, couponCode?, category? }`. Expired rows are filtered by
`livePromotionOffers()`, and the salon's own rows always win over `promotionsMock`. Nothing else in
the section changes; you can leave `promotionsMock` as the preview fallback or delete its entries to
make an owner-only empty state appear.

### Share & referral

`src/components/iron-ink/IronInkShare.tsx` replaces the shared share block for Template 12 and fixes the white-on-white buttons (the old block inherited `background:#fff` from `.secondary-action` while `.ii-standard-sections` forced `color:#fff`). The new buttons are ≥44px tall, `border-radius:12px`, have icons and labels:

- **Share on WhatsApp** — green (`#15803d`, white text, AA contrast) with an inline WhatsApp glyph, opens `https://wa.me/?text=…`.
- **Copy salon link** — glass/outlined style, clipboard with a selection-copy fallback and a manual input if the browser blocks the clipboard.
- **Share…** — only rendered where `navigator.share` exists.

The shared URL is always built with `websiteLink(slug)` → `<origin>/?site=<slug>`; nothing is hardcoded and no other salon's link can be produced. The confirmation toast is dark-theme (green tint border, light-green text) and appears **only** after a real copy/share, then auto-hides after 3 seconds (a `status`/`alert` live region, with reduced-motion respected).

### Watch our work – Reels & Shorts

`src/components/iron-ink/IronInkShorts.tsx` is the customer gallery. Filters are **All | YouTube | Instagram | Facebook** (proper `tablist` with arrow-key navigation). Cards are 9:16, a horizontal scroll-snap carousel on phones and a 2/3-column grid above 760px, and every card carries a platform badge. No iframe is mounted until the visitor taps a card; a blocked or slow embed swaps to a fallback card with a **Watch on Instagram/Facebook/YouTube** link.

URL handling is centralised in `src/lib/socialVideoEmbeds.ts`: only `youtube.com`, `youtu.be`, `youtube-nocookie.com`, `instagram.com`, `facebook.com` and `fb.watch` over https are accepted (look-alike hosts, credentials, ports and other protocols are rejected), the platform and id are re-parsed, and the canonical link and embed URL are rebuilt and percent-encoded — user input is never injected as HTML.

- YouTube → `https://www.youtube-nocookie.com/embed/<id>` (Shorts URLs are converted).
- Instagram → `https://www.instagram.com/reel/<code>/embed`.
- Facebook → `https://www.facebook.com/plugins/video.php?href=<encoded>`.

Every iframe uses `loading="lazy"`, `referrerPolicy="strict-origin-when-cross-origin"`, a `sandbox` allow-list and an accessible `title`.

Until a salon publishes videos, three clearly-labelled sample cards (`SAMPLE · NOT CLIENT WORK`, local poster images from `public/templates/12/media/`) are shown so the section is never empty.

### Owner “Social videos” manager

`src/components/iron-ink/IronInkSocialVideosManager.tsx` is mounted in the Template 12 editor (`IronInkEditor`). The owner pastes a URL, the platform is auto-detected and validated live, a thumbnail preview is shown, and they can add (max 12), reorder, enable/disable and delete videos. Rows are saved to `public.salon_social_videos`; when no owner session exists (design preview) the same controls edit a browser-local list and say so — the public site never reads that list.

Data access lives in `src/lib/salonSocialVideos.ts`: `createSalonSocialVideo`, `updateSalonSocialVideo`, `deleteSalonSocialVideo`, `reorderSalonSocialVideos`, `fetchOwnerSalonSocialVideos` (RLS-scoped) and `fetchPublicSalonSocialVideos(slug)` (via the `get_salon_social_videos` RPC). Every call fails soft to the sample cards.

### Migration `202610300005_iron_ink_social_videos.sql`

```sql
create table public.salon_social_videos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.studioflow_accounts(user_id) on delete cascade,
  platform text not null check (platform in ('youtube','instagram','facebook')),
  url text not null check (/* https + allow-listed host, no credentials */),
  title text not null default '' check (char_length(title) <= 120),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Highlights: a `platform`/host consistency check, a unique `(salon_id, url)` index, a `before insert` trigger capping a salon at 12 videos, an `updated_at` trigger, RLS with an owner `ALL` policy (`salon_id = auth.uid()`) and a public `SELECT` policy limited to `is_active` rows, plus `get_salon_social_videos(p_slug)` (`security definer`, slug-scoped, active rows only) granted to `anon`/`authenticated`. Rollback: `supabase/rollback/202610300005_iron_ink_social_videos_rollback.sql`.

Apply it after the Template 12 migration:

```sh
supabase db push   # or run the SQL file in the SQL editor
```

## Storage buckets

- Public-read, owner-write: `ink-logos`, `ink-gallery`, `ink-artists`, `ink-blog`.
- Private reference uploads: `ink-references`; anonymous image uploads are limited by bucket MIME/size settings and storage policy to 5 MB, and only the owning authenticated site can read/delete its reference files. Booking rows store the site-prefixed object path, not a public URL.

Do not make `ink-references` public or reuse the general authenticated-only `studioflow-media` uploader for anonymous customer references.

## GlowSlot / separate Supabase projects

The Edge Function uses the StudioFlow project's anon key and public validated RPCs. It does not expose a service-role key and has no raw phone/email search endpoint. Cross-project GlowSlot synchronization is **not configured or verified**. A separate Supabase project cannot share this project's Auth session or database RLS identity automatically; a production bridge needs an explicitly trusted server-to-server contract, signing/authentication, consent and abuse controls. Do not treat the public booking endpoint as an authenticated customer-history API.

## Rollback

Use `supabase/rollback/202610300003_template12_iron_ink_rollback.sql`. It removes Template 12 functions, policies, realtime membership, triggers, tables and its private schema. It drops only empty Template 12 buckets so existing uploaded files are not destroyed. It intentionally retains the shared `studioflow_templates` catalogue row and never drops non-Template-12 objects. Back up customer booking/reference records before rollback if they must be retained elsewhere.

## Local verification

Run:

```sh
npm run test:template12
npm run lint
npm run lint:edge
npm run build
```

`test:template12` runs three offline guardrail suites (category content; social/media/loyalty; promotions, share & referral and Reels & Shorts) plus PGlite against stub Supabase schemas. It verifies all 30 active seeded categories have a starting price, numeric duration, human-readable duration label and detailed description; double-application; repeat seeding; published site payload; slot availability; double-book prevention; pending/unpaid booking and notification creation; RLS on every Template 12 table; private reference bucket MIME/size and owner-read policy; customer-ID-only booking read; realtime membership; and rollback. The social/media/loyalty guardrail additionally verifies dynamic handles and safe external URLs, hidden unconfigured platforms, bundled local demo posters and labels, lazy/non-autoplay media, guest versus signed-in loyalty states, inactive perk suggestions, owner media/perk editing, the accessible drawer contract, and the responsive/reduced-motion CSS. The promotions/share/Reels suite checks the five mock offers and their replacement by live data, the empty-state fallback, coupon copy, WhatsApp/copy/native share links plus the 3-second toast, URL allow-listing and rebuilt embed URLs, tap-to-load iframes with sandbox/referrer-policy, the sample fallback cards, the owner manager controls and the `salon_social_videos` migration/rollback. None of these are live Supabase deployment tests.

### Deployment checklist

- [ ] Confirm the base StudioFlow tables and existing Supabase project are up to date.
- [ ] Back up, apply the migration, and check the Supabase migration history.
- [ ] Complete onboarding as an owner; verify 30 categories, 4 sample roster entries and default FAQ/aftercare/blog content; confirm or replace the sample artist roster, and upload actual portfolio work before publishing, then edit and re-sync owner settings.
- [ ] Publish a tattoo-studio site and verify all 30 active categories show their price, duration and description, with owner changes visible after sync.
- [ ] Test the customer path end-to-end: category → selected artist → live date/time slots → size/placement → private reference upload → booking-request acknowledgement.
- [ ] Confirm the success screen clearly says the request is unpaid/unconfirmed and that the configured WhatsApp link carries the booking reference and deposit follow-up; test WhatsApp fallback for unavailable slots and failed uploads.
- [ ] Check the dark/red/gold glass styling, reduced-motion behavior, mobile layout, masonry image loading and lightbox keyboard close at desktop, tablet and phone widths.
- [ ] Confirm the three social cards show the studio's own handles and open the configured profiles in a new tab; clear one field and confirm its card disappears.
- [ ] Replace or approve the six illustrative studio-guide posters, add real owner reels, and confirm no demo media is presented as client work.
- [ ] Sign in as a customer to confirm the points/tier card matches the rewards dashboard; confirm guests see the join action and never another customer's balance.
- [ ] Open **View perks** with keyboard only (Tab loop, Escape, focus return) on desktop and mobile; verify only enabled, saved perks appear and paused programmes show no promises.
- [ ] Verify anonymous pending/unpaid booking and enquiry creation; test age, input, throttling, blocked-date, overlapping-slot and cancelled-booking cases.
- [ ] Verify owner-only CRUD, another owner's denial, customer self-read/cancel behavior, private reference upload/read isolation, and booking realtime delivery.
- [ ] Deploy the optional Edge Function only if an external client is actually configured; verify its CORS/auth/rate-limit behavior in the target project.
- [ ] Confirm the five sample offers appear with copyable coupon codes and that **Book this offer** pre-selects the category and records the offer in the request; publish a real offer and confirm it replaces the samples.
- [ ] Share on WhatsApp, copy the link and use the native share sheet; confirm each toast appears only after the action, auto-hides after 3 seconds and that the link carries `?site=<slug>`.
- [ ] Add a YouTube Short, an Instagram Reel and a Facebook Reel in **Social videos**, reorder/disable/delete them, and confirm the customer gallery respects the order and filters; confirm the fallback card appears when an embed is blocked.
- [ ] Test the rollback on a non-production copy and inspect storage retention before any production rollback.

No live Supabase migration, Edge Function deployment, or GlowSlot cross-project test has been performed in this work session.
