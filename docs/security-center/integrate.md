# Staging integration

Baseline reviewed: StudioFlow `6fac45f8bb2b75c68d86bce98dffe44a78fce634`. Compare the actual checkout before integrating. Keep Vercel production, Supabase production, DNS and GitHub unchanged while reviewing this package.

## 1. Prepare an isolated checkout and database

1. Approve the six decisions in `BLOCKED/sign-off.md` for staging only. Establish two unrelated test owner accounts, a separate platform case submitter and approver, and a salon admin without a platform grant. Use an isolated Supabase project with synthetic published-site fixtures. Confirm database roles and website schema exist before applying these migrations.
2. Stage the files in `GAP/` at the corresponding StudioFlow paths. The two original migrations are unchanged. Apply only missing migrations in order, using the existing project migration process against the **staging project**. Name and verify the staging project before applying. Leave the original Vercel/DB stop controls disabled.
3. Provision distinct dedicated Postgres logins for writing DNS results, maintenance and scheduled DNS monitoring. Each login inherits only its corresponding role and has only authorized network access. Verify existing PUBLIC privileges against all production and staging legacy tables and security-definer RPCs. Do not substitute a broad Supabase service-role key. Add and lock an approved `pg` Node dependency. Set server-only staging config listed in the README.
4. Review the platform privileges individually: `platform_read` covers queue, report and audit, `platform_write` covers opening and workflow submit, and `platform_approve` covers close/cancel. Give the UI approver `platform_read` explicitly. Closure requires an approver different from the user who submitted the case for review. Existing `inventory` and sales access confer zero platform rights.

## 2. Mount the React entry points

The ZIP includes `src/components/security/SecurityCenterEntry.tsx` and the two UI modules it references. Add this wrapper in the StudioFlow source using the existing session hook. The hook's MFA condition must be evaluated before the ready condition.

```tsx
import { useAuthSession } from '../../lib/useAuthSession';
import { SecurityCenterEntry } from './SecurityCenterEntry';

export function StudioFlowSecurityCenterRoute({ mode }: { mode: 'admin' | 'owner' }) {
  const { session, ready, mfa, error } = useAuthSession();
  if (mfa) return <p role="alert">Complete two-step verification in your account before continuing.</p>;
  if (error) return <p role="alert">Your session could not be verified. Sign in again.</p>;
  if (!ready) return <p role="status">Checking session…</p>;
  if (!session) return <a href="/login">Sign in to continue</a>;
  return <SecurityCenterEntry key={session.user.id} mode={mode} userId={session.user.id}
    accessToken={session.access_token} />;
}
```

At the pinned source:

- **Owner:** in `src/components/OwnerWorkspace.tsx`, add an owner-only link in the existing workspace navigation and point it to a dedicated path such as `/owner/security-center`. Apply the same workspace's `actorRole === 'owner'` visibility convention. The new route verifies enrollment server-side using the supplied entry component. This avoids choosing an undocumented numbered module ID.
- **Admin:** in `src/AppRouter.tsx`, add explicit matches for `/owner/security-center` and `/admin/security-center` before the fallback to `PublicHomepage`. Import the wrapper above from `src/components/security/`. Pass `mode="owner"` or `mode="admin"` respectively. Place the admin navigation link only in the privileged console.
- Verify in Vercel staging that both paths load the application shell and `/api/security-center` remains a function. Storefront rewrites and caches must exclude these paths. Add explicit app-shell routing before generic storefront rules only if needed by the staging build. Access checks stay server-side. On sign-out or account switching, unmount the previous user state.

## 3. Turn on DNS monitoring for one approved fixture

After the staged owner verifies a test hostname, approve one exact domain ID. Until enrolled, the watcher will not query it. Optional NS fingerprinting compares the observed recursive NS RRset for one operator-approved DNS zone with a reviewed baseline. It does not query registrars directly and is not a parent-zone DNSSEC proof.

Run the baseline command using **known, reviewed existing NS names**, without network calls:

```bash
node --input-type=module -e 'import {fingerprintNameservers as f} from "./server/dnsWatch.mjs"; const h=f(process.argv.slice(1)); if (!h) process.exit(2); console.log(h)' ns1.fixture.net ns2.fixture.net
```

Staging DBA enrollment template:

```sql
-- TXT-only monitoring. Optional NS comparison requires replacing both NULLs.
insert into studioflow_security.dns_watch(tenant_id,domain_id,enabled,zone,expected_ns_hash)
select tenant_id,id,true,NULL,NULL
from studioflow_security.domains
where id='APPROVED_STAGING_DOMAIN_UUID'::uuid and state='verified' and verified_until>now();
-- Verify this affected exactly one row.
```

For an NS baseline, replace the first NULL with the exact curated zone and the second with the computed hash. The zone must be the hostname or one of its parent suffixes. Keep scope tickets and DNS screenshots with your approved evidence. A stale lease or a revoked proof cannot apply a late result. Configure the staging scheduler from `ops/nexora-dns-watch.{service,timer}`, or use an equivalent private scheduler. Copy the files only under approved staging change control. Configure the protected environment file and approved resolver/database network destinations. Keep `SECURITY_CENTER_DNS_WATCH_ENABLED=false` until those controls are verified. Run the maintenance role for expiry and, separately, platform case deletion only after retention sign-off.

Healthy proof is checked every six hours. Negative observations are retried after at least 15 minutes. Two consecutive matching missing-proof or delegated NS-change observations revoke the domain and its scope. Three resolver failures create an inbox alert without revoking ownership. Renewals are prompted seven days before expiry. This release delivers in-app alerts; email/WhatsApp recipients and delivery are a separate approval. Enable the host timer only for the approved staging target and ensure it cannot reach any assessment target except through the approved recursive DNS service.

## 4. Staging acceptance

- Verify real AAL1 vs AAL2, unpublished owners, disabled grants, cross-tenant job/report denials and admin access denials in both UI requests and direct PostgREST requests.
- Exercise platform create, forward, stale version, return to remediation and different-person closure. Confirm salon administrators cannot see platform history or its audit entries.
- Download DNS and platform JSON/PDF. Inspect headers and filename. Check no caching, token leakage or PDF active content. The PDF uses built-in fonts and renders non-ASCII characters as explicit Unicode code points; JSON preserves the exact Unicode text.
- Check TTL, measured resolver deadlines, alert latency, monitor stop, denial of invalid zone configuration, revoke/cancel under race, synthetic backup/restore, and the host controls in `RISK/host-and-provenance.md`.
- Keep production disabled until the staged app build, role/RLS and private network tests pass and the business approval checklist is signed.
