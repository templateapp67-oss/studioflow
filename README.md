# StudioFlow White-label Salon OS

Editable salon websites, an owner dashboard, Supabase authentication and persistence, customer bookings, and centralized Razorpay deposit verification.

- Live website: https://nexora-one-white-label.templateapp67.chatgpt.site
- GitHub: https://github.com/templateapp67-oss/studioflow
- Imported from the published Sites source commit `0375cb37059b5ca26694bb166e76cee9254527ba` (version 10, 11 October 2026).

## Run locally

Use Node.js 22 or later.

```sh
npm ci
npm run dev
```

The development server listens on port 3000. `npm run build` builds the React/Vite frontend in `dist/` and the optional Express server. `npm start` runs that server. The current frontend is React/Vite, not Next.js.

## Verify

```sh
npm run lint
node node_modules/typescript/bin/tsc -p tsconfig.edge.json
npm run test:address
npm run test:wiring
node scripts/verify-salon-os.mjs
node --import tsx scripts/verify-publish-link.tsx
npm run build
```

These checks cover rendering, editing, data wiring and isolated payment fixtures; they are not proof of a completed real Razorpay transaction. Browser end-to-end verification remains outstanding.

## Supabase and payments

The browser uses the existing `zilwgiuiygqqardzutxi` project with a publishable key protected by RLS. Real customer, owner and booking records stay in Supabase, not this repository. SQL changes and rollback verification scripts are in `backend/`; payment Edge Function source is in `supabase/functions/studioflow-payments/`.

See [backend setup](backend/README.md) and [payment configuration](docs/platform-payment-setup.md). Configure private Razorpay keys only in Supabase Edge Function secrets. Live payments still require provider configuration and a verified real transaction.

## Hosting and source sync

The currently live deployment remains on Sites. `.openai/hosting.json` retains its existing project identity. This repository is a source snapshot; GitHub pushes do not automatically deploy to Sites and Sites edits do not automatically update GitHub. A hosting integration or explicit source sync must be configured for automatic deployment. No Vercel project was connected by this import.

## Secrets

`.env`, build output, dependencies and database records are excluded. `.env.example` contains placeholders only. Never commit service-role keys, private payment keys or production database exports.
