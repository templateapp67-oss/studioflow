# Test-mode verification — 16 October 2026

Live health: configured=true, webhookConfigured=true, mode=test. Secret values were not retrieved or printed. Verified through a temporary fixture account authenticated with the normal Supabase password flow.

- Actual Razorpay test Checkout order created for a published ₹650 service; advance amount 16250 paise (25%).
- Reconcile before payment returned HTTP409; unpaid booking stayed pending.
- Actual Razorpay test QR generated, valid HTTPS image returned, status200.
- Fixed missing browser CORS/OPTIONS handling in nexora-mobile-qr; deployed version6. OPTIONS from the published Site origin returned200 and required access-control headers.
- Invalid webhook signature rejected. Health confirms secret presence, not a successful Razorpay webhook delivery.
- Customer booking UI regression suite passed, including server-only confirmation.

No test card/UPI transaction was completed; captured payment, successful webhook delivery and full paid confirmation are not claimed. Both temporary test reservations were cancelled and the fixture account removed. Provider test order/QR remain in Razorpay test audit history; the single-use QR expires after its short hold window. No real payment was charged.
