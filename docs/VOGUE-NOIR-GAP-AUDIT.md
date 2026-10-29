# Vogue Noir 08 — end-to-end gap audit

The existing template is `makeup_studio`, with `08` aliases. Do not register a second template with the same number. This audit applies to the current branch; it is not a statement about the deployed live site.

| Area | Current state | Remaining work / risk |
| --- | --- | --- |
| Onboarding and persistence | Existing wizard and owner editor save `profile.vogueNoir` in the tenant workspace; selectable template has an accessible button and preview link. Courses, imagery, colours, FAQs, packages, academy schedule and tax disclosures are editable. | Not every requested field or image slot is editable in the wizard. Old remote catalogue entries may supersede local starter services. Existing tenant data is deliberately not rewritten. |
| Academy | Optional module, sign-in gate, preferred city/Online, per-city preferred dates and owner status list are wired through the city-aware RPC. Old RPC continues working. City options and dates are **preferences**, not proof that a branch or seat is available. | City-specific *course* schedules, actual seat capacity, branch-backed availability and guest enquiries are not implemented. |
| Tenant isolation | Existing academy RLS and owner status RPC retained. New RPC uses the existing validation, tenant lookup and rate limit and writes the city atomically to the newly-created customer's enquiry. PGlite checks anonymous denial, tenant B isolation and legacy RPC compatibility. | Hosted Supabase policies/functions and deployment have not been tested. Run the migration against staging first. |
| Booking / branches | Existing slot lookup and booking/payment reservations continue using the single published salon profile and existing specialist schedules. | True multi-branch schema, branch-aware staff, slots, booking identity, reservations, payment records, city selector and eight studio directory cards do not exist. A frontend-only city selector would lead to wrong-location bookings, so none was added. |
| Razorpay | Existing platform checkout and server-side verification remain unchanged; server-side secrets are configured outside the repository. | Fixed 25% advance remains platform-wide; per-service fixed/percentage deposits and academy EMI checkout are absent. No live or test-mode Razorpay transaction was run. |
| GST | Optional GSTIN, six-digit SAC and inclusive/exclusive disclosure can be edited and displayed. This does not calculate tax. | GST calculation, rounding, invoice/receipt and verified GSTIN are not implemented. Do not advertise a tax invoice on this basis. |
| Content and assets | Local template assets and default Indian copy exist; sample testimonials are labelled. | Existing asset pack includes stock photographs and fewer regional/gallery/artist images than requested. Not all demo claims, address data, package details and photos are suitable for publication without owner review. |
| SEO, accessibility and QA | Existing LocalBusiness/Course markup, mobile call/WhatsApp, keyboard-accessible template selector, INR formatting and tests exist. | Branch-specific schema and city URLs, complete Hindi content, a Lighthouse/device audit and full regression/live tests are still needed. |

## Deployment sequence (staging first)

1. Confirm the base schema and `backend/vogue-noir-template-08.sql` are already applied. Follow the repository's existing Supabase change process; do not blindly rerun old catalog-sync SQL against production.
2. Apply `supabase/migrations/202610290001_vogue_noir_academy_city.sql` before the frontend. It is additive and preserves the original RPC and RLS policy.
3. Deploy this branch's frontend. Sign in as a customer, select Jaipur or Online and a preferred batch, submit, and confirm city and status are visible only to the correct owner. Check that a different owner cannot read or update the record and that the old RPC still works.
4. Enter actual studio details, schedule, tax disclosures and licensed owner imagery. Verify all public demo claims and pricing. Test existing single-location booking, Razorpay verification and refunds in test mode. Do not claim multi-branch booking or GST invoicing until implemented.
5. Run lint, build and the relevant template and database verifications. Test mobile/desktop and other templates against staging before production deployment.
