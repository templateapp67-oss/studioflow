# Salon contacts, exports and WhatsApp campaigns

Owner Workspace → **Customers & WhatsApp Campaigns** (module 26), or detailed dashboard → **Customers & WhatsApp**.

Contacts come from the signed-in salon's real bookings and customer permission choices. Demo bookings and unrelated app users are excluded. Search name/number/tags; filter marketing-ready, birthdays this month, no permission or Do Not Contact. Select up to 500 recipients, maintain tags/private notes, and bulk suppress contacts. Clearing Do Not Contact never grants customer consent.

Download CSV, real XLSX, or VCF for selected contacts (otherwise the filtered list). Export always re-reads the server projection. CSV guards formula cells; XLSX uses text cells so +91 phone numbers and date strings survive Excel import. VCF excludes suppressed contacts and never includes DOB. Owners receive DOB only when the customer explicitly shares it with that salon.

Customer App → Profile → **Salon offers on WhatsApp** exposes separate choices for each published salon. Default is off. Birthday DOB sharing also defaults off and is cleared on marketing opt-out. These preferences live in protected database rows and are changed only by the customer RPC. Owner access does not allow granting permission on a customer's behalf.

Campaign tools include offer, festival, birthday and rebooking templates, editable copy, generic share/copy tools, and a persistent manual WhatsApp draft queue. Up to 500 selected/filtered eligible contacts per campaign. The server validates salon ownership, published website, consent and suppression at preparation and again before returning each draft. Customer name, salon name, booking link and opt-out instructions are inserted server-side. A prepared link is not a sent/delivered message; the owner reviews the preview, clicks Continue in WhatsApp and sends there. No automatic sender, inbound STOP webhook, paid advertising, SMS, scheduling, Meta credentials or delivery analytics are enabled. Record a customer's STOP request with Do Not Contact; in-app opt-out is immediate at the next draft/export recheck.

Backend tables have RLS and no direct anon/authenticated grants. Narrow authenticated RPCs own the access rules. No global customer export or public DOB directory is exposed. No messages were sent during implementation.

Verification: `backend/customer-contact-marketing-verification.sql` rolls back fixtures and tests salon isolation, opt-in/DOB sharing, audience validation, duplicate recipients, private campaigns, opt-out and STOP suppression. `scripts/verify-contact-marketing.mjs` tests exports and UI controls; the generated workbook is also opened with openpyxl to verify actual Excel compatibility.
