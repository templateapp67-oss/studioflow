# Roop Mahal bridal enquiry update

Template 04 now has a **Enquire on WhatsApp** call to action inside the Bridal & Makeover highlight. It builds a ready-to-edit message from the salon's configured WhatsApp number and name, asking about consultation options, availability and service details. A valid WhatsApp number is required; the CTA stays hidden if no number is configured. Ten-digit Indian numbers are normalized with the country code, while international numbers are retained.

The link opens WhatsApp only. It does not create a booking, collect details in StudioFlow or confirm an appointment. The existing service-list link remains available, and the new action is scoped to the Roop Mahal beauty-parlour template.

Verification: `node scripts/verify-roop-mahal-template.mjs` checks the message URL, phone validation, visible CTA, contactless behavior and template CSS scoping.
