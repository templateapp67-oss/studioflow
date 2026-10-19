# Nexora Android 1.2.2

The customer APK packages the shared StudioFlow customer UI from Site version 142, source commit `1de78028b436abd27b7f3f165820e6a293220409`.

The Android container draws a native startup screen before asynchronous WebView initialization. It checks the provider before initialization, invalidates callbacks from destroyed activities, bounds startup waits, flushes cookies off the UI thread, and removes Razorpay's competing synchronous WebView warm-up. Checkout initialization and server-side payment verification remain in place.

The shared registration/profile flow uses the native date calendar with DD-MM-YYYY display, a password visibility button, and the saved registration contact and DOB. The booking summary contains a single coupon field in its scrollable content; its fixed header retains only navigation and title controls.

## Verification

Run: https://github.com/templateapp67-oss/studioflow/actions/runs/39231474482

The accelerated Android 15 emulator runs 10 instrumentation cases: startup recreation, restart, complete home/six tabs, password/calendar, native clipboard, real slot selection without a reservation, encrypted legacy-session migration, profile/contact persistence, and package-update storage retention. The guest booking case also checks summary header/content dimensions. The build runs 14 JVM unit cases and 6 bridge cases.

The update baseline is this source with package version code 5, followed by code 6. It is not the historical 1.1.1 binary. Original 1.1.1 package identity and signing certificate are separately verified before delivery. Testing is on the Android 15 emulator, not a physical Redmi handset. No real booking, payment, email or WhatsApp message is created.

CI uses a temporary signing key. The delivered APK is the tested payload re-signed locally with the original key. Payload hashes, package/version, all packaged website assets and the final signer must match before release. The original keystore never enters the repository or CI.

## Source

`Nexora-Android-source.zip` contains the Android source and packaged shared customer UI. Apply `overrides/` after extraction, as the workflow does. The Gradle signing configuration requires an explicit external key; it never silently substitutes a newly generated identity.

Disposable QA credentials are RSA/AES encrypted to a key generated for one workflow run. Only the public key is uploaded; private keys are destroyed, plaintext credentials are masked and excluded from artifacts. The synthetic account is deleted after verification.

An additional broad website wiring script has a pre-existing assertion for “Choose for online booking” in the unchanged SalonWebsitePreview. The same assertion fails on the unmodified Site 141 source; it is outside the customer APK runtime suite. The shared website production build passes.
