# StudioFlow end-to-end audit — 11 October 2026

> **Catalogue update (6 November 2026):** The original 14-template count below was accurate for the October audit. The current main branch includes Template 15 (KeshKraft Men’s Hair Studio) and Template 16 (Aurelia Beauty Parlour); the current catalogue has 16 templates. The October validation totals and provider/deployment limitations below are historical, not a fresh November verification.

| Area | Fix / current behavior |
| --- | --- |
| Signup and login | Supabase Auth with persisted sessions, actionable errors, show password, optional validated referral and confirmation resend. Customer signup does not require a salon name. |
| Password | Forgot-password request and recovery form; signed-in password change. Real password update, old-password rejection and new-password login passed. Email delivery and the hosted project's redirect allowlist have not been verified. |
| Referrals | Explicit empty code skips metadata fallback. Invalid stale metadata no longer prevents account access. Existing attribution remains immutable. |
| Drafts | Revision checked Supabase saves, serialized writes, account-scoped browser recovery, conflict backup, unload warning and retry on reconnect. Local draft survives a failed-save signout. |
| Templates | Sixteen catalog templates (the original 14 plus Templates 15 and 16); owner identity and existing services preserved when switching. |
| Publish and links | Public sanitized content; real Sites `/?site=slug` links in wizard, preview, loyalty and promo copy. Custom domains remain an external configuration step. |
| Booking | Authoritative pricing, authenticated requests, atomic specialist overlap protection, assigned-service filtering, unpublished specialist exclusion, IST date bounds and lead time. Fixed mobile numbers beginning with 91. |
| Customer dashboard | Own booking list and cancellation through restricted RPC. Return-to-salon link carried through signin/signup. |
| Owner dashboard | Correct navigation on desktop/mobile. Metrics use stored appointments and clients; sample offsets and percentages removed. Loyalty points applied only after successful completion RPC. |
| Images | Gallery, staff, logo and cover uploads use account-scoped Supabase Storage. |
| Promotions | Editable story composition, curated image selection and campaign draft copy work without unavailable server endpoints. Automatic messaging and AI services are not configured. |
| Validation | Negative or excessive prices, invalid durations, duplicate service/staff IDs, invalid array shapes and lead-time bounds rejected by the server. |
| Failure handling | Render error boundary and lazy feature loading; visible API/save failures. |

Validation: 23 real Supabase HTTP integration checks passed. TypeScript and production build passed. Disposable QA data cleaned after verification. Automated browser checks were unavailable in the managed environment.

Remaining external dependencies: online payment provider and webhook verification; SMS/WhatsApp broadcast provider; AI provider credentials; custom-domain DNS; Supabase Auth email delivery and redirect configuration. No successful payment, delivery or AI generation is fabricated. Recovery emails should allow this site's root and `/?recovery=1` in Supabase Authentication → URL configuration; preserve other existing application redirects in this shared project.

Operational limits: expired unpaid holds are cancelled by the payment refund worker. Captured advances on expired or cancelled bookings are refunded through Razorpay (not left as a manual support task). Owners can create walk-in bookings and collect the remaining salon balance (cash/UPI/card) through `studioflow_owner_walk_in` / `studioflow_complete_visit`. Opening-hours strings are display text, while availability enforces individual specialist schedules. Referral rewards/commission settlement is not connected to a payment ledger.
