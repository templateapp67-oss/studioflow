# Reference ZIP gap fixes

Reference source: costomer-app--main(1).zip; reference screenshot:
image(20261016-095812).png. The second ZIP matches the supplied first ZIP.

| Gap | Result |
| --- | --- |
| Website heading shadows leaked into customer UI | Customer headings explicitly remove website shadows; owner websites are unchanged. |
| Header took two desktop rows | Reference 64px navigation, location pill, live status, points, language and avatar; install/theme/demo remain in More. |
| Copy feedback pushed Rewards down | Fixed-position dismissible toast with automatic cleanup. |
| Rewards sizing diverged | Original RewardsView JSX layout/classes ported, backed by existing wallet/voucher/ledger RPCs. |
| Voucher issued state not reflected | Issued codes and Redeemed state shown; signed-out users cannot see codes/history. |
| Location selector was a small inline input | Searchable city modal, published city choices, manual input and opt-in approximate geolocation. |
| Booking service/slot controls appeared together | Separate service/category and specialist/slot steps with backwards navigation; summary and protected advance flow retained. |
| Pending advances hard to find | Dedicated Pending Advance filter. |
| Reference receipt button was a simulated toast | Actual local receipt download from the customer's booking record; no invented tax invoice/payment data. |
| Reference calendar button did not export complete event data | ICS with actual date/time/duration, IST conversion and escaped content; only confirmed non-demo appointments. |
| Profile omitted payment records | Recent private booking receipts and recorded amounts visible on Profile. |
| Too many recommendation cards expanded Home | Four current catalogue picks, with the rest available through categories and Explore. |

The existing Supabase project, RLS, private profile bucket, templates, live slot
RPCs, zero-rupee demo isolation, 25% advance calculation and trusted QR/payment
confirmation remain in use. No owner catalogue or customer balances were reset.

Reference-only sample values (405 coins, arbitrary cashback, fabricated
ratings/availability) are replaced by actual account data. SMS/WhatsApp delivery
promises, database architecture/debug panels and local payment-success simulation
are not presented as working production functions. Sharing opens the recipient's
chosen sharing interface; receipt exports do not send customer data elsewhere.

Validation: TypeScript, customer reference/profile, Rewards retry/privacy,
Explore/real-map, discovery and PWA checks; calendar/receipt fixtures; live browser
review after deployment. No actual payment is required for UI verification.
