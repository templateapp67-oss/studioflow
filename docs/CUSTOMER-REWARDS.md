# Customer Rewards page

Reference: image(20261016-094142).png.

The gold balance/tier panel, referral sharing bar, two-column voucher catalogue,
issued vouchers and points ledger use the same Supabase project as bookings.
Published salon loyalty configurations supply voucher terms. Lifetime completed
visits determine tier progress; each salon has its own redeemable balance.
No sample coins, cash conversion, referral cash promises or friend counts are
shown as actual customer data.

`studioflow_customer_rewards_dashboard` returns public program cards for guests
and only the signed-in customer's balance, claims and history. The existing
`studioflow_android_rewards` contract remains an array and now deducts issued
vouchers, keeping the header balance consistent.

`studioflow_customer_redeem_reward` validates the active published reward and
salon balance, serializes requests per customer and reuses an idempotency key
on retries. The server creates the coupon and immutable points cost. Clients
have no insert/update/delete grant on the claims table. RLS allows only the
customer and the issuing salon to read a claim. Only the issuing salon can
mark a coupon used through `studioflow_owner_use_reward`. Owner Loyalty now
shows these customer-app vouchers.

Vouchers are presented at the salon under its published terms. They do not
change the protected online booking advance. Referral sharing uses the
existing account referral code; no new referral cash program is enabled.

Backend: customer-rewards-page.sql. Transactional rollback checks in
customer-rewards-verification.sql verify earning, deduction, retry safety,
insufficient balance, customer isolation and owner-only consumption. UI tests
verify tier/voucher rendering, idempotent retries and private state cleanup.
