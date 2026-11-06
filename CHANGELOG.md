# Changelog

## 2026-11-06 — Production autopsy and targeted security hardening

### Added
- Complete initial repository, CI, Supabase and deployment findings in `AUDIT-REPORT.md`.
- Product-scope and production-readiness gap register in `GAP-ANALYSIS.md`.
- Confirmed issue/fix tracking in `BUG-FIX-REPORT.md`.
- Security findings and remaining checks in `SECURITY-REPORT.md`.
- Performance baseline and measurement limitations in `PERFORMANCE-REPORT.md`.
- Test evidence and release gates in `TEST-REPORT.md`.
- Non-destructive migration to restrict anonymous owner-only demo/site routines and tighten public salon/service/staff reads.

### Preserved
- Current main branch homepage prerendering and route split.
- Existing 16-template catalogue.
- Existing Supabase customer, salon, service, staff, booking, review and payment data.
- Existing public booking and availability RPCs.
- Existing Edge Function integrations.

### Not performed
- No production database migration applied.
- No Vercel deployment or domain changes.
- No live payment or customer booking created.
- No production data reset or deletion.

### Release note
This is an audit and remediation branch, not a production release. Merge only after current-main CI, migration validation and preview E2E pass.
