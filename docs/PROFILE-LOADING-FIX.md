# Profile loading crash investigation

## Actual cause

The undefined object was **a workspace draft**, not `session.user.profile`.

`src/App.tsx` calls `applySnapshot(merged.draft)` after saves, revision-conflict reconciliation and realtime updates. The old `mergeWorkspace()` returned a plain workspace instead of `{ draft, conflicts }`, so `merged.draft` was undefined. `applySnapshot()` then evaluated `next.profile`. Additionally, `workspaceSnapshot()` returned a JSON string even though callers used it as a workspace object.

The helpers now implement the contract their callers require: object snapshots and a three-way merge result with a draft and conflict paths. Independent changes and keyed row deletions merge; competing changes still require the existing local/cloud choice. Invalid cloud profiles are rejected without replacing local edits.

## Audit and related loading fixes

Searched the complete tracked source, backend, scripts and documentation for `.profile` accesses (excluding Git/dependency/build output). Repeat with:

```sh
rg -n '\.profile\b' --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!dist/**' .
rg -n 'getSession|getUser|onAuthStateChange|createContext|useContext' src
```

Runtime access groups:

- **Owner workspace / save / realtime:** fixed the helper contract and checked incoming profiles before applying snapshots. Normalization preserves clients, loyalty settings, onboarding state and other saved fields rather than dropping them. Missing identity details remain blank; no fabricated person, salon or city is substituted.
- **Authentication:** the application has local auth state, not an existing React auth-context provider. `useAuthSession()` now centralizes its safe initialization and is also used by the referral bridge. A delayed `getSession()` cannot resurrect a signed-out user or overwrite a newer auth event. Rejections/timeouts settle to a usable signed-out/error state, and subscriptions are cleaned up. Auth callbacks remain synchronous; database/profile reads run outside them.
- **Owner identity/account loading:** identity reads are bounded, account responses are checked for ownership/shape, and protected workspace rendering still waits for the current user's account. A genuinely new database account with an empty draft remains supported. Missing shared identity records do not prevent onboarding with saved/auth metadata.
- **Customer profile:** the existing profile RPC is checked before reading its fields. Null records have an explicit missing-profile state and completion notice. Request failure has a retry screen rather than an editable unloaded profile. Account changes/logout invalidate pending reads and hide previous private profile data immediately. Profile/photo/preferences reads have deadlines.
- **Customer salon catalog and booking history:** validate `content.profile` at the API boundary; malformed published records produce an explicit catalog error, not invented salon profiles. Optional salon lookups in receipts, appointment cards and calendar exports use nested optional chaining. Existing, explicitly labeled template-demo behavior is unchanged.
- **Published sites:** require an actual published profile before rendering the template; missing profiles show an unavailable/retry message. Sequenced reads prevent older refresh responses from overwriting newer results.
- **Template props / hair-spa and clinic contexts:** profile props come from the guarded owner/public/catalog boundaries; existing context hooks already reject missing providers. No templates were redesigned.
- **`auth.getUser()` callers:** reviewed the branch, enquiries, reward and owner-panel calls. These retrieve user IDs/permissions, not `.profile`. No additional `getUser()` call is necessary to solve the workspace-result contract bug; Supabase RLS remains authoritative.

## Existing startup/build blockers encountered

- `resolveSiteSlug()` accepted a pathname string, but `Application` passed a Location object. Restored the query/subdomain contract covered by the existing routing tests, including preview-host exclusions.
- `captureReferral()` returned a Promise although auth/account callers required a referral string. Restored the existing pending-referral flow and blocked-storage handling.
- The Shringaar template imported a nonexistent `sanitizeShringaarServices` export. Added the small row-validation helper its existing caller expected; no visual/content redesign.
- Optional Vite env access permits existing Node verification scripts to import the Supabase client. The project URL/key values were not changed.
- Synchronized the stale npm lockfile to the existing package manifest so `npm ci` works. No dependencies were added to `package.json`.
- Allowed `.e2b.app` in the development host allowlist so the Arena preview loads.

## Verification (2026-10-30)

Passed:

```sh
npm ci --no-audit --no-fund
npm run build
node scripts/verify-profile-loading.mjs
node scripts/verify-workspace-sync.mjs
node scripts/verify-customer-profile.mjs
node scripts/verify-password-reset.mjs
node scripts/verify-booking-coupons.mjs
node scripts/verify-booking-close.mjs
node scripts/verify-subdomain-routing.mjs
```

The new regression suite covers session initialization/rejection, login/logout events, refresh restoration, stale initial sessions, StrictMode cleanup, null/malformed/missing customer records, failed signed photo URLs, profile races on logout/account changes, retry, the exact `.draft.profile` contract, new-owner initialization, ownership checks and invalid catalog rows.

A headless Chromium run against the actual development app also passed:

- Login form and protected owner workspace with a delayed/missing shared identity record.
- Authenticated page refresh and salon dashboard access.
- Customer account/profile loading.
- Missing-profile completion notice, failed-profile retry and recovery.
- Logout, logged-out refresh, and denial of protected workspace access.
- Signup/new-owner rendering with an empty saved workspace and no shared identity row.
- No uncaught page errors or white screen in these flows.

**Browser tests intercepted Supabase requests with test fixtures.** Live Supabase hosts are outside the sandbox's outbound allowlist. These tests did not create real accounts, change production data, send email, or process payments. Real backend authentication, email delivery and payment-provider integration still require testing in the deployment environment.

Full offline-suite comparison, using a separate copy of the original commit:

- Original commit: **15/87** suites passed.
- With this fix: **33/88** suites passed (includes the new regression suite).
- **No previously passing suite became failing.** All 55 currently failing suites were also failing before this change.
- `npm run lint` remains failing because the checkout contains extensive pre-existing type/interface errors. This is not an all-green repository test run. The production build and targeted profile/auth/save checks pass.

No Supabase project, database schema, migration, user data, credentials, payment integration or template design was changed.
