
### Automatic website and installed web-app updates

Each build emits a public `app-version.json` with the same UUID embedded in the JS bundle. The shared root update manager checks it without cache every 45 seconds while visible and on foreground/online events (throttled). A safe idle screen updates after a 5-second notice. Open dialogs, uploads, pending workspace saves, checkout and edited fields prevent automatic reload. The popup offers Update now or a five-minute defer; active modal/payment work must finish before applying.

Only the current URL's update markers change. Salon, app mode, referral, builder step, fragment, login and saved account data remain. No auth storage or caches are cleared. Offline/invalid version responses are ignored. An already attempted target cannot automatically loop. Existing tabs predating this feature need one fresh load to obtain the manager; future releases are detected by it. This covers browser and Chrome-installed PWA, not an Android APK store update.

Verification: `node scripts/verify-app-updates.mjs`; manifest UUID must occur in its HTML-linked JS. Live QA compares an idle customer tab and an open owner form across two actual publications.
