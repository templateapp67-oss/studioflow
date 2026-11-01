# Deploy Veda Sanjeevani

## Before you begin

You will need Node.js 20+, the Supabase CLI and Docker for local database tests. Production browser variables are **only** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL`; never add a service-role key or provider secret to any `VITE_` variable. The Vercel SPA rewrite and baseline security headers are in `vercel.json`.

## Supabase project setup

1. Create a Supabase project and save its project URL, anon/publishable key, database password, and service-role key in your password manager. Do not paste secrets into source files or chat.
2. From this directory run `supabase login`, then `supabase link --project-ref YOUR_PROJECT_REF` and `supabase db push`. Inspect the migration plan before confirming. Apply `supabase/seed.sql` only if appropriate for the destination; the local configuration runs the seed on `supabase db reset`.
3. Enable `pg_cron` and `pg_net` in Supabase. Add the `project_url` and a newly generated random `cron_secret` (32+ characters) to Supabase Vault as documented in `README_DB.md` / migration 005. Verify the daily keep-alive and review-request jobs exist; do not assume they run simply because migrations applied.
4. Set Edge Function secrets in Supabase, not Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `GEMINI_API_KEY` (optional), `GEMINI_MODEL`, `RESEND_API_KEY` (optional until email is needed), `EMAIL_FROM`, `OWNER_EMAIL`, and `CRON_SECRET`. For example, use `supabase secrets set NAME=value` in a secure terminal. Never commit a populated `.env` file.
5. Deploy functions with config-defined JWT verification: `supabase functions deploy ai-generate-content`, `ai-generate-all`, `summarize-reviews`, and `register-media` with JWT verification **enabled**; deploy `create-booking-public`, `health`, `request-review`, and `send-booking-notification` with `--no-verify-jwt`. The last three internal/scheduled functions still enforce `x-cron-secret` in application code. Inspect `supabase/config.toml` and function authorization before deploying.
6. In Supabase Auth, set the production Site URL and exact allowed redirect URLs. Configure email confirmation and password rules. After the first verified owner account is created, disable public sign-up; invite staff from the Supabase dashboard. Test password reset links against the production domain.
7. Verify the sending domain with Resend (DNS records, SPF/DKIM and any requested DMARC policy). Set a verified sender in `EMAIL_FROM`; add/verify the recipient domain as required by Resend before relying on guest email.

## Frontend and domain

8. Import the project into Vercel with the root directory set to `veda-sanjeevani` if the parent repository is deployed as a monorepo. Use `npm ci` and `npm run build`. Configure exactly these public build variables in the Vercel project:
   - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<public anon/publishable key>`
   - `VITE_SITE_URL=https://<your-domain>`
9. Attach your custom domain in Vercel, follow its DNS instructions, and wait for its automatic SSL certificate. Update Supabase Auth Site URL/redirect URLs and Supabase Function `SITE_URL` to the final HTTPS origin. Confirm CSP `connect-src`/`img-src` allow the configured Supabase host; the current policy permits `*.supabase.co`.
10. Submit `https://<your-domain>/sitemap.xml` in Google Search Console and verify `robots.txt`, canonical links and Open Graph metadata after deployment.
11. Enable database backups/PITR if your Supabase plan supports them and record the retention limits. Configure an external uptime monitor (for example, UptimeRobot) for the public site and `/functions/v1/health`. The health endpoint does not replace a database backup. Confirm the configured daily keep-alive cron in Supabase; free-plan pause/retention behavior and keep-alive effectiveness depend on current Supabase plan and platform policies.

## Rollback plan

Keep the last known-good Vercel deployment and use Vercel's deployment rollback if the new frontend has a production regression. Revert code via the tracked branch and redeploy. Database migrations are additive; do not blindly roll back a migration after new writes. Restore from a verified backup or prepare a reviewed forward-fix migration if the database is affected. Disable risky Edge Function versions only after confirming safe behavior and booking/email impact. Save incident time, deployment ID, database backup ID and a short customer-impact note.

## CI activation

The workflow scaffold lives at `veda-sanjeevani/.github/workflows/ci.yml` because this implementation is constrained to the isolated project directory. GitHub Actions only discovers workflows at the repository root (`.github/workflows`). A repository maintainer must integrate this file at that root and mark its job as a required check in branch protection/rulesets before it can block merges. The GitHub-hosted run has not yet been observed.

## Local verification commands

```sh
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --omit=dev
supabase start
supabase db reset
supabase test db
deno test --allow-all supabase/functions/tests
npx playwright install chromium
npm run test:e2e
```

Live provider delivery, DNS, Auth email, secrets, custom domain, uptime monitor and backups require project-owner configuration; successful local checks do not verify those services.
