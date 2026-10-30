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

Template 12 renders its own dark-luxury **Follow our studio**, **Featured Videos & Reels** and **Loyalty & Rewards** sections inside `IronInkWebsite`; the shared `WebsiteSections` component still supplies the promo, policy and share sections. This keeps the Template 12 treatment isolated from the other salon templates.

- **Social profiles** read `profile.instagramHandle`, `profile.facebookPage` and `profile.youtubeChannel` (the same fields the existing Social & Videos flow and `ink_studio_settings.socials` already use). `src/lib/ironInkSocial.ts` accepts either a bare handle or a full http(s) profile URL, upgrades it to https, rejects schemes/credentials/ports and unrelated hosts, and extracts the configured display handle. Empty or invalid platforms are omitted entirely — no placeholder card implies a studio has a profile it has not configured. Every rendered link has `target="_blank"`, `rel="noopener noreferrer"` and a descriptive `aria-label`. The owner editor shows an inline validity/setup message for each platform.
- **Featured media** uses `profile.socialVideos` for owner reels (title, caption, poster, link) and `profile.ironInk.media` for the six Template 12 studio guides. The starter guides are illustrative AI-generated posters bundled at `/public/templates/12/media/`, explicitly labelled **DEMO POSTER · NOT CLIENT WORK**; they are not reviews, portfolio work or client results. Owners can edit every title, caption, poster and optional YouTube/Instagram link in the Template 12 editor, remove or add cards, or reset to the starter examples. Existing reels can also be managed through **Social & videos**. Posters lazy-load with reserved 4:3 dimensions; video previews use `preload="none"`, `muted` and `playsInline`, only mount after the visitor presses the play control, and never autoplay with sound. A missing poster falls back to a labelled placeholder, and `prefers-reduced-motion` disables hover movement and the autoplay-on-open preview.
- **Loyalty** reads the signed-in customer's own wallet from the existing authorized `studioflow_customer_rewards_dashboard` RPC (`src/components/iron-ink/useIronInkLoyalty.ts`). It filters by this studio's slug and displays only server-returned points, earned/redeemed totals, tier and tier thresholds. Guests are never queried and see a sign-in/join action with an em dash instead of a balance. A signed-in customer without a wallet sees an honest "no balance yet" state. The **View perks** drawer lists only the studio's saved, enabled perks, traps focus, closes on Escape/backdrop, restores focus, locks background scroll and adapts to a mobile bottom sheet. Perk examples such as “10% off after 3 visits” and a free aftercare kit are inactive suggestions until the owner adds, edits, enables and saves them in the Owner Workspace Template 12 editor or the existing Loyalty & Rewards hub. Settings persist through the existing `setLoyaltyConfig` → `studioflow_save_workspace` flow; no balance, tier, visit count or earned reward is invented in the browser.

The storefront respects the existing `websiteSections.social`, `websiteSections.videos` and `websiteSections.loyalty` toggles and the saved `sectionHeadings` copy. The owner-only "Edit" actions appear only when `onManageDashboard` is supplied by the preview, never on a public published site.

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

`test:template12` runs two static storefront/editor guardrail checks (category content plus social/media/loyalty) and PGlite against stub Supabase schemas. It verifies all 30 active seeded categories have a starting price, numeric duration, human-readable duration label and detailed description; double-application; repeat seeding; published site payload; slot availability; double-book prevention; pending/unpaid booking and notification creation; RLS on every Template 12 table; private reference bucket MIME/size and owner-read policy; customer-ID-only booking read; realtime membership; and rollback. The social/media/loyalty guardrail additionally verifies dynamic handles and safe external URLs, hidden unconfigured platforms, bundled local demo posters and labels, lazy/non-autoplay media, guest versus signed-in loyalty states, inactive perk suggestions, owner media/perk editing, the accessible drawer contract, and the responsive/reduced-motion CSS. It is not a live Supabase deployment test.

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
- [ ] Test the rollback on a non-production copy and inspect storage retention before any production rollback.

No live Supabase migration, Edge Function deployment, or GlowSlot cross-project test has been performed in this work session.
