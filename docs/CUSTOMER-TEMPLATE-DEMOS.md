# Customer category template demos

The customer catalogue merges the existing active template metadata from the public Supabase catalogue RPC with the repository's website template services and team. It does not create fake websites, owner accounts or records in the booking database.

For each active, supported template category with no published real salon, a read-only listing is shown with a TEMPLATE DEMO badge. Services, reference prices, sample city and team are explicitly sample content. Its full website link uses the existing `?template=<id>` preview route. Demo listings do not request real slots, payment, reviews, directions or favorite writes. Existing ₹0 booking practice for real published salons remains available.

A published salon suppresses the fallback for its exact `businessType`. Other categories retain their demos. The existing realtime catalogue subscription, 30-second visible-page refresh, focus refresh and manual refresh all apply. When an old demo detail link is opened after replacement, it resolves to the published salon in the same category. If that category has no published salon again, the active template fallback returns. Inactive templates are not resurrected.

Verification: TypeScript, customer reference/booking regression suite, all 14 category filters and template links, per-category and all-category replacement, inactive template exclusion. Live catalogue currently contains 14 active templates and 2 published salons, yielding 12 demo fallbacks.

Browser preview limitation: the supervised server became healthy after fixing its CLI port handling, but this cloud browser returned ERR_BLOCKED_BY_CLIENT for the required terminal.local preview origin. Visual browser QA was unavailable in this environment. Production build and component interaction checks remain the verification evidence.
