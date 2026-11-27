# RISK — Commercial license and artifact provenance

## Locked inputs

- PentAGI commit: `cffed9485aa1cca70762cd08a57ac62a80406258`. At that revision, the core license is MIT and NOTICE describes the SDK as AGPL-3.0 with an official-project exception. [LICENSE](https://github.com/vxcontrol/pentagi/blob/cffed9485aa1cca70762cd08a57ac62a80406258/LICENSE) · [NOTICE](https://github.com/vxcontrol/pentagi/blob/cffed9485aa1cca70762cd08a57ac62a80406258/NOTICE)
- Cloud SDK: `github.com/vxcontrol/cloud v1.0.1`, commit `52f0465f1666b2b5ee23c4fcbe3ec1555ff56183`. Pinned public SDK is MIT. Cloud service terms are separate. [SDK LICENSE](https://github.com/vxcontrol/cloud/blob/52f0465f1666b2b5ee23c4fcbe3ec1555ff56183/LICENSE) · [Cloud Service Terms](https://github.com/vxcontrol/cloud/blob/52f0465f1666b2b5ee23c4fcbe3ec1555ff56183/TERMS_OF_SERVICE.md)

## Artifact review

1. Record the exact platform-specific image digest and attested source revision for every candidate container. Include base image, database, scraper, optional services and any worker images. If provenance cannot tie a binary to its source, treat it as unresolved.
2. In a read-only local checkout of the approved revision, print the relevant source evidence without running the software.

   ```bash
   git show cffed9485aa1cca70762cd08a57ac62a80406258:NOTICE
   git show cffed9485aa1cca70762cd08a57ac62a80406258:backend/go.mod |
     rg 'github.com/vxcontrol/cloud|^replace'
   git show cffed9485aa1cca70762cd08a57ac62a80406258:backend/go.sum |
     rg '^github.com/vxcontrol/cloud '
   # In a separate local checkout of vxcontrol/cloud:
   git rev-parse 'v1.0.1^{commit}'
   git show 52f0465f1666b2b5ee23c4fcbe3ec1555ff56183:LICENSE
   ```

3. With the exact image already available on the approved inventory host and an approved pinned Syft binary, extract the SBOM without executing containers. Extract bundled notices and license reports using your organization's offline image inspection tooling. Verify dependency versions against build provenance and package inventories. Missing packages or missing generated reports require manual reconciliation.

   ```bash
   syft version
   syft 'docker:APPROVED_REPOSITORY@sha256:APPROVED_DIGEST' -o spdx-json=sbom.spdx.json
   jq -r '.packages[] | [.name, .versionInfo, .licenseConcluded, .licenseDeclared] | @tsv' sbom.spdx.json
   ```

4. Collect written vendor clarification for the exact pinned source and commercial artifact. Ask whether NOTICE applies to the pinned public SDK, an older SDK, or privately bundled code. Ask whether any exception covers your fork and hosted commercial offering, and whether customer-facing report use triggers separate Cloud terms. Keep the original notices in the evidence until the applicable terms are settled.
5. Record counsel's decision against the image digest and intended use. If AGPL applies, assess covered-work boundaries, conveying and Section 13 source offer obligations where applicable. If existing rights do not cover the chosen model, obtain commercial rights, replace or remove the component and re-audit the new artifact, or adopt an approved compliance model. Keep external Cloud services disabled pending terms and privacy approval. [GNU AGPL guidance](https://www.gnu.org/licenses/gpl-faq.html#AGPLv3InteractingRemotely)
6. Signed release evidence should contain the digest, source revisions, SBOM, notices and license texts, written vendor response, and documented business/legal decision. A new digest or change in Cloud data usage reopens approval.

### Vendor message draft

We are reviewing a commercial hosted use case involving PentAGI commit `cffed9485aa1cca70762cd08a57ac62a80406258` and the public Cloud SDK `v1.0.1` at `52f0465f1666b2b5ee23c4fcbe3ec1555ff56183`. The PentAGI NOTICE references AGPL-3.0, while the pinned SDK includes MIT. Please confirm which component and releases the NOTICE covers, whether the pinned SDK in our proposed artifact is licensed under MIT, and whether the contemplated hosted use through our fork needs a separate commercial license or permission. Please distinguish SDK code rights from Cloud service access and rights to include Cloud-derived data in customer reports.

## Written sign-off record

| Field | Fill locally |
|---|---|
| Candidate artifact and selected platform digest | |
| PentAGI and SDK commits, attestation and SBOM references | |
| Vendor response date, contact and retained message reference | |
| Vendor clarification on scope of NOTICE and official-project exception | |
| SDK license versus service terms and report redistribution rights | |
| Counsel conclusion on commercial hosting, notices and any AGPL obligations | |
| Approved components and excluded features | |
| Decision, approver and date | APPROVE / HOLD / REJECT |
| Conditions that reopen review | Image digest, dependency, vendor service/data use, hosting or distribution changes |

Send the vendor draft yourself through the official vendor channel chosen by your organization. No vendor message has been sent. Counsel should review the response and exact artifact bundle before commercial approval. Keep Cloud access disabled until terms and privacy approvals are complete.
