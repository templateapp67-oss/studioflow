# StudioFlow crash and flow audit

The supplied screenshot shows the root React error boundary. It contains no exception or stack trace; the exact exception from that browser session cannot be established here. Production Worker error logs returned no errors. The two existing accounts had the main owner-name, branding and reward fields, so incomplete cloud data has not been established as the screenshot's cause.

## Implemented fixes

- Reproduced owner-screen crash with incomplete saved data. Merge partial profiles, nested branding/policies and loyalty settings with safe defaults; retain existing owner content and explicitly empty lists. Use the same normalization for local recovery and published websites.
- Old open tabs can request assets removed by a newer publish. Detect module/CSS loading errors and refresh at most once within a minute. Ordinary application errors do not trigger automatic reloads.
- Scope screen failures inside the owner workspace and live-preview frame, preserving workspace state and navigation. Show actual error details and a recovery action rather than hiding the exception.
- Handle blocked browser storage when reading referrals and recovery status. Provide a dialog fallback when the native modal API is unavailable.
- Avoid empty image source URLs for owner/staff photos.

## Verified

- New regression suite: incomplete draft reproduction; corrected owner, dashboard and published preview rendering; content preservation; chunk reload limit; storage denial; boundary reset on navigation.
- Existing suites: all 14 card selections and device modes; saved promo/video/social/policies across all templates; empty lists; address editor stability.
- Real Supabase transaction tests: referral generation/attribution/idempotency, workspace save/revision conflict, publication/privacy, owner booking reads, authoritative prices, overlapping booking prevention, cancellation and account RLS. Test identities/data were rolled back.
- Supabase wiring transaction tests: saved dashboard content projects into public content for all 14 templates without private CRM/staff fields. Rolled back.

## Verification limits and remaining gaps

- Browser automation is unavailable in this managed environment. Actual browser rendering and the original crash interaction were not reproduced.
- Direct HTTP auth smoke test did not return in this environment and was stopped; real signup/login/password/storage HTTP flows were not revalidated this turn. SQL tests do not substitute for these checks.
- Unverified payment cannot be marked paid/confirmed. Production payment processing remains an integration requirement; this patch does not claim that payments or every end-to-end flow are complete.
